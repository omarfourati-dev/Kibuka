"""Unit tests for BookGenerationService — written BEFORE implementation (TDD RED phase)."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.adapters.services.book_generation_service import BookGenerationService
from src.core.domain.entities.book import Book
from src.core.domain.value_objects.language import AgeRange, BookTheme, Language
from src.core.ports.output.i_tts_service import TTSResult

# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------

_STORY_JSON = json.dumps(
    {
        "title": "Der neugierige Fuchs",
        "pages": ["Seite 1 Text.", "Seite 2 Text.", "Seite 3 Text."],
    }
)


def _make_claude_message(text: str) -> MagicMock:
    """Build a minimal Anthropic message mock whose content[0].text == text."""
    content_block = MagicMock()
    content_block.text = text
    msg = MagicMock()
    msg.content = [content_block]
    return msg


def _make_tts_result(language: Language) -> TTSResult:
    return TTSResult(
        audio_data=b"fake-audio",
        audio_url=f"https://s3.example.com/audio/{language}.mp3",
        word_timestamps=[],
        language=language,
    )


@pytest.fixture()
def mock_anthropic_client():
    """AsyncAnthropic client whose messages.create is an AsyncMock."""
    client = MagicMock()
    client.messages = MagicMock()
    # Default: story generation returns valid JSON; safety returns "SAFE";
    # translations return translated text.
    call_count = 0

    async def create_side_effect(*args, **kwargs):  # noqa: ARG001
        nonlocal call_count
        call_count += 1
        # First call: story generation
        if call_count == 1:
            return _make_claude_message(_STORY_JSON)
        # Second call: safety check
        if call_count == 2:
            return _make_claude_message("SAFE")
        # All subsequent calls: translations
        return _make_claude_message("Translated text")

    client.messages.create = AsyncMock(side_effect=create_side_effect)
    return client


@pytest.fixture()
def mock_book_repository():
    repo = AsyncMock()
    # save returns the same book passed to it
    repo.save = AsyncMock(side_effect=lambda book: book)
    repo.set_daily_book = AsyncMock(return_value=None)
    return repo


@pytest.fixture()
def mock_tts_service():
    svc = AsyncMock()
    svc.synthesize = AsyncMock(
        side_effect=lambda text, language, book_id, page_number: _make_tts_result(language)
    )
    return svc


@pytest.fixture()
def mock_image_service():
    svc = AsyncMock()
    svc.generate_illustration = AsyncMock(return_value="https://s3.example.com/illustration.png")
    svc.generate_cover = AsyncMock(return_value="https://s3.example.com/cover.png")
    return svc


@pytest.fixture()
def service(mock_anthropic_client, mock_book_repository, mock_tts_service, mock_image_service):
    return BookGenerationService(
        anthropic_client=mock_anthropic_client,
        book_repository=mock_book_repository,
        tts_service=mock_tts_service,
        image_service=mock_image_service,
    )


@pytest.fixture()
def service_with_mocks(mock_book_repository, mock_tts_service, mock_image_service):
    """Return (service, mocks_dict) for tests that need to customise the Anthropic client."""
    client = MagicMock()
    client.messages = MagicMock()
    svc = BookGenerationService(
        anthropic_client=client,
        book_repository=mock_book_repository,
        tts_service=mock_tts_service,
        image_service=mock_image_service,
    )
    return svc, {"anthropic": client}


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestGenerateDailyBook:
    @pytest.mark.asyncio
    async def test_generate_daily_book_creates_book_with_4_language_translations(self, service):
        book = await service.generate_daily_book()

        assert isinstance(book, Book)
        # Expect translations for all 4 languages
        languages_present = {t.language for t in book.translations}
        assert Language.DE in languages_present
        assert Language.AR in languages_present
        assert Language.FR in languages_present
        assert Language.EN in languages_present

    @pytest.mark.asyncio
    async def test_generate_daily_book_sets_book_as_daily(self, service, mock_book_repository):
        book = await service.generate_daily_book()

        mock_book_repository.set_daily_book.assert_called_once_with(book.id)

    @pytest.mark.asyncio
    async def test_generate_daily_book_calls_tts_for_all_pages_and_languages(
        self, service, mock_tts_service
    ):
        book = await service.generate_daily_book()

        # Story has 3 pages × 4 languages = 12 TTS calls
        assert mock_tts_service.synthesize.call_count == len(book.pages) * 4

    @pytest.mark.asyncio
    async def test_generate_daily_book_calls_image_service_for_all_pages(
        self, service, mock_image_service
    ):
        book = await service.generate_daily_book()

        assert mock_image_service.generate_illustration.call_count == len(book.pages)

    @pytest.mark.asyncio
    async def test_generate_daily_book_calls_cover_generation(self, service, mock_image_service):
        book = await service.generate_daily_book()

        mock_image_service.generate_cover.assert_called_once()
        assert book.cover_image_url == "https://s3.example.com/cover.png"

    @pytest.mark.asyncio
    async def test_generate_daily_book_raises_if_content_safety_fails(
        self, mock_book_repository, mock_tts_service, mock_image_service
    ):
        """When safety check returns UNSAFE the service must raise ValueError."""
        unsafe_client = MagicMock()
        unsafe_client.messages = MagicMock()

        call_count = 0

        async def unsafe_side_effect(*args, **kwargs):  # noqa: ARG001
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return _make_claude_message(_STORY_JSON)
            return _make_claude_message("UNSAFE")

        unsafe_client.messages.create = AsyncMock(side_effect=unsafe_side_effect)

        svc = BookGenerationService(
            anthropic_client=unsafe_client,
            book_repository=mock_book_repository,
            tts_service=mock_tts_service,
            image_service=mock_image_service,
        )

        with pytest.raises(ValueError, match="Content safety check failed"):
            await svc.generate_daily_book()

    @pytest.mark.asyncio
    async def test_generate_daily_book_saves_book_to_repository(
        self, service, mock_book_repository
    ):
        book = await service.generate_daily_book()

        mock_book_repository.save.assert_called_once()
        saved_book = mock_book_repository.save.call_args[0][0]
        assert saved_book.id == book.id


class TestTranslatePage:
    @pytest.mark.asyncio
    async def test_translate_page_calls_claude_with_correct_language(
        self, service, mock_anthropic_client
    ):
        """_translate_page must include the target language name in the system prompt."""
        # Reset call count so we control the mock directly
        mock_anthropic_client.messages.create = AsyncMock(
            return_value=_make_claude_message("Hola mundo")
        )

        result = await service._translate_page("Hallo Welt", Language.EN)

        assert result == "Hola mundo"
        call_kwargs = mock_anthropic_client.messages.create.call_args[1]
        # The system prompt must mention the English language name
        system_prompt = call_kwargs.get("system", "")
        assert "Englische" in system_prompt

    @pytest.mark.asyncio
    async def test_translate_page_arabic_prompt_mentions_arabic(
        self, service, mock_anthropic_client
    ):
        mock_anthropic_client.messages.create = AsyncMock(
            return_value=_make_claude_message("مرحبا")
        )

        await service._translate_page("Hallo", Language.AR)

        call_kwargs = mock_anthropic_client.messages.create.call_args[1]
        system_prompt = call_kwargs.get("system", "")
        assert "Arabische" in system_prompt


class TestStoryGeneration:
    @pytest.mark.asyncio
    async def test_story_generation_parses_claude_json_response(
        self, service, mock_anthropic_client
    ):
        """_generate_story_german must correctly parse the JSON Claude returns."""
        mock_anthropic_client.messages.create = AsyncMock(
            return_value=_make_claude_message(_STORY_JSON)
        )

        result = await service._generate_story_german(BookTheme.ANIMALS, AgeRange.YOUNG)

        assert result["title"] == "Der neugierige Fuchs"
        assert len(result["pages"]) == 3
        assert result["pages"][0] == "Seite 1 Text."

    @pytest.mark.asyncio
    async def test_story_generation_handles_json_wrapped_in_extra_text(
        self, service, mock_anthropic_client
    ):
        """Claude sometimes wraps JSON in markdown code fences; we must strip them."""
        wrapped = f"Sure, here is the story:\n```json\n{_STORY_JSON}\n```"
        mock_anthropic_client.messages.create = AsyncMock(
            return_value=_make_claude_message(wrapped)
        )

        result = await service._generate_story_german(BookTheme.FRIENDSHIP, AgeRange.MIDDLE)

        assert result["title"] == "Der neugierige Fuchs"
        assert len(result["pages"]) == 3

    @pytest.mark.asyncio
    async def test_story_generation_retries_on_invalid_json(self, service_with_mocks):
        """On first invalid JSON, it retries and succeeds on second attempt."""
        service, mocks = service_with_mocks
        anthropic = mocks["anthropic"]

        call_count = 0

        async def side_effect(*args, **kwargs):  # noqa: ARG001
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return _make_claude_message("not valid json at all")
            return _make_claude_message(_STORY_JSON)

        anthropic.messages.create = AsyncMock(side_effect=side_effect)

        result = await service._generate_story_german(BookTheme.ANIMALS, AgeRange.YOUNG)

        assert result["title"] == "Der neugierige Fuchs"
        assert len(result["pages"]) == 3
        assert call_count == 2

    @pytest.mark.asyncio
    async def test_story_generation_raises_after_two_json_failures(self, service_with_mocks):
        """Raises ValueError after two consecutive JSON parse failures."""
        service, mocks = service_with_mocks
        anthropic = mocks["anthropic"]

        anthropic.messages.create = AsyncMock(
            return_value=_make_claude_message("this is not json either")
        )

        with pytest.raises(ValueError):
            await service._generate_story_german(BookTheme.ANIMALS, AgeRange.YOUNG)
