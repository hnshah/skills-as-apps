#!/usr/bin/env bash
set -euo pipefail
OPEN_LOOPS_DIR="${OPEN_LOOPS_DIR:-../open-loops}"
MODEL="${MODEL:-qwen3:8b}"
FIXTURE="${FIXTURE:-./fixtures/open-loops}"
node dist/src/cli/main.js inspect "$OPEN_LOOPS_DIR"
node dist/src/cli/main.js run "$OPEN_LOOPS_DIR" \
  --model "$MODEL" \
  --allow-read "$FIXTURE" \
  --objective "Find the important open loops in the authorized fixture. Search for closure before surfacing anything."
