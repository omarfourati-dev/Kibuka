#!/bin/bash
set -euo pipefail
echo "=== Omar's App Template — Dev Setup ==="

# Check prerequisites
command -v docker &>/dev/null || { echo "ERROR: Docker not installed"; exit 1; }
command -v pnpm &>/dev/null || { echo "ERROR: pnpm not installed. Run: npm install -g pnpm"; exit 1; }
command -v python3 &>/dev/null || { echo "ERROR: Python 3 not installed"; exit 1; }
command -v uv &>/dev/null || { echo "Installing uv..."; pip install uv; }

# Create .env if missing
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✓ Created .env from .env.example — please fill in your secrets!"
fi

# Install Node dependencies
echo "Installing Node dependencies..."
pnpm install

# Install Python dependencies
echo "Installing Python dependencies..."
cd apps/backend && uv sync && cd ../..

echo ""
echo "✅ Setup complete! Next steps:"
echo "   1. Edit .env and fill in your secrets"
echo "   2. Run: pnpm dev (starts all services)"
