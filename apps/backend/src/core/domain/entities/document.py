from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


class DocumentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    ERROR = "error"


@dataclass
class Document:
    id: str
    space_id: str
    filename: str
    content_type: str
    status: DocumentStatus = DocumentStatus.PENDING
    chunk_count: int = 0
    error_message: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None

    @property
    def is_ready(self) -> bool:
        return self.status == DocumentStatus.READY
