"""JWT access tokens and password hashing for the template auth flow."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import cast

import bcrypt
from jose import JWTError, jwt

from .config import settings

_ALGORITHM = "HS256"

#: bcrypt only hashes the first 72 bytes — truncate explicitly instead of
#: letting newer bcrypt versions raise on longer inputs.
_BCRYPT_MAX_BYTES = 72


class InvalidTokenError(Exception):
    """Raised when an access token is expired, malformed or forged."""


def create_access_token(user_id: str, expires_minutes: int | None = None) -> str:
    """Create a signed JWT access token carrying the user id as subject."""
    if expires_minutes is None:
        expires_minutes = settings.access_token_expire_minutes
    now = datetime.now(UTC)
    claims = {
        "sub": user_id,
        "iat": now,
        "exp": now + timedelta(minutes=expires_minutes),
        "type": "access",
    }
    return cast(str, jwt.encode(claims, settings.secret_key, algorithm=_ALGORITHM))


def create_refresh_token(
    user_id: str, expires_days: int | None = None, jti: str | None = None
) -> str:
    """Create a long-lived refresh token (httpOnly cookie only, never a bearer).

    Der jti identifiziert das Token serverseitig (Rotation + Widerruf).
    """
    if expires_days is None:
        expires_days = settings.refresh_token_expire_days
    now = datetime.now(UTC)
    claims = {
        "sub": user_id,
        "iat": now,
        "exp": now + timedelta(days=expires_days),
        "type": "refresh",
        "jti": jti or uuid.uuid4().hex,
    }
    return cast(str, jwt.encode(claims, settings.secret_key, algorithm=_ALGORITHM))


def _decode_payload(token: str, expected_type: str) -> dict[str, object]:
    try:
        payload: dict[str, object] = jwt.decode(token, settings.secret_key, algorithms=[_ALGORITHM])
    except JWTError as exc:
        raise InvalidTokenError(str(exc)) from exc

    # Typ-Trennung: ein 7-Tage-Refresh-Token darf nie als Bearer gelten
    # (und umgekehrt)
    if payload.get("type") != expected_type:
        raise InvalidTokenError(f"Expected a {expected_type} token")

    subject = payload.get("sub")
    if not isinstance(subject, str) or not subject:
        raise InvalidTokenError("Token has no subject claim")
    return payload


def _decode(token: str, expected_type: str) -> str:
    return cast(str, _decode_payload(token, expected_type)["sub"])


def decode_refresh_claims(token: str) -> tuple[str, str]:
    """(user_id, jti) eines Refresh-Tokens; ohne jti ungültig."""
    payload = _decode_payload(token, "refresh")
    jti = payload.get("jti")
    if not isinstance(jti, str) or not jti:
        raise InvalidTokenError("Refresh token has no jti")
    return cast(str, payload["sub"]), jti


def decode_access_token(token: str) -> str:
    """Validate a JWT access token and return the user id (subject).

    Raises InvalidTokenError on expiry, bad signature, wrong token type or
    missing subject.
    """
    return _decode(token, "access")


def decode_refresh_token(token: str) -> str:
    """Validate a refresh token and return the user id (subject)."""
    return _decode(token, "refresh")


def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt."""
    secret = password.encode("utf-8")[:_BCRYPT_MAX_BYTES]
    return bcrypt.hashpw(secret, bcrypt.gensalt()).decode("ascii")


def verify_password(password: str, hashed: str) -> bool:
    """Check a plaintext password against its bcrypt hash."""
    secret = password.encode("utf-8")[:_BCRYPT_MAX_BYTES]
    try:
        return bcrypt.checkpw(secret, hashed.encode("ascii"))
    except ValueError:
        return False
