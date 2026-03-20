#!/usr/bin/env bash
# pane-log-stream.sh — streams all events as a colored log
# TMUX-05: Log stream pane shows structured event log with severity filtering
#
# Handles actual event types from emit-event.cjs:
#   file_changed (Write/Edit), bash_called (Bash), tool_called (other tools)
# Also handles future tool_use and pipeline events from Phase 62.

NDJSON="${1:-}"
if [ -z "$NDJSON" ]; then
  echo "Usage: pane-log-stream.sh <ndjson-path>"
  exit 1
fi

echo "[ log stream ] waiting for session events..."
echo ""

tail -F "${NDJSON}" 2>/dev/null | while IFS= read -r line; do
  event_type=$(echo "$line" | jq -r '.event_type // empty' 2>/dev/null)
  ts=$(echo "$line" | jq -r '.ts | split("T")[1] | split(".")[0]' 2>/dev/null)

  # Skip empty/unparseable lines
  [ -z "$event_type" ] && continue

  # Color by event severity/category
  case "$event_type" in
    session_start|session_end)
      # White bold — lifecycle events
      printf '\033[1;37m[%s] %s\033[0m\n' "$ts" "$event_type"
      ;;
    subagent_start|subagent_stop)
      agent=$(echo "$line" | jq -r '.agent_type // ""' 2>/dev/null)
      printf '\033[36m[%s] %-20s %s\033[0m\n' "$ts" "$event_type" "$agent"
      ;;
    file_changed|bash_called|tool_called|tool_use)
      # Gray — high frequency, low priority tool events
      tool=$(echo "$line" | jq -r '.tool_name // ""' 2>/dev/null)
      printf '\033[90m[%s] %-20s %s\033[0m\n' "$ts" "$event_type" "$tool"
      ;;
    phase_started|phase_complete|wave_started|wave_complete|plan_started|plan_complete)
      # Magenta — pipeline progress events (Phase 62)
      printf '\033[35m[%s] %s\033[0m\n' "$ts" "$event_type"
      ;;
    *)
      # Default gray for unknown event types — forward-compatible
      printf '\033[90m[%s] %s\033[0m\n' "$ts" "$event_type"
      ;;
  esac
done
