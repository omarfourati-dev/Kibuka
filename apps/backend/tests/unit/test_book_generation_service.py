"""Unit tests for BookGenerationService — written BEFORE implementation (TDD RED phase).

Pipeline under test uses OpenAI (GPT for story/translations/safety verdict,
Moderation API as a hard safety gate) — Anthropic is intentionally NOT used here.
"""

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


def _make_chat_completion(text: str) -> MagicMock:
    """Build a minimal OpenAI ChatCompletion mock whose choices[0].message.content == text."""
    message = MagicMock()
    message.content = text
    choice = MagicMock()
    choice.message = message
    completion = MagicMock()
    completion.choices = [choice]
    return completion


def _make_moderation_response(flagged: bool) -> MagicMock:
    """Build a minimal OpenAI Moderation response mock."""
    result = MagicMock()
    result.flagged = flagged
    response = MagicMock()
    response.results = [result]
    return response


def _make_tts_result(language: Language) -> TTSResult:
    return TTSResult(
        audio_data=b"fake-audio",
        audio_url=f"https://s3.example.com/audio/{language}.mp3",
        word_timestamps=[],
        language=language,
    )


def _make_openai_client(chat_side_effect, flagged: bool = False) -> MagicMock:
    """AsyncOpenAI client mock with chat.completions.create + moderations.create."""
    client = MagicMock()
    client.chat = MagicMock()
    client.chat.completions = MagicMock()
    client.chat.completions.create = AsyncMock(side_effect=chat_side_effect)
    client.moderations = MagicMock()
    client.moderations.create = AsyncMock(return_value=_make_moderation_response(flagged))
    return client


@pytest.fixture()
def mock_openai_client():
    """AsyncOpenAI client: story returns valid JSON; safety returns "SAFE";
    translations return translated text; moderation never flags."""
    call_count = 0

    async def create_side_effect(*args, **kwargs):  # noqa: ARG001
        nonlocal call_count
        call_count += 1
        # First call: story generation
        if call_count == 1:
            return _make_chat_completion(_STORY_JSON)
        # Second call: safety verdict
        if call_count == 2:
            return _make_chat_completion("SAFE")
        # All subsequent calls: translations
        return _make_chat_completion("Translated text")

    return _make_openai_client(create_side_effect)


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
def service(mock_openai_client, mock_book_repository, mock_tts_service, mock_image_service):
    return BookGenerationService(
        openai_client=mock_openai_client,
        book_repository=mock_book_repository,
        tts_service=mock_tts_service,
        image_service=mock_image_service,
    )


@pytest.fixture()
def service_with_mocks(mock_book_repository, mock_tts_service, mock_image_service):
    """Return (service, mocks_dict) for tests that need to customise the OpenAI client."""
    client = _make_openai_client(chat_side_effect=None)
    svc = BookGenerationService(
        openai_client=client,
        book_repository=mock_book_repository,
        tts_service=mock_tts_service,
        image_service=mock_image_service,
    )
    return svc, {"openai": client}


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
    async def test_generate_daily_book_uses_injected_price(
        self, mock_openai_client, mock_book_repository, mock_tts_service, mock_image_service
    ):
        """price_single=0.0 machte jedes Buch gratis — der Preis kommt jetzt aus der Config."""
        svc = BookGenerationService(
            openai_client=mock_openai_client,
            book_repository=mock_book_repository,
            tts_service=mock_tts_service,
            image_service=mock_image_service,
            price_single=3.49,
        )
        book = await svc.generate_daily_book()
        assert book.price_single == 3.49

    @pytest.mark.asyncio
    async def test_generate_daily_book_default_price_is_not_free(self, service):
        book = await service.generate_daily_book()
        assert book.price_single > 0

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
    async def test_generate_daily_book_runs_moderation_gate(self, service, mock_openai_client):
        """The free OpenAI Moderation API must be called as a hard safety gate."""
        await service.generate_daily_book()

        mock_openai_client.moderations.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_daily_book_raises_if_moderation_flags_content(
        self, mock_book_repository, mock_tts_service, mock_image_service
    ):
        """When the Moderation API flags the story the service must raise ValueError."""

        async def chat_side_effect(*args, **kwargs):  # noqa: ARG001
            return _make_chat_completion(_STORY_JSON)

        flagged_client = _make_openai_client(chat_side_effect, flagged=True)

        svc = BookGenerationService(
            openai_client=flagged_client,
            book_repository=mock_book_repository,
            tts_service=mock_tts_service,
            image_service=mock_image_service,
        )

        with pytest.raises(ValueError, match="Content safety check failed"):
            await svc.generate_daily_book()

    @pytest.mark.asyncio
    async def test_generate_daily_book_raises_if_llm_verdict_is_unsafe(
        self, mock_book_repository, mock_tts_service, mock_image_service
    ):
        """When the GPT child-suitability verdict is UNSAFE the service must raise."""
        call_count = 0

        async def unsafe_side_effect(*args, **kwargs):  # noqa: ARG001
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return _make_chat_completion(_STORY_JSON)
            return _make_chat_completion("UNSAFE")

        unsafe_client = _make_openai_client(unsafe_side_effect, flagged=False)

        svc = BookGenerationService(
            openai_client=unsafe_client,
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


class TestGenerateDailyBookJob:
    """The ARQ job must commit the worker session — repositories only flush."""

    @pytest.mark.asyncio
    async def test_job_commits_session_on_success(self, service) -> None:
        from src.adapters.services.book_generation_service import generate_daily_book_job

        session = AsyncMock()
        ctx = {"book_generation_service": service, "_db_session": session}

        await generate_daily_book_job(ctx)

        session.commit.assert_awaited_once()
        session.rollback.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_job_rolls_back_on_failure(
        self, mock_book_repository, mock_tts_service, mock_image_service
    ) -> None:
        from src.adapters.services.book_generation_service import generate_daily_book_job

        failing_client = _make_openai_client(chat_side_effect=RuntimeError("api down"))
        svc = BookGenerationService(
            openai_client=failing_client,
            book_repository=mock_book_repository,
            tts_service=mock_tts_service,
            image_service=mock_image_service,
        )
        session = AsyncMock()
        ctx = {"book_generation_service": svc, "_db_session": session}

        with pytest.raises(RuntimeError):
            await generate_daily_book_job(ctx)

        session.rollback.assert_awaited_once()
        session.commit.assert_not_awaited()


class TestTranslatePage:
    @pytest.mark.asyncio
    async def test_translate_page_calls_gpt_with_correct_language(
        self, service, mock_openai_client
    ):
        """_translate_page must include the target language name in the system message."""
        mock_openai_client.chat.completions.create = AsyncMock(
            return_value=_make_chat_completion("Hola mundo")
        )

        result = await service._translate_page("Hallo Welt", Language.EN)

        assert result == "Hola mundo"
        call_kwargs = mock_openai_client.chat.completions.create.call_args[1]
        messages = call_kwargs["messages"]
        system_message = next(m["content"] for m in messages if m["role"] == "system")
        assert "Englische" in system_message

    @pytest.mark.asyncio
    async def test_translate_page_arabic_prompt_mentions_arabic(self, service, mock_openai_client):
        mock_openai_client.chat.completions.create = AsyncMock(
            return_value=_make_chat_completion("مرحبا")
        )

        await service._translate_page("Hallo", Language.AR)

        call_kwargs = mock_openai_client.chat.completions.create.call_args[1]
        messages = call_kwargs["messages"]
        system_message = next(m["content"] for m in messages if m["role"] == "system")
        assert "Arabische" in system_message


class TestStoryGeneration:
    @pytest.mark.asyncio
    async def test_story_generation_parses_gpt_json_response(self, service, mock_openai_client):
        """_generate_story_german must correctly parse the JSON GPT returns."""
        mock_openai_client.chat.completions.create = AsyncMock(
            return_value=_make_chat_completion(_STORY_JSON)
        )

        result = await service._generate_story_german(BookTheme.ANIMALS, AgeRange.YOUNG)

        assert result["title"] == "Der neugierige Fuchs"
        assert len(result["pages"]) == 3
        assert result["pages"][0] == "Seite 1 Text."

    @pytest.mark.asyncio
    async def test_story_generation_handles_json_wrapped_in_extra_text(
        self, service, mock_openai_client
    ):
        """The model sometimes wraps JSON in markdown code fences; we must strip them."""
        wrapped = f"Sure, here is the story:\n```json\n{_STORY_JSON}\n```"
        mock_openai_client.chat.completions.create = AsyncMock(
            return_value=_make_chat_completion(wrapped)
        )

        result = await service._generate_story_german(BookTheme.FRIENDSHIP, AgeRange.MIDDLE)

        assert result["title"] == "Der neugierige Fuchs"
        assert len(result["pages"]) == 3

    @pytest.mark.asyncio
    async def test_story_generation_retries_on_invalid_json(self, service_with_mocks):
        """On first invalid JSON, it retries and succeeds on second attempt."""
        service, mocks = service_with_mocks
        openai_client = mocks["openai"]

        call_count = 0

        async def side_effect(*args, **kwargs):  # noqa: ARG001
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return _make_chat_completion("not valid json at all")
            return _make_chat_completion(_STORY_JSON)

        openai_client.chat.completions.create = AsyncMock(side_effect=side_effect)

        result = await service._generate_story_german(BookTheme.ANIMALS, AgeRange.YOUNG)

        assert result["title"] == "Der neugierige Fuchs"
        assert len(result["pages"]) == 3
        assert call_count == 2

    @pytest.mark.asyncio
    async def test_story_generation_raises_after_two_json_failures(self, service_with_mocks):
        """Raises ValueError after two consecutive JSON parse failures."""
        service, mocks = service_with_mocks
        openai_client = mocks["openai"]

        openai_client.chat.completions.create = AsyncMock(
            return_value=_make_chat_completion("this is not json either")
        )

        with pytest.raises(ValueError):
            await service._generate_story_german(BookTheme.ANIMALS, AgeRange.YOUNG)
