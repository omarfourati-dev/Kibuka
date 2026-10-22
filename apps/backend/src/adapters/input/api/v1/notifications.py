from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from ..dependencies import get_current_user

# Minimal-Implementierung des Frontend-Vertrags (NotificationBell pollt
# alle 30 s) — persistente Notifications sind ein bewusster Follow-up.
router = APIRouter(
    prefix="/notifications",
    tags=["notifications"],
    dependencies=[Depends(get_current_user)],
)


@router.get("")
async def list_notifications() -> Any:
    return []


@router.patch("/{notification_id}/read")
async def mark_notification_read(notification_id: str) -> Any:
    return {"status": "ok"}


@router.post("/read-all")
async def mark_all_notifications_read() -> Any:
    return {"status": "ok"}
