#!/usr/bin/env bash
# pane-token-meter.sh — live token estimate and cost meter
# TOKN-01: chars/4 heuristic, all values labeled "~est."
# TOKN-02: per-model pricing from model-profiles config

NDJSON="${1:-}"
if [ -z "$NDJSON" ]; then
  echo "Usage: pane-token-meter.sh <ndjson-path>"
  exit 1
fi

# Resolve plugin root from env var or relative to this script
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"

# Model/pricing resolution — runs ONCE at startup
# Requires model-profiles.cjs and reads .planning/config.json
MODEL_INFO=$(node -e "
const path = require('path');
const fs = require('fs');

const pluginRoot = process.env.PLUGIN_ROOT || '${PLUGIN_ROOT}';

// Inline pricing table (Anthropic official rates, 2026-03-20)
const PRICING = {
  opus:   { input: 5.00,  output: 25.00, context_window: 1000000 },
  sonnet: { input: 3.00,  output: 15.00, context_window: 1000000 },
  haiku:  { input: 1.00,  output: 5.00,  context_window:  200000 },
};

let modelName = 'sonnet';
try {
  const { MODEL_PROFILES } = require(path.join(pluginRoot, 'bin/lib/model-profiles.cjs'));
  const configPath = path.join(pluginRoot, '.planning/config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const profile = (config.model_profile || 'balanced').toLowerCase();
  modelName = (MODEL_PROFILES['pde-executor'] || {})[profile] || 'sonnet';
} catch (err) {
  // fallback: sonnet
}

const p = PRICING[modelName] || PRICING['sonnet'];
process.stdout.write([modelName, p.input, p.output, p.context_window].join('|'));
" 2>/dev/null)

# Parse pipe-delimited output
MODEL_NAME="$(echo "${MODEL_INFO}" | cut -d'|' -f1)"
INPUT_PRICE="$(echo "${MODEL_INFO}" | cut -d'|' -f2)"
OUTPUT_PRICE="$(echo "${MODEL_INFO}" | cut -d'|' -f3)"
CONTEXT_WINDOW="$(echo "${MODEL_INFO}" | cut -d'|' -f4)"

# Fallbacks in case node failed
MODEL_NAME="${MODEL_NAME:-sonnet}"
INPUT_PRICE="${INPUT_PRICE:-3.00}"
OUTPUT_PRICE="${OUTPUT_PRICE:-15.00}"
CONTEXT_WINDOW="${CONTEXT_WINDOW:-1000000}"

# Header display
echo "[ token / cost ]  model: ${MODEL_NAME}  (~est.)"
echo ""

# Accumulator loop
TOTAL_TOKENS=0
EVENT_COUNT=0

tail -F "${NDJSON}" 2>/dev/null | while IFS= read -r line; do
  # chars/4 heuristic (TOKN-01)
  line_len=${#line}
  est_tokens=$(( line_len / 4 ))
  TOTAL_TOKENS=$(( TOTAL_TOKENS + est_tokens ))
  EVENT_COUNT=$(( EVENT_COUNT + 1 ))

  # Refresh display every 5 events OR for the first 5 events
  if [ $(( EVENT_COUNT % 5 )) -eq 0 ] || [ "$EVENT_COUNT" -le 5 ]; then
    # Compute cost via Node.js — 70/30 input/output split (TOKN-02)
    COST=$(node -e "
const tokens = ${TOTAL_TOKENS};
const inputPrice = ${INPUT_PRICE};
const outputPrice = ${OUTPUT_PRICE};
const cost = (tokens * 0.7 / 1e6 * inputPrice) + (tokens * 0.3 / 1e6 * outputPrice);
process.stdout.write('\$' + cost.toFixed(4) + ' ~est.');
" 2>/dev/null || echo "\$?.???? ~est.")

    # Move cursor to line 3 (after header) and clear downward
    printf '\033[3;1H\033[J'
    printf '  Events:      %d\n' "$EVENT_COUNT"
    printf '  Tokens:      %d (~est.)\n' "$TOTAL_TOKENS"
    printf '  Cost:        %s\n' "$COST"
    printf '\n'
    # Footer in dimmed gray
    printf '\033[90m  Heuristic: chars/4. Model: %s.\033[0m\n' "${MODEL_NAME}"
    printf '\033[90m  Pricing: $%s/$%s per MTok (input/output)\033[0m\n' "${INPUT_PRICE}" "${OUTPUT_PRICE}"
    printf '\033[90m  Scope: orchestrator only (not subagents)\033[0m\n'
    printf '\033[0m'
  fi
done
