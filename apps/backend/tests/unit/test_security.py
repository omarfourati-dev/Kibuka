"""Unit tests for JWT + password utilities — written FIRST (TDD RED phase)."""

from __future__ import annotations

import pytest
from jose import jwt

from src.infrastructure.config import settings
from src.infrastructure.security import (
    InvalidTokenError,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


class TestAccessToken:
    def test_roundtrip_returns_user_id(self) -> None:
        token = create_access_token("user-42")
        assert decode_access_token(token) == "user-42"

    def test_expired_token_is_rejected(self) -> None:
        token = create_access_token("user-42", expires_minutes=-1)
        with pytest.raises(InvalidTokenError):
            decode_access_token(token)

    def test_token_signed_with_wrong_secret_is_rejected(self) -> None:
        forged = jwt.encode({"sub": "user-42"}, "attacker-secret-key-1234567890abc", "HS256")
        with pytest.raises(InvalidTokenError):
            decode_access_token(forged)

    def test_garbage_token_is_rejected(self) -> None:
        with pytest.raises(InvalidTokenError):
            decode_access_token("not-a-jwt-at-all")

    def test_token_without_subject_is_rejected(self) -> None:
        token = jwt.encode({"foo": "bar"}, settings.secret_key, "HS256")
        with pytest.raises(InvalidTokenError):
            decode_access_token(token)


class TestPasswordHashing:
    def test_verify_accepts_correct_password(self) -> None:
        hashed = hash_password("s3cret-pass")
        assert verify_password("s3cret-pass", hashed) is True

    def test_verify_rejects_wrong_password(self) -> None:
        hashed = hash_password("s3cret-pass")
        assert verify_password("wrong", hashed) is False

    def test_hash_is_not_plaintext(self) -> None:
        assert "s3cret-pass" not in hash_password("s3cret-pass")


class TestRefreshToken:
    """Refresh-Tokens (7 Tage, httpOnly-Cookie) — streng getrennt von Access-Tokens."""

    def test_refresh_roundtrip_returns_user_id(self) -> None:
        from src.infrastructure.security import create_refresh_token, decode_refresh_token

        token = create_refresh_token("user-42")
        assert decode_refresh_token(token) == "user-42"

    def test_refresh_token_is_not_accepted_as_access_token(self) -> None:
        """Sonst wäre ein 7-Tage-Token ein vollwertiger Bearer-Token."""
        from src.infrastructure.security import create_refresh_token

        with pytest.raises(InvalidTokenError):
            decode_access_token(create_refresh_token("user-42"))

    def test_access_token_is_not_accepted_as_refresh_token(self) -> None:
        from src.infrastructure.security import decode_refresh_token

        with pytest.raises(InvalidTokenError):
            decode_refresh_token(create_access_token("user-42"))

    def test_expired_refresh_token_is_rejected(self) -> None:
        from src.infrastructure.security import create_refresh_token, decode_refresh_token

        token = create_refresh_token("user-42", expires_days=-1)
        with pytest.raises(InvalidTokenError):
            decode_refresh_token(token)
