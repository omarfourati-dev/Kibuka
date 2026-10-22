from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from .....core.domain.entities.user import User
from .....core.ports.output.i_user_repository import IUserRepository
from ..dependencies import get_current_user, get_user_repository

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


def _to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role.value,
        status=user.status.value,
        space_id=user.space_id,
        avatar_url=user.avatar_url,
    )


async def _load_current_user(repo: IUserRepository, user_id: str) -> User:
    user = await repo.get_by_id(user_id)
    if user is None or not user.is_active:
        # Token gültig, aber User weg/gesperrt — wie fehlende Auth behandeln
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required"
        )
    return user


@router.get("/me", response_model=UserResponse)
async def get_me(
    user_id: Annotated[str, Depends(get_current_user)],
    repo: Annotated[IUserRepository, Depends(get_user_repository)],
) -> Any:
    """Get current user profile."""
    return _to_response(await _load_current_user(repo, user_id))


@router.patch("/me", response_model=UserResponse)
async def update_me(
    body: UpdateUserRequest,
    user_id: Annotated[str, Depends(get_current_user)],
    repo: Annotated[IUserRepository, Depends(get_user_repository)],
) -> Any:
    """Update current user profile."""
    user = await _load_current_user(repo, user_id)
    if body.name is not None:
        user.name = body.name
    if body.avatar_url is not None:
        user.avatar_url = body.avatar_url
    saved = await repo.save(user)
    return _to_response(saved)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(
    user_id: Annotated[str, Depends(get_current_user)],
    repo: Annotated[IUserRepository, Depends(get_user_repository)],
) -> None:
    """GDPR Art. 17 — anonymize personal data, then soft delete."""
    user = await _load_current_user(repo, user_id)
    await repo.anonymize(user.id)
    await repo.delete(user.id)


@router.get("/me/export")
async def export_me(
    user_id: Annotated[str, Depends(get_current_user)],
    repo: Annotated[IUserRepository, Depends(get_user_repository)],
) -> Any:
    """GDPR Art. 20 — export the personal data we store about the user."""
    user = await _load_current_user(repo, user_id)
    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role.value,
            "status": user.status.value,
            "avatar_url": user.avatar_url,
            "space_id": user.space_id,
            "created_at": user.created_at.isoformat(),
        }
    }
