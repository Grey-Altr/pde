# Phase 148: tmux Integration - Research

**Researched:** 2026-03-27
**Domain:** tmux programmatic control, NDJSON fan-out, multi-session ANSI color multiplexing
**Confidence:** HIGH (architecture firmly grounded in existing codebase; tmux API verified against official manpage)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TMX-01 | Dispatcher writes aggregated NDJSON for multi-session tmux pane consumption | New aggregated file writer in coordinator; fan-out from existing Aggregator.on('event') |
| TMX-02 | Pane 1 (agent activity) shows all session spawns with [L]/[R] tags | Registry `backend` field determines L vs R; new multi-session-aware pane script |
| TMX-03 | Pane 4 (log stream) multiplexes all active sessions with color prefix per session | 6-color ANSI palette (modulo 6), color index from session registry order |
| TMX-04 | Pane 5 (token/cost) shows aggregate across all active sessions | Sum across all watched sessionIds; state variables per-session in bash loop |
| TMX-05 | Session switching via `s` key (cycle) and `a` key (all) | tmux `bind-key` + shell state file for current filter; pane reads filter on each event |
</phase_requirements>

---

## Summary

Phase 148 adds multi-session awareness to three existing tmux pane scripts that currently tail a single NDJSON file. The Aggregator (Phase 144) already fans-in all per-session NDJSON files into a single in-process EventEmitter. Phase 148 needs to: (1) write those aggregated events to a single combined NDJSON file that all pane scripts can tail, and (2) upgrade the three pane scripts to render session-tagged, color-coded output.

The architecture is a two-component system: a Node.js fan-out writer (runs alongside the coordinator, writes to `/tmp/pde-multi-session.ndjson`) and upgraded shell scripts that parse `session_id` and `session_source` from each event line. The dispatcher's existing registry already contains the `backend` field (`local`/`ssh`/`managed`) which maps directly to `[L]` vs `[R]` tags. No new npm dependencies are needed — everything is achievable with zero-dep bash scripts and the existing Aggregator EventEmitter.

For the interactive `s`/`a` key bindings in Pane 5, the standard pattern is a tmux `bind-key -T root` binding that writes a state file and sends a signal to the pane process. The pane script reloads the filter by reading that state file on each event cycle.

**Primary recommendation:** Fan-out from `coordinator.aggregator.on('event')` into a single `/tmp/pde-multi-session.ndjson` file. Upgrade three pane bash scripts to read `session_id` and tag with `[L]`/`[R]`. Use a 6-color ANSI palette consistent with the dashboard's `SESSION_PALETTE`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js fs.appendFileSync | Node 20.x (built-in) | Write aggregated NDJSON lines | Already used in event-bus.cjs (safeAppendEvent) |
| Node.js EventEmitter | Node 20.x (built-in) | Aggregator.on('event') subscription | Aggregator already extends EventEmitter |
| bash + tail -F | POSIX | Pane scripts tail the combined file | Established pattern in all existing pane scripts |
| jq | 1.6+ | Parse JSON fields in bash | Already used in all existing pane scripts |
| tmux bind-key | tmux 3.1+ | `s`/`a` key bindings for session cycling | Built-in tmux, no plugin needed |

### No New npm Dependencies

The `packages/dispatcher/` has zero new dependencies for this phase. The fan-out writer is a plain CJS module. The pane scripts are bash. The project constraint "plugin root stays zero-npm-dependency" is satisfied.

---

## Architecture Patterns

### Aggregated NDJSON File Pattern

**What:** A new `tmux-fanout.cjs` module subscribes to `coordinator.aggregator.on('event')` and appends enriched NDJSON lines to `/tmp/pde-multi-session.ndjson`. Each line includes the `session_id` and a `session_source` field (`L` or `R`) derived from the registry at write time.

**Why not tail per-session files:** The pane scripts would need to dynamically discover and tail an unknown number of per-session files as sessions start/stop. A single combined file is the same pattern already used for single-session monitoring and is trivially tailable with `tail -F`.

**Why this file path:** Mirrors the existing `/tmp/pde-session-{id}.ndjson` convention. The `pde-multi-session.ndjson` filename is distinct so the monitor-dashboard.sh can pass it as the aggregated path.

### Multi-Session Event Envelope

Each line written to `/tmp/pde-multi-session.ndjson` adds two fields on top of the original event:

```javascript
// Source: packages/dispatcher/lib/aggregator.cjs line 51 + new tmux-fanout.cjs
{
  ...originalEvent,          // all existing fields from per-session NDJSON
  "_pde_session_id": "p148-1-abc12345",   // dispatcher sessionId (from aggregator callback)
  "_pde_session_source": "L"              // "L" (local) or "R" (ssh/managed)
}
```

The `_pde_` prefix avoids collision with any future PDE event fields. The source is derived by reading `registry.get(sessionId).backend` at write time — `local` → `L`, `ssh` → `R`, `managed` → `R`.

### Session Color Assignment

Map sessionId → color index by insertion order into the fan-out writer's session tracking map. First session seen = index 0, second = index 1, etc., cycling modulo 6. This matches the dashboard's `session-colors.ts` approach: `SESSION_PALETTE[index % 6]`.

ANSI 8-color escape codes map the same palette positions:

| Index | Dashboard color | ANSI escape |
|-------|----------------|-------------|
| 0 | blue-400 | `\033[34m` (blue) |
| 1 | emerald-400 | `\033[32m` (green) |
| 2 | violet-400 | `\033[35m` (magenta) |
| 3 | amber-400 | `\033[33m` (yellow) |
| 4 | rose-400 | `\033[31m` (red) |
| 5 | cyan-400 | `\033[36m` (cyan) |

Use 256-color for closer visual match: `\033[38;5;33m` (blue), `\033[38;5;82m` (green), `\033[38;5;129m` (violet), `\033[38;5;214m` (amber), `\033[38;5;197m` (rose), `\033[38;5;51m` (cyan).

### Recommended Project Structure

```
packages/dispatcher/lib/
├── tmux-fanout.cjs          # NEW: subscribes to Aggregator, writes combined NDJSON
bin/
├── pane-agent-activity.sh   # MODIFIED: add session_id + [L]/[R] parsing
├── pane-log-stream.sh       # MODIFIED: add color prefix per session_id
├── pane-token-meter.sh      # MODIFIED: aggregate all sessions + s-key cycling
├── monitor-dashboard.sh     # MODIFIED: pass aggregated NDJSON path to panes
/tmp/
├── pde-multi-session.ndjson # NEW: combined event stream for all active sessions
├── pde-tmux-filter.txt      # NEW: current session filter ("all" or sessionId)
```

### Pattern 1: Fan-Out Writer Module (tmux-fanout.cjs)

```javascript
// Source: aggregator.cjs pattern + event-bus.cjs safeAppendEvent pattern
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const FANOUT_PATH = path.join(os.tmpdir(), 'pde-multi-session.ndjson');

// Source label derives from registry backend field
function sourceLabel(backend) {
  return (backend === 'local') ? 'L' : 'R';
}

class TmuxFanout {
  constructor(aggregator, registry) {
    this._aggregator = aggregator;
    this._registry = registry;
    this._sessionIndex = new Map(); // sessionId -> color index
    this._nextIndex = 0;
    this._handler = null;
  }

  start() {
    this._handler = (sessionId, event) => {
      // Assign color index on first seen
      if (!this._sessionIndex.has(sessionId)) {
        this._sessionIndex.set(sessionId, this._nextIndex++);
      }
      const entry = this._registry.get(sessionId);
      const source = entry ? sourceLabel(entry.backend) : 'L';
      const colorIndex = this._sessionIndex.get(sessionId);
      const enriched = {
        ...event,
        _pde_session_id: sessionId,
        _pde_session_source: source,
        _pde_color_index: colorIndex,
      };
      try {
        fs.appendFileSync(FANOUT_PATH, JSON.stringify(enriched) + '\n', 'utf8');
      } catch (_) {
        // Never crash coordinator due to fanout write failure
      }
    };
    this._aggregator.on('event', this._handler);
  }

  stop() {
    if (this._handler) {
      this._aggregator.off('event', this._handler);
      this._handler = null;
    }
  }
}

module.exports = { TmuxFanout, FANOUT_PATH };
```

### Pattern 2: Updated Pane 1 (agent-activity.sh) — [L]/[R] Tags

```bash
# pane-agent-activity.sh multi-session version
NDJSON="${1:-}"
echo "[ agent activity ] waiting for multi-session events..."
echo ""

tail -F "${NDJSON}" 2>/dev/null | while IFS= read -r line; do
  event_type=$(echo "$line" | jq -r '.event_type // empty' 2>/dev/null)
  case "$event_type" in
    subagent_start|subagent_stop)
      ts=$(echo "$line" | jq -r '.ts | split("T")[1] | split(".")[0]' 2>/dev/null)
      agent=$(echo "$line" | jq -r '.agent_type // "agent"' 2>/dev/null)
      source=$(echo "$line" | jq -r '._pde_session_source // "L"' 2>/dev/null)
      sid=$(echo "$line" | jq -r '._pde_session_id // ""' 2>/dev/null | cut -c1-12)
      color_idx=$(echo "$line" | jq -r '._pde_color_index // 0' 2>/dev/null)
      label="[${source}]"
      # Map color_idx 0-5 to 256-color escape
      case "$color_idx" in
        0) color='\033[38;5;33m' ;;   # blue
        1) color='\033[38;5;82m' ;;   # green
        2) color='\033[38;5;129m' ;;  # violet
        3) color='\033[38;5;214m' ;;  # amber
        4) color='\033[38;5;197m' ;;  # rose
        *) color='\033[38;5;51m' ;;   # cyan
      esac
      if [ "$event_type" = "subagent_start" ]; then
        action="SPAWN"
      else
        action="DONE "
      fi
      printf "${color}%s [%s] %s  %s\033[0m\n" "$label" "$ts" "$action" "$agent"
      ;;
  esac
done
```

### Pattern 3: Updated Pane 4 (log-stream.sh) — Color Prefix Per Session

```bash
# Color prefix approach: prepend session tag before each event line
# Session tag format: [SID-abc1] where abc1 is first 4 chars of session UUID segment
tail -F "${NDJSON}" 2>/dev/null | while IFS= read -r line; do
  event_type=$(echo "$line" | jq -r '.event_type // empty' 2>/dev/null)
  [ -z "$event_type" ] && continue
  ts=$(echo "$line" | jq -r '.ts | split("T")[1] | split(".")[0]' 2>/dev/null)
  color_idx=$(echo "$line" | jq -r '._pde_color_index // 0' 2>/dev/null)
  sid_short=$(echo "$line" | jq -r '._pde_session_id // ""' 2>/dev/null | sed 's/.*-\([a-f0-9]\{8\}\)$/\1/' | cut -c1-4)
  case "$color_idx" in
    0) color='\033[38;5;33m' ;;
    1) color='\033[38;5;82m' ;;
    2) color='\033[38;5;129m' ;;
    3) color='\033[38;5;214m' ;;
    4) color='\033[38;5;197m' ;;
    *) color='\033[38;5;51m' ;;
  esac
  prefix="${color}[${sid_short}]\033[0m"
  # ... existing event_type case rendering with prefix prepended
done
```

### Pattern 4: Session Filter State for `s`/`a` Key (Pane 5)

```bash
# State file approach: tmux key binding writes to /tmp/pde-tmux-filter.txt
# Pane script reads filter on each rendering cycle

# In monitor-dashboard.sh, add key bindings after layout setup:
# Get list of all session IDs from registry JSON
tmux bind-key -n s run-shell "node '${PLUGIN_ROOT}/bin/lib/tmux-cycle-session.cjs' '${REGISTRY_PATH}'"
tmux bind-key -n a run-shell "echo 'all' > /tmp/pde-tmux-filter.txt"

# pane-token-meter.sh reads filter:
FILTER_FILE="/tmp/pde-tmux-filter.txt"
current_filter() {
  cat "$FILTER_FILE" 2>/dev/null || echo "all"
}
```

**tmux-cycle-session.cjs** reads `dispatcher.pids`, gets the sorted list of running sessionIds, reads the current filter, advances to the next one (or wraps to `all`), writes back to the filter file.

### Pattern 5: Aggregate Cost in Pane 5

The token meter reads all events from the combined NDJSON. When filter is `all`, it accumulates tokens for every line. When filter is a specific sessionId, it only accumulates lines where `_pde_session_id` matches.

```bash
# In accumulator loop:
FILTER=$(current_filter)
while IFS= read -r line; do
  if [ "$FILTER" != "all" ]; then
    line_sid=$(echo "$line" | jq -r '._pde_session_id // ""' 2>/dev/null)
    [ "$line_sid" != "$FILTER" ] && continue
  fi
  # ... existing token accumulation
done
```

**Critical pitfall:** The `tail -F` loop cannot reload the filter inline because bash subshell `cat` inside a `while read` pipeline does not see variable updates from sibling processes. The solution is to read the filter file inside each iteration using `$(cat "$FILTER_FILE")`, which re-executes on each event.

### Pattern 6: monitor-dashboard.sh Aggregated Path

```bash
# In monitor-dashboard.sh, resolve the multi-session NDJSON path
MULTI_NDJSON_PATH="/tmp/pde-multi-session.ndjson"

# Pass it to the three upgraded panes:
tmux send-keys -t "${P0}" "bash '${PLUGIN_ROOT}/bin/pane-agent-activity.sh' '${MULTI_NDJSON_PATH}'" C-m
tmux send-keys -t "${P4}" "bash '${PLUGIN_ROOT}/bin/pane-log-stream.sh' '${MULTI_NDJSON_PATH}'" C-m
tmux send-keys -t "${P5}" "bash '${PLUGIN_ROOT}/bin/pane-token-meter.sh' '${MULTI_NDJSON_PATH}'" C-m

# Single-session panes (P1, P2, P3, P6, P7) continue using single-session NDJSON
```

**Backward compatibility:** The single-session NDJSON path (`NDJSON_PATH`) is still passed to non-multiplexed panes. The combined file is only used by panes 1, 4, 5.

### Anti-Patterns to Avoid

- **Tailing per-session NDJSON files directly from bash:** Requires dynamic discovery of an unknown number of files. Bash `tail -F` on multiple files adds all output to the same stream without a file identifier in the output line — you can't distinguish which session an event came from. The fan-out writer solves this cleanly.
- **Using `tmux send-keys` to inject content into panes:** `send-keys` simulates keyboard input — it adds content to the pane's input buffer, not to the scrollback. For high-frequency streaming, use `tail -F` on a file from within the pane process (current pattern). For low-frequency state updates, `tmux display-message` or `tmux pipe-pane -I` are options, but introduce complexity.
- **Blocking on session filter in the pane script:** The `s` key binding runs in tmux's key table context. Never make the pane script wait/poll for a key event. State files read on each event iteration are the correct pattern.
- **Writing to the aggregated NDJSON file from multiple processes:** Only the TmuxFanout writer should write to `pde-multi-session.ndjson`. Multiple concurrent writers cause interleaved partial lines. The Aggregator is a single EventEmitter in the coordinator process — one handler, one writer.
- **Reading from `dispatcher.pids` in the pane bash script:** The PIDs file is written by the Node.js registry. Reading it from bash with jq mid-stream requires correct handling of concurrent writes. The cycle script (tmux-cycle-session.cjs) should be a node script that handles file read atomically.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session color assignment | Custom hash function | Modulo-6 over insertion-order index | Same pattern as dashboard session-colors.ts — deterministic, predictable, testable |
| Interactive session picker | ncurses popup in pane script | tmux `display-menu` or state-file cycle | Pane script can't intercept keys directly without exiting its streaming loop |
| Per-pane tmux key bindings | Custom tmux plugin | `bind-key -T root` in monitor-dashboard.sh | Simple, no plugin infrastructure, works with existing session setup |
| Multi-file tail aggregation | Shell while-loop tailing multiple files | Single fan-out NDJSON file | `tail -F file1 file2` doesn't label output by source — can't distinguish sessions |
| Session source detection in bash | Complex registry parsing in shell | `_pde_session_source` field written by Node.js | Node.js already has registry access; bash string parsing of JSON is fragile |

**Key insight:** All complexity should live in Node.js (the fan-out writer and cycle helper). The bash pane scripts should do one thing: tail a file and format each line. Keep bash scripts as thin renderers.

---

## Common Pitfalls

### Pitfall 1: Multi-Session NDJSON Written Before Coordinator Starts

**What goes wrong:** `pde-multi-session.ndjson` may not exist when the pane script starts. `tail -F` handles nonexistent files gracefully (polls until the file appears), but if the coordinator is not running at all, the pane shows the waiting message indefinitely.

**Why it happens:** The fan-out writer only starts when `DispatchCoordinator` is instantiated with `--parallel`. Single-session invocations never create this file.

**How to avoid:** The aggregated panes should fall back to the single-session NDJSON path when the combined file doesn't exist after a timeout. Or: document that these panes only show multi-session data when `--parallel` is active. Simplest: show a clear "waiting for parallel sessions..." message.

**Warning signs:** Pane shows waiting message but single-session dashboard is active.

### Pitfall 2: Color Index Mismatch Between Sessions

**What goes wrong:** If the TmuxFanout writer restarts (coordinator restart), session color indices reset. Session `p148-1-abc` was blue before restart; after restart it gets a new index.

**Why it happens:** Session indices are stored in `_sessionIndex` Map in the TmuxFanout instance, which is garbage-collected on restart.

**How to avoid:** The `_pde_color_index` is appended to each NDJSON line at write time. Once a session's first event is written with a color index, that index is fixed in the file. Existing scrollback retains the original colors. New events after restart may get different indices for the same session, but this only affects future output.

**Warning signs:** Session color changes mid-stream after a coordinator restart.

### Pitfall 3: `s` Key Binding Conflicts with tmux Prefix

**What goes wrong:** `bind-key -n s` binds `s` globally in the `root` key table, intercepting `s` keypresses everywhere including in pane 5 itself. If the user types `s` in any pane, it triggers the cycle script.

**Why it happens:** `-n` means "no prefix" — the key is active without pressing the tmux prefix first.

**How to avoid:** Use `bind-key s` (with prefix) instead of `bind-key -n s`, or use a less common key combo. The requirement says `s` key — verify with the user whether this means prefix+s or bare s. For a monitoring dashboard, bare `s` in the dedicated tmux session is likely acceptable since the user isn't typing in these panes.

**Warning signs:** User reports that typing `s` in any pane triggers session cycling.

### Pitfall 4: jq Shell Invocation on Every Event Line

**What goes wrong:** Each event line in the bash pane scripts spawns a `jq` subprocess for each field extraction (5+ jq calls per line in the current pane-log-stream.sh). At high event frequency (20+ events/sec), this creates CPU spikes.

**Why it happens:** Existing pane scripts call `$(echo "$line" | jq -r ...)` for each field. With multiple sessions, event frequency multiplies.

**How to avoid:** Use a single `jq` call that extracts all needed fields at once and splits on a delimiter: `echo "$line" | jq -r '[.event_type, .ts, ._pde_session_id, ._pde_session_source, ._pde_color_index] | join("|")'`. Then use `IFS='|' read -r event_type ts session_id source color_idx <<< "$parsed"`.

**Warning signs:** High CPU usage from `jq` subprocesses while dashboard is running.

### Pitfall 5: Filter State Not Refreshing Between Events

**What goes wrong:** The filter variable is read once at the top of the `while` loop and cached. The `s`/`a` key changes the state file, but the pane script's bash variable doesn't update.

**Why it happens:** Variables set in a pipeline subshell (the `while IFS= read` loop) are isolated from the parent shell. And even in the parent shell, a variable set before the loop won't see updates from another process.

**How to avoid:** Read the filter file inside the loop on each event: `FILTER=$(cat /tmp/pde-tmux-filter.txt 2>/dev/null || echo "all")`. The disk read cost is negligible at event frequencies typical for PDE sessions.

**Warning signs:** Pressing `s` appears to change the filter state file but the pane continues showing all sessions.

---

## Code Examples

### Registering TmuxFanout in coordinator.cjs

```javascript
// Source: coordinator.cjs constructor pattern (Phase 144 _deps injection)
// Add to DispatchCoordinator constructor:
const { TmuxFanout } = require('./tmux-fanout.cjs');
this._tmuxFanout = new TmuxFanout(this._aggregator, this._registry);
this._tmuxFanout.start();

// Add to shutdown():
shutdown() {
  for (const { kill } of this._sessions.values()) { kill(); }
  this._aggregator.stopAll();
  this._tmuxFanout.stop();  // NEW
}
```

### tmux-cycle-session.cjs Pattern

```javascript
// Source: registry.cjs pattern (Phase 144)
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const FILTER_FILE = path.join(os.tmpdir(), 'pde-tmux-filter.txt');
const PIDS_FILE = process.argv[2]; // .planning/dispatcher.pids

function cycleSession() {
  let sessions = [];
  try {
    const raw = JSON.parse(fs.readFileSync(PIDS_FILE, 'utf8'));
    sessions = Object.entries(raw.sessions || {})
      .filter(([, entry]) => entry.status === 'running')
      .map(([id]) => id)
      .sort();
  } catch (_) {}

  const current = (() => {
    try { return fs.readFileSync(FILTER_FILE, 'utf8').trim(); } catch { return 'all'; }
  })();

  let next;
  if (current === 'all') {
    next = sessions[0] || 'all';
  } else {
    const idx = sessions.indexOf(current);
    if (idx === -1 || idx === sessions.length - 1) {
      next = 'all';
    } else {
      next = sessions[idx + 1];
    }
  }
  fs.writeFileSync(FILTER_FILE, next, 'utf8');
}

cycleSession();
```

### tmux Key Binding Setup in monitor-dashboard.sh

```bash
# Source: tmux manpage bind-key syntax + qmacro.org display-menu example
# After build_full_layout(), add these bindings:
REGISTRY_PATH="${CWD}/.planning/dispatcher.pids"

# s = cycle through sessions (wraps: all → sess1 → sess2 → all)
tmux bind-key s run-shell "node '${PLUGIN_ROOT}/bin/lib/tmux-cycle-session.cjs' '${REGISTRY_PATH}'"

# a = show all sessions (reset filter)
tmux bind-key a run-shell "printf 'all' > /tmp/pde-tmux-filter.txt"
```

Note: `bind-key` (without `-n`) requires the tmux prefix key first. If bare-key behavior is required, use `bind-key -T root s`. Document the choice clearly in monitor-dashboard.sh.

### Single jq Extraction Per Event Line

```bash
# Source: bash IFS read pattern (verified working in bash 3.2+ on macOS)
parsed=$(echo "$line" | jq -r '[
  (.event_type // ""),
  (.ts | split("T")[1] | split(".")[0]),
  (._pde_session_id // ""),
  (._pde_session_source // "L"),
  (._pde_color_index // 0 | tostring)
] | join("|")' 2>/dev/null)
IFS='|' read -r event_type ts session_id session_source color_idx <<< "$parsed"
[ -z "$event_type" ] && continue
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-session NDJSON per pane | Combined multi-session NDJSON (fan-out writer) | Phase 148 | Panes can render all sessions without script-level file discovery |
| Fixed single-session color (green/yellow per event type) | Per-session 6-color ANSI palette | Phase 148 | Color identity persists across all pane events for a given session |
| Single token accumulator (one session) | Multi-session accumulator with filter | Phase 148 | Aggregate cost visible; per-session drill-down via `s` key |

---

## Open Questions

1. **Bare `s` key vs prefix+`s` key**
   - What we know: The requirement says `s` key; using `bind-key -n s` intercepts bare `s` globally in the pde-monitor tmux session
   - What's unclear: Whether users will want to type `s` in other panes within the same session (unlikely for a monitoring dashboard)
   - Recommendation: Use `bind-key s` (prefix+s) for safety, document in monitor-dashboard.sh. Plan can default to prefix+s and the planner can note this as a decision point.

2. **TmuxFanout initialization: always-on vs --parallel-only**
   - What we know: The fan-out file is only meaningful when `--parallel` is active; single-session runs don't need it
   - What's unclear: Whether the monitoring dashboard should gracefully degrade when parallel dispatch is not active
   - Recommendation: Always start TmuxFanout but document in pane scripts that the "multi-session" panes show a waiting message until `--parallel` sessions appear. This avoids adding conditional initialization logic to the coordinator.

3. **File rotation: should pde-multi-session.ndjson be truncated on coordinator restart?**
   - What we know: The file grows unboundedly across multiple dispatcher invocations; `tail -F` handles this
   - What's unclear: Whether stale events from prior runs should appear on restart
   - Recommendation: Truncate (open with `w` flag) at TmuxFanout startup rather than append, so the pane only shows current run events. This matches user expectation.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 20+ | tmux-cycle-session.cjs, tmux-fanout.cjs | Yes | v20.20.0 | — |
| bash | All pane scripts | Yes (macOS + Linux) | 3.2+ (macOS ships 3.2) | — |
| jq | Event field parsing in pane scripts | Soft-required (existing scripts warn if missing) | 1.6+ | Limited rendering without field labels |
| tmux | monitor-dashboard.sh | Not in current shell context (detected via `command -v tmux` in dashboard script) | 3.1+ recommended for display-menu | Existing monitor-dashboard.sh handles missing tmux gracefully |

**Missing dependencies with no fallback:**
- None for required functionality. Pane scripts degrade gracefully without jq (warn at startup).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 |
| Config file | vitest.config.ts (project root) |
| Quick run command | `npx vitest run tests/dispatcher/tmux-fanout.test.cjs` |
| Full suite command | `npx vitest run tests/dispatcher/` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TMX-01 | TmuxFanout writes enriched NDJSON to combined file | unit | `npx vitest run tests/dispatcher/tmux-fanout.test.cjs` | No — Wave 0 |
| TMX-01 | TmuxFanout enriches events with `_pde_session_id`, `_pde_session_source`, `_pde_color_index` | unit | `npx vitest run tests/dispatcher/tmux-fanout.test.cjs` | No — Wave 0 |
| TMX-01 | TmuxFanout stop() removes aggregator listener | unit | `npx vitest run tests/dispatcher/tmux-fanout.test.cjs` | No — Wave 0 |
| TMX-02 | backend=local maps to source `L`, backend=ssh maps to `R` | unit | `npx vitest run tests/dispatcher/tmux-fanout.test.cjs` | No — Wave 0 |
| TMX-03 | Color index assigns modulo 6, first session = 0 | unit | `npx vitest run tests/dispatcher/tmux-fanout.test.cjs` | No — Wave 0 |
| TMX-04 | tmux-cycle-session cycles: all → sess1 → sess2 → all | unit | `npx vitest run tests/tmux-cycle-session.test.cjs` | No — Wave 0 |
| TMX-05 | tmux-cycle-session reads registry, advances filter | unit | `npx vitest run tests/tmux-cycle-session.test.cjs` | No — Wave 0 |
| TMX-05 | tmux-cycle-session wraps back to `all` from last session | unit | `npx vitest run tests/tmux-cycle-session.test.cjs` | No — Wave 0 |
| Smoke | pane bash scripts parse `_pde_session_id` and `_pde_color_index` fields correctly | manual | Run `bash bin/pane-agent-activity.sh /tmp/pde-multi-session.ndjson` with test fixture | — |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/dispatcher/tmux-fanout.test.cjs`
- **Per wave merge:** `npx vitest run tests/dispatcher/`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- `tests/dispatcher/tmux-fanout.test.cjs` — covers TMX-01, TMX-02, TMX-03
- `tests/tmux-cycle-session.test.cjs` — covers TMX-04, TMX-05

*(Existing `aggregator.test.cjs` and `coordinator-smoke.test.cjs` are sufficient for regression coverage of the integration point — no new fixtures needed there.)*

---

## Sources

### Primary (HIGH confidence)

- Aggregator.cjs + coordinator.cjs (project codebase) — confirmed EventEmitter pattern, `backend` field location, fan-out integration point
- Debian tmux manpage (`https://manpages.debian.org/testing/tmux/tmux.1.en.html`) — pipe-pane `-I` flag behavior confirmed: "stdout is connected (so anything shell-command prints is written to the pane as if it were typed)"; send-keys `-t` target syntax confirmed
- tmux GitHub Advanced Use wiki (`https://github.com/tmux/tmux/wiki/Advanced-Use`) — `split-window -I` and `display -I` patterns for pane content injection confirmed
- pane-agent-activity.sh, pane-log-stream.sh, pane-token-meter.sh (project codebase) — exact bash pattern used by existing scripts; confirmed tail -F + jq subprocess approach
- registry.cjs (project codebase) — `backend` field structure confirmed; `local`/`ssh`/`managed` values
- dashboard/lib/session-colors.ts (project codebase) — 6-color palette; modulo-6 index assignment pattern confirmed

### Secondary (MEDIUM confidence)

- tmux manpage via man7.org (`https://www.man7.org/linux/man-pages/man1/tmux.1.html`) — bind-key `-T` table syntax confirmed
- qmacro.org display-menu article (`https://qmacro.org/blog/posts/2021/08/12/session-switching-with-the-tmux-menu/`) — display-menu triplet syntax (name key command) verified via cross-reference with Debian manpage
- ANSI 256-color chart (`https://www.ditig.com/256-colors-cheat-sheet`) — color codes for 256-color palette mapping

### Tertiary (LOW confidence)

- WebSearch result re: `tail -F` with multiple files not labeling source — verified reasoning from known bash behavior, not a specific source

---

## Project Constraints (from CLAUDE.md)

*(CLAUDE.md not found in project root — no project-specific directives to apply. Standard PDE conventions apply per STATE.md Accumulated Context.)*

**PDE conventions enforced (from STATE.md):**
- `packages/dispatcher/` is CJS — no ESM unless dynamic import() bridge
- Plugin root (bin/) stays zero-npm-dependency — bash scripts and node built-ins only
- DI via constructor parameter injection for testability (not vi.mock)
- Array args to child_process — no shell interpolation in spawn calls
- All new modules in `packages/dispatcher/lib/` follow existing naming pattern

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All components are existing Node.js built-ins and bash; no external library choices to make
- Architecture: HIGH — Fan-out writer pattern is directly analogous to existing event-bus.cjs safeAppendEvent; aggregator integration point is explicitly called out in aggregator.cjs comments as "Phase 148: aggregator.on('event')"
- Pitfalls: HIGH — Bash-specific pitfalls (subshell variable isolation, jq subprocess cost) are well-understood and verified from existing pane script patterns
- tmux API: HIGH — pipe-pane -I, send-keys -t, bind-key confirmed from official manpage

**Research date:** 2026-03-27
**Valid until:** 2026-06-27 (tmux API is stable; no fast-moving dependencies)
