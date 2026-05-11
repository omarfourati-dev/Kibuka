from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime


@dataclass
class ApiKey:
    id: str
    user_id: str
    space_id: str
    name: str
    key_hash: str
    prefix: str
    scopes: list[str] = field(default_factory=list)
    last_used_at: datetime | None = None
    expires_at: datetime | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    deleted_at: datetime | None = None

    @property
    def is_valid(self) -> bool:
        if self.deleted_at is not None:
            return False
        return not (self.expires_at and self.expires_at < datetime.now(UTC))
