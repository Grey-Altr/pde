# Architecture Research

**Domain:** PDE design pipeline — v1.2 advanced skill integration
**Researched:** 2026-03-16
**Confidence:** HIGH — all components inspected from source; no training-data speculation

---

## Focus

This document answers the v1.2 architecture question: how do the 6 new skills (ideate, competitive, opportunity, mockup, hig, recommend) integrate with PDE's existing v1.1 architecture? It does not re-document the base pipeline (see v1.1 research for that baseline). Everything here is about integration points, new vs modified, data flow changes, and build order.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          /pde:build Orchestrator                            │
│         (reads designCoverage, invokes skills in order via Skill())         │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┤
│   brief  │  system  │  flows   │ wireframe│ critique │  iterate │  handoff │
│  EXISTS  │  EXISTS  │  EXISTS  │  EXISTS  │  EXISTS  │  EXISTS  │  EXISTS  │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘

NEW SKILLS (v1.2) — two pipeline positions:

  Pre-pipeline research (run before brief or standalone):
  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
  │   recommend  │   │ competitive  │   │ opportunity  │   │    ideate    │
  │  stub→full   │   │  stub→full   │   │  stub→full   │   │   NEW cmd    │
  └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘

  Post-iterate / pre-handoff:
  ┌──────────────┐   ┌──────────────┐
  │    mockup    │   │     hig      │
  │  stub→full   │   │  stub→full   │
  └──────────────┘   └──────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                   pde-tools.cjs  (bin/lib/design.cjs)                       │
│  ensure-dirs  |  coverage-check  |  manifest-update  |  lock-acquire/rel   │
│  manifest-set-top-level  |  manifest-read  |  artifact-path  |  tokens-css │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      .planning/design/ (file store)                         │
│  strategy/     ux/     visual/     review/     handoff/     assets/         │
│  DESIGN-STATE.md   design-manifest.json   (domain DESIGN-STATE.md files)   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

### Existing Components (v1.1 — unchanged)

| Component | Responsibility | Location |
|-----------|----------------|----------|
| `/pde:build` | Orchestrator — reads designCoverage, invokes skills via Skill() in order | `commands/build.md` + `workflows/build.md` |
| `/pde:brief` | Produce BRF artifact, write strategy/BRF-brief-v{N}.md | `commands/brief.md` + `workflows/brief.md` |
| `/pde:system` | Produce SYS artifact (design tokens CSS), set hasDesignSystem | `commands/system.md` + `workflows/system.md` |
| `/pde:flows` | Produce FLW artifact, set hasFlows | `commands/flows.md` + `workflows/flows.md` |
| `/pde:wireframe` | Produce WFR artifacts (HTML), set hasWireframes | `commands/wireframe.md` + `workflows/wireframe.md` |
| `/pde:critique` | Produce CRT artifact, set hasCritique | `commands/critique.md` + `workflows/critique.md` |
| `/pde:iterate` | Produce ITR artifact, set hasIterate | `commands/iterate.md` + `workflows/iterate.md` |
| `/pde:handoff` | Produce HND artifacts, set hasHandoff | `commands/handoff.md` + `workflows/handoff.md` |
| `pde-tools.cjs design` | Design CLI subcommands: dirs, manifest CRUD, lock, coverage | `bin/pde-tools.cjs` + `bin/lib/design.cjs` |
| `design-manifest.json` | Artifact registry + designCoverage flags (single source of truth for orchestrator) | `.planning/design/design-manifest.json` |
| `DESIGN-STATE.md` | Root state: write-lock, artifact index, staleness tracker, decision log | `.planning/design/DESIGN-STATE.md` |
| `skill-style-guide.md` | Output conventions: flags, progress format, summary table, error patterns, MCP tags | `references/skill-style-guide.md` |
| `mcp-integration.md` | MCP probe/use/degrade patterns, debug logging, --no-mcp flags | `references/mcp-integration.md` |
| `strategy-frameworks.md` | RICE scoring, Porter's Five Forces, competitive positioning SVG templates | `references/strategy-frameworks.md` |

### New Components (v1.2 — build these)

| Component | Responsibility | Location |
|-----------|----------------|----------|
| `/pde:recommend` | Scan project context, recommend MCPs and tools; produces REC artifact | `commands/recommend.md` (stub→full) + `workflows/recommend.md` (new) |
| `/pde:competitive` | Structured competitive landscape analysis; produces CMP artifact | `commands/competitive.md` (stub→full) + `workflows/competitive.md` (new) |
| `/pde:opportunity` | RICE-score opportunities from competitive gaps + user input; produces OPP artifact | `commands/opportunity.md` (stub→full) + `workflows/opportunity.md` (new) |
| `/pde:mockup` | Generate hi-fi HTML/CSS mockups from wireframes + design tokens; produces MCK artifacts | `commands/mockup.md` (stub→full) + `workflows/mockup.md` (new) |
| `/pde:hig` | WCAG 2.2 AA + platform HIG audit; dual mode; produces HIG artifact | `commands/hig.md` (stub→full) + `workflows/hig.md` (new) |
| `/pde:ideate` | Multi-phase diverge→converge ideation; calls recommend internally via Skill(); produces IDT artifact | `commands/ideate.md` (new — no stub) + `workflows/ideate.md` (new) |
| `templates/ideation-log.md` | Session template for diverge/converge phases | `templates/ideation-log.md` (new) |
| `design-manifest.json` schema | Extended with 6 new coverage flags | `templates/design-manifest.json` (extend) |
| `bin/lib/design.cjs` ensure-dirs | Creates `ux/mockups/` subdirectory | `bin/lib/design.cjs` (modify DOMAIN_DIRS) |

---

## Recommended Project Structure (Delta from v1.1)

Only showing what changes for v1.2. Existing structure is unchanged.

```
commands/
  recommend.md      # stub EXISTS — replace process body with workflow delegation
  competitive.md    # stub EXISTS — replace process body with workflow delegation
  opportunity.md    # stub EXISTS — replace process body with workflow delegation
  mockup.md         # stub EXISTS — replace process body with workflow delegation
  hig.md            # stub EXISTS — replace process body with workflow delegation
  ideate.md         # NEW — no stub exists; create from scratch

workflows/
  recommend.md      # NEW — MCP/tool discovery logic
  competitive.md    # NEW — landscape analysis logic
  opportunity.md    # NEW — RICE scoring logic
  mockup.md         # NEW — hi-fi HTML/CSS generation logic
  hig.md            # NEW — WCAG/HIG audit logic
  ideate.md         # NEW — diverge→converge orchestration
  build.md          # MODIFIED — expand pipeline from 7 to 12-13 stages

templates/
  competitive-landscape.md    # EXISTS — output template for /pde:competitive
  opportunity-evaluation.md   # EXISTS — output template for /pde:opportunity
  mockup-spec.md              # EXISTS — metadata template for /pde:mockup
  hig-audit.md                # EXISTS — output template for /pde:hig
  recommendations.md          # EXISTS — output template for /pde:recommend
  ideation-log.md             # NEW — diverge/converge session template

# Per-project state (runtime):
.planning/design/
  strategy/
    BRF-brief-v{N}.md           # existing
    CMP-competitive-v{N}.md     # NEW — /pde:competitive output
    OPP-opportunity-v{N}.md     # NEW — /pde:opportunity output
    IDT-ideation-v{N}.md        # NEW — /pde:ideate output
    REC-recommendations-v{N}.md # NEW — /pde:recommend output
  ux/
    wireframes/                 # existing WFR-*.html files
    mockups/                    # NEW subdirectory
      MCK-{slug}-v{N}.html      # hi-fi HTML mockup per screen
      mockup.css                # shared mockup stylesheet
      mockup.js                 # shared mockup interaction bundle
  review/
    CRT-critique-v{N}.md        # existing
    HIG-audit-v{N}.md           # NEW — /pde:hig output
```

### Structure Rationale

- **`strategy/` for all pre-pipeline artifacts:** CMP, OPP, IDT, REC are strategic research artifacts that inform or precede the brief. They belong with BRF in the strategy domain — not in review (which is for post-wireframe quality checks) and not in ux (which is for interaction design artifacts).
- **`ux/mockups/` subdirectory:** Mockups are distinct from wireframes in fidelity and purpose. The subdirectory prevents naming collisions with WFR files (both use screen slug names) while keeping both under the ux domain.
- **`review/` for HIG audit:** HIG produces a compliance findings report — the same pattern as critique (CRT). Both are review-gate artifacts produced after design artifacts exist.
- **Stub upgrade pattern:** All 5 new skill command stubs already exist with "Status: Planned" process bodies. Upgrading means replacing just the `<process>` block with the workflow delegation pattern. The frontmatter (name, description, allowed-tools) can stay or be augmented.

---

## Architectural Patterns

### Pattern 1: Skill Anatomy (universal — all v1.1 skills follow this exactly)

**What:** Every skill is a command stub (`commands/skill.md`) that delegates to a workflow (`workflows/skill.md`). The workflow follows a 7-step template: init dirs → check prerequisites → probe MCPs → generate output → write artifact (with write-lock) → update domain DESIGN-STATE → update root DESIGN-STATE + manifest + coverage flag.

**When to use:** All 6 new v1.2 skills must follow this exact anatomy. No deviations.

**Example (command stub upgrade pattern):**

```markdown
---
name: pde:competitive
description: Run competitive analysis for your product space
argument-hint: '"product description" [--quick] [--standard] [--deep] [--force]'
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
---
<objective>
Execute the /pde:competitive command.
</objective>

<process>
Follow @workflows/competitive.md exactly.

Pass all of $ARGUMENTS to the workflow.
</process>
```

The `Task` tool in allowed-tools is for subagent use within the workflow (e.g., research agents). The build orchestrator uses `Skill()`, not `Task()`.

### Pattern 2: Coverage Flag Ownership (read-before-set — prevents clobber)

**What:** Each skill owns exactly one coverage flag. Setting a flag always requires reading the full `designCoverage` object first (via `design coverage-check`), merging the new flag value, then writing the complete merged object via `manifest-set-top-level`. This read-before-set pattern is how v1.1 skills prevent overwriting each other's flags.

**New flags required for v1.2** (extend `templates/design-manifest.json` designCoverage schema):

```json
"designCoverage": {
  "hasDesignSystem":    false,
  "hasWireframes":      false,
  "hasFlows":           false,
  "hasHardwareSpec":    false,
  "hasCritique":        false,
  "hasIterate":         false,
  "hasHandoff":         false,
  "hasCompetitive":     false,
  "hasOpportunity":     false,
  "hasMockup":          false,
  "hasHigAudit":        false,
  "hasIdeation":        false,
  "hasRecommendations": false
}
```

**Read-before-set bash pattern** (copy from any existing skill's Step 7):

```bash
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
# Parse JSON, merge {hasCompetitive: true}, write ALL fields back atomically
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{c},...,"hasCompetitive":true,...}'
```

### Pattern 3: Artifact Code Convention

**What:** Every artifact type gets a 3-letter code used as the artifact key in the manifest, the filename prefix, and the basis for the coverage flag name.

**Established codes (v1.1):** BRF, SYS, FLW, WFR, CRT, ITR, HND

**New codes for v1.2:**

| Skill | Artifact Code | Coverage Flag | Filename Pattern | Domain |
|-------|---------------|---------------|-----------------|--------|
| /pde:competitive | CMP | hasCompetitive | `CMP-competitive-v{N}.md` | strategy |
| /pde:opportunity | OPP | hasOpportunity | `OPP-opportunity-v{N}.md` | strategy |
| /pde:ideate | IDT | hasIdeation | `IDT-ideation-v{N}.md` | strategy |
| /pde:recommend | REC | hasRecommendations | `REC-recommendations-v{N}.md` | strategy |
| /pde:mockup | MCK | hasMockup | `MCK-{slug}-v{N}.html` | ux/mockups |
| /pde:hig | HIG | hasHigAudit | `HIG-audit-v{N}.md` | review |

### Pattern 4: Soft Prerequisites (warn and continue — not hard-block)

**What:** Skills warn when upstream artifacts are missing but produce output anyway. The only established hard-block is critique's CRT-02 (both brief AND flows absent). New skills should default to soft prerequisites.

**Application to new skills:**

- `/pde:competitive`: warn if no BRF exists; use $ARGUMENTS product description as context fallback
- `/pde:opportunity`: warn if no CMP exists; allow user to provide candidate list directly
- `/pde:ideate`: no hard dependencies — runnable at any project stage
- `/pde:recommend`: no hard dependencies — runnable at any project stage
- `/pde:mockup`: **hard-block** if the requested screen slug has no corresponding WFR file (cannot generate hi-fi from nothing); warn (not block) if no SYS tokens exist (use CSS fallbacks inline)
- `/pde:hig`: warn if no WFR and no MCK files exist; warn if no SYS tokens (skip token-aware checks section); proceed with whatever artifacts are available

### Pattern 5: HIG Dual-Mode Design

**What:** The HIG skill has two modes — light (embedded in /pde:critique as the existing Accessibility perspective) and full (standalone /pde:hig). These are not the same execution path and do not share code. The "light" pass is the existing critique workflow's Step 4 Accessibility evaluation, unchanged. The "full" pass is a new separate skill that runs the complete 56-criterion WCAG 2.2 audit against all available artifacts.

**Key decision:** Do NOT introduce a cross-skill dependency between critique and hig. Critique's Accessibility perspective remains self-contained in `workflows/critique.md`. The HIG skill is additive and independent. Some overlap in findings between CRT and HIG is acceptable — different output format, different consumer (designer vs QA gate).

**Dual mode flag for hig skill:** The hig workflow should support a `--light` flag that produces a condensed report (same as what critique would surface) for users who want a quick standalone accessibility check without running critique.

### Pattern 6: Recommend as Ideation Sub-Component

**What:** `/pde:recommend` works as a standalone command AND as an internal step in `/pde:ideate`. During ideation's diverge phase, a "tool landscape" step surfaces relevant tools to inform what's possible — this calls recommend internally.

**How to invoke:** The build orchestrator's proven pattern is `Skill("pde:recommend", args="...")`. The ideate workflow must use the same `Skill()` invocation — never `Task()`. Issue #686 (nested-agent freeze) applies to Task(); Skill() is immune.

**Important:** ideate's internal recommend call passes `--quick` to recommend so the diverge phase doesn't block on a full deep scan. The user can always run `/pde:recommend` standalone for a full scan.

---

## Data Flow

### Pre-Pipeline Research Flow (new for v1.2)

```
User invokes /pde:ideate or /pde:competitive (or /pde:build starts pipeline)
          |
          v
/pde:recommend  →  REC-recommendations-v{N}.md  (.planning/design/strategy/)
(optional; ideate calls it internally via Skill("pde:recommend", "--quick"))
          |
          v
/pde:competitive  →  CMP-competitive-v{N}.md  (.planning/design/strategy/)
(reads BRF if available; uses WebSearch MCP if available; uses strategy-frameworks.md)
          |
          v
/pde:opportunity  →  OPP-opportunity-v{N}.md  (.planning/design/strategy/)
(reads CMP for candidate pre-population; applies RICE + design extensions from strategy-frameworks.md)
          |
          v
/pde:ideate  →  IDT-ideation-v{N}.md  (.planning/design/strategy/)
(reads CMP + OPP for informed diverge phase; Skill("pde:recommend", "--quick") during diverge)
          |
          v
/pde:brief (existing) — reads IDT, CMP, OPP as optional enrichment context
```

### Post-Wireframe / Pre-Handoff Flow (new for v1.2)

```
/pde:iterate completes  (existing, sets hasIterate: true)
          |
          v
/pde:mockup  →  MCK-{slug}-v{N}.html  (.planning/design/ux/mockups/)
(reads WFR-{slug}-v{N}.html and SYS tokens.css; produces one hi-fi file per screen)
          |
          v
/pde:hig (full mode)  →  HIG-audit-v{N}.md  (.planning/design/review/)
(reads WFR + MCK + SYS tokens; full 56-criterion WCAG 2.2 audit across all screens)
          |
          v
/pde:handoff (existing) — reads all artifacts including MCK + HIG as available inputs
```

### Design Manifest State Flow

```
First run:
  ensure-dirs initializes design-manifest.json
  → v1.1: 7 coverage flags (all false)
  → v1.2: 13 coverage flags (all false) — from updated template

Each skill's final step:
  coverage-check  (reads all current flags from manifest)
  → merge {thisSkillsFlag: true} while preserving all other values
  → manifest-set-top-level designCoverage (writes all 13 flags atomically)

/pde:build orchestrator:
  → reads designCoverage ONCE at Step 2
  → determines pending stages from flags
  → invokes pending stages via Skill() in order
  → NEVER writes to manifest (strictly read-only orchestrator invariant)
  → coverage-check result from Step 2 remains valid for entire pipeline run
    (re-reading between stages would cause false-complete readings)
```

### DESIGN-STATE Write-Lock Flow (unchanged from v1.1)

```
Skill Step 5: lock-acquire {skill_code}
  → if lock held (non-expired): retry 3x at 5s intervals
  → if lock acquired: write artifact files
  → lock-release (ALWAYS — even on error)

Concurrent write protection via:
  1. Write-lock protocol (in-session serialization)
  2. Read-before-set coverage flag pattern (cross-skill flag isolation)
  3. Each skill owns a unique flag (no flag is written by two skills)
```

---

## Extended Pipeline Order for /pde:build

The `workflows/build.md` file requires modification to support the expanded pipeline. The new canonical order (13 stages total):

```
Pre-pipeline research (new):
  Stage 1:  /pde:recommend    → hasRecommendations
  Stage 2:  /pde:competitive  → hasCompetitive
  Stage 3:  /pde:opportunity  → hasOpportunity
  Stage 4:  /pde:ideate       → hasIdeation

Core pipeline (existing, renumbered):
  Stage 5:  /pde:brief        → BRF glob (unchanged detection method)
  Stage 6:  /pde:system       → hasDesignSystem
  Stage 7:  /pde:flows        → hasFlows
  Stage 8:  /pde:wireframe    → hasWireframes
  Stage 9:  /pde:critique     → hasCritique
  Stage 10: /pde:iterate      → hasIterate

Post-wireframe (new):
  Stage 11: /pde:mockup       → hasMockup
  Stage 12: /pde:hig          → hasHigAudit

Terminal (existing, renumbered):
  Stage 13: /pde:handoff      → hasHandoff
```

The orchestrator's established invariants are unchanged: read coverage-check once at Step 2, never re-read between stages, never write to manifest, use Skill() not Task(), skip stages in strict order.

The "pipeline complete" message and summary table must be updated to reflect 13 stages. The `--dry-run` output table extends to 13 rows.

---

## Integration Points: New vs Modified

### New Components (create from scratch)

| Component | Type | Notes |
|-----------|------|-------|
| `workflows/recommend.md` | New workflow | 7-step skill anatomy; output to strategy/ |
| `workflows/competitive.md` | New workflow | 7-step skill anatomy; loads strategy-frameworks.md |
| `workflows/opportunity.md` | New workflow | 7-step skill anatomy; reads CMP artifact for candidates |
| `workflows/mockup.md` | New workflow | 7-step skill anatomy; outputs HTML to ux/mockups/ |
| `workflows/hig.md` | New workflow | 7-step skill anatomy; full WCAG 56-criterion checklist |
| `workflows/ideate.md` | New workflow | Multi-phase structure; calls Skill("pde:recommend") internally |
| `commands/ideate.md` | New command | No existing stub; create with standard command frontmatter |
| `templates/ideation-log.md` | New template | Diverge/converge session format; consumed by /pde:ideate |

### Modified Components (change existing files)

| Component | Change | Risk |
|-----------|--------|------|
| `commands/recommend.md` | Replace "Status: Planned" body with workflow delegation | LOW — additive swap, no frontmatter change needed |
| `commands/competitive.md` | Replace "Status: Planned" body with workflow delegation | LOW — additive swap |
| `commands/opportunity.md` | Replace "Status: Planned" body with workflow delegation | LOW — additive swap |
| `commands/mockup.md` | Replace "Status: Planned" body with workflow delegation | LOW — additive swap |
| `commands/hig.md` | Replace "Status: Planned" body with workflow delegation | LOW — additive swap |
| `workflows/build.md` | Extend pipeline from 7 to 13 stages; add new flags to designCoverage reads; update stage table and summary | MEDIUM — touches orchestrator; test coverage-check after design-manifest schema extension |
| `templates/design-manifest.json` | Add 6 new flags to designCoverage schema | LOW — additive; existing flags unaffected |
| `bin/lib/design.cjs` DOMAIN_DIRS | Add `'ux/mockups'` to directory creation list in ensureDesignDirs | LOW — additive; existing directories unaffected |

### Unchanged Components (do not touch)

All 7 existing skill workflows (`brief.md`, `system.md`, `flows.md`, `wireframe.md`, `critique.md`, `iterate.md`, `handoff.md`) are unchanged. The expanded pipeline wraps around them without modifying their logic. The critique workflow's existing Accessibility perspective already handles the "light HIG" case — no dependency injection needed.

---

## Anti-Patterns

### Anti-Pattern 1: Writing to the Manifest from the Orchestrator

**What people do:** Add manifest writes to `workflows/build.md` when adding new stages.

**Why it's wrong:** The orchestrator is strictly read-only. Adding manifest writes creates a race condition with each skill's own coverage flag write. Existing skills rely on the read-before-set pattern; the orchestrator touching designCoverage would clobber a skill's pending write.

**Do this instead:** Each new skill owns its own flag and sets it in its final step. The orchestrator detects completion by reading the flag the skill set — same mechanism for all 13 stages.

### Anti-Pattern 2: Re-Reading Coverage Between Stages in the Orchestrator

**What people do:** Call `coverage-check` after each completed stage in build.md to "confirm" the stage is done before proceeding.

**Why it's wrong:** Explicitly documented in build.md's anti-patterns: "NEVER re-read coverage-check between stages." Re-reading mid-pipeline can produce false-complete readings on the current run.

**Do this instead:** Read coverage-check exactly once at Step 2. Trust the single read. Each skill sets its flag on completion; the orchestrator does not need to confirm.

### Anti-Pattern 3: Using Task() for Recommend Inside Ideate

**What people do:** In `workflows/ideate.md`, use `Task("pde:recommend", ...)` to invoke recommend during the diverge phase.

**Why it's wrong:** Issue #686 — nested Task agents freeze the session. This is the same reason build.md uses Skill() for all sub-skill invocations.

**Do this instead:** `Skill("pde:recommend", args="--quick")`. The build orchestrator has proven this pattern is safe for sub-skill invocation across all 7 existing stages.

### Anti-Pattern 4: Placing Pre-Pipeline Artifacts Outside strategy/

**What people do:** Write competitive analysis to `review/` ("it's analysis") or to a separate top-level directory.

**Why it's wrong:** Pre-pipeline research artifacts (CMP, OPP, IDT, REC) are strategic inputs that inform the brief and design direction. Placing them in `review/` mixes them with post-wireframe quality checks (CRT, HIG), making the artifact index confusing. The strategy domain is specifically for upstream decision inputs.

**Do this instead:** All pre-pipeline artifacts go in `strategy/` alongside BRF. All review-gate findings go in `review/` (CRT, HIG).

### Anti-Pattern 5: Sharing Logic Between Critique's Accessibility Perspective and HIG

**What people do:** Extract critique's accessibility checks into a shared library or have critique call hig internally.

**Why it's wrong:** Creates a coupling where critique's Step 4 now depends on hig being installed. The skills break standalone usability when separated. Also, the two have different output formats and consumers — overlap in findings is acceptable, shared execution code is not.

**Do this instead:** Critique's Accessibility perspective (Step 4, weight 1.5x) remains self-contained in critique.md using wcag-baseline.md. HIG runs its own full audit from its own workflow. Accept the intentional overlap — both are useful, to different people at different moments.

### Anti-Pattern 6: Hard-Blocking Brief on Missing Competitive Analysis

**What people do:** Add a prerequisite check to `/pde:brief` requiring CMP to exist first.

**Why it's wrong:** Breaks the existing pipeline entry point. Users who have always started with `/pde:brief` would suddenly get blocked. The skill independence invariant says all skills must work standalone without other skills having run first.

**Do this instead:** Brief checks for CMP and IDT as soft dependencies. If present, brief uses them as enrichment context. If absent, brief works exactly as it did in v1.1. The pre-pipeline skills are optional front-loading, not gates.

---

## Scaling Considerations

This is a local-file, single-user plugin. Traditional scaling concerns do not apply. Relevant constraints for v1.2:

| Concern | Current State | v1.2 Impact | Mitigation |
|---------|---------------|-------------|------------|
| Context window per skill | Large workflows (~600-800 lines each) | 6 new skill workflows add to total plugin footprint | Each workflow loads references on-demand via @; not loaded unless skill runs |
| Pipeline length | 7 stages | 13 stages in orchestrated build | yolo mode auto-continues; users who want just brief→handoff can still run /pde:build and skip pre-pipeline stages (already-false flags cause skips) |
| designCoverage size | 7 flags (~200 bytes JSON) | 13 flags (~350 bytes JSON) | Negligible; coverage-check parses this as-is |
| design/ directory | strategy/, ux/, visual/, review/, handoff/, assets/ | +`ux/mockups/` subdirectory | ensure-dirs must add it to DOMAIN_DIRS in design.cjs |
| MCK filename collisions | None (new artifact type) | MCK-{slug}-v{N}.html must use same slug convention as WFR | Enforce: MCK slug must match its source WFR slug |

The `ensure-dirs` command in `bin/lib/design.cjs` must be updated. The `DOMAIN_DIRS` constant currently creates flat directories. `ux/mockups` is a nested subdirectory that requires either adding it to DOMAIN_DIRS with `path.join` handling, or adding a separate post-loop mkdir call for nested dirs.

---

## Build Order Recommendation

Order from lowest to highest dependency depth:

```
[Phase 1] Schema and infrastructure
  ├── templates/design-manifest.json — add 6 new coverage flags (unblocks all)
  └── bin/lib/design.cjs — add ux/mockups to ensureDesignDirs (unblocks mockup)

[Phase 2] Independent pre-pipeline skills (no deps on each other)
  ├── /pde:recommend  — workflow + command upgrade
  └── /pde:competitive — workflow + command upgrade  (parallel with recommend)

[Phase 3] Dependent pre-pipeline + independent post-wireframe skills
  ├── /pde:opportunity — workflow + command upgrade  (after competitive)
  ├── /pde:mockup      — workflow + command upgrade  (parallel with opportunity)
  └── /pde:hig         — workflow + command upgrade  (parallel with opportunity)

[Phase 4] Compound skill
  └── /pde:ideate — command + workflow  (after recommend + competitive + opportunity exist)

[Phase 5] Orchestrator expansion
  └── workflows/build.md — extend to 13 stages  (after all new skills proven standalone)
```

This order means Phase 1 is the only blocking phase. Phases 2-4 can be validated standalone before Phase 5 wires them into the orchestrated pipeline.

---

## Sources

All findings are derived from direct inspection of PDE source at `/Users/greyaltaer/code/projects/Platform Development Engine/`.

Key files inspected:

- `workflows/build.md` — orchestrator implementation and anti-patterns documentation
- `workflows/critique.md` — full 7-step skill anatomy reference implementation
- `workflows/handoff.md` — coverage flag read-before-set pattern reference
- `bin/lib/design.cjs` — ensureDesignDirs, acquireWriteLock, coverage-check implementation
- `bin/pde-tools.cjs` — full design subcommand CLI surface
- `templates/design-manifest.json` — designCoverage schema (7 existing flags)
- `templates/design-state.md` — write-lock protocol documentation
- `templates/competitive-landscape.md` — CMP output format (already designed)
- `templates/opportunity-evaluation.md` — OPP output format (already designed)
- `templates/mockup-spec.md` — MCK metadata format (already designed)
- `templates/hig-audit.md` — HIG output format (already designed)
- `templates/recommendations.md` — REC output format (already designed)
- `references/skill-style-guide.md` — output conventions all skills must follow
- `references/mcp-integration.md` — MCP probe/use/degrade pattern
- `references/strategy-frameworks.md` — RICE and Porter's Five Forces (already designed)
- All 5 stub command files: `commands/recommend.md`, `competitive.md`, `opportunity.md`, `mockup.md`, `hig.md`
- `.planning/PROJECT.md` — v1.2 requirements, key decisions, architecture statement

**Confidence: HIGH** — All templates, references, and stub commands for v1.2 are already in place. This architecture is derived entirely from existing source artifacts, not from speculation or training-data inference.

---

*Architecture research for: PDE v1.2 advanced skill integration*
*Researched: 2026-03-16*
