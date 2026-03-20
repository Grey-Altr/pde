#!/usr/bin/env bash
# pane-token-meter.sh — running token estimate and cost from NDJSON stream
# TMUX-06: Token/cost meter pane shows running token estimate (~est.) and approximate cost

NDJSON="${1:-}"
if [ -z "$NDJSON" ]; then
  echo "Usage: pane-token-meter.sh <ndjson-path>"
  exit 1
fi

echo "[ token / cost ] waiting for session events..."
echo ""

# Accumulate estimated tokens using chars/4 heuristic
# Phase 61 will add per-model pricing — for now, show token count only
TOTAL_TOKENS=0
EVENT_COUNT=0

tail -F "${NDJSON}" 2>/dev/null | while IFS= read -r line; do
  # Count bytes in the line as a proxy for content size
  line_len=${#line}
  # chars/4 heuristic (TOKN-01)
  est_tokens=$(( line_len / 4 ))
  TOTAL_TOKENS=$(( TOTAL_TOKENS + est_tokens ))
  EVENT_COUNT=$(( EVENT_COUNT + 1 ))

  # Refresh display every 5 events to reduce flicker
  if [ $(( EVENT_COUNT % 5 )) -eq 0 ] || [ "$EVENT_COUNT" -le 5 ]; then
    # Move cursor to line 3 (after header) and clear
    printf '\033[3;1H\033[J'
    printf '  Events:      %d\n' "$EVENT_COUNT"
    printf '  Tokens:      %d (~est.)\n' "$TOTAL_TOKENS"
    printf '  Cost:        pending (Phase 61)\n'
    printf '\n'
    printf '\033[90m  Token estimate uses chars/4 heuristic\033[0m\n'
  fi
done
