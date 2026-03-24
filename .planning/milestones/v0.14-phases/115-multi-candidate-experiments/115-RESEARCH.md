# Phase 115: Multi-Candidate Experiments — Research

**Researched:** 2026-03-23
**Domain:** Multi-candidate (best-of-N) optimization loop — extending the AutoResearch experiment runner to generate N variants per iteration, evaluate each, and promote the best
**Confidence:** HIGH (all patterns verified from live codebase analysis; pre-research document `.planning/research/v0.14-MULTI-CANDIDATE.md` covers domain exhaustively with codebase-grounded analysis)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MULTI-01 | Multi-candidate experiment mode generates N variants per iteration (A/B testing) | Sequential commit/reset strategy documented in v0.14-MULTI-CANDIDATE.md §3; candidate loop wraps existing Task() dispatch in optimize.md Step 7 |
| MULTI-02 | Each candidate evaluated independently against same metric | Existing `_evalMetric` / `eval-metric` subcommand reused per-candidate; no changes needed to the evaluation contract |
| MULTI-03 | Best candidate selected and promoted (git commit), others discarded | `_resetToSha(cwd, slug, sha)` new helper in experiment-runner.cjs resets branch to best candidate SHA; losing candidates become dangling commits (GC-safe) |
| MULTI-04 | Candidate count configurable in experiment.md (default: 3) | New `candidates` YAML frontmatter field parsed by experiment-schema.cjs; default 3 per REQUIREMENTS.md |
| MULTI-05 | Multi-candidate mode integrates with existing orchestrator loop (Phase 103 infrastructure) | Candidate loop inserted into optimize.md Step 7; when `candidates === 1`, reduces exactly to current single-candidate behavior |
</phase_requirements>

---

## Summary

Phase 115 extends the AutoResearch experiment loop (optimize.md Step 7) with a per-iteration candidate loop. Instead of dispatching a single Task() to the runner agent, the orchestrator dispatches N Tasks, captures each candidate's metric score, selects the best, and promotes it using a new `_resetToSha` git primitive. The other candidates become dangling commits that Git GC prunes automatically.

The architectural decision from pre-research stands: the multi-candidate loop lives in the **orchestrator** (optimize.md), NOT in the runner agent or any lib module. The runner agent remains stateless — it still makes one atomic mutation and returns a JSON result. All candidate coordination is orchestrator-level logic. This keeps experiment-runner.cjs well under its 300-line ceiling and the runner agent unchanged.

Three files require changes: (1) experiment-schema.cjs — add `candidates` field parsing and extend JSONL_ROW_FIELDS with three new multi-candidate fields; (2) experiment.cjs or experiment-runner.cjs — add `_resetToSha` helper; (3) optimize.md — replace single Task() dispatch with a candidate loop. One new file is needed: tests/phase-115/multi-candidate.test.mjs for Nyquist coverage.

**Primary recommendation:** Implement the sequential commit/reset strategy (Option A from pre-research). Each candidate commits to the experiment branch, the best is identified via argmax/argmin, the branch is reset to the winning SHA, and losers become dangling. When `candidates` field is absent from experiment.md, default to 3 per REQUIREMENTS.md MULTI-04.

**Default candidate count discrepancy:** The pre-research document recommends default 1 (backward compatible). REQUIREMENTS.md MULTI-04 explicitly states default 3. REQUIREMENTS.md takes precedence — default is 3. This is a known discrepancy the planner must explicitly resolve: existing experiment templates without a `candidates` field will run in N=3 mode after this phase, which triples their evaluation cost. The planner should add a note in the plan to audit existing templates that do not specify `candidates` and set `candidates: 1` if the author intends single-candidate mode.

---

## Project Constraints (from CLAUDE.md)

CLAUDE.md is not present in the project root. Constraints derived from project source, STATE.md decisions, and live infrastructure:

- **Zero npm dependencies** — all new code uses only Node.js built-ins (`fs`, `path`, `child_process`, `crypto`). No new packages.
- **CJS format only** in `bin/lib/` — `'use strict';` at top, no ESM syntax. Test files use `.mjs` (ESM with `createRequire` for importing CJS libs).
- **Under 300 lines per module** — experiment.cjs is at 289 lines (verified from source). Adding `_resetToSha` would push it to ~304 lines. Place `_resetToSha` in experiment-runner.cjs (197 lines) instead.
- **REQUIRED_FIELDS in experiment-schema.cjs unchanged** — `candidates` is OPTIONAL with default 3. Adding it to REQUIRED_FIELDS would break all 18 existing templates.
- **Backward compatibility required** — when `candidates` field is absent, default is 3 (per REQUIREMENTS.md). The candidate loop must be transparent to the runner agent (it still just mutates and returns).
- **nyquist_validation: true** — Nyquist tests required in `tests/phase-115/`. Test command: `node --test tests/phase-115/`
- **experiment.cjs _reset() prefix guard** — `_reset()` checks that last commit subject starts with `experiment({slug}):`. Multi-candidate commits must use this same prefix, e.g. `experiment({slug}): candidate 1 of 3 — <description>`. The `_resetToSha` helper does NOT need this guard (it resets to any SHA on the correct branch).
- **EXPERIMENT-BEST.json** tracks bestMetric, bestCommit, baseline. Multi-candidate does not change this contract — the promoted commit SHA becomes bestCommit, promoted metric becomes bestMetric.
- **circuit breaker defaults NOT overridable per experiment** — `consecutiveFailureLimit` and `noProgressLimit` remain config.json-only. Circuit breakers apply per-iteration with partial batch handling (if some candidates succeed, iteration is not a failure).
- **Direction: max for all existing templates** — must remain unchanged. Multi-candidate argmax/argmin logic uses the existing `direction` field.
- **`experiment.cjs` module ceiling comment** — module header says "Under 300 lines — scope creep prevention". Respect this; use experiment-runner.cjs for `_resetToSha`.

---

## Standard Stack

### Core (no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js `child_process` `spawnSync` | Built-in (Node 20) | `_evalMetric` execution per candidate | Already used in experiment-runner.cjs |
| Node.js `fs` | Built-in | Read/write EXPERIMENT-BEST.json, results.jsonl | Standard throughout bin/ |
| `bin/lib/experiment.cjs` `_commit` | Internal | Commit each candidate to experiment branch | Existing commit primitive — reused without modification |
| `bin/lib/experiment.cjs` `_reset` | Internal | Fallback reset for all-CRASH iterations | Existing reset to HEAD~1 — unchanged |
| `bin/lib/experiment-runner.cjs` `_evalMetric` | Internal | Score each candidate | Existing eval contract — called N times per iteration |
| `bin/lib/experiment-runner.cjs` `_compareMetric` | Internal | Determine KEEP/DISCARD from best score | Existing comparison — called once per iteration (on best candidate) |
| `bin/lib/experiment-runner.cjs` `_writeJsonlRow` | Internal | Write per-iteration result with multi-candidate fields | Extended with 3 new fields; write function unchanged |
| `bin/lib/experiment-schema.cjs` `parseExperimentFile` | Internal | Parse `candidates` field from frontmatter | Extended with one new field parse |

### New in This Phase
| Script/File | Location | Purpose |
|-------------|----------|---------|
| `_resetToSha(cwd, slug, sha)` | `bin/lib/experiment-runner.cjs` | Reset branch to specific SHA (for selecting best candidate) |
| `multi-candidate.test.mjs` | `tests/phase-115/` | Nyquist coverage for MULTI-01 through MULTI-05 |

### Alternatives Considered and Rejected
| Instead of | Could Use | Why Rejected |
|------------|-----------|--------------|
| Sequential commit/reset | Parallel git worktrees | Requires new branch-per-candidate management; significant refactoring of init/promote/cleanup in experiment.cjs |
| Sequential commit/reset | Git stash | Stash entries are not addressable by SHA; lose the ability to return to a specific candidate state after pop |
| Orchestrator-level candidate loop | New runner agent variant | Runner agent would need to know about candidates and coordinate git state — breaks stateless runner contract and increases runner complexity |
| Default candidates=3 | Default candidates=1 | REQUIREMENTS.md MULTI-04 specifies default 3; pre-research says 1 is more conservative — requirements win |

**Installation:** No new packages required.

**Version verification:** N/A — all new logic is pure CJS using Node.js built-ins.

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
bin/lib/
└── experiment-runner.cjs     # Add _resetToSha() helper (line ~200 -> ~215)

bin/lib/
└── experiment-schema.cjs     # Add candidates field parse + 3 new JSONL_ROW_FIELDS

workflows/
└── optimize.md               # Step 7 extended with candidate loop

tests/phase-115/
└── multi-candidate.test.mjs  # Nyquist coverage for MULTI-01 through MULTI-05
```

### Pattern 1: Sequential Candidate Loop in optimize.md Step 7

**What:** Replace the single Task() dispatch with a loop of N dispatches. After all N candidates, select the best, reset to its SHA, and record the iteration result.

**When to use:** Every iteration when `candidateCount > 1`. When `candidateCount === 1`, the loop executes once and behavior is identical to Phase 103.

**Example (from `.planning/research/v0.14-MULTI-CANDIDATE.md` §3.2):**

```
// Orchestrator Step 7 pseudo-logic (workflow prose, not CJS)

candidateCount = parsedConfig.candidates || 3
iterationBaselineSha = $(git rev-parse HEAD)
candidateResults = []

FOR candidate_index = 1..candidateCount:
  IF candidate_index > 1:
    git reset --hard {iterationBaselineSha}    // reset to iteration start

  Task(
    prompt = "Run experiment iteration {currentIteration} for slug: {slug}
              Candidate {candidate_index} of {candidateCount}.
              Generate a DIFFERENT mutation than previous candidates."
    subagent_type = "{currentModel}"
  )

  Parse JSON result: { status, metric_value, description }

  IF status is 'KEEP' or 'DISCARD':
    candidateSha = $(git rev-parse HEAD)
    candidateResults.push({ index: candidate_index, status, metric_value, sha: candidateSha })
  ELSE (CRASH or BOUNDARY_VIOLATION):
    git reset --hard {iterationBaselineSha}
    candidateResults.push({ index: candidate_index, status: 'CRASH', metric_value: null, sha: null })

// Selection phase
surviving = candidateResults.filter(c => c.metric_value !== null)

IF surviving.length == 0:
  // All candidates crashed
  git reset --hard {iterationBaselineSha}
  iterationStatus = 'CRASH'
  bestMetricValue = null
ELSE:
  IF direction == 'max':
    best = surviving with highest metric_value
  ELSE:
    best = surviving with lowest metric_value

  git reset --hard {best.sha}    // use _resetToSha subcommand
  decision = _compareMetric(best.metric_value, bestMetric, direction)
  iterationStatus = decision    // 'KEEP' or 'DISCARD'
  IF decision == 'DISCARD':
    git reset --hard {iterationBaselineSha}
  bestMetricValue = best.metric_value

// Write JSONL row (same as current but with multi-candidate extension fields)
write-row with:
  candidates_evaluated = surviving.length + crashed.length
  candidates_scores = [score_1, score_2, score_3]  // null for crashed
  best_candidate_index = best.index - 1  // 0-indexed
```

### Pattern 2: _resetToSha Helper

**What:** New CJS function in experiment-runner.cjs that resets the branch to any SHA (not just HEAD~1). Guards: verify correct branch; verify SHA is reachable.

**When to use:** After candidate evaluation, to select the winner (or return to iteration baseline if all crashed / DISCARD decision).

**Example (from `.planning/research/v0.14-MULTI-CANDIDATE.md` §7.2):**

```javascript
// Source: v0.14-MULTI-CANDIDATE.md §7.2 (codebase-grounded recommendation)
function _resetToSha(cwd, slug, sha) {
  const branchResult = execGit(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branchResult.exitCode !== 0) return { reset: false, reason: 'git_error' };
  if (branchResult.stdout !== `experiment/${slug}`) return { reset: false, reason: 'wrong_branch' };

  const resetResult = execGit(cwd, ['reset', '--hard', sha]);
  if (resetResult.exitCode !== 0) return { reset: false, reason: 'reset_failed', detail: resetResult.stderr };
  return { reset: true };
}
```

### Pattern 3: JSONL Schema Extension

**What:** Three new fields appended to JSONL_ROW_FIELDS array (append-only, no reordering for backward compatibility).

**When to use:** Every iteration result row. When `candidates === 1`, these fields still appear with single-candidate values.

**Example:**

```javascript
// Source: v0.14-MULTI-CANDIDATE.md §7.3 + experiment-schema.cjs current state
const JSONL_ROW_FIELDS = Object.freeze([
  'id', 'iteration', 'ts', 'commit', 'metric_value',
  'metric_delta', 'status', 'description', 'tokens_used',
  'screenshot_hash', 'baseline_hash',  // Phase 114 (existing)
  'candidates_evaluated',              // Phase 115 (new): how many candidates scored
  'candidates_scores',                 // Phase 115 (new): array of all candidate scores
  'best_candidate_index',              // Phase 115 (new): 0-indexed winning candidate
]);
```

### Pattern 4: Candidate Diversity Instructions in Task() Prompt

**What:** Include candidate_index and a diversity instruction in each runner Task() prompt to prevent the LLM from generating identical mutations.

**When to use:** Every Task() dispatch in the candidate loop (candidate_index >= 2; candidate 1 is unrestricted).

```
// In the Task() prompt for candidate_index > 1:
"Candidate {candidate_index} of {candidateCount}. Generate a DIFFERENT mutation
than previous candidates in this iteration. Avoid repeating changes already
attempted in prior iterations (see last 3 results below)."
```

### Anti-Patterns to Avoid

- **Candidate loop in runner agent:** Runner stays stateless. It does not know about other candidates. All coordination is orchestrator-only.
- **Branch-per-candidate:** Creates branch proliferation and breaks the single `experiment/{slug}` state machine contract.
- **Incrementing consecutiveFailures when at least one candidate succeeds:** Circuit breakers apply per iteration. Partial batch success = iteration success for counter purposes.
- **Checking visual regression against each candidate screenshot:** Only check against the winning candidate (losers are never committed to the best-state chain).
- **Adding `candidates` to REQUIRED_FIELDS:** Makes all 18 existing templates fail validation. It must be optional with a default.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-candidate metric evaluation | Custom eval loop in new module | `_evalMetric` from experiment-runner.cjs (called N times) | Contract already handles timeout, exit codes, stdout parsing — reusing ensures all edge cases covered |
| Per-candidate git commit | Custom git operations | `_commit` from experiment.cjs | Existing safety guards, EXPERIMENT-BEST.json update, slug prefix enforcement |
| Branch reset to specific SHA | Custom `git reset` call inline in optimize.md | New `_resetToSha` in experiment-runner.cjs exposed as `experiment reset-to-sha --slug --sha` pde-tools subcommand | Allows testable unit test coverage and prevents inline git commands in workflow prose |
| Argmax/argmin over candidate scores | Custom selection logic | Inline JS in orchestrator prose (simple array reduce, 3 lines) | Too simple to warrant a library function; putting it in lib would be premature |
| JSONL array serialization | Custom serializer | `JSON.stringify` + existing `_writeJsonlRow` (handles any JSON value including arrays) | `_writeJsonlRow` already serializes each field via `JSON.stringify` |

**Key insight:** The multi-candidate extension is a pure orchestrator-level pattern. Every primitive already exists — the only new code is: (1) a `_resetToSha` helper so the orchestrator can address specific SHAs, and (2) three new JSONL fields. Everything else is loop logic in the workflow prose.

---

## Common Pitfalls

### Pitfall 1: Candidate Commits Left on Branch After DISCARD

**What goes wrong:** After running N candidates and deciding DISCARD (best candidate was worse than bestMetric), the branch is at the best candidate's SHA. If the orchestrator fails to call `_resetToSha(iterationBaselineSha)`, the next iteration mutates from the wrong baseline.

**Why it happens:** The selection logic has two reset paths: (1) reset to best candidate to then DISCARD back to baseline, or (2) keep at best candidate if KEEP. The DISCARD path requires an extra reset step that can be missed.

**How to avoid:** After `_compareMetric` returns DISCARD, immediately reset to iterationBaselineSha. Make the DISCARD reset explicit in the optimize.md prose: "if decision === DISCARD, reset to {iterationBaselineSha} and record status = DISCARD".

**Warning signs:** After a DISCARD iteration, `git log --oneline -3` shows a commit from that iteration on the branch.

### Pitfall 2: SHA Captured Before Commit (Race-Like Bug)

**What goes wrong:** Orchestrator captures `candidateSha = $(git rev-parse HEAD)` before the commit step, getting the previous HEAD SHA. The commit then advances HEAD, but the stored SHA points to the pre-commit state.

**Why it happens:** SHA must be captured AFTER commit. The sequence is: mutate → commit → capture SHA → eval.

**How to avoid:** In optimize.md prose, the SHA capture step must appear after the `experiment commit` subcommand call, not before.

**Warning signs:** `_resetToSha` succeeds but the state after reset does not contain the candidate's mutations.

### Pitfall 3: Default Candidates=3 Breaks Existing Template Time Budgets

**What goes wrong:** Existing experiment templates don't specify `candidates`. After Phase 115, they default to N=3, tripling their evaluation cost. A 60-minute experiment with 30s eval times now runs ~13 iterations instead of ~40.

**Why it happens:** REQUIREMENTS.md says default=3. Pre-existing templates were designed for default=1.

**How to avoid:** The plan should include an audit task: search all experiment templates for missing `candidates` field and either (a) add `candidates: 1` to opt into single-candidate mode, or (b) update `time_budget_minutes` to account for N=3. Templates already specifying `candidates: 1` are unaffected.

**Warning signs:** Experiments hit `time_budget` circuit breaker much earlier than expected.

### Pitfall 4: All-CRASH Iteration Not Resetting Branch

**What goes wrong:** All N candidates crash (verify command fails). The last candidate's crash-state may have modified tracked files. If the orchestrator doesn't reset to iterationBaselineSha, the next iteration starts from a corrupt state.

**Why it happens:** The CRASH path for individual candidates does reset (in the candidate loop). But the "all candidates crashed" path must also reset to iterationBaselineSha as a safety measure.

**How to avoid:** Add an explicit `git reset --hard {iterationBaselineSha}` in the "all crashed" branch of the selection phase, regardless of what happened in each candidate's CRASH handling.

**Warning signs:** `git status --porcelain` shows unexpected modified files before iteration N+1.

### Pitfall 5: experiment.cjs Line Ceiling Overflow

**What goes wrong:** Adding `_resetToSha` to experiment.cjs pushes it from 289 to ~304 lines, violating the "under 300 lines" ceiling documented in the module header.

**Why it happens:** experiment.cjs was already at 289 lines at Phase 100, and is documented as approaching scope creep.

**How to avoid:** Add `_resetToSha` to experiment-runner.cjs (currently 197 lines). It is semantically a runner concern (used during the iteration loop). Expose as `experiment reset-to-sha --slug S --sha SHA` in pde-tools.cjs routing.

**Warning signs:** experiment.cjs exceeds 300 lines in the final implementation.

### Pitfall 6: Circuit Breaker Counter Inflation

**What goes wrong:** `consecutiveFailures` increments when any candidate fails, not just when the entire iteration fails. With N=3, you'd hit `consecutive_failures` limit 3x faster.

**Why it happens:** Naive copy-paste of existing failure counter logic inside the candidate loop.

**How to avoid:** Circuit breaker counters update AFTER the selection phase, based on iteration outcome (KEEP/DISCARD/CRASH), not per-candidate outcome. A partial success (some candidates scored, best was DISCARD) increments `consecutiveFailures` once — same as a single-candidate DISCARD.

---

## Code Examples

### Adding candidates field to parseExperimentFile

```javascript
// Source: bin/lib/experiment-schema.cjs (current parseExperimentFile return block)
return {
  valid: true,
  metric: fm.metric,
  direction: fm.direction,
  verify: fm.verify,
  mutable_files: mutableFiles,
  immutable_files: immutableFiles,
  budget: {
    iterations: iterationBudget,
    minutes: timeBudgetMinutes,
  },
  slug: fm.slug || null,
  visual_regression: {
    enabled: fm.visual_regression_guard === 'true' || fm.visual_regression_guard === true,
    target: fm.visual_regression_target || null,
  },
  candidates: fm.candidates !== undefined ? parseInt(fm.candidates, 10) : 3,  // MULTI-04 default=3
};
```

### Extending JSONL_ROW_FIELDS

```javascript
// Source: bin/lib/experiment-schema.cjs (current JSONL_ROW_FIELDS + Phase 115 extension)
const JSONL_ROW_FIELDS = Object.freeze([
  'id',
  'iteration',
  'ts',
  'commit',
  'metric_value',
  'metric_delta',
  'status',
  'description',
  'tokens_used',
  'screenshot_hash',
  'baseline_hash',
  // Multi-candidate extensions (Phase 115)
  'candidates_evaluated',    // number: total candidates scored (including crashed)
  'candidates_scores',       // array|null: per-candidate metric values, null for crashed
  'best_candidate_index',    // number|null: 0-indexed winner position
]);
```

### New pde-tools subcommand routing for reset-to-sha

```javascript
// Source: bin/pde-tools.cjs experiment subcommand routing pattern (existing)
} else if (subcommand === 'reset-to-sha') {
  const experiment = require('./lib/experiment-runner.cjs');
  const shaIdx = args.indexOf('--sha');
  const targetSha = shaIdx !== -1 ? args[shaIdx + 1] : null;
  if (!targetSha) error('--sha SHA required');
  const result = experiment._resetToSha(cwd, slug, targetSha);
  output(result, raw);
}
```

### Nyquist test structure (following Phase 114 pattern)

```javascript
// Source: tests/phase-114/visual-regression.test.mjs — test file structure
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { parseExperimentFile, JSONL_ROW_FIELDS } = require('../../bin/lib/experiment-schema.cjs');
const { _resetToSha } = require('../../bin/lib/experiment-runner.cjs');

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

// MULTI-04: parseExperimentFile extracts candidates field
describe('MULTI-04: candidates field parsing', () => {
  it('defaults to 3 when candidates field absent', () => { ... });
  it('parses explicit candidates: 2 from frontmatter', () => { ... });
  it('parses candidates: 1 (single-candidate, backward compat)', () => { ... });
});

// MULTI-03: JSONL_ROW_FIELDS extension
describe('MULTI-03: JSONL schema multi-candidate fields', () => {
  it('JSONL_ROW_FIELDS includes candidates_evaluated', () => { ... });
  it('JSONL_ROW_FIELDS includes candidates_scores', () => { ... });
  it('JSONL_ROW_FIELDS includes best_candidate_index', () => { ... });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single candidate per iteration (1+1 ES) | N candidates per iteration (1+N ES) | Phase 115 | Explore more of search space per iteration; higher cost per iteration |
| Default candidates not configurable | `candidates: N` in experiment.md frontmatter, default 3 | Phase 115 | Allows per-experiment control of exploration breadth |
| JSONL row records single metric | JSONL row records array of all candidate scores | Phase 115 | Enables post-hoc analysis of candidate score distributions |
| `_reset()` only resets HEAD~1 | `_resetToSha()` resets to any SHA | Phase 115 | Required for candidate selection; also useful for manual recovery |

**Deprecated/outdated:**
- Hard-coded single-Task dispatch in optimize.md Step 7e: replaced by candidate loop. The old single dispatch is subsumed (candidateCount=1 reduces to the old behavior).

---

## Open Questions

1. **Should existing experiment templates have `candidates: 1` added?**
   - What we know: Default changes from implicit-1 to 3 after this phase. All 18 existing templates lack a `candidates` field. If left unchanged, they auto-upgrade to N=3.
   - What's unclear: Whether the team wants existing templates to keep single-candidate behavior or adopt N=3 exploration.
   - Recommendation: The plan should include an explicit audit task. Templates with expensive eval commands (responsive-metric, a11y-metric, visual pipeline) should get `candidates: 1` or `candidates: 2`. Text-only templates (nyquist-metric) could benefit from `candidates: 3` without significant cost.

2. **Should `_resetToSha` verify the SHA is an ancestor of the current HEAD?**
   - What we know: The current `_reset()` verifies commit prefix. `_resetToSha` would bypass this guard. Resetting to an arbitrary SHA is safe on the experiment branch but could corrupt state if the SHA is from a different branch.
   - What's unclear: Whether the wrong-branch guard (verified from `rev-parse --abbrev-ref HEAD`) is sufficient or whether an ancestry check is needed.
   - Recommendation: The wrong-branch guard is sufficient. The orchestrator controls both the SHA capture and the reset call — it will never pass a SHA from a different branch. The ancestry check adds latency (extra git invocation) for minimal safety gain.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely code and workflow changes. No external tools or services beyond Node.js are required.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | node:test (built-in, Node 20) |
| Config file | none — test files are directly invoked |
| Quick run command | `node --test tests/phase-115/` |
| Full suite command | `node --test tests/` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MULTI-01 | Multi-candidate mode generates N variants per iteration | unit (schema parse) | `node --test tests/phase-115/multi-candidate.test.mjs` | Wave 0 |
| MULTI-02 | Each candidate evaluated independently (existing `_evalMetric` reused, not modified) | unit (integration check — verify _evalMetric signature unchanged) | `node --test tests/phase-115/multi-candidate.test.mjs` | Wave 0 |
| MULTI-03 | Best candidate selected; JSONL extended with multi-candidate fields | unit (JSONL_ROW_FIELDS) | `node --test tests/phase-115/multi-candidate.test.mjs` | Wave 0 |
| MULTI-04 | `candidates` field configurable, default 3 | unit (parseExperimentFile) | `node --test tests/phase-115/multi-candidate.test.mjs` | Wave 0 |
| MULTI-05 | optimize.md contains candidate loop markers (structural test) | structural (file content) | `node --test tests/phase-115/multi-candidate.test.mjs` | Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/phase-115/`
- **Per wave merge:** `node --test tests/`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-115/multi-candidate.test.mjs` — covers MULTI-01 through MULTI-05

*(No framework gaps — existing node:test infrastructure covers all requirements)*

---

## Sources

### Primary (HIGH confidence)
- `bin/lib/experiment.cjs` (289 lines) — verified state machine for branch, commit, reset, promote
- `bin/lib/experiment-runner.cjs` (197 lines) — verified _evalMetric, _compareMetric, _writeJsonlRow
- `bin/lib/experiment-schema.cjs` (191 lines) — verified JSONL_ROW_FIELDS and parseExperimentFile
- `workflows/optimize.md` (Step 7 loop) — verified orchestrator pattern for Task() dispatch and circuit breakers
- `agents/pde-experiment-runner.md` — verified runner agent is stateless single-mutation contract
- `.planning/research/v0.14-MULTI-CANDIDATE.md` — project pre-research, grounded in codebase analysis

### Secondary (MEDIUM confidence)
- EA literature: (1+N) evolutionary strategy — best-of-N with deterministic selection is optimal for PDE's discrete search space (verified across multiple EA sources cited in v0.14-MULTI-CANDIDATE.md)
- Best-of-N sampling research (Coste et al. 2025, arXiv:2502.12668) — N=2-3 captures most benefit for expensive evaluation functions

### Tertiary (LOW confidence)
- None — all claims verified against live source code.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components verified from live source files
- Architecture: HIGH — sequential commit/reset strategy verified against experiment.cjs state machine; pre-research analysis is codebase-grounded
- Pitfalls: HIGH — Pitfalls 1/2/4/5/6 are directly derivable from live code inspection; Pitfall 3 is a logical consequence of the default change from pre-research recommendation to REQUIREMENTS.md mandate

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stable, no external dependencies)
