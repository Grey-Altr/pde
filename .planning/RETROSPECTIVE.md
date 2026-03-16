# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — PDE v1.0 MVP

**Shipped:** 2026-03-15
**Phases:** 11 | **Plans:** 23 | **Commits:** 127

### What Was Built
- Complete GSD → PDE rebrand with zero residual GSD strings
- 34 `/pde:` slash commands with full Claude Code palette integration
- Workflow engine with persistent `.planning/` state management
- 12 PDE agent types with parallel wave orchestration
- Public distribution package: README, Getting Started guide, marketplace.json
- Telemetry module, consent panel, and UI rendering chain
- 21 command stubs closing all dangling reference gaps

### What Worked
- **Order-dependent rename sequence** — doing plugin identity first, then binaries, then commands, etc. meant each layer was clean before the next built on it
- **Gap closure phases (9-11)** — the milestone audit caught real issues (runtime crash, STATE.md regressions, dangling references) that would have shipped broken
- **File-based state model** — `.planning/` directory survives context resets perfectly; no database needed
- **Atomic commits per task** — clean git history made debugging and verification easy

### What Was Inefficient
- **STATE.md body drift** — the body narrative fell out of sync with frontmatter multiple times, requiring dedicated fix phases
- **Summary format mismatch** — SUMMARY.md files use tech-tracking format (dependency graphs, key-files) instead of prose one-liners, making automated accomplishment extraction fail
- **Version bumping timing** — started at 0.1.0, bumped to 1.0.0 at Phase 8; could have been cleaner to set final version earlier
- **gsd_state_version regression** — the GSD layer re-wrote the old key on state updates, requiring a targeted patch

### Patterns Established
- Plugin manifest at `.claude-plugin/plugin.json` with VERSION file as single source of truth
- Two-tier delegation: command stubs → workflow files (skills layer omitted in plugin)
- `${CLAUDE_PLUGIN_ROOT}` for all path references in workflow files
- Tech-tracking SUMMARY format with dependency graphs, provides/affects, key-files
- Command stubs with `planned: true` status for v2 features

### Key Lessons
1. **Audit before shipping** — the milestone audit caught 4 categories of issues that would have broken user experience. Always run `/pde:audit-milestone` before completion.
2. **GSD layer writes back** — when forking a system, the upstream layer can regress your changes on subsequent writes. Patch the write path, not just the current state.
3. **grep-clean is not functionally-clean** — zero GSD strings doesn't mean everything works. Integration testing (render chain, state persistence) catches what grep misses.
4. **Stubs beat dangling references** — a command that says "planned for v2" is better than a reference that leads nowhere.

### Cost Observations
- Model mix: primarily sonnet for execution agents, opus for orchestration
- Timeline: 2 days (2026-03-14 → 2026-03-15)
- Notable: 127 commits in 2 days — high velocity enabled by automated planning and execution pipeline

---

## Milestone: v1.1 — Design Pipeline

**Shipped:** 2026-03-16
**Phases:** 15 | **Plans:** 16 | **Commits:** 135

### What Was Built
- 7-stage design pipeline: brief → system → flows → wireframe → critique → iterate → handoff
- Pipeline orchestrator (/pde:build) with DESIGN-STATE.md tracking and verification gates
- Design infrastructure: design.cjs with DTCG-to-CSS, write-lock, manifest CRUD (zero npm deps)
- DTCG 2025.10 tokens with OKLCH color space, dual dark mode, CSS custom properties derivation
- Mermaid flow diagrams with screen inventory JSON for wireframe stage
- Fidelity-controlled HTML/CSS wireframes (lo-fi/mid-fi/hi-fi) with state variants and annotations
- 4-perspective design critique (UX, visual hierarchy, accessibility, business alignment) with severity ratings
- Versioned wireframe iteration with convergence signal and effort gating
- TypeScript interface generation and STACK.md-aligned component specs for handoff
- design-manifest.json artifact registry with 7-field designCoverage tracking

### What Worked
- **Infrastructure-first approach** — building design.cjs and pde-tools.cjs before any skill meant all 7 skills used the same state management, locking, and manifest patterns
- **7-step workflow pattern** — every skill follows the same structure (prereqs → lock → read context → generate → manifest → coverage → lock-release), making each new skill faster to implement
- **Milestone auditing between waves** — catching integration gaps (hasBrief contradiction, coverage clobbering, WFR- prefix mismatch) early prevented them from compounding
- **Read-before-set coverage pattern** — prevents skills from silently clobbering each other's manifest flags
- **Strict orchestrator (read-only)** — /pde:build owns zero logic; each skill is fully independent

### What Was Inefficient
- **5 gap-closure phases (13.1, 13.2, 15.1, 21-23)** — nearly a third of phases were retroactive fixes; suggests integration testing should happen earlier in the pipeline
- **SUMMARY format lacks one_liner field** — automated accomplishment extraction failed again (same v1.0 issue); tech-tracking format is great for dependency graphs but poor for milestone summaries
- **STATE.md body still drifts** — the Current Position narrative lagged behind actual progress (showing Phase 20 when all phases were done)
- **Coverage field count grew mid-milestone** — hasIterate added as 7th field in Phase 18 required backfilling 4 workflows in Phase 21

### Patterns Established
- DESIGN-STATE.md as pipeline progress tracker (stage completion table + write-lock row)
- design-manifest.json with designCoverage object (7 boolean fields tracking each stage)
- Skill-as-Self-Contained-Workflow: command stub delegates to workflow file with all logic
- Brief as soft dependency (warn + fallback) vs hard dependency (block + recovery message) pattern
- Versioned artifacts (BRF-brief-v{N}.md, CRT-critique-v{N}.md) vs fixed paths (FLW-screen-inventory.json)
- ANNOTATION: HTML comments in wireframes parsed by handoff for TypeScript interface generation
- Fidelity-severity calibration: critique severity adjusts based on wireframe fidelity level

### Key Lessons
1. **Integration testing should gate, not follow** — 5 retroactive fix phases could have been 0 if each skill was tested against its consumers before moving on
2. **Coverage schema should be designed upfront** — adding hasIterate mid-milestone caused a 4-file backfill; define all fields in the infrastructure phase
3. **Orchestrator last is correct** — building /pde:build after all 7 skills validated independently was the right call; no skill logic leaked into the orchestrator
4. **Annotation conventions must be established with the producer** — wireframe annotations power handoff; defining the convention in Phase 16 (wireframe) instead of Phase 19 (handoff) was critical
5. **Hard dependencies are better than silent degradation** — STACK.md as hard dep for handoff produces clear errors; brief as soft dep for flows sometimes produces vague output

### Cost Observations
- Model mix: primarily sonnet for execution, opus for orchestration and planning
- Timeline: 2 days (2026-03-15 → 2026-03-16)
- Notable: 135 commits, 15 phases in 2 days — infrastructure-first approach kept each skill to ~4 minutes average

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Commits | Phases | Key Change |
|-----------|---------|--------|------------|
| v1.0 | 127 | 11 | Initial release — fork-and-rebrand with gap closure |
| v1.1 | 135 | 15 | Design pipeline — 7 skills + orchestrator with infrastructure-first approach |

### Cumulative Quality

| Milestone | Requirements | Coverage | Gap Phases |
|-----------|-------------|----------|------------|
| v1.0 | 40/40 | 100% | 3 (phases 9-11) |
| v1.1 | 25/25 | 100% | 5 (phases 13.1, 13.2, 15.1, 21-23) |
