from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum


class WebhookStatus(StrEnum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    CIRCUIT_OPEN = "circuit_open"


@dataclass
class OutgoingWebhook:
    id: str
    space_id: str
    name: str
    url: str
    events: list[str] = field(default_factory=list)
    secret: str | None = None
    is_active: bool = True
    failure_count: int = 0
    circuit_open_until: datetime | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    @property
    def is_circuit_open(self) -> bool:
        if self.circuit_open_until is None:
            return False
        return self.circuit_open_until > datetime.now(UTC)
