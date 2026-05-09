"""Unit tests for BookRepository entity<->model mapping logic."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from unittest.mock import MagicMock

from src.adapters.output.persistence.models import (
    BookModel,
    BookPageModel,
    BookTranslationModel,
    PageContentModel,
)
from src.adapters.output.persistence.repositories.book_repository import SqlBookRepository
from src.core.domain.entities.book import (
    Book,
    BookPage,
    BookTranslation,
    PageContent,
    WordTimestamp,
)
from src.core.domain.value_objects.language import AgeRange, BookTheme, Language


def make_book_model(book_id: str = "b1") -> BookModel:
    model = BookModel()
    model.id = book_id
    model.theme = "animals"
    model.age_range = "3-5"
    model.cover_image_url = "https://s3.example.com/cover.jpg"
    model.is_daily_book = True
    model.published_at = datetime(2026, 5, 9, 6, 0, 0, tzinfo=UTC)
    model.page_count = 2
    model.price_single = 1.99
    model.created_at = datetime(2026, 5, 9, 0, 0, 0, tzinfo=UTC)
    model.deleted_at = None

    trans = BookTranslationModel()
    trans.id = str(uuid.uuid4())
    trans.book_id = book_id
    trans.language = "de"
    trans.title = "Der kleine Löwe"
    model.translations = [trans]

    page = BookPageModel()
    page.id = "pg1"
    page.book_id = book_id
    page.page_number = 0
    page.illustration_url = "https://s3.example.com/page0.jpg"

    content = PageContentModel()
    content.id = "pc1"
    content.page_id = "pg1"
    content.language = "de"
    content.text = "Der kleine Löwe schläft."
    content.audio_url = "https://s3.example.com/audio_de_0.mp3"
    content.word_timestamps = [
        {"word": "Der", "start_time_ms": 0, "end_time_ms": 200},
        {"word": "kleine", "start_time_ms": 210, "end_time_ms": 450},
    ]
    page.contents = [content]
    model.pages = [page]
    return model


class TestBookRepositoryMapping:
    def setup_method(self):
        self.repo = SqlBookRepository(MagicMock())

    def test_to_entity_maps_basic_fields(self):
        model = make_book_model()
        book = self.repo._to_entity(model)
        assert book.id == "b1"
        assert book.theme == BookTheme.ANIMALS
        assert book.age_range == AgeRange.YOUNG
        assert book.is_daily_book is True
        assert book.price_single == 1.99

    def test_to_entity_maps_translations(self):
        model = make_book_model()
        book = self.repo._to_entity(model)
        assert len(book.translations) == 1
        assert book.translations[0].language == Language.DE
        assert book.translations[0].title == "Der kleine Löwe"

    def test_to_entity_maps_pages(self):
        model = make_book_model()
        book = self.repo._to_entity(model)
        assert len(book.pages) == 1
        page = book.pages[0]
        assert page.page_number == 0
        assert page.illustration_url == "https://s3.example.com/page0.jpg"

    def test_to_entity_maps_page_contents(self):
        model = make_book_model()
        book = self.repo._to_entity(model)
        page = book.pages[0]
        assert len(page.contents) == 1
        content = page.contents[0]
        assert content.language == Language.DE
        assert content.text == "Der kleine Löwe schläft."
        assert content.audio_url == "https://s3.example.com/audio_de_0.mp3"

    def test_to_entity_maps_word_timestamps(self):
        model = make_book_model()
        book = self.repo._to_entity(model)
        timestamps = book.pages[0].contents[0].word_timestamps
        assert len(timestamps) == 2
        assert timestamps[0].word == "Der"
        assert timestamps[0].start_time_ms == 0
        assert timestamps[1].word == "kleine"

    def test_to_entity_handles_empty_pages(self):
        model = make_book_model()
        model.pages = []
        book = self.repo._to_entity(model)
        assert book.pages == []

    def test_to_entity_handles_none_cover_image(self):
        model = make_book_model()
        model.cover_image_url = None
        book = self.repo._to_entity(model)
        assert book.cover_image_url is None

    def test_to_entity_handles_null_word_timestamps(self):
        model = make_book_model()
        model.pages[0].contents[0].word_timestamps = None
        book = self.repo._to_entity(model)
        assert book.pages[0].contents[0].word_timestamps == []

    def test_to_entity_handles_empty_word_timestamps(self):
        model = make_book_model()
        model.pages[0].contents[0].word_timestamps = []
        book = self.repo._to_entity(model)
        assert book.pages[0].contents[0].word_timestamps == []

    def test_to_model_preserves_all_fields(self):
        book = Book(
            id="b1",
            theme=BookTheme.ANIMALS,
            age_range=AgeRange.YOUNG,
            page_count=1,
            price_single=1.99,
            published_at=datetime(2026, 5, 9, tzinfo=UTC),
            is_daily_book=False,
            translations=[],
            pages=[],
        )
        model = self.repo._to_model(book)
        assert model.id == "b1"
        assert model.theme == "animals"
        assert model.age_range == "3-5"
        assert model.price_single == 1.99

    def test_to_model_creates_translation_models(self):
        book = Book(
            id="b1",
            theme=BookTheme.ANIMALS,
            age_range=AgeRange.YOUNG,
            page_count=1,
            price_single=1.99,
            published_at=datetime(2026, 5, 9, tzinfo=UTC),
            translations=[
                BookTranslation(book_id="b1", language=Language.DE, title="Tierbuch"),
            ],
            pages=[],
        )
        model = self.repo._to_model(book)
        assert len(model.translations) == 1
        assert model.translations[0].language == "de"
        assert model.translations[0].title == "Tierbuch"
        assert model.translations[0].book_id == "b1"

    def test_to_model_creates_page_models(self):
        page = BookPage(
            id="pg1",
            book_id="b1",
            page_number=0,
            illustration_url="https://example.com/img.jpg",
            contents=[
                PageContent(
                    page_id="pg1",
                    language=Language.DE,
                    text="Hallo Welt",
                    audio_url=None,
                    word_timestamps=[
                        WordTimestamp(word="Hallo", start_time_ms=0, end_time_ms=300),
                    ],
                )
            ],
        )
        book = Book(
            id="b1",
            theme=BookTheme.ADVENTURE,
            age_range=AgeRange.MIDDLE,
            page_count=1,
            price_single=2.49,
            published_at=datetime(2026, 5, 9, tzinfo=UTC),
            translations=[],
            pages=[page],
        )
        model = self.repo._to_model(book)
        assert len(model.pages) == 1
        page_model = model.pages[0]
        assert page_model.page_number == 0
        assert page_model.illustration_url == "https://example.com/img.jpg"
        assert len(page_model.contents) == 1
        content_model = page_model.contents[0]
        assert content_model.language == "de"
        assert content_model.text == "Hallo Welt"
        assert len(content_model.word_timestamps) == 1
        assert content_model.word_timestamps[0]["word"] == "Hallo"

    def test_to_model_daily_book_false(self):
        book = Book(
            id="b2",
            theme=BookTheme.FRIENDSHIP,
            age_range=AgeRange.OLDER,
            page_count=5,
            price_single=1.99,
            published_at=datetime(2026, 5, 9, tzinfo=UTC),
            is_daily_book=False,
            translations=[],
            pages=[],
        )
        model = self.repo._to_model(book)
        assert model.is_daily_book is False

    def test_roundtrip_entity_to_model_and_back(self):
        """Roundtrip: entity -> model -> entity preserves key fields."""
        original = Book(
            id="b-rt",
            theme=BookTheme.NATURE,
            age_range=AgeRange.YOUNG,
            page_count=3,
            price_single=1.99,
            published_at=datetime(2026, 5, 9, 12, 0, 0, tzinfo=UTC),
            is_daily_book=True,
            cover_image_url="https://cdn.example.com/cover.png",
            translations=[
                BookTranslation(book_id="b-rt", language=Language.DE, title="Naturwunder"),
            ],
            pages=[
                BookPage(
                    id="pg-rt",
                    book_id="b-rt",
                    page_number=0,
                    illustration_url=None,
                    contents=[
                        PageContent(
                            page_id="pg-rt",
                            language=Language.DE,
                            text="Ein Baum wächst.",
                            audio_url=None,
                            word_timestamps=[],
                        )
                    ],
                )
            ],
        )
        model = self.repo._to_model(original)
        # Patch back the IDs so _to_entity gets consistent page/content IDs
        model.pages[0].id = "pg-rt"
        model.pages[0].contents[0].page_id = "pg-rt"
        model.deleted_at = None

        restored = self.repo._to_entity(model)
        assert restored.id == original.id
        assert restored.theme == original.theme
        assert restored.age_range == original.age_range
        assert restored.is_daily_book == original.is_daily_book
        assert restored.cover_image_url == original.cover_image_url
        assert restored.translations[0].title == original.translations[0].title
        assert restored.pages[0].page_number == original.pages[0].page_number
        assert restored.pages[0].contents[0].text == original.pages[0].contents[0].text
