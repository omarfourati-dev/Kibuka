"""
RAG Step 1: Document → Text extraction → Token chunks → OpenAI embeddings → pgvector
Supports PDF, Word (.docx), plain text.
"""

from __future__ import annotations

import io
import uuid
from datetime import UTC, datetime

import tiktoken
from docx import Document as DocxDocument
from openai import AsyncOpenAI
from pypdf import PdfReader
from sqlalchemy.ext.asyncio import AsyncSession

from ....adapters.output.persistence.models import DocumentChunkModel

CHUNK_SIZE = 500
CHUNK_OVERLAP = 50
EMBEDDING_MODEL = "text-embedding-3-small"

_tokenizer = tiktoken.get_encoding("cl100k_base")
_openai = AsyncOpenAI()


def extract_text(content: bytes, content_type: str) -> str:
    if "pdf" in content_type:
        reader = PdfReader(io.BytesIO(content))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    if "docx" in content_type or "word" in content_type:
        doc = DocxDocument(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs)
    return content.decode("utf-8", errors="ignore")


def chunk_text(text: str) -> list[str]:
    tokens = _tokenizer.encode(text)
    chunks = []
    start = 0
    while start < len(tokens):
        end = min(start + CHUNK_SIZE, len(tokens))
        chunks.append(_tokenizer.decode(tokens[start:end]))
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


async def embed_texts(texts: list[str]) -> list[list[float]]:
    response = await _openai.embeddings.create(input=texts, model=EMBEDDING_MODEL)
    return [item.embedding for item in response.data]


async def ingest_document(
    document_id: str,
    content: bytes,
    content_type: str,
    db: AsyncSession,
) -> int:
    text = extract_text(content, content_type)
    chunks = chunk_text(text)
    if not chunks:
        return 0
    embeddings = await embed_texts(chunks)

    now = datetime.now(UTC)
    chunk_models = [
        DocumentChunkModel(
            id=str(uuid.uuid4()),
            document_id=document_id,
            chunk_index=i,
            content=chunk,
            embedding=embedding,
            created_at=now,
        )
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings, strict=False))
    ]
    db.add_all(chunk_models)
    await db.flush()
    return len(chunks)
