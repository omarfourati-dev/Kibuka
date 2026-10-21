from __future__ import annotations

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPBearer
from pydantic import BaseModel, EmailStr, Field

from .....core.domain.entities.user import User, UserRole, UserStatus
from .....core.ports.output.i_user_repository import IUserRepository
from .....infrastructure.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])
bearer = HTTPBearer(auto_error=False)

#: Valid bcrypt hash of a random throwaway value — verified when the email is
#: unknown so both login paths take comparable time (no user enumeration).
_TIMING_EQUALIZER_HASH = "$2b$12$bEEeJlaLwfD2p5BV1rVvtOMGxaB2vL92p0HF/F.s5hf0xK.hHzG0."


async def get_user_repository() -> IUserRepository:
    """Override this dependency in the DI container or tests."""
    raise NotImplementedError("Wire IUserRepository via dependency override")


class RegisterRequest(BaseModel):
    email: EmailStr
    name: str
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    repo: Annotated[IUserRepository, Depends(get_user_repository)],
) -> Any:
    """Register a new user and return a signed access token."""
    existing = await repo.get_by_email(body.email)
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        id=str(uuid.uuid4()),
        email=body.email,
        name=body.name,
        role=UserRole.MEMBER,
        status=UserStatus.ACTIVE,
        hashed_password=hash_password(body.password),
    )
    saved = await repo.save(user)
    return TokenResponse(access_token=create_access_token(saved.id))


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    repo: Annotated[IUserRepository, Depends(get_user_repository)],
) -> Any:
    """Login with email/password and return a signed access token."""
    user = await repo.get_by_email(body.email)
    password_ok = verify_password(
        body.password,
        user.hashed_password if user and user.hashed_password else _TIMING_EQUALIZER_HASH,
    )
    if user is None or not user.hashed_password or not password_ok or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )
    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: Request) -> Any:
    """Refresh access token using httpOnly refresh cookie."""
    raise HTTPException(status_code=501, detail="Refresh flow not implemented yet")


@router.post("/logout")
async def logout(response: Response) -> Any:
    response.delete_cookie("refresh_token")
    return {"status": "logged out"}


@router.get("/google")
async def google_login() -> Any:
    """Redirect to Google OAuth."""
    raise HTTPException(status_code=501, detail="Configure Google OAuth in container.py")


@router.get("/google/callback")
async def google_callback(code: str) -> Any:
    """Handle Google OAuth callback."""
    raise HTTPException(status_code=501, detail="Configure Google OAuth in container.py")
