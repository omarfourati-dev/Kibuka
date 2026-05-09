from __future__ import annotations
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from .....core.ports.output.i_notification_repository import INotificationRepository
from .....core.domain.entities.notification import Notification, NotificationType
from ..models import NotificationModel


class SqlNotificationRepository(INotificationRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_by_user(self, user_id: str) -> list[Notification]:
        result = await self._session.execute(
            select(NotificationModel)
            .where(NotificationModel.user_id == user_id)
            .order_by(NotificationModel.created_at.desc())
            .limit(50)
        )
        return [self._to_entity(m) for m in result.scalars().all()]

    async def save(self, notification: Notification) -> Notification:
        model = NotificationModel(
            id=notification.id,
            user_id=notification.user_id,
            type=notification.type.value,
            title=notification.title,
            message=notification.message,
            read=notification.read,
            action_url=notification.action_url,
            created_at=notification.created_at,
        )
        self._session.add(model)
        await self._session.flush()
        return notification

    async def mark_read(self, notification_id: str) -> None:
        await self._session.execute(
            update(NotificationModel)
            .where(NotificationModel.id == notification_id)
            .values(read=True)
        )

    async def mark_all_read(self, user_id: str) -> None:
        await self._session.execute(
            update(NotificationModel)
            .where(NotificationModel.user_id == user_id)
            .values(read=True)
        )

    def _to_entity(self, model: NotificationModel) -> Notification:
        return Notification(
            id=model.id,
            user_id=model.user_id,
            type=NotificationType(model.type),
            title=model.title,
            message=model.message,
            read=model.read,
            action_url=model.action_url,
            created_at=model.created_at,
        )
