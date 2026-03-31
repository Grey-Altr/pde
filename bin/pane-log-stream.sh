#!/usr/bin/env bash
# pane-log-stream.sh — streams all events as a colored log with session prefix
# TMX-03: Pane 4 multiplexes all active sessions with color prefix per session
#
# Handles actual event types from emit-event.cjs:
#   file_changed (Write/Edit), bash_called (Bash), tool_called (other tools)
# Also handles future tool_use and pipeline events from Phase 62.

NDJSON="${1:-}"
if [ -z "$NDJSON" ]; then
  echo "Usage: pane-log-stream.sh <ndjson-path>"
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

echo "[ log stream ] waiting for multi-session events..."
echo ""

tail -F "${NDJSON}" 2>/dev/null | while IFS= read -r line; do
  parsed=$(echo "$line" | jq -r '[
    (.event_type // ""),
    (.ts | split("T")[1] | split(".")[0]),
    (._pde_session_id // "unknown" | split("-") | last | .[0:4]),
    (._pde_color_index // 0 | tostring),
    (.agent_type // ""),
    (.tool_name // ""),
    (.slug // "")
  ] | join("|")' 2>/dev/null)
  IFS='|' read -r event_type ts sid_short color_idx agent tool slug <<< "$parsed"
  [ -z "$event_type" ] && continue

  color=$(ansi_color "$color_idx")
  prefix="${color}[${sid_short}]\033[0m "

  # Color by event severity/category
  case "$event_type" in
    session_start|session_end)
      # White bold — lifecycle events
      printf "${prefix}\033[1;37m[%s] %s\033[0m\n" "$ts" "$event_type"
      ;;
    subagent_start|subagent_stop)
      printf "${prefix}\033[36m[%s] %-20s %s\033[0m\n" "$ts" "$event_type" "$agent"
      ;;
    file_changed|bash_called|tool_called|tool_use)
      # Gray — high frequency, low priority tool events
      printf "${prefix}\033[90m[%s] %-20s %s\033[0m\n" "$ts" "$event_type" "$tool"
      ;;
    phase_started|phase_complete|wave_started|wave_complete|plan_started|plan_complete)
      # Magenta — pipeline progress events (Phase 62)
      printf "${prefix}\033[35m[%s] %s\033[0m\n" "$ts" "$event_type"
      ;;
    experiment.*)
      # Cyan — experiment lifecycle events (Phase 106)
      printf "${prefix}\033[36m[%s] %-20s %s\033[0m\n" "$ts" "$event_type" "$slug"
      ;;
    firecrawl_operation)
      # Cyan — Firecrawl operation events (Phase 203)
      op=$(echo "$line" | jq -r '.operation // ""' 2>/dev/null)
      wc=$(echo "$line" | jq -r '.word_count // 0' 2>/dev/null)
      url_short=$(echo "$line" | jq -r '.url // ""' 2>/dev/null | sed 's|https\?://||' | cut -c1-40)
      printf "${prefix}\033[36m[%s] %-20s %-8s %s (%s words)\033[0m\n" "$ts" "$event_type" "$op" "$url_short" "$wc"
      ;;
    *)
      # Default gray for unknown event types — forward-compatible
      printf "${prefix}\033[90m[%s] %s\033[0m\n" "$ts" "$event_type"
      ;;
  esac
done
