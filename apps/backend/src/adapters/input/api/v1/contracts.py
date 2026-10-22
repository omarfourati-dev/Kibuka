"""Kündigungsbutton nach § 312k BGB — bewusst ohne Login erreichbar."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from sqlalchemy.ext.asyncio import AsyncSession

from src.adapters.input.api.dependencies import get_user_repository
from src.adapters.input.api.v1.billing import get_billing_adapter, get_subscription_repository
from src.adapters.output.billing.stripe_billing import StripeBillingAdapter
from src.adapters.output.email.logging_email_service import LoggingEmailService
from src.adapters.output.email.smtp_email_service import SmtpEmailService
from src.adapters.output.persistence.repositories.contract_cancellation_repository import (
    SqlContractCancellationRepository,
)
from src.core.domain.entities.cancellation import CancellationKind, CancellationRequest
from src.core.ports.output.i_book_subscription_repository import IBookSubscriptionRepository
from src.core.ports.output.i_email_service import IEmailService
from src.core.ports.output.i_user_repository import IUserRepository
from src.core.use_cases.billing.submit_cancellation import SubmitCancellation
from src.infrastructure.config import settings
from src.infrastructure.database import get_db
from src.infrastructure.redis import get_redis_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contracts", tags=["contracts"])

# Großzügig: legitime Kündigungen dürfen nie am Limit scheitern, Massen-
# Einreichungen (Mail-Spam an fremde Adressen) aber schon
CANCELLATIONS_PER_IP_PER_HOUR = 10


def get_email_service() -> IEmailService:
    if not settings.smtp_user:
        return LoggingEmailService()
    return SmtpEmailService(
        host=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user,
        password=settings.smtp_password,
        from_email=settings.email_from,
    )


async def get_submit_cancellation(
    session: Annotated[AsyncSession, Depends(get_db)],
    users: Annotated[IUserRepository, Depends(get_user_repository)],
    subs: Annotated[IBookSubscriptionRepository, Depends(get_subscription_repository)],
    billing: Annotated[StripeBillingAdapter, Depends(get_billing_adapter)],
    email: Annotated[IEmailService, Depends(get_email_service)],
) -> SubmitCancellation:
    return SubmitCancellation(
        cancellations=SqlContractCancellationRepository(session),
        users=users,
        subscriptions=subs,
        canceller=billing,
        email=email,
    )


async def cancellation_rate_limit(request: Request) -> None:
    """Fester Stundenzähler pro Client-IP in Redis (über alle Worker hinweg).
    X-Real-IP setzt nginx und überschreibt dabei jeden Wert vom Client."""
    ip = request.headers.get("x-real-ip") or (request.client.host if request.client else "?")
    key = f"ratelimit:contract-cancellation:{ip}"
    try:
        redis = get_redis_client()
        count = int(await redis.incr(key))
        if count == 1:
            await redis.expire(key, 3600)
    except Exception:
        # Fail open: eine Kündigung darf nicht an Redis scheitern
        logger.warning("Rate limit store unavailable — cancellation not throttled")
        return
    if count > CANCELLATIONS_PER_IP_PER_HOUR:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests",
            headers={"Retry-After": "3600"},
        )


def _blank_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


class CancellationBody(BaseModel):
    name: str = Field(max_length=200)
    email: EmailStr
    kind: Literal["ordinary", "extraordinary"]
    reason: str | None = Field(default=None, max_length=2000)
    contract_reference: str | None = Field(default=None, max_length=120)

    @field_validator("name")
    @classmethod
    def _name_not_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("name must not be blank")
        return stripped

    @field_validator("reason", "contract_reference")
    @classmethod
    def _strip_optional(cls, value: str | None) -> str | None:
        return _blank_to_none(value)

    @model_validator(mode="after")
    def _extraordinary_needs_reason(self) -> CancellationBody:
        if self.kind == "extraordinary" and not self.reason:
            raise ValueError("an extraordinary cancellation needs a reason")
        return self


class CancellationReceipt(BaseModel):
    """Bestätigung auf dem Bildschirm — verrät nie, ob ein Abo existiert."""

    reference: str
    received_at: datetime
    name: str
    email: str
    kind: str
    reason: str | None
    contract_reference: str | None


@router.post(
    "/cancellation",
    status_code=status.HTTP_201_CREATED,
    response_model=CancellationReceipt,
    dependencies=[Depends(cancellation_rate_limit)],
)
async def submit_cancellation(
    body: CancellationBody,
    use_case: Annotated[SubmitCancellation, Depends(get_submit_cancellation)],
) -> CancellationReceipt:
    result = await use_case.execute(
        CancellationRequest(
            name=body.name,
            email=str(body.email),
            kind=CancellationKind(body.kind),
            reason=body.reason,
            contract_reference=body.contract_reference,
        )
    )
    return CancellationReceipt(
        reference=result.id,
        received_at=result.received_at,
        name=result.name,
        email=result.email,
        kind=result.kind.value,
        reason=result.reason,
        contract_reference=result.contract_reference,
    )
