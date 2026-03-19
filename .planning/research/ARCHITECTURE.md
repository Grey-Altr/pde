# Architecture Research: BMAD + PAUL Integration into PDE v0.6

**Domain:** Agentic workflow methodology integration — Claude Code plugin
**Researched:** 2026-03-19
**Confidence:** HIGH (PDE architecture via direct codebase inspection; BMAD v6 via official docs + DeepWiki; PAUL via GitHub repo fetch + official docs)

---

## Focus

This document answers the v0.6 architecture question: how do BMAD and PAUL methodology patterns integrate into PDE's existing skills/workflows/agents/templates architecture? It maps every BMAD/PAUL concept to its PDE equivalent, identifies what is new versus modified, documents data flows, and proposes a dependency-ordered build sequence.

The prior ARCHITECTURE.md (v0.5 MCP Integrations) remains the reference for MCP bridge infrastructure — that layer is now stable and unchanged. Everything here is about workflow methodology and context engineering.

---

## Source Framework Analysis

### BMAD v6 Core Concepts

BMAD (Breakthrough Method for Agile AI-Driven Development) is a compile-time persona framework with a runtime story-sharding execution model. Key components:

| BMAD Concept | BMAD Implementation | What It Does |
|---|---|---|
| Agent definitions | Markdown files in `_bmad/agents/` with YAML frontmatter | Persona, constraints, skills, startup instructions per specialist role |
| Sidecar memory | `_bmad/_memory/{agent-name}-sidecar/memories.md` | Persistent per-agent memory across sessions; hash-preserved on update |
| Story files | Atomic `story-NNN.md` files with YAML frontmatter + acceptance criteria | Context-bounded task units; each story is self-contained for a dev agent |
| File-hash manifest | `_config/files-manifest.csv` with SHA256 per managed file | Detects user modifications; safe framework updates; `user-modified` vs `stock` |
| Workflow orchestration | `workflow-*.md` slash-command files calling agents sequentially | Analyst → PM → Architect → PO → SM → Dev → QA, human-gated hand-offs |
| Compilation pipeline | `npx bmad-method build` — YAML defs → Zod validation → deep merge → `.md` output | Produces consumable agent files per IDE from source YAML/Markdown |
| Story sharding | PO executes shard task; decomposes epic → `stories/` directory | Each story: `<objective>`, `<context>`, `<acceptance_criteria>`, `<tasks>` |

BMAD's key distinction from PDE: BMAD trusts the human to sequence agents. PDE automates sequencing. BMAD produces static persona files at compile time; PDE spawns subagents dynamically at runtime.

### PAUL Framework Core Concepts

PAUL (Plan-Apply-Unify Loop) is a session-discipline framework with just-in-time rule injection via CARL:

| PAUL Concept | PAUL Implementation | What It Does |
|---|---|---|
| Plan-Apply-Unify cycle | Three mandatory loop phases enforced by CARL rules | Defines → executes → reconciles work; prevents orphaned plans |
| State directory | `.paul/STATE.md` with loop position markers | Tracks PLAN/APPLY/UNIFY position + session continuity + decisions |
| Reconciliation (Unify) | `SUMMARY.md` comparing PLAN.md tasks vs actual git changes | Surfaces plan drift; records decisions; closes loops |
| AC-first planning | Tasks defined by BDD `given/when/then` acceptance criteria | Execution measured against explicit criteria, not vague descriptions |
| CARL rule injection | 14 domain rules loaded contextually by trigger pattern | Loop enforcement, boundary protection, state consistency, skill blocking |
| Phase structure | `.paul/phases/NN-name/NN-NN-PLAN.md` + `NN-NN-SUMMARY.md` | Matches PDE's `.planning/phases/` structure almost exactly |

PAUL's key distinction from PDE: PAUL is session-scoped (no cross-session memory). PDE has full cross-session state. PAUL requires human loop closure; PDE automates UNIFY via pde-verifier + SUMMARY.md generation.

---

## Existing PDE Architecture (Baseline for v0.6)

```
┌───────────────────────────────────────────────────────────────────────┐
│                        User (Claude Code session)                      │
├───────────────────────────────────────────────────────────────────────┤
│  /pde: skills (commands/*.md)   →   workflows/*.md                     │
│  agents/*.md (via Task/Skill)   →   bin/pde-tools.cjs subcommands     │
├───────────────────────────────────────────────────────────────────────┤
│  .planning/ (file-based state)                                         │
│   STATE.md  ROADMAP.md  REQUIREMENTS.md  config.json                  │
│   design/   phases/     milestones/      mcp-connections.json         │
├───────────────────────────────────────────────────────────────────────┤
│  references/  (mcp-integration.md, skill-style-guide.md, ...)         │
│  templates/   (design-manifest.json, config.json, ...)                │
│  bin/lib/     (config.cjs, design.cjs, state.cjs, roadmap.cjs, ...)   │
│  bin/lib/mcp-bridge.cjs  bin/lib/mcp-config.cjs  (from v0.5)         │
└───────────────────────────────────────────────────────────────────────┘
```

Key constraints v0.6 must respect:
- Zero new npm dependencies at plugin root.
- `.planning/` is the single source of truth. No new state directories parallel to it.
- All skill commands keep their existing anatomy (7 sections, standard flags).
- agent/*.md format is stable and enforced by pde-quality-auditor.
- Protected-files.json is immutable.
- Architecture restructuring is explicitly out of scope (PROJECT.md constraint).

---

## Concept Mapping: BMAD/PAUL → PDE

This is the central architectural table. Every BMAD/PAUL pattern maps to an existing PDE concept or a new addition.

### Agent Role System

| BMAD/PAUL Role | Description | PDE Equivalent | Mapping Type |
|---|---|---|---|
| BMAD Analyst | Research, project briefs, competitive context | Handled by `/pde:recommend`, `/pde:competitive`, `/pde:ideate` skills | Behavior exists in skills, not a dedicated agent |
| BMAD Product Manager | PRD creation, epic planning | `/pde:brief` + REQUIREMENTS.md workflow | Behavior in skill |
| BMAD Architect | System design, implementation readiness review | No dedicated PDE agent yet | **NEW: `pde-architect` agent** |
| BMAD Scrum Master | Story creation, sprint planning, retrospectives | `pde-planner` (plan decomposition) + `pde-verifier` | Planner handles decomposition; verifier handles retrospective |
| BMAD Developer | Feature implementation | `pde-executor` | Exists |
| BMAD QA Engineer | Test automation, quality gates | `pde-verifier` + Nyquist validation | Exists (dual-mode: Nyquist on code, goal-backward on spec) |
| BMAD UX Designer | User experience design | Entire 13-stage design pipeline + all design agents | Exceeds BMAD's UX scope |
| PAUL Planner | AC-first plan authoring | `pde-planner` | Exists — AC format enhancement needed |
| PAUL Unifier | Plan-vs-actual reconciliation | Missing from PDE | **NEW: reconciliation step in execute-plan workflow** |

**Key finding:** PDE has more design coverage than BMAD but is missing two things BMAD has: (1) a dedicated architect agent for structured system design review before execution phases, and (2) AC-first formatting discipline in planner output. PAUL's Unify step has no PDE equivalent — PDE's `pde-verifier` does goal-backward analysis, not plan-delta analysis.

### Template Structures

| BMAD/PAUL Template | What It Contains | PDE Equivalent | Mapping Type |
|---|---|---|---|
| BMAD story file | YAML frontmatter + `<objective>` + `<context>` + `<acceptance_criteria>` (BDD) + `<tasks>` + `<boundaries>` | PDE PLAN.md (similar structure; lacks explicit AC section) | **MODIFY: add AC frontmatter to PLAN.md template** |
| BMAD sidecar `memories.md` | Persistent agent memory across sessions | No equivalent — PDE agents are stateless | **NEW: `.planning/agent-memory/` directory** |
| BMAD sidecar `instructions.md` | Agent-specific operational overrides | Embedded in each agent/*.md file | Not needed — PDE agent files serve this purpose already |
| BMAD `files-manifest.csv` | SHA256 per file, source classification | No equivalent | **NEW: `bin/lib/manifest.cjs` + `.planning/config/files-manifest.csv`** |
| PAUL `STATE.md` (loop position) | PLAN/APPLY/UNIFY markers | PDE STATE.md has milestone/phase tracking but not loop-position markers | **MODIFY: add `current_loop` field to STATE.md** |
| PAUL PLAN.md (AC-first) | BDD acceptance criteria as primary contract | PDE PLAN.md has objective + tasks; no AC section | **MODIFY: PLAN.md template adds `<acceptance_criteria>` section** |
| PAUL RECONCILIATION.md | Plan-vs-actual delta analysis | No equivalent | **NEW: generated by reconciliation step after pde-executor** |
| PAUL CARL rules | 14 domain-specific rules | PDE references/*.md (loaded via @ includes) | Pattern matches — CARL rules are just reference files per context |
| BMAD project context | `project-context.md` agent-optimized constitution | PDE has PROJECT.md + STATE.md but no agent-optimized synthesis | **NEW: `.planning/project-context.md` auto-generated synthesis** |

### Workflow Orchestration

| BMAD/PAUL Pattern | BMAD/PAUL Behavior | PDE Current Behavior | Gap |
|---|---|---|---|
| Human-gated hand-offs | Human approves each agent hand-off | PDE mode=interactive approximates this; mode=yolo skips gates | No gap — already configurable |
| HALT checkpoints for high-risk | Tasks tagged `risk: high` pause for explicit approval | No risk-based task tagging in planner output | **NEW: risk metadata in PLAN.md tasks** |
| Story sharding | PO decomposes epic into atomic story files in `stories/` | `pde-planner` emits a single PLAN.md per plan | **NEW: story-file sharding in planner output (optional, threshold-gated)** |
| PAUL unify closure | Mandatory UNIFY after every APPLY | `pde-verifier` runs post-execution but compares to spec, not to plan | **NEW: reconciliation step between executor completion and verifier** |
| AC-first planning | Every task has BDD ACs as primary contract | Tasks describe what-to-do, not what-done-looks-like | **MODIFY: planner prompted to emit ACs; PLAN.md template updated** |
| Party mode | Multiple agent personas in parallel (Architect + PM + QA) | `pde:discuss-phase` uses single questioning agent | **DEFERRED** (Large scope; not in v0.6 MVP) |
| CARL JIT rule unloading | Rules unloaded when no longer relevant | PDE injects skills once per session, never removes | **DEFERRED** (Requires session-aware context lifecycle; large scope) |

### State Management

| BMAD/PAUL State | Location | PDE Equivalent | Mapping Type |
|---|---|---|---|
| BMAD sidecar `memories.md` | `_bmad/_memory/{agent}/memories.md` | None — agents are stateless | **NEW: `.planning/agent-memory/{agent-type}/memories.md`** |
| BMAD `files-manifest.csv` | `_config/files-manifest.csv` with SHA256 + source flag | None | **NEW: `.planning/config/files-manifest.csv`** |
| PAUL `STATE.md` loop markers | `.paul/STATE.md` PLAN/APPLY/UNIFY position | PDE `.planning/STATE.md` (milestone/phase tracking) | **MODIFY: add `current_loop` field** |
| BMAD `project-context.md` | Max 4KB agent-optimized constitution | PROJECT.md (not agent-optimized; no length constraint) | **NEW: `.planning/project-context.md`** |

---

## System Overview: v0.6 Additions

```
┌───────────────────────────────────────────────────────────────────────┐
│                        User (Claude Code session)                      │
├───────────────────────────────────────────────────────────────────────┤
│  /pde: skills (existing)       │  NEW: /pde:context, /pde:reconcile   │
│  workflows/*.md (existing)     │  NEW: workflows/reconcile.md         │
├───────────────────────────────────────────────────────────────────────┤
│  NEW: Methodology Layer                                                │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │  agents/pde-architect.md          (NEW — architecture review) │     │
│  │  workflows/execute-plan.md        (MODIFIED — +reconciliation) │    │
│  │  workflows/plan-phase.md          (MODIFIED — +AC format)     │     │
│  │  templates/PLAN.md                (MODIFIED — +AC section)    │     │
│  │  bin/lib/manifest.cjs             (NEW — hash manifest CRUD)  │     │
│  │  bin/pde-tools.cjs manifest cmds  (MODIFIED — +manifest cmds) │     │
│  └──────────────────────────────────────────────────────────────┘     │
├───────────────────────────────────────────────────────────────────────┤
│  .planning/ (extended, not restructured)                               │
│   STATE.md (+current_loop field)                                       │
│   project-context.md              (NEW — agent-optimized synthesis)    │
│   config/files-manifest.csv       (NEW — hash manifest)               │
│   agent-memory/                   (NEW — per-agent sidecar memory)    │
│     pde-executor/memories.md                                           │
│     pde-planner/memories.md                                            │
│     pde-debugger/memories.md                                           │
│     pde-verifier/memories.md                                           │
│   phases/XX-name/                 (extended — story files optional)   │
│     XX-NN-PLAN.md                 (+acceptance_criteria section)       │
│     XX-NN-RECONCILIATION.md       (NEW — generated post-execution)     │
│     tasks/                        (NEW — optional story-file sharding) │
│       task-001-{slug}.md                                               │
│       task-002-{slug}.md                                               │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

### New Components (v0.6 — build these)

| Component | Responsibility | Location | Blocked On |
|---|---|---|---|
| `agents/pde-architect.md` | Architecture review agent: evaluates plans for structural risks, ADR recommendations, component boundary analysis | `agents/pde-architect.md` | Nothing (new file) |
| `bin/lib/manifest.cjs` | Hash manifest CRUD: SHA256 per tracked file, source classification (stock/user-modified), update-safe preservation logic | `bin/lib/manifest.cjs` | Nothing (new CJS module) |
| `.planning/project-context.md` | Agent-optimized synthesis of PROJECT.md + REQUIREMENTS.md + key decisions; max 4KB; auto-generated; loaded by every subagent | `.planning/project-context.md` | `manifest.cjs` (for hash tracking) |
| `.planning/agent-memory/` | Per-agent sidecar memory directories; `memories.md` per agent type; project-scoped; preserved across sessions | `.planning/agent-memory/{agent-type}/` | Nothing (new directory structure) |
| `.planning/config/files-manifest.csv` | SHA256 per PDE file; source flag (stock/user-modified); enables safe update merging without three-way merge | `.planning/config/files-manifest.csv` | `manifest.cjs` |
| `templates/PLAN.md` | PLAN.md template with added `<acceptance_criteria>` section | `templates/PLAN.md` | Nothing (template modification) |
| `templates/RECONCILIATION.md` | RECONCILIATION.md template comparing planned tasks to actual git changes | `templates/RECONCILIATION.md` | Nothing (new template) |
| `references/workflow-methodology.md` | BMAD/PAUL patterns as PDE reference: AC format guide, story sharding rules, reconciliation step spec, risk tagging criteria | `references/workflow-methodology.md` | Nothing (new reference) |

### Modified Components (v0.6 — surgical changes)

| Component | Change | Risk | Lines Affected |
|---|---|---|---|
| `workflows/execute-plan.md` | Add reconciliation step between executor completion and verifier invocation; reads PLAN.md task list, diffs against git commits, writes RECONCILIATION.md | MEDIUM — changes execute-plan flow; must not break existing path | +50-70 lines |
| `workflows/plan-phase.md` | Prompt pde-planner to emit `<acceptance_criteria>` section; add story-file sharding trigger (when plan has 5+ tasks); add risk tagging for high-risk tasks | LOW — additive instructions to planner | +30-40 lines |
| `bin/pde-tools.cjs` | Add `manifest` subcommand group: `manifest init`, `manifest check`, `manifest update`, `manifest verify-file` | LOW — additive subcommand group | +30-40 lines |
| `agents/pde-executor.md` | Add sidecar memory loading: read `.planning/agent-memory/pde-executor/memories.md` at start; append findings at completion | LOW — additive context loading | +15-20 lines |
| `agents/pde-planner.md` | Add sidecar memory loading: read/write `.planning/agent-memory/pde-planner/memories.md`; emit AC-first task format | LOW — additive; no change to core planning logic | +20-25 lines |
| `agents/pde-debugger.md` | Add sidecar memory loading: read `.planning/agent-memory/pde-debugger/memories.md` at start; append bug patterns at completion | LOW — additive context | +15-20 lines |
| `agents/pde-verifier.md` | Load RECONCILIATION.md as additional context when available; compare spec to both plan and actual | LOW — additive input, not changed verification logic | +10-15 lines |
| `workflows/new-project.md` | Add step to generate `.planning/project-context.md` and initialize `files-manifest.csv` | LOW — new step at end of setup | +20 lines |
| `workflows/new-milestone.md` | Add step to regenerate `project-context.md` from updated REQUIREMENTS.md + STATE.md | LOW — additive | +10 lines |
| `workflows/update.md` | Use `manifest.cjs` hash comparison instead of three-way merge for unchanged files; preserve user-modified files | MEDIUM — changes update merge strategy; must be regression-tested | +40-60 lines (replaces ~40 existing) |
| `STATE.md` schema | Add `current_loop` field: `null | "plan" | "apply" | "unify"` | LOW — additive field | 1 field |
| `references/skill-style-guide.md` | Add section on AC-first task format standard | LOW — documentation addition | +20 lines |

### Unchanged Components

Every existing design pipeline skill (recommend, competitive, opportunity, ideate, brief, system, flows, wireframe, critique, iterate, mockup, hig, handoff), the build orchestrator, all MCP sync workflows, mcp-bridge.cjs, mcp-config.cjs, the design-manifest.json schema, protected-files.json, and the plugin hook system require **zero modifications** for v0.6. Methodology is additive infrastructure.

---

## Recommended Project Structure (Delta from v0.5)

Only showing what changes. Existing structure is unchanged.

```
Platform Development Engine/
│
├── agents/
│   ├── pde-architect.md              # NEW — architecture review agent
│   ├── pde-executor.md               # MODIFIED — +sidecar memory loading
│   ├── pde-planner.md                # MODIFIED — +sidecar memory, +AC format
│   ├── pde-debugger.md               # MODIFIED — +sidecar memory loading
│   └── pde-verifier.md               # MODIFIED — +RECONCILIATION.md input
│
├── bin/
│   ├── pde-tools.cjs                 # MODIFIED — +manifest subcommands
│   └── lib/
│       ├── manifest.cjs              # NEW — hash manifest CRUD
│       └── [existing lib unchanged]
│
├── templates/
│   ├── PLAN.md                       # MODIFIED — +acceptance_criteria section
│   ├── RECONCILIATION.md             # NEW — plan-vs-actual reconciliation
│   └── [existing templates unchanged]
│
├── references/
│   ├── workflow-methodology.md       # NEW — BMAD/PAUL patterns as PDE reference
│   ├── skill-style-guide.md          # MODIFIED — +AC format standard
│   └── [existing references unchanged]
│
├── workflows/
│   ├── execute-plan.md               # MODIFIED — +reconciliation step
│   ├── plan-phase.md                 # MODIFIED — +AC format, story sharding trigger
│   ├── new-project.md                # MODIFIED — +project-context.md init
│   ├── new-milestone.md              # MODIFIED — +project-context.md regen
│   ├── update.md                     # MODIFIED — hash-based merge strategy
│   └── [existing workflows unchanged]
│
└── .planning/
    ├── STATE.md                       # MODIFIED — +current_loop field
    ├── project-context.md             # NEW — agent-optimized 4KB synthesis
    ├── config/
    │   └── files-manifest.csv         # NEW — SHA256 hash manifest
    └── agent-memory/                  # NEW — per-agent sidecar directories
        ├── pde-executor/
        │   └── memories.md
        ├── pde-planner/
        │   └── memories.md
        ├── pde-debugger/
        │   └── memories.md
        └── pde-verifier/
            └── memories.md
```

### Structure Rationale

- **`.planning/agent-memory/` inside `.planning/`:** All PDE state lives under `.planning/`. Creating a parallel `_memory/` at project root (as BMAD does) would split state tracking across two locations. Agent memory is project state; it belongs in `.planning/`.
- **`.planning/config/files-manifest.csv`:** Config directory already exists for `config.json`. The hash manifest is a configuration artifact. Keeping it in `config/` avoids cluttering `.planning/` root with a new file type.
- **`templates/RECONCILIATION.md`:** Follows the existing template pattern — every generated artifact has a template. RECONCILIATION.md is generated per plan execution, so it needs a template like PLAN.md and SUMMARY.md.
- **`references/workflow-methodology.md`:** Following PDE's convention that all patterns loaded via `@` includes are reference files. BMAD/PAUL patterns become a reference, not a new directory.
- **Agent sidecar scope is project-scoped (not global):** BMAD uses project-level sidecars (`_bmad/_memory/`). PDE follows this — each project's agents learn independently. Global agent memory across all projects would mix unrelated project context.

---

## Architectural Patterns

### Pattern 1: AC-First Task Format in PLAN.md

**What:** Every task in PLAN.md includes an `<acceptance_criteria>` block using BDD format. Execution is measured against criteria, not against vague descriptive tasks.

**When to use:** All pde-planner output. Enforced by the updated PLAN.md template and skill-style-guide.md AC format section.

**Trade-offs:** Adds ~5-10 lines per plan (minor overhead). Creates a binding contract between planner, executor, and verifier — verifier can check ACs directly rather than inferring success from task descriptions.

**PLAN.md task structure (new format):**
```xml
<task id="01">
  <name>Implement OAuth token refresh</name>
  <files>src/auth/refresh.ts, src/auth/refresh.test.ts</files>
  <action>Create token refresh function with 401-retry logic</action>
  <acceptance_criteria>
    Given: an expired access token in request headers
    When: the auth middleware intercepts the 401 response
    Then: a new access token is requested, the original request retried,
          and the refreshed token written to the auth store
  </acceptance_criteria>
  <done>refresh.test.ts passes; no 401 errors in auth.log during integration test</done>
</task>
```

### Pattern 2: Story-File Sharding for Large Plans

**What:** When pde-planner identifies a plan with 5 or more tasks, it optionally emits a `tasks/` directory alongside PLAN.md. Each `task-NNN-{slug}.md` is self-contained: objective, relevant file paths, schema snippets, dependency pointers, and its own AC block.

**When to use:** Plans with 5+ tasks. Skip sharding for small plans — overhead outweighs benefit.

**Trade-offs:** Context savings for executor (loads only current task + project-context.md rather than full PLAN.md). Adds complexity to planner output. File I/O overhead for small phases. Correct threshold is 5 tasks based on BMAD benchmarks (90% token savings claimed).

**Story file structure:**
```
.planning/phases/45-architect-integration/
├── 01-01-PLAN.md               # master plan (always present)
├── 01-01-SUMMARY.md            # generated post-execution
├── 01-01-RECONCILIATION.md     # generated post-execution (new)
└── tasks/                      # only for plans with 5+ tasks
    ├── task-001-define-agent-interface.md
    ├── task-002-add-architect-spawn-logic.md
    └── task-003-update-plan-template.md
```

**pde-executor behavior with sharding:** Load `task-NNN.md` for current task instead of full PLAN.md. Load `.planning/project-context.md` as base context. On task completion: update `task-NNN.md` frontmatter with `status: complete`.

### Pattern 3: Reconciliation Step (Plan-vs-Actual Analysis)

**What:** After pde-executor finishes all tasks but before pde-verifier runs, a lightweight reconciliation pass compares PLAN.md task list against actual git commits in the phase branch. Generates RECONCILIATION.md.

**When to use:** Every execute-plan invocation where git commits exist. Auto-skip for plans with 0-2 tasks (overhead not justified).

**Trade-offs:** Surfaces plan drift that pde-verifier's goal-backward analysis misses. Adds one git-diff analysis step to execute-plan flow (~10-30 seconds). Worth it for phases with significant divergence risk (architectural changes, external dependency updates).

**Data flow:**
```
pde-executor completes all tasks
    ↓
Read PLAN.md task list (task IDs + names)
    ↓
git log --oneline (phase branch commits since plan started)
    ↓
For each planned task: was there a matching commit?
For each unplanned commit: what changed? (deviation)
    ↓
Write RECONCILIATION.md:
  - Completed as planned: [task IDs]
  - Completed with deviation: [task ID] — [what changed, why]
  - Skipped: [task ID] — [reason]
  - Unplanned changes: [file list] — [rationale]
    ↓
pde-verifier loads RECONCILIATION.md as additional context
```

### Pattern 4: Per-Agent Sidecar Memory

**What:** Each key agent type (executor, planner, debugger, verifier) reads a `memories.md` file from `.planning/agent-memory/{agent-type}/` at spawn time and appends key findings at completion. Memory is project-scoped, not global.

**When to use:** Four core agents. Not for specialized fleet agents (quality-auditor, skill-builder, etc.) — they operate on PDE's own artifacts, not on user project context.

**Trade-offs:** Cross-session learning for recurring project patterns (e.g., "this codebase has flaky test in auth.test.ts — always run with --testTimeout 10000"). Cap memory at 50 entries (oldest archived when limit reached) to prevent context bloat. Stale entries are a risk — entries older than 10 phases get a `[stale]` tag.

**Memory format (per agent):**
```markdown
# pde-executor memories — {project-name}

## Active Memories
- [2026-03-15] Auth tests require --testTimeout 10000 (confirmed in phase 3, phase 5)
- [2026-03-17] `yarn build` before `yarn test:e2e` — CI env constraint
- [2026-03-18] Prisma migrate fails if Docker not running — check before migration phases

## Archived (> 10 phases old)
[archived entries omitted from active context]
```

**Agent loading pattern:**
```
Agent spawned
    ↓
Read .planning/agent-memory/{agent-type}/memories.md
    ↓
Include as final section of agent context: "## Project Memory\n{memories}"
    ↓
Execute work
    ↓
If learned something worth retaining: append to memories.md
    ↓
Prune to 50 entries if exceeded
```

### Pattern 5: Hash-Based Safe Update Merging

**What:** `files-manifest.csv` tracks SHA256 of every PDE-managed file at install/update time. During `/pde:update`, compare current file hash against manifest hash to detect user modifications. Unchanged files are auto-updated; user-modified files are preserved with a notice.

**When to use:** Every `/pde:update` invocation. Eliminates three-way merge complexity for files the user hasn't touched.

**Trade-offs:** Replaces three-way merge with simpler hash comparison for the majority of files. Requires manifest to be current (regenerated on every update). If manifest is missing (first-time or corrupted), fall back to existing three-way merge.

**Comparison logic:**
```
For each managed file:
  current_hash = SHA256(current file on disk)
  manifest_hash = SHA256 from files-manifest.csv
  upstream_hash = SHA256(incoming update file)

  if current_hash == manifest_hash:
    → overwrite silently (user hasn't modified)
  else:
    → preserve user version
    → display: "Preserved: {file} (user-modified — upstream update available)"
    → log delta to update report
```

### Pattern 6: Project Context Constitution

**What:** `.planning/project-context.md` is a max-4KB auto-generated synthesis of PROJECT.md + top-level REQUIREMENTS.md + key decisions from STATE.md. Structured for agent consumption, not human prose. Auto-regenerated when `/pde:new-project` or `/pde:new-milestone` runs.

**When to use:** Loaded by every subagent as baseline context, replacing the ad-hoc combination of STATE.md + PROJECT.md that agents currently load separately.

**Trade-offs:** Centralized agent context — one file to update when project changes, one file each agent loads. 4KB cap must be enforced — uncapped constitutions grow to fill context budgets. Risk of staleness if regeneration fails; mitigated by generating at milestone boundaries.

**Content sections:**
```markdown
# Project Context — {project-name}

## Tech Stack
{extracted from PROJECT.md or auto-detected from package.json}

## Conventions
{key coding conventions from CLAUDE.md or PROJECT.md}

## Constraints
{key constraints from PROJECT.md constraints section}

## Key Decisions
{last 10 decisions from STATE.md key decisions log}

## File Structure
{top-level directory map, max 20 entries}

## Current Milestone
{milestone name, version, phase count}
```

---

## Data Flow

### Execute-Phase Flow (Modified for v0.6)

```
/pde:execute-phase
    ↓
execute-phase.md: discover plans, group waves
    ↓
For each plan: execute-plan.md
    ↓
Step 1: Load project-context.md + PLAN.md
    ↓
Step 2: pde-executor agent spawned
    Load .planning/agent-memory/pde-executor/memories.md
    If plan has 5+ tasks: load tasks/ shards instead of full PLAN.md
    Execute tasks (unchanged core logic)
    Append learnings to memories.md
    ↓
Step 3: [NEW] Reconciliation step
    Read PLAN.md task list
    git log phase branch commits
    Compare planned vs actual
    Write RECONCILIATION.md
    ↓
Step 4: pde-verifier agent
    Load RECONCILIATION.md as additional context
    Load .planning/agent-memory/pde-verifier/memories.md
    Run existing goal-backward + Nyquist verification
    ↓
Step 5: Commit + update STATE.md current_loop = "unify"
    ↓
Step 6: pde-planner closes loop: STATE.md current_loop = null
```

### New-Project Flow (Modified for v0.6)

```
/pde:new-project
    ↓
existing new-project.md flow (unchanged)
    ↓
[NEW STEP] generate project-context.md
    Read PROJECT.md + REQUIREMENTS.md (if exists) + STATE.md
    Synthesize to 4KB max
    Write .planning/project-context.md
    ↓
[NEW STEP] initialize files-manifest.csv
    pde-tools.cjs manifest init
    SHA256 all tracked PDE files
    Write .planning/config/files-manifest.csv
    ↓
[NEW STEP] initialize agent-memory directories
    Create .planning/agent-memory/{pde-executor,pde-planner,pde-debugger,pde-verifier}/
    Create empty memories.md in each
```

### Update Flow (Modified for v0.6)

```
/pde:update
    ↓
Check if files-manifest.csv exists
    ↓ exists              ↓ missing
Hash-based comparison     Existing three-way merge (unchanged fallback)
    ↓
For each managed file:
  Compare SHA256(disk) vs SHA256(manifest)
  If equal: auto-overwrite with upstream
  If different: preserve, add to "preserved" report
    ↓
Regenerate files-manifest.csv with upstream hashes
    ↓
Regenerate .planning/project-context.md from updated PROJECT.md
    ↓
Display: "Updated {N} files; preserved {M} user-modified files"
```

---

## Integration Points: New vs Modified — Explicit Inventory

### New Files (create from scratch)

| File | Purpose | Blocked On |
|---|---|---|
| `agents/pde-architect.md` | Architecture review agent | Nothing |
| `bin/lib/manifest.cjs` | Hash manifest CRUD | Nothing |
| `templates/RECONCILIATION.md` | Reconciliation output template | Nothing |
| `references/workflow-methodology.md` | BMAD/PAUL patterns as PDE reference | Nothing |
| `.planning/project-context.md` | Agent-optimized context synthesis | `manifest.cjs` (for hash tracking) |
| `.planning/config/files-manifest.csv` | SHA256 hash manifest | `manifest.cjs` |
| `.planning/agent-memory/pde-executor/memories.md` | Executor sidecar memory | Nothing (empty init) |
| `.planning/agent-memory/pde-planner/memories.md` | Planner sidecar memory | Nothing (empty init) |
| `.planning/agent-memory/pde-debugger/memories.md` | Debugger sidecar memory | Nothing (empty init) |
| `.planning/agent-memory/pde-verifier/memories.md` | Verifier sidecar memory | Nothing (empty init) |

### Modified Files (change existing)

| File | Change | Risk | Rationale |
|---|---|---|---|
| `templates/PLAN.md` | Add `<acceptance_criteria>` section after `<objective>` | LOW — additive | AC-first planning requires template support |
| `workflows/execute-plan.md` | Add reconciliation step between executor and verifier | MEDIUM | New step changes execute-plan control flow |
| `workflows/plan-phase.md` | Prompt AC format; add story-sharding trigger for 5+ tasks; risk tagging | LOW | Additive instructions; no structural change |
| `workflows/new-project.md` | Add project-context.md generation + manifest init + agent-memory init | LOW | Additive steps at workflow end |
| `workflows/new-milestone.md` | Add project-context.md regeneration step | LOW | Single additive step |
| `workflows/update.md` | Use hash-based merge for unchanged files; fall back to three-way for modified | MEDIUM | Changes merge strategy; regression risk |
| `bin/pde-tools.cjs` | Add `manifest` subcommand group | LOW | Additive subcommands |
| `agents/pde-executor.md` | Add sidecar memory load/save | LOW | Additive context |
| `agents/pde-planner.md` | Add sidecar memory + AC format instructions | LOW | Additive context |
| `agents/pde-debugger.md` | Add sidecar memory load/save | LOW | Additive context |
| `agents/pde-verifier.md` | Load RECONCILIATION.md when present | LOW | Additive input |
| `references/skill-style-guide.md` | Add AC format standard section | LOW | Documentation |
| `STATE.md` (schema + template) | Add `current_loop` field | LOW | Additive field |

### Untouched Files

All 13 design pipeline skills (recommend through handoff), the build orchestrator, all MCP sync workflows (sync-github, sync-linear, sync-jira, sync-figma), mcp-bridge.cjs, mcp-config.cjs, pde-quality-auditor.md, pde-skill-builder.md, pde-skill-improver.md, pde-skill-validator.md, design-manifest.json schema, protected-files.json, and all existing reference files (except skill-style-guide.md).

---

## Scalability Considerations

| Concern | Current (v0.5) | v0.6 Impact | Mitigation |
|---|---|---|---|
| Agent context per spawn | Agents load STATE.md + domain refs | Each agent also loads memories.md (+1-4KB) + project-context.md (~4KB) | Cap memories at 50 entries (~2KB); enforce 4KB project-context limit |
| PLAN.md size in large phases | Full PLAN.md loaded by executor | Story sharding reduces this for 5+ task plans | Threshold gate: only shard at 5+ tasks |
| execute-plan flow duration | Executor + verifier | +reconciliation step (+10-30s for git-diff analysis) | Auto-skip for plans with <3 tasks |
| files-manifest.csv maintenance | N/A | Grows with every managed file; needs regeneration on update | CSV format; Node.js crypto.createHash is O(n) in file count; non-issue at PDE scale |
| project-context.md staleness | N/A | Regenerated at new-project + new-milestone; may be stale mid-milestone | Add warning to execute-phase when project-context.md is >7 days old |

---

## Anti-Patterns

### Anti-Pattern 1: Mirroring BMAD's Compilation Pipeline in PDE

**What people do:** Add a `npx pde build` step that compiles YAML agent definitions to Markdown, following BMAD's compile-time architecture.

**Why it's wrong:** PDE agents are already Markdown files loaded at runtime. Adding a compile step adds complexity (build tool, source format change, distribution artifacts) for zero benefit. BMAD needs compilation because it supports 15+ IDEs with different formats. PDE targets one runtime: Claude Code.

**Do this instead:** Keep agents as plain Markdown loaded directly. Adopt BMAD's content patterns (AC-first, sidecar memory) without adopting its toolchain.

### Anti-Pattern 2: Parallel State Directory

**What people do:** Create `_memory/` or `_bmad/` at the project root to mirror BMAD's structure.

**Why it's wrong:** PDE's entire state model is under `.planning/`. Adding a parallel root-level directory splits state tracking, breaks `pde-tools.cjs` path assumptions, and confuses the `.gitignore` strategy (`.planning/agent-memory/` is already under the `.planning/` gitignore rules).

**Do this instead:** Agent memory lives at `.planning/agent-memory/`. Every PDE state artifact lives under `.planning/`.

### Anti-Pattern 3: Mandatory Loop-Position Enforcement (PAUL-style)

**What people do:** Enforce PAUL's hard PLAN → APPLY → UNIFY loop in yolo mode, blocking execution if `current_loop` is not `null`.

**Why it's wrong:** PDE's yolo mode is designed for uninterrupted autonomous execution. Hard loop gates in yolo mode defeat the purpose and break the existing user contract.

**Do this instead:** `current_loop` is a tracking field only in yolo mode. It gates phase transitions in interactive mode. In yolo mode, reconciliation runs automatically without requiring user confirmation.

### Anti-Pattern 4: Unbounded Sidecar Memory

**What people do:** Let agents append to memories.md freely, with no size cap or pruning.

**Why it's wrong:** Unbounded memories.md files grow to fill available context window. After 20 phases, memories.md could be 10KB+ — consuming budget needed for actual work context.

**Do this instead:** Cap at 50 active entries (~2KB). When exceeded, archive oldest 10 entries to `memories-archive.md`. Never load archive in active context.

### Anti-Pattern 5: Replacing pde-verifier with AC-Checking Only

**What people do:** Replace goal-backward verifier logic with a simple "did each AC pass?" check, treating ACs as the complete verification contract.

**Why it's wrong:** Acceptance criteria cover planned behavior. Nyquist assertions and goal-backward analysis catch unplanned regressions and quality degradation that ACs cannot anticipate. ACs are an input to verification, not a replacement.

**Do this instead:** ACs extend pde-verifier input. Verifier checks ACs as its first step, then runs existing Nyquist + goal-backward passes. All three must pass.

---

## Build Order for v0.6

Dependencies determine order. Within each phase, components with no inter-dependencies can be built in parallel.

```
Phase 1: Foundation — Zero-Dependency Components
  ├── bin/lib/manifest.cjs                    (new CJS module, no deps)
  ├── bin/pde-tools.cjs manifest subcommands  (deps: manifest.cjs)
  ├── templates/PLAN.md                       (additive template change, no deps)
  ├── templates/RECONCILIATION.md             (new template, no deps)
  └── references/workflow-methodology.md      (new reference, no deps)

  Rationale: manifest.cjs is the most-depended-upon new module (update.md and
  new-project.md both need it). Build it first so all downstream phases can test
  against it. Templates and references have no dependencies and unblock Phase 2.

Phase 2: Context Infrastructure
  ├── .planning/project-context.md generation (deps: manifest.cjs, templates)
  │   (update new-project.md + new-milestone.md to generate it)
  ├── .planning/agent-memory/ initialization  (deps: new-project.md update)
  └── STATE.md schema: +current_loop field    (no code deps — schema change)

  Rationale: project-context.md must exist before any agent can load it.
  Agent-memory directories must be initialized before agents try to read them.
  These are blocking prerequisites for all agent modifications in Phase 3.

Phase 3: Agent Enhancements
  ├── agents/pde-architect.md                 (new agent, deps: workflow-methodology.md)
  ├── agents/pde-executor.md +sidecar         (deps: agent-memory dirs, memories.md exists)
  ├── agents/pde-planner.md +sidecar +AC      (deps: agent-memory dirs, PLAN.md template)
  ├── agents/pde-debugger.md +sidecar         (deps: agent-memory dirs)
  └── agents/pde-verifier.md +RECONCILIATION  (deps: RECONCILIATION.md template)

  Rationale: Agents load memory at spawn time — memory dirs must pre-exist (Phase 2).
  pde-architect is a new agent; build it alongside agent modifications.
  All agents in this phase can be built in parallel (no inter-agent deps in this layer).

Phase 4: Workflow Modifications
  ├── workflows/plan-phase.md +AC +sharding   (deps: updated pde-planner.md, PLAN.md template)
  ├── workflows/execute-plan.md +reconciliation (deps: pde-executor.md, RECONCILIATION.md template)
  └── references/skill-style-guide.md +AC     (deps: workflow-methodology.md)

  Rationale: Workflow changes depend on updated agent definitions and templates (Phase 3).
  plan-phase.md and execute-plan.md are the highest-risk modifications (core execution flow)
  — build and validate them after all foundation pieces are in place.

Phase 5: Update Mechanism
  └── workflows/update.md hash-based merge    (deps: manifest.cjs, files-manifest.csv exists)

  Rationale: update.md change is isolated but requires manifest.cjs to be tested and stable.
  Separated from Phase 4 to reduce blast radius — update.md touches file preservation logic
  and should be validated independently from the execution flow changes.

Phase 6: End-to-End Validation
  └── Full methodology validation:
      - Create new project → project-context.md generated, manifest initialized, memory dirs created
      - Plan phase → ACs present in output, story-file sharding for 5+ task plan
      - Execute phase → reconciliation step runs, RECONCILIATION.md generated, verifier loads it
      - Debug phase → sidecar memory loaded, finding appended on completion
      - Update → hash manifest used, user-modified files preserved, unchanged files auto-updated
      - Architect agent invocation → architecture review produced
```

**Why this order:**
- Foundation before agents: agents load project-context.md and agent-memory at spawn — both must exist
- Templates before workflows: execute-plan.md reconciliation step generates RECONCILIATION.md — template must exist
- Agents before workflows: plan-phase.md prompts pde-planner with AC format — planner must be updated first
- Update last: update.md uses hash manifest — manifest must be validated across multiple operations before update flow depends on it
- All design pipeline skills unaffected at every phase — no regression risk to v0.5 capabilities

---

## Sources

**HIGH confidence (official documentation + direct codebase inspection):**
- PDE codebase direct inspection: `agents/*.md`, `workflows/execute-plan.md`, `workflows/plan-phase.md`, `workflows/build.md`, `bin/pde-tools.cjs`, `bin/lib/*.cjs`, `.planning/config.json`, `.planning/PROJECT.md` — 2026-03-19
- [BMAD Method GitHub](https://github.com/bmad-code-org/BMAD-METHOD) — official repo; architecture overview 2026
- [BMAD v6 Agent Sidecar Architecture — DeepWiki](https://deepwiki.com/bmad-code-org/BMAD-METHOD/6.5-agent-customization-and-sidecars) — hash preservation algorithm, directory structure, `hasSidecar` flag, SHA256 + files-manifest.csv details
- [BMAD v6 What's New — DeepWiki](https://deepwiki.com/bmad-code-org/BMAD-METHOD/1.4-what's-new-in-v6) — sidecar system, path segregation, direct workflow invocation
- [PAUL Framework GitHub](https://github.com/ChristopherKahler/paul) — official repo; STATE.md structure, 26 slash commands, PLAN.md format, CARL rule injection
- [BMAD-AT-CLAUDE core architecture](https://github.com/24601/BMAD-AT-CLAUDE/blob/main/docs/core-architecture.md) — template architecture, story sharding, compilation pipeline details
- `.planning/research/EXTERNAL-FRAMEWORKS.md` — prior research (2026-03-17) on BMAD/PAUL integration candidates, Tier 1-3 classification

**MEDIUM confidence (WebSearch + multiple sources agree):**
- BMAD agent roles (Analyst, PM, Architect, SM, Dev, QA) — confirmed from official docs page + multiple articles
- BMAD story file YAML frontmatter structure — confirmed from DeepWiki + v6 issue tracker discussion
- PAUL CARL rule injection mechanism — confirmed from official PAUL GitHub README + Level Up Coding article (2026-03)

---

*Architecture research for: PDE v0.6 — BMAD + PAUL methodology integration*
*Researched: 2026-03-19*
