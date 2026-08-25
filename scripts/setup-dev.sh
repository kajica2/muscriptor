#!/usr/bin/env bash
# scripts/setup-dev.sh — bring up local dev env.
set -euo pipefail

echo "==> Cloning is unnecessary — you're already inside the repo."
echo "==> Installing Node deps via pnpm..."
pnpm install

echo "==> Setting up inference Python venv..."
cd inference
[ -d .venv ] || python3.12 -m venv .venv
source .venv/bin/activate
pip install -q -r requirements.txt
pip install -q ruff mypy pytest pytest-cov
deactivate
cd ..

echo "==> Linking Vercel project..."
cd web
vercel link --yes || true
cd ..

if [ ! -f .env.local ]; then
    cp .env.example .env.local
    echo "==> Created .env.local — fill in Upstash/Clerk/Blob/HF_API_KEY."
fi

echo "==> Done. Run: turbo dev"