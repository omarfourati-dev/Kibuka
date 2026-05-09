# Omar's App Template

**AI-first SaaS starter — fork once, ship forever**

![Build](https://img.shields.io/github/actions/workflow/status/omar/omars-app-template/ci.yml?branch=main&label=build)
![License](https://img.shields.io/github/license/omar/omars-app-template)
![Python 3.12](https://img.shields.io/badge/python-3.12-blue)
![Node 22](https://img.shields.io/badge/node-22-green)
![pnpm](https://img.shields.io/badge/pnpm-9-orange)

A production-ready SaaS monorepo template with AI Chat, RAG, Agents, Multi-tenancy, Billing, and full Observability — built to be forked and shipped fast.

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/omar/omars-app-template.git my-app
cd my-app

# 2. Configure (app name, ports, namespace)
cp project.config.yaml project.config.local.yaml
nano project.config.yaml   # set app.name, app.domain, github.org, etc.
python scripts/configure.py

# 3. Set up environment
cp .env.example .env
nano .env   # fill in secrets (DB password, API keys, etc.)

# 4. Start dev stack
docker compose -f deploy/docker/docker-compose.dev.yml up -d
pnpm install
pnpm dev
```

---

## Features

| Feature | Status | Notes |
|---|---|---|
| Auth (JWT + Google OAuth) | Included | 15 min access / 7 day refresh, httpOnly cookies |
| Multi-tenant | Included | Row-level isolation, feature flags per tenant |
| AI Chat | Included | OpenAI + Anthropic, streaming |
| RAG (Retrieval-Augmented Generation) | Included | pgvector, custom retriever, no LangChain |
| Agents (ReAct) | Included | OpenAI Function Calling, cost tracking |
| Billing (Stripe) | Included | Subscriptions, webhooks, idempotent processing |
| Observability | Included | Prometheus + Grafana + Loki + Sentry |
| Mobile (Expo) | Included | React Native + NativeWind, shared types/stores |
| Outgoing Webhooks | Included | Per-tenant webhook subscriptions |
| Feature Flags | Included | Per-tenant, runtime-configurable |
| Activity Logging | Included | Audit trail for all user actions |
| API Keys | Included | Scoped, rotatable, per-tenant |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (hexagonal architecture), Python 3.12, SQLAlchemy 2.x async, asyncpg, ARQ |
| Frontend | React 18, TypeScript strict, Vite, Tailwind CSS v4, Zustand, TanStack Query |
| Mobile | React Native, Expo SDK 52, NativeWind, expo-secure-store |
| Database | PostgreSQL 16 + pgvector, Redis 7 |
| Deploy | Docker Compose, k3d (local K8s), GitHub Actions with OIDC |
| AI | OpenAI (GPT-4o-mini, text-embedding-3-small), Anthropic Claude |

---

## Project Structure

```
omars-app-template/
├── apps/
│   ├── backend/          # FastAPI app (hexagonal architecture)
│   └── frontend/         # React 18 + Vite SPA
├── mobile/               # Expo SDK 52 (React Native)
├── packages/
│   ├── shared-types/     # TypeScript types shared across apps
│   ├── shared-stores/    # Zustand stores shared across apps
│   └── shared-api/       # API client shared across apps
├── deploy/
│   ├── docker/           # Docker Compose files (dev + prod)
│   ├── k8s/              # Kubernetes manifests
│   ├── k3d/              # Local k3d cluster config
│   └── observability/    # Prometheus, Grafana, Loki, Alertmanager
├── scripts/              # configure.py and utility scripts
├── docs/                 # Architecture decisions, feature docs, guides
└── .github/workflows/    # CI/CD pipelines
```

---

## Central Configuration

All app-specific values (name, ports, namespace, Docker registry, GitHub org) live in one place:

```
project.config.yaml
```

After editing, propagate changes everywhere:

```bash
python scripts/configure.py
```

This rewrites Kubernetes manifests, Docker Compose files, GitHub Actions workflows, and package names automatically.

---

## Documentation

- [Architecture Overview](docs/architecture/overview.md)
- [Architecture Decisions (ADRs)](docs/architecture/decisions/)
- [Feature Documentation](docs/features/)
- [Deployment Guide](docs/guides/deployment.md)
- [Local Development](docs/guides/local-dev.md)
- [Contributing](docs/guides/contributing.md)
