from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class IQueue(ABC):
    @abstractmethod
    async def enqueue(
        self,
        job_name: str,
        *,
        kwargs: dict[str, Any] | None = None,
        delay_seconds: int = 0,
    ) -> str: ...
