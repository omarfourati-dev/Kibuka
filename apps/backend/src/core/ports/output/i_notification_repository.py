from __future__ import annotations

from abc import ABC, abstractmethod

from ...domain.entities.notification import Notification


class INotificationRepository(ABC):
    @abstractmethod
    async def list_by_user(self, user_id: str) -> list[Notification]: ...

    @abstractmethod
    async def save(self, notification: Notification) -> Notification: ...

    @abstractmethod
    async def mark_read(self, notification_id: str) -> None: ...

    @abstractmethod
    async def mark_all_read(self, user_id: str) -> None: ...
