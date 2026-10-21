from __future__ import annotations

from datetime import UTC, datetime, time

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .....core.domain.entities.ai_usage import AIUsage
from .....core.ports.output.i_ai_usage_repository import IAIUsageRepository
from ..models import AIUsageModel


def _start_of_day_utc() -> datetime:
    return datetime.combine(datetime.now(UTC).date(), time.min, tzinfo=UTC)


class SqlAIUsageRepository(IAIUsageRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def save(self, usage: AIUsage) -> AIUsage:
        self._session.add(
            AIUsageModel(
                id=usage.id,
                space_id=usage.space_id,
                user_id=usage.user_id,
                model=usage.model,
                prompt_tokens=usage.prompt_tokens,
                completion_tokens=usage.completion_tokens,
                total_tokens=usage.total_tokens,
                cost_usd=usage.cost_usd,
                feature=usage.feature,
                created_at=usage.created_at,
            )
        )
        await self._session.flush()
        return usage

    async def get_daily_cost_usd(self, user_id: str) -> float:
        result = await self._session.execute(
            select(func.coalesce(func.sum(AIUsageModel.cost_usd), 0.0)).where(
                AIUsageModel.user_id == user_id,
                AIUsageModel.created_at >= _start_of_day_utc(),
            )
        )
        return float(result.scalar_one())


class InMemoryAIUsageRepository(IAIUsageRepository):
    """Process-local fallback so the cost limit works without DB wiring.

    Resets on restart — production deployments should override the
    dependency with SqlAIUsageRepository.
    """

    def __init__(self) -> None:
        self._records: list[AIUsage] = []

    async def save(self, usage: AIUsage) -> AIUsage:
        self._records.append(usage)
        return usage

    async def get_daily_cost_usd(self, user_id: str) -> float:
        cutoff = _start_of_day_utc()
        return sum(
            r.cost_usd for r in self._records if r.user_id == user_id and r.created_at >= cutoff
        )
