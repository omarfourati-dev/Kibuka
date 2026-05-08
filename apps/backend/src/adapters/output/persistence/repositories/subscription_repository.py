from __future__ import annotations
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from .....core.ports.output.i_subscription_repository import ISubscriptionRepository
from .....core.domain.entities.subscription import Subscription, SubscriptionStatus
from ..models import SubscriptionModel


class SqlSubscriptionRepository(ISubscriptionRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_space_id(self, space_id: str) -> Optional[Subscription]:
        result = await self._session.execute(
            select(SubscriptionModel).where(SubscriptionModel.space_id == space_id)
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_stripe_id(self, stripe_subscription_id: str) -> Optional[Subscription]:
        result = await self._session.execute(
            select(SubscriptionModel).where(
                SubscriptionModel.stripe_subscription_id == stripe_subscription_id
            )
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def save(self, subscription: Subscription) -> Subscription:
        existing = await self._session.get(SubscriptionModel, subscription.id)
        if existing:
            existing.status = subscription.status.value
            existing.plan_type = subscription.plan_type
            existing.current_period_start = subscription.current_period_start
            existing.current_period_end = subscription.current_period_end
            existing.cancel_at_period_end = subscription.cancel_at_period_end
            existing.trial_end = subscription.trial_end
        else:
            self._session.add(self._to_model(subscription))
        await self._session.flush()
        return subscription

    def _to_entity(self, model: SubscriptionModel) -> Subscription:
        return Subscription(
            id=model.id,
            space_id=model.space_id,
            stripe_subscription_id=model.stripe_subscription_id,
            stripe_customer_id=model.stripe_customer_id,
            status=SubscriptionStatus(model.status),
            plan_type=model.plan_type,
            current_period_start=model.current_period_start,
            current_period_end=model.current_period_end,
            cancel_at_period_end=model.cancel_at_period_end,
            trial_end=model.trial_end,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def _to_model(self, subscription: Subscription) -> SubscriptionModel:
        return SubscriptionModel(
            id=subscription.id,
            space_id=subscription.space_id,
            stripe_subscription_id=subscription.stripe_subscription_id,
            stripe_customer_id=subscription.stripe_customer_id,
            status=subscription.status.value,
            plan_type=subscription.plan_type,
            current_period_start=subscription.current_period_start,
            current_period_end=subscription.current_period_end,
            cancel_at_period_end=subscription.cancel_at_period_end,
            trial_end=subscription.trial_end,
        )
