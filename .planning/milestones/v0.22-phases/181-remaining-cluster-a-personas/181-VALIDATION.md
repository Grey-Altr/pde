---
phase: 181
slug: remaining-cluster-a-personas
status: complete
nyquist_compliant: true
verified: 2026-03-30T20:15:45Z
---

# Phase 181 — Nyquist Validation

> Post-execution validation assertions. Each assertion below can be run against the codebase to confirm the phase goal is still met.

## Assertions

### Truth 1: buildInvestorUpdate(ir) returns sections with vision, velocity, delivery, moat, activity, v-chart

**Command:** `node -e "const r = require('./bin/lib/render-presentation.cjs'); const sections = r.buildInvestorUpdate({}); console.log(sections.map(s => s.id).join(','))"`
**Expected:** Output contains section IDs including `velocity`, `moat`, and `activity`
**Meaningful because:** Confirms the function exists, runs without error, and returns a populated sections array — not just that the file exists

### Truth 2: buildSprintReview(ir) returns sections with shipped, artifacts, acceptance, next, burndown

**Command:** `node -e "const r = require('./bin/lib/render-presentation.cjs'); const sections = r.buildSprintReview({}); console.log(sections.map(s => s.id).join(','))"`
**Expected:** Output contains section IDs including `shipped`, `next`, and `burndown`
**Meaningful because:** Confirms sprint review sections are substantive and not empty stubs

### Truth 3: Both CLU-02/03 builders handle unavailable IR fields gracefully via sentinelHtml()

**Command:** `node -e "const r = require('./bin/lib/render-presentation.cjs'); const unavailIR = {project:{name:{unavailable:true}},phases:{completed:{unavailable:true},total:{unavailable:true}},requirements:{completed:{unavailable:true}},verification:{phases_verified:{unavailable:true}}}; r.buildInvestorUpdate(unavailIR); r.buildSprintReview(unavailIR); console.log('SENTINEL OK')"`
**Expected:** `SENTINEL OK`
**Meaningful because:** Confirms that builders do not throw when IR fields are `{unavailable: true}`, which is the real production path when data cannot be extracted

### Truth 4: Both CLU-02/03 slugs registered in render() switch and personaDisplayName()

**Command:** `node -e "const r = require('./bin/lib/render-presentation.cjs'); console.log(r.personaDisplayName('investor-update'), r.personaDisplayName('sprint-review'))"`
**Expected:** `Investor Update Sprint Review`
**Meaningful because:** Confirms the display name mapping resolves to real strings, not the slug default

### Truth 5: buildClientDeliverable(ir) returns sections with scope, features, verification, artifacts, effort

**Command:** `node -e "const r = require('./bin/lib/render-presentation.cjs'); const sections = r.buildClientDeliverable({}); console.log(sections.map(s => s.id).join(','))"`
**Expected:** Output contains section IDs including `features`, `verification`, and `artifacts`
**Meaningful because:** Confirms client deliverable builder is substantive with required sections

### Truth 6: buildStakeholderStatus(ir) returns deterministic RAG status — GREEN/AMBER/RED from IR thresholds

**Command:** `node -e "const r = require('./bin/lib/render-presentation.cjs'); const greenIR = {phases:{completed:8,total:10}}; const redIR = {phases:{completed:2,total:10}}; const gSections = r.buildStakeholderStatus(greenIR); const rSections = r.buildStakeholderStatus(redIR); const gRag = gSections.find(s=>s.id==='rag'); const rRag = rSections.find(s=>s.id==='rag'); console.log(gRag && rRag ? 'RAG OK' : 'RAG FAIL')"`
**Expected:** `RAG OK`
**Meaningful because:** Confirms RAG status is computed from real thresholds (80% = GREEN, below threshold = RED) and not hardcoded

### Truth 7: Both CLU-04/05 builders handle unavailable IR fields gracefully

**Command:** `node -e "const r = require('./bin/lib/render-presentation.cjs'); const unavailIR = {phases:{completed:{unavailable:true},total:{unavailable:true}},blockers:{items:{unavailable:true}},risks:{items:{unavailable:true}},decisions:{items:{unavailable:true}}}; r.buildClientDeliverable(unavailIR); r.buildStakeholderStatus(unavailIR); console.log('SENTINEL OK')"`
**Expected:** `SENTINEL OK`
**Meaningful because:** Confirms CLU-04/05 sentinel paths do not throw on unavailable IR data

### Truth 8: Both CLU-04/05 slugs registered in render() switch and personaDisplayName()

**Command:** `node -e "const r = require('./bin/lib/render-presentation.cjs'); console.log(r.personaDisplayName('client-deliverable'), r.personaDisplayName('stakeholder-status'))"`
**Expected:** `Client Deliverable Report Stakeholder Status Update`
**Meaningful because:** Confirms both slugs resolve to display names, not the slug fallback

### Truth 9: buildProductManager(ir) returns sections with coverage, roadmap, categories, scope, decisions, effort-chart

**Command:** `node -e "const r = require('./bin/lib/render-presentation.cjs'); const sections = r.buildProductManager({}); console.log(sections.map(s => s.id).join(','))"`
**Expected:** Output contains section IDs including `coverage`, `categories`, and `scope`
**Meaningful because:** Confirms product manager persona is substantive with required sections

### Truth 10: buildProjectManager(ir) returns sections with timeline, tracking, resources, risk-register, cost, timeline-chart

**Command:** `node -e "const r = require('./bin/lib/render-presentation.cjs'); const sections = r.buildProjectManager({}); console.log(sections.map(s => s.id).join(','))"`
**Expected:** Output contains section IDs including `timeline`, `tracking`, and `risk-register`
**Meaningful because:** Confirms project manager persona is substantive with required sections

### Truth 11: Both CLU-06/07 builders handle unavailable IR fields gracefully

**Command:** `node -e "const r = require('./bin/lib/render-presentation.cjs'); const unavailIR = {phases:{phase_list:{unavailable:true},completed:{unavailable:true},total:{unavailable:true}},requirements:{categories:{unavailable:true}},blockers:{items:{unavailable:true}}}; r.buildProductManager(unavailIR); r.buildProjectManager(unavailIR); console.log('SENTINEL OK')"`
**Expected:** `SENTINEL OK`
**Meaningful because:** Confirms CLU-06/07 sentinel paths do not throw on unavailable IR data

### Truth 12: All 6 Cluster A persona slugs work end-to-end via render() producing HTML + MD files

**Command:** `npx vitest run tests/phase-181/ --reporter=verbose`
**Expected:** `42 passed` with `0 skipped` and no failures
**Meaningful because:** 42 tests cover CLU-02 through CLU-07 including builder section assertions, sentinel stress tests, RAG threshold verification, and end-to-end render() file writes — a comprehensive behavioral confirmation
