from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class ApiKey:
    id: str
    user_id: str
    space_id: str
    name: str
    key_hash: str
    prefix: str
    scopes: list[str] = field(default_factory=list)
    last_used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None

    @property
    def is_valid(self) -> bool:
        if self.deleted_at is not None:
            return False
        if self.expires_at and self.expires_at < datetime.utcnow():
            return False
        return True
