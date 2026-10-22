"""TDD RED: /users/me war ein NotImplementedError-Platzhalter (Live-500).

Settings-Seite und die DSGVO-Pflichten (Art. 17 Löschung, Art. 20 Export)
brauchen echte Routen: get/patch/delete /users/me + /users/me/export.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.adapters.input.api.dependencies import get_current_user, get_user_repository
from src.adapters.input.api.v1.users import router as users_router
from src.core.domain.entities.user import User, UserRole, UserStatus

USER_ID = "user-1"


class FakeUserRepo:
    def __init__(self) -> None:
        self.users: dict[str, User] = {
            USER_ID: User(
                id=USER_ID,
                email="omar@example.com",
                name="Omar",
                role=UserRole.MEMBER,
                status=UserStatus.ACTIVE,
                avatar_url=None,
            )
        }
        self.deleted: list[str] = []
        self.anonymized: list[str] = []

    async def get_by_id(self, user_id: str) -> User | None:
        user = self.users.get(user_id)
        if user and user.deleted_at is None:
            return user
        return None

    async def save(self, user: User) -> User:
        self.users[user.id] = user
        return user

    async def delete(self, user_id: str) -> None:
        self.deleted.append(user_id)

    async def anonymize(self, user_id: str) -> None:
        self.anonymized.append(user_id)


def _build_client(
    repo: FakeUserRepo | None = None, authenticated: bool = True
) -> tuple[TestClient, FakeUserRepo]:
    repo = repo or FakeUserRepo()
    app = FastAPI()
    app.include_router(users_router, prefix="/api/v1")
    app.dependency_overrides[get_user_repository] = lambda: repo
    if authenticated:
        app.dependency_overrides[get_current_user] = lambda: USER_ID
    return TestClient(app, raise_server_exceptions=False), repo


class TestGetMe:
    def test_requires_auth(self) -> None:
        client, _ = _build_client(authenticated=False)
        assert client.get("/api/v1/users/me").status_code == 401

    def test_returns_profile(self) -> None:
        client, _ = _build_client()
        response = client.get("/api/v1/users/me")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == USER_ID
        assert data["email"] == "omar@example.com"
        assert data["name"] == "Omar"
        assert data["role"] == "member"

    def test_unknown_user_gets_401(self) -> None:
        repo = FakeUserRepo()
        repo.users.clear()
        client, _ = _build_client(repo=repo)
        assert client.get("/api/v1/users/me").status_code == 401


class TestUpdateMe:
    def test_updates_name_and_avatar(self) -> None:
        client, repo = _build_client()
        response = client.patch(
            "/api/v1/users/me",
            json={"name": "Omar F.", "avatar_url": "https://cdn.example.com/a.png"},
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Omar F."
        assert repo.users[USER_ID].name == "Omar F."
        assert repo.users[USER_ID].avatar_url == "https://cdn.example.com/a.png"

    def test_partial_update_keeps_other_fields(self) -> None:
        client, repo = _build_client()
        client.patch("/api/v1/users/me", json={"name": "Nur Name"})
        assert repo.users[USER_ID].name == "Nur Name"
        assert repo.users[USER_ID].email == "omar@example.com"


class TestDeleteMe:
    def test_soft_deletes_and_anonymizes(self) -> None:
        client, repo = _build_client()
        response = client.delete("/api/v1/users/me")
        assert response.status_code == 204
        assert USER_ID in repo.anonymized
        assert USER_ID in repo.deleted


class TestExportMe:
    def test_exports_profile_as_json(self) -> None:
        client, _ = _build_client()
        response = client.get("/api/v1/users/me/export")
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["email"] == "omar@example.com"
        assert data["user"]["id"] == USER_ID
