# Feature Research

**Domain:** BMAD + PAUL methodology import into PDE (v0.6 Advanced Workflow Methodology)
**Researched:** 2026-03-19
**Confidence:** HIGH (BMAD — verified against official docs at docs.bmad-method.org, GitHub repo v6.2.0, and buildmode.dev implementation guide), HIGH (PAUL — verified against GitHub repo ChristopherKahler/paul with full command reference and architecture docs), MEDIUM (integration mapping — derived from analysis of both frameworks against PDE's existing capabilities)

---

> **Scope note:** This file covers ONLY the v0.6 methodology import milestone. PDE's existing capabilities (34 slash commands, 13-stage design pipeline, self-improvement fleet, 5 MCP integrations, planning engine, file-based `.planning/` state) are stable dependencies. Every feature described here is additive to that base — no restructuring of existing systems.

---

## Source Methodology Reference

### BMAD Method (Breakthrough Method for Agile AI-Driven Development)

- **Repo:** github.com/bmad-code-org/BMAD-METHOD (MIT, ~41k stars)
- **Version:** v6.2.0 (2026-03-15), 95k monthly npm downloads
- **Core thesis:** Multi-agent orchestration with specialized personas (Analyst, PM, Architect, PO, SM, Dev, QA) producing versioned artifacts at each phase, with token-efficient sharding for implementation
- **Architecture:** YAML agent definitions compiled to IDE-specific markdown files; step-file architecture for workflows; Party Mode for multi-persona discussion

### PAUL (Plan-Apply-Unify Loop)

- **Repo:** github.com/ChristopherKahler/paul
- **Companion:** CARL (Context Augmentation & Reinforcement Layer) — github.com/ChristopherKahler/carl
- **Core thesis:** Mandatory Plan → Apply → Unify cycle; acceptance-criteria-first tasks; loop integrity enforcement; dynamic rule loading to prevent context bloat
- **Architecture:** 26 slash commands + 14 CARL rules for Claude Code; `.paul/` directory for state; XML task structure with four required fields (files, action, verify, done)

---

## What BMAD and PAUL Provide

### BMAD Agent Personas

| Persona | Role | Key Outputs |
|---------|------|-------------|
| **Analyst** | Discovery — probing questions about users, pain points, success criteria | `product-brief.md` (10-15 pages); market analysis; user personas; competitive insights |
| **Product Manager (PM)** | Requirements — transforms brief into structured spec with MoSCoW prioritization | `PRD.md` (15-25 pages); user stories; acceptance criteria; epic breakdown |
| **Architect** | Technical design — database schema, API specs, component hierarchy, tech stack | `ARCHITECTURE.md`; `db-schema.sql`; `api_spec.json`; `tech-stack.md` |
| **Product Owner (PO)** | Validation — runs master checklists to ensure document alignment across all artifacts | Gap analysis report; document alignment confirmation |
| **Scrum Master (SM)** | Sharding — breaks PRD/architecture into atomic story files; maintains workflow status | `stories/story-NNN.md` files (each self-contained); `workflow-status.md` |
| **Developer** | Implementation — executes single story file at a time; maintains architectural alignment | Source code; unit tests; SUMMARY.md per story |
| **QA** | Verification — code review focused on security, completeness, test coverage | QA report; E2E test configurations |
| **UX Designer** | User journey — wireframes and UX specification | `UX_Design.md`; user flow diagrams |
| **BMad Master (orchestrator)** | Party Mode — routes messages to relevant personas; facilitates multi-agent discussion | Multi-perspective analysis; consensus artifacts |

### BMAD Workflow Phases

1. **Analysis & Discovery** (Analyst agent): Multi-round interviews probing business assumptions → `product-brief.md`
2. **Planning** (PM agent): Brief → PRD with functional/non-functional requirements, MVP boundaries, MoSCoW, epic breakdown
3. **Solution Design** (Architect agent): PRD → `ARCHITECTURE.md`, `db-schema.sql`, `api_spec.json`, `tech-stack.md`
4. **Validation Gate** (PO agent): Run master checklists across all documents; identify gaps; PASS required to proceed
5. **Sharding** (SM agent): PRD + Architecture → KB-sized `story-NNN.md` files; each story is self-contained with full context
6. **Iterative Implementation** (Dev agent): One story at a time; TDD optional; SM marks complete to unlock dependents
7. **QA Review** (QA agent): Per-story verification; enterprise flow adds security audit gate

### BMAD Quality Gates

- **Implementation readiness check** (`bmad-check-implementation-readiness`): PASS/CONCERNS/FAIL gate between solution design and implementation. Blocks development until architecture is complete.
- **PO master checklist**: Document alignment check — all planning artifacts must be internally consistent
- **Pre-commit checks**: Linting, formatting, unit test execution, coverage thresholds
- **Story acceptance criteria**: BDD format in each story file; Dev marks as met before SM unlocks next story

### PAUL Workflow Stages

1. **PLAN**: Define objective, acceptance criteria (BDD format), tasks with XML structure, boundaries ("DO NOT CHANGE" sections), file references via @-notation
2. **APPLY**: Execute tasks sequentially; implementation blocked until PLAN is approved; boundaries enforced
3. **UNIFY**: Mandatory reconciliation — planned vs. actual comparison; log decisions; update state; archive phase

### PAUL Quality Mechanism

- **Loop integrity**: UNIFY is non-negotiable. No plan closes without reconciliation. "No orphan plans."
- **Task structure (four required fields)**: Every task must specify `<files>`, `<action>`, `<verify>`, `<done>`. "If you can't specify all four, the task is too vague."
- **Acceptance-criteria-first**: ACs defined before tasks are written. Tasks reference specific AC numbers (AC-1, AC-2). Tasks cannot be marked done without AC verification.
- **CARL dynamic rule loading**: 14 rules that load just-in-time when in `.paul/` context; disappear when not needed. Prevents context bloat from static prompt injection.
- **Boundary enforcement**: "DO NOT CHANGE" sections in PLAN.md are immutable during APPLY. Prevents scope creep mid-execution.

### PAUL Artifact Types

| Artifact | Purpose |
|----------|---------|
| `.paul/PROJECT.md` | Project context and requirements |
| `.paul/ROADMAP.md` | Phase breakdown |
| `.paul/STATE.md` | Current loop position, decisions log, blockers |
| `.paul/SPECIAL-FLOWS.md` | Required skill declarations; blocks APPLY until confirmed loaded |
| `phases/NN-name/NN-NN-PLAN.md` | Executable plan with AC, tasks, boundaries, objectives |
| `phases/NN-name/NN-NN-SUMMARY.md` | Post-UNIFY: what was built, plan vs. actual, deferred issues |

---

## PDE Existing Capabilities (What to Avoid Rebuilding)

Before mapping features, the PDE baseline that v0.6 builds on:

```
Planning engine:     gsd:new-project → research → requirements → roadmap →
                     plan-phase → execute-phase → verify
Agent system:        12+ agent types with parallel wave orchestration
Design pipeline:     13-stage: recommend → competitive → opportunity → ideate →
                     brief → system → flows → wireframe → critique → iterate →
                     mockup → hig → handoff
State tracking:      .planning/STATE.md, PLAN.md, DESIGN-STATE.md
Verification:        pde-verifier (goal-backward + Nyquist assertions)
Self-improvement:    3-agent fleet (auditor + improver + validator)
MCP integrations:    GitHub, Linear, Jira, Figma, Pencil (5 servers)
Slash commands:      34 /pde: commands
Session continuity:  File-based .planning/ — survives session breaks
```

PDE already has: planning → execution → verification loop (PAUL's core loop exists), file-based state (`.planning/`), agent orchestration, session continuity, quality checks via verifier. The gaps are in HOW these work, not whether they exist.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that are baseline requirements for a "methodology import" milestone. Missing these means the methodology patterns were not actually imported.

| Feature | Why Expected | Complexity | PDE Integration Point |
|---------|--------------|------------|----------------------|
| **Story-file sharding for executor** | BMAD's core token-efficiency pattern. PDE executor currently receives full PLAN.md — in phases with 10+ tasks, context degrades. Sharding is the primary BMAD mechanism. Without it, BMAD methodology is not imported, just referenced. | MEDIUM | `pde-planner` emits `tasks/` directory alongside PLAN.md; each `task-NNN.md` is self-contained with AC, file refs, schema snippets; `pde-executor` loads only current task file |
| **Unify/reconciliation step after execution** | PAUL's defining feature. Without mandatory post-execution reconciliation, the PAUL loop (Plan → Apply → Unify) is truncated. The "unify" step compares planned tasks vs. actual git changes and logs deviations. PDE's `pde-verifier` checks goal achievement but does not reconcile planned tasks against actual changes. | MEDIUM | New step between `pde-executor` completion and `pde-verifier`; produces `RECONCILIATION.md`; feeds deviations into verifier as additional context |
| **Acceptance-criteria-first planning** | PAUL's "AC defined before tasks" pattern. Current PDE planner tasks describe *what to do*, not *what done looks like*. For methodology import, ACs must flow as first-class objects from planning through execution through verification — not as afterthoughts. | MEDIUM | `pde-planner` output schema adds AC section before task list; tasks reference AC-N identifiers; `pde-verifier` validates ACs directly, not just goal statements |
| **Project context constitution** | BMAD's `project-context.md` / `tech-stack.md` pattern. A single 4KB agent-optimized context document that every subagent loads as baseline. PDE has PROJECT.md (human-oriented) and CLAUDE.md (user instructions) but no agent-optimized constitutional document. Without this, story-file sharding fails — sharded tasks need a compact shared context to replace the full PLAN.md they're replacing. | LOW–MEDIUM | `.planning/project-context.md` generated from PROJECT.md + REQUIREMENTS.md + key STATE.md decisions; max 4KB enforced; every subagent spawn includes it |
| **Implementation readiness gate (pre-execution check)** | BMAD's PO validation step — explicitly checks that all planning artifacts are complete and internally consistent before execution begins. PDE has no formal gate at the plan→execute transition. Currently execution starts when a PLAN.md exists; it could start with an incomplete or inconsistent plan. | MEDIUM | New `/pde:check-readiness` command (or `pde:execute-phase` pre-flight check); runs BMAD-style checklist validating PROJECT.md + REQUIREMENTS.md + PLAN.md consistency; produces PASS/CONCERNS/FAIL |
| **Task boundary enforcement** | PAUL's "DO NOT CHANGE" sections. When a task specifies protected file sections, the executor must not modify them. Currently no mechanism prevents the executor from touching files outside a task's scope. | LOW | PLAN.md task schema adds optional `<boundaries>` field listing protected paths/sections; `pde-executor` reads and enforces in prompt |

### Differentiators (Competitive Advantage)

Features that go beyond the minimum methodology import and give PDE a genuine advantage. These are where BMAD + PAUL patterns combine with PDE's unique architecture.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Analyst-persona-informed discovery** | BMAD's Analyst is the only persona PDE genuinely lacks in its planning engine. PDE's `gsd:new-project` does research and requirements — but not the multi-round probing interview pattern that surfaces unspoken assumptions. Adding an Analyst agent to the pre-planning phase produces better product briefs with validated business assumptions, not just feature lists. | MEDIUM | New `/pde:discover` command (or enhance `pde:discuss-phase`); Analyst persona spawned during `gsd:new-project` research phase; produces `product-brief.md` alongside existing `PROJECT.md`; feeds into brief skill |
| **Sidecar agent memory (cross-session learning)** | BMAD's sidecar pattern enables per-agent-type persistent memory across sessions. PDE agents are fully ephemeral — the executor forgets what worked last phase, the debugger forgets recurring patterns. Project-scoped sidecars let agents accumulate knowledge specific to the project being built. This is a meaningful quality improvement over multiple milestones. | MEDIUM | `.planning/agent-memory/{agent-type}/memories.md`; included in agent spawn context; appended after completion; 50-entry cap with archive |
| **Party Mode: multi-persona design critique** | BMAD's Party Mode — multiple agent personas in one session for structured discussion. PDE's `/pde:discuss-phase` uses a single questioning agent. Multi-persona critique (Architect + PM + QA simultaneously) during complex phase scoping surfaces conflicts earlier and prevents the most common planning rework: "we built the right thing wrong." | MEDIUM-HIGH | Orchestrator-driven; `pde:discuss-phase` gains a `--party` flag; BMad Master pattern selects 2-3 relevant personas per message; produces multi-perspective analysis artifact |
| **HALT checkpoints for high-risk tasks** | BMAD's mandatory human-approval gate for high-risk execution steps. PDE's executor has advisory checkpoints but no mandatory pause. For tasks touching authentication, database migrations, destructive refactors, or CI/CD — explicit approval prevents irreversible changes. This is a safety differentiator for production use. | LOW–MEDIUM | `pde-planner` tags tasks with `risk: high` based on file patterns (`**/migrations/**`, `**/auth/**`, `**/.github/**`); executor pauses before/after, presents summary, waits for confirmation |
| **File-hash manifest for safe updates** | BMAD's hash-based update safety mechanism. PDE's `pde:update` uses three-way merge which occasionally produces conflicts requiring manual resolution. SHA256 manifest tracks which files the user has modified — framework files users haven't touched get silent updates; modified files get preserved with a conflict notice. Strictly better than the current merge approach. | LOW–MEDIUM | `.planning/config/files-manifest.csv` with `path, sha256, source (stock\|user-modified), last_updated`; generated on install/update; `pde-sync-engine` consults manifest before overwriting |
| **Workflow status tracking with story-level granularity** | BMAD's `workflow-status.md` — per-story TODO/IN_PROGRESS/DONE tracking. PDE's `STATE.md` tracks phase-level status. Story-level granularity is meaningful for longer phases (10+ tasks), giving users visibility into mid-phase progress without waiting for full phase verification. | LOW | `pde-executor` updates story status in `tasks/workflow-status.md` as each task completes; surface in `/pde:status` output |
| **PAUL-style session handoff documents** | PAUL's `/paul:handoff` command — comprehensive context document for resuming work after breaks. PDE's session continuity relies on the user re-reading STATE.md and PLAN.md, which requires orientation effort. An auto-generated handoff document is particularly valuable for PDE's design pipeline where sessions can span days. | LOW | `/pde:handoff-session` command (or add `--handoff` flag to `pde:execute-phase`); generates `.planning/HANDOFF.md` with current position, last action, next step, blockers |
| **Pre-planning assumptions capture** | PAUL's `/paul:assumptions` — Claude states its intended approach before planning begins, allowing users to correct direction-setting assumptions. Currently PDE planning begins execution without surfacing its implicit assumptions. Catching a wrong assumption before a PLAN.md is written saves a full planning iteration. | LOW | `/pde:assumptions` command run before `pde:plan-phase`; planner agent lists its key assumptions about the task; user confirms or corrects before full plan is generated |

### Anti-Features (Commonly Requested, Often Problematic)

Features from BMAD/PAUL that seem like obvious imports but conflict with PDE's architecture or philosophy.

| Feature | Why Requested | Why It Conflicts With PDE | Alternative |
|---------|---------------|--------------------------|-------------|
| **Direct BMAD persona installation (import BMAD agents as PDE agents)** | BMAD v6 has a compilation pipeline that produces IDE-specific agent files. Importing them directly means getting 12+ battle-tested agent personas "for free." | BMAD agents are written for human-directed sequential workflows. PDE agents are written for autonomous parallel orchestration. BMAD's PM agent expects a human to decide when to invoke it; PDE's equivalent must be invoked programmatically by an orchestrator. Importing BMAD agents verbatim produces agents that pause for human input at wrong points in PDE's automated pipeline, breaking the orchestration model. | Extract BMAD's *patterns* (persona specialization, artifact definitions, AC structure) and implement them natively in PDE's agent format. Do not import BMAD agent files. |
| **PAUL's in-session-over-subagents philosophy** | PAUL explicitly prefers in-session implementation over spawning subagents ("subagents cost 2,000–3,000 tokens to spawn, start without context, need result integration"). This is coherent advice for PAUL's lightweight use case. | PDE's entire architecture is built on parallel subagent waves. The self-improvement fleet, design pipeline, and planning engine all depend on specialized subagents. Adopting PAUL's "keep it in-session" philosophy would require abandoning parallel execution and the context isolation that prevents cross-task contamination. PDE's tool search + scoped context loading already solves the cost problem PAUL is trying to solve with in-session work. | Keep parallel subagent architecture. Adopt PAUL's story-file sharding to give each subagent a focused context package. This is a better fit for PDE than PAUL's workaround. |
| **PAUL's .paul/ directory as separate state tree** | PAUL manages its own `.paul/` directory parallel to `.planning/`. Importing PAUL could mean adopting this structure. | PDE's entire platform is organized around `.planning/`. CLAUDE.md references `.planning/`. All 34 slash commands read/write `.planning/`. All MCP integrations sync to/from `.planning/`. A parallel `.paul/` directory creates two sources of truth for project state. State synchronization between them would require a bridge layer that adds complexity without value. | Implement PAUL's state patterns (ROADMAP.md, STATE.md, phase directories, PLAN.md, SUMMARY.md) inside PDE's existing `.planning/` structure, which already uses most of these patterns. |
| **CARL just-in-time rule unloading** | CARL not only loads domain rules when relevant but also *unloads* them when not applicable, keeping active context lean. This is a genuine optimization for context window management. | PDE's skill injection system deduplicates (inject once per session) and uses Tool Search for MCP tool lazy-loading. Implementing true rule *unloading* requires session-aware context lifecycle management — tracking which rules were injected and removing them when the context shifts. This is a large scope change to the hook system with uncertain payoff in Claude Code's session model. | Improve deduplication in the existing skill injection system. Ensure skills inject only once and don't re-inject on every subagent spawn. Full CARL-style unloading deferred to future milestone. |
| **BMAD web bundle compilation** | BMAD compiles agents for multiple IDEs (Cursor, Windsurf, VS Code, ChatGPT) via a YAML → Markdown build pipeline. Importing this could modernize PDE's agent definition format. | PDE agents are plain markdown files that work directly in Claude Code. The build pipeline BMAD uses exists to compile YAML to IDE-specific formats — PDE already has its target format. Adopting BMAD's compilation pipeline adds a build step, a YAML authoring format, and a compilation dependency for a problem PDE doesn't have. | Keep PDE's direct markdown agent format. Borrow BMAD's YAML-defined *structure* for agents (persona, dependencies, workflows, startup instructions) as a documentation convention, not a build system. |
| **Story-points and sprint ceremonies** | PAUL explicitly rejects these: "No sprint ceremonies. No story points. No enterprise theater." But BMAD includes SM sprint planning and retrospective workflows. Importing both could create a hybrid with formal sprint structure. | PDE's milestone model (phase-based, not sprint-based) already has a simpler cadence that works well for solo and small-team AI-assisted development. Sprint ceremonies add overhead that doesn't map to PDE's execution model (phases complete when done, not on a two-week cadence). | Keep PDE's phase/milestone model. Import BMAD's retrospective *pattern* as a lightweight post-milestone review (already exists as `.planning/RETROSPECTIVE.md`). |

---

## Feature Dependencies

```
[Project Context Constitution]
    └──required-by──> [Story-File Sharding] (sharded tasks need compact shared context)
    └──required-by──> [Acceptance-Criteria-First Planning] (AC reference needs project constraints)
    └──required-by──> [Implementation Readiness Gate] (checklist needs authoritative project facts)

[Story-File Sharding]
    └──required-by──> [HALT Checkpoints] (risk tagging lives in task files, not PLAN.md)
    └──required-by──> [Workflow Status Tracking] (per-story tracking needs story files to exist)
    └──enhances──> [Sidecar Agent Memory] (smaller context per task = sidecar content is proportionally more valuable)

[Acceptance-Criteria-First Planning]
    └──required-by──> [Unify/Reconciliation Step] (reconciliation compares ACs against actual changes)
    └──enhances──> [Implementation Readiness Gate] (gate validates ACs are well-formed before execution)

[Implementation Readiness Gate]
    └──depends-on──> [Acceptance-Criteria-First Planning] (gate checks AC quality)
    └──depends-on──> [Project Context Constitution] (gate validates consistency against project facts)
    └──gates──> [Story-File Sharding] (don't shard until plan passes readiness check)

[Unify/Reconciliation Step]
    └──depends-on──> [Story-File Sharding] (reconciliation compares task files vs. actual changes)
    └──depends-on──> [Acceptance-Criteria-First Planning] (reconciliation reports AC satisfaction)
    └──enhances──> [EXISTING: pde-verifier] (feeds deviation report into existing goal-backward check)

[Analyst-Persona Discovery]
    └──enhances──> [EXISTING: gsd:new-project] (deeper brief generation)
    └──enhances──> [EXISTING: /pde:brief] (brief seeded with analyst output)
    └──enhances──> [Project Context Constitution] (analyst output informs project-context.md generation)

[Sidecar Agent Memory]
    └──depends-on──> [Story-File Sharding] (most valuable when tasks are granular)
    └──enhances──> [EXISTING: pde-executor] (executor remembers project-specific quirks)
    └──enhances──> [EXISTING: pde-debugger] (debugger remembers past bug patterns)
    └──enhances──> [EXISTING: pde-verifier] (verifier remembers what verification strategies work)

[PAUL Session Handoff]
    └──enhances──> [EXISTING: STATE.md session continuity]
    └──standalone (no dependencies on other new features)

[HALT Checkpoints]
    └──depends-on──> [Story-File Sharding] (risk tags live in task files)
    └──standalone otherwise

[File-Hash Manifest]
    └──enhances──> [EXISTING: pde:update / pde-sync-engine]
    └──standalone (no dependencies on other new features)

[Party Mode]
    └──enhances──> [EXISTING: pde:discuss-phase]
    └──standalone (no dependencies on other new features)
    └──conflicts-with──> [PAUL in-session philosophy] (multi-agent IS the pattern; don't adopt PAUL's anti-subagent bias here)
```

### Dependency Notes

- **Project Context Constitution must come first:** Story-file sharding fails without a compact shared context to replace the full PLAN.md that sharded tasks are replacing. If executors get only a task file and nothing else, they lack architectural context. The project-context.md is the bridge.

- **Story-file sharding is the load-bearing change:** Five other features depend on tasks being in individual files. Build this before HALT checkpoints, workflow status tracking, and sidecar memory — all of which add metadata or behavior to individual task files.

- **Acceptance-criteria-first planning and unify are a pair:** Reconciliation only works if there are formal ACs to check against. Implementing unify without AC-first planning produces a reconciliation step that compares "vague task descriptions" against actual changes — low signal. Implement them together.

- **Analyst persona is additive, not blocking:** No other feature depends on the Analyst persona. It enhances quality of inputs to planning but doesn't change the architecture of any other feature. Safe to defer.

- **Sidecar memory and file-hash manifest are both standalone:** Neither depends on story-file sharding or AC-first planning. They can be built in any order and don't require the other new features to work. Good candidates for later phases in the milestone if scope is tight.

---

## MVP Definition (for v0.6 Milestone)

### Launch With (v0.6 core — minimum to satisfy "methodology import")

These features are what makes this a methodology import rather than a documentation update.

- [ ] **Project context constitution** — generates `.planning/project-context.md`; auto-updated from PROJECT.md + REQUIREMENTS.md; max 4KB; every subagent receives it. Foundation all other features depend on.
- [ ] **Story-file sharding** — `pde-planner` emits `tasks/` directory; `pde-executor` loads one task file at a time; each task file is self-contained with AC references, file paths, relevant schema. The single highest-impact BMAD pattern.
- [ ] **Acceptance-criteria-first planning** — planner output schema adds AC section; tasks reference AC-N; verifier validates ACs directly. Enables reconciliation. Cannot defer if unify is in scope.
- [ ] **Unify/reconciliation step** — mandatory post-execution step comparing planned tasks vs. actual git changes; produces `RECONCILIATION.md`; feeds into pde-verifier. The single highest-impact PAUL pattern.
- [ ] **Implementation readiness gate** — `/pde:check-readiness` runs PO-style checklist before execution begins; produces PASS/CONCERNS/FAIL; blocks `pde:execute-phase` on FAIL.

### Add After Validation (v0.6.x — extend once core is stable)

- [ ] **Task boundary enforcement** — adds `<boundaries>` field to task schema; executor enforces DO NOT CHANGE sections. Add when story-file sharding is working and users report scope drift.
- [ ] **HALT checkpoints for high-risk tasks** — planner tags `risk: high` tasks; executor pauses for confirmation. Add when users report irreversible execution mistakes.
- [ ] **Workflow status tracking** — per-story TODO/IN_PROGRESS/DONE in `tasks/workflow-status.md`. Add when users report difficulty tracking mid-phase progress.
- [ ] **PAUL session handoff documents** — `/pde:handoff-session` generates `.planning/HANDOFF.md`. Add when users report friction resuming work after breaks.
- [ ] **Pre-planning assumptions capture** — `/pde:assumptions` surfaces planner's intended approach before plan generation. Add when planning rework is reported due to wrong assumptions.

### Future Consideration (v0.7+)

- [ ] **Analyst-persona discovery** — `/pde:discover` command with multi-round probing interview pattern. High value but no dependency blocking it; defer until core methodology is settled.
- [ ] **Sidecar agent memory** — per-agent-type persistent memory across sessions. Moderate complexity; most valuable after users have run 3+ milestones on a project (when memory pays off).
- [ ] **File-hash manifest for updates** — replaces three-way merge in `pde:update`. Valuable but pde:update has been working; defer until a user reports a conflict that hash manifest would have prevented.
- [ ] **Party Mode for phase discussions** — multi-persona critique during `/pde:discuss-phase`. High complexity; exploratory; good v0.7 candidate after methodology stabilizes.
- [ ] **CARL-style rule unloading** — context lifecycle management for skill injections. Large scope change; uncertain payoff in Claude Code's session model; deep future.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Project context constitution | HIGH — unlocks all sharding features | LOW | P1 |
| Story-file sharding | HIGH — primary BMAD pattern; 90% token savings | MEDIUM | P1 |
| Acceptance-criteria-first planning | HIGH — required for reconciliation; improves plan quality | MEDIUM | P1 |
| Unify/reconciliation step | HIGH — primary PAUL pattern; catches plan-vs-actual drift | MEDIUM | P1 |
| Implementation readiness gate | HIGH — prevents executing incomplete/inconsistent plans | MEDIUM | P1 |
| Task boundary enforcement | MEDIUM — prevents scope creep during execution | LOW | P2 |
| HALT checkpoints | MEDIUM — safety for high-risk tasks | LOW–MEDIUM | P2 |
| Workflow status tracking | MEDIUM — mid-phase visibility | LOW | P2 |
| PAUL session handoff | MEDIUM — reduces friction on session resume | LOW | P2 |
| Pre-planning assumptions capture | MEDIUM — prevents planning rework | LOW | P2 |
| Analyst-persona discovery | HIGH — better project briefs | MEDIUM | P3 |
| Sidecar agent memory | MEDIUM — cross-session learning | MEDIUM | P3 |
| File-hash manifest | MEDIUM — cleaner updates | LOW–MEDIUM | P3 |
| Party Mode | MEDIUM — multi-perspective critique | MEDIUM-HIGH | P3 |

**Priority key:**
- P1: Must have for v0.6 milestone to close ("methodology import" claim requires these)
- P2: Include if implementation time permits; strong v0.6.x candidates
- P3: Future milestone (v0.7+)

---

## Methodology Comparison Matrix

| Capability | PDE Current (v0.5) | BMAD Pattern | PAUL Pattern | v0.6 Recommendation |
|-----------|---------------------|--------------|--------------|---------------------|
| Planning granularity | Phase → PLAN.md → Tasks (prose list) | Phase → Stories (atomic self-contained files) | Phase → PLAN.md with XML task structure + ACs | Adopt story-file sharding; add AC-first schema |
| Agent specialization | Generic executor/planner/verifier | 9 specialized personas (Analyst → QA) | None (single "AI-assisted developer") | Add Analyst persona for discovery; keep generic executor (PDE strength) |
| Execution model | Autonomous parallel subagents | Human-sequential with HALT gates | Human-sequential; in-session preferred | Keep autonomous; add HALT for high-risk only |
| Verification | Goal-backward Nyquist assertions | QA agent per story + PO master checklist | UNIFY plan-vs-actual reconciliation | Keep Nyquist; add reconciliation step before existing verifier |
| State persistence | STATE.md + git (phase-level) | Sidecar + frontmatter + hash manifest | STATE.md (loop position, decisions log) | Add story-level workflow-status.md; add project-context.md |
| Context management | Skill injection + dedup | Story sharding + JIT loading | CARL rule loading | Adopt sharding; defer rule unloading |
| Cross-session memory | File-based auto-memory | Agent sidecars (per agent type) | Session-scoped only | Add agent sidecars in v0.6.x |
| Multi-perspective design | Single questioning agent | Party Mode (BMad Master orchestrates) | Not applicable | Add Party Mode in v0.7 |
| Update safety | Three-way merge | Hash manifest | Not applicable | Add hash manifest in v0.6.x |
| Pre-execution validation | None (plan → execute immediately) | Implementation readiness gate (PASS/FAIL) | Assumptions capture before planning | Add readiness gate (BMAD pattern); add assumptions capture (PAUL pattern) |

---

## Sources

- **BMAD Method GitHub** (HIGH confidence): https://github.com/bmad-code-org/BMAD-METHOD — architecture, compilation pipeline, agent list
- **BMAD Official Docs** (HIGH confidence): https://docs.bmad-method.org/ — workflow map, party mode
- **BMAD Workflow Map** (HIGH confidence): https://docs.bmad-method.org/reference/workflow-map/ — complete workflow sequence with commands, agents, artifacts
- **BMAD Implementation Guide** (HIGH confidence): https://buildmode.dev/blog/mastering-bmad-method-2025/ — agent persona details, workflow phases, artifact specs, quality gates
- **BMAD Applied Analysis** (HIGH confidence): https://bennycheung.github.io/bmad-reclaiming-control-in-ai-dev — multi-agent coordination, version control integration, quality gates
- **BMAD Method Guide** (HIGH confidence): https://redreamality.com/garden/notes/bmad-method-guide/ — complete 4-phase workflow, artifact table by phase, quality gate details
- **BMAD Party Mode** (HIGH confidence): https://docs.bmad-method.org/explanation/party-mode/ — BMad Master orchestration, agent collaboration, use cases
- **PAUL Framework GitHub** (HIGH confidence): https://github.com/ChristopherKahler/paul — full command reference (26 commands), task XML structure, STATE.md format, CARL system, philosophy
- **CARL GitHub** (HIGH confidence): https://github.com/ChristopherKahler/carl — 14 rules, just-in-time loading mechanism
- **PDE EXTERNAL-FRAMEWORKS.md** (HIGH confidence): `.planning/research/EXTERNAL-FRAMEWORKS.md` — prior PDE research from 2026-03-17 with integration candidates and comparison matrix

---

*Feature research for: PDE v0.6 — BMAD + PAUL Methodology Import*
*Researched: 2026-03-19*
