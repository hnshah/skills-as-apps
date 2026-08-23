#!/usr/bin/env bash
set -euo pipefail

OPEN_LOOPS_DIR="${OPEN_LOOPS_DIR:-../open-loops}"
MODEL="${MODEL:-qwen3:8b}"
FIXTURE="${FIXTURE:-./fixtures/open-loops}"
OLLAMA_URL="${OLLAMA_URL:-http://127.0.0.1:11434}"

node dist/src/cli/main.js inspect "$OPEN_LOOPS_DIR"

echo "[preflight] checking Ollama at $OLLAMA_URL"
MODEL="$MODEL" OLLAMA_URL="$OLLAMA_URL" node --input-type=module <<'NODE'
const model = process.env.MODEL;
const base = process.env.OLLAMA_URL.replace(/\/$/, '');

let response;
try {
  response = await fetch(`${base}/api/tags`);
} catch (error) {
  console.error(`[preflight] could not reach Ollama at ${base}`);
  console.error('[preflight] start Ollama, then run this smoke test again.');
  process.exit(2);
}

if (!response.ok) {
  console.error(`[preflight] Ollama model discovery failed: HTTP ${response.status}`);
  process.exit(2);
}

const payload = await response.json();
const names = Array.isArray(payload.models)
  ? payload.models.map((entry) => entry?.name).filter(Boolean)
  : [];

if (!names.includes(model)) {
  console.error(`[preflight] model '${model}' is not installed.`);
  if (names.length) {
    console.error(`[preflight] installed models: ${names.join(', ')}`);
    console.error(`[preflight] rerun with one of them, for example: MODEL=${names[0]} ./scripts/open-loops-local-smoke.sh`);
  } else {
    console.error('[preflight] no installed Ollama models were reported.');
  }
  console.error(`[preflight] or install the intended smoke-test model with: ollama pull ${model}`);
  process.exit(2);
}

console.error(`[preflight] model ready: ${model}`);
NODE

node dist/src/cli/main.js run "$OPEN_LOOPS_DIR" \
  --model "$MODEL" \
  --ollama-url "$OLLAMA_URL" \
  --allow-read "$FIXTURE" \
  --objective "Find the important open loops in the authorized fixture. Search for closure before surfacing anything."
