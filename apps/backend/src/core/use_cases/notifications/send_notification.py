from __future__ import annotations
import uuid
from dataclasses import dataclass
from ...domain.entities.notification import Notification, NotificationType
from ...ports.output.i_notification_repository import INotificationRepository


@dataclass
class SendNotificationCommand:
    user_id: str
    type: NotificationType
    title: str
    message: str
    action_url: str | None = None


class SendNotificationUseCase:
    def __init__(self, notification_repo: INotificationRepository) -> None:
        self._repo = notification_repo

    async def execute(self, command: SendNotificationCommand) -> Notification:
        notification = Notification(
            id=str(uuid.uuid4()),
            user_id=command.user_id,
            type=command.type,
            title=command.title,
            message=command.message,
            action_url=command.action_url,
        )
        return await self._repo.save(notification)
