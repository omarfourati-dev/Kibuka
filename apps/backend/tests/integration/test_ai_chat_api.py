"""Integration tests for the /ai/chat endpoint — written FIRST (TDD RED phase).

The template chat must stream real OpenAI deltas as SSE instead of the old
placeholder — authenticated, with a server-side model allowlist and a message
length cap, gated by the ENABLE_AI feature flag.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.adapters.input.api.v1.ai import (
    get_ai_client,
    get_ai_usage_repository,
    get_current_user,
)
from src.adapters.input.api.v1.ai import router as ai_router
from src.core.domain.entities.ai_usage import AIUsage
from src.infrastructure.config import settings
from src.infrastructure.security import create_access_token

# ---------------------------------------------------------------------------
# Fakes
# ---------------------------------------------------------------------------


class FakeAIClient:
    """IAIClient stand-in that records calls and yields canned deltas."""

    def __init__(self, deltas: list[str]) -> None:
        self._deltas = deltas
        self.calls: list[dict] = []

    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        model: str,
        stream: bool = False,
    ) -> AsyncGenerator[str, None]:
        self.calls.append({"messages": messages, "model": model, "stream": stream})

        async def _gen() -> AsyncGenerator[str, None]:
            for delta in self._deltas:
                yield delta

        return _gen()

    async def embed(self, texts: list[str], model: str = "") -> list[list[float]]:
        raise NotImplementedError

    async def count_tokens(self, text: str, model: str) -> int:
        return max(1, len(text) // 4)


class FakeUsageRepository:
    def __init__(self, daily_cost_usd: float = 0.0) -> None:
        self._daily_cost_usd = daily_cost_usd
        self.saved: list[AIUsage] = []

    async def save(self, usage: AIUsage) -> AIUsage:
        self.saved.append(usage)
        return usage

    async def get_daily_cost_usd(self, user_id: str) -> float:
        return self._daily_cost_usd


def _make_client(
    fake: FakeAIClient,
    authenticated: bool = True,
    usage_repo: FakeUsageRepository | None = None,
) -> TestClient:
    app = FastAPI()
    app.include_router(ai_router, prefix="/api/v1")
    app.dependency_overrides[get_ai_client] = lambda: fake
    app.dependency_overrides[get_ai_usage_repository] = lambda: (
        usage_repo if usage_repo is not None else FakeUsageRepository()
    )
    if authenticated:
        app.dependency_overrides[get_current_user] = lambda: "user-1"
    return TestClient(app)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestChatEndpoint:
    def test_chat_streams_deltas_as_sse(self) -> None:
        fake = FakeAIClient(deltas=["Hallo", " Welt"])
        client = _make_client(fake)

        response = client.post(
            "/api/v1/ai/chat",
            json={"message": "Sag hallo", "space_id": "space-1"},
        )

        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")
        assert "data: Hallo\n\n" in response.text
        assert "data:  Welt\n\n" in response.text
        assert response.text.endswith("data: [DONE]\n\n")

    def test_chat_passes_message_and_model_to_ai_client(self) -> None:
        fake = FakeAIClient(deltas=["ok"])
        client = _make_client(fake)

        client.post(
            "/api/v1/ai/chat",
            json={"message": "Wie geht's?", "space_id": "space-1", "model": "gpt-4.1"},
        )

        assert len(fake.calls) == 1
        call = fake.calls[0]
        assert call["model"] == "gpt-4.1"
        assert call["stream"] is True
        assert call["messages"][-1] == {"role": "user", "content": "Wie geht's?"}

    def test_chat_returns_404_when_ai_disabled(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(settings, "enable_ai", False)
        fake = FakeAIClient(deltas=["nie gesendet"])
        client = _make_client(fake)

        response = client.post(
            "/api/v1/ai/chat",
            json={"message": "Hallo", "space_id": "space-1"},
        )

        assert response.status_code == 404
        assert fake.calls == []

    def test_chat_requires_authentication(self) -> None:
        """Without a bearer token the endpoint must reject with 401 — paid
        OpenAI calls must never be reachable anonymously."""
        fake = FakeAIClient(deltas=["nie gesendet"])
        client = _make_client(fake, authenticated=False)

        response = client.post(
            "/api/v1/ai/chat",
            json={"message": "Hallo", "space_id": "space-1"},
        )

        assert response.status_code == 401
        assert fake.calls == []

    def test_chat_rejects_model_outside_allowlist(self) -> None:
        """Client-controlled model ids must be checked against a server-side
        allowlist — otherwise callers escalate to arbitrary expensive models."""
        fake = FakeAIClient(deltas=["nie gesendet"])
        client = _make_client(fake)

        response = client.post(
            "/api/v1/ai/chat",
            json={"message": "Hallo", "space_id": "space-1", "model": "gpt-999-ultra"},
        )

        assert response.status_code == 400
        assert fake.calls == []

    def test_chat_rejects_overlong_message(self) -> None:
        """Message length is capped to bound per-request token spend."""
        fake = FakeAIClient(deltas=["nie gesendet"])
        client = _make_client(fake)

        response = client.post(
            "/api/v1/ai/chat",
            json={"message": "x" * 4001, "space_id": "space-1"},
        )

        assert response.status_code == 422
        assert fake.calls == []


class TestChatJwtValidation:
    """Without a dependency override the endpoint must validate real JWTs."""

    def test_chat_accepts_valid_jwt(self) -> None:
        fake = FakeAIClient(deltas=["ok"])
        client = _make_client(fake, authenticated=False)
        token = create_access_token("user-7")

        response = client.post(
            "/api/v1/ai/chat",
            json={"message": "Hallo", "space_id": "space-1"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200

    def test_chat_rejects_forged_jwt(self) -> None:
        fake = FakeAIClient(deltas=["nie gesendet"])
        client = _make_client(fake, authenticated=False)

        response = client.post(
            "/api/v1/ai/chat",
            json={"message": "Hallo", "space_id": "space-1"},
            headers={"Authorization": "Bearer not.a.real-token"},
        )

        assert response.status_code == 401
        assert fake.calls == []


class TestChatCostLimit:
    def test_chat_returns_429_when_daily_cost_limit_reached(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr(settings, "ai_cost_limit_usd_per_day", 5.0)
        fake = FakeAIClient(deltas=["nie gesendet"])
        usage_repo = FakeUsageRepository(daily_cost_usd=5.0)
        client = _make_client(fake, usage_repo=usage_repo)

        response = client.post(
            "/api/v1/ai/chat",
            json={"message": "Hallo", "space_id": "space-1"},
        )

        assert response.status_code == 429
        assert fake.calls == []
        assert usage_repo.saved == []

    def test_chat_records_usage_after_successful_stream(self) -> None:
        fake = FakeAIClient(deltas=["Hallo", " Welt"])
        usage_repo = FakeUsageRepository(daily_cost_usd=0.0)
        client = _make_client(fake, usage_repo=usage_repo)

        response = client.post(
            "/api/v1/ai/chat",
            json={"message": "Sag hallo", "space_id": "space-1", "model": "gpt-4.1"},
        )

        assert response.status_code == 200
        assert len(usage_repo.saved) == 1
        usage = usage_repo.saved[0]
        assert usage.user_id == "user-1"
        assert usage.space_id == "space-1"
        assert usage.model == "gpt-4.1"
        assert usage.feature == "chat"
        assert usage.prompt_tokens > 0
        assert usage.completion_tokens > 0
        assert usage.total_tokens == usage.prompt_tokens + usage.completion_tokens
        assert usage.cost_usd > 0
