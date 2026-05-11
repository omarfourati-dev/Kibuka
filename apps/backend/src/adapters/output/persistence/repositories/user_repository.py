from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from .....core.domain.entities.user import User, UserRole, UserStatus
from .....core.ports.output.i_user_repository import IUserRepository
from ..models import UserModel


class SqlUserRepository(IUserRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: str) -> User | None:
        result = await self._session.execute(
            select(UserModel).where(UserModel.id == user_id, UserModel.deleted_at.is_(None))
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_email(self, email: str) -> User | None:
        result = await self._session.execute(
            select(UserModel).where(UserModel.email == email, UserModel.deleted_at.is_(None))
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_google_id(self, google_id: str) -> User | None:
        result = await self._session.execute(
            select(UserModel).where(UserModel.google_id == google_id)
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def list_by_space(
        self, space_id: str, page: int = 1, page_size: int = 20
    ) -> tuple[list[User], int]:
        query = select(UserModel).where(UserModel.deleted_at.is_(None))
        if space_id:
            query = query.where(UserModel.space_id == space_id)
        count_result = await self._session.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar_one()
        result = await self._session.execute(query.offset((page - 1) * page_size).limit(page_size))
        return [self._to_entity(m) for m in result.scalars().all()], total

    async def save(self, user: User) -> User:
        existing = await self._session.get(UserModel, user.id)
        if existing:
            existing.email = user.email
            existing.name = user.name
            existing.role = user.role.value
            existing.status = user.status.value
            existing.avatar_url = user.avatar_url
            existing.space_id = user.space_id
            existing.google_id = user.google_id
            existing.hashed_password = user.hashed_password
        else:
            model = self._to_model(user)
            self._session.add(model)
        await self._session.flush()
        return user

    async def delete(self, user_id: str) -> None:
        await self._session.execute(
            update(UserModel).where(UserModel.id == user_id).values(deleted_at=datetime.utcnow())
        )

    async def anonymize(self, user_id: str) -> None:
        anon_id = str(uuid.uuid4())[:8]
        await self._session.execute(
            update(UserModel)
            .where(UserModel.id == user_id)
            .values(
                email=f"deleted_{anon_id}@deleted.invalid",
                name="Deleted User",
                google_id=None,
                hashed_password=None,
                avatar_url=None,
                deleted_at=datetime.utcnow(),
            )
        )

    def _to_entity(self, model: UserModel) -> User:
        return User(
            id=model.id,
            email=model.email,
            name=model.name,
            hashed_password=model.hashed_password,
            avatar_url=model.avatar_url,
            role=UserRole(model.role),
            status=UserStatus(model.status),
            space_id=model.space_id,
            google_id=model.google_id,
            created_at=model.created_at,
            updated_at=model.updated_at,
            deleted_at=model.deleted_at,
        )

    def _to_model(self, user: User) -> UserModel:
        return UserModel(
            id=user.id,
            email=user.email,
            name=user.name,
            hashed_password=user.hashed_password,
            avatar_url=user.avatar_url,
            role=user.role.value,
            status=user.status.value,
            space_id=user.space_id,
            google_id=user.google_id,
        )
