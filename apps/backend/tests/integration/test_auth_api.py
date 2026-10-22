"""Integration tests for /auth register + login — written FIRST (TDD RED phase).

The template auth stubs (501) become a real JWT flow: register hashes the
password and returns a signed access token; login verifies credentials.
"""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import FastAPI
from fastapi.testclient import TestClient
from src.adapters.input.api.rate_limit import get_rate_limit_store
from src.adapters.output.cache.rate_limit_store import InMemoryRateLimitStore

from src.adapters.input.api.v1.auth import get_refresh_token_store, get_user_repository
from src.adapters.input.api.v1.auth import router as auth_router
from src.adapters.output.cache.refresh_token_store import InMemoryRefreshTokenStore
from src.core.domain.entities.user import User, UserStatus
from src.infrastructure.security import decode_access_token

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


def _make_client(
    repo: FakeUserRepository, store: InMemoryRefreshTokenStore | None = None
) -> TestClient:
    app = FastAPI()
    app.include_router(auth_router, prefix="/api/v1")
    app.dependency_overrides[get_user_repository] = lambda: repo
    shared_store = store or InMemoryRefreshTokenStore()
    app.dependency_overrides[get_refresh_token_store] = lambda: shared_store
    limits = InMemoryRateLimitStore()
    app.dependency_overrides[get_rate_limit_store] = lambda: limits
    # https wie in Produktion — sonst schickt der Client Secure-Cookies nicht
    # mit und die Tests hingen von ENVIRONMENT ab (CI: test, lokal: development)
    return TestClient(app, base_url="https://testserver")


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

    def test_login_response_includes_public_user(self) -> None:
        repo = FakeUserRepository()
        client = _make_client(repo)
        self._register(client)

        response = client.post(
            "/api/v1/auth/login",
            json={"email": "omar@example.com", "password": "s3cret-pass"},
        )

        user = response.json()["user"]
        assert user["email"] == "omar@example.com"
        assert user["role"] == "member"
        assert "hashed_password" not in user

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

    def test_login_with_suspended_account_returns_401(self) -> None:
        """Inactive or suspended accounts must not receive tokens."""
        repo = FakeUserRepository()
        client = _make_client(repo)
        self._register(client)
        user = next(iter(repo.users.values()))
        user.status = UserStatus.SUSPENDED

        response = client.post(
            "/api/v1/auth/login",
            json={"email": "omar@example.com", "password": "s3cret-pass"},
        )

        assert response.status_code == 401

    def test_login_with_soft_deleted_account_returns_401(self) -> None:
        repo = FakeUserRepository()
        client = _make_client(repo)
        self._register(client)
        user = next(iter(repo.users.values()))
        user.deleted_at = datetime.now(UTC)

        response = client.post(
            "/api/v1/auth/login",
            json={"email": "omar@example.com", "password": "s3cret-pass"},
        )

        assert response.status_code == 401


# ---------------------------------------------------------------------------
# Refresh-Flow: Sitzung muss Reload/Browser-Neustart überleben
# ---------------------------------------------------------------------------


def _registered(client: TestClient) -> None:
    client.post(
        "/api/v1/auth/register",
        json={"email": "omar@example.com", "name": "Omar", "password": "s3cret-pass"},
    )


class TestRefreshFlow:
    def test_login_sets_httponly_refresh_cookie_scoped_to_auth(self) -> None:
        client = _make_client(FakeUserRepository())
        _registered(client)

        response = client.post(
            "/api/v1/auth/login",
            json={"email": "omar@example.com", "password": "s3cret-pass"},
        )

        cookie = response.headers.get("set-cookie", "")
        assert "refresh_token=" in cookie
        assert "HttpOnly" in cookie
        assert "Path=/api/v1/auth" in cookie
        assert "samesite=lax" in cookie.lower()

    def test_refresh_with_cookie_returns_new_access_token_and_user(self) -> None:
        client = _make_client(FakeUserRepository())
        _registered(client)  # TestClient behält das Cookie

        response = client.post("/api/v1/auth/refresh")

        assert response.status_code == 200
        data = response.json()
        user_id = decode_access_token(data["access_token"])
        assert data["user"]["id"] == user_id
        assert data["user"]["email"] == "omar@example.com"

    def test_refresh_without_cookie_returns_401(self) -> None:
        client = _make_client(FakeUserRepository())
        assert client.post("/api/v1/auth/refresh").status_code == 401

    def test_refresh_with_access_token_as_cookie_is_rejected(self) -> None:
        from src.infrastructure.security import create_access_token

        client = _make_client(FakeUserRepository())
        client.cookies.set("refresh_token", create_access_token("whoever"), path="/api/v1/auth")
        assert client.post("/api/v1/auth/refresh").status_code == 401

    def test_refresh_rejects_suspended_user(self) -> None:
        repo = FakeUserRepository()
        client = _make_client(repo)
        _registered(client)
        user = next(iter(repo.users.values()))
        user.status = UserStatus.SUSPENDED

        assert client.post("/api/v1/auth/refresh").status_code == 401

    def test_logout_clears_refresh_cookie(self) -> None:
        client = _make_client(FakeUserRepository())
        _registered(client)

        client.post("/api/v1/auth/logout")

        assert client.post("/api/v1/auth/refresh").status_code == 401


class TestRefreshTokenRevocation:
    """Security-Review 22.10.: zustandslose Refresh-Tokens waren nach Logout
    noch 7 Tage gültig. Jetzt: jti serverseitig, Rotation, Widerruf."""

    def test_replaying_a_token_after_logout_is_rejected(self) -> None:
        client = _make_client(FakeUserRepository())
        _registered(client)
        stolen = client.cookies.get("refresh_token")
        assert stolen

        client.post("/api/v1/auth/logout")
        client.cookies.clear()
        client.cookies.set("refresh_token", stolen, domain="testserver", path="/api/v1/auth")

        assert client.post("/api/v1/auth/refresh").status_code == 401

    def test_rotated_token_cannot_be_reused(self) -> None:
        client = _make_client(FakeUserRepository())
        _registered(client)
        first = client.cookies.get("refresh_token")
        assert first

        assert client.post("/api/v1/auth/refresh").status_code == 200  # rotiert
        client.cookies.clear()
        client.cookies.set("refresh_token", first, domain="testserver", path="/api/v1/auth")

        assert client.post("/api/v1/auth/refresh").status_code == 401

    def test_validly_signed_token_unknown_to_server_is_rejected(self) -> None:
        """Ein korrekt signiertes Token ohne Server-Eintrag gilt nicht."""
        from src.infrastructure.security import create_refresh_token

        repo = FakeUserRepository()
        client = _make_client(repo)
        _registered(client)
        user_id = next(iter(repo.users))
        client.cookies.clear()
        client.cookies.set("refresh_token", create_refresh_token(user_id), path="/api/v1/auth")
        assert client.post("/api/v1/auth/refresh").status_code == 401


class TestRefreshCookieSecurity:
    def test_cookie_is_secure_outside_development(self, monkeypatch) -> None:  # type: ignore[no-untyped-def]
        from src.infrastructure.config import settings

        monkeypatch.setattr(settings, "environment", "production")
        client = _make_client(FakeUserRepository())

        response = client.post(
            "/api/v1/auth/register",
            json={"email": "omar@example.com", "name": "Omar", "password": "s3cret-pass"},
        )

        assert "Secure" in response.headers.get("set-cookie", "")
