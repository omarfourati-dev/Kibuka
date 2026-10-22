from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime
from functools import cache
from typing import Annotated, Any, Literal

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.adapters.input.api.dependencies import get_current_user, get_user_repository
from src.adapters.output.billing.stripe_billing import StripeBillingAdapter
from src.adapters.output.persistence.repositories.book_repository import SqlBookRepository
from src.adapters.output.persistence.repositories.book_subscription_repository import (
    SqlBookSubscriptionRepository,
)
from src.core.domain.entities.purchase import (
    BookPurchase,
    BookSubscription,
    BookSubscriptionStatus,
    PurchaseType,
)
from src.core.ports.output.i_book_repository import IBookRepository
from src.core.ports.output.i_book_subscription_repository import IBookSubscriptionRepository
from src.core.ports.output.i_user_repository import IUserRepository
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


async def get_subscription_repository(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> IBookSubscriptionRepository:
    """Real SQL wiring; tests replace this via dependency override."""
    return SqlBookSubscriptionRepository(session=session)


def _require_billing_enabled() -> None:
    if not settings.enable_billing:
        raise HTTPException(status_code=404, detail="Feature not available")


class BookCheckoutRequest(BaseModel):
    book_id: str


class SubscriptionCheckoutRequest(BaseModel):
    plan: Literal["monthly", "yearly"]


class SubscriptionStatusResponse(BaseModel):
    status: str
    plan: str | None = None
    current_period_end: datetime | None = None
    cancel_at_period_end: bool = False
    is_active: bool = False


_SUBSCRIPTION_EVENTS = (
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
)


def _plan_terms(plan: str) -> tuple[int, str]:
    """(Betrag in Cent, Stripe-Intervall) — Preise sind Endpreise inkl. MwSt."""
    if plan == "yearly":
        return round(settings.subscription_price_yearly_eur * 100), "year"
    return round(settings.subscription_price_monthly_eur * 100), "month"


def _stripe_status(raw: str) -> BookSubscriptionStatus:
    try:
        return BookSubscriptionStatus(raw)
    except ValueError:
        # Unbekannter Zustand gewährt niemals Zugang
        return BookSubscriptionStatus.INCOMPLETE


def _period_end(sub: dict[str, Any]) -> datetime | None:
    # Neuere Stripe-API-Versionen führen das Periodenende am Subscription-Item
    ts = sub.get("current_period_end")
    if ts is None:
        items = (sub.get("items") or {}).get("data") or []
        ts = items[0].get("current_period_end") if items else None
    return datetime.fromtimestamp(int(ts), UTC) if ts else None


async def _apply_subscription_event(
    sub: dict[str, Any], event_type: str, subs: IBookSubscriptionRepository
) -> None:
    metadata = sub.get("metadata") or {}
    user_id = metadata.get("user_id")
    stripe_id = sub.get("id")
    if not user_id or not stripe_id:
        logger.warning("Subscription event without user metadata — ignored")
        return
    status_value = (
        BookSubscriptionStatus.CANCELED
        if event_type == "customer.subscription.deleted"
        else _stripe_status(str(sub.get("status") or ""))
    )
    await subs.upsert_by_stripe_id(
        BookSubscription(
            id=str(uuid.uuid4()),
            user_id=user_id,
            plan=metadata.get("plan") or "monthly",
            status=status_value,
            stripe_subscription_id=str(stripe_id),
            stripe_customer_id=str(sub.get("customer") or "") or None,
            current_period_end=_period_end(sub),
            cancel_at_period_end=bool(sub.get("cancel_at_period_end")),
        )
    )
    logger.info("Subscription %s for user %s is now %s", stripe_id, user_id, status_value)


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
    subs: Annotated[IBookSubscriptionRepository, Depends(get_subscription_repository)],
    stripe_signature: Annotated[str | None, Header(alias="stripe-signature")] = None,
) -> Any:
    """Stripe webhook — signature-verified; records book purchases and
    keeps subscription state in sync."""
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
        raw = event["data"]["object"]
        # Echte Events liefern ein StripeObject, KEIN dict — .get() darauf
        # wirft AttributeError ("'get' is a dict method"). Live-Bug 22.10.
        session_obj: dict[str, Any] = raw.to_dict() if hasattr(raw, "to_dict") else dict(raw)
        # Zugriff nur bei bestätigter Zahlung — "completed" kann unpaid sein
        # (verzögerte Zahlarten), dann folgt später async_payment_succeeded
        if session_obj.get("mode") == "subscription":
            # Abo-Zustand kommt über customer.subscription.* — hier nichts tun
            return {"received": True}
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

    elif event["type"] in _SUBSCRIPTION_EVENTS:
        raw_sub = event["data"]["object"]
        sub_obj: dict[str, Any] = (
            raw_sub.to_dict() if hasattr(raw_sub, "to_dict") else dict(raw_sub)
        )
        await _apply_subscription_event(sub_obj, str(event["type"]), subs)

    return {"received": True}


@router.post("/checkout/subscription")
async def create_subscription_checkout(
    body: SubscriptionCheckoutRequest,
    user_id: Annotated[str, Depends(get_current_user)],
    subs: Annotated[IBookSubscriptionRepository, Depends(get_subscription_repository)],
    users: Annotated[IUserRepository, Depends(get_user_repository)],
    billing: Annotated[StripeBillingAdapter, Depends(get_billing_adapter)],
) -> Any:
    """Stripe-Checkout für Monats-/Jahresabo mit Testphase."""
    _require_billing_enabled()

    current = await subs.get_current_for_user(user_id)
    if current is not None and current.is_active:
        raise HTTPException(status_code=409, detail="Subscription already active")

    user = await users.get_by_id(user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Authentication required")

    amount_cents, interval = _plan_terms(body.plan)
    url = await billing.create_subscription_checkout(
        user_id=user_id,
        plan=body.plan,
        amount_cents=amount_cents,
        interval=interval,
        trial_days=settings.subscription_trial_days,
        customer_email=user.email,
        success_url=f"{settings.app_url}/profile?subscription=success",
        cancel_url=f"{settings.app_url}/pricing?subscription=cancel",
    )
    return {"url": url}


@router.get("/subscription/me", response_model=SubscriptionStatusResponse)
async def get_my_subscription(
    user_id: Annotated[str, Depends(get_current_user)],
    subs: Annotated[IBookSubscriptionRepository, Depends(get_subscription_repository)],
) -> SubscriptionStatusResponse:
    sub = await subs.get_current_for_user(user_id)
    if sub is None:
        return SubscriptionStatusResponse(status="none")
    return SubscriptionStatusResponse(
        status=sub.status.value,
        plan=sub.plan,
        current_period_end=sub.current_period_end,
        cancel_at_period_end=sub.cancel_at_period_end,
        is_active=sub.is_active,
    )


@router.post("/portal")
async def create_portal(
    user_id: Annotated[str, Depends(get_current_user)],
    subs: Annotated[IBookSubscriptionRepository, Depends(get_subscription_repository)],
    billing: Annotated[StripeBillingAdapter, Depends(get_billing_adapter)],
) -> Any:
    """Stripe-Kundenportal (Kündigen, Zahlungsmittel) — Rücksprung serverseitig."""
    _require_billing_enabled()
    sub = await subs.get_current_for_user(user_id)
    if sub is None or not sub.stripe_customer_id:
        raise HTTPException(status_code=404, detail="No subscription")
    url = await billing.create_customer_portal_session(
        sub.stripe_customer_id, f"{settings.app_url}/profile"
    )
    return {"url": url}
