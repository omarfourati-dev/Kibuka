"""Child profiles API endpoints — persisted via IChildProfileRepository."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from src.adapters.input.api.dependencies import get_current_user
from src.adapters.output.persistence.repositories.child_profile_repository import (
    SqlChildProfileRepository,
)
from src.core.domain.entities.child_profile import ChildProfile
from src.core.domain.value_objects.language import Language
from src.core.ports.output.i_child_profile_repository import IChildProfileRepository
from src.infrastructure.database import get_db

__all__ = ["get_current_user", "get_profile_repository", "router"]

router = APIRouter(prefix="/profiles", tags=["profiles"])


async def get_profile_repository(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> IChildProfileRepository:
    """Real SQL wiring; tests replace this via dependency override."""
    return SqlChildProfileRepository(session=session)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class ChildProfileResponse(BaseModel):
    id: str
    name: str
    age: int
    preferred_languages: list[str]
    avatar_emoji: str


class CreateChildProfileRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    age: int = Field(..., ge=1, le=18)
    preferred_languages: list[Language] = [Language.DE]
    avatar_emoji: str = Field(default="🧒", max_length=10)


class UpdateChildProfileRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    age: int | None = Field(default=None, ge=1, le=18)
    preferred_languages: list[Language] | None = None
    avatar_emoji: str | None = Field(default=None, max_length=10)


def _to_response(profile: ChildProfile) -> ChildProfileResponse:
    return ChildProfileResponse(
        id=profile.id,
        name=profile.name,
        age=profile.age,
        preferred_languages=[str(lang) for lang in profile.preferred_languages],
        avatar_emoji=profile.avatar_emoji,
    )


async def _owned_profile(
    repo: IChildProfileRepository, profile_id: str, user_id: str
) -> ChildProfile:
    profile = await repo.get_by_id(profile_id)
    # Fremde Profile sind wie nicht existent — keine ID-Enumeration
    if profile is None or profile.user_id != user_id:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/children", response_model=list[ChildProfileResponse])
async def list_child_profiles(
    user_id: Annotated[str, Depends(get_current_user)],
    repo: Annotated[IChildProfileRepository, Depends(get_profile_repository)],
) -> list[ChildProfileResponse]:
    """List all child profiles for the authenticated user."""
    return [_to_response(p) for p in await repo.list_by_user(user_id)]


@router.post(
    "/children",
    response_model=ChildProfileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_child_profile(
    body: CreateChildProfileRequest,
    user_id: Annotated[str, Depends(get_current_user)],
    repo: Annotated[IChildProfileRepository, Depends(get_profile_repository)],
) -> ChildProfileResponse:
    """Create a new child profile for the authenticated user."""
    profile = ChildProfile(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name=body.name,
        age=body.age,
        preferred_languages=list(body.preferred_languages),
        avatar_emoji=body.avatar_emoji,
    )
    return _to_response(await repo.save(profile))


@router.put("/children/{profile_id}", response_model=ChildProfileResponse)
async def update_child_profile(
    profile_id: str,
    body: UpdateChildProfileRequest,
    user_id: Annotated[str, Depends(get_current_user)],
    repo: Annotated[IChildProfileRepository, Depends(get_profile_repository)],
) -> ChildProfileResponse:
    """Update a child profile (partial update — only provided fields change)."""
    profile = await _owned_profile(repo, profile_id, user_id)
    if body.name is not None:
        profile.name = body.name
    if body.age is not None:
        profile.age = body.age
    if body.preferred_languages is not None:
        profile.preferred_languages = list(body.preferred_languages)
    if body.avatar_emoji is not None:
        profile.avatar_emoji = body.avatar_emoji
    return _to_response(await repo.save(profile))


@router.delete("/children/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_child_profile(
    profile_id: str,
    user_id: Annotated[str, Depends(get_current_user)],
    repo: Annotated[IChildProfileRepository, Depends(get_profile_repository)],
) -> None:
    """Soft delete (Projektregel: niemals physisch löschen)."""
    profile = await _owned_profile(repo, profile_id, user_id)
    profile.deleted_at = datetime.now(UTC)
    await repo.save(profile)
