from __future__ import annotations
from abc import ABC, abstractmethod
from ...domain.entities.activity_log import ActivityLog


class IActivityLogRepository(ABC):
    @abstractmethod
    async def save(self, log: ActivityLog) -> ActivityLog: ...

    @abstractmethod
    async def list_by_space(self, space_id: str, page: int = 1, page_size: int = 50) -> tuple[list[ActivityLog], int]: ...
