"""Child profiles API endpoints."""

from __future__ import annotations

import uuid
from typing import Annotated, TypedDict

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

router = APIRouter(prefix="/profiles", tags=["profiles"])
_bearer = HTTPBearer(auto_error=False)


class _ProfileRecord(TypedDict):
    id: str
    name: str
    age: int
    preferred_languages: list[str]
    avatar_emoji: str


# ---------------------------------------------------------------------------
# In-memory profile store (per-process; placeholder until full persistence)
# key: user_id → list[_ProfileRecord]
# ---------------------------------------------------------------------------
_profiles_store: dict[str, list[_ProfileRecord]] = {}


# ---------------------------------------------------------------------------
# Dependency helpers
# ---------------------------------------------------------------------------


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)] = None,
) -> str:
    """Return user_id or raise 401."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Placeholder — real implementation validates JWT
    return "authenticated-user"


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
    name: str
    age: int = Field(..., ge=1, le=18)
    preferred_languages: list[str] = ["de"]
    avatar_emoji: str = "🧒"


class UpdateChildProfileRequest(BaseModel):
    name: str | None = None
    age: int | None = Field(default=None, ge=1, le=18)
    preferred_languages: list[str] | None = None
    avatar_emoji: str | None = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/children", response_model=list[ChildProfileResponse])
async def list_child_profiles(
    user_id: Annotated[str, Depends(get_current_user)],
) -> list[ChildProfileResponse]:
    """List all child profiles for the authenticated user."""
    profiles = _profiles_store.get(user_id, [])
    return [ChildProfileResponse(**p) for p in profiles]


@router.post(
    "/children",
    response_model=ChildProfileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_child_profile(
    body: CreateChildProfileRequest,
    user_id: Annotated[str, Depends(get_current_user)],
) -> ChildProfileResponse:
    """Create a new child profile for the authenticated user."""
    profile: _ProfileRecord = {
        "id": str(uuid.uuid4()),
        "name": body.name,
        "age": body.age,
        "preferred_languages": body.preferred_languages,
        "avatar_emoji": body.avatar_emoji,
    }
    if user_id not in _profiles_store:
        _profiles_store[user_id] = []
    _profiles_store[user_id].append(profile)
    return ChildProfileResponse(**profile)


@router.put("/children/{profile_id}", response_model=ChildProfileResponse)
async def update_child_profile(
    profile_id: str,
    body: UpdateChildProfileRequest,
    user_id: Annotated[str, Depends(get_current_user)],
) -> ChildProfileResponse:
    """Update a child profile (partial update — only provided fields change)."""
    profiles = _profiles_store.get(user_id, [])
    profile = next((p for p in profiles if p["id"] == profile_id), None)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    if body.name is not None:
        profile["name"] = body.name
    if body.age is not None:
        profile["age"] = body.age
    if body.preferred_languages is not None:
        profile["preferred_languages"] = body.preferred_languages
    if body.avatar_emoji is not None:
        profile["avatar_emoji"] = body.avatar_emoji

    return ChildProfileResponse(**profile)
