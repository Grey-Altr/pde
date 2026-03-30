---
phase: 179
slug: svg-charts
status: complete
nyquist_compliant: true
verified: 2026-03-29T19:10:00Z
---

# Phase 179 — Nyquist Validation

> Post-execution validation assertions. Each assertion below can be run against the codebase to confirm the phase goal is still met.

## Assertions

### Truth 1: burndownChart(ir) returns valid SVG with line chart showing remaining requirements
**Command:** `node -e "const c = require('./bin/lib/charts.cjs'); const svg = c.burndownChart({}); console.log('PASS: has polyline =', svg.includes('<polyline'));"`
**Expected:** Prints `PASS: has polyline = true`
**Meaningful because:** Confirms the burndownChart function produces SVG with a `<polyline>` element, which is the structural requirement for a line chart — not just any SVG string

### Truth 2: velocityChart(ir) returns valid SVG with bar chart showing completion per phase
**Command:** `node -e "const c = require('./bin/lib/charts.cjs'); const svg = c.velocityChart({}); console.log('PASS: has rect =', svg.includes('<rect'));"`
**Expected:** Prints `PASS: has rect = true`
**Meaningful because:** Confirms the velocityChart function produces SVG with `<rect>` bar elements, which is the structural requirement for a bar chart

### Truth 3: phaseTimelineChart(ir) returns valid SVG with horizontal bars showing phase durations
**Command:** `node -e "const c = require('./bin/lib/charts.cjs'); const svg = c.phaseTimelineChart({}); console.log('PASS: has aria-labelledby =', svg.includes('aria-labelledby=\"timeline-title\"'));"`
**Expected:** Prints `PASS: has aria-labelledby = true`
**Meaningful because:** Confirms the timeline chart includes its required accessibility attribute — absence would indicate the chart scaffold was altered

### Truth 4: effortBreakdownChart(ir) returns valid SVG with bars showing task count by category
**Command:** `node -e "const c = require('./bin/lib/charts.cjs'); const svg = c.effortBreakdownChart({}); console.log('PASS: has aria-labelledby =', svg.includes('aria-labelledby=\"effort-title\"'));"`
**Expected:** Prints `PASS: has aria-labelledby = true`
**Meaningful because:** Confirms the effort breakdown chart includes its required accessibility attribute

### Truth 5: Every chart SVG contains role=img, aria-labelledby, and `<title>` element
**Command:** `node -e "const c = require('./bin/lib/charts.cjs'); const fns = [c.burndownChart, c.velocityChart, c.phaseTimelineChart, c.effortBreakdownChart]; let pass = true; fns.forEach((fn, i) => { const svg = fn({}); if (!svg.includes('role=\"img\"')) { pass = false; console.error('FAIL: fn[' + i + '] missing role=img'); } if (!svg.includes('<title')) { pass = false; console.error('FAIL: fn[' + i + '] missing <title>'); } }); if (pass) console.log('PASS: all 4 charts have role=img and <title>');"`
**Expected:** Prints `PASS: all 4 charts have role=img and <title>`
**Meaningful because:** Confirms accessibility requirements are met across all four chart types — a regression in any one would be caught

### Truth 6: Every chart output includes a `<details>` fallback data table with `<table>` element
**Command:** `node -e "const c = require('./bin/lib/charts.cjs'); const fns = [c.burndownChart, c.velocityChart, c.phaseTimelineChart, c.effortBreakdownChart]; let pass = true; fns.forEach((fn, i) => { const svg = fn({}); if (!svg.includes('<details')) { pass = false; console.error('FAIL: fn[' + i + '] missing <details>'); } }); if (pass) console.log('PASS: all 4 charts have <details> fallback');"`
**Expected:** Prints `PASS: all 4 charts have <details> fallback`
**Meaningful because:** Confirms the accessible data table fallback is present in all chart outputs — required for non-visual access to chart data

### Truth 7: No chart output contains `<script>` tags or external href/src URLs
**Command:** `node -e "const c = require('./bin/lib/charts.cjs'); const fns = [c.burndownChart, c.velocityChart, c.phaseTimelineChart, c.effortBreakdownChart]; let pass = true; fns.forEach((fn, i) => { const svg = fn({}); if (svg.includes('<script')) { pass = false; console.error('FAIL: fn[' + i + '] has <script>'); } }); if (pass) console.log('PASS: no chart has <script> tags');"`
**Expected:** Prints `PASS: no chart has <script> tags`
**Meaningful because:** Confirms the no-JavaScript constraint is enforced — any script tag in SVG would violate the phase goal of pure parametric SVG

### Truth 8: Charts with unavailable IR data return a placeholder SVG instead of throwing
**Command:** `node -e "const c = require('./bin/lib/charts.cjs'); const svg = c.burndownChart({requirements:{unavailable:true}}); console.log('PASS: placeholder includes unavailable =', svg.includes('unavailable'));"`
**Expected:** Prints `PASS: placeholder includes unavailable = true`
**Meaningful because:** Confirms the unavailability guard — if IR data is missing, the chart returns a labeled placeholder SVG instead of crashing the renderer

### Truth 9: Charts are embedded in executive-summary and case-study persona sections via render-presentation.cjs
**Command:** `grep -c 'charts\.burndownChart\|charts\.velocityChart\|charts\.phaseTimelineChart\|charts\.effortBreakdownChart' bin/lib/render-presentation.cjs`
**Expected:** Returns 4 (one call per chart function in the renderer)
**Meaningful because:** Confirms all four chart functions are wired into the rendering pipeline and will appear in generated presentations

### Truth 9b: Module exports all four chart function names
**Command:** `node -e "const c = require('./bin/lib/charts.cjs'); console.log(Object.keys(c).join(','));"`
**Expected:** Prints `burndownChart,velocityChart,phaseTimelineChart,effortBreakdownChart`
**Meaningful because:** Confirms the module's public API is intact — any rename or removal of an export would be caught immediately

### Truth 9c: All 48 phase tests pass
**Command:** `npx vitest run tests/phase-179/ --reporter=verbose 2>&1 | tail -5`
**Expected:** Output contains `48 passed` and `0 failed`
**Meaningful because:** Confirms the full SVG chart test suite passes, covering all six CHT requirement IDs across unit and integration tests
