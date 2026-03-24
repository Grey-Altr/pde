# Phase 116: Pressure Test + Meta-Optimization + Ideation + Brief Reference - Research

**Researched:** 2026-03-24
**Domain:** PDE workflow augmentation — Playwright browser integration, JSONL history analysis, screenshot variance scoring, live URL capture
**Confidence:** HIGH (all findings based on direct codebase analysis)

## Summary

Phase 116 bundles four independent enhancements that all share the same Playwright dependency and degrade gracefully when it is absent. Each enhancement modifies a single existing workflow file (pressure-test.md, optimize.md, ideate.md, brief.md) and adds one or two supporting CJS scripts in `bin/`. No new npm dependencies are permitted — the zero-dep constraint is firm.

The central insight for planning: these four features share a common structure. Each has a (1) Playwright probe gate, (2) enhanced branch with browser calls, (3) graceful degradation path that preserves existing behavior, and (4) a Nyquist test asserting the new workflow prose or logic is present. The planner should treat all four as the same pattern applied four times to four different workflow files.

The highest implementation risk is **META-01 through META-04** (strategy weighting from JSONL history). This requires a new CJS module that reads `results.jsonl` and computes per-strategy frequency/improvement statistics. The other three features are purely additive workflow prose changes with thin CJS script wrappers following established patterns from Phases 111-115.

**Primary recommendation:** Implement all four as workflow prose additions + thin CJS scripts, following the wireframe.md Step 5d screenshot pattern (Phase 109) for browser calls and the `dom-metric.cjs` pattern (Phase 111) for new metric scripts. Keep each CJS module under 150 lines. Nyquist tests should assert structural markers in workflow prose, not browser integration (Playwright is ephemeral).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None — discuss phase was skipped. All implementation choices are at Claude's discretion.

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from ROADMAP:
- PRES-01 through PRES-04, META-01 through META-04, IDT-01 through IDT-04, BREF-01 through BREF-04 requirements
- All 4 capabilities must degrade gracefully when Playwright unavailable
- Pressure test combines visual metrics with existing Awwwards text rubric
- Meta-optimization reads JSONL history to weight mutation strategies
- Ideation divergence scored by screenshot variance across concepts
- Brief reference captures live product screenshots from URLs

### Deferred Ideas (OUT OF SCOPE)
None — discuss phase skipped.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PRES-01 | Pressure test gains visual quality dimension alongside existing Awwwards text rubric | Add Step 5b visual scoring block to pressure-test.md; spawn visual metric scripts against mockup HTML |
| PRES-02 | Browser renders pressure test output artifacts and scores DOM structure, a11y, contrast | Call dom-metric.cjs, a11y-metric.cjs, contrast-metric.cjs from pressure-test Step 5b on mockup HTML files |
| PRES-03 | Combined score formula weights text rubric (existing) + visual metrics (new) | Formula: combined = (text_score * 0.65) + (visual_avg * 0.35); append combined column to Tier 2 report table |
| PRES-04 | Visual dimension degrades gracefully when Playwright unavailable (text-only scoring) | Probe via `node bin/pde-tools.cjs mcp-probe --tool playwright:screenshot`; skip visual scoring if unavailable |
| META-01 | Experiment runner self-calibrates mutation strategies based on historical improvement data | New `bin/lib/strategy-weights.cjs` reads JSONL; optimize.md Step 7 passes weights to runner agent |
| META-02 | Mutation strategy effectiveness tracked across experiment runs | strategy-weights.cjs groups rows by `description` prefix/keyword tags; computes KEEP rate per tag |
| META-03 | Meta-optimization reads experiment JSONL history to derive strategy weights | strategy-weights.cjs reads `results.jsonl` from all slug subdirs in `.planning/experiments/` |
| META-04 | Strategy weights influence mutation agent's approach selection in subsequent experiments | optimize.md Step 7 serializes top-3 weighted strategies into `<strategy_hint>` block in Task() prompt |
| IDT-01 | Ideation divergence scored by measuring screenshot variance across generated concepts | New Step 7b in ideate.md; screenshots each direction's mockup/wireframe via Playwright then hashes |
| IDT-02 | Visual similarity metric compares screenshots pairwise (structural hash or pixel-level) | Use SHA-256 hash similarity: count unique hashes / total screenshots as diversity ratio (no pixel deps) |
| IDT-03 | Higher visual diversity = higher ideation quality score | diversity_score = (unique_hashes / total_screenshots) * 100; append to IDT artifact Summary table |
| IDT-04 | Ideation visual scoring degrades gracefully (text-only diversity when Playwright unavailable) | Probe Playwright; if unavailable skip scoring and log `[Visual diversity scoring unavailable — install Playwright MCP]` |
| BREF-01 | Brief workflow can capture live product screenshots as reference material | Add Step 3b to brief.md after MCP probe step; navigates URL, screenshots, saves to `.planning/design/references/` |
| BREF-02 | User provides URL → Playwright navigates, screenshots, saves to `.planning/design/references/` | New Step 3b in brief.md; parse `--reference-url <url>` flag; use playwright:navigate + playwright:screenshot |
| BREF-03 | Reference screenshots available to downstream skills (wireframe, mockup, critique) | Save as `.planning/design/references/REF-{slug}.png`; log path for downstream use |
| BREF-04 | Reference capture is opt-in (not automatic — requires user-provided URLs) | BREF flag `--reference-url` only; no automatic URL scraping; missing flag = skip silently |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-in `fs`, `path`, `crypto` | Built-in | File I/O, path resolution, SHA-256 hashing | Zero-dep constraint — no npm packages |
| `bin/lib/mcp-bridge.cjs` | Project | Canonical Playwright tool name resolution + probe | All Phase 108-115 browser calls use this |
| `bin/lib/experiment-runner.cjs` | Project | JSONL reading (`_writeJsonlRow`, `_evalMetric`) | Established in Phase 102-103 |
| `bin/lib/experiment-schema.cjs` | Project | `JSONL_ROW_FIELDS` constant, experiment file parsing | Phase 103+ consumers import this |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `bin/dom-metric.cjs` | Project | DOM structure score (0-100) against HTML file | PRES-02 calls this for mockup scoring |
| `bin/a11y-metric.cjs` | Project | A11y violations score via AOM snapshot | PRES-02 calls this for mockup scoring |
| `bin/contrast-metric.cjs` | Project | WCAG contrast pass-rate score | PRES-02 calls this for mockup scoring |
| `bin/lib/visual-regression.cjs` | Project | `hashScreenshot()` for SHA-256 file hashing | IDT-02 reuses this for pairwise hash comparison |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SHA-256 hash diversity (IDT-02) | Pixel-level diff (pixelmatch) | Out of scope per REQUIREMENTS.md — violates zero-dep constraint |
| Prose-based strategy keyword tags (META-02) | Dedicated `strategy` field in JSONL schema | Adding a JSONL field requires extending JSONL_ROW_FIELDS, bumps experiment-schema.cjs, and requires migration. Keyword extraction from `description` field is simpler and non-breaking. |
| Node.js built-in `node:test` for Nyquist | Jest / Vitest | All existing tests use `node:test` + `assert/strict` — match pattern |

**Installation:**
```bash
# No npm installation required — all dependencies are project-internal or Node built-ins
```

## Architecture Patterns

### Recommended Project Structure
```
bin/
├── lib/
│   └── strategy-weights.cjs     # NEW: META-01-04 — JSONL history analysis
├── visual-diversity-metric.cjs  # NEW: IDT-01-04 — screenshot variance scorer
workflows/
├── pressure-test.md             # MODIFY: add Step 5b visual scoring block
├── optimize.md                  # MODIFY: add strategy hint injection in Step 7
├── ideate.md                    # MODIFY: add Step 7b visual diversity scoring
├── brief.md                     # MODIFY: add Step 3b reference screenshot capture
tests/
└── phase-116/
    ├── pressure-test-visual.test.mjs   # PRES-01-04 Nyquist
    ├── meta-optimization.test.mjs      # META-01-04 Nyquist
    ├── ideation-visual.test.mjs        # IDT-01-04 Nyquist
    └── brief-reference.test.mjs        # BREF-01-04 Nyquist
```

### Pattern 1: Playwright Probe Gate (all four features)

Every new browser-dependent step follows the established Phase 108 probe/degrade pattern from `wireframe.md` and `optimize.md`:

```
# In workflow prose (markdown):
IF --no-playwright in $ARGUMENTS OR --no-mcp in $ARGUMENTS:
  SET PLAYWRIGHT_AVAILABLE = false
  Skip all browser steps

ELSE:
  Probe via: node bin/pde-tools.cjs mcp-probe --tool playwright:screenshot 2>/dev/null
  IF exit code 0: SET PLAYWRIGHT_AVAILABLE = true
  ELSE: SET PLAYWRIGHT_AVAILABLE = false
```

**Source:** optimize.md Step 6b (Phase 114 decision: "Playwright availability probe uses pde-tools mcp-probe subcommand in optimize.md — avoids require() in workflow prose which fails workflow sandbox validator")

### Pattern 2: Metric Script Contract (PRES-02 visual scripts)

All metric scripts follow the `_evalMetric` contract established in Phase 111:

```javascript
// Source: bin/dom-metric.cjs (Phase 111 pattern)
// Contract: exit 0 always, last line of stdout = numeric score
// Degrade: print '0\n' and exit 0 when Playwright unavailable or no file arg

const bridge = req(path.join(__dirname, 'lib', 'mcp-bridge.cjs'));
let playwrightAvailable = false;
try {
  const result = bridge.call('playwright:probe', {});
  playwrightAvailable = !!result;
} catch (_) { playwrightAvailable = false; }

if (!playwrightAvailable) {
  process.stdout.write('0\n');
  process.exit(0);
}
```

### Pattern 3: JSONL History Reading (META-01-04)

The JSONL rows are written to `.planning/experiments/{slug}/results.jsonl` via `_writeJsonlRow`. Each row has fields defined in `JSONL_ROW_FIELDS`:
```
['id', 'iteration', 'ts', 'commit', 'metric_value', 'metric_delta', 'status',
 'description', 'tokens_used', 'screenshot_hash', 'baseline_hash',
 'candidates_evaluated', 'candidates_scores', 'best_candidate_index']
```

**Strategy weight computation:** Extract keyword tags from `description` field, group by tag, compute KEEP rate:
```javascript
// Source: bin/lib/experiment-runner.cjs JSONL_ROW_FIELDS pattern (Phase 115)
// No new fields needed — read existing 'description' and 'status' fields

function computeStrategyWeights(cwd) {
  const experimentsDir = path.join(cwd, '.planning', 'experiments');
  const strategyMap = new Map(); // tag -> { keep: N, total: N }

  // Scan all slug directories for results.jsonl
  for (const slug of fs.readdirSync(experimentsDir)) {
    const jsonlPath = path.join(experimentsDir, slug, 'results.jsonl');
    if (!fs.existsSync(jsonlPath)) continue;

    for (const line of fs.readFileSync(jsonlPath, 'utf-8').split('\n')) {
      if (!line.trim()) continue;
      const row = JSON.parse(line);
      const tags = extractTags(row.description || '');
      for (const tag of tags) {
        const entry = strategyMap.get(tag) || { keep: 0, total: 0 };
        entry.total++;
        if (row.status === 'KEEP') entry.keep++;
        strategyMap.set(tag, entry);
      }
    }
  }
  // Sort by keep_rate DESC, return top N
  return Array.from(strategyMap.entries())
    .map(([tag, { keep, total }]) => ({ tag, keep_rate: keep / total, total }))
    .filter(s => s.total >= 3)  // min sample size
    .sort((a, b) => b.keep_rate - a.keep_rate);
}
```

**Where weights are injected:** optimize.md Step 7, inside the Task() prompt for the runner agent:
```
<strategy_hint>
Historical strategy effectiveness (top 3 by KEEP rate):
{top_strategy_1}: {keep_rate}% keep rate ({total} runs)
{top_strategy_2}: {keep_rate}% keep rate ({total} runs)
{top_strategy_3}: {keep_rate}% keep rate ({total} runs)
Prefer strategies matching these patterns when generating mutations.
</strategy_hint>
```

### Pattern 4: Screenshot-Based Diversity Score (IDT-01-04)

Screenshot each direction concept (if Playwright available), hash PNGs with SHA-256 (reusing `hashScreenshot` from `visual-regression.cjs`), compute diversity:

```javascript
// Source: bin/lib/visual-regression.cjs hashScreenshot() (Phase 114)
const { hashScreenshot } = require('./lib/visual-regression.cjs');

function computeVisualDiversity(screenshotPaths) {
  const hashes = screenshotPaths
    .map(p => hashScreenshot(p))
    .filter(h => h !== null);
  const uniqueHashes = new Set(hashes);
  // diversity_score: 0-100
  return hashes.length > 0
    ? Math.round((uniqueHashes.size / hashes.length) * 100)
    : 0;
}
```

The score is appended to the IDT artifact `## Summary` table (or a new `## Visual Diversity` section) and logged in the step display.

### Pattern 5: Live URL Reference Capture (BREF-01-04)

New optional Step 3b in `brief.md`, triggered only when `--reference-url <url>` flag is present:

```
# In brief.md Step 3 (after Sequential Thinking probe, before product type detection):

IF --reference-url present in $ARGUMENTS AND PLAYWRIGHT_AVAILABLE:
  Extract URL from --reference-url flag
  mkdir -p .planning/design/references/
  Resolve tool names via bridge (navigate, screenshot, close)
  Navigate to URL
  Screenshot to .planning/design/references/REF-{slug}.png
    where slug = URL hostname with special chars replaced (e.g., stripe.com -> stripe-com)
  Close browser
  Log: "  -> Reference captured: .planning/design/references/REF-{slug}.png"
  SET REFERENCE_SCREENSHOT_PATH = .planning/design/references/REF-{slug}.png

IF --reference-url present AND PLAYWRIGHT_UNAVAILABLE:
  Log: "  -> Reference capture skipped — Playwright MCP unavailable"

IF --reference-url absent:
  Skip silently
```

**Storage path:** `.planning/design/references/` (matches BREF-02 requirement). No flag = no capture = existing behavior unchanged.

### Anti-Patterns to Avoid
- **require() in workflow prose bash blocks**: Use `node --input-type=module` with `import { createRequire } from 'module'` — see Phase 114 decision log. `require()` in inline bash fails the workflow sandbox validator.
- **Pixel-level image comparison**: Never use pixelmatch or resemblejs — violates zero-dep constraint (documented in REQUIREMENTS.md Out of Scope).
- **Adding JSONL fields for strategy tracking**: Do not extend `JSONL_ROW_FIELDS` or `experiment-schema.cjs`. Read existing `description` + `status` fields instead. Adding a new JSONL field is a schema change requiring migration and bumps experiment-schema.cjs line count.
- **Calling dom-metric.cjs / a11y-metric.cjs from workflow prose directly**: These scripts are called via `node bin/dom-metric.cjs <path>` subprocess — they are not require()-able from workflow prose. Invoke via bash subprocess in pressure-test.md Step 5b.
- **Halting pressure test on Playwright failure**: Visual scoring is informational. Pressure test MUST complete even when all visual scores return 0. Text rubric result is the authoritative tier result.
- **Storing strategy weights in a persistent file**: Compute weights at runtime by reading JSONL on each optimize.md invocation. No persistent weights file — avoids stale data.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Screenshot hashing | Custom hash utility | `hashScreenshot()` from `bin/lib/visual-regression.cjs` | Already exists, tested, handles errors gracefully |
| Playwright tool name resolution | Direct `mcp__playwright__*` calls in prose | `bridge.call('playwright:screenshot', ...)` via mcp-bridge.cjs | Tool names are VERIFY_REQUIRED — bridge is the indirection layer |
| JSONL parsing | Custom parser | `JSON.parse()` per line (JSONL = one JSON object per line) | No library needed; already the established pattern |
| Experiment directory discovery | Custom glob | `fs.readdirSync('.planning/experiments/')` | Simple directory listing; no glob library needed |
| Metric averaging for pressure test | Custom aggregation | Simple arithmetic: `(dom + a11y + contrast) / 3` | No statistical library needed |

**Key insight:** The project has a comprehensive set of reusable primitives from Phases 108-115. Phase 116 is assembly work — wiring existing primitives together into four new workflow paths.

## Common Pitfalls

### Pitfall 1: Strategy Keywords With Too-Low Sample Size
**What goes wrong:** META-04 injects strategy hints derived from only 1-2 JSONL rows, biasing the runner toward strategies that succeeded by chance.
**Why it happens:** Early experiments have few rows. A strategy with 1 KEEP out of 1 total shows 100% keep rate.
**How to avoid:** Filter out strategies with `total < 3` before computing weights. If no strategy meets the threshold, inject no hint (graceful fallback).
**Warning signs:** strategy_weights shows "1/1 = 100%" entries in the hint block.

### Pitfall 2: Visual Diversity Score on Identical Concepts
**What goes wrong:** IDT-03 reports 0% diversity when all direction screenshots hash identically (all-white placeholder pages, empty HTML, or Playwright rendering failed silently).
**Why it happens:** If Playwright navigates to a blank page or the wireframe HTML is minimal, all screenshots may be visually identical.
**How to avoid:** Log per-screenshot hash in the IDT artifact. If unique_hashes = 1 and total > 1, warn: `[Low visual diversity — all concepts rendered identically. Check wireframe HTML completeness.]`
**Warning signs:** diversity_score = 0 with total screenshots > 1.

### Pitfall 3: Brief URL Capture Hanging on Slow Sites
**What goes wrong:** BREF-02 navigates to a live URL that is slow or requires login, causing playwright:navigate to hang.
**Why it happens:** External URLs have no timeout guarantee. Playwright MCP's default timeout may be long.
**How to avoid:** Use the TIMEOUT_MS = 30000ms guard pattern from dom-metric.cjs. Wrap the entire capture block in a timeout. On timeout: log `[Reference capture timed out — {url} did not respond within 30s]` and continue.
**Warning signs:** brief.md workflow appears to hang at Step 3b indefinitely.

### Pitfall 4: Pressure Test Visual Score Inflating Combined Score
**What goes wrong:** When Playwright is available, a visually simple artifact scores 80/100 on DOM structure (few elements = clean score), making the combined score look artificially high.
**Why it happens:** dom-metric.cjs rewards semantic element diversity, not design quality. A single-element page can score well.
**How to avoid:** The combined score formula uses visual_avg as a minority weight: `combined = (text_score * 0.65) + (visual_avg * 0.35)`. The text rubric (existing Awwwards tier) remains the dominant signal.
**Warning signs:** Pressure test combined score exceeds Awwwards text score significantly for simple fixtures.

### Pitfall 5: optimize.md Step 7 Prompt Bloat From Strategy Hints
**What goes wrong:** If there are many JSONL experiments with many strategy tags, the `<strategy_hint>` block becomes very long, consuming runner agent context.
**Why it happens:** Unbounded strategy tag extraction from all historical experiments.
**How to avoid:** Limit to top 3 strategies in the hint. Each hint entry is a single line. Total hint block is ~5 lines maximum.
**Warning signs:** Task() prompt for runner agent exceeds normal length significantly.

### Pitfall 6: Reference Screenshot Saved to Wrong Path
**What goes wrong:** BREF-02 saves reference screenshot to a path that downstream skills don't know about.
**Why it happens:** `.planning/design/references/` directory may not exist yet (created by pde-tools `design ensure-dirs`, but brief may run before that).
**How to avoid:** Always `mkdir -p .planning/design/references/` before writing. Check if `design ensure-dirs` already creates this path; if not, add it.
**Warning signs:** `ENOENT` error when playwright:screenshot tries to write the file.

## Code Examples

Verified patterns from project codebase:

### Playwright Probe Pattern (workflow prose)
```bash
# Source: optimize.md Step 6b (Phase 114)
# Use pde-tools mcp-probe, not require() — sandbox validator rejects require() in bash
PLAYWRIGHT_PROBE=$(node bin/pde-tools.cjs mcp-probe --tool playwright:screenshot 2>/dev/null)
if [ $? -eq 0 ]; then
  PLAYWRIGHT_AVAILABLE=true
else
  PLAYWRIGHT_AVAILABLE=false
fi
```

### Screenshot Capture Loop (workflow prose)
```bash
# Source: wireframe.md Step 5d (Phase 109) — model for BREF-02 and IDT-01
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
let navigateToolName = '', screenshotToolName = '', closeToolName = '';
try {
  navigateToolName   = b.call('playwright:navigate',   { url: 'about:blank' }).toolName;
  screenshotToolName = b.call('playwright:screenshot',  {}).toolName;
  closeToolName      = b.call('playwright:close',       {}).toolName;
} catch (err) {
  navigateToolName = screenshotToolName = closeToolName = '';
}
process.stdout.write(JSON.stringify({ navigateToolName, screenshotToolName, closeToolName }) + '\n');
EOF
```

### Metric Script Invocation (pressure-test.md Step 5b)
```bash
# Source: dom-metric.cjs invocation pattern (Phase 111)
# Call each visual metric script as subprocess — never require() them
MOCKUP_PATH=".planning/design/ux/mockups/mockup-main.html"
DOM_SCORE=$(node bin/dom-metric.cjs "$MOCKUP_PATH" 2>/dev/null | tail -1)
A11Y_SCORE=$(node bin/a11y-metric.cjs "$MOCKUP_PATH" 2>/dev/null | tail -1)
CONTRAST_SCORE=$(node bin/contrast-metric.cjs "$MOCKUP_PATH" 2>/dev/null | tail -1)
VISUAL_AVG=$(node -e "console.log(Math.round(($DOM_SCORE + $A11Y_SCORE + $CONTRAST_SCORE) / 3))")
```

### Combined Score Formula (PRES-03)
```javascript
// Combined score: text rubric (65%) + visual metrics average (35%)
// text_score: from evaluator JSON, range 1-10 (Awwwards scale)
// visual_avg: from metric scripts, range 0-100 — normalize to 0-10 first
const visualNormalized = visual_avg / 10;  // 0-100 -> 0-10
const combinedScore = (text_score * 0.65) + (visualNormalized * 0.35);
```

### Nyquist Test Structure (Phase 116 pattern)
```javascript
// Source: tests/phase-114/visual-regression.test.mjs + tests/phase-115/multi-candidate.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

describe('PRES-01: pressure-test.md visual scoring prose present', () => {
  it('pressure-test.md contains Step 5b visual scoring block', () => {
    const content = fs.readFileSync(`${ROOT}/workflows/pressure-test.md`, 'utf-8');
    assert.ok(content.includes('Step 5b'), 'Missing Step 5b visual scoring block');
    assert.ok(content.includes('visual_avg'), 'Missing visual_avg computation');
    assert.ok(content.includes('dom-metric'), 'Missing dom-metric call');
  });
});
```

### strategy-weights.cjs Module Structure
```javascript
// Source: pattern from bin/lib/experiment-runner.cjs (under 150 lines target)
'use strict';
const fs = require('fs');
const path = require('path');

const MIN_SAMPLE = 3;

function computeStrategyWeights(cwd, limit = 3) {
  const experimentsDir = path.join(cwd, '.planning', 'experiments');
  if (!fs.existsSync(experimentsDir)) return [];

  const strategyMap = new Map();
  try {
    for (const slug of fs.readdirSync(experimentsDir)) {
      const jsonlPath = path.join(experimentsDir, slug, 'results.jsonl');
      if (!fs.existsSync(jsonlPath)) continue;
      const lines = fs.readFileSync(jsonlPath, 'utf-8').split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const row = JSON.parse(line);
          const tags = extractTags(row.description || '');
          for (const tag of tags) {
            const entry = strategyMap.get(tag) || { keep: 0, total: 0 };
            entry.total++;
            if (row.status === 'KEEP') entry.keep++;
            strategyMap.set(tag, entry);
          }
        } catch { /* skip malformed rows */ }
      }
    }
  } catch { return []; }

  return Array.from(strategyMap.entries())
    .map(([tag, { keep, total }]) => ({ tag, keep_rate: total > 0 ? keep / total : 0, total }))
    .filter(s => s.total >= MIN_SAMPLE)
    .sort((a, b) => b.keep_rate - a.keep_rate)
    .slice(0, limit);
}

function extractTags(description) {
  // Extract strategy keywords from runner description strings
  // e.g. "clarified heading hierarchy in Step 3" -> ["heading", "hierarchy", "step-3"]
  const words = description.toLowerCase().split(/\s+/);
  return words.filter(w => w.length > 4 && /^[a-z]+$/.test(w));
}

module.exports = { computeStrategyWeights, extractTags };
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static mutation strategy (runner picks randomly) | History-weighted strategy hints from JSONL | Phase 116 | Runner agent receives soft guidance toward proven strategies; does not eliminate diversity |
| Text-only pressure test (Awwwards rubric) | Combined text + visual score (65/35 weight) | Phase 116 | Pressure test now detects DOM structure and a11y regressions, not just text quality |
| Ideation divergence measured only by text distinctiveness | Screenshot variance as diversity proxy | Phase 116 | Machine-measurable, not just qualitative — but only when Playwright available |
| Brief workflow has no reference material | Optional URL screenshot capture | Phase 116 | Designer can capture competitor/reference screenshots at project inception |

**Not changed:**
- `_evalMetric` contract (exit 0, stdout = numeric score) — unchanged
- `JSONL_ROW_FIELDS` — no new fields added for Phase 116 (strategy uses existing `description` + `status`)
- Awwwards rubric weights (Design 40%, Usability 30%, Creativity 20%, Content 10%) — unchanged
- Playwright tool name mapping in mcp-bridge.cjs — unchanged

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js built-ins (fs, path, crypto) | All new CJS modules | Available | Node.js (project requirement) | — |
| bin/dom-metric.cjs | PRES-02 | Available (Phase 111) | — | Returns 0 when Playwright unavailable |
| bin/a11y-metric.cjs | PRES-02 | Available (Phase 111) | — | Returns 0 when Playwright unavailable |
| bin/contrast-metric.cjs | PRES-02 | Available (Phase 111) | — | Returns 0 when Playwright unavailable |
| bin/lib/visual-regression.cjs hashScreenshot() | IDT-02 | Available (Phase 114) | — | — |
| Playwright MCP | PRES-02, IDT-01, BREF-01 | Runtime-dependent | — | All four features degrade gracefully to text-only |
| .planning/experiments/ JSONL | META-03 | Available when experiments exist | — | Empty weights array when no history — no hint injected |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** Playwright MCP (all 4 features degrade gracefully per PRES-04, META-04 does not use Playwright, IDT-04, BREF-04).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` |
| Config file | none — each test file is run directly |
| Quick run command | `node --test tests/phase-116/*.test.mjs` |
| Full suite command | `node --test tests/**/*.test.mjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PRES-01 | pressure-test.md contains Step 5b visual scoring prose | unit (prose check) | `node --test tests/phase-116/pressure-test-visual.test.mjs` | No — Wave 0 |
| PRES-02 | Step 5b calls dom-metric, a11y-metric, contrast-metric | unit (prose check) | `node --test tests/phase-116/pressure-test-visual.test.mjs` | No — Wave 0 |
| PRES-03 | Combined score formula present in prose/report template | unit (prose check) | `node --test tests/phase-116/pressure-test-visual.test.mjs` | No — Wave 0 |
| PRES-04 | Playwright unavailable path skips visual scoring (degrade) | unit (prose check) | `node --test tests/phase-116/pressure-test-visual.test.mjs` | No — Wave 0 |
| META-01 | strategy-weights.cjs exports computeStrategyWeights | unit | `node --test tests/phase-116/meta-optimization.test.mjs` | No — Wave 0 |
| META-02 | extractTags returns keyword array from description | unit | `node --test tests/phase-116/meta-optimization.test.mjs` | No — Wave 0 |
| META-03 | computeStrategyWeights reads JSONL, returns sorted weights | unit (tmp fixture) | `node --test tests/phase-116/meta-optimization.test.mjs` | No — Wave 0 |
| META-04 | optimize.md Step 7 contains strategy_hint injection prose | unit (prose check) | `node --test tests/phase-116/meta-optimization.test.mjs` | No — Wave 0 |
| IDT-01 | ideate.md contains visual diversity scoring prose | unit (prose check) | `node --test tests/phase-116/ideation-visual.test.mjs` | No — Wave 0 |
| IDT-02 | visual-diversity-metric.cjs exports computeVisualDiversity | unit | `node --test tests/phase-116/ideation-visual.test.mjs` | No — Wave 0 |
| IDT-03 | diversity score = unique_hashes/total * 100 | unit | `node --test tests/phase-116/ideation-visual.test.mjs` | No — Wave 0 |
| IDT-04 | Playwright unavailable path degrades gracefully | unit (prose check) | `node --test tests/phase-116/ideation-visual.test.mjs` | No — Wave 0 |
| BREF-01 | brief.md contains reference capture Step 3b prose | unit (prose check) | `node --test tests/phase-116/brief-reference.test.mjs` | No — Wave 0 |
| BREF-02 | --reference-url flag parsed and URL captured | unit (prose check) | `node --test tests/phase-116/brief-reference.test.mjs` | No — Wave 0 |
| BREF-03 | Reference saved to .planning/design/references/ path | unit (prose check) | `node --test tests/phase-116/brief-reference.test.mjs` | No — Wave 0 |
| BREF-04 | Missing --reference-url skips capture silently | unit (prose check) | `node --test tests/phase-116/brief-reference.test.mjs` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/phase-116/*.test.mjs`
- **Per wave merge:** `node --test tests/**/*.test.mjs` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-116/pressure-test-visual.test.mjs` — covers PRES-01-04
- [ ] `tests/phase-116/meta-optimization.test.mjs` — covers META-01-04
- [ ] `tests/phase-116/ideation-visual.test.mjs` — covers IDT-01-04
- [ ] `tests/phase-116/brief-reference.test.mjs` — covers BREF-01-04
- [ ] `bin/lib/strategy-weights.cjs` — new module for META-01-03
- [ ] `bin/visual-diversity-metric.cjs` — new script for IDT-01-03

## Open Questions

1. **Where exactly in optimize.md does strategy hint injection go?**
   - What we know: optimize.md Step 7 dispatches the runner agent via Task(). The prompt is built inline in the step.
   - What's unclear: Whether `<strategy_hint>` should go in the Task() prompt `<additional_context>` block or as a separate XML tag.
   - Recommendation: Add it as a new `<strategy_hint>` tag inside the existing `<additional_context>` block in the Task() prompt for the runner agent. Keep it conditional: only inject if `strategyWeights.length > 0`.

2. **Does .planning/design/references/ need to be created by pde-tools design ensure-dirs?**
   - What we know: `design ensure-dirs` creates directories. The current directory list may not include `references/`.
   - What's unclear: Whether `ensure-dirs` already creates this path.
   - Recommendation: Use `mkdir -p .planning/design/references/` inline in brief.md Step 3b rather than extending ensure-dirs. Simpler change, no pde-tools modification needed.

3. **How should the IDT visual diversity step interact with Stitch visual variants (--diverge flag)?**
   - What we know: ideate.md Step 4-STITCH already generates `STH-ideate-direction-{i}.png` files per direction.
   - What's unclear: IDT-01-04 spec says "screenshot variance across generated concepts" — should it screenshot the Stitch PNGs or take new browser screenshots of direction HTML?
   - Recommendation: When Stitch PNGs exist (DIVERGE_STITCH was true), hash those directly (no new Playwright screenshot needed). When Stitch PNGs don't exist, there is no HTML to screenshot for ideation directions. IDT visual scoring applies only when `--diverge` was used and Stitch PNGs are present. Fallback: text-only diversity when neither Playwright nor Stitch variants available.

4. **What artifacts does the pressure test Step 5b score?**
   - What we know: pressure-test.md Step 5/7 already scans for MOCKUP_ARTIFACTS (mockup-*.html). These are the most browser-renderable artifacts.
   - What's unclear: Should it score all mockups, or just the first one?
   - Recommendation: Score all found mockup HTML files (same loop as evaluator artifact scan), average across files. If no mockups found (compliance failure upstream), visual_avg = 0.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis — all files read directly from project source:
  - `workflows/pressure-test.md` — current Awwwards rubric structure, Step 5/7 evaluator pattern
  - `workflows/optimize.md` — Step 7 Task() dispatch, circuit breaker structure, Step 6b Playwright probe
  - `workflows/ideate.md` — Step 4-STITCH Stitch PNG pattern, Step 7 artifact write
  - `workflows/wireframe.md` Step 5d — canonical screenshot capture loop pattern
  - `bin/dom-metric.cjs` — _evalMetric contract, Playwright probe/degrade pattern
  - `bin/lib/visual-regression.cjs` — hashScreenshot(), captureAndStoreBaseline() implementations
  - `bin/lib/experiment-runner.cjs` — _writeJsonlRow(), JSONL field structure
  - `bin/lib/experiment-schema.cjs` — JSONL_ROW_FIELDS constant (14 fields)
  - `bin/lib/mcp-bridge.cjs` — TOOL_MAP playwright entries, bridge.call() pattern
  - `.planning/REQUIREMENTS.md` — PRES/META/IDT/BREF requirement text, Out of Scope constraints
  - `.planning/phases/116-pressure-test-meta-optimization-ideation-brief-reference/116-CONTEXT.md` — locked decisions
  - `.planning/STATE.md` — prior phase decisions affecting Phase 116
  - `.planning/config.json` — nyquist_validation: true confirmed
  - `tests/phase-115/multi-candidate.test.mjs` — Nyquist test structure pattern
  - `tests/phase-114/visual-regression.test.mjs` — Nyquist test structure pattern

### Secondary (MEDIUM confidence)
- None required — all findings verified directly from codebase.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are project-internal, directly verified
- Architecture patterns: HIGH — derived from code reading of existing Phase 108-115 implementations
- Pitfalls: HIGH — derived from STATE.md decision log (prior phase pitfalls documented in situ)
- Test structure: HIGH — direct pattern match from phases 114-115 test files

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable — all dependencies are project-internal)
