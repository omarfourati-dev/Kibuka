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
    current_period_end: datetime | None = None
    cancel_at_period_end: bool = False
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    @property
    def is_active(self) -> bool:
        return self.status in (BookSubscriptionStatus.TRIALING, BookSubscriptionStatus.ACTIVE)
