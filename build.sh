#!/usr/bin/env bash
set -euo pipefail

SKAFFOLD_FILE="${1:-skaffold.yaml}"

CURRENT_DIR="$(basename "$PWD")"
BUILD_FILE="${SKAFFOLD_FILE%.yaml}.build.json"

echo "  [BUILD] Building '${SKAFFOLD_FILE}' in context '${CURRENT_DIR}'..."

if [[ ! -f "$SKAFFOLD_FILE" ]]; then
    echo "  [BUILD ERROR] '$SKAFFOLD_FILE' not found in $(pwd)" >&2
    exit 1
fi

skaffold build \
    -f "$SKAFFOLD_FILE" \
    --cache-artifacts=false \
    --file-output="$BUILD_FILE"

echo "  [BUILD SUCCESS] Generated ${BUILD_FILE}"