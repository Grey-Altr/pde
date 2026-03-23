#!/usr/bin/env bash
# pane-experiment.sh — live experiment progress display
# Phase 106: OBS-02 — experiment pane for tmux dashboard
#
# Displays: current iteration, best metric, keep/discard/crash counts,
# keep ratio, and estimated remaining budget — updating in real time.
#
# Usage: pane-experiment.sh <ndjson-path>

NDJSON="${1:-}"
if [ -z "$NDJSON" ]; then
  echo "Usage: pane-experiment.sh <ndjson-path>"
  exit 1
fi

# ── Initial display ──────────────────────────────────────────────────────────
echo "[ experiment progress ] waiting for experiment events..."
echo ""

# ── State variables ──────────────────────────────────────────────────────────
SLUG=""
CURRENT_ITER=0
BEST_METRIC="N/A"
BUDGET_USED=0
BUDGET_TOTAL=0
KEEP_COUNT=0
DISCARD_COUNT=0
CRASH_COUNT=0
EXPERIMENT_ACTIVE=false

# ── Render function ──────────────────────────────────────────────────────────
render() {
  local total_non_crash=$(( KEEP_COUNT + DISCARD_COUNT ))
  local keep_ratio
  if [ "$total_non_crash" -gt 0 ]; then
    keep_ratio=$(awk "BEGIN { printf \"%.0f%%\", ($KEEP_COUNT / $total_non_crash) * 100 }")
  else
    keep_ratio="N/A"
  fi

  local remaining=$(( BUDGET_TOTAL - BUDGET_USED ))

  # Move cursor to line 3 and clear downward
  printf '\033[3;1H\033[J'

  if [ -n "$SLUG" ]; then
    printf '  Experiment:  %s\n' "$SLUG"
    printf '  Status:      %s\n' "$([ "$EXPERIMENT_ACTIVE" = "true" ] && echo "RUNNING" || echo "COMPLETE")"
    printf '\n'
    printf '  Iteration:   %d / %d\n' "$CURRENT_ITER" "$BUDGET_TOTAL"
    printf '  Best Metric: %s\n' "$BEST_METRIC"
    printf '\n'
    printf '  Keep:        %d\n' "$KEEP_COUNT"
    printf '  Discard:     %d\n' "$DISCARD_COUNT"
    printf '  Crash:       %d\n' "$CRASH_COUNT"
    printf '  Keep Ratio:  %s\n' "$keep_ratio"
    printf '\n'
    printf '  Remaining:   %d iterations\n' "$remaining"
  else
    printf '  No active experiment.\n'
    printf '  Run /pde:optimize to start an experiment.\n'
  fi
}

# ── NDJSON event stream ──────────────────────────────────────────────────────
tail -F "${NDJSON}" 2>/dev/null | while IFS= read -r line; do
  event_type=$(echo "$line" | jq -r '.event_type // empty' 2>/dev/null)

  case "$event_type" in
    experiment.start)
      SLUG=$(echo "$line" | jq -r '.slug // ""' 2>/dev/null)
      BUDGET_TOTAL=$(echo "$line" | jq -r '.budget_total // 0' 2>/dev/null)
      BUDGET_USED=0
      CURRENT_ITER=0
      BEST_METRIC="N/A"
      KEEP_COUNT=0
      DISCARD_COUNT=0
      CRASH_COUNT=0
      EXPERIMENT_ACTIVE=true
      # Print header on new experiment
      printf '\033[1;1H\033[2J'
      echo "[ experiment progress ] active"
      echo ""
      render
      ;;

    experiment.iteration)
      CURRENT_ITER=$(echo "$line" | jq -r '.iteration // 0' 2>/dev/null)
      BUDGET_USED=$(echo "$line" | jq -r '.budget_used // 0' 2>/dev/null)
      render
      ;;

    experiment.keep)
      KEEP_COUNT=$(( KEEP_COUNT + 1 ))
      BEST_METRIC=$(echo "$line" | jq -r '.best_metric // "N/A"' 2>/dev/null)
      CURRENT_ITER=$(echo "$line" | jq -r '.iteration // 0' 2>/dev/null)
      BUDGET_USED=$(echo "$line" | jq -r '.budget_used // 0' 2>/dev/null)
      render
      ;;

    experiment.discard)
      DISCARD_COUNT=$(( DISCARD_COUNT + 1 ))
      CURRENT_ITER=$(echo "$line" | jq -r '.iteration // 0' 2>/dev/null)
      BUDGET_USED=$(echo "$line" | jq -r '.budget_used // 0' 2>/dev/null)
      render
      ;;

    experiment.crash)
      CRASH_COUNT=$(( CRASH_COUNT + 1 ))
      CURRENT_ITER=$(echo "$line" | jq -r '.iteration // 0' 2>/dev/null)
      BUDGET_USED=$(echo "$line" | jq -r '.budget_used // 0' 2>/dev/null)
      render
      ;;

    experiment.complete)
      EXPERIMENT_ACTIVE=false
      CURRENT_ITER=$(echo "$line" | jq -r '.iteration // 0' 2>/dev/null)
      BUDGET_USED=$(echo "$line" | jq -r '.budget_used // 0' 2>/dev/null)
      render
      ;;
  esac
done
