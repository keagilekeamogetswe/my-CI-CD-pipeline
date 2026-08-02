#!/usr/bin/env bash
set -euo pipefail

SKAFFOLD_FILE="${1:-skaffold.yaml}"

CURRENT_DIR="$(basename "$PWD")"
BUILD_FILE="${SKAFFOLD_FILE%.yaml}.build.json"

echo "  [DEPLOY] Deploying '${SKAFFOLD_FILE}' in context '${CURRENT_DIR}'..."

if [[ ! -f "$SKAFFOLD_FILE" ]]; then
    echo "  [DEPLOY ERROR] '$SKAFFOLD_FILE' not found in $(pwd)" >&2
    exit 1
fi

if [[ ! -f "$BUILD_FILE" ]]; then
    echo "  [DEPLOY ERROR] '$BUILD_FILE' not found." >&2
    exit 1
fi

echo "  [k3d] Importing built images into cluster 'dev'..."

while IFS= read -r img; do
    if [[ -n "$img" ]]; then
        echo "  --> Importing $img"
        k3d image import "$img" -c dev || true
    fi
done < <(grep -oP '"tag":"\K[^"]+' "$BUILD_FILE")

skaffold deploy \
    -f "$SKAFFOLD_FILE" \
    --status-check=true \
    --build-artifacts="$BUILD_FILE"

echo "  [DEPLOY SUCCESS] ${SKAFFOLD_FILE}"