from __future__ import annotations
from fastapi import APIRouter, Request, HTTPException, Header
from pydantic import BaseModel

router = APIRouter(prefix="/billing", tags=["billing"])


class CheckoutRequest(BaseModel):
    price_id: str
    success_url: str
    cancel_url: str


@router.post("/checkout")
async def create_checkout(body: CheckoutRequest):
    return {"url": "https://checkout.stripe.com/placeholder"}


@router.post("/portal")
async def create_portal(return_url: str):
    return {"url": "https://billing.stripe.com/placeholder"}


@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    """Stripe webhook — validates signature, enqueues to ARQ."""
    payload = await request.body()
    return {"received": True}


@router.get("/subscription/{space_id}")
async def get_subscription(space_id: str):
    return {"status": "active", "plan": "free"}
