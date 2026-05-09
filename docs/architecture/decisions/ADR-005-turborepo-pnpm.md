# ADR-005: pnpm Workspaces + Turborepo for Monorepo Tooling

**Status:** Accepted
**Date:** 2024-01-01
**Deciders:** Omar Fourati

---

## Context

The template contains three JavaScript/TypeScript projects that need to share code:

- `apps/frontend` — React 18 web application
- `apps/mobile` — React Native + Expo mobile application
- `packages/shared-types` — TypeScript types for API responses, domain entities, enums
- `packages/shared-stores` — Zustand stores used by both web and mobile
- `packages/api-client` — Typed API client generated from the OpenAPI spec

Without a monorepo setup, shared code must be published to npm (slow iteration loop), copied manually (drift), or duplicated (inconsistency). The web and mobile apps must use the exact same type definitions for the API to avoid subtle bugs.

Options considered:

| Tool                        | Notes                                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------------------- |
| **npm workspaces**          | Built into npm, no extra tooling, but slow installs and no build orchestration.                      |
| **yarn workspaces + Lerna** | Mature, but Lerna is declining and yarn v1 is effectively in maintenance mode.                       |
| **pnpm workspaces**         | Strict symlink structure prevents phantom dependencies. Fast installs via content-addressable store. |
| **pnpm + Turborepo**        | pnpm for dependency management, Turborepo for incremental build orchestration and caching.           |
| **Nx**                      | Powerful but opinionated and heavyweight for a starter template.                                     |

---

## Decision

Use **pnpm workspaces** for dependency management and **Turborepo** for build orchestration.

Configuration:

- `pnpm-workspace.yaml` declares workspace packages
- `turbo.json` defines the build pipeline: `build` depends on upstream `build`, `lint` and `typecheck` run in parallel
- Remote caching configured via `TURBO_TOKEN` and `TURBO_TEAM` environment variables (optional, works without them)
- Metro bundler in the Expo project configured to resolve pnpm symlinks correctly

Package naming convention: `@app/shared-types`, `@app/shared-stores`, `@app/api-client`. The `@app` scope is replaced by `scripts/configure.py` when the template is instantiated with a real project name.

---

## Consequences

### Positive

- **Shared code with zero publishing overhead.** Changes to `shared-types` are immediately available in both `frontend` and `mobile` without a publish-install cycle.
- **Consistent types.** A single source of truth for API response shapes eliminates the category of "type was updated in one place but not the other" bugs.
- **Incremental builds.** Turborepo only rebuilds packages whose inputs have changed. In CI, remote caching means unchanged packages are restored from cache in seconds.
- **Strict dependency isolation.** pnpm's symlink structure prevents packages from accidentally importing dependencies they didn't declare, catching phantom dependency bugs at install time rather than in production.
- **Consistent tooling.** One `pnpm install` at the root, one `turbo run lint` to lint everything, one `turbo run build` to build all packages in topological order.

### Negative

- **Learning curve.** Developers unfamiliar with monorepos need to understand workspace symlinks, why imports look like `@app/shared-types` rather than relative paths, and how Turborepo's pipeline configuration works.
- **Metro configuration complexity.** React Native's Metro bundler requires additional configuration to follow pnpm symlinks. This is handled in the template's `metro.config.js` but can be a source of confusion when upgrading Expo.
- **Build cache invalidation.** Incorrect `inputs`/`outputs` configuration in `turbo.json` leads to stale cache hits. Requires care when adding new config files that affect build output.
- **Windows path issues.** pnpm symlinks can behave differently on Windows without Developer Mode enabled. The template documents this requirement.

### Mitigations

- `docs/guides/getting-started.md` covers the one-time Windows setup step.
- The Metro config is pre-configured and tested. Comments explain the symlink resolution setup.
- A `turbo.json` lint rule in CI catches obvious pipeline misconfiguration.
