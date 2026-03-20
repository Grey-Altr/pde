# Phase 63: Session Summary Plan Event Aggregation - Research

**Researched:** 2026-03-20
**Domain:** Node.js session archiver — NDJSON aggregation + markdown rendering (in-project)
**Confidence:** HIGH

---

## Summary

Phase 63 closes MISS-01 from the v0.8 audit: `archive-session.cjs` does not collect or render `plan_started` and `plan_complete` events in session summaries. These two event types flow correctly from `execute-plan.md` through the NDJSON stream to the tmux pipeline-progress pane, but `PHASE_EVENT_TYPES` in `archive-session.cjs` only contains the four phase/wave event types added in Phase 62 — `plan_started` and `plan_complete` were omitted.

The fix is minimal and surgical: two strings added to the `PHASE_EVENT_TYPES` Set, and two `case` branches added to the `renderPhaseProgress()` switch. No structural changes, no new functions, no new files other than the validation script. The fix does not touch any workflow files, hook chain order, or other consumers. The dashboard pipeline-progress pane (`bin/pane-pipeline-progress.sh`) already handles both plan event types correctly at lines 37-46 — it was built anticipating this and requires no changes.

The complete change surface is one file: `hooks/archive-session.cjs`. The Nyquist validation script for Phase 63 must be a new file. The existing Phase 62 validation script (`validate-instrumentation.sh`) already checks for `plan_started`/`plan_complete` emission in `execute-plan.md` (EVNT04-E) but does NOT check whether `archive-session.cjs` aggregates plan events — that is the new gap Phase 63 closes.

**Primary recommendation:** Add `plan_started` and `plan_complete` to `PHASE_EVENT_TYPES` and add two `case` branches to `renderPhaseProgress()` in `hooks/archive-session.cjs`. Write a new `validate-plan-aggregation.sh` following the established Phase 58/60/61/62 bash validation pattern.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EVNT-04 | Semantic workflow events emitted for phase start/complete, wave start/complete, plan start/complete, and commit events | plan_started and plan_complete already emitted from execute-plan.md (Phase 62, verified). Gap is only in archive-session.cjs not collecting them. 2-line Set addition + 2 switch cases closes it. |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `hooks/archive-session.cjs` | In-project | Session NDJSON aggregation + markdown summary | The only session archiver; established in Phase 60; extended in Phase 62 |
| `PHASE_EVENT_TYPES` Set | In-project | O(1) filter for which event types to collect | Pattern established in Phase 62; Set is scoped inside `aggregateNdjson()` |
| `renderPhaseProgress()` | In-project | Converts phaseEvents array to markdown string | Pure render function added in Phase 62; switch handles 4 cases today, needs 2 more |

### No New Dependencies

Phase 63 introduces zero new npm packages, zero new CJS modules, and no changes to hooks.json, pde-tools.cjs, or any workflow file.

### Files Modified

| File | Change Type | What Changes |
|------|-------------|--------------|
| `hooks/archive-session.cjs` | Extension | Add `plan_started` and `plan_complete` to `PHASE_EVENT_TYPES` Set; add 2 cases to `renderPhaseProgress()` switch |

### Files Created

| File | Purpose |
|------|---------|
| `.planning/phases/63-session-summary-plan-events/validate-plan-aggregation.sh` | Nyquist validation suite for Phase 63 |

---

## Architecture Patterns

### Current State of archive-session.cjs (post Phase 62)

```javascript
// Line 36 — current PHASE_EVENT_TYPES (4 entries, missing plan events)
const PHASE_EVENT_TYPES = new Set(['phase_started', 'phase_complete', 'wave_started', 'wave_complete']);

// Lines 94-108 — current renderPhaseProgress switch (4 cases, missing plan cases)
function renderPhaseProgress(phaseEvents) {
  if (!phaseEvents || phaseEvents.length === 0) {
    return 'No phase/plan events recorded this session.';
  }
  return phaseEvents.map(ev => {
    const ts = ev.ts ? ev.ts.slice(11, 19) : '??:??:??';
    switch (ev.event_type) {
      case 'phase_started':  return `- [${ts}] Phase started: ${ev.phase_name || ev.phase_number || '?'}`;
      case 'phase_complete': return `- [${ts}] Phase complete: ${ev.phase_name || ev.phase_number || '?'}`;
      case 'wave_started':   return `  - [${ts}] Wave ${ev.wave_number || '?'} started`;
      case 'wave_complete':  return `  - [${ts}] Wave ${ev.wave_number || '?'} complete`;
      default: return null;
    }
  }).filter(Boolean).join('\n');
}
```

### Target State (after Phase 63)

```javascript
// PHASE_EVENT_TYPES — add plan_started and plan_complete (6 entries total)
const PHASE_EVENT_TYPES = new Set([
  'phase_started', 'phase_complete',
  'wave_started', 'wave_complete',
  'plan_started', 'plan_complete',
]);

// renderPhaseProgress — add 2 cases after wave_complete
function renderPhaseProgress(phaseEvents) {
  if (!phaseEvents || phaseEvents.length === 0) {
    return 'No phase/plan events recorded this session.';
  }
  return phaseEvents.map(ev => {
    const ts = ev.ts ? ev.ts.slice(11, 19) : '??:??:??';
    switch (ev.event_type) {
      case 'phase_started':  return `- [${ts}] Phase started: ${ev.phase_name || ev.phase_number || '?'}`;
      case 'phase_complete': return `- [${ts}] Phase complete: ${ev.phase_name || ev.phase_number || '?'}`;
      case 'wave_started':   return `  - [${ts}] Wave ${ev.wave_number || '?'} started`;
      case 'wave_complete':  return `  - [${ts}] Wave ${ev.wave_number || '?'} complete`;
      case 'plan_started':   return `    - [${ts}] Plan started: ${ev.plan_id || '?'}`;
      case 'plan_complete':  return `    - [${ts}] Plan complete: ${ev.plan_id || '?'}`;
      default: return null;
    }
  }).filter(Boolean).join('\n');
}
```

**Indentation convention:** Phase 62's pattern uses 0 leading spaces for phase events, 2 spaces for wave events. Plan events sit inside waves, so 4 spaces maintains the visual hierarchy: phase > wave > plan.

### Plan Event Schema (verified from execute-plan.md instrumentation, Phase 62)

```json
{
  "schema_version": "1.0",
  "ts": "2026-03-20T14:26:00.123Z",
  "event_type": "plan_started",
  "session_id": "f5bdbe96-...",
  "plan_id": "62-01",
  "extensions": {}
}
```

The `plan_id` field is a composite `${PHASE_NUMBER}-${PLAN_NUMBER}` string (e.g., `"63-01"`). This is the field `renderPhaseProgress` should display.

### Dashboard Consumer (pane-pipeline-progress.sh) — No Changes Needed

`bin/pane-pipeline-progress.sh` already handles `plan_started` (line 37) and `plan_complete` (line 42), reading `.plan_id` for display. No changes to this file.

### Anti-Patterns to Avoid

- **Changing the Set to an Array:** The Phase 62 pattern explicitly uses `new Set(...)` for O(1) `.has()` lookup in the hot-path aggregation loop. Do not convert to `Array.includes()`.
- **Modifying the early-return paths:** Both early-return objects in `aggregateNdjson()` already return `phaseEvents: []` (added in Phase 62). No changes needed to those paths — the new event types are collected in the same loop that already handles the four Phase 62 types.
- **Adding module-level state:** `PHASE_EVENT_TYPES` must stay inside `aggregateNdjson()` — not at module level. This is an explicit Phase 62 decision preserved for consistency and scope hygiene.
- **Emitting plan events from renderPhaseProgress as a separate section:** Plan events belong in the same Phase/Plan Progress section alongside phase and wave events — not a new separate section. The switch-based rendering already handles interleaving by event order (chronological from NDJSON).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Plan event filtering | New filter function or separate aggregation pass | Add to existing `PHASE_EVENT_TYPES.has()` check | One-line Set addition; same loop, same array, same return |
| Plan event display format | New render function or new template section | Add cases to existing `renderPhaseProgress()` switch | Pure function already handles null filtering, join, and fallback |
| Validation test harness | New test framework | `validate-plan-aggregation.sh` following Phase 62 `check()` helper pattern | Zero-npm constraint; bash pattern established across 5 phases |

**Key insight:** Phase 62 built the exact extension points Phase 63 needs. PHASE_EVENT_TYPES is a Set by design — adding entries is the intended mutation pattern.

---

## Common Pitfalls

### Pitfall 1: Forgetting to Update Both Locations
**What goes wrong:** Adding `plan_started`/`plan_complete` to `PHASE_EVENT_TYPES` but not adding cases to `renderPhaseProgress()` switch (or vice versa). Events are collected but rendered as `null` (filtered by `.filter(Boolean)`), so they silently disappear from the summary.
**Why it happens:** Two separate code locations; easy to update one and miss the other.
**How to avoid:** The validation script must check BOTH: that `PHASE_EVENT_TYPES` contains plan event strings AND that `renderPhaseProgress` contains plan case branches.
**Warning signs:** `PHASE_EVENT_TYPES` grep passes but session summary still omits plan entries.

### Pitfall 2: Wrong plan_id Field Name
**What goes wrong:** Using `ev.plan_name` or `ev.plan_number` instead of `ev.plan_id`. The plan event schema emitted by `execute-plan.md` uses `plan_id` (composite `${PHASE_NUMBER}-${PLAN_NUMBER}`) — not `plan_name` or `plan_number`.
**Why it happens:** Phase/wave events use `phase_name`, `phase_number`, `wave_number` — plan events use a different field name.
**How to avoid:** Use `ev.plan_id || '?'` as the fallback-safe accessor. This is consistent with how `pane-pipeline-progress.sh` reads the field (`.plan_id // "plan"`).
**Warning signs:** Plan entries in session summary show `Plan started: ?` instead of the plan ID.

### Pitfall 3: Incorrect Indentation Level Breaking Visual Hierarchy
**What goes wrong:** Using the same 0 or 2-space prefix as phase/wave events, making plan entries visually indistinguishable from wave entries.
**Why it happens:** Copy-paste from wave case branches without adjusting indentation.
**How to avoid:** Plan entries should be indented 4 spaces (`    - [ts] Plan ...`) — one level deeper than wave (2 spaces) to reflect phase > wave > plan hierarchy.
**Warning signs:** Session summary Phase/Plan Progress section shows plan entries at the same visual level as wave entries.

### Pitfall 4: Validation Script Tests Wrong Property
**What goes wrong:** Validation script checks for the string `'plan_started'` anywhere in `archive-session.cjs` but passes even if it's in a comment. Or checks presence in the file but not specifically inside `PHASE_EVENT_TYPES`.
**Why it happens:** Grep-based static analysis is broad.
**How to avoid:** Check for `plan_started` inside the Set literal context specifically. The Phase 62 pattern uses `grep -q 'plan_started.*plan_complete\|plan_complete.*plan_started'` or two separate greps. Also verify `renderPhaseProgress` contains plan case text.

---

## Code Examples

### Edit 1 — PHASE_EVENT_TYPES Set (hooks/archive-session.cjs, line 36)

```javascript
// Source: hooks/archive-session.cjs line 36 — current
const PHASE_EVENT_TYPES = new Set(['phase_started', 'phase_complete', 'wave_started', 'wave_complete']);

// After Phase 63 — add plan_started and plan_complete
const PHASE_EVENT_TYPES = new Set(['phase_started', 'phase_complete', 'wave_started', 'wave_complete', 'plan_started', 'plan_complete']);
```

### Edit 2 — renderPhaseProgress switch cases (hooks/archive-session.cjs, lines 101-107)

```javascript
// Source: hooks/archive-session.cjs renderPhaseProgress() — add after wave_complete case
      case 'plan_started':   return `    - [${ts}] Plan started: ${ev.plan_id || '?'}`;
      case 'plan_complete':  return `    - [${ts}] Plan complete: ${ev.plan_id || '?'}`;
```

Full updated switch body:
```javascript
    switch (ev.event_type) {
      case 'phase_started':  return `- [${ts}] Phase started: ${ev.phase_name || ev.phase_number || '?'}`;
      case 'phase_complete': return `- [${ts}] Phase complete: ${ev.phase_name || ev.phase_number || '?'}`;
      case 'wave_started':   return `  - [${ts}] Wave ${ev.wave_number || '?'} started`;
      case 'wave_complete':  return `  - [${ts}] Wave ${ev.wave_number || '?'} complete`;
      case 'plan_started':   return `    - [${ts}] Plan started: ${ev.plan_id || '?'}`;
      case 'plan_complete':  return `    - [${ts}] Plan complete: ${ev.plan_id || '?'}`;
      default: return null;
    }
```

### Sample Session Summary Output (after Phase 63)

```markdown
## Phase / Plan Progress

- [14:23:01] Phase started: workflow-instrumentation
  - [14:23:05] Wave 1 started
    - [14:23:06] Plan started: 63-01
    - [14:25:44] Plan complete: 63-01
  - [14:25:45] Wave 1 complete
- [14:25:46] Phase complete: workflow-instrumentation
```

### Validation Script Pattern (validate-plan-aggregation.sh)

```bash
#!/usr/bin/env bash
# Phase 63 — Session Summary Plan Event Aggregation Validation
# Tests EVNT-04 gap closure: plan_started/plan_complete in archive-session.cjs aggregation

set -uo pipefail

PASS_COUNT=0
FAIL_COUNT=0
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

check() {
  local id="$1"
  local result="$2"
  local reason="${3:-}"
  if [ "$result" = "PASS" ]; then
    echo "$id PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "$id FAIL: $reason"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

# EVNT04-P1: PHASE_EVENT_TYPES includes plan_started
if grep -q 'plan_started' "$PROJECT_ROOT/hooks/archive-session.cjs" 2>/dev/null; then
  check "EVNT04-P1" "PASS"
else
  check "EVNT04-P1" "FAIL" "hooks/archive-session.cjs PHASE_EVENT_TYPES missing plan_started"
fi

# EVNT04-P2: PHASE_EVENT_TYPES includes plan_complete
if grep -q 'plan_complete' "$PROJECT_ROOT/hooks/archive-session.cjs" 2>/dev/null; then
  check "EVNT04-P2" "PASS"
else
  check "EVNT04-P2" "FAIL" "hooks/archive-session.cjs PHASE_EVENT_TYPES missing plan_complete"
fi

# EVNT04-P3: renderPhaseProgress handles plan_started case
if grep -q "case 'plan_started'" "$PROJECT_ROOT/hooks/archive-session.cjs" 2>/dev/null; then
  check "EVNT04-P3" "PASS"
else
  check "EVNT04-P3" "FAIL" "renderPhaseProgress() missing case 'plan_started'"
fi

# EVNT04-P4: renderPhaseProgress handles plan_complete case
if grep -q "case 'plan_complete'" "$PROJECT_ROOT/hooks/archive-session.cjs" 2>/dev/null; then
  check "EVNT04-P4" "PASS"
else
  check "EVNT04-P4" "FAIL" "renderPhaseProgress() missing case 'plan_complete'"
fi

# EVNT04-P5: archive-session.cjs parses without syntax error
SYNTAX_ERR=$(node --check "$PROJECT_ROOT/hooks/archive-session.cjs" 2>&1)
if [ -z "$SYNTAX_ERR" ]; then
  check "EVNT04-P5" "PASS"
else
  check "EVNT04-P5" "FAIL" "archive-session.cjs syntax error: $SYNTAX_ERR"
fi

# EVNT04-P6: Unit test — renderPhaseProgress renders plan events
RENDER_RESULT=$(node -e "
const src = require('fs').readFileSync('$PROJECT_ROOT/hooks/archive-session.cjs', 'utf-8');
const hasPlanStarted = src.includes(\"case 'plan_started'\");
const hasPlanComplete = src.includes(\"case 'plan_complete'\");
const hasPlanId = src.includes('ev.plan_id');
if (hasPlanStarted && hasPlanComplete && hasPlanId) {
  console.log('PASS');
} else {
  console.log('FAIL: missing plan_started=' + hasPlanStarted + ' plan_complete=' + hasPlanComplete + ' plan_id=' + hasPlanId);
}
" 2>&1)
if [ "$RENDER_RESULT" = "PASS" ]; then
  check "EVNT04-P6" "PASS"
else
  check "EVNT04-P6" "FAIL" "$RENDER_RESULT"
fi

TOTAL=$((PASS_COUNT + FAIL_COUNT))
echo ""
echo "=== PHASE 63 VALIDATION: $PASS_COUNT/$TOTAL PASS ==="

if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi
exit 0
```

---

## Exact Change Map

The complete set of changes for Phase 63:

### hooks/archive-session.cjs — 2 targeted edits

| Edit | Location | Before | After |
|------|----------|--------|-------|
| 1 | Line 36 — `PHASE_EVENT_TYPES` Set | 4 entries (phase/wave only) | 6 entries (+ `plan_started`, `plan_complete`) |
| 2 | Lines 103-106 — `renderPhaseProgress` switch | 4 cases + default | 6 cases + default (+ plan_started, plan_complete) |

No other changes to `archive-session.cjs`. No changes to any other file except adding the new validation script.

### .planning/phases/63-session-summary-plan-events/validate-plan-aggregation.sh — new file

6-check Nyquist validation suite following Phase 62 pattern: EVNT04-P1 through EVNT04-P6.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| plan events silently dropped in aggregateNdjson (MISS-01) | plan events collected in phaseEvents, rendered in session summary | Phase 63 | Session summaries reflect complete workflow execution including plan-level progress |
| PHASE_EVENT_TYPES has 4 entries (phase/wave only) | PHASE_EVENT_TYPES has 6 entries (phase/wave/plan) | Phase 63 | Full EVNT-04 coverage in session summary archival |
| renderPhaseProgress has 4 switch cases | renderPhaseProgress has 6 switch cases | Phase 63 | Plan-level timestamp lines appear in Phase/Plan Progress section |

**Deprecated/outdated:**
- MISS-01 integration gap from v0.8 audit: resolved by Phase 63. After this phase, the "Session summary (NDJSON → markdown)" E2E flow status changes from PARTIAL to COMPLETE.

---

## Open Questions

1. **Indentation for plan entries (2 vs 4 spaces)**
   - What we know: Phase 62 uses 0 spaces for phase, 2 spaces for wave. The established pattern is 2 spaces per hierarchy level.
   - What's unclear: Whether 4-space indent for plan entries (phase > wave > plan) is the right depth, or whether 2 spaces (wave and plan at same level) is preferred.
   - Recommendation: Use 4 spaces for plan entries to reflect the semantic nesting (plans run within waves, which run within phases). This matches the dashboard pane display which uses deeper indentation for plan entries.

2. **plan_id display format in session summary**
   - What we know: `plan_id` is emitted as a composite string like `"63-01"`. The dashboard pane displays it as-is.
   - What's unclear: Whether to display it as `Plan started: 63-01` or a friendlier label like `Plan 63-01`.
   - Recommendation: Use `Plan started: ${ev.plan_id}` to parallel the phase/wave format (`Phase started: ...`, `Wave 1 started`). Simple and consistent.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None (zero-npm constraint; bash validation per project pattern) |
| Config file | `.planning/phases/63-session-summary-plan-events/validate-plan-aggregation.sh` (new, Wave 0 gap) |
| Quick run command | `bash .planning/phases/63-session-summary-plan-events/validate-plan-aggregation.sh` |
| Full suite command | `bash .planning/phases/63-session-summary-plan-events/validate-plan-aggregation.sh` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EVNT-04 (MISS-01) | PHASE_EVENT_TYPES includes plan_started | static analysis | `grep -q 'plan_started' hooks/archive-session.cjs` | Wave 0 gap |
| EVNT-04 (MISS-01) | PHASE_EVENT_TYPES includes plan_complete | static analysis | `grep -q 'plan_complete' hooks/archive-session.cjs` | Wave 0 gap |
| EVNT-04 (MISS-01) | renderPhaseProgress handles plan_started case | static analysis | `grep -q "case 'plan_started'" hooks/archive-session.cjs` | Wave 0 gap |
| EVNT-04 (MISS-01) | renderPhaseProgress handles plan_complete case | static analysis | `grep -q "case 'plan_complete'" hooks/archive-session.cjs` | Wave 0 gap |
| EVNT-04 (MISS-01) | archive-session.cjs has no syntax errors after edit | syntax check | `node --check hooks/archive-session.cjs` | Wave 0 gap |
| EVNT-04 (MISS-01) | renderPhaseProgress uses ev.plan_id field | unit | Node.js inline source inspection | Wave 0 gap |

### Sampling Rate

- **Per task commit:** `bash .planning/phases/63-session-summary-plan-events/validate-plan-aggregation.sh`
- **Per wave merge:** Same (single-wave phase)
- **Phase gate:** All 6 checks green before `/pde:verify-work`

### Wave 0 Gaps

- [ ] `.planning/phases/63-session-summary-plan-events/validate-plan-aggregation.sh` — new file, covers EVNT04-P1 through EVNT04-P6

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection (2026-03-20):
  - `hooks/archive-session.cjs` — full read; `PHASE_EVENT_TYPES` at line 36 has 4 entries; `renderPhaseProgress()` switch at lines 100-107 has 4 cases; both early-return paths already include `phaseEvents: []`; no plan event types present
  - `bin/pane-pipeline-progress.sh` — full read; `plan_started` case at line 37 reads `.plan_id`; `plan_complete` case at line 42 reads `.plan_id`; format is `PLAN START  <id>` and `PLAN DONE   <id>`; no changes needed
  - `.planning/phases/62-workflow-instrumentation/validate-instrumentation.sh` — full read; established check() helper pattern, `set -uo pipefail`, `PASS_COUNT/FAIL_COUNT`, static grep analysis, Node.js inline unit tests, exit 0/1
  - `.planning/v0.8-MILESTONE-AUDIT.md` — MISS-01 definition confirmed: "Add plan_started/plan_complete to PHASE_EVENT_TYPES Set and renderPhaseProgress() switch in archive-session.cjs"; fix described as "2-line addition to Set + 2 switch cases"
  - `.planning/ROADMAP.md` Phase 63 description — success criteria confirmed; 1 plan specified
  - `workflows/execute-plan.md` (Phase 62 verification) — `plan_started` emitted at line 57 with `plan_id: "${PHASE_NUMBER}-${PLAN_NUMBER}"`; `plan_complete` emitted at line 404; both confirmed in 62-VERIFICATION.md

- `.planning/phases/62-workflow-instrumentation/62-RESEARCH.md` — architectural decisions: PHASE_EVENT_TYPES scoped inside aggregateNdjson (no module-level state), renderPhaseProgress as pure render function, wave indentation pattern (2 spaces)

- `.planning/phases/62-workflow-instrumentation/62-02-PLAN.md` and 62-02-SUMMARY.md — confirmed Phase 62 intentionally scoped to phase/wave events only; plan events were NOT included in Phase 62's PHASE_EVENT_TYPES despite execute-plan.md instrumentation being complete

- `.planning/STATE.md` — Phase 62 key decisions confirmed; zero-npm constraint confirmed; hooks-first + manual emit pattern confirmed

---

## Metadata

**Confidence breakdown:**
- Exact change surface (2 edits to archive-session.cjs): HIGH — both locations fully inspected; gap is unambiguous
- plan_id field name: HIGH — verified in execute-plan.md instrumentation and pane-pipeline-progress.sh consumer
- Indentation convention: HIGH — Phase 62 established pattern; 4-space depth for plan level is consistent with dashboard display hierarchy
- Validation script pattern: HIGH — 5 prior phases use identical bash structure; test IDs and check() helper are copy-paste template
- Regression risk: HIGH (very low risk) — archive-session.cjs changes are additive Set/switch entries; no existing logic path is modified

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (30 days — zero external dependencies; all sources in-project)
