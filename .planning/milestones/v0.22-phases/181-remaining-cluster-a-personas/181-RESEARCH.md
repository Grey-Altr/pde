# Phase 181: Remaining Cluster A Personas - Research

**Researched:** 2026-03-30
**Domain:** Presentation persona builder pattern (render-presentation.cjs extension)
**Confidence:** HIGH

## Summary

Phase 181 adds 6 persona builder functions to `bin/lib/render-presentation.cjs`, following the exact pattern established by `buildExecutiveSummary` (CLU-01) and `buildCaseStudy` (CLR-01) in Phase 178. Each function takes the same IR object, constructs a `sections` array of `{id, title, level, content}` objects, and returns it. The `render()` orchestrator already handles dispatch, claim verification, HTML/Markdown rendering, and file I/O — new personas only need to be registered in the switch statement and in `personaDisplayName()`.

The IR schema is fully materialized: `ir.project`, `ir.phases`, `ir.requirements`, `ir.design_artifacts`, `ir.git_velocity`, `ir.cost_timing`, `ir.blockers`, `ir.risks`, `ir.verification`, `ir.research`, `ir.decisions`. All fields support `{ unavailable: true, reason }` sentinels. Section helper functions from Phase 178 (`buildOverview`, `buildProgress`, `buildRequirements`, `buildBlockers`, `buildDecisions`, `buildTimeline`, `buildArtifacts`, etc.) can be reused or composed into new audience-specific arrangements. Chart builders from `charts.cjs` (`burndownChart`, `velocityChart`, `phaseTimelineChart`, `effortBreakdownChart`) are available for all personas that need visual data.

The only integration points beyond the persona builders themselves are: (1) adding each slug to the `switch` statement in `render()`, (2) adding each slug to `personaDisplayName()`, and (3) registering each slug in `workflows/present.md`'s error message list (the registry table is already complete with all 15 personas). Tests follow the pattern in `tests/phase-178/render-presentation.test.mjs` — vitest with a MOCK_IR fixture, one describe block per persona, asserting section IDs present and graceful handling of unavailable IR fields.

**Primary recommendation:** Add all 6 builders in one PR to render-presentation.cjs; reuse existing section helpers; write one test file `tests/phase-181/render-presentation-cluster-a.test.mjs` covering all 6 builders.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None. Mode: Auto-generated (autonomous).

### Claude's Discretion
All implementation choices are at Claude's discretion. Follow the Phase 178 persona builder pattern exactly. Each persona selects different IR fields and arranges them for its target audience.

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CLU-02 | User can generate an investor update (milestone velocity, technical moat, market positioning) | `ir.phases` (velocity), `ir.decisions` (moat), `ir.git_velocity` (activity), `ir.requirements` (coverage); `velocityChart` from charts.cjs |
| CLU-03 | User can generate a sprint review (what shipped, demo screenshots, what's next) | `ir.phases.phase_list` (completed phases = shipped), `ir.design_artifacts` (screenshots), `ir.phases` (next up); `burndownChart` for remaining |
| CLU-04 | User can generate a client deliverable report (feature specs, ACs met, screenshots) | `ir.requirements` (ACs met per category), `ir.verification` (phase ACs pass/fail), `ir.design_artifacts` (screenshots) |
| CLU-05 | User can generate a stakeholder status update (RAG status, decisions needed, risks) | `ir.phases` (progress → RAG), `ir.blockers`, `ir.risks`, `ir.decisions` (pending), `ir.requirements` |
| CLU-06 | User can generate a product manager view (feature prioritization, requirement coverage, roadmap health, scope trade-offs) | `ir.requirements` (categories/coverage), `ir.phases` (roadmap), `ir.blockers`, `ir.decisions`; `effortBreakdownChart` |
| CLU-07 | User can generate a project manager view (timeline tracking, dependency analysis, risk register, resource allocation) | `ir.phases` (timeline), `ir.cost_timing` (duration), `ir.blockers`, `ir.risks`, `ir.git_velocity`; `phaseTimelineChart` |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js CJS | existing | Runtime for render-presentation.cjs | Project is already fully CJS |
| vitest | existing (see package.json) | Test framework | Used in all phase-178, phase-180 tests |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| charts.cjs | internal | SVG chart generation (burndown, velocity, timeline, effort) | Include in personas that benefit from visual data |
| verify-presentation.cjs | internal | Auto-appended by render() — no action needed by builders | Automatic — builders do not call it directly |

**No new npm packages required.** All dependencies are internal to the existing codebase.

## Architecture Patterns

### The Persona Builder Contract

Every persona builder function follows this exact signature and return shape:

```javascript
// Source: bin/lib/render-presentation.cjs — buildExecutiveSummary (CLU-01)
/**
 * Build [persona name] sections ([REQ-ID]).
 *
 * @param {object} ir - IR from buildPresentationIR()
 * @param {object} [opts] - Optional overrides (reserved for future use)
 * @returns {Array<{id: string, title: string, level: number, content: string}>}
 */
function build[PersonaName](ir, opts) {
  return [
    { id: 'section-slug', title: 'Section Title', level: 1, content: buildSomething(ir) },
    { id: 'section-two',  title: 'Section Two',   level: 2, content: buildSomethingElse(ir) },
    // ...
  ];
}
```

- `id`: kebab-case slug used as `<section id="">` anchor and TOC link
- `title`: human-readable heading text rendered as `<h{level}>`
- `level`: 1 = primary heading (accent color), 2 = sub-heading (default color)
- `content`: HTML string — use `escHtml()` for all user data, use `sentinelHtml(irField, label)` to handle unavailable fields

### Sentinel Pattern (Required)

Always check for unavailable IR fields using `sentinelHtml()` before accessing properties:

```javascript
// Source: bin/lib/render-presentation.cjs — sentinelHtml
function buildSection(ir) {
  const sentinel = sentinelHtml(ir.someField, 'Human Label');
  if (sentinel) return sentinel;
  // ... safe to access ir.someField.properties now
}
```

### Dispatch Registration (Two Locations)

After writing each builder, register it in two places:

**1. `render()` switch statement** (render-presentation.cjs ~line 714):
```javascript
case 'investor-update':
  sections = buildInvestorUpdate(ir);
  break;
```

**2. `personaDisplayName()` map** (render-presentation.cjs ~line 117):
```javascript
'investor-update': 'Investor Update',
```

### Recommended Project Structure
```
bin/lib/
├── render-presentation.cjs     # ADD 6 builders here + dispatch + displayName
├── presentation.cjs            # IR extraction — no changes needed
├── charts.cjs                  # SVG charts — no changes needed
└── verify-presentation.cjs     # Claim verification — no changes needed

tests/phase-181/
└── render-presentation-cluster-a.test.mjs   # 6 new builder tests
```

### Anti-Patterns to Avoid
- **Calling `render()` from inside a builder:** builders only return a sections array; `render()` calls the builder, not vice versa
- **Accessing `ir.blockers.items`:** blockers are returned as an array directly at `ir.blockers` (not `ir.blockers.items`) — see `buildBlockers()` for the correct access pattern: `Array.isArray(ir.blockers && ir.blockers.items)`
- **Forgetting to escHtml user strings:** all strings from IR must pass through `escHtml()` before embedding in HTML content
- **Constructing your own HTML document wrapper:** only `renderHTML()` does that; builders return section content only

## IR Field Reference by Persona

### CLU-02: Investor Update

Primary fields:
- `ir.project.name`, `ir.project.core_value`, `ir.project.goal` — product narrative
- `ir.phases.completed`, `ir.phases.total`, `ir.phases.progress_percent` — milestone velocity
- `ir.phases.milestone`, `ir.phases.milestone_name` — current milestone context
- `ir.requirements.total`, `ir.requirements.completed` — delivery proof
- `ir.git_velocity.total_commits`, `ir.git_velocity.commits_last_30_days` — development activity
- `ir.decisions` (items array) — technical moat / strategic bets
- `charts.velocityChart(ir)` — visual velocity signal

Suggested sections: Product Vision | Milestone Velocity | Delivery Proof | Technical Moat | Development Activity

### CLU-03: Sprint Review

Primary fields:
- `ir.phases.phase_list` (filter `completed: true`) — what shipped this sprint
- `ir.design_artifacts` — demo screenshots
- `ir.requirements.completed`, `ir.requirements.pending` — ACs met
- `ir.phases.current_phase`, `ir.phases.current_phase_name` — what's next
- `charts.burndownChart(ir)` — remaining work visual

Suggested sections: What Shipped | Demo Artifacts | Acceptance Criteria | What's Next | Burndown

### CLU-04: Client Deliverable Report

Primary fields:
- `ir.project.name`, `ir.project.goal` — project scope statement
- `ir.requirements` (by category — use categories array) — feature specs vs ACs met
- `ir.verification.results` — per-phase AC pass/fail evidence
- `ir.design_artifacts` — embedded screenshots as deliverable evidence
- `ir.cost_timing.session_count` — effort invested

Suggested sections: Project Scope | Features Delivered | Acceptance Criteria Met | Verification Evidence | Design Artifacts

### CLU-05: Stakeholder Status Update

Primary fields:
- `ir.phases.completion_pct` + `ir.requirements` — derives RAG status (green ≥75%, amber 40-74%, red <40%)
- `ir.blockers` — active blockers (decisions needed)
- `ir.risks` — identified risks
- `ir.decisions` — recent decisions for alignment
- `ir.phases.current_phase_name` — current focus

Suggested sections: RAG Status | Current Focus | Active Blockers | Risk Register | Decisions Log | Next Actions

### CLU-06: Product Manager View

Primary fields:
- `ir.requirements.categories` — feature prioritization by category
- `ir.requirements.total`, `ir.requirements.completed`, `ir.requirements.blocked`, `ir.requirements.pending` — roadmap health
- `ir.phases` (phase_list, completion_pct) — roadmap progress
- `ir.blockers` + `ir.risks` — scope risks / trade-offs
- `ir.decisions` — product decisions rationale
- `charts.effortBreakdownChart(ir)` — effort distribution visual

Suggested sections: Requirement Coverage | Roadmap Health | Feature Category Breakdown | Scope Trade-offs | Product Decisions | Effort Distribution

### CLU-07: Project Manager View

Primary fields:
- `ir.phases` (total, completed, in_progress, planned, phase_list) — timeline tracking
- `ir.cost_timing` (total_duration_min, average_phase_duration_min, phases_with_timing) — actual vs planned duration
- `ir.blockers` + `ir.risks` — risk register
- `ir.git_velocity` — resource activity signal
- `charts.phaseTimelineChart(ir)` — visual timeline

Suggested sections: Timeline Status | Phase Tracking | Resource Activity | Risk Register | Cost & Duration | Phase Timeline Chart

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML escaping | Custom escape function | `escHtml(str)` already in render-presentation.cjs | Already handles all 5 entities |
| Unavailable field handling | Custom null checks | `sentinelHtml(irField, label)` | Consistent yellow warning block UX |
| HTML → Markdown stripping | Custom regex | `stripHtml(str)` already in render-presentation.cjs | Handles br→newline, entity decode |
| SVG charts | Custom SVG | `charts.burndownChart(ir)`, `velocityChart(ir)`, `phaseTimelineChart(ir)`, `effortBreakdownChart(ir)` | Already produce accessible SVGs with aria-labels and data table fallbacks |
| Claim verification | Manual comparison | Auto-appended by `render()` — completely automatic | VER-01/02/03 already wired |
| File I/O | Manual fs.writeFileSync | `render()` orchestrator handles all file writes | Already handles dir creation, overwrite, size guard |

## Common Pitfalls

### Pitfall 1: Accessing array fields that may be objects

**What goes wrong:** `ir.blockers` is an array (not `ir.blockers.items`), but `ir.decisions` is an object with `.items` array. Using the wrong access pattern throws at runtime.

**Why it happens:** The two extractors return different shapes. `extractBlockers()` returns `{ blockers: [], risks: [] }` which is spread into IR as `ir.blockers` (array) and `ir.risks` (array). `extractDecisions()` returns an array but it's stored in IR as `ir.decisions` — wait, actually looking at the IR composer: `decisions: extractDecisions(cwd)` where `extractDecisions` returns an array. But `buildDecisions()` in render-presentation.cjs accesses `ir.decisions && ir.decisions.items` — this is for compatibility with a potential `{ items: [] }` shape.

**How to avoid:** Check `render-presentation.cjs` Phase 178 implementations before writing new ones. The safe pattern is:
```javascript
const items = Array.isArray(ir.decisions && ir.decisions.items)
  ? ir.decisions.items
  : (Array.isArray(ir.decisions) ? ir.decisions : []);
```

**Warning signs:** `TypeError: Cannot read properties of undefined` at runtime when accessing `.items` on an array.

### Pitfall 2: Hardcoding phase_list for "what shipped" without checking completeness

**What goes wrong:** `ir.phases.phase_list` is sliced to 10 in `buildProgress()`. For sprint-review, you want ALL completed phases, not just the first 10.

**How to avoid:** For sprint-review, do not use `buildProgress()` — build a custom section that filters `phase_list` for `completed: true` without the `.slice(0, 10)` limit. Or accept the 10-item cap and document it.

### Pitfall 3: Missing persona in switch statement but not in displayName (or vice versa)

**What goes wrong:** `render()` throws "Unknown persona" even though `personaDisplayName()` returns the correct display name (or vice versa — wrong display name shown on documents).

**How to avoid:** Add both registrations in the same task/commit. The test suite will catch a missing switch case immediately.

### Pitfall 4: Using ir.phases.completion_pct directly vs computing it

**What goes wrong:** `ir.phases.completion_pct` may be stored as a raw value that doesn't match `Math.round((completed/total)*100)`. The verify-presentation module uses the computed value, not the stored one. If a section outputs the stored value, it may trigger a verification mismatch warning.

**How to avoid:** Always compute: `const pct = ir.phases.total > 0 ? Math.round((ir.phases.completed / ir.phases.total) * 100) : 0;`

### Pitfall 5: RAG status logic is business logic that should be deterministic

**What goes wrong:** For CLU-05 stakeholder-status, using an LLM to determine RAG status defeats the extraction-first architecture guarantee.

**How to avoid:** Compute RAG from IR in the builder function itself using a deterministic rule (e.g., completion_pct ≥ 75 = green, 40-74 = amber, <40 = red). This is code, not narration.

## Code Examples

### Minimal Builder Template
```javascript
// Source: bin/lib/render-presentation.cjs — pattern from buildExecutiveSummary / buildCaseStudy

function buildInvestorUpdate(ir) {
  return [
    { id: 'vision',    title: 'Product Vision',       level: 1, content: buildOverview(ir) },
    { id: 'velocity',  title: 'Milestone Velocity',   level: 2, content: buildProgress(ir) },
    { id: 'delivery',  title: 'Delivery Proof',       level: 2, content: buildRequirements(ir) },
    { id: 'moat',      title: 'Technical Moat',       level: 2, content: buildTechnical(ir) },
    { id: 'activity',  title: 'Development Activity', level: 2, content: buildTimeline(ir) },
    { id: 'v-chart',   title: 'Velocity Chart',       level: 2, content: charts.velocityChart(ir) },
  ];
}
```

### RAG Status Helper (for CLU-05)
```javascript
// Deterministic RAG computation — no LLM involvement
function buildRAGStatus(ir) {
  const sentinel = sentinelHtml(ir.phases, 'Phase progress');
  if (sentinel) return sentinel;

  const pct = ir.phases.total > 0
    ? Math.round((ir.phases.completed / ir.phases.total) * 100)
    : 0;

  let rag, ragClass;
  if (pct >= 75) { rag = 'GREEN'; ragClass = 'pde-success'; }
  else if (pct >= 40) { rag = 'AMBER'; ragClass = 'pde-warning'; }
  else { rag = 'RED'; ragClass = 'pde-danger'; }

  return `<p><strong>Status:</strong> <span class="${escHtml(ragClass)}">${rag}</span> — ${pct}% complete (${ir.phases.completed}/${ir.phases.total} phases)</p>`;
}
```

### Sprint Review — What Shipped Section
```javascript
function buildShipped(ir) {
  const sentinel = sentinelHtml(ir.phases, 'Phase progress');
  if (sentinel) return sentinel;

  const shipped = Array.isArray(ir.phases.phase_list)
    ? ir.phases.phase_list.filter(p => p.completed)
    : [];

  if (shipped.length === 0) return '<p>No phases completed yet.</p>';

  const rows = shipped.map(p =>
    `<tr><td>${escHtml(p.name)}</td><td>&#x2713;</td></tr>`
  ).join('\n');

  return `<p>${shipped.length} phase(s) delivered this sprint.</p>
<table>
  <thead><tr><th>Phase</th><th>Status</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (see package.json) |
| Config file | vitest.config.js (project root) |
| Quick run command | `npx vitest run tests/phase-181/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLU-02 | `buildInvestorUpdate(ir)` returns sections array with expected IDs | unit | `npx vitest run tests/phase-181/render-presentation-cluster-a.test.mjs` | Wave 0 |
| CLU-03 | `buildSprintReview(ir)` returns sections including shipped phases | unit | `npx vitest run tests/phase-181/render-presentation-cluster-a.test.mjs` | Wave 0 |
| CLU-04 | `buildClientDeliverable(ir)` returns sections with requirements data | unit | `npx vitest run tests/phase-181/render-presentation-cluster-a.test.mjs` | Wave 0 |
| CLU-05 | `buildStakeholderStatus(ir)` returns RAG section with deterministic output | unit | `npx vitest run tests/phase-181/render-presentation-cluster-a.test.mjs` | Wave 0 |
| CLU-06 | `buildProductManager(ir)` returns requirement coverage sections | unit | `npx vitest run tests/phase-181/render-presentation-cluster-a.test.mjs` | Wave 0 |
| CLU-07 | `buildProjectManager(ir)` returns timeline and risk sections | unit | `npx vitest run tests/phase-181/render-presentation-cluster-a.test.mjs` | Wave 0 |
| All | Each builder: `render(ir, slug, htmlPath, mdPath)` writes files without throwing | integration | `npx vitest run tests/phase-181/render-presentation-cluster-a.test.mjs` | Wave 0 |
| All | Each builder: graceful handling when IR fields carry `{ unavailable: true }` | unit | `npx vitest run tests/phase-181/render-presentation-cluster-a.test.mjs` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/phase-181/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-181/render-presentation-cluster-a.test.mjs` — covers CLU-02 through CLU-07

*(Pattern: copy MOCK_IR from `tests/phase-178/render-presentation.test.mjs`, add 6 describe blocks, one per persona slug.)*

## Environment Availability

Step 2.6: SKIPPED — Phase is purely code changes to an existing .cjs file and a new test file. No external dependencies, tools, or services required beyond Node.js (already verified in production for Phases 178–180).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Monolithic persona function with its own HTML template | Section-based model: builder returns sections array, renderer handles HTML | Phase 178 | New builders never touch HTML document structure |
| Personas hard-coded in workflow file only | Dual registration: switch in render() + personaDisplayName() map | Phase 178 | Must update both on every new persona |

## Open Questions

1. **`ir.decisions` shape: array vs `{ items: [] }` object**
   - What we know: `extractDecisions()` returns a plain array; `buildDecisions()` accesses `ir.decisions && ir.decisions.items`
   - What's unclear: If the IR is always a plain array, the `ir.decisions.items` pattern will always return undefined and fall back to the empty array default. The current Phase 178 builders work, so the fallback path is consistently taken.
   - Recommendation: Match the Phase 178 pattern exactly — `Array.isArray(ir.decisions && ir.decisions.items) ? ir.decisions.items : []` — so new builders are consistent even if the schema evolves.

2. **`ir.phases.phase_list` completeness for sprint-review**
   - What we know: `extractPhaseCompletion()` is sourced from STATE.md frontmatter; `phase_list` is not directly populated by that extractor in the code read (the IR field exists in MOCK_IR but the extractor only returns `total`, `completed`, etc.)
   - What's unclear: Whether `phase_list` is populated at all in production IR or only in the test fixture.
   - Recommendation: For sprint-review, fall back gracefully if `phase_list` is empty/missing — show a "phase list unavailable" message rather than hard-failing.

## Sources

### Primary (HIGH confidence)
- `bin/lib/render-presentation.cjs` — full source read: builder pattern, dispatch, helpers, CSS tokens
- `bin/lib/presentation.cjs` — full source read: IR schema, all 10 extractors, field shapes
- `bin/lib/verify-presentation.cjs` — first 60 lines: claims map structure
- `tests/phase-178/render-presentation.test.mjs` — MOCK_IR fixture shape, test pattern
- `tests/phase-180/verify-presentation.test.mjs` — integration pattern confirmation
- `workflows/present.md` — full persona registry (15 slugs), dispatch flow

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` — CLU-02 through CLU-07 requirement text
- `.planning/STATE.md` — accumulated decisions confirming section-based model and other locked constraints

## Metadata

**Confidence breakdown:**
- Builder pattern: HIGH — read full source of Phase 178 reference implementations
- IR field shapes: HIGH — read full presentation.cjs extractor code
- Test pattern: HIGH — read existing test files directly
- Section content design (per-persona): MEDIUM — based on requirement text + IR field analysis; audience-specific arrangement is discretionary

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable internal codebase, no external dependencies)
