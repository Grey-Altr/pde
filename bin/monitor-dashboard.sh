#!/usr/bin/env bash
# bin/monitor-dashboard.sh
# PDE monitoring dashboard — launches a named tmux session with adaptive pane layout.
# Handles: tmux detection (DEPS-01), platform-aware install (DEPS-02),
# consent-gated auto-install (DEPS-03), session creation (TMUX-01),
# remain-on-exit (TMUX-08), adaptive layout (TMUX-09), nested tmux (TMUX-10).

SESSION="pde-monitor"
MIN_COLS=120
MIN_ROWS=30
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"

# ── DEPS-01: tmux detection ──────────────────────────────────────────────────
if ! command -v tmux &>/dev/null; then
  echo ""
  echo "tmux is not installed. The PDE monitoring dashboard requires tmux."
  echo ""

  # ── DEPS-02: Platform-aware install instructions ─────────────────────────
  PLATFORM=$(uname -s)
  INSTALLER_AVAILABLE="no"
  INSTALL_CMD=""

  if [ "$PLATFORM" = "Darwin" ]; then
    echo "Install with Homebrew:"
    echo "  brew install tmux"
    INSTALL_CMD="brew install tmux"
    if command -v brew &>/dev/null; then
      INSTALLER_AVAILABLE="yes"
    else
      echo ""
      echo "Homebrew is not installed. Install Homebrew first: https://brew.sh"
      INSTALLER_AVAILABLE="no"
    fi
  elif [ "$PLATFORM" = "Linux" ]; then
    if command -v apt-get &>/dev/null; then
      echo "Install with apt:"
      echo "  sudo apt-get install -y tmux"
      INSTALL_CMD="sudo apt-get install -y tmux"
      INSTALLER_AVAILABLE="yes"
    elif command -v dnf &>/dev/null; then
      echo "Install with dnf:"
      echo "  sudo dnf install -y tmux"
      INSTALL_CMD="sudo dnf install -y tmux"
      INSTALLER_AVAILABLE="yes"
    elif command -v yum &>/dev/null; then
      echo "Install with yum:"
      echo "  sudo yum install -y tmux"
      INSTALL_CMD="sudo yum install -y tmux"
      INSTALLER_AVAILABLE="yes"
    elif command -v pacman &>/dev/null; then
      echo "Install with pacman:"
      echo "  sudo pacman -S tmux"
      INSTALL_CMD="sudo pacman -S tmux"
      INSTALLER_AVAILABLE="yes"
    else
      echo "No recognized package manager found."
      echo "Please install tmux manually: https://github.com/tmux/tmux/wiki/Installing"
      INSTALLER_AVAILABLE="no"
    fi
  else
    echo "Unknown platform: $PLATFORM"
    echo "Please install tmux manually: https://github.com/tmux/tmux/wiki/Installing"
    INSTALLER_AVAILABLE="no"
  fi

  # ── DEPS-03: Consent-gated auto-install ──────────────────────────────────
  if [ "$INSTALLER_AVAILABLE" = "yes" ]; then
    echo ""
    printf "Run '%s' now? [y/N] " "$INSTALL_CMD"
    read -r CONSENT
    if [ "$CONSENT" = "y" ] || [ "$CONSENT" = "Y" ]; then
      eval "$INSTALL_CMD"
      if ! command -v tmux &>/dev/null; then
        echo "Installation may have failed. Please install tmux manually."
        exit 1
      fi
      echo "tmux installed successfully."
    else
      echo "Skipping installation. Run the command above when ready."
      exit 0
    fi
  else
    exit 1
  fi
fi

# ── jq detection (soft warning) ─────────────────────────────────────────────
JQ_AVAILABLE=true
if ! command -v jq &>/dev/null; then
  JQ_AVAILABLE=false
  echo "Warning: jq is not installed. Pane filtering will be limited."
  echo "Install: brew install jq (macOS) or apt-get install -y jq (Linux)"
fi

# ── NDJSON path resolution (reads monitoring.session_id from config.json) ───
NDJSON_PATH=$(node -e "
  const fs = require('fs');
  const path = require('path');
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), '.planning/config.json'), 'utf-8'));
    const sid = cfg.monitoring && cfg.monitoring.session_id || 'unknown';
    const tmpdir = require('os').tmpdir();
    console.log(path.join(tmpdir, 'pde-session-' + sid + '.ndjson'));
  } catch(e) {
    console.log(path.join(require('os').tmpdir(), 'pde-session-unknown.ndjson'));
  }
" 2>/dev/null)
if [ -z "$NDJSON_PATH" ]; then
  NDJSON_PATH="/tmp/pde-session-unknown.ndjson"
fi

# ── Terminal size detection (stty size, outside tmux) ───────────────────────
if [ -t 0 ]; then
  read -r ROWS COLS < <(stty size 2>/dev/null || echo "24 80")
else
  ROWS=0; COLS=0
fi
[ "$COLS" -eq 0 ] 2>/dev/null && COLS="${COLUMNS:-80}"
[ "$ROWS" -eq 0 ] 2>/dev/null && ROWS="${LINES:-24}"

# ── TMUX-10: Nested tmux detection ──────────────────────────────────────────
NESTED=false
if [ -n "$TMUX" ]; then
  NESTED=true
fi

# ── Idempotent session check ─────────────────────────────────────────────────
if tmux has-session -t "$SESSION" 2>/dev/null; then
  if [ "$NESTED" = "true" ]; then
    tmux switch-client -t "$SESSION"
  else
    tmux attach-session -t "$SESSION"
  fi
  exit 0
fi

# ── Session creation (detached) ──────────────────────────────────────────────
tmux new-session -d -s "$SESSION" -x "$COLS" -y "$ROWS"

# ── Session options ──────────────────────────────────────────────────────────
tmux set-option -t "$SESSION" pane-border-status top
tmux set-option -t "$SESSION" pane-border-format "[ #{pane_title} ]"
# TMUX-08: persist panes after their commands exit
tmux set-window-option -t "$SESSION" remain-on-exit on

# ── TMUX-09: Adaptive layout functions ──────────────────────────────────────

build_full_layout() {
  local session="$1"
  local ndjson="$2"

  # Layout: 3 panes left column, 3 panes right column
  # Capture initial pane (becomes "agent activity")
  P0=$(tmux display -t "${session}:0.0" -p '#{pane_id}')

  # Split right column (pipeline progress)
  P1=$(tmux split-window -h -dPF '#{pane_id}' -t "${session}:0.${P0}" -p 50)

  # Left column: file changes below agent activity
  P2=$(tmux split-window -v -dPF '#{pane_id}' -t "${session}:0.${P0}" -p 66)

  # Left column: context window below file changes
  P3=$(tmux split-window -v -dPF '#{pane_id}' -t "${session}:0.${P2}" -p 50)

  # Right column: log stream below pipeline progress
  P4=$(tmux split-window -v -dPF '#{pane_id}' -t "${session}:0.${P1}" -p 66)

  # Right column: token meter below log stream
  P5=$(tmux split-window -v -dPF '#{pane_id}' -t "${session}:0.${P4}" -p 50)

  # Label each pane
  tmux select-pane -t "${P0}" -T "agent activity"
  tmux select-pane -t "${P1}" -T "pipeline progress"
  tmux select-pane -t "${P2}" -T "file changes"
  tmux select-pane -t "${P3}" -T "context window"
  tmux select-pane -t "${P4}" -T "log stream"
  tmux select-pane -t "${P5}" -T "token / cost"

  # Start streaming processes in each pane
  tmux send-keys -t "${P0}" "bash '${PLUGIN_ROOT}/bin/pane-agent-activity.sh' '${ndjson}'" C-m
  tmux send-keys -t "${P1}" "bash '${PLUGIN_ROOT}/bin/pane-pipeline-progress.sh' '${ndjson}'" C-m
  tmux send-keys -t "${P2}" "bash '${PLUGIN_ROOT}/bin/pane-file-changes.sh' '${ndjson}'" C-m
  tmux send-keys -t "${P3}" "bash '${PLUGIN_ROOT}/bin/pane-context-window.sh'" C-m
  tmux send-keys -t "${P4}" "bash '${PLUGIN_ROOT}/bin/pane-log-stream.sh' '${ndjson}'" C-m
  tmux send-keys -t "${P5}" "bash '${PLUGIN_ROOT}/bin/pane-token-meter.sh' '${ndjson}'" C-m
}

build_minimal_layout() {
  local session="$1"
  local ndjson="$2"

  # Only 2 panes: agent activity (top), pipeline progress (bottom)
  P0=$(tmux display -t "${session}:0.0" -p '#{pane_id}')
  P1=$(tmux split-window -v -dPF '#{pane_id}' -t "${session}:0.${P0}" -p 50)

  tmux select-pane -t "${P0}" -T "agent activity"
  tmux select-pane -t "${P1}" -T "pipeline progress"

  tmux send-keys -t "${P0}" "bash '${PLUGIN_ROOT}/bin/pane-agent-activity.sh' '${ndjson}'" C-m
  tmux send-keys -t "${P1}" "bash '${PLUGIN_ROOT}/bin/pane-pipeline-progress.sh' '${ndjson}'" C-m
}

# ── Layout selection ─────────────────────────────────────────────────────────
if [ "$COLS" -ge "$MIN_COLS" ] && [ "$ROWS" -ge "$MIN_ROWS" ]; then
  build_full_layout "$SESSION" "$NDJSON_PATH"
else
  build_minimal_layout "$SESSION" "$NDJSON_PATH"
fi

# ── Attach or switch ─────────────────────────────────────────────────────────
if [ "$NESTED" = "true" ]; then
  tmux switch-client -t "$SESSION"
else
  tmux attach-session -t "$SESSION"
fi
