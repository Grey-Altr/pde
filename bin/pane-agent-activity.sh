#!/usr/bin/env bash
# pane-agent-activity.sh — streams agent spawn/complete events from NDJSON
# TMUX-02: Agent activity pane shows real-time agent spawn/complete events

NDJSON="${1:-}"
if [ -z "$NDJSON" ]; then
  echo "Usage: pane-agent-activity.sh <ndjson-path>"
  exit 1
fi

echo "[ agent activity ] waiting for session events..."
echo ""

tail -F "${NDJSON}" 2>/dev/null | while IFS= read -r line; do
  event_type=$(echo "$line" | jq -r '.event_type // empty' 2>/dev/null)
  case "$event_type" in
    subagent_start)
      ts=$(echo "$line" | jq -r '.ts | split("T")[1] | split(".")[0]' 2>/dev/null)
      agent=$(echo "$line" | jq -r '.agent_type // "agent"' 2>/dev/null)
      printf '\033[32m[%s] SPAWN  %s\033[0m\n' "$ts" "$agent"
      ;;
    subagent_stop)
      ts=$(echo "$line" | jq -r '.ts | split("T")[1] | split(".")[0]' 2>/dev/null)
      agent=$(echo "$line" | jq -r '.agent_type // "agent"' 2>/dev/null)
      printf '\033[33m[%s] DONE   %s\033[0m\n' "$ts" "$agent"
      ;;
  esac
done
