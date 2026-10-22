from __future__ import annotations

import time
from typing import Any

from ....core.ports.output.i_refresh_token_store import IRefreshTokenStore

_KEY_PREFIX = "auth:refresh:"


class RedisRefreshTokenStore(IRefreshTokenStore):
    def __init__(self, client: Any) -> None:
        self._redis = client

    async def register(self, jti: str, user_id: str, ttl_seconds: int) -> None:
        await self._redis.set(_KEY_PREFIX + jti, user_id, ex=ttl_seconds)

    async def consume(self, jti: str) -> str | None:
        # GETDEL ist atomar — zwei parallele Refreshes mit demselben Token
        # können nicht beide gewinnen
        value = await self._redis.getdel(_KEY_PREFIX + jti)
        return str(value) if value is not None else None

    async def revoke(self, jti: str) -> None:
        await self._redis.delete(_KEY_PREFIX + jti)


class InMemoryRefreshTokenStore(IRefreshTokenStore):
    """Für Tests und lokale Entwicklung ohne Redis."""

    def __init__(self) -> None:
        self._tokens: dict[str, tuple[str, float]] = {}

    async def register(self, jti: str, user_id: str, ttl_seconds: int) -> None:
        self._tokens[jti] = (user_id, time.monotonic() + ttl_seconds)

    async def consume(self, jti: str) -> str | None:
        entry = self._tokens.pop(jti, None)
        if entry is None or entry[1] < time.monotonic():
            return None
        return entry[0]

    async def revoke(self, jti: str) -> None:
        self._tokens.pop(jti, None)
