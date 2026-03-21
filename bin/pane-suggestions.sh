#!/usr/bin/env bash
# pane-suggestions.sh — idle suggestion display pane (DASH-02, DASH-03)

SUGG_PATH="${1:-}"
if [ -z "$SUGG_PATH" ]; then
  echo "Usage: pane-suggestions.sh <suggestions-file-path>"
  exit 1
fi

echo "[ suggestions ]"
echo ""

while true; do
  printf '\033[3;1H\033[J'
  if [ -f "${SUGG_PATH}" ]; then
    cat "${SUGG_PATH}"
  else
    printf '%s\n' "Waiting for PDE to start a phase. Suggestions will appear when a phase completes."
  fi
  sleep 3
done
