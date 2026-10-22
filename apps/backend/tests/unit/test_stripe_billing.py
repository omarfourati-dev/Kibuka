"""TDD RED: Stripe Managed Payments (Default bei neuen Konten) verlangt
einen Produkt-Steuercode — ohne tax_code schlug der Live-Checkout mit
InvalidRequestError fehl ("the product tax code is missing").

Kibuka verkauft digitale Bücher → txcd_10302000 (Digital Books).
"""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock

import pytest
import stripe

from src.adapters.output.billing.stripe_billing import StripeBillingAdapter


@pytest.mark.asyncio
async def test_book_checkout_sets_digital_books_tax_code(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = AsyncMock()
    session.url = "https://checkout.stripe.com/test"
    create_async = AsyncMock(return_value=session)
    monkeypatch.setattr(stripe.checkout.Session, "create_async", create_async)

    adapter = StripeBillingAdapter(api_key="sk_test_x", webhook_secret="whsec_x")
    url = await adapter.create_book_checkout(
        book_id="b1",
        user_id="u1",
        title="Der kleine Bär",
        amount_cents=299,
        success_url="https://kibuka.example/ok",
        cancel_url="https://kibuka.example/cancel",
    )

    assert url == "https://checkout.stripe.com/test"
    kwargs: dict[str, Any] = create_async.call_args.kwargs
    product_data = kwargs["line_items"][0]["price_data"]["product_data"]
    assert product_data["name"] == "Der kleine Bär"
    assert product_data["tax_code"] == "txcd_10302000"


@pytest.mark.asyncio
async def test_book_checkout_price_includes_vat(monkeypatch: pytest.MonkeyPatch) -> None:
    """B2C-Endpreise inkl. MwSt (PAngV) — €2,99 heißt €2,99 an der Kasse."""
    session = AsyncMock()
    session.url = "https://checkout.stripe.com/test"
    create_async = AsyncMock(return_value=session)
    monkeypatch.setattr(stripe.checkout.Session, "create_async", create_async)

    adapter = StripeBillingAdapter(api_key="sk_test_x", webhook_secret="whsec_x")
    await adapter.create_book_checkout(
        book_id="b1",
        user_id="u1",
        title="T",
        amount_cents=299,
        success_url="https://k.example/ok",
        cancel_url="https://k.example/cancel",
    )

    price_data = create_async.call_args.kwargs["line_items"][0]["price_data"]
    assert price_data["tax_behavior"] == "inclusive"


@pytest.mark.asyncio
async def test_subscription_checkout_builds_recurring_trial_session(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = AsyncMock()
    session.url = "https://checkout.stripe.com/sub"
    create_async = AsyncMock(return_value=session)
    monkeypatch.setattr(stripe.checkout.Session, "create_async", create_async)

    adapter = StripeBillingAdapter(api_key="sk_test_x", webhook_secret="whsec_x")
    url = await adapter.create_subscription_checkout(
        user_id="u1",
        plan="yearly",
        amount_cents=9900,
        interval="year",
        trial_days=14,
        customer_email="o@example.com",
        success_url="https://k.example/ok",
        cancel_url="https://k.example/cancel",
    )

    assert url == "https://checkout.stripe.com/sub"
    kwargs: dict[str, Any] = create_async.call_args.kwargs
    assert kwargs["mode"] == "subscription"
    assert kwargs["customer_email"] == "o@example.com"
    price_data = kwargs["line_items"][0]["price_data"]
    assert price_data["recurring"] == {"interval": "year"}
    assert price_data["unit_amount"] == 9900
    assert price_data["tax_behavior"] == "inclusive"
    assert price_data["product_data"]["tax_code"] == "txcd_10302000"
    sub_data = kwargs["subscription_data"]
    assert sub_data["trial_period_days"] == 14
    # Der Webhook (customer.subscription.*) braucht user_id + plan
    assert sub_data["metadata"] == {"user_id": "u1", "plan": "yearly"}
