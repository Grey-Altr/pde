---
phase: 58-event-infrastructure-core
plan: 03
subsystem: infra
tags: [hooks, claude-code, ndjson, event-bus, observability, hook-handler, validation]

# Dependency graph
requires:
  - phase: 58-01
    provides: safeAppendEvent, event-bus.cjs, session UUID management
  - phase: 58-02
    provides: pde-tools.cjs event-emit and session-start subcommands

provides:
  - hooks/hooks.json — Claude Code hook declarations for 5 lifecycle events with correct double-nested structure
  - hooks/emit-event.cjs — stdin adapter mapping Claude Code hook payloads to pde-tools.cjs event-emit calls
  - .planning/phases/58-event-infrastructure-core/validate-events.sh — end-to-end validation script for all 5 EVNT requirements

affects:
  - 59-tmux-dashboard (dashboard reads NDJSON from /tmp/pde-session-*.ndjson written automatically via hooks)
  - 60-archiver (archiver reads NDJSON from session files created by hooks)
  - 61-token-estimator (token estimator reads NDJSON session files)
  - 62-semantic-events (manual event-emit calls supplement auto-captured hook events)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Double-nested hooks.json structure: outer array is matcher list, inner 'hooks' array is definitions"
    - "async: false for SessionStart/SessionEnd hooks — ensures session ID persists before tool events fire"
    - "async: true for SubagentStart/SubagentStop/PostToolUse — prevents blocking every tool call"
    - "spawnSync with 5000ms timeout cap in emit-event.cjs — hook must never hang Claude Code"
    - "Fail-silent contract: emit-event.cjs always exits 0, including on malformed JSON and missing pde-tools.cjs"
    - "CLAUDE_PLUGIN_ROOT env var with path.resolve(__dirname, '..') fallback for plugin root resolution"
    - "os.tmpdir() via Node.js in validate-events.sh for macOS portability (/var/folders vs /tmp)"

key-files:
  created:
    - hooks/hooks.json
    - hooks/emit-event.cjs
    - .planning/phases/58-event-infrastructure-core/validate-events.sh
  modified: []

key-decisions:
  - "SessionStart and SessionEnd are async: false — SessionStart must persist PDE session UUID synchronously before any tool events fire; SessionEnd must flush final event before session exits"
  - "PostToolUse matcher is 'Write|Edit|Bash' — captures file operations and shell calls only, not all tools, to minimize overhead"
  - "emit-event.cjs calls session-start before event-emit on SessionStart — ensures PDE UUID in config.json before session_start event is written"
  - "Payload built with only metadata fields (never file content) — keeps under 1KB for POSIX O_APPEND atomic write safety"
  - "validate-events.sh uses TMPDIR_PATH from Node.js os.tmpdir() — macOS returns /var/folders/..., not /tmp; script must be portable"

patterns-established:
  - "Pattern: emit-event.cjs is thin adapter — all event logic stays in pde-tools.cjs; hook handler does only: parse stdin, map event type, call pde-tools, exit 0"
  - "Pattern: SessionStart handler calls session-start subcommand first (generates UUID), then event-emit for session_start event"
  - "Pattern: validation script uses inline Node.js heredocs for JSON parsing — no jq dependency required"

requirements-completed: [EVNT-03, EVNT-06]

# Metrics
duration: 3min
completed: 2026-03-20
---

# Phase 58 Plan 03: Event Infrastructure Core — Claude Code Hooks and Validation Summary

**hooks/hooks.json + hooks/emit-event.cjs wire all 5 Claude Code lifecycle events to pde-tools.cjs NDJSON write path; validate-events.sh confirms 6/6 EVNT requirements in 0.37 seconds**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-20T07:15:14Z
- **Completed:** 2026-03-20T07:18:30Z
- **Tasks:** 2 of 2
- **Files modified:** 3

## Accomplishments

- Created `hooks/hooks.json` — correct double-nested structure for SubagentStart, SubagentStop, PostToolUse (async: true), SessionStart, and SessionEnd (async: false); PostToolUse has matcher "Write|Edit|Bash"
- Created `hooks/emit-event.cjs` — thin stdin adapter that maps Claude Code hook payloads to pde-tools.cjs event-emit calls; calls session-start on SessionStart; exits 0 for any input including malformed JSON
- Created `validate-events.sh` — shell script with inline Node.js checks for all 6 validation points (EVNT-01, EVNT-02, EVNT-03, EVNT-05, EVNT-06, FAIL-SILENT); completes in 0.37s; all 6/6 PASS

## Task Commits

Each task was committed atomically:

1. **Task 1: Create hooks/hooks.json and hooks/emit-event.cjs** - `13df9e7` (feat)
2. **Task 2: Create validate-events.sh** - `bffaa5f` (feat)

## Files Created/Modified

- `hooks/hooks.json` — Claude Code hook declarations; double-nested structure; 5 events; SessionStart/SessionEnd async: false
- `hooks/emit-event.cjs` — Hook stdin adapter; HOOK_TO_EVENT_TYPE map; fail-silent exit 0 contract; spawnSync with 5000ms timeout
- `.planning/phases/58-event-infrastructure-core/validate-events.sh` — End-to-end validation script; 6 checks; portable os.tmpdir() usage; 0.37s runtime

## Decisions Made

- **Double async: false on SessionStart AND SessionEnd:** SessionStart must be synchronous to persist PDE UUID before any tool events fire (documented in research). SessionEnd should also be synchronous to ensure the final event is flushed before the session exits — both share the same rationale.
- **PostToolUse matcher "Write|Edit|Bash":** Limits hook fires to file operations and shell calls only. Capturing all tools would add overhead on every tool call (including Read, Grep, etc.) with no additional value for NDJSON observability.
- **validate-events.sh uses TMPDIR_PATH from Node.js:** macOS `os.tmpdir()` returns `/var/folders/...` not `/tmp`. Shell `ls /tmp/pde-session-*.ndjson` would always fail on macOS. Fixed by computing tmpdir via `node -e "process.stdout.write(require('os').tmpdir())"` and using that path throughout the script.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed validate-events.sh macOS tmpdir portability**
- **Found during:** Task 2 (validate-events.sh verification run)
- **Issue:** Initial script used `ls /tmp/pde-session-*.ndjson` — on macOS, `os.tmpdir()` returns `/var/folders/...`, not `/tmp`, so all ls checks returned 0 files and EVNT-02/EVNT-06 would fail
- **Fix:** Added `TMPDIR_PATH="$(node -e "process.stdout.write(require('os').tmpdir())")"` at script top; used `$TMPDIR_PATH` in all ls and ls-based count commands; passed `TMPDIR_PATH` env var to Node.js heredoc subshells
- **Files modified:** `.planning/phases/58-event-infrastructure-core/validate-events.sh`
- **Verification:** Script runs to completion with 6/6 PASS in 0.37s
- **Committed in:** `bffaa5f` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Required for correct behavior on macOS. No scope creep.

## Issues Encountered

- `set -euo pipefail` in initial validate-events.sh draft caused early exit when `ls /tmp/pde-session-*.ndjson` returned non-zero. Resolved by removing `set -e` (keeping `set -uo pipefail`) and adding `|| true` on node command calls that may not be in PATH or may fail.

## User Setup Required

None — no external service configuration required. Hooks activate automatically when Claude Code loads the plugin (hooks.json is committed to the repo at the plugin root).

## Next Phase Readiness

- Phase 58 event infrastructure is complete: event-bus.cjs (Plan 01), event-emit + session-start subcommands (Plan 02), and hooks + validation (Plan 03) are all shipped
- All 5 EVNT requirements verified by validate-events.sh (6/6 PASS)
- NDJSON files are being created at `{os.tmpdir()}/pde-session-{uuid}.ndjson` on every session-start + event-emit call
- Phase 59 (tmux dashboard) can immediately begin reading from these NDJSON files
- Hooks will auto-fire when Claude Code loads the plugin — zero workflow changes required for basic instrumentation

---
*Phase: 58-event-infrastructure-core*
*Completed: 2026-03-20*
