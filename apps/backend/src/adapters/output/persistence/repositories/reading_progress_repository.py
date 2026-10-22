from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .....core.domain.entities.child_profile import ReadingProgress
from .....core.ports.output.i_reading_progress_repository import IReadingProgressRepository
from ..models import ReadingProgressModel


class SqlReadingProgressRepository(IReadingProgressRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, user_id: str, book_id: str) -> ReadingProgress | None:
        model = await self._get_model(user_id, book_id)
        return self._to_entity(model) if model else None

    async def upsert(self, progress: ReadingProgress) -> ReadingProgress:
        model = await self._get_model(progress.user_id, progress.book_id)
        if model:
            model.current_page = progress.current_page
            model.completed_at = progress.completed_at
            model.last_read_at = datetime.now(UTC)
        else:
            self._session.add(
                ReadingProgressModel(
                    id=progress.id,
                    user_id=progress.user_id,
                    child_profile_id=progress.child_profile_id,
                    book_id=progress.book_id,
                    current_page=progress.current_page,
                    completed_at=progress.completed_at,
                    last_read_at=progress.last_read_at,
                )
            )
        await self._session.flush()
        return progress

    async def _get_model(self, user_id: str, book_id: str) -> ReadingProgressModel | None:
        result = await self._session.execute(
            select(ReadingProgressModel).where(
                ReadingProgressModel.user_id == user_id,
                ReadingProgressModel.book_id == book_id,
            )
        )
        return result.scalar_one_or_none()

    def _to_entity(self, model: ReadingProgressModel) -> ReadingProgress:
        return ReadingProgress(
            id=model.id,
            user_id=model.user_id,
            book_id=model.book_id,
            child_profile_id=model.child_profile_id,
            current_page=model.current_page,
            completed_at=model.completed_at,
            last_read_at=model.last_read_at,
        )
