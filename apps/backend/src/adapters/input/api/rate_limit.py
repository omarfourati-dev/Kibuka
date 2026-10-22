"""Drosselung pro Client-IP für sensible öffentliche Endpunkte.

X-Real-IP setzt nginx (location /api/) und überschreibt dabei jeden Wert vom
Client — ohne Proxy (lokal, Tests) zählt die direkte Verbindungsadresse.
"""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status

from src.adapters.output.cache.rate_limit_store import RedisRateLimitStore
from src.core.ports.output.i_rate_limit_store import IRateLimitStore
from src.infrastructure.redis import get_redis_client

logger = logging.getLogger(__name__)


def get_rate_limit_store() -> IRateLimitStore:
    return RedisRateLimitStore(get_redis_client())


def client_ip(request: Request) -> str:
    return request.headers.get("x-real-ip") or (request.client.host if request.client else "?")


def rate_limit(scope: str, limit: int, window_seconds: int) -> Callable[..., Awaitable[None]]:
    """FastAPI-Dependency: höchstens *limit* Aufrufe pro IP und Zeitfenster."""

    async def _check(
        request: Request,
        store: Annotated[IRateLimitStore, Depends(get_rate_limit_store)],
    ) -> None:
        try:
            count = await store.hit(f"{scope}:{client_ip(request)}", window_seconds)
        except Exception:
            # Fail open: Login und Kündigung dürfen nicht an Redis scheitern
            logger.warning("Rate limit store unavailable — %s not throttled", scope)
            return
        if count > limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests",
                headers={"Retry-After": str(window_seconds)},
            )

    return _check
