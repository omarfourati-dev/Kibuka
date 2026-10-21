"""Integration tests for /auth register + login — written FIRST (TDD RED phase).

The template auth stubs (501) become a real JWT flow: register hashes the
password and returns a signed access token; login verifies credentials.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient
from src.infrastructure.security import decode_access_token

from src.adapters.input.api.v1.auth import get_user_repository
from src.adapters.input.api.v1.auth import router as auth_router
from src.core.domain.entities.user import User

# ---------------------------------------------------------------------------
# Fakes
# ---------------------------------------------------------------------------


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


def _make_client(repo: FakeUserRepository) -> TestClient:
    app = FastAPI()
    app.include_router(auth_router, prefix="/api/v1")
    app.dependency_overrides[get_user_repository] = lambda: repo
    return TestClient(app)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestRegister:
    def test_register_returns_decodable_access_token(self) -> None:
        repo = FakeUserRepository()
        client = _make_client(repo)

        response = client.post(
            "/api/v1/auth/register",
            json={"email": "omar@example.com", "name": "Omar", "password": "s3cret-pass"},
        )

        assert response.status_code == 201
        token = response.json()["access_token"]
        user_id = decode_access_token(token)
        assert user_id in repo.users

    def test_register_stores_hashed_password_never_plaintext(self) -> None:
        repo = FakeUserRepository()
        client = _make_client(repo)

        client.post(
            "/api/v1/auth/register",
            json={"email": "omar@example.com", "name": "Omar", "password": "s3cret-pass"},
        )

        user = next(iter(repo.users.values()))
        assert user.hashed_password is not None
        assert "s3cret-pass" not in user.hashed_password

    def test_register_rejects_duplicate_email(self) -> None:
        repo = FakeUserRepository()
        client = _make_client(repo)
        payload = {"email": "omar@example.com", "name": "Omar", "password": "s3cret-pass"}

        client.post("/api/v1/auth/register", json=payload)
        response = client.post("/api/v1/auth/register", json=payload)

        assert response.status_code == 409


class TestLogin:
    def _register(self, client: TestClient) -> None:
        client.post(
            "/api/v1/auth/register",
            json={"email": "omar@example.com", "name": "Omar", "password": "s3cret-pass"},
        )

    def test_login_with_correct_credentials_returns_token(self) -> None:
        repo = FakeUserRepository()
        client = _make_client(repo)
        self._register(client)

        response = client.post(
            "/api/v1/auth/login",
            json={"email": "omar@example.com", "password": "s3cret-pass"},
        )

        assert response.status_code == 200
        assert decode_access_token(response.json()["access_token"]) in repo.users

    def test_login_with_wrong_password_returns_401(self) -> None:
        repo = FakeUserRepository()
        client = _make_client(repo)
        self._register(client)

        response = client.post(
            "/api/v1/auth/login",
            json={"email": "omar@example.com", "password": "wrong"},
        )

        assert response.status_code == 401

    def test_login_with_unknown_email_returns_401(self) -> None:
        repo = FakeUserRepository()
        client = _make_client(repo)

        response = client.post(
            "/api/v1/auth/login",
            json={"email": "nobody@example.com", "password": "whatever"},
        )

        assert response.status_code == 401
