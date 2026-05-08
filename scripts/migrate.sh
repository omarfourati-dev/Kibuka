#!/bin/bash
set -euo pipefail
cd apps/backend
echo "Running Alembic migrations..."
uv run alembic upgrade head
echo "✓ Migrations complete"

# Show current revision
uv run alembic current
