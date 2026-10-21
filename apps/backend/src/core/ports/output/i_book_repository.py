from __future__ import annotations

from abc import ABC, abstractmethod

from ...domain.entities.book import Book
from ...domain.entities.purchase import BookPurchase
from ...domain.value_objects.language import AgeRange, BookTheme, Language


class IBookRepository(ABC):
    @abstractmethod
    async def get_by_id(self, book_id: str) -> Book | None: ...

    @abstractmethod
    async def get_daily_book(self) -> Book | None: ...

    @abstractmethod
    async def list_books(
        self,
        language: Language | None = None,
        age_range: AgeRange | None = None,
        theme: BookTheme | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Book], int]: ...

    @abstractmethod
    async def save(self, book: Book) -> Book: ...

    @abstractmethod
    async def set_daily_book(self, book_id: str) -> None: ...

    @abstractmethod
    async def is_purchased_by_user(self, book_id: str, user_id: str) -> bool: ...

    @abstractmethod
    async def record_purchase(self, purchase: BookPurchase) -> None: ...
