# Phase 102: Mutation Agent & Metric Evaluation - Research

**Researched:** 2026-03-23
**Domain:** Experiment runner agent, boundary enforcement, metric evaluation via spawnSync, token efficiency
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

### Claude's Discretion
All implementation choices.

### Deferred Ideas (OUT OF SCOPE)
None — infrastructure phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXEC-02 | `pde-experiment-runner` agent type created — reads experiment.md, makes one atomic change per iteration, returns structured JSON (iteration, metric_value, metric_delta, status, description) | Agent frontmatter patterns from existing agents; JSONL_ROW_FIELDS from experiment-schema.cjs |
| EXEC-03 | Experiment runner enforces file boundaries: pre-commit hook validates only mutable files were modified, rejects commit and retries if boundary violated | `_checkBoundaries` + `_commit`/`_reset` pattern in experiment.cjs; `git diff --name-only HEAD` approach |
| EXEC-04 | Metric evaluation runs the verify command via `spawnSync` with configurable timeout (default 30s) — three outcomes: KEEP / DISCARD / CRASH | `spawnSync` from child_process; timeout field; stderr/stdout parsing; EXPERIMENT-BEST.json direction field |
| SELF-06 | Experiment runner uses minimal context window — only experiment.md, target file(s), last N iteration results, and metric output loaded per iteration | Agent prompt design; `<required_reading>` scoped to experiment.md + diff only |
| SELF-07 | Haiku-first model selection — defaults to haiku, escalates to sonnet after 3 consecutive boundary violations or crashes | Agent frontmatter + runtime state tracking via EXPERIMENT-BEST.json or results.jsonl |
| SELF-08 | Diff-based context: after iteration 1, runner receives only the diff of current-best vs baseline (not full file) | `git diff <baseline> HEAD -- <file>` via execGit; injected into agent prompt |
| SELF-09 | Token usage tracked per experiment — each results.jsonl row includes `tokens_used`; REPORT.md includes total token cost and cost-per-improvement ratio | JSONL_ROW_FIELDS must be extended with `tokens_used`; REPORT.md generation logic |
</phase_requirements>

---

## Summary

Phase 102 creates the mutation agent (`agents/pde-experiment-runner.md`) and adds the supporting library module (`bin/lib/experiment-runner.cjs`) that implements: (1) atomic file mutation via Claude, (2) pre-commit boundary enforcement, (3) metric evaluation with timeout, and (4) token-efficient context management including Haiku-first model selection and diff-based iteration context.

The phase builds directly on the infrastructure from Phases 100 and 101. All git operations use the existing `_commit`/`_reset` helpers from `experiment.cjs`. Schema parsing uses `parseExperimentFile` from `experiment-schema.cjs`. The only new library module is `bin/lib/experiment-runner.cjs` (a fourth distinct CJS module alongside the existing three), which must stay under the 300-line ceiling enforced project-wide.

**Primary recommendation:** Create `agents/pde-experiment-runner.md` as the Claude-facing agent definition, and `bin/lib/experiment-runner.cjs` as the orchestration helper that the agent's Bash calls use for boundary enforcement, metric evaluation, and JSONL row writing. Do NOT add logic to `experiment.cjs` (already at 289/300 lines) or `experiment-schema.cjs`.

---

## Standard Stack

### Core (already in project)

| Module | Location | Purpose | Phase 102 Use |
|--------|----------|---------|--------------|
| `experiment.cjs` | `bin/lib/experiment.cjs` | Git state machine | `_commit`, `_reset`, `_checkBoundaries`, `checkBoundaries` |
| `experiment-schema.cjs` | `bin/lib/experiment-schema.cjs` | Schema parsing, JSONL contract | `parseExperimentFile`, `JSONL_ROW_FIELDS` |
| `core.cjs` | `bin/lib/core.cjs` | `execGit`, `output`, `error` | `execGit` for diff extraction, `output` for structured results |
| `frontmatter.cjs` | `bin/lib/frontmatter.cjs` | YAML parsing | Already used by experiment-schema.cjs |
| `child_process.spawnSync` | Node.js built-in | Subprocess execution | Verify command evaluation with timeout |

### New Module

| Module | Location | Purpose |
|--------|----------|---------|
| `experiment-runner.cjs` | `bin/lib/experiment-runner.cjs` | Boundary pre-commit check, metric eval, JSONL row write, diff extraction |

### Supporting (pde-tools.cjs dispatch)

Two new experiment subcommands needed in `pde-tools.cjs`:
- `experiment run-iteration` — runs one mutation iteration (boundary check + eval)
- `experiment write-row` — appends a JSONL row to results.jsonl

**Installation:** No new npm dependencies. All functionality uses Node.js built-ins (`child_process`, `fs`, `path`).

---

## Architecture Patterns

### Recommended Structure

```
agents/
  pde-experiment-runner.md      # Claude-facing agent (EXEC-02)
bin/lib/
  experiment-runner.cjs         # NEW: iteration logic helpers (EXEC-03, EXEC-04, SELF-08, SELF-09)
  experiment.cjs                # EXISTING: git state machine (DO NOT MODIFY — at 289/300 lines)
  experiment-schema.cjs         # EXISTING: schema parsing (DO NOT MODIFY — add tokens_used to JSONL_ROW_FIELDS)
tests/phase-102/
  experiment-runner-boundaries.test.mjs    # boundary enforcement tests (EXEC-03)
  experiment-runner-metric-eval.test.mjs   # spawnSync timeout tests (EXEC-04)
  experiment-runner-jsonl.test.mjs         # JSONL row + tokens_used tests (SELF-09)
  experiment-runner-agent.test.mjs         # agent file structure tests (EXEC-02)
```

### Pattern 1: Pre-Commit Boundary Enforcement (EXEC-03)

**What:** Before firing `_commit`, the runner checks which files were actually modified (via `git diff --name-only HEAD`) against the declared `mutable_files` in experiment.md. Files modified outside `mutable_files` or that appear in the protected list cause a boundary violation: `_reset` fires, no budget slot is consumed.

**When to use:** Every iteration, before `_commit` is called.

**Implementation approach:**
```javascript
// Source: experiment.cjs _checkBoundaries pattern + new diff-check logic
function _checkModifiedFiles(cwd, mutableFiles) {
  const diffResult = execGit(cwd, ['diff', '--name-only', 'HEAD']);
  if (diffResult.exitCode !== 0) {
    return { valid: false, violations: ['git diff failed'] };
  }
  const modified = diffResult.stdout.split('\n').filter(Boolean);
  const mutableSet = new Set(mutableFiles);
  const violations = modified.filter(f => !mutableSet.has(f));
  return { valid: violations.length === 0, violations, modified };
}
```

The agent prompt must instruct the runner to call this check after making its edit and before calling `experiment commit`. If violations exist, the prompt must instruct calling `experiment reset` and retrying — without decrementing the iteration counter.

**Critical: boundary violation must NOT consume a budget slot.** The iteration counter increments only on `_commit` success (which writes to EXPERIMENT-BEST.json). A reset-and-retry stays at the same iteration number.

### Pattern 2: Metric Evaluation via spawnSync (EXEC-04)

**What:** The `verify` command from experiment.md frontmatter is run via `spawnSync` with a configurable timeout (default 30s from `experiment_defaults` in config.json). Three outcomes map to status values:

| Condition | Status | Action |
|-----------|--------|--------|
| Exit 0 + parseable metric output | KEEP or DISCARD | Compare metric_value vs bestMetric per direction |
| Exit 0 but metric unparseable | CRASH | Reset, log, count as consecutive crash |
| Non-zero exit | CRASH | Reset, log, count as consecutive crash |
| Process hung past timeout | CRASH | `spawnSync` returns `status: null` + `signal: 'SIGTERM'` |

**spawnSync timeout detection:**
```javascript
// Source: Node.js docs — spawnSync returns { status: null, signal: 'SIGTERM' } on timeout
const result = spawnSync(cmd, args, {
  cwd,
  timeout: timeoutMs,
  encoding: 'utf-8',
  stdio: 'pipe',
});
const timedOut = result.signal === 'SIGTERM' || result.status === null;
```

**Metric extraction:** The verify command must print the metric value to stdout on its last line (or a parseable float anywhere in stdout). The runner parses `parseFloat(result.stdout.trim().split('\n').pop())`. If `isNaN(parsed)`, status becomes CRASH.

**KEEP vs DISCARD logic:** Uses `direction` from experiment.md and `bestMetric` from EXPERIMENT-BEST.json (via `_status`). First iteration always KEEP if metric is valid (bestMetric is null). Subsequent: KEEP if improvement per direction, else DISCARD. On KEEP: call `_commit`. On DISCARD or CRASH: call `_reset`.

### Pattern 3: Minimal Context Window (SELF-06)

**What:** The agent's `<required_reading>` section loads ONLY:
1. The experiment.md file
2. Current target file content (first iteration) OR diff (iterations 2+)
3. Last 3 results.jsonl rows (most recent context, not full history)
4. Metric output from previous iteration (to understand trend)

**Agent prompt design:** The orchestrating workflow (Phase 103) passes the diff/content to the runner as a prompt argument, not as a file to load. The agent definition itself documents the minimal-context contract.

### Pattern 4: Haiku-First Model Selection (SELF-07)

**What:** The agent definition specifies `model: haiku` in its YAML frontmatter. A consecutive violation counter is maintained — when it reaches 3, the calling workflow escalates to Sonnet.

**How escalation is tracked:** The EXPERIMENT-BEST.json state file gains two new fields:
- `consecutive_violations` — incremented on each boundary violation or CRASH
- `model_escalated` — boolean, set true when threshold (3) is reached

On a successful KEEP iteration, `consecutive_violations` resets to 0 (but `model_escalated` stays true once set — no de-escalation).

**Agent definition frontmatter:**
```yaml
---
name: pde-experiment-runner
description: Applies one atomic mutation to a target file, evaluates metric, returns structured JSON
model: haiku
tools:
  - Read
  - Edit
  - Bash
---
```

### Pattern 5: Diff-Based Context (SELF-08)

**What:** After iteration 1, instead of loading the full target file, the runner receives only `git diff <baseline> HEAD -- <file>`. This reduces per-iteration token consumption proportionally to file size.

**Diff extraction:**
```javascript
// Source: execGit in core.cjs
function _extractDiff(cwd, baseline, files) {
  const args = ['diff', baseline, 'HEAD', '--'];
  args.push(...files);
  const result = execGit(cwd, args);
  return result.exitCode === 0 ? result.stdout : null;
}
```

The baseline commit hash is stored in EXPERIMENT-BEST.json (`baseline` field, set by `_init`).

### Pattern 6: Token Tracking (SELF-09)

**What:** JSONL_ROW_FIELDS must be extended to include `tokens_used`. The runner reads token usage from Claude's response (passed in by the orchestrating workflow as a structured argument). REPORT.md includes total token cost and cost-per-improvement.

**JSONL_ROW_FIELDS update:** The existing frozen array in `experiment-schema.cjs` must be extended:
```javascript
// CURRENT (8 fields):
const JSONL_ROW_FIELDS = Object.freeze([
  'id', 'iteration', 'ts', 'commit',
  'metric_value', 'metric_delta', 'status', 'description',
]);

// PHASE 102 TARGET (9 fields):
const JSONL_ROW_FIELDS = Object.freeze([
  'id', 'iteration', 'ts', 'commit',
  'metric_value', 'metric_delta', 'status', 'description', 'tokens_used',
]);
```

**CRITICAL:** Existing test `experiment-schema.test.mjs` line 58 asserts `JSONL_ROW_FIELDS` contains exactly 8 fields. That test must be updated to expect 9 fields when `tokens_used` is added.

**REPORT.md token summary format:**
```
## Token Usage Summary

| Metric | Value |
|--------|-------|
| Total iterations | N |
| Total tokens used | N |
| Cost estimate | $N.NN |
| Improvements kept | N |
| Cost per improvement | $N.NN |
```

Cost estimate uses Haiku pricing ($0.80/M input, $4.00/M output) or Sonnet pricing ($3.00/M input, $15.00/M output) depending on `model_escalated` state.

### Anti-Patterns to Avoid

- **Modifying `experiment.cjs`:** At 289/300 lines — any new function must go in `experiment-runner.cjs`. If you add a single helper to experiment.cjs it will breach the ceiling.
- **Loading full file context on every iteration:** Iteration 2+ must use diff only. Loading the full file wastes tokens and defeats SELF-08.
- **Consuming a budget slot on boundary violation:** A boundary violation triggers `_reset` and retry. The iteration number must NOT increment. Only successful `_commit` calls (which update EXPERIMENT-BEST.json) count as budget.
- **Blocking on timed-out process:** `spawnSync` handles this — use `timeout` option, check `result.signal === 'SIGTERM'`. Never use `spawn` (async) which requires manual timeout handling.
- **Hardcoding field names in runner logic:** Import `JSONL_ROW_FIELDS` from `experiment-schema.cjs` rather than listing field names inline.
- **Writing results.jsonl with bare append:** The JSONL row write must be atomic — use `fs.appendFileSync` (synchronous) not async writes that could interleave.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timeout enforcement | Manual setTimeout + kill() | `spawnSync({ timeout: N })` | spawnSync handles SIGTERM and sets `signal` field |
| Git diff extraction | String parsing of git status | `execGit(cwd, ['diff', ...])` from core.cjs | Already handles escaping and error codes |
| Schema parsing | Custom frontmatter parser | `parseExperimentFile` from experiment-schema.cjs | Validated, handles edge cases, returns normalized types |
| Boundary checking | Duplicate protected_files logic | `checkBoundaries` from experiment.cjs | Reads experiment-boundaries.md — single source of truth |
| State file read/write | Direct JSON.parse/stringify | `_status` from experiment.cjs | Handles missing file, returns normalized shape |
| JSONL row fields | Inline field list | `JSONL_ROW_FIELDS` from experiment-schema.cjs | Frozen contract — Phase 103+ depends on it |

---

## Common Pitfalls

### Pitfall 1: experiment.cjs Line Ceiling
**What goes wrong:** Adding iteration logic to `experiment.cjs` breaches the 300-line ceiling. The ceiling is a scope-creep prevention rule, not a style preference.
**Why it happens:** `experiment.cjs` already has `_checkBoundaries` which looks related. Tempting to add diff check there.
**How to avoid:** Create `bin/lib/experiment-runner.cjs` as a new module. All Phase 102 iteration logic lives there.
**Warning signs:** Any diff to `experiment.cjs` that adds lines.

### Pitfall 2: Budget Slot Consumed on Boundary Violation
**What goes wrong:** Iteration counter increments even when boundary was violated and reset. This wastes the user's budget.
**Why it happens:** The `_commit` call in `experiment.cjs` increments `state.iteration` internally. If reset fires after commit, iteration is already incremented.
**How to avoid:** The boundary check must fire BEFORE `_commit`. The sequence is: (1) agent edits file, (2) check `git diff --name-only HEAD` vs mutable_files, (3) if violation: `_reset` and retry (no commit ever fired, iteration stays same), (4) if clean: then call `_commit`.
**Warning signs:** results.jsonl rows showing BOUNDARY_VIOLATION with consecutive iteration numbers.

### Pitfall 3: Metric Parse Failure Not Caught
**What goes wrong:** verify command exits 0 but prints non-numeric output. Runner incorrectly treats this as a successful KEEP.
**Why it happens:** `parseFloat('')` returns `NaN`; `!isNaN(NaN)` is false so the check passes silently without explicit NaN guard.
**How to avoid:** Always check `Number.isFinite(parsed)` not just `!isNaN(parsed)`. `parseFloat` of empty string or `Infinity` both pass `!isNaN` but fail `Number.isFinite`.
**Warning signs:** metric_value of `null`, `NaN`, or `Infinity` appearing in results.jsonl.

### Pitfall 4: Nyquist Test for JSONL_ROW_FIELDS Must Be Updated
**What goes wrong:** Extending JSONL_ROW_FIELDS to 9 fields breaks the existing test in `tests/phase-101/experiment-schema.test.mjs` line 58 which asserts exactly 8 fields.
**Why it happens:** The test uses `assert.deepEqual` with a hardcoded 8-element array.
**How to avoid:** When extending JSONL_ROW_FIELDS, update the test in the same wave. The test file is at `tests/phase-101/experiment-schema.test.mjs` — updating it is permitted (tests cover behavior, not frozen schema).
**Warning signs:** Test suite failure on `JSONL_ROW_FIELDS contains exactly the 8 required fields`.

### Pitfall 5: agents/ Is a Protected Directory
**What goes wrong:** Attempting to put the agent in a subdirectory or name it inconsistently with the existing agent naming convention.
**Why it happens:** `agents/` is listed in `protected_directories` in experiment-boundaries.md — experiments cannot MODIFY agents. But Phase 102 is CREATING a new agent file, which is always allowed (protected_directories prevents experiment mutations, not normal development).
**How to avoid:** Create `agents/pde-experiment-runner.md` following the naming convention of existing agents (`pde-` prefix). The file is created once and then becomes permanently locked for experiments.

### Pitfall 6: spawnSync vs exec Confusion
**What goes wrong:** Using `execSync` (which throws on non-zero exit) instead of `spawnSync` (which returns exit code) loses the stderr/stdout content needed to distinguish CRASH from DISCARD.
**Why it happens:** `execSync` is used throughout `core.cjs` for git operations. But git operations have known exit code semantics; verify commands are user-defined and may exit non-zero for legitimate reasons.
**How to avoid:** Always use `spawnSync` for the verify command. Parse `result.status`, `result.signal`, `result.stdout`, `result.stderr` explicitly.

---

## Code Examples

### Agent Frontmatter Pattern (EXEC-02)

Two frontmatter styles exist in the project. `pde-research-validator.md` uses YAML frontmatter:

```yaml
---
name: pde-experiment-runner
description: Applies one atomic mutation per iteration, evaluates metric, returns structured result
argument-hint: "[experiment-md-path] [iteration] [baseline-sha] [context-mode full|diff]"
allowed-tools:
  - Read
  - Edit
  - Bash
model: haiku
---
```

`pde-analyst.md` uses `<agent>` XML tags with no frontmatter. Use the YAML frontmatter pattern (consistent with `pde-research-validator.md`, `pde-plan-checker.md`).

### Metric Evaluation (EXEC-04)

```javascript
// Source: Node.js child_process.spawnSync docs + experiment.cjs pattern
const { spawnSync } = require('child_process');

function _evalMetric(cwd, verifyCmd, timeoutMs) {
  // Split "node bin/pde-tools.cjs experiment verify-metric" into cmd + args
  const parts = verifyCmd.split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);

  const result = spawnSync(cmd, args, {
    cwd,
    timeout: timeoutMs,
    encoding: 'utf-8',
    stdio: 'pipe',
  });

  // Timeout: signal is 'SIGTERM', status is null
  if (result.signal === 'SIGTERM' || result.status === null) {
    return { status: 'CRASH', reason: 'timeout', metric_value: null };
  }

  // Non-zero exit
  if (result.status !== 0) {
    return { status: 'CRASH', reason: 'nonzero_exit', stderr: result.stderr, metric_value: null };
  }

  // Parse metric from last line of stdout
  const lastLine = (result.stdout || '').trim().split('\n').pop() || '';
  const parsed = parseFloat(lastLine);
  if (!Number.isFinite(parsed)) {
    return { status: 'CRASH', reason: 'unparseable_metric', stdout: result.stdout, metric_value: null };
  }

  return { status: 'ok', metric_value: parsed };
}
```

### Pre-Commit Boundary Check (EXEC-03)

```javascript
// Source: experiment.cjs _checkBoundaries pattern extended for staged diff
function _checkModifiedFiles(cwd, mutableFiles) {
  const diffResult = execGit(cwd, ['diff', '--name-only', 'HEAD']);
  if (diffResult.exitCode !== 0) {
    return { valid: false, violations: ['git diff failed: ' + diffResult.stderr] };
  }
  const modified = diffResult.stdout.split('\n').filter(Boolean);
  if (modified.length === 0) {
    return { valid: false, violations: ['no files modified — nothing to commit'] };
  }
  const mutableSet = new Set(mutableFiles);
  const violations = modified.filter(f => !mutableSet.has(f));
  return { valid: violations.length === 0, violations, modified };
}
```

### JSONL Row Write (SELF-09)

```javascript
// Source: JSONL_ROW_FIELDS from experiment-schema.cjs
function _writeJsonlRow(cwd, slug, rowData) {
  const { JSONL_ROW_FIELDS } = require('./experiment-schema.cjs');
  const jsonlPath = path.join(cwd, '.planning', 'experiments', slug, 'results.jsonl');

  // Build row with only JSONL_ROW_FIELDS keys (schema enforcement)
  const row = {};
  for (const field of JSONL_ROW_FIELDS) {
    row[field] = rowData[field] !== undefined ? rowData[field] : null;
  }
  row.id = `${slug}-${String(row.iteration).padStart(4, '0')}`;
  row.ts = new Date().toISOString();

  fs.appendFileSync(jsonlPath, JSON.stringify(row) + '\n', 'utf-8');
  return row;
}
```

### Diff Extraction (SELF-08)

```javascript
// Source: execGit from core.cjs
function _extractDiff(cwd, baseline, files) {
  const args = ['diff', baseline, 'HEAD', '--'];
  for (const f of files) args.push(f);
  const result = execGit(cwd, args);
  if (result.exitCode !== 0) return null;
  return result.stdout || '(no diff)';
}
```

### Consecutive Violation Tracking (SELF-07)

EXPERIMENT-BEST.json state file must track:
```json
{
  "slug": "improve-brief-quality",
  "branch": "experiment/improve-brief-quality",
  "baseline": "abc1234",
  "bestMetric": null,
  "bestCommit": null,
  "iteration": 0,
  "consecutive_violations": 0,
  "model_escalated": false
}
```

The `_commit` helper in experiment.cjs already writes to EXPERIMENT-BEST.json via `writeBest`. Phase 102 updates to `writeBest` must preserve existing fields (use object spread: `{ ...state, consecutive_violations: N }`).

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Process.exec with custom timeout | `spawnSync({ timeout })` | Handles SIGTERM automatically, no manual kill needed |
| Full file context on every iteration | Diff-based context from iteration 2 | Token reduction proportional to file size; 500-line workflow file = ~12K tokens saved/iteration |
| Uniform model selection | Haiku-first with Sonnet escalation | ~10x cost reduction when Haiku succeeds; Sonnet reserved for difficult cases |
| JSONL without token tracking | `tokens_used` per row | Enables cost-per-improvement analysis after experiment completion |

---

## Open Questions

1. **Metric extraction format**
   - What we know: `verify` command in experiment.md is `node bin/pde-tools.cjs experiment verify-metric` per template
   - What's unclear: The `verify-metric` subcommand is not yet wired in pde-tools.cjs — it produces the metric value, but its exact stdout format is not yet defined
   - Recommendation: Phase 102 should define the metric extraction convention as "last line of stdout is a float" and document it in experiment.md template. `verify-metric` subcommand dispatch can be added to pde-tools.cjs in this phase as a stub or left to Phase 103 if not needed by runner tests.

2. **Token usage source**
   - What we know: The agent definition specifies Haiku model; the orchestrating workflow (Phase 103) spawns the runner agent
   - What's unclear: How does `tokens_used` get from Claude's API response into results.jsonl? The runner agent itself cannot read its own token usage from within a tool call.
   - Recommendation: The orchestrating workflow (Phase 103) is responsible for capturing token usage from the agent spawn result and passing it as a structured argument when calling the runner. Phase 102 should design the agent to ACCEPT `tokens_used` as a parameter in its return JSON, with the orchestrator populating it. The JSONL write helper should accept `tokens_used` as an optional field (null if not provided by orchestrator).

3. **Trimmed Nyquist subset for verify**
   - What we know: STATE.md blocker notes "Trimmed Nyquist subset composition (15-30 assertions per iteration vs full 235) not yet defined"
   - What's unclear: Which assertions constitute the trimmed subset for experiment evaluation
   - Recommendation: Phase 102 does not need to resolve this. The `verify` command in experiment.md is user-specified — trimmed subset is an experiment-authoring concern, not a runner concern. Document in agent instructions that verify must complete within timeout.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | node:test (built-in, no install) |
| Config file | none — tests run directly |
| Quick run command | `node --test tests/phase-102/*.test.mjs` |
| Full suite command | `node --test tests/**/*.test.mjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXEC-02 | Agent file exists with required frontmatter (name, description, allowed-tools, model) | structural | `node --test tests/phase-102/experiment-runner-agent.test.mjs` | Wave 0 |
| EXEC-03 | `_checkModifiedFiles` returns violations when file outside mutable_files is modified | unit | `node --test tests/phase-102/experiment-runner-boundaries.test.mjs` | Wave 0 |
| EXEC-03 | Boundary violation does not consume budget slot (iteration counter unchanged) | unit | `node --test tests/phase-102/experiment-runner-boundaries.test.mjs` | Wave 0 |
| EXEC-04 | `_evalMetric` returns CRASH when command times out (spawnSync signal=SIGTERM) | unit | `node --test tests/phase-102/experiment-runner-metric-eval.test.mjs` | Wave 0 |
| EXEC-04 | `_evalMetric` returns CRASH when command exits non-zero | unit | `node --test tests/phase-102/experiment-runner-metric-eval.test.mjs` | Wave 0 |
| EXEC-04 | `_evalMetric` returns CRASH when stdout is non-numeric | unit | `node --test tests/phase-102/experiment-runner-metric-eval.test.mjs` | Wave 0 |
| EXEC-04 | `_evalMetric` returns ok with parsed float on exit 0 + numeric stdout | unit | `node --test tests/phase-102/experiment-runner-metric-eval.test.mjs` | Wave 0 |
| SELF-06 | Agent instructions document minimal context window (prose check) | structural | `node --test tests/phase-102/experiment-runner-agent.test.mjs` | Wave 0 |
| SELF-07 | EXPERIMENT-BEST.json gains `consecutive_violations` and `model_escalated` fields | unit | `node --test tests/phase-102/experiment-runner-boundaries.test.mjs` | Wave 0 |
| SELF-08 | `_extractDiff` returns diff string for known baseline and modified file | unit | `node --test tests/phase-102/experiment-runner-diff.test.mjs` | Wave 0 |
| SELF-09 | `_writeJsonlRow` produces row with `tokens_used` field | unit | `node --test tests/phase-102/experiment-runner-jsonl.test.mjs` | Wave 0 |
| SELF-09 | JSONL_ROW_FIELDS contains `tokens_used` (9 fields total) | unit | `node --test tests/phase-102/experiment-runner-jsonl.test.mjs` | Wave 0 |
| SELF-09 | Existing phase-101 schema test updated to expect 9 fields | regression | `node --test tests/phase-101/experiment-schema.test.mjs` | Exists — update needed |

### Sampling Rate

- **Per task commit:** `node --test tests/phase-102/*.test.mjs`
- **Per wave merge:** `node --test tests/phase-100/*.test.mjs tests/phase-101/*.test.mjs tests/phase-102/*.test.mjs`
- **Phase gate:** Full suite green before `/pde:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-102/experiment-runner-agent.test.mjs` — covers EXEC-02, SELF-06
- [ ] `tests/phase-102/experiment-runner-boundaries.test.mjs` — covers EXEC-03, SELF-07
- [ ] `tests/phase-102/experiment-runner-metric-eval.test.mjs` — covers EXEC-04
- [ ] `tests/phase-102/experiment-runner-diff.test.mjs` — covers SELF-08
- [ ] `tests/phase-102/experiment-runner-jsonl.test.mjs` — covers SELF-09
- [ ] Update `tests/phase-101/experiment-schema.test.mjs` line 58 — assert 9 fields after JSONL_ROW_FIELDS extension

---

## Sources

### Primary (HIGH confidence)

- Codebase read: `bin/lib/experiment.cjs` — confirmed at 289/300 lines; `_checkBoundaries`, `_commit`, `_reset` exact signatures; `writeBest` JSON shape
- Codebase read: `bin/lib/experiment-schema.cjs` — confirmed JSONL_ROW_FIELDS (8 fields, Object.freeze); `parseExperimentFile` return shape
- Codebase read: `bin/lib/core.cjs` — `execGit` signature, `spawnSync` usage pattern via `execSync`
- Codebase read: `bin/pde-tools.cjs` experiment dispatch (lines 835-872) — confirmed existing subcommands and extension point
- Codebase read: `references/experiment-boundaries.md` — confirmed `agents/` is protected_directory (experiments cannot modify agents, not that agents cannot be created)
- Codebase read: `tests/phase-100/experiment-state-machine.test.mjs` — confirmed node:test pattern with `makeRepo()` helper
- Codebase read: `tests/phase-101/experiment-schema.test.mjs` — confirmed assertion at line 58 that MUST be updated when JSONL_ROW_FIELDS gains `tokens_used`
- Codebase read: `.planning/STATE.md` — confirmed decisions: 300-line ceiling, token efficiency bundled into Phase 102, JSONL_ROW_FIELDS as Object.freeze contract
- Codebase read: `.planning/REQUIREMENTS.md` — exact requirement descriptions for EXEC-02 through SELF-09
- Codebase read: `agents/pde-research-validator.md` — YAML frontmatter pattern (name, description, argument-hint, allowed-tools)
- Codebase read: `templates/experiment.md` — confirmed verify field format: `node bin/pde-tools.cjs experiment verify-metric`

### Secondary (MEDIUM confidence)

- Node.js documentation (training data): `spawnSync({ timeout })` sets SIGTERM on timeout and returns `{ status: null, signal: 'SIGTERM' }` — consistent with described behavior, verified against existing `execSync` usage in core.cjs
- `Number.isFinite` vs `!isNaN` distinction — well-established JS behavior, HIGH confidence

### Tertiary (LOW confidence)

- Token cost estimates (Haiku/Sonnet pricing) — based on training data prices as of August 2025; actual pricing should be verified at time of REPORT.md generation. The REPORT.md should use live pricing if available, or note the pricing version used.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — entire stack read from existing codebase
- Architecture patterns: HIGH — directly derived from existing module patterns and success criteria
- Pitfalls: HIGH — identified from existing code structure (line ceilings, existing test assertions, protected_directories semantics)
- Open questions: MEDIUM — token source requires design decision at Phase 103 boundary

**Research date:** 2026-03-23
**Valid until:** 2026-04-22 (30 days — stable domain, all dependencies are internal codebase)
