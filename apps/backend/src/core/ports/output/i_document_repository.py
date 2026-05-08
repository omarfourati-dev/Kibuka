from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Optional
from ...domain.entities.document import Document


class IDocumentRepository(ABC):
    @abstractmethod
    async def get_by_id(self, document_id: str) -> Optional[Document]: ...

    @abstractmethod
    async def list_by_space(self, space_id: str) -> list[Document]: ...

    @abstractmethod
    async def save(self, document: Document) -> Document: ...

    @abstractmethod
    async def delete(self, document_id: str) -> None: ...
