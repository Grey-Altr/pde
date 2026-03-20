# Phase 59: tmux Dashboard & Dependency Detection — Research

**Researched:** 2026-03-20
**Domain:** tmux scripting, shell-based TUI dashboards, cross-platform dependency detection
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TMUX-01 | `/pde:monitor` launches persistent tmux session with 6-pane layout | tmux new-session + split-window scripting, section Architecture Patterns |
| TMUX-02 | Agent activity pane shows real-time agent spawn/complete events | tail -F NDJSON + jq filter → send-keys pattern |
| TMUX-03 | Pipeline progress pane shows phase/plan/task completion with wave-aware progress | tail -F NDJSON + jq filter → send-keys pattern |
| TMUX-04 | File changes pane shows files created/modified from event stream | tail -F NDJSON + jq filter → send-keys pattern |
| TMUX-05 | Log stream pane shows structured event log with severity filtering | tail -F NDJSON + jq -C filter → send-keys pattern |
| TMUX-06 | Token/cost meter pane shows running token estimate labeled "~est." | awk/node accumulator consuming NDJSON, refreshed with watch or loop |
| TMUX-07 | Context window pane shows orchestrator context utilization "(~estimated)" | Similar to TMUX-06, awk/node single-value display |
| TMUX-08 | Dashboard persists after PDE operation completes (user closes manually) | remain-on-exit option on window |
| TMUX-09 | Adaptive layout degrades gracefully for terminals below 120x30 | stty size check → 2-pane fallback layout logic |
| TMUX-10 | Nested tmux detection uses $TMUX + switch-client fallback | $TMUX env var check → switch-client vs attach-session |
| DEPS-01 | tmux availability detected via `which tmux` before dashboard launch | `command -v tmux` pattern |
| DEPS-02 | Platform-aware install instructions when tmux missing (homebrew/apt/yum) | `uname -s` + `command -v` package manager detection |
| DEPS-03 | Auto-install offer with explicit user consent before running package manager | Interactive prompt pattern, blocked without "y" confirmation |
</phase_requirements>

---

## Summary

Phase 59 builds the `/pde:monitor` command: a shell script that launches a named tmux session with 6 labeled panes, each streaming live data from the Phase 58 NDJSON event stream. The implementation is pure bash + Node.js — no npm packages, no external TUI frameworks, no named pipes.

The core loop is: `tmux new-session` → `split-window` × 5 → `send-keys` to start `tail -F /tmp/pde-session-{id}.ndjson | jq ...` in each pane → `set-window-option remain-on-exit on` so panes persist after PDE finishes. Terminal size is read via `stty size` before session creation to choose 6-pane vs 2-pane layout. Nested session detection uses `$TMUX` env var: if set, call `tmux switch-client`; if unset, call `tmux attach-session`.

The REQUIREMENTS.md Out of Scope section explicitly prohibits: named pipes/FIFOs (block when no reader), blessed/ink frameworks (want to own the terminal), and a WebSocket server. The correct approach is `tail -F` on NDJSON files, which self-heals if the file doesn't exist yet.

**Primary recommendation:** Implement as a single bash script `bin/monitor-dashboard.sh` invoked by `commands/monitor.md` → `workflows/monitor.md`. The script handles all tmux setup, dependency detection, layout selection, and pane-stream wiring. Node.js is used only for token/cost accumulation logic that requires arithmetic over NDJSON fields.

---

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| tmux | 3.x (current) | Terminal multiplexing, session/pane management | Already in user's PATH on target systems; no alternative |
| bash | 3.2+ | Script orchestration, all tmux command calls | Universal on macOS and Linux; project already uses bash throughout |
| tail -F | POSIX | Stream NDJSON file changes to pane process | Self-healing (`-F` vs `-f`): keeps working if file is rotated or created later; zero deps |
| jq | 1.6+ | Parse and format NDJSON lines for display | Standard CLI JSON processor; `-C` forces ANSI color output |
| stty | POSIX | Read terminal dimensions before session creation | Reliable outside tmux; `stty size` returns `rows cols` on one line |
| Node.js | 18+ (project standard) | Token/cost accumulator (TOKN-01, TOKN-02) | Already project runtime; can process NDJSON with arithmetic |

### Supporting
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| command -v | bash builtin | Dependency detection for tmux, brew, apt-get, dnf, yum, pacman | DEPS-01 — safer than `which`; `which` is not a bash builtin |
| uname -s | POSIX | Platform detection (Darwin vs Linux) | DEPS-02 — determines which package manager to recommend |
| tput | ncurses | Terminal color codes for UI formatting | When explicit ANSI escape codes are too verbose |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tail -F + jq | fswatch + node consumer | fswatch requires separate install; tail -F works everywhere with jq already available |
| stty size | tput cols/lines | tput is unreliable inside tmux (always returns 80); stty size reads the actual tty descriptor |
| select-pane -T + pane-border-status | No labels | Labeled panes (pane-border-status top) dramatically improve readability; worth the 1-line config |
| bash dashboard script | tmuxinator/tmuxp YAML | YAML tools are npm/gem deps; bash is zero-dep and already in project toolchain |
| send-keys to start process | pipe-pane -I | pipe-pane -I is for injecting discrete writes, not for running a long-lived streaming process; send-keys is the right tool |

**Installation:** No installation needed beyond tmux. If tmux is absent, DEPS-02 provides instructions and DEPS-03 offers consent-gated auto-install.

---

## Architecture Patterns

### Recommended File Structure

```
commands/
└── monitor.md                        # NEW: /pde:monitor slash command

workflows/
└── monitor.md                        # NEW: workflow that calls the bash script

bin/
├── monitor-dashboard.sh              # NEW: main tmux session creation script
├── pane-agent-activity.sh            # NEW: jq filter for agent events → pane display
├── pane-pipeline-progress.sh         # NEW: jq filter for phase/plan/task events → pane display
├── pane-file-changes.sh              # NEW: jq filter for file_changed events → pane display
├── pane-log-stream.sh                # NEW: jq filter for all events → colored log lines
└── pane-token-meter.sh               # NEW: awk/node accumulator for token estimation

.planning/phases/59-*/
└── validate-dashboard.sh             # NEW: Nyquist validation script for phase 59
```

The 5 pane scripts are separate files to keep each under ~50 lines and independently testable. Each accepts one argument: the NDJSON file path.

### Pattern 1: Session Creation with Adaptive Layout

**What:** Create a named tmux session with either 6-pane (full) or 2-pane (minimal) layout depending on terminal size.

**When to use:** Always — TMUX-09 requires graceful degradation.

```bash
#!/usr/bin/env bash
# bin/monitor-dashboard.sh

SESSION="pde-monitor"
MIN_COLS=120
MIN_ROWS=30

# ── 1. Read terminal size before creating session ──────────────────────────
# stty size returns "rows cols" — only works when stdin is a real tty
if [ -t 0 ]; then
  read -r ROWS COLS < <(stty size)
else
  ROWS=0; COLS=0
fi
# Fallback: check COLUMNS/LINES env vars (set by some terminals/shells)
[ "$COLS" -eq 0 ] && COLS="${COLUMNS:-0}"
[ "$ROWS" -eq 0 ] && ROWS="${LINES:-0}"
# Final fallback: assume 80x24 (will trigger minimal layout)
[ "$COLS" -eq 0 ] && COLS=80
[ "$ROWS" -eq 0 ] && ROWS=24

# ── 2. Nested tmux detection ────────────────────────────────────────────────
if [ -n "$TMUX" ]; then
  NESTED=true
else
  NESTED=false
fi

# ── 3. Idempotent session creation ─────────────────────────────────────────
if tmux has-session -t "$SESSION" 2>/dev/null; then
  # Session already exists — attach or switch
  if [ "$NESTED" = "true" ]; then
    tmux switch-client -t "$SESSION"
  else
    tmux attach-session -t "$SESSION"
  fi
  exit 0
fi

# ── 4. Create session detached at current terminal size ─────────────────────
tmux new-session -d -s "$SESSION" -x "$COLS" -y "$ROWS"

# Enable pane labels
tmux set-option -t "$SESSION" pane-border-status top
tmux set-option -t "$SESSION" pane-border-format "[ #{pane_title} ]"

# Persist panes after their commands exit (TMUX-08)
tmux set-window-option -t "$SESSION" remain-on-exit on

# ── 5. Layout selection ─────────────────────────────────────────────────────
if [ "$COLS" -ge "$MIN_COLS" ] && [ "$ROWS" -ge "$MIN_ROWS" ]; then
  build_full_layout "$SESSION" "$NDJSON_PATH"
else
  build_minimal_layout "$SESSION" "$NDJSON_PATH"
fi

# ── 6. Attach or switch ─────────────────────────────────────────────────────
if [ "$NESTED" = "true" ]; then
  tmux switch-client -t "$SESSION"
else
  tmux attach-session -t "$SESSION"
fi
```

### Pattern 2: 6-Pane Full Layout Construction

**What:** Split a window into 6 labeled panes, each running a streaming process.

**When to use:** Terminals >= 120 columns and >= 30 rows (TMUX-09 full mode).

```bash
build_full_layout() {
  local session="$1"
  local ndjson="$2"
  local PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"

  # Layout: 3 panes left column, 3 panes right column
  # Window starts with 1 pane (pane 0) — this becomes "agent activity"
  # Split right: pane 1 = pipeline progress
  # Split pane 0 down: pane 2 = file changes
  # Split pane 2 down: pane 3 = (empty placeholder — resize after)
  # Split pane 1 down: pane 4 = log stream
  # Split pane 4 down: pane 5 = token meter / context window

  # Column 1 (left): pane 0 (agent), split down → pane 2 (files), split down → pane 3 (reserved for context)
  # Column 2 (right): pane 1 (pipeline), split down → pane 4 (log), split down → pane 5 (token)

  P0=$(tmux display -t "${session}:0.0" -p '#{pane_id}')

  # Create right column (pipeline progress)
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
```

### Pattern 3: 2-Pane Minimal Layout (TMUX-09 Degraded Mode)

**What:** Show only the two highest-priority panes when terminal is too small.

**When to use:** Terminals < 120 cols or < 30 rows.

```bash
build_minimal_layout() {
  local session="$1"
  local ndjson="$2"
  local PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"

  P0=$(tmux display -t "${session}:0.0" -p '#{pane_id}')
  P1=$(tmux split-window -v -dPF '#{pane_id}' -t "${session}:0.${P0}" -p 50)

  tmux select-pane -t "${P0}" -T "agent activity"
  tmux select-pane -t "${P1}" -T "pipeline progress"

  tmux send-keys -t "${P0}" "bash '${PLUGIN_ROOT}/bin/pane-agent-activity.sh' '${ndjson}'" C-m
  tmux send-keys -t "${P1}" "bash '${PLUGIN_ROOT}/bin/pane-pipeline-progress.sh' '${ndjson}'" C-m
}
```

### Pattern 4: NDJSON Streaming Per-Pane Script

**What:** Each pane script tails the NDJSON file and filters/formats for its specific event types.

**When to use:** Start each script via `send-keys` into the target pane.

```bash
#!/usr/bin/env bash
# bin/pane-agent-activity.sh — streams agent spawn/complete events

NDJSON="${1:-}"

# Wait for file to appear (tail -F handles this but gives no initial output)
# Print a "Waiting for events..." banner so the pane is not blank
echo "[ agent activity ] waiting for session events..."
echo ""

# tail -F self-heals: if file doesn't exist yet, waits; if rotated, follows new file
# jq -r: raw output (no JSON wrapping), -C: force ANSI colors (needed in non-TTY pipe context but -R disables JSON — don't use -RC together)
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
```

**Note:** Do NOT use `jq -C` when piping to `while read` — jq's color output requires ANSI support in the downstream consumer. Use `printf` with explicit ANSI codes instead. Use `jq -r` for raw string extraction.

### Pattern 5: NDJSON File Path Resolution

**What:** Resolve the current session's NDJSON file path from `config.json`.

**When to use:** At dashboard launch time, before starting pane scripts.

```bash
# Read session ID from config.json — written by pde-tools.cjs session-start
NDJSON_PATH=$(node -e "
  const fs = require('fs');
  const path = require('path');
  const cfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), '.planning/config.json'), 'utf-8'));
  const sid = cfg.monitoring && cfg.monitoring.session_id || 'unknown';
  const tmpdir = require('os').tmpdir();
  console.log(path.join(tmpdir, 'pde-session-' + sid + '.ndjson'));
" 2>/dev/null)

# Fallback if node fails
if [ -z "$NDJSON_PATH" ]; then
  NDJSON_PATH="/tmp/pde-session-unknown.ndjson"
fi
```

### Pattern 6: Dependency Detection and Install Flow (DEPS-01/02/03)

**What:** Check for tmux, detect platform, offer install with explicit consent.

**When to use:** First thing in `monitor-dashboard.sh` before any tmux commands.

```bash
# ── DEPS-01: tmux detection ─────────────────────────────────────────────────
if ! command -v tmux &>/dev/null; then
  echo ""
  echo "tmux is not installed."
  echo ""

  # ── DEPS-02: Platform-aware instructions ─────────────────────────────────
  PLATFORM=$(uname -s)
  if [ "$PLATFORM" = "Darwin" ]; then
    echo "Install with Homebrew:"
    echo "  brew install tmux"
    INSTALL_CMD="brew install tmux"
    INSTALLER="brew"
    INSTALLER_AVAILABLE=$(command -v brew &>/dev/null && echo "yes" || echo "no")
  elif [ "$PLATFORM" = "Linux" ]; then
    if command -v apt-get &>/dev/null; then
      echo "Install with apt:"
      echo "  sudo apt-get install -y tmux"
      INSTALL_CMD="sudo apt-get install -y tmux"
      INSTALLER="apt-get"
      INSTALLER_AVAILABLE="yes"
    elif command -v dnf &>/dev/null; then
      echo "Install with dnf:"
      echo "  sudo dnf install -y tmux"
      INSTALL_CMD="sudo dnf install -y tmux"
      INSTALLER="dnf"
      INSTALLER_AVAILABLE="yes"
    elif command -v yum &>/dev/null; then
      echo "Install with yum:"
      echo "  sudo yum install -y tmux"
      INSTALL_CMD="sudo yum install -y tmux"
      INSTALLER="yum"
      INSTALLER_AVAILABLE="yes"
    elif command -v pacman &>/dev/null; then
      echo "Install with pacman:"
      echo "  sudo pacman -S tmux"
      INSTALL_CMD="sudo pacman -S tmux"
      INSTALLER="pacman"
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
      echo "tmux installed. Launching dashboard..."
    else
      echo "Skipping installation. Run the command above when ready."
      exit 0
    fi
  else
    exit 1
  fi
fi
```

### Anti-Patterns to Avoid

- **Named pipes (FIFOs):** REQUIREMENTS.md explicitly prohibits them. They block indefinitely when no reader is attached, causing hangs.
- **blessed/ink/ncurses:** REQUIREMENTS.md explicitly prohibits them. They own the terminal and conflict with tmux injection.
- **`which` for dependency checks:** `which` is not a bash builtin and behaves inconsistently across platforms. Use `command -v`.
- **`tail -f` (lowercase):** Use `tail -F` (uppercase). `-F` follows by filename (self-heals across log rotations/recreations); `-f` follows by inode (breaks if file is recreated).
- **Hardcoding `/tmp`:** Phase 58 already established that macOS returns `/var/folders/...` from `os.tmpdir()`. Always resolve via Node.js `require('os').tmpdir()` or the same pattern in shell: `TMPDIR_PATH=$(node -e "process.stdout.write(require('os').tmpdir())")`.
- **Nested tmux via `new-session` when `$TMUX` is set:** Causes the "sessions should be nested with care" error. Always branch on `$TMUX` to use `switch-client` instead.
- **`tput cols` inside pane scripts:** Inside a tmux pane, `tput cols` may report incorrectly after resizing. Terminal size is only needed once, at session creation time, using `stty size` before any tmux commands.
- **Assuming jq is installed:** jq is common but not POSIX-standard. The script should check `command -v jq` and fall back to plain `tail -F` with no parsing if absent.
- **`-dPF '#{pane_id}'` split pattern requires tmux 2.6+:** This is safe for any macOS or Linux system running tmux from 2020 onwards. The `-P` flag returns the pane ID for chaining subsequent commands.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File change streaming | Custom inotify/FSEvents wrapper | `tail -F` | Works on macOS and Linux; zero install; self-healing on file rotation |
| JSON parsing in bash | Regex/sed/awk JSON parsing | `jq` | JSON is not regular; regex parsing breaks on escaped chars, nested objects |
| ANSI color codes | ANSI escape code tables | `printf '\033[32m...\033[0m'` or `tput setaf` | These two approaches are universally portable — no library needed |
| Token accumulation | Custom tokenizer | `awk` arithmetic + `chars/4` heuristic | TOKN-01 specifies chars/4 explicitly; exact counting deferred to Phase 61 |
| Package manager detection | OS parsing via `/etc/os-release` | `command -v apt-get`, `command -v dnf`, etc. | The executable presence check IS the right test; `/etc/os-release` alone doesn't mean the manager is functional |
| Terminal size in pane scripts | Reading terminfo inside pane | `tmux display -p '#{pane_width}'` from outside the pane | Terminal size inside pane is unreliable after resize; query tmux directly |

**Key insight:** The entire dashboard is `tail -F | jq | printf` — the complexity is in the tmux session wiring, not the data processing. Keep pane scripts under 50 lines each.

---

## Common Pitfalls

### Pitfall 1: Claude Code Sandbox and tmux
**What goes wrong:** The Bash tool in Claude Code runs inside macOS Seatbelt / Linux bubblewrap. Subprocesses spawned by `tmux new-session` inherit the sandbox's restrictions. The most critical restriction: **default write access is only to the current working directory.** The NDJSON files are written to `os.tmpdir()` (typically `/var/folders/...` on macOS or `/tmp` on Linux).

**Why it happens:** The Phase 58 event bus already writes to `os.tmpdir()`. This works because Phase 58 was validated — the sandbox allows writes to tmpdir paths. Verify this continues to work in Phase 59 by running the Phase 58 validation script before any Phase 59 work.

**How to avoid:** The monitor-dashboard.sh script itself is launched via Bash tool → the `tmux` process it creates runs outside the Claude Code session (as a detached tmux server). Once `tmux new-session -d` forks the server, that server runs at the user's normal privilege level, not inside the sandbox. The pane scripts (`tail -F`, `jq`) run under the user's normal shell in the tmux panes — no sandbox restrictions apply to them.

**Warning signs:** `tmux new-session` exits non-zero; `tmux has-session` returns error even after session creation.

### Pitfall 2: $TMUX Not Set When Expected (Claude Code Subagents)
**What goes wrong:** Claude Code hooks fire in subagents that spawn their own processes. The `$TMUX` variable is inherited by child processes of the Claude Code session. If the user launched Claude Code from inside a tmux session, `$TMUX` will be set in all hooks and Bash tool invocations.

**Why it happens:** Environment variable inheritance.

**How to avoid:** The `$TMUX` check in monitor-dashboard.sh is correct behavior — if `$TMUX` is set, the user IS in tmux and we should use `switch-client`. This is the expected path for most users who are already using tmux. Always test both branches.

### Pitfall 3: pane_id vs pane_index Confusion
**What goes wrong:** Using pane index (0, 1, 2...) vs pane ID (`%0`, `%1`, `%2`) interchangeably causes commands to target wrong panes after splits reorganize the index order.

**Why it happens:** Split order changes visible index numbers; IDs are permanent.

**How to avoid:** Always capture pane ID with `-dPF '#{pane_id}'` immediately after `split-window`. Use the captured ID (`%N`) in all subsequent `-t` flags. Never use pane index (`.0`, `.1`) after the initial window reference.

### Pitfall 4: remain-on-exit Leaves "Dead Pane" Banner
**What goes wrong:** When a pane process exits (e.g., NDJSON file deleted), tmux shows `[process exited with code N]` banner in the pane. This is correct behavior but may confuse users.

**Why it happens:** `remain-on-exit on` is the mechanism for TMUX-08 — the user closes the session manually.

**How to avoid:** The pane scripts should tail NDJSON files indefinitely and only exit on interrupt. Use `while true; do tail -F ...; sleep 1; done` to auto-restart if tail exits unexpectedly. The dead pane banner only appears if the loop itself exits.

### Pitfall 5: NDJSON Path Not Available When Dashboard Launches
**What goes wrong:** `config.json` monitoring.session_id was written in a PREVIOUS Claude Code session. The dashboard might tail the wrong NDJSON file.

**Why it happens:** Session IDs persist in `config.json` across Claude Code sessions. A new session starts when the user runs a PDE command, regenerating the session ID. But the dashboard may be launched BEFORE the first PDE command in a new session.

**How to avoid:** Pass the NDJSON path as an argument OR poll config.json for updates. Recommended: use the `--watch` mode — have pane-token-meter.sh periodically re-read config.json to get the current session ID. For simpler panes, `tail -F` already handles the case where the file doesn't exist yet (it waits until the file appears when using `-F`).

### Pitfall 6: jq Not Found
**What goes wrong:** `jq` is not installed (common on minimal Linux servers, Docker containers).

**Why it happens:** jq is not POSIX-standard; it's an extra install.

**How to avoid:** Check `command -v jq` at dashboard launch. If absent, offer install instructions alongside tmux instructions. As a degraded fallback, pane scripts can print raw NDJSON lines without parsing — less readable but functional.

---

## Code Examples

Verified patterns from official sources and project conventions:

### Terminal Size Detection (outside tmux)
```bash
# Source: POSIX stty, verified pattern
read -r ROWS COLS < <(stty size 2>/dev/null || echo "24 80")
# stty size outputs: "rows cols" (e.g., "40 200")
```

### tmux Session Idempotency Check
```bash
# Source: tmux man page — has-session exits 0 if exists, 1 if not
SESSION="pde-monitor"
if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "Session already running"
fi
```

### Nested Session Handling
```bash
# Source: tmux man page + community pattern — $TMUX is set when inside tmux
if [ -n "$TMUX" ]; then
  tmux switch-client -t "pde-monitor"
else
  tmux attach-session -t "pde-monitor"
fi
```

### Pane Creation with Captured ID
```bash
# Source: tmux Advanced Use wiki — -dPF '#{pane_id}' captures ID without attaching
PANE_ID=$(tmux split-window -h -dPF '#{pane_id}' -t "${SESSION}:0" -p 50)
tmux select-pane -t "$PANE_ID" -T "pipeline progress"
tmux send-keys -t "$PANE_ID" "tail -F '${NDJSON}' | jq -r 'select(.event_type == \"phase_complete\")'" C-m
```

### Pane Labels via select-pane -T
```bash
# Source: tmux Advanced Use wiki (tmux 2.6+)
tmux set-option -t "$SESSION" pane-border-status top
tmux set-option -t "$SESSION" pane-border-format "[ #{pane_title} ]"
tmux select-pane -t "${PANE_ID}" -T "agent activity"
```

### remain-on-exit (TMUX-08)
```bash
# Source: tmux man page — window option, not session option
tmux set-window-option -t "${SESSION}:0" remain-on-exit on
# Also settable globally: tmux set-option -g remain-on-exit on
```

### NDJSON filter for agent events (jq)
```bash
# Source: verified jq 1.6 syntax
tail -F "$NDJSON" | jq -r '
  select(.event_type == "subagent_start" or .event_type == "subagent_stop") |
  "\(.ts | split("T")[1] | split(".")[0])  \(.event_type)  \(.agent_type // "agent")"
' 2>/dev/null
```

### Package Manager Detection (DEPS-02 pattern)
```bash
# Source: community convention — command -v is bash builtin, portable
detect_package_manager() {
  local platform
  platform=$(uname -s)
  if [ "$platform" = "Darwin" ]; then
    command -v brew &>/dev/null && echo "brew" || echo "none"
  elif [ "$platform" = "Linux" ]; then
    for pm in apt-get dnf yum pacman; do
      command -v "$pm" &>/dev/null && echo "$pm" && return
    done
    echo "none"
  else
    echo "none"
  fi
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tmux `send-keys` to type commands | `pipe-pane -I` for data injection into empty panes | tmux 2.x | For programmatic data injection, `display -I` on an empty pane is cleaner than simulating keystrokes; for launching processes, `send-keys` is still correct |
| Pane identification by index | Pane identification by `#{pane_id}` (persistent ID) | tmux 2.6 | IDs (`%N`) are stable across splits; indices change when panes are added/removed |
| Hardcoded `-p %` split percentages | `resize-pane -p %` after creation | tmux 3.x | Split percentages still work in `split-window -p`; resize-pane gives more precise control after layout is built |
| `select-layout tiled` | Manual split-window scripting | Always | `tiled` distributes evenly but doesn't give semantic control of which pane goes where; manual splitting is required for labeled layouts |

**Deprecated/outdated:**
- `tmux new -s name command`: The `command` positional argument after session name is deprecated in favor of explicit `-d` + `send-keys`
- `-p %` for splits: Works but `split-window -l N` (absolute size) is more predictable than percentage in some tmux versions

---

## Open Questions

1. **jq availability on user machines**
   - What we know: jq is widely available via Homebrew, apt, dnf; not pre-installed on all systems
   - What's unclear: What fraction of PDE users have jq installed?
   - Recommendation: Add `command -v jq` check alongside tmux check; offer install instructions for both; implement a plain-text fallback that just `tail -F`s the NDJSON file with no parsing (ugly but functional)

2. **Claude Code sandbox write access to tmux socket**
   - What we know: tmux communication happens via a Unix socket (usually in `/tmp/tmux-{uid}/`); Claude Code sandbox Seatbelt on macOS allows reads broadly but restricts writes; `tmux new-session` executed from within a Bash tool creates a tmux server subprocess at the user's normal privilege level once forked
   - What's unclear: Whether the tmux client-server handshake socket creation is blocked by Seatbelt during the initial `tmux new-session` call from within the sandboxed Bash tool
   - Recommendation: This is the single most important runtime verification. The Phase 59 Wave 0 test MUST run `tmux new-session -d -s pde-test && tmux kill-session -t pde-test` from a Bash tool within a Claude Code session to confirm it works. STATE.md already documents this as the blocker: "Phase 59 planning: Claude Code sandbox (bwrap/seatbelt) compatibility with tmux commands must be verified through the actual Claude Code Bash tool before implementation — fallback is log-only dashboard."

3. **Session ID currency when dashboard is long-running**
   - What we know: `config.json` monitoring.session_id is updated at each SessionStart; a long-running tmux dashboard launched in session A might miss events from session B if it's still tailing session A's NDJSON file
   - What's unclear: How to handle session transitions gracefully
   - Recommendation: For Phase 59, dashboard is launched for a specific session and its NDJSON file. Cross-session refresh is a TMUX-11/12 enhancement (Future Requirements). Document this limitation clearly in the workflow.

---

## Validation Architecture

> nyquist_validation is enabled (not explicitly false in config.json).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bash + Node.js assert (zero deps, matches Phase 58 pattern) |
| Config file | none — inline validation via bash script |
| Quick run command | `bash .planning/phases/59-tmux-dashboard-dependency-detection/validate-dashboard.sh --quick` |
| Full suite command | `bash .planning/phases/59-tmux-dashboard-dependency-detection/validate-dashboard.sh` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEPS-01 | `command -v tmux` exits 0 if tmux present | unit | `command -v tmux && echo PASS` | ❌ Wave 0 |
| DEPS-02 | Platform detection returns correct package manager | unit | `bash bin/monitor-dashboard.sh --detect-pm` → expected output | ❌ Wave 0 |
| DEPS-03 | Install flow exits 0 without running install when user denies | unit | `echo "n" \| bash bin/monitor-dashboard.sh --dry-run-install` | ❌ Wave 0 |
| TMUX-01 | Session created with name "pde-monitor" | integration | `tmux has-session -t pde-monitor && echo PASS` (after script run) | ❌ Wave 0 |
| TMUX-08 | remain-on-exit set on session window | structural | `tmux show-window-options -t pde-monitor \| grep remain-on-exit` | ❌ Wave 0 |
| TMUX-09 | Small terminal triggers 2-pane layout | unit | Run script with `COLS=80 ROWS=24` env override → pane count check | ❌ Wave 0 |
| TMUX-10 | `$TMUX` detection returns correct branch | unit | `TMUX="" bash script --dry-run` vs `TMUX="x" bash script --dry-run` | ❌ Wave 0 |
| TMUX-02..07 | Pane scripts produce formatted output from NDJSON | unit | Feed fixture NDJSON through each pane script, check non-empty output | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `bash .planning/phases/59-tmux-dashboard-dependency-detection/validate-dashboard.sh --quick`
- **Per wave merge:** Full suite command
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps (ALL tests are new — no existing infrastructure for tmux):
- [ ] `validate-dashboard.sh` — full validation script
- [ ] `tests/phase-59/` directory with test fixtures (sample NDJSON events)
- [ ] tmux availability check (if tmux not available in test env, skip integration tests, run unit tests only)

**Note on sandbox/tmux integration tests:** Tests that call `tmux new-session` must be run from within an actual Claude Code session or with a real terminal available. Mark these `# INTEGRATION: requires tmux + real terminal` and skip gracefully if `$CI` is set or if tmux is absent.

---

## Sources

### Primary (HIGH confidence)
- tmux man page (man7.org/linux/man-pages/man1/tmux.1.html) — `has-session`, `switch-client`, `new-session -d -x -y`, `pipe-pane -I`, `remain-on-exit`, `display-message -p`
- tmux Advanced Use wiki (github.com/tmux/tmux/wiki/Advanced-Use) — empty pane creation with `display -I`, `select-pane -T`, `remain-on-exit` semantics, `-dPF '#{pane_id}'` pattern
- tmux Formats wiki (github.com/tmux/tmux/wiki/Formats) — `client_width`, `client_height`, `pane_id`, `pane_title` format variables
- Phase 58 implementation (bin/lib/event-bus.cjs, hooks/emit-event.cjs) — NDJSON file location, session_id management, os.tmpdir() pattern
- Claude Code Sandboxing docs (code.claude.com/docs/en/sandboxing) — Bash tool sandbox scope, subprocess isolation, tmux socket creation concerns
- REQUIREMENTS.md — Out of Scope section explicitly prohibits named pipes, blessed/ink, WebSocket server

### Secondary (MEDIUM confidence)
- Hacker News tmux pane-border-status discussion — `set pane-border-status top` + `set pane-border-format '[ #{pane_title} ]'` pattern (news.ycombinator.com/item?id=23004428)
- WebSearch results on cross-platform package manager detection — confirmed `command -v` pattern with priority order `apt-get → dnf → yum → pacman`
- WebSearch results on stty size — confirmed `stty size` outputs `rows cols` format, reliable outside tmux

### Tertiary (LOW confidence — mark for validation)
- WebSearch: Claude Code sandbox compatibility with `tmux new-session` from Bash tool — single anecdotal source (xenshinu.github.io/claude_tmux/) showing Claude Code in Docker with tmux; does not confirm Seatbelt-level compatibility. MUST be verified at Wave 0.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — tmux scripting is well-documented; all patterns from official man page and wiki
- Architecture: HIGH — based on direct analysis of Phase 58 event bus structure and NDJSON file format
- Pitfalls: HIGH for items 1-5, MEDIUM for pitfall 6 (jq) — based on project constraints doc + official sources
- Sandbox compatibility: LOW — single anecdotal source; must verify empirically in Wave 0

**Research date:** 2026-03-20
**Valid until:** 2026-06-20 (tmux scripting API is extremely stable; changes are unlikely)
