from __future__ import annotations
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/users", tags=["users"])


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    status: str
    space_id: Optional[str] = None
    avatar_url: Optional[str] = None


class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None


@router.get("/me", response_model=UserResponse)
async def get_me():
    """Get current user profile."""
    raise NotImplementedError("Wire via DI container")


@router.patch("/me", response_model=UserResponse)
async def update_me(body: UpdateUserRequest):
    """Update current user profile."""
    raise NotImplementedError("Wire via DI container")


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me():
    """GDPR Art. 17 — soft delete + anonymize."""
    raise NotImplementedError("Wire via DI container")


@router.get("/me/export")
async def export_me():
    """GDPR Art. 20 — data export."""
    raise NotImplementedError("Wire via DI container")
