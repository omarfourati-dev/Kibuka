from __future__ import annotations
from abc import ABC, abstractmethod
from typing import AsyncGenerator


class IAIClient(ABC):
    @abstractmethod
    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        model: str,
        stream: bool = False,
    ) -> AsyncGenerator[str, None]: ...

    @abstractmethod
    async def embed(self, texts: list[str], model: str) -> list[list[float]]: ...

    @abstractmethod
    async def count_tokens(self, text: str, model: str) -> int: ...
