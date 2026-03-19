# Stack Research

**Domain:** AI agentic workflow methodology import — BMAD + PAUL patterns into PDE (Claude Code plugin, v0.6)
**Researched:** 2026-03-19
**Confidence:** HIGH (BMAD — official docs, DeepWiki technical reference, 41k-star OSS project, v6.2.0 released 2026-03-15), HIGH (PAUL — official GitHub repo, full command reference fetched, CARL ecosystem documented)

---

> **Scope note:** This file covers ONLY what is new for v0.6 BMAD + PAUL methodology import. The existing PDE capabilities — Node.js/CommonJS plugin, 34+ slash commands, 13-stage design pipeline, file-based `.planning/` state, agent orchestration, 5 MCP integrations — are treated as stable dependencies. No stack additions outside of pattern/file imports.

---

## What BMAD and PAUL Are

### BMAD — Breakthrough Method for Agile AI-Driven Development

**Repository:** `github.com/bmad-code-org/BMAD-METHOD` (41.3k stars, MIT, v6.2.0 as of 2026-03-15, 26 releases)
**Install:** `npx bmad-method install` (Node.js v20+)
**Core concept:** A multi-agent agile development framework where specialized AI personas guide users through a four-phase lifecycle (Analysis → Planning → Solutioning → Implementation). Agents are defined as `.agent.yaml` files compiled into executable `.md` files for IDE integration. Workflows are sharded step-files loaded just-in-time to manage context window pressure.

**BMAD is NOT:** A task runner. Not a simple prompt template system. It is a lifecycle governance methodology with role-specialized agent personas, phase-gated artifact production, and context-engineering techniques.

### PAUL — Plan-Apply-Unify Loop

**Repository:** `github.com/ChristopherKahler/paul` (Christopher Kahler / Chris AI Systems)
**Install:** `npx paul-framework` (global: `--global`, local: `--local`)
**Core concept:** A structured methodology for AI-assisted development within Claude Code that enforces a mandatory three-phase loop: PLAN (define acceptance criteria + tasks) → APPLY (execute sequentially with verification) → UNIFY (reconcile, close, update state). Quality over speed. In-session context over subagent sprawl.

**PAUL ecosystem:** CARL (dynamic rule injection), AEGIS (codebase auditing), BASE (workspace lifecycle), SEED (project incubation), Skillsmith (skill discovery/management).

**PAUL is NOT:** An orchestration engine. Not a pipeline runner. It is a discipline framework — a workflow contract that enforces loop integrity, boundary protection, and acceptance-driven development.

---

## BMAD Methodology: Full Technical Reference

### Four-Phase Lifecycle

| Phase | Name | Primary Agents | Key Artifacts | Notes |
|-------|------|---------------|---------------|-------|
| 1 | Analysis & Discovery | Analyst (Mary) | `product-brief.md`, market research, technical research | Analyst probes assumptions; converts vague intent to structured brief |
| 2 | Planning | PM (John), UX (Sally) | `PRD.md`, `epics.md`, `UX_Design.md` | PM enforces scope boundaries; zero tolerance for scope creep |
| 3 | Solutioning | Architect (Winston), PO | `ARCHITECTURE.md`, `db-schema.sql`, `api_spec.json`, epics + stories | Architect bridges requirements and technical execution; PO validates alignment |
| 4 | Implementation | Scrum Master (Bob), Dev (Amelia), QA (Quinn) | story files, source code, test frameworks | SM shards requirements into atomic story files (~1KB each); Dev executes one story at a time |

### Agent Roster (BMM Module — 9 Agents)

| Agent | Persona Name | Role | Trigger Codes | Key Output |
|-------|-------------|------|---------------|------------|
| bmad-analyst | Mary | Business analysis, research, product briefs | BP, MR, DR, TR, CB | `product-brief.md` |
| bmad-pm | John | PRDs, roadmaps, epic generation, scope gating | CP, VP, EP, CE | `PRD.md`, `epics.md` |
| bmad-ux-designer | Sally | UX design, user flows, interaction specs | CU | `UX_Design.md` |
| bmad-architect | Winston | System architecture, DB schema, API specs, implementation readiness | CA, IR | `ARCHITECTURE.md` |
| bmad-sm (Scrum Master) | Bob | Sprint planning, story creation, sprint status, retrospective | SP, SS, CS, VS, ER, CC | Story files with full context |
| bmad-dev | Amelia | Story implementation, code review | DS, CR | Source code |
| bmad-qa | Quinn | Test automation, quality assurance | QA | Test frameworks |
| bmad-master (Quick Flow) | Barry | Solo dev — combines dev + review | QS, QD | Source code |
| bmad-tech-writer | Paige | Documentation, standards, diagrams (only agent with sidecar memory) | WD, US, MG, VD, EC | `docs/` |

**Trigger mechanics:** Two types: (1) Workflow triggers (2-letter codes like `CP`) execute structured prompts automatically. (2) Conversational triggers require descriptive input alongside the command code.

### Agent YAML Definition Format

```yaml
agent:
  metadata:
    id: "_bmad/bmm/agents/pm.md"         # Compiled output path
    name: "John"                           # Persona first name
    title: "Product Manager"              # Role title in IDE menus
    icon: "📋"                            # Emoji identifier
    module: "bmm"                         # Module slug
    hasSidecar: false                     # Whether agent gets _bmad/_memory/agent-sidecar/
  persona:
    role: "Product Manager"
    identity: "Extended backstory and domain expertise..."
    communication_style: "Decisive, scope-focused, user-story oriented"
    principles:
      - "Principle 1"
      - "Principle 2"
  critical_actions:                       # Invariant behaviors — override LLM defaults
    - "Always enforce scope boundaries"
    - "Define acceptance criteria before tasks"
  menu:                                   # 2-letter trigger codes → workflows
    - trigger: "CP"
      description: "[CP] Create PRD"
      workflow: "_bmad/bmm/workflows/2-plan-workflows/create-prd/workflow.md"
    - trigger: "VP"
      description: "[VP] Validate PRD"
      validate-workflow: "_bmad/bmm/workflows/2-plan-workflows/create-prd/..."
  startup_message: "I'm John, your Product Manager..."
```

**Customization:** Create `{agent-name}.customize.yaml` in `_bmad/_config/customizations/`. Uses deep-merge — overrides specific fields without modifying the original module agent.

### Workflow System Architecture

BMAD workflows use sharded step files loaded just-in-time. Two entry formats:

**Markdown format** (`workflow.md`): Variable declarations in YAML frontmatter, human-readable prose, explicit step loading via "Read fully and follow" directives. Used by: `create-architecture`, `create-prd`.

**YAML format** (`workflow.yaml`): Top-level YAML keys for variables, separate `instructions.md` or `instructions.xml`, declared `input_file_patterns` with load strategies. Used by: `sprint-planning`, `dev-story`.

**Every workflow directory contains:**
```
{workflow-name}/
├── workflow.md          OR  workflow.yaml    # Entry point
├── instructions.md      OR  instructions.xml # Execution instructions
├── template.md                               # Output document template
├── checklist.md                              # Validation checklist
├── data/                                     # Reference data files
└── steps/
    ├── step-01-name.md
    ├── step-02-name.md
    └── step-NN-name.md
```

**Mandatory processing rules (enforced in agent definitions):**
1. READ COMPLETELY — Load entire step file before action
2. FOLLOW SEQUENCE — Execute numbered sections in order
3. WAIT FOR INPUT — Halt at menu prompts
4. CHECK CONTINUATION — Advance only on explicit user selection
5. SAVE STATE — Update `stepsCompleted` in frontmatter
6. LOAD NEXT — Read and follow subsequent step file

### Full Workflow Catalog (BMM Module)

| Phase | Workflow Name | Entry Format | Key Agents | Artifacts Produced |
|-------|--------------|-------------|------------|-------------------|
| Analysis | domain-research | Markdown | Analyst | Market/domain research docs |
| Analysis | market-research | Markdown | Analyst | Competitive landscape |
| Analysis | technical-research | Markdown | Analyst | Technical feasibility |
| Analysis | create-product-brief | Markdown | PM | `product-brief.md` |
| Planning | create-prd | Markdown | PM | `PRD.md` (15-25 pages) |
| Planning | validate-prd | Markdown | PO | Validated PRD |
| Planning | create-ux-design | Markdown | UX Designer | `UX_Design.md` |
| Solutioning | create-architecture | Markdown | Architect | `ARCHITECTURE.md` (10-20 pages) |
| Solutioning | create-epics-and-stories | Markdown | Architect, SM | Epics + story files |
| Solutioning | check-implementation-readiness | Markdown | Architect | Readiness checklist |
| Implementation | sprint-planning | YAML | Scrum Master | Sprint backlog |
| Implementation | create-story | YAML | SM | Individual story file |
| Implementation | dev-story | YAML | Developer | Source code |
| Implementation | code-review | YAML | Reviewer | Code review output |
| Implementation | sprint-status | YAML | SM | Status update |
| Implementation | correct-course | YAML | SM | Course correction plan |
| Implementation | retrospective | YAML | SM | Retro document |
| Quick Flow | quick-spec | Markdown | PM | Rapid requirements |
| Quick Flow | quick-dev | Markdown | Developer | Implementation |
| Utility | generate-project-context | Markdown | Architect | `project-context.md` |
| Utility | document-project | YAML | Tech Writer | Project documentation |

### Variable Resolution System

| Syntax | Meaning | Example |
|--------|---------|---------|
| `{key}` | Local variable from same file | `{installed_path}/steps/step-01.md` |
| `"{config_source}:key"` | Config file value | `"{config_source}:user_name"` |
| `{{variable}}` | Runtime-evaluated | `{{story_key}}`, `{{epic_num}}` |

### Post-Install Directory Structure

```
project-root/
├── _bmad/
│   ├── core/                       # Core module (help, brainstorming)
│   ├── bmm/                        # BMad Method module
│   │   ├── agents/                 # Compiled agent .md files
│   │   ├── workflows/              # Sharded step files (phases 1-4)
│   │   ├── tasks/                  # Reusable task definitions
│   │   └── config.yaml
│   ├── _config/
│   │   ├── config.yaml             # Global settings (see schema below)
│   │   ├── manifest.yaml           # Installed modules metadata
│   │   ├── files-manifest.csv      # SHA256 file tracking
│   │   ├── customizations/         # Agent override .customize.yaml files
│   │   ├── custom/                 # Cached external modules
│   │   └── ides/                   # IDE-specific configs
│   └── _memory/
│       └── {agent-name}-sidecar/   # Per-agent persistent memory (hasSidecar: true only)
└── _bmad-output/
    ├── planning-artifacts/         # PRD, architecture, epics (Phases 1-3)
    ├── implementation-artifacts/   # Stories, tech specs (Phase 4)
    ├── project-context.md
    └── project-knowledge/
```

### Global config.yaml Schema

```yaml
user_name: "Developer Name"
project_root: "/absolute/path/to/project"
bmad_folder: "_bmad"
installed_modules:
  - code: "core"
    name: "Core Module"
  - code: "bmm"
    name: "BMad Method"
selected_ides:
  - claude-code
planning_artifacts_path: "{project-root}/_bmad-output/planning-artifacts"
implementation_artifacts_path: "{project-root}/_bmad-output/implementation-artifacts"
```

### Context Sharding (BMAD's Core Performance Pattern)

The Scrum Master maintains global view; the Developer only loads single story files (~1KB each). This atomic file approach prevents context window saturation. Reported up to 90% token savings compared to monolithic contexts. Stories contain: complete architectural context for that feature, specific implementation tasks with acceptance criteria, security requirements, testing requirements, identified dependencies.

**Relevance to PDE:** PDE already uses this pattern via DESIGN-STATE.md and per-stage coverage flags. BMAD formalizes it as story-file atomicity.

### Optional Modules Beyond BMM

| Module Code | Name | Purpose |
|-------------|------|---------|
| BMB | Builder | Create custom agents and workflows without coding |
| TEA | Test Architect | Risk-based test architecture, E2E automation |
| BMGD | Game Dev | Unity/Unreal/Godot support |
| CIS | Creative Intelligence | Innovation and design thinking workflows |

---

## PAUL Methodology: Full Technical Reference

### The Plan-Apply-Unify Loop

```
PLAN ──► APPLY ──► UNIFY
Define  Execute  Reconcile
work    tasks    & close
         ↑
   (never skip UNIFY)
```

**PLAN phase produces:**
- Clear objectives and acceptance criteria (BDD Given/When/Then format)
- Granular tasks specifying files, actions, verification steps, completion markers
- Explicit boundaries (`## DO NOT CHANGE` sections)

**APPLY phase enforces:**
- Task-by-task sequential execution
- Verification before marking task complete
- Checkpoints for human intervention
- Deviation logging for audit trail

**UNIFY phase (mandatory — never optional):**
- Creates `SUMMARY.md` documenting what was built
- Reconciles planned vs. actual outcomes
- Records decisions and deferred issues
- Updates `STATE.md` for session continuity

### PLAN.md File Format

```yaml
---
phase: 01-foundation
plan: 01
type: execute
autonomous: true
---

<objective>
Goal, Purpose, Output
</objective>

<context>
@-references to relevant files
</context>

<acceptance_criteria>
## AC-1: Feature Works
Given [precondition]
When [action]
Then [outcome]
</acceptance_criteria>

<tasks>
<task type="auto">
  <name>Create login endpoint</name>
  <files>src/api/auth/login.ts</files>
  <action>Specific implementation details</action>
  <verify>curl command returns 200</verify>
  <done>AC-1 satisfied</done>
</task>
</tasks>

<boundaries>
## DO NOT CHANGE
- database/migrations/*
- src/lib/auth.ts
</boundaries>
```

**Required task fields:** `files`, `action`, `verify`, `done`. If any field is missing, the task needs decomposition.

### STATE.md Structure

Tracks: current phase and plan identifier, loop position markers (PLAN/APPLY/UNIFY), accumulated decisions with rationale, blocked work and deferred issues, restoration points for session breaks.

`/paul:resume` reads STATE.md and proposes exactly ONE next action. Eliminates decision fatigue at session start.

### Project File Structure

```
.paul/
├── PROJECT.md          # Project objectives and constraints
├── ROADMAP.md          # Phase breakdown and milestones
├── STATE.md            # Current loop position and session memory
├── config.md           # Optional integrations (SonarQube, CI/CD, linting)
├── SPECIAL-FLOWS.md    # Required skill declarations
└── phases/
    ├── 01-foundation/
    │   ├── 01-01-PLAN.md
    │   └── 01-01-SUMMARY.md
    └── 02-features/
        ├── 02-01-PLAN.md
        └── 02-01-SUMMARY.md
```

### SPECIAL-FLOWS.md Format

Declares required skills that must load before APPLY phase begins. APPLY is blocked until each required skill confirms loading.

```markdown
## Required Skills

| Skill | Work Type | Priority |
|-------|-----------|----------|
| /frontend-design | UI components | required |
| /revops-expert   | Landing pages | required |
```

**Relevance to PDE:** Analogous to PDE's DESIGN-STATE.md coverage flags. Can be adapted as a skill-dependency gate before pipeline stages run.

### config.md Format

```markdown
## Integrations

| Service | Status | Purpose |
|---------|--------|---------|
| SonarQube | enabled | Code quality metrics |
```

### Complete Command Reference (26 Commands)

**Core Loop:**
- `/paul:init` — Initialize PAUL in a project
- `/paul:plan [phase]` — Create an executable plan
- `/paul:apply [path]` — Execute an approved plan
- `/paul:unify [path]` — Reconcile and close the loop
- `/paul:help` — Show command reference
- `/paul:status` — (deprecated, use `/paul:progress`)

**Session Management:**
- `/paul:pause [reason]` — Create handoff for session break
- `/paul:resume [path]` — Restore context and propose ONE next action
- `/paul:progress [context]` — Smart status + exactly one next action
- `/paul:handoff [context]` — Generate comprehensive handoff document

**Roadmap Management:**
- `/paul:add-phase <desc>` — Append phase to roadmap
- `/paul:remove-phase <N>` — Remove future phase
- `/paul:milestone <name>` — Create new milestone
- `/paul:complete-milestone` — Archive and tag milestone
- `/paul:discuss-milestone` — Articulate milestone vision before starting

**Pre-Planning:**
- `/paul:discuss <phase>` — Capture decisions before planning begins
- `/paul:assumptions <phase>` — Show Claude's intended approach before planning
- `/paul:discover <topic>` — Explore options without committing to a plan
- `/paul:consider-issues` — Triage deferred issues from UNIFY

**Research:**
- `/paul:research <topic>` — Deploy research subagents
- `/paul:research-phase <N>` — Research unknowns for a specific phase

**Specialized:**
- `/paul:flows` — Configure SPECIAL-FLOWS.md skill requirements
- `/paul:config` — View/modify PAUL settings
- `/paul:map-codebase` — Generate codebase overview document

**Quality:**
- `/paul:verify` — Guide manual acceptance testing
- `/paul:plan-fix` — Plan fixes for UAT-discovered issues

### Acceptance-Driven Development (A.D.D.)

PAUL reverses the typical sequence: acceptance criteria are written BEFORE tasks.

1. AC defined in BDD format: `Given [precondition] / When [action] / Then [outcome]`
2. Each task explicitly references which AC it satisfies via `<done>AC-N satisfied</done>`
3. Verification step validates AC completion before task closes
4. "Done" is unambiguous — defined before work begins

**Relevance to PDE:** PDE's pipeline stages have implicit completion criteria (DESIGN-STATE.md coverage flags). PAUL's A.D.D. can formalize these as explicit, testable acceptance criteria per phase/stage.

### In-Session Context Philosophy

PAUL minimizes subagent use for implementation work:

| Use case | PAUL recommendation |
|----------|---------------------|
| Discovery, codebase mapping | Subagents: appropriate |
| Parallel research, knowledge gathering | Subagents: appropriate |
| Implementation, code changes | In-session: mandatory |
| Planning refinement | In-session: mandatory |

Rationale: subagents cost 2,000–3,000 tokens to initialize, lack accumulated context, produce ~70% quality requiring cleanup. In-session context produces better results for implementation work.

**Relevance to PDE:** PDE already uses parallel wave orchestration for research agents and sequential in-session patterns for pipeline stages. PAUL validates this split as correct methodology.

### CARL — Context Augmentation & Reinforcement Layer

**Repository:** `github.com/ChristopherKahler/carl`
**Purpose:** Dynamic rule injection — rules load just-in-time based on conversation context, disappear when irrelevant. Keeps context lean.

**File structure:**
```
.carl/
├── manifest        # Domain registry with trigger keywords and exclusion terms
├── global          # Rules always loaded regardless of context
├── commands        # Star-command (*commandname) definitions
├── context         # Context-depth rules (fresh/moderate/depleted states)
└── {custom-domain} # User-defined domain rule files
```

**Rule format:** `{DOMAIN}_RULE_{N}=instruction` (plain key-value text)

**Activation mechanisms:**
1. Automatic: keywords in prompt text → matching domain loads
2. Star-commands: `*commandname` — explicit toggle syntax

**PAUL-specific rules CARL enforces:**
- Loop enforcement (PLAN → APPLY → UNIFY, no shortcuts)
- Boundary protection (DO NOT CHANGE sections are immutable)
- State consistency checks at phase transitions
- Verification requirement for every task
- Skill blocking (required skills must load before APPLY)

**Relevance to PDE:** PDE's CLAUDE.md system instructions serve a similar function. CARL's dynamic loading pattern (rules appear when relevant, disappear when not) could inform how PDE loads stage-specific rules during pipeline execution.

---

## Integration Assessment: What Fits PDE's Architecture

### PDE's Existing Architecture (Constraint Baseline)

```
Plugin format:     Claude Code plugin (plugin.json + commands/ directory)
State model:       File-based .planning/ — no database, no background process
Slash commands:    /pde: namespace, 34+ commands
Agent system:      12+ agent types, parallel wave orchestration
Pipeline:          13 stages with DESIGN-STATE.md coverage tracking
Tech stack:        Node.js CommonJS, zero npm deps at plugin root
Key files:         .planning/PLAN.md, STATE.md, DESIGN-STATE.md, design-manifest.json
```

### High-Fit BMAD Patterns (Import Directly)

| BMAD Pattern | Why It Fits PDE | How to Import |
|-------------|----------------|---------------|
| **Agent persona definitions** (analyst, architect, PM roles) | PDE has 12+ agent types but no formal persona specs. BMAD's named agents with defined communication styles, principles, and critical_actions formalize existing PDE agents. | Add persona YAML frontmatter to PDE agent markdown files in `agents/` directory |
| **Product Brief workflow** | PDE's `/pde:ideate` produces ideas but no formal brief artifact. BMAD's create-product-brief workflow (Analyst → PM handoff) fills this gap. | Import as `/pde:brief-advanced` skill or enhance existing `/pde:brief` |
| **PRD creation workflow** | PDE lacks a formal PRD step. BMAD's PRD template with structured requirements, epics, and acceptance criteria maps cleanly to `.planning/` | Import as new `/pde:prd` skill, output to `.planning/PRD.md` |
| **Architecture document workflow** | PDE produces design system artifacts but no formal architecture document. BMAD's Architect agent produces `ARCHITECTURE.md` with DB schema, API spec, deployment strategy. | Import as new `/pde:architecture` skill, output to `.planning/ARCHITECTURE.md` |
| **Context sharding via story files** | PDE's DESIGN-STATE.md coverage flags are the equivalent mechanism. BMAD formalizes this as 1KB atomic story files. PDE can adopt story-file atomicity for implementation phase handoff. | Enhance `/pde:handoff` to produce atomic story files per component |
| **check-implementation-readiness workflow** | PDE has `/pde:critique` for design quality. BMAD's readiness check for implementation (architecture review + story validation) fills a gap before development begins. | Import as new `/pde:ready` skill or add readiness gate to `/pde:handoff` |
| **Phase-gated artifact directory** | BMAD segregates `planning-artifacts/` vs `implementation-artifacts/`. PDE uses `.planning/design/` and `.planning/` root. BMAD's segregation pattern prevents artifact confusion. | Mirror in `.planning/` as `.planning/planning-artifacts/` and `.planning/implementation-artifacts/` |

### High-Fit PAUL Patterns (Import Directly)

| PAUL Pattern | Why It Fits PDE | How to Import |
|-------------|----------------|---------------|
| **PLAN.md format** (YAML frontmatter + XML task structure) | PDE's PLAN.md exists but has no formal schema. PAUL's format (objective, context, AC, tasks with files/action/verify/done, boundaries) would formalize PDE's planning artifacts. | Adopt as PDE's canonical PLAN.md schema; update `/pde:plan` to produce it |
| **Acceptance-Driven Development (A.D.D.)** | PDE pipeline stages have implicit completion criteria (DESIGN-STATE.md flags). PAUL's A.D.D. makes criteria explicit (BDD Given/When/Then) before tasks begin. | Add AC section to PLAN.md schema; update DESIGN-STATE.md to reference ACs |
| **UNIFY closure mandate** | PDE has session state but no forced reconciliation step. PAUL's UNIFY (create SUMMARY.md, compare planned vs. actual, record decisions, update STATE.md) maps exactly to PDE's milestone close pattern. | Enhance `/pde:milestone:close` or add `/pde:unify` as explicit loop closure |
| **`/paul:progress` — ONE next action** | PDE's `/pde:status` shows pipeline state. PAUL's progress command surfaces exactly one next action, reducing decision fatigue on resume. | Enhance `/pde:status` to always end with "Your one next action is: [X]" |
| **`/paul:resume` — restore from STATE.md** | PDE has STATE.md but no explicit resume command. Sessions start without context restoration. | Add `/pde:resume` that reads STATE.md and proposes the single next action |
| **`/paul:discuss` pre-planning** | PDE lacks a structured "discuss before committing" step. PAUL's discuss command captures decisions before a plan is written. | Add `/pde:discuss [phase]` as a pre-planning command |
| **`/paul:assumptions`** | No equivalent in PDE. Surfaces Claude's intended approach before planning, enabling course correction before work begins. | Add `/pde:assumptions [phase]` to surface approach before plan commits |
| **`/paul:plan-fix` — UAT fix planning** | PDE has no structured path from UAT failure to fix plan. PAUL's plan-fix generates a targeted repair plan from UAT issues. | Add `/pde:plan-fix` as a quality stage complement to `/pde:verify` |
| **SPECIAL-FLOWS.md skill gating** | Analogous to PDE's DESIGN-STATE.md stage gates. PAUL's format declares required skills that must load before execution proceeds. | Import SPECIAL-FLOWS.md format into `.planning/` as skill dependency registry |
| **Boundary protection (`DO NOT CHANGE`)** | PDE's protected-files mechanism serves this need. PAUL's explicit PLAN.md boundary sections make it task-scoped (per-plan) rather than global. | Add `<boundaries>` section to PLAN.md; reference PDE's existing protected-files list |

### Low-Fit / Do Not Import

| Pattern | Why It Does NOT Fit PDE | Alternative |
|---------|------------------------|-------------|
| **BMAD `_bmad/` directory structure** | PDE uses `.planning/` as its canonical state root. Introducing `_bmad/` alongside `.planning/` creates two competing state locations. PDE's state model must remain singular. | Import BMAD *patterns* and *artifact formats* into `.planning/`, not the `_bmad/` directory hierarchy itself |
| **BMAD `_bmad-output/` separate from project** | BMAD separates framework files (`_bmad/`) from outputs (`_bmad-output/`). PDE's `.planning/` unifies both. Splitting would break existing 34+ commands that read/write `.planning/`. | Keep `.planning/` as unified state. Adopt BMAD's planning-artifacts/implementation-artifacts subdirectory split *within* `.planning/`. |
| **BMAD `npx bmad-method install` lifecycle** | PDE is a Claude Code plugin — users install via `claude plugin install`, not npx. BMAD's installer creates `_bmad/`, generates IDE-specific command files, and handles module selection. This conflicts with PDE's plugin install mechanism. | Embed BMAD patterns as PDE skills + templates. No separate installer. |
| **BMAD agent YAML compilation pipeline** | BMAD compiles `.agent.yaml` → `.md` via `YamlXmlBuilder` and a Zod validation schema. PDE agents are already markdown. The compilation pipeline is BMAD's internal tooling, not a pattern to import. | Adopt BMAD's agent YAML *schema fields* (persona, principles, critical_actions, menu) as a specification for PDE's agent markdown format, without the compiler. |
| **CARL dynamic rule injection** | CARL monitors prompt keywords and injects rules just-in-time. This requires a background hook system outside Claude Code's execution model. PDE is session-based; there is no persistent rule monitor. | The *concept* (rules scoped to context) can inform how PDE loads stage-specific guidance in CLAUDE.md or per-skill preambles. Do not build a CARL port. |
| **PAUL `npx paul-framework` installation** | Same conflict as BMAD installer — PDE's installation mechanism is the Claude Code plugin system. | Import PAUL patterns as PDE skill implementations. No separate npx installation. |
| **BMAD "always start a fresh chat per workflow"** | BMAD recommends fresh chats to avoid agent context conflicts. PDE orchestrates a 13-stage pipeline in a single session (by design). Adopting fresh-chat isolation would break pipeline continuity. | PDE's single-session pipeline is correct for its use case. Use BMAD's context isolation insight selectively: isolate only the business analysis agents (analyst, PM) that benefit from fresh context; keep design/implementation pipeline in-session. |
| **PAUL subagent cost avoidance for implementation** | PAUL discourages subagents for implementation because they cost 2,000-3,000 tokens and produce ~70% quality. PDE uses parallel wave orchestration as a core capability. | PDE's parallel waves are for research/discovery (correct per PAUL's model). Implementation stays in-session. Both agree. No conflict — no change needed. |
| **BMAD Party Mode (multiple agent personas in one session)** | Party Mode lets users call `*analyst`, `*pm`, `*architect` in sequence in one chat, switching personas. This conflicts with PDE's pipeline model where each stage is a separate skill with its own system prompt. | PDE skills already represent specialized agents. The separation-of-concerns is achieved through skill boundaries, not in-session persona switching. |

---

## Recommended Stack Additions for v0.6

No new npm dependencies. No new runtime technologies. PDE's zero-npm-dependency constraint is preserved.

### New Files to Create

| File | Type | Purpose |
|------|------|---------|
| `skills/pde-prd.md` | PDE skill | New `/pde:prd` command — BMAD-pattern PRD creation (Analyst → PM workflow) |
| `skills/pde-architecture.md` | PDE skill | New `/pde:architecture` command — BMAD-pattern architecture document |
| `skills/pde-ready.md` | PDE skill | New `/pde:ready` command — implementation readiness check |
| `skills/pde-resume.md` | PDE skill | New `/pde:resume` command — PAUL-pattern context restoration from STATE.md |
| `skills/pde-discuss.md` | PDE skill | New `/pde:discuss [phase]` — PAUL-pattern pre-planning decision capture |
| `skills/pde-assumptions.md` | PDE skill | New `/pde:assumptions` — surface intended approach before planning commits |
| `skills/pde-plan-fix.md` | PDE skill | New `/pde:plan-fix` — PAUL-pattern UAT fix planning |
| `templates/PLAN.md` | Template | PAUL-format PLAN.md schema (YAML frontmatter + XML task structure) |
| `templates/PRD.md` | Template | BMAD-pattern PRD template (requirements, epics, user stories, AC) |
| `templates/ARCHITECTURE.md` | Template | BMAD-pattern architecture doc (DB schema, API spec, deployment) |
| `templates/story.md` | Template | BMAD-pattern atomic story file (~1KB per component) |
| `references/bmad-methodology.md` | Reference | BMAD phase structure, agent roles, workflow patterns for agent consumption |
| `references/paul-methodology.md` | Reference | PAUL loop mechanics, A.D.D. patterns, UNIFY contract for agent consumption |

### Existing Files to Enhance

| File | Enhancement |
|------|-------------|
| `skills/pde-plan.md` | Adopt PAUL's PLAN.md schema (objective, AC, tasks with files/action/verify/done, boundaries) |
| `skills/pde-brief.md` | Add BMAD Analyst-phase probing questions before brief creation; structured product brief format |
| `skills/pde-handoff.md` | Add BMAD story-file generation: atomic story files per component in `.planning/implementation-artifacts/` |
| `skills/pde-status.md` | Add PAUL's "exactly one next action" output at end of status display |
| `skills/pde-critique.md` | Add BMAD implementation readiness check as an optional `--implementation` mode |
| `workflows/milestone-new.md` | Add PAUL `discuss-milestone` step before planning begins |
| `workflows/milestone-close.md` | Add PAUL UNIFY contract: compare planned vs. actual, record decisions, update STATE.md |
| `.planning/PLAN.md` (template) | Migrate to PAUL's XML task structure with AC references |
| `.planning/STATE.md` (template) | Add PAUL STATE.md fields: loop position marker, accumulated decisions, blocked work |

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Import patterns as PDE skills | Install BMAD via `npx bmad-method install` alongside PDE | Only if user explicitly wants to run BMAD as a standalone parallel system; creates dual state-location conflict with PDE |
| Adopt PAUL's PLAN.md format as PDE canonical schema | Keep PDE's current loose PLAN.md format | Never — current format lacks the AC/verify/boundaries structure that prevents scope drift |
| Reference methodology docs in `.planning/research/` | Embed full BMAD/PAUL docs in CLAUDE.md system prompt | CLAUDE.md should stay lean; methodology docs belong in references/ where agents can load them selectively |
| Enhance existing `/pde:brief` with Analyst patterns | Create separate BMAD-branded analyst agent | PDE's `/pde:` namespace is unified; sub-branding confuses users |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| BMAD `_bmad/` directory at project root | Conflicts with PDE's `.planning/` state model; two competing roots | Import artifact formats and workflow patterns into `.planning/` subdirectories |
| CARL rule injection system as a port | Requires persistent background hooks; incompatible with Claude Code session-based execution | Apply CARL's principle (context-scoped rules) via per-skill preambles in existing PDE skill files |
| PAUL's `npx paul-framework` installer | PDE installs as a Claude Code plugin; separate npx installers bypass plugin mechanisms | Implement PAUL patterns as native PDE skills under `/pde:` namespace |
| BMAD Party Mode (in-session persona switching) | Breaks PDE's pipeline model where stage separation is enforced by skill boundaries | PDE's skill-per-stage IS the persona isolation mechanism; no in-session switching needed |
| BMAD "fresh chat per workflow" recommendation | Breaks PDE's 13-stage pipeline continuity | Use BMAD's insight for business analysis stages only; keep design/implementation pipeline in-session |
| BMAD `npx bmad-method install` module system | Installs IDE-specific files outside PDE's plugin structure | Import only the source YAML agent schemas and workflow step patterns; not the installer output |

---

## Stack Patterns by Variant

**If importing BMAD patterns only (business analysis, architecture):**
- Focus on: PRD template, ARCHITECTURE.md template, Analyst/PM/Architect agent personas
- New skills: `/pde:prd`, `/pde:architecture`, `/pde:ready`
- Skip: Implementation-phase BMAD patterns (sprint planning, story creation) — PDE's pipeline handles implementation

**If importing PAUL patterns only (loop discipline, state management):**
- Focus on: PLAN.md schema, STATE.md enhancement, UNIFY closure, A.D.D. acceptance criteria
- New skills: `/pde:resume`, `/pde:discuss`, `/pde:assumptions`, `/pde:plan-fix`
- Enhance: `/pde:plan`, `/pde:status`, milestone workflows

**If importing both (v0.6 target):**
- BMAD provides: agent role specialization, business analysis depth, artifact structure for planning phases
- PAUL provides: loop discipline, acceptance criteria rigor, state management discipline, session continuity
- These are complementary — BMAD defines what to produce; PAUL defines how to produce it with discipline

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| BMAD v6.2.0 | Node.js v20+ | Current stable release (2026-03-15). No Node.js dependency for PDE since patterns are imported as markdown, not the npm package. |
| PAUL (latest) | Claude Code plugin API | No version pinning needed — PDE imports the methodology patterns, not the npx distribution |
| PDE v0.5 (current) | BMAD patterns imported as skills | Zero npm dependency constraint preserved — no `npx bmad-method` at plugin root |

---

## Sources

- **BMAD-METHOD GitHub** (HIGH confidence): `https://github.com/bmad-code-org/BMAD-METHOD` — v6.2.0, directory structure, README, AGENTS.md
- **BMAD Official Docs** (HIGH confidence): `https://docs.bmad-method.org/` — version info, module catalog, agent roster
- **BMAD Agent Technical Reference** (HIGH confidence): `https://deepwiki.com/bmad-code-org/BMAD-METHOD/7-agent-technical-reference` — .agent.yaml schema, Zod validation, compilation pipeline, all 9 agent definitions
- **BMAD Workflow Reference** (HIGH confidence): `https://deepwiki.com/bmad-code-org/BMAD-METHOD/8-workflow-reference` — full workflow catalog, entry formats, variable resolution, state persistence
- **BMAD Getting Started** (HIGH confidence): `https://deepwiki.com/bmad-code-org/BMAD-METHOD/2-getting-started` — post-install directory structure, config.yaml schema, agent activation pattern
- **BMAD Implementation Guide** (MEDIUM confidence): `https://buildmode.dev/blog/mastering-bmad-method-2025/` — four-phase lifecycle, context sharding detail, agent interactions
- **BMAD Complete Methodology Guide** (MEDIUM confidence): `https://redreamality.com/garden/notes/bmad-method-guide/` — agent corps table, config format, workflow variants
- **BMAD-AT-CLAUDE** (MEDIUM confidence): `https://github.com/24601/BMAD-AT-CLAUDE` — Claude Code-specific adaptation, bmad-core directory structure, story file pattern
- **PAUL GitHub** (HIGH confidence): `https://github.com/ChristopherKahler/paul` — full command reference (26 commands), PLAN.md format, STATE.md structure, SPECIAL-FLOWS.md format, config.md format
- **CARL GitHub** (HIGH confidence): `https://github.com/ChristopherKahler/carl` — .carl/ directory structure, rule format, activation mechanics, PAUL integration
- **Skillsmith GitHub** (MEDIUM confidence): `https://github.com/smith-horn/skillsmith` — MCP-based skill discovery, trust tiers, install mechanics
- **Christopher Kahler ecosystem** (MEDIUM confidence): `https://github.com/ChristopherKahler` — AEGIS, BASE, SEED ecosystem overview

---

*Stack research for: PDE v0.6 — BMAD + PAUL methodology import*
*Researched: 2026-03-19*
