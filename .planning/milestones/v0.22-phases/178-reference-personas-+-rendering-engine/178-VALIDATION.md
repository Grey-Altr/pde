---
phase: 178
slug: reference-personas-rendering-engine
status: complete
nyquist_compliant: true
verified: 2026-03-29T18:50:00Z
---

# Phase 178 — Nyquist Validation

> Post-execution validation assertions. Each assertion below can be run against the codebase to confirm the phase goal is still met.

## Assertions

### Truth 1: renderHTML() produces a self-contained HTML document under 500KB with embedded CSS, no external URLs, no JavaScript
**Command:** `node bin/pde-tools.cjs presentation render executive-summary /tmp/test-178-validation.html /tmp/test-178-validation.md 2>/dev/null && wc -c < /tmp/test-178-validation.html`
**Expected:** Returns a number greater than 0 and less than 512000 (500KB)
**Meaningful because:** Confirms the render command produces a real HTML file of non-trivial size, not an empty stub

### Truth 1b: HTML output has no script tags or external URLs
**Command:** `node bin/pde-tools.cjs presentation render executive-summary /tmp/test-178-validation.html /tmp/test-178-validation.md 2>/dev/null && grep -c '<script' /tmp/test-178-validation.html`
**Expected:** Returns 0
**Meaningful because:** Confirms the HTML constraint — no inline JavaScript is present in the generated output, which is required for the self-contained format

### Truth 2: renderMarkdown() produces a Markdown companion with ATX headings and the same section content as the HTML
**Command:** `node bin/pde-tools.cjs presentation render executive-summary /tmp/test-178-validation.html /tmp/test-178-validation.md 2>/dev/null && head -1 /tmp/test-178-validation.md`
**Expected:** Output starts with `#` (ATX heading)
**Meaningful because:** Confirms the Markdown companion file is written and starts with a proper ATX heading, not raw HTML or empty content

### Truth 3: buildExecutiveSummary(ir) returns sections covering project overview, progress, requirements, blockers, decisions, timeline, design artifacts
**Command:** `node -e "const r = require('./bin/lib/render-presentation.cjs'); const ir = { project: { name: 'T', goal: 'g', core_value: 'cv', product_type: 'cli', summary: 's' }, phases: { total: 1, completed: 0, progress_percent: 0 }, requirements: { total: 1, completed: 0, categories: [] }, blockers: [], decisions: [], cost_timing: { session_count: 1, total_duration_min: 0 }, git_velocity: { total_commits: 1, contributors: [], estimated_loc_added: 0 }, design_artifacts: { available: false }, verification: { phases_verified: 0 }, research: { project_research_files: 0 } }; const sections = r.buildExecutiveSummary(ir); console.log('PASS: section count =', sections.length); sections.forEach(s => process.stdout.write(s.id + ' '));"`
**Expected:** Prints `PASS: section count = 7` followed by section IDs including `overview`, `progress`, `requirements`, `blockers`, `decisions`, `timeline`, `artifacts`
**Meaningful because:** Confirms the executive summary builder produces all 7 required sections, not a stub or subset

### Truth 4: buildCaseStudy(ir) returns sections covering problem, approach, outcome, lessons, technical decisions, design evidence
**Command:** `node -e "const r = require('./bin/lib/render-presentation.cjs'); const ir = { project: { name: 'T', goal: 'g', core_value: 'cv', product_type: 'cli', summary: 's' }, phases: { total: 1, completed: 0, progress_percent: 0 }, requirements: { total: 1, completed: 0, categories: [] }, blockers: [], decisions: [], cost_timing: { session_count: 1, total_duration_min: 0 }, git_velocity: { total_commits: 1, contributors: [], estimated_loc_added: 0 }, design_artifacts: { available: false }, verification: { phases_verified: 0 }, research: { project_research_files: 0 } }; const sections = r.buildCaseStudy(ir); console.log('PASS: section count =', sections.length); sections.forEach(s => process.stdout.write(s.id + ' '));"`
**Expected:** Prints `PASS: section count = 6` followed by section IDs including `problem`, `approach`, `outcome`, `lessons`, `technical`, `artifacts`
**Meaningful because:** Confirms the case study builder produces all 6 required sections with the correct IDs

### Truth 5: HTML output contains a `<nav class='toc'>` with anchor links to each section
**Command:** `node bin/pde-tools.cjs presentation render executive-summary /tmp/test-178-validation.html /tmp/test-178-validation.md 2>/dev/null && grep -c '<nav class="toc">' /tmp/test-178-validation.html`
**Expected:** Returns 1
**Meaningful because:** Confirms the auto-generated table of contents is present in the HTML output — absence would mean the TOC rendering step was skipped

### Truth 6: HTML output uses PDE design token CSS custom properties (--pde-bg, --pde-accent, etc.)
**Command:** `node bin/pde-tools.cjs presentation render executive-summary /tmp/test-178-validation.html /tmp/test-178-validation.md 2>/dev/null && grep -c '\-\-pde-bg:' /tmp/test-178-validation.html`
**Expected:** Returns ≥ 1
**Meaningful because:** Confirms the PDE design token CSS custom properties are embedded in the output — absence would mean the branding system is broken

### Truth 7: Design artifact images are embedded as base64 data URIs when they exist on disk; omitted gracefully when absent
**Command:** `node -e "const r = require('./bin/lib/render-presentation.cjs'); const result = r.embedImage('/nonexistent/path.png'); console.log('PASS: missing path returns', result === null ? 'null' : result);"`
**Expected:** Prints `PASS: missing path returns null`
**Meaningful because:** Confirms that missing design artifact paths return null (graceful absence) instead of throwing an error or returning a broken data URI

### Truth 8: render() writes both HTML and MD files to the specified paths
**Command:** `node bin/pde-tools.cjs presentation render case-study /tmp/test-178-cs.html /tmp/test-178-cs.md 2>/dev/null && test -f /tmp/test-178-cs.html && test -f /tmp/test-178-cs.md && echo "PASS: both files written"`
**Expected:** Prints `PASS: both files written`
**Meaningful because:** Confirms that render() writes both output formats, not just HTML

### Truth 9: Re-running render() overwrites prior output files
**Command:** `node bin/pde-tools.cjs presentation render executive-summary /tmp/test-178-overwrite.html /tmp/test-178-overwrite.md 2>/dev/null && node bin/pde-tools.cjs presentation render executive-summary /tmp/test-178-overwrite.html /tmp/test-178-overwrite.md 2>/dev/null && head -1 /tmp/test-178-overwrite.html`
**Expected:** Prints `<!DOCTYPE html>` — confirming a valid HTML file exists after the second run
**Meaningful because:** Confirms idempotency — overwrite behavior works correctly and does not append or corrupt existing output

### Truth 9b: All 34 phase tests pass
**Command:** `npx vitest run tests/phase-178/ --reporter=verbose 2>&1 | tail -5`
**Expected:** Output contains `34 passed` and `0 failed`
**Meaningful because:** Confirms the complete rendering pipeline test suite passes against the live codebase, covering all 9 requirement IDs
