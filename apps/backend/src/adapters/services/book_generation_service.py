"""BookGenerationService — orchestrates the full AI book generation pipeline.

Pipeline:
    1. Pick a random theme + age range.
    2. Generate a German story via Claude (claude-sonnet-4-6).
    3. Validate content safety with a second Claude call.
    4. Translate each page into AR, FR, EN via Claude.
    5. Generate per-page DALL-E illustrations via IImageService.
    6. Generate TTS audio per page per language via ITTSService.
    7. Assemble the Book domain entity.
    8. Persist via IBookRepository.set_daily_book.
    9. Return the saved Book.

No FastAPI, no SQLAlchemy, no OpenAI SDK imported here — hexagonal architecture
principle: this adapter only depends on domain entities/value-objects and port
interfaces.
"""

from __future__ import annotations

import json
import logging
import random
import re
from datetime import UTC, datetime
from typing import Any, cast
from uuid import uuid4

from anthropic import AsyncAnthropic
from anthropic.types import TextBlock

from ...core.domain.entities.book import Book, BookPage, BookTranslation, PageContent
from ...core.domain.value_objects.language import AgeRange, BookTheme, Language
from ...core.ports.output.i_book_repository import IBookRepository
from ...core.ports.output.i_image_service import IImageService
from ...core.ports.output.i_tts_service import ITTSService

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Prompt templates
# ---------------------------------------------------------------------------

STORY_SYSTEM_PROMPT = """Du bist ein Kinderbuchautor für Kinder von 3-8 Jahren.
STRENGE REGELN:
- Nur kindgerechte, positive Inhalte
- Keine Gewalt, Angst, politische Themen, religiöse Konflikte
- Einfache Sprache (A1-A2 Niveau für Zielgruppe)
- Jede Seite: 2-4 Sätze, max 50 Wörter
- Format: Antworte NUR mit validem JSON: {"title": "...", "pages": ["...", "..."]}
"""

SAFETY_CHECK_PROMPT = """Prüfe ob folgender Text kindgerecht ist (für Kinder 3-8 Jahre).
<story>{text}</story>
Antworte NUR mit "SAFE" oder "UNSAFE"."""

TRANSLATION_SYSTEM_PROMPT = """Du bist ein professioneller Übersetzer für Kinderbücher.
Übersetze den deutschen Text ins {language_name}.
Behalte den kindgerechten Ton und einfache Sprache bei.
Antworte NUR mit dem übersetzten Text, ohne Erklärungen."""

# Language name used in the translation prompt (German grammatical form)
_LANGUAGE_NAMES: dict[Language, str] = {
    Language.AR: "Arabische",
    Language.FR: "Französische",
    Language.EN: "Englische",
}

_MODEL = "claude-sonnet-4-6"

# Theme → German user prompt fragment
_THEME_PROMPTS: dict[BookTheme, str] = {
    BookTheme.ANIMALS: "Schreibe eine Geschichte über ein Tier im Wald.",
    BookTheme.ADVENTURE: "Schreibe eine Abenteuergeschichte über ein mutiges Kind.",
    BookTheme.FRIENDSHIP: "Schreibe eine Geschichte über Freundschaft zwischen zwei Kindern.",
    BookTheme.NATURE: "Schreibe eine Geschichte über die Natur und die Jahreszeiten.",
    BookTheme.CULTURE: "Schreibe eine Geschichte über verschiedene Kulturen der Welt.",
    BookTheme.VALUES: "Schreibe eine Geschichte über Ehrlichkeit und Hilfsbereitschaft.",
}


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


class BookGenerationService:
    """Orchestrates the full AI-powered children's book generation pipeline."""

    def __init__(
        self,
        anthropic_client: AsyncAnthropic,
        book_repository: IBookRepository,
        tts_service: ITTSService,
        image_service: IImageService,
    ) -> None:
        self._claude = anthropic_client
        self._repo = book_repository
        self._tts = tts_service
        self._images = image_service

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def generate_daily_book(self) -> Book:
        """Full pipeline: story → safety → translations → illustrations → audio → save."""
        theme = random.choice(list(BookTheme))  # noqa: S311
        age_range = random.choice(list(AgeRange))  # noqa: S311
        book_id = str(uuid4())

        logger.info(
            "Generating daily book: theme=%s age_range=%s book_id=%s", theme, age_range, book_id
        )

        # 1. Generate German story
        story_data = await self._generate_story_german(theme, age_range)
        german_title: str = cast(str, story_data["title"])
        german_pages: list[str] = cast(list[str], story_data["pages"])

        # 2. Content safety check
        full_text = " ".join(german_pages)
        is_safe = await self._validate_content_safety(full_text)
        if not is_safe:
            raise ValueError("Content safety check failed")

        # 3. Translate all pages into AR, FR, EN
        translated: dict[Language, list[str]] = {}
        for target_lang in (Language.AR, Language.FR, Language.EN):
            translated_pages: list[str] = []
            for page_text in german_pages:
                translated_text = await self._translate_page(page_text, target_lang)
                translated_pages.append(translated_text)
            translated[target_lang] = translated_pages

        # 4. Build BookPage objects (illustrations + TTS happen per page)
        pages: list[BookPage] = []
        for page_idx, de_text in enumerate(german_pages):
            page_id = str(uuid4())
            page_number = page_idx + 1

            # 4a. Illustration
            illustration_url = await self._images.generate_illustration(
                page_text=de_text,
                theme=theme,
                age_range=age_range,
                page_number=page_number,
                book_id=book_id,
            )

            # 4b. TTS for all 4 languages
            page_contents: list[PageContent] = []
            for lang, text_for_page in [
                (Language.DE, de_text),
                (Language.AR, translated[Language.AR][page_idx]),
                (Language.FR, translated[Language.FR][page_idx]),
                (Language.EN, translated[Language.EN][page_idx]),
            ]:
                tts_result = await self._tts.synthesize(
                    text=text_for_page,
                    language=lang,
                    book_id=book_id,
                    page_number=page_number,
                )
                page_contents.append(
                    PageContent(
                        page_id=page_id,
                        language=lang,
                        text=text_for_page,
                        audio_url=tts_result.audio_url,
                        word_timestamps=tts_result.word_timestamps,
                    )
                )

            pages.append(
                BookPage(
                    id=page_id,
                    book_id=book_id,
                    page_number=page_number,
                    illustration_url=illustration_url,
                    contents=page_contents,
                )
            )

        # 5. Generate cover
        cover_url = await self._images.generate_cover(
            title=german_title,
            theme=theme,
            age_range=age_range,
            book_id=book_id,
        )

        # 6. Build translations for all 4 languages (title only)
        book_translations: list[BookTranslation] = [
            BookTranslation(book_id=book_id, language=Language.DE, title=german_title),
            BookTranslation(
                book_id=book_id,
                language=Language.AR,
                title=await self._translate_page(german_title, Language.AR),
            ),
            BookTranslation(
                book_id=book_id,
                language=Language.FR,
                title=await self._translate_page(german_title, Language.FR),
            ),
            BookTranslation(
                book_id=book_id,
                language=Language.EN,
                title=await self._translate_page(german_title, Language.EN),
            ),
        ]

        # 7. Assemble Book entity
        book = Book(
            id=book_id,
            theme=theme,
            age_range=age_range,
            page_count=len(pages),
            price_single=0.0,
            published_at=datetime.now(UTC),
            is_daily_book=True,
            cover_image_url=cover_url,
            translations=book_translations,
            pages=pages,
        )

        # 8. Persist
        saved_book = await self._repo.save(book)
        await self._repo.set_daily_book(saved_book.id)

        logger.info("Daily book saved: id=%s title=%s", saved_book.id, german_title)
        return saved_book

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    async def _generate_story_german(
        self, theme: BookTheme, age_range: AgeRange
    ) -> dict[str, object]:
        """Call Claude to generate a German children's story.

        Returns a dict with keys 'title' (str) and 'pages' (list[str]).
        Retries once if the response cannot be parsed as JSON.
        """
        user_prompt = _THEME_PROMPTS.get(theme, "Schreibe eine Kindergeschichte.")
        user_prompt += f" Die Geschichte ist für Kinder im Alter von {age_range} Jahren."

        for attempt in range(2):
            response = await self._claude.messages.create(
                model=_MODEL,
                max_tokens=2048,
                system=STORY_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_prompt}],
            )
            raw_text = self._extract_text(response)

            try:
                return self._parse_json_response(raw_text)
            except (json.JSONDecodeError, KeyError, TypeError) as exc:
                if attempt == 0:
                    logger.warning("Story JSON parse failed (attempt 1), retrying: %s", exc)
                    continue
                raise ValueError(
                    f"Claude returned invalid story JSON after retry: {raw_text!r}"
                ) from exc

        # Unreachable, but satisfies mypy
        raise RuntimeError("Unexpected code path in _generate_story_german")

    async def _translate_page(self, german_text: str, target_language: Language) -> str:
        """Translate a single page (or title) from German to target_language."""
        language_name = _LANGUAGE_NAMES.get(target_language)
        if language_name is None:
            raise ValueError(f"Cannot translate to source language: {target_language}")
        system_prompt = TRANSLATION_SYSTEM_PROMPT.format(language_name=language_name)

        response = await self._claude.messages.create(
            model=_MODEL,
            max_tokens=512,
            system=system_prompt,
            messages=[{"role": "user", "content": german_text}],
        )
        return self._extract_text(response).strip()

    async def _validate_content_safety(self, text: str) -> bool:
        """Second Claude call — returns True only when the model responds with 'SAFE'."""
        prompt = SAFETY_CHECK_PROMPT.format(text=text)
        response = await self._claude.messages.create(
            model=_MODEL,
            max_tokens=16,
            messages=[{"role": "user", "content": prompt}],
        )
        verdict: str = self._extract_text(response).strip().upper()
        return verdict == "SAFE"

    # ------------------------------------------------------------------
    # Utility
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_text(response: Any) -> str:  # noqa: ANN401
        """Extract plain text from the first content block of a Claude response.

        Accepts any object that has a ``text`` attribute (covers both the real
        ``anthropic.types.TextBlock`` and test MagicMocks).  Raises ValueError
        when the first block carries no text (e.g. a ToolUseBlock).
        """
        block = response.content[0]
        # Use TextBlock isinstance check in production; fall back to hasattr so
        # that unit-test MagicMocks also work without special-casing.
        if isinstance(block, TextBlock):
            return block.text
        text_attr = getattr(block, "text", None)
        if text_attr is None:
            raise ValueError(f"Unexpected content block type: {type(block)!r}")
        return str(text_attr)

    @staticmethod
    def _parse_json_response(raw: str) -> dict[str, object]:
        """Extract JSON from Claude's response.

        Handles cases where the model wraps the JSON in markdown code fences
        (```json ... ```) or adds explanatory text before/after.
        """
        # 1. Try to parse as-is
        try:
            return cast(dict[str, object], json.loads(raw))
        except json.JSONDecodeError:
            pass

        # 2. Strip markdown code fences
        fence_match = re.search(r"```(?:json)?\s*([\s\S]+?)```", raw)
        if fence_match:
            return cast(dict[str, object], json.loads(fence_match.group(1).strip()))

        # 3. Extract the first {...} block
        brace_match = re.search(r"\{[\s\S]+\}", raw)
        if brace_match:
            return cast(dict[str, object], json.loads(brace_match.group(0)))

        raise json.JSONDecodeError("No JSON object found in Claude response", raw, 0)


# ---------------------------------------------------------------------------
# ARQ background job
# ---------------------------------------------------------------------------


async def generate_daily_book_job(ctx: dict) -> None:  # type: ignore[type-arg]
    """ARQ job entry point.

    The ARQ worker must populate ctx['book_generation_service'] with a
    fully-initialised BookGenerationService instance before enqueueing this job.
    """
    service: BookGenerationService = ctx["book_generation_service"]
    book = await service.generate_daily_book()
    logger.info("Daily book generated: %s", book.id)
