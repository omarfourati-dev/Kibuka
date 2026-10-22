from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime

from ...domain.entities.cancellation import (
    CancellationKind,
    CancellationOutcome,
    CancellationRequest,
    ContractCancellation,
)
from ...ports.output.i_book_subscription_repository import IBookSubscriptionRepository
from ...ports.output.i_contract_cancellation_repository import IContractCancellationRepository
from ...ports.output.i_email_service import IEmailService
from ...ports.output.i_subscription_canceller import ISubscriptionCanceller
from ...ports.output.i_user_repository import IUserRepository

logger = logging.getLogger(__name__)

CONFIRMATION_TEMPLATE = "contract_cancellation"
CONFIRMATION_SUBJECT = "Kibuka: Eingangsbestätigung deiner Kündigung"


class SubmitCancellation:
    """Kündigungsbutton (§ 312k BGB): Erklärung speichern, ordentliche
    Kündigung bei Stripe zum Laufzeitende vormerken, Eingang per E-Mail
    bestätigen. Eine zugegangene Kündigung geht nie verloren — Fehler bei
    Stripe oder beim Mailversand werden protokolliert, nicht geworfen."""

    def __init__(
        self,
        cancellations: IContractCancellationRepository,
        users: IUserRepository,
        subscriptions: IBookSubscriptionRepository,
        canceller: ISubscriptionCanceller,
        email: IEmailService,
    ) -> None:
        self._cancellations = cancellations
        self._users = users
        self._subscriptions = subscriptions
        self._canceller = canceller
        self._email = email

    async def execute(self, request: CancellationRequest) -> ContractCancellation:
        received_at = datetime.now(UTC)
        email = request.email.strip().lower()
        cancellation = ContractCancellation(
            id=str(uuid.uuid4()),
            name=request.name,
            email=email,
            kind=request.kind,
            reason=request.reason,
            contract_reference=request.contract_reference,
            received_at=received_at,
            outcome=CancellationOutcome.NO_ACTIVE_CONTRACT,
        )

        user = await self._users.get_by_email(email)
        sub = await self._subscriptions.get_current_for_user(user.id) if user else None
        if user and sub and sub.is_active and sub.stripe_subscription_id:
            cancellation.user_id = user.id
            cancellation.stripe_subscription_id = sub.stripe_subscription_id
            if request.kind == CancellationKind.EXTRAORDINARY:
                cancellation.outcome = CancellationOutcome.MANUAL_REVIEW
            else:
                try:
                    effective = await self._canceller.cancel_at_period_end(
                        sub.stripe_subscription_id
                    )
                    cancellation.outcome = CancellationOutcome.SCHEDULED
                    cancellation.effective_at = effective or sub.current_period_end
                except Exception:
                    logger.exception("Cancellation %s: Stripe update failed", cancellation.id)
                    cancellation.outcome = CancellationOutcome.FAILED

        await self._cancellations.add(cancellation)
        logger.info("Cancellation %s received: %s", cancellation.id, cancellation.outcome)
        await self._confirm(cancellation)
        return cancellation

    async def _confirm(self, cancellation: ContractCancellation) -> None:
        try:
            await self._email.send(
                to=cancellation.email,
                subject=CONFIRMATION_SUBJECT,
                template=CONFIRMATION_TEMPLATE,
                context={
                    "reference": cancellation.id,
                    "received_at": cancellation.received_at,
                    "name": cancellation.name,
                    "kind": cancellation.kind.value,
                    "reason": cancellation.reason,
                    "contract_reference": cancellation.contract_reference,
                    "effective_at": cancellation.effective_at,
                },
            )
        except Exception:
            # Keine Adresse im Log (personenbezogen) — die Vorgangsnummer reicht
            logger.exception("Cancellation %s: confirmation e-mail failed", cancellation.id)
