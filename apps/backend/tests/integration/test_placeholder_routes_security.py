"""TDD RED: Platzhalter-Routen waren live komplett ungeschützt.

ai/rag, ai/documents, ai/agents, webhooks/ und api-keys/ hatten weder
Auth noch Flag-Check, und POST /webhooks/ echote das Feld `secret` in
der Response zurück. GET /billing/subscription/{space_id} gaukelte jedem
anonymen Aufrufer einen aktiven Plan vor.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.adapters.input.api.dependencies import get_current_user
from src.adapters.input.api.v1.ai import router as ai_router
from src.adapters.input.api.v1.api_keys import router as api_keys_router
from src.adapters.input.api.v1.billing import router as billing_router
from src.adapters.input.api.v1.webhooks import router as webhooks_router


def _client(*, authenticated: bool = False) -> TestClient:
    app = FastAPI()
    for router in (ai_router, api_keys_router, billing_router, webhooks_router):
        app.include_router(router, prefix="/api/v1")
    if authenticated:
        app.dependency_overrides[get_current_user] = lambda: "user-1"
    return TestClient(app, raise_server_exceptions=False)


class TestPlaceholderRoutesRequireAuth:
    def test_rag_requires_auth(self) -> None:
        response = _client().post("/api/v1/ai/rag", json={"space_id": "s1", "query": "q"})
        assert response.status_code == 401

    def test_upload_document_requires_auth(self) -> None:
        response = _client().post(
            "/api/v1/ai/documents?space_id=s1", files={"file": ("a.txt", b"x")}
        )
        assert response.status_code == 401

    def test_list_documents_requires_auth(self) -> None:
        assert _client().get("/api/v1/ai/documents?space_id=s1").status_code == 401

    def test_delete_document_requires_auth(self) -> None:
        assert _client().delete("/api/v1/ai/documents/d1").status_code == 401

    def test_run_agent_requires_auth(self) -> None:
        response = _client().post("/api/v1/ai/agents/run", json={"space_id": "s1", "goal": "x"})
        assert response.status_code == 401

    def test_get_agent_run_requires_auth(self) -> None:
        assert _client().get("/api/v1/ai/agents/r1").status_code == 401

    def test_webhooks_require_auth(self) -> None:
        c = _client()
        assert c.get("/api/v1/webhooks/?space_id=s1").status_code == 401
        assert (
            c.post(
                "/api/v1/webhooks/?space_id=s1",
                json={"name": "n", "url": "https://x.example", "events": ["a"]},
            ).status_code
            == 401
        )
        assert c.delete("/api/v1/webhooks/w1").status_code == 401

    def test_api_keys_require_auth(self) -> None:
        c = _client()
        assert c.get("/api/v1/api-keys/").status_code == 401
        assert c.post("/api/v1/api-keys/", json={"name": "k"}).status_code == 401
        assert c.delete("/api/v1/api-keys/k1").status_code == 401

    def test_billing_subscription_requires_auth(self) -> None:
        assert _client().get("/api/v1/billing/subscription/s1").status_code == 401


class TestWebhookSecretNotEchoed:
    def test_create_webhook_does_not_return_secret(self) -> None:
        response = _client(authenticated=True).post(
            "/api/v1/webhooks/?space_id=s1",
            json={
                "name": "n",
                "url": "https://x.example",
                "events": ["a"],
                "secret": "super-geheim",
            },
        )
        assert response.status_code == 201
        assert "super-geheim" not in response.text
        assert "secret" not in response.json()
