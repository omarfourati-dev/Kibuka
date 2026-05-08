from __future__ import annotations
from abc import ABC, abstractmethod


class IEmailService(ABC):
    @abstractmethod
    async def send(
        self,
        to: str,
        subject: str,
        template: str,
        context: dict,
    ) -> None: ...
