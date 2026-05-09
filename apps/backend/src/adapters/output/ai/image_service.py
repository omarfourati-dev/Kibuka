"""DALL-E 3 image generation adapter for children's book illustrations and covers."""

from __future__ import annotations

import httpx
from loguru import logger
from openai import AsyncOpenAI

from ....core.domain.value_objects.language import AgeRange, BookTheme
from ....core.ports.output.i_image_service import IImageService
from ....core.ports.output.i_storage_service import IStorageService

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
    """Build a safe, age-appropriate DALL-E 3 prompt for a book page illustration.

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
    """Build a safe, age-appropriate DALL-E 3 prompt for a book cover.

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


async def _download_image(url: str) -> bytes:
    """Download image bytes from a URL using httpx.

    Args:
        url: Public URL to download.

    Returns:
        Raw image bytes.
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.content


class DallE3ImageService(IImageService):
    """DALL-E 3 adapter for generating children's book illustrations and covers.

    Workflow for each generation:
    1. Build a safe, age-appropriate prompt.
    2. Call DALL-E 3 via the OpenAI images.generate endpoint.
    3. Download the temporary image URL returned by DALL-E 3.
    4. Upload the bytes to permanent storage via IStorageService.
    5. Return the public URL from storage.
    """

    def __init__(
        self,
        openai_client: AsyncOpenAI,
        storage: IStorageService,
        model: str = "dall-e-3",
    ) -> None:
        """
        Args:
            openai_client: Configured AsyncOpenAI client instance.
            storage: Adapter for uploading images to persistent object storage.
            model: OpenAI image model to use (default: ``"dall-e-3"``).
        """
        self._client = openai_client
        self._storage = storage
        self._model = model

    async def generate_illustration(
        self,
        page_text: str,
        theme: BookTheme,
        age_range: str,
        page_number: int,
        book_id: str,
    ) -> str:
        """Generate a page illustration and return its permanent public URL.

        Args:
            page_text: The text displayed on this book page.
            theme: Visual/thematic style of the book.
            age_range: Target age group (influences visual complexity).
            page_number: Zero-based page index; zero-padded to 3 digits in S3 key.
            book_id: Unique book identifier used to build the S3 key.

        Returns:
            Public URL of the uploaded illustration PNG.
        """
        # Normalise age_range — accept both str and AgeRange instances
        age_range_enum = AgeRange(age_range) if not isinstance(age_range, AgeRange) else age_range

        prompt = _build_illustration_prompt(
            page_text=page_text,
            theme=theme,
            age_range=age_range_enum,
            page_number=page_number,
        )

        logger.info(
            "Generating illustration for book={} page={} theme={} age={}",
            book_id,
            page_number,
            theme,
            age_range,
        )

        response = await self._client.images.generate(
            model=self._model,
            prompt=prompt,
            size="1024x1024",
            quality="standard",
            n=1,
        )

        if not response.data:
            raise ValueError("DALL-E returned no image data")
        image_data = response.data[0]
        if not image_data.url:
            raise ValueError(f"DALL-E returned no URL for book_id={book_id}")
        dalle_url = image_data.url
        logger.debug("DALL-E 3 returned URL for page {}: {}", page_number, dalle_url)

        image_bytes = await _download_image(dalle_url)

        s3_key = f"books/{book_id}/illustrations/page_{page_number:03d}.png"
        public_url = await self._storage.upload_image(image_bytes, s3_key, "image/png")

        logger.info("Illustration uploaded to {}", public_url)
        return public_url

    async def generate_cover(
        self,
        title: str,
        theme: BookTheme,
        age_range: str,
        book_id: str,
    ) -> str:
        """Generate a book cover illustration and return its permanent public URL.

        Args:
            title: The book title — featured prominently in the cover concept.
            theme: Visual/thematic style of the book.
            age_range: Target age group (influences visual complexity).
            book_id: Unique book identifier used to build the S3 key.

        Returns:
            Public URL of the uploaded cover PNG.
        """
        age_range_enum = AgeRange(age_range) if not isinstance(age_range, AgeRange) else age_range

        prompt = _build_cover_prompt(
            title=title,
            theme=theme,
            age_range=age_range_enum,
        )

        logger.info(
            "Generating cover for book={} title='{}' theme={} age={}",
            book_id,
            title,
            theme,
            age_range,
        )

        response = await self._client.images.generate(
            model=self._model,
            prompt=prompt,
            size="1024x1024",
            quality="standard",
            n=1,
        )

        if not response.data:
            raise ValueError("DALL-E returned no image data")
        image_data = response.data[0]
        if not image_data.url:
            raise ValueError(f"DALL-E returned no URL for book_id={book_id}")
        dalle_url = image_data.url
        logger.debug("DALL-E 3 returned cover URL for book {}: {}", book_id, dalle_url)

        image_bytes = await _download_image(dalle_url)

        s3_key = f"books/{book_id}/cover.png"
        public_url = await self._storage.upload_image(image_bytes, s3_key, "image/png")

        logger.info("Cover uploaded to {}", public_url)
        return public_url
