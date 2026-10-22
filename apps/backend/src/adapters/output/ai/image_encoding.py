"""Bild-Optimierung vor dem Upload: gpt-image-1 liefert ~1,7-MB-PNGs, die auf
dem Handy den Seitenaufbau (LCP) ausbremsen."""

from __future__ import annotations

import io

from PIL import Image, UnidentifiedImageError

DEFAULT_MAX_SIZE = 1024
DEFAULT_QUALITY = 80


def to_webp(data: bytes, max_size: int = DEFAULT_MAX_SIZE, quality: int = DEFAULT_QUALITY) -> bytes:
    """Konvertiert ein Bild nach WebP und begrenzt die längste Kante auf
    *max_size* (Seitenverhältnis bleibt, kein Hochskalieren)."""
    try:
        with Image.open(io.BytesIO(data)) as img:
            img.load()
            converted = img.convert("RGBA" if _has_alpha(img) else "RGB")
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("Not a decodable image") from exc

    converted.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    out = io.BytesIO()
    converted.save(out, format="WEBP", quality=quality, method=6)
    return out.getvalue()


def _has_alpha(img: Image.Image) -> bool:
    return img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
