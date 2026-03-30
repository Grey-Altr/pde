---
phase: 188
slug: verification-coverage
researched: 2026-03-30
domain: Nyquist validation artifacts, YAML frontmatter editing, pde-tools CLI extension
confidence: HIGH
---

# Phase 188: Verification Coverage — Research

**Researched:** 2026-03-30
**Domain:** Nyquist VALIDATION.md authoring, SUMMARY.md frontmatter repair, pde-tools CLI extension
**Confidence:** HIGH

## Summary

Phase 188 has three independent work streams: (1) write Nyquist-compliant VALIDATION.md files for all 9 v0.22 phases (176–184), (2) add the missing `one-liner:` frontmatter field to exactly 5 v0.7 SUMMARY.md files, and (3) implement a new `pde-tools health consistency [version]` CLI subcommand that detects cross-artifact mismatches between REQUIREMENTS.md checkboxes, ROADMAP.md phase entries, and MILESTONES.md plan entries.

All three work streams are documentation or thin CLI additions — no new npm dependencies, no complex algorithms. The VALIDATION.md work is the most labor-intensive (9 files, each with assertions derived from that phase's VERIFICATION.md observable truths). The `health consistency` subcommand follows the well-established pattern of `validate consistency` in `bin/lib/verify.cjs` and belongs in either `verify.cjs` or a new `health.cjs` module.

**Primary recommendation:** Split into three plans: (1) VALIDATION.md backfill for phases 176–178 (stubs exist, need rewrite), (2) VALIDATION.md creation for phases 179–184 (no stubs exist) plus the 5 SUMMARY.md one-liner additions, and (3) `pde-tools health consistency` implementation. The VALIDATION.md work can proceed immediately from the VERIFICATION.md observable truths already documented.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None — discuss phase skipped.

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure/tooling phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

### Deferred Ideas (OUT OF SCOPE)
None — discuss phase skipped.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VER-01 | All 9 v0.22 phases (176–184) have VALIDATION.md files with `nyquist_compliant: true` frontmatter, derived from their existing VERIFICATION.md observable truths | Verified: all 9 VERIFICATION.md files exist with complete observable truths tables; phases 176–178 have draft stubs needing rewrite; phases 179–184 have no VALIDATION.md at all |
| VER-02 | All 5 v0.7 SUMMARY.md files include the `one-liner` frontmatter field with accurate descriptions | Verified: exactly 5 files missing `one-liner:` — 54-03, 55-01, 57-01, 57-02, 57-03; each has rich body content to derive an accurate description from |
| VER-03 | A `pde-tools health consistency` subcommand reports mismatches between requirements files, roadmap entries, and milestone entries for any given milestone version | Verified: pde-tools.cjs pattern established; `validate consistency` in verify.cjs is the nearest model; new `health` top-level command with `consistency` subcommand is required |
</phase_requirements>

---

## VALIDATION.md Gap Analysis

### Current State (as of 2026-03-30)

| Phase | VALIDATION.md Exists | Status | Action Required |
|-------|---------------------|--------|-----------------|
| 176 — Data Extraction IR Foundation | YES (`176-VALIDATION.md`) | `nyquist_compliant: false` — draft stub | Full rewrite |
| 177 — Command Interface + Workflow Shell | YES (`177-VALIDATION.md`) | `nyquist_compliant: false` — draft stub | Full rewrite |
| 178 — Reference Personas + Rendering Engine | YES (`178-VALIDATION.md`) | `nyquist_compliant: false` — draft stub | Full rewrite |
| 179 — SVG Charts | NO | Missing entirely | Create new |
| 180 — Claim Verification + PDF Export | NO | Missing entirely | Create new |
| 181 — Remaining Cluster A Personas | NO | Missing entirely | Create new |
| 182 — Remaining Cluster B Personas | NO | Missing entirely | Create new |
| 183 — Auto-Generation | NO | Missing entirely | Create new |
| 184 — Cross-Project Portfolio Synthesis | NO | Missing entirely | Create new |

**Location for all VALIDATION.md files:** `.planning/milestones/v0.22-phases/{phase-dir}/{phase-num}-VALIDATION.md`

### What "Nyquist-Compliant" Means for Shipped Phases

The standard VALIDATION.md template is a PRE-execution planning document (test commands, task maps, Wave 0 gaps). For SHIPPED phases, a Nyquist-compliant VALIDATION.md has a different purpose: it is a POST-execution document asserting that each observable truth from VERIFICATION.md can be programmatically confirmed.

Success criterion #2 in the ROADMAP is explicit: "Running any assertion from a VALIDATION.md file against its target produces a meaningful pass or fail — not just a key-existence check."

The required format for a Nyquist-compliant post-execution VALIDATION.md is:

```yaml
---
phase: {N}
slug: {slug}
status: complete
nyquist_compliant: true
verified: {date from VERIFICATION.md}
---
```

With assertions derived from each observable truth — expressed as runnable commands that produce meaningful output, not just `test -f` checks.

---

## V0.22 Phase Observable Truths Inventory

A summary of what each phase's VERIFICATION.md states, for use when writing VALIDATION.md assertions:

### Phase 176 — Data Extraction IR Foundation (12 truths)
Key runnable assertions:
- `node bin/pde-tools.cjs presentation artifact-read` → produces valid JSON with 17 keys including `schema_version: "1.0"`
- `node -e "const p = require('./bin/lib/presentation.cjs'); const ir = await p.buildPresentationIR(process.cwd()); console.log(ir.project.name)"` → returns real project name (not sentinel)
- `npx vitest run tests/phase-176/ --reporter=verbose` → 38 tests pass
- `grep -c 'unavailable.*true' bin/lib/presentation.cjs` → returns 14 (sentinel count)

### Phase 177 — Command Interface + Workflow Shell (4 truths)
Key runnable assertions:
- `test -f commands/present.md` → exists with `name: pde:present` frontmatter
- `grep -c 'pde:present' skill-registry.md` → returns ≥1 (PRS skill code registered)
- `npx vitest run tests/phase-177/ --reporter=verbose` → 32 tests pass
- `grep -c 'artifact-read' workflows/present.md` → confirms IR acquisition step

### Phase 178 — Reference Personas + Rendering Engine (9 truths)
Key runnable assertions:
- `node bin/pde-tools.cjs presentation render executive-summary /tmp/test-178.html /tmp/test-178.md` → produces files with `htmlBytes > 0`
- `grep -c '<script' /tmp/test-178.html` → returns 0 (no script tags)
- `grep -c '<nav class="toc">' /tmp/test-178.html` → returns 1 (TOC present)
- `npx vitest run tests/phase-178/ --reporter=verbose` → 34 tests pass

### Phase 179 — SVG Charts (9 truths)
Key runnable assertions:
- `node -e "const c = require('./bin/lib/charts.cjs'); console.log(Object.keys(c))"` → returns all 4 chart function names
- `node -e "const c = require('./bin/lib/charts.cjs'); const svg = c.burndownChart({requirements:{unavailable:true}}); console.log(svg.includes('unavailable'))"` → returns `true`
- `node -e "const c = require('./bin/lib/charts.cjs'); const svg = c.burndownChart({}); console.log(svg.includes('<polyline'))"` → returns `true`
- `npx vitest run tests/phase-179/ --reporter=verbose` → 48 tests pass

### Phase 180 — Claim Verification + PDF Export (6 truths)
Key runnable assertions:
- `node -e "const m=require('./bin/lib/verify-presentation.cjs'); console.log(Object.keys(m))"` → returns `['buildClaimsMap','verifyPresentation','buildVerificationFooterHtml']`
- `node -e "const m=require('./bin/lib/export-pdf.cjs'); console.log(Object.keys(m))"` → returns `['exportPdf','cmdPresentationPdf']`
- `grep -c "subcommand === 'pdf'" bin/pde-tools.cjs` → returns 1
- `npx vitest run tests/phase-180/ --reporter=verbose` → 43 tests pass (35 + 8)

### Phase 181 — Remaining Cluster A Personas (12 truths)
Key runnable assertions:
- `node -e "const r = require('./bin/lib/render-presentation.cjs'); console.log(typeof r.buildInvestorUpdate)"` → returns `function`
- `node -e "const r = require('./bin/lib/render-presentation.cjs'); ['investor-update','sprint-review','client-deliverable','stakeholder-status','pm-view','project-manager-view'].forEach(s => { const sections = r.buildInvestorUpdate && r[Object.keys(r).find(k=>k.toLowerCase().includes('investor'))]?.({}); });"` → no throws
- `npx vitest run tests/phase-181/ --reporter=verbose` → 42 tests pass, 0 skipped

### Phase 182 — Remaining Cluster B Personas (14 truths)
Key runnable assertions:
- `grep -c "case '" bin/lib/render-presentation.cjs` → returns 15 (all persona switch cases)
- `node -e "const r = require('./bin/lib/render-presentation.cjs'); ['executive-summary','case-study','investor-update','sprint-review','client-deliverable','stakeholder-status','pm-view','project-manager-view','agile-report','design-report','research-report','post-mortem','adr-summary','launch-announcement','portfolio-overview'].forEach(slug => r.render({project:{name:'T'}},slug,'/tmp/t.html','/tmp/t.md'))"` → no throws for any slug
- `npx vitest run tests/phase-182/ --reporter=verbose` → 66 tests pass, 0 skipped

### Phase 183 — Auto-Generation (5 truths)
Key runnable assertions:
- `grep -c 'auto_generate_presentations' workflows/execute-phase.md` → returns ≥1
- `grep -c 'auto_generate_presentations' workflows/complete-milestone.md` → returns ≥1
- `grep -c 'presentations.auto_generate' bin/lib/config.cjs` → returns ≥1 (key registered)
- `npx vitest run tests/phase-183/ --reporter=verbose` → 9 tests pass

### Phase 184 — Cross-Project Portfolio Synthesis (9 truths)
Key runnable assertions:
- `node bin/pde-tools.cjs portfolio build` → returns JSON with `project_count: 0` (empty input handled)
- `node -e "const p = require('./bin/lib/portfolio.cjs'); console.log(Object.keys(p))"` → returns `['detectSchemaVersion','extractMilestoneHistory','buildPortfolioIR','cmdPortfolioBuild']`
- `test -f commands/portfolio.md && grep -c 'pde:portfolio' commands/portfolio.md` → returns 1
- `npx vitest run tests/phase-184/ --reporter=verbose` → 23 tests pass

---

## V0.7 SUMMARY.md One-Liner Gap Analysis

### Exact 5 Files Requiring `one-liner:` Addition

| File | Current State | Content Available to Derive One-Liner From |
|------|--------------|---------------------------------------------|
| `54-03-SUMMARY.md` | Has no `one-liner` key | Plugin install path verified, MILESTONES.md v0.6 section, commit exceptions documented |
| `55-01-SUMMARY.md` | Has no `one-liner` key | `pde-research-validator` agent definition + `RESEARCH-VALIDATION.md` template, `artifact_content` pattern |
| `57-01-SUMMARY.md` | Has no `one-liner` key | Workflow Integration plan 01 — research validation gate in `plan-phase.md` Step 5.7 |
| `57-02-SUMMARY.md` | Has no `one-liner` key | Workflow Integration plan 02 — content in body |
| `57-03-SUMMARY.md` | Has no `one-liner` key | Workflow Integration plan 03 — content in body |

**Note on 54-01:** Has `one_liner:` (underscore) which is a variant. The extractor (`commands.cjs` line 304) reads `fm['one-liner']` (hyphen), so `one_liner` is NOT extracted. Whether to fix 54-01's key is at Claude's discretion — the REQUIREMENTS specifically says "5 files" which aligns with the 5 completely missing files. Recommendation: fix only the 5 identified above; do not change 54-01's working `one_liner` key to avoid changing a shipped plan document unnecessarily.

**Field name to use:** `one-liner:` (hyphen), matching the template at `templates/summary.md` line 15 and the extractor at `bin/lib/commands.cjs` line 304.

**How to derive accurate descriptions:** Read the body of each SUMMARY.md file, which contains a narrative summary in the first non-frontmatter section. The one-liner must accurately describe what shipped — not invented.

---

## `pde-tools health consistency` Implementation Research

### Command Signature (from ROADMAP success criterion #4)

```
pde-tools health consistency [version]
```

Where `[version]` is a milestone version string like `v0.22`. Reports mismatches between:
1. Requirements file checkboxes (REQUIREMENTS.md or milestones/{version}-REQUIREMENTS.md)
2. Roadmap phase entries (ROADMAP.md or milestones/{version}-ROADMAP.md)
3. Milestone plan entries (MILESTONES.md or milestones/{version}-MILESTONE-AUDIT.md)

### Existing Pattern: `validate consistency` (HIGH confidence)

The nearest model is `cmdValidateConsistency` in `bin/lib/verify.cjs` (line 397). It:
- Reads ROADMAP.md and `.planning/phases/` disk entries
- Compares roadmap phases against disk phases
- Reports warnings for mismatches as a structured JSON object

The new `health consistency` command differs: it compares three documents' state for a specific milestone version, not the active phases directory.

### Implementation Location Decision

Two options:
1. Add `case 'health':` to `bin/pde-tools.cjs` routing to a new function in `verify.cjs`
2. Create a new `bin/lib/health.cjs` module (cleaner separation, follows the pattern of how `presentation.cjs` and `portfolio.cjs` were added for phases 176 and 184)

**Recommendation:** Add to `verify.cjs` (simpler, no new file, similar to how `cmdValidateConsistency` lives there). Add `case 'health':` as a top-level command in `pde-tools.cjs` with `consistency` as a subcommand.

### What "Mismatch" Means

For a milestone version like `v0.22`:
- **Requirements file checkboxes**: `milestones/v0.22-REQUIREMENTS.md` — unchecked `- [ ]` items for requirements that ROADMAP shows as complete phases
- **Roadmap phase entries**: ROADMAP.md `v0.22` section — phases marked `[x]` (complete) vs `[ ]` (pending)
- **Milestone plan entries**: `milestones/v0.22-MILESTONE-AUDIT.md` or MILESTONES.md v0.22 section — plan count, phases completed

A mismatch example: ROADMAP shows Phase 180 `[x]` complete, REQUIREMENTS.md has `VER-01 [ ]` (unchecked) mapped to Phase 180. This is the exact class of drift Phase 185 fixed for v0.22.

### File Lookup Strategy for `health consistency v0.22`

```
milestones/v0.22-REQUIREMENTS.md  → requirement checkbox states
milestones/v0.22-ROADMAP.md       → phase completion states
MILESTONES.md                      → milestone plan/phase counts
milestones/v0.22-MILESTONE-AUDIT.md → (optional, if present)
```

For `health consistency` without a version, default to checking active milestone from `STATE.md` frontmatter.

### Output Format

Following the `cmdValidateConsistency` pattern, output a JSON object with:
```json
{
  "version": "v0.22",
  "passed": true/false,
  "mismatches": [...],
  "warnings": [...]
}
```

Each mismatch entry: `{ type, requirement_id, expected_state, actual_state, file }`

### Tests Required

Must include vitest unit tests:
- `health consistency v0.22` with known-clean fixture → returns `passed: true, mismatches: []`
- `health consistency v0.22` with fabricated mismatch fixture → returns specific mismatch entries
- `health consistency` without version → reads STATE.md for current milestone
- Unknown version → returns structured error (not throw)

---

## Architecture Patterns

### Nyquist-Compliant VALIDATION.md Format for Shipped Phases

Based on the success criteria and success criterion #2 ("produces meaningful pass or fail"), the format for a post-execution Nyquist VALIDATION.md is:

```markdown
---
phase: {N}
slug: {slug}
status: complete
nyquist_compliant: true
verified: {ISO date from VERIFICATION.md}
---

# Phase {N} — Nyquist Validation

> Post-execution validation assertions. Each assertion below can be run against the codebase to confirm the phase goal is still met.

## Assertions

### Truth 1: {description from VERIFICATION.md observable truth}
**Command:** `{runnable command}`
**Expected:** {what a passing result looks like}
**Meaningful because:** {why this checks behavior, not just existence}

### Truth 2: ...
```

This differs fundamentally from the pre-execution planning VALIDATION.md template. The planner MUST create a custom format that satisfies the success criteria, not reuse the standard template.

### pde-tools Extension Pattern

```javascript
// In pde-tools.cjs switch statement (before default: case)
case 'health': {
  const subcommand = args[1];
  if (subcommand === 'consistency') {
    const version = args[2]; // optional
    verify.cmdHealthConsistency(cwd, version, raw);
  } else {
    error('Unknown health subcommand. Available: consistency');
  }
  break;
}
```

```javascript
// In bin/lib/verify.cjs
function cmdHealthConsistency(cwd, version, raw) {
  // 1. Resolve version from arg or STATE.md
  // 2. Load milestones/{version}-REQUIREMENTS.md
  // 3. Load milestones/{version}-ROADMAP.md
  // 4. Load MILESTONES.md, find version section
  // 5. Compare checkbox states, phase completion states, plan counts
  // 6. Return structured mismatch report
}
```

### Standard Stack

| Tool | Purpose | Where Used |
|------|---------|------------|
| `fs.readFileSync` / `fs.existsSync` | File reading | verify.cjs pattern |
| `extractFrontmatter` from `frontmatter.cjs` | Parse YAML frontmatter | Used throughout verify.cjs |
| `output` from `core.cjs` | Structured JSON output | All pde-tools commands |
| `error` from `core.cjs` | Error exit | All pde-tools commands |
| `vitest` | Tests for health.consistency | Existing test framework |

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| YAML frontmatter parsing | Custom YAML parser | `extractFrontmatter` from `bin/lib/frontmatter.cjs` |
| Structured JSON output | Custom stdout formatting | `output(result, raw, status)` from `core.cjs` |
| Error exits | `process.exit()` directly | `error(message)` from `core.cjs` |
| Checkbox parsing | Custom regex | Regex pattern `- \[[ xX]\]` — already used in `verify.cjs` |

---

## Common Pitfalls

### Pitfall 1: VALIDATION.md As Planning Document vs. Compliance Document
**What goes wrong:** Writing a VALIDATION.md with test commands for pre-execution (Wave 0 gaps, TDD status) instead of post-execution assertions confirming what already shipped.
**Why it happens:** The standard template in `templates/VALIDATION.md` is a planning document. Using it for shipped phases produces `nyquist_compliant: false` stubs (exactly what phases 176-178 currently have).
**How to avoid:** Write assertions based on VERIFICATION.md observable truths. Each assertion runs a command against the live codebase. Status should be `complete`, not `draft`.
**Warning signs:** Status field says `draft`; task IDs reference plan waves; Wave 0 gaps section is non-empty.

### Pitfall 2: "Key-Existence Checks" as Assertions
**What goes wrong:** Writing `test -f bin/lib/presentation.cjs` as an assertion. This passes even if the file is empty or broken.
**Why it happens:** File existence is easy to assert.
**How to avoid:** Success criterion #2 requires assertions that produce "meaningful pass or fail — not just a key-existence check." Use `node -e "require('./bin/lib/presentation.cjs')"` (loads the module) or run the actual test suite.
**Warning signs:** All assertions are `test -f` or `grep -l` patterns.

### Pitfall 3: Missing the Exact 5 SUMMARY.md Files
**What goes wrong:** Adding `one-liner:` to wrong files (e.g., to 54-01 which already has `one_liner:`) or missing one of the 5.
**Why it happens:** The files have `one_liner:` (underscore) which looks like it satisfies VER-02 but doesn't — the extractor reads `one-liner` (hyphen).
**How to avoid:** The exact 5 files are: 54-03, 55-01, 57-01, 57-02, 57-03. Use `grep -c "^one-liner:" <file>` to verify.

### Pitfall 4: `health consistency` Without Version Argument Throws
**What goes wrong:** Omitting the version argument causes an uncaught exception or confusing error.
**Why it happens:** Code does `args[2]` and passes undefined to file path operations.
**How to avoid:** When version is absent, fall back to current milestone from `STATE.md` frontmatter field `milestone`. Return a clear error if STATE.md is also missing.

### Pitfall 5: Confusing `validate consistency` with `health consistency`
**What goes wrong:** Implementer extends `validate consistency` instead of creating new `health` top-level command.
**Why it happens:** The existing `validate consistency` command exists and seems related.
**How to avoid:** ROADMAP success criterion says `pde-tools health consistency [version]` — this is a new top-level command `health`, not an extension of `validate`. The existing `validate consistency` checks phase numbering/disk sync; the new `health consistency` checks cross-artifact requirement state for a milestone version.

---

## Validation Architecture

Nyquist validation is enabled (`workflow.nyquist_validation: true` in config.json).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest |
| Config file | vitest.config.ts (root) |
| Quick run command | `npx vitest run tests/phase-188/ --reporter=verbose` |
| Full suite command | `npx vitest run tests/phase-188/ --reporter=verbose` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VER-01 | VALIDATION.md files have `nyquist_compliant: true` frontmatter | smoke | `node -e "const fs=require('fs'); [176,177,178,179,180,181,182,183,184].forEach(n => { const dirs=fs.readdirSync('.planning/milestones/v0.22-phases').filter(d=>d.startsWith(n+'')); const f=dirs[0]+'/'+n+'-VALIDATION.md'; const c=fs.readFileSync('.planning/milestones/v0.22-phases/'+f,'utf8'); if(!c.includes('nyquist_compliant: true')) throw new Error(n+' not compliant'); });"` | ❌ Wave 0 |
| VER-02 | 5 v0.7 SUMMARY files have `one-liner:` frontmatter | smoke | `for f in 54-03 55-01 57-01 57-02 57-03; do grep -q "^one-liner:" ... || exit 1; done` | ❌ Wave 0 |
| VER-03 | `pde-tools health consistency v0.22` reports mismatches | unit | `npx vitest run tests/phase-188/health-consistency.test.mjs` | ❌ Wave 0 |

### Wave 0 Gaps
- [ ] `tests/phase-188/health-consistency.test.mjs` — unit tests for `cmdHealthConsistency`
- [ ] Test fixtures for version-specific REQUIREMENTS.md/ROADMAP.md mismatch scenarios

---

## Environment Availability

Step 2.6: SKIPPED — this phase makes no external tool calls. All work is file editing and CJS module addition within the existing pde-tools infrastructure.

---

## Sources

### Primary (HIGH confidence)
- Direct file inspection: all 9 v0.22 VERIFICATION.md files read — observable truths confirmed
- Direct file inspection: all 11 v0.7 SUMMARY.md files read — one-liner gap confirmed (5 files)
- Direct code inspection: `bin/pde-tools.cjs`, `bin/lib/verify.cjs`, `bin/lib/commands.cjs` — patterns for extension confirmed
- Direct inspection: `templates/VALIDATION.md`, `templates/summary.md` — canonical field names confirmed
- Direct inspection: `.planning/milestones/v0.22-MILESTONE-AUDIT.md` — Nyquist compliance gap documented
- Direct inspection: `.planning/REQUIREMENTS.md` — VER-01, VER-02, VER-03 requirements confirmed
- Direct inspection: `.planning/ROADMAP.md` — Phase 188 success criteria confirmed

### Secondary (MEDIUM confidence)
- `.planning/research/FEATURES.md` — "5 v0.7 SUMMARY files missing" count confirmed and context verified
- `.planning/milestones/v0.7-MILESTONE-AUDIT.md` — tech debt entry confirms 5-file count

---

## Metadata

**Confidence breakdown:**
- VALIDATION.md content: HIGH — all VERIFICATION.md observable truths are available; no inference required
- SUMMARY.md one-liner: HIGH — exact 5 files identified, content available to derive accurate descriptions
- `health consistency` architecture: HIGH — existing `cmdValidateConsistency` in verify.cjs provides direct pattern

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable — no external dependencies, no evolving libraries)
