# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v0.1 — PDE MVP

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

## Milestone: v0.2 — Design Pipeline

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

## Milestone: v0.3 — Advanced Design Skills

**Shipped:** 2026-03-17
**Phases:** 5 | **Plans:** 10 | **Commits:** 67

### What Was Built
- 6 new design skills: recommend (MCP/tool discovery), competitive (landscape analysis), opportunity (RICE scoring), mockup (hi-fi HTML/CSS), HIG (WCAG 2.2 AA audit), ideate (diverge→converge exploration)
- 13-field pass-through-all coverage pattern across all 12 skill workflows
- Expanded /pde:build orchestrator from 7 to 13 stages with --from entry point and dynamic stage counting
- Soft upstream context injection in /pde:brief (IDT/CMP/OPP artifacts with graceful degradation)
- skill-registry.md with all 13 PDE skill codes for LINT-010 compliance
- 306 Nyquist structural tests across all 5 phases

### What Worked
- **Infrastructure-first paid off again** — Phase 24 (schema migration) before any new skills meant zero coverage flag clobber incidents across 6 new skill implementations
- **Zero gap-closure phases** — learning from v1.1's 5 retroactive fix phases, v1.2 shipped with no unplanned phases; integration was correct from the start
- **Soft upstream probe pattern** — Glob + null context variable on miss + graceful degradation elegantly handled the optional dependency chain (IDT→CMP→OPP→brief)
- **Milestone audit before completion** — caught OPP-02 AskUserQuestion gap and HIG requirements SUMMARY gap, both fixed before shipping
- **Pass-through-all coverage pattern** — designing the 13-field schema upfront (lesson from v1.1) prevented the mid-milestone backfill that plagued v1.1

### What Was Inefficient
- **SUMMARY.md one_liner extraction still fails** — third consecutive milestone where automated accomplishment extraction returns null; tech-tracking format needs a dedicated one_liner field
- **Phase 26 packed too much** — 3 unrelated skills (opportunity, mockup, HIG) in one phase made context heavy; could have been 3 phases with cleaner isolation
- **Phase 28 plan checkboxes not checked in ROADMAP** — the Phase 26-28 plan checkboxes in the ROADMAP.md Phase Details section remained unchecked despite completion (cosmetic but confusing for audit)

### Patterns Established
- Pass-through-all coverage: every skill reads all 13 flags, writes all 13 with only its own changed
- Probe/use/degrade MCP pattern: try WebSearch → use if available → degrade to offline catalog
- Skill() not Task() for sub-skill invocation within workflows (avoids #686 nested-agent freeze)
- Soft upstream injection: Glob probe → null context variable → Step N enrichment only if context exists
- Data-driven STAGES list: pipeline stage count derived from list length, not hardcoded literals
- Banned word list for evaluative language enforcement (diverge pass neutrality)

### Key Lessons
1. **Design schema upfront, iterate skills after** — Phase 24's 13-field schema meant zero backfills; v1.1's 7th field added mid-milestone caused 4-file backfill. Always define the full schema before implementing consumers.
2. **One skill per phase for unrelated skills** — Phase 26 packed 3 unrelated skills; harder to debug and review. Group only tightly coupled skills.
3. **SUMMARY format needs a one_liner field** — this is the third milestone where automated extraction fails. Add a YAML frontmatter `one_liner:` field to the SUMMARY template.
4. **Milestone audit catches real gaps** — OPP-02 missing AskUserQuestion in allowed-tools would have caused a runtime failure in interactive mode.

### Cost Observations
- Model mix: primarily sonnet for execution agents, opus for orchestration
- Timeline: 2 days (2026-03-16 → 2026-03-17)
- Notable: 67 commits in 2 days; zero unplanned phases — cleanest milestone yet

---

## Milestone: v0.4 — Self-Improvement & Design Excellence

**Shipped:** 2026-03-18
**Phases:** 10 | **Plans:** 20 | **Commits:** 131

### What Was Built
- Quality infrastructure: Awwwards 4-dimension rubric, motion design reference, composition/typography reference with APCA contrast guidance
- Protected-files mechanism preventing self-improvement agents from modifying quality rubric and core files
- Self-improvement fleet: 3-agent orchestration (auditor/improver/validator) with `/pde:audit` command
- Baseline delta tracking and PDE Health Reports for quantifiable improvement measurement
- Skill builder: `/pde:improve` with create/improve/eval modes, validation gate, style guide enforcement
- Design elevation of all 7 pipeline skills: DTCG motion tokens, OKLCH harmony palettes, spring physics, scroll-driven animations, variable font axes, APCA contrast
- Pressure test: `/pde:pressure-test` with two-tier evaluation (process compliance + Awwwards quality rubric)
- Tech debt cleanup phase closing all audit-identified gaps

### What Worked
- **Quality references before elevation** — building the Awwwards rubric, motion design, and composition/typography references in Phase 29 gave every subsequent phase a concrete target to elevate toward
- **Strict dependency chain for elevation** — system → wireframe → critique → mockup → handoff ordering meant each skill inherited upstream quality improvements
- **Nyquist-first approach** — writing bash test scripts (Wave 0) before implementation ensured every elevation had verifiable criteria; 330+ assertions across 10 phases
- **Milestone audit with re-audit** — first audit found 4 tech debt items; Phase 38 fixed them; re-audit confirmed 0 remaining. Two-pass verification was valuable.
- **Pressure test fixture concept (Tide)** — forcing domain-specific output on a marine biology platform prevented AI aesthetic patterns from sneaking through

### What Was Inefficient
- **SUMMARY.md one_liner field still missing** — fourth consecutive milestone where automated accomplishment extraction fails; gsd-tools `summary-extract --fields one_liner` returns empty
- **STATE.md accumulated context bloat** — by Phase 38, the decisions section had 60+ lines of per-plan decisions making the file unwieldy; next milestone should start with clean accumulated context
- **Phase 38 should have been unnecessary** — audit found pressure-test.md missing frontmatter, baseline not saved, summary metadata gaps. These should have been caught during the originating phases.

### Patterns Established
- Quality reference files as `@` includes in skill `required_reading` — no structural changes to 7-step skill anatomy
- Protected-files.json with prompt-level enforcement (defense in depth at workflow + agent level)
- Three-agent fleet pattern: auditor (read-only) → improver (propose) → validator (accept/reject)
- Baseline delta tracking: JSON snapshot → run audit → compute improvement delta
- Pressure test two-tier evaluation: process compliance (mechanistic) + quality rubric (judgment)
- VISUAL-HOOK dual comment convention (HTML + CSS) for concept-specific interaction detection
- `@supports (animation-timeline: scroll())` as MANDATORY guard for scroll-driven CSS

### Key Lessons
1. **Frontmatter validation should be automated at commit time** — Phase 38 existed only because frontmatter was incorrect in earlier phases. A pre-commit hook running `validate-skill` would have caught this.
2. **Baseline snapshots should be part of the audit command's default behavior** — having to run `--save-baseline` separately is error-prone; the first audit should always save a baseline.
3. **One tech debt cleanup phase per milestone is predictable** — v1.0 had 3 gap phases, v1.1 had 5, v1.2 had 0, v1.3 had 1. Budget for it but minimize via upstream validation.
4. **Spring physics approximation works** — cubic-bezier approximations of spring easing produce convincing results without JavaScript dependencies; GSAP is an enhancement, not a requirement.

### Cost Observations
- Model mix: sonnet for execution agents, opus for orchestration and evaluation (pde-design-quality-evaluator, pde-pressure-test-evaluator)
- Timeline: 4 days (2026-03-14 → 2026-03-18)
- Notable: Largest milestone (10 phases, 20 plans, 131 commits), heaviest on opus due to quality evaluation agents

---

## Milestone: v0.5 — MCP Integrations

**Shipped:** 2026-03-19
**Phases:** 7 | **Plans:** 18 | **Commits:** 99

### What Was Built
- MCP infrastructure: central adapter module (mcp-bridge.cjs) with security allowlist, probe/degrade contracts, TOOL_MAP with 36 canonical→raw mappings, connection persistence
- GitHub integration: issue sync to REQUIREMENTS.md, PR creation from handoff, brief from GitHub issue, CI pipeline status display
- Linear + Jira integration: issue sync, milestone/epic mapping, ticket creation from handoff, configurable task_tracker toggle
- Figma integration: DTCG token import/export with non-destructive merge, wireframe design context, Code Connect handoff, mockup-to-Figma canvas export
- Pencil integration: design token sync to VS Code canvas, screenshot capture for visual critique, detection-based connection with graceful degradation
- End-to-end validation: 315 structural tests (17 concurrency isolation, 19 auth recovery, 26 write-back confirmation, 62+ cross-integration)

### What Worked
- **Infrastructure-first (Phase 39) hard-blocked all integrations** — mcp-bridge.cjs established adapter pattern, security allowlist, and probe/degrade contracts that every subsequent phase inherited unchanged
- **Adapter pattern compounding** — Phase 40 (GitHub) established TOOL_MAP + bridge.call() pattern; Phases 41-43 reused it verbatim, making each integration faster to implement than the last
- **Write-back confirmation gates from the start** — VAL-03 compliance pattern established in Phase 40 (GitHub PRs) was inherited by all subsequent write-back workflows (Linear issues, Jira tickets, Figma export)
- **Milestone audit before completion** — caught 2 allowed-tools gaps and 2 try/catch inconsistencies, leading to Phase 40.1 tech debt cleanup before shipping
- **Phase 44 as structural audit** — tests validated existing code structure rather than filling gaps, going GREEN immediately on first run

### What Was Inefficient
- **SUMMARY.md one_liner field still missing** — fifth consecutive milestone where automated accomplishment extraction fails; gsd-tools `summary-extract --fields one_liner` returns null
- **Phase 40.1 should have been unnecessary** — allowed-tools gaps in sync.md and pipeline-status.md could have been caught by a pre-commit validation hook checking frontmatter completeness
- **STATE.md accumulated context grew to 100+ lines** — v0.5 decisions section became unwieldy; milestone archival is the right time to clean it

### Patterns Established
- Central MCP adapter (mcp-bridge.cjs) with APPROVED_SERVERS, TOOL_MAP, probe(), call(), assertApproved()
- Canonical tool name mapping insulating workflows from raw MCP tool name changes
- Detection-based connection flow for local MCP servers (Pencil via VS Code extension)
- Non-blocking sub-workflow dispatch for optional integrations (Pencil in system.md and critique.md)
- Inline conversion functions (figmaColorToCss, dtcgToPencilVariables) preserving zero-npm constraint
- Confirmation gate pattern: strict y/yes regex before any external write (VAL-03)
- Structural audit tests: validate existing code patterns rather than implement new behavior

### Key Lessons
1. **Adapter patterns compound** — investing in the canonical tool name mapping in Phase 39/40 meant Phases 41-43 each took less time. The pattern is proven for any future integration.
2. **Pre-commit frontmatter validation would eliminate tech debt phases** — Phase 40.1 existed because allowed-tools was missing in 2 files. An automated check would catch this at commit time.
3. **Structural audit tests are fast and high-value** — Phase 44's 315 tests validated safety properties across all integrations in a single plan, going GREEN immediately because the code was already correct.
4. **Detection-based connection beats manual setup** — Pencil's auto-detection via VS Code extension is zero-friction compared to `claude mcp add` for hosted services.

### Cost Observations
- Model mix: sonnet for execution agents, opus for orchestration and planning
- Timeline: 2 days (2026-03-18 → 2026-03-19)
- Notable: 99 commits, 7 phases — adapter pattern reuse made later integrations progressively faster

---

## Milestone: v0.6 — Advanced Workflow Methodology

**Shipped:** 2026-03-20
**Phases:** 8 | **Plans:** 19 | **Commits:** ~91

### What Was Built
- Project context constitution: auto-generated `project-context.md` (max 4KB) injected into every subagent spawn
- Story-file sharding: plans with 5+ tasks produce atomic `task-NNN.md` files; executor loads one at a time for ~90% context reduction
- AC-first planning: acceptance criteria with unique AC-N identifiers, task-to-AC verification gates, boundary enforcement
- Post-execution reconciliation: mandatory `RECONCILIATION.md` comparing planned vs actual git commits; high-risk task HALT gates
- Readiness gate: `/pde:check-readiness` with PASS/CONCERNS/FAIL; execute-phase blocks on FAIL
- Per-task workflow tracking with real-time status updates and `HANDOFF.md` for session breaks
- Agent enhancements: assumptions capture, analyst persona interviews, analyst-to-brief pipeline, persistent agent memory with 50-entry cap and archival
- File-hash manifest (`files-manifest.csv`) for safe framework updates preserving user modifications
- BMAD/PAUL methodology reference document in PDE terms

### What Worked
- **BMAD/PAUL selective import** — cherry-picking patterns (context constitution, AC-first, reconciliation) rather than wholesale framework import meant each pattern fit PDE's existing architecture without friction
- **TDD-first phases (47, 48)** — writing sharding and AC extraction tests before implementation caught edge cases (empty plans, pre-Phase-48 backwards compatibility) early
- **Rapid 2-day timeline** — 8 phases in 2 days with zero unplanned gap-closure phases (Phase 53 was a planned polish phase, not a reactive fix)
- **Nyquist compliance across all phases** — 7/8 phases fully compliant in VALIDATION.md, 8/8 passed actual verification with 80/80 must-haves
- **Integration checker at milestone audit** — verified all 24 requirements had cross-phase wiring with zero orphaned connections

### What Was Inefficient
- **SUMMARY.md one_liner field still missing** — sixth consecutive milestone where automated accomplishment extraction returns empty; tech-tracking format needs a dedicated `one_liner:` YAML field
- **STATE.md body narrative lagged again** — Current Position showed "Phase 46, ready to plan" even after all 8 phases completed; milestone archival is the right cleanup point
- **SUMMARY frontmatter requirements_completed omissions** — phases 49, 50, 51, 52 had verified requirements missing from SUMMARY frontmatter; executor agents don't consistently populate this field
- **pde-tools.cjs usage help text not updated** — v0.6 added 4 CLI subcommands (manifest, shard-plan, readiness, tracking) but the error-message command list was never updated; cosmetic but confusing

### Patterns Established
- Project context constitution: compact 4KB document synthesized from PROJECT.md + REQUIREMENTS.md + STATE.md decisions
- Story-file sharding with task-count threshold: ≥5 tasks get sharded, <5 stay monolithic
- AC-first planning: AC-N identifiers before task list, per-task `ac_refs`, verification gate before task completion
- Three-tier reconciliation matching: slug > file overlap > phase-plan prefix
- Readiness gate as execute-phase pre-flight: PASS proceeds, CONCERNS warns, FAIL blocks
- Workflow-status.md as execution telemetry: init with real task names, set-status per task, read for progress
- Per-agent persistent memory: 50-entry cap with date-named archival, loaded at spawn, appended on completion
- Analyst persona pattern: multi-round probing interview feeding upstream context to /pde:brief

### Key Lessons
1. **Selective methodology import beats wholesale adoption** — BMAD and PAUL have patterns designed for human-directed sequential workflows; PDE needed only the ideas (context constitution, AC-first, reconciliation) adapted for autonomous parallel agents. Importing entire agent files or directory structures would have created conflicts.
2. **Executor agents under-populate SUMMARY frontmatter** — the `requirements_completed` field was missing for 7/19 plans. Consider making this field mandatory in the executor's completion gate rather than optional.
3. **One polish phase per milestone is the right cadence** — Phase 53 caught 6 real issues (context injection, task names, TASK_TOTAL guard, dead code, reconciler awareness, Nyquist gaps). Budgeting for this is cheaper than hoping for zero tech debt.
4. **Milestone audit with integration checker is high-value** — the cross-phase wiring check found the pde-tools.cjs help text gap and confirmed all 24 requirements had end-to-end paths. Worth the 5-minute agent cost every time.

### Cost Observations
- Model mix: sonnet for execution/research/verification agents, opus for orchestration
- Timeline: 2 days (2026-03-19 → 2026-03-20)
- Notable: 8 phases, 19 plans, ~91 commits — zero unplanned phases, cleanest milestone alongside v0.3

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Commits | Phases | Key Change |
|-----------|---------|--------|------------|
| v0.1 | 127 | 11 | Initial release — fork-and-rebrand with gap closure |
| v0.2 | 135 | 15 | Design pipeline — 7 skills + orchestrator with infrastructure-first approach |
| v0.3 | 67 | 5 | Advanced design skills — 6 new skills, 13-stage pipeline, zero unplanned phases |
| v0.4 | 131 | 10 | Self-improvement — audit fleet, skill builder, design elevation, pressure test |
| v0.5 | 99 | 7 | MCP integrations — 5 external tool integrations via central adapter, 315 validation tests |
| v0.6 | ~91 | 8 | Workflow methodology — sharding, AC-first, reconciliation, readiness, tracking, agent memory |

### Cumulative Quality

| Milestone | Requirements | Coverage | Gap Phases | Nyquist Tests |
|-----------|-------------|----------|------------|---------------|
| v0.1 | 40/40 | 100% | 3 (phases 9-11) | — |
| v0.2 | 25/25 | 100% | 5 (phases 13.1, 13.2, 15.1, 21-23) | — |
| v0.3 | 25/25 | 100% | 0 | 306 |
| v0.4 | 62/62 | 100% | 1 (phase 38) | 330+ |
| v0.5 | 27/27 | 100% | 1 (phase 40.1) | 315 |
| v0.6 | 24/24 | 100% | 0 (phase 53 planned) | 80 must-haves |
