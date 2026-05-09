from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from ..value_objects.language import AgeRange, BookTheme, Language


@dataclass
class WordTimestamp:
    word: str
    start_time_ms: int
    end_time_ms: int


@dataclass
class PageContent:
    page_id: str
    language: Language
    text: str
    audio_url: str | None = None
    word_timestamps: list[WordTimestamp] = field(default_factory=list)


@dataclass
class BookPage:
    id: str
    book_id: str
    page_number: int
    illustration_url: str | None = None
    contents: list[PageContent] = field(default_factory=list)

    def get_content(self, language: Language) -> PageContent | None:
        return next((c for c in self.contents if c.language == language), None)


@dataclass
class BookTranslation:
    book_id: str
    language: Language
    title: str


@dataclass
class Book:
    id: str
    theme: BookTheme
    age_range: AgeRange
    page_count: int
    price_single: float
    published_at: datetime
    is_daily_book: bool = False
    cover_image_url: str | None = None
    translations: list[BookTranslation] = field(default_factory=list)
    pages: list[BookPage] = field(default_factory=list)
    deleted_at: datetime | None = None
    created_at: datetime = field(default_factory=datetime.utcnow)

    @property
    def is_active(self) -> bool:
        return self.deleted_at is None

    def get_title(self, language: Language) -> str | None:
        t = next((t for t in self.translations if t.language == language), None)
        return t.title if t else None

    def get_page(self, page_number: int) -> BookPage | None:
        return next((p for p in self.pages if p.page_number == page_number), None)
