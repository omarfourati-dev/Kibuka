from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel

from ..dependencies import get_current_user

# Platzhalter-Routen: trotzdem nie ohne Auth erreichbar
router = APIRouter(prefix="/webhooks", tags=["webhooks"], dependencies=[Depends(get_current_user)])


class WebhookRequest(BaseModel):
    name: str
    url: str
    events: list[str]
    secret: str | None = None


@router.get("/")
async def list_webhooks(space_id: str) -> Any:
    return []


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_webhook(space_id: str, body: WebhookRequest) -> Any:
    # Das Secret wird NIE zurückgegeben (Security-Regel: Secrets nicht echoen)
    data = body.model_dump(exclude={"secret"})
    return {"id": "placeholder", **data}


@router.delete("/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(webhook_id: str) -> None:
    pass
