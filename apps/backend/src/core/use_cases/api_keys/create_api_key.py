from __future__ import annotations
import hashlib
import secrets
import uuid
from dataclasses import dataclass
from typing import Optional
from datetime import datetime
from ...domain.entities.api_key import ApiKey
from ...ports.output.i_api_key_repository import IApiKeyRepository


@dataclass
class CreateApiKeyCommand:
    user_id: str
    space_id: str
    name: str
    scopes: list[str]
    expires_at: Optional[datetime] = None


@dataclass
class ApiKeyCreated:
    api_key: ApiKey
    raw_key: str


class CreateApiKeyUseCase:
    def __init__(self, api_key_repo: IApiKeyRepository) -> None:
        self._repo = api_key_repo

    async def execute(self, command: CreateApiKeyCommand) -> ApiKeyCreated:
        raw_key = f"sk_{secrets.token_urlsafe(32)}"
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        prefix = raw_key[:8]

        api_key = ApiKey(
            id=str(uuid.uuid4()),
            user_id=command.user_id,
            space_id=command.space_id,
            name=command.name,
            key_hash=key_hash,
            prefix=prefix,
            scopes=command.scopes,
            expires_at=command.expires_at,
        )
        saved = await self._repo.save(api_key)
        return ApiKeyCreated(api_key=saved, raw_key=raw_key)
