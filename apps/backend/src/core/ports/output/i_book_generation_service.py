from __future__ import annotations

from abc import ABC, abstractmethod

from ...domain.entities.book import Book
from ...domain.value_objects.language import AgeRange, BookTheme


class IBookGenerationService(ABC):
    @abstractmethod
    async def generate_daily_book(
        self,
        theme: BookTheme | None = None,
        age_range: AgeRange | None = None,
    ) -> Book:
        """Generate complete daily book with all 4 languages, illustrations, and audio."""
        ...
