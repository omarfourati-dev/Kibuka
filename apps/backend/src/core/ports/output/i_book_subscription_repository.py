from __future__ import annotations

from abc import ABC, abstractmethod

from ...domain.entities.purchase import BookSubscription


class IBookSubscriptionRepository(ABC):
    @abstractmethod
    async def get_current_for_user(self, user_id: str) -> BookSubscription | None:
        """Aktives Abo des Nutzers, sonst das jüngste (für die Statusanzeige)."""

    @abstractmethod
    async def get_by_stripe_id(self, stripe_subscription_id: str) -> BookSubscription | None: ...

    @abstractmethod
    async def upsert_by_stripe_id(self, sub: BookSubscription) -> BookSubscription: ...
