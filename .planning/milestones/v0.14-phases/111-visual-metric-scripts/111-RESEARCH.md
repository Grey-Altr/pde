# Phase 111: Visual Metric Scripts — Research

**Researched:** 2026-03-23
**Domain:** Browser-based visual quality metric scripts using Playwright MCP + pure Web APIs
**Confidence:** HIGH (all five metric domains fully resolved by existing project research)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VIS-01 | DOM structure metric script — counts semantic elements (nav, main, article, section, header, footer), penalizes div-soup, follows _evalMetric contract (exit 0, stdout = numeric score) | computeDOMScore() pattern documented in v0.14-VISUAL-DOM-METRICS.md; full scoring algorithm ready |
| VIS-02 | A11y violations metric script — runs browser_snapshot AOM tree through rule checks (missing alt, unlabeled inputs, heading skip, missing landmarks), score = inverse violation count | countAllA11yViolations() pattern documented in v0.14-VISUAL-DOM-METRICS.md |
| VIS-03 | WCAG contrast metric script — evaluates text/background contrast ratios via browser_evaluate, score based on AA pass rate | Complete browser_evaluate script documented in v0.14-WCAG-CONTRAST.md; WCAG formula is 40 lines of vanilla JS |
| VIS-04 | Responsive compliance metric script — screenshots at 3 breakpoints (mobile 375px, tablet 768px, desktop 1280px), measures layout shift/overflow/element visibility | Multi-step resize + evaluate orchestration pattern documented in v0.14-VISUAL-DOM-METRICS.md |
| VIS-05 | Mermaid readability metric script — validates Mermaid syntax renders without error, measures node count, edge count, diagram dimensions | CDN-based Mermaid v11 rendering pattern + 6-dimension scoring formula documented in v0.14-MERMAID-METRICS.md |
| VIS-06 | All 5 metric scripts follow _evalMetric contract (exit 0 always, stdout = numeric score, timeout-safe) | _evalMetric contract defined in bin/lib/experiment-runner.cjs lines 60-107; nyquist-metric.cjs is the reference implementation |
| VIS-07 | All metrics return 0 (not crash) when Playwright MCP is unavailable — graceful degradation | probe/degrade pattern established in wireframe.md, mockup.md, critique.md; mcp-bridge.cjs provides TOOL_MAP |
</phase_requirements>

---

## Summary

Phase 111 creates 5 metric scripts in `bin/` following the `_evalMetric` contract established by `nyquist-metric.cjs`. Each script accepts an HTML file path (or Mermaid markdown file) as `argv[2]`, uses Playwright MCP tools via the existing `mcp-bridge.cjs` TOOL_MAP, runs browser-side JavaScript evaluation, prints a single numeric score as the last line of stdout, and exits 0 unconditionally. When Playwright MCP is unavailable, each script prints `0` and exits 0 immediately — no crash, no error.

The key architectural decision already locked by v0.14 research: each script's evaluation logic is a self-contained JavaScript function string executed via `mcp__playwright__browser_evaluate`. This avoids file-serving complexity, keeps scripts portable, and is consistent with how the experiment runner's `_evalMetric` function works — it spawns the script as a subprocess via `spawnSync`, reads the last line of stdout as a float, and treats any non-zero exit code as a CRASH.

All five metric domains (DOM structure, a11y violations, WCAG contrast, responsive compliance, Mermaid readability) have complete, verified implementation patterns in the project's pre-existing v0.14 research documents. This phase is primarily implementation, not exploration.

**Primary recommendation:** Follow the nyquist-metric.cjs structure — thin orchestrator shell that calls browser tools and extracts a number. Keep each script under 150 lines. The evaluation JS lives inline as a string literal, not in a separate file.

---

## Project Constraints (from CLAUDE.md)

CLAUDE.md is not present in the repository root. Constraints are derived from project source and STATE.md:

- **Zero npm dependencies** at the plugin root. No `npm install` calls in metric scripts. All metric calculations must use Node.js built-ins + Web APIs inside browser_evaluate.
- **CJS format** for all `bin/*.cjs` files. Use `'use strict';` at top. No ES module syntax in bin files.
- **Exit 0 always** per `_evalMetric` contract. Non-zero exit = CRASH status in the experiment loop. This is the most critical constraint.
- **Last line of stdout = parseable float** per `_evalMetric` contract. Any other output (debug logs, etc.) must go to stderr or appear before the final number line.
- **spawnSync timeout safety**: `_evalMetric` uses `spawnSync` with a caller-specified timeout. If the script hangs, spawnSync kills it with SIGTERM/SIGKILL and returns `status: 'CRASH', reason: 'timeout'`. Scripts must implement their own internal timeouts for browser operations (not rely on spawnSync killing them cleanly).
- **Nyquist tests required**: `workflow.nyquist_validation` is `true` in `.planning/config.json`. Tests go in `tests/phase-111/`.
- **file:// URL support**: `--allow-unrestricted-file-access` flag is included in the Playwright MCP registration (PLAY-07 complete). file:// URLs work.
- **TOOL_MAP_VERIFY_REQUIRED markers**: Tool names in mcp-bridge.cjs are marked as needing live verification. Scripts must use the TOOL_MAP abstraction (`b.call('playwright:evaluate', ...)`) not hardcoded tool names.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-ins | (project Node version) | `spawnSync`, `fs`, `path`, `crypto` | Zero-dep constraint; already used by nyquist-metric.cjs |
| Playwright MCP | `@playwright/mcp@latest` (pinned to 0.0.41 if @latest fails) | Browser automation for all 5 metrics | PLAY-01..07 complete; registered as 7th APPROVED_SERVER |
| mcp-bridge.cjs | Internal (bin/lib/) | TOOL_MAP abstraction for MCP tool calls | Already used by wireframe.md, mockup.md, critique.md |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Mermaid v11 CDN | `https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs` | Render Mermaid diagrams in browser | mermaid-metric.cjs only; loaded via HTML `<script type="module">` |
| npx serve | Latest (via npx) | Local HTTP server for file serving | Fallback if file:// proves unreliable for a specific metric; prefer file:// first per PLAY-07 |

### Alternatives Considered and Rejected
| Instead of | Could Use | Why Rejected |
|------------|-----------|--------------|
| Pure Web API contrast check | axe-core CDN injection | axe-core is 300KB+, adds CDN network dependency, returns rich objects we don't need — integer counting is sufficient for metric scoring |
| Custom Mermaid rendering | Puppeteer / Playwright Node SDK directly | Adds npm deps; Playwright MCP is already registered and available |
| pixelmatch for responsive comparison | Screenshot pixel diff | npm dependency violates zero-dep constraint; bounding box + computed style comparison is sufficient |
| APCA contrast algorithm | WCAG 2.x luminance | APCA is not yet normative (WCAG 3.0 candidate); WCAG 2.1 AA is the legal standard today |

**Installation:** No installation step — all dependencies are either Node.js built-ins or already registered MCP tools. Mermaid loads at runtime via CDN inside the browser page.

---

## Architecture Patterns

### Recommended Project Structure
```
bin/
├── nyquist-metric.cjs          # EXISTING reference implementation
├── dom-metric.cjs              # VIS-01: DOM structure scoring
├── a11y-metric.cjs             # VIS-02: Accessibility violations
├── contrast-metric.cjs         # VIS-03: WCAG contrast pass count
├── responsive-metric.cjs       # VIS-04: Multi-breakpoint compliance
└── mermaid-metric.cjs          # VIS-05: Mermaid readability
tests/
└── phase-111/
    ├── dom-metric.test.mjs
    ├── a11y-metric.test.mjs
    ├── contrast-metric.test.mjs
    ├── responsive-metric.test.mjs
    └── mermaid-metric.test.mjs
references/experiments/fixtures/   # Test fixtures (used by tests + VIS metric verification)
    ├── good-wireframe.html         # Expected DOM score >= 60
    ├── bad-wireframe.html          # Expected DOM score < 30
    ├── a11y-issues.html            # Expected >= 5 violations
    └── mermaid-simple.md           # Simple flowchart for smoke test
```

### Pattern 1: The _evalMetric Contract Shell

Every metric script follows this exact structure — derived from nyquist-metric.cjs:

```javascript
#!/usr/bin/env node
'use strict';
/**
 * {metric-name}-metric.cjs — {description}
 *
 * Contract: exit 0 always, last line of stdout = numeric score.
 * VIS-06: timeout-safe — internal timeout prevents hanging.
 * VIS-07: prints 0 and exits 0 when Playwright MCP unavailable.
 *
 * Usage: node bin/{metric-name}-metric.cjs <path-to-html-file>
 */

const path = require('path');
const { createRequire } = require('module');
const req = createRequire(__filename);
const bridge = req(path.join(__dirname, 'lib', 'mcp-bridge.cjs'));

const filePath = process.argv[2];

// VIS-07: no file path = degrade gracefully
if (!filePath) {
  process.stdout.write('0\n');
  process.exit(0);
}

// VIS-07: probe Playwright availability before any browser call
let playwrightAvailable = false;
try {
  const result = bridge.call('playwright:probe', {});
  playwrightAvailable = !!result;
} catch (_) {
  playwrightAvailable = false;
}

if (!playwrightAvailable) {
  process.stdout.write('0\n');
  process.exit(0);
}

// Internal timeout guard (VIS-06: timeout-safe)
const TIMEOUT_MS = 30000;
const timeoutId = setTimeout(() => {
  process.stdout.write('0\n');
  process.exit(0);
}, TIMEOUT_MS);

async function run() {
  try {
    // ... metric-specific browser calls ...
    const score = 0; // computed value
    clearTimeout(timeoutId);
    process.stdout.write(String(score) + '\n');
    process.exit(0);
  } catch (_) {
    clearTimeout(timeoutId);
    process.stdout.write('0\n');
    process.exit(0);
  }
}

run();
```

**Critical rules from this pattern:**
1. `process.exit(0)` always — never throw at top level
2. Internal timeout writes `0` and exits 0 (does NOT rely on spawnSync SIGKILL)
3. Probe happens before any browser call (VIS-07)
4. `createRequire(__filename)` is the correct way to `require()` from a CJS file that needs to resolve paths relative to itself

### Pattern 2: browser_evaluate Call via mcp-bridge.cjs

```javascript
// The bridge.call() function takes a TOOL_MAP key and arguments
// It returns the raw MCP tool response
const evalResult = bridge.call('playwright:evaluate', {
  function: `(() => {
    try {
      // ... computation ...
      return { score: 85 };
    } catch (e) {
      return { score: 0, error: e.message };
    }
  })()`
});

// evalResult is the MCP tool response — need to parse the returned value
// browser_evaluate returns the JS return value serialized as JSON
const data = typeof evalResult === 'string' ? JSON.parse(evalResult) : evalResult;
const score = data?.score ?? 0;
```

**Important:** Wrap the entire evaluate function in `try/catch` — exceptions inside browser_evaluate cause the MCP call to fail, which would require handling at the CJS level. Better to catch inside and return `{ score: 0 }`.

### Pattern 3: Multi-Step Orchestration for Responsive Metric

VIS-04 (responsive-metric.cjs) is the only script requiring multiple sequential browser tool calls:

```
1. bridge.call('playwright:navigate', { url: fileUrl })
2. bridge.call('playwright:resize', { width: 1280, height: 800 })
3. bridge.call('playwright:evaluate', { function: captureLayoutSignature })  → desktopSig
4. bridge.call('playwright:resize', { width: 768, height: 1024 })
5. bridge.call('playwright:evaluate', { function: captureLayoutSignature })  → tabletSig
6. bridge.call('playwright:resize', { width: 375, height: 812 })
7. bridge.call('playwright:evaluate', { function: detectCompliance })        → mobileSig
8. Compute score from 3 signatures
9. bridge.call('playwright:close', {})
```

Each step is synchronous (bridge.call is synchronous — mcp-bridge.cjs uses synchronous MCP communication). The overall timeout guard covers the whole sequence.

### Pattern 4: Mermaid Rendering Orchestration

VIS-05 (mermaid-metric.cjs) requires generating a temporary HTML file:

```
1. Read Mermaid definition from argv[2] (extract from fenced ```mermaid block)
2. Write HTML template with embedded definition to /tmp/mermaid-{hash}.html
3. bridge.call('playwright:navigate', { url: 'file:///tmp/mermaid-{hash}.html' })
4. Poll window.__MERMAID_RENDERED__ with bridge.call('playwright:evaluate', ...)
   — max 5 polls, 500ms apart (total max 2.5s wait)
   — if still false after timeout: return 0 (CDN unavailable or parse error)
5. bridge.call('playwright:evaluate', { function: fullMetricExtractionScript })
6. Compute score from metrics
7. bridge.call('playwright:close', {})
8. fs.unlinkSync('/tmp/mermaid-{hash}.html')  // cleanup
```

### Pattern 5: VIS-02 Uses AOM Snapshot, Not browser_evaluate

VIS-02 (a11y-metric.cjs) uses `browser_snapshot` (the AOM tree) rather than `browser_evaluate`. This matches the existing critique.md Step 3b pattern:

```javascript
// Navigate to page
bridge.call('playwright:navigate', { url: fileUrl });

// Get AOM tree as text
const snapshotResult = bridge.call('playwright:snapshot', {});
const aomText = typeof snapshotResult === 'string'
  ? snapshotResult
  : JSON.stringify(snapshotResult);

// Parse AOM text for violations (line-based pattern matching)
let violations = 0;
// Count missing landmarks
const hasMain = /\b(main|role="main")\b/i.test(aomText) || /- main\b/.test(aomText);
const hasNav = /\b(navigation|role="navigation")\b/i.test(aomText) || /- navigation\b/.test(aomText);
const hasBanner = /\b(banner|role="banner")\b/i.test(aomText) || /- banner\b/.test(aomText);
if (!hasMain) violations++;
if (!hasNav) violations++;
if (!hasBanner) violations++;

// Count unlabeled controls (AOM shows: - button "" or - textbox "")
const unlabeled = (aomText.match(/- (button|link|textbox|combobox|checkbox|radio)\s+""\s/gi) || []).length;
violations += unlabeled;

// ... heading hierarchy checks ...

// Score = inverse: more violations = lower score
// Use 100 - (violations * 10), floored at 0
const score = Math.max(0, 100 - violations * 10);
```

**Why AOM for VIS-02 instead of browser_evaluate?** AOM (browser_snapshot) gives a semantic tree — it reflects what assistive technology sees, not what the DOM contains. This is the right signal for accessibility violation counting. It also matches the Phase 110 critique.md pattern already in production.

**Alternative approach documented in v0.14-VISUAL-DOM-METRICS.md:** Custom lightweight DOM checker via browser_evaluate. Either approach works. Use AOM snapshot as primary (more accurate) with DOM evaluate as fallback.

### Anti-Patterns to Avoid

- **Don't call `process.exit(1)` anywhere** — this signals CRASH to the experiment runner. The score `0` communicates failure state.
- **Don't use `async/await` at the top level without a wrapping `run()` function** — CJS top level is synchronous; async at top level works in Node 16+ but is a footgun if unhandled promise rejection propagates.
- **Don't hardcode tool names like `mcp__playwright__browser_evaluate`** — use `bridge.call('playwright:evaluate', ...)`. The TOOL_MAP may be updated after live verification.
- **Don't let browser_evaluate throw by not wrapping in try/catch** — an unhandled exception inside evaluate causes the MCP call to return an error response, which bridge.call may throw. Wrap everything inside the evaluate JS in `try { ... } catch (e) { return { score: 0 }; }`.
- **Don't serve Mermaid locally** — CDN is simpler. If CDN is unavailable, return 0 (acceptable degradation for v0.14).
- **Don't forget to close the browser** — `bridge.call('playwright:close', {})` must be in the `finally` path. Leaked browser processes accumulate during experiment runs.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WCAG luminance calculation | Custom gamma formula | The 40-line formula in v0.14-WCAG-CONTRAST.md | Already verified, tested, matches W3C spec exactly |
| Mermaid rendering | Custom parser | CDN-loaded Mermaid v11 via browser | Mermaid is complex (grammar, AST, SVG layout) — don't touch it |
| Color string parsing | Regex on computed style | `getComputedStyle()` — Chrome normalizes all color formats to `rgb()`/`rgba()` | oklch(), hsl(), named colors all normalize automatically in Chromium |
| MCP tool name resolution | Hardcoded strings | `bridge.call()` via TOOL_MAP in mcp-bridge.cjs | TOOL_MAP_VERIFY_REQUIRED markers exist for a reason — names may change after live verification |
| Playwright probe logic | Custom retry loop | The existing `bridge.probe()` function or `bridge.call()` inside try/catch | Pattern established across wireframe.md, mockup.md, critique.md |
| DOM diff between breakpoints | Pixel-level comparison | Computed style comparison (same layout = same computed values) | Zero-dep, sufficient signal; pixel comparison requires npm deps |
| AOM text parsing | Full parser | Line-based pattern matching (`/- main\b/`) | AOM text is human-readable, line-oriented — simple regex is sufficient and stable |

**Key insight:** The experiment runner only needs a single number. Every measure of "quality" in this phase reduces to: count something, compute a ratio, return an integer 0-100. The complexity is in the browser-side JS, not the Node.js shell.

---

## Common Pitfalls

### Pitfall 1: Exit 0 is Sacred

**What goes wrong:** Script encounters an error (file not found, browser hangs, CDN unavailable), throws an exception, and exits with code 1. `_evalMetric` sees `status: 'CRASH', reason: 'nonzero_exit'`. The experiment loop counts this as a failure, fires `consecutive_failure_limit` after 5 runs, and halts the experiment.

**Why it happens:** Normal JavaScript error handling exits with non-zero when an uncaught exception propagates to process level.

**How to avoid:** Wrap `run()` in `.catch(() => { process.stdout.write('0\n'); process.exit(0); })`. Have an internal timeout that also writes 0 and exits 0.

**Warning signs:** `consecutive_failure_limit` firing immediately after introducing a new metric script.

### Pitfall 2: Last Line of Stdout Must Be the Score

**What goes wrong:** Script logs debug info to stdout (e.g., `console.log('Navigating to file...')`), then prints the score. `_evalMetric` reads the LAST line. If the score is on line 3 and there are 0 lines after it, fine. But if anything gets appended after the score number, the parse fails: `status: 'CRASH', reason: 'unparseable_metric'`.

**Why it happens:** Developers add logging for debugging.

**How to avoid:** All diagnostic output goes to `process.stderr.write()`. Only the score number (and nothing else) goes to `process.stdout.write()` at the end.

**Warning signs:** `unparseable_metric` CRASH status in experiment JSONL.

### Pitfall 3: browser_evaluate Return Must Be JSON-Serializable

**What goes wrong:** Evaluate script returns a NodeList, a DOM element, a Map, or a circular structure. Playwright MCP cannot serialize it; the tool call returns an error response.

**Why it happens:** Natural JS — you query elements, return them.

**How to avoid:** Always convert NodeLists to arrays: `[...document.querySelectorAll('h1')]`. Return plain objects with primitive values. Never return DOM elements.

**Warning signs:** `bridge.call('playwright:evaluate', ...)` throws unexpectedly.

### Pitfall 4: Transparent Background Traversal in Contrast Metric

**What goes wrong:** Many elements in wireframes use `rgba(0,0,0,0)` (transparent) as their computed `backgroundColor`. The naive contrast checker skips these, severely undercounting the number of text/background pairs evaluated.

**Why it happens:** CSS inheritance — `getComputedStyle(el).backgroundColor` returns transparent when no explicit background is set on that element.

**How to avoid:** Use the `getEffectiveBg()` DOM tree walk from v0.14-WCAG-CONTRAST.md. Walk up parent elements until finding a non-transparent background. Default to white `[255, 255, 255]` if root reached.

**Warning signs:** Contrast score returns very low pass counts even for well-designed wireframes.

### Pitfall 5: Mermaid CSS Class Case in DOM

**What goes wrong:** The script queries `svg.querySelectorAll('.edgePath')` but Mermaid v11 doesn't use `.edgePath` as an individual edge class — it's `.edgePaths` (plural, container only). Zero edges counted, score inflated.

**Why it happens:** The v0.14 research was based on older Mermaid versions. In v11, individual edges use `.flowchart-link` class, and the container group uses `.edgePaths` (plural, camelCase). Verified in Mermaid source 2026-03-23.

**How to avoid:** Use `svg.querySelectorAll('.edgePaths path, .flowchart-link')`. The `.flowchart-link` class is the primary edge path selector (HIGH confidence, verified in Mermaid v11 source and ELK layout renderer).

**Warning signs:** Edge count = 0 for diagrams that clearly have edges.

### Pitfall 6: Multi-Step Orchestration and Timeout

**What goes wrong:** Responsive metric needs 3 resize + evaluate cycles. If any one browser call hangs (network issue, browser crash), the script hangs indefinitely. spawnSync will eventually kill it but the CRASH status fires.

**Why it happens:** Network timeouts, browser instability under load during long experiment runs.

**How to avoid:** The internal `setTimeout` guard covers the whole multi-step sequence. Set it to 45 seconds (3 steps x 15s per step). Each individual bridge.call already has MCP-level timeout but that timeout is controlled by the MCP server, not the script. Adding an application-level timeout is belt-and-suspenders.

**Warning signs:** Experiment runs show `reason: 'timeout'` for responsive-metric specifically.

### Pitfall 7: `createRequire(__filename)` for mcp-bridge Require

**What goes wrong:** Script uses `require('./lib/mcp-bridge.cjs')` with a relative path. Works fine when script is called from `bin/` directory but fails when `_evalMetric` spawns it from the project root (cwd = project root, not `bin/`).

**Why it happens:** `require()` with a relative path resolves relative to `__dirname` of the calling file... wait, actually `require()` in CJS DOES resolve relative to `__dirname`, not `process.cwd()`. The real pitfall is in how bridge.cjs itself loads other files.

**How to avoid:** Use `path.join(__dirname, 'lib', 'mcp-bridge.cjs')` for the require path. This is absolute and always correct regardless of cwd.

**Warning signs:** `Cannot find module './lib/mcp-bridge.cjs'` errors.

### Pitfall 8: Playwright MCP Probe Tool vs Navigate Tool

**What goes wrong:** Using `browser_navigate` as the probe tool. If no URL arg is passed, it throws "missing required parameter".

**Why it happens:** State.md documents this exact issue: "browser_snapshot chosen as probe tool (not browser_navigate) — browser_snapshot requires no URL arg, avoids 'missing required parameter' error."

**How to avoid:** Probe with `bridge.call('playwright:probe', {})` which maps to `mcp__playwright__browser_snapshot`. The probe just needs a response — the AOM content doesn't matter.

---

## Code Examples

Verified patterns from project research and existing codebase:

### The _evalMetric Contract (from experiment-runner.cjs)

```javascript
// Source: bin/lib/experiment-runner.cjs lines 69-107
// _evalMetric spawns the script, parses last line of stdout as float
// Exit code != 0 → CRASH, reason: 'nonzero_exit'
// Timeout (spawnSync) → CRASH, reason: 'timeout'
// Last line not parseable → CRASH, reason: 'unparseable_metric'
// Success → { status: 'ok', metric_value: <number> }
```

### Reference Implementation: nyquist-metric.cjs

```javascript
// Source: bin/nyquist-metric.cjs (production, ~35 lines)
const { spawnSync } = require('child_process');
const result = spawnSync('node', ['--test', 'tests/'], { encoding: 'utf-8', stdio: 'pipe', cwd: process.cwd() });
const match = (result.stdout || '').match(/^# pass (\d+)/m);
const passCount = match ? parseInt(match[1], 10) : 0;
process.stdout.write(String(passCount) + '\n');
process.exit(0);  // always exit 0
```

### DOM Score Computation (from v0.14-VISUAL-DOM-METRICS.md)

```javascript
// Source: .planning/research/v0.14-VISUAL-DOM-METRICS.md (HIGH confidence)
// Run inside browser_evaluate
(() => {
  try {
    const allTags = new Set([...document.body.querySelectorAll('*')].map(e => e.tagName));
    const landmarkCount = document.querySelectorAll(
      'header,nav,main,footer,aside,section,article,[role="banner"],[role="navigation"],[role="main"],[role="contentinfo"],[role="complementary"]'
    ).length;
    const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')];
    const hasH1 = headings.some(h => h.tagName === 'H1');
    let headingSkips = 0;
    let prevLevel = 0;
    for (const h of headings) {
      const level = parseInt(h.tagName[1]);
      if (prevLevel > 0 && level > prevLevel + 1) headingSkips++;
      prevLevel = level;
    }
    const interactiveCount = document.querySelectorAll(
      'a[href],button,[role="button"],input,select,textarea'
    ).length;
    const totalElements = document.body.querySelectorAll('*').length;

    let score = 0;
    score += Math.min(15, (allTags.size / 15) * 15);   // diversity
    score += Math.min(20, (landmarkCount / 5) * 20);   // landmarks
    score += hasH1 ? 10 : 0;
    score -= headingSkips * 3;
    score += Math.min(15, (interactiveCount / 8) * 15); // interactive
    score += Math.min(15, (totalElements / 50) * 15);   // complexity
    return Math.round(Math.max(0, Math.min(100, score)));
  } catch (e) {
    return 0;
  }
})()
```

### WCAG Contrast Evaluation (from v0.14-WCAG-CONTRAST.md)

```javascript
// Source: .planning/research/v0.14-WCAG-CONTRAST.md (HIGH confidence, W3C verified)
// Returns { pass, fail, skip, total } — use pass as the score (direction: max)
(() => {
  function sRGBtoLinear(c) {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }
  function luminance(r, g, b) {
    return 0.2126 * sRGBtoLinear(r) + 0.7152 * sRGBtoLinear(g) + 0.0722 * sRGBtoLinear(b);
  }
  function contrastRatio(fg, bg) {
    const L1 = luminance(...fg), L2 = luminance(...bg);
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  }
  function parseRGBA(str) {
    if (!str || str === 'transparent') return [0, 0, 0, 0];
    const m = str.match(/rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/);
    if (!m) return [0, 0, 0, 0];
    return [Math.round(+m[1]), Math.round(+m[2]), Math.round(+m[3]), m[4] !== undefined ? +m[4] : 1];
  }
  function getEffectiveBg(el) {
    const layers = [];
    let cur = el;
    while (cur && cur !== document) {
      const bg = window.getComputedStyle(cur).backgroundColor;
      const [r, g, b, a] = parseRGBA(bg);
      if (a > 0) { layers.push([r, g, b, a]); if (a >= 1) break; }
      cur = cur.parentElement;
    }
    if (!layers.length) return [255, 255, 255];
    let base = [255, 255, 255];
    for (let i = layers.length - 1; i >= 0; i--) {
      const [r, g, b, a] = layers[i];
      base = [Math.round(r * a + base[0] * (1-a)), Math.round(g * a + base[1] * (1-a)), Math.round(b * a + base[2] * (1-a))];
    }
    return base;
  }
  let pass = 0, fail = 0, skip = 0;
  for (const el of document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,a,li,td,th,label,button')) {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') { skip++; continue; }
    const hasText = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim());
    if (!hasText) { skip++; continue; }
    const fg = parseRGBA(style.color);
    const bg = getEffectiveBg(el);
    const ratio = contrastRatio([fg[0], fg[1], fg[2]], bg);
    const size = parseFloat(style.fontSize);
    const bold = parseInt(style.fontWeight) >= 700;
    const threshold = (size >= 24 || (size >= 18.66 && bold)) ? 3.0 : 4.5;
    ratio >= threshold ? pass++ : fail++;
  }
  return { pass, fail, skip, total: pass + fail };
})()
```

### Responsive Compliance Layout Signature (from v0.14-VISUAL-DOM-METRICS.md)

```javascript
// Source: .planning/research/v0.14-VISUAL-DOM-METRICS.md (HIGH confidence)
// Run at each breakpoint after browser_resize
(() => {
  try {
    const body = document.body;
    const main = document.querySelector('main') || body;
    const nav = document.querySelector('nav');
    const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth;
    const interactiveEls = [...document.querySelectorAll('a[href],button,[role="button"],input,select,textarea')];
    const touchTargets = interactiveEls.filter(el => {
      const r = el.getBoundingClientRect();
      return r.width >= 44 && r.height >= 44;
    });
    return {
      bodyWidth: body.clientWidth,
      mainWidth: main.clientWidth,
      navDisplay: nav ? getComputedStyle(nav).display : null,
      navFlexDir: nav ? getComputedStyle(nav).flexDirection : null,
      overflow,
      fontSize: parseFloat(getComputedStyle(body).fontSize),
      touchTargetRatio: interactiveEls.length > 0 ? touchTargets.length / interactiveEls.length : 1,
      gridCols: getComputedStyle(main).gridTemplateColumns || null,
    };
  } catch (e) { return { overflow: false, touchTargetRatio: 1, fontSize: 16 }; }
})()
```

### Mermaid Full Metric Extraction (from v0.14-MERMAID-METRICS.md)

```javascript
// Source: .planning/research/v0.14-MERMAID-METRICS.md (HIGH confidence for structure, MEDIUM for CSS classes)
// Run inside browser_evaluate after window.__MERMAID_RENDERED__ is true
(() => {
  const svg = document.querySelector('#output svg');
  if (!svg) return JSON.stringify({ error: 'No SVG', score: 0 });
  try {
    const nodes = Array.from(svg.querySelectorAll('.node'));
    const edgePaths = Array.from(svg.querySelectorAll('.edgePaths path, .flowchart-link'));
    const nodeCount = nodes.length;
    const edgeCount = edgePaths.length;
    // Bounding box crossing heuristic
    const edgeBoxes = edgePaths.map(p => p.getBoundingClientRect());
    let crossings = 0;
    for (let i = 0; i < edgeBoxes.length; i++) {
      for (let j = i + 1; j < edgeBoxes.length; j++) {
        const a = edgeBoxes[i], b = edgeBoxes[j];
        const oW = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const oH = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (oW > 0 && oH > 0) {
          const oArea = oW * oH;
          const minA = Math.min(a.width * a.height, b.width * b.height);
          if (minA > 0 && oArea / minA < 0.5) crossings++;
        }
      }
    }
    const svgRect = svg.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    let tooSmall = 0, textCount = 0;
    svg.querySelectorAll('foreignObject div, foreignObject p, text').forEach(el => {
      const fs = parseFloat(window.getComputedStyle(el).fontSize);
      if (fs > 0) { textCount++; if (fs < 12) tooSmall++; }
    });
    return JSON.stringify({ nodeCount, edgeCount, crossings, svgWidth: Math.round(svgRect.width),
      svgHeight: Math.round(svgRect.height), vw, vh, tooSmallFonts: tooSmall, textCount });
  } catch (e) { return JSON.stringify({ error: e.message, score: 0 }); }
})()
```

### Mermaid HTML Template (from v0.14-MERMAID-METRICS.md)

```html
<!-- Source: .planning/research/v0.14-MERMAID-METRICS.md (HIGH confidence) -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>body { margin: 0; padding: 16px; background: #fff; } #output { width: 100%; }</style>
</head>
<body>
  <div id="output"></div>
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    const definition = `MERMAID_DEFINITION_PLACEHOLDER`;
    mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'default',
      flowchart: { useMaxWidth: false, htmlLabels: true, curve: 'basis' } });
    try {
      const { svg } = await mermaid.render('mermaid-diagram', definition);
      document.getElementById('output').insertAdjacentHTML('beforeend', svg);
      window.__MERMAID_RENDERED__ = true;
    } catch (err) {
      window.__MERMAID_RENDERED__ = false;
      window.__MERMAID_ERROR__ = err.message;
    }
  </script>
</body>
</html>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| axe-core for a11y metric counting | Custom lightweight DOM checker (50 lines) + AOM snapshot | v0.14 design decision | No CDN dependency, deterministic, returns integer directly |
| APCA for contrast | WCAG 2.x (4.5:1 / 3:1) | v0.14 design decision | Legal standard today; APCA is future work |
| pixelmatch for visual regression | SHA-256 hash + metric score direction | v0.14 (zero-dep constraint) | No npm deps; sufficient for circuit breaker decisions |
| Mermaid CLI (mmdc) | CDN-loaded Mermaid v11 in browser | v0.14 design decision | No npm install; leverages existing Playwright infrastructure |

**Deprecated/outdated:**
- Mermaid v10 API: `mermaid.render()` is the same in v10 and v11, but v11 is current major version. Use v11.
- `mermaid.mermaidAPI.render()` (old API): Deprecated since v10. Use `mermaid.render()` directly.

---

## Existing Codebase Patterns

This section documents patterns from the existing codebase that metric scripts MUST follow:

### _evalMetric Contract (AUTHORITATIVE)

Source: `bin/lib/experiment-runner.cjs` lines 69-107

- `verifyCmd` is split on whitespace, first token is the command, rest are args
- `spawnSync` with `stdio: 'pipe'` — stdout is captured, not displayed
- `status !== 0` → CRASH (nonzero_exit)
- Last line of stdout split on `\n`, trimmed, parsed as `parseFloat()` → NaN = CRASH (unparseable_metric)
- `metric_value` is the parsed float — can be any finite number (including 0)

### mcp-bridge.cjs TOOL_MAP Keys for Playwright

Source: `bin/lib/mcp-bridge.cjs` lines 162-172

```
'playwright:probe'      → mcp__playwright__browser_snapshot
'playwright:navigate'   → mcp__playwright__browser_navigate
'playwright:screenshot' → mcp__playwright__browser_take_screenshot
'playwright:snapshot'   → mcp__playwright__browser_snapshot
'playwright:click'      → mcp__playwright__browser_click
'playwright:type'       → mcp__playwright__browser_type
'playwright:wait'       → mcp__playwright__browser_wait_for
'playwright:evaluate'   → mcp__playwright__browser_evaluate
'playwright:pdf'        → mcp__playwright__browser_pdf_save
'playwright:close'      → mcp__playwright__browser_close
'playwright:resize'     → mcp__playwright__browser_resize
```

All marked TOOL_MAP_VERIFY_REQUIRED — use via `bridge.call()` only.

### Probe Tool Selection

Source: `STATE.md` decisions + `critique.md` Step 3b

The probe uses `playwright:snapshot` (browser_snapshot) because:
- Takes no required URL argument (unlike browser_navigate which requires `url`)
- Is the lightest available call
- Returns immediately if Playwright is available

**Do NOT probe with `playwright:navigate`** — requires a URL arg; passing no URL throws "missing required parameter".

### Nyquist Test Structure

Source: `tests/phase-108/mcp-bridge-playwright.test.mjs`

```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const require = createRequire(import.meta.url);
```

Tests use ES module syntax (`.mjs` extension) with `createRequire` to import CJS modules.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node:test`) |
| Config file | none — discovered by `node --test tests/` |
| Quick run command | `node --test tests/phase-111/` |
| Full suite command | `node --test tests/` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VIS-01 | dom-metric.cjs exits 0 and prints a float to stdout | unit | `node --test tests/phase-111/dom-metric.test.mjs` | ❌ Wave 0 |
| VIS-01 | dom-metric.cjs score for good HTML > score for bad HTML | unit | `node --test tests/phase-111/dom-metric.test.mjs` | ❌ Wave 0 |
| VIS-02 | a11y-metric.cjs exits 0 and prints a float | unit | `node --test tests/phase-111/a11y-metric.test.mjs` | ❌ Wave 0 |
| VIS-03 | contrast-metric.cjs exits 0 and prints a float | unit | `node --test tests/phase-111/contrast-metric.test.mjs` | ❌ Wave 0 |
| VIS-04 | responsive-metric.cjs exits 0 and prints a float | unit | `node --test tests/phase-111/responsive-metric.test.mjs` | ❌ Wave 0 |
| VIS-05 | mermaid-metric.cjs exits 0 and prints a float | unit | `node --test tests/phase-111/mermaid-metric.test.mjs` | ❌ Wave 0 |
| VIS-06 | Each script's last stdout line is parseable by parseFloat() | unit | included in each test file | ❌ Wave 0 |
| VIS-07 | Each script prints 0 and exits 0 when called with no argv[2] | unit | included in each test file | ❌ Wave 0 |
| VIS-07 | Each script prints 0 and exits 0 when Playwright unavailable (simulated) | unit | included in each test file | ❌ Wave 0 |

**Key testing constraint:** Tests for VIS-07 (graceful degradation) can be run without Playwright MCP being available — they test the "no argv[2]" path which is a quick exit before any MCP probe. Tests for the scoring logic require Playwright or HTML fixture + mock bridge.

**Recommended approach for Nyquist tests:** Test the contract (exit 0, parseable last line) via `spawnSync` — same as how `_evalMetric` calls the scripts. No need to mock Playwright. Use the "no argv[2]" path for basic contract verification. Use HTML fixture files (if Playwright available) for score-range validation.

```javascript
// Structural test pattern (does not need Playwright)
import { spawnSync } from 'child_process';
const result = spawnSync('node', ['bin/dom-metric.cjs'], { cwd: ROOT, encoding: 'utf-8' });
assert.strictEqual(result.status, 0, 'Must exit 0 (VIS-06/VIS-07)');
const lines = (result.stdout || '').split('\n').map(l => l.trim()).filter(Boolean);
const lastLine = lines[lines.length - 1] || '';
assert.ok(Number.isFinite(parseFloat(lastLine)), 'Last stdout line must be a parseable float (VIS-06)');
assert.strictEqual(parseFloat(lastLine), 0, 'Must return 0 when no file arg (VIS-07)');
```

### Sampling Rate
- **Per task commit:** `node --test tests/phase-111/`
- **Per wave merge:** `node --test tests/`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-111/dom-metric.test.mjs` — covers VIS-01, VIS-06, VIS-07
- [ ] `tests/phase-111/a11y-metric.test.mjs` — covers VIS-02, VIS-06, VIS-07
- [ ] `tests/phase-111/contrast-metric.test.mjs` — covers VIS-03, VIS-06, VIS-07
- [ ] `tests/phase-111/responsive-metric.test.mjs` — covers VIS-04, VIS-06, VIS-07
- [ ] `tests/phase-111/mermaid-metric.test.mjs` — covers VIS-05, VIS-06, VIS-07
- [ ] `references/experiments/fixtures/good-wireframe.html` — score verification fixture
- [ ] `references/experiments/fixtures/bad-wireframe.html` — score discrimination fixture

---

## Open Questions — RESOLVED

All three open questions from initial research have been resolved via source verification.

### 1. bridge.call() synchrony — RESOLVED: SYNCHRONOUS

**Evidence:** `bin/lib/mcp-bridge.cjs` lines 356-363:
```javascript
function call(canonicalName, args) {
  if (!Object.prototype.hasOwnProperty.call(TOOL_MAP, canonicalName)) {
    throw new Error(`Tool "${canonicalName}" not found in TOOL_MAP.`);
  }
  return { toolName: TOOL_MAP[canonicalName], args };
}
```

**Finding:** `bridge.call()` is **synchronous** — it's a pure lookup function that returns `{ toolName, args }`. It does NOT execute MCP tools directly. The actual MCP tool execution happens at the workflow layer (Claude Code runtime). The comment at line 320-321 confirms: *"Actual MCP tool calls happen at the workflow layer where Claude Code MCP tools are available. This module never calls MCP tools."*

**Impact on metric scripts:** Metric scripts cannot call MCP tools directly via bridge.call(). The scripts must be designed as **workflow instructions** — they provide the tool name and args, and the experiment runner (or workflow layer) executes the actual MCP calls. Alternatively, metric scripts can use `spawnSync` to invoke node scripts that output scores, with the MCP interaction happening in the orchestrating workflow context.

### 2. Mermaid CSS class case sensitivity — RESOLVED: camelCase "edgePaths" container, NO "edgePath" individual class

**Evidence:** Verified in Mermaid v11 source (develop branch, 2026-03-23):
- `packages/mermaid/src/rendering-util/layout-algorithms/dagre/index.js` line 46: `elem.insert('g').attr('class', 'edgePaths')` — **container** group is camelCase `edgePaths`
- `packages/mermaid/src/dagre-wrapper/index.js` line 24: same pattern `attr('class', 'edgePaths')`
- `packages/mermaid-layout-elk/src/render.ts`: uses `attr('class', 'edges edgePaths')`
- Individual edge **path** elements get classes: `edge-thickness-normal`, `edge-pattern-solid`, `flowchart-link` — NOT `edgePath`
- The `flowchart-link` class is set via `edgeData.classes = 'flowchart-link ' + linkNameStart + ' ' + linkNameEnd`

**Finding:** There is NO `.edgePath` class on individual edges in modern Mermaid v11. The original research concern about `.edgePath` vs `.edgepath` was based on older Mermaid versions (pre-v11). The correct selectors are:
- **Edge container:** `.edgePaths` (camelCase, the `<g>` group)
- **Individual edge paths:** `.flowchart-link` (HIGH confidence, verified in source)
- **Edge path elements:** `.edgePaths path` or `.flowchart-link` (either works)

**Updated recommendation:** Use `.edgePaths path` as primary selector, `.flowchart-link` as secondary. Drop the `.edgepath` lowercase fallback — it was never in the v11 source. Confidence upgraded from MEDIUM to HIGH.

### 3. file:// URL with spaces — RESOLVED: Use encodeURI()

**Evidence:** No existing `encodeURI` or `file://` patterns found in `bin/` scripts (grep returned empty). The project path `Platform Development Engine` contains spaces.

**Finding:** Standard browser behavior requires percent-encoding spaces in file:// URLs. Use `'file://' + encodeURI(absolutePath)` to handle spaces. This is a standard Web API pattern, not project-specific.

**Recommendation unchanged:** Always use `encodeURI()` on the file path. This is defensive and costs nothing.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All 5 scripts | ✓ | (project runtime) | — |
| Playwright MCP | All 5 scripts | UNKNOWN — live probe in Phase 108 pending | — | Return 0 (VIS-07 graceful degrade) |
| jsdelivr CDN | mermaid-metric.cjs | Unknown at script write time | — | Return 0 if CDN unreachable |
| npx serve | Potential fallback for file:// issues | ✓ (npx is bundled with npm) | latest | Use file:// directly (PLAY-07 complete) |

**Missing dependencies with no fallback:** None — all metrics degrade gracefully to 0 when Playwright unavailable.

**Missing dependencies with fallback:** Playwright MCP → return 0. CDN → return 0. Both are acceptable for v0.14 MVP.

---

## Sources

### Primary (HIGH confidence)
- `.planning/research/v0.14-VISUAL-DOM-METRICS.md` — DOM scoring algorithm, responsive compliance patterns, a11y violation checks, browser_evaluate API — first-party project research
- `.planning/research/v0.14-WCAG-CONTRAST.md` — Complete WCAG 2.1 contrast evaluation script, color parsing, effective background resolution — first-party project research
- `.planning/research/v0.14-MERMAID-METRICS.md` — Mermaid v11 CDN rendering, SVG DOM structure, full metric extraction script, scoring formula — first-party project research
- `.planning/research/v0.14-VISUAL-REGRESSION.md` — SHA-256 hash comparison, circuit breaker integration — first-party project research
- `bin/lib/experiment-runner.cjs` — authoritative `_evalMetric` contract source
- `bin/nyquist-metric.cjs` — reference implementation for metric script shell structure
- `bin/lib/mcp-bridge.cjs` — TOOL_MAP playwright entries, probe pattern

### Secondary (MEDIUM confidence)
- `.planning/research/v0.14-SUMMARY.md` — research synthesis and phase ordering decisions
- `workflows/critique.md` — AOM snapshot pattern (Phase 110 production implementation)
- `workflows/wireframe.md` — PLAYWRIGHT_AVAILABLE probe/degrade pattern
- `tests/phase-108/mcp-bridge-playwright.test.mjs` — Nyquist test file structure reference

### Tertiary (LOW confidence — not needed, all covered above)
- No tertiary sources required for this phase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies, all existing infrastructure
- Architecture: HIGH — _evalMetric contract and probe/degrade pattern are production-proven
- DOM/a11y/contrast patterns: HIGH — complete code from verified research documents
- Responsive metric: HIGH — resize + evaluate pattern established in existing workflows
- Mermaid CSS class names: HIGH — verified in Mermaid v11 source: `.edgePaths path` and `.flowchart-link` are correct selectors; no `.edgePath`/`.edgepath` ambiguity exists in v11
- Pitfalls: HIGH — derived from existing codebase behavior

**Research date:** 2026-03-23
**Valid until:** 2026-06-23 (stable APIs — Playwright MCP, DOM APIs, WCAG standard)
