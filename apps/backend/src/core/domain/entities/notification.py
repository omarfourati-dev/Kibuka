from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum


class NotificationType(StrEnum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"


@dataclass
class Notification:
    id: str
    user_id: str
    type: NotificationType
    title: str
    message: str
    read: bool = False
    action_url: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
