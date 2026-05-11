from __future__ import annotations

from typing import Any

from fastapi import APIRouter, status
from pydantic import BaseModel

router = APIRouter(prefix="/users", tags=["users"])


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    status: str
    space_id: str | None = None
    avatar_url: str | None = None


class UpdateUserRequest(BaseModel):
    name: str | None = None
    avatar_url: str | None = None


@router.get("/me", response_model=UserResponse)
async def get_me() -> Any:
    """Get current user profile."""
    raise NotImplementedError("Wire via DI container")


@router.patch("/me", response_model=UserResponse)
async def update_me(body: UpdateUserRequest) -> Any:
    """Update current user profile."""
    raise NotImplementedError("Wire via DI container")


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me() -> None:
    """GDPR Art. 17 — soft delete + anonymize."""
    raise NotImplementedError("Wire via DI container")


@router.get("/me/export")
async def export_me() -> Any:
    """GDPR Art. 20 — data export."""
    raise NotImplementedError("Wire via DI container")
