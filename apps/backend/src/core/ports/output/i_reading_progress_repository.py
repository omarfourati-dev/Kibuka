from __future__ import annotations

from abc import ABC, abstractmethod

from ...domain.entities.child_profile import ReadingProgress


class IReadingProgressRepository(ABC):
    @abstractmethod
    async def get(self, user_id: str, book_id: str) -> ReadingProgress | None: ...

    @abstractmethod
    async def upsert(self, progress: ReadingProgress) -> ReadingProgress: ...
