from __future__ import annotations

from typing import Any, cast

import stripe


class StripeBillingAdapter:
    """Handles Stripe API calls. Used directly in billing API routes."""

    def __init__(self, api_key: str, webhook_secret: str) -> None:
        stripe.api_key = api_key
        self._webhook_secret = webhook_secret

    def construct_webhook_event(self, payload: bytes, sig_header: str) -> Any:
        return stripe.Webhook.construct_event(payload, sig_header, self._webhook_secret)

    async def create_checkout_session(
        self,
        customer_email: str,
        price_id: str,
        success_url: str,
        cancel_url: str,
        metadata: dict[str, str] | None = None,
    ) -> str:
        session = await stripe.checkout.Session.create_async(
            customer_email=customer_email,
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata or {},
        )
        return cast(str, session.url or "")

    async def create_customer_portal_session(self, customer_id: str, return_url: str) -> str:
        session = await stripe.billing_portal.Session.create_async(
            customer=customer_id,
            return_url=return_url,
        )
        return cast(str, session.url)
