"""Integration tests for Child Profiles API endpoints — written FIRST (TDD RED phase)."""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.core.domain.entities.child_profile import ChildProfile

USER_ID = "user-1"


class FakeProfileRepo:
    """Persistenz-Stand-in — ersetzt den alten prozessweiten Dict-Store."""

    def __init__(self) -> None:
        self.profiles: dict[str, ChildProfile] = {}

    async def get_by_id(self, profile_id: str) -> ChildProfile | None:
        p = self.profiles.get(profile_id)
        return p if p and p.deleted_at is None else None

    async def list_by_user(self, user_id: str) -> list[ChildProfile]:
        return [p for p in self.profiles.values() if p.user_id == user_id and p.deleted_at is None]

    async def save(self, profile: ChildProfile) -> ChildProfile:
        self.profiles[profile.id] = profile
        return profile


@pytest.fixture()
def profile_repo() -> FakeProfileRepo:
    return FakeProfileRepo()


@pytest.fixture()
def client(profile_repo: FakeProfileRepo) -> TestClient:
    """Build FastAPI app with profiles router, no auth override (unauthenticated)."""
    from src.adapters.input.api.v1.profiles import get_profile_repository
    from src.adapters.input.api.v1.profiles import router as profiles_router

    app = FastAPI()
    app.include_router(profiles_router, prefix="/api/v1")
    app.dependency_overrides[get_profile_repository] = lambda: profile_repo

    # Do NOT override get_current_user so 401 is returned naturally
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture()
def authed_client(profile_repo: FakeProfileRepo) -> TestClient:
    """Authenticated client."""
    from src.adapters.input.api.v1.profiles import get_current_user, get_profile_repository
    from src.adapters.input.api.v1.profiles import router as profiles_router

    app = FastAPI()
    app.include_router(profiles_router, prefix="/api/v1")

    async def _user() -> str:
        return USER_ID

    app.dependency_overrides[get_current_user] = _user
    app.dependency_overrides[get_profile_repository] = lambda: profile_repo

    return TestClient(app, raise_server_exceptions=True)


class TestProfilePersistence:
    def test_created_profile_goes_through_repository(
        self, authed_client: TestClient, profile_repo: FakeProfileRepo
    ) -> None:
        resp = authed_client.post("/api/v1/profiles/children", json={"name": "Mia", "age": 5})
        assert resp.status_code == 201
        stored = profile_repo.profiles[resp.json()["id"]]
        assert stored.user_id == USER_ID
        assert stored.name == "Mia"

    def test_cannot_update_another_users_profile(
        self, authed_client: TestClient, profile_repo: FakeProfileRepo
    ) -> None:
        profile_repo.profiles["foreign"] = ChildProfile(
            id="foreign", user_id="someone-else", name="Ben", age=7
        )
        resp = authed_client.put("/api/v1/profiles/children/foreign", json={"name": "Hack"})
        assert resp.status_code == 404
        assert profile_repo.profiles["foreign"].name == "Ben"

    def test_delete_soft_deletes_profile(
        self, authed_client: TestClient, profile_repo: FakeProfileRepo
    ) -> None:
        pid = authed_client.post(
            "/api/v1/profiles/children", json={"name": "Mia", "age": 5}
        ).json()["id"]
        resp = authed_client.delete(f"/api/v1/profiles/children/{pid}")
        assert resp.status_code == 204
        # Soft Delete: Datensatz bleibt, ist aber markiert und unsichtbar
        assert profile_repo.profiles[pid].deleted_at is not None
        assert authed_client.get("/api/v1/profiles/children").json() == []


class TestGetChildProfiles:
    def test_get_child_profiles_without_auth_returns_401(self, client: TestClient) -> None:
        response = client.get("/api/v1/profiles/children")
        assert response.status_code == 401

    def test_get_child_profiles_with_auth_returns_200(self, authed_client: TestClient) -> None:
        response = authed_client.get("/api/v1/profiles/children")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_child_profiles_returns_empty_list_for_new_user(
        self, authed_client: TestClient
    ) -> None:
        response = authed_client.get("/api/v1/profiles/children")
        assert response.json() == []


class TestCreateChildProfile:
    def test_create_child_profile_without_auth_returns_401(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/profiles/children",
            json={"name": "Emma", "age": 6},
        )
        assert response.status_code == 401

    def test_create_child_profile_returns_201(self, authed_client: TestClient) -> None:
        response = authed_client.post(
            "/api/v1/profiles/children",
            json={"name": "Emma", "age": 6},
        )
        assert response.status_code == 201

    def test_create_child_profile_returns_created_data(self, authed_client: TestClient) -> None:
        response = authed_client.post(
            "/api/v1/profiles/children",
            json={"name": "Emma", "age": 6, "avatar_emoji": "🧒"},
        )
        data = response.json()
        assert data["name"] == "Emma"
        assert data["age"] == 6
        assert "id" in data
        assert "preferred_languages" in data

    def test_create_child_profile_default_language_is_de(self, authed_client: TestClient) -> None:
        response = authed_client.post(
            "/api/v1/profiles/children",
            json={"name": "Lena", "age": 5},
        )
        data = response.json()
        assert "de" in data["preferred_languages"]

    def test_create_child_profile_validates_age_range_too_young(
        self, authed_client: TestClient
    ) -> None:
        response = authed_client.post(
            "/api/v1/profiles/children",
            json={"name": "Baby", "age": 0},
        )
        assert response.status_code == 422

    def test_create_child_profile_validates_age_range_too_old(
        self, authed_client: TestClient
    ) -> None:
        response = authed_client.post(
            "/api/v1/profiles/children",
            json={"name": "Adult", "age": 19},
        )
        assert response.status_code == 422

    def test_create_child_profile_age_1_is_valid(self, authed_client: TestClient) -> None:
        response = authed_client.post(
            "/api/v1/profiles/children",
            json={"name": "Baby", "age": 1},
        )
        assert response.status_code == 201

    def test_create_child_profile_age_18_is_valid(self, authed_client: TestClient) -> None:
        response = authed_client.post(
            "/api/v1/profiles/children",
            json={"name": "Teen", "age": 18},
        )
        assert response.status_code == 201

    def test_created_profile_appears_in_list(self, authed_client: TestClient) -> None:
        authed_client.post(
            "/api/v1/profiles/children",
            json={"name": "Max", "age": 7},
        )
        response = authed_client.get("/api/v1/profiles/children")
        names = [p["name"] for p in response.json()]
        assert "Max" in names


class TestUpdateChildProfile:
    def test_update_child_profile_without_auth_returns_401(self, client: TestClient) -> None:
        response = client.put(
            "/api/v1/profiles/children/some-id",
            json={"name": "Emma"},
        )
        assert response.status_code == 401

    def test_update_child_profile_returns_200(self, authed_client: TestClient) -> None:
        create_resp = authed_client.post(
            "/api/v1/profiles/children",
            json={"name": "Emma", "age": 6},
        )
        profile_id = create_resp.json()["id"]

        response = authed_client.put(
            f"/api/v1/profiles/children/{profile_id}",
            json={"name": "Emma Updated", "age": 7},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Emma Updated"
        assert data["age"] == 7

    def test_update_child_profile_returns_404_for_unknown_id(
        self, authed_client: TestClient
    ) -> None:
        response = authed_client.put(
            "/api/v1/profiles/children/nonexistent-id",
            json={"name": "New Name"},
        )
        assert response.status_code == 404

    def test_update_child_profile_partial_update(self, authed_client: TestClient) -> None:
        """Only provided fields are updated; others remain unchanged."""
        create_resp = authed_client.post(
            "/api/v1/profiles/children",
            json={"name": "Felix", "age": 8, "avatar_emoji": "👦"},
        )
        profile_id = create_resp.json()["id"]

        response = authed_client.put(
            f"/api/v1/profiles/children/{profile_id}",
            json={"name": "Felix Updated"},
        )
        data = response.json()
        assert data["name"] == "Felix Updated"
        assert data["age"] == 8  # unchanged
        assert data["avatar_emoji"] == "👦"  # unchanged

    def test_update_child_profile_validates_age(self, authed_client: TestClient) -> None:
        create_resp = authed_client.post(
            "/api/v1/profiles/children",
            json={"name": "Emma", "age": 6},
        )
        profile_id = create_resp.json()["id"]

        response = authed_client.put(
            f"/api/v1/profiles/children/{profile_id}",
            json={"age": 25},
        )
        assert response.status_code == 422
