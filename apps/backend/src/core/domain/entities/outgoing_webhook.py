from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


class WebhookStatus(str, Enum):
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
    secret: Optional[str] = None
    is_active: bool = True
    failure_count: int = 0
    circuit_open_until: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    @property
    def is_circuit_open(self) -> bool:
        if self.circuit_open_until is None:
            return False
        return self.circuit_open_until > datetime.utcnow()
