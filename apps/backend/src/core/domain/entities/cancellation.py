from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum


class CancellationKind(StrEnum):
    ORDINARY = "ordinary"  # zum nächstmöglichen Zeitpunkt (Laufzeitende)
    EXTRAORDINARY = "extraordinary"  # fristlos aus wichtigem Grund


class CancellationOutcome(StrEnum):
    SCHEDULED = "scheduled"  # Abo endet zum Laufzeitende
    NO_ACTIVE_CONTRACT = "no_active_contract"
    MANUAL_REVIEW = "manual_review"  # fristlos — Grund wird von Hand geprüft
    FAILED = "failed"  # Stripe nicht erreichbar — Nachbearbeitung nötig


@dataclass(frozen=True)
class CancellationRequest:
    """Kündigungserklärung, wie sie über den Kündigungsbutton eingeht."""

    name: str
    email: str
    kind: CancellationKind
    reason: str | None
    contract_reference: str | None


@dataclass
class ContractCancellation:
    id: str
    name: str
    email: str
    kind: CancellationKind
    reason: str | None
    contract_reference: str | None
    received_at: datetime
    outcome: CancellationOutcome
    user_id: str | None = None
    stripe_subscription_id: str | None = None
    effective_at: datetime | None = None
