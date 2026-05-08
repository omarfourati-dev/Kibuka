# ADR-001: Hexagonal Architecture (Ports & Adapters)

**Status:** Accepted
**Date:** 2024-01-01
**Deciders:** Omar Fourati

---

## Context

The template needs to support AI features, multiple database backends, and various external integrations (Stripe, email providers, OAuth). As the template evolves, specific infrastructure choices will change. The architecture must:

- Allow unit testing of business logic without standing up a database, Redis, or calling real AI APIs
- Make it possible to swap infrastructure components (e.g., switch email providers) without rewriting business rules
- Keep the codebase maintainable as features accumulate
- Give new contributors a clear mental model of where code belongs

Flat or layered-but-leaky architectures tend to accumulate direct framework imports inside business logic, making tests slow, brittle, and tightly coupled to infrastructure.

---

## Decision

Use the **hexagonal architecture** pattern (also called Ports & Adapters, coined by Alistair Cockburn).

The application is divided into three rings:

1. **Domain** (`core/domain/`) — entities, value objects, domain services, and port interfaces. Zero framework imports. Pure Python.
2. **Application** (`core/application/`) — use cases that orchestrate domain logic. Depends only on domain types and port interfaces. No infrastructure imports.
3. **Adapters** (`core/adapters/`) — concrete implementations of ports (input adapters: FastAPI routes; output adapters: SQLAlchemy repositories, OpenAI client, etc.).

The dependency rule: code in inner rings never imports from outer rings. Adapters import use cases and domain types; use cases import domain types and port interfaces; domain imports nothing external.

---

## Consequences

### Positive

- **Fast unit tests.** Domain and use-case tests use in-memory or mock adapters. No database required.
- **Swappable infrastructure.** Changing from sendgrid to ses means writing a new output adapter — zero changes to use cases or domain.
- **Clear code placement.** Any developer can answer "where does this code go?" by asking "is this a business rule, an orchestration step, or infrastructure?"
- **Independent deployability.** Ports make it straightforward to extract a subdomain into a separate service later if scale demands it.

### Negative

- **More boilerplate.** A new feature requires defining an entity, a port interface, a use case, and at least one adapter. This is more files than an MVC controller.
- **Initial learning curve.** Developers unfamiliar with the pattern need to understand why the same data is represented differently at the domain layer vs. the API layer (Pydantic schemas vs. domain entities).
- **Port proliferation.** Without discipline, teams create too many fine-grained ports. Convention: one port interface per external system or major capability, not one per method.

### Mitigations

- `CLAUDE.md` documents the rules and the eight-step feature checklist.
- CI linting (`ruff` import rules) catches framework imports in domain code automatically.
- Examples in each layer serve as templates for new features.
