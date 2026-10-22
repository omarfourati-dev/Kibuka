from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .....core.domain.entities.purchase import BookSubscription, BookSubscriptionStatus
from .....core.ports.output.i_book_subscription_repository import IBookSubscriptionRepository
from ..models import BookSubscriptionModel

_ACTIVE = (BookSubscriptionStatus.TRIALING.value, BookSubscriptionStatus.ACTIVE.value)


class SqlBookSubscriptionRepository(IBookSubscriptionRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_current_for_user(self, user_id: str) -> BookSubscription | None:
        result = await self._session.execute(
            select(BookSubscriptionModel)
            .where(BookSubscriptionModel.user_id == user_id)
            .order_by(BookSubscriptionModel.created_at.desc())
        )
        models = list(result.scalars().all())
        active = [m for m in models if m.status in _ACTIVE]
        candidates = active or models
        return self._to_entity(candidates[0]) if candidates else None

    async def get_by_stripe_id(self, stripe_subscription_id: str) -> BookSubscription | None:
        model = await self._get_model(stripe_subscription_id)
        return self._to_entity(model) if model else None

    async def upsert_by_stripe_id(self, sub: BookSubscription) -> BookSubscription:
        if not sub.stripe_subscription_id:
            raise ValueError("upsert_by_stripe_id needs a stripe_subscription_id")
        model = await self._get_model(sub.stripe_subscription_id)
        if model:
            model.status = sub.status.value
            model.plan = sub.plan
            model.current_period_end = sub.current_period_end
            model.cancel_at_period_end = sub.cancel_at_period_end
            model.stripe_customer_id = sub.stripe_customer_id or model.stripe_customer_id
            model.updated_at = datetime.now(UTC)
            sub.id = model.id
        else:
            self._session.add(
                BookSubscriptionModel(
                    id=sub.id,
                    user_id=sub.user_id,
                    stripe_subscription_id=sub.stripe_subscription_id,
                    stripe_customer_id=sub.stripe_customer_id,
                    plan=sub.plan,
                    status=sub.status.value,
                    current_period_end=sub.current_period_end,
                    cancel_at_period_end=sub.cancel_at_period_end,
                    created_at=sub.created_at,
                    updated_at=sub.created_at,
                )
            )
        await self._session.flush()
        return sub

    async def _get_model(self, stripe_subscription_id: str) -> BookSubscriptionModel | None:
        result = await self._session.execute(
            select(BookSubscriptionModel).where(
                BookSubscriptionModel.stripe_subscription_id == stripe_subscription_id
            )
        )
        return result.scalar_one_or_none()

    def _to_entity(self, model: BookSubscriptionModel) -> BookSubscription:
        return BookSubscription(
            id=model.id,
            user_id=model.user_id,
            plan=model.plan,
            status=BookSubscriptionStatus(model.status),
            stripe_subscription_id=model.stripe_subscription_id,
            stripe_customer_id=model.stripe_customer_id,
            current_period_end=model.current_period_end,
            cancel_at_period_end=model.cancel_at_period_end,
            created_at=model.created_at,
        )
