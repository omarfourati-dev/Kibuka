from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


class NotificationType(str, Enum):
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
    action_url: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
