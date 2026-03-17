# Architecture Research

**Domain:** PDE v1.3 — self-improvement fleet, skill builder, design quality elevation, pressure testing
**Researched:** 2026-03-17
**Confidence:** HIGH — all components derived from direct source inspection; no training-data speculation

---

## Focus

This document answers the v1.3 architecture question: how do self-improvement capabilities, skill building, design quality elevation, and pressure testing integrate with PDE's existing v1.2 architecture? It does not re-document the base pipeline (see v1.2 research for that baseline). Everything here is about integration points, new vs modified, data flow changes, and build order.

---

## Existing Architecture (Baseline for v1.3)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   /pde:build Orchestrator (13 stages)                        │
│   recommend → competitive → opportunity → ideate → brief → system → flows   │
│        → wireframe → critique → iterate → mockup → hig → handoff            │
├─────────────────────────────────────────────────────────────────────────────┤
│ commands/*.md ──→ workflows/*.md ──→ agents (via Task/Skill resolution)      │
│                                                                              │
│ bin/pde-tools.cjs (CommonJS, Node built-ins only)                           │
│   └── bin/lib/*.cjs (config, design, state, phase, roadmap, milestone, ...)  │
├─────────────────────────────────────────────────────────────────────────────┤
│ .planning/design/ (file store)                                               │
│   strategy/  ux/  ux/mockups/  visual/  review/  handoff/  assets/          │
│   DESIGN-STATE.md   design-manifest.json   (domain DESIGN-STATE files)      │
├─────────────────────────────────────────────────────────────────────────────┤
│ references/  (skill-style-guide, mcp-integration, tooling-patterns, ...)    │
│ templates/   (all output templates)                                          │
│ skill-registry.md                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

Key constraints that v1.3 must respect:
- Zero npm dependencies. All new code is CommonJS Node.js built-ins or LLM-generated content.
- Skill() not Task() for cross-skill invocation (Issue #686 — nested Task agents freeze).
- Each skill owns exactly one coverage flag; orchestrator is read-only.
- All skills follow the 7-step anatomy: init dirs → check prereqs → probe MCPs → generate → write with lock → update domain state → update root state + manifest + coverage flag.
- Skill commands live in `commands/*.md` and delegate to `workflows/*.md`.

---

## System Overview: v1.3 Additions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     NEW: Self-Improvement Layer                              │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │  /pde:audit      │  │  /pde:improve    │  │   Self-Improvement Fleet │  │
│  │  (tool audit)    │  │  (skill builder) │  │   (agent subagents)      │  │
│  └────────┬─────────┘  └────────┬─────────┘  └───────────┬──────────────┘  │
│           │                    │                          │                  │
│           └────────────────────┴──────────────────────────┘                 │
│                                │                                            │
│                   references/quality-standards.md  (NEW)                    │
│                   references/awwwards-patterns.md  (NEW)                    │
│                   templates/skill-template.md  (NEW or EXTEND)              │
├─────────────────────────────────────────────────────────────────────────────┤
│                   MODIFIED: Design Quality Elevation                         │
│                                                                              │
│  system.md    wireframe.md   mockup.md   critique.md   hig.md   handoff.md  │
│  UPGRADED output quality to Awwwards-level via updated references           │
│                                                                              │
│  NEW references: awwwards-patterns.md, motion-design.md, layout-systems.md  │
│  MODIFIED references: typography.md (extended), color-systems.md (elevated) │
├─────────────────────────────────────────────────────────────────────────────┤
│                   NEW: Pressure Test Framework                               │
│                                                                              │
│  /pde:pressure-test  ──→  runs full 13-stage pipeline on real project       │
│                       ──→  measures output against Awwwards quality bar      │
│                       ──→  produces pressure-test-report.md                  │
│                                                                              │
│  (Not a new design skill — a meta-command in the tooling domain)            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

### Existing Components — Unchanged

These components are complete. v1.3 does not touch them unless the self-improvement audit
surfaces a defect.

| Component | Responsibility | Location |
|-----------|----------------|----------|
| `/pde:build` | 13-stage pipeline orchestrator | `commands/build.md` + `workflows/build.md` |
| All 13 design skills | Design pipeline execution | `commands/*.md` + `workflows/*.md` |
| `pde-tools.cjs` | CLI for design, state, phase, milestone ops | `bin/pde-tools.cjs` + `bin/lib/*.cjs` |
| `design-manifest.json` | Artifact registry + 13 coverage flags | `.planning/design/design-manifest.json` |
| `DESIGN-STATE.md` | Write-lock protocol, artifact index | `.planning/design/DESIGN-STATE.md` |
| `skill-style-guide.md` | Output conventions for all skills | `references/skill-style-guide.md` |
| `tooling-patterns.md` | Lint rules, test strategies, smoke tests | `references/tooling-patterns.md` |
| `mcp-integration.md` | MCP probe/use/degrade patterns | `references/mcp-integration.md` |
| `strategy-frameworks.md` | RICE, Porter's Five Forces | `references/strategy-frameworks.md` |
| `typography.md` | Type scale algorithms and presets | `references/typography.md` |
| `web-modern-css.md` | Cascade layers, container queries, CSS nesting | `references/web-modern-css.md` |
| `color-systems.md` | OKLCH, DTCG color patterns | `references/color-systems.md` |

### New Components (v1.3 — build these)

| Component | Responsibility | Location | Type |
|-----------|----------------|----------|------|
| `/pde:audit` | Tool audit — evaluates MCP integrations, agent prompts, templates, output quality against defined standards | `commands/audit.md` + `workflows/audit.md` | NEW |
| `/pde:improve` | Skill builder — creates, updates, or improves skills for PDE itself and for user projects | `commands/improve.md` + `workflows/improve.md` | NEW |
| Self-improvement agent fleet | Specialized subagents: output-quality-auditor, skill-linter, design-quality-evaluator, template-auditor | `bin/lib/model-profiles.cjs` (extend) | EXTEND |
| `references/quality-standards.md` | Awwwards-level criteria: typography, color, motion, composition, layout. The quality bar all self-improvement agents evaluate against | `references/quality-standards.md` | NEW |
| `references/awwwards-patterns.md` | Concrete Awwwards-winning patterns: scroll effects, micro-interactions, type-as-image, asymmetric grids, 3D depth. Reference for design elevation | `references/awwwards-patterns.md` | NEW |
| `references/motion-design.md` | Spring physics, easing curves, choreography patterns, duration scales. Fills gap in existing references | `references/motion-design.md` | NEW |
| `/pde:pressure-test` | End-to-end pipeline run on a real project with quality measurement output | `commands/pressure-test.md` + `workflows/pressure-test.md` | NEW |
| `templates/pressure-test-report.md` | Output template for pressure test results with quality scores per stage | `templates/pressure-test-report.md` | NEW |
| `templates/skill-audit-report.md` | Output template for `/pde:audit` findings per tool/agent/template | `templates/skill-audit-report.md` | NEW |

### Modified Components (v1.3 — surgical edits to existing files)

| Component | Change | Risk | Rationale |
|-----------|--------|------|-----------|
| `workflows/system.md` | Load `references/awwwards-patterns.md` and `references/motion-design.md` via `@`. Elevate generated design system to include motion tokens, advanced typography tokens (optical sizing, variable font axes), and Awwwards-level color palette depth | MEDIUM — requires testing output quality | Design elevation |
| `workflows/wireframe.md` | Upgrade from structural placeholders to design-aware wireframes: grid system annotations, typographic hierarchy marks, spacing rhythm notation. Load updated `references/awwwards-patterns.md` | LOW — additive content change | Design elevation |
| `workflows/mockup.md` | Elevate from functional HTML to Awwwards-level: spring physics animations, CSS scroll-driven animations, variable fonts, advanced grid layouts, micro-interaction states. Reference `references/motion-design.md` | MEDIUM — significant output quality change | Design elevation |
| `workflows/critique.md` | Expand quality bar for visual hierarchy perspective to include Awwwards-level criteria from `references/quality-standards.md`. Load new reference | LOW — additive reference + criteria | Design elevation |
| `workflows/hig.md` | Add motion accessibility audit: `prefers-reduced-motion` checks, animation duration compliance. Reference `references/motion-design.md` | LOW — additive criteria | Design elevation |
| `bin/lib/model-profiles.cjs` | Add 4 new agent entries: `pde-output-quality-auditor`, `pde-skill-linter`, `pde-design-quality-evaluator`, `pde-template-auditor` | LOW — additive entries only | Self-improvement fleet |
| `references/model-profiles.md` | Mirror new agent entries to keep in sync with model-profiles.cjs | LOW — documentation update | Consistency |
| `references/typography.md` | Extend with variable font axes (`font-variation-settings`), optical sizing (`font-optical-sizing`), and advanced tracking/leading tokens for Awwwards-level type | LOW — additive content | Design elevation |
| `skill-registry.md` | Register new skill codes: AUD (audit), IMP (improve), PRT (pressure-test) | LOW — additive table rows | Required by LINT-010 |

### Unchanged Components (do not touch)

The 13-stage pipeline orchestrator (`workflows/build.md`) and all 13 existing design skill workflows are not modified unless the audit explicitly identifies a defect. Self-improvement audit findings drive a targeted fix plan; the audit does not rewrite working skills.

---

## Recommended Project Structure (Delta from v1.2)

Only showing what changes for v1.3. Existing structure is unchanged.

```
commands/
  audit.md            # NEW — tool/agent/template/output quality audit
  improve.md          # NEW — skill builder (create/update/improve skills)
  pressure-test.md    # NEW — end-to-end pipeline pressure test

workflows/
  audit.md            # NEW — 7-step anatomy; spawns fleet subagents
  improve.md          # NEW — 7-step anatomy; reads skill-style-guide + quality-standards
  pressure-test.md    # NEW — orchestrates real-project pipeline run + quality scoring
  system.md           # MODIFIED — loads awwwards-patterns.md, motion-design.md
  wireframe.md        # MODIFIED — loads awwwards-patterns.md for elevated output
  mockup.md           # MODIFIED — loads motion-design.md, spring physics patterns
  critique.md         # MODIFIED — loads quality-standards.md
  hig.md              # MODIFIED — loads motion-design.md for reduced-motion audit

references/
  quality-standards.md    # NEW — Awwwards-level criteria (the quality bar)
  awwwards-patterns.md    # NEW — concrete winning patterns (scroll, micro-interaction, 3D)
  motion-design.md        # NEW — spring physics, easing, choreography, duration scales

templates/
  pressure-test-report.md # NEW — quality-scored pipeline run output
  skill-audit-report.md   # NEW — per-tool/agent/template audit findings

bin/lib/
  model-profiles.cjs  # MODIFIED — add 4 new self-improvement agent entries

# Runtime (per-user project):
.planning/design/
  (no new directories needed — all new skill outputs reuse existing domain dirs)

# Audit outputs (PDE-internal, not per user project):
.planning/
  audit-report.md         # Produced by /pde:audit
  skill-builder-log.md    # Produced by /pde:improve
  pressure-test-report.md # Produced by /pde:pressure-test
```

### Structure Rationale

- **`commands/audit.md` in the tooling domain:** Tool audit is a meta-operation on PDE itself — the same domain as `/pde:health`, `/pde:test`, `/pde:update`. It does not produce design artifacts; it produces a quality report. Does not write to `.planning/design/`.

- **`commands/improve.md` for skill building:** The skill builder creates or modifies `commands/*.md` and `workflows/*.md` files. It is a write operation on PDE's own source files, not on the user's design artifacts. It belongs in the tooling domain alongside `/pde:update` (which updates PDE from GitHub).

- **`commands/pressure-test.md` as a meta-command:** Pressure testing orchestrates a full pipeline run on a real project and evaluates output quality. It is not a new pipeline stage — it invokes `/pde:build` as a whole, then applies quality evaluation. Different from running `/pde:build` because it measures output against the quality bar and produces a scored report.

- **References in `references/` not `templates/`:** Quality standards and Awwwards patterns are inputs to skill execution (loaded via `@`), not output templates. They belong in `references/`.

- **Audit output in `.planning/` not `.planning/design/`:** Audit, skill builder, and pressure test outputs are PDE-internal operational documents, not user design artifacts. They go in `.planning/` at the root level, not in the design artifact hierarchy.

- **No new `designCoverage` flags:** Self-improvement and audit operations are not design artifacts. They do not belong in `design-manifest.json`. The manifest is exclusively for design pipeline artifacts produced for the user's product.

---

## Architectural Patterns

### Pattern 1: Self-Improvement via Reference Injection (design quality elevation)

**What:** Design quality elevation works by upgrading the reference files that skills `@`-include, not by rewriting skill logic. Each design skill (`system`, `wireframe`, `mockup`, `critique`, `hig`) already loads references at runtime via `@references/xxx.md`. Adding new high-quality references and updating existing ones changes what Claude generates without changing the skill's procedural logic.

**When to use:** When the quality bar needs elevation but the skill's structure is correct. The skill anatomy stays the same; the knowledge base improves.

**Trade-offs:** Targeted and low-risk. Output quality improvement is not guaranteed (LLM generation is probabilistic). The new references must be concrete and prescriptive — vague references produce vague improvements.

**Example (workflow modification for design elevation):**
```markdown
<required_reading>
@references/skill-style-guide.md
@references/mcp-integration.md
@references/awwwards-patterns.md    <-- NEW for v1.3
@references/motion-design.md        <-- NEW for v1.3
</required_reading>
```

Contrast with adding skill logic: the 7-step anatomy is unchanged, the steps are unchanged, only the knowledge injected into the prompt changes.

### Pattern 2: Self-Improvement Fleet (agent subagent pattern)

**What:** The self-improvement fleet is a set of specialized subagents spawned by `/pde:audit` via `Task()`. Each agent focuses on one audit domain: output quality, skill linting, design quality evaluation, template auditing. The orchestrating workflow spawns agents in parallel (independent audits) or in sequence (where one audit informs the next).

**When to use:** When audit scope is large enough to warrant specialization. Each agent gets a focused system prompt and a scoped file list.

**Implementation:** Agent types are registered in `bin/lib/model-profiles.cjs`. The audit workflow spawns them using the `resolve-model` CLI command to determine the right Claude model for each agent type and the active profile.

**Example (audit workflow agent spawn):**
```markdown
## Step 3: Spawn output quality auditor

```bash
audit_model=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" resolve-model pde-output-quality-auditor --raw)
```

Spawn Task with system prompt from references/quality-standards.md and the file list of
design skill workflow files. The agent evaluates each workflow's output instructions against
the Awwwards quality bar and returns a structured findings list.
```

**Critical:** Use `Task()` for the fleet subagents (appropriate here — these are analysis agents, not design skills). Do NOT use `Skill()` for subagents. `Skill()` is for invoking named PDE commands. `Task()` is for spawning ad-hoc analysis subagents. The Issue #686 nested-agent freeze applies only when `Task()` is called from inside a `Skill()` context — the audit command is a top-level command, not inside another Skill invocation.

### Pattern 3: Skill Builder (read-modify-write on PDE source)

**What:** `/pde:improve` creates or modifies `commands/*.md` and `workflows/*.md` files to create new skills or improve existing ones. It reads existing skills for pattern compliance, generates the new or modified content following the 7-step skill anatomy and skill-style-guide conventions, and writes the result.

**When to use:** When a user wants to extend PDE with a new skill for their own domain, or when the self-improvement audit identifies a skill that needs improvement.

**Implementation:** The skill builder reads `references/skill-style-guide.md` and `references/tooling-patterns.md` to understand what a valid skill looks like. It reads `skill-registry.md` to validate that new skill codes are unique. It writes the new `commands/*.md` stub and `workflows/*.md` body. It then updates `skill-registry.md` with the new entry.

**Inputs:**
- Existing `commands/*.md` (for pattern examples)
- `references/skill-style-guide.md` (conventions)
- `references/tooling-patterns.md` (lint rules)
- `skill-registry.md` (code uniqueness validation)

**Outputs:**
- `commands/{new-skill}.md`
- `workflows/{new-skill}.md`
- Updated `skill-registry.md`
- `.planning/skill-builder-log.md` (what was built and why)

### Pattern 4: Pressure Test as Pipeline Observer

**What:** `/pde:pressure-test` is not a new pipeline stage. It invokes `/pde:build` on a real project and then evaluates the produced artifacts against quality standards. It is an observer and evaluator, not a producer.

**When to use:** As the final v1.3 validation step, or any time a user wants to verify their project's design pipeline output meets professional standards.

**Implementation:**
1. User specifies a real project directory (or uses the current project)
2. Pressure test runs `/pde:build --force` on the project (full 13-stage pipeline)
3. After completion, spawns a quality-evaluator subagent that reads each produced artifact and scores it against `references/quality-standards.md`
4. Produces `.planning/pressure-test-report.md` with per-artifact scores, aggregate score, and remediation recommendations

**Key architectural decision:** The pressure test does NOT modify `design-manifest.json` or set any `designCoverage` flags. It is a read-only observer. All writes are to `.planning/pressure-test-report.md` only.

### Pattern 5: Awwwards Quality Bar as Codified Reference

**What:** The quality bar for design output is a concrete, enumerated reference file (`references/quality-standards.md`), not a vague instruction to "make it high quality." The reference defines measurable criteria across five domains: typography (type scale ratio, variable font usage, optical sizing), color (OKLCH palette depth, minimum tonal range, semantic color naming), motion (spring physics easing, reduced-motion compliance, choreography principles), composition (grid system type, whitespace density score, visual weight distribution), layout (responsive breakpoint coverage, container query usage, layout primitive choice).

**When to use:** This file is loaded by the self-improvement fleet agents and by the upgraded design skill workflows. Having a single authoritative source prevents drift between what the audit evaluates and what the skills produce.

**Trade-offs:** The criteria need periodic updating as design trends evolve. The reference file is versioned (include a `Version:` header) so skills can detect when they are loading a newer quality bar.

---

## Data Flow

### Self-Improvement Audit Flow

```
User invokes /pde:audit [--focus output-quality|agents|templates|all]
          |
          v
Step 1: Initialize — read all skill files, agent definitions, template files
Step 2: Resolve agent models (pde-output-quality-auditor, pde-skill-linter, etc.)
Step 3: Spawn fleet subagents via Task() in parallel
          |
          +──→ pde-output-quality-auditor → evaluates workflow output sections
          |       against references/quality-standards.md
          |
          +──→ pde-skill-linter → evaluates all commands/*.md and workflows/*.md
          |       against LINT rules in tooling-patterns.md
          |
          +──→ pde-template-auditor → evaluates templates/ against skill expectations
          |
          └──→ pde-design-quality-evaluator → evaluates existing design artifacts
                  (if .planning/design/ has content) against quality-standards.md
          |
          v
Step 4: Aggregate findings from all agents
Step 5: Write .planning/audit-report.md with findings, severity, and action plan
```

### Skill Builder Flow

```
User invokes /pde:improve "create a {name} skill" or "improve {skill-code}"
          |
          v
Mode A: Create new skill
  1. Generate unique 3-letter code (check skill-registry.md for uniqueness)
  2. Determine domain (strategy/ux/visual/review/hardware/tooling/handoff)
  3. Generate commands/{name}.md stub following skill-style-guide.md patterns
  4. Generate workflows/{name}.md body following 7-step anatomy
  5. Update skill-registry.md with new entry
  6. Write .planning/skill-builder-log.md

Mode B: Improve existing skill
  1. Read commands/{skill}.md and workflows/{skill}.md
  2. Spawn pde-skill-linter to identify LINT violations
  3. Spawn pde-output-quality-auditor to identify output quality gaps
  4. Apply targeted fixes following skill-style-guide.md conventions
  5. Write .planning/skill-builder-log.md with diff summary
```

### Design Quality Elevation Flow (Reference-Driven)

```
Existing reference files (typography.md, color-systems.md, web-modern-css.md)
  +
New reference files (awwwards-patterns.md, motion-design.md, quality-standards.md)
          |
          v (loaded via @ at skill execution time)
Upgraded skill workflows (system.md, wireframe.md, mockup.md, critique.md, hig.md)
          |
          v (LLM generates content using enriched knowledge base)
Higher-quality design artifacts in .planning/design/
          |
          v
/pde:pressure-test measures artifacts against quality-standards.md
          |
          v
.planning/pressure-test-report.md with quality scores
```

### Manifest and Coverage: What Does NOT Change

The `designCoverage` schema in `design-manifest.json` is not extended for v1.3. Self-improvement, audit, and pressure test operations are not design artifacts. They do not get coverage flags. The 13 existing flags remain the complete set:

```
hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique,
hasIterate, hasHandoff, hasCompetitive, hasOpportunity, hasMockup,
hasHigAudit, hasIdeation, hasRecommendations
```

---

## Integration Points: New vs Modified

### New Components (create from scratch)

| Component | Type | Notes |
|-----------|------|-------|
| `commands/audit.md` | New command | Tooling domain; AUD skill code; register in skill-registry.md |
| `workflows/audit.md` | New workflow | Spawns Task() fleet; writes .planning/audit-report.md |
| `commands/improve.md` | New command | Tooling domain; IMP skill code; register in skill-registry.md |
| `workflows/improve.md` | New workflow | Two modes (create/improve); reads skill-style-guide.md + tooling-patterns.md |
| `commands/pressure-test.md` | New command | Tooling domain; PRT skill code; register in skill-registry.md |
| `workflows/pressure-test.md` | New workflow | Observer pattern; invokes /pde:build; spawns quality evaluator |
| `references/quality-standards.md` | New reference | Awwwards-level criteria — typography, color, motion, composition, layout |
| `references/awwwards-patterns.md` | New reference | Concrete winning patterns for scroll, micro-interaction, 3D depth, type-as-image |
| `references/motion-design.md` | New reference | Spring physics, easing curves, choreography, duration scales, reduced-motion |
| `templates/skill-audit-report.md` | New template | Output format for /pde:audit findings |
| `templates/pressure-test-report.md` | New template | Output format for /pde:pressure-test quality scores |

### Modified Components (change existing files)

| Component | Change | Risk | Priority |
|-----------|--------|------|----------|
| `bin/lib/model-profiles.cjs` | Add 4 new agent entries (output-quality-auditor, skill-linter, design-quality-evaluator, template-auditor) | LOW | Phase 1 |
| `references/model-profiles.md` | Mirror 4 new agent entries | LOW | Phase 1 |
| `skill-registry.md` | Add AUD, IMP, PRT codes | LOW | Phase 1 |
| `workflows/system.md` | Add `@references/awwwards-patterns.md` and `@references/motion-design.md` to `<required_reading>`. Elevate output instructions to require motion token block, variable font axis tokens, advanced OKLCH palette depth | MEDIUM | Phase 3 |
| `workflows/wireframe.md` | Add `@references/awwwards-patterns.md` to `<required_reading>`. Upgrade wireframe output instructions to include grid system annotations, typographic hierarchy notation | LOW | Phase 3 |
| `workflows/mockup.md` | Add `@references/motion-design.md` to `<required_reading>`. Upgrade mockup output to require spring physics CSS animations, scroll-driven animations (`@scroll-timeline`), micro-interaction states, variable font usage | MEDIUM | Phase 3 |
| `workflows/critique.md` | Add `@references/quality-standards.md` to `<required_reading>`. Expand visual hierarchy perspective criteria to include Awwwards-level composition and layout evaluation | LOW | Phase 3 |
| `workflows/hig.md` | Add `@references/motion-design.md` to `<required_reading>`. Add motion accessibility audit section: `prefers-reduced-motion` compliance, animation duration upper bounds | LOW | Phase 3 |

### Unchanged Components (do not touch unless audit identifies defect)

- `workflows/build.md` — 13-stage orchestrator is complete and stable
- `workflows/brief.md`, `flows.md`, `iterate.md`, `handoff.md` — upstream/downstream pipeline skills untouched; no design quality elevation applies (they produce structured documents, not visual output)
- `workflows/competitive.md`, `opportunity.md`, `ideate.md`, `recommend.md` — strategy domain skills; quality elevation is in visual domain
- `bin/pde-tools.cjs` and all `bin/lib/*.cjs` — no new CLI commands needed for v1.3
- `design-manifest.json` schema — no new coverage flags for v1.3
- `bin/lib/design.cjs` — no directory structure changes needed

---

## Build Order Recommendation

Order from lowest to highest dependency depth. Phase 1 is the only blocker for all subsequent phases.

```
[Phase 1] Infrastructure and quality bar definition
  ├── references/quality-standards.md    (defines the bar; required by all fleet agents)
  ├── references/awwwards-patterns.md    (concrete patterns; required by design elevation)
  ├── references/motion-design.md        (motion knowledge; required by system/mockup/hig elevation)
  ├── bin/lib/model-profiles.cjs         (register 4 new agent types; required for fleet spawning)
  ├── references/model-profiles.md       (mirror model-profiles.cjs update)
  └── skill-registry.md                  (register AUD, IMP, PRT codes)

  Rationale: Everything else depends on the quality bar existing. The fleet agents cannot
  audit against a standard that has not been defined. The model profiles must exist before
  any workflow tries to resolve-model for a fleet agent.

[Phase 2] Self-improvement fleet and audit command
  ├── templates/skill-audit-report.md    (output format; required before audit workflow)
  ├── commands/audit.md                  (stub; required before workflow)
  └── workflows/audit.md                 (fleet orchestration; spawns 4 agent types)

  Rationale: Build the audit capability before building the skill builder. The audit tells
  you what to improve. Without an audit run, the improve workflow has no grounded findings
  to act on.

[Phase 3] Design quality elevation (reference injection into existing skills)
  ├── workflows/system.md                (add awwwards-patterns.md + motion-design.md)
  ├── workflows/wireframe.md             (add awwwards-patterns.md)
  ├── workflows/mockup.md                (add motion-design.md + elevate output instructions)
  ├── workflows/critique.md              (add quality-standards.md)
  └── workflows/hig.md                   (add motion-design.md for reduced-motion audit)

  Rationale: Design elevation can only be validated by running the skills and evaluating
  output. Run the audit (Phase 2) first to get a baseline. Then apply elevation changes.
  Then re-run the audit to confirm improvement. This gives measurable delta.

[Phase 4] Skill builder
  ├── commands/improve.md
  └── workflows/improve.md

  Rationale: The skill builder reads the same references used by the audit fleet. Building
  it after Phase 2-3 means the skill builder creates skills that already pass the elevated
  quality bar. Building it before Phase 2 means it would create skills at the pre-elevation
  quality level.

[Phase 5] Pressure test
  ├── templates/pressure-test-report.md
  ├── commands/pressure-test.md
  └── workflows/pressure-test.md

  Rationale: The pressure test validates Phases 1-4. It must run after the design pipeline
  has been elevated (Phase 3) so the quality scores reflect the elevated output, not the
  pre-elevation baseline. It is the final validation gate for the entire milestone.
```

---

## Anti-Patterns

### Anti-Pattern 1: Rewriting Stable Skills During Design Elevation

**What people do:** Treat design quality elevation as a reason to refactor working skill workflows — restructure steps, change flag names, modify artifact output paths.

**Why it's wrong:** The 13 design skills are proven and stable. Breaking changes at this stage introduce regressions in the core pipeline that pressure testing would need to catch. The reference injection pattern achieves quality elevation through additive `@`-includes with zero structural change.

**Do this instead:** The only change to existing workflow files is adding new reference files to `<required_reading>` and extending the output instruction text to use elevated criteria. Step numbering, flag set, artifact paths, and coverage flag handling are all unchanged.

### Anti-Pattern 2: Adding Coverage Flags for Audit, Improve, and Pressure Test

**What people do:** Add `hasAuditComplete`, `hasPressureTest` flags to `design-manifest.json`.

**Why it's wrong:** The design manifest is exclusively for design pipeline artifacts that users produce for their product. Audit, improve, and pressure test are PDE meta-operations — they produce operational reports, not design artifacts. Adding them to the manifest conflates PDE's self-operation with the user's design workflow.

**Do this instead:** Audit and pressure test outputs go in `.planning/` at the root level. They are tracked by their file existence, not by coverage flags.

### Anti-Pattern 3: Using Skill() to Invoke the Self-Improvement Fleet Inside /pde:audit

**What people do:** Try to invoke `Skill("pde-output-quality-auditor", ...)` inside the audit workflow to spawn fleet agents.

**Why it's wrong:** `Skill()` is for invoking named PDE commands (e.g., `Skill("pde:recommend", "--quick")`). The self-improvement fleet agents are not named PDE commands — they are ad-hoc analysis agents with specialized system prompts. They are spawned via `Task()` with a model parameter.

**Do this instead:** `Task()` with the model resolved via `pde-tools.cjs resolve-model pde-output-quality-auditor`. The `/pde:audit` command is a top-level command, not nested inside another Skill, so Issue #686 does not apply.

### Anti-Pattern 4: Pressure Testing PDE on Itself

**What people do:** Run the pressure test using the PDE plugin directory as the "real project."

**Why it's wrong:** PDE is a Claude Code plugin, not a product with users. Its `.planning/` directory contains PDE's own development state (roadmap, phases, milestones) — not a product design brief, system, or wireframes. Running `/pde:build` on the plugin repo would produce nonsensical design artifacts for "the PDE tool" rather than a real user-facing product.

**Do this instead:** The pressure test must use a fresh user project directory — a new `claude project init` with a real product brief (e.g., "a task management web app"). The user-facing product is the test subject; PDE's own source files are the system under test.

### Anti-Pattern 5: Skipping the Audit Baseline Before Design Elevation

**What people do:** Apply design elevation changes (Phase 3) directly, then run the pressure test, claiming improvements without a pre-elevation baseline.

**Why it's wrong:** Without a before-state measurement, it is impossible to know whether the reference injection actually improved output quality or whether the improvement would have occurred anyway. The audit report from Phase 2 provides the baseline; running it again after Phase 3 provides the delta.

**Do this instead:** Run `/pde:audit` after Phase 2 to produce a baseline report. Apply Phase 3 elevation. Run `/pde:audit` again (and then `/pde:pressure-test`) to compare. The pressure test report should reference the baseline audit findings explicitly.

---

## Scaling Considerations

PDE is a local-file, single-user plugin. Traditional server scaling does not apply. The relevant
constraints for v1.3 are:

| Concern | Current State | v1.3 Impact | Mitigation |
|---------|---------------|-------------|------------|
| Context window per skill | System.md and mockup.md are already large (~600-800 lines) | Adding 2-3 new `@` references increases context per skill run | References use `<!-- TIER: essentials -->` sections; skills may load `essentials` tier only if full reference exceeds budget |
| Fleet agent parallelism | No fleet agents exist yet | 4 parallel Task() agents in /pde:audit increases total token consumption | Each agent operates on a scoped file list (not all files); parallelism is appropriate because agents are independent |
| Pressure test duration | N/A | Full 13-stage pipeline run is the longest operation PDE can execute | Pressure test should default to `--quick` flag passthrough to all stages unless `--full` is specified |
| Skill builder scope | N/A | Creating a new skill touches 3 files (command, workflow, registry); no new infrastructure | Bounded scope; risk is quality of generated content, not system load |

---

## Sources

All findings derived from direct inspection of PDE source at `/Users/greyaltaer/code/projects/Platform Development Engine/`.

Key files inspected:

- `.planning/PROJECT.md` — v1.3 requirements, key decisions, out-of-scope constraints
- `bin/lib/model-profiles.cjs` — existing agent types and model assignments (15 agents)
- `references/tooling-patterns.md` — existing LINT rules, smoke test protocol, dual-path test strategy
- `references/skill-style-guide.md` — 7-step skill anatomy, output conventions, flag naming
- `references/mcp-integration.md` — probe/use/degrade pattern; fleet agents follow same degrade pattern
- `references/typography.md`, `references/web-modern-css.md`, `references/color-systems.md` — current design reference baseline
- `references/design-principles.md` — current critique criteria (Nielsen's heuristics, Gestalt)
- `workflows/critique.md` — 7-step anatomy reference implementation and 4-perspective structure
- `workflows/system.md`, `workflows/mockup.md`, `workflows/hig.md` — skills targeted for elevation
- `commands/test.md` — current /pde:test status ("Planned — available in PDE v2") — confirms lint/test infra is undone
- `commands/health.md` + `workflows/health.md` — existing health check pattern for design comparison
- `workflows/audit-milestone.md` — existing integration-checker agent spawn pattern (Task() model)
- `skill-registry.md` — existing 14 registered skills; v1.3 adds 3 more (AUD, IMP, PRT)
- `templates/design-manifest.json` — 13 coverage flags; confirmed no new flags for v1.3
- `.planning/research/SUMMARY.md` — v1.2 architecture decisions and their rationale

**Confidence: HIGH** — All architecture decisions are grounded in direct source inspection. No speculation or training-data inference. The self-improvement fleet agent pattern is directly derived from the `workflows/audit-milestone.md` integration-checker agent spawn implementation which uses the same Task()/resolve-model pattern.

---

*Architecture research for: PDE v1.3 — self-improvement, skill builder, design elevation, pressure testing*
*Researched: 2026-03-17*
