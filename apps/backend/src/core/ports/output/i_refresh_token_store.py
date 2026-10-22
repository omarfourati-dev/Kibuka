from __future__ import annotations

from abc import ABC, abstractmethod


class IRefreshTokenStore(ABC):
    """Serverseitiger Zustand der Refresh-Tokens (jti → user_id).

    Nur ein hier registriertes Token ist gültig; jede Nutzung verbraucht es
    (Rotation), Logout widerruft es.
    """

    @abstractmethod
    async def register(self, jti: str, user_id: str, ttl_seconds: int) -> None: ...

    @abstractmethod
    async def consume(self, jti: str) -> str | None:
        """Atomar lesen + löschen. None = unbekannt, abgelaufen oder schon benutzt."""

    @abstractmethod
    async def revoke(self, jti: str) -> None: ...
