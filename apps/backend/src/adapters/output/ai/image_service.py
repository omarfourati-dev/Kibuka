"""OpenAI image generation adapter for children's book illustrations and covers.

Uses gpt-image-1 (dall-e-3 was retired by OpenAI); the model returns base64
payloads directly, so no temporary-URL download is involved.
"""

from __future__ import annotations

import asyncio
import base64

from loguru import logger
from openai import AsyncOpenAI

from ....core.domain.value_objects.language import AgeRange, BookTheme
from ....core.ports.output.i_image_service import IImageService
from ....core.ports.output.i_storage_service import IStorageService
from .image_encoding import to_webp

# ---------------------------------------------------------------------------
# Age-range style modifiers — influence prompt detail level and complexity
# ---------------------------------------------------------------------------

_AGE_STYLE: dict[AgeRange, str] = {
    AgeRange.YOUNG: (
        "very simple shapes, bold outlines, bright primary colors, "
        "extremely cute and friendly characters, minimal background detail"
    ),
    AgeRange.MIDDLE: (
        "semi-detailed, warm and inviting colors, expressive characters, light whimsical background"
    ),
    AgeRange.OLDER: (
        "detailed watercolor style, rich color palette, expressive scene, dynamic composition"
    ),
}

# ---------------------------------------------------------------------------
# Theme mood descriptors
# ---------------------------------------------------------------------------

_THEME_MOOD: dict[BookTheme, str] = {
    BookTheme.ANIMALS: "playful animals, nature setting",
    BookTheme.ADVENTURE: "exciting journey, magical landscape",
    BookTheme.FRIENDSHIP: "warm togetherness, joyful interaction",
    BookTheme.NATURE: "lush greenery, flowers, sunlight",
    BookTheme.CULTURE: "vibrant cultural elements, festive colors",
    BookTheme.VALUES: "heartwarming moment, positive emotion",
}


def _build_illustration_prompt(
    page_text: str,
    theme: BookTheme,
    age_range: AgeRange,
    page_number: int,
) -> str:
    """Build a safe, age-appropriate prompt for a book page illustration.

    Args:
        page_text: The text content of the page (truncated to 200 chars).
        theme: The thematic style of the book.
        age_range: Target age group that influences visual complexity.
        page_number: Current page number (for logging context only).

    Returns:
        A prompt string safe for children's book illustration generation.
    """
    scene_description = page_text[:200].strip()
    age_style = _AGE_STYLE[age_range]
    theme_mood = _THEME_MOOD[theme]

    prompt = (
        f"Children's book illustration, watercolor style, soft colors, friendly, cute, "
        f"age-appropriate for children. "
        f"Scene: {scene_description}. "
        f"Theme mood: {theme_mood}. "
        f"Style: {age_style}. "
        f"No text, no letters, no words in the image. "
        f"Safe for children, positive, uplifting atmosphere."
    )
    logger.debug("Built illustration prompt for page {}: {}", page_number, prompt[:80])
    return prompt


def _build_cover_prompt(
    title: str,
    theme: BookTheme,
    age_range: AgeRange,
) -> str:
    """Build a safe, age-appropriate prompt for a book cover.

    Args:
        title: The book title — must appear prominently in the visual concept.
        theme: Thematic style of the book.
        age_range: Target age group that influences visual complexity.

    Returns:
        A prompt string safe for children's book cover generation.
    """
    age_style = _AGE_STYLE[age_range]
    theme_mood = _THEME_MOOD[theme]

    prompt = (
        f"Children's book cover illustration, watercolor style, soft colors, friendly, cute, "
        f"age-appropriate for children. "
        f"Book title: '{title}'. "
        f"The cover should visually represent the title prominently with an inviting, "
        f"eye-catching composition. "
        f"Theme mood: {theme_mood}. "
        f"Style: {age_style}. "
        f"Professional book cover layout, beautiful and appealing to children. "
        f"Safe for children, positive, uplifting atmosphere."
    )
    logger.debug("Built cover prompt for '{}': {}", title, prompt[:80])
    return prompt


class OpenAIImageService(IImageService):
    """gpt-image-1 adapter for generating children's book illustrations and covers.

    Workflow for each generation:
    1. Build a safe, age-appropriate prompt.
    2. Call the OpenAI images.generate endpoint (returns base64).
    3. Decode the payload and upload the bytes via IStorageService.
    4. Return the public URL from storage.
    """

    def __init__(
        self,
        openai_client: AsyncOpenAI,
        storage: IStorageService,
        model: str = "gpt-image-1",
    ) -> None:
        """
        Args:
            openai_client: Configured AsyncOpenAI client instance.
            storage: Adapter for uploading images to persistent object storage.
            model: OpenAI image model to use (default: ``"gpt-image-1"``).
        """
        self._client = openai_client
        self._storage = storage
        self._model = model

    async def generate_illustration(
        self,
        page_text: str,
        theme: BookTheme,
        age_range: AgeRange,
        page_number: int,
        book_id: str,
    ) -> str:
        """Generate a page illustration and return its permanent public URL."""
        prompt = _build_illustration_prompt(
            page_text=page_text,
            theme=theme,
            age_range=age_range,
            page_number=page_number,
        )

        logger.info(
            "Generating illustration for book={} page={} theme={} age={}",
            book_id,
            page_number,
            theme,
            age_range,
        )

        image_bytes = await self._generate_webp(prompt, book_id)

        s3_key = f"books/{book_id}/illustrations/page_{page_number:03d}.webp"
        public_url = await self._storage.upload_image(image_bytes, s3_key, "image/webp")

        logger.info("Illustration uploaded to {}", public_url)
        return public_url

    async def generate_cover(
        self,
        title: str,
        theme: BookTheme,
        age_range: AgeRange,
        book_id: str,
    ) -> str:
        """Generate a book cover illustration and return its permanent public URL."""
        prompt = _build_cover_prompt(
            title=title,
            theme=theme,
            age_range=age_range,
        )

        logger.info(
            "Generating cover for book={} title='{}' theme={} age={}",
            book_id,
            title,
            theme,
            age_range,
        )

        image_bytes = await self._generate_webp(prompt, book_id)

        s3_key = f"books/{book_id}/cover.webp"
        public_url = await self._storage.upload_image(image_bytes, s3_key, "image/webp")

        logger.info("Cover uploaded to {}", public_url)
        return public_url

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    async def _generate_webp(self, prompt: str, book_id: str) -> bytes:
        """PNG vom Modell holen und als verkleinertes WebP zurückgeben."""
        png = await self._generate_image_bytes(prompt, book_id)
        # Pillow ist CPU-lastig — nicht die Event-Loop des Workers blockieren
        return await asyncio.to_thread(to_webp, png)

    async def _generate_image_bytes(self, prompt: str, book_id: str) -> bytes:
        """Call the image model and return the decoded PNG bytes."""
        response = await self._client.images.generate(
            model=self._model,
            prompt=prompt,
            size="1024x1024",
            quality="medium",
            n=1,
        )

        if not response.data:
            raise ValueError("Image model returned no image data")
        payload = response.data[0].b64_json
        if not payload:
            raise ValueError(f"Image model returned no b64_json for book_id={book_id}")
        return base64.b64decode(payload)
