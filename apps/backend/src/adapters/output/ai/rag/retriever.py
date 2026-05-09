"""RAG Step 2: Query → embedding → cosine similarity search → top-K chunks."""
from __future__ import annotations
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from openai import AsyncOpenAI
from ....adapters.output.persistence.models import DocumentChunkModel, DocumentModel

_openai = AsyncOpenAI()


async def retrieve(
    query: str,
    space_id: str,
    db: AsyncSession,
    top_k: int = 5,
) -> list[str]:
    response = await _openai.embeddings.create(input=[query], model="text-embedding-3-small")
    query_embedding = response.data[0].embedding

    result = await db.execute(
        select(DocumentChunkModel.content)
        .join(DocumentModel, DocumentChunkModel.document_id == DocumentModel.id)
        .where(
            DocumentModel.space_id == space_id,
            DocumentModel.deleted_at.is_(None),
        )
        .order_by(DocumentChunkModel.embedding.cosine_distance(query_embedding))
        .limit(top_k)
    )
    return [row[0] for row in result.fetchall()]
