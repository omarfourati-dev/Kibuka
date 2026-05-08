"""Implements IVectorStore using PostgreSQL + pgvector."""
from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from ....core.ports.output.i_vector_store import IVectorStore
from ....adapters.output.persistence.models import DocumentChunkModel, DocumentModel


class PgVectorStore(IVectorStore):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def store_chunks(
        self,
        document_id: str,
        chunks: list[str],
        embeddings: list[list[float]],
    ) -> int:
        now = datetime.utcnow()
        models = [
            DocumentChunkModel(
                id=str(uuid.uuid4()),
                document_id=document_id,
                chunk_index=i,
                content=chunk,
                embedding=embedding,
                created_at=now,
            )
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
        ]
        self._session.add_all(models)
        await self._session.flush()
        return len(models)

    async def search(
        self,
        query_embedding: list[float],
        space_id: str,
        top_k: int = 5,
    ) -> list[str]:
        result = await self._session.execute(
            select(DocumentChunkModel.content)
            .join(DocumentModel, DocumentChunkModel.document_id == DocumentModel.id)
            .where(DocumentModel.space_id == space_id, DocumentModel.deleted_at.is_(None))
            .order_by(DocumentChunkModel.embedding.cosine_distance(query_embedding))
            .limit(top_k)
        )
        return [row[0] for row in result.fetchall()]

    async def delete_by_document(self, document_id: str) -> None:
        await self._session.execute(
            delete(DocumentChunkModel).where(DocumentChunkModel.document_id == document_id)
        )
