"""Unit tests for Book domain entities."""

from __future__ import annotations

from datetime import datetime

from src.core.domain.entities.book import (
    Book,
    BookPage,
    BookTranslation,
    PageContent,
    WordTimestamp,
)
from src.core.domain.value_objects.language import AgeRange, BookTheme, Language


class TestBookEntity:
    def _make_book(self, **kwargs) -> Book:
        defaults = dict(
            id="book-1",
            theme=BookTheme.ANIMALS,
            age_range=AgeRange.YOUNG,
            page_count=10,
            price_single=1.99,
            published_at=datetime.utcnow(),
        )
        defaults.update(kwargs)
        return Book(**defaults)

    def test_active_book_is_active(self):
        book = self._make_book(deleted_at=None)
        assert book.is_active is True

    def test_soft_deleted_book_is_not_active(self):
        book = self._make_book(deleted_at=datetime.utcnow())
        assert book.is_active is False

    def test_get_title_returns_correct_translation(self):
        book = self._make_book()
        book.translations = [
            BookTranslation(book_id="book-1", language=Language.DE, title="Der kleine Löwe")
        ]
        assert book.get_title(Language.DE) == "Der kleine Löwe"

    def test_get_title_returns_none_for_missing_language(self):
        book = self._make_book()
        assert book.get_title(Language.AR) is None

    def test_get_page_returns_correct_page(self):
        book = self._make_book()
        page = BookPage(id="p1", book_id="book-1", page_number=0)
        book.pages = [page]
        assert book.get_page(0) is page

    def test_get_page_returns_none_for_missing_page(self):
        book = self._make_book()
        assert book.get_page(99) is None


class TestBookPage:
    def test_get_content_returns_matching_language(self):
        page = BookPage(id="p1", book_id="book-1", page_number=0)
        content = PageContent(page_id="p1", language=Language.DE, text="Hallo Welt")
        page.contents = [content]
        assert page.get_content(Language.DE) is content

    def test_get_content_returns_none_for_missing(self):
        page = BookPage(id="p1", book_id="book-1", page_number=0)
        assert page.get_content(Language.AR) is None


class TestWordTimestamp:
    def test_word_timestamp_fields(self):
        ts = WordTimestamp(word="Hallo", start_time_ms=0, end_time_ms=500)
        assert ts.word == "Hallo"
        assert ts.start_time_ms < ts.end_time_ms
