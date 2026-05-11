from __future__ import annotations

from abc import ABC, abstractmethod

from ...domain.entities.subscription import Subscription


class ISubscriptionRepository(ABC):
    @abstractmethod
    async def get_by_space_id(self, space_id: str) -> Subscription | None: ...

    @abstractmethod
    async def get_by_stripe_id(self, stripe_subscription_id: str) -> Subscription | None: ...

    @abstractmethod
    async def save(self, subscription: Subscription) -> Subscription: ...
