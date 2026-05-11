from typing import Any

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> Any:
    return {"status": "ok", "service": "omars-app-backend"}
