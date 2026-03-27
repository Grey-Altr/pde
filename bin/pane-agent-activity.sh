#!/usr/bin/env bash
# pane-agent-activity.sh — streams agent spawn/complete events from NDJSON
# TMX-02: Pane 1 shows all session spawns with [L]/[R] tags and per-session ANSI color

NDJSON="${1:-}"
if [ -z "$NDJSON" ]; then
  echo "Usage: pane-agent-activity.sh <ndjson-path>"
  exit 1
fi

ansi_color() {
  case "$1" in
    0) printf '\033[38;5;33m' ;;    # blue
    1) printf '\033[38;5;82m' ;;    # green
    2) printf '\033[38;5;129m' ;;   # violet
    3) printf '\033[38;5;214m' ;;   # amber
    4) printf '\033[38;5;197m' ;;   # rose
    *) printf '\033[38;5;51m' ;;    # cyan (index 5 + wrap)
  esac
}

echo "[ agent activity ] waiting for multi-session events..."
echo ""

tail -F "${NDJSON}" 2>/dev/null | while IFS= read -r line; do
  parsed=$(echo "$line" | jq -r '[
    (.event_type // ""),
    (.ts | split("T")[1] | split(".")[0]),
    (.agent_type // "agent"),
    (._pde_session_source // "L"),
    (._pde_color_index // 0 | tostring)
  ] | join("|")' 2>/dev/null)
  IFS='|' read -r event_type ts agent source color_idx <<< "$parsed"
  [ -z "$event_type" ] && continue

  case "$event_type" in
    subagent_start|subagent_stop)
      if [ "$event_type" = "subagent_start" ]; then action="SPAWN"; else action="DONE "; fi
      color=$(ansi_color "$color_idx")
      printf "${color}[%s] [%s] %s  %s\033[0m\n" "$source" "$ts" "$action" "$agent"
      ;;
  esac
done
