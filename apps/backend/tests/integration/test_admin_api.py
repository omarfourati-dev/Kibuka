"""Integration tests for /admin authorization — written FIRST (TDD RED phase).

Every admin endpoint must require an authenticated, active admin user; the
AI code runner must additionally be gated to development + feature flag.
"""

from __future__ import annotations

import uuid

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.adapters.input.api.dependencies import get_user_repository
from src.adapters.input.api.v1.admin import router as admin_router
from src.core.domain.entities.user import User, UserRole, UserStatus
from src.infrastructure.config import settings
from src.infrastructure.security import create_access_token

# ---------------------------------------------------------------------------
# Fakes / helpers
# ---------------------------------------------------------------------------


class FakeUserRepository:
    def __init__(self) -> None:
        self.users: dict[str, User] = {}

    async def get_by_id(self, user_id: str) -> User | None:
        return self.users.get(user_id)

    async def get_by_email(self, email: str) -> User | None:
        return next((u for u in self.users.values() if u.email == email), None)

    async def save(self, user: User) -> User:
        self.users[user.id] = user
        return user


def _make_user(role: UserRole, status: UserStatus = UserStatus.ACTIVE) -> User:
    return User(
        id=str(uuid.uuid4()),
        email=f"{uuid.uuid4()}@example.com",
        name="Test",
        role=role,
        status=status,
    )


def _make_client(repo: FakeUserRepository) -> TestClient:
    app = FastAPI()
    app.include_router(admin_router, prefix="/api/v1")
    app.dependency_overrides[get_user_repository] = lambda: repo
    return TestClient(app)


def _auth_header(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestAdminAuthorization:
    def test_admin_endpoint_rejects_anonymous(self) -> None:
        client = _make_client(FakeUserRepository())

        assert client.get("/api/v1/admin/stats").status_code == 401

    def test_ai_code_run_rejects_anonymous(self) -> None:
        """The command-executing endpoint must never be reachable without auth."""
        client = _make_client(FakeUserRepository())

        response = client.post("/api/v1/admin/ai-code/run", params={"instruction": "x"})

        assert response.status_code == 401

    def test_admin_endpoint_rejects_non_admin_user(self) -> None:
        repo = FakeUserRepository()
        member = _make_user(UserRole.MEMBER)
        repo.users[member.id] = member
        client = _make_client(repo)

        response = client.get("/api/v1/admin/stats", headers=_auth_header(member))

        assert response.status_code == 403

    def test_admin_endpoint_rejects_suspended_admin(self) -> None:
        repo = FakeUserRepository()
        admin = _make_user(UserRole.ADMIN, status=UserStatus.SUSPENDED)
        repo.users[admin.id] = admin
        client = _make_client(repo)

        response = client.get("/api/v1/admin/stats", headers=_auth_header(admin))

        assert response.status_code == 403

    def test_admin_endpoint_allows_active_admin(self) -> None:
        repo = FakeUserRepository()
        admin = _make_user(UserRole.ADMIN)
        repo.users[admin.id] = admin
        client = _make_client(repo)

        response = client.get("/api/v1/admin/stats", headers=_auth_header(admin))

        assert response.status_code == 200


class TestAiCodeRunGating:
    def _admin_client(self) -> tuple[TestClient, dict[str, str]]:
        repo = FakeUserRepository()
        admin = _make_user(UserRole.OWNER)
        repo.users[admin.id] = admin
        return _make_client(repo), _auth_header(admin)

    def test_ai_code_run_404_when_feature_disabled(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(settings, "enable_ai_code_editor", False)
        monkeypatch.setattr(settings, "environment", "development")
        client, headers = self._admin_client()

        response = client.post(
            "/api/v1/admin/ai-code/run", params={"instruction": "x"}, headers=headers
        )

        assert response.status_code == 404

    def test_ai_code_run_404_outside_development(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(settings, "enable_ai_code_editor", True)
        monkeypatch.setattr(settings, "environment", "staging")
        client, headers = self._admin_client()

        response = client.post(
            "/api/v1/admin/ai-code/run", params={"instruction": "x"}, headers=headers
        )

        assert response.status_code == 404
