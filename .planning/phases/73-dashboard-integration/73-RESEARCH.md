# Phase 73: Dashboard Integration - Research

**Researched:** 2026-03-21
**Domain:** tmux pane scripting, bash ANSI formatting, Node.js CLI output, shell command routing
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | Pane 7 added to build_full_layout() only — build_minimal_layout() unchanged | Pattern established: existing pane scripts use `tmux split-window` + `tmux send-keys`; build_full_layout() is isolated from build_minimal_layout() |
| DASH-02 | Pane displays ranked suggestion list with ANSI formatting, passively and without alerts/beeps/modals | generateSuggestions() already produces formatted markdown; pane script reads /tmp/ file via `watch` or polling loop |
| DASH-03 | Zero-state fallback content displayed when no phase is active | AWAITING_MSG constant already defined in idle-suggestions.cjs; pane script checks for /tmp file absence |
| DASH-04 | Adaptive layout degradation preserved — existing 6→4→3→2 pane model not broken | build_minimal_layout() is a separate function; only build_full_layout() is modified |
| DASH-05 | /pde:suggestions CLI command provides non-tmux access to current suggestion list via pde-tools.cjs | Requires new `suggestions` subcommand in pde-tools.cjs + commands/suggestions.md |
| DASH-06 | monitor.md workflow documentation updated for 7-pane layout description | Requires edit to workflows/monitor.md |
</phase_requirements>

---

## Summary

Phase 73 completes the v0.10 Idle Time Productivity milestone by wiring the suggestion engine output (built in Phases 71-72) into the tmux dashboard (built in Phase 58-62). The suggestion content already exists at `/tmp/pde-suggestions-{sessionId}.md` — this phase is purely a display and access layer. No changes to the suggestion engine or hook system are required.

The implementation has two distinct surface areas: (1) adding Pane 7 to `build_full_layout()` in `bin/monitor-dashboard.sh` with a new `bin/pane-suggestions.sh` script that polls the `/tmp/` suggestion file, and (2) adding a `/pde:suggestions` command that reads and prints the same file to stdout for non-tmux users. Both are straightforward given the established patterns from the six existing pane scripts.

**Primary recommendation:** Create `bin/pane-suggestions.sh` following the `pane-token-meter.sh` polling model (not `tail -F` since the suggestion file is rewritten atomically, not appended). Wire it into `build_full_layout()` as the 7th pane using a right-column bottom split. Add `pde-tools.cjs suggestions` subcommand that reads the `/tmp/` file and prints to stdout.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| bash | system | Pane script implementation | All 6 existing pane scripts are bash |
| node:fs (sync) | Node.js built-in | Read suggestion file in CLI command | Matches zero-npm constraint; already used throughout pde-tools.cjs |
| tmux split-window | tmux system | Add Pane 7 to layout | Exact mechanism used for all existing panes |
| ANSI escape codes | n/a | Color formatting in pane | `printf '\033[...]'` pattern used in pane-token-meter.sh |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `watch` (bash loop with sleep) | system | Poll suggestion file for updates | When file is atomically replaced (not appended); `tail -F` won't catch rewrites |
| node:os tmpdir() | Node.js built-in | Resolve /tmp path portably | Consistent with how idle-suggestions.cjs and hooks already resolve this |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| polling loop in pane script | `tail -F` on suggestion file | `tail -F` tracks appends; suggestion file is replaced wholesale — polling is correct |
| polling loop in pane script | `inotifywait`/`fswatch` | Platform-specific dependency; polling with 2-3s interval is sufficient for passive display |
| direct `cat` in pane | Inline node call | Bash pane scripts are lighter, consistent with pattern |

**Installation:** No new packages required. All tools are built-in or already present.

---

## Architecture Patterns

### Recommended Project Structure

New files this phase:
```
bin/
└── pane-suggestions.sh    # NEW: Pane 7 content script
commands/
└── suggestions.md         # NEW: /pde:suggestions command definition
```

Modified files:
```
bin/monitor-dashboard.sh   # MODIFIED: add P6 split + pane-suggestions.sh wiring in build_full_layout()
bin/pde-tools.cjs          # MODIFIED: add 'suggestions' subcommand
workflows/monitor.md       # MODIFIED: describe 7-pane layout including Pane 7
```

### Pattern 1: Pane Script — Polling File Watcher

The suggestion pane reads `/tmp/pde-suggestions-{sessionId}.md` periodically. Unlike NDJSON panes that use `tail -F` for stream appends, the suggestion file is **atomically replaced** on each idle_prompt event, so `tail -F` would not reliably reflect updates.

**Established pattern (pane-token-meter.sh):** Uses a `tail -F ${NDJSON}` loop that re-renders on each new event. For the suggestion file, the equivalent is a polling `while true; do ... sleep 3; done` loop with full-screen clear-and-redraw.

```bash
# Source: bin/pane-token-meter.sh — polling/redraw pattern
while true; do
  printf '\033[H\033[J'       # clear screen (home + erase down)
  if [ -f "${SUGG_PATH}" ]; then
    cat "${SUGG_PATH}"
  else
    echo "${ZERO_STATE_MSG}"
  fi
  sleep 3
done
```

**Why sleep 3:** Passive display only; 3-second refresh is invisible to users. The suggestion file updates at most on meaningful PDE events (not every loop).

### Pattern 2: Pane 7 tmux Split

Examining `build_full_layout()`: the current layout creates 6 panes — P0 through P5. P5 is `token/cost` in the bottom-right. Pane 7 needs to fit the right column below P5, OR be a 7th split from an existing pane.

Current right-column structure:
- P1: `pipeline progress` (top right, 50% height)
- P4: `log stream` (below P1, 66% of lower half = ~33% total)
- P5: `token/cost` (below P4, 50% of remainder = ~17% total)

Adding P6 below P5 compresses all right-column panes. An alternative is placing P6 as a split from P0 (left column bottom) or creating a third column. **Recommended approach:** split P5 vertically to add P6 as `suggestions` below `token/cost`. The `suggestions` pane is supplementary content — it needs moderate height but not prime position.

```bash
# Source: bin/monitor-dashboard.sh — existing split pattern
P6=$(tmux split-window -v -dPF '#{pane_id}' -t "${session}:0.${P5}" -p 50)
tmux select-pane -t "${P6}" -T "suggestions"
tmux send-keys -t "${P6}" "bash '${PLUGIN_ROOT}/bin/pane-suggestions.sh' '${SUGG_PATH}'" C-m
```

Where SUGG_PATH is resolved the same way as NDJSON_PATH (reading session_id from config.json).

### Pattern 3: SUGG_PATH Resolution in monitor-dashboard.sh

Same Node.js inline resolution pattern already used for NDJSON_PATH:

```bash
SUGG_PATH=$(node -e "
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), '.planning/config.json'), 'utf-8'));
    const sid = cfg.monitoring && cfg.monitoring.session_id || 'unknown';
    console.log(path.join(os.tmpdir(), 'pde-suggestions-' + sid + '.md'));
  } catch(e) {
    console.log(path.join(os.tmpdir(), 'pde-suggestions-unknown.md'));
  }
" 2>/dev/null)
if [ -z "$SUGG_PATH" ]; then
  SUGG_PATH="/tmp/pde-suggestions-unknown.md"
fi
```

This mirrors lines 97-111 of monitor-dashboard.sh exactly.

### Pattern 4: /pde:suggestions Command

New command `commands/suggestions.md` following the minimal command pattern (like `commands/monitor.md`). The command calls `pde-tools.cjs suggestions` which:
1. Resolves session_id from config.json
2. Reads `/tmp/pde-suggestions-{sessionId}.md`
3. Prints content to stdout and exits

```javascript
// pde-tools.cjs suggestions subcommand
case 'suggestions': {
  const configPath = path.join(cwd, '.planning', 'config.json');
  let sessionId = 'unknown';
  try {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (cfg.monitoring && cfg.monitoring.session_id) {
      sessionId = cfg.monitoring.session_id;
    }
  } catch { /* use 'unknown' */ }
  const suggPath = path.join(os.tmpdir(), `pde-suggestions-${sessionId}.md`);
  try {
    const content = fs.readFileSync(suggPath, 'utf-8');
    process.stdout.write(content + '\n');
  } catch {
    const ZERO_STATE = 'Waiting for PDE to start a phase. Suggestions will appear when a phase completes.';
    process.stdout.write(ZERO_STATE + '\n');
  }
  break;
}
```

**Note:** `os` is not currently imported in pde-tools.cjs. Must add `const os = require('os');` at the top.

### Pattern 5: Zero-State Message

DASH-03 requires: "Waiting for PDE to start a phase. Suggestions will appear when a phase completes."

This is the *display-layer* zero state (file absent or empty). The *engine-layer* zero state is `AWAITING_MSG = '// awaiting phase data...'` from idle-suggestions.cjs, which appears in the file when it exists but the engine found no classified phase.

The pane script and CLI command must each handle:
- File missing → display the DASH-03 zero-state message
- File present, content is `// awaiting phase data...` → display as-is (engine's own zero state is valid output)

### Anti-Patterns to Avoid

- **Using `tail -F` on the suggestion file:** The file is atomically rewritten (fs.writeFileSync), not appended. `tail -F` will only show the original content if it's replaced mid-session. Use a polling loop.
- **Calling generateSuggestions() from pane script directly:** The pane script should read from `/tmp/` — the hook already writes there. Calling the engine directly bypasses the idle_prompt gating and could fire on every screen refresh.
- **Modifying build_minimal_layout():** DASH-04 explicitly prohibits any changes to `build_minimal_layout()`. Do not touch it.
- **Writing to stdout from the suggestions subcommand hook:** The existing zero-stdout constraint is for `hooks/idle-suggestions.cjs` only. The `pde-tools.cjs suggestions` subcommand is user-facing and MUST write to stdout.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Screen clear in pane | Custom escape sequences | `printf '\033[H\033[J'` | Already used in pane-token-meter.sh |
| Session ID resolution | Custom config parser | Inline node -e pattern from lines 97-111 of monitor-dashboard.sh | Already tested/working |
| /tmp path | Hardcoded `/tmp/` | `require('os').tmpdir()` | Portable across macOS and Linux |
| Pane split command | Custom tmux wrangling | `tmux split-window -v -dPF '#{pane_id}'` | Exact pattern from build_full_layout() |

**Key insight:** This phase is pure integration — all the hard pieces (suggestion generation, file writing, tmux layout, NDJSON resolution) exist. The work is wiring them together.

---

## Common Pitfalls

### Pitfall 1: File Atomicity and tail -F

**What goes wrong:** Using `tail -F` on `/tmp/pde-suggestions-{sessionId}.md` shows stale content because the hook handler replaces the file (not appends). `tail -F` tracks appends to an open file descriptor; when the file is replaced, it may continue reading from the old inode or show empty content.

**Why it happens:** The existing pane scripts all tail the NDJSON file which is only appended to. The suggestion file is different — it's overwritten with the full ranked list each time.

**How to avoid:** Use a `while true; do ... sleep N; done` polling loop in the pane script.

**Warning signs:** Pane shows suggestions that never update even when new events arrive.

### Pitfall 2: os module not imported in pde-tools.cjs

**What goes wrong:** Adding a `suggestions` subcommand that calls `os.tmpdir()` crashes at runtime with "os is not defined."

**Why it happens:** pde-tools.cjs currently does not require('os'). The os module is used in hooks/idle-suggestions.cjs and bin/lib/idle-suggestions.cjs, but not pde-tools.cjs itself.

**How to avoid:** Add `const os = require('os');` near the top of pde-tools.cjs alongside the existing require statements (lines 159-172).

**Warning signs:** `node pde-tools.cjs suggestions` throws ReferenceError at runtime.

### Pitfall 3: Terminal width and suggestion content truncation

**What goes wrong:** ANSI color output from the suggestion engine includes no line-width controls. In a narrow tmux pane, lines wrap or get clipped, making the output unreadable.

**Why it happens:** The suggestion formatter in idle-suggestions.cjs uses a fixed `SLASH_FILL_WIDTH = 32` for header lines but suggestion text can be arbitrarily long.

**How to avoid:** The pane title and split dimensions set reasonable width. Existing panes (pane-token-meter.sh) do not do any wrapping — tmux handles visual wrapping natively. Accept the default tmux wrapping behavior. No action needed, but verify visually with a real terminal.

**Warning signs:** Suggestion lines running off-screen in a very narrow terminal (< 80 columns). This is acceptable degradation.

### Pitfall 4: Session ID mismatch after dashboard restart

**What goes wrong:** If the PDE session was restarted after the dashboard was launched, the SUGG_PATH in the pane script will point to the old session's suggestion file (which may have stale or no content).

**Why it happens:** SUGG_PATH is resolved once at dashboard launch time, from config.json's current session_id. The dashboard documentation already notes this for NDJSON (workflows/monitor.md line 46: "restart the dashboard... to pick up the new session ID").

**How to avoid:** Document the same note in the DASH-06 monitor.md update. The behavior is consistent with existing session handling.

**Warning signs:** Pane 7 shows zero-state message after a new PDE session was started while the dashboard was running.

### Pitfall 5: build_full_layout() right-column height compression

**What goes wrong:** Adding P6 below P5 compresses the token/cost pane to a very small height, making it unreadable.

**Why it happens:** P5 is already the smallest pane (bottom of 3-deep right column). Splitting it further creates a pane that's potentially only 5-8 rows tall.

**How to avoid:** Use `-p 50` (50/50 split) for both P5 and P6. Verify with a 120x30 minimum terminal. If height is insufficient, consider placing P6 as a left-column addition instead.

**Warning signs:** `token/cost` pane becomes too small to show cost/token values at 120x30 terminal size.

---

## Code Examples

Verified patterns from existing source:

### Pane split with ID capture (from build_full_layout())
```bash
# Source: bin/monitor-dashboard.sh lines 159-186
P6=$(tmux split-window -v -dPF '#{pane_id}' -t "${session}:0.${P5}" -p 50)
tmux select-pane -t "${P6}" -T "suggestions"
tmux send-keys -t "${P6}" "bash '${PLUGIN_ROOT}/bin/pane-suggestions.sh' '${SUGG_PATH}'" C-m
```

### Polling loop with screen redraw (adapted from pane-token-meter.sh)
```bash
# Source: bin/pane-token-meter.sh lines 83-84 — cursor positioning pattern
SUGG_PATH="${1:-}"
ZERO_STATE="Waiting for PDE to start a phase. Suggestions will appear when a phase completes."

echo "[ suggestions ]"
echo ""

while true; do
  # Move cursor to line 3 and erase down
  printf '\033[3;1H\033[J'
  if [ -f "${SUGG_PATH}" ]; then
    cat "${SUGG_PATH}"
  else
    printf '%s\n' "${ZERO_STATE}"
  fi
  sleep 3
done
```

### Session ID path resolution (from monitor-dashboard.sh lines 97-111)
```bash
# Source: bin/monitor-dashboard.sh
SUGG_PATH=$(node -e "
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), '.planning/config.json'), 'utf-8'));
    const sid = cfg.monitoring && cfg.monitoring.session_id || 'unknown';
    console.log(path.join(os.tmpdir(), 'pde-suggestions-' + sid + '.md'));
  } catch(e) {
    console.log(path.join(os.tmpdir(), 'pde-suggestions-unknown.md'));
  }
" 2>/dev/null)
if [ -z "$SUGG_PATH" ]; then
  SUGG_PATH="/tmp/pde-suggestions-unknown.md"
fi
```

### pde-tools.cjs suggestions subcommand
```javascript
// Source: pattern from pde-tools.cjs 'event-emit' case (lines 763-802)
case 'suggestions': {
  const os = require('os');  // or add to top-level requires
  const configPath = path.join(cwd, '.planning', 'config.json');
  let sessionId = 'unknown';
  try {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (cfg.monitoring && cfg.monitoring.session_id) {
      sessionId = cfg.monitoring.session_id;
    }
  } catch { /* use 'unknown' */ }
  const suggPath = path.join(os.tmpdir(), `pde-suggestions-${sessionId}.md`);
  try {
    const content = fs.readFileSync(suggPath, 'utf-8');
    process.stdout.write(content.trimEnd() + '\n');
  } catch {
    const ZERO_STATE = 'Waiting for PDE to start a phase. Suggestions will appear when a phase completes.';
    process.stdout.write(ZERO_STATE + '\n');
  }
  break;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 6-pane tmux layout | 7-pane layout (Phase 73) | Phase 73 | Adds passive suggestion visibility |
| Suggestions only in /tmp/ file | Suggestions visible in dashboard + CLI | Phase 73 | User can see suggestions without knowing file path |

**Prior work completed:**
- Phase 70: Hook handler, NDJSON gating, /tmp/ file writing
- Phase 71: Suggestion engine (generateSuggestions, rankSuggestions, classifyPhase)
- Phase 72: idle-catalog.md content, context-notes injection
- Phase 73: THIS PHASE — display layer only

---

## Open Questions

1. **P6 height at 120x30 minimum terminal**
   - What we know: P5 is already the 3rd pane in a right column at 120x30. Adding P6 splits P5 further.
   - What's unclear: Whether P5 at 50% of its current allocation is still readable (likely ~7-8 rows).
   - Recommendation: Implement with `-p 50` split, validate visually. If too short, adjust to place P6 differently (e.g., as a 3rd row in left column or an entirely new column approach).

2. **Zero-state message wording**
   - What we know: DASH-03 specifies exact text: "Waiting for PDE to start a phase. Suggestions will appear when a phase completes."
   - What's unclear: Whether the pane header "[ suggestions ]" counts toward the zero-state display or is separate.
   - Recommendation: Show header line + zero-state message below it, consistent with other pane scripts.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:assert` (CJS runner, matching Phase 70/71/72 pattern) |
| Config file | none — standalone CJS test files |
| Quick run command | `node hooks/tests/verify-phase-73.cjs` |
| Full suite command | `node hooks/tests/verify-phase-70.cjs && node hooks/tests/verify-phase-71.cjs && node hooks/tests/verify-phase-72.cjs && node hooks/tests/verify-phase-73.cjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | build_full_layout() contains P6 split; build_minimal_layout() unchanged | unit (source grep) | `node hooks/tests/verify-phase-73.cjs` | ❌ Wave 0 |
| DASH-02 | pane-suggestions.sh reads suggestion file and outputs ANSI content passively | integration | `node hooks/tests/verify-phase-73.cjs` | ❌ Wave 0 |
| DASH-03 | Zero-state message displayed when /tmp/ file absent | unit | `node hooks/tests/verify-phase-73.cjs` | ❌ Wave 0 |
| DASH-04 | build_minimal_layout() function is byte-for-byte unchanged from Phase 72 baseline | unit (source diff) | `node hooks/tests/verify-phase-73.cjs` | ❌ Wave 0 |
| DASH-05 | `node bin/pde-tools.cjs suggestions` prints suggestion content or zero-state to stdout | integration | `node hooks/tests/verify-phase-73.cjs` | ❌ Wave 0 |
| DASH-06 | workflows/monitor.md contains "7-pane" and "suggestions" and zero-state description | unit (source grep) | `node hooks/tests/verify-phase-73.cjs` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `node hooks/tests/verify-phase-73.cjs`
- **Per wave merge:** full suite command (all 4 phase verify scripts)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `hooks/tests/verify-phase-73.cjs` — covers DASH-01 through DASH-06

*(All tests in a single file, following Phase 70/71/72 pattern of one verify-phase-NN.cjs per phase)*

---

## Sources

### Primary (HIGH confidence)

- `bin/monitor-dashboard.sh` — full build_full_layout() and build_minimal_layout() implementations, NDJSON_PATH resolution pattern
- `bin/pane-token-meter.sh` — ANSI clear/redraw pattern, polling approach reference
- `bin/pane-agent-activity.sh`, `bin/pane-pipeline-progress.sh` — tail -F vs. polling distinction
- `bin/lib/idle-suggestions.cjs` — AWAITING_MSG constant, generateSuggestions() output format
- `hooks/idle-suggestions.cjs` — /tmp/ file path construction pattern (`pde-suggestions-${sessionId}.md`)
- `hooks/hooks.json` — confirms idle_prompt hook writes to /tmp/ only
- `bin/pde-tools.cjs` — existing subcommand patterns, missing `os` require
- `hooks/tests/verify-phase-72.cjs` — CJS test runner pattern to follow for Phase 73
- `.planning/REQUIREMENTS.md` — DASH-01 through DASH-06 exact text
- `.planning/STATE.md` — architectural constraints confirmed

### Secondary (MEDIUM confidence)

- tmux `split-window -p` behavior for vertical splits — well-established, consistent with existing usage
- `tail -F` vs. polling semantics for atomically-replaced files — confirmed by understanding how fs.writeFileSync works (atomic replace, not append)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools are system-provided or already in use; no new dependencies
- Architecture: HIGH — implementation patterns are directly observable in existing code
- Pitfalls: HIGH — derived from code reading, not speculation

**Research date:** 2026-03-21
**Valid until:** 2026-04-20 (stable implementation, no external dependencies)
