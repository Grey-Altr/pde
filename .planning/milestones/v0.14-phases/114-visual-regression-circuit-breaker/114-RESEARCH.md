# Phase 114: Visual Regression Circuit Breaker — Research

**Researched:** 2026-03-23
**Domain:** Visual regression detection integrated into the AutoResearch experiment loop — zero-dependency circuit breaker using SHA-256 screenshot hashing + metric score delta
**Confidence:** HIGH (all patterns verified from live project source files; prior research document v0.14-VISUAL-REGRESSION.md covers this domain exhaustively)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VRCB-01 | Visual regression circuit breaker prevents cosmetic regressions during optimization | `detectVisualRegression()` pattern documented in v0.14-VISUAL-REGRESSION.md; integrates with optimize.md BREAK-05 as new circuit breaker |
| VRCB-02 | Before each experiment iteration, baseline screenshots captured | `playwright:screenshot` TOOL_MAP entry confirmed in mcp-bridge.cjs line 164; baseline saved to `/tmp/pde-experiment-{slug}/baseline-screenshot.png` |
| VRCB-03 | After mutation, screenshots compared — if visual regression detected, mutation is rejected (git reset) | `_reset()` in experiment.cjs uses `git reset --hard HEAD~1`; DISCARD path already calls reset; visual regression reuses DISCARD status with `"VISUAL REGRESSION: ..."` description prefix |
| VRCB-04 | Regression threshold configurable in experiment.md (default: any new a11y violation = regression) | New `visual_regression_guard` frontmatter field (boolean, default false); threshold expressed as metric score drop from baseline |
| VRCB-05 | Integrates with existing circuit breaker infrastructure (consecutive_failure_limit, no_progress_limit) | optimize.md step 7k already has BREAK-01..04; VRCB adds BREAK-05 (visual_regression) as a new halt reason checked in the same step |
</phase_requirements>

---

## Summary

Phase 114 adds a visual regression safety net to the AutoResearch experiment loop. The core mechanism is simple and zero-dependency: before each iteration, capture a baseline screenshot of the target HTML artifact (stored in `/tmp/pde-experiment-{slug}/`). After mutation and metric evaluation, capture a post-mutation screenshot and compare SHA-256 hashes. If the hash changed AND the primary metric score decreased from baseline, fire a regression circuit breaker that triggers `git reset --hard HEAD~1` and records `status: "DISCARD"` with description prefixed `"VISUAL REGRESSION: ..."` in the JSONL row.

The entire feature is opt-in via two new fields in experiment.md frontmatter: `visual_regression_guard: true` and `visual_regression_target: path/to/artifact.html`. When absent or false, zero overhead — no screenshots are captured, no comparison occurs. This preserves backward compatibility with all 18 existing experiment templates.

The implementation touches four files: (1) a new `bin/lib/visual-regression.cjs` module (~80 lines), (2) `bin/lib/experiment-schema.cjs` to recognize the new frontmatter fields and add optional JSONL fields (`screenshot_hash`, `baseline_hash`), (3) `workflows/optimize.md` to add BREAK-05 and baseline screenshot capture steps, and (4) new Nyquist tests in `tests/phase-114/`.

**Primary recommendation:** Build `visual-regression.cjs` as a pure library module exporting `hashScreenshot()`, `checkVisualRegression()`, and `captureAndStoreBaseline()`. The optimize.md orchestrator calls it directly — no new bin/ script, no new subcommand. The module is under 100 lines and uses only `crypto` and `fs` built-ins.

---

## Project Constraints (from CLAUDE.md)

CLAUDE.md is not present. Constraints derived from project source, STATE.md decisions, and live infrastructure:

- **Zero npm dependencies** — `visual-regression.cjs` must use only Node.js built-ins (`crypto`, `fs`, `path`). Pixel-perfect comparison libraries (pixelmatch, resemble.js, canvas) are explicitly OUT OF SCOPE per REQUIREMENTS.md: "Pixel-perfect image comparison: Requires npm deps (pixelmatch/resemblejs) — violates zero-dep constraint."
- **CJS format only** in `bin/lib/` — `'use strict';`, no ESM syntax.
- **Under 300 lines per module** — existing modules enforce this ceiling; `visual-regression.cjs` should be ~80-100 lines.
- **Backward compatibility required** — zero behavior change when `visual_regression_guard` is absent or false. All 18 existing templates must pass existing Nyquist tests unchanged.
- **experiment-schema.cjs REQUIRED_FIELDS unchanged** — `visual_regression_guard` is OPTIONAL, not required. Adding it to REQUIRED_FIELDS would break all existing templates.
- **direction: max for all existing templates** — must remain unchanged. Visual regression check uses the experiment's existing `direction` field.
- **nyquist_validation: true** — Nyquist tests required. Phase 114 tests go in `tests/phase-114/`.
- **_reset() uses git reset --hard HEAD~1** — this is the existing rollback mechanism. REGRESSION status triggers the same `experiment reset` pde-tools subcommand that DISCARD triggers.
- **experiment.cjs _reset() has two guards** — must be on `experiment/{slug}` branch AND last commit must have `experiment({slug}):` prefix. REGRESSION path must commit the change before resetting (same as DISCARD path).
- **TOOL_MAP_VERIFY_REQUIRED markers** — `playwright:screenshot` maps to `mcp__playwright__browser_take_screenshot` (line 164 of mcp-bridge.cjs). Use `bridge.call('playwright:screenshot', ...)` not the raw tool name. Screenshot capture is optional — if Playwright unavailable, circuit breaker degrades gracefully (no baseline = no regression check).
- **EXPERIMENT-BEST.json baseline tracking** — baseline metric score is already stored in `EXPERIMENT-BEST.json`. Visual regression check compares against this existing baseline score, not a separate store.
- **verify command assertion preserved** — existing Nyquist test: `result.verify.startsWith('node bin/')`. No change to this assertion; new field is `visual_regression_guard`, not `verify`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js `crypto` | Built-in (Node 20) | SHA-256 file hashing | Already used in `bin/lib/manifest.cjs` hashFile() — identical pattern |
| Node.js `fs` | Built-in | readFileSync, copyFileSync, statSync | Used throughout all bin/ modules |
| Node.js `path` | Built-in | Path construction for baseline screenshot storage | Standard throughout bin/ |
| mcp-bridge.cjs | Internal | `bridge.call('playwright:screenshot', ...)` for screenshot capture | Existing TOOL_MAP entry; all Phase 111 metric scripts use this pattern |
| experiment.cjs `_reset()` | Internal | `git reset --hard HEAD~1` via pde-tools subcommand | Existing rollback mechanism; REGRESSION reuses DISCARD path |

### New in This Phase
| Script/File | Location | Purpose |
|-------------|----------|---------|
| visual-regression.cjs | `bin/lib/` | hashScreenshot(), checkVisualRegression(), captureAndStoreBaseline() |
| visual-regression.test.mjs | `tests/phase-114/` | Nyquist coverage for all VRCB requirements |

### Alternatives Considered and Rejected
| Instead of | Could Use | Why Rejected |
|------------|-----------|--------------|
| SHA-256 hash comparison | pixelmatch pixel diff | npm dependency — violates zero-dep constraint; also overkill for circuit breaker semantics |
| SHA-256 hash comparison | resemble.js perceptual hash | npm dependency — same constraint |
| SHA-256 hash comparison | ImageMagick `compare` CLI | System dependency, not guaranteed on all machines |
| SHA-256 hash comparison | Buffer.compare() | Functionally equivalent; hash is preferred because it is cheap to store/log in JSONL (64 chars) |
| hash + metric score | hash alone | Hash alone would fire on ANY visual change (including improvements). Metric score is required to determine direction. |
| separate baseline store | EXPERIMENT-BEST.json | Already stores `bestMetric`; baseline screenshot stored in `/tmp/pde-experiment-{slug}/` (ephemeral, consistent with existing `/tmp/` patterns) |

**Installation:** No installation step. All dependencies are Node.js built-ins already available.

---

## Architecture Patterns

### Recommended Project Structure

```
bin/
└── lib/
    └── visual-regression.cjs    # NEW: hashScreenshot, checkVisualRegression, captureAndStoreBaseline

tests/
└── phase-114/
    └── visual-regression.test.mjs  # NEW: VRCB-01..05 Nyquist coverage

workflows/
└── optimize.md                  # MODIFIED: add Step 6b (baseline screenshot), BREAK-05 in step 7k, KEEP path updateBaseline call
```

### No new bin/ metric scripts needed

Unlike Phases 111-113 which added new `bin/*.cjs` metric scripts, Phase 114 adds a library module only. The regression detection logic is a helper called by `optimize.md` orchestrator code, not a standalone metric script invokable by `_evalMetric`.

### Pattern 1: The Visual Regression Decision Tree

```
                  Before iteration (Step 6b):
                  captureAndStoreBaseline(slug, targetHtml)
                         |
                  [iterate: mutation + eval-metric]
                         |
                  After iteration (Step 7k pre-check):
                  captureCurrentScreenshot(slug, targetHtml)
                         |
                  Screenshot Hash Comparison
                  /                        \
            Same Hash                  Different Hash
               |                            |
         No regression              Check metric score delta
                                    /                      \
                         Score same or better         Score worse
                                |                          |
                         No regression              VISUAL REGRESSION → BREAK-05
                                                        |
                                               git reset --hard HEAD~1
                                               JSONL status: "DISCARD"
                                               description: "VISUAL REGRESSION: ..."
```

**Source:** v0.14-VISUAL-REGRESSION.md section 1 — The Regression Detection Formula (HIGH confidence, derived from live project infrastructure).

### Pattern 2: visual-regression.cjs Module

```javascript
// Source: v0.14-VISUAL-REGRESSION.md section 7 + manifest.cjs hashFile() pattern
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function hashScreenshot(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch {
    return null;  // Missing file = null (not error — graceful degradation)
  }
}

function checkVisualRegression({ cwd, slug, currentScreenshotPath, currentScore, baselineScore, direction }) {
  const baselinePath = path.join('/tmp', `pde-experiment-${slug}`, 'baseline-screenshot.png');
  const baselineHash = hashScreenshot(baselinePath);
  const currentHash = hashScreenshot(currentScreenshotPath);

  // No baseline = cannot check = no regression fired (Playwright may not be available)
  if (!baselineHash) return { fired: false, reason: 'no_baseline', baselineHash: null, currentHash };
  if (!currentHash)  return { fired: false, reason: 'no_current_screenshot', baselineHash, currentHash: null };

  // Identical screenshots = no visual change = no regression possible
  if (baselineHash === currentHash) return { fired: false, reason: 'no_visual_change', baselineHash, currentHash };

  // Hash changed — check metric direction
  const metricDecreased = direction === 'max'
    ? currentScore < baselineScore
    : currentScore > baselineScore;

  if (metricDecreased) {
    return { fired: true, reason: 'visual_regression_detected', baselineHash, currentHash, scoreDelta: currentScore - baselineScore };
  }

  return { fired: false, reason: 'visual_change_acceptable', baselineHash, currentHash, scoreDelta: currentScore - baselineScore };
}

function captureAndStoreBaseline(cwd, slug, targetHtmlPath) {
  // Uses Playwright MCP bridge — gracefully degrades if unavailable
  try {
    const bridge = require('./mcp-bridge.cjs');
    const baselinePath = path.join('/tmp', `pde-experiment-${slug}`, 'baseline-screenshot.png');
    const fileUrl = 'file://' + encodeURI(path.resolve(targetHtmlPath));
    bridge.call('playwright:navigate', { url: fileUrl });
    bridge.call('playwright:screenshot', { filename: baselinePath, type: 'png' });
    try { bridge.call('playwright:close', {}); } catch (_) {}
  } catch (_) {
    // Non-fatal: no Playwright = no baseline = regression check degrades gracefully
  }
}

module.exports = { hashScreenshot, checkVisualRegression, captureAndStoreBaseline };
```

### Pattern 3: experiment-schema.cjs Changes (Additive Only)

Add `visual_regression_guard` as a recognized optional field. Do NOT add to REQUIRED_FIELDS:

```javascript
// Source: experiment-schema.cjs parseExperimentFile() return block — ADDITIVE change only
return {
  valid: true,
  metric: fm.metric,
  direction: fm.direction,
  verify: fm.verify,
  mutable_files: mutableFiles,
  immutable_files: immutableFiles,
  budget: { iterations: iterationBudget, minutes: timeBudgetMinutes },
  slug: fm.slug || null,
  visual_regression_guard: fm.visual_regression_guard === 'true' || fm.visual_regression_guard === true,  // NEW
};
```

Also add optional JSONL fields for regression tracking (note: JSONL_ROW_FIELDS is `Object.freeze([])`; need to update the frozen array to include new optional fields):

```javascript
// Source: experiment-schema.cjs JSONL_ROW_FIELDS
const JSONL_ROW_FIELDS = Object.freeze([
  'id', 'iteration', 'ts', 'commit',
  'metric_value', 'metric_delta', 'status', 'description', 'tokens_used',
  'screenshot_hash', 'baseline_hash',  // NEW: optional visual regression fields
]);
```

**Critical caveat:** JSONL_ROW_FIELDS is imported by `_writeJsonlRow` and used to whitelist which fields are written to disk. Adding `screenshot_hash` and `baseline_hash` here makes them available but they default to `null` when not provided — backward compatible.

### Pattern 4: optimize.md Integration Points

Four changes to `workflows/optimize.md`:

**Step 6b (new sub-step after Step 6 baseline metric capture):**
```
If parsed.visual_regression_guard === true AND Playwright available:
  Call captureAndStoreBaseline(cwd, slug, targetHtmlPath)
  Display: "Visual regression baseline captured."
  Else: Display: "Visual regression guard enabled but Playwright unavailable — guard will be inactive."
```

**Step 7k BREAK-05 (new 5th circuit breaker, checked after BREAK-04):**
```
5. BREAK-05 (visual_regression): only if visual_regression_guard === true
   - Capture current screenshot to .planning/experiments/{slug}/current-screenshot.png
   - Call checkVisualRegression({ cwd, slug, currentScreenshotPath, currentScore, baselineScore, direction })
   - If result.fired === true:
     → haltReason = "visual_regression"
     → Display: "Visual regression circuit breaker fired: {result.reason}"
     → Run: node bin/pde-tools.cjs experiment reset --slug {slug}
     → Break the loop.
```

**Step 7h KEEP path (update baseline on successful KEEP):**
```
If status === "KEEP" AND visual_regression_guard === true:
  Copy .planning/experiments/{slug}/current-screenshot.png
       to .planning/experiments/{slug}/baseline-screenshot.png
  (The new best is now the baseline for subsequent regression checks)
```

**Step 7 JSONL write (pass optional screenshot_hash fields):**
```
--screenshot_hash {currentHash or null}
--baseline_hash {baselineHash or null}
```

### Pattern 5: Experiment Template Extension

Templates that want visual regression protection add one line to frontmatter:

```yaml
---
slug: wireframe-visual
metric: dom_structure_score
direction: max
verify: node bin/dom-metric.cjs references/experiments/fixtures/good-wireframe.html
mutable_files:
  - workflows/wireframe.md
visual_regression_guard: true   # NEW: enables VRCB circuit breaker
iteration_budget: 30
time_budget_minutes: 60
---
```

The 18 existing templates do NOT need this field — they will behave identically to before.

### Anti-Patterns to Avoid

- **Fire on any hash change (ignoring metric score):** Would reject mutations that visually improve the output. The hash is a gate, not the decision. Always combine with metric direction.
- **Store baseline as separate metric value:** EXPERIMENT-BEST.json already has `bestMetric`. Use `baselineMetric` (captured at loop start in Step 6) as the regression comparison point — not `bestMetric` (which changes every KEEP). The regression check compares each iteration's score against the **original baseline**, not the running best.
- **Crash on missing Playwright:** Screenshot capture must be `try/catch` non-fatal. Missing baseline = `fired: false` (no regression). Logging warning to stderr is acceptable.
- **Put visual_regression_guard in REQUIRED_FIELDS:** This would break backward compat with all 18 existing templates and all Nyquist tests that validate them.
- **Add new pde-tools subcommand for screenshot capture:** Unnecessary complexity. `captureAndStoreBaseline()` is called directly from optimize.md orchestrator code via the bridge, not through a new CLI subcommand.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Screenshot comparison | Custom pixel diff algorithm | SHA-256 hash + metric score delta | Pixel diff requires npm deps; hash + metric is equivalent for KEEP/DISCARD decisions |
| Visual change detection | Perceptual hashing (pHash, dHash) | SHA-256 file hash | pHash requires image decoding (npm); SHA-256 is deterministic for identical renders and already exists in manifest.cjs |
| Git rollback on regression | Custom git operations | `experiment.cjs _reset()` via `node bin/pde-tools.cjs experiment reset` | `_reset()` has two safety guards (branch check + commit prefix check) that prevent accidental resets |
| A11y regression detection | New a11y comparison script | Existing `a11y-metric.cjs` + metric score delta | a11y-metric.cjs already scores a11y quality; regression = score decrease; no new tool needed |
| Threshold configuration parsing | Custom YAML threshold parser | experiment-schema.cjs `extractFrontmatter` | Already handles all frontmatter; just add `visual_regression_guard` to the return value |

**Key insight:** The regression detection problem is already solved by the existing `_compareMetric()` function — it determines KEEP vs DISCARD based on metric direction. Visual regression adds one new question ("did the screenshot change?") before the existing metric comparison. The screenshot hash answers that question. The hardest part of this phase is wiring the new module into the existing orchestration, not building new comparison logic.

---

## Common Pitfalls

### Pitfall 1: Comparing Against Running Best Instead of Original Baseline

**What goes wrong:** If baseline is updated to `bestMetric` after every KEEP, a regression that brings the metric back to "only slightly above original" is not detected — the comparison is against the last-kept metric, not the pre-experiment baseline.

**Why it happens:** `EXPERIMENT-BEST.json.bestMetric` is mutable (updated on KEEP). It is tempting to use it as the regression comparison point because it is already there.

**How to avoid:** Capture `baselineMetric` once in Step 6 (before any mutations) and store it separately in loop state. BREAK-05 compares `currentScore` against `baselineMetric`, not `bestMetric`. The `updateBaseline()` (screenshot baseline update on KEEP) is separate from this metric comparison.

**Warning signs:** Regressions that only reduce the metric slightly below the best-ever result are not detected.

### Pitfall 2: Screenshot Capture Before vs After Navigation

**What goes wrong:** `playwright:screenshot` captures whatever the browser currently has loaded, not the target file. If the browser was last navigated to a different page, the baseline screenshot is wrong.

**Why it happens:** The Playwright MCP session is ephemeral — each `bridge.call('playwright:navigate')` session closes on `playwright:close`. `captureAndStoreBaseline()` must navigate explicitly.

**How to avoid:** Always call `playwright:navigate` to the target file URL before `playwright:screenshot`. Pattern confirmed in a11y-metric.cjs line 62-66.

**Warning signs:** Baseline screenshots are blank, show a previous page, or show a browser error page.

### Pitfall 3: JSONL_ROW_FIELDS is Object.freeze — Cannot Push

**What goes wrong:** `const JSONL_ROW_FIELDS = Object.freeze([...])` — calling `.push()` or `JSONL_ROW_FIELDS.length` mutation throws in strict mode.

**Why it happens:** The array is frozen at module load time. Mutating a frozen object throws `TypeError: Cannot add property N, object is not extensible`.

**How to avoid:** Replace the `Object.freeze([...])` declaration entirely with a new array that includes the new fields. The `Object.freeze` call creates a new frozen array — it is not modifying in-place. Update the declaration site, not the call sites.

**Warning signs:** `TypeError: Cannot add property` during module load.

### Pitfall 4: baseline-screenshot.png Committed to Git

**What goes wrong:** `git add -A` in `_commit()` (experiment.cjs line 108) adds ALL files including the baseline screenshot PNG. This bloats the experiment branch with binary files.

**Why it happens:** `_commit()` uses `git add -A` before committing the mutation. PNG screenshots in `.planning/experiments/{slug}/` will be staged.

**How to avoid:** Add `*.png` to `.gitignore` in the experiments directory, OR add `.planning/experiments/` to an appropriate gitignore scope. Alternatively, store baseline screenshots in `/tmp/pde-experiment-{slug}/` instead of inside `.planning/experiments/`. The `/tmp/` approach is cleaner — no git noise, cleared on reboot, exactly what ephemeral experiment data needs.

**Warning signs:** `git log --stat` shows large `.png` files being committed to experiment branches.

### Pitfall 5: visual_regression_guard Field Type in Frontmatter

**What goes wrong:** YAML frontmatter in experiment.md files is parsed by a custom line-by-line parser (see `experiment.cjs parseFrontmatter` and `frontmatter.cjs extractFrontmatter`). Boolean values from YAML come through as strings `'true'` or `'false'`, not JavaScript booleans.

**Why it happens:** The frontmatter parser uses `val.replace(/^["']|["']$/g, '')` but does not convert `'true'` to `true`. `fm.visual_regression_guard` will be the string `'true'`, not the boolean `true`.

**How to avoid:** In `experiment-schema.cjs` parseExperimentFile(), normalize the field:
```javascript
visual_regression_guard: fm.visual_regression_guard === 'true' || fm.visual_regression_guard === true,
```
This handles both string and boolean representations.

**Warning signs:** `visual_regression_guard: true` in experiment.md has no effect even when `visual_regression_guard` field is read — because the string `'true'` is truthy but `fm.visual_regression_guard === true` is false.

### Pitfall 6: BREAK-05 Fires Before Metric Is Evaluated

**What goes wrong:** If BREAK-05 screenshot comparison happens before `eval-metric`, `currentScore` is undefined/null. The regression check would fire spuriously.

**Why it happens:** Placing the screenshot capture and comparison in the wrong order relative to the metric eval.

**How to avoid:** BREAK-05 check is in step 7k — AFTER eval-metric (step 7 sub-step 8) and AFTER the JSONL row is written (step 10). The `currentScore` from eval-metric is available by then.

**Warning signs:** REGRESSION fires on iteration 1 with a null current score.

### Pitfall 7: Regression Check Fires on CRASH Status

**What goes wrong:** If `eval-metric` returns CRASH (non-zero exit, timeout, or unparseable output), `currentScore` is null. The regression check should not fire on CRASH — CRASH is already handled by `consecutiveFailures`.

**Why it happens:** The `checkVisualRegression()` function receives `currentScore = null` and computes `direction === 'max' ? null < baselineScore` which is `false` in JavaScript (numeric comparison with null). This silently skips the regression. However, if CRASH returns `currentScore = 0`, the regression check WOULD fire on a CRASH where 0 < baseline.

**How to avoid:** Gate BREAK-05 behind an explicit status check:
```javascript
// Only check visual regression if metric eval succeeded
if (status !== 'CRASH' && status !== 'BOUNDARY_VIOLATION' && visual_regression_guard) {
  // ... BREAK-05 check
}
```

**Warning signs:** Experiment loop immediately halts on first CRASH with `haltReason: "visual_regression"`.

---

## Code Examples

### hashScreenshot — Verified from manifest.cjs pattern

```javascript
// Source: bin/lib/manifest.cjs hashFile() — same pattern, same Node.js API
const crypto = require('crypto');
const fs = require('fs');

function hashScreenshot(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch {
    return null;
  }
}
```

### captureAndStoreBaseline — Verified from iterate-effectiveness-metric.cjs captureScreenshot()

```javascript
// Source: bin/iterate-effectiveness-metric.cjs captureScreenshot() lines 83-98
function captureAndStoreBaseline(cwd, slug, targetHtmlPath) {
  try {
    const bridge = require('./mcp-bridge.cjs');
    const baselinePath = path.join('/tmp', `pde-experiment-${slug}`, 'baseline-screenshot.png');
    const fileUrl = 'file://' + encodeURI(path.resolve(targetHtmlPath));
    bridge.call('playwright:navigate', { url: fileUrl });
    bridge.call('playwright:screenshot', { filename: baselinePath, type: 'png' });
    try { bridge.call('playwright:close', {}); } catch (_) {}
  } catch (_) {
    // Non-fatal — if Playwright unavailable, circuit breaker degrades gracefully
  }
}
```

### JSONL_ROW_FIELDS Update — Replacing frozen array

```javascript
// Source: bin/lib/experiment-schema.cjs line 21-31 — REPLACE not extend
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
  'screenshot_hash',   // NEW: optional field, null when visual_regression_guard: false
  'baseline_hash',     // NEW: optional field, null when visual_regression_guard: false
]);
```

### optimize.md BREAK-05 integration (pseudocode)

```javascript
// Source: optimize.md step 7k pattern (BREAK-01..04 already implemented)
// This is orchestrator prose pattern, not actual JS

// Only when visual_regression_guard: true AND eval succeeded
if (visualRegressionGuard && status !== 'CRASH' && status !== 'BOUNDARY_VIOLATION') {
  const vr = require('./bin/lib/visual-regression.cjs');

  // Capture current screenshot AFTER mutation
  const currentScreenshotPath = path.join('/tmp', `pde-experiment-${slug}`, 'current-screenshot.png');
  vr.captureCurrentScreenshot(cwd, slug, targetHtmlPath, currentScreenshotPath);

  const result = vr.checkVisualRegression({
    cwd, slug, currentScreenshotPath,
    currentScore: metricValue,
    baselineScore: baselineMetric,  // Captured in Step 6, never mutated
    direction,
  });

  if (result.fired) {
    haltReason = 'visual_regression';
    // git reset --hard HEAD~1 (the commit from this iteration)
    // JSONL row already written with status DISCARD — append "VISUAL REGRESSION: ..." to description
    // No new status value needed; haltReason: "visual_regression" in final report distinguishes cause
  }
}

// On KEEP: update baseline screenshot
if (status === 'KEEP' && visualRegressionGuard) {
  fs.copyFileSync(currentScreenshotPath, baselineScreenshotPath);
}
```

### Nyquist test pattern — Verified from phase-113 test structure

```javascript
// Source: tests/phase-113/pipeline-iterate-experiments.test.mjs structure
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { hashScreenshot, checkVisualRegression, captureAndStoreBaseline } = require('../../bin/lib/visual-regression.cjs');
const { parseExperimentFile } = require('../../bin/lib/experiment-schema.cjs');

describe('VRCB-01: hashScreenshot', () => {
  it('returns null for missing file', () => {
    assert.equal(hashScreenshot('/does/not/exist.png'), null);
  });
  it('returns consistent hash for same file', () => {
    // Use a fixture file
    const hash1 = hashScreenshot('references/experiments/fixtures/good-wireframe.html');
    const hash2 = hashScreenshot('references/experiments/fixtures/good-wireframe.html');
    assert.equal(hash1, hash2);
  });
  it('returns different hash for different files', () => {
    const hash1 = hashScreenshot('references/experiments/fixtures/good-wireframe.html');
    const hash2 = hashScreenshot('references/experiments/fixtures/bad-wireframe.html');
    assert.notEqual(hash1, hash2);
  });
});

describe('VRCB-03: checkVisualRegression', () => {
  it('returns fired:false when no baseline', () => {
    const result = checkVisualRegression({ cwd: '/tmp', slug: 'test-no-baseline',
      currentScreenshotPath: '/tmp/current.png', currentScore: 50, baselineScore: 80, direction: 'max' });
    assert.equal(result.fired, false);
    assert.equal(result.reason, 'no_baseline');
  });
  // ... etc
});

describe('VRCB-04: visual_regression_guard field', () => {
  it('parseExperimentFile extracts visual_regression_guard field', () => {
    const parsed = parseExperimentFile('references/experiments/wireframe.md');
    // wireframe.md does NOT have the field — should default to false
    assert.equal(parsed.visual_regression_guard, false);
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Percy/Chromatic cloud visual regression | Local hash-based regression with metric correlation | N/A (never used in PDE — zero-dep constraint) | Cloud services require npm deps, network, tokens; not applicable |
| pixelmatch pixel-level diff | Hash + metric score delta | N/A (pixelmatch rejected on zero-dep constraint) | pixelmatch tells you WHERE pixels differ; PDE only needs KEEP/DISCARD — metric score is sufficient |
| Separate regression threshold config | Boolean guard + metric direction | Phase 114 design | Threshold is implicit in the metric direction; if score goes down, it's a regression |

**Deprecated/outdated approaches (explicitly rejected for PDE):**
- **pixelmatch**: npm dependency, also overkill — PDE needs KEEP/DISCARD not a pixel diff map
- **resemble.js**: npm dependency with identical constraint violation
- **BackstopJS/Percy/Chromatic**: Cloud services requiring separate accounts, npm, network — incompatible with local-first PDE architecture
- **Canvas API for pixel comparison**: Node.js `canvas` package requires native binaries (libcairo) — among the most fragile npm deps

---

## Design Decisions (RESOLVED)

All three open questions from initial research have been resolved via maxdepth codebase investigation (2026-03-23).

### Decision 1: Screenshot Storage — `/tmp/pde-experiment-{slug}/` (RESOLVED)

**Decision:** Store baseline and current screenshots in `/tmp/pde-experiment-{slug}/`, NOT in `.planning/experiments/{slug}/`.

**Evidence:**
- `experiment.cjs:108` — `_commit()` calls `execGit(cwd, ['add', '-A'])` which stages ALL files in the working tree. PNGs in `.planning/experiments/` would bloat experiment branches with binary files.
- `.gitignore` is minimal (only excludes `mcp-connections.json`) — no `*.png` exclusion exists, and adding one would be fragile.
- Existing `/tmp/` pattern confirmed at 3 locations: `event-bus.cjs:50` (`/tmp/pde-session-{id}.ndjson`), `optimize.md:94,140` (`/tmp/pde-self-improve-experiment.md`), `idle-suggestions.cjs:67` (`/tmp/pde-suggestions-{id}.md`). All follow the convention `/tmp/pde-{component}-{identifier}.{ext}`.
- Screenshots are per-run ephemeral data — only needed for before/after comparison within a single iteration. No value persisting across reboots.
- Loop counters (`consecutiveFailures`, `iterationsSinceImprovement`) are also ephemeral (initialized fresh at `optimize.md:270-276`), so screenshot ephemerality is consistent with the existing state model.

**Layout:**
```
/tmp/pde-experiment-{slug}/
├── baseline-screenshot.png
├── current-screenshot.png
└── baseline-hash.txt        # SHA-256 for fast comparison without re-reading PNG
```

### Decision 2: JSONL Status on Regression — Reuse `DISCARD` (RESOLVED)

**Decision:** Reuse `status: 'DISCARD'` with descriptive text prefix `"VISUAL REGRESSION: {detail}"` in the description field. Do NOT add a new `REGRESSION` status value.

**Evidence:**
- Only 4 statuses exist: `KEEP`, `DISCARD`, `CRASH`, `""` (empty for start/complete events). Source: `experiment-runner.cjs:114-132`, `event-bus.cjs:115-126`.
- No status enum exists — validation is implicit via `_compareMetric()` logic, which only returns `KEEP` or `DISCARD`.
- Adding `REGRESSION` would require updating: `experiment-report.cjs:138` (filters `r.status === 'KEEP'`), event-bus docs (`lines 115-126`), and all 32 Nyquist tests that validate status behavior.
- `DISCARD` already means "iteration regressed the metric" — semantically correct for visual regression.
- Report table at `experiment-report.cjs:172-176` renders both status AND description columns — users see `DISCARD | VISUAL REGRESSION: new a11y violation (baseline: 0, current: 2)` which fully distinguishes the cause.
- Downstream consumers that need programmatic distinction can check `description.startsWith('VISUAL REGRESSION:')` without any schema migration.

**Pattern:**
```
status: 'DISCARD'
description: 'VISUAL REGRESSION: screenshot hash changed + metric decreased (delta: -3.2)'
```

**JSONL_ROW_FIELDS update:** Still add `screenshot_hash` and `baseline_hash` as optional fields (null when guard disabled). These are diagnostic metadata, not a new status. The frozen array must be replaced (not pushed to) per Pitfall 3.

### Decision 3: Visual Regression Target Path — New Frontmatter Field (RESOLVED)

**Decision:** Add explicit `visual_regression_target` field to experiment.md frontmatter. Do NOT parse the `verify` command string.

**Evidence:**
- `verify` command is parsed by splitting on whitespace at `experiment-runner.cjs:70` (`verifyCmd.trim().split(/\s+/)`). Extracting a path from it would require fragile index-based string parsing that breaks if arguments change order.
- Established pattern: per-experiment config lives in frontmatter (`iteration_budget`, `time_budget_minutes`), global thresholds in `config.json` (`consecutive_failure_limit`, `no_progress_limit`). A per-experiment target path belongs in frontmatter.
- Frontmatter parser at `frontmatter.cjs:11-84` returns ALL values as strings. Boolean normalization is required: `=== 'true' || === true` (confirmed — parser does NOT convert YAML booleans).
- No existing mechanism for specifying screenshot targets exists — `mutable_files`/`immutable_files` only control write permissions, not capture targets.

**Frontmatter additions:**
```yaml
visual_regression_guard: true
visual_regression_target: .planning/pipeline/design/wireframes/dashboard.html
```

**Schema addition in `parseExperimentFile()` return block:**
```javascript
visual_regression: {
  enabled: fm.visual_regression_guard === 'true' || fm.visual_regression_guard === true,
  target: fm.visual_regression_target || null
}
```

**Guard logic:** If `visual_regression_guard: true` but `visual_regression_target` is null/absent, VRCB circuit breaker is inactive (logged as warning, not error). Template authors must specify both fields to enable VRCB.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js `crypto` | hashScreenshot() | Yes | Built-in (Node 20.20.0) | — |
| Node.js `fs` | captureAndStoreBaseline(), hashScreenshot() | Yes | Built-in (Node 20.20.0) | — |
| Playwright MCP | Screenshot capture | Unknown at test time | Latest via npx | Graceful degradation (no baseline = no regression check) |
| `playwright:screenshot` tool | Baseline capture | Yes (TOOL_MAP confirmed, line 164) | TOOL_MAP_VERIFY_REQUIRED | Tool descriptor returned instead of execution = no screenshot |

**Missing dependencies with no fallback:** None — all required functionality uses Node.js built-ins.

**Missing dependencies with fallback:** Playwright MCP — if unavailable, `captureAndStoreBaseline()` catches and swallows the error; `checkVisualRegression()` returns `fired: false, reason: 'no_baseline'` which means the VRCB circuit breaker is inactive but the experiment continues normally.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | node:test (built-in, Node 20) |
| Config file | none — run directly |
| Quick run command | `node --test tests/phase-114/visual-regression.test.mjs` |
| Full suite command | `node --test tests/` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VRCB-01 | Visual regression prevented when guard enabled | unit | `node --test tests/phase-114/visual-regression.test.mjs` | No — Wave 0 |
| VRCB-02 | Baseline screenshot captured before iteration | unit (mock Playwright) | `node --test tests/phase-114/visual-regression.test.mjs` | No — Wave 0 |
| VRCB-03 | Regression detected and rollback triggered | unit | `node --test tests/phase-114/visual-regression.test.mjs` | No — Wave 0 |
| VRCB-04 | `visual_regression_guard` field parsed from experiment.md | unit | `node --test tests/phase-114/visual-regression.test.mjs` | No — Wave 0 |
| VRCB-05 | Existing BREAK-01..04 tests still pass (no regression) | regression | `node --test tests/` | Yes — existing tests |

### Sampling Rate

- **Per task commit:** `node --test tests/phase-114/visual-regression.test.mjs`
- **Per wave merge:** `node --test tests/`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-114/visual-regression.test.mjs` — covers VRCB-01..05 (all five requirements)
- [ ] `tests/phase-114/` directory — does not exist, must be created in Wave 0
- [ ] `bin/lib/visual-regression.cjs` — must exist before tests can import it

*(No new framework install needed — `node:test` is built-in to Node 20)*

---

## Sources

### Primary (HIGH confidence)
- `bin/lib/manifest.cjs` (live source) — SHA-256 hashFile() pattern; identical to hashScreenshot() needed here
- `bin/lib/experiment-runner.cjs` (live source) — `_evalMetric`, `_compareMetric`, `_writeJsonlRow` contracts
- `bin/lib/experiment.cjs` (live source) — `_reset()` git reset --hard HEAD~1, safety guards (branch check + commit prefix)
- `bin/lib/experiment-schema.cjs` (live source) — REQUIRED_FIELDS, parseExperimentFile(), JSONL_ROW_FIELDS, EXPERIMENT_DEFAULTS
- `workflows/optimize.md` (live source) — BREAK-01..04 circuit breaker architecture, step 7k, KEEP/DISCARD paths
- `bin/iterate-effectiveness-metric.cjs` (live source) — captureScreenshot() pattern using bridge.call('playwright:screenshot')
- `bin/lib/mcp-bridge.cjs` (live source) — TOOL_MAP line 164: `'playwright:screenshot': 'mcp__playwright__browser_take_screenshot'`
- `.planning/research/v0.14-VISUAL-REGRESSION.md` (project pre-research) — Full domain analysis: hash-based detection, npm library rejections, implementation recommendations

### Secondary (MEDIUM confidence)
- `agents/pde-experiment-runner.md` — runner agent contracts (KEEP/DISCARD/CRASH status values, JSONL write protocol)
- `bin/a11y-metric.cjs` — Playwright probe/degrade pattern; navigate then snapshot; try/catch non-fatal structure

### Tertiary (LOW confidence)
- None — all critical claims are verified from live project source files

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all modules are Node.js built-ins + existing project infrastructure
- Architecture: HIGH — all patterns derived from live source files (manifest.cjs, experiment.cjs, iterate-effectiveness-metric.cjs)
- Pitfalls: HIGH — pitfalls derived from reading actual source code of integration points (Object.freeze, git add -A, frontmatter string/bool coercion)
- Open questions: MEDIUM — three design choices identified that require planner decision

**Research date:** 2026-03-23
**Valid until:** 2026-06-23 (stable domain — Node.js built-ins + project infrastructure; no external dependencies to track)
