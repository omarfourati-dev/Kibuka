"""TDD RED: Die Notification-Glocke pollt alle 30 s drei Routen,
die im Backend gar nicht existierten (404-Dauerfeuer in Produktion).

Minimal-Vertrag des Frontends (use-notifications.ts):
GET /notifications → Notification[], PATCH /notifications/{id}/read,
POST /notifications/read-all — alle nur mit Auth.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.adapters.input.api.dependencies import get_current_user
from src.adapters.input.api.v1.notifications import router as notifications_router


def _client(*, authenticated: bool = True) -> TestClient:
    app = FastAPI()
    app.include_router(notifications_router, prefix="/api/v1")
    if authenticated:
        app.dependency_overrides[get_current_user] = lambda: "user-1"
    return TestClient(app, raise_server_exceptions=False)


class TestNotifications:
    def test_list_requires_auth(self) -> None:
        assert _client(authenticated=False).get("/api/v1/notifications").status_code == 401

    def test_list_returns_array(self) -> None:
        response = _client().get("/api/v1/notifications")
        assert response.status_code == 200
        assert response.json() == []

    def test_mark_read_returns_ok(self) -> None:
        response = _client().patch("/api/v1/notifications/n1/read", json={})
        assert response.status_code == 200

    def test_mark_all_read_returns_ok(self) -> None:
        response = _client().post("/api/v1/notifications/read-all", json={})
        assert response.status_code == 200
