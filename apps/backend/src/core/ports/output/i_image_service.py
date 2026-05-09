from __future__ import annotations

from abc import ABC, abstractmethod

from ...domain.value_objects.language import BookTheme


class IImageService(ABC):
    @abstractmethod
    async def generate_illustration(
        self,
        page_text: str,
        theme: BookTheme,
        age_range: str,
        page_number: int,
        book_id: str,
    ) -> str:
        """Generate illustration and return S3 URL."""
        ...

    @abstractmethod
    async def generate_cover(
        self,
        title: str,
        theme: BookTheme,
        age_range: str,
        book_id: str,
    ) -> str:
        """Generate cover image and return S3 URL."""
        ...
