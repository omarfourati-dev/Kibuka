from __future__ import annotations
from dataclasses import dataclass
from ...domain.entities.document import Document, DocumentStatus
from ...domain.exceptions.ai import AIFeatureDisabledError, DocumentProcessingError
from ...ports.output.i_document_repository import IDocumentRepository
from ...ports.output.i_vector_store import IVectorStore
from ...ports.output.i_ai_client import IAIClient


@dataclass
class IngestDocumentCommand:
    document_id: str
    space_id: str
    content: bytes
    content_type: str


class IngestDocumentUseCase:
    def __init__(
        self,
        document_repo: IDocumentRepository,
        vector_store: IVectorStore,
        ai_client: IAIClient,
        enable_rag: bool = True,
    ) -> None:
        self._document_repo = document_repo
        self._vector_store = vector_store
        self._ai_client = ai_client
        self._enable_rag = enable_rag

    async def execute(self, command: IngestDocumentCommand) -> int:
        """Returns number of chunks created."""
        if not self._enable_rag:
            raise AIFeatureDisabledError("RAG features are disabled")

        document = await self._document_repo.get_by_id(command.document_id)
        if not document:
            raise DocumentProcessingError(f"Document {command.document_id} not found")

        document.status = DocumentStatus.PROCESSING
        await self._document_repo.save(document)
        return document.chunk_count
