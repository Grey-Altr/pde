# Phase 106: Observability & Event Bus - Research

**Researched:** 2026-03-23
**Domain:** NDJSON event bus integration + tmux dashboard experiment pane
**Confidence:** HIGH

## Summary

Phase 106 adds experiment lifecycle observability to the existing PDE event bus and tmux
dashboard infrastructure. The entire supporting infrastructure already exists and is
well-understood from v0.8 (Phases 58-62). The work is strictly additive: emit six new
event types from `workflows/optimize.md`, add a new `bin/pane-experiment.sh` pane
script, and wire it into `bin/monitor-dashboard.sh`.

The event emission pattern is completely standardized. Every existing event type
(`phase_started`, `wave_started`, `plan_started`, etc.) follows the identical pattern:
a bash call to `node pde-tools.cjs event-emit <event_type> '<json-payload>'`. The
`pde-tools.cjs` `event-emit` case reads the session ID from `config.json`, builds the
envelope with `schema_version`, `ts`, `event_type`, `session_id`, and payload fields,
then calls `safeAppendEvent` which appends to `/tmp/pde-session-{sessionId}.ndjson`.
All pane scripts use `tail -F` on that same NDJSON file and `jq` to parse events.

No new modules are needed. OBS-01 is purely a `workflows/optimize.md` change (add
six bash event-emit calls at the correct loop points). OBS-02 requires one new pane
script (`bin/pane-experiment.sh`) and a layout change in `bin/monitor-dashboard.sh`.

**Primary recommendation:** Add event-emit calls directly to `workflows/optimize.md`
at six loop points (Steps 5, 7a, 7h-KEEP, 7h-DISCARD, 7h-CRASH, 8). Add
`bin/pane-experiment.sh` following the established pane script pattern. Extend
`build_full_layout()` in `monitor-dashboard.sh` to include the new pane.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
All implementation choices are at Claude's discretion — pure infrastructure phase.
Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

### Claude's Discretion
All implementation choices.

### Deferred Ideas (OUT OF SCOPE)
None — infrastructure phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| OBS-01 | Experiment lifecycle events emitted on NDJSON event bus: `experiment.start`, `experiment.iteration`, `experiment.keep`, `experiment.discard`, `experiment.crash`, `experiment.complete` | Established `event-emit` pattern in `execute-phase.md` and `execute-plan.md` maps directly. Six emission points identified in `workflows/optimize.md` Steps 5, 7a, 7h (three variants), and 8. |
| OBS-02 | tmux dashboard gains experiment pane showing current iteration, best metric, keep/discard ratio, and estimated remaining budget | All seven existing pane scripts use identical `tail -F + jq` pattern. `monitor-dashboard.sh` `build_full_layout()` manages 7 panes; adding an 8th follows the same split-window pattern. |
</phase_requirements>

## Standard Stack

### Core
| Component | Version/Source | Purpose | Why Standard |
|-----------|---------------|---------|--------------|
| `bin/lib/event-bus.cjs` | Existing (Phase 58) | NDJSON append + envelope building | Already the canonical event append path; `safeAppendEvent` is the write primitive |
| `bin/pde-tools.cjs` `event-emit` case | Existing (Phase 58) | External event emission CLI | Established pattern across all PDE workflows; lazy-require guarantees no side effects |
| `tail -F` + `jq` | bash built-ins | Pane event stream consumption | Used in all 7 existing pane scripts; real-time, follows file rotation |
| `tmux split-window` | tmux | New experiment pane creation | Used in `build_full_layout()` for all 7 existing panes |

### Supporting
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `bin/lib/experiment-runner.cjs` | Source of iteration data (metric_value, status, description) | Referenced when defining payload fields; no code changes needed |
| `.planning/config.json` `experiment_defaults` | Source of budget values for "remaining budget" calculation | Pane reads config at startup for budget values |

**Installation:** No new dependencies. All tooling is already present.

## Architecture Patterns

### Event Emission Pattern (from execute-phase.md and execute-plan.md)

All PDE workflow event emissions follow this exact bash pattern:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" event-emit <event_type> '<json-payload>' 2>/dev/null || true
```

The `2>/dev/null || true` is mandatory — event emission must never crash a workflow.

### Envelope Structure (from event-bus.cjs)

Every emitted event resolves to this envelope written to the NDJSON file:

```json
{
  "schema_version": "1.0",
  "ts": "2026-03-23T12:00:00.000Z",
  "event_type": "experiment.start",
  "session_id": "ae4d3cf7-...",
  "slug": "pde-self-improve",
  "metric": "nyquist_pass_count",
  "direction": "max",
  "iteration_budget": 20,
  "baseline_metric": 1075,
  "extensions": {}
}
```

### Six Event Types and Their Emit Points

| Event Type | Emit Point in optimize.md | Required Payload Fields |
|------------|--------------------------|------------------------|
| `experiment.start` | Step 5 — after branch init | `slug`, `metric`, `direction`, `iteration_budget`, `baseline_metric` |
| `experiment.iteration` | Step 7a — at top of loop (after increment) | `slug`, `iteration`, `current_model` |
| `experiment.keep` | Step 7h — after KEEP status branch | `slug`, `iteration`, `metric_value`, `metric_delta` |
| `experiment.discard` | Step 7h — after DISCARD status branch | `slug`, `iteration`, `metric_value`, `metric_delta` |
| `experiment.crash` | Step 7h — after CRASH/BOUNDARY_VIOLATION branch | `slug`, `iteration`, `reason` |
| `experiment.complete` | Step 8 — after generate-report | `slug`, `iterations_run`, `improvements_kept`, `best_metric`, `halt_reason` |

Note: `experiment.start` is emitted in Step 5 (after baseline is captured in Step 6,
so `baseline_metric` must be emitted in a follow-up or Step 6 can be the emission
point). The cleanest approach: emit `experiment.start` after Step 6 (baseline
captured) so baseline_metric is available in the payload.

### Pane Script Pattern (from pane-agent-activity.sh, pane-pipeline-progress.sh)

All pane scripts follow this exact structure:

```bash
#!/usr/bin/env bash
# pane-experiment.sh — streams experiment lifecycle events

NDJSON="${1:-}"
if [ -z "$NDJSON" ]; then
  echo "Usage: pane-experiment.sh <ndjson-path>"
  exit 1
fi

echo "[ experiment ] waiting for events..."
echo ""

# State tracking (bash variables, updated via events)
ITERATION=0
BEST_METRIC="—"
KEEPS=0
DISCARDS=0
BUDGET=0

tail -F "${NDJSON}" 2>/dev/null | while IFS= read -r line; do
  event_type=$(echo "$line" | jq -r '.event_type // empty' 2>/dev/null)
  case "$event_type" in
    experiment.start)
      # ... extract fields, set budget, reset counters
      ;;
    experiment.iteration)
      # ... extract iteration number
      ;;
    experiment.keep|experiment.discard|experiment.crash)
      # ... update counters
      ;;
    experiment.complete)
      # ... show final summary
      ;;
  esac
  # Redraw display with current state
done
```

The pane uses `printf '\033[3;1H\033[J'` (cursor-to-line-3 + clear-down) for in-place
refresh, matching `pane-token-meter.sh`'s display update pattern.

### Dashboard Layout Extension (from monitor-dashboard.sh build_full_layout)

Current layout: 7 panes (P0–P6). The experiment pane is P7, added to the right column
below "suggestions":

```bash
# In build_full_layout():
P7=$(tmux split-window -v -dPF '#{pane_id}' -t "${session}:0.${P6}" -p 50)
tmux select-pane -t "${P7}" -T "experiment"
tmux send-keys -t "${P7}" "bash '${PLUGIN_ROOT}/bin/pane-experiment.sh' '${ndjson}'" C-m
```

### Anti-Patterns to Avoid

- **Event emission before baseline capture:** `experiment.start` should carry `baseline_metric` — emit it in Step 6 (post-baseline) not Step 5
- **Blocking on event emission:** Always append `2>/dev/null || true` — failure must never crash the experiment loop
- **Stateful display without `tail -F`:** Never poll the NDJSON file with a sleep loop; `tail -F` handles file creation and growth natively
- **Hard-coded session ID in pane scripts:** Session ID is read once from NDJSON stream (first `session_id` field seen) — never hardcode
- **Pane script that crashes on missing jq:** Follow `pane-token-meter.sh` pattern of computing fallbacks when jq unavailable

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| NDJSON append | Custom file writer | `safeAppendEvent` via `event-emit` CLI | Handles errors silently, consistent envelope schema |
| Session ID resolution | Custom config reader | Already read by `event-emit` case in `pde-tools.cjs` | Session ID comes from `config.json monitoring.session_id` |
| Real-time file tail | Custom inotify/poll | `tail -F` | Cross-platform, handles file rotation, zero dependencies |
| JSON field extraction in bash | awk/sed parsing | `jq -r` | Already used in all 7 pane scripts; soft dependency with warning in dashboard |

**Key insight:** Every piece of infrastructure needed already exists. This phase is
wiring, not building. The event envelope format, NDJSON path, session ID resolution,
and pane display pattern are all established conventions.

## Common Pitfalls

### Pitfall 1: Event Type Naming — Dots vs Underscores
**What goes wrong:** Existing event types use underscores (`phase_started`,
`subagent_start`). The requirements specify dot-separated names
(`experiment.start`, `experiment.iteration`). Using underscore would break the
`pane-log-stream.sh` fallback handler and won't match the pane-experiment.sh cases.
**Why it happens:** Visual inconsistency between existing names and requirement names.
**How to avoid:** Use dots as specified in OBS-01. The `event-emit` CLI accepts any
string as event type — it will be preserved in the envelope. The pane scripts use
`case "$event_type" in` matching which is pattern-based and handles dots correctly.
**Warning signs:** Pane receives events but shows no output — likely a name mismatch.

### Pitfall 2: Baseline Metric Timing
**What goes wrong:** If `experiment.start` is emitted before Step 6 (baseline capture),
the payload has no `baseline_metric` and the experiment pane can't calculate
"budget remaining" meaningfully.
**Why it happens:** Instinct to emit "start" at the first action (branch init in Step 5).
**How to avoid:** Emit `experiment.start` at the end of Step 6, after
`baselineMetric` is captured. This is consistent with how `phase_started` works
(emitted after the phase is confirmed ready, not before).

### Pitfall 3: Dashboard Layout — Minimum Size Not Updated
**What goes wrong:** Adding an 8th pane in `build_full_layout()` but not adjusting
`MIN_ROWS` in `monitor-dashboard.sh` — on small terminals the 8th pane is created but
has 0 height.
**Why it happens:** `MIN_ROWS=30` was set for 7 panes. With an 8th pane the right
column has 4 panes needing at least 4 rows each.
**How to avoid:** Review the pane split percentages when adding P7. The right column
uses `-p 66` → `-p 50` → `-p 50` for 3 panes. Adding a 4th at `-p 50` of the 3rd
should work but verify `MIN_ROWS` still gives each pane at least 3 visible rows.

### Pitfall 4: NDJSON Path in Pane Script
**What goes wrong:** Pane script attempts to read `config.json` itself to get the
NDJSON path, diverging from the established pattern.
**Why it happens:** Over-engineering. Some pane scripts look complex.
**How to avoid:** The NDJSON path is always passed as `$1` from `monitor-dashboard.sh`
(see lines 203-209 in monitor-dashboard.sh). The pane script never needs to resolve
the path itself.

### Pitfall 5: pane-log-stream.sh Not Updated
**What goes wrong:** `pane-log-stream.sh` has a `case` statement that handles known
event types with specific colors. New `experiment.*` events fall into the `*` default
case (gray). This is acceptable but not ideal — experiment events could get a distinct
color (e.g., cyan/magenta) for visibility.
**Why it happens:** `pane-log-stream.sh` was not written to anticipate experiment events.
**How to avoid:** Add explicit `experiment.*` matching in `pane-log-stream.sh` during
this phase. Use `experiment.*)` as a wildcard case above the `*)` default.

## Code Examples

### Event Emission in workflows/optimize.md (Step 6, post-baseline)

```bash
# Source: execute-phase.md lines 130, 166, 433, 735 (pattern)
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" event-emit experiment.start \
  '{"slug":"'"${slug}"'","metric":"'"${metric}"'","direction":"'"${direction}"'","iteration_budget":'"${iterationBudget}"',"baseline_metric":'"${baselineMetric}"'}' \
  2>/dev/null || true
```

### Event Emission at Each Iteration (Step 7a, after currentIteration increment)

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" event-emit experiment.iteration \
  '{"slug":"'"${slug}"'","iteration":'"${currentIteration}"',"current_model":"'"${currentModel}"'"}' \
  2>/dev/null || true
```

### Event Emission for KEEP/DISCARD/CRASH (Step 7h, in status branches)

```bash
# KEEP
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" event-emit experiment.keep \
  '{"slug":"'"${slug}"'","iteration":'"${currentIteration}"',"metric_value":'"${metric_value}"',"metric_delta":'"${metric_delta}"'}' \
  2>/dev/null || true

# DISCARD
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" event-emit experiment.discard \
  '{"slug":"'"${slug}"'","iteration":'"${currentIteration}"',"metric_value":'"${metric_value}"',"metric_delta":'"${metric_delta}"'}' \
  2>/dev/null || true

# CRASH / BOUNDARY_VIOLATION
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" event-emit experiment.crash \
  '{"slug":"'"${slug}"'","iteration":'"${currentIteration}"',"reason":"'"${status}"'"}' \
  2>/dev/null || true
```

### Event Emission at Completion (Step 8, after generate-report)

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" event-emit experiment.complete \
  '{"slug":"'"${slug}"'","iterations_run":'"${currentIteration}"',"improvements_kept":'"${improvements}"',"best_metric":'"${bestMetric}"',"halt_reason":"'"${haltReason}"'"}' \
  2>/dev/null || true
```

### Pane Display Refresh Pattern (from pane-token-meter.sh lines 83-93)

```bash
# In-place refresh: move cursor to line 3, clear downward, redraw
printf '\033[3;1H\033[J'
printf '  Iteration:     %s / %s\n' "$ITERATION" "$BUDGET"
printf '  Best metric:   %s\n' "$BEST_METRIC"
printf '  Keep/Discard:  %s / %s\n' "$KEEPS" "$DISCARDS"
printf '  Budget left:   %s iterations\n' "$(( BUDGET - ITERATION ))"
```

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|-----------------|-------|
| No experiment visibility | NDJSON event bus + tmux pane (this phase) | Additive — zero regression |
| 7-pane dashboard | 8-pane dashboard (full layout) | Right column gains 4th pane |
| optimize.md emits nothing | Six event types at loop lifecycle points | Prose-level bash calls only |

## Open Questions

1. **Baseline metric emission timing**
   - What we know: Step 5 is branch init; Step 6 is baseline capture
   - What's unclear: Whether to emit `experiment.start` from Step 5 (before baseline) or Step 6 (with baseline)
   - Recommendation: Emit from Step 6, after `baselineMetric` is available. Payload is richer and the pane can immediately show the baseline to compare against.

2. **experiment.complete payload when halted by circuit breaker**
   - What we know: `haltReason` is a string like "iteration_budget" or null for normal completion
   - What's unclear: Whether to use null or "completed" when experiment finishes normally
   - Recommendation: Use `"halt_reason": null` for normal completion; circuit breaker reason string for halts. Consistent with `_generateReport` which uses `haltReason = null` for full completion.

3. **MIN_ROWS adjustment for 8th pane**
   - What we know: `MIN_ROWS=30` currently gates full vs. minimal layout
   - What's unclear: Whether 30 rows is sufficient for 4 right-column panes
   - Recommendation: Keep MIN_ROWS=30 but verify split percentages give at least 3 rows per pane at that height. The right column at 30 rows total: header + 4 panes at roughly 7 rows each — tight but functional.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` (no external dependencies) |
| Config file | None — test files use `node --test tests/` discovery |
| Quick run command | `node --test tests/phase-106/` |
| Full suite command | `node --test tests/` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OBS-01 | `optimize.md` contains all 6 `event-emit` calls with correct event type strings | structural | `node --test tests/phase-106/experiment-events.test.mjs` | ❌ Wave 0 |
| OBS-01 | Each event call appears at the correct step in the workflow (Step 6, 7a, 7h×3, 8) | structural | `node --test tests/phase-106/experiment-events.test.mjs` | ❌ Wave 0 |
| OBS-01 | Event payloads contain required fields (slug, metric_value, etc.) per event type | structural | `node --test tests/phase-106/experiment-events.test.mjs` | ❌ Wave 0 |
| OBS-02 | `bin/pane-experiment.sh` exists and is executable | structural | `node --test tests/phase-106/experiment-pane.test.mjs` | ❌ Wave 0 |
| OBS-02 | `pane-experiment.sh` handles all 6 event types in its `case` block | structural | `node --test tests/phase-106/experiment-pane.test.mjs` | ❌ Wave 0 |
| OBS-02 | `monitor-dashboard.sh` `build_full_layout` launches `pane-experiment.sh` | structural | `node --test tests/phase-106/experiment-pane.test.mjs` | ❌ Wave 0 |
| OBS-02 | `pane-experiment.sh` references iteration, best_metric, keep/discard ratio, budget | structural | `node --test tests/phase-106/experiment-pane.test.mjs` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/phase-106/`
- **Per wave merge:** `node --test tests/`
- **Phase gate:** Full suite green before `/pde:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-106/experiment-events.test.mjs` — covers OBS-01 (workflow event emission)
- [ ] `tests/phase-106/experiment-pane.test.mjs` — covers OBS-02 (pane script + dashboard wiring)

*(No framework install needed — node:test is already in use across 97 test files)*

## Sources

### Primary (HIGH confidence)
- Direct code inspection — `bin/lib/event-bus.cjs` — full module read (envelope structure, safeAppendEvent, dispatch pattern)
- Direct code inspection — `bin/pde-tools.cjs` event-emit case (lines 775-813) — exact CLI emission pattern
- Direct code inspection — `bin/monitor-dashboard.sh` — full module read (layout functions, pane creation pattern)
- Direct code inspection — `bin/pane-agent-activity.sh`, `bin/pane-pipeline-progress.sh`, `bin/pane-log-stream.sh`, `bin/pane-token-meter.sh` — pane script pattern
- Direct code inspection — `workflows/execute-phase.md` (lines 130, 166, 433, 735) — established event-emit call syntax
- Direct code inspection — `workflows/execute-plan.md` (lines 57, 404) — event-emit plan events
- Direct code inspection — `workflows/optimize.md` — full 9-step orchestrator with exact emit point identification

### Secondary (MEDIUM confidence)
- Test directory survey — 97 test files using `node:test` framework — confirms test pattern for new tests

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — entire stack read from source; no external dependencies
- Architecture: HIGH — six emit points identified by reading optimize.md; pattern copied from execute-phase.md verbatim
- Pitfalls: HIGH — identified from direct code reading (naming convention, timing, layout constraints)

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stable infrastructure — no fast-moving dependencies)
