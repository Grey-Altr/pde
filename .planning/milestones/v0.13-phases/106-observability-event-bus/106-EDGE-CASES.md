---
phase: 106-observability-event-bus
generated: "2026-03-23T00:00:00.000Z"
finding_count: 5
high_count: 2
has_bdd_candidates: true
---

# Phase 106: Edge Cases

**Generated:** 2026-03-23
**Findings:** 5 (cap: 8)
**HIGH severity:** 2
**BDD candidates:** yes

## Findings

### 1. [HIGH] experiment.complete payload — haltReason quoting when null

**Plan element:** `workflows/optimize.md` (experiment.complete event-emit call)
**Category:** boundary_condition

The `experiment.complete` payload uses a bash conditional to emit either `null` or a quoted string for `halt_reason`. The substitution `$([ -z "${haltReason}" ] && echo 'null' || echo '"'"${haltReason}"'"')` can produce malformed JSON if `haltReason` contains a quote character or newline. If the JSON payload is malformed, `event-emit` silently discards it (the `2>/dev/null || true` pattern hides the error), but the pane receives no `experiment.complete` event and stays in a "running" state permanently.

**BDD Acceptance Criteria Candidate:**
```
Given an experiment halts due to a circuit breaker with haltReason containing special characters
When experiment.complete event-emit is called
Then the JSON payload is valid and the event is appended to the NDJSON bus
```

### 2. [HIGH] pane-experiment.sh — REMAINING budget calculation underflows when ITERATION > BUDGET

**Plan element:** `bin/pane-experiment.sh` (REMAINING calculation)
**Category:** boundary_condition

The action includes `REMAINING=$(( BUDGET - ITERATION ))` with a `[ "$REMAINING" -lt 0 ] && REMAINING=0` guard. However, BUDGET is initialized to `0` at script start and only set when `experiment.start` arrives. If the pane starts mid-experiment (e.g., dashboard restarted) and receives `experiment.iteration` before `experiment.start`, BUDGET stays 0 and REMAINING displays as "0 iterations" for the entire run — a misleading readout.

**BDD Acceptance Criteria Candidate:**
```
Given the experiment pane starts after experiment.start has already been emitted
When experiment.iteration events are received with no prior experiment.start
Then the pane displays "unknown" or "--" for budget remaining rather than "0 iterations"
```

### 3. [MEDIUM] pane-experiment.sh — best metric update logic only updates on experiment.keep, not experiment.complete

**Plan element:** `bin/pane-experiment.sh` (experiment.keep case handler)
**Category:** empty_state

The `experiment.keep` handler updates `BEST_METRIC` only if `val` is non-empty (`[ -n "$val" ] && BEST_METRIC="$val"`). The `experiment.complete` handler unconditionally overwrites `BEST_METRIC` with `.best_metric` from the payload. If an experiment has zero KEEP iterations (all discards/crashes), `BEST_METRIC` will remain at the baseline value but the completion event will correctly overwrite it. However, if `experiment.complete` arrives before any `experiment.keep` (e.g., immediate halt), the `jq -r '.best_metric // "--"'` guard handles it correctly. Low actual risk but the dual update path may cause a brief display flicker.

### 4. [MEDIUM] monitor-dashboard.sh — P7 creation assumes P6 exists and is split-able

**Plan element:** `bin/monitor-dashboard.sh` (P7 split-window call)
**Category:** error_path

The action adds P7 by splitting from P6: `tmux split-window -v -dPF '#{pane_id}' -t "${session}:0.${P6}" -p 50`. If the terminal height is below MIN_ROWS=30 and the dashboard falls back to the minimal layout (which does not create P6), the P7 creation code will run against a non-existent P6 pane and silently fail or emit a tmux error. The plan does not specify a guard to skip P7 creation in the minimal layout path.

### 5. [LOW] tests/phase-106/ — structural tests verify string presence not event ordering

**Plan element:** `tests/phase-106/experiment-events.test.mjs`
**Category:** boundary_condition

The test plan specifies checking that `experiment.start` appears AFTER "Baseline metric" in optimize.md. This is a grep-order test, not a semantic test. If the file has `experiment.start` appearing in a comment block before the relevant Step 6 section, the test could pass while the actual emission is in the wrong place. Low risk given the file structure, but worth noting.
