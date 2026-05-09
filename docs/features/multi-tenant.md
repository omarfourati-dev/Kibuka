# Multi-Tenancy

**Feature flag:** `ENABLE_MULTI_TENANT=true`

When disabled, the application operates in single-tenant mode: all users share a single implicit space and tenant-level feature checks are skipped.

---

## Isolation Model

This template uses **row-level isolation** — all tenants share the same database schema. Every table that contains tenant-owned data has a `space_id` column. Every query in the repository layer applies a `WHERE space_id = :space_id` filter by default.

```python
# Example: every repository method receives space_id from the use case
async def list_documents(self, space_id: UUID) -> list[Document]:
    result = await self.session.execute(
        select(DocumentORM)
        .where(DocumentORM.space_id == space_id)
        .where(DocumentORM.deleted_at.is_(None))
    )
    return [self._to_domain(row) for row in result.scalars()]
```

The `space_id` is extracted from the authenticated user's JWT at the API layer and passed down through the use case to every repository call. It is never passed in from external input — the server always derives it from the verified token.

### Why row-level, not schema-level?

Schema-per-tenant (each tenant gets their own PostgreSQL schema) provides stronger isolation but requires complex migration tooling and makes cross-tenant analytics impossible. For most SaaS use cases, row-level isolation with proper indexing and query discipline is sufficient and operationally simpler.

---

## Soft Deletes

No tenant data is physically deleted in normal operation. All domain entities have:

```python
deleted_at: datetime | None = None
```

Queries always filter `WHERE deleted_at IS NULL`. To "delete" a record:

```python
entity.deleted_at = datetime.now(timezone.utc)
await repo.save(entity)
```

Physical purges happen only via a scheduled background job that runs after the data retention period has elapsed, or explicitly via the GDPR data deletion flow.

---

## Space Model

A **Space** is the top-level tenant container. Users belong to one or more spaces. All resources (documents, conversations, API keys) are scoped to a space.

```
Space
 ├── Members (users with roles: owner, admin, member)
 ├── SpaceFeatures (per-tenant feature flags)
 ├── SpacePlan (free | pro | enterprise)
 └── Resources (Documents, Conversations, …)
```

### Space Plans

| Plan         | Limits                                           |
| ------------ | ------------------------------------------------ |
| `free`       | 5 users, 100 documents, AI chat only             |
| `pro`        | 25 users, 10,000 documents, AI chat + RAG        |
| `enterprise` | Unlimited users and documents, all features, SLA |

Plan limits are enforced in the relevant use cases (e.g., `InviteUserUseCase` checks current member count against the plan limit before adding a user).

---

## Per-Tenant Feature Flags

The `space_features` table stores which features are enabled for each space:

```sql
CREATE TABLE space_features (
    space_id    UUID PRIMARY KEY REFERENCES spaces(id),
    rag_enabled         BOOLEAN DEFAULT false,
    agents_enabled      BOOLEAN DEFAULT false,
    websockets_enabled  BOOLEAN DEFAULT true,
    custom_ai_key       TEXT,    -- allow spaces to supply their own OpenAI key
    updated_at          TIMESTAMP WITH TIME ZONE
);
```

Feature checks in use cases:

```python
# First: env-level check (applies to all tenants)
if not settings.ENABLE_AGENTS:
    raise HTTPException(404)

# Second: tenant-level check
features = await feature_repo.get(space_id)
if not features.agents_enabled:
    raise HTTPException(403, "Upgrade your plan to use Agents")
```

Tenant-level flags are managed via the admin API. Changing a plan automatically updates the corresponding feature flags.

---

## Member Roles

| Role     | Permissions                                           |
| -------- | ----------------------------------------------------- |
| `owner`  | All permissions including billing and space deletion  |
| `admin`  | All permissions except billing and space deletion     |
| `member` | Read/write access to resources, cannot manage members |
| `viewer` | Read-only access                                      |

Roles are encoded in the JWT claims and checked in the FastAPI dependency layer before reaching the use case.

---

## Environment Variables

| Variable                   | Description                         |
| -------------------------- | ----------------------------------- |
| `ENABLE_MULTI_TENANT`      | `true` to enable multi-tenancy      |
| `DEFAULT_PLAN`             | Plan assigned to new spaces: `free` |
| `FREE_PLAN_USER_LIMIT`     | Default: `5`                        |
| `FREE_PLAN_DOCUMENT_LIMIT` | Default: `100`                      |
