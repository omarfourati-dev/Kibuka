from __future__ import annotations

import uuid

from sqlalchemy import exists, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .....core.domain.entities.book import (
    Book,
    BookPage,
    BookTranslation,
    PageContent,
    WordTimestamp,
)
from .....core.domain.value_objects.language import AgeRange, BookTheme, Language
from .....core.ports.output.i_book_repository import IBookRepository
from ..models import (
    BookModel,
    BookPageModel,
    BookPurchaseModel,
    BookTranslationModel,
    PageContentModel,
)


class SqlBookRepository(IBookRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, book_id: str) -> Book | None:
        result = await self._session.execute(
            select(BookModel)
            .options(
                selectinload(BookModel.translations),
                selectinload(BookModel.pages).selectinload(BookPageModel.contents),
            )
            .where(BookModel.id == book_id, BookModel.deleted_at.is_(None))
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_daily_book(self) -> Book | None:
        result = await self._session.execute(
            select(BookModel)
            .options(
                selectinload(BookModel.translations),
                selectinload(BookModel.pages).selectinload(BookPageModel.contents),
            )
            .where(BookModel.is_daily_book.is_(True), BookModel.deleted_at.is_(None))
            .order_by(BookModel.published_at.desc())
            .limit(1)
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def list_books(
        self,
        language: Language | None = None,
        age_range: AgeRange | None = None,
        theme: BookTheme | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Book], int]:
        query = (
            select(BookModel)
            .options(selectinload(BookModel.translations))
            .where(BookModel.deleted_at.is_(None))
        )
        if age_range:
            query = query.where(BookModel.age_range == age_range.value)
        if theme:
            query = query.where(BookModel.theme == theme.value)

        count_result = await self._session.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar_one()

        query = (
            query.order_by(BookModel.published_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self._session.execute(query)
        books = [self._to_entity(m) for m in result.scalars().all()]
        return books, total

    async def save(self, book: Book) -> Book:
        existing = await self._session.get(BookModel, book.id)
        if existing:
            existing.is_daily_book = book.is_daily_book
            existing.cover_image_url = book.cover_image_url
        else:
            model = self._to_model(book)
            self._session.add(model)
        await self._session.flush()
        return book

    async def set_daily_book(self, book_id: str) -> None:
        # Unset all current daily books
        await self._session.execute(
            update(BookModel).where(BookModel.is_daily_book.is_(True)).values(is_daily_book=False)
        )
        # Set new daily book
        await self._session.execute(
            update(BookModel).where(BookModel.id == book_id).values(is_daily_book=True)
        )
        await self._session.flush()

    async def is_purchased_by_user(self, book_id: str, user_id: str) -> bool:
        result = await self._session.execute(
            select(
                exists().where(
                    BookPurchaseModel.book_id == book_id,
                    BookPurchaseModel.user_id == user_id,
                )
            )
        )
        return bool(result.scalar())

    def _to_entity(self, model: BookModel) -> Book:
        translations = [
            BookTranslation(
                book_id=t.book_id,
                language=Language(t.language),
                title=t.title,
            )
            for t in model.translations
        ]
        pages = []
        for page_model in model.pages:
            contents = []
            for c in page_model.contents:
                timestamps = [
                    WordTimestamp(
                        word=ts["word"],
                        start_time_ms=ts["start_time_ms"],
                        end_time_ms=ts["end_time_ms"],
                    )
                    for ts in (c.word_timestamps or [])
                ]
                contents.append(
                    PageContent(
                        page_id=c.page_id,
                        language=Language(c.language),
                        text=c.text,
                        audio_url=c.audio_url,
                        word_timestamps=timestamps,
                    )
                )
            pages.append(
                BookPage(
                    id=page_model.id,
                    book_id=page_model.book_id,
                    page_number=page_model.page_number,
                    illustration_url=page_model.illustration_url,
                    contents=contents,
                )
            )
        return Book(
            id=model.id,
            theme=BookTheme(model.theme),
            age_range=AgeRange(model.age_range),
            page_count=model.page_count,
            price_single=float(model.price_single),
            published_at=model.published_at,
            is_daily_book=model.is_daily_book,
            cover_image_url=model.cover_image_url,
            translations=translations,
            pages=pages,
            deleted_at=model.deleted_at,
            created_at=model.created_at,
        )

    def _to_model(self, book: Book) -> BookModel:
        model = BookModel(
            id=book.id,
            theme=book.theme.value,
            age_range=book.age_range.value,
            cover_image_url=book.cover_image_url,
            is_daily_book=book.is_daily_book,
            published_at=book.published_at,
            page_count=book.page_count,
            price_single=book.price_single,
            created_at=book.created_at,
        )
        model.translations = [
            BookTranslationModel(
                id=str(uuid.uuid4()),
                book_id=book.id,
                language=t.language.value,
                title=t.title,
            )
            for t in book.translations
        ]
        model.pages = [
            BookPageModel(
                id=p.id,
                book_id=book.id,
                page_number=p.page_number,
                illustration_url=p.illustration_url,
                contents=[
                    PageContentModel(
                        id=str(uuid.uuid4()),
                        page_id=p.id,
                        language=c.language.value,
                        text=c.text,
                        audio_url=c.audio_url,
                        word_timestamps=[
                            {
                                "word": ts.word,
                                "start_time_ms": ts.start_time_ms,
                                "end_time_ms": ts.end_time_ms,
                            }
                            for ts in c.word_timestamps
                        ],
                    )
                    for c in p.contents
                ],
            )
            for p in book.pages
        ]
        return model
