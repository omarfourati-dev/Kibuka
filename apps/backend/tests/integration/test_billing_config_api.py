"""TDD RED: Öffentlicher Billing-Status für das Frontend.

GET /billing/config → {"enabled": bool}
Ohne Anmeldung lesbar — die Startseite zeigt das Abo-Band nur, wenn man
überhaupt ein Abo abschließen kann (ENABLE_BILLING).
"""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.adapters.input.api.v1.billing import router as billing_router
from src.infrastructure.config import settings


def _client() -> TestClient:
    app = FastAPI()
    app.include_router(billing_router, prefix="/api/v1")
    return TestClient(app)


@pytest.mark.parametrize("enabled", [True, False])
def test_reports_whether_billing_is_enabled(monkeypatch: pytest.MonkeyPatch, enabled: bool) -> None:
    monkeypatch.setattr(settings, "enable_billing", enabled)
    resp = _client().get("/api/v1/billing/config")
    assert resp.status_code == 200
    assert resp.json() == {"enabled": enabled}


def test_needs_no_login_and_reveals_nothing_else(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "enable_billing", True)
    resp = _client().get("/api/v1/billing/config")
    # Keine Keys, Preis-IDs o. Ä. — nur der Schalter
    assert set(resp.json()) == {"enabled"}


def test_may_be_cached_briefly(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "enable_billing", False)
    resp = _client().get("/api/v1/billing/config")
    assert "max-age=300" in resp.headers.get("cache-control", "")
