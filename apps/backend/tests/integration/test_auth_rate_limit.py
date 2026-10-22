"""TDD RED: Login, Registrierung und Refresh sind gegen massenhafte Versuche
gedrosselt (Passwort-Raten, Massen-Registrierung)."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient
from src.adapters.input.api.rate_limit import get_rate_limit_store
from src.adapters.output.cache.rate_limit_store import InMemoryRateLimitStore

from src.adapters.input.api.v1.auth import (
    LOGIN_ATTEMPTS_PER_WINDOW,
    REFRESH_ATTEMPTS_PER_WINDOW,
    REGISTRATIONS_PER_WINDOW,
    get_refresh_token_store,
    get_user_repository,
)
from src.adapters.input.api.v1.auth import router as auth_router
from src.adapters.output.cache.refresh_token_store import InMemoryRefreshTokenStore
from src.core.domain.entities.user import User


class FakeUserRepository:
    def __init__(self) -> None:
        self.users: dict[str, User] = {}

    async def get_by_email(self, email: str) -> User | None:
        return next((u for u in self.users.values() if u.email == email), None)

    async def get_by_id(self, user_id: str) -> User | None:
        return self.users.get(user_id)

    async def save(self, user: User) -> User:
        self.users[user.id] = user
        return user


def _client() -> TestClient:
    app = FastAPI()
    app.include_router(auth_router, prefix="/api/v1")
    app.dependency_overrides[get_user_repository] = FakeUserRepository
    store = InMemoryRefreshTokenStore()
    app.dependency_overrides[get_refresh_token_store] = lambda: store
    limits = InMemoryRateLimitStore()
    app.dependency_overrides[get_rate_limit_store] = lambda: limits
    return TestClient(app, base_url="https://testserver")


def test_login_is_throttled_after_the_allowed_attempts() -> None:
    client = _client()
    body = {"email": "omar@example.com", "password": "falsch-falsch"}

    codes = [
        client.post("/api/v1/auth/login", json=body).status_code
        for _ in range(LOGIN_ATTEMPTS_PER_WINDOW + 1)
    ]

    assert set(codes[:-1]) == {401}
    assert codes[-1] == 429


def test_register_is_throttled() -> None:
    client = _client()

    codes = [
        client.post(
            "/api/v1/auth/register",
            json={"email": f"u{i}@example.com", "name": "U", "password": "sicheres-passwort-1"},
        ).status_code
        for i in range(REGISTRATIONS_PER_WINDOW + 1)
    ]

    assert set(codes[:-1]) == {201}
    assert codes[-1] == 429


def test_refresh_is_throttled() -> None:
    client = _client()

    codes = [
        client.post("/api/v1/auth/refresh").status_code
        for _ in range(REFRESH_ATTEMPTS_PER_WINDOW + 1)
    ]

    assert set(codes[:-1]) == {401}
    assert codes[-1] == 429


def test_limits_leave_room_for_a_family_behind_one_router() -> None:
    # Mehrere Geräte hinter einer IP + Keep-Alive alle 12 min dürfen nie
    # ins Limit laufen; Passwort-Raten aber schon
    assert 5 <= LOGIN_ATTEMPTS_PER_WINDOW <= 20
    assert REFRESH_ATTEMPTS_PER_WINDOW >= 30
