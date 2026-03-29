# Phase 170: PDE Utilities - Research

**Researched:** 2026-03-29
**Domain:** Mermaid rendering, DTCG token validation, visual diff commands, Playwright test scaffolding, handoff spec verification
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Mermaid Renderer + Token Validator**
- Auto-detect `mmdr` Rust binary, fall back to `mermaid-cli` if missing — same detection pattern as CadQuery
- Token validator validates against DTCG spec: required fields `$value`, `$type`, naming convention `{group}.{token}`
- OKLCH gamut check: flag values outside P3 gamut. APCA contrast: flag ratios below 60 Lc for body text, 45 Lc for large text
- Output format: structured JSON + formatted markdown summary (matches visual-diff report pattern)

**Visual Diff Command + Flow-Derived Tests**
- `/pde:visual-diff` wraps existing `bin/lib/image-pipeline/visual-diff.cjs` — thin command layer over Phase 166 engine
- Branch comparison via `git stash` current, checkout target, capture screenshots, restore — matches Phase 166 approach
- Flow test generation: Playwright `test('navigates {path}', async ({ page }) => { ... })` skeletons with `page.goto()` + `page.click()` from flow edges
- Parse Mermaid flowchart syntax from /pde:flows output — extract nodes as pages, edges as navigation paths

**Handoff Spec Verifier**
- Compare HANDOFF-SPEC.md component APIs + TypeScript interfaces against actual source files
- Grep-based detection: parse component names from spec, search for `export.*{ComponentName}` and interface signatures
- Gap report as markdown table: Component | Spec Status | Code Status | Gap Type (missing/diverged/extra)
- `/pde:verify-handoff` as standalone skill file + pde-tools.cjs subcommand

### Claude's Discretion
No items deferred.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UTL-01 | Mermaid diagrams render via mmdr Rust renderer (500-1000x faster than mermaid-cli) | mmdr 1.0.0 on npm + brew; auto-detect binary with execFile pattern from cad.cjs |
| UTL-02 | User can validate DTCG design tokens against schema completeness and naming conventions | DTCG spec 2025.10 verified; `$value`+`$type` required fields; naming convention `{group}.{token}` |
| UTL-03 | Token validator checks OKLCH gamut ranges and APCA contrast ratios | apca-w3 0.1.9 available; colorjs.io 0.6.1 available; P3 gamut check via chroma comparison |
| UTL-04 | User can run visual diff comparing Playwright screenshots across branches/commits | Thin command wrapper over existing `runVisualDiff()` in visual-diff.cjs (Phase 166) |
| UTL-05 | User can generate test scaffolds from /pde:flows flow diagram output | Regex parse of FLW-flows-v*.md Mermaid blocks; no new npm deps required |
| UTL-06 | Generated tests include Playwright E2E skeletons with flow-derived navigation paths | Playwright 1.58.2 installed; test skeleton template well-defined by CONTEXT.md |
| UTL-07 | User can verify implementation matches handoff spec (component APIs, TypeScript interfaces) | divergence.cjs pattern reusable; HND-handoff-spec-v*.md location confirmed |
| UTL-08 | Handoff verify produces a gap report listing unimplemented/divergent components | Grep-based gap detection; markdown table format matches established report patterns |
</phase_requirements>

---

## Summary

Phase 170 adds five utility tools as first-class `/pde:` commands. All five are thin layers over new or existing modules — the Phase 166 visual-diff engine requires no changes, only a `/pde:visual-diff` command skill file and a `pde-tools.cjs` entry that routes to `runVisualDiff()`. The four new modules (`mermaid-renderer.cjs`, `token-validator.cjs`, `flow-test-gen.cjs`, `handoff-verifier.cjs`) follow the established CJS/dependency-injection/JSDoc pattern from every prior phase module.

The mmdr Rust binary (v1.0.0 on npm) was confirmed active and maintained as of February 2026. It is a drop-in replacement for `mmdc` (mermaid-cli) with identical I/O semantics: takes stdin or `-i file.mmd`, writes SVG/PNG to `-o output.svg`. Auto-detection follows the CadQuery `checkCadQuery()` pattern: try `execFile('mmdr', ['--version'])`, fall back to `mmdc`. Design token validation uses the stable DTCG 2025.10 spec — `$value` and `$type` are the only required fields per token. OKLCH gamut and APCA contrast checks can be done with zero-dependency math (no new npm packages) or with `apca-w3` 0.1.9 (already queryable from npm).

The handoff verifier is distinct from the existing `divergence.cjs` (Phase 122). Divergence.cjs detects drift using `<!-- @component -->` HTML annotations in spec files. The new `handoff-verifier.cjs` directly greps for `export.*{ComponentName}` and TypeScript interface signatures in source files, producing a gap table. These are complementary tools serving different workflows.

**Primary recommendation:** Build four new CJS modules under `bin/lib/utils/`, add four skill files in `commands/`, add one `case 'utils'` block in `pde-tools.cjs`, and surface `/pde:visual-diff` by simply registering `image diff` under the existing image command path.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| mmdr | 1.0.0 | Rust-native Mermaid renderer via execFile | 500-1000x faster than mermaid-cli; confirmed active Feb 2026 |
| apca-w3 | 0.1.9 | APCA contrast ratio calculation | Official W3C-licensed APCA implementation; minimum npm footprint |
| colorjs.io | 0.6.1 | OKLCH gamut boundary check | Supports P3 gamut mapping; already queryable |
| Node.js built-ins | 20.x | fs, path, child_process, regex | Zero-dependency CJS pattern from all prior phases |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| mermaid-cli (mmdc) | 11.x | Fallback Mermaid renderer | When mmdr binary not detected |
| sharp | 0.34.5 (installed) | Not needed for Phase 170 | Already installed; do not add dependency |
| vitest | 4.1.1 (installed) | Test framework | All unit tests follow vitest .mjs pattern |
| Playwright | 1.58.2 (installed) | Scaffold generation target | Generated test skeletons use Playwright API |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| apca-w3 | Manual APCA math inline | apca-w3 is 2 KB, W3C-licensed, exact match for spec; inline math risks errors |
| colorjs.io | Manual OKLCH-to-sRGB conversion | colorjs.io handles edge cases (hue wrap, gamut clipping); manual approach is brittle |
| Regex Mermaid parser | @rendermaid/core or @emily/mermaid-ast | Neither is on npm registry (JSR only); regex is sufficient for flowchart LR/TD syntax used by /pde:flows |

**Installation:**
```bash
npm install apca-w3 colorjs.io
# mmdr installed as system binary (not npm package despite being on npm registry as v1.0.0)
brew tap 1jehuang/mmdr && brew install mmdr
# OR: cargo install --path . (requires Rust toolchain)
```

**Version verification:**
```bash
npm view apca-w3 version   # → 0.1.9
npm view colorjs.io version  # → 0.6.1
mmdr --version 2>/dev/null || echo "not installed"
```

---

## Architecture Patterns

### Recommended Project Structure
```
bin/lib/utils/
├── mermaid-renderer.cjs    # mmdr/mmdc abstraction (UTL-01)
├── token-validator.cjs     # DTCG validation + OKLCH/APCA checks (UTL-02, UTL-03)
├── flow-test-gen.cjs       # Mermaid→Playwright scaffold (UTL-05, UTL-06)
└── handoff-verifier.cjs    # Spec→code gap detection (UTL-07, UTL-08)

commands/
├── validate-tokens.md      # /pde:validate-tokens skill
├── visual-diff.md          # ALREADY EXISTS — update to reference pde-tools.cjs utils subcommand
├── gen-tests.md            # /pde:gen-tests skill
└── verify-handoff.md       # /pde:verify-handoff skill

tests/phase-170/
├── mermaid-renderer.test.mjs
├── token-validator.test.mjs
├── flow-test-gen.test.mjs
└── handoff-verifier.test.mjs
```

Note: `commands/visual-diff.md` already exists and already documents `node bin/pde-tools.cjs image diff`. The CONTEXT.md decision to add `/pde:visual-diff` means adding a new `utils visual-diff` route in `pde-tools.cjs` that calls the same `runVisualDiff()` engine, with its own skill file if the UX should be a distinct `/pde:visual-diff` command separate from `image diff`. Alternatively (simpler), the existing `image diff` subcommand satisfies UTL-04 without a new case block. The planner should choose based on the CONTEXT.md wording ("thin command layer").

### Pattern 1: Binary Auto-Detection (follows cad.cjs)
**What:** Try the preferred binary first, fall back gracefully if not found
**When to use:** All external binaries (mmdr → mmdc fallback)
**Example:**
```javascript
// Source: bin/lib/3d-pipeline/cad.cjs pattern
'use strict';
const { execFileSync } = require('child_process');

const MMDR_INSTALL_MSG =
  'mmdr not found. Install: brew tap 1jehuang/mmdr && brew install mmdr\n' +
  'Falling back to mermaid-cli (mmdc). Install: npm install -g @mermaid-js/mermaid-cli';

function detectRenderer(_execFn) {
  const execFn = _execFn || execFileSync;
  try {
    execFn('mmdr', ['--version'], { encoding: 'utf8', timeout: 5000 });
    return 'mmdr';
  } catch (_) {}
  try {
    execFn('mmdc', ['--version'], { encoding: 'utf8', timeout: 5000 });
    return 'mmdc';
  } catch (_) {}
  return null;
}
```

### Pattern 2: DTCG Token Traversal (follows design.cjs dtcgToCssLines)
**What:** Recursive object walk, skip `$`-prefixed keys, validate leaf nodes
**When to use:** Token validation — same traversal as existing `dtcgToCssLines`
**Example:**
```javascript
// Source: bin/lib/design.cjs dtcgToCssLines pattern
function validateTokens(tokens, prefix, violations) {
  prefix = prefix || '';
  violations = violations || [];
  for (const key of Object.keys(tokens)) {
    if (key.startsWith('$')) continue; // skip spec keys
    const node = tokens[key];
    if (node && typeof node === 'object' && '$value' in node) {
      // Leaf token — validate
      const name = prefix + key;
      if (!node.$type) violations.push({ token: name, issue: 'missing $type' });
      if (!name.includes('.')) violations.push({ token: name, issue: 'naming: must be {group}.{token}' });
      // OKLCH / APCA checks delegated to color-check helpers
    } else if (node && typeof node === 'object') {
      validateTokens(node, prefix + key + '.', violations);
    }
  }
  return violations;
}
```

### Pattern 3: Mermaid Flowchart Regex Parse
**What:** Extract node IDs and edge pairs from Mermaid flowchart syntax using regex
**When to use:** flow-test-gen.cjs — parsing /pde:flows output
**Example:**
```javascript
// Source: Mermaid flowchart spec (mermaid.js.org/syntax/flowchart.html)
// Node: A[Label], A(Label), A{Label}, A([Label])
const NODE_RE = /^\s*(\w+)(?:\[|\(|\{|>|\[\/)/;
// Edge: A --> B, A -->|label| B, A --- B, A -.-> B
const EDGE_RE = /^\s*(\w+)\s*(?:-->|---|-.->|===>|--[^>]*>)\s*(?:\|[^|]*\|\s*)?(\w+)/;

function parseFlowchart(mermaidText) {
  const nodes = new Map();
  const edges = [];
  for (const line of mermaidText.split('\n')) {
    const edgeMatch = line.match(EDGE_RE);
    if (edgeMatch) {
      edges.push({ from: edgeMatch[1], to: edgeMatch[2] });
      nodes.set(edgeMatch[1], edgeMatch[1]);
      nodes.set(edgeMatch[2], edgeMatch[2]);
    }
  }
  return { nodes, edges };
}
```

### Pattern 4: Dependency Injection for CJS Testing (follows all Phase 163-169 modules)
**What:** Accept `_execFn` / `_readFn` / `_searchFn` overrides for subprocess and FS calls
**When to use:** Every new module — allows vitest to mock without vi.mock()
**Example:**
```javascript
// Source: bin/lib/3d-pipeline/cad.cjs, bin/lib/image-pipeline/visual-diff.cjs
async function renderMermaid({ input, outputPath, _execFn }) {
  const execFn = _execFn || require('child_process').execFileSync;
  const renderer = detectRenderer(execFn);
  if (!renderer) throw new Error(MMDR_INSTALL_MSG);
  // ...
}
```

### Anti-Patterns to Avoid
- **Importing mermaid npm package directly:** The `mermaid` npm package (11.13.0) is ESM-only and incompatible with CJS modules. Use execFile to call the mmdr/mmdc binary instead.
- **Using vi.mock() on require() in CJS tests:** Established project pitfall (Phase 168 decision). Use dependency injection (_execFn, _readFn) instead.
- **Placing command docs in bin/lib/commands/ instead of root commands/:** Phase 168 decision — all command .md files go in root `commands/` directory.
- **z.record(z.unknown()) without string key:** Phase 163 Zod pitfall — not directly relevant here but noted.
- **shell: true with execFile:** Phase 164 decision — always use array args + execFile (not exec) to prevent injection.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| APCA contrast math | Custom luminance formula | apca-w3 0.1.9 | APCA has non-obvious gamma corrections and polarity conventions; W3C-licensed reference impl |
| OKLCH P3 gamut boundary | Custom out-of-gamut math | colorjs.io or @texel/color | P3 → sRGB conversion involves clamping in multiple color spaces; off-spec by one step breaks false-positive/negative rates |
| Mermaid AST parsing | Full grammar parser | Regex on flowchart lines | /pde:flows output is a known subset (flowchart LR/TD with simple arrow syntax); regex is adequate and avoids JSR-only dependency |
| Playwright test runner | Custom test framework | Installed Playwright 1.58.2 | Skeletons target existing Playwright install |

**Key insight:** The DTCG traversal pattern already exists in `design.cjs` (dtcgToCssLines). The token validator is the same recursion with validation logic bolted on — this is a port, not a new architecture.

---

## Common Pitfalls

### Pitfall 1: mmdr Binary Not in PATH During pde-tools.cjs Execution
**What goes wrong:** `execFile('mmdr', ...)` throws ENOENT even though the user installed it via Homebrew
**Why it happens:** Node.js inherits the shell PATH at spawn time; some environments don't include `/opt/homebrew/bin`
**How to avoid:** Use `process.env.MMDR_PATH || 'mmdr'` as the binary path, document the env var override in the skill file, and ensure the fallback to `mmdc` always fires on ENOENT
**Warning signs:** `Error: spawn mmdr ENOENT` in pde-tools.cjs output

### Pitfall 2: APCA Color Ordering (Text vs Background)
**What goes wrong:** APCA returns wrong polarity if text and background colors are passed in wrong order
**Why it happens:** APCA is directional — `calcAPCA(textColor, bgColor)` is not commutative; swapping produces opposite sign
**How to avoid:** Per apca-w3 docs, first argument is always the text color (foreground), second is the background. Document this in token-validator.cjs JSDoc. For token pairs (e.g., `color.text.primary` vs `color.bg.primary`), infer roles from group names containing 'text', 'fg', 'bg', 'surface'.
**Warning signs:** APCA returns negative values (valid but indicates text is darker than background — only normal for dark mode on light text)

### Pitfall 3: OKLCH Values That Are CSS Strings, Not Parsed Objects
**What goes wrong:** Token `$value` is `oklch(0.7 0.15 120)` as a string; colorjs.io expects a parsed object or `new Color('oklch', [L, C, H])` call
**Why it happens:** DTCG tokens store values as CSS strings; colorjs.io Color constructor accepts CSS strings but the string must be recognized format
**How to avoid:** Use `new Color(tokenValue)` from colorjs.io — it parses CSS color strings including `oklch(...)` syntax. Add a try/catch: if parsing fails, report as `parse-error` violation rather than crashing
**Warning signs:** `Error: Could not parse color` from colorjs.io on tokens using shorthand or space-separated syntax

### Pitfall 4: Mermaid Flowchart Subgraph Blocks Confuse Edge Regex
**What goes wrong:** Subgraph declarations (`subgraph title`) and end keywords match node/edge patterns
**Why it happens:** `subgraph` lines contain text that looks like node labels; `end` is a bare word
**How to avoid:** Skip lines starting with `subgraph`, `end`, `%%` (comments), `graph`, `flowchart`, and direction keywords (`LR`, `TD`, `TB`, `RL`)
**Warning signs:** Test scaffold contains spurious `subgraph` or `end` as page paths

### Pitfall 5: HND-handoff-spec-v*.md May Not Exist
**What goes wrong:** `/pde:verify-handoff` crashes if no handoff spec has been generated yet
**Why it happens:** User runs verify before running /pde:handoff
**How to avoid:** `handoff-verifier.cjs` must check for spec file existence first and return a friendly structured error: `{ status: 'no-spec', message: 'Run /pde:handoff first to generate a handoff spec' }`
**Warning signs:** `ENOENT` on `.planning/design/handoff/` directory

### Pitfall 6: visual-diff Command Already Exists Under `image diff`
**What goes wrong:** Adding a second `utils visual-diff` route creates confusion — two commands do the same thing
**Why it happens:** CONTEXT.md says "thin command layer over Phase 166 engine" but `image diff` already IS that thin layer
**How to avoid:** The new `/pde:visual-diff` skill file should call `node bin/pde-tools.cjs image diff <branch-a> <branch-b>` (delegate to existing route) OR add a separate `utils` case in pde-tools.cjs that also calls `runVisualDiff()`. Do not duplicate the engine call logic. Planner should choose delegation to `image diff` as the simplest correct approach.
**Warning signs:** Duplicate code paths calling `runVisualDiff()` independently

---

## Code Examples

Verified patterns from official sources:

### APCA Contrast Check (apca-w3)
```javascript
// Source: https://www.npmjs.com/package/apca-w3
// First arg = text (foreground), second arg = background
const { calcAPCA, sRGBtoY } = require('apca-w3');
// Colors as hex strings
const Lc = calcAPCA('#333333', '#ffffff'); // returns e.g. 88.0
// Thresholds from CONTEXT.md decisions:
//   body text: |Lc| >= 60
//   large text: |Lc| >= 45
const absLc = Math.abs(Lc);
if (absLc < 60) { /* body text violation */ }
```

### OKLCH Gamut Check (colorjs.io)
```javascript
// Source: https://colorjs.io/docs/gamut-mapping
const Color = require('colorjs.io').default;
const token = new Color('oklch(0.7 0.2 120)');
const inP3 = token.inGamut('p3');   // true/false
const inSRGB = token.inGamut('srgb'); // true/false
// Flag if outside P3 (cannot be rendered on P3 displays without clipping)
if (!inP3) { /* gamut violation */ }
```

### mmdr Render Call
```javascript
// Source: https://github.com/1jehuang/mermaid-rs-renderer README
// mmdr -i diagram.mmd -o output.svg -e svg
const { execFileSync } = require('child_process');
function renderWithMmdr(inputPath, outputPath, _execFn) {
  const execFn = _execFn || execFileSync;
  execFn('mmdr', ['-i', inputPath, '-o', outputPath, '-e', 'svg'], {
    encoding: 'utf8',
    timeout: 10000,
  });
}
// Fallback: mmdc -i diagram.mmd -o output.svg
function renderWithMmdc(inputPath, outputPath, _execFn) {
  const execFn = _execFn || execFileSync;
  execFn('mmdc', ['-i', inputPath, '-o', outputPath], {
    encoding: 'utf8',
    timeout: 30000, // mermaid-cli is slow; 30s safe
  });
}
```

### Playwright Test Skeleton (generated by flow-test-gen.cjs)
```javascript
// Output format specified in CONTEXT.md
// test('navigates {path}', async ({ page }) => { page.goto() + page.click() from flow edges })
const { test, expect } = require('@playwright/test');

test('navigates HomeScreen → LoginScreen', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="login-link"]');
  await expect(page).toHaveURL(/\/login/);
});
```

### Handoff Verifier: Export Search
```javascript
// Source: divergence.cjs grep-based detection pattern
// Search for export named ComponentName in src/**/*.{ts,tsx,js,jsx}
const { execFileSync } = require('child_process');

function searchForExport(componentName, srcDir, _execFn) {
  const execFn = _execFn || execFileSync;
  try {
    const result = execFn('grep', [
      '-r', '--include=*.ts', '--include=*.tsx',
      '-l',
      `export.*${componentName}`,
      srcDir,
    ], { encoding: 'utf8', timeout: 10000 });
    return result.trim().split('\n').filter(Boolean);
  } catch (_) {
    return []; // grep exits 1 when no matches
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| mermaid-cli (Chromium headless) | mmdr (Rust, no browser) | Feb 2026 (v1.0.0 release) | 500-1000x faster render; no Node/Puppeteer dependency |
| WCAG 2 contrast ratios | APCA / Lc contrast | Ongoing WCAG 3 development | More perceptual accuracy; body text threshold 60 Lc ≠ 4.5:1 WCAG 2 |
| sRGB hex-only tokens | DTCG 2025.10 stable spec with OKLCH support | October 2025 | P3 gamut tokens now spec-valid; validators must handle oklch() CSS strings |
| @component HTML annotation drift (divergence.cjs) | Direct export/interface grep (handoff-verifier.cjs) | Phase 170 (new) | Gap detection without requiring annotation maintenance |

**Deprecated/outdated:**
- mermaid-cli as primary renderer: Still functional as fallback but 2-3 second startup per diagram makes it unsuitable as primary path.
- WCAG 2 contrast thresholds in token validation: APCA is now the spec-aligned approach for design systems using DTCG 2025.10.

---

## Open Questions

1. **Does `/pde:visual-diff` need its own `utils` case in pde-tools.cjs, or should the skill file delegate to `image diff`?**
   - What we know: `image diff <branch-a> <branch-b>` already calls `runVisualDiff()` directly and is documented in `commands/visual-diff.md`
   - What's unclear: Whether a new `utils visual-diff` route adds value (e.g., Playwright screenshot capture before diff) or is pure duplication
   - Recommendation: The planner should implement `/pde:visual-diff` as a new skill file that calls `node bin/pde-tools.cjs image diff` (delegation, no new route). If screenshot capture before comparison is desired, add it to the skill workflow, not pde-tools.cjs.

2. **Should token-validator.cjs require `apca-w3` and `colorjs.io` as hard npm deps, or implement fallback math inline?**
   - What we know: Both packages are small (~2 KB each); apca-w3 is the W3C reference implementation; colorjs.io 0.6.1 confirmed on npm
   - What's unclear: Whether adding two new npm deps is acceptable given project's zero-dependency CJS preference for some modules
   - Recommendation: Add both as npm dependencies (not devDependencies). The validation feature is non-functional without them. Document in package.json under `dependencies`.

3. **Where does flow-test-gen.cjs read the flows file from?**
   - What we know: `/pde:flows` writes to `.planning/design/ux/FLW-flows-v{N}.md` — multiple versions may exist
   - What's unclear: Should `gen-tests` auto-detect the latest version (like handoff-create-prs.md does) or accept an explicit path argument?
   - Recommendation: Auto-detect the latest `FLW-flows-v*.md` file (sort by version number, take max), with an optional `--flows-file <path>` override for explicit control.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All modules | Yes | 20.20.0 | — |
| mmdr binary | UTL-01 primary | No | — | mmdc (mermaid-cli) |
| mmdc binary (mermaid-cli) | UTL-01 fallback | No | — | Error with install instructions |
| apca-w3 (npm) | UTL-03 | Available to install | 0.1.9 | Inline math (risky) |
| colorjs.io (npm) | UTL-03 | Available to install | 0.6.1 | Manual OKLCH math (risky) |
| Playwright | UTL-04 (screenshots) | Yes | 1.58.2 (installed) | — |
| sharp | UTL-04 (pHash) | Yes | 0.34.5 (installed) | — |
| vitest | Testing | Yes | 4.1.1 (installed) | — |
| brew | mmdr installation | Yes | available | cargo install (needs Rust) |
| cargo/Rust | mmdr alt-install | No | — | brew install |

**Missing dependencies with no fallback:**
- mmdr + mmdc: Both absent from this machine. Skill file must document installation; mermaid-renderer.cjs must handle the "no renderer found" case with a clear error + install instructions.

**Missing dependencies with fallback:**
- apca-w3, colorjs.io: Not yet installed. `npm install apca-w3 colorjs.io` needed as Wave 0 setup task.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 |
| Config file | vitest.config.ts (project root) |
| Quick run command | `npx vitest run tests/phase-170/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UTL-01 | detectRenderer() returns 'mmdr' or 'mmdc' or null | unit | `npx vitest run tests/phase-170/mermaid-renderer.test.mjs` | No — Wave 0 |
| UTL-01 | renderMermaid() calls execFile with correct args | unit | `npx vitest run tests/phase-170/mermaid-renderer.test.mjs` | No — Wave 0 |
| UTL-02 | validateTokens() flags missing $type | unit | `npx vitest run tests/phase-170/token-validator.test.mjs` | No — Wave 0 |
| UTL-02 | validateTokens() flags naming convention violations | unit | `npx vitest run tests/phase-170/token-validator.test.mjs` | No — Wave 0 |
| UTL-03 | checkOklchGamut() flags out-of-P3 values | unit | `npx vitest run tests/phase-170/token-validator.test.mjs` | No — Wave 0 |
| UTL-03 | checkApcaContrast() flags Lc < 60 for body text | unit | `npx vitest run tests/phase-170/token-validator.test.mjs` | No — Wave 0 |
| UTL-04 | visual-diff command routes to runVisualDiff() | unit/smoke | `npx vitest run tests/phase-170/` | No — Wave 0 |
| UTL-05 | parseFlowchart() extracts nodes and edges | unit | `npx vitest run tests/phase-170/flow-test-gen.test.mjs` | No — Wave 0 |
| UTL-06 | generateTestScaffold() produces valid Playwright skeletons | unit | `npx vitest run tests/phase-170/flow-test-gen.test.mjs` | No — Wave 0 |
| UTL-07 | searchForExport() finds component exports via grep | unit | `npx vitest run tests/phase-170/handoff-verifier.test.mjs` | No — Wave 0 |
| UTL-08 | generateGapReport() produces markdown table | unit | `npx vitest run tests/phase-170/handoff-verifier.test.mjs` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/phase-170/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-170/mermaid-renderer.test.mjs` — covers UTL-01
- [ ] `tests/phase-170/token-validator.test.mjs` — covers UTL-02, UTL-03
- [ ] `tests/phase-170/flow-test-gen.test.mjs` — covers UTL-05, UTL-06
- [ ] `tests/phase-170/handoff-verifier.test.mjs` — covers UTL-07, UTL-08
- [ ] `npm install apca-w3 colorjs.io` — required before UTL-03 tests pass

---

## Sources

### Primary (HIGH confidence)
- [GitHub: 1jehuang/mermaid-rs-renderer](https://github.com/1jehuang/mermaid-rs-renderer) — mmdr CLI flags, installation methods, supported diagram types
- [Raw README v0.2.0](https://raw.githubusercontent.com/1jehuang/mermaid-rs-renderer/v0.2.0/README.md) — verified CLI usage: `-i`, `-o`, `-e svg|png`, `--fastText`
- [npm: apca-w3 0.1.9](https://www.npmjs.com/package/apca-w3) — calcAPCA() signature, W3C license
- [Design Tokens Format Module 2025.10](https://www.designtokens.org/tr/drafts/format/) — stable DTCG spec; `$value`, `$type` required fields confirmed
- [colorjs.io Gamut Mapping docs](https://colorjs.io/docs/gamut-mapping) — `inGamut('p3')` API confirmed
- Project codebase: `bin/lib/design.cjs` (dtcgToCssLines pattern), `bin/lib/divergence.cjs` (spec parsing pattern), `bin/lib/3d-pipeline/cad.cjs` (binary detection pattern), `bin/lib/image-pipeline/visual-diff.cjs` (runVisualDiff() API)

### Secondary (MEDIUM confidence)
- [Medium: mmdr benchmarks Feb 2026](https://medium.com/@trivajay259/mmdr-the-rust-powered-mermaid-renderer-that-makes-your-docs-fly-500-1000-faster-b4c6485d1639) — 500-1000x speed claims cross-verified with HN discussion
- [HN: Show HN mmdr](https://news.ycombinator.com/item?id=46885868) — community validation of performance claims

### Tertiary (LOW confidence)
- @rendermaid/core, @emily/mermaid-ast: Found on JSR (not npm registry); not verified as installable via npm. Regex approach recommended instead.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — mmdr confirmed on npm+brew, apca-w3/colorjs.io npm versions verified, all existing deps confirmed installed
- Architecture: HIGH — four module pattern matches all prior phases exactly; no new patterns needed
- Pitfalls: HIGH — most pitfalls are documented project decisions from STATE.md or verified from official docs

**Research date:** 2026-03-29
**Valid until:** 2026-04-29 (mmdr actively developed; apca-w3 stable; DTCG spec now stable 2025.10)
