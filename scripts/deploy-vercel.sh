#!/usr/bin/env bash
# scripts/deploy-vercel.sh — manual deploy to Vercel.
set -euo pipefail

if [ -z "${VERCEL_TOKEN:-}" ]; then
    echo "VERCEL_TOKEN env var required." >&2
    exit 1
fi

cd "$(dirname "$0")/../web"
vercel pull --yes --environment=production --token="$VERCEL_TOKEN"
vercel build --prod --token="$VERCEL_TOKEN"
vercel deploy --prebuilt --prod --token="$VERCEL_TOKEN" --yes