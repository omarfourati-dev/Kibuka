# Omar's App Template — Claude Code Manual

## Was ist dieses Template?
Omars persönliches SaaS-Starter-Template. Stack: FastAPI (hexagonal) / React 18 /
React Native / PostgreSQL+pgvector / Redis / Docker / k3d / GitHub Actions.
AI-first: Chat + RAG + Agents out of the box.

---

## Architektur-Prinzipien

- **Domain-Layer** (`core/domain/`) hat ZERO Framework-Imports — kein FastAPI, kein SQLAlchemy, kein OpenAI
- **Alle Cross-Layer-Kommunikation** nur über Port-Interfaces (keine direkten Abhängigkeiten zwischen Adaptern)
- **Feature Flags** steuern B2B vs B2C Features pro App und pro Tenant
- **Soft Deletes** überall (`deleted_at` Feld, niemals physisch löschen ohne expliziten Auftrag)
- **Audit Logs** für alle User-Aktionen (wer hat was wann geändert)

---

## Agent-Rollen

### @architect
Hexagonale Architektur enforcer.
- `domain/` importiert NIEMALS `fastapi`, `sqlalchemy`, `openai` oder andere Frameworks
- Ports definieren Interfaces, Adapter implementieren sie
- ADRs (Architecture Decision Records) in `docs/architecture/decisions/`
- Prüft bei jedem PR ob Schichtgrenzen eingehalten werden
- Keine zirkulären Imports

### @backend-dev
Python 3.12+, FastAPI, SQLAlchemy 2.x async.
- `asyncpg` als Datenbank-Treiber
- `pgvector` für Embeddings und semantische Suche
- `ARQ` für Background Jobs (kein Celery)
- `mypy --strict` + `ruff` für Code-Qualität
- `pytest` mit >80% Coverage-Anforderung
- Alle Endpoints versioniert unter `/api/v1/`

### @frontend-dev
React 18, TypeScript strict, Tailwind CSS v4.
- `Zustand` für globalen State + `TanStack Query` für Server State
- Shared Stores aus `packages/shared-stores/`
- Lazy Loading für alle App-Routes (`React.lazy` + `Suspense`)
- Dark Mode + i18n (Deutsch + Englisch) von Anfang an
- Kein `console.log` in Production-Code

### @mobile-dev
React Native + Expo SDK 52 + NativeWind.
- Shared Stores + Types aus `packages/`
- `expo-secure-store` für Token-Storage (niemals AsyncStorage für sensible Daten)
- Metro Config korrekt für pnpm-Symlinks konfigurieren
- EAS Build für CI/CD

### @ai-dev
RAG und Agents — kein LangChain, kein LlamaIndex.
- RAG-Pipeline: `document_ingester` → `retriever` → `rag_chain` (eigene Implementierung)
- Agents: ReAct-Loop via OpenAI Function Calling (kein LangChain)
- Feature Flags `ENABLE_RAG` und `ENABLE_AGENTS` vorhanden und geprüft
- Kosten tracken: `AIUsage`-Entity für jeden API-Call (Model, Tokens, Kosten in USD)
- Kosten-Limit pro Tag konfigurierbar (`AI_COST_LIMIT_USD_PER_DAY`)

### @devops
Docker + Kubernetes + GitHub Actions.
- `docker-compose.dev.yml` für lokale Entwicklung
- `docker-compose.yml` für Produktion
- k3d Cluster + lokale Registry für lokales K8s-Testing
- GitHub Actions mit OIDC (keine Long-Lived Secrets in Workflows)
- HPA (Horizontal Pod Autoscaler) + PDB (Pod Disruption Budget) in K8s für Produktion

### @security
Auth, Secrets, CORS, DSGVO.
- JWT: Access Token 15 min (nur im Memory), Refresh 7 Tage (httpOnly Cookie)
- Google OAuth 2.0 via `authlib`
- Rate Limiting: `slowapi` (100 req/min pro IP, konfigurierbar)
- CORS: nur whitelisted Origins aus `CORS_ORIGINS` Env-Variable
- Security Headers: HSTS, CSP, X-Frame-Options, X-Content-Type-Options
- DSGVO: `DELETE /users/me` (Account löschen) + `GET /users/me/export` (Daten exportieren)

### @tester
Tests auf allen Ebenen.
- `pytest` + `pytest-asyncio` für Backend
- `factory_boy` für Test-Fixtures (keine hartkodierten Test-Daten)
- `Vitest` + React Testing Library für Frontend
- `Jest` + RNTL (React Native Testing Library) für Mobile
- E2E: `Playwright` für kritische User-Flows (Login, Checkout, etc.)

### @billing-dev
Stripe Integration.
- Stripe Webhooks: IMMER idempotent via ARQ-Queue verarbeiten (nie direkt im Webhook-Handler)
- `stripe.Webhook.construct_event()` für Signatur-Verifikation (Pflicht!)
- Subscription States: `trialing` → `active` → `past_due` → `canceled`
- Idempotency-Keys für alle Payment-Endpoints

### @business-coach
Strategie und Wachstum.
- OKR-Framework für Ziele und Key Results
- Build/Measure/Learn Cycle
- Docs: `docs/marketing/strategy.md` + `docs/marketing/kpi-tracker.md`

### @marketing
SEO und Wachstum.
- SEO: Meta-Tags, OG-Tags, `sitemap.xml`, `robots.txt`, `llms.txt`
- KPI-Dashboard: `/admin/analytics`
- Kampagnen-Templates: `docs/marketing/campaigns.md`

### @product-manager
Features und Roadmap.
- Feature-Flags für sichere Releases (niemals direkt in Production deployen ohne Flag)
- User Stories: "Als [Rolle] möchte ich [X] damit [Nutzen]"
- Jedes Feature: Dokumentation in `docs/features/`

### @data-analyst
Metriken und KPIs.
- KPIs: `docs/marketing/kpi-tracker.md`
- Metriken via Prometheus + Grafana
- PostHog optional für Produkt-Analytics

### @security-audit
Sicherheitsprüfungen.
- OWASP Top 10 prüfen bei jedem PR
- Secrets niemals in Logs oder Git
- Security Headers verifizieren
- Dependency-Scanning (Dependabot / pip-audit)

### @observability
Monitoring und Alerting.
- Prometheus Metriken + Loki Logs + Grafana Dashboards
- Alerts: Error-Rate >1% / P99 >1s / DB-Connections >80%
- Sentry für Production Error Tracking

### @api-design
API-Design und Standards.
- Versionierung: `/api/v1/` immer (Breaking Changes → `/api/v2/`)
- Fehlerformat: `{"error": "...", "code": "USER_NOT_FOUND"}`
- Idempotency-Keys für Payment-Endpoints
- Rate-Limit-Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`

### @log-fixer
Automatischer Bug-Fixer (via `scripts/log-watcher.py`).
- Wird bei echten Bugs aufgerufen (5xx Errors, unhandled Exceptions)
- User-Fehler (4xx) werden NUR geloggt, nicht automatisch behoben
- Cooldown: max. 1 Fix alle 5 Minuten
- Fix-Log: `~/.claude/error-fixes.log`

### @legal
DSGVO und Compliance.
- DSGVO Checkliste in `docs/features/auth.md`
- Data Retention Policies dokumentieren
- Privacy Policy + ToS Templates in `docs/`

### @customer-support
Support und Dokumentation.
- KB-Artikel in `docs/guides/`
- Ticket-Kategorien: Bug / Feature / Account

---

## Feature Flags (Kern-Infrastruktur)

Feature Flags werden über Umgebungsvariablen und die Datenbank gesteuert:

| Flag | Default | Beschreibung |
|---|---|---|
| `ENABLE_AI` | `true` | AI Chat aktivieren |
| `ENABLE_RAG` | `true` | Retrieval-Augmented Generation |
| `ENABLE_AGENTS` | `true` | ReAct Agents |
| `ENABLE_BILLING` | `false` | Stripe Billing (erst aktivieren wenn Preise konfiguriert) |
| `ENABLE_MULTI_TENANT` | `true` | Multi-Tenant-Isolation |
| `ENABLE_WEBSOCKETS` | `true` | WebSocket-Verbindungen für Echtzeit-Features |

Flags immer vor Feature-Code prüfen:
```python
if not settings.ENABLE_RAG:
    raise HTTPException(status_code=404, detail="Feature not available")
```

---

## Qualitätsgates vor jedem Merge

### Backend
- [ ] `mypy --strict` ohne Fehler
- [ ] `ruff check` ohne Fehler
- [ ] `pytest` mit >80% Coverage
- [ ] Keine Secrets in Code oder Logs
- [ ] Alembic Migration vorhanden (falls Schema-Änderung)

### Frontend
- [ ] TypeScript strict ohne Fehler
- [ ] Vitest grün
- [ ] Kein `console.log` in Production-Code
- [ ] i18n Strings für alle User-sichtbaren Texte

### AI Features
- [ ] Feature Flag vorhanden und geprüft
- [ ] AI Usage wird getrackt (AIUsage-Entity)
- [ ] Kosten-Limit konfiguriert

---

## Neues Feature hinzufügen (8-Schritte-Checkliste)

1. **ADR** in `docs/architecture/decisions/NNN-feature-name.md`
2. **Domain Entity** + **Port-Interface** in `core/domain/`
3. **Use Case** (Application Layer, kein Framework-Import)
4. **Adapter** (Input: API-Route; Output: Repository / externer Service)
5. **Alembic Migration** für Datenbank-Änderungen
6. **Tests** (unit für Domain/Use-Case + integration für Adapter)
7. **Feature-Doku** in `docs/features/feature-name.md`
8. **Feature Flag** registrieren (Env-Variable + Datenbank-Flag)

---

## Sicherheitsregeln

- `.env` Dateien NIEMALS lesen, ausgeben oder committen
- Vor jedem Commit prüfen: `git diff --staged | grep -i secret`
- GitHub OIDC für CI/CD (keine Long-Lived Secrets in Repository-Settings)
- Tokens nur in httpOnly Cookies oder sicheren Speichern (expo-secure-store)
- Niemals Passwörter oder Tokens in Logs schreiben

---

## Zentrales Konfigurations-System

Alle app-spezifischen Werte (App-Name, Ports, Namespace, Docker-Registry, GitHub-Org) leben in:

```
project.config.yaml
```

Nach einer Änderung alles neu propagieren:

```bash
python scripts/configure.py
```

Das Skript überschreibt automatisch:
- Kubernetes-Manifeste (`deploy/k8s/`)
- Docker-Compose-Dateien (`deploy/docker/`)
- GitHub-Actions-Workflows (`.github/workflows/`)
- Package-Namen in `package.json` Dateien

Niemals Werte in generierten Dateien direkt ändern — immer über `project.config.yaml`.

---

## Worktree-Struktur

Dieses Projekt nutzt Git Worktrees für parallele Agent-Arbeit:

```
.claude/worktrees/<branch-name>/   # Jeder Agent arbeitet in seinem eigenen Worktree
```

Agents dürfen NIEMALS direkt auf `main` pushen — immer über Feature-Branch + PR.
