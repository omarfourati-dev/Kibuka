from __future__ import annotations

import time
from typing import Any

from ....core.ports.output.i_rate_limit_store import IRateLimitStore

_KEY_PREFIX = "ratelimit:"


class RedisRateLimitStore(IRateLimitStore):
    """Festes Zeitfenster in Redis — gemeinsam für alle Worker."""

    def __init__(self, client: Any) -> None:
        self._redis = client

    async def hit(self, key: str, window_seconds: int) -> int:
        full_key = _KEY_PREFIX + key
        count = int(await self._redis.incr(full_key))
        if count == 1:
            await self._redis.expire(full_key, window_seconds)
        return count


class InMemoryRateLimitStore(IRateLimitStore):
    """Für Tests und lokale Entwicklung ohne Redis."""

    def __init__(self) -> None:
        self._windows: dict[str, tuple[int, float]] = {}

    async def hit(self, key: str, window_seconds: int) -> int:
        now = time.monotonic()
        count, expires_at = self._windows.get(key, (0, now + window_seconds))
        if expires_at <= now:
            count, expires_at = 0, now + window_seconds
        self._windows[key] = (count + 1, expires_at)
        return count + 1
