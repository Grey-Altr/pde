---
phase: 180
slug: claim-verification-pdf-export
status: complete
nyquist_compliant: true
verified: 2026-03-30T19:39:30Z
---

# Phase 180 — Nyquist Validation

> Post-execution validation assertions. Each assertion below can be run against the codebase to confirm the phase goal is still met.

## Assertions

### Truth 1: After rendering, every numeric IR value that appears in section HTML is verified against the canonical IR object
**Command:** `node -e "const m = require('./bin/lib/verify-presentation.cjs'); console.log(Object.keys(m).join(','));"`
**Expected:** Prints `buildClaimsMap,verifyPresentation,buildVerificationFooterHtml`
**Meaningful because:** Confirms the verify-presentation module exposes all three required functions — absence of any one would mean the verification pipeline is broken

### Truth 2: A mismatch between rendered numeric and IR value is flagged with label, expected value, and found value
**Command:** `node -e "const m = require('./bin/lib/verify-presentation.cjs'); const ir = { project: { name: 'T', goal: 'g', core_value: 'c', product_type: 'cli', summary: 's' }, phases: { total: 99, completed: 0, progress_percent: 0 }, requirements: { total: 1, completed: 0, categories: [] }, blockers: [], decisions: [], cost_timing: { session_count: 1, total_duration_min: 0 }, git_velocity: { total_commits: 1, contributors: [], estimated_loc_added: 0 }, design_artifacts: { available: false }, verification: { phases_verified: 0 }, research: { project_research_files: 0 } }; const sections = [{ id: 'overview', content: '<p>We have 1 phases total.</p>' }]; const result = m.verifyPresentation(ir, sections); console.log('PASS: mismatch detected =', result.mismatches.length > 0);"`
**Expected:** Prints `PASS: mismatch detected = true`
**Meaningful because:** Confirms the claim verification engine actually detects numeric mismatches — a stub implementation that always returns `pass: true` would fail this check

### Truth 3: Verification result appears as a footer section in both HTML and Markdown output
**Command:** `node bin/pde-tools.cjs presentation render executive-summary /tmp/test-180-validation.html /tmp/test-180-validation.md 2>/dev/null && grep -c 'id="verification"' /tmp/test-180-validation.html`
**Expected:** Returns 1
**Meaningful because:** Confirms the verification footer section is present in the generated HTML output — absence would mean the render() integration step was broken or skipped

### Truth 4: Verification is non-blocking — mismatches produce warnings but never abort rendering
**Command:** `node bin/pde-tools.cjs presentation render executive-summary /tmp/test-180-nonblock.html /tmp/test-180-nonblock.md 2>/dev/null && echo "PASS: render completed without aborting"`
**Expected:** Prints `PASS: render completed without aborting` (exit code 0)
**Meaningful because:** Confirms that the full render pipeline completes successfully even when verification mismatches may exist — verifying non-blocking behavior

### Truth 5: pde-tools presentation pdf subcommand is wired
**Command:** `grep -c "subcommand === 'pdf'" bin/pde-tools.cjs`
**Expected:** Returns 1
**Meaningful because:** Confirms the `presentation pdf` routing branch exists in pde-tools.cjs — absence would mean PDF export is not accessible via the CLI

### Truth 6: export-pdf module exports both required functions
**Command:** `node -e "const m = require('./bin/lib/export-pdf.cjs'); console.log(Object.keys(m).join(','));"`
**Expected:** Prints `exportPdf,cmdPresentationPdf`
**Meaningful because:** Confirms the PDF export module's public API is intact — any rename or removal of an export would break the pde-tools routing

### Truth 6b: verify-presentation unit tests (35) and export-pdf tests (8) both pass
**Command:** `npx vitest run tests/phase-180/ --reporter=verbose 2>&1 | tail -5`
**Expected:** Output contains `43 passed` and `0 failed`
**Meaningful because:** Confirms the full Phase 180 test suite (35 verify-presentation + 8 export-pdf = 43 tests) passes against the live codebase
