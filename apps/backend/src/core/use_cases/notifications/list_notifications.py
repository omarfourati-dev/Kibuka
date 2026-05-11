from __future__ import annotations

from ...domain.entities.notification import Notification
from ...ports.output.i_notification_repository import INotificationRepository


class ListNotificationsUseCase:
    def __init__(self, notification_repo: INotificationRepository) -> None:
        self._repo = notification_repo

    async def execute(self, user_id: str) -> list[Notification]:
        return await self._repo.list_by_user(user_id)
