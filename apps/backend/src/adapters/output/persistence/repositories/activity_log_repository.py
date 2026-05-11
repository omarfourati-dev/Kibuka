from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .....core.domain.entities.activity_log import ActivityLog
from .....core.ports.output.i_activity_log_repository import IActivityLogRepository
from ..models import ActivityLogModel


class SqlActivityLogRepository(IActivityLogRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def save(self, log: ActivityLog) -> ActivityLog:
        model = ActivityLogModel(
            id=log.id,
            space_id=log.space_id,
            user_id=log.user_id,
            action=log.action,
            resource_type=log.resource_type,
            resource_id=log.resource_id,
            extra_metadata=log.metadata,
            ip_address=log.ip_address,
            user_agent=log.user_agent,
            created_at=log.created_at,
        )
        self._session.add(model)
        await self._session.flush()
        return log

    async def list_by_space(
        self, space_id: str, page: int = 1, page_size: int = 50
    ) -> tuple[list[ActivityLog], int]:
        query = select(ActivityLogModel).where(ActivityLogModel.space_id == space_id)
        count_result = await self._session.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar_one()
        result = await self._session.execute(
            query.order_by(ActivityLogModel.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return [self._to_entity(m) for m in result.scalars().all()], total

    def _to_entity(self, model: ActivityLogModel) -> ActivityLog:
        return ActivityLog(
            id=model.id,
            space_id=model.space_id,
            user_id=model.user_id,
            action=model.action,
            resource_type=model.resource_type,
            resource_id=model.resource_id,
            metadata=model.extra_metadata,
            ip_address=model.ip_address,
            user_agent=model.user_agent,
            created_at=model.created_at,
        )
