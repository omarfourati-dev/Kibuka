"""Unit tests for the admin seed helper — written FIRST (TDD RED phase)."""

from __future__ import annotations

import pytest
from src.infrastructure.seed_admin import ensure_admin

from src.core.domain.entities.user import User, UserRole, UserStatus
from src.infrastructure.security import verify_password


class FakeUserRepo:
    def __init__(self) -> None:
        self.users: dict[str, User] = {}

    async def get_by_email(self, email: str) -> User | None:
        return next((u for u in self.users.values() if u.email == email), None)

    async def save(self, user: User) -> User:
        self.users[user.id] = user
        return user


class TestEnsureAdmin:
    @pytest.mark.asyncio
    async def test_creates_active_owner_with_hashed_password(self) -> None:
        repo = FakeUserRepo()

        result = await ensure_admin(repo, "admin@kibuka.app", "s3cret-admin-pass")

        assert result == "created"
        user = next(iter(repo.users.values()))
        assert user.role == UserRole.OWNER
        assert user.status == UserStatus.ACTIVE
        assert user.hashed_password is not None
        assert "s3cret-admin-pass" not in user.hashed_password
        assert verify_password("s3cret-admin-pass", user.hashed_password)

    @pytest.mark.asyncio
    async def test_is_idempotent_for_existing_email(self) -> None:
        repo = FakeUserRepo()
        await ensure_admin(repo, "admin@kibuka.app", "first-pass-123")

        result = await ensure_admin(repo, "admin@kibuka.app", "other-pass-456")

        assert result == "exists"
        assert len(repo.users) == 1
        user = next(iter(repo.users.values()))
        # Existing credentials must not be overwritten
        assert verify_password("first-pass-123", user.hashed_password or "")
