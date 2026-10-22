"""TDD RED: Cover/Illustrationen kamen als ~1,7-MB-PNG (LCP-Risiko auf dem
Handy). to_webp() verkleinert und konvertiert sie vor dem Upload."""

from __future__ import annotations

import io
import random

import pytest
from PIL import Image

from src.adapters.output.ai.image_encoding import to_webp


def _noisy_png(width: int, height: int) -> bytes:
    """Rauschen statt Fläche — realistischer für Kompressionsvergleiche."""
    rnd = random.Random(42)
    img = Image.new("RGB", (width, height))
    img.putdata(
        [
            (rnd.randrange(256), rnd.randrange(256), rnd.randrange(256))
            for _ in range(width * height)
        ]
    )
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_output_is_webp() -> None:
    out = to_webp(_noisy_png(64, 64))
    assert out[:4] == b"RIFF" and out[8:12] == b"WEBP"


def test_large_images_are_downscaled_keeping_aspect_ratio() -> None:
    out = to_webp(_noisy_png(1600, 800), max_size=800)
    with Image.open(io.BytesIO(out)) as img:
        assert img.size == (800, 400)


def test_small_images_are_not_upscaled() -> None:
    out = to_webp(_noisy_png(300, 200), max_size=800)
    with Image.open(io.BytesIO(out)) as img:
        assert img.size == (300, 200)


def test_webp_is_much_smaller_than_png() -> None:
    png = _noisy_png(512, 512)
    assert len(to_webp(png)) < len(png) / 2


def test_transparency_is_kept() -> None:
    img = Image.new("RGBA", (32, 32), (255, 0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    with Image.open(io.BytesIO(to_webp(buf.getvalue()))) as out:
        assert out.mode == "RGBA"


def test_garbage_input_raises_value_error() -> None:
    with pytest.raises(ValueError):
        to_webp(b"not an image")
