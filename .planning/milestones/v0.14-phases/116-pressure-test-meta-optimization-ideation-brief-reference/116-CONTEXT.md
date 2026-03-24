# Phase 116: Pressure Test + Meta-Optimization + Ideation + Brief Reference - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Four independent enhancements exploiting browser capabilities: visual pressure testing dimension, self-calibrating mutation strategies via JSONL history analysis, ideation visual diversity scoring via screenshot variance, and live reference screenshot capture in brief skill. All degrade gracefully when Playwright is unavailable.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from ROADMAP:
- PRES-01 through PRES-04, META-01 through META-04, IDT-01 through IDT-04, BREF-01 through BREF-04 requirements
- All 4 capabilities must degrade gracefully when Playwright unavailable
- Pressure test combines visual metrics with existing Awwwards text rubric
- Meta-optimization reads JSONL history to weight mutation strategies
- Ideation divergence scored by screenshot variance across concepts
- Brief reference captures live product screenshots from URLs

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- skills/pressure-test/SKILL.md — existing Awwwards rubric pressure test
- workflows/optimize.md — experiment orchestrator with mutation dispatch
- skills/ideate/SKILL.md — multi-phase diverge/converge ideation
- skills/brief/SKILL.md — problem framing with product type detection
- bin/lib/experiment-schema.cjs — experiment template parsing
- Visual metric scripts from Phase 111 (dom-metric, a11y-metric, contrast-metric, responsive-metric, mermaid-metric)

### Established Patterns
- _evalMetric contract: exit 0, stdout = numeric score
- Playwright probe/degrade pattern from Phase 108
- Screenshot capture patterns from Phase 109 (wireframe.md Step 5d, mockup.md Step 7f)
- JSONL history logging in .planning/experiments/

### Integration Points
- pressure-test/SKILL.md — add visual scoring dimension
- optimize.md Step 7 — add strategy weighting from JSONL history
- ideate/SKILL.md — add screenshot variance scoring in diverge phase
- brief/SKILL.md — add reference screenshot capture step

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
