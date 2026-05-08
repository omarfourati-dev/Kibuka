from __future__ import annotations
from fastapi import APIRouter, status
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


class WebhookRequest(BaseModel):
    name: str
    url: str
    events: list[str]
    secret: Optional[str] = None


@router.get("/")
async def list_webhooks(space_id: str):
    return []


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_webhook(space_id: str, body: WebhookRequest):
    return {"id": "placeholder", **body.model_dump()}


@router.delete("/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(webhook_id: str):
    pass
