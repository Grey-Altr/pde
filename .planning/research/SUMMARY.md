# Project Research Summary

**Project:** Platform Development Engine — v0.6 Advanced Workflow Methodology
**Domain:** AI agentic workflow methodology import (BMAD + PAUL patterns into existing Claude Code plugin)
**Researched:** 2026-03-19
**Confidence:** HIGH

## Executive Summary

PDE v0.6 is a methodology enhancement milestone, not a new product. The task is selectively importing proven patterns from two established AI development frameworks — BMAD (Breakthrough Method for Agile AI-Driven Development, 41k stars, v6.2.0) and PAUL (Plan-Apply-Unify Loop) — into PDE's existing 34-command, 13-stage design pipeline without introducing dual state management, competing artifact formats, or terminology fragmentation. Both source frameworks were designed as standalone systems that own the entire workflow from scratch; PDE already covers most of that ground. The import surface is therefore intentionally narrow: what PDE is genuinely missing, not what BMAD/PAUL offer in total.

The recommended approach is additive and pattern-based. No new npm dependencies. No parallel state directories. No BMAD/PAUL agent files imported verbatim. Instead, five core capabilities are extracted as native PDE enhancements: (1) a project context constitution document (.planning/project-context.md) that gives every subagent a compact, agent-optimized baseline; (2) story-file sharding — pde-planner emits atomic task files for plans with 5+ tasks, reducing context consumption by an estimated 90%; (3) acceptance-criteria-first planning (BDD Given/When/Then format) embedded in the PLAN.md template; (4) a mandatory reconciliation step (PAUL's UNIFY phase) that compares planned tasks against actual git commits after execution; and (5) an implementation readiness gate before execution begins. Everything else from BMAD/PAUL is either already covered by PDE or deliberately deferred.

The primary risks are architectural rather than technical. The most dangerous failure mode is allowing BMAD/PAUL's state management structures (.paul/ directory, _bmad/ directory) to coexist with PDE's .planning/ canonical state root — this creates two sources of truth that diverge silently. The second risk is importing too broadly and ending up with many new agent files covering functions PDE already performs, inflating the codebase and confusing users. Both risks are avoided by enforcing a single decision rule: every import must answer "what does PDE not do today that this adds?" with a specific, verifiable answer. If the gap is real, import it as a PDE-native pattern. If the gap is already covered, discard the BMAD/PAUL version regardless of how polished it is.

## Key Findings

### Recommended Stack

No new npm dependencies or runtime technologies are introduced in v0.6. PDE's zero-dependency constraint at the plugin root is preserved. The implementation surface is entirely file-based: new markdown agents, modified workflow files, a new CommonJS module (bin/lib/manifest.cjs for SHA256 hash tracking), and new templates and reference documents. BMAD v6.2.0 and PAUL (latest) are sources of methodology patterns, not packages to install. Their patterns are imported as PDE skills and template changes, not via npx installers that would conflict with PDE's Claude Code plugin install mechanism.

**Core technologies (existing, unchanged):**
- Node.js 20.x LTS / CommonJS — PDE's execution runtime; zero-dependency constraint preserved
- File-based .planning/ state — canonical state store; all new state artifacts go here; no parallel directories
- Claude Code Task/Skill agent system — all new and modified agents follow existing PDE format
- bin/pde-tools.cjs CLI — extended with manifest subcommands only

**New infrastructure (minimal additions only):**
- bin/lib/manifest.cjs — SHA256 hash manifest CRUD; enables safe framework updates without three-way merge conflicts
- .planning/project-context.md — auto-generated 4KB agent-optimized synthesis; gives every subagent compact baseline context
- .planning/agent-memory/ — per-agent sidecar memory directories (executor, planner, debugger, verifier); project-scoped

### Expected Features

**Must have (v0.6 core — methodology import is not real without these):**
- Project context constitution (.planning/project-context.md) — foundation; all sharding features depend on it; LOW complexity
- Story-file sharding — pde-planner emits tasks/ directory for 5+ task plans; pde-executor loads one task file at a time; MEDIUM complexity
- Acceptance-criteria-first planning — PLAN.md template adds AC section; tasks reference AC-N identifiers; verifier validates ACs; MEDIUM complexity
- Unify/reconciliation step — mandatory post-execution comparison of planned tasks vs. actual git changes; produces RECONCILIATION.md; MEDIUM complexity
- Implementation readiness gate — /pde:check-readiness runs PO-style checklist before execution; blocks on FAIL; MEDIUM complexity

**Should have (v0.6.x — extend once core is validated):**
- Task boundary enforcement — boundaries field in task schema; executor enforces DO NOT CHANGE sections; LOW complexity
- HALT checkpoints for high-risk tasks — planner tags risk:high tasks; executor pauses for confirmation; LOW-MEDIUM complexity
- Workflow status tracking — per-story TODO/IN_PROGRESS/DONE in tasks/workflow-status.md; LOW complexity
- PAUL session handoff documents — .planning/HANDOFF.md generation on session break; LOW complexity
- Pre-planning assumptions capture — /pde:assumptions surfaces planner's intended approach before plan generation; LOW complexity

**Defer to v0.7+:**
- Analyst-persona discovery — multi-round probing interview pattern for product briefs; highest value after core methodology is settled
- Sidecar agent memory — per-agent cross-session learning; most valuable after 3+ milestones run on a project
- File-hash manifest for updates — replaces three-way merge in pde:update; pde:update is working; defer until a user hits a conflict
- Party Mode multi-persona critique — multi-agent discussion during discuss-phase; high complexity; good v0.7 candidate

**Anti-features (do not import):**
- BMAD agent files imported verbatim — BMAD agents expect human-directed sequential workflows; they break PDE's automated pipeline orchestration model
- .paul/ parallel state directory — creates two STATE.md files that diverge silently; breaks every pde-tools.cjs state read
- PAUL in-session-over-subagents philosophy — PDE's entire architecture is built on parallel subagent waves; this philosophy would require abandoning parallel execution
- Sprint ceremonies and story points — PAUL explicitly rejects these; PDE's phase/milestone model is simpler and fits its cadence

### Architecture Approach

v0.6 is a purely additive methodology layer on top of PDE's stable v0.5 architecture. The 13 design pipeline skills, all MCP sync workflows, the build orchestrator, mcp-bridge.cjs, mcp-config.cjs, design-manifest.json, and protected-files.json require zero modification. The execute-plan flow gains one new step (reconciliation between executor completion and verifier invocation). The plan-phase workflow gains AC formatting instructions and a story-sharding trigger for 5+ task plans. Four existing agent files gain sidecar memory loading. Two workflows gain project-context.md generation steps. One new agent (pde-architect) is created for architecture review. The update workflow gains hash-based merge logic.

**Major components and their responsibilities:**

1. bin/lib/manifest.cjs — SHA256 hash manifest CRUD; detects user modifications vs. stock files; enables safe auto-update of unmodified files while preserving user changes; most-depended-upon new module
2. .planning/project-context.md — auto-generated 4KB synthesis of PROJECT.md + REQUIREMENTS.md + key STATE.md decisions; every subagent receives this as baseline; replaces ad-hoc STATE.md + PROJECT.md loading
3. Story-file sharding layer — pde-planner emits tasks/ directory for 5+ task plans; each task-NNN-{slug}.md is self-contained with AC references, file paths, schema snippets; pde-executor loads one at a time
4. Reconciliation step in execute-plan.md — reads PLAN.md task list, runs git log on phase branch, correlates planned tasks against actual commits, writes RECONCILIATION.md before pde-verifier runs
5. agents/pde-architect.md (new) — architecture review agent; evaluates plans for structural risks, ADR recommendations, component boundary analysis; invoked by /pde:check-readiness
6. .planning/agent-memory/ — per-agent sidecar memory; four agents (executor, planner, debugger, verifier) read project-specific memory at spawn and append key findings on completion; 50-entry cap with archive

**Key patterns:**
- AC-First Task Format: every PLAN.md task includes BDD acceptance criteria (Given/When/Then); tasks reference AC-N identifiers; pde-verifier checks ACs before goal-backward analysis
- Loop enforcement via current_loop field in STATE.md: tracks PLAN/APPLY/UNIFY position; gates phase transitions in interactive mode; auto-completes in yolo mode
- Hash-based update safety: SHA256 comparison determines which files the user has modified; modified files preserved with notice; unmodified files auto-updated silently

### Critical Pitfalls

1. **Dual state management (.paul/ alongside .planning/)** — Do not create a .paul/ directory. All PAUL state patterns must be implemented inside PDE's existing .planning/ hierarchy. Two STATE.md files diverge silently and break every pde-tools.cjs state read. Prevention: enforce this as a non-negotiable architectural constraint in Phase 1 before any PAUL patterns are imported.

2. **Agent role namespace collision** — BMAD defines 9 agent roles; PDE already covers most of the same ground via existing skills and workflows. Import only the documented gaps: one new agent (pde-architect for architecture review) and AC-first format discipline in the existing planner. If more than 5 new agent files appear in v0.6, the import has drifted into methodology bloat.

3. **Methodology bloat — importing everything, using nothing** — Hard limit: fewer than 6 new agent/command files for v0.6. Every import requires a gap justification table entry. BMAD has 12 agent roles; PDE needs at most 1 new agent. Unused agents bloat the 145,000 LOC codebase and must be maintained every time PDE's skill-style-guide changes.

4. **Skill validation infrastructure rejection** — PDE has strict lint rules (LINT-001 through LINT-042). No BMAD/PAUL-derived file may merge without passing all lint rules. Format conversion is part of import work, not a cleanup task. Run pde-skill-builder validation on each new or modified agent before committing.

5. **BMAD/PAUL terminology leakage into user-facing docs** — All user-facing documentation must describe what PDE does, not which methodology it borrowed from. Users must never need to read BMAD or PAUL documentation to use PDE v0.6. New /pde: commands must be named after PDE capabilities, not BMAD/PAUL concepts.

6. **Context window explosion from methodology documentation loading** — Every imported or modified agent's required_reading list must be audited. Methodology documents needed at planning time are not needed at execution time. Token consumption per execute-plan invocation must stay within 10% of the v0.5 baseline. Run a context audit pass after Phase 3 agent modifications.

## Implications for Roadmap

Based on combined research, five build phases are suggested. The dependency chain from FEATURES.md is the primary ordering constraint: project-context.md must exist before sharding; sharding must exist before HALT checkpoints and workflow status tracking; AC-first planning and reconciliation are a pair and must be built together. The build order from ARCHITECTURE.md confirms this sequence and identifies manifest.cjs as the load-bearing new module that unblocks multiple downstream phases.

### Phase 1: Foundation Infrastructure
**Rationale:** bin/lib/manifest.cjs is the most-depended-upon new module (update.md and new-project.md both depend on it). Templates and references have zero dependencies and unblock all downstream phases. Nothing else can be built until these exist. Build these first so every subsequent phase has a stable, testable base.
**Delivers:** bin/lib/manifest.cjs (hash manifest CRUD), bin/pde-tools.cjs manifest subcommands (manifest init/check/update/verify-file), updated templates/PLAN.md (+acceptance_criteria section), new templates/RECONCILIATION.md, new references/workflow-methodology.md (BMAD/PAUL patterns in PDE terms)
**Addresses:** Project context constitution (prerequisite infrastructure), Story-file sharding (prerequisite template), AC-first planning (template change), File-hash manifest for updates (bin/lib/manifest.cjs)
**Avoids:** Context window explosion (manifest.cjs enables lean context without bloat), BMAD/PAUL terminology leakage (reference doc written in PDE-only terms)

### Phase 2: Context Infrastructure
**Rationale:** project-context.md and agent-memory directories must exist before any agent can load them. These are blocking prerequisites for all agent modifications in Phase 3. STATE.md schema extension is a low-risk additive field that belongs with context setup.
**Delivers:** .planning/project-context.md generation added to new-project.md and new-milestone.md workflows, .planning/agent-memory/ directory initialization (executor, planner, debugger, verifier subdirs with empty memories.md), STATE.md schema extension (+current_loop field: null | "plan" | "apply" | "unify")
**Addresses:** Project context constitution (primary deliverable), Sidecar agent memory (directory structure), PAUL loop tracking (current_loop field)
**Avoids:** Dual state management (all new state lives inside .planning/), Methodology bloat (project-context.md replaces ad-hoc multi-file loading, not adds to it)

### Phase 3: Agent Enhancements
**Rationale:** Agents read sidecar memory at spawn time — memory directories must pre-exist (Phase 2 prerequisite). pde-architect is a new agent that should be built alongside agent modifications for quality consistency. All four agent modifications are independent of each other and can be built in parallel within this phase.
**Delivers:** agents/pde-architect.md (new architecture review agent following PDE agent format), pde-executor.md +sidecar memory load/save (+15-20 lines additive), pde-planner.md +sidecar memory +AC format instructions (+20-25 lines additive), pde-debugger.md +sidecar memory load/save (+15-20 lines additive), pde-verifier.md +RECONCILIATION.md input loading (+10-15 lines additive)
**Addresses:** Implementation readiness gate (pde-architect agent created), AC-first planning (planner agent updated), Story-file sharding (planner agent updated), Sidecar agent memory (all four agents)
**Avoids:** Agent role namespace collision (only 1 new agent vs. BMAD's 9; 4 modifications to existing agents), Skill validation rejection (each agent processed through pde-skill-builder before merge), Context window explosion (additive context loading audited against v0.5 baseline after this phase)

### Phase 4: Workflow Modifications
**Rationale:** Workflow changes depend on updated agent definitions (Phase 3) and templates (Phase 1). plan-phase.md and execute-plan.md are the highest-risk modifications — changes to the core execution flow — and must be validated after all foundation pieces are stable. The reconciliation step in execute-plan.md is the primary PAUL pattern delivery.
**Delivers:** workflows/plan-phase.md (+AC format prompt, +story-sharding trigger at 5+ tasks, +risk tagging for high-risk task patterns), workflows/execute-plan.md (+reconciliation step between executor completion and verifier, +RECONCILIATION.md generation), references/skill-style-guide.md (+AC format standard section)
**Addresses:** Story-file sharding (plan-phase delivery), Unify/reconciliation step (execute-plan delivery), AC-first planning (plan-phase enforcement), Task boundary enforcement (plan-phase boundaries field)
**Avoids:** BMAD Scrum Master duplication (no separate SM agent; sharding is an output mode of the existing plan-phase workflow), Document sharding format conflicts (PDE *-PLAN.md format preserved; tasks/ is an optional additive output alongside PLAN.md)

### Phase 5: Update Mechanism and Readiness Gate
**Rationale:** update.md change is isolated from the execution flow changes in Phase 4 but requires manifest.cjs to be tested and stable across multiple operations first — separating it from Phase 4 reduces blast radius. The implementation readiness gate (/pde:check-readiness) is a new command that gates execute-phase; placing it last ensures it can be validated against the complete Phase 3 + 4 implementation.
**Delivers:** workflows/update.md (hash-based merge strategy; auto-overwrite unmodified files; preserve user-modified files with notice; fall back to three-way merge if manifest missing), new command /pde:check-readiness (PO-style checklist; validates PROJECT.md + REQUIREMENTS.md + PLAN.md consistency; produces PASS/CONCERNS/FAIL; blocks execute-phase on FAIL)
**Addresses:** Implementation readiness gate (primary deliverable), File-hash manifest for updates (update.md delivery)
**Avoids:** Three-way merge conflicts on framework updates (hash manifest enables silent auto-update for unmodified files), Executing incomplete or inconsistent plans (readiness gate blocks on FAIL)

### Phase Ordering Rationale

- Foundation before context: manifest.cjs enables hash tracking of new files as they are created; templates must exist before agents reference them in system prompt instructions
- Context before agents: agents read agent-memory and project-context.md at spawn; both must pre-exist or agents encounter missing file errors on first invocation
- Agents before workflows: plan-phase.md instructs pde-planner with AC format; if pde-planner.md has not been updated first, the workflow instructions have no corresponding agent behavior to activate
- Workflow modifications after all foundation: execute-plan.md is the highest-risk change; build and validate it last when all its dependencies are stable and tested
- Update mechanism last: manifest.cjs must be proven stable across Phases 1-4 before update.md depends on it for irreversible file preservation decisions

### Research Flags

Phases needing deeper planning before execution (recommend /pde:discuss before plan-phase):

- **Phase 4 (Workflow Modifications — execute-plan.md reconciliation):** The reconciliation step involves correlating git commit messages against PLAN.md task IDs. The matching heuristic is not specified in the research: when commits do not reference task IDs, what fallback logic identifies which task a commit satisfies? This needs a concrete specification (slug matching as primary, file-path overlap as fallback) before implementation begins.
- **Phase 5 (Readiness Gate — checklist content):** The PASS/CONCERNS/FAIL checklist items for /pde:check-readiness are not defined in the research. What specific conditions constitute an "incomplete or inconsistent plan"? Checklist items should be drafted as acceptance criteria during Phase 5 planning before implementation starts.

Phases with standard patterns (can skip research-phase):

- **Phase 1 (Foundation):** bin/lib/manifest.cjs is standard Node.js crypto.createHash usage. Template modifications are additive markdown changes to existing files. references/workflow-methodology.md is documentation writing. No external dependencies or novel patterns.
- **Phase 2 (Context Infrastructure):** project-context.md generation is a synthesis prompt added to existing workflow steps. Directory initialization is trivial file system setup. STATE.md schema extension is one additive field.
- **Phase 3 (Agent Enhancements):** PDE's agent format is well-documented in skill-style-guide.md. Sidecar memory loading is a standard context-prepend pattern. pde-architect follows existing agent format conventions with no novel technical requirements.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new dependencies; BMAD v6.2.0 confirmed from GitHub repo, docs.bmad-method.org, and DeepWiki technical reference; PAUL confirmed from official GitHub repo with full command reference; PDE baseline from direct codebase inspection |
| Features | HIGH | BMAD verified against official docs, DeepWiki, and buildmode.dev implementation guide; PAUL verified from official GitHub repo; integration mapping (HIGH/MEDIUM where noted) — derived analysis of both frameworks against PDE's existing capabilities |
| Architecture | HIGH | PDE architecture from direct codebase inspection (145,000+ LOC); BMAD v6 sidecar + manifest architecture from DeepWiki; PAUL architecture from official GitHub README and source analysis; build order derived from hard dependency graph with zero speculation |
| Pitfalls | HIGH | Grounded in direct PDE codebase inspection; pitfalls are first-principles architectural reasoning about system conflicts; all 10 pitfalls have specific warning signs and recovery strategies |

**Overall confidence:** HIGH

### Gaps to Address

- **Reconciliation matching heuristic (Phase 4):** ARCHITECTURE.md documents the reconciliation data flow (git log vs. PLAN.md task list) but does not specify how to correlate commit messages to task IDs when commits lack task references. Recommendation for Phase 4 planning: use task slug matching as primary heuristic, file-path overlap as fallback. Define as an acceptance criterion before implementation begins.

- **project-context.md staleness detection mechanism (Phase 2):** ARCHITECTURE.md proposes a 7-day staleness warning for project-context.md but the triggering mechanism is not specified. Define during Phase 2 planning: recommend a timestamp comparison in execute-phase pre-flight checking project-context.md mtime against PROJECT.md mtime.

- **UNIFY enforcement level — hard gate vs. soft recommendation (Phase 4):** PITFALLS.md identifies this as a binary decision with significant downstream impact on pde-tools.cjs gate logic. ARCHITECTURE.md and FEATURES.md both document it without specifying enforcement level. Recommended resolution: soft enforcement (reconciliation runs automatically in yolo mode without blocking; interactive mode prompts for review before phase advances). This preserves PDE's autonomous execution contract while implementing the PAUL discipline. Decide explicitly before Phase 4 implementation starts.

- **Sidecar memory entry quality criteria (Phase 3):** The 50-entry cap and archive mechanism are specified but the criteria for what gets written to memories.md are not. Define during Phase 3 planning: agents append only project-specific operational quirks (test configuration, environment constraints, recurring patterns) — not task completion summaries, which belong in SUMMARY.md.

## Sources

### Primary (HIGH confidence)
- BMAD-METHOD GitHub (v6.2.0, 2026-03-15) — https://github.com/bmad-code-org/BMAD-METHOD — directory structure, AGENTS.md, compilation pipeline
- BMAD Official Docs — https://docs.bmad-method.org/ — version info, module catalog, agent roster, workflow map, party mode
- BMAD Agent Technical Reference (DeepWiki) — https://deepwiki.com/bmad-code-org/BMAD-METHOD/7-agent-technical-reference — .agent.yaml schema, Zod validation, all 9 agent definitions
- BMAD Workflow Reference (DeepWiki) — https://deepwiki.com/bmad-code-org/BMAD-METHOD/8-workflow-reference — full workflow catalog, variable resolution, state persistence
- BMAD Sidecar Architecture (DeepWiki) — https://deepwiki.com/bmad-code-org/BMAD-METHOD/6.5-agent-customization-and-sidecars — hash preservation algorithm, files-manifest.csv details, hasSidecar flag
- BMAD What's New v6 (DeepWiki) — https://deepwiki.com/bmad-code-org/BMAD-METHOD/1.4-what's-new-in-v6 — sidecar system, path segregation, direct workflow invocation
- PAUL Framework GitHub — https://github.com/ChristopherKahler/paul — 26 commands, PLAN.md format, STATE.md structure, SPECIAL-FLOWS.md, config.md format
- CARL GitHub — https://github.com/ChristopherKahler/carl — rule format, activation mechanics, 14 PAUL-specific rules
- PDE codebase direct inspection (2026-03-19) — agents/, workflows/, commands/, references/, templates/, bin/pde-tools.cjs, bin/lib/*.cjs, .planning/config.json, .planning/PROJECT.md

### Secondary (MEDIUM confidence)
- BMAD Implementation Guide — https://buildmode.dev/blog/mastering-bmad-method-2025/ — four-phase lifecycle, context sharding detail, agent persona interactions
- BMAD Applied Analysis — https://bennycheung.github.io/bmad-reclaiming-control-in-ai-dev — multi-agent coordination, version control integration, quality gates
- BMAD Complete Methodology Guide — https://redreamality.com/garden/notes/bmad-method-guide/ — agent corps table, config format, workflow variants
- BMAD-AT-CLAUDE — https://github.com/24601/BMAD-AT-CLAUDE — Claude Code-specific adaptation, story file pattern, core architecture docs
- PDE EXTERNAL-FRAMEWORKS.md (.planning/research/EXTERNAL-FRAMEWORKS.md, 2026-03-17) — prior integration candidate research, Tier 1-3 classification

### Tertiary (derived analysis)
- BMAD/PAUL-to-PDE concept mapping — derived from cross-referencing official docs against direct PDE codebase inspection; high internal consistency but inferred rather than externally validated against a running system

---
*Research completed: 2026-03-19*
*Ready for roadmap: yes*
