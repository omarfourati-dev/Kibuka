# Getting Started

This guide walks through setting up a local development environment from a fresh clone.

---

## Prerequisites

- **Python 3.12+** — `python --version`
- **Node.js 20+** — `node --version`
- **pnpm 9+** — `npm install -g pnpm`
- **Docker + Docker Compose** — `docker --version`
- **Git** — `git --version`

Optional (for mobile development):

- Expo Go app on your phone, or Android Studio / Xcode for emulators

---

## Step 1: Clone and Configure

```bash
git clone https://github.com/your-org/your-repo.git my-app
cd my-app
```

Open `project.config.yaml` and update the values for your project:

```yaml
app_name: my-app # Used in K8s resource names, Docker image names
app_title: "My App" # Display name in docs and UI
app_domain: myapp.com # Production domain
docker_registry: ghcr.io/your-org
github_org: your-org
```

Run the configuration propagation script to apply these values everywhere:

```bash
python scripts/configure.py
```

This rewrites Kubernetes manifests, Docker Compose files, GitHub Actions workflows, and `package.json` files with your values. Do not edit those generated files directly.

---

## Step 2: Set Up Environment Variables

Copy the example env file:

```bash
cp .env.example .env
```

Open `.env` and fill in the required values:

```bash
# Required for all deployments
SECRET_KEY=                  # generate: openssl rand -hex 32
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/myapp
REDIS_URL=redis://localhost:6379

# Required for Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

# Required for AI features (pick at least one)
LLM_PROVIDER=openai
OPENAI_API_KEY=

# Optional — leave empty to disable
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
SENTRY_DSN=
```

See the feature-specific docs for additional variables when enabling billing, agents, etc.

---

## Step 3: Run Setup

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

This script:

1. Creates and activates a Python virtual environment (`backend/.venv`)
2. Installs Python dependencies (`pip install -e ".[dev]"`)
3. Installs Node dependencies (`pnpm install`)
4. Starts PostgreSQL and Redis via Docker Compose
5. Runs Alembic migrations to create the database schema
6. Creates the default admin user

---

## Step 4: Start the Development Stack

```bash
./scripts/dev.sh
```

This starts all services in parallel with hot reload:

| Service                | URL                                 |
| ---------------------- | ----------------------------------- |
| **Backend API**        | http://localhost:8000               |
| **API Docs (Swagger)** | http://localhost:8000/docs          |
| **Frontend**           | http://localhost:5173               |
| **Grafana**            | http://localhost:3001 (admin/admin) |

For mobile development, start the Expo dev server separately:

```bash
cd apps/mobile
pnpm expo start
```

Scan the QR code with Expo Go, or press `a` for Android emulator / `i` for iOS simulator.

---

## Step 5: Verify the Setup

1. Open http://localhost:5173 — you should see the login page
2. Open http://localhost:8000/docs — you should see the Swagger UI
3. Open http://localhost:8000/health — should return `{"status": "ok"}`

If the health check fails, check:

- Docker containers are running: `docker ps`
- Migrations ran successfully: `cd apps/backend && alembic current`
- Environment variables are set: `cat .env`

---

## Common Issues

### Port conflicts

If ports 5432, 6379, 8000, or 5173 are already in use, edit `deploy/docker/docker-compose.dev.yml` and `apps/backend/config/settings.py` to use different ports.

### pnpm symlink issues on Windows

On Windows, pnpm requires Developer Mode to create symlinks. Enable it via Settings → System → Developer Mode, then re-run `pnpm install`.

### Database connection refused

Make sure the Docker containers are running:

```bash
docker compose -f deploy/docker/docker-compose.dev.yml up -d postgres redis
```

### Google OAuth redirect mismatch

The redirect URI in `.env` must match exactly what is configured in the Google Cloud Console (including `http://` vs `https://` and trailing slashes).

---

## Next Steps

- Read `docs/architecture/overview.md` to understand the codebase structure
- Read the feature docs in `docs/features/` for anything you want to enable
- Run `./scripts/dev.sh --help` to see additional development commands
