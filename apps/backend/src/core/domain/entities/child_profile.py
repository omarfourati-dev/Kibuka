from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from ..value_objects.language import Language


@dataclass
class ChildProfile:
    id: str
    user_id: str
    name: str
    age: int
    preferred_languages: list[Language] = field(default_factory=lambda: [Language.DE])
    avatar_emoji: str = "🧒"
    deleted_at: datetime | None = None
    created_at: datetime = field(default_factory=datetime.utcnow)

    @property
    def is_active(self) -> bool:
        return self.deleted_at is None

    def __post_init__(self) -> None:
        if not (1 <= self.age <= 18):
            raise ValueError(f"Age must be between 1 and 18, got {self.age}")


@dataclass
class ReadingProgress:
    id: str
    child_profile_id: str
    book_id: str
    current_page: int = 0
    completed_at: datetime | None = None
    last_read_at: datetime = field(default_factory=datetime.utcnow)

    @property
    def is_completed(self) -> bool:
        return self.completed_at is not None
