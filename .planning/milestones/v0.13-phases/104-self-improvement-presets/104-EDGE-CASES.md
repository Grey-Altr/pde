---
phase: 104-self-improvement-presets
generated: "2026-03-23T00:00:00Z"
finding_count: 4
high_count: 2
has_bdd_candidates: true
---

# Phase 104: Edge Cases

**Generated:** 2026-03-23
**Findings:** 4 (cap: 8)
**HIGH severity:** 2
**BDD candidates:** yes

## Findings

### 1. [HIGH] grep returns zero files — mutable_files list is empty

**Plan element:** `workflows/optimize.md`
**Category:** empty_state

When `grep -rl '<!-- OPTIMIZABLE -->' workflows/` is run in Step 1, it could return an empty list if the working directory is wrong or markers were stripped. The plan action does not specify what happens when auto-discovery returns zero results — `parseExperimentFile` would then reject the experiment.md because `mutable_files` must be a non-empty list (per experiment-schema.cjs contract).

**BDD Acceptance Criteria Candidate:**
```
Given the user invokes /pde:optimize --self
When grep discovers zero OPTIMIZABLE workflow files (e.g., wrong cwd or all markers removed)
Then the orchestrator aborts with a clear message: "Auto-discovery found no OPTIMIZABLE workflow files. Check that workflows/ contains <!-- OPTIMIZABLE --> markers."
```

### 2. [HIGH] nyquist-metric.cjs produces no stdout before the integer — _evalMetric reads last line

**Plan element:** `bin/nyquist-metric.cjs`
**Category:** boundary_condition

`_evalMetric` reads the LAST line of stdout as a float. If `bin/nyquist-metric.cjs` emits any additional output after the integer (e.g., a debug line or newline-only line), the metric parse will fail or return NaN, causing CRASH status on every iteration. The action specifies `process.stdout.write(String(passCount) + '\n')` but does not explicitly prevent any other stdout output.

**BDD Acceptance Criteria Candidate:**
```
Given bin/nyquist-metric.cjs is executed
When the Nyquist test suite completes
Then the absolute last line of stdout is a bare integer (no surrounding text), and no additional output follows it
```

### 3. [MEDIUM] --skill flag receives a name with path separators or whitespace

**Plan element:** `workflows/optimize.md`
**Category:** boundary_condition

The plan defines skill name validation against a known list of 14 names, which is correct. However, it does not specify sanitization of the raw flag argument before the comparison. A user passing `--skill ../workflows/brief` or `--skill "brief "` (trailing space) would either pass validation silently (if comparison is loose) or fail with a confusing error. The constructed path `workflows/{name}.md` could resolve outside the intended directory with unsanitized input.

### 4. [MEDIUM] Generated /tmp experiment.md persists across runs — stale data risk

**Plan element:** `workflows/optimize.md`
**Category:** error_path

The plan writes the generated experiment.md to `/tmp/pde-self-improve-experiment.md` (or `/tmp/pde-skill-{name}-experiment.md`). If a previous interrupted run left a file there, the current run will overwrite it silently — which is correct. However, if the file is read-only or the /tmp directory is full, the write will fail without any error handling specified. The plan does not mention checking write success before proceeding to Step 1 field validation.
