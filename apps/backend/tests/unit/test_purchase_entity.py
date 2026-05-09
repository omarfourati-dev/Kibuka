"""Unit tests for BookPurchase and BookSubscription entities."""

from __future__ import annotations

from src.core.domain.entities.purchase import (
    BookPurchase,
    BookSubscription,
    BookSubscriptionStatus,
    PurchaseType,
)


class TestBookPurchase:
    def test_purchase_defaults_to_eur(self):
        p = BookPurchase(
            id="p1", user_id="u1", book_id="b1", purchase_type=PurchaseType.SINGLE, amount=1.99
        )
        assert p.currency == "EUR"


class TestBookSubscription:
    def test_active_subscription_is_active(self):
        sub = BookSubscription(
            id="s1", user_id="u1", plan="monthly", status=BookSubscriptionStatus.ACTIVE
        )
        assert sub.is_active is True

    def test_trialing_subscription_is_active(self):
        sub = BookSubscription(
            id="s1", user_id="u1", plan="monthly", status=BookSubscriptionStatus.TRIALING
        )
        assert sub.is_active is True

    def test_canceled_subscription_is_not_active(self):
        sub = BookSubscription(
            id="s1", user_id="u1", plan="monthly", status=BookSubscriptionStatus.CANCELED
        )
        assert sub.is_active is False

    def test_past_due_subscription_is_not_active(self):
        sub = BookSubscription(
            id="s1", user_id="u1", plan="monthly", status=BookSubscriptionStatus.PAST_DUE
        )
        assert sub.is_active is False
