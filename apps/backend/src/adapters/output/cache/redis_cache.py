from __future__ import annotations
import json
from typing import Any, Optional
import redis.asyncio as redis_async
from ....core.ports.output.i_cache import ICache


class RedisCache(ICache):
    def __init__(self, client: redis_async.Redis) -> None:
        self._client = client

    async def get(self, key: str) -> Optional[Any]:
        value = await self._client.get(key)
        if value is None:
            return None
        return json.loads(value)

    async def set(self, key: str, value: Any, ttl_seconds: int = 300) -> None:
        await self._client.setex(key, ttl_seconds, json.dumps(value, default=str))

    async def delete(self, key: str) -> None:
        await self._client.delete(key)

    async def exists(self, key: str) -> bool:
        return bool(await self._client.exists(key))
