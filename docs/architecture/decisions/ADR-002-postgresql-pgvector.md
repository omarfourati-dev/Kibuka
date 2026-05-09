# ADR-002: PostgreSQL + pgvector for Relational and Vector Storage

**Status:** Accepted
**Date:** 2024-01-01
**Deciders:** Omar Fourati

---

## Context

The RAG pipeline and AI chat features require storing and searching high-dimensional embedding vectors alongside relational data (users, documents, conversations, tenants). Two broad options exist:

**Option A — Separate vector database.** Use a dedicated vector store (Pinecone, Weaviate, Qdrant, Chroma) alongside PostgreSQL for relational data. Each system is optimized for its workload.

**Option B — Single PostgreSQL instance with pgvector.** Add the `pgvector` extension to the existing PostgreSQL database. Store embeddings in a `vector` column, search with cosine similarity, and accelerate with an HNSW index.

For a production SaaS or a template used by solo founders and small teams, the operational complexity of running two separate storage systems is a significant burden.

---

## Decision

Use **PostgreSQL with the pgvector extension** as the sole storage backend for both relational data and embedding vectors.

Key implementation details:

- `pgvector` extension enabled in all environments (dev, staging, production)
- Embedding columns typed as `vector(1536)` for OpenAI `text-embedding-3-small` (adjustable)
- HNSW index on embedding columns for approximate nearest-neighbor search:
  ```sql
  CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops);
  ```
- Cosine similarity search via `<=>` operator
- Alembic migrations manage the schema including vector columns

---

## Consequences

### Positive

- **Simpler infrastructure.** One database to provision, monitor, back up, and secure. One connection pool. One set of credentials.
- **Unified backup strategy.** A single `pg_dump` or streaming replica covers both relational and vector data. No synchronization between two stores.
- **Transactional consistency.** Embedding rows and their associated metadata (document_id, space_id, chunk_index) are updated in the same ACID transaction. No risk of partial updates across two stores.
- **SQL joins between relational and vector data.** A single query can filter by tenant, apply a metadata predicate, and rank by vector similarity — something that requires application-level joins with a separate vector DB.
- **Mature ecosystem.** PostgreSQL's reliability, tooling (pgAdmin, psql, pg_stat_statements), and operator knowledge are well understood.
- **HNSW performance.** For datasets up to tens of millions of vectors, HNSW in pgvector delivers sub-10ms p99 retrieval latency, sufficient for most SaaS workloads.

### Negative

- **Not a dedicated vector DB.** Pinecone and Weaviate offer features like hybrid sparse-dense search, built-in re-ranking, and multi-modal indexes that pgvector does not have (as of 2024).
- **Scaling ceiling.** At very large vector counts (hundreds of millions), a dedicated vector DB with distributed architecture will outperform a single PostgreSQL instance.
- **Memory pressure.** HNSW indexes are held partially in memory. Very large indexes on a small VM increase memory pressure on the same instance that serves relational queries.

### Mitigations

- The output port interface (`VectorRepository`) is abstract. If a future project needs a dedicated vector DB, an adapter for Qdrant or Pinecone can be written without changing use cases or domain code.
- PostgreSQL horizontal read scaling (read replicas) can offload vector search traffic if needed before reaching for a dedicated solution.
