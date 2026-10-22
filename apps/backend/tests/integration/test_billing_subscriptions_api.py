"""TDD RED: Monats-/Jahresabo über Stripe Subscriptions.

- POST /billing/checkout/subscription  → Stripe-Checkout (mode=subscription)
- customer.subscription.created|updated|deleted → Abo-Status upserten
- GET  /billing/subscription/me        → Abo-Status des Nutzers
- POST /billing/portal                 → Stripe-Kundenportal (Kündigung)
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
import stripe
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.adapters.input.api.dependencies import get_current_user, get_user_repository
from src.adapters.input.api.v1.billing import (
    get_billing_adapter,
    get_billing_book_repository,
    get_subscription_repository,
)
from src.adapters.input.api.v1.billing import router as billing_router
from src.core.domain.entities.purchase import BookSubscription, BookSubscriptionStatus
from src.core.domain.entities.user import User, UserRole, UserStatus
from src.infrastructure.config import settings

USER_ID = "user-1"


class FakeSubscriptionRepo:
    def __init__(self) -> None:
        self.subs: dict[str, BookSubscription] = {}

    async def get_current_for_user(self, user_id: str) -> BookSubscription | None:
        mine = [s for s in self.subs.values() if s.user_id == user_id]
        active = [s for s in mine if s.is_active]
        return (active or mine or [None])[0]

    async def get_by_stripe_id(self, stripe_subscription_id: str) -> BookSubscription | None:
        return self.subs.get(stripe_subscription_id)

    async def upsert_by_stripe_id(self, sub: BookSubscription) -> BookSubscription:
        assert sub.stripe_subscription_id
        existing = self.subs.get(sub.stripe_subscription_id)
        if existing:
            sub.id = existing.id
        self.subs[sub.stripe_subscription_id] = sub
        return sub


class FakeUserRepo:
    async def get_by_id(self, user_id: str) -> User | None:
        return User(
            id=user_id,
            email="omar@example.com",
            name="Omar",
            role=UserRole.MEMBER,
            status=UserStatus.ACTIVE,
        )


class FakeBilling:
    def __init__(self) -> None:
        self.sub_calls: list[dict[str, Any]] = []
        self.portal_calls: list[dict[str, Any]] = []

    async def create_subscription_checkout(self, **kwargs: Any) -> str:
        self.sub_calls.append(kwargs)
        return "https://checkout.stripe.com/sub-session"

    async def create_customer_portal_session(self, customer_id: str, return_url: str) -> str:
        self.portal_calls.append({"customer_id": customer_id, "return_url": return_url})
        return "https://billing.stripe.com/portal-session"


def _client(
    subs: FakeSubscriptionRepo | None = None,
    billing: FakeBilling | None = None,
    authenticated: bool = True,
) -> tuple[TestClient, FakeSubscriptionRepo, FakeBilling]:
    subs = subs or FakeSubscriptionRepo()
    billing = billing or FakeBilling()
    app = FastAPI()
    app.include_router(billing_router, prefix="/api/v1")
    app.dependency_overrides[get_subscription_repository] = lambda: subs
    app.dependency_overrides[get_billing_adapter] = lambda: billing
    app.dependency_overrides[get_billing_book_repository] = lambda: None
    app.dependency_overrides[get_user_repository] = lambda: FakeUserRepo()
    if authenticated:
        app.dependency_overrides[get_current_user] = lambda: USER_ID
    return TestClient(app, raise_server_exceptions=True), subs, billing


@pytest.fixture(autouse=True)
def _billing_on(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "enable_billing", True)
    monkeypatch.setattr(settings, "stripe_webhook_secret", "whsec_test")


def _active_sub(**overrides: Any) -> BookSubscription:
    data: dict[str, Any] = {
        "id": "s1",
        "user_id": USER_ID,
        "plan": "monthly",
        "status": BookSubscriptionStatus.ACTIVE,
        "stripe_subscription_id": "sub_1",
        "stripe_customer_id": "cus_1",
        "current_period_end": datetime.now(UTC) + timedelta(days=20),
    }
    data.update(overrides)
    return BookSubscription(**data)


# ---------------------------------------------------------------------------
# Checkout
# ---------------------------------------------------------------------------


class TestSubscriptionCheckout:
    def test_requires_auth(self) -> None:
        client, _, billing = _client(authenticated=False)
        resp = client.post("/api/v1/billing/checkout/subscription", json={"plan": "monthly"})
        assert resp.status_code == 401
        assert billing.sub_calls == []

    def test_disabled_billing_returns_404(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(settings, "enable_billing", False)
        client, _, billing = _client()
        resp = client.post("/api/v1/billing/checkout/subscription", json={"plan": "monthly"})
        assert resp.status_code == 404
        assert billing.sub_calls == []

    def test_unknown_plan_is_rejected(self) -> None:
        client, _, billing = _client()
        resp = client.post("/api/v1/billing/checkout/subscription", json={"plan": "lifetime"})
        assert resp.status_code == 422
        assert billing.sub_calls == []

    @pytest.mark.parametrize(
        ("plan", "cents", "interval"), [("monthly", 1499, "month"), ("yearly", 9900, "year")]
    )
    def test_creates_subscription_session(self, plan: str, cents: int, interval: str) -> None:
        client, _, billing = _client()
        resp = client.post("/api/v1/billing/checkout/subscription", json={"plan": plan})

        assert resp.status_code == 200
        assert resp.json()["url"] == "https://checkout.stripe.com/sub-session"
        call = billing.sub_calls[0]
        assert call["user_id"] == USER_ID
        assert call["plan"] == plan
        assert call["amount_cents"] == cents
        assert call["interval"] == interval
        assert call["trial_days"] == 14
        assert call["customer_email"] == "omar@example.com"
        # Redirect-Ziele serverseitig (kein Open Redirect)
        assert call["success_url"].startswith(settings.app_url)
        assert call["cancel_url"].startswith(settings.app_url)

    def test_active_subscriber_cannot_subscribe_twice(self) -> None:
        subs = FakeSubscriptionRepo()
        subs.subs["sub_1"] = _active_sub()
        client, _, billing = _client(subs=subs)

        resp = client.post("/api/v1/billing/checkout/subscription", json={"plan": "yearly"})

        assert resp.status_code == 409
        assert billing.sub_calls == []


# ---------------------------------------------------------------------------
# Webhook: customer.subscription.*
# ---------------------------------------------------------------------------


def _sub_event(event_type: str, **obj: Any) -> Any:
    payload: dict[str, Any] = {
        "id": "sub_1",
        "object": "subscription",
        "status": "trialing",
        "customer": "cus_1",
        "cancel_at_period_end": False,
        "metadata": {"user_id": USER_ID, "plan": "monthly"},
        "items": {
            "object": "list",
            "data": [{"object": "subscription_item", "current_period_end": 1893456000}],
        },
    }
    payload.update(obj)
    return stripe.Event.construct_from(
        {"id": "evt_1", "object": "event", "type": event_type, "data": {"object": payload}},
        "sk_test_x",
    )


def _post_webhook(client: TestClient, event: Any, monkeypatch: pytest.MonkeyPatch) -> int:
    monkeypatch.setattr(stripe.Webhook, "construct_event", lambda *a, **k: event)
    resp = client.post("/api/v1/billing/webhook", content=b"{}", headers={"stripe-signature": "ok"})
    return resp.status_code


class TestSubscriptionWebhook:
    def test_created_event_records_subscription(self, monkeypatch: pytest.MonkeyPatch) -> None:
        client, subs, _ = _client()
        status = _post_webhook(client, _sub_event("customer.subscription.created"), monkeypatch)

        assert status == 200
        sub = subs.subs["sub_1"]
        assert sub.user_id == USER_ID
        assert sub.plan == "monthly"
        assert sub.status == BookSubscriptionStatus.TRIALING
        assert sub.stripe_customer_id == "cus_1"
        # Neue Stripe-API: Periodenende sitzt auf dem Subscription-Item
        assert sub.current_period_end == datetime.fromtimestamp(1893456000, UTC)

    def test_updated_event_changes_status(self, monkeypatch: pytest.MonkeyPatch) -> None:
        client, subs, _ = _client()
        _post_webhook(client, _sub_event("customer.subscription.created"), monkeypatch)
        _post_webhook(
            client,
            _sub_event("customer.subscription.updated", status="active"),
            monkeypatch,
        )
        assert subs.subs["sub_1"].status == BookSubscriptionStatus.ACTIVE

    def test_deleted_event_cancels(self, monkeypatch: pytest.MonkeyPatch) -> None:
        client, subs, _ = _client()
        _post_webhook(client, _sub_event("customer.subscription.created"), monkeypatch)
        _post_webhook(
            client,
            _sub_event("customer.subscription.deleted", status="canceled"),
            monkeypatch,
        )
        assert not subs.subs["sub_1"].is_active

    def test_unknown_stripe_status_is_not_active(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """incomplete/unpaid etc. dürfen niemals Zugang gewähren."""
        client, subs, _ = _client()
        _post_webhook(
            client,
            _sub_event("customer.subscription.created", status="incomplete"),
            monkeypatch,
        )
        assert not subs.subs["sub_1"].is_active

    def test_event_without_user_metadata_is_ignored(self, monkeypatch: pytest.MonkeyPatch) -> None:
        client, subs, _ = _client()
        status = _post_webhook(
            client, _sub_event("customer.subscription.created", metadata={}), monkeypatch
        )
        assert status == 200
        assert subs.subs == {}


# ---------------------------------------------------------------------------
# Status + Portal
# ---------------------------------------------------------------------------


class TestSubscriptionStatusAndPortal:
    def test_status_without_subscription(self) -> None:
        client, _, _ = _client()
        resp = client.get("/api/v1/billing/subscription/me")
        assert resp.status_code == 200
        assert resp.json() == {
            "status": "none",
            "plan": None,
            "current_period_end": None,
            "cancel_at_period_end": False,
            "is_active": False,
        }

    def test_status_with_active_subscription(self) -> None:
        subs = FakeSubscriptionRepo()
        subs.subs["sub_1"] = _active_sub()
        client, _, _ = _client(subs=subs)
        data = client.get("/api/v1/billing/subscription/me").json()
        assert data["status"] == "active"
        assert data["plan"] == "monthly"
        assert data["is_active"] is True

    def test_status_requires_auth(self) -> None:
        client, _, _ = _client(authenticated=False)
        assert client.get("/api/v1/billing/subscription/me").status_code == 401

    def test_portal_opens_for_subscriber_with_server_side_return_url(self) -> None:
        subs = FakeSubscriptionRepo()
        subs.subs["sub_1"] = _active_sub()
        client, _, billing = _client(subs=subs)

        resp = client.post("/api/v1/billing/portal")

        assert resp.status_code == 200
        assert resp.json()["url"] == "https://billing.stripe.com/portal-session"
        assert billing.portal_calls[0]["customer_id"] == "cus_1"
        assert billing.portal_calls[0]["return_url"].startswith(settings.app_url)

    def test_portal_without_subscription_returns_404(self) -> None:
        client, _, billing = _client()
        assert client.post("/api/v1/billing/portal").status_code == 404
        assert billing.portal_calls == []
