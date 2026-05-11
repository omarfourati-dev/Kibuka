from __future__ import annotations

from typing import Any

from fastapi import APIRouter, status
from pydantic import BaseModel

router = APIRouter(prefix="/spaces", tags=["spaces"])


class SpaceResponse(BaseModel):
    id: str
    name: str
    slug: str
    plan: str
    member_count: int


class CreateSpaceRequest(BaseModel):
    name: str
    slug: str


@router.get("/", response_model=list[SpaceResponse])
async def list_spaces() -> Any:
    raise NotImplementedError("Wire via DI container")


@router.post("/", response_model=SpaceResponse, status_code=status.HTTP_201_CREATED)
async def create_space(body: CreateSpaceRequest) -> Any:
    raise NotImplementedError("Wire via DI container")


@router.get("/{space_id}", response_model=SpaceResponse)
async def get_space(space_id: str) -> Any:
    raise NotImplementedError("Wire via DI container")
