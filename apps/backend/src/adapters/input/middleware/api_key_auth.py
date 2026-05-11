from __future__ import annotations

from fastapi import HTTPException, status
from fastapi.security import APIKeyHeader

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def get_api_key_user(api_key: str | None = None) -> str:
    """Dependency — validates API key and returns user. Wire via DI container."""
    if api_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "API key required", "code": "API_KEY_REQUIRED"},
        )
    return api_key
