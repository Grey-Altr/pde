#!/usr/bin/env bash
# pane-context-window.sh — orchestrator context window utilization
# TOKN-03: percentage with "Orchestrator context (~estimated)" label

NDJSON="${1:-}"
if [ -z "$NDJSON" ]; then
  echo "[ context window ]"
  echo ""
  echo "  Orchestrator context (~estimated)"
  echo ""
  echo "  No NDJSON path provided."
  echo "  Scope: orchestrator only (not subagents)"
  while true; do sleep 60; done
fi

# Resolve plugin root
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"

# Resolve context window size once at startup via model-profiles.cjs
CONTEXT_WINDOW=$(node -e "
  try {
    const profiles = require('${PLUGIN_ROOT}/bin/lib/model-profiles.cjs');
    const fs = require('fs');
    const path = require('path');
    const cfgPath = path.join(process.cwd(), '.planning', 'config.json');
    let profile = 'balanced';
    try {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      if (cfg.model_profile) profile = cfg.model_profile;
    } catch (_) {}
    const tier = (profiles.MODEL_PROFILES['pde-executor'] || {})[profile] || 'sonnet';
    const CONTEXT = { opus: 1000000, sonnet: 1000000, haiku: 200000 };
    console.log(CONTEXT[tier] || 1000000);
  } catch (_) {
    console.log(1000000);
  }
" 2>/dev/null)
CONTEXT_WINDOW="${CONTEXT_WINDOW:-1000000}"

# Header display
echo "[ context window ]"
echo ""
echo "  Orchestrator context (~estimated)"
echo ""

# Accumulator loop with visual bar
TOTAL_TOKENS=0
EVENT_COUNT=0
BAR_WIDTH=32

tail -F "${NDJSON}" 2>/dev/null | while IFS= read -r line; do
  line_len=${#line}
  est_tokens=$(( line_len / 4 ))
  TOTAL_TOKENS=$(( TOTAL_TOKENS + est_tokens ))
  EVENT_COUNT=$(( EVENT_COUNT + 1 ))

  # Refresh display every 5 events or for the first 5 events
  if [ $(( EVENT_COUNT % 5 )) -eq 0 ] || [ "$EVENT_COUNT" -le 5 ]; then
    PCT=$(( TOTAL_TOKENS * 100 / CONTEXT_WINDOW ))
    if [ "$PCT" -gt 100 ]; then PCT=100; fi

    FILLED=$(( PCT * BAR_WIDTH / 100 ))
    BAR=""
    i=0
    while [ "$i" -lt "$FILLED" ]; do
      BAR="${BAR}#"
      i=$(( i + 1 ))
    done
    while [ "$i" -lt "$BAR_WIDTH" ]; do
      BAR="${BAR} "
      i=$(( i + 1 ))
    done

    # Move cursor to line 4 (after header) and clear to end
    printf '\033[4;1H\033[J'
    printf '  Usage:  %d%%  (~est.)\n' "$PCT"
    printf '\n'
    printf '  [%s]\n' "$BAR"
    printf '\n'
    printf '  %d / %d tokens (~est.)\n' "$TOTAL_TOKENS" "$CONTEXT_WINDOW"
    printf '  Scope: orchestrator only (not subagents)\n'
  fi
done
