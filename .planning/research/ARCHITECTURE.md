# Architecture Research

**Domain:** Design pipeline integration — adding 7 design skills to existing PDE plugin (v1.1 milestone)
**Researched:** 2026-03-15
**Confidence:** HIGH (all components inspected from source; no training-data speculation)

---

## Focus

This document answers the specific v1.1 architecture question: how do the 7 design pipeline skills (brief, flows, system, wireframe, critique, iterate, handoff) integrate with PDE's existing architecture? It does not re-document the general plugin architecture (see ARCHITECTURE.md from v1.0 research for that baseline).

---

## Standard Architecture

### System Overview

The design pipeline slots into PDE's existing layered architecture at exactly two points: the command/workflow layer (7 new skill implementations) and the state layer (a new `.planning/design/` subtree). No other layers change.

```
┌─────────────────────────────────────────────────────────────┐
│                     User Entry Points                        │
│  /pde:brief  /pde:flows  /pde:system  /pde:wireframe        │
│  /pde:critique  /pde:iterate  /pde:handoff  /pde:build      │
└────────────────────────────┬────────────────────────────────┘
                             │ reads workflow .md file
┌────────────────────────────▼────────────────────────────────┐
│                    Workflow Layer (NEW)                       │
│  workflows/brief.md      workflows/flows.md                 │
│  workflows/system.md     workflows/wireframe.md             │
│  workflows/critique.md   workflows/iterate.md               │
│  workflows/handoff.md    workflows/build.md  (orchestrator) │
└────────────────────────────┬────────────────────────────────┘
                             │ spawns (optional, for sub-tasks)
┌────────────────────────────▼────────────────────────────────┐
│                    Agent Layer (unchanged)                    │
│  Existing: pde-executor, pde-planner, pde-verifier, etc.    │
│  New (optional): pde-design-critiquer (multi-perspective)   │
└────────────────────────────┬────────────────────────────────┘
                             │ reads/writes
┌────────────────────────────▼────────────────────────────────┐
│                    Tooling Layer (unchanged)                  │
│  bin/pde-tools.cjs — existing; no new commands required     │
│  (design state managed as plain markdown files, not via CLI) │
└────────────────────────────┬────────────────────────────────┘
                             │ writes to
┌────────────────────────────▼────────────────────────────────┐
│                    State Layer (NEW subtree)                  │
│                                                              │
│  .planning/                                                  │
│  ├── PROJECT.md        (unchanged)                           │
│  ├── ROADMAP.md        (unchanged)                           │
│  ├── STATE.md          (unchanged)                           │
│  └── design/           ← NEW subtree                        │
│      ├── DESIGN-STATE.md          (root index, write-locked) │
│      ├── design-manifest.json     (machine-readable index)  │
│      ├── strategy/                                           │
│      │   ├── DESIGN-STATE.md     (strategy domain state)    │
│      │   └── BRF-brief-v1.md    (/pde:brief output)         │
│      ├── ux/                                                  │
│      │   ├── DESIGN-STATE.md     (ux domain state)          │
│      │   ├── FLW-main-v1.md     (/pde:flows output)         │
│      │   ├── WFR-login-v1.html  (/pde:wireframe output)     │
│      │   └── WFR-dashboard-v1.html                          │
│      ├── visual/                                             │
│      │   ├── DESIGN-STATE.md     (visual domain state)      │
│      │   ├── SYS-tokens.json    (/pde:system DTCG source)   │
│      │   ├── SYS-colors.css                                  │
│      │   ├── SYS-typography.css                              │
│      │   └── SYS-preview.html                               │
│      ├── assets/                                             │
│      │   └── tokens.css          (unified token file)       │
│      ├── review/                                             │
│      │   ├── DESIGN-STATE.md     (review domain state)      │
│      │   └── CRT-wireframes-v1.md (/pde:critique output)    │
│      └── handoff/                                            │
│          ├── DESIGN-STATE.md     (handoff domain state)     │
│          └── HND-spec-v1.md     (/pde:handoff output)       │
└──────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Status |
|-----------|----------------|--------|
| `commands/brief.md` | Declare `/pde:brief` slash command; reference `workflows/brief.md` | EXISTS (stub) — needs full implementation |
| `commands/flows.md` | Declare `/pde:flows` slash command; reference `workflows/flows.md` | EXISTS (stub) — needs full implementation |
| `commands/system.md` | Declare `/pde:system` slash command; reference `workflows/system.md` | EXISTS (stub) — needs full implementation |
| `commands/wireframe.md` | Declare `/pde:wireframe` slash command; reference `workflows/wireframe.md` | EXISTS (stub) — needs full implementation |
| `commands/critique.md` | Declare `/pde:critique` slash command; reference `workflows/critique.md` | EXISTS (stub) — needs full implementation |
| `commands/iterate.md` | Declare `/pde:iterate` slash command; reference `workflows/iterate.md` | EXISTS (stub) — needs full implementation |
| `commands/handoff.md` | Declare `/pde:handoff` slash command; reference `workflows/handoff.md` | EXISTS (stub) — needs full implementation |
| `commands/build.md` | Declare `/pde:build` slash command; reference `workflows/build.md` | MISSING — needs creation |
| `workflows/brief.md` | Implement brief generation: read PROJECT.md, produce BRF-brief-v{N}.md, update DESIGN-STATE | MISSING — needs creation |
| `workflows/flows.md` | Implement flow mapping: read brief, produce FLW-*.md Mermaid diagrams | MISSING — needs creation |
| `workflows/system.md` | Implement design system: produce SYS-*.css token files + preview | MISSING — needs creation |
| `workflows/wireframe.md` | Implement wireframing: read flows+system, produce WFR-*.html files | MISSING — needs creation |
| `workflows/critique.md` | Implement multi-perspective critique: read wireframes, produce CRT-*.md report | MISSING — needs creation |
| `workflows/iterate.md` | Implement iteration: read critique + artifacts, produce updated versions | MISSING — needs creation |
| `workflows/handoff.md` | Implement handoff: read all design artifacts, produce HND-spec-v{N}.md with TypeScript interfaces | MISSING — needs creation |
| `workflows/build.md` | Orchestrate full pipeline: run brief→flows→system→wireframe→critique→iterate→handoff in sequence | MISSING — needs creation |
| `templates/design-brief.md` | Canonical structure for brief output | EXISTS — ready |
| `templates/user-flow.md` | Canonical structure for flows output | EXISTS — ready |
| `templates/design-system.md` | Canonical structure for design system output | EXISTS — ready |
| `templates/wireframe-spec.md` | Canonical structure for wireframe output | EXISTS — ready |
| `templates/critique-report.md` | Canonical structure for critique output | EXISTS — ready |
| `templates/handoff-spec.md` | Canonical structure for handoff output | EXISTS — ready |
| `templates/design-state-root.md` | Canonical structure for root DESIGN-STATE.md | EXISTS — ready |
| `templates/design-state-domain.md` | Canonical structure for per-domain DESIGN-STATE.md files | EXISTS — ready |
| `templates/design-manifest.json` | Canonical structure for machine-readable artifact index | EXISTS — ready |
| `.planning/design/` | All design artifacts produced by pipeline skills | MISSING — created by first design skill run |

---

## Recommended Project Structure (Delta from v1.0)

Only showing what changes for v1.1. Existing structure is unchanged.

```
pde/
├── commands/
│   ├── brief.md          # EXISTS — upgrade stub to full skill
│   ├── flows.md          # EXISTS — upgrade stub to full skill
│   ├── system.md         # EXISTS — upgrade stub to full skill
│   ├── wireframe.md      # EXISTS — upgrade stub to full skill
│   ├── critique.md       # EXISTS — upgrade stub to full skill
│   ├── iterate.md        # EXISTS — upgrade stub to full skill
│   ├── handoff.md        # EXISTS — upgrade stub to full skill
│   └── build.md          # NEW — orchestrator command
├── workflows/
│   ├── brief.md          # NEW — full workflow implementation
│   ├── flows.md          # NEW — full workflow implementation
│   ├── system.md         # NEW — full workflow implementation
│   ├── wireframe.md      # NEW — full workflow implementation
│   ├── critique.md       # NEW — full workflow implementation
│   ├── iterate.md        # NEW — full workflow implementation
│   ├── handoff.md        # NEW — full workflow implementation
│   └── build.md          # NEW — pipeline orchestrator
└── templates/
    └── [all design templates exist already — no additions needed]

# Per-project state (created at runtime, not in plugin repo):
.planning/design/
├── DESIGN-STATE.md           # root index
├── design-manifest.json      # machine-readable artifact registry
├── assets/
│   └── tokens.css            # unified token file (symlinked or concatenated)
├── strategy/                 # /pde:brief artifacts
├── ux/                       # /pde:flows + /pde:wireframe artifacts
├── visual/                   # /pde:system artifacts
├── review/                   # /pde:critique artifacts
└── handoff/                  # /pde:handoff artifacts
```

### Structure Rationale

- **commands/ stub → full:** The stub files already exist (created in v1.0 Phase 11 to eliminate dangling references). They need their `<process>` block replaced with a reference to the new workflow file. No structural change — same pattern as all 29 existing commands.
- **workflows/build.md as orchestrator:** Follows the Workflow-as-Orchestrator pattern exactly. It reads DESIGN-STATE.md to determine what's already done, then calls each skill's workflow in sequence via SlashCommand invocation or by embedding the workflow process inline.
- **.planning/design/ domain split:** The domain directories (strategy, ux, visual, review, handoff) mirror the skill groupings. Each domain has its own DESIGN-STATE.md so skills can write to their domain without locking the root file. Root DESIGN-STATE.md is the cross-domain index, updated after each skill completes.
- **assets/ at design root:** Wireframes reference `../../assets/tokens.css` — this path is baked into the wireframe template. The assets directory must sit two levels above wireframe files, which places it at `.planning/design/assets/` when wireframes are at `.planning/design/ux/`.

---

## Architectural Patterns

### Pattern 1: Skill-as-Self-Contained-Workflow

**What:** Each design skill is a complete, independently runnable workflow. It reads the artifacts it needs, produces its artifacts, updates DESIGN-STATE, and updates design-manifest.json. Running `/pde:wireframe` works whether or not `/pde:build` was used.

**When to use:** Every design skill follows this pattern. Skills are not steps in a larger function — they are independent operations that happen to share a data store.

**Trade-offs:** Slightly more state-checking logic per skill (each must read what exists and validate prerequisites). Payoff: users can run any skill standalone without being forced through the full pipeline. This is a core product requirement.

**Implementation:**
```markdown
# In each workflow file:
1. Read .planning/design/DESIGN-STATE.md to see what artifacts exist
2. Check prerequisite artifacts (e.g., brief requires PROJECT.md; wireframe requires SYS)
3. If prerequisites missing: warn user, offer to run prerequisite skill first
4. Produce output artifacts
5. Update domain DESIGN-STATE.md (artifact index, staleness tracker)
6. Update root DESIGN-STATE.md cross-domain dependency map
7. Update design-manifest.json
8. Display summary table per skill-style-guide.md conventions
```

### Pattern 2: Artifact Versioning via Filename Suffix

**What:** Every artifact filename includes a version suffix: `BRF-brief-v1.md`, `WFR-login-v2.html`. Re-running a skill creates a new versioned file rather than overwriting. DESIGN-STATE.md tracks current version per artifact.

**When to use:** All artifact-producing skills. Never overwrite existing artifacts.

**Trade-offs:** Directory accumulates files over iterations. Payoff: complete version history preserved; can reference which critique was based on which wireframe version; iterate is always applied to the correct upstream version.

**Staleness cascade:** When a parent artifact updates (e.g., SYS v1 → v2), the Staleness Tracker in DESIGN-STATE.md marks all dependent artifacts (wireframes) as stale. Skills check staleness on startup and warn the user.

### Pattern 3: DESIGN-STATE as Distributed Write-Locked Index

**What:** DESIGN-STATE uses a two-tier structure. The root `.planning/design/DESIGN-STATE.md` is the cross-domain index, protected by a write lock. Domain DESIGN-STATE files (e.g., `ux/DESIGN-STATE.md`) are written by their domain's skill on completion. Only the main conversation context writes to the root; subagents write to their domain file then return a summary for the main context to merge.

**When to use:** Any time multiple skills might run concurrently (as in `/pde:build`). The lock prevents root file corruption.

**Trade-offs:** One extra merge step after each skill in orchestrated mode. Payoff: safe for parallel sub-skill execution in future; prevents partial writes corrupting the index.

**Write protocol:**
```
Skill runs (in any context)
    ↓ writes artifacts to domain directory
    ↓ writes domain DESIGN-STATE.md
    ↓ returns summary to orchestrator/main context
Main context:
    ↓ acquires write lock on root DESIGN-STATE.md
    ↓ merges domain summary into cross-domain dependency map
    ↓ releases lock
    ↓ updates design-manifest.json
```

### Pattern 4: Token Dependency for Staleness Tracking

**What:** When `/pde:system` runs, it writes a token inventory to `design-manifest.json` under `tokenDependencyMap`. When `/pde:wireframe` runs, it records which tokens it consumed. When `/pde:system` produces a v2 (new token values), the manifest update propagates staleness to all wireframes that consumed changed tokens.

**When to use:** Always — implemented as part of each skill's DESIGN-STATE update step.

**Trade-offs:** Adds token-recording overhead to wireframe and handoff skills. Payoff: users know exactly which wireframes need refreshing when the design system changes, instead of re-running everything.

---

## Data Flow

### Standalone Skill Invocation

```
User invokes /pde:wireframe "login, dashboard"
    ↓
Workflow reads .planning/design/DESIGN-STATE.md
    ↓ checks: brief exists? flows exist? design system exists?
    ↓ (if any missing: warn + prompt)
Workflow reads .planning/PROJECT.md (product context)
Workflow reads .planning/design/strategy/BRF-brief-v1.md (design brief)
Workflow reads .planning/design/ux/FLW-main-v1.md (user flows)
Workflow reads .planning/design/assets/tokens.css (design tokens)
    ↓
Workflow produces:
  .planning/design/ux/WFR-login-v1.html
  .planning/design/ux/WFR-dashboard-v1.html
    ↓
Workflow updates:
  .planning/design/ux/DESIGN-STATE.md (artifact index + staleness)
    ↓ (main context merges)
  .planning/design/DESIGN-STATE.md (cross-domain map)
  .planning/design/design-manifest.json (hasWireframes: true, artifact entries)
    ↓
Summary table displayed to user
Next suggested skill: /pde:critique
```

### /pde:build Orchestrated Pipeline

```
User invokes /pde:build
    ↓
Workflow reads .planning/design/DESIGN-STATE.md
    ↓ identifies which stages are complete, which are missing
    ↓ (if all done: offer --force to re-run)

For each incomplete stage in order:
  [1] brief:     reads PROJECT.md → produces BRF-brief-v1.md
  [2] flows:     reads BRF        → produces FLW-*.md
  [3] system:    reads BRF        → produces SYS-*.css + tokens.css
  [4] wireframe: reads FLW + SYS  → produces WFR-*.html (one per flow screen)
  [5] critique:  reads WFR        → produces CRT-*.md
  [6] iterate:   reads CRT + WFR  → produces WFR-*-v2.html (revised)
  [7] handoff:   reads all        → produces HND-spec-v1.md

Each stage:
  - Invokes the skill's workflow logic (inline or via SlashCommand)
  - Waits for completion before proceeding
  - Updates DESIGN-STATE.md after each stage
  - Reports progress to user: "Stage N/7: [name] complete"

    ↓
Final output:
  - Summary: all artifacts produced, paths, suggested next: /pde:execute-phase
  - design-manifest.json fully populated
  - DESIGN-STATE.md cross-domain map complete
```

### Data Flow Between Skills (Artifact Dependencies)

```
PROJECT.md (project context — always available)
    │
    ▼
BRF-brief-v{N}.md   ← /pde:brief reads PROJECT.md
    │
    ├──────────────────────────────┐
    ▼                              ▼
FLW-*-v{N}.md                 SYS-*.css + tokens.css
(/pde:flows reads BRF)        (/pde:system reads BRF)
    │                              │
    └──────────┬───────────────────┘
               ▼
        WFR-*-v{N}.html
        (/pde:wireframe reads FLW + SYS)
               │
               ▼
        CRT-*-v{N}.md
        (/pde:critique reads WFR)
               │
               ▼
        WFR-*-v{N+1}.html    (updated wireframes)
        (/pde:iterate reads CRT + WFR, produces new WFR version)
               │
               ▼
        HND-spec-v{N}.md
        (/pde:handoff reads BRF + FLW + SYS + WFR + CRT)
```

### State Management (Design Pipeline)

```
.planning/design/DESIGN-STATE.md   (root index)
    ↑ written by main context only (write-locked)
    ↓ read by all skills at startup

.planning/design/{domain}/DESIGN-STATE.md   (per-domain)
    ↑ written by skill that owns that domain
    ↓ read by downstream skills

.planning/design/design-manifest.json   (machine-readable)
    ↑ updated by every artifact-producing skill
    ↓ read by /pde:build (to determine pipeline progress)
    ↓ read by /pde:handoff (to determine design coverage)
    ↓ read by future engineering phases (to import design context)
```

### Key Data Flows

1. **Project context → Brief:** `/pde:brief` reads `.planning/PROJECT.md` and `.planning/REQUIREMENTS.md` to ground the design brief in already-approved requirements. This is the only place design connects to the planning state.

2. **Brief → All other skills:** The brief is the single anchor document. Flows, system, and wireframe all read it for product type, personas, and scope. Brief updates cascade stale flags to all downstream artifacts.

3. **Design system → Wireframes:** Wireframes reference `../../assets/tokens.css` at the HTML level. This file is produced by `/pde:system`. Wireframes without a design system use product-type-aware fallback colors (defined in wireframe workflow logic, not a separate file).

4. **Critique → Iterate:** The critique report's "Action List" section is a structured checklist that `/pde:iterate` reads to know which issues to address. Iterate does not re-read the full critique — it reads the action list and targeted artifact sections.

5. **All design → Handoff:** `/pde:handoff` reads `design-manifest.json` first to discover all available artifacts, then reads each artifact to extract implementation specs. It synthesizes TypeScript interfaces and component APIs from the wireframe structure.

6. **Handoff → Engineering:** The `design-manifest.json` file is the bridge between the design pipeline and future engineering phases. When `/pde:plan-phase` runs in future milestones, it reads `design-manifest.json` to discover what design context is available and informs the planner.

---

## Integration Points

### Design Pipeline ↔ Existing Planning State

| Integration Point | Direction | What Crosses |
|------------------|-----------|--------------|
| `PROJECT.md` | Planning → Design | Product type, target users, requirements, constraints |
| `REQUIREMENTS.md` | Planning → Design | Approved feature scope (brief uses this to define design scope) |
| `design-manifest.json` | Design → Planning | Routes, components, token refs (informs engineering phase planning) |
| `HND-spec-v1.md` | Design → Planning | Component APIs, TypeScript interfaces (directly usable by executor agents) |

**Critical:** Design skills read planning state but do not write to it. Planning skills do not read design state in v1.1 (that bridge is optional for future milestones). The handoff spec is the one-way output that engineering consumes.

### Internal Skill Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `/pde:brief` → `/pde:flows` | `BRF-brief-v{N}.md` file | Flows reads the produced brief; no direct invocation |
| `/pde:flows` → `/pde:wireframe` | `FLW-*-v{N}.md` files | Wireframe reads flow diagrams to determine which screens to create |
| `/pde:system` → `/pde:wireframe` | `assets/tokens.css` file | Token file path is baked into wireframe template HTML |
| `/pde:wireframe` → `/pde:critique` | `WFR-*-v{N}.html` files | Critique reads HTML structure + inline annotations |
| `/pde:critique` → `/pde:iterate` | `CRT-*-v{N}.md` action list | Iterate reads the structured checklist, not full report |
| All skills → `/pde:handoff` | `design-manifest.json` | Handoff discovers all artifacts via manifest, then reads each |
| `/pde:build` → all skills | Sequential invocation | Build checks DESIGN-STATE.md to determine what's done, runs each incomplete stage |

### Design Skills ↔ Existing Tooling

| Integration | Notes |
|-------------|-------|
| `bin/pde-tools.cjs commit` | Design skills commit produced artifacts via existing commit command — no new CLI commands needed |
| `lib/ui/render.cjs banner` | Design skills use existing banner renderer for stage headers — same as all existing skills |
| `references/skill-style-guide.md` | Design skills follow existing output conventions (summary table, flags) — already referenced in stub files |
| `references/mcp-integration.md` | Design skills probe available MCPs (Figma, Playwright, Axe) — same probe/use/degrade pattern as other skills |

---

## Suggested Build Order (v1.1 Implementation)

Skills have explicit data dependencies that dictate build order within the v1.1 implementation effort.

### Dependency Graph for Implementation

```
Phase 1: Foundation artifacts (no skill dependencies)
  → /pde:brief (depends only on PROJECT.md — always available)
  → /pde:system (depends only on BRF — can be built immediately after brief)
  → DESIGN-STATE infrastructure (root + domain templates, design-manifest.json)

Phase 2: Flow-dependent artifacts
  → /pde:flows (depends on BRF)
  → /pde:wireframe (depends on FLW + SYS — both now available)

Phase 3: Critique cycle
  → /pde:critique (depends on WFR)
  → /pde:iterate (depends on CRT + WFR)

Phase 4: Terminal skill
  → /pde:handoff (depends on all — built last)

Phase 5: Orchestrator
  → /pde:build (depends on all 7 skills being implemented — built last)
```

### Recommended Roadmap Phase Sequence

| Build Phase | Skills / Components | Dependencies Satisfied | Deliverable |
|-------------|--------------------|-----------------------|-------------|
| 1 | DESIGN-STATE infrastructure + design-manifest.json schema | none | `.planning/design/` directory structure + state file templates created by first skill run |
| 2 | `/pde:brief` workflow | PROJECT.md (always present) | BRF artifact, DESIGN-STATE initialized |
| 3 | `/pde:system` workflow | BRF (from phase 2) | SYS token files, `assets/tokens.css` |
| 4 | `/pde:flows` workflow | BRF (from phase 2) | FLW Mermaid diagrams |
| 5 | `/pde:wireframe` workflow | FLW (phase 4) + SYS (phase 3) | WFR HTML files with token integration |
| 6 | `/pde:critique` workflow | WFR (phase 5) | CRT critique report with action list |
| 7 | `/pde:iterate` workflow | CRT (phase 6) + WFR (phase 5) | Updated WFR versions |
| 8 | `/pde:handoff` workflow | All prior artifacts + design-manifest.json | HND spec with TypeScript interfaces |
| 9 | `/pde:build` orchestrator | All 7 skills complete | Orchestrated pipeline, --dry-run support |

**Note:** Phases 3 and 4 (`/pde:system` and `/pde:flows`) can be implemented in parallel since they share only the BRF dependency. Phase 5 (`/pde:wireframe`) must wait for both.

---

## Anti-Patterns

### Anti-Pattern 1: Writing to Root DESIGN-STATE.md from Subagents

**What people do:** Have each skill or Task() subagent write directly to `.planning/design/DESIGN-STATE.md`.

**Why it's wrong:** Concurrent skill execution (in `/pde:build`) causes write conflicts. DESIGN-STATE.md becomes corrupted with interleaved partial updates. The design-state-root template explicitly documents this: "Only the main conversation writes to DESIGN-STATE. Subagents return data summaries."

**Do this instead:** Skills write to their domain DESIGN-STATE.md only. The main conversation (or build orchestrator) merges domain state into the root DESIGN-STATE.md with the write lock pattern.

### Anti-Pattern 2: Skills Calling Other Skills via Workflow Embedding

**What people do:** Implement `/pde:wireframe` by embedding the full `/pde:flows` workflow inline ("if flows don't exist, run flows first").

**Why it's wrong:** Creates hidden coupling between skills. Stack-depths become unpredictable. The "standalone" property of each skill becomes false — wireframe now silently consumes flows' tokens.

**Do this instead:** Skills check prerequisites and report clearly: "Brief not found at `.planning/design/strategy/BRF-brief-v1.md`. Run `/pde:brief` first, then re-run `/pde:wireframe`." Only `/pde:build` orchestrates multi-skill execution. Skills are leaves; build is the orchestrator.

### Anti-Pattern 3: Storing Design Artifacts Outside .planning/design/

**What people do:** Write wireframes to `./wireframes/`, design tokens to `./src/tokens.css`, or other ad-hoc locations.

**Why it's wrong:** Breaks the design-manifest.json discovery mechanism. `/pde:handoff` cannot find artifacts. Future engineering phase skills cannot read design context. The wireframe template hardcodes `../../assets/tokens.css` — this path only works if wireframes are inside `.planning/design/ux/`.

**Do this instead:** All design artifacts go in `.planning/design/{domain}/`. Token files go in `.planning/design/assets/`. The template paths are authoritative.

### Anti-Pattern 4: Overwriting Artifact Files on Re-Run

**What people do:** Re-running `/pde:wireframe "login"` overwrites `WFR-login-v1.html` with updated content.

**Why it's wrong:** Destroys the version history. The critique was based on v1 — if v1 is overwritten, the critique report now references a file that differs from what was critiqued. Staleness tracking becomes meaningless.

**Do this instead:** Every re-run creates `WFR-login-v2.html`. DESIGN-STATE.md current version pointer is updated. The v1 file remains as audit trail.

### Anti-Pattern 5: /pde:build as a Monolithic Workflow

**What people do:** Implement `/pde:build` as one large workflow file containing all 7 skill implementations inline.

**Why it's wrong:** Defeats standalone usability. Makes each skill untestable independently. Context window bloat (one massive workflow). Maintenance becomes a single-point-of-failure.

**Do this instead:** `/pde:build` is a thin orchestrator. It reads DESIGN-STATE.md, determines what's incomplete, and invokes each skill's existing workflow sequentially (via SlashCommand or inline process embedding with explicit file-based handoff). The skill logic lives in its own workflow file.

---

## Scaling Considerations

Design pipeline scaling is about artifact volume and iteration depth, not request concurrency.

| Scenario | Architecture Adjustments |
|----------|--------------------------|
| Small project (3-5 screens) | Default: sequential, single iteration cycle, brief → handoff in one build run |
| Medium project (10-20 screens) | Wireframe by screen group; critique per group; multiple iterate passes per group |
| Large project (50+ screens) | Domain-specific DESIGN-STATE.md files prevent the root index from becoming unwieldy; each skill can scope to a specific screen or group via argument filtering |
| Re-run after design system change | Staleness tracker in DESIGN-STATE.md identifies affected wireframes; user re-runs `/pde:wireframe` for stale screens only |

### Scaling Priorities

1. **First bottleneck:** Wireframe HTML file size grows with screen complexity. At 20+ screens, the ux/ domain directory becomes large. Mitigation: screen-group argument filtering (e.g., `/pde:wireframe "auth-group"`) was designed into the wireframe command's `argument-hint`.
2. **Second bottleneck:** DESIGN-STATE.md cross-domain dependency map becomes verbose at 50+ artifacts. Mitigation: domain-split DESIGN-STATE.md files — the root only holds the cross-domain index, not full artifact details.

---

## Sources

All findings are derived from direct inspection of PDE source at `/Users/greyaltaer/code/projects/Platform Development Engine/`.

Key files inspected:

- `commands/brief.md`, `flows.md`, `system.md`, `wireframe.md`, `critique.md`, `iterate.md`, `handoff.md` — current stub implementations
- `templates/design-brief.md`, `user-flow.md`, `design-system.md`, `wireframe-spec.md`, `critique-report.md`, `handoff-spec.md` — existing canonical templates
- `templates/design-state.md`, `design-state-root.md`, `design-state-domain.md` — DESIGN-STATE structure (already fully designed)
- `templates/design-manifest.json` — machine-readable artifact index schema (already designed)
- `templates/pipeline-state.md` — pipeline state schema
- `workflows/new-project.md` — Workflow-as-Orchestrator pattern baseline
- `references/skill-style-guide.md` — output conventions all skills must follow
- `references/mcp-integration.md` — MCP probe/use/degrade pattern
- `.planning/PROJECT.md` — v1.1 requirements and scope
- `.planning/STATE.md` — current project state and decisions

**Confidence level: HIGH** — No design pipeline workflows exist yet, so this is forward-looking architecture. However, all templates, DESIGN-STATE schemas, and design-manifest.json schemas are already implemented and authoritative. The architecture described here is fully derived from those existing schemas plus the established PDE workflow patterns.

---

*Architecture research for: Design pipeline integration with PDE plugin (v1.1 milestone)*
*Researched: 2026-03-15*
