# Phase 62: Workflow Instrumentation - Research

**Researched:** 2026-03-20
**Domain:** Bash workflow instrumentation + NDJSON event emission + session summary enrichment
**Confidence:** HIGH

---

## Summary

Phase 62 adds semantic workflow events (phase_started, phase_complete, wave_started, wave_complete) to the existing NDJSON event infrastructure built in Phase 58. The work is surgical: manual `pde-tools.cjs event-emit` calls are inserted at exactly eight locations across two workflow files — `workflows/execute-phase.md` and `workflows/execute-plan.md`. No auto-instrumentation, no new libraries, no structural changes to the workflow engine.

The dashboard pipeline progress pane (`bin/pane-pipeline-progress.sh`) already handles these four event types — its `case` statement has handlers for `phase_started`, `phase_complete`, `wave_started`, and `wave_complete` — but they never fire because no workflow emits them yet. The session archiver (`hooks/archive-session.cjs`) has a placeholder "No phase/plan events recorded this session." comment in the Phase/Plan Progress section; it needs to be extended to aggregate and render these events. Both files are the complete set of consumers that need to work after Phase 62.

The regression risk is concentrated in execute-phase.md: it is the most complex workflow in the project, spanning wave orchestration, checkpoint handling, sharded and standard plan execution, and reconciliation. Every event-emit call must be fire-and-forget (exit code ignored, `|| true` in bash) and must not introduce any new dependencies on state that could fail.

**Primary recommendation:** Use `node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" event-emit <event_type> '<json>' 2>/dev/null || true` as the standard pattern for all eight instrumentation points. This is identical to the existing manual emit pattern implied by Phase 58 research and is self-contained, fail-silent, and zero-dependency.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EVNT-04 | Semantic workflow events emitted for phase start/complete, wave start/complete, plan start/complete, and commit events | pde-tools.cjs event-emit subcommand already exists; execute-phase.md and execute-plan.md are the two target files; dashboard pane already handles all four event types |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `pde-tools.cjs event-emit` | In-project | Emit NDJSON events to session log | Already exists from Phase 58; the only supported write path for workflow-initiated events |
| `safeAppendEvent` in event-bus.cjs | In-project | Underlying NDJSON append — fail-silent | Called by event-emit subcommand; swallows all errors |

### No New Dependencies
Phase 62 introduces zero new files and zero new npm packages. All instrumentation uses the existing `event-emit` subcommand in `pde-tools.cjs` (built in Phase 58).

**The event-emit call pattern (already in use via hooks; Phase 62 extends it to manual workflow calls):**
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" event-emit phase_started \
  '{"phase_name":"'"${PHASE_NAME}"'","phase_number":"'"${PHASE_NUMBER}"'"}' \
  2>/dev/null || true
```

### Files Modified (exactly two workflow files plus archive-session.cjs for session summary)
| File | Change Type | What Changes |
|------|-------------|--------------|
| `workflows/execute-phase.md` | Instrumentation | Add phase_started, phase_complete, wave_started, wave_complete emits |
| `workflows/execute-plan.md` | Instrumentation | Add plan_started, plan_complete emits |
| `hooks/archive-session.cjs` | Enhancement | Aggregate phase/plan events from NDJSON into session summary |

Note: The EVNT-04 requirement says "phase start/complete, wave start/complete, plan start/complete, and commit events." The success criteria for Phase 62 lists phase and wave events as the mandatory items for dashboard visibility; plan events are part of EVNT-04's full scope. Commit events may be out of scope for Phase 62 (not mentioned in success criteria) — treat as out of scope unless the planner sees fit to include them.

---

## Architecture Patterns

### Event Emission Points in execute-phase.md

The workflow has well-defined structural boundaries that map directly to the four events:

| Event | Location in Workflow | Step Name | Timing |
|-------|---------------------|-----------|--------|
| `phase_started` | After `validate_phase` step completes | After plan count report | Before first wave begins |
| `wave_started` | Start of each wave in `execute_waves` loop | Before "Describe what's being built" | Before any agent in wave spawns |
| `wave_complete` | End of each wave in `execute_waves` loop | After spot-checks pass | After all agents in wave complete |
| `phase_complete` | `update_roadmap` step | After `phase complete` CLI call | After phase marked done |

### Event Emission Points in execute-plan.md

| Event | Location in Workflow | Step Name | Timing |
|-------|---------------------|-----------|--------|
| `plan_started` | `record_start_time` step | After PLAN_START_TIME is set | Before task execution begins |
| `plan_complete` | `create_summary` step | After SUMMARY.md is created | Before STATE.md and ROADMAP.md update |

### NDJSON Event Schema for New Event Types

All new events follow the existing envelope schema from Phase 58 (EVNT-01). Additional fields per event type:

**phase_started:**
```json
{
  "schema_version": "1.0",
  "ts": "2026-03-20T14:23:01.123Z",
  "event_type": "phase_started",
  "session_id": "f5bdbe96-...",
  "phase_number": "62",
  "phase_name": "workflow-instrumentation",
  "extensions": {}
}
```

**phase_complete:**
```json
{
  "schema_version": "1.0",
  "ts": "2026-03-20T14:45:00.000Z",
  "event_type": "phase_complete",
  "session_id": "f5bdbe96-...",
  "phase_number": "62",
  "phase_name": "workflow-instrumentation",
  "extensions": {}
}
```

**wave_started / wave_complete:**
```json
{
  "schema_version": "1.0",
  "ts": "2026-03-20T14:25:00.000Z",
  "event_type": "wave_started",
  "session_id": "f5bdbe96-...",
  "phase_number": "62",
  "wave_number": "1",
  "extensions": {}
}
```

**plan_started / plan_complete:**
```json
{
  "schema_version": "1.0",
  "ts": "2026-03-20T14:26:00.000Z",
  "event_type": "plan_started",
  "session_id": "f5bdbe96-...",
  "plan_id": "62-01",
  "extensions": {}
}
```

### Dashboard Consumer: pane-pipeline-progress.sh

The pipeline progress pane (`bin/pane-pipeline-progress.sh`) already handles all four event types. It reads these fields:

| Event Type | Fields Read | Display Output |
|------------|-------------|----------------|
| `phase_started` | `.ts`, `.phase_name` | `[HH:MM:SS] PHASE START  <name>` (cyan) |
| `phase_complete` | `.ts`, `.phase_name` | `[HH:MM:SS] PHASE DONE   <name>` (green) |
| `wave_started` | `.ts`, `.wave_number` | `[HH:MM:SS]   WAVE <N> START` (cyan) |
| `wave_complete` | `.ts`, `.wave_number` | `[HH:MM:SS]   WAVE <N> DONE` (green) |
| `plan_started` | `.ts`, `.plan_id` | `[HH:MM:SS]     PLAN START  <id>` (yellow) |
| `plan_complete` | `.ts`, `.plan_id` | `[HH:MM:SS]     PLAN DONE   <id>` (green) |

No changes needed to `pane-pipeline-progress.sh` — it was built anticipating Phase 62.

### Session Summary Consumer: archive-session.cjs

The session archiver (`hooks/archive-session.cjs`) currently has a static placeholder in the Phase/Plan Progress section:

```javascript
## Phase / Plan Progress

No phase/plan events recorded this session.
```

To satisfy EVNT-04's "visible in the session summary" requirement (success criterion 1), `aggregateNdjson()` must be extended to collect `phase_started`, `phase_complete`, `wave_started`, and `wave_complete` events and render them in the summary.

**Extended aggregation pattern:**
```javascript
// In aggregateNdjson() — add alongside existing agentCount/changedFiles tracking
const phaseEvents = [];

for (const line of lines) {
  let ev;
  try { ev = JSON.parse(line); } catch { continue; }

  eventCount++;
  if (ev.event_type === 'subagent_start') agentCount++;
  if (ev.event_type === 'file_changed' && ev.file_path) changedFiles.add(ev.file_path);

  // NEW: collect phase/wave events for summary section
  if (['phase_started', 'phase_complete', 'wave_started', 'wave_complete'].includes(ev.event_type)) {
    phaseEvents.push(ev);
  }
}

return { eventCount, agentCount, changedFiles: changedFiles.size, phaseEvents, ndjsonMissing: false };
```

**Phase/Plan Progress section rendering:**
```javascript
function renderPhaseProgress(phaseEvents) {
  if (!phaseEvents || phaseEvents.length === 0) {
    return 'No phase/plan events recorded this session.';
  }
  const lines = phaseEvents.map(ev => {
    const ts = ev.ts ? ev.ts.slice(11, 19) : '??:??:??';
    if (ev.event_type === 'phase_started')  return `- [${ts}] Phase started: ${ev.phase_name || ev.phase_number || '?'}`;
    if (ev.event_type === 'phase_complete') return `- [${ts}] Phase complete: ${ev.phase_name || ev.phase_number || '?'}`;
    if (ev.event_type === 'wave_started')   return `- [${ts}] Wave ${ev.wave_number || '?'} started`;
    if (ev.event_type === 'wave_complete')  return `- [${ts}] Wave ${ev.wave_number || '?'} complete`;
    return null;
  }).filter(Boolean);
  return lines.join('\n');
}
```

### Anti-Patterns to Avoid

- **Missing `|| true` on event-emit calls in bash:** If `pde-tools.cjs` exits non-zero for any reason (node not found, config.json unreadable), the workflow step would fail without `|| true`. All event-emit calls in workflow markdown MUST be fire-and-forget.
- **Emitting events with unresolved variables:** If `$PHASE_NAME` or `$WAVE_NUMBER` is unset when the emit fires, JSON will contain an empty string. Always emit after the variable is assigned — never emit speculatively before context is resolved.
- **Emitting phase_complete before `phase complete` CLI call:** The `update_roadmap` step calls `pde-tools.cjs phase complete "${PHASE_NUMBER}"`. The `phase_complete` event should fire AFTER this succeeds, not before, so the event represents a real completion.
- **Emitting wave_complete before spot-checks:** The execute-phase.md spot-check step verifies that SUMMARY.md files and git commits exist. Emit `wave_complete` only after spot-checks pass, not immediately when all agents return.
- **Modifying execute-plan.md for phase/wave events:** execute-plan.md is executed by a subagent with no knowledge of the wave context. Phase and wave events belong only in execute-phase.md (the orchestrator).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Event write path | Custom file appender in workflow bash | `pde-tools.cjs event-emit` | Already exists; fail-silent; handles session ID lookup; O_APPEND safe; tested by Phase 58 validation |
| Session ID lookup | Bash config.json read + jq | `pde-tools.cjs event-emit` reads config.json internally | The session ID lookup is already inside pde-tools.cjs event-emit; workflows do not need to resolve it |
| Event schema construction | Manual JSON building in bash | Pass minimal JSON payload to event-emit | Single-level JSON is safe to construct inline; pde-tools.cjs merges it with the full envelope |
| Phase/plan progress display | New pane or new display logic | `pane-pipeline-progress.sh` — already complete | The pane was built in Phase 59 anticipating these events; no changes needed |

**Key insight:** Phase 58 built the event write path precisely so Phase 62 would only need to call it. The entire implementation is: find the right bash locations, insert `node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" event-emit <type> '<json>' 2>/dev/null || true`, and extend archive-session.cjs.

---

## Common Pitfalls

### Pitfall 1: Breaking execute-phase.md with Non-Zero Exit Codes
**What goes wrong:** A `node pde-tools.cjs event-emit ...` call in workflow markdown exits non-zero (Node not in PATH, config.json write-locked, missing session ID). If the bash step does not have `|| true` or `2>/dev/null`, the workflow's bash step fails and the wave/plan execution halts.
**Why it happens:** execute-phase.md workflows run in Claude Code's Bash tool. Any non-zero exit from a command in a multi-line bash block may cause the orchestrator to treat the step as failed.
**How to avoid:** Every event-emit call must end with `2>/dev/null || true`. Never rely on pde-tools.cjs succeeding for the workflow to continue.
**Warning signs:** Wave execution stops after a `phase_started` emit call. Check: does removing the emit call restore execution?

### Pitfall 2: Emitting Events with Shell Variable Injection Vulnerabilities
**What goes wrong:** `node pde-tools.cjs event-emit phase_started '{"phase_name":"'"$PHASE_NAME"'"}'` will produce invalid JSON if `$PHASE_NAME` contains a double-quote, backslash, or newline. JSON.parse in pde-tools.cjs catches malformed JSON and emits with an empty payload (fail-silent), but the event will be missing fields.
**Why it happens:** Bash variable interpolation inside single-quoted JSON is a common shell scripting pitfall.
**How to avoid:** Phase names and numbers in PDE are slugs (alphanumeric and hyphens only) — they are safe for inline JSON interpolation. Validate at the emit site that the variable looks like a slug before using it. For any free-text field, use `printf '%s' "$VAR" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))"` — but this is overkill for PDE slugs.
**Warning signs:** Events appear in NDJSON with `phase_name: ""` or `wave_number: ""`.

### Pitfall 3: Duplicate Events from Sharded Plan Execution
**What goes wrong:** In sharded plan execution (Mode A), the orchestrator iterates over task files within a single plan. If `plan_started` is emitted per-task (rather than per-plan), the dashboard shows multiple `PLAN START` entries for a single plan.
**Why it happens:** The plan/task distinction is easy to confuse when reading execute-phase.md. The plan is the PLAN.md file; tasks are individual task-*.md files within the tasks directory.
**How to avoid:** `plan_started` and `plan_complete` belong in execute-plan.md (executed once per plan), not in the task-level loop of execute-phase.md. The orchestrator emits wave events; the executor emits plan events. Never emit plan events from the orchestrator's task file loop.
**Warning signs:** Dashboard shows 5 `PLAN START` entries for a 5-task sharded plan instead of 1.

### Pitfall 4: archive-session.cjs Phase/Plan Progress Section Not Updated
**What goes wrong:** Phase 62 success criterion 1 says events must be "visible in the session summary." If archive-session.cjs is not extended to render phase/wave events, the session summary still shows "No phase/plan events recorded this session." even when events are present in the NDJSON file.
**Why it happens:** archive-session.cjs is invoked from a SessionEnd hook — it runs once, after the session ends. It reads the NDJSON file and generates the summary. If `aggregateNdjson()` does not collect `phase_started` etc., they are invisible to the summary.
**How to avoid:** Extend `aggregateNdjson()` to collect these event types. Extend `writeSummary()` to render the collected events in the Phase/Plan Progress section.
**Warning signs:** After running execute-phase, the `.planning/logs/` session summary still says "No phase/plan events recorded this session."

### Pitfall 5: Wave Number Type Mismatch
**What goes wrong:** `pane-pipeline-progress.sh` reads `.wave_number` from the event. If wave_number is emitted as a string `"1"` but the pane's jq expression expects a number, the display may show `null` or `?`.
**Why it happens:** bash variables are strings; JSON fields can be string or number. The pane uses jq `.wave_number // "?"` which works for both string and number.
**How to avoid:** Emit wave_number as a string (`"wave_number":"1"`) to match what jq returns from bash variable interpolation. The pane's jq expression accepts either.
**Warning signs:** Wave entries in pipeline progress pane show `WAVE ? START` instead of the wave number.

---

## Code Examples

### Standard Event Emit Pattern (use for all eight instrumentation calls)
```bash
# Source: Phase 58 research + pde-tools.cjs event-emit subcommand
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" event-emit phase_started \
  '{"phase_number":"'"${PHASE_NUMBER}"'","phase_name":"'"${PHASE_NAME}"'"}' \
  2>/dev/null || true
```

### Wave Event Emit (in execute-phase.md execute_waves step)
```bash
# Emit before spawning agents in a wave
WAVE_NUM="1"  # from wave loop counter
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" event-emit wave_started \
  '{"phase_number":"'"${PHASE_NUMBER}"'","wave_number":"'"${WAVE_NUM}"'"}' \
  2>/dev/null || true

# ... spawn agents, wait for completion, run spot-checks ...

# Emit after spot-checks pass
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" event-emit wave_complete \
  '{"phase_number":"'"${PHASE_NUMBER}"'","wave_number":"'"${WAVE_NUM}"'"}' \
  2>/dev/null || true
```

### Plan Event Emit (in execute-plan.md)
```bash
# In record_start_time step — after PLAN_START_TIME is set
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" event-emit plan_started \
  '{"plan_id":"'"${PHASE_NUMBER}-${PLAN_NUMBER}"'"}' \
  2>/dev/null || true

# In create_summary step — after SUMMARY.md is written
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" event-emit plan_complete \
  '{"plan_id":"'"${PHASE_NUMBER}-${PLAN_NUMBER}"'"}' \
  2>/dev/null || true
```

### archive-session.cjs aggregateNdjson Extension
```javascript
// Source: hooks/archive-session.cjs — extend existing aggregateNdjson()
// Add phaseEvents array to the return value

const PHASE_EVENT_TYPES = new Set(['phase_started', 'phase_complete', 'wave_started', 'wave_complete']);
const phaseEvents = [];

for (const line of lines) {
  let ev;
  try { ev = JSON.parse(line); } catch { continue; }

  eventCount++;
  if (ev.event_type === 'subagent_start') agentCount++;
  if (ev.event_type === 'file_changed' && ev.file_path) changedFiles.add(ev.file_path);
  if (PHASE_EVENT_TYPES.has(ev.event_type)) phaseEvents.push(ev);
}

return { eventCount, agentCount, changedFiles: changedFiles.size, phaseEvents, ndjsonMissing: false };
```

### Session Summary Phase/Plan Progress Section
```javascript
// Source: hooks/archive-session.cjs — extend writeSummary()
// Replace static placeholder with dynamic rendering

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

---

## Exact Instrumentation Map

The eight call sites across two files:

### execute-phase.md — 6 calls

| # | Location in Workflow | Event Type | Key Payload Fields |
|---|---------------------|------------|-------------------|
| 1 | After `validate_phase` step, before first wave | `phase_started` | `phase_number`, `phase_name` |
| 2 | Start of each wave loop iteration (before agent spawns) | `wave_started` | `phase_number`, `wave_number` |
| 3 | End of each wave loop iteration (after spot-checks pass) | `wave_complete` | `phase_number`, `wave_number` |
| 4 | `update_roadmap` step, after `phase complete` CLI call succeeds | `phase_complete` | `phase_number`, `phase_name` |

Note: Calls 2 and 3 repeat for each wave, so the total call count in the file is 2 static + 2 per-wave. For a phase with N waves, 2+2N calls fire at runtime.

### execute-plan.md — 2 calls

| # | Location in Workflow | Event Type | Key Payload Fields |
|---|---------------------|------------|-------------------|
| 5 | `record_start_time` step, after PLAN_START_TIME assigned | `plan_started` | `plan_id` (phase-plan composite) |
| 6 | `create_summary` step, after SUMMARY.md written | `plan_complete` | `plan_id` |

### hooks/archive-session.cjs — 1 logical change (two function edits)

| # | Location | Change |
|---|----------|--------|
| 7 | `aggregateNdjson()` — loop body | Collect `phase_started`, `phase_complete`, `wave_started`, `wave_complete` into `phaseEvents` array; return it |
| 8 | `writeSummary()` — Phase/Plan Progress section | Call `renderPhaseProgress(metrics.phaseEvents)` instead of static placeholder |

---

## Regression Risk Areas

| File | Risk Level | What Could Break | Mitigation |
|------|------------|------------------|------------|
| `workflows/execute-phase.md` | HIGH | Wave orchestration, checkpoint handling, sharded plan execution, reconcile/verify steps | All event-emit calls are `2>/dev/null \|\| true`; they are additive line inserts, not modifications to existing bash logic |
| `workflows/execute-plan.md` | MEDIUM | Subagent executor flow, TDD execution, checkpoint return | Same mitigation; calls are in record_start_time and create_summary which are leaf steps with no conditional branching |
| `hooks/archive-session.cjs` | LOW | Session summary generation | aggregateNdjson is pure data collection; writeSummary gets an extra section; static placeholder replaced with dynamic render |
| `bin/pane-pipeline-progress.sh` | NONE | No changes needed — already handles all four event types | — |

**Regression verification:** After instrumentation, run at least one execute-phase operation. Check: (a) existing workflow output format unchanged, (b) NDJSON file contains new event types, (c) dashboard pipeline progress pane shows events, (d) session summary includes Phase/Plan Progress section with events.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static "No phase/plan events" in session summary | Dynamic phase/wave event rendering | Phase 62 | Session summaries include workflow progress context |
| Pipeline progress pane idle ("waiting for session events...") | Live phase/wave progression | Phase 62 | Dashboard shows real-time workflow progress during execute-phase |
| Hook-only event capture | Hooks + manual workflow instrumentation | Phase 62 | Semantic events join tool-level events in the event stream |

**Deprecated/outdated:**
- The "waiting for session events..." idle state in `pane-pipeline-progress.sh` is the current output when no workflow events exist. After Phase 62, this only appears before execute-phase starts.
- The static "No phase/plan events recorded this session." in archive-session.cjs is replaced by dynamic rendering. The static placeholder remains as the fallback for sessions with no workflow activity.

---

## Open Questions

1. **Plan_started and plan_complete in execute-plan.md vs execute-phase.md**
   - What we know: execute-plan.md is executed by a subagent (pde-executor); execute-phase.md is the orchestrator. For sharded plans, the plan executor is a subagent — it CAN emit plan_started/plan_complete independently.
   - What's unclear: In Pattern A (standard plan), execute-plan.md emits plan events. But in Mode A (sharded), the orchestrator spawns one executor per task, not per plan. Should plan-level events come from execute-plan.md (which runs per task in sharded mode) or from execute-phase.md's sharded aggregation step?
   - Recommendation: emit plan_started/plan_complete from execute-plan.md only when it is executing a full plan (not a sharded task). For sharded plans, the orchestrator in execute-phase.md handles plan_started/plan_complete around the task loop. This keeps plan events semantically correct.

2. **Commit events (part of EVNT-04 requirement)**
   - What we know: EVNT-04 includes "commit events." The Phase 62 success criteria does not explicitly mention commit events in the three success criteria.
   - What's unclear: Whether commit events should be added in Phase 62 or deferred.
   - Recommendation: Defer commit events unless the planner decides to include them. The Phase 62 success criteria can be satisfied without them. The existing `bash_called` events from PostToolUse hooks capture git invocations implicitly.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None (zero-npm constraint; shell-based validation per Phase 58/61 pattern) |
| Config file | `.planning/phases/62-workflow-instrumentation/validate-instrumentation.sh` (new, Wave 0 gap) |
| Quick run command | `bash .planning/phases/62-workflow-instrumentation/validate-instrumentation.sh --quick` |
| Full suite command | `bash .planning/phases/62-workflow-instrumentation/validate-instrumentation.sh` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EVNT-04-A | execute-phase.md contains `event-emit phase_started` call | static analysis | `grep -c 'event-emit phase_started' workflows/execute-phase.md` (expect ≥ 1) | Wave 0 |
| EVNT-04-B | execute-phase.md contains `event-emit phase_complete` call | static analysis | `grep -c 'event-emit phase_complete' workflows/execute-phase.md` (expect ≥ 1) | Wave 0 |
| EVNT-04-C | execute-phase.md contains `event-emit wave_started` call | static analysis | `grep -c 'event-emit wave_started' workflows/execute-phase.md` (expect ≥ 1) | Wave 0 |
| EVNT-04-D | execute-phase.md contains `event-emit wave_complete` call | static analysis | `grep -c 'event-emit wave_complete' workflows/execute-phase.md` (expect ≥ 1) | Wave 0 |
| EVNT-04-E | execute-plan.md contains `event-emit plan_started` and `plan_complete` calls | static analysis | `grep -c 'event-emit plan_started' workflows/execute-plan.md` + `grep -c 'event-emit plan_complete' workflows/execute-plan.md` (each ≥ 1) | Wave 0 |
| EVNT-04-F | archive-session.cjs aggregates phase/wave events | unit | Node.js inline test: parse mock NDJSON with phase events, verify aggregateNdjson returns non-empty phaseEvents | Wave 0 |
| EVNT-04-G | archive-session.cjs session summary contains phase/wave event entries | unit | Node.js inline test: verify renderPhaseProgress output is not static placeholder when phaseEvents present | Wave 0 |
| EVNT-04-H | All event-emit calls use `2>/dev/null \|\| true` (regression safety) | static analysis | `grep 'event-emit' workflows/execute-phase.md | grep -v '|| true'` (expect 0 matches) | Wave 0 |

### Sampling Rate
- **Per task commit:** `bash .planning/phases/62-workflow-instrumentation/validate-instrumentation.sh --quick`
- **Per wave merge:** Full validation suite
- **Phase gate:** All 8 checks green before `/pde:verify-work`

### Wave 0 Gaps
- [ ] `validate-instrumentation.sh` — new file, covers EVNT-04-A through EVNT-04-H
- [ ] Phase 62 directory already exists at `.planning/phases/62-workflow-instrumentation/`

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection (2026-03-20):
  - `workflows/execute-phase.md` — full read; identified all six instrumentation points; wave loop structure, step boundaries, spot-check locations
  - `workflows/execute-plan.md` — full read; identified record_start_time and create_summary step locations
  - `hooks/archive-session.cjs` — full read; aggregateNdjson() return structure, writeSummary() Phase/Plan Progress placeholder
  - `bin/pane-pipeline-progress.sh` — full read; confirmed all four event type handlers exist; confirmed required field names (`.phase_name`, `.wave_number`, `.plan_id`)
  - `bin/lib/event-bus.cjs` — full read; safeAppendEvent pattern, envelope schema
  - `bin/pde-tools.cjs` event-emit case block — lines 763-801; confirmed JSON payload handling, session ID lookup, appendFileSync pattern
  - `hooks/emit-event.cjs` — full read; confirmed existing manual emit call pattern
  - `hooks/hooks.json` — confirmed event types and async declarations
  - `.planning/config.json` — confirmed monitoring.session_id present

- Phase 58 RESEARCH.md (`.planning/phases/58-event-infrastructure-core/58-RESEARCH.md`) — event schema, fail-silent requirements, lazy require pattern, session ID lookup pattern

- Phase 58/61 validation scripts — confirmed test pattern: `check()` helper, `PASS_COUNT/FAIL_COUNT`, static analysis via grep, Node.js inline tests, `set -uo pipefail`, exit 0/1

- `.planning/STATE.md` — architectural decisions: lazy require, fail-silent event bus, hooks-first + manual EVNT-04 distinction, pipeline progress pane "waiting banner is correct idle state" decision confirming Phase 62 responsibility

- `.planning/REQUIREMENTS.md` — EVNT-04 definition and Phase 62 assignment confirmed

---

## Metadata

**Confidence breakdown:**
- Exact instrumentation points: HIGH — both workflow files fully read; insertion points unambiguous
- Event schema fields: HIGH — verified against existing pane-pipeline-progress.sh consumer; matches Phase 58 envelope spec
- archive-session.cjs extension: HIGH — file fully read; aggregation pattern established from existing agentCount/changedFiles logic
- Regression risk assessment: HIGH — execute-phase.md is the most complex file; `|| true` mitigation is established project pattern
- Validation pattern: HIGH — three prior phases (58, 61) use identical bash validation script pattern

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (30 days — no external dependencies; all sources are in-project)
