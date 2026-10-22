from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum


class PurchaseType(StrEnum):
    SINGLE = "single"
    WEEK_BUNDLE = "week_bundle"
    MONTHLY = "monthly"
    YEARLY = "yearly"


class BookSubscriptionStatus(StrEnum):
    TRIALING = "trialing"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    # Weitere Stripe-Zustände — keiner davon gewährt Zugang
    INCOMPLETE = "incomplete"
    INCOMPLETE_EXPIRED = "incomplete_expired"
    UNPAID = "unpaid"
    PAUSED = "paused"


@dataclass
class BookPurchase:
    id: str
    user_id: str
    book_id: str
    purchase_type: PurchaseType
    amount: float
    currency: str = "EUR"
    stripe_payment_intent_id: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))


@dataclass
class BookSubscription:
    id: str
    user_id: str
    plan: str  # "monthly" | "yearly"
    status: BookSubscriptionStatus
    stripe_subscription_id: str | None = None
    stripe_customer_id: str | None = None
    current_period_end: datetime | None = None
    cancel_at_period_end: bool = False
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    @property
    def is_active(self) -> bool:
        if self.status not in (BookSubscriptionStatus.TRIALING, BookSubscriptionStatus.ACTIVE):
            return False
        if self.current_period_end is None:
            return True
        end = self.current_period_end
        if end.tzinfo is None:  # SQLite liefert naive Werte (UTC)
            end = end.replace(tzinfo=UTC)
        # Abgelaufene Periode gewährt nie Zugang — auch bei verpasstem Webhook
        return end > datetime.now(UTC)
