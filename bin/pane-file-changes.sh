#!/usr/bin/env bash
# pane-file-changes.sh — streams file creation/modification events from NDJSON
# TMUX-04: File changes pane shows files created/modified in real-time
#
# Note: emit-event.cjs maps Write/Edit tool hooks to event_type "file_changed"
# (not "tool_use"). This script handles both for forward-compatibility.

NDJSON="${1:-}"
if [ -z "$NDJSON" ]; then
  echo "Usage: pane-file-changes.sh <ndjson-path>"
  exit 1
fi

echo "[ file changes ] waiting for session events..."
echo ""

tail -F "${NDJSON}" 2>/dev/null | while IFS= read -r line; do
  event_type=$(echo "$line" | jq -r '.event_type // empty' 2>/dev/null)
  case "$event_type" in
    file_changed|tool_use)
      tool=$(echo "$line" | jq -r '.tool_name // empty' 2>/dev/null)
      fpath=$(echo "$line" | jq -r '.file_path // empty' 2>/dev/null)
      ts=$(echo "$line" | jq -r '.ts | split("T")[1] | split(".")[0]' 2>/dev/null)
      if [ -n "$fpath" ]; then
        case "$tool" in
          Write)
            printf '\033[32m[%s] CREATE %s\033[0m\n' "$ts" "$fpath"
            ;;
          Edit)
            printf '\033[33m[%s] MODIFY %s\033[0m\n' "$ts" "$fpath"
            ;;
          *)
            printf '\033[34m[%s] %-6s %s\033[0m\n' "$ts" "$tool" "$fpath"
            ;;
        esac
      fi
      ;;
  esac
done
