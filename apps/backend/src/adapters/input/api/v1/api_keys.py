from __future__ import annotations
from fastapi import APIRouter, status
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/api-keys", tags=["api-keys"])


class ApiKeyRequest(BaseModel):
    name: str
    scopes: list[str] = ["read"]
    expires_at: Optional[datetime] = None


@router.get("/")
async def list_api_keys():
    return []


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_api_key(body: ApiKeyRequest):
    return {"id": "placeholder", "raw_key": "sk_placeholder", "prefix": "sk_place", "name": body.name}


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(key_id: str):
    pass
