"""Shared FastAPI dependencies — real JWT authentication for all v1 routes."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from ....adapters.output.persistence.repositories.user_repository import SqlUserRepository
from ....core.ports.output.i_user_repository import IUserRepository
from ....infrastructure.database import get_db
from ....infrastructure.security import InvalidTokenError, decode_access_token

_bearer = HTTPBearer(auto_error=False)


async def get_user_repository(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> IUserRepository:
    """Real SQL wiring; tests replace this via dependency override."""
    return SqlUserRepository(session=session)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)] = None,
) -> str:
    """Return the authenticated user id from a signed JWT, or raise 401."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return decode_access_token(credentials.credentials)
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


async def get_optional_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)] = None,
) -> str | None:
    """Return the user id if a valid token is present, None otherwise. Never raises."""
    if credentials is None:
        return None
    try:
        return decode_access_token(credentials.credentials)
    except InvalidTokenError:
        return None


async def require_admin(
    user_id: Annotated[str, Depends(get_current_user)],
    repo: Annotated[IUserRepository, Depends(get_user_repository)],
) -> str:
    """Return the user id only for an active admin/owner account, else 403.

    Unlike get_current_user, this loads the user on every request — admin
    surfaces must react to suspensions immediately, not at token expiry.
    """
    user = await repo.get_by_id(user_id)
    if user is None or not user.is_active or not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user_id
