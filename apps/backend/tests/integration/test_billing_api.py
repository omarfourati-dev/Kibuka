"""Integration tests for the single-book Stripe checkout flow — TDD RED.

POST /billing/checkout/book creates a Stripe payment session for one book;
the signed webhook records the purchase so /read unlocks. Everything sits
behind ENABLE_BILLING.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.adapters.input.api.dependencies import get_current_user
from src.adapters.input.api.v1.billing import get_billing_adapter, get_billing_book_repository
from src.adapters.input.api.v1.billing import router as billing_router
from src.core.domain.entities.book import Book, BookTranslation
from src.core.domain.entities.purchase import BookPurchase
from src.core.domain.value_objects.language import AgeRange, BookTheme, Language
from src.infrastructure.config import settings

# ---------------------------------------------------------------------------
# Fakes
# ---------------------------------------------------------------------------


def _make_book(book_id: str = "book-1", price: float = 1.99) -> Book:
    return Book(
        id=book_id,
        theme=BookTheme.ANIMALS,
        age_range=AgeRange.YOUNG,
        page_count=3,
        price_single=price,
        published_at=datetime.now(UTC),
        translations=[
            BookTranslation(book_id=book_id, language=Language.DE, title="Der kleine Bär")
        ],
    )


class FakeBookRepo:
    def __init__(self) -> None:
        self.books: dict[str, Book] = {"book-1": _make_book()}
        self.purchases: list[BookPurchase] = []

    async def get_by_id(self, book_id: str) -> Book | None:
        return self.books.get(book_id)

    async def is_purchased_by_user(self, book_id: str, user_id: str) -> bool:
        return any(p.book_id == book_id and p.user_id == user_id for p in self.purchases)

    async def record_purchase(self, purchase: BookPurchase) -> None:
        self.purchases.append(purchase)


class FakeBillingAdapter:
    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []

    async def create_book_checkout(
        self,
        *,
        book_id: str,
        user_id: str,
        title: str,
        amount_cents: int,
        success_url: str,
        cancel_url: str,
    ) -> str:
        self.calls.append(
            {
                "book_id": book_id,
                "user_id": user_id,
                "title": title,
                "amount_cents": amount_cents,
                "success_url": success_url,
                "cancel_url": cancel_url,
            }
        )
        return "https://checkout.stripe.com/test-session"


def _make_client(
    repo: FakeBookRepo | None = None,
    billing: FakeBillingAdapter | None = None,
    authenticated: bool = True,
) -> tuple[TestClient, FakeBookRepo, FakeBillingAdapter]:
    repo = repo or FakeBookRepo()
    billing = billing or FakeBillingAdapter()
    app = FastAPI()
    app.include_router(billing_router, prefix="/api/v1")
    app.dependency_overrides[get_billing_book_repository] = lambda: repo
    app.dependency_overrides[get_billing_adapter] = lambda: billing
    if authenticated:
        app.dependency_overrides[get_current_user] = lambda: "user-1"
    return TestClient(app, raise_server_exceptions=True), repo, billing


# ---------------------------------------------------------------------------
# Checkout
# ---------------------------------------------------------------------------


class TestBookCheckout:
    def test_returns_404_when_billing_disabled(self) -> None:
        client, _, billing = _make_client()

        response = client.post("/api/v1/billing/checkout/book", json={"book_id": "book-1"})

        assert response.status_code == 404
        assert billing.calls == []

    def test_requires_authentication(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(settings, "enable_billing", True)
        client, _, billing = _make_client(authenticated=False)

        response = client.post("/api/v1/billing/checkout/book", json={"book_id": "book-1"})

        assert response.status_code == 401
        assert billing.calls == []

    def test_creates_stripe_session_for_book(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(settings, "enable_billing", True)
        client, _, billing = _make_client()

        response = client.post("/api/v1/billing/checkout/book", json={"book_id": "book-1"})

        assert response.status_code == 200
        assert response.json()["url"] == "https://checkout.stripe.com/test-session"
        call = billing.calls[0]
        assert call["book_id"] == "book-1"
        assert call["user_id"] == "user-1"
        assert call["amount_cents"] == 199
        assert call["title"] == "Der kleine Bär"
        # Redirect-Ziele werden serverseitig gebaut — nie vom Client übernommen
        assert call["success_url"].startswith(settings.app_url)
        assert call["cancel_url"].startswith(settings.app_url)

    def test_unknown_book_returns_404(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(settings, "enable_billing", True)
        client, _, billing = _make_client()

        response = client.post("/api/v1/billing/checkout/book", json={"book_id": "nope"})

        assert response.status_code == 404
        assert billing.calls == []

    def test_free_book_cannot_be_bought(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Ein Gratis-Buch (Tagesbuch) darf keine Stripe-Session erzeugen."""
        monkeypatch.setattr(settings, "enable_billing", True)
        repo = FakeBookRepo()
        repo.books["free-1"] = _make_book("free-1", price=0.0)
        client, _, billing = _make_client(repo=repo)

        response = client.post("/api/v1/billing/checkout/book", json={"book_id": "free-1"})

        assert response.status_code == 400
        assert billing.calls == []


# ---------------------------------------------------------------------------
# Webhook
# ---------------------------------------------------------------------------


def _event(
    event_type: str,
    metadata: dict[str, str],
    payment_intent: str = "pi_123",
    payment_status: str = "paid",
    amount_total: int = 199,
) -> dict:
    return {
        "type": event_type,
        "data": {
            "object": {
                "metadata": metadata,
                "payment_intent": payment_intent,
                "payment_status": payment_status,
                "amount_total": amount_total,
            }
        },
    }


@pytest.fixture(autouse=True)
def _billing_webhook_config(monkeypatch: pytest.MonkeyPatch):
    """Webhook tests run with billing enabled and a configured secret."""
    monkeypatch.setattr(settings, "stripe_webhook_secret", "whsec_test")
    yield


class TestStripeWebhook:
    def test_webhook_fails_closed_without_secret(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """No configured secret means signatures cannot be verified — 404."""
        monkeypatch.setattr(settings, "stripe_webhook_secret", "")
        client, repo, _ = _make_client()

        response = client.post(
            "/api/v1/billing/webhook", content=b"{}", headers={"stripe-signature": "x"}
        )

        assert response.status_code == 404
        assert repo.purchases == []

    def test_unpaid_session_grants_nothing(self, monkeypatch: pytest.MonkeyPatch) -> None:
        import stripe

        event = _event(
            "checkout.session.completed",
            {"book_id": "book-1", "user_id": "user-1"},
            payment_status="unpaid",
        )
        monkeypatch.setattr(stripe.Webhook, "construct_event", MagicMock(return_value=event))
        client, repo, _ = _make_client()

        response = client.post(
            "/api/v1/billing/webhook", content=b"{}", headers={"stripe-signature": "ok"}
        )

        assert response.status_code == 200
        assert repo.purchases == []

    def test_async_payment_succeeded_records_purchase(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        import stripe

        event = _event(
            "checkout.session.async_payment_succeeded",
            {"book_id": "book-1", "user_id": "user-1"},
        )
        monkeypatch.setattr(stripe.Webhook, "construct_event", MagicMock(return_value=event))
        client, repo, _ = _make_client()

        response = client.post(
            "/api/v1/billing/webhook", content=b"{}", headers={"stripe-signature": "ok"}
        )

        assert response.status_code == 200
        assert len(repo.purchases) == 1

    def test_amount_comes_from_session_total(self, monkeypatch: pytest.MonkeyPatch) -> None:
        import stripe

        event = _event(
            "checkout.session.completed",
            {"book_id": "book-1", "user_id": "user-1", "amount_cents": "1"},
            amount_total=249,
        )
        monkeypatch.setattr(stripe.Webhook, "construct_event", MagicMock(return_value=event))
        client, repo, _ = _make_client()

        client.post("/api/v1/billing/webhook", content=b"{}", headers={"stripe-signature": "ok"})

        assert repo.purchases[0].amount == pytest.approx(2.49)

    def test_invalid_signature_returns_400(self, monkeypatch: pytest.MonkeyPatch) -> None:
        import stripe

        def _raise(*args: Any, **kwargs: Any) -> None:
            raise stripe.SignatureVerificationError("bad sig", "sig-header")

        monkeypatch.setattr(stripe.Webhook, "construct_event", _raise)
        client, repo, _ = _make_client()

        response = client.post(
            "/api/v1/billing/webhook", content=b"{}", headers={"stripe-signature": "bad"}
        )

        assert response.status_code == 400
        assert repo.purchases == []

    def test_completed_checkout_records_purchase(self, monkeypatch: pytest.MonkeyPatch) -> None:
        import stripe

        event = _event(
            "checkout.session.completed",
            {"book_id": "book-1", "user_id": "user-1", "amount_cents": "199"},
        )
        monkeypatch.setattr(stripe.Webhook, "construct_event", MagicMock(return_value=event))
        client, repo, _ = _make_client()

        response = client.post(
            "/api/v1/billing/webhook", content=b"{}", headers={"stripe-signature": "ok"}
        )

        assert response.status_code == 200
        assert len(repo.purchases) == 1
        purchase = repo.purchases[0]
        assert purchase.book_id == "book-1"
        assert purchase.user_id == "user-1"
        assert purchase.amount == pytest.approx(1.99)
        assert purchase.stripe_payment_intent_id == "pi_123"

    def test_completed_checkout_is_idempotent(self, monkeypatch: pytest.MonkeyPatch) -> None:
        import stripe

        event = _event(
            "checkout.session.completed",
            {"book_id": "book-1", "user_id": "user-1", "amount_cents": "199"},
        )
        monkeypatch.setattr(stripe.Webhook, "construct_event", MagicMock(return_value=event))
        client, repo, _ = _make_client()

        client.post("/api/v1/billing/webhook", content=b"{}", headers={"stripe-signature": "ok"})
        client.post("/api/v1/billing/webhook", content=b"{}", headers={"stripe-signature": "ok"})

        assert len(repo.purchases) == 1

    def test_other_events_are_acknowledged_without_side_effects(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        import stripe

        event = _event("invoice.paid", {})
        monkeypatch.setattr(stripe.Webhook, "construct_event", MagicMock(return_value=event))
        client, repo, _ = _make_client()

        response = client.post(
            "/api/v1/billing/webhook", content=b"{}", headers={"stripe-signature": "ok"}
        )

        assert response.status_code == 200
        assert repo.purchases == []
