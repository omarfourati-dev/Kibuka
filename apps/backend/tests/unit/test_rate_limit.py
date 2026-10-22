"""TDD RED: Drosselung pro Client-IP für sensible öffentliche Endpunkte.

Live-Befund 22.10.: slowapi war zwar registriert, aber ohne Middleware oder
Decorator wirkungslos — beliebig viele Login-Versuche pro Sekunde möglich.
"""

from __future__ import annotations

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from src.adapters.input.api.rate_limit import get_rate_limit_store, rate_limit
from src.adapters.output.cache.rate_limit_store import InMemoryRateLimitStore


class BrokenStore:
    async def hit(self, key: str, window_seconds: int) -> int:
        raise ConnectionError("redis down")


def _client(store: object, limit: int = 3) -> TestClient:
    app = FastAPI()

    @app.post("/a", dependencies=[Depends(rate_limit("scope-a", limit, 60))])
    async def a() -> dict[str, bool]:
        return {"ok": True}

    @app.post("/b", dependencies=[Depends(rate_limit("scope-b", limit, 60))])
    async def b() -> dict[str, bool]:
        return {"ok": True}

    app.dependency_overrides[get_rate_limit_store] = lambda: store
    return TestClient(app)


def test_allows_up_to_the_limit_then_answers_429_with_retry_after() -> None:
    client = _client(InMemoryRateLimitStore())

    codes = [client.post("/a").status_code for _ in range(4)]

    assert codes == [200, 200, 200, 429]
    blocked = client.post("/a")
    assert blocked.headers["Retry-After"] == "60"


def test_counts_each_client_ip_separately() -> None:
    client = _client(InMemoryRateLimitStore(), limit=1)

    assert client.post("/a", headers={"X-Real-IP": "1.1.1.1"}).status_code == 200
    assert client.post("/a", headers={"X-Real-IP": "1.1.1.1"}).status_code == 429
    assert client.post("/a", headers={"X-Real-IP": "2.2.2.2"}).status_code == 200


def test_scopes_do_not_share_a_budget() -> None:
    client = _client(InMemoryRateLimitStore(), limit=1)

    assert client.post("/a").status_code == 200
    assert client.post("/b").status_code == 200


def test_store_outage_fails_open() -> None:
    # Ein Redis-Ausfall darf Login und Kündigung nicht lahmlegen
    client = _client(BrokenStore(), limit=1)
    assert [client.post("/a").status_code for _ in range(3)] == [200, 200, 200]


@pytest.mark.asyncio
async def test_in_memory_window_expires(monkeypatch: pytest.MonkeyPatch) -> None:
    now = [1000.0]
    monkeypatch.setattr("src.adapters.output.cache.rate_limit_store.time.monotonic", lambda: now[0])
    store = InMemoryRateLimitStore()

    assert await store.hit("k", 60) == 1
    assert await store.hit("k", 60) == 2
    now[0] += 61
    assert await store.hit("k", 60) == 1
