from __future__ import annotations

from typing import Any, cast

import stripe

# Stripe-Produktsteuercode "Digital Books" — Pflicht, weil Managed Payments
# (Default bei neuen Stripe-Konten) ohne tax_code jede Session ablehnt
_TAX_CODE_DIGITAL_BOOKS = "txcd_10302000"


class StripeBillingAdapter:
    """Handles Stripe API calls. Used directly in billing API routes."""

    def __init__(self, api_key: str, webhook_secret: str) -> None:
        stripe.api_key = api_key
        self._webhook_secret = webhook_secret

    def construct_webhook_event(self, payload: bytes, sig_header: str) -> Any:
        return stripe.Webhook.construct_event(payload, sig_header, self._webhook_secret)

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
        """One-time payment session for a single book; metadata drives the webhook."""
        session = await stripe.checkout.Session.create_async(
            mode="payment",
            line_items=[
                {
                    "quantity": 1,
                    "price_data": {
                        "currency": "eur",
                        "unit_amount": amount_cents,
                        # B2C-Endpreis inkl. MwSt (PAngV)
                        "tax_behavior": "inclusive",
                        "product_data": {
                            "name": title,
                            "tax_code": _TAX_CODE_DIGITAL_BOOKS,
                        },
                    },
                }
            ],
            metadata={
                "book_id": book_id,
                "user_id": user_id,
                "amount_cents": str(amount_cents),
            },
            success_url=success_url,
            cancel_url=cancel_url,
        )
        return session.url or ""

    async def create_subscription_checkout(
        self,
        *,
        user_id: str,
        plan: str,
        amount_cents: int,
        interval: str,
        trial_days: int,
        customer_email: str,
        success_url: str,
        cancel_url: str,
        customer_id: str | None = None,
    ) -> str:
        """Abo-Checkout; Status kommt später über customer.subscription.*-Webhooks.

        Wiederkehrende Kunden laufen über ihre bestehende Stripe-Kunden-ID
        (customer) statt eines neuen Kunden per E-Mail.
        """
        customer_args: dict[str, Any] = (
            {"customer": customer_id} if customer_id else {"customer_email": customer_email}
        )
        subscription_data: dict[str, Any] = {"metadata": {"user_id": user_id, "plan": plan}}
        if trial_days > 0:
            subscription_data["trial_period_days"] = trial_days
        session = await stripe.checkout.Session.create_async(
            mode="subscription",
            **customer_args,
            line_items=[
                {
                    "quantity": 1,
                    "price_data": {
                        "currency": "eur",
                        "unit_amount": amount_cents,
                        "recurring": {"interval": interval},
                        "tax_behavior": "inclusive",
                        "product_data": {
                            "name": f"Kibuka Abo ({'Jährlich' if plan == 'yearly' else 'Monatlich'})",
                            "tax_code": _TAX_CODE_DIGITAL_BOOKS,
                        },
                    },
                }
            ],
            # TypedDict der SDK wird dynamisch befüllt (Testphase optional)
            subscription_data=cast(Any, subscription_data),
            success_url=success_url,
            cancel_url=cancel_url,
        )
        return session.url or ""

    async def retrieve_subscription(self, subscription_id: str) -> dict[str, Any] | None:
        """Maßgeblicher Abo-Stand direkt von Stripe (nicht aus dem Event)."""
        try:
            sub = await stripe.Subscription.retrieve_async(subscription_id)
        except stripe.InvalidRequestError:
            return None
        result: dict[str, Any] = sub.to_dict()
        return result

    async def create_customer_portal_session(self, customer_id: str, return_url: str) -> str:
        session = await stripe.billing_portal.Session.create_async(
            customer=customer_id,
            return_url=return_url,
        )
        return session.url
