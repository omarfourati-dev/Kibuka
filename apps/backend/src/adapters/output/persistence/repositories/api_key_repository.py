from __future__ import annotations
from typing import Optional
from datetime import datetime
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from .....core.ports.output.i_api_key_repository import IApiKeyRepository
from .....core.domain.entities.api_key import ApiKey
from ..models import ApiKeyModel


class SqlApiKeyRepository(IApiKeyRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_hash(self, key_hash: str) -> Optional[ApiKey]:
        result = await self._session.execute(
            select(ApiKeyModel).where(
                ApiKeyModel.key_hash == key_hash,
                ApiKeyModel.deleted_at.is_(None),
            )
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def list_by_user(self, user_id: str) -> list[ApiKey]:
        result = await self._session.execute(
            select(ApiKeyModel)
            .where(ApiKeyModel.user_id == user_id, ApiKeyModel.deleted_at.is_(None))
            .order_by(ApiKeyModel.created_at.desc())
        )
        return [self._to_entity(m) for m in result.scalars().all()]

    async def save(self, api_key: ApiKey) -> ApiKey:
        existing = await self._session.get(ApiKeyModel, api_key.id)
        if existing:
            existing.name = api_key.name
            existing.scopes = api_key.scopes
            existing.last_used_at = api_key.last_used_at
            existing.expires_at = api_key.expires_at
        else:
            self._session.add(self._to_model(api_key))
        await self._session.flush()
        return api_key

    async def delete(self, api_key_id: str) -> None:
        await self._session.execute(
            update(ApiKeyModel)
            .where(ApiKeyModel.id == api_key_id)
            .values(deleted_at=datetime.utcnow())
        )

    def _to_entity(self, model: ApiKeyModel) -> ApiKey:
        return ApiKey(
            id=model.id,
            user_id=model.user_id,
            space_id=model.space_id,
            name=model.name,
            key_hash=model.key_hash,
            prefix=model.prefix,
            scopes=model.scopes or [],
            last_used_at=model.last_used_at,
            expires_at=model.expires_at,
            created_at=model.created_at,
            deleted_at=model.deleted_at,
        )

    def _to_model(self, api_key: ApiKey) -> ApiKeyModel:
        return ApiKeyModel(
            id=api_key.id,
            user_id=api_key.user_id,
            space_id=api_key.space_id,
            name=api_key.name,
            key_hash=api_key.key_hash,
            prefix=api_key.prefix,
            scopes=api_key.scopes,
            last_used_at=api_key.last_used_at,
            expires_at=api_key.expires_at,
        )
