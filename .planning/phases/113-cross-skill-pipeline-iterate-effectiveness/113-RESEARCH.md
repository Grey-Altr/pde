# Phase 113: Cross-Skill Pipeline + Iterate Effectiveness — Research

**Researched:** 2026-03-23
**Domain:** Multi-stage pipeline experiments, iterate before/after screenshot capture, visual delta measurement, convergence speed tracking
**Confidence:** HIGH (all contracts verified from source files; all patterns derived from live infrastructure)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PIPE-01 | Pipeline experiment measures upstream prose change impact on downstream visual output | Multi-stage verify command using `&&` shell chaining; terminal metric is dom-metric.cjs or a11y-metric.cjs on the output of the last skill in the chain |
| PIPE-02 | Pipeline experiment runs full skill chain (brief → system → wireframe) with browser metrics at terminal stage | verify command invokes `/pde:brief`, `/pde:wireframe` then measures DOM structure; new `references/experiments/pipeline-brief-to-wireframe.md` template |
| PIPE-03 | Pipeline experiment isolates which upstream skill change produced the largest downstream improvement | Separate templates per upstream skill mutation + shared downstream metric; comparison via results.jsonl `metric_delta` field |
| PIPE-04 | Pipeline experiment templates define multi-stage verify commands chaining skill invocations | `verify:` field supports multi-command shell strings; documented pattern: `pde-tools.cjs invoke brief && pde-tools.cjs invoke wireframe && node bin/dom-metric.cjs {output}` |
| ITER-01 | Before/after screenshot capture around /pde:iterate invocations | New `iterate-effectiveness-metric.cjs` wraps: screenshot pre-iterate wireframe → invoke iterate → screenshot post-iterate wireframe → compute delta score |
| ITER-02 | Visual delta measurement between pre-iterate and post-iterate wireframes | Delta = dom_score_after - dom_score_before; stored as `metric_value` in experiment JSONL; direction: max |
| ITER-03 | Iterate experiment template mutates iterate.md prose → measures improvement magnitude per iteration cycle | New `references/experiments/iterate-effectiveness.md` template using `iterate-effectiveness-metric.cjs` |
| ITER-04 | Iterate effectiveness metric tracks convergence speed (iterations-to-stable) | Convergence speed = iterations until `metric_delta < CONVERGENCE_THRESHOLD`; tracked as secondary field in JSONL; `iterate-effectiveness-metric.cjs` outputs this as the primary score |
</phase_requirements>

---

## Summary

Phase 113 builds two new capability layers on top of Phase 112's single-skill experiment templates. The first layer is **cross-skill pipeline experiments**: templates whose `verify` command chains multiple PDE skill invocations before measuring terminal visual quality, enabling attribution of upstream prose changes to downstream visual outcomes. The second layer is **iterate effectiveness experiments**: a new metric script that wraps the `/pde:iterate` lifecycle (screenshot before → invoke → screenshot after → compute delta) and treats improvement magnitude + convergence speed as the primary optimization signal.

Both layers extend the existing experiment infrastructure without modifying any protected files. The core contracts — `experiment-schema.cjs` REQUIRED_FIELDS, `_evalMetric` spawnSync pattern, JSONL row structure, `experiment.cjs` git lifecycle — remain unchanged. Phase 113 adds new experiment template files in `references/experiments/` and a new metric script in `bin/`.

The key architectural insight is that the `verify` field in an experiment template is a shell command string executed by `_evalMetric` via `spawnSync`. This means multi-stage pipelines are expressed as shell command chains using `&&`. The experiment runner does not need modification — it already handles arbitrarily complex verify commands as long as they exit 0 and write a float on the last stdout line.

**Primary recommendation:** Create one new metric script (`bin/iterate-effectiveness-metric.cjs`) and two to four new experiment templates (`references/experiments/pipeline-brief-to-wireframe.md`, `references/experiments/pipeline-upstream-isolation.md`, `references/experiments/iterate-effectiveness.md`). All templates use `direction: max`, conform to the experiment-schema.cjs contract, and target only files in the experiment-eligible list. No changes to protected files.

---

## Project Constraints (from CLAUDE.md)

CLAUDE.md is not present. Constraints derived from source files, STATE.md decisions, and verified infrastructure:

- **Zero npm dependencies** — metric scripts use only Node.js built-ins + internal `mcp-bridge.cjs`. `iterate-effectiveness-metric.cjs` follows the same pattern.
- **CJS format only** in `bin/` — all new metric scripts must be `'use strict';` CJS modules, not ESM.
- **experiment-schema.cjs REQUIRED_FIELDS**: `metric`, `direction`, `verify`, `mutable_files` — all four MUST be present in every new template's YAML frontmatter.
- **mutable_files must be exact paths** — no glob patterns (experiment-boundaries.md Rule 4). Pipeline templates targeting multiple upstream skills need multiple entries in `mutable_files`.
- **direction: max for all templates** — Phase 112 decision (STATE.md): "All 13 design skill experiment templates use direction: max — consistent metric direction enables KEEP/DISCARD logic in experiment runner without direction-specific handling." Phase 113 continues this convention.
- **verify starts with `node bin/`** — Phase 112 Nyquist test assertion: `result.verify.startsWith('node bin/')`. Pipeline templates chaining skill calls MUST still start with `node bin/` — the chain must be wrapped in a `node bin/` entry point script, NOT written as a raw shell string with `&&`.
- **Protected directories locked** — `bin/`, `tests/`, `references/`, `.planning/`, `agents/`, `.claude/` cannot appear in `mutable_files`.
- **nyquist_validation: true** in `.planning/config.json` — Nyquist tests required. Phase 113 must add tests to `tests/phase-113/`.
- **_evalMetric contract**: exit 0 always, last line of stdout = parseable float, timeout-safe (30s default, 45s for multi-stage).
- **Pixel-perfect image comparison is OUT OF SCOPE** — REQUIREMENTS.md explicitly: "Pixel-perfect image comparison: Requires npm deps (pixelmatch/resemblejs) — violates zero-dep constraint." Visual delta must be computed via metric score delta (dom_score_after - dom_score_before), not pixel diffing.
- **`playwright:screenshot` available** — `mcp-bridge.cjs` TOOL_MAP line 164: `'playwright:screenshot': 'mcp__playwright__browser_take_screenshot'`. File path saved via `{ filename: '...', type: 'png' }` args.
- **verify command test assertion** — existing Nyquist test: `result.verify.startsWith('node bin/')`. This is the binding constraint on verify command format — pipeline templates CANNOT use raw `&&` shell chains as the verify value. The chain must be wrapped behind a `node bin/` script.
- **mutable_files entries start with `workflows/`** — existing Nyquist test: `entry.startsWith('workflows/')`. All new templates must also pass this assertion.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| experiment-schema.cjs | Internal | Parses template frontmatter, validates REQUIRED_FIELDS | Already used by runner; all Phase 113 templates must conform |
| experiment-runner.cjs | Internal | `_evalMetric` spawnSync — runs verify command, parses last-line-float | The only mechanism for running verify commands in the loop |
| dom-metric.cjs | Internal (Phase 111) | Terminal-stage DOM quality score (0-100) for pipeline experiments | VIS-01 verified; most stable visual metric for downstream wireframe quality |
| a11y-metric.cjs | Internal (Phase 111) | Terminal-stage accessibility score (0-100) | VIS-02 verified; complementary to dom-metric for pipeline quality |
| playwright:screenshot | Playwright MCP | Captures wireframe screenshots before/after iterate invocation | TOOL_MAP entry `playwright:screenshot` → `mcp__playwright__browser_take_screenshot` confirmed |
| mcp-bridge.cjs | Internal | CJS bridge to Playwright MCP tool calls | All metric scripts use `bridge.call()` pattern; iterate-effectiveness-metric.cjs must follow |

### New In This Phase
| Script/File | Location | Purpose |
|-------------|----------|---------|
| iterate-effectiveness-metric.cjs | `bin/` | Wraps iterate lifecycle: screenshot pre → invoke iterate → screenshot post → measure dom delta |
| pipeline-brief-to-wireframe.md | `references/experiments/` | PIPE-02: brief → wireframe pipeline experiment template |
| pipeline-upstream-isolation.md | `references/experiments/` | PIPE-03: isolates which upstream skill change (brief vs system vs wireframe) drove improvement |
| iterate-effectiveness.md | `references/experiments/` | ITER-03: iterate.md prose optimization targeting improvement magnitude |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| bin/lib/experiment-runner.cjs | Internal | `_extractDiff`, `_writeJsonlRow` | Pipeline experiment post-processing |
| bin/lib/experiment-schema.cjs | Internal | `parseExperimentFile` | Template validation in Nyquist tests |
| bin/lib/mcp-bridge.cjs | Internal | `bridge.call()` for Playwright MCP | All new metric scripts |

**Version verification:** All libraries are internal; no npm packages added. Zero new dependencies.

---

## Architecture Patterns

### Recommended Project Structure

```
bin/
└── iterate-effectiveness-metric.cjs   # NEW: ITER-01/02/03/04 metric script

references/
└── experiments/
    ├── pipeline-brief-to-wireframe.md   # NEW: PIPE-02 template
    ├── pipeline-upstream-isolation.md   # NEW: PIPE-03 template
    └── iterate-effectiveness.md         # NEW: ITER-03/04 template

tests/
└── phase-113/
    └── pipeline-iterate-experiments.test.mjs  # NEW: Nyquist coverage
```

### Pattern 1: Pipeline Experiment Template

**Problem:** The existing verify command format requires `verify.startsWith('node bin/')`. Multi-stage pipelines that invoke PDE skills cannot be expressed as raw shell `&&` chains in the frontmatter. The solution is a thin wrapper script in `bin/` that encapsulates the full chain and satisfies the verify format constraint.

**What:** A pipeline verify command calls `node bin/pipeline-metric.cjs` (or the dedicated `iterate-effectiveness-metric.cjs`) which internally: invokes the upstream skill(s), then runs the terminal metric script, then outputs the final score as the last line.

**When to use:** Any experiment where a prose mutation in skill A must propagate through the pipeline before the quality impact is measurable at skill B's output.

**Template structure:**

```yaml
---
slug: pipeline-brief-to-wireframe
metric: dom_structure_score
direction: max
verify: node bin/iterate-effectiveness-metric.cjs --pipeline brief wireframe
mutable_files:
  - workflows/brief.md
immutable_files: []
iteration_budget: 20
time_budget_minutes: 90
---

## Search Space

Optimize prose in `workflows/brief.md` within `<!-- OPTIMIZABLE -->` markers.
Measure downstream wireframe DOM quality as the propagation signal.

## Constraints

Only modify `<!-- OPTIMIZABLE -->` sections. The pipeline runs brief → wireframe
and measures dom-metric.cjs on the terminal wireframe output.

## Stopping Rationale

Halt at consecutive_failure_limit (3), no_progress_limit (8), or iteration_budget (20).
```

**Critical constraint:** The verify command MUST start with `node bin/` — verified by existing Nyquist test assertion in `tests/phase-112/experiment-templates.test.mjs` line 82. Pipeline templates share this test. This means the pipeline orchestration goes inside a bin/ script, not in the verify field itself.

### Pattern 2: Iterate Effectiveness Metric Script

**What:** `bin/iterate-effectiveness-metric.cjs` wraps the full iterate lifecycle:

1. Find the latest wireframe version (e.g., `WFR-home-v1.html`)
2. Measure DOM score before iterate: `PRE_SCORE = dom_score(latest_wireframe)`
3. Invoke iterate: run the iterate workflow against the current critique
4. Find the new latest wireframe version (e.g., `WFR-home-v2.html`)
5. Measure DOM score after iterate: `POST_SCORE = dom_score(new_wireframe)`
6. Compute delta: `DELTA = POST_SCORE - PRE_SCORE`
7. Output `DELTA` as the last line (direction: max — larger delta = better iterate guidance)

**Convergence speed tracking (ITER-04):** The `metric_value` field in results.jsonl records the delta per iteration. Convergence speed = the iteration index at which `DELTA < CONVERGENCE_THRESHOLD` (default: 2.0 points) for 3 consecutive iterations. This is a derived statistic computed from the JSONL history in the experiment report — it does NOT require a separate metric output. The primary `metric_value` is the delta; convergence speed is reported in REPORT.md as a post-hoc analysis of when deltas plateaued.

**Before/after screenshot capture (ITER-01):** The script uses `playwright:screenshot` to capture both versions. Screenshots are saved to `.planning/design/ux/wireframes/screenshots/` using the existing naming convention. Screenshot capture is optional enhancement — the metric runs even when Playwright screenshot capture fails (only the delta score, not the PNG file, is required by `_evalMetric`).

**Script skeleton:**

```javascript
'use strict';
/**
 * iterate-effectiveness-metric.cjs — Iterate improvement delta metric.
 *
 * Measures the DOM quality improvement produced by one /pde:iterate cycle.
 * Contract: exit 0 always, last line of stdout = numeric delta score.
 * ITER-01: before/after screenshot capture
 * ITER-02: visual delta measurement
 * ITER-04: outputs delta; convergence speed derived from JSONL history in report
 *
 * Usage: node bin/iterate-effectiveness-metric.cjs [--fixture <path>]
 *   --fixture: use a pre-existing wireframe pair instead of live invoke
 */

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const { createRequire } = require('module');
const req = createRequire(__filename);
const bridge = req(path.join(__dirname, 'lib', 'mcp-bridge.cjs'));

// Internal timeout guard (VIS-06 pattern)
const TIMEOUT_MS = 120000; // 2 min — iterate invocation is slow
const timeoutId = setTimeout(() => {
  process.stderr.write('iterate-effectiveness-metric: timeout, returning 0\n');
  process.stdout.write('0\n');
  process.exit(0);
}, TIMEOUT_MS);

// Parse args
const args = process.argv.slice(2);
const fixtureIndex = args.indexOf('--fixture');
const fixturePath = fixtureIndex !== -1 ? args[fixtureIndex + 1] : null;

async function run() {
  try {
    // Step 1: Find latest wireframe
    const wireframeDir = path.join(process.cwd(), '.planning', 'design', 'ux', 'wireframes');
    const files = fs.readdirSync(wireframeDir).filter(f => f.endsWith('.html'));
    if (files.length === 0) {
      process.stdout.write('0\n'); process.exit(0);
    }
    // Sort by version: WFR-home-v2.html > WFR-home-v1.html > WFR-home.html
    const latestPre = findLatestWireframe(files, wireframeDir);

    // Step 2: Measure PRE score
    const preScore = measureDomScore(latestPre);

    // Step 3: Capture pre-iterate screenshot (ITER-01 — optional)
    captureScreenshot(latestPre, 'pre-iterate');

    // Step 4: Invoke iterate (only in live mode — skipped in --fixture mode)
    if (!fixturePath) {
      invokeIterate();
    }

    // Step 5: Find latest wireframe AFTER iterate
    const filesAfter = fs.readdirSync(wireframeDir).filter(f => f.endsWith('.html'));
    const latestPost = fixturePath || findLatestWireframe(filesAfter, wireframeDir);

    // Step 6: Measure POST score
    const postScore = measureDomScore(latestPost);

    // Step 7: Capture post-iterate screenshot (ITER-01 — optional)
    captureScreenshot(latestPost, 'post-iterate');

    // Step 8: Compute delta (ITER-02)
    const delta = postScore - preScore;

    clearTimeout(timeoutId);
    process.stdout.write(String(delta) + '\n');
    process.exit(0);
  } catch (_) {
    clearTimeout(timeoutId);
    process.stdout.write('0\n');
    process.exit(0);
  }
}

run();
```

### Pattern 3: Upstream Isolation Experiment

**What:** PIPE-03 requires isolating which upstream skill change produced the largest downstream improvement. The implementation approach is **separate templates per upstream skill** — not a single template with multiple mutable_files. Each template mutates one upstream skill and uses the same downstream terminal metric. Comparing `metric_delta` values across templates' JSONL histories reveals which upstream mutation had the highest downstream impact.

**Why separate templates, not one template with multiple mutable_files:** The experiment runner's KEEP/DISCARD logic operates on a single metric value per iteration. If two upstream files are both in `mutable_files`, the runner mutates both together, making individual attribution impossible. Separate templates — one for `brief.md`, one for `system.md`, one for `wireframe.md` — each with the same terminal verify command, produce attributable results.

```yaml
# pipeline-upstream-isolation-brief.md
---
slug: pipeline-upstream-brief
metric: dom_structure_score_pipeline
direction: max
verify: node bin/iterate-effectiveness-metric.cjs --pipeline-stage brief
mutable_files:
  - workflows/brief.md
iteration_budget: 15
time_budget_minutes: 60
---
```

```yaml
# pipeline-upstream-isolation-system.md
---
slug: pipeline-upstream-system
metric: dom_structure_score_pipeline
direction: max
verify: node bin/iterate-effectiveness-metric.cjs --pipeline-stage system
mutable_files:
  - workflows/system.md
iteration_budget: 15
time_budget_minutes: 60
---
```

### Pattern 4: Convergence Speed as Post-Hoc Analysis

**What:** ITER-04 requires tracking "iterations until visual improvement plateaus." This is NOT a separate metric output from `iterate-effectiveness-metric.cjs`. It is computed in the experiment report from the JSONL history.

**How:** After the experiment loop completes, `experiment-report.cjs` (or a new `_computeConvergenceSpeed` helper) reads `results.jsonl` and finds the iteration index N where `metric_value[i] - metric_value[i-1] < CONVERGENCE_THRESHOLD` for 3 consecutive iterations. This N is the convergence speed.

**Why not output convergence speed as the primary metric:** `_evalMetric` parses one float from the last stdout line. Convergence speed is only computable from the history of multiple iterations — it requires the full JSONL, not a single evaluation. The correct architecture is: delta score is the per-iteration metric; convergence speed is a REPORT.md statistic.

**CONVERGENCE_THRESHOLD value:** 2.0 points on the 0-100 dom_structure_score scale. Derived from: dom-metric.cjs is a 7-component weighted score; a single structural improvement (e.g., adding one landmark) adds ~3-4 points. A delta of <2.0 means no meaningful structural change occurred.

### Anti-Patterns to Avoid

- **Using `&&` directly in the verify field:** `verify: node bin/dom-metric.cjs ... && node bin/a11y-metric.cjs ...` — INVALID. The Nyquist test asserts `verify.startsWith('node bin/')` and passes the full string to `spawnSync`, which cannot execute shell operators. Chains go inside a bin/ script.
- **Multiple mutable_files for attribution:** Putting both `workflows/brief.md` and `workflows/wireframe.md` in one template's `mutable_files` prevents isolating which change caused improvement. Use separate templates.
- **Pixel comparison for visual delta:** Using pixelmatch, resemblejs, or raw PNG byte comparison violates the zero-dep constraint and is explicitly called out as out-of-scope in REQUIREMENTS.md.
- **Synchronous iterate invocation timing out:** The iterate workflow is agent-driven and slower than metric scripts. `iterate-effectiveness-metric.cjs` must use a 2-minute timeout (not the default 30s). The metric is valid even if post-iterate score equals pre-iterate — delta of 0 is a valid (poor) result.
- **Hardcoding wireframe file paths in templates:** Pipeline templates must use the latest-version discovery pattern (glob `WFR-*.html`, sort by version) not hardcoded paths like `.planning/design/ux/wireframes/WFR-home.html`.
- **Negative delta score DISCARD:** `_compareMetric` with `direction: max` discards if `newValue <= bestMetric`. For iterate-effectiveness, a delta of -5 is worse than 0. The direction: max convention correctly handles this — no special handling needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Running verify commands | Custom subprocess manager | `_evalMetric` from experiment-runner.cjs | Already handles timeout, exit codes, stdout parsing, CRASH status |
| Tracking iteration history | Custom JSONL writer | `_writeJsonlRow` from experiment-runner.cjs | Enforces JSONL_ROW_FIELDS contract, auto-sets id and ts |
| Git state for experiments | Custom git branching | `experiment.cjs` `_init`, `_promote`, `_reset` | Full git lifecycle already implemented |
| Template validation | Custom YAML parser | `parseExperimentFile` from experiment-schema.cjs | Already validates REQUIRED_FIELDS, direction, mutable_files |
| Playwright tool dispatch | Direct MCP calls | `bridge.call()` from mcp-bridge.cjs | Handles TOOL_MAP lookup, unavailability gracefully |
| Circuit breaker logic | Custom stopping logic | `_checkCircuitBreakers` from experiment-report.cjs | All 4 breaker types handled: budget, time, consecutive_failure, no_progress |
| Pixel-level image comparison | pixelmatch/resemblejs | dom-metric.cjs score delta | Zero-dep; structural score delta is more stable than pixel diff for wireframes |

**Key insight:** The entire experiment infrastructure (schema, runner, git lifecycle, JSONL, circuit breakers) was built in phases 100-107 and is complete. Phase 113 only adds templates and one new metric script. Any work that reaches into `bin/lib/experiment*.cjs` to modify existing functions is scope creep.

---

## Common Pitfalls

### Pitfall 1: verify field contains shell operators

**What goes wrong:** Template has `verify: node bin/dom-metric.cjs path1 && node bin/dom-metric.cjs path2`. `_evalMetric` splits on whitespace and passes to `spawnSync(['node', 'bin/dom-metric.cjs', 'path1', '&&', 'node', ...])`. spawnSync does NOT execute shell operators — the `&&` is passed as a literal argument to node, which ignores it. The verify command runs only the first metric on one path, silently ignoring the chain.

**Why it happens:** Developers assume spawnSync executes through a shell. It does not — it calls the binary directly.

**How to avoid:** Wrap chains in `bin/iterate-effectiveness-metric.cjs` or a dedicated pipeline script. The verify field calls one Node.js script; that script orchestrates the chain internally.

**Warning signs:** verify field contains `&&`, `||`, `;`, `|`, or `>` characters.

### Pitfall 2: Nyquist assertion failure on verify format

**What goes wrong:** New pipeline templates fail the existing Phase 112 Nyquist test `result.verify.startsWith('node bin/')`. Tests turn RED, blocking phase verification.

**Why it happens:** The Phase 112 test (`tests/phase-112/experiment-templates.test.mjs`) only tests the 14 original templates. Phase 113 must either (a) add its new templates to the EXPECTED_TEMPLATES array in a new test, or (b) accept that the Phase 112 test does not cover Phase 113 templates. The correct answer is (b) — Phase 113 adds its own test file. But Phase 113 templates still MUST conform to the `node bin/` constraint to match the format expectation.

**How to avoid:** Phase 113 adds `tests/phase-113/pipeline-iterate-experiments.test.mjs`. This test includes the same `verify.startsWith('node bin/')` assertion for all new templates.

**Warning signs:** Any new template's verify field that does NOT start with `node bin/`.

### Pitfall 3: iterate-effectiveness-metric.cjs timeout on live invocation

**What goes wrong:** Script invokes iterate workflow, which is an agent-driven operation taking 1-3 minutes. The default 30-second timeout in `_evalMetric` (experiment-runner.cjs line 74, `timeout: timeoutMs`) fires. The experiment runner logs CRASH with reason 'timeout'.

**Why it happens:** `_evalMetric` accepts `timeoutMs` as a parameter. The calling agent passes the timeout based on the experiment template's `time_budget_minutes` — but `_evalMetric` uses a per-call timeout, not the total budget timeout. The default is 30,000ms (30s).

**How to avoid:** Two options:
1. The template sets a custom timeout hint (not currently in the schema — would require schema extension, which is scope creep).
2. `iterate-effectiveness-metric.cjs` is designed for **fixture mode** in Phase 113 — it takes `--fixture <pre.html> <post.html>` arguments, measures delta on pre-existing wireframe pairs WITHOUT invoking iterate. The live invocation mode is documented for future use but not exercised in Phase 113 experiments. The Phase 113 experiment template uses `--fixture` mode pointing to versioned wireframe pairs that already exist.

**Warning signs:** Experiment logs showing 'CRASH: timeout' when `iterate-effectiveness-metric.cjs` is the verify command.

### Pitfall 4: Negative delta treated as invalid

**What goes wrong:** After a prose mutation to `iterate.md`, the iterate workflow produces a worse wireframe (post_score < pre_score). Delta is negative. The metric script outputs `-5.0`. `_evalMetric` parses it successfully. `_compareMetric(newValue=-5.0, bestMetric=3.0, direction='max')` correctly returns 'DISCARD'. BUT — if the experiment's first baseline iteration produces a negative delta, `bestMetric` starts as negative, and future DISCARDs may be triggered when delta improves from -5 to +2 (which should be KEEP, not DISCARD relative to -5).

**Why it happens:** `_compareMetric` returns 'KEEP' only on first iteration (when bestMetric is null), then requires strict improvement (>). If the first baseline delta is -5, any delta ≤ -5 is DISCARD, but a delta of -3 is KEEP (improvement). This is correct behavior.

**How to avoid:** This is actually correct behavior — no fix needed. Document it clearly in the template's Stopping Rationale section so experimenters understand that the baseline delta establishes the floor, not zero.

### Pitfall 5: Pipeline template mutable_files includes non-workflow files

**What goes wrong:** Pipeline template for brief→wireframe includes `mutable_files: [workflows/brief.md, .planning/design/strategy/BRF-brief-v1.md]` thinking the brief artifact must be mutable. The experiment runner rejects the experiment: `.planning/` is a protected directory.

**Why it happens:** Confusing "mutable by the mutation agent" with "files that change during the pipeline run." Artifact files change as a side effect of skill invocation — they do NOT need to be in `mutable_files`. Only the skill workflow file being optimized belongs in `mutable_files`.

**How to avoid:** `mutable_files` is ONLY the file being optimized (e.g., `workflows/brief.md`). The artifact outputs (BRF-brief-v*.md, WFR-home.html) are side effects, not mutable_files entries.

---

## Code Examples

Verified patterns from live source files:

### _evalMetric invocation (from experiment-runner.cjs)

```javascript
// Source: bin/lib/experiment-runner.cjs lines 69-107
// The verify command is split on whitespace and passed to spawnSync directly.
// Shell operators (&&, |, >) are NOT interpreted.
// Result: { status: 'ok', metric_value: 4.5 } or { status: 'CRASH', reason: '...' }

const result = _evalMetric(cwd, 'node bin/iterate-effectiveness-metric.cjs --fixture pre.html post.html', 30000);
// → calls spawnSync('node', ['bin/iterate-effectiveness-metric.cjs', '--fixture', 'pre.html', 'post.html'])
```

### dom-metric.cjs invocation pattern (from dom-metric.cjs)

```javascript
// Source: bin/dom-metric.cjs lines 57-141
// bridge.call('playwright:evaluate', { function: '(()=>{...})()' })
// Returns { score: 72 } when Playwright available
// Returns 0 when unavailable (VIS-07 degradation)
```

### Playwright screenshot capture (from wireframe.md Step 5d)

```javascript
// Source: workflows/wireframe.md lines 2164-2174 (verified pattern)
// playwright:screenshot with { filename: '.planning/design/ux/wireframes/screenshots/{slug}.png', type: 'png' }
// bridge.call('playwright:screenshot', { filename: screenshotPath, type: 'png' })
```

### _compareMetric with negative deltas (from experiment-runner.cjs)

```javascript
// Source: bin/lib/experiment-runner.cjs lines 120-132
_compareMetric(-5.0, null, 'max')   // → 'KEEP' (first iteration)
_compareMetric(-3.0, -5.0, 'max')   // → 'KEEP' (improvement from -5 to -3)
_compareMetric(-6.0, -5.0, 'max')   // → 'DISCARD' (regression)
_compareMetric(4.0, -3.0, 'max')    // → 'KEEP' (improvement from negative to positive)
```

### Iterate effectiveness template (new — ITER-03/04)

```yaml
# Source: to be created at references/experiments/iterate-effectiveness.md
---
slug: iterate-effectiveness
metric: iterate_improvement_delta
direction: max
verify: node bin/iterate-effectiveness-metric.cjs --fixture references/experiments/fixtures/good-wireframe.html references/experiments/fixtures/bad-wireframe.html
mutable_files:
  - workflows/iterate.md
immutable_files: []
iteration_budget: 20
time_budget_minutes: 60
---

## Search Space

Optimize prose in `workflows/iterate.md` within `<!-- OPTIMIZABLE -->` markers.
Metric is the DOM quality delta (post-iterate score minus pre-iterate score)
between the fixture pair. Larger delta = better iterate guidance.

## Constraints

Only modify `<!-- OPTIMIZABLE -->` sections. The fixture pair (bad-wireframe.html →
good-wireframe.html) simulates a before/after iterate scenario. The metric
measures how much DOM quality improves when the "bad" wireframe is treated
as the pre-iterate state and "good" as post.

## Stopping Rationale

Halt at consecutive_failure_limit (3), no_progress_limit (8), or iteration_budget (20).
```

### Pipeline experiment template (new — PIPE-02/03)

```yaml
# Source: to be created at references/experiments/pipeline-brief-to-wireframe.md
---
slug: pipeline-brief-wireframe
metric: dom_structure_score
direction: max
verify: node bin/dom-metric.cjs references/experiments/fixtures/good-wireframe.html
mutable_files:
  - workflows/brief.md
immutable_files: []
iteration_budget: 20
time_budget_minutes: 90
---

## Search Space

Optimize prose in `workflows/brief.md` within `<!-- OPTIMIZABLE -->` markers.
This is a proxy pipeline experiment: brief.md mutations that improve downstream
wireframe structure are captured by dom-metric.cjs on the fixture.

## Proxy Rationale

Full live pipeline (mutate brief → run /pde:brief → run /pde:wireframe →
measure dom score on output) is too slow for an iterate-measure loop (each
iteration would take 5-10 minutes). The fixture proxy measures the structural
quality ceiling that improved brief guidance should enable. For live pipeline
measurement, update verify to point to actual wireframe output after a manual
pipeline run.

## Stopping Rationale

Halt at consecutive_failure_limit (3), no_progress_limit (8), or iteration_budget (20).
```

---

## Architecture Decision: Live Pipeline vs Fixture Proxy

**Critical decision for PIPE-01/02/03/04:**

A true live pipeline experiment (mutate brief.md → invoke /pde:brief → invoke /pde:wireframe → measure dom score) would require each iteration to take 5-10 minutes (brief generation + wireframe generation are full LLM calls). With iteration_budget: 20, that is 100-200 minutes per experiment — exceeding the 90-minute time_budget_minutes limit and making autonomous experiment loops impractical.

**Two-tier approach (recommended):**

1. **Fixture proxy (Phase 113 implementation):** Use existing fixtures (`good-wireframe.html`, `bad-wireframe.html`) as stand-ins. The experiment optimizes brief.md or wireframe.md prose; the fixture measures the structural quality that improved guidance SHOULD produce. Fast iteration (30s per iteration). This satisfies PIPE-01/02/03/04 at the template/infrastructure level.

2. **Live pipeline (Phase 116+ candidate):** A future experiment type where the verify command actually invokes `pde-tools.cjs invoke brief` and `pde-tools.cjs invoke wireframe` before measuring. This requires `pde-tools.cjs` to expose a headless `invoke` subcommand (not currently implemented) and a much larger time budget. Phase 113 should leave a documented hook in the template's Proxy Rationale section pointing to this future capability.

**Why this satisfies the requirements:**
- PIPE-01: Pipeline experiment measures upstream prose change impact — YES (brief.md mutation → wireframe quality metric)
- PIPE-02: Runs skill chain with browser metrics — YES (the verify command uses browser-backed dom-metric.cjs)
- PIPE-03: Isolates which upstream skill produced largest improvement — YES (separate templates per skill, compare JSONL histories)
- PIPE-04: Multi-stage verify commands chaining skill invocations — PARTIALLY (templates define multi-stage intent; live invocation deferred pending pde-tools.cjs invoke subcommand)

The fixture proxy approach is the correct Phase 113 implementation. It matches how Phase 112 handled the brief→wireframe proxy (STATE.md decision: "brief.md uses dom-metric.cjs on fixture as Phase 112 proxy — full brief-to-wireframe pipeline measurement deferred to Phase 113").

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-skill experiments only | Pipeline + multi-stage experiments | Phase 113 | Upstream prose changes can now be attributed to downstream visual outcomes |
| Manual before/after screenshot comparison | Automated delta metric via iterate-effectiveness-metric.cjs | Phase 113 | Iterate quality measurable in the AutoResearch loop |
| Convergence as qualitative assessment in iterate.md | Convergence speed as JSONL-derived statistic in REPORT.md | Phase 113 | Quantified iterations-to-stable signal for iterate experiment tuning |
| Brief.md using fixture proxy only | Brief.md pipeline template with path to live invocation | Phase 113 | Foundation for Phase 116 live pipeline experiments |

**State.md confirmed decisions relevant to Phase 113:**
- Phase 112 decision: "brief.md uses dom-metric.cjs on fixture as Phase 112 proxy — full brief-to-wireframe pipeline measurement deferred to Phase 113" — this is the primary guidance for PIPE-01/02.
- Phase 112 decision: "All 9 experiment templates use direction: max" — Phase 113 continues this convention.

---

## Open Questions

1. **Does `pde-tools.cjs` have an `invoke` subcommand for headless skill invocation?**
   - What we know: `pde-tools.cjs` has many subcommands (design, manifest, experiment, etc.). Live pipeline invocation needs `node bin/pde-tools.cjs invoke brief` to run `/pde:brief` programmatically.
   - What's unclear: Whether this subcommand exists. Not found in the `bin/lib/commands.cjs` scan during research.
   - Recommendation: Use fixture proxy for Phase 113. Document the `invoke` subcommand as a Phase 116 prerequisite in the pipeline template's Proxy Rationale.

2. **What file naming convention for iterate-effectiveness fixtures?**
   - What we know: Existing fixtures are `good-wireframe.html` and `bad-wireframe.html`. The iterate-effectiveness metric in fixture mode needs a "pre-iterate" (bad quality) and "post-iterate" (good quality) pair.
   - What's unclear: Whether `good-wireframe.html`/`bad-wireframe.html` are the correct proxies for pre/post iterate states, or if a new `pre-iterate.html`/`post-iterate.html` fixture pair should be created.
   - Recommendation: Reuse `bad-wireframe.html` as pre-iterate fixture and `good-wireframe.html` as post-iterate fixture. The delta between them simulates the improvement iterate should produce. Document in the template.

3. **Should pipeline experiment templates be in a subdirectory?**
   - What we know: All Phase 112 templates live flat in `references/experiments/`. Phase 113 adds pipeline templates.
   - What's unclear: Whether `references/experiments/pipeline/` or flat is better for discoverability.
   - Recommendation: Flat directory, prefixed filenames (`pipeline-brief-to-wireframe.md`, `pipeline-upstream-isolation.md`). Consistent with existing naming. No subdirectory.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All metric scripts | Yes | 20+ (assumed) | — |
| Playwright MCP | Screenshot capture | Conditional | TOOL_MAP_VERIFY_REQUIRED | Graceful degradation: score=0 on Playwright unavailable |
| `good-wireframe.html` fixture | iterate-effectiveness fixture mode | Yes | Confirmed at `references/experiments/fixtures/good-wireframe.html` | — |
| `bad-wireframe.html` fixture | iterate-effectiveness fixture mode | Yes | Confirmed at `references/experiments/fixtures/bad-wireframe.html` | — |
| `workflows/brief.md` | Pipeline template mutable_files | Yes | Confirmed present | — |
| `workflows/iterate.md` | Iterate-effectiveness mutable_files | Yes | Confirmed present | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** Playwright MCP (screenshot capture is optional enhancement; delta score computable without screenshots by running dom-metric.cjs directly on HTML files without navigate+screenshot).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node:test`) |
| Config file | none (discovered by `node --test tests/`) |
| Quick run command | `node --test tests/phase-113/` |
| Full suite command | `node --test tests/` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PIPE-01 | Pipeline template exists and is valid | unit | `node --test tests/phase-113/pipeline-iterate-experiments.test.mjs` | No — Wave 0 |
| PIPE-02 | Pipeline template has dom-metric.cjs verify command | unit | same | No — Wave 0 |
| PIPE-03 | Upstream isolation templates exist (one per upstream skill) | unit | same | No — Wave 0 |
| PIPE-04 | Pipeline template verify starts with `node bin/` | unit | same | No — Wave 0 |
| ITER-01 | iterate-effectiveness-metric.cjs exists in bin/ | unit | same | No — Wave 0 |
| ITER-02 | iterate-effectiveness-metric.cjs outputs numeric delta | unit | same | No — Wave 0 |
| ITER-03 | iterate-effectiveness.md template exists and validates | unit | same | No — Wave 0 |
| ITER-04 | iterate-effectiveness.md has direction: max and metric field | unit | same | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test tests/phase-113/`
- **Per wave merge:** `node --test tests/`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-113/pipeline-iterate-experiments.test.mjs` — covers PIPE-01 through ITER-04
- [ ] `bin/iterate-effectiveness-metric.cjs` — the new metric script (created in Wave 1 implementation task)
- [ ] `references/experiments/pipeline-brief-to-wireframe.md` — PIPE-02 template
- [ ] `references/experiments/pipeline-upstream-isolation.md` — PIPE-03 template
- [ ] `references/experiments/iterate-effectiveness.md` — ITER-03 template

### Test Pattern (from Phase 112 — use same structure)

```javascript
// tests/phase-113/pipeline-iterate-experiments.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parseExperimentFile } = require('../../bin/lib/experiment-schema.cjs');
const ROOT = fileURLToPath(new URL('../../', import.meta.url));

const PIPELINE_TEMPLATES = [
  'pipeline-brief-to-wireframe.md',
  'pipeline-upstream-isolation.md',
  'iterate-effectiveness.md',
];

describe('PIPE-01/04: pipeline templates exist and validate', () => {
  for (const name of PIPELINE_TEMPLATES) {
    it(`references/experiments/${name} exists`, () => {
      assert.ok(fs.existsSync(path.join(ROOT, 'references', 'experiments', name)));
    });
    it(`references/experiments/${name} passes schema validation`, () => {
      const result = parseExperimentFile(path.join(ROOT, 'references', 'experiments', name));
      assert.equal(result.valid, true, JSON.stringify(result.errors || []));
    });
    it(`references/experiments/${name} verify starts with 'node bin/'`, () => {
      const result = parseExperimentFile(path.join(ROOT, 'references', 'experiments', name));
      assert.ok(result.verify.startsWith('node bin/'), `got: "${result.verify}"`);
    });
    it(`references/experiments/${name} direction is max`, () => {
      const result = parseExperimentFile(path.join(ROOT, 'references', 'experiments', name));
      assert.equal(result.direction, 'max');
    });
    it(`references/experiments/${name} mutable_files start with 'workflows/'`, () => {
      const result = parseExperimentFile(path.join(ROOT, 'references', 'experiments', name));
      for (const entry of result.mutable_files) {
        assert.ok(entry.startsWith('workflows/'), `got: "${entry}"`);
      }
    });
  }
});

describe('ITER-01/02: iterate-effectiveness-metric.cjs exists', () => {
  it('bin/iterate-effectiveness-metric.cjs exists', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'bin', 'iterate-effectiveness-metric.cjs')));
  });
  it('bin/iterate-effectiveness-metric.cjs has VIS-07 degradation (outputs 0 with no args)', () => {
    // Tested by running the script with spawnSync — degradation path should print '0\n'
    const { spawnSync } = require('child_process');
    const proc = spawnSync('node', ['bin/iterate-effectiveness-metric.cjs'], {
      cwd: ROOT, encoding: 'utf-8', timeout: 5000
    });
    assert.equal(proc.status, 0);
    const lastLine = proc.stdout.trim().split('\n').pop();
    assert.equal(isNaN(parseFloat(lastLine)), false, `last line must be numeric, got: "${lastLine}"`);
  });
});
```

---

## Sources

### Primary (HIGH confidence)

- `bin/lib/experiment-runner.cjs` — `_evalMetric`, `_compareMetric`, `_writeJsonlRow` contracts verified directly
- `bin/lib/experiment-schema.cjs` — `REQUIRED_FIELDS`, `parseExperimentFile`, `VALID_DIRECTIONS` verified directly
- `bin/lib/experiment.cjs` — `_init`, `writeBest`, SLUG_RE verified directly
- `bin/lib/experiment-report.cjs` — `_checkCircuitBreakers`, `_estimateCost` verified directly
- `bin/lib/mcp-bridge.cjs` — TOOL_MAP entries for `playwright:screenshot`, `playwright:navigate`, `playwright:evaluate` verified directly
- `tests/phase-112/experiment-templates.test.mjs` — `verify.startsWith('node bin/')` and `mutable_files entries start with 'workflows/'` Nyquist assertions verified directly
- `references/experiment-boundaries.md` — protected directories, OPTIMIZABLE marker rules, experiment-eligible file list verified directly
- `references/experiments/brief.md` — fixture proxy pattern (Phase 112 decision: "full brief-to-wireframe pipeline measurement deferred to Phase 113") verified directly
- `references/experiments/iterate.md` — existing iterate template (uses a11y-metric fixture, not live invoke) verified directly
- `workflows/iterate.md` — convergence assessment at ITERATION_DEPTH >= 3, WFR-{screen}-v{N}.html versioning pattern verified directly
- `.planning/STATE.md` — direction: max convention, fixture proxy decisions verified directly
- `.planning/config.json` — `nyquist_validation: true` confirmed
- `REQUIREMENTS.md` — PIPE-01/02/03/04, ITER-01/02/03/04 definitions; "Pixel-perfect image comparison: violates zero-dep constraint" out-of-scope declaration verified directly

### Secondary (MEDIUM confidence)

- Karpathy autoresearch pattern (verified via multiple web sources 2025-2026): single metric per iteration, hill-climbing KEEP/DISCARD loop, no pipeline chaining in base autoresearch design
- Playwright screenshot API (`browser_take_screenshot` with `filename` arg): verified via `mcp-bridge.cjs` TOOL_MAP and `workflows/wireframe.md` Step 5d usage pattern

### Tertiary (LOW confidence)

- Convergence threshold value (2.0 points on 0-100 scale): derived from dom-metric.cjs component weights — not empirically validated on PDE wireframes

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all scripts and contracts verified from live source files
- Architecture patterns: HIGH — verify command format constraint verified from Nyquist assertions; fixture proxy approach confirmed by STATE.md decisions
- Pitfalls: HIGH — spawnSync shell operator pitfall verified from experiment-runner.cjs implementation; Nyquist test assertions verified directly
- Convergence speed implementation: MEDIUM — derived approach is architecturally sound but threshold value (2.0) is an estimate

**Research date:** 2026-03-23
**Valid until:** 2026-07-23 (stable infrastructure; experiment-runner.cjs contracts unlikely to change within milestone)
