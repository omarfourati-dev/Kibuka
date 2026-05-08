# RAG Pipeline (Retrieval-Augmented Generation)

**Feature flag:** `ENABLE_RAG=true`

---

## Overview

The RAG pipeline lets users ask questions about their own documents. Documents are ingested, chunked, embedded, and stored in pgvector. At query time, relevant chunks are retrieved and passed to the LLM as context.

---

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    INGESTION PHASE                       │
│                                                          │
│  Upload file                                             │
│       │                                                  │
│       ▼                                                  │
│  DocumentIngester                                        │
│   ├── Parse: PDF → text, DOCX → text, TXT → text        │
│   ├── Chunk: tiktoken, 500 tokens, 50-token overlap      │
│   ├── Embed: OpenAI text-embedding-3-small               │
│   └── Store: INSERT INTO document_chunks (embedding)     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    QUERY PHASE                           │
│                                                          │
│  User question                                           │
│       │                                                  │
│       ▼                                                  │
│  Embed question (same model as ingestion)                │
│       │                                                  │
│       ▼                                                  │
│  Retriever: cosine similarity via pgvector               │
│  SELECT ... ORDER BY embedding <=> :query_vec LIMIT 5   │
│       │                                                  │
│       ▼                                                  │
│  RAGChain: assemble context + call LLM (streaming)       │
│       │                                                  │
│       ▼                                                  │
│  Streaming answer with source citations                  │
└─────────────────────────────────────────────────────────┘
```

---

## Step 1: Document Ingestion

### Supported Formats

| Format | Parser                                  |
| ------ | --------------------------------------- |
| PDF    | `pypdf` — extracts text from all pages  |
| DOCX   | `python-docx` — extracts paragraph text |
| TXT    | Direct read, UTF-8                      |

### Chunking

Chunking uses `tiktoken` to count tokens accurately for the target embedding model.

- **Chunk size:** 500 tokens
- **Overlap:** 50 tokens (preserves context across chunk boundaries)
- **Strategy:** Sentence-aware — the chunker avoids splitting in the middle of a sentence where possible

Each chunk is stored as a `DocumentChunk` row:

```sql
CREATE TABLE document_chunks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    space_id    UUID NOT NULL,
    chunk_index INTEGER NOT NULL,
    content     TEXT NOT NULL,
    embedding   vector(1536),     -- OpenAI text-embedding-3-small dimensions
    token_count INTEGER,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
```

### Embedding Model

**Default:** `text-embedding-3-small` (1536 dimensions, $0.02 / 1M tokens as of 2024)

Configure via `OPENAI_EMBEDDING_MODEL`. Changing the model requires re-ingesting all documents because dimensions may differ.

### Async Ingestion

Document ingestion is handled as an ARQ background job. The upload endpoint:

1. Saves the raw file to storage
2. Creates a `Document` record with status `pending`
3. Enqueues `ingest_document_job(document_id)`
4. Returns `202 Accepted` immediately

The ARQ worker processes chunking and embedding asynchronously, updating the document status to `ready` or `failed`.

---

## Step 2: Retrieval

```python
async def retrieve(
    self,
    query: str,
    space_id: UUID,
    document_ids: list[UUID] | None = None,
    top_k: int = 5,
) -> list[DocumentChunk]:
    query_embedding = await self.embedding_service.embed(query)
    return await self.chunk_repo.similarity_search(
        embedding=query_embedding,
        space_id=space_id,
        document_ids=document_ids,
        top_k=top_k,
    )
```

The HNSW index makes similarity search fast even with millions of chunks. Approximate nearest-neighbor search trades a small accuracy loss for orders-of-magnitude speed improvement over exact search.

Results are filtered by `space_id` at the database level, ensuring tenants cannot retrieve each other's documents.

---

## Step 3: Generation

The retrieved chunks are formatted into a context block and included in the system prompt:

```
You are a helpful assistant. Answer the user's question using only the
information provided in the context below. If the context does not contain
enough information to answer, say so clearly.

Context:
[Chunk 1 content — source: document_name.pdf, page 3]
[Chunk 2 content — source: document_name.pdf, page 7]
...

User question: {question}
```

The response is streamed token-by-token using the same SSE mechanism as AI chat. Each response includes source citations (document name + chunk index) so users can verify the answer.

---

## Cost Tracking

Both embedding and generation API calls record `AIUsage` entries. The RAG query produces two records: one for the query embedding and one for the completion.

---

## API Reference

### Upload a document

```
POST /api/v1/rag/documents
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary>
title: "Q3 Financial Report"
```

### Query documents

```
POST /api/v1/rag/query
Authorization: Bearer <token>
Content-Type: application/json

{
  "question": "What was revenue in Q3?",
  "document_ids": ["uuid1", "uuid2"]   // optional filter
}
```

Response: `text/event-stream` (same format as AI chat)

---

## Environment Variables

| Variable                 | Description                                |
| ------------------------ | ------------------------------------------ |
| `ENABLE_RAG`             | `true` to enable RAG                       |
| `OPENAI_EMBEDDING_MODEL` | Default: `text-embedding-3-small`          |
| `RAG_CHUNK_SIZE`         | Tokens per chunk. Default: `500`           |
| `RAG_CHUNK_OVERLAP`      | Overlap tokens. Default: `50`              |
| `RAG_TOP_K`              | Chunks to retrieve per query. Default: `5` |
| `MAX_DOCUMENT_SIZE_MB`   | Upload size limit. Default: `50`           |
