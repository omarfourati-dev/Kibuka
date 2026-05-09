# Architecture Overview

## Hexagonal Architecture (Ports & Adapters)

This template is built on the hexagonal architecture pattern, also known as Ports & Adapters. The central idea is that the application core — the domain model and business logic — has zero knowledge of and zero dependency on external systems: databases, HTTP frameworks, message queues, or AI providers.

External systems connect to the core through well-defined interfaces called **ports**. Concrete implementations of those interfaces are called **adapters**. Adapters can be swapped without touching the core.

### Why no framework imports in the domain?

If your domain imports FastAPI, SQLAlchemy, or OpenAI, your business rules become entangled with infrastructure choices. Testing requires spinning up real databases and HTTP servers. Switching providers means rewriting business logic.

By keeping `core/domain/` framework-free, you get:

- Unit tests that run in milliseconds with no external dependencies
- Business logic that can be reasoned about in isolation
- Adapters that can be replaced (e.g., swap PostgreSQL for DynamoDB) without touching domain code

---

## Directory Structure

```
apps/
  backend/
    core/
      domain/           # Layer 1: Domain — entities, value objects, domain services
        entities/       #   Pure Python dataclasses/models, no ORM annotations
        ports/          #   Abstract interfaces (Python ABCs) the domain defines
        services/       #   Domain services operating only on domain types
      application/      # Layer 2: Application — use cases, orchestration
        use_cases/      #   One class per use case; imports domain + ports, not adapters
      adapters/         # Layer 3: Adapters — framework and infrastructure code
        input/          #   FastAPI routers, WebSocket handlers, CLI entrypoints
        output/         #   SQLAlchemy repositories, OpenAI client, Redis client, etc.
    config/             # Settings (pydantic-settings), loaded once at startup
    main.py             # FastAPI app wiring: register routers, inject dependencies
  frontend/             # React 18 + TypeScript + Tailwind CSS v4
  mobile/               # React Native + Expo SDK 52 + NativeWind
packages/
  shared-types/         # TypeScript types shared between web + mobile
  shared-stores/        # Zustand stores shared between web + mobile
  api-client/           # Generated or hand-written API client
deploy/
  docker/               # docker-compose.yml, docker-compose.dev.yml
  k8s/                  # Kubernetes manifests (Deployment, Service, Ingress, HPA, PDB)
  k3d/                  # Local k3d cluster setup scripts
docs/                   # This documentation
scripts/                # Developer tooling (setup.sh, dev.sh, configure.py, etc.)
```

---

## Data Flow

```
HTTP Request
     │
     ▼
┌─────────────────────┐
│   Input Adapter     │  FastAPI router — parses HTTP, validates with Pydantic,
│   (adapters/input/) │  calls the use case
└────────┬────────────┘
         │ domain types (no HTTP objects)
         ▼
┌─────────────────────┐
│    Use Case         │  Orchestrates domain logic; holds references to port
│  (application/)     │  interfaces, not concrete implementations
└────────┬────────────┘
         │ calls port interface method
         ▼
┌─────────────────────┐
│   Output Port       │  Abstract interface defined in domain/ports/
│   (domain/ports/)   │  e.g., UserRepository, EmailService, EmbeddingService
└────────┬────────────┘
         │ implemented by
         ▼
┌─────────────────────┐
│   Output Adapter    │  Concrete implementation: SQLAlchemy repo, SendGrid
│  (adapters/output/) │  client, OpenAI embeddings, etc.
└────────┬────────────┘
         │
         ▼
   Database / External Service
   (PostgreSQL, Redis, OpenAI, Stripe, …)
```

The dependency arrows always point inward. The domain knows nothing about adapters. Adapters know about the domain, never about each other.

---

## Key Design Principles

### Domain Isolation

The `core/domain/` package has a hard rule enforced by both convention and CI lint checks: no imports from `fastapi`, `sqlalchemy`, `openai`, `anthropic`, `redis`, `stripe`, or any other infrastructure library. Violations fail the build.

### Dependency Inversion

Use cases depend on port interfaces (abstract classes), not on concrete adapters. FastAPI's dependency injection system wires the concrete adapters at runtime. In tests, mock adapters are injected instead.

### Feature Flags for Modularity

Every optional capability (AI, billing, multi-tenancy, WebSockets) is gated by a feature flag. Flags are checked at startup and at the API layer before any use case is invoked. This lets the same codebase power different product configurations without branching.

```python
# At the route level — checked before calling any use case
if not settings.ENABLE_RAG:
    raise HTTPException(status_code=404, detail="Feature not available")
```

Flags come from environment variables (deployment-time) and per-tenant database records (runtime). See `docs/features/multi-tenant.md` for the tenant-level flag model.

### Soft Deletes Everywhere

No record is ever physically deleted without an explicit bulk-purge operation. All entities carry a `deleted_at: datetime | None` field. All repository queries filter `WHERE deleted_at IS NULL` by default. This preserves audit history and enables recovery.

### Audit Logging

Every user-facing write operation appends an audit record: who, what, when, previous value, new value. Audit records are immutable append-only rows in a separate `audit_logs` table.
