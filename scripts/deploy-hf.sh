#!/usr/bin/env bash
# scripts/deploy-hf.sh — manual push to HF Space (CI uses GitHub Actions).
set -euo pipefail

HF_USERNAME="${HF_USERNAME:-kaidjuric}"
HF_SPACE_NAME="${HF_SPACE_NAME:-muscriptor-video}"

if ! command -v huggingface-cli >/dev/null 2>&1; then
    pip install --quiet "huggingface_hub>=0.25.0"
fi

if [ -z "${HF_TOKEN:-}" ]; then
    echo "HF_TOKEN env var required." >&2
    exit 1
fi

huggingface-cli login --token "$HF_TOKEN" --add-to-git-credential >/dev/null

cd "$(dirname "$0")/../inference"

python - <<PY
from huggingface_hub import HfApi
import os
api = HfApi()
api.upload_folder(
    folder_path=".",
    repo_id=f"{os.environ['HF_USERNAME']}/{os.environ['HF_SPACE_NAME']}",
    repo_type="space",
    commit_message=f"Manual deploy",
)
print(f"Pushed to {os.environ['HF_USERNAME']}/{os.environ['HF_SPACE_NAME']}")
PY