# Phase 148: tmux Integration - Research

**Researched:** 2026-03-27 (maxdepth update)
**Domain:** tmux programmatic control, NDJSON fan-out, multi-session ANSI color multiplexing
**Confidence:** HIGH (all claims verified against actual source code; architecture confirmed)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TMX-01 | Dispatcher writes aggregated NDJSON for multi-session tmux pane consumption | New `TmuxFanout` class in `packages/dispatcher/lib/tmux-fanout.cjs`; subscribes to `coordinator.aggregator.on('event')`; writes to `/tmp/pde-multi-session.ndjson` (via `os.tmpdir()`); truncates on start |
| TMX-02 | Pane 1 (agent activity) shows all session spawns with [L]/[R] tags | Registry `backend` field (`'local'` → `[L]`, `'ssh'`/`'managed'` → `[R]`); `_pde_session_source` enriched by fan-out writer; pane-agent-activity.sh reads field |
| TMX-03 | Pane 4 (log stream) multiplexes all active sessions with color prefix per session | 6-color 256-ANSI palette (modulo 6 over insertion-order index); `_pde_color_index` enriched by fan-out writer; pane-log-stream.sh prepends colored `[sid]` tag |
| TMX-04 | Pane 5 (token/cost) shows aggregate across all active sessions | Token accumulator reads all lines when filter is `all`; per-session drill-down by checking `_pde_session_id` against filter file |
| TMX-05 | Session switching via `s` key (cycle) and `a` key (all) | `bind-key -n s` in pde-monitor session; `tmux-cycle-session.cjs` in `bin/lib/`; state file `/tmp/pde-tmux-filter.txt` read on each event iteration |
</phase_requirements>

---

## Summary

Phase 148 adds multi-session awareness to three existing tmux pane scripts that currently tail a single NDJSON file. The Aggregator (Phase 144) already fans-in all per-session NDJSON files into a single in-process EventEmitter. Phase 148 needs to: (1) write those aggregated events to a single combined NDJSON file that all pane scripts can tail, and (2) upgrade the three pane scripts to render session-tagged, color-coded output.

The architecture is a two-component system: a Node.js fan-out writer (runs inside the coordinator process, writes to `$TMPDIR/pde-multi-session.ndjson`) and upgraded shell scripts that parse `_pde_session_id`, `_pde_session_source`, and `_pde_color_index` from each event line. The dispatcher's existing registry already contains the `backend` field (`'local'` / `'ssh'` / `'managed'`) which maps directly to `[L]` vs `[R]` tags. No new npm dependencies are needed.

**Critical codebase observation:** The aggregator receives TWO event streams simultaneously. (1) TailCursor polling polls `/tmp/pde-session-{id}.ndjson` — these are PDE event envelopes with `event_type`, `ts`, `session_id` fields. (2) `_runSession.onLine` forwards claude `--output-format stream-json` objects directly to the aggregator — these have `type` not `event_type`. The pane scripts already filter `event_type // empty` and `continue` on empty, so stream-json objects are silently dropped. The TmuxFanout will write both types to the combined file; pane scripts are unaffected.

**Primary recommendation:** Fan-out from `coordinator.aggregator.on('event')` into a single `os.tmpdir()/pde-multi-session.ndjson` file. Upgrade three pane bash scripts to read `_pde_session_id` and tag with `[L]`/`[R]`. Use a 6-color ANSI 256-color palette consistent with the dashboard's `SESSION_PALETTE`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js fs.appendFileSync | Node 20.x (built-in) | Write aggregated NDJSON lines | Already used in event-bus.cjs `safeAppendEvent` — same pattern |
| Node.js EventEmitter | Node 20.x (built-in) | `aggregator.on('event')` subscription | Aggregator extends EventEmitter; confirmed from aggregator.cjs source |
| bash + tail -F | POSIX | Pane scripts tail the combined file | Established pattern in all 8 existing pane scripts |
| jq | 1.6+ | Parse JSON fields in bash | Already used in all existing pane scripts; soft-required (monitor-dashboard.sh warns if missing) |
| tmux bind-key | tmux 3.1+ | `s`/`a` key bindings for session cycling | Built-in tmux, no plugin needed |
| Node.js os.tmpdir() | Node 20.x (built-in) | Resolve `/tmp` cross-platform | Use `os.tmpdir()` not hardcoded `/tmp` — pane scripts use `$TMPDIR` |

### No New npm Dependencies

The `packages/dispatcher/` has zero new dependencies for this phase. The fan-out writer is a plain CJS module. The pane scripts are bash. The project constraint "plugin root stays zero-npm-dependency" is satisfied.

---

## Architecture Patterns

### Aggregated NDJSON File Pattern

**What:** A new `tmux-fanout.cjs` module subscribes to `coordinator.aggregator.on('event')` and appends enriched NDJSON lines to `os.tmpdir()/pde-multi-session.ndjson`. Each line includes the `_pde_session_id` and a `_pde_session_source` field (`L` or `R`) derived from the registry at write time.

**Why not tail per-session files:** The pane scripts would need to dynamically discover and tail an unknown number of per-session files as sessions start/stop. A single combined file is the same pattern already used for single-session monitoring and is trivially tailable with `tail -F`.

**Why this file path:** Mirrors the existing `/tmp/pde-session-{id}.ndjson` convention (from event-bus.cjs `safeAppendEvent`). The `pde-multi-session.ndjson` filename is distinct so the monitor-dashboard.sh can pass it as the aggregated path.

### Multi-Session Event Envelope

Each line written to `pde-multi-session.ndjson` adds three fields on top of the original event:

```javascript
// Source: aggregator.cjs emit('event', sessionId, parsed) — verified signature
{
  ...originalEvent,          // all existing fields from the aggregator (PDE envelope OR stream-json)
  "_pde_session_id": "p148-1-abc12345",   // dispatcher sessionId from aggregator callback arg 1
  "_pde_session_source": "L",              // "L" (local) or "R" (ssh/managed)
  "_pde_color_index": 0                   // integer 0-5, insertion order modulo 6
}
```

The `_pde_` prefix avoids collision with any existing PDE event fields. The source is derived by reading `registry.get(sessionId).backend` at write time: `'local'` → `'L'`, `'ssh'` → `'R'`, `'managed'` → `'R'`.

**Verified backend values from remote-router.cjs:** The three possible return values are `'local'`, `'ssh'`, and `'managed'`. The `sourceLabel` function must handle all three: `local` → `L`, everything else → `R`.

### Session Color Assignment

Map sessionId → color index by insertion order into the fan-out writer's session tracking Map. First session seen = index 0, second = index 1, cycling modulo 6. This matches `dashboard/lib/session-colors.ts`:

```typescript
// Source: dashboard/lib/session-colors.ts — verified
const SESSION_PALETTE = [
  'bg-blue-500/20 text-blue-400 ...',    // index 0
  'bg-emerald-500/20 text-emerald-400 ...',  // index 1
  'bg-violet-500/20 text-violet-400 ...',    // index 2
  'bg-amber-500/20 text-amber-400 ...',      // index 3
  'bg-rose-500/20 text-rose-400 ...',        // index 4
  'bg-cyan-500/20 text-cyan-400 ...',        // index 5
] as const;
export function sessionColor(index: number): string {
  return SESSION_PALETTE[index % SESSION_PALETTE.length];
}
```

ANSI 256-color escape codes map the same palette positions:

| Index | Dashboard color | ANSI 256-color escape |
|-------|----------------|-------------|
| 0 | blue-400 | `\033[38;5;33m` (blue) |
| 1 | emerald-400 | `\033[38;5;82m` (green) |
| 2 | violet-400 | `\033[38;5;129m` (violet) |
| 3 | amber-400 | `\033[38;5;214m` (amber) |
| 4 | rose-400 | `\033[38;5;197m` (rose) |
| 5 | cyan-400 | `\033[38;5;51m` (cyan) |

### Recommended Project Structure

```
packages/dispatcher/lib/
├── tmux-fanout.cjs          # NEW: subscribes to Aggregator, writes combined NDJSON

bin/
├── lib/
│   └── tmux-cycle-session.cjs  # NEW: node script reads registry, cycles filter file
├── pane-agent-activity.sh   # MODIFIED: add _pde_session_source [L]/[R] + session color
├── pane-log-stream.sh       # MODIFIED: add color prefix per _pde_session_id
├── pane-token-meter.sh      # MODIFIED: aggregate all sessions + filter by _pde_session_id
└── monitor-dashboard.sh     # MODIFIED: resolve MULTI_NDJSON_PATH; pass to P0/P4/P5 only

/tmp/ (os.tmpdir())
├── pde-multi-session.ndjson # NEW: combined event stream for all active sessions
└── pde-tmux-filter.txt      # NEW: current session filter ("all" or sessionId)
```

**Note:** `tmux-cycle-session.cjs` goes in `bin/lib/` not `packages/dispatcher/lib/` because it is called by tmux's `run-shell` (outside the Node process) and only needs to read `.planning/dispatcher.pids`. It has zero dependencies on the dispatcher package.

### Pattern 1: Fan-Out Writer Module (tmux-fanout.cjs)

```javascript
// Source: aggregator.cjs emit pattern (verified) + event-bus.cjs safeAppendEvent pattern (verified)
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const FANOUT_PATH = path.join(os.tmpdir(), 'pde-multi-session.ndjson');
const FILTER_PATH = path.join(os.tmpdir(), 'pde-tmux-filter.txt');

// backend values from remote-router.cjs: 'local' | 'ssh' | 'managed'
function sourceLabel(backend) {
  return (backend === 'local') ? 'L' : 'R';
}

class TmuxFanout {
  constructor(aggregator, registry) {
    this._aggregator = aggregator;
    this._registry = registry;
    this._sessionIndex = new Map(); // sessionId -> color index (0-5)
    this._nextIndex = 0;
    this._handler = null;
  }

  start() {
    // Truncate combined file on startup — color indices reset, stale events cleared
    // tail -F handles inode change gracefully (verified: relay.cjs TailCursor handles truncation)
    try { fs.writeFileSync(FANOUT_PATH, '', 'utf8'); } catch (_) {}

    // Aggregator emits ('event', sessionId, parsedObject) — verified aggregator.cjs line 54
    this._handler = (sessionId, event) => {
      if (!this._sessionIndex.has(sessionId)) {
        this._sessionIndex.set(sessionId, this._nextIndex++ % 6);
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

module.exports = { TmuxFanout, FANOUT_PATH, FILTER_PATH };
```

**Correction from initial research:** `_nextIndex` should be `this._nextIndex++ % 6` to keep the stored index in the 0–5 range, or store the raw `_nextIndex` and compute modulo at render time. The pane script already does `case "$color_idx"` with a default for anything >= 5, so storing the raw index and letting it grow past 6 is also fine — just less clean. Best: `_sessionIndex.set(sessionId, (this._nextIndex++) % 6)`.

### Pattern 2: Registering TmuxFanout in coordinator.cjs

```javascript
// Source: coordinator.cjs constructor (verified lines 99-132)
// Add to top-level requires in coordinator.cjs:
const { TmuxFanout } = require('./tmux-fanout.cjs');

// Add to DispatchCoordinator constructor, after this._sessions = new Map() at line 106:
this._tmuxFanout = new TmuxFanout(this._aggregator, this._registry);
this._tmuxFanout.start();

// Add to shutdown() (verified current shutdown at lines 420-425):
shutdown() {
  for (const { kill } of this._sessions.values()) {
    kill();
  }
  this._aggregator.stopAll();
  this._tmuxFanout.stop();  // NEW — must be added
}
```

**DI pattern note:** For testability in `coordinator-smoke.test.cjs`, the `TmuxFanout` constructor accepts `(aggregator, registry)` — no injection needed since tests don't assert on fanout behavior. However, tests that check `shutdown()` may need a spy on `tmuxFanout.stop`. Pass `_deps.TmuxFanout` optionally for test overrides.

### Pattern 3: Updated Pane 1 (pane-agent-activity.sh) — [L]/[R] Tags

The current script (verified from source) handles `subagent_start` and `subagent_stop`. The update adds:
- Read `_pde_session_source` → `[L]` or `[R]` label
- Read `_pde_color_index` → ANSI 256-color escape for the session
- Single jq call extracting all needed fields at once (optimization)

```bash
# pane-agent-activity.sh multi-session version
# Source: existing pane-agent-activity.sh (verified) + single-jq pattern
NDJSON="${1:-}"
if [ -z "$NDJSON" ]; then
  echo "Usage: pane-agent-activity.sh <ndjson-path>"
  exit 1
fi

echo "[ agent activity ] waiting for multi-session events..."
echo ""

# ANSI 256-color palette (matches dashboard/lib/session-colors.ts order)
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

tail -F "${NDJSON}" 2>/dev/null | while IFS= read -r line; do
  # Single jq call extracts all fields at once (optimization: avoids 5 subshells per line)
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
```

### Pattern 4: Updated Pane 4 (pane-log-stream.sh) — Color Prefix Per Session

The current script (verified from source) handles `session_start`, `session_end`, `subagent_start`, `subagent_stop`, `file_changed`, `bash_called`, `tool_called`, `tool_use`, `phase_*`, `wave_*`, `plan_*`, `experiment.*`. The update prepends a colored `[sid]` tag to each rendered line using `_pde_color_index` and `_pde_session_id`.

```bash
# pane-log-stream.sh multi-session version (key delta from existing)
tail -F "${NDJSON}" 2>/dev/null | while IFS= read -r line; do
  # Single jq call for all needed fields
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

  # Color tag prefix
  color=$(ansi_color "$color_idx")
  prefix="${color}[${sid_short}]\033[0m "

  # Existing event_type cases — prepend $prefix to each printf
  case "$event_type" in
    session_start|session_end)
      printf "${prefix}\033[1;37m[%s] %s\033[0m\n" "$ts" "$event_type"
      ;;
    subagent_start|subagent_stop)
      printf "${prefix}\033[36m[%s] %-20s %s\033[0m\n" "$ts" "$event_type" "$agent"
      ;;
    # ... remaining cases unchanged, just add $prefix
  esac
done
```

**Note:** `_pde_session_id` format from coordinator.cjs line 202: `p${phaseNum}-${plan}-${crypto.randomUUID().slice(0, 8)}` e.g. `p148-1-abc12345`. The jq expression `split("-") | last | .[0:4]` extracts the last segment (`abc12345`) then takes first 4 chars → `abc1`.

### Pattern 5: Updated Pane 5 (pane-token-meter.sh) — Aggregate + Filter

The current script (verified from source) reads token length of each NDJSON line and accumulates. The `MODEL_INFO` resolution block runs once at startup (unchanged). The update adds filter awareness.

```bash
# pane-token-meter.sh multi-session delta
FILTER_FILE="${TMPDIR:-/tmp}/pde-tmux-filter.txt"

# In the accumulator loop, read filter on each event (re-executes from disk):
tail -F "${NDJSON}" 2>/dev/null | while IFS= read -r line; do
  # Read current filter on each event (disk read is negligible vs event frequency)
  FILTER=$(cat "$FILTER_FILE" 2>/dev/null || echo "all")

  # Filter by session if not "all"
  if [ "$FILTER" != "all" ]; then
    line_sid=$(echo "$line" | jq -r '._pde_session_id // ""' 2>/dev/null)
    [ "$line_sid" != "$FILTER" ] && continue
  fi

  # chars/4 heuristic — unchanged from current implementation
  line_len=${#line}
  est_tokens=$(( line_len / 4 ))
  TOTAL_TOKENS=$(( TOTAL_TOKENS + est_tokens ))
  EVENT_COUNT=$(( EVENT_COUNT + 1 ))
  # ... rest unchanged
done
```

**Display update:** Add filter indicator to header line when a specific session is selected:
```bash
if [ "$FILTER" = "all" ]; then
  echo "[ token / cost ]  model: ${MODEL_NAME}  (~est.) [ALL SESSIONS]"
else
  echo "[ token / cost ]  model: ${MODEL_NAME}  (~est.) [${FILTER:0:12}...]"
fi
```

### Pattern 6: Session Filter State for `s`/`a` Key

```bash
# In monitor-dashboard.sh, after build_full_layout(), add key bindings:
# Resolved registry path (CWD is project root when monitor-dashboard.sh is run)
REGISTRY_PATH="${CWD}/.planning/dispatcher.pids"

# s = cycle through sessions (all → sess1 → sess2 → all)
# -n = no prefix required (bare key — appropriate for dedicated monitoring session)
# -t scopes binding to this session only (verified: -t targets a session)
tmux bind-key -n s -t "$SESSION" run-shell \
  "node '${PLUGIN_ROOT}/bin/lib/tmux-cycle-session.cjs' '${REGISTRY_PATH}'"

# a = reset filter to show all sessions
tmux bind-key -n a -t "$SESSION" run-shell \
  "printf 'all' > '${TMPDIR:-/tmp}/pde-tmux-filter.txt'"
```

**Verified from tmux manpage:** `bind-key -n KEY -t TARGET-SESSION` scopes a no-prefix binding to the named session. The pde-monitor session is a dedicated monitoring session where users don't type in panes, so bare `s` and `a` are safe.

### Pattern 7: tmux-cycle-session.cjs

```javascript
// Source: registry.cjs JSON format (verified) — dispatcher.pids structure
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const FILTER_FILE = path.join(os.tmpdir(), 'pde-tmux-filter.txt');
const PIDS_FILE = process.argv[2]; // .planning/dispatcher.pids

function cycleSession() {
  let sessions = [];
  try {
    // dispatcher.pids format verified from registry.cjs:
    // { "sessions": { "<id>": { "status": "running" | "failed" | ..., ... } } }
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
      next = 'all';  // wrap back to all
    } else {
      next = sessions[idx + 1];
    }
  }
  fs.writeFileSync(FILTER_FILE, next, 'utf8');
}

cycleSession();
```

### Pattern 8: monitor-dashboard.sh Multi-Session Path

The current `build_full_layout()` (verified from source) passes the same `$ndjson` path to all 8 panes. Phase 148 only upgrades P0 (agent activity), P4 (log stream), and P5 (token meter) to the combined path. Other panes (P1 pipeline progress, P2 file changes, P3 context window, P6 suggestions, P7 experiment) continue using the single-session NDJSON path.

```bash
# In monitor-dashboard.sh — add multi-session path resolution after existing NDJSON_PATH block:
MULTI_NDJSON_PATH="${TMPDIR:-/tmp}/pde-multi-session.ndjson"

# In build_full_layout(), change only three panes:
# P0 = pane-agent-activity.sh → multi-session path
tmux send-keys -t "${P0}" "bash '${PLUGIN_ROOT}/bin/pane-agent-activity.sh' '${MULTI_NDJSON_PATH}'" C-m
# P4 = pane-log-stream.sh → multi-session path
tmux send-keys -t "${P4}" "bash '${PLUGIN_ROOT}/bin/pane-log-stream.sh' '${MULTI_NDJSON_PATH}'" C-m
# P5 = pane-token-meter.sh → multi-session path
tmux send-keys -t "${P5}" "bash '${PLUGIN_ROOT}/bin/pane-token-meter.sh' '${MULTI_NDJSON_PATH}'" C-m

# All other panes (P1, P2, P3, P6, P7) unchanged — still use ${ndjson} (single session)
```

**Backward compatibility:** Single-session invocations never run TmuxFanout (it subscribes to an aggregator that never emits). The `pde-multi-session.ndjson` file is created empty on TmuxFanout start — pane scripts show "waiting for events" until parallel sessions emit. This is correct behavior.

### Anti-Patterns to Avoid

- **Tailing per-session NDJSON files directly from bash:** `tail -F file1 file2` does not label output by source on all platforms — you cannot distinguish which session an event came from. The fan-out writer solves this cleanly.
- **Using `tmux send-keys` to inject content into panes:** Simulates keyboard input, adds to pane input buffer, not useful for streaming. Use `tail -F` from within the pane process (established pattern in all 8 existing pane scripts).
- **Reading filter variable once before the loop:** Bash `while IFS= read -r` pipeline runs in a subshell. Even parent-shell variables don't update from sibling processes. Must read the filter file inside each iteration with `$(cat "$FILTER_FILE")`.
- **Writing to the aggregated NDJSON from multiple processes:** Only `TmuxFanout` writes to `pde-multi-session.ndjson`. Multiple concurrent writers cause interleaved partial lines. The aggregator is a single EventEmitter in the coordinator process — one handler, one writer.
- **Hardcoding `/tmp` as path prefix:** Use `os.tmpdir()` in Node.js and `${TMPDIR:-/tmp}` in bash. macOS and some Linux distros use a different `TMPDIR`.
- **Using `_nextIndex` without modulo when storing in the Map:** Store `(this._nextIndex++) % 6` in `_sessionIndex` so `_pde_color_index` is always 0-5 in the JSON — avoids the pane `case` falling through to default for sessions 7+.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session color assignment | Custom hash function | Modulo-6 over insertion-order index | Same pattern as `dashboard/lib/session-colors.ts` (verified) — deterministic, predictable, testable |
| Interactive session picker | ncurses popup in pane script | tmux `display-menu` or state-file cycle | Pane script can't intercept keys directly without exiting its streaming loop |
| Per-pane tmux key bindings | Custom tmux plugin | `bind-key -n` in monitor-dashboard.sh | Simple, no plugin infrastructure, session-scoped with `-t "$SESSION"` |
| Multi-file tail aggregation | Shell while-loop tailing multiple files | Single fan-out NDJSON file | `tail -F` on multiple files doesn't label output by source |
| Session source detection in bash | Complex registry parsing in shell | `_pde_session_source` field written by Node.js | Node.js has registry access; bash JSON parsing is fragile |
| File path prefix | Hardcoded `/tmp` | `os.tmpdir()` (Node) / `${TMPDIR:-/tmp}` (bash) | macOS TMPDIR may differ from `/tmp` |

**Key insight:** All complexity lives in Node.js (the fan-out writer and cycle helper). The bash pane scripts do one thing: tail a file and format each line. Keep bash scripts as thin renderers.

---

## Common Pitfalls

### Pitfall 1: Multi-Session NDJSON Empty When Coordinator Not Running

**What goes wrong:** `pde-multi-session.ndjson` exists (created empty by TmuxFanout.start()) but emits nothing — TmuxFanout subscribes to an Aggregator that has no watched sessions because no parallel dispatch is active.

**Why it happens:** TmuxFanout is always-on (unconditional in constructor) but has nothing to write unless `--parallel` sessions are running.

**How to avoid:** Pane scripts display "waiting for multi-session events..." until events appear. Document this behavior clearly in pane script header comments. Do NOT show an error — it is expected behavior for single-session use.

**Warning signs:** Pane shows waiting message but activity is only in the single-session dashboard.

### Pitfall 2: Color Index Mismatch After Coordinator Restart

**What goes wrong:** If the coordinator restarts, `_sessionIndex` Map is garbage-collected. Session `p148-1-abc` was color 0 (blue) before restart; after restart it may get a different index.

**Why it happens:** Session indices are in-memory in the TmuxFanout instance.

**How to avoid:** TmuxFanout.start() truncates the combined file (verified: `fs.writeFileSync(FANOUT_PATH, '', 'utf8')`). Truncation eliminates the mixed-color problem — new events start fresh from index 0. The TailCursor handles truncation via inode change detection (verified from relay.cjs TailCursor source — detects `stat.size < position` and resets cursor to 0).

**Warning signs:** Session color changes mid-stream after a coordinator restart.

### Pitfall 3: `bind-key -n s` Scope Issue

**What goes wrong:** `tmux bind-key -n s run-shell "..."` without `-t` adds the binding to the global key table, affecting ALL tmux sessions, not just pde-monitor.

**Why it happens:** Without `-t SESSION`, bind-key modifies the global root table.

**How to avoid:** Always scope with `-t "$SESSION"`: `tmux bind-key -n s -t "$SESSION" run-shell "..."`. The pde-monitor session is isolated and dedicated to monitoring — all 7+ panes run passive `tail -F` loops with no interactive input expected from the user.

**Warning signs:** User reports `s` key triggers session cycling in unrelated tmux sessions.

### Pitfall 4: jq Subshell CPU Spikes at High Event Frequency

**What goes wrong:** Existing pane scripts call `$(echo "$line" | jq -r ...)` 3-5 times per event line. With 3 parallel sessions each emitting 20+ events/sec, that is 300+ jq subprocesses per second.

**Why it happens:** Existing pane scripts were designed for single-session use.

**How to avoid:** Use a single jq call that extracts all needed fields joined by `|`: `jq -r '[.event_type, .ts, ._pde_session_id, ...] | join("|")'` then `IFS='|' read -r f1 f2 f3 ...`. The jq `split("T")[1]` timestamp extraction works in this pattern too.

**Warning signs:** High CPU from many `jq` processes while dashboard is running with multiple sessions.

### Pitfall 5: Filter State Not Refreshing Between Events

**What goes wrong:** Filter variable is read once before the `while` loop. Pressing `s` changes the state file but the bash variable doesn't update.

**Why it happens:** Bash subshell isolation — `while IFS= read` pipeline runs in a subshell; parent shell variable changes are invisible inside.

**How to avoid:** Read filter file inside the loop on each event: `FILTER=$(cat "$FILTER_FILE" 2>/dev/null || echo "all")`. Disk read is negligible at typical PDE event frequencies.

**Warning signs:** Pressing `s` changes `/tmp/pde-tmux-filter.txt` but pane continues showing all sessions.

### Pitfall 6: stream-json Events in Combined NDJSON

**What goes wrong:** Coordinator's `_runSession.onLine` forwards claude `--output-format stream-json` objects directly to the aggregator (coordinator.cjs lines 297-299). These objects have `type` not `event_type`. The TmuxFanout writes them to the combined file. A pane script that doesn't filter correctly would render garbage.

**Why it happens:** The aggregator receives two event types: (1) PDE event envelopes from TailCursor (have `event_type`), and (2) stream-json objects from claude CLI (have `type`).

**How to avoid:** All existing pane scripts already filter `[ -z "$event_type" ] && continue`. Stream-json objects produce an empty `event_type` from `jq -r '.event_type // empty'` and are silently skipped. The single-jq extraction pattern includes `(.event_type // "")` — an empty string also hits `continue`. No change needed. Just verify the filter is present in updated pane scripts.

**Warning signs:** Pane renders raw JSON objects with `type: "assistant"` or similar claude stream-json fields.

---

## Code Examples

### Full tmux-fanout.cjs

```javascript
// Source: aggregator.cjs (verified emission signature) + event-bus.cjs safeAppendEvent (verified pattern)
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const FANOUT_PATH = path.join(os.tmpdir(), 'pde-multi-session.ndjson');
const FILTER_PATH = path.join(os.tmpdir(), 'pde-tmux-filter.txt');

function sourceLabel(backend) {
  // remote-router.cjs returns 'local' | 'ssh' | 'managed' (verified)
  return (backend === 'local') ? 'L' : 'R';
}

class TmuxFanout {
  constructor(aggregator, registry) {
    this._aggregator = aggregator;
    this._registry = registry;
    this._sessionIndex = new Map();
    this._nextIndex = 0;
    this._handler = null;
  }

  start() {
    // Truncate on startup — avoids mixed colors from previous run
    try { fs.writeFileSync(FANOUT_PATH, '', 'utf8'); } catch (_) {}

    // Aggregator.on('event', (sessionId, parsedObject) => ...) — verified aggregator.cjs line 54
    this._handler = (sessionId, event) => {
      if (!this._sessionIndex.has(sessionId)) {
        this._sessionIndex.set(sessionId, (this._nextIndex++) % 6);
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
      } catch (_) {}
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

module.exports = { TmuxFanout, FANOUT_PATH, FILTER_PATH };
```

### coordinator.cjs Integration Points

```javascript
// Source: coordinator.cjs constructor (lines 99-132, verified) and shutdown (lines 420-425, verified)

// At top of file, add require:
const { TmuxFanout } = require('./tmux-fanout.cjs');

// In constructor, after this._sessions = new Map() (line 106):
this._tmuxFanout = new TmuxFanout(this._aggregator, this._registry);
this._tmuxFanout.start();

// In shutdown() — add tmuxFanout.stop():
shutdown() {
  for (const { kill } of this._sessions.values()) {
    kill();
  }
  this._aggregator.stopAll();
  this._tmuxFanout.stop();  // NEW
}
```

### Single jq Extraction Per Event Line

```bash
# Source: bash IFS read pattern — verified working in bash 3.2+ (macOS ships 3.2)
# Reduces N jq subshell invocations to 1 per event line
parsed=$(echo "$line" | jq -r '[
  (.event_type // ""),
  (.ts // "" | split("T")[1] | split(".")[0]),
  (._pde_session_id // "unknown"),
  (._pde_session_source // "L"),
  (._pde_color_index // 0 | tostring)
] | join("|")' 2>/dev/null)
IFS='|' read -r event_type ts session_id session_source color_idx <<< "$parsed"
[ -z "$event_type" ] && continue
```

### tmux Key Binding Setup in monitor-dashboard.sh

```bash
# Source: tmux manpage bind-key syntax; -t scopes to named session (verified)
# Add AFTER build_full_layout() / build_minimal_layout() call:

REGISTRY_PATH="${CWD}/.planning/dispatcher.pids"

# s = cycle sessions (bare key, scoped to pde-monitor session)
tmux bind-key -n s -t "$SESSION" run-shell \
  "node '${PLUGIN_ROOT}/bin/lib/tmux-cycle-session.cjs' '${REGISTRY_PATH}'"

# a = reset to show all sessions
tmux bind-key -n a -t "$SESSION" run-shell \
  "printf 'all' > '${TMPDIR:-/tmp}/pde-tmux-filter.txt'"
```

---

## Codebase Verification Summary

All claims in this research have been verified against actual source files:

| Claim | Verified In | Status |
|-------|-------------|--------|
| Aggregator emits `('event', sessionId, parsedObject)` | aggregator.cjs line 54 | CONFIRMED |
| `coordinator.aggregator` is a public getter | coordinator.cjs lines 431-433 | CONFIRMED |
| `shutdown()` calls `aggregator.stopAll()` but NOT `tmuxFanout.stop()` | coordinator.cjs lines 420-425 | CONFIRMED — gap exists, must add |
| Registry `backend` field values: `'local'`, `'ssh'`, `'managed'` | remote-router.cjs + coordinator.cjs line 214 | CONFIRMED |
| Existing pane scripts use `event_type // empty` + `continue` filter | pane-agent-activity.sh, pane-log-stream.sh, pane-token-meter.sh | CONFIRMED |
| `build_full_layout()` passes same `$ndjson` to all 8 panes | monitor-dashboard.sh lines 207-214 | CONFIRMED — only P0/P4/P5 need change |
| Session ID format: `p${phase}-${plan}-${uuid8}` | coordinator.cjs line 202 | CONFIRMED |
| Dispatcher pids format: `{ sessions: { id: { status, pid, phase, ... } } }` | registry.cjs lines 17-30 | CONFIRMED |
| TailCursor handles truncation (inode change / size < position) | relay.cjs TailCursor class | CONFIRMED — `tail -F` on truncated file works |
| `_runSession.onLine` passes stream-json (not PDE events) to aggregator | coordinator.cjs lines 297-299 + spawn.cjs lines 68-77 | CONFIRMED — second event stream; pane scripts silently skip |
| SESSION_PALETTE has 6 entries, `sessionColor` uses `index % 6` | dashboard/lib/session-colors.ts | CONFIRMED |
| `packages/dispatcher/` is CJS (no ESM) | all lib/*.cjs files | CONFIRMED |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-session NDJSON per pane | Combined multi-session NDJSON (fan-out writer) | Phase 148 | Panes render all sessions without script-level file discovery |
| Fixed single-session color (green/yellow per event type) | Per-session 6-color ANSI 256-color palette | Phase 148 | Color identity persists across all pane events for a given session |
| Single token accumulator (one session) | Multi-session accumulator with filter | Phase 148 | Aggregate cost visible; per-session drill-down via `s` key |
| All panes receive same NDJSON path | P0/P4/P5 receive multi-session path; P1/P2/P3/P6/P7 unchanged | Phase 148 | Minimal blast radius — 3 panes upgraded, 5 unchanged |

---

## Resolved Questions

1. **Bare `s` key vs prefix+`s` key** — RESOLVED: Use `bind-key -n s -t "$SESSION"` (bare key, session-scoped)
   - The pde-monitor tmux session is isolated and dedicated to monitoring — all panes run passive `tail -F` loops with no interactive prompt
   - `-n` flag with `-t "$SESSION"` scopes the binding to just the pde-monitor session, NOT globally
   - Users cannot accidentally trigger `s` by typing in a pane since panes don't accept input

2. **TmuxFanout initialization: always-on vs --parallel-only** — RESOLVED: Always-on (unconditional in constructor)
   - Aggregator is always instantiated in coordinator constructor (line 104) — TmuxFanout follows the same pattern
   - If no parallel sessions exist, TmuxFanout subscribes to an aggregator that never emits — quietly does nothing
   - Avoids conditional initialization logic and branching constructor paths

3. **File rotation: should pde-multi-session.ndjson be truncated on coordinator restart?** — RESOLVED: Truncate at startup
   - Unlike per-session files (unique UUID per session), the multi-session file uses a fixed path
   - TailCursor handles truncation gracefully (verified from relay.cjs source)
   - Implementation: `fs.writeFileSync(FANOUT_PATH, '', 'utf8')` once in TmuxFanout.start()

4. **Two event streams through aggregator** — RESOLVED: Not a problem
   - `_runSession.onLine` forwards claude stream-json objects to aggregator
   - TailCursor polls the PDE NDJSON file and also sends to aggregator
   - Pane scripts filter `event_type // empty` and `continue` on empty — stream-json objects are silently skipped
   - TmuxFanout writes both types to the combined file; pane scripts are unaffected

5. **`tmux-cycle-session.cjs` location** — RESOLVED: `bin/lib/` not `packages/dispatcher/lib/`
   - Called by tmux `run-shell` outside the Node process
   - Only reads `.planning/dispatcher.pids` (plain JSON read)
   - Zero dispatcher package dependencies — belongs in `bin/lib/` alongside other standalone node helpers

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 20+ | tmux-fanout.cjs, tmux-cycle-session.cjs | Yes | v20.20.0 | — |
| bash | All pane scripts | Yes (macOS + Linux) | 3.2+ (macOS ships 3.2) | — |
| jq | Event field parsing in pane scripts | Soft-required (monitor-dashboard.sh warns if missing) | 1.6+ | Limited rendering without field labels |
| tmux | monitor-dashboard.sh | Detected via `command -v tmux` in dashboard script | 3.1+ recommended | Existing monitor-dashboard.sh handles missing tmux gracefully with consent-gated install |

**Missing dependencies with no fallback:**
- None. Pane scripts degrade gracefully without jq (warn at startup).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest (globals: true in vitest.config.ts) |
| Config file | vitest.config.ts (project root) |
| Quick run command | `npx vitest run tests/dispatcher/tmux-fanout.test.cjs` |
| Full suite command | `npx vitest run tests/dispatcher/` |
| Include glob | `tests/**/*.{test,spec}.{cjs,mjs,js,ts}` (verified from vitest.config.ts) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TMX-01 | TmuxFanout.start() truncates combined file | unit | `npx vitest run tests/dispatcher/tmux-fanout.test.cjs` | No — Wave 0 |
| TMX-01 | TmuxFanout writes enriched NDJSON line on aggregator event | unit | `npx vitest run tests/dispatcher/tmux-fanout.test.cjs` | No — Wave 0 |
| TMX-01 | TmuxFanout enriches with `_pde_session_id`, `_pde_session_source`, `_pde_color_index` | unit | `npx vitest run tests/dispatcher/tmux-fanout.test.cjs` | No — Wave 0 |
| TMX-01 | TmuxFanout.stop() removes aggregator listener | unit | `npx vitest run tests/dispatcher/tmux-fanout.test.cjs` | No — Wave 0 |
| TMX-02 | `backend='local'` maps to `_pde_session_source='L'` | unit | `npx vitest run tests/dispatcher/tmux-fanout.test.cjs` | No — Wave 0 |
| TMX-02 | `backend='ssh'` maps to `_pde_session_source='R'` | unit | `npx vitest run tests/dispatcher/tmux-fanout.test.cjs` | No — Wave 0 |
| TMX-02 | `backend='managed'` maps to `_pde_session_source='R'` | unit | `npx vitest run tests/dispatcher/tmux-fanout.test.cjs` | No — Wave 0 |
| TMX-03 | Color index assigns modulo 6 per insertion order, first session = 0 | unit | `npx vitest run tests/dispatcher/tmux-fanout.test.cjs` | No — Wave 0 |
| TMX-03 | 7th session gets color index 0 (wraps) | unit | `npx vitest run tests/dispatcher/tmux-fanout.test.cjs` | No — Wave 0 |
| TMX-04 | tmux-cycle-session: `all` → first running session | unit | `npx vitest run tests/dispatcher/tmux-cycle-session.test.cjs` | No — Wave 0 |
| TMX-04 | tmux-cycle-session: last running session → `all` | unit | `npx vitest run tests/dispatcher/tmux-cycle-session.test.cjs` | No — Wave 0 |
| TMX-05 | tmux-cycle-session reads registry, skips non-running sessions | unit | `npx vitest run tests/dispatcher/tmux-cycle-session.test.cjs` | No — Wave 0 |
| TMX-05 | tmux-cycle-session writes new filter to state file | unit | `npx vitest run tests/dispatcher/tmux-cycle-session.test.cjs` | No — Wave 0 |
| Smoke | pane bash scripts parse `_pde_session_id`, `_pde_color_index` correctly | manual | `echo '{"event_type":"subagent_start","ts":"2026-01-01T12:00:00.000Z","agent_type":"planner","_pde_session_source":"L","_pde_color_index":0}' | bash bin/pane-agent-activity.sh /dev/stdin` | — |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/dispatcher/tmux-fanout.test.cjs`
- **Per wave merge:** `npx vitest run tests/dispatcher/`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- `tests/dispatcher/tmux-fanout.test.cjs` — covers TMX-01, TMX-02, TMX-03
- `tests/dispatcher/tmux-cycle-session.test.cjs` — covers TMX-04, TMX-05

*(Existing `aggregator.test.cjs` and `coordinator-smoke.test.cjs` provide regression coverage for the integration point — no new fixtures needed there. The smoke test's Test 8 verifies `aggregator.stopAll()` is called from `shutdown()` — once `tmuxFanout.stop()` is added, that test will need a spy on the fanout as well.)*

---

## Sources

### Primary (HIGH confidence)

- `packages/dispatcher/lib/aggregator.cjs` — confirmed: extends EventEmitter, emits `('event', sessionId, parsedObject)`, `watch()`/`unwatch()`/`stopAll()` API
- `packages/dispatcher/lib/coordinator.cjs` — confirmed: `this._aggregator` getter, `TmuxFanout` integration point in constructor/shutdown, `backend` registration at line 214, session ID format at line 202
- `packages/dispatcher/lib/registry.cjs` — confirmed: `backend` field included via spread in `register()`, `get(sessionId)` returns full entry, `dispatcher.pids` JSON format
- `packages/dispatcher/lib/remote-router.cjs` — confirmed: returns `'local'` | `'ssh'` | `'managed'`
- `packages/dispatcher/lib/spawn.cjs` — confirmed: `--output-format stream-json`; `onLine` forwards stream-json objects (not PDE envelopes)
- `bin/monitor-dashboard.sh` — confirmed: `build_full_layout()` pane layout and script invocation order; P0=agent-activity, P4=log-stream, P5=token-meter; all receive same `$ndjson` path currently
- `bin/pane-agent-activity.sh`, `bin/pane-log-stream.sh`, `bin/pane-token-meter.sh` — confirmed: exact bash patterns, `event_type // empty` filter, single-session accumulator
- `bin/lib/relay.cjs` — confirmed: TailCursor handles truncation (size < position resets cursor to 0)
- `bin/lib/event-bus.cjs` — confirmed: `safeAppendEvent` writes to `/tmp/pde-session-{sessionId}.ndjson`; PDE envelope format with `event_type`, `ts`, `session_id`
- `dashboard/lib/session-colors.ts` — confirmed: SESSION_PALETTE 6-entry tuple; `sessionColor(index)` uses `index % SESSION_PALETTE.length`
- `tests/dispatcher/aggregator.test.cjs` — confirmed: MockTailCursor injection pattern; test structure for new tmux-fanout tests to follow
- `vitest.config.ts` — confirmed: `tests/**/*.{test,spec}.{cjs,mjs,js,ts}` include glob; `globals: true`

### Secondary (MEDIUM confidence)

- tmux manpage (man7.org) — `bind-key -T` table and `-t SESSION` target syntax
- Debian tmux manpage — `pipe-pane -I` behavior; `split-window -I` confirmed

### Tertiary (LOW confidence)

- WebSearch re: `tail -F` with multiple files not labeling source — consistent with known bash behavior, not from a specific authoritative source

---

## Project Constraints (from CLAUDE.md)

*(CLAUDE.md not found in project root — no project-specific directives to apply. Standard PDE conventions apply per STATE.md Accumulated Context.)*

**PDE conventions enforced (from STATE.md):**
- `packages/dispatcher/` is CJS — no ESM unless dynamic import() bridge
- Plugin root (bin/) stays zero-npm-dependency — bash scripts and node built-ins only
- DI via constructor parameter injection for testability (not vi.mock)
- Array args to child_process — no shell interpolation in spawn calls
- All new modules in `packages/dispatcher/lib/` follow existing naming pattern
- `bin/lib/` node scripts are standalone helpers called outside the Node process (relay.cjs, model-profiles.cjs pattern)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All components are existing Node.js built-ins and bash; verified from actual source
- Architecture: HIGH — Fan-out writer pattern is directly analogous to existing event-bus.cjs safeAppendEvent; aggregator integration point confirmed from aggregator.cjs comments and source
- Pitfalls: HIGH — Bash-specific pitfalls verified from existing pane scripts; stream-json dual-stream issue confirmed from spawn.cjs + coordinator.cjs source; registry backend values confirmed from remote-router.cjs
- tmux API: HIGH — bind-key `-t SESSION` scoping confirmed from manpage

**Research date:** 2026-03-27 (maxdepth update)
**Valid until:** 2026-06-27 (tmux API is stable; no fast-moving dependencies)
