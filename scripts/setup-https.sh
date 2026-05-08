#!/bin/bash
set -euo pipefail
echo "=== Setting up local HTTPS ==="

# Check mkcert
if ! command -v mkcert &>/dev/null; then
  echo "Installing mkcert..."
  if command -v brew &>/dev/null; then
    brew install mkcert
  elif command -v apt-get &>/dev/null; then
    sudo apt-get install -y libnss3-tools
    curl -L https://github.com/FiloSottile/mkcert/releases/latest/download/mkcert-linux-amd64 -o /usr/local/bin/mkcert
    chmod +x /usr/local/bin/mkcert
  else
    echo "Please install mkcert manually: https://github.com/FiloSottile/mkcert"
    exit 1
  fi
fi

mkcert -install
mkcert myapp.local "*.myapp.local" localhost 127.0.0.1

mkdir -p certs
mv myapp.local+3.pem certs/cert.pem
mv myapp.local+3-key.pem certs/key.pem

echo "✓ Certificates created in certs/"
echo ""
echo "Add to /etc/hosts:"
echo "  127.0.0.1 myapp.local"
echo ""
echo "Update .env:"
echo "  APP_URL=https://myapp.local"
echo "  CORS_ORIGINS=[\"https://myapp.local\"]"
