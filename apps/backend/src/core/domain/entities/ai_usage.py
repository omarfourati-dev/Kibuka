from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime


@dataclass
class AIUsage:
    id: str
    space_id: str
    user_id: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    cost_usd: float
    feature: str
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
