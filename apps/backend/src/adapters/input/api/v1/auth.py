from __future__ import annotations

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPBearer
from pydantic import BaseModel, EmailStr, Field

from .....adapters.output.cache.refresh_token_store import RedisRefreshTokenStore
from .....core.domain.entities.user import User, UserRole, UserStatus
from .....core.ports.output.i_refresh_token_store import IRefreshTokenStore
from .....core.ports.output.i_user_repository import IUserRepository
from .....infrastructure.config import settings
from .....infrastructure.redis import get_redis_client
from .....infrastructure.security import (
    InvalidTokenError,
    create_access_token,
    create_refresh_token,
    decode_refresh_claims,
    hash_password,
    verify_password,
)
from ..dependencies import get_user_repository
from ..rate_limit import rate_limit

__all__ = ["get_refresh_token_store", "get_user_repository", "router"]


def get_refresh_token_store() -> IRefreshTokenStore:
    """Redis-backed; tests replace this via dependency override."""
    return RedisRefreshTokenStore(get_redis_client())


router = APIRouter(prefix="/auth", tags=["auth"])
bearer = HTTPBearer(auto_error=False)

#: Valid bcrypt hash of a random throwaway value — verified when the email is
#: unknown so both login paths take comparable time (no user enumeration).
_TIMING_EQUALIZER_HASH = "$2b$12$bEEeJlaLwfD2p5BV1rVvtOMGxaB2vL92p0HF/F.s5hf0xK.hHzG0."


class RegisterRequest(BaseModel):
    email: EmailStr
    name: str
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class PublicUser(BaseModel):
    id: str
    email: str
    name: str
    role: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: PublicUser | None = None


REFRESH_COOKIE = "refresh_token"
# Cookie geht nur an /auth-Endpunkte — nie an den Rest der API
_REFRESH_COOKIE_PATH = "/api/v1/auth"


def _public_user(user: User) -> PublicUser:
    return PublicUser(id=user.id, email=user.email, name=user.name, role=user.role.value)


def _refresh_ttl_seconds() -> int:
    return settings.refresh_token_expire_days * 24 * 3600


async def _set_refresh_cookie(response: Response, user_id: str, store: IRefreshTokenStore) -> None:
    jti = uuid.uuid4().hex
    # Nur serverseitig registrierte Tokens sind gültig (widerrufbar)
    await store.register(jti, user_id, _refresh_ttl_seconds())
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=create_refresh_token(user_id, jti=jti),
        max_age=_refresh_ttl_seconds(),
        path=_REFRESH_COOKIE_PATH,
        httponly=True,
        secure=settings.environment != "development",
        samesite="lax",
    )


async def _session_response(
    response: Response, user: User, store: IRefreshTokenStore
) -> TokenResponse:
    """Access-Token im Body (Memory-only im Client), Refresh-Token als Cookie."""
    await _set_refresh_cookie(response, user.id, store)
    return TokenResponse(access_token=create_access_token(user.id), user=_public_user(user))


# Großzügig genug für eine Familie hinter einem Router (Keep-Alive alle
# 12 min pro Gerät), eng genug gegen Passwort-Raten und Massen-Registrierung
LOGIN_ATTEMPTS_PER_WINDOW = 10
LOGIN_WINDOW_SECONDS = 300
REGISTRATIONS_PER_WINDOW = 5
REGISTRATION_WINDOW_SECONDS = 3600
REFRESH_ATTEMPTS_PER_WINDOW = 60
REFRESH_WINDOW_SECONDS = 300


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(rate_limit("auth-register", REGISTRATIONS_PER_WINDOW, REGISTRATION_WINDOW_SECONDS))
    ],
)
async def register(
    body: RegisterRequest,
    response: Response,
    repo: Annotated[IUserRepository, Depends(get_user_repository)],
    store: Annotated[IRefreshTokenStore, Depends(get_refresh_token_store)],
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
    return await _session_response(response, saved, store)


@router.post(
    "/login",
    response_model=TokenResponse,
    dependencies=[
        Depends(rate_limit("auth-login", LOGIN_ATTEMPTS_PER_WINDOW, LOGIN_WINDOW_SECONDS))
    ],
)
async def login(
    body: LoginRequest,
    response: Response,
    repo: Annotated[IUserRepository, Depends(get_user_repository)],
    store: Annotated[IRefreshTokenStore, Depends(get_refresh_token_store)],
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
    return await _session_response(response, user, store)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    dependencies=[
        Depends(rate_limit("auth-refresh", REFRESH_ATTEMPTS_PER_WINDOW, REFRESH_WINDOW_SECONDS))
    ],
)
async def refresh(
    request: Request,
    response: Response,
    repo: Annotated[IUserRepository, Depends(get_user_repository)],
    store: Annotated[IRefreshTokenStore, Depends(get_refresh_token_store)],
) -> Any:
    """Neuer Access-Token aus dem Refresh-Cookie. Das Cookie-Token wird dabei
    verbraucht (Rotation) — ein bereits benutztes/widerrufenes Token ist wertlos."""
    unauthorized = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise unauthorized
    try:
        user_id, jti = decode_refresh_claims(token)
    except InvalidTokenError as exc:
        raise unauthorized from exc

    if await store.consume(jti) != user_id:
        raise unauthorized

    # Gesperrte/gelöschte Nutzer verlieren ihre Sitzung beim nächsten Refresh
    user = await repo.get_by_id(user_id)
    if user is None or not user.is_active:
        raise unauthorized
    return await _session_response(response, user, store)


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    store: Annotated[IRefreshTokenStore, Depends(get_refresh_token_store)],
) -> Any:
    """Widerruft das Refresh-Token serverseitig UND löscht das Cookie."""
    token = request.cookies.get(REFRESH_COOKIE)
    if token:
        try:
            _, jti = decode_refresh_claims(token)
            await store.revoke(jti)
        except InvalidTokenError:
            pass  # Ungültiges Cookie: nichts zu widerrufen
    response.delete_cookie(REFRESH_COOKIE, path=_REFRESH_COOKIE_PATH)
    return {"status": "logged out"}


@router.get("/google")
async def google_login() -> Any:
    """Redirect to Google OAuth."""
    raise HTTPException(status_code=501, detail="Configure Google OAuth in container.py")


@router.get("/google/callback")
async def google_callback(code: str) -> Any:
    """Handle Google OAuth callback."""
    raise HTTPException(status_code=501, detail="Configure Google OAuth in container.py")
