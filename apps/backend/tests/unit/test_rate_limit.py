"""TDD RED: Drosselung pro Client-IP für sensible öffentliche Endpunkte.

Live-Befund 22.10.: slowapi war zwar registriert, aber ohne Middleware oder
Decorator wirkungslos — beliebig viele Login-Versuche pro Sekunde möglich.
"""

from __future__ import annotations

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from src.adapters.input.api.rate_limit import get_rate_limit_store, rate_limit
from src.adapters.output.cache.rate_limit_store import InMemoryRateLimitStore, RedisRateLimitStore


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


class FakePipeline:
    def __init__(self, redis: FakeRedis) -> None:
        self._redis = redis
        self._ops: list[tuple[str, tuple[object, ...], dict[str, object]]] = []

    def incr(self, key: str) -> None:
        self._ops.append(("incr", (key,), {}))

    def expire(self, key: str, seconds: int, **kwargs: object) -> None:
        self._ops.append(("expire", (key, seconds), kwargs))

    async def execute(self) -> list[object]:
        self._redis.executed.append(self._ops)
        results: list[object] = []
        for name, args, _ in self._ops:
            if name == "incr":
                self._redis.counts[str(args[0])] = self._redis.counts.get(str(args[0]), 0) + 1
                results.append(self._redis.counts[str(args[0])])
            else:
                results.append(True)
        return results


class FakeRedis:
    def __init__(self) -> None:
        self.counts: dict[str, int] = {}
        self.executed: list[list[tuple[str, tuple[object, ...], dict[str, object]]]] = []
        self.transactions: list[bool] = []

    def pipeline(self, transaction: bool = True) -> FakePipeline:
        self.transactions.append(transaction)
        return FakePipeline(self)


@pytest.mark.asyncio
async def test_redis_counter_and_expiry_are_set_atomically() -> None:
    """INCR und EXPIRE in einer Transaktion, EXPIRE NX bei jedem Treffer —
    ein Absturz zwischen beiden darf nie einen Zähler ohne Ablauf hinterlassen
    (sonst dauerhafte Sperre)."""
    redis = FakeRedis()
    store = RedisRateLimitStore(redis)

    assert await store.hit("login:1.1.1.1", 300) == 1
    assert await store.hit("login:1.1.1.1", 300) == 2

    assert redis.transactions == [True, True]
    for ops in redis.executed:
        assert [op[0] for op in ops] == ["incr", "expire"]
        assert ops[1][1] == ("ratelimit:login:1.1.1.1", 300)
        assert ops[1][2] == {"nx": True}
