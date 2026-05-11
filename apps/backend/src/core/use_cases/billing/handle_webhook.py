from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from ...domain.entities.subscription import SubscriptionStatus
from ...ports.output.i_subscription_repository import ISubscriptionRepository


@dataclass
class StripeWebhookEvent:
    event_type: str
    data: dict[str, Any]


class HandleStripeWebhookUseCase:
    """Idempotent Stripe webhook handler. Called from ARQ background job."""

    def __init__(self, subscription_repo: ISubscriptionRepository) -> None:
        self._subscription_repo = subscription_repo

    async def execute(self, event: StripeWebhookEvent) -> None:
        match event.event_type:
            case "customer.subscription.created" | "customer.subscription.updated":
                await self._upsert_subscription(event.data)
            case "customer.subscription.deleted":
                await self._cancel_subscription(event.data)
            case _:
                pass

    async def _upsert_subscription(self, data: dict[str, Any]) -> None:
        stripe_sub = data.get("object", {})
        stripe_sub_id = stripe_sub.get("id", "")
        existing = await self._subscription_repo.get_by_stripe_id(stripe_sub_id)

        status_map = {
            "trialing": SubscriptionStatus.TRIALING,
            "active": SubscriptionStatus.ACTIVE,
            "past_due": SubscriptionStatus.PAST_DUE,
            "canceled": SubscriptionStatus.CANCELED,
            "unpaid": SubscriptionStatus.UNPAID,
        }
        status = status_map.get(stripe_sub.get("status", ""), SubscriptionStatus.ACTIVE)

        if existing:
            existing.status = status
            await self._subscription_repo.save(existing)

    async def _cancel_subscription(self, data: dict[str, Any]) -> None:
        stripe_sub = data.get("object", {})
        existing = await self._subscription_repo.get_by_stripe_id(stripe_sub.get("id", ""))
        if existing:
            existing.status = SubscriptionStatus.CANCELED
            await self._subscription_repo.save(existing)
