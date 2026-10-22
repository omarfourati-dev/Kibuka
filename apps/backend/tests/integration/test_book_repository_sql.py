"""Integration tests for SqlBookRepository against a real async engine — TDD RED.

Reproduziert den Live-500 auf GET /api/v1/books: list_books lud `pages` nicht
eager, _to_entity griff lazy darauf zu → MissingGreenlet im async-Kontext.
Der Bug ist nur mit einer FRISCHEN Session sichtbar (wie bei jedem echten
Request) — in der Seed-Session liegen die Instanzen samt Relationen noch in
der Identity Map, weshalb die reinen Mapping-Unit-Tests ihn nie trafen.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import StaticPool

from src.adapters.output.persistence.models import (
    BookModel,
    BookPageModel,
    BookPurchaseModel,
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

# Nur die Buch-Tabellen anlegen — andere Models nutzen pgvector (kein SQLite)
_TABLES = [
    m.__table__  # type: ignore[attr-defined]
    for m in (
        BookModel,
        BookTranslationModel,
        BookPageModel,
        PageContentModel,
        BookPurchaseModel,
    )
]


@pytest.fixture
async def session_maker() -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as conn:
        await conn.run_sync(
            lambda sync_conn: BookModel.metadata.create_all(sync_conn, tables=_TABLES)
        )
    yield async_sessionmaker(engine, expire_on_commit=False)
    await engine.dispose()


def _make_book(book_id: str = "b1", *, daily: bool = False, price: float = 2.99) -> Book:
    return Book(
        id=book_id,
        theme=BookTheme.ANIMALS,
        age_range=AgeRange.YOUNG,
        page_count=1,
        price_single=price,
        published_at=datetime(2026, 10, 22, 6, 0, tzinfo=UTC),
        is_daily_book=daily,
        cover_image_url="https://cdn.example.com/cover.png",
        translations=[
            BookTranslation(book_id=book_id, language=Language.DE, title="Der kleine Bär"),
            BookTranslation(book_id=book_id, language=Language.EN, title="The Little Bear"),
        ],
        pages=[
            BookPage(
                id=f"{book_id}-pg1",
                book_id=book_id,
                page_number=1,
                illustration_url="https://cdn.example.com/p1.png",
                contents=[
                    PageContent(
                        page_id=f"{book_id}-pg1",
                        language=Language.DE,
                        text="Der kleine Bär wacht auf.",
                        audio_url="https://cdn.example.com/p1_de.mp3",
                        word_timestamps=[
                            WordTimestamp(word="Der", start_time_ms=0, end_time_ms=180),
                        ],
                    )
                ],
            )
        ],
    )


async def _seed(session_maker: async_sessionmaker[AsyncSession], *books: Book) -> None:
    """Seed in einer eigenen Session — Leser bekommen eine frische Identity Map."""
    async with session_maker() as seed_session:
        repo = SqlBookRepository(session=seed_session)
        for book in books:
            await repo.save(book)
        await seed_session.commit()


class TestListBooksFreshSession:
    async def test_list_books_works_from_fresh_session(
        self, session_maker: async_sessionmaker[AsyncSession]
    ) -> None:
        """GET /books darf nicht an Lazy-Loading sterben (Live-500 vom 22.10.)."""
        await _seed(session_maker, _make_book("b1"), _make_book("b2", daily=True))

        async with session_maker() as session:
            repo = SqlBookRepository(session=session)
            books, total = await repo.list_books()

        assert total == 2
        assert {b.id for b in books} == {"b1", "b2"}
        titles = {t.language: t.title for t in books[0].translations}
        assert titles[Language.DE] == "Der kleine Bär"

    async def test_list_books_returns_summaries_without_pages(
        self, session_maker: async_sessionmaker[AsyncSession]
    ) -> None:
        """Die Liste ist ein Summary-Endpoint: page_count ja, Seiteninhalte nein."""
        await _seed(session_maker, _make_book("b1"))

        async with session_maker() as session:
            repo = SqlBookRepository(session=session)
            books, _ = await repo.list_books()

        assert books[0].page_count == 1
        assert books[0].pages == []

    async def test_list_books_pagination_counts_all(
        self, session_maker: async_sessionmaker[AsyncSession]
    ) -> None:
        await _seed(session_maker, *(_make_book(f"b{i}") for i in range(3)))

        async with session_maker() as session:
            repo = SqlBookRepository(session=session)
            books, total = await repo.list_books(page=1, page_size=2)

        assert total == 3
        assert len(books) == 2


class TestGetByIdFreshSession:
    async def test_get_by_id_returns_full_pages(
        self, session_maker: async_sessionmaker[AsyncSession]
    ) -> None:
        """Detail/Read brauchen die kompletten Seiten inkl. Timestamps."""
        await _seed(session_maker, _make_book("b1"))

        async with session_maker() as session:
            repo = SqlBookRepository(session=session)
            book = await repo.get_by_id("b1")

        assert book is not None
        assert len(book.pages) == 1
        content = book.pages[0].contents[0]
        assert content.text == "Der kleine Bär wacht auf."
        assert content.word_timestamps[0].word == "Der"

    async def test_get_daily_book_from_fresh_session(
        self, session_maker: async_sessionmaker[AsyncSession]
    ) -> None:
        await _seed(session_maker, _make_book("b1"), _make_book("b2", daily=True))

        async with session_maker() as session:
            repo = SqlBookRepository(session=session)
            daily = await repo.get_daily_book()

        assert daily is not None
        assert daily.id == "b2"
