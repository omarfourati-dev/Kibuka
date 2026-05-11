from __future__ import annotations

from abc import ABC, abstractmethod

from ...domain.entities.api_key import ApiKey


class IApiKeyRepository(ABC):
    @abstractmethod
    async def get_by_hash(self, key_hash: str) -> ApiKey | None: ...

    @abstractmethod
    async def list_by_user(self, user_id: str) -> list[ApiKey]: ...

    @abstractmethod
    async def save(self, api_key: ApiKey) -> ApiKey: ...

    @abstractmethod
    async def delete(self, api_key_id: str) -> None: ...
