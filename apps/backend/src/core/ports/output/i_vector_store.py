from __future__ import annotations
from abc import ABC, abstractmethod


class IVectorStore(ABC):
    @abstractmethod
    async def store_chunks(
        self,
        document_id: str,
        chunks: list[str],
        embeddings: list[list[float]],
    ) -> int: ...

    @abstractmethod
    async def search(
        self,
        query_embedding: list[float],
        space_id: str,
        top_k: int = 5,
    ) -> list[str]: ...

    @abstractmethod
    async def delete_by_document(self, document_id: str) -> None: ...
