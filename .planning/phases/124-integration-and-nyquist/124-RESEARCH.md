# Phase 124: Integration & Nyquist - Research

**Researched:** 2026-03-24
**Domain:** Nyquist structural test authoring, regression gate validation, cross-editor syntax verification
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints:
- Nyquist tests are structural — grep/glob-based assertions verifying code artifacts exist
- Test file pattern: tests/phase-{N}/test-*.cjs using node:test
- Prior Nyquist phases: 98 (v0.12), 107 (v0.13), 117 (v0.14) established the pattern
- 25 v0.15 requirements: CTX-01 through CTX-08, MCP-01 through MCP-05, STH-01 through STH-03, FMT-01 through FMT-03, DIV-01 through DIV-06
- Existing tests from phases 118-123 already cover many requirements — Nyquist adds structural regression gates

### Claude's Discretion
All implementation choices at Claude's discretion.

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CTX-01 | PDE generates AGENTS.md at project root with project context, design system summary, and component catalog | Covered by test-context-sync.cjs (31 internal tests) |
| CTX-02 | PDE generates .cursor/rules/*.mdc files with YAML frontmatter | Covered by test-context-sync.cjs |
| CTX-03 | PDE generates legacy .cursorrules file | Covered by test-context-sync.cjs |
| CTX-04 | PDE generates hierarchical GEMINI.md files with @file imports | Covered by test-context-sync.cjs |
| CTX-05 | PDE generates .agent/skills/pde-design/SKILL.md for Antigravity | Covered by test-antigravity-stitch.cjs |
| CTX-06 | Context sync engine auto-regenerates on .planning/ state changes | Covered by test-context-sync-hook.cjs (7 tests) |
| CTX-07 | /pde:editor-sync command regenerates all editor context files | Covered by test-editor-sync-command.cjs (9 tests) |
| CTX-08 | Generated context files include hash-based staleness marker | Covered by test-context-sync.cjs |
| MCP-01 | Standalone MCP server package in isolated subdirectory | Covered by test-mcp-server.cjs |
| MCP-02 | Server exposes 10 read-only tools | Covered by test-mcp-server.cjs |
| MCP-03 | Server distributable via npx pde-mcp-server | Partial — discover.cjs walk-up tested; npx/dist structure needs Nyquist gate |
| MCP-04 | Pipeline status as MCP resource | Covered by test-mcp-server.cjs |
| MCP-05 | Design tokens as Tailwind v4 @theme via get-tokens | Covered by test-mcp-server.cjs |
| STH-01 | PDE generates DESIGN.md in Antigravity Design DNA format | Covered by test-antigravity-stitch.cjs |
| STH-02 | Antigravity-originated Stitch projects detected via manifest metadata | Covered by test-antigravity-stitch.cjs |
| STH-03 | Bidirectional artifact flow via DESIGN.md | Covered by test-antigravity-stitch.cjs |
| FMT-01 | Handoff specs include @file annotations | Covered by test-artifact-format.cjs (41 tests) |
| FMT-02 | DTCG tokens converted to Tailwind v4 @theme + CSS custom properties | Covered by test-artifact-format.cjs |
| FMT-03 | Framework detection generates framework-appropriate component stubs | Covered by test-artifact-format.cjs |
| DIV-01 | T1 structural detection — glob-based component existence check | Covered by test-divergence.cjs (38 tests) |
| DIV-02 | T2 content detection — regex interface parsing vs handoff specs | Covered by test-divergence.cjs |
| DIV-03 | T3 behavioral detection — grep-based token/pattern check | Covered by test-divergence.cjs |
| DIV-04 | DIVERGENCE.md output with per-component status | Covered by test-divergence.cjs |
| DIV-05 | /pde:check-divergence command triggers detection | Covered by test-divergence.cjs |
| DIV-06 | .pde-divergence-ignore file for suppressing divergences | Covered by test-divergence.cjs |
</phase_requirements>

---

## Summary

Phase 124 is the Integration & Nyquist phase for v0.15 Multi-Editor Integration. Its sole purpose is to write structural regression tests that certify all 25 v0.15 requirements are tested, verify zero regressions against all prior Nyquist suites, and confirm the MCP server handles all 10 tool invocations correctly.

The established pattern from three prior Nyquist phases (98/v0.12, 107/v0.13, 117/v0.14) is clear: one test file per phase directory (`tests/phase-124/test-integration-nyquist.cjs`) containing (1) gap-filling describe blocks for any requirements not covered by the phase-specific tests, and (2) a meta-test that enumerates all 7 v0.15 test files as a structural registration gate. The v0.15 convention switches from `.mjs` to `.cjs` format — all phase-118 through phase-123 tests are `.cjs` files using `require('node:test')`.

The second plan in this phase covers the regression sweep: running all v0.14 test files (`.mjs` format, 18 files) plus all v0.15 test files to confirm zero new failures were introduced during v0.15 development. Prior Nyquist phases also fixed count-assertion regressions when new entries were added to shared modules — this must be checked for v0.15 additions.

**Primary recommendation:** Two plans. Plan 01 writes `tests/phase-124/test-integration-nyquist.cjs` covering all 25 v0.15 requirements. Plan 02 runs the full cross-milestone regression sweep and patches any count-based assertion failures discovered.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node:test | Node.js built-in | Test runner | Zero-dep constraint; all v0.15 tests use it |
| node:assert/strict | Node.js built-in | Assertions | Project-wide convention |
| node:fs | Node.js built-in | File existence/content checks | Structural test assertions |
| node:path | Node.js built-in | Path resolution | Cross-platform paths |
| node:os | Node.js built-in | Temp directory creation | Test isolation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| createRequire | node:module built-in | Import CJS modules from ESM | Only needed if switching to .mjs; v0.15 tests are .cjs so not needed |

### Test File Format
**v0.15 convention: `.cjs` with `require('node:test')`**

```javascript
'use strict';
const { describe, it, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
```

**v0.14 convention: `.mjs` with ESM imports** — used for regression sweep of older tests but NOT for new Phase 124 test file.

**Installation:** No packages needed — all Node.js builtins.

## Architecture Patterns

### Recommended Project Structure
```
tests/
└── phase-124/
    └── test-integration-nyquist.cjs    # Phase 124 Nyquist test file
```

### Pattern 1: Nyquist Integration Test File Structure
**What:** A single `.cjs` test file in `tests/phase-124/` that (1) fills any requirement gaps not covered by the six phase-specific test files, and (2) includes a meta-test that asserts all 7 v0.15 test files exist.

**When to use:** One per Nyquist integration phase.

**Example (meta-test section):**
```javascript
// Source: tests/phase-117/integration-nyquist.test.mjs (INTG-01 pattern adapted to .cjs)
describe('INTG-01: Nyquist structural tests exist for all 25 v0.15 requirements', () => {
  const V015_TEST_FILES = [
    'tests/phase-118/test-context-sync.cjs',
    'tests/phase-119/test-antigravity-stitch.cjs',
    'tests/phase-120/test-artifact-format.cjs',
    'tests/phase-121/test-mcp-server.cjs',
    'tests/phase-122/test-divergence.cjs',
    'tests/phase-123/test-context-sync-hook.cjs',
    'tests/phase-123/test-editor-sync-command.cjs',
    'tests/phase-124/test-integration-nyquist.cjs',
  ];

  it('all 8 v0.15 test files exist', () => {
    for (const f of V015_TEST_FILES) {
      const fullPath = path.join(PROJECT_ROOT, f);
      assert.ok(fs.existsSync(fullPath), `${f} must exist`);
    }
  });

  it('8 test files cover all 25 v0.15 requirements', () => {
    assert.equal(V015_TEST_FILES.length, 8,
      'Expected 8 v0.15 test files (7 from phases 118-123 + 1 from phase 124)');
  });
});
```

### Pattern 2: Gap-Filling Describe Blocks
**What:** For each v0.15 requirement not adequately covered by the phase-specific test files, add a targeted `describe` block that asserts the structural artifact exists and has the correct content shape.

**Coverage audit result (from direct inspection):**

| Requirement Group | Phase Test File | Internal Test Count | Gap Assessment |
|------------------|----------------|---------------------|---------------|
| CTX-01,02,03,04,08 | test-context-sync.cjs | 31 assertions | COVERED |
| CTX-05,STH-01,02,03 | test-antigravity-stitch.cjs | 32 (file passes) | COVERED |
| FMT-01,02,03 | test-artifact-format.cjs | 41 assertions | COVERED |
| MCP-01,02,03,04,05 | test-mcp-server.cjs | 27 assertions | MOSTLY COVERED — MCP-03 npx/dist structure may need additional gate |
| DIV-01,02,03,04,05,06 | test-divergence.cjs | 38 assertions | COVERED |
| CTX-06 | test-context-sync-hook.cjs | 7 assertions | COVERED |
| CTX-07 | test-editor-sync-command.cjs | 9 assertions | COVERED |

**MCP-03 gap analysis:** The current MCP-03 coverage tests `discoverPlanningDir` walk-up behavior. The REQUIREMENTS.md marks MCP-03 as "Pending" (not checked off). The Nyquist test should add structural assertions verifying: `packages/pde-mcp-server/dist/index.js` exists (built artifact), `dist/index.js` has a shebang for direct execution, and the bin field in package.json points to `dist/index.js`.

### Pattern 3: Cross-Milestone Regression Sweep
**What:** Run all v0.14 test files alongside all v0.15 test files to detect any regressions introduced by v0.15 changes to shared modules (e.g., context-sync.cjs, mcp-bridge.cjs).

**Command (Plan 02 verification):**
```bash
# v0.15 test suite (all 7 phase-specific files)
node --test \
  tests/phase-118/test-context-sync.cjs \
  tests/phase-119/test-antigravity-stitch.cjs \
  tests/phase-120/test-artifact-format.cjs \
  tests/phase-121/test-mcp-server.cjs \
  tests/phase-122/test-divergence.cjs \
  tests/phase-123/test-context-sync-hook.cjs \
  tests/phase-123/test-editor-sync-command.cjs \
  tests/phase-124/test-integration-nyquist.cjs

# v0.14 regression check (18 .mjs files)
node --test \
  tests/phase-108/mcp-bridge-playwright.test.mjs \
  tests/phase-109/wireframe-mockup-screenshots.test.mjs \
  tests/phase-110/critique-a11y-aom.test.mjs \
  tests/phase-110/deploy-smoke-test.test.mjs \
  tests/phase-111/a11y-metric.test.mjs \
  tests/phase-111/contrast-metric.test.mjs \
  tests/phase-111/dom-metric.test.mjs \
  tests/phase-111/mermaid-metric.test.mjs \
  tests/phase-111/responsive-metric.test.mjs \
  tests/phase-112/experiment-templates.test.mjs \
  tests/phase-113/pipeline-iterate-experiments.test.mjs \
  tests/phase-114/visual-regression.test.mjs \
  tests/phase-115/multi-candidate.test.mjs \
  tests/phase-116/brief-reference.test.mjs \
  tests/phase-116/ideation-visual.test.mjs \
  tests/phase-116/meta-optimization.test.mjs \
  tests/phase-116/pressure-test-visual.test.mjs \
  tests/phase-117/integration-nyquist.test.mjs
```

### Anti-Patterns to Avoid
- **Mixing .mjs and .cjs conventions:** New Phase 124 test file MUST be `.cjs` — all v0.15 tests are `.cjs`. Do not create `.mjs`.
- **Testing behavior, not structure:** Nyquist tests verify artifacts exist with correct shape, not runtime behavior. The phase-specific tests already cover behavior.
- **Importing TypeScript source directly:** The MCP server has TypeScript source (`src/`) and compiled output (`dist/`). Tests import `handlers.cjs` and `discover.cjs` (plain CJS), never the `.ts` files.
- **Hardcoding counts that will change:** Avoid `assert.equal(TOOL_MAP.length, N)` style assertions unless you've confirmed N won't change. The v0.14 Nyquist phase had to fix exactly this pattern.
- **Skipping the meta-test:** Prior phases show the meta-test (asserting all test files exist) is the structural registration mechanism — do not omit it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Temp directory for test fixtures | Custom mktemp logic | `fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'))` | Already the established pattern in all 7 existing test files |
| YAML frontmatter parsing | Custom regex parser | Direct string assertions (`content.includes('---')`, `content.includes('description:')`) | Nyquist tests are structural; full YAML parsing is over-engineering |
| File content deep comparison | Custom diff logic | `assert.ok(content.includes('expected-string'))` | Structural tests check presence, not exact content |
| Running the full test suite | Shell script | `node --test <file-list>` | node:test handles multiple files natively |

**Key insight:** Nyquist tests are intentionally shallow. They verify artifacts are structurally present and shaped correctly — they are regression gates, not functional test suites. The phase-specific tests own functional coverage.

## Common Pitfalls

### Pitfall 1: MCP-03 Coverage Ambiguity
**What goes wrong:** The REQUIREMENTS.md shows MCP-03 as "Pending" (unchecked). The phase-121 test covers `discoverPlanningDir` under the MCP-03 label, but the npx distribution aspect (built `dist/index.js`, shebang, correct bin field) may be inadequately gated.
**Why it happens:** Phase 121 implemented two plans — plan 01 (TDD, the CJS handlers/discover) is complete, but plan 02 (TypeScript build, npx distribution) appears incomplete per ROADMAP ("121-02-PLAN.md — TypeScript build, npx distribution, human verification" is unchecked).
**How to avoid:** The Phase 124 Nyquist test should verify `packages/pde-mcp-server/dist/index.js` exists (confirming build happened) and has a `#!/usr/bin/env node` shebang. If `dist/index.js` does not exist at test time, the test will fail and signal that Phase 121 plan 02 needs completion before Phase 124 can pass.
**Warning signs:** `fs.existsSync(path.join(PROJECT_ROOT, 'packages/pde-mcp-server/dist/index.js'))` returns false.

**Verification:** Direct inspection confirms `packages/pde-mcp-server/dist/index.js` currently EXISTS. MCP-03 structural gate is achievable.

### Pitfall 2: count-based regression in prior tests
**What goes wrong:** v0.15 may have added entries to shared modules (e.g., `context-sync.cjs` exports, `mcp-bridge.cjs` TOOL_MAP) that break hardcoded count assertions in older tests.
**Why it happens:** Phase 117 encountered exactly this — Phase 109 added `playwright:resize` to TOOL_MAP, breaking 4 count assertions in phases 40-43.
**How to avoid:** During the Plan 02 regression sweep, run all v0.14 tests and inspect any failures. If count assertions fail, update them to match the new counts and document the reason.
**Warning signs:** TAP output shows `AssertionError: Expected N entries, got M` in tests from phases 40-83.

### Pitfall 3: File format mismatch between v0.14 and v0.15 test conventions
**What goes wrong:** Creating Phase 124 test as `.mjs` (v0.14 convention) instead of `.cjs` (v0.15 convention).
**Why it happens:** The v0.14 Nyquist test (`integration-nyquist.test.mjs`) uses `.mjs` with ESM. All v0.15 tests use `.cjs` with `require()`.
**How to avoid:** Phase 124 file must be `tests/phase-124/test-integration-nyquist.cjs` using `'use strict'` and `require('node:test')`.
**Warning signs:** File named `integration-nyquist.test.mjs` or containing `import { describe }`.

### Pitfall 4: Missing temp directory cleanup
**What goes wrong:** Tests create temp directories with `fs.mkdtempSync` but don't clean them up in `after()` hooks.
**Why it happens:** Forgetting cleanup in error paths.
**How to avoid:** Always wrap temp dir operations in try/finally with `fs.rmSync(tmpDir, { recursive: true, force: true })`. Pattern established in all 7 existing test files.
**Warning signs:** `/tmp/pde-test-*` directories accumulating on disk.

### Pitfall 5: MCP server test requires built dist
**What goes wrong:** Tests that check `dist/index.js` existence fail in CI or after a clean checkout if the TypeScript hasn't been compiled.
**Why it happens:** TypeScript compilation output is gitignored.
**How to avoid:** The `dist/` directory IS present in the repo (gitignored or not) — confirmed by direct inspection. The Nyquist test verifies file existence only; it does not run the server binary. The test will catch if dist gets deleted.
**Warning signs:** `ls packages/pde-mcp-server/dist/` returns empty or error.

## Code Examples

Verified patterns from existing codebase:

### Standard .cjs Test File Header
```javascript
// Source: tests/phase-118/test-context-sync.cjs
'use strict';

/**
 * test-integration-nyquist.cjs — Phase 124 Integration & Nyquist
 *
 * Fills coverage gaps for v0.15 requirements not explicitly tested in phases 118-123.
 * Covers: MCP-03 dist structure, INTG-01 meta-test
 *
 * Run: node --test tests/phase-124/test-integration-nyquist.cjs
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
```

### MCP-03 Dist Structure Assertions (gap fill)
```javascript
// Source: Derived from test-mcp-server.cjs pattern + dist inspection
describe('MCP-03: npx distributable structure', () => {
  const PKG_PATH = path.join(PROJECT_ROOT, 'packages', 'pde-mcp-server', 'package.json');
  const DIST_INDEX = path.join(PROJECT_ROOT, 'packages', 'pde-mcp-server', 'dist', 'index.js');

  it('dist/index.js exists (TypeScript build artifact)', () => {
    assert.ok(fs.existsSync(DIST_INDEX), `dist/index.js must exist at ${DIST_INDEX}`);
  });

  it('dist/index.js has executable shebang line', () => {
    const content = fs.readFileSync(DIST_INDEX, 'utf8');
    const firstLine = content.split('\n')[0];
    assert.ok(
      firstLine.includes('#!/usr/bin/env node'),
      `dist/index.js must start with #!/usr/bin/env node shebang, got: ${firstLine}`
    );
  });

  it('package.json bin field points to dist/index.js', () => {
    const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
    const binPath = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin['pde-mcp-server'];
    assert.ok(binPath.includes('dist/index.js'), `bin must point to dist/index.js, got: ${binPath}`);
  });
});
```

### Meta-Test File Registration (INTG-01 pattern)
```javascript
// Source: tests/phase-117/integration-nyquist.test.mjs INTG-01 section, adapted to .cjs
describe('INTG-01: Nyquist structural tests exist for all 25 v0.15 requirements', () => {
  const V015_TEST_FILES = [
    'tests/phase-118/test-context-sync.cjs',
    'tests/phase-119/test-antigravity-stitch.cjs',
    'tests/phase-120/test-artifact-format.cjs',
    'tests/phase-121/test-mcp-server.cjs',
    'tests/phase-122/test-divergence.cjs',
    'tests/phase-123/test-context-sync-hook.cjs',
    'tests/phase-123/test-editor-sync-command.cjs',
    'tests/phase-124/test-integration-nyquist.cjs',
  ];

  it('all 8 v0.15 test files exist', () => {
    for (const f of V015_TEST_FILES) {
      const fullPath = path.join(PROJECT_ROOT, f);
      assert.ok(fs.existsSync(fullPath), `${f} must exist`);
    }
  });

  it('8 test files cover all 25 v0.15 requirements', () => {
    assert.equal(V015_TEST_FILES.length, 8,
      'Expected 8 v0.15 test files (7 from phases 118-123 + 1 from phase 124)');
  });
});
```

### Running the full v0.15 test suite (quick)
```bash
# Source: Pattern from all prior Nyquist phase verification sections
node --test \
  tests/phase-118/test-context-sync.cjs \
  tests/phase-119/test-antigravity-stitch.cjs \
  tests/phase-120/test-artifact-format.cjs \
  tests/phase-121/test-mcp-server.cjs \
  tests/phase-122/test-divergence.cjs \
  tests/phase-123/test-context-sync-hook.cjs \
  tests/phase-123/test-editor-sync-command.cjs
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| .mjs ESM test files | .cjs CJS test files | Phase 118 | All new v0.15 tests use .cjs; v0.14 tests remain .mjs |
| Single test file per phase dir | Multiple test files per phase dir (phase-123 has 2) | Phase 123 | Phase 124 should enumerate all 8 files including both phase-123 files |
| Nyquist file count as separate INTG requirement | Nyquist coverage as inline describe block | Phase 117 | The meta-test is part of the integration file, not a separate artifact |

**Known state:**
- 154 internal assertions across 7 v0.15 test files currently pass (verified 2026-03-24)
- v0.14 tests (18 .mjs files) currently pass — no v0.15 regressions detected in spot check
- `packages/pde-mcp-server/dist/index.js` exists and is built
- MCP-03 is marked "Pending" in REQUIREMENTS.md but structurally implementable

## Open Questions

1. **MCP-03 "Pending" status**
   - What we know: REQUIREMENTS.md has `- [ ] **MCP-03**` (unchecked). The `dist/index.js` file EXISTS. The test-mcp-server.cjs covers discovery and all 10 tools. ROADMAP shows "121-02-PLAN.md — TypeScript build, npx distribution, human verification" as unchecked.
   - What's unclear: Was Phase 121 plan 02 never executed, or was it executed but the ROADMAP not updated?
   - Recommendation: The Nyquist test should assert `dist/index.js` exists and has a shebang. If that passes, MCP-03 is structurally satisfied regardless of ROADMAP checkbox state. The Phase 124 planner should treat MCP-03 as structurally achievable.

2. **Context file syntax validation (Success Criterion 3)**
   - What we know: The ROADMAP success criteria includes "Generated context files are syntactically valid for their target editors (YAML frontmatter in .mdc, @file imports in GEMINI.md, valid markdown in AGENTS.md)."
   - What's unclear: The existing test-context-sync.cjs already checks YAML frontmatter presence. Is this criterion already met, or does Phase 124 need a new dedicated test?
   - Recommendation: The existing CTX-02 tests in test-context-sync.cjs check YAML frontmatter structure (starts with ---, has description field, has correct filenames). This adequately covers success criterion 3 — no new tests needed, just reference them in the meta-test.

3. **MCP Inspector live test (Success Criterion 4)**
   - What we know: ROADMAP says "MCP server responds correctly to all 10 tool invocations when tested via MCP Inspector or equivalent." The existing test-mcp-server.cjs calls all 10 handlers directly via `require(HANDLERS_PATH)`.
   - What's unclear: Does "MCP Inspector" mean a live JSON-RPC test is required, or is handler-level testing equivalent?
   - Recommendation: The existing handler tests in test-mcp-server.cjs are the structural equivalent. A full JSON-RPC smoke test via `node packages/pde-mcp-server/dist/index.js` would require process spawning and is out of scope for structural Nyquist tests. The planner should treat handler-level tests as satisfying this criterion.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | node:test (Node.js built-in) |
| Config file | none |
| Quick run command | `node --test tests/phase-124/test-integration-nyquist.cjs` |
| Full suite command | `node --test tests/phase-118/test-context-sync.cjs tests/phase-119/test-antigravity-stitch.cjs tests/phase-120/test-artifact-format.cjs tests/phase-121/test-mcp-server.cjs tests/phase-122/test-divergence.cjs tests/phase-123/test-context-sync-hook.cjs tests/phase-123/test-editor-sync-command.cjs tests/phase-124/test-integration-nyquist.cjs` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CTX-01 | AGENTS.md generated with correct structure | structural | `node --test tests/phase-118/test-context-sync.cjs` | YES |
| CTX-02 | 5 .mdc files with YAML frontmatter | structural | `node --test tests/phase-118/test-context-sync.cjs` | YES |
| CTX-03 | .cursorrules at root | structural | `node --test tests/phase-118/test-context-sync.cjs` | YES |
| CTX-04 | GEMINI.md files with @file imports | structural | `node --test tests/phase-118/test-context-sync.cjs` | YES |
| CTX-05 | .agent/skills/pde-design/SKILL.md exists | structural | `node --test tests/phase-119/test-antigravity-stitch.cjs` | YES |
| CTX-06 | Hook-driven regeneration with hash idempotency | unit | `node --test tests/phase-123/test-context-sync-hook.cjs` | YES |
| CTX-07 | /pde:editor-sync command exists and delegates | structural | `node --test tests/phase-123/test-editor-sync-command.cjs` | YES |
| CTX-08 | Hash-based staleness marker in all generated files | structural | `node --test tests/phase-118/test-context-sync.cjs` | YES |
| MCP-01 | package.json with correct name and SDK dep | structural | `node --test tests/phase-121/test-mcp-server.cjs` | YES |
| MCP-02 | 10 tool handlers exported from handlers.cjs | structural | `node --test tests/phase-121/test-mcp-server.cjs` | YES |
| MCP-03 | dist/index.js exists with shebang; bin field correct | structural | `node --test tests/phase-124/test-integration-nyquist.cjs` | NO — Wave 0 gap |
| MCP-04 | Pipeline resource handler returns correct structure | unit | `node --test tests/phase-121/test-mcp-server.cjs` | YES |
| MCP-05 | get-tokens returns @theme block | unit | `node --test tests/phase-121/test-mcp-server.cjs` | YES |
| STH-01 | DESIGN.md generated in Antigravity format | structural | `node --test tests/phase-119/test-antigravity-stitch.cjs` | YES |
| STH-02 | isStitchSource detects manifest metadata | unit | `node --test tests/phase-119/test-antigravity-stitch.cjs` | YES |
| STH-03 | emitDesignMd produces valid DESIGN.md | structural | `node --test tests/phase-119/test-antigravity-stitch.cjs` | YES |
| FMT-01 | @file annotations in handoff specs | unit | `node --test tests/phase-120/test-artifact-format.cjs` | YES |
| FMT-02 | DTCG to @theme + CSS custom properties | unit | `node --test tests/phase-120/test-artifact-format.cjs` | YES |
| FMT-03 | Framework detection from package.json | unit | `node --test tests/phase-120/test-artifact-format.cjs` | YES |
| DIV-01 | T1 structural file existence check | unit | `node --test tests/phase-122/test-divergence.cjs` | YES |
| DIV-02 | T2 regex interface comparison | unit | `node --test tests/phase-122/test-divergence.cjs` | YES |
| DIV-03 | T3 grep-based token usage check | unit | `node --test tests/phase-122/test-divergence.cjs` | YES |
| DIV-04 | DIVERGENCE.md report generation | unit | `node --test tests/phase-122/test-divergence.cjs` | YES |
| DIV-05 | /pde:check-divergence command structure | structural | `node --test tests/phase-122/test-divergence.cjs` | YES |
| DIV-06 | .pde-divergence-ignore suppression | unit | `node --test tests/phase-122/test-divergence.cjs` | YES |
| INTG-01 | All 8 v0.15 test files exist (meta-test) | structural | `node --test tests/phase-124/test-integration-nyquist.cjs` | NO — Wave 0 gap |

### Sampling Rate
- **Per task commit:** `node --test tests/phase-124/test-integration-nyquist.cjs`
- **Per wave merge:** Full v0.15 suite (8 files) + v0.14 regression sweep (18 files)
- **Phase gate:** Full suite green before `/pde:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-124/test-integration-nyquist.cjs` — covers MCP-03 dist structure + INTG-01 meta-test

*(7 of 8 v0.15 test files already exist; only the Phase 124 integration file is missing)*

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — all 7 v0.15 test files read and verified
- `.planning/phases/124-integration-and-nyquist/124-CONTEXT.md` — phase constraints
- `.planning/REQUIREMENTS.md` — all 25 v0.15 requirements with completion status
- `tests/phase-117/integration-nyquist.test.mjs` — canonical prior Nyquist pattern
- `.planning/milestones/v0.14-phases/117-integration-nyquist/117-01-PLAN.md` — plan structure template
- `.planning/milestones/v0.14-phases/117-integration-nyquist/117-02-PLAN.md` — regression fix plan template
- Node.js `node:test` built-in — official test runner used throughout project

### Secondary (MEDIUM confidence)
- `packages/pde-mcp-server/dist/index.js` exists — confirmed by `ls` command (2026-03-24)
- MCP-03 "Pending" interpretation — inferred from REQUIREMENTS.md checkbox + ROADMAP plan completion state

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all v0.15 tests use identical node:test/node:assert/node:fs/node:path stack
- Architecture: HIGH — three prior Nyquist phases provide exact pattern; v0.15 convention (`.cjs`) confirmed by direct inspection
- Pitfalls: HIGH — MCP-03 gap identified by direct REQUIREMENTS.md inspection; count-regression pitfall documented from Phase 117 precedent

**Research date:** 2026-03-24
**Valid until:** 2026-04-23 (stable — no external dependencies)
