from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Optional
from ...domain.entities.outgoing_webhook import OutgoingWebhook


class IWebhookRepository(ABC):
    @abstractmethod
    async def get_by_id(self, webhook_id: str) -> Optional[OutgoingWebhook]: ...

    @abstractmethod
    async def list_by_space(self, space_id: str) -> list[OutgoingWebhook]: ...

    @abstractmethod
    async def list_by_event(self, event: str) -> list[OutgoingWebhook]: ...

    @abstractmethod
    async def save(self, webhook: OutgoingWebhook) -> OutgoingWebhook: ...

    @abstractmethod
    async def delete(self, webhook_id: str) -> None: ...
