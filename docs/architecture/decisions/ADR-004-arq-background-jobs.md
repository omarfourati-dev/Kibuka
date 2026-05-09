# ADR-004: ARQ for Background Job Processing

**Status:** Accepted
**Date:** 2024-01-01
**Deciders:** Omar Fourati

---

## Context

The application needs background job processing for:

- Sending transactional emails (after registration, password reset, invoice)
- Processing Stripe webhook events (subscription created, payment failed, etc.)
- Document ingestion for the RAG pipeline (chunking, embedding, storing)
- Scheduled tasks (daily cost limit resets, cleanup jobs)

Common Python background job systems were evaluated:

| System                      | Notes                                                                                                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Celery**                  | Battle-tested, feature-rich, but requires a separate broker process (RabbitMQ or Redis), is synchronous by default, and has significant configuration overhead. Its async support is bolted on rather than native. |
| **Dramatiq**                | Cleaner API than Celery, still primarily synchronous. Same broker dependency.                                                                                                                                      |
| **RQ (Redis Queue)**        | Simple, Redis-backed, but synchronous workers. Requires a separate Redis client library.                                                                                                                           |
| **ARQ**                     | Built specifically for async Python. Uses Redis as the broker. Workers run inside an asyncio event loop. Minimal configuration.                                                                                    |
| **FastAPI BackgroundTasks** | No persistence. Tasks are lost on process restart. Not suitable for anything that must not be dropped.                                                                                                             |

Since the backend is already async (FastAPI + asyncpg + httpx), the job system should be natively async as well.

---

## Decision

Use **ARQ** (Async Redis Queue) for all background job processing.

Key implementation details:

- Workers defined as plain `async def` functions in `core/adapters/workers/`
- Job enqueuing via `arq.ArqRedis.enqueue_job()`
- Retry configuration per job type (e.g., email: 3 retries with exponential backoff)
- Scheduled (cron) jobs defined in `WorkerSettings.cron_jobs`
- The existing Redis instance (used for caching and rate limiting) doubles as the ARQ broker — no separate broker process

Stripe webhook events are always enqueued to ARQ rather than processed inline in the webhook handler. The handler verifies the Stripe signature, persists the raw event, and enqueues — returning 200 to Stripe immediately. The worker handles the business logic idempotently.

---

## Consequences

### Positive

- **Natively async.** Workers share the same async patterns as the FastAPI application. No thread-pool hacks or sync-to-async bridges.
- **No separate broker.** Redis is already required for caching and rate limiting. ARQ uses Redis as its queue backend. One fewer infrastructure component to operate.
- **Simple API.** Defining a job is writing an `async def`. Enqueueing is one line. No decorators, no class hierarchies.
- **Job persistence.** Jobs survive process restarts (stored in Redis). Unlike FastAPI `BackgroundTasks`, enqueued jobs are not lost if the worker crashes.
- **Built-in retries and deferred execution.** `retry=3`, `defer_by=timedelta(minutes=5)`, and similar options work out of the box.

### Negative

- **Redis dependency.** ARQ requires Redis. If Redis goes down, background jobs stop accumulating until Redis recovers. This is acceptable since the application already depends on Redis for caching.
- **No advanced routing.** ARQ does not support priority queues or complex routing topologies (multiple named queues with different workers). For the typical SaaS workload, a single queue is sufficient.
- **Smaller ecosystem.** ARQ has fewer plugins, monitoring integrations, and community resources than Celery.
- **Limited visibility.** There is no built-in UI for inspecting queued jobs (unlike Flower for Celery). Job state is inspectable via Redis CLI or a thin admin endpoint.

### Mitigations

- The job interface (`JobPort`) is abstract. A Celery adapter could be written later if routing complexity demands it.
- Basic job monitoring (queue depth, failed jobs) is exposed as Prometheus metrics from the worker process.
