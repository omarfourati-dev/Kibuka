from __future__ import annotations

from abc import ABC, abstractmethod

from ...domain.entities.ai_usage import AIUsage


class IAIUsageRepository(ABC):
    """Persists AI usage records and aggregates daily spend per user."""

    @abstractmethod
    async def save(self, usage: AIUsage) -> AIUsage: ...

    @abstractmethod
    async def get_daily_cost_usd(self, user_id: str) -> float:
        """Total USD spent by the user since midnight UTC."""
        ...
