#!/usr/bin/env bash
# pane-context-window.sh — orchestrator context utilization display
# TMUX-07: Context window pane shows orchestrator context utilization labeled as estimate

echo "[ context window ]"
echo ""
echo "  Orchestrator context (~estimated)"
echo ""
echo "  Usage:  -- % (awaiting Phase 61)"
echo ""
echo "  ################################"
echo "  [                              ]"
echo "  ################################"
echo ""
printf '\033[90m  Context metering available after Phase 61\033[0m\n'
printf '\033[90m  Scope: orchestrator only (not subagents)\033[0m\n'

# Keep the pane alive — this is a static display until Phase 61
# Phase 61 will replace this with a live updating script
while true; do
  sleep 60
done
