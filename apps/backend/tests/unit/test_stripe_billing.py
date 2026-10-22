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
