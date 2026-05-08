from __future__ import annotations
import hashlib
from ...domain.entities.api_key import ApiKey
from ...domain.exceptions.auth import TokenInvalidError
from ...ports.output.i_api_key_repository import IApiKeyRepository


class VerifyApiKeyUseCase:
    def __init__(self, api_key_repo: IApiKeyRepository) -> None:
        self._repo = api_key_repo

    async def execute(self, raw_key: str) -> ApiKey:
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        api_key = await self._repo.get_by_hash(key_hash)
        if not api_key or not api_key.is_valid:
            raise TokenInvalidError("Invalid or expired API key")
        return api_key
