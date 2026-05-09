from __future__ import annotations
from fastapi import APIRouter, status
from pydantic import BaseModel
from typing import Optional

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
async def list_spaces():
    raise NotImplementedError("Wire via DI container")


@router.post("/", response_model=SpaceResponse, status_code=status.HTTP_201_CREATED)
async def create_space(body: CreateSpaceRequest):
    raise NotImplementedError("Wire via DI container")


@router.get("/{space_id}", response_model=SpaceResponse)
async def get_space(space_id: str):
    raise NotImplementedError("Wire via DI container")
