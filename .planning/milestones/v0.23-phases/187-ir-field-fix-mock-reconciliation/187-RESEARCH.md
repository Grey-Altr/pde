# Phase 187: IR Field Fix + Mock Reconciliation - Research

**Researched:** 2026-03-30
**Domain:** CJS source code — buildCrossPatterns field access bug + test mock shape reconciliation
**Confidence:** HIGH

## Summary

Phase 187 is a targeted two-part code fix. The root cause is a field name mismatch: `buildCrossPatterns` in `bin/lib/render-presentation.cjs` reads `project.ir.research.findings` (an array that does not exist in real IR), while `buildPresentationIR` in `bin/lib/presentation.cjs` actually produces `ir.research` as `{ project_research_files: number, topics: string[], phase_research_count: number }`. On real PDE project data the `findings` access returns `undefined`, which falls back to `[]`, so the "Research Findings" subsection is silently omitted from every cross-patterns render.

The fix has two parts that must land atomically: (1) update `buildCrossPatterns` to read `ir.research.topics` and `ir.research.project_research_files` instead of `ir.research.findings`, and (2) update the `makeMinimalIR` mock factory in `tests/phase-184/portfolio-render.test.mjs` to match the real IR shape. Currently the 23 tests pass because the mock still has the old `{ findings: [...] }` shape — which means the tests exercise a code path that no real project ever hits. After the code fix the old mock shape will produce wrong results, so both edits must land in the same commit.

**Primary recommendation:** Fix field access in `buildCrossPatterns` and update `makeMinimalIR` in the same commit — zero intermediate state.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
All implementation choices are at Claude's discretion — pure infrastructure/fix phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

### Claude's Discretion
All implementation choices.

### Deferred Ideas (OUT OF SCOPE)
None — discuss phase skipped.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INT-05 | `buildCrossPatterns` reads correct IR field names (`topics`/`project_research_files` instead of `research.findings`) and produces non-empty cross-patterns sections for real PDE projects | Confirmed by reading source: line 1453-1454 of render-presentation.cjs accesses `project.ir.research.findings` which is always `undefined` on real IR |
| INT-06 | Test mocks for Phase 184 portfolio tests use the real IR shape (matching `buildPresentationIR` output) rather than diverged mock structures | Confirmed: `makeMinimalIR` at line 66 of portfolio-render.test.mjs has `research: { findings: [...] }` which does not match `extractResearch()` output shape |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js CJS | (project runtime) | Source module format | All bin/lib/ modules are `.cjs` |
| Vitest | 4.1.1 | Test runner | Project standard, configured in vitest.config.ts |

No new libraries required. This phase edits existing CJS source and a `.mjs` test file.

**Version verification:** `npx vitest run --version` → 4.1.1

## Architecture Patterns

### Recommended Project Structure
```
bin/lib/
├── render-presentation.cjs   # buildCrossPatterns — source of the bug
├── presentation.cjs          # buildPresentationIR + extractResearch — truth source
tests/phase-184/
├── portfolio-render.test.mjs # makeMinimalIR mock — needs shape correction
├── portfolio.test.mjs        # no mock shape issue (no research field referenced)
├── portfolio-cmd.test.mjs    # no mock shape issue (CLI routing only)
```

### Pattern 1: IR Shape Contract

The `research` field in the IR produced by `buildPresentationIR` (via `extractResearch`) has this exact shape:

```javascript
// Source: bin/lib/presentation.cjs extractResearch() return value (lines 617-621)
{
  project_research_files: number,   // count of files in .planning/research/
  topics: string[],                 // basenames of files without extension
  phase_research_count: number,     // count of phases with -RESEARCH.md files
}
```

There is **no** `findings` property on this object. The `findings` array was a legacy/placeholder shape that never existed in production IR.

### Pattern 2: buildCrossPatterns Current Bug

```javascript
// Source: bin/lib/render-presentation.cjs lines 1450-1459 — BUGGY
const allFindings = [];
availableProjects.forEach(function(project) {
  const research = (project.ir && project.ir.research) || {};
  const findings = Array.isArray(research.findings) ? research.findings : [];
  // ^^^^ research.findings is ALWAYS undefined on real IR — always falls back to []
  findings.forEach(function(f) {
    const text = typeof f === 'string' ? f : (f.finding || '');
    if (text) allFindings.push(escHtml(text));
  });
});
```

`research.findings` does not exist on the real IR shape. `allFindings` is always `[]`. The "Research Findings" `<h4>` subsection is therefore never emitted.

### Pattern 3: Correct Fix for buildCrossPatterns

Replace the findings-based loop with a topics-based approach that maps to the real IR shape:

```javascript
// Target shape for buildCrossPatterns after fix
const allTopics = [];
availableProjects.forEach(function(project) {
  const research = (project.ir && project.ir.research) || {};
  const topics = Array.isArray(research.topics) ? research.topics : [];
  topics.forEach(function(t) {
    if (t) allTopics.push(escHtml(String(t)));
  });
});
```

The HTML emit block should reference `allTopics` and use a label like "Research Topics" or "Research Areas" instead of "Research Findings".

### Pattern 4: Mock Correction in portfolio-render.test.mjs

```javascript
// Current mock (WRONG): tests/phase-184/portfolio-render.test.mjs line 66
research: { findings: ['AI SDK patterns', 'schema version heterogeneity'] },

// Corrected mock (matches buildPresentationIR real output):
research: {
  project_research_files: 2,
  topics: ['ai-sdk-patterns', 'schema-heterogeneity'],
  phase_research_count: 3,
},
```

### Pattern 5: Atomicity Requirement

The requirement "mock update is atomic with the code fix" means both edits must land in a **single commit**. No commit may exist where:
- The code fix is present but the mock is still `{ findings: [...] }` (tests would still pass against wrong shape)
- The mock is updated but the code fix is not present (tests might fail depending on what assertions they make)

Since the test currently passes with the old mock shape (because the mock has `findings` and the code reads `findings`), the correct sequence is:
1. Edit `render-presentation.cjs` — fix `buildCrossPatterns`
2. Edit `portfolio-render.test.mjs` — fix `makeMinimalIR`
3. Run `npx vitest run tests/phase-184/` to verify all 23 pass
4. Commit both files together

### Anti-Patterns to Avoid

- **Partial commit:** Committing the code fix without the mock update (or vice versa). The requirement is explicit: "no intermediate state where tests pass against wrong shapes."
- **Changing test assertions:** The existing test assertions are correct. The tests check structural properties (non-empty content string, correct section IDs, etc.) and do NOT assert specific text like "Research Findings." Assertions stay unchanged; only the mock fixture and the source code change.
- **Adding `findings` support back:** The fix should not add a fallback path to handle `findings` in addition to `topics`. That would preserve the dead code path. Use the real shape exclusively.
- **Touching other render-presentation.cjs functions:** `buildResearchFindings`, `buildResearchRecommendations`, and `buildCompetitiveLandscape` (lines 869–967) also access `ir.research.findings` — but they operate on the **single-project presentation IR** passed directly to persona renderers, not the portfolioIR. Those functions are out of scope for this phase.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Running tests | Manual node invocation | `npx vitest run tests/phase-184/` | Vitest already configured, handles ESM/CJS boundary |
| IR shape introspection | Dynamic runtime checking | Read `extractResearch()` return shape at line 617-621 in presentation.cjs | Shape is deterministic and documented |

## Common Pitfalls

### Pitfall 1: Touching Single-Project Research Render Functions
**What goes wrong:** Editing `buildResearchFindings` / `buildResearchRecommendations` / `buildCompetitiveLandscape` (lines 869-967) alongside `buildCrossPatterns`.
**Why it happens:** These functions also access `ir.research.findings`. Superficially looks like the same bug.
**How to avoid:** Those functions render the single-project presentation IR (not portfolioIR). The single-project IR has a different context — the test mocks for single-project personas pass their own IR shape. INT-05 is scoped to `buildCrossPatterns` and the portfolio path only.
**Warning signs:** If the diff touches lines outside the 1433-1482 range of render-presentation.cjs.

### Pitfall 2: Incorrect Test Isolation Assumption
**What goes wrong:** Assuming only `portfolio-render.test.mjs` has mock shapes to update.
**Why it happens:** There are 3 test files in tests/phase-184/ — `portfolio.test.mjs`, `portfolio-render.test.mjs`, `portfolio-cmd.test.mjs`.
**How to avoid:** Only `portfolio-render.test.mjs` embeds an `ir.research` field in its `makeMinimalIR` helper. The other two files do not reference the research field at all (confirmed by grep: zero hits in portfolio.test.mjs, zero in portfolio-cmd.test.mjs).
**Warning signs:** Checking only one of the three files without grepping all three.

### Pitfall 3: Missing the Test That Exercises Non-Empty Content
**What goes wrong:** Updating the mock shape but not verifying the "each section has id, title, level, and non-empty content string" test still passes.
**Why it happens:** After the code fix, `buildCrossPatterns` with the corrected mock must still emit non-empty content for the test at line 126-138 to pass.
**How to avoid:** Ensure the corrected `makeMinimalIR` provides at least one `topics` entry so the "Research Topics" block renders. Example: `topics: ['ai-sdk-patterns', 'schema-heterogeneity']`.
**Warning signs:** All tests pass individually but test at line 126 fails because patterns section content is only `<p>Cross-project analysis...</p><p>No cross-project patterns extracted.</p>`.

### Pitfall 4: Decisions Field Is Correct — Do Not Change It
**What goes wrong:** Updating `ir.decisions` in the mock because it "looks different" from the real IR shape.
**Why it happens:** The mock has `decisions: [{ summary: '...', phase: '...' }]` and real IR also has this shape. They match. `buildCrossPatterns` correctly reads `project.ir.decisions` at lines 1442-1448.
**How to avoid:** Only change the `research` field in the mock. The decisions field and all other fields are correct.

## Code Examples

### Current Bug Location

```javascript
// Source: bin/lib/render-presentation.cjs lines 1450-1459 (CURRENT — BUGGY)
const allFindings = [];
availableProjects.forEach(function(project) {
  const research = (project.ir && project.ir.research) || {};
  const findings = Array.isArray(research.findings) ? research.findings : [];
  findings.forEach(function(f) {
    const text = typeof f === 'string' ? f : (f.finding || '');
    if (text) allFindings.push(escHtml(text));
  });
});
```

### extractResearch Return Shape (truth source)

```javascript
// Source: bin/lib/presentation.cjs lines 617-621
return {
  project_research_files: projectResearchFiles,
  topics,
  phase_research_count: phaseResearchCount,
};
```

### Real IR Output (verified by running extractResearch on PDE itself)

```json
{
  "project_research_files": 31,
  "topics": ["ARCHITECTURE", "STACK", "TRANSPORT-ARCHITECTURE", ...],
  "phase_research_count": 190
}
```

### Corrected Mock Shape

```javascript
// Target: tests/phase-184/portfolio-render.test.mjs makeMinimalIR() research field
research: {
  project_research_files: 2,
  topics: ['ai-sdk-patterns', 'schema-heterogeneity'],
  phase_research_count: 3,
},
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run tests/phase-184/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INT-05 | `buildCrossPatterns` reads `topics` field and produces non-empty patterns content for real IR shape | unit | `npx vitest run tests/phase-184/portfolio-render.test.mjs` | Yes |
| INT-06 | All 23 Phase 184 tests pass after mock shape update | unit | `npx vitest run tests/phase-184/` | Yes |

**Additional manual verification for INT-05:**
Run `node bin/pde-tools.cjs portfolio build <path1> <path2> | node -e "process.stdin.resume(); let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{const ir=JSON.parse(d); const r=require('./bin/lib/render-presentation.cjs'); const s=r.buildCrossProjectPortfolio(ir); console.log(s.find(x=>x.id==='patterns').content)})"` should show actual topic content, not just "No cross-project patterns extracted."

### Sampling Rate
- **Per task commit:** `npx vitest run tests/phase-184/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements. The 23 tests exist and pass. The task is to fix mock shapes so they accurately reflect production behavior while keeping all 23 passing.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — this phase only edits existing CJS source and ESM test files)

## Sources

### Primary (HIGH confidence)
- `/Users/greyaltaer/code/projects/Platform Development Engine/bin/lib/render-presentation.cjs` — `buildCrossPatterns` function lines 1433-1482, confirmed bug at lines 1453-1454
- `/Users/greyaltaer/code/projects/Platform Development Engine/bin/lib/presentation.cjs` — `extractResearch` return shape lines 617-621, `buildPresentationIR` lines 750-791
- `/Users/greyaltaer/code/projects/Platform Development Engine/tests/phase-184/portfolio-render.test.mjs` — `makeMinimalIR` mock at line 66, 23 tests verified passing
- Live execution: `node -e "require('./bin/lib/presentation.cjs').extractResearch('.')"` — confirmed real IR shape
- Live execution: `buildCrossPatterns` with real IR shape — confirmed "No cross-project patterns extracted" output

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` — INT-05, INT-06 requirement text
- `.planning/STATE.md` — confirmed blocker note: "fix requires updating both render-presentation.cjs and tests/phase-184/portfolio-render.test.mjs atomically"

## Metadata

**Confidence breakdown:**
- Bug identification: HIGH — confirmed by reading source code and running live execution
- Fix approach: HIGH — direct field name substitution, no architectural uncertainty
- Mock correction scope: HIGH — grep confirmed only one of three test files references research field
- Atomicity requirement: HIGH — stated explicitly in STATE.md and REQUIREMENTS.md

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable — no external dependencies)
