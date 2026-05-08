#!/bin/bash
set -euo pipefail
echo "=== Starting development stack ==="

# Start infra services
echo "Starting PostgreSQL and Redis..."
docker compose -f deploy/docker/docker-compose.dev.yml up -d db redis

# Wait for postgres to be ready
echo "Waiting for PostgreSQL..."
until docker compose -f deploy/docker/docker-compose.dev.yml exec db pg_isready -U "${DB_USER:-myapp}" -d "${DB_NAME:-myapp_dev}" 2>/dev/null; do
  sleep 1
done
echo "✓ PostgreSQL ready"

# Run migrations
echo "Running migrations..."
cd apps/backend && uv run alembic upgrade head && cd ../..
echo "✓ Migrations complete"

# Start all apps via Turborepo
echo "Starting all apps (frontend, backend, mobile)..."
pnpm dev
