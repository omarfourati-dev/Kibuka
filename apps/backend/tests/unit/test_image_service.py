"""Unit tests for DallE3ImageService — TDD Red phase written before implementation."""

from __future__ import annotations

import re
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.core.domain.value_objects.language import AgeRange, BookTheme

# ---------------------------------------------------------------------------
# Helpers for building mock OpenAI image responses
# ---------------------------------------------------------------------------


def _make_openai_image_response(url: str) -> MagicMock:
    """Build a fake openai.types.images_response.ImagesResponse-like object."""
    image_data = MagicMock()
    image_data.url = url
    response = MagicMock()
    response.data = [image_data]
    return response


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestDallE3ImageServiceGenerateIllustration:
    """Tests for generate_illustration method."""

    @pytest.mark.asyncio
    async def test_generate_illustration_returns_url(self) -> None:
        """generate_illustration must return a public URL string."""
        from src.adapters.output.ai.image_service import DallE3ImageService

        mock_storage = AsyncMock()
        mock_storage.upload_image = AsyncMock(
            return_value="https://s3.example.com/books/book-1/illustrations/page_001.png"
        )

        mock_openai = AsyncMock()
        mock_openai.images = AsyncMock()
        mock_openai.images.generate = AsyncMock(
            return_value=_make_openai_image_response("https://dalle.openai.com/tmp/img.png")
        )

        with patch("httpx.AsyncClient") as mock_httpx_cls:
            mock_http_client = AsyncMock()
            mock_http_client.__aenter__ = AsyncMock(return_value=mock_http_client)
            mock_http_client.__aexit__ = AsyncMock(return_value=None)
            mock_response = MagicMock()
            mock_response.content = b"fake-png-bytes"
            mock_http_client.get = AsyncMock(return_value=mock_response)
            mock_httpx_cls.return_value = mock_http_client

            service = DallE3ImageService(openai_client=mock_openai, storage=mock_storage)
            result = await service.generate_illustration(
                page_text="A small bear walks through the forest.",
                theme=BookTheme.ANIMALS,
                age_range=AgeRange.YOUNG,
                page_number=1,
                book_id="book-1",
            )

        assert isinstance(result, str)
        assert result == "https://s3.example.com/books/book-1/illustrations/page_001.png"

    @pytest.mark.asyncio
    async def test_generate_illustration_uploads_with_correct_s3_key(self) -> None:
        """Illustration S3 key must follow books/{book_id}/illustrations/page_{NNN}.png."""
        from src.adapters.output.ai.image_service import DallE3ImageService

        mock_storage = AsyncMock()
        mock_storage.upload_image = AsyncMock(return_value="https://cdn.example.com/img.png")

        mock_openai = AsyncMock()
        mock_openai.images = AsyncMock()
        mock_openai.images.generate = AsyncMock(
            return_value=_make_openai_image_response("https://dalle.openai.com/tmp/img.png")
        )

        with patch("httpx.AsyncClient") as mock_httpx_cls:
            mock_http_client = AsyncMock()
            mock_http_client.__aenter__ = AsyncMock(return_value=mock_http_client)
            mock_http_client.__aexit__ = AsyncMock(return_value=None)
            mock_response = MagicMock()
            mock_response.content = b"png-data"
            mock_http_client.get = AsyncMock(return_value=mock_response)
            mock_httpx_cls.return_value = mock_http_client

            service = DallE3ImageService(openai_client=mock_openai, storage=mock_storage)
            await service.generate_illustration(
                page_text="A lion roars.",
                theme=BookTheme.ADVENTURE,
                age_range=AgeRange.MIDDLE,
                page_number=5,
                book_id="book-42",
            )

        call_args = mock_storage.upload_image.call_args
        # Second positional argument is the S3 key
        s3_key = call_args[0][1]
        assert s3_key == "books/book-42/illustrations/page_005.png"

    @pytest.mark.asyncio
    async def test_generate_illustration_s3_key_zero_padded_to_three_digits(self) -> None:
        """Page numbers must be zero-padded to exactly 3 digits in the S3 key."""
        from src.adapters.output.ai.image_service import DallE3ImageService

        mock_storage = AsyncMock()
        mock_storage.upload_image = AsyncMock(return_value="https://cdn.example.com/img.png")

        mock_openai = AsyncMock()
        mock_openai.images = AsyncMock()
        mock_openai.images.generate = AsyncMock(
            return_value=_make_openai_image_response("https://dalle.openai.com/img.png")
        )

        with patch("httpx.AsyncClient") as mock_httpx_cls:
            mock_http_client = AsyncMock()
            mock_http_client.__aenter__ = AsyncMock(return_value=mock_http_client)
            mock_http_client.__aexit__ = AsyncMock(return_value=None)
            mock_response = MagicMock()
            mock_response.content = b"data"
            mock_http_client.get = AsyncMock(return_value=mock_response)
            mock_httpx_cls.return_value = mock_http_client

            service = DallE3ImageService(openai_client=mock_openai, storage=mock_storage)
            await service.generate_illustration(
                page_text="Hello.",
                theme=BookTheme.FRIENDSHIP,
                age_range=AgeRange.YOUNG,
                page_number=0,
                book_id="book-1",
            )

        s3_key = mock_storage.upload_image.call_args[0][1]
        assert s3_key == "books/book-1/illustrations/page_000.png"

    @pytest.mark.asyncio
    async def test_generate_illustration_downloads_image_from_dalle_url(self) -> None:
        """The service must download the image from the DALL-E URL before uploading."""
        from src.adapters.output.ai.image_service import DallE3ImageService

        dalle_url = "https://dalle.openai.com/tmp/unique-image.png"
        fake_image_bytes = b"downloaded-png-data-12345"

        mock_storage = AsyncMock()
        mock_storage.upload_image = AsyncMock(return_value="https://cdn.example.com/img.png")

        mock_openai = AsyncMock()
        mock_openai.images = AsyncMock()
        mock_openai.images.generate = AsyncMock(return_value=_make_openai_image_response(dalle_url))

        with patch("httpx.AsyncClient") as mock_httpx_cls:
            mock_http_client = AsyncMock()
            mock_http_client.__aenter__ = AsyncMock(return_value=mock_http_client)
            mock_http_client.__aexit__ = AsyncMock(return_value=None)
            mock_response = MagicMock()
            mock_response.content = fake_image_bytes
            mock_http_client.get = AsyncMock(return_value=mock_response)
            mock_httpx_cls.return_value = mock_http_client

            service = DallE3ImageService(openai_client=mock_openai, storage=mock_storage)
            await service.generate_illustration(
                page_text="Bears play.",
                theme=BookTheme.NATURE,
                age_range=AgeRange.YOUNG,
                page_number=2,
                book_id="book-1",
            )

        # Verify download was called with the DALL-E URL
        mock_http_client.get.assert_called_once_with(dalle_url)
        # Verify the downloaded bytes were passed to upload_image
        uploaded_bytes = mock_storage.upload_image.call_args[0][0]
        assert uploaded_bytes == fake_image_bytes

    @pytest.mark.asyncio
    async def test_illustration_prompt_contains_no_violent_content_keywords(self) -> None:
        """The generated prompt must not contain violent/scary/adult keywords."""
        from src.adapters.output.ai.image_service import (
            _build_illustration_prompt,
        )

        prompt = _build_illustration_prompt(
            page_text="A friendly bear meets a rabbit in a meadow.",
            theme=BookTheme.ANIMALS,
            age_range=AgeRange.YOUNG,
            page_number=1,
        )

        forbidden_keywords = [
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
        prompt_lower = prompt.lower()
        for keyword in forbidden_keywords:
            # Use word-boundary matching to avoid false positives like
            # "war" inside "watercolor" or "warm".
            assert not re.search(rf"\b{re.escape(keyword)}\b", prompt_lower), (
                f"Prompt contains forbidden keyword '{keyword}': {prompt}"
            )

    @pytest.mark.asyncio
    async def test_illustration_prompt_contains_style_keywords(self) -> None:
        """The illustration prompt must include children's book style descriptors."""
        from src.adapters.output.ai.image_service import _build_illustration_prompt

        prompt = _build_illustration_prompt(
            page_text="A small girl picks flowers.",
            theme=BookTheme.NATURE,
            age_range=AgeRange.MIDDLE,
            page_number=3,
        )

        prompt_lower = prompt.lower()
        # Must have at least some style indicators appropriate for children's books
        assert any(
            kw in prompt_lower
            for kw in ["children", "watercolor", "illustration", "friendly", "soft", "cute"]
        ), f"Prompt lacks style keywords: {prompt}"

    @pytest.mark.asyncio
    async def test_illustration_prompt_includes_page_text(self) -> None:
        """The page text (truncated to 200 chars) must appear in the illustration prompt."""
        from src.adapters.output.ai.image_service import _build_illustration_prompt

        page_text = "A little elephant named Ellie splashes in the river."
        prompt = _build_illustration_prompt(
            page_text=page_text,
            theme=BookTheme.ANIMALS,
            age_range=AgeRange.YOUNG,
            page_number=1,
        )

        # At least the first portion of the text should inform the prompt
        assert "elephant" in prompt.lower() or page_text[:50].lower() in prompt.lower(), (
            f"Page text not reflected in prompt: {prompt}"
        )


class TestDallE3ImageServiceGenerateCover:
    """Tests for generate_cover method."""

    @pytest.mark.asyncio
    async def test_generate_cover_returns_url(self) -> None:
        """generate_cover must return a public URL string."""
        from src.adapters.output.ai.image_service import DallE3ImageService

        mock_storage = AsyncMock()
        mock_storage.upload_image = AsyncMock(
            return_value="https://s3.example.com/books/book-99/cover.png"
        )

        mock_openai = AsyncMock()
        mock_openai.images = AsyncMock()
        mock_openai.images.generate = AsyncMock(
            return_value=_make_openai_image_response("https://dalle.openai.com/tmp/cover.png")
        )

        with patch("httpx.AsyncClient") as mock_httpx_cls:
            mock_http_client = AsyncMock()
            mock_http_client.__aenter__ = AsyncMock(return_value=mock_http_client)
            mock_http_client.__aexit__ = AsyncMock(return_value=None)
            mock_response = MagicMock()
            mock_response.content = b"cover-png-bytes"
            mock_http_client.get = AsyncMock(return_value=mock_response)
            mock_httpx_cls.return_value = mock_http_client

            service = DallE3ImageService(openai_client=mock_openai, storage=mock_storage)
            result = await service.generate_cover(
                title="Der kleine Bär",
                theme=BookTheme.ANIMALS,
                age_range=AgeRange.YOUNG,
                book_id="book-99",
            )

        assert isinstance(result, str)
        assert result == "https://s3.example.com/books/book-99/cover.png"

    @pytest.mark.asyncio
    async def test_generate_cover_uploads_with_correct_s3_key(self) -> None:
        """Cover S3 key must follow books/{book_id}/cover.png."""
        from src.adapters.output.ai.image_service import DallE3ImageService

        mock_storage = AsyncMock()
        mock_storage.upload_image = AsyncMock(return_value="https://cdn.example.com/cover.png")

        mock_openai = AsyncMock()
        mock_openai.images = AsyncMock()
        mock_openai.images.generate = AsyncMock(
            return_value=_make_openai_image_response("https://dalle.openai.com/tmp/cover.png")
        )

        with patch("httpx.AsyncClient") as mock_httpx_cls:
            mock_http_client = AsyncMock()
            mock_http_client.__aenter__ = AsyncMock(return_value=mock_http_client)
            mock_http_client.__aexit__ = AsyncMock(return_value=None)
            mock_response = MagicMock()
            mock_response.content = b"cover-bytes"
            mock_http_client.get = AsyncMock(return_value=mock_response)
            mock_httpx_cls.return_value = mock_http_client

            service = DallE3ImageService(openai_client=mock_openai, storage=mock_storage)
            await service.generate_cover(
                title="Adventure in the Forest",
                theme=BookTheme.ADVENTURE,
                age_range=AgeRange.OLDER,
                book_id="book-77",
            )

        s3_key = mock_storage.upload_image.call_args[0][1]
        assert s3_key == "books/book-77/cover.png"

    @pytest.mark.asyncio
    async def test_generate_cover_prompt_contains_title(self) -> None:
        """The cover prompt must include the book title."""
        from src.adapters.output.ai.image_service import _build_cover_prompt

        title = "The Magical Forest"
        prompt = _build_cover_prompt(
            title=title,
            theme=BookTheme.NATURE,
            age_range=AgeRange.MIDDLE,
        )

        assert title in prompt or title.lower() in prompt.lower(), (
            f"Title not found in cover prompt: {prompt}"
        )

    @pytest.mark.asyncio
    async def test_generate_cover_prompt_contains_no_violent_keywords(self) -> None:
        """Cover prompt must not contain violent/scary/adult keywords."""
        from src.adapters.output.ai.image_service import _build_cover_prompt

        prompt = _build_cover_prompt(
            title="Friends Forever",
            theme=BookTheme.FRIENDSHIP,
            age_range=AgeRange.YOUNG,
        )

        forbidden_keywords = [
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
        prompt_lower = prompt.lower()
        for keyword in forbidden_keywords:
            # Use word-boundary matching to avoid false positives like
            # "war" inside "watercolor" or "warm".
            assert not re.search(rf"\b{re.escape(keyword)}\b", prompt_lower), (
                f"Cover prompt contains forbidden keyword '{keyword}': {prompt}"
            )

    @pytest.mark.asyncio
    async def test_generate_cover_downloads_image_from_dalle_url(self) -> None:
        """generate_cover must download bytes from the DALL-E URL."""
        from src.adapters.output.ai.image_service import DallE3ImageService

        dalle_url = "https://dalle.openai.com/tmp/cover-unique.png"
        cover_bytes = b"cover-image-data-xyz"

        mock_storage = AsyncMock()
        mock_storage.upload_image = AsyncMock(return_value="https://cdn.example.com/cover.png")

        mock_openai = AsyncMock()
        mock_openai.images = AsyncMock()
        mock_openai.images.generate = AsyncMock(return_value=_make_openai_image_response(dalle_url))

        with patch("httpx.AsyncClient") as mock_httpx_cls:
            mock_http_client = AsyncMock()
            mock_http_client.__aenter__ = AsyncMock(return_value=mock_http_client)
            mock_http_client.__aexit__ = AsyncMock(return_value=None)
            mock_response = MagicMock()
            mock_response.content = cover_bytes
            mock_http_client.get = AsyncMock(return_value=mock_response)
            mock_httpx_cls.return_value = mock_http_client

            service = DallE3ImageService(openai_client=mock_openai, storage=mock_storage)
            await service.generate_cover(
                title="My Story",
                theme=BookTheme.VALUES,
                age_range=AgeRange.OLDER,
                book_id="book-55",
            )

        mock_http_client.get.assert_called_once_with(dalle_url)
        uploaded_bytes = mock_storage.upload_image.call_args[0][0]
        assert uploaded_bytes == cover_bytes


class TestDallE3ImageServiceConstructor:
    """Tests for the constructor / configuration."""

    def test_default_model_is_dall_e_3(self) -> None:
        """Default model must be dall-e-3."""
        from src.adapters.output.ai.image_service import DallE3ImageService

        mock_openai = MagicMock()
        mock_storage = MagicMock()
        service = DallE3ImageService(openai_client=mock_openai, storage=mock_storage)
        assert service._model == "dall-e-3"

    def test_custom_model_is_stored(self) -> None:
        """A custom model passed to __init__ must be stored."""
        from src.adapters.output.ai.image_service import DallE3ImageService

        mock_openai = MagicMock()
        mock_storage = MagicMock()
        service = DallE3ImageService(
            openai_client=mock_openai, storage=mock_storage, model="dall-e-2"
        )
        assert service._model == "dall-e-2"
