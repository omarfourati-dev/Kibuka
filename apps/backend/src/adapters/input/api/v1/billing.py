from __future__ import annotations

import logging
import uuid
from functools import cache
from typing import Annotated, Any

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.adapters.input.api.dependencies import get_current_user
from src.adapters.output.billing.stripe_billing import StripeBillingAdapter
from src.adapters.output.persistence.repositories.book_repository import SqlBookRepository
from src.core.domain.entities.purchase import BookPurchase, PurchaseType
from src.core.ports.output.i_book_repository import IBookRepository
from src.infrastructure.config import settings
from src.infrastructure.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["billing"])


@cache
def get_billing_adapter() -> StripeBillingAdapter:
    """Shared Stripe adapter; tests override this dependency."""
    return StripeBillingAdapter(
        api_key=settings.stripe_secret_key,
        webhook_secret=settings.stripe_webhook_secret,
    )


async def get_billing_book_repository(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> IBookRepository:
    """Real SQL wiring; tests replace this via dependency override."""
    return SqlBookRepository(session=session)


def _require_billing_enabled() -> None:
    if not settings.enable_billing:
        raise HTTPException(status_code=404, detail="Feature not available")


class BookCheckoutRequest(BaseModel):
    book_id: str


@router.post("/checkout/book")
async def create_book_checkout(
    body: BookCheckoutRequest,
    user_id: Annotated[str, Depends(get_current_user)],
    repo: Annotated[IBookRepository, Depends(get_billing_book_repository)],
    billing: Annotated[StripeBillingAdapter, Depends(get_billing_adapter)],
) -> Any:
    """Create a Stripe payment session for a single book."""
    _require_billing_enabled()

    book = await repo.get_by_id(body.book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")

    title = next(
        (t.title for t in book.translations if t.language.value == "de"),
        body.book_id,
    )
    amount_cents = round(book.price_single * 100)
    if amount_cents <= 0:
        # Gratis-Bücher (z.B. Tagesbuch) haben keinen Checkout
        raise HTTPException(status_code=400, detail="Book is free")

    # Redirect-Ziele werden bewusst serverseitig gebaut (kein Open Redirect)
    url = await billing.create_book_checkout(
        book_id=book.id,
        user_id=user_id,
        title=title,
        amount_cents=amount_cents,
        success_url=f"{settings.app_url}/books/{book.id}?checkout=success",
        cancel_url=f"{settings.app_url}/books/{book.id}?checkout=cancel",
    )
    return {"url": url}


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    repo: Annotated[IBookRepository, Depends(get_billing_book_repository)],
    stripe_signature: Annotated[str | None, Header(alias="stripe-signature")] = None,
) -> Any:
    """Stripe webhook — signature-verified; records completed book purchases."""
    # Fail closed: ohne konfiguriertes Secret ist keine Verifikation möglich
    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=404, detail="Feature not available")

    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature or "", settings.stripe_webhook_secret
        )
    except (stripe.SignatureVerificationError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature"
        ) from exc

    if event["type"] in (
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
    ):
        session_obj = event["data"]["object"]
        # Zugriff nur bei bestätigter Zahlung — "completed" kann unpaid sein
        # (verzögerte Zahlarten), dann folgt später async_payment_succeeded
        if session_obj.get("payment_status") != "paid":
            logger.info("Checkout session not paid yet — no grant")
            return {"received": True}
        metadata = session_obj.get("metadata") or {}
        book_id = metadata.get("book_id")
        user_id = metadata.get("user_id")
        if book_id and user_id:
            # Idempotent: Stripe liefert Events mehrfach aus
            if not await repo.is_purchased_by_user(book_id, user_id):
                # Betrag aus der Session selbst, nicht aus Metadaten
                amount_cents = int(session_obj.get("amount_total") or 0)
                await repo.record_purchase(
                    BookPurchase(
                        id=str(uuid.uuid4()),
                        user_id=user_id,
                        book_id=book_id,
                        purchase_type=PurchaseType.SINGLE,
                        amount=amount_cents / 100,
                        stripe_payment_intent_id=str(session_obj.get("payment_intent") or ""),
                    )
                )
                logger.info("Recorded purchase of book %s for user %s", book_id, user_id)
        else:
            logger.warning("Paid checkout session without book/user metadata")

    return {"received": True}


@router.post("/portal")
async def create_portal(
    return_url: str,
    user_id: Annotated[str, Depends(get_current_user)],
) -> Any:
    _require_billing_enabled()
    raise HTTPException(status_code=501, detail="Customer portal not wired yet")


@router.get("/subscription/{space_id}")
async def get_subscription(
    space_id: str,
    user_id: Annotated[str, Depends(get_current_user)],
) -> Any:
    # Platzhalter bis Abos real sind — aber nie anonym einen Plan vorgaukeln
    return {"status": "none", "plan": "free"}
