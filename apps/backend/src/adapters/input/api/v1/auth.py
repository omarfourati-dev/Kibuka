from __future__ import annotations
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Response, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/auth", tags=["auth"])
bearer = HTTPBearer(auto_error=False)


class RegisterRequest(BaseModel):
    email: EmailStr
    name: str
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest):
    """Register a new user."""
    raise HTTPException(status_code=501, detail="Inject use case via DI in container.py")


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, response: Response):
    """Login with email/password. Returns access token, sets refresh token cookie."""
    raise HTTPException(status_code=501, detail="Inject use case via DI in container.py")


@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: Request):
    """Refresh access token using httpOnly refresh cookie."""
    raise HTTPException(status_code=501, detail="Inject use case via DI in container.py")


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("refresh_token")
    return {"status": "logged out"}


@router.get("/google")
async def google_login():
    """Redirect to Google OAuth."""
    raise HTTPException(status_code=501, detail="Configure Google OAuth in container.py")


@router.get("/google/callback")
async def google_callback(code: str):
    """Handle Google OAuth callback."""
    raise HTTPException(status_code=501, detail="Configure Google OAuth in container.py")
