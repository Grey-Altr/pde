#!/usr/bin/env bash
# pane-pipeline-progress.sh — streams phase/plan/task completion events
# TMUX-03: Pipeline progress pane shows phase/plan/task completion with wave-aware indicators

NDJSON="${1:-}"
if [ -z "$NDJSON" ]; then
  echo "Usage: pane-pipeline-progress.sh <ndjson-path>"
  exit 1
fi

echo "[ pipeline progress ] waiting for session events..."
echo ""

tail -F "${NDJSON}" 2>/dev/null | while IFS= read -r line; do
  event_type=$(echo "$line" | jq -r '.event_type // empty' 2>/dev/null)
  case "$event_type" in
    phase_started)
      ts=$(echo "$line" | jq -r '.ts | split("T")[1] | split(".")[0]' 2>/dev/null)
      phase=$(echo "$line" | jq -r '.phase_name // "phase"' 2>/dev/null)
      printf '\033[36m[%s] PHASE START  %s\033[0m\n' "$ts" "$phase"
      ;;
    phase_complete)
      ts=$(echo "$line" | jq -r '.ts | split("T")[1] | split(".")[0]' 2>/dev/null)
      phase=$(echo "$line" | jq -r '.phase_name // "phase"' 2>/dev/null)
      printf '\033[32m[%s] PHASE DONE   %s\033[0m\n' "$ts" "$phase"
      ;;
    wave_started)
      ts=$(echo "$line" | jq -r '.ts | split("T")[1] | split(".")[0]' 2>/dev/null)
      wave=$(echo "$line" | jq -r '.wave_number // "?"' 2>/dev/null)
      printf '\033[36m[%s]   WAVE %s START\033[0m\n' "$ts" "$wave"
      ;;
    wave_complete)
      ts=$(echo "$line" | jq -r '.ts | split("T")[1] | split(".")[0]' 2>/dev/null)
      wave=$(echo "$line" | jq -r '.wave_number // "?"' 2>/dev/null)
      printf '\033[32m[%s]   WAVE %s DONE\033[0m\n' "$ts" "$wave"
      ;;
    plan_started)
      ts=$(echo "$line" | jq -r '.ts | split("T")[1] | split(".")[0]' 2>/dev/null)
      plan=$(echo "$line" | jq -r '.plan_id // "plan"' 2>/dev/null)
      printf '\033[33m[%s]     PLAN START  %s\033[0m\n' "$ts" "$plan"
      ;;
    plan_complete)
      ts=$(echo "$line" | jq -r '.ts | split("T")[1] | split(".")[0]' 2>/dev/null)
      plan=$(echo "$line" | jq -r '.plan_id // "plan"' 2>/dev/null)
      printf '\033[32m[%s]     PLAN DONE   %s\033[0m\n' "$ts" "$plan"
      ;;
  esac
done
