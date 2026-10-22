from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel

from ..dependencies import get_current_user

# Platzhalter-Routen: trotzdem nie ohne Auth erreichbar
router = APIRouter(prefix="/api-keys", tags=["api-keys"], dependencies=[Depends(get_current_user)])


class ApiKeyRequest(BaseModel):
    name: str
    scopes: list[str] = ["read"]
    expires_at: datetime | None = None


@router.get("/")
async def list_api_keys() -> Any:
    return []


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_api_key(body: ApiKeyRequest) -> Any:
    return {
        "id": "placeholder",
        "raw_key": "sk_placeholder",
        "prefix": "sk_place",
        "name": body.name,
    }


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(key_id: str) -> None:
    pass
