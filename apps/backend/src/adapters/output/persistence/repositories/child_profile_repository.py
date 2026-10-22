from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .....core.domain.entities.child_profile import ChildProfile
from .....core.domain.value_objects.language import Language
from .....core.ports.output.i_child_profile_repository import IChildProfileRepository
from ..models import ChildProfileModel


class SqlChildProfileRepository(IChildProfileRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, profile_id: str) -> ChildProfile | None:
        model = await self._session.get(ChildProfileModel, profile_id)
        if model is None or model.deleted_at is not None:
            return None
        return self._to_entity(model)

    async def list_by_user(self, user_id: str) -> list[ChildProfile]:
        result = await self._session.execute(
            select(ChildProfileModel)
            .where(
                ChildProfileModel.user_id == user_id,
                ChildProfileModel.deleted_at.is_(None),
            )
            .order_by(ChildProfileModel.created_at)
        )
        return [self._to_entity(m) for m in result.scalars().all()]

    async def save(self, profile: ChildProfile) -> ChildProfile:
        existing = await self._session.get(ChildProfileModel, profile.id)
        if existing:
            existing.name = profile.name
            existing.age = profile.age
            existing.preferred_languages = [str(lang) for lang in profile.preferred_languages]
            existing.avatar_emoji = profile.avatar_emoji
            existing.deleted_at = profile.deleted_at
        else:
            self._session.add(
                ChildProfileModel(
                    id=profile.id,
                    user_id=profile.user_id,
                    name=profile.name,
                    age=profile.age,
                    preferred_languages=[str(lang) for lang in profile.preferred_languages],
                    avatar_emoji=profile.avatar_emoji,
                    deleted_at=profile.deleted_at,
                    created_at=profile.created_at,
                )
            )
        await self._session.flush()
        return profile

    def _to_entity(self, model: ChildProfileModel) -> ChildProfile:
        return ChildProfile(
            id=model.id,
            user_id=model.user_id,
            name=model.name,
            age=model.age,
            preferred_languages=[Language(lang) for lang in model.preferred_languages],
            avatar_emoji=model.avatar_emoji,
            deleted_at=model.deleted_at,
            created_at=model.created_at,
        )
