# ADR-006: Runtime Feature Flags via Environment Variables and Database

**Status:** Accepted
**Date:** 2024-01-01
**Deciders:** Omar Fourati

---

## Context

The template is designed to support multiple deployment configurations:

- **B2C SaaS:** AI chat enabled, billing active, multi-tenancy off (single-tenant), agents enabled.
- **B2B SaaS:** Multi-tenancy on, per-tenant feature flags, billing active, some AI features disabled by plan.
- **Internal tool:** Billing off, agents off, basic auth only.
- **Prototype:** Everything on, no billing, simplified auth.

Additionally, AI features and billing integrations have real cost and risk implications — they should not activate until explicitly configured. New features should be deployable to production before being exposed to users (dark deploy + gradual rollout).

Hard-coding which features are active in the application code makes it impossible to serve these configurations from a single codebase.

---

## Decision

Implement a two-tier feature flag system:

**Tier 1 — Environment-level flags (env vars).**
Loaded at application startup via `pydantic-settings`. Control capabilities that apply to the entire deployment.

```
ENABLE_AI=true
ENABLE_RAG=true
ENABLE_AGENTS=true
ENABLE_BILLING=false
ENABLE_MULTI_TENANT=true
ENABLE_WEBSOCKETS=true
```

If an env-level flag is `false`, the corresponding API routes return `404` and the feature is invisible to all tenants.

**Tier 2 — Tenant-level flags (database).**
Stored in a `space_features` table, keyed by `space_id`. Checked at the use-case layer after the env-level check. Allow per-tenant enablement of features that are globally available.

```python
# Pattern used throughout use cases:
if not settings.ENABLE_RAG:
    raise HTTPException(status_code=404, detail="Feature not available")

space_features = await feature_repo.get(space_id)
if not space_features.rag_enabled:
    raise HTTPException(status_code=403, detail="Feature not enabled for this plan")
```

Flags are checked at the earliest possible point — at the input adapter (route) for env-level flags, and in the use case for tenant-level flags.

---

## Consequences

### Positive

- **Single codebase, multiple configurations.** The same Docker image can be deployed as a minimal internal tool or a full-featured SaaS by varying environment variables.
- **Safe rollouts.** New features can be merged to main, deployed to production, and initially hidden behind `ENABLE_FEATURE=false`. Enable for internal testing, then for beta tenants, then for all.
- **Plan enforcement.** Tenant-level flags map naturally to subscription plans. Pro tenants get `agents_enabled=true`; free tenants do not. Plan upgrades flip the flag in the database.
- **Cost control.** AI features (the most expensive) are gated. `AI_COST_LIMIT_USD_PER_DAY` provides a hard cap even when the flag is on.
- **Audit trail.** Changes to tenant-level flags are recorded in the audit log (who enabled agents for which tenant, when).

### Negative

- **Feature flag debt.** Flags that are never cleaned up after a feature is fully rolled out accumulate as dead code. A flag that is always `true` in practice is just noise.
- **Testing matrix.** Two tiers of flags create a combinatorial test surface. Not all combinations are tested. The convention is to test with flags both on and off for env-level flags only.
- **Operational overhead.** Changing an env-level flag requires a deployment (env var change + container restart). Tenant-level flags can be changed live via admin API.

### Mitigations

- Each flag has a comment in `config/settings.py` documenting when it should be removed or made permanent.
- A quarterly review of all flags is recommended (add to team calendar when forking the template).
- The admin API for tenant flags is protected by admin-only RBAC, logged, and rate-limited.
