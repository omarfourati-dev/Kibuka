from __future__ import annotations

from typing import Any

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

    async def create_checkout_session(
        self,
        customer_email: str,
        price_id: str,
        success_url: str,
        cancel_url: str,
        metadata: dict[str, str] | None = None,
    ) -> str:
        # Keine payment_method_types mehr — Stripe wählt die Methoden über die
        # Dashboard-Konfiguration (neue SDK-Signatur kennt den Parameter nicht).
        session = await stripe.checkout.Session.create_async(
            customer_email=customer_email,
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata or {},
        )
        return session.url or ""

    async def create_customer_portal_session(self, customer_id: str, return_url: str) -> str:
        session = await stripe.billing_portal.Session.create_async(
            customer=customer_id,
            return_url=return_url,
        )
        return session.url
