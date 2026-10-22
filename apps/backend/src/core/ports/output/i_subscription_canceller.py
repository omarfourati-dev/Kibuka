from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime


class ISubscriptionCanceller(ABC):
    @abstractmethod
    async def cancel_at_period_end(self, stripe_subscription_id: str) -> datetime | None:
        """Beendet das Abo zum Laufzeitende; liefert dieses Ende (falls bekannt)."""
