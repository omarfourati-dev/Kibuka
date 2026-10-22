from __future__ import annotations

from abc import ABC, abstractmethod


class IRateLimitStore(ABC):
    @abstractmethod
    async def hit(self, key: str, window_seconds: int) -> int:
        """Zählt einen Aufruf im laufenden Zeitfenster; liefert den neuen Stand."""
