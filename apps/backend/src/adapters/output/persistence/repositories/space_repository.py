from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from .....core.domain.entities.space import PlanType, Space
from .....core.ports.output.i_space_repository import ISpaceRepository
from ..models import SpaceModel


class SqlSpaceRepository(ISpaceRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, space_id: str) -> Space | None:
        result = await self._session.execute(
            select(SpaceModel).where(SpaceModel.id == space_id, SpaceModel.deleted_at.is_(None))
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_slug(self, slug: str) -> Space | None:
        result = await self._session.execute(
            select(SpaceModel).where(SpaceModel.slug == slug, SpaceModel.deleted_at.is_(None))
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def list_all(self, page: int = 1, page_size: int = 20) -> tuple[list[Space], int]:
        query = select(SpaceModel).where(SpaceModel.deleted_at.is_(None))
        count_result = await self._session.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar_one()
        result = await self._session.execute(query.offset((page - 1) * page_size).limit(page_size))
        return [self._to_entity(m) for m in result.scalars().all()], total

    async def save(self, space: Space) -> Space:
        existing = await self._session.get(SpaceModel, space.id)
        if existing:
            existing.name = space.name
            existing.slug = space.slug
            existing.plan = space.plan.value
            existing.member_count = space.member_count
        else:
            self._session.add(self._to_model(space))
        await self._session.flush()
        return space

    async def delete(self, space_id: str) -> None:
        await self._session.execute(
            update(SpaceModel).where(SpaceModel.id == space_id).values(deleted_at=datetime.now(UTC))
        )

    def _to_entity(self, model: SpaceModel) -> Space:
        return Space(
            id=model.id,
            name=model.name,
            slug=model.slug,
            owner_id=model.owner_id,
            plan=PlanType(model.plan),
            member_count=model.member_count,
            created_at=model.created_at,
            updated_at=model.updated_at,
            deleted_at=model.deleted_at,
        )

    def _to_model(self, space: Space) -> SpaceModel:
        return SpaceModel(
            id=space.id,
            name=space.name,
            slug=space.slug,
            owner_id=space.owner_id,
            plan=space.plan.value,
            member_count=space.member_count,
        )
