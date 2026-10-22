"""Unit tests for OpenAIImageService — rewritten for gpt-image-1 (TDD RED).

OpenAI retired dall-e-3; gpt-image-1 returns base64 payloads directly, so the
service decodes b64_json instead of downloading a temporary URL.
"""

from __future__ import annotations

import base64
import io
import re
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.core.domain.value_objects.language import AgeRange, BookTheme

# ---------------------------------------------------------------------------
# Helpers for building mock OpenAI image responses
# ---------------------------------------------------------------------------


def _make_openai_image_response(image_bytes: bytes) -> MagicMock:
    """Build a fake ImagesResponse whose first item carries b64_json."""
    image_data = MagicMock()
    image_data.b64_json = base64.b64encode(image_bytes).decode("ascii")
    response = MagicMock()
    response.data = [image_data]
    return response


def _png(width: int = 64, height: int = 64, color: tuple[int, int, int] = (255, 107, 53)) -> bytes:
    from PIL import Image

    buf = io.BytesIO()
    Image.new("RGB", (width, height), color).save(buf, format="PNG")
    return buf.getvalue()


def _is_webp(data: bytes) -> bool:
    return data[:4] == b"RIFF" and data[8:12] == b"WEBP"


def _make_service(
    image_bytes: bytes | None = None, upload_url: str = "https://cdn.example.com/img.webp"
):
    image_bytes = image_bytes if image_bytes is not None else _png()
    from src.adapters.output.ai.image_service import OpenAIImageService

    mock_storage = AsyncMock()
    mock_storage.upload_image = AsyncMock(return_value=upload_url)

    mock_openai = AsyncMock()
    mock_openai.images = AsyncMock()
    mock_openai.images.generate = AsyncMock(return_value=_make_openai_image_response(image_bytes))

    service = OpenAIImageService(openai_client=mock_openai, storage=mock_storage)
    return service, mock_openai, mock_storage


# ---------------------------------------------------------------------------
# generate_illustration
# ---------------------------------------------------------------------------


class TestGenerateIllustration:
    @pytest.mark.asyncio
    async def test_returns_public_url(self) -> None:
        url = "https://s3.example.com/books/book-1/illustrations/page_001.png"
        service, _, _ = _make_service(upload_url=url)

        result = await service.generate_illustration(
            page_text="A small bear walks through the forest.",
            theme=BookTheme.ANIMALS,
            age_range=AgeRange.YOUNG,
            page_number=1,
            book_id="book-1",
        )

        assert result == url

    @pytest.mark.asyncio
    async def test_uploads_with_correct_s3_key(self) -> None:
        service, _, mock_storage = _make_service()

        await service.generate_illustration(
            page_text="A lion roars.",
            theme=BookTheme.ADVENTURE,
            age_range=AgeRange.MIDDLE,
            page_number=5,
            book_id="book-42",
        )

        s3_key = mock_storage.upload_image.call_args[0][1]
        assert s3_key == "books/book-42/illustrations/page_005.webp"

    @pytest.mark.asyncio
    async def test_s3_key_zero_padded_to_three_digits(self) -> None:
        service, _, mock_storage = _make_service()

        await service.generate_illustration(
            page_text="Hello.",
            theme=BookTheme.FRIENDSHIP,
            age_range=AgeRange.YOUNG,
            page_number=0,
            book_id="book-1",
        )

        s3_key = mock_storage.upload_image.call_args[0][1]
        assert s3_key == "books/book-1/illustrations/page_000.webp"

    @pytest.mark.asyncio
    async def test_decoded_b64_bytes_are_uploaded(self) -> None:
        """The base64 payload from gpt-image-1 must be decoded and uploaded."""
        image_bytes = _png(color=(10, 200, 80))
        service, _, mock_storage = _make_service(image_bytes=image_bytes)

        await service.generate_illustration(
            page_text="Bears play.",
            theme=BookTheme.NATURE,
            age_range=AgeRange.YOUNG,
            page_number=2,
            book_id="book-1",
        )

        uploaded_bytes = mock_storage.upload_image.call_args[0][0]
        # gpt-image-1 liefert PNG (~1,7 MB) — hochgeladen wird WebP
        assert _is_webp(uploaded_bytes)
        assert mock_storage.upload_image.call_args[0][2] == "image/webp"

    @pytest.mark.asyncio
    async def test_calls_gpt_image_1(self) -> None:
        service, mock_openai, _ = _make_service()

        await service.generate_illustration(
            page_text="A cat sleeps.",
            theme=BookTheme.ANIMALS,
            age_range=AgeRange.YOUNG,
            page_number=1,
            book_id="book-1",
        )

        call_kwargs = mock_openai.images.generate.call_args[1]
        assert call_kwargs["model"] == "gpt-image-1"

    @pytest.mark.asyncio
    async def test_raises_when_no_image_data(self) -> None:
        from src.adapters.output.ai.image_service import OpenAIImageService

        mock_storage = AsyncMock()
        mock_openai = AsyncMock()
        mock_openai.images = AsyncMock()
        empty = MagicMock()
        empty.data = []
        mock_openai.images.generate = AsyncMock(return_value=empty)

        service = OpenAIImageService(openai_client=mock_openai, storage=mock_storage)

        with pytest.raises(ValueError):
            await service.generate_illustration(
                page_text="x",
                theme=BookTheme.ANIMALS,
                age_range=AgeRange.YOUNG,
                page_number=1,
                book_id="book-1",
            )


# ---------------------------------------------------------------------------
# generate_cover
# ---------------------------------------------------------------------------


class TestGenerateCover:
    @pytest.mark.asyncio
    async def test_returns_public_url(self) -> None:
        url = "https://s3.example.com/books/book-99/cover.png"
        service, _, _ = _make_service(upload_url=url)

        result = await service.generate_cover(
            title="Der kleine Bär",
            theme=BookTheme.ANIMALS,
            age_range=AgeRange.YOUNG,
            book_id="book-99",
        )

        assert result == url

    @pytest.mark.asyncio
    async def test_uploads_with_correct_s3_key(self) -> None:
        service, _, mock_storage = _make_service()

        await service.generate_cover(
            title="Adventure in the Forest",
            theme=BookTheme.ADVENTURE,
            age_range=AgeRange.OLDER,
            book_id="book-77",
        )

        s3_key = mock_storage.upload_image.call_args[0][1]
        assert s3_key == "books/book-77/cover.webp"

    @pytest.mark.asyncio
    async def test_decoded_b64_bytes_are_uploaded(self) -> None:
        cover_bytes = _png(color=(78, 205, 196))
        service, _, mock_storage = _make_service(image_bytes=cover_bytes)

        await service.generate_cover(
            title="My Story",
            theme=BookTheme.VALUES,
            age_range=AgeRange.OLDER,
            book_id="book-55",
        )

        uploaded_bytes = mock_storage.upload_image.call_args[0][0]
        assert _is_webp(uploaded_bytes)
        assert mock_storage.upload_image.call_args[0][2] == "image/webp"


# ---------------------------------------------------------------------------
# Prompt safety and content
# ---------------------------------------------------------------------------

_FORBIDDEN_KEYWORDS = [
    "violence",
    "violent",
    "scary",
    "horror",
    "blood",
    "death",
    "killing",
    "murder",
    "weapon",
    "gun",
    "knife",
    "war",
    "adult",
    "sexual",
    "nude",
    "naked",
    "gore",
]


class TestPrompts:
    def test_illustration_prompt_contains_no_violent_keywords(self) -> None:
        from src.adapters.output.ai.image_service import _build_illustration_prompt

        prompt = _build_illustration_prompt(
            page_text="A friendly bear meets a rabbit in a meadow.",
            theme=BookTheme.ANIMALS,
            age_range=AgeRange.YOUNG,
            page_number=1,
        )

        prompt_lower = prompt.lower()
        for keyword in _FORBIDDEN_KEYWORDS:
            # Word-boundary match avoids false positives ("war" in "watercolor")
            assert not re.search(rf"\b{re.escape(keyword)}\b", prompt_lower), (
                f"Prompt contains forbidden keyword '{keyword}': {prompt}"
            )

    def test_illustration_prompt_contains_style_keywords(self) -> None:
        from src.adapters.output.ai.image_service import _build_illustration_prompt

        prompt = _build_illustration_prompt(
            page_text="A small girl picks flowers.",
            theme=BookTheme.NATURE,
            age_range=AgeRange.MIDDLE,
            page_number=3,
        )

        prompt_lower = prompt.lower()
        assert any(
            kw in prompt_lower
            for kw in ["children", "watercolor", "illustration", "friendly", "soft", "cute"]
        ), f"Prompt lacks style keywords: {prompt}"

    def test_illustration_prompt_includes_page_text(self) -> None:
        from src.adapters.output.ai.image_service import _build_illustration_prompt

        page_text = "A little elephant named Ellie splashes in the river."
        prompt = _build_illustration_prompt(
            page_text=page_text,
            theme=BookTheme.ANIMALS,
            age_range=AgeRange.YOUNG,
            page_number=1,
        )

        assert "elephant" in prompt.lower() or page_text[:50].lower() in prompt.lower(), (
            f"Page text not reflected in prompt: {prompt}"
        )

    def test_cover_prompt_contains_title(self) -> None:
        from src.adapters.output.ai.image_service import _build_cover_prompt

        title = "The Magical Forest"
        prompt = _build_cover_prompt(
            title=title,
            theme=BookTheme.NATURE,
            age_range=AgeRange.MIDDLE,
        )

        assert title.lower() in prompt.lower(), f"Title not found in cover prompt: {prompt}"

    def test_cover_prompt_contains_no_violent_keywords(self) -> None:
        from src.adapters.output.ai.image_service import _build_cover_prompt

        prompt = _build_cover_prompt(
            title="Friends Forever",
            theme=BookTheme.FRIENDSHIP,
            age_range=AgeRange.YOUNG,
        )

        prompt_lower = prompt.lower()
        for keyword in _FORBIDDEN_KEYWORDS:
            assert not re.search(rf"\b{re.escape(keyword)}\b", prompt_lower), (
                f"Cover prompt contains forbidden keyword '{keyword}': {prompt}"
            )


# ---------------------------------------------------------------------------
# Constructor
# ---------------------------------------------------------------------------


class TestConstructor:
    def test_default_model_is_gpt_image_1(self) -> None:
        from src.adapters.output.ai.image_service import OpenAIImageService

        service = OpenAIImageService(openai_client=MagicMock(), storage=MagicMock())
        assert service._model == "gpt-image-1"

    def test_custom_model_is_stored(self) -> None:
        from src.adapters.output.ai.image_service import OpenAIImageService

        service = OpenAIImageService(
            openai_client=MagicMock(), storage=MagicMock(), model="gpt-image-1-mini"
        )
        assert service._model == "gpt-image-1-mini"
