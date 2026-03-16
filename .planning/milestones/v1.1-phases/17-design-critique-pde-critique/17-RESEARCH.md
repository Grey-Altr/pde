# Phase 17: Design Critique (/pde:critique) - Research

**Researched:** 2026-03-15
**Domain:** Multi-perspective design critique, heuristic evaluation, PDE skill workflow pattern
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CRT-01 | /pde:critique performs multi-perspective review (UX, engineering, accessibility, business) | `references/design-principles.md` specifies the full evaluation framework (Nielsen H1-H10, Shneiderman S1-S8, Norman's principles, Gestalt laws, Fitts/Hick/Miller). `templates/critique-report.md` specifies the exact output format: perspective groups with scores, weighted findings table, severity ratings, per-perspective detailed findings. The requirement lists four perspectives in the success criteria (UX/usability, visual hierarchy, accessibility, business alignment); the existing template and design-principles reference already have the criteria for each. |
| CRT-02 | Critique requires brief and flows in context — blocked when absent | This is the one hard-block requirement in the pipeline. Unlike all other skills (which warn and continue when prerequisites are absent), critique MUST halt with a clear recovery message if brief AND flows are both absent. The rationale is that without these, critique degrades to generic UI heuristics — which the phase goal explicitly prohibits. Brief provides product intent; flows provide the screen-journey context. The skill must verify both artifacts exist before generating any findings. If only one is missing, the skill should warn but can continue (the other provides partial context). If BOTH are absent, halt. |
| CRT-03 | Critique produces severity-rated findings with actionable recommendations | `templates/critique-report.md` defines the findings table schema: severity (critical/major/minor/nit), effort (quick-fix/moderate/significant), location (specific element/section/line in wireframe), issue (what is wrong), suggestion (specific actionable fix with concrete values), perspective, and weight. Every finding MUST have a suggestion with concrete values where applicable — not just a description of the problem. The "What Works" section required by success criterion 4 must be included in the output (preserving intentional design decisions). |
</phase_requirements>

---

## Summary

Phase 17 implements the `/pde:critique` skill — the multi-perspective design review step that evaluates wireframes against the project's own brief and flows. It is the first pipeline skill with a true hard-block prerequisite: without brief + flows in context, the critique defaults to generic UI heuristics that ignore product intent, which the phase goal explicitly prohibits.

This is a workflow-authoring phase with no new Node.js infrastructure. All tooling (write-lock, manifest, coverage, DESIGN-STATE) is already in place from Phase 12. The primary engineering challenges are: (1) precisely specifying the four critique perspectives with their evaluation criteria and scoring logic; (2) implementing the context-block mechanism that halts cleanly when brief + flows are absent; and (3) ensuring every finding produces a severity rating with an actionable recommendation (not just a problem description).

The output template (`templates/critique-report.md`) is already specified and includes the required sections: scorecard, findings-by-priority table, detailed findings per perspective, action list for `/pde:iterate`, resolved findings tracker, and MCP source tags. The evaluation criteria (`references/design-principles.md`) contains the full heuristic frameworks (Nielsen, Shneiderman, Norman, Gestalt, quantitative laws). The accessibility-specific criteria are in `references/wcag-baseline.md`. The Axe a11y MCP provides automated WCAG scanning as an optional enhancement.

**Primary recommendation:** Author `workflows/critique.md` as a 7-step workflow following the same pattern as `workflows/flows.md` and `workflows/wireframe.md`. Update `commands/critique.md` to delegate via `@workflows/critique.md`. The workflow gates on brief + flows presence (Step 2), runs four perspective evaluations in Step 4, writes the versioned critique report in Step 5, updates ux DESIGN-STATE "Open Critique Items" section in Step 6, and registers the CRT artifact and `hasCritique: true` coverage flag in Step 7.

---

## Standard Stack

### Core

| Tool / Artifact | Version | Purpose | Why Standard |
|----------------|---------|---------|--------------|
| `pde-tools.cjs design` subcommands | Phase 12 | ensure-dirs, lock-acquire/release, manifest-update, manifest-set-top-level, coverage-check, artifact-path | Already built; same as all prior skills |
| `templates/critique-report.md` | Current | Output scaffold: scorecard, findings table, per-perspective detail, action list, resolved tracker | Template already exists and is authoritative |
| `references/design-principles.md` | 1.0 | Nielsen H1-H10, Shneiderman S1-S8, Norman's principles, Gestalt laws, Fitts/Hick/Miller — loaded via `@` in workflow | CRT-exclusive ownership; this is what makes critique non-generic |
| `references/wcag-baseline.md` | 1.0 | WCAG 2.2 Level A/AA criteria — used for the Accessibility perspective | HIG-owned but referenced by critique for accessibility findings |
| `references/skill-style-guide.md` | 1.0 | Flag naming, output summary table, error messaging, progress format | Universal — all skills reference this |
| `references/mcp-integration.md` | 1.0 | Axe MCP enhancement for accessibility perspective, Sequential Thinking MCP for per-perspective reasoning | Axe is the primary MCP enhancement for /pde:critique |

### Supporting

| Tool / Artifact | Version | Purpose | When to Use |
|----------------|---------|---------|-------------|
| `templates/perspective.md` | Current | Template for custom user-defined critique perspectives | When user passes a custom perspective file as argument |
| `references/interaction-patterns.md` | 1.0 | Platform-specific interaction pattern standards | Visual hierarchy and UX perspective when platform-specific patterns are relevant |
| Sequential Thinking MCP | Current | Deeper per-perspective reasoning, cross-perspective synthesis | Step 3 — enhances finding depth; listed in mcp-integration.md as CRT enhancement |
| Axe a11y MCP | Current | Automated WCAG 2.2 scan of wireframe HTML files | Step 3 — Accessibility perspective; degrades to manual WCAG checklist from wcag-baseline.md |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Four fixed perspectives (UX, visual hierarchy, accessibility, business) | N free-form perspectives | Fixed perspectives make the output format predictable for `/pde:iterate` to consume; free-form perspectives lose the structured severity+weight scoring |
| Versioned critique report (CRT-report-v{N}.md) | Single overwriting report | Versioned file allows `/pde:iterate` to reference the exact critique that drove a revision; prevents confusion when multiple critique runs happen across fidelity levels |
| Single CRT manifest entry for all wireframes | One entry per wireframe critiqued | Single entry matches the WFR pattern (directory, not per-file); simpler manifest; iterate skill references the latest critique |

**Installation:** No new packages. All tooling is existing `pde-tools.cjs` and `design.cjs`.

---

## Architecture Patterns

### Recommended Project Structure (outputs)

```
.planning/design/
├── ux/
│   ├── DESIGN-STATE.md             # Updated: Open Critique Items table populated
│   ├── FLW-screen-inventory.json   # Input: read at Step 2 (prerequisite check)
│   ├── FLW-flows-v{N}.md           # Input: read at Step 4 (journey context per screen)
│   └── wireframes/
│       ├── {screen-slug}.html      # Input: read at Step 4 (visual layout per screen)
│       └── index.html              # Input: navigation index
└── review/
    └── CRT-critique-v{N}.md        # Output: versioned critique report

workflows/
└── critique.md                     # Full /pde:critique skill workflow (7-step pipeline)

commands/
└── critique.md                     # Updated: delegates to @workflows/critique.md
```

**Directory note:** The output goes to `review/` (not `ux/`), matching the existing directory structure in `.planning/design/` which already has a `review/` directory. The CRT domain is `review`, not `ux`.

### Pattern 1: 7-Step Skill Workflow (Established Convention)

**What:** Every PDE skill workflow follows the 7-step structure established in `workflows/flows.md` and `workflows/wireframe.md`.

**When to use:** Always — this is the mandatory pattern for all pipeline skills.

```
Step 1/7: Initialize design directories    (ensure-dirs, idempotent)
Step 2/7: Check prerequisites — HARD BLOCK if both brief and flows absent
Step 3/7: Probe MCP (Sequential Thinking + Axe a11y)
Step 4/7: Evaluate wireframes across four perspectives
Step 5/7: Write versioned critique report
Step 6/7: Update ux domain DESIGN-STATE (Open Critique Items table)
Step 7/7: Update root DESIGN-STATE + manifest (hasCritique: true)
```

### Pattern 2: Hard-Block Prerequisite Check (CRT-02 — Unique to This Skill)

**What:** CRT-02 requires the skill to be blocked with a clear recovery message when brief and flows are absent. This is different from all prior skills, which only warn and continue.

**Rationale:** Without brief, the critique cannot evaluate against product intent. Without flows, the critique cannot evaluate whether screens support the user journeys. Together they prevent the critique from degenerating into generic UI heuristics that ignore product context. This is the explicit goal of Phase 17.

**Block conditions:**

| Brief present | Flows present | Action |
|---------------|--------------|--------|
| YES | YES | Continue — full context available |
| YES | NO | WARN and continue — brief provides product intent; screen context from wireframes directly |
| NO | YES | WARN and continue — flows provide journey context; persona context from wireframes |
| NO | NO | **HALT** with recovery message |

**Block error message (when both absent):**

```
Error: Critique requires product context to avoid generic UI feedback.

  Missing: Design brief (.planning/design/strategy/BRF-brief-v*.md)
  Missing: User flows (.planning/design/ux/FLW-flows-v*.md)

  Without these artifacts, /pde:critique can only apply generic UI heuristics
  that ignore your product's goals, personas, and intended user journeys.

  Run in order:
    1. /pde:brief    -- defines product intent, personas, and constraints
    2. /pde:flows    -- maps user journeys and screen inventory
    3. /pde:wireframe -- generates screen wireframes (if not already done)
    4. /pde:critique -- re-run after the above complete
```

**Single-artifact warning (when only one is missing):**

```
Warning: Design brief not found.
  Critique will proceed using flows and wireframes for context.
  Run /pde:brief first for richer product-aligned critique.
  (Continuing without brief...)
```

### Pattern 3: Four Critique Perspectives

**What:** The success criteria require four perspectives: UX/usability, visual hierarchy, accessibility, and business alignment. The design-principles.md reference provides the evaluation criteria. The critique-report.md template provides the scoring and output format.

**Perspective definitions:**

#### Perspective 1: UX / Usability
- **Frameworks:** Nielsen's 10 Heuristics (H1-H10) + Shneiderman's 8 Golden Rules (S1-S8)
- **Weight:** 1.5x (highest — usability is the core product quality signal)
- **Evaluation against:** Brief personas and their goals, flows' journey steps, wireframe screen layout
- **Key questions:**
  - Does each screen serve the persona's goal at that journey step?
  - Does the system provide appropriate feedback for user actions? (H1)
  - Do terms, metaphors, and mental models match the persona's background? (H2)
  - Can users recover from errors and mistakes? (H3, H9, S5, S6)
  - Is the interaction model consistent across screens? (H4, S1)
  - Are affordances clear for all interactive elements? (Norman)
- **Severity escalation for this perspective:** A violation of H1 (visibility of system status) is never below Major for a screen with async operations.

#### Perspective 2: Visual Hierarchy
- **Frameworks:** Gestalt principles (proximity, similarity, continuity, closure, figure-ground, common region) + Norman's principles (affordance, signifiers, mapping) + Fitts's Law + Hick's Law + Miller's Law
- **Weight:** 1.0x
- **Evaluation against:** Wireframe visual layout, design token application (fidelity level), information density
- **Key questions:**
  - Is the primary action visually prominent vs. secondary/tertiary actions? (Gestalt figure-ground, Norman signifiers)
  - Are related elements spatially grouped? (Gestalt proximity)
  - Is cognitive load appropriate for the screen's task complexity? (Miller's Law, Hick's Law)
  - Are interactive elements clearly distinguishable from static content? (Gestalt similarity)
  - Do primary actions satisfy Fitts's Law (large, close to likely cursor/finger position)?
  - Is whitespace used to create clear visual groupings? (Gestalt common region)

#### Perspective 3: Accessibility
- **Frameworks:** WCAG 2.2 Level A/AA (from wcag-baseline.md), POUR principles
- **Weight:** 1.5x (same weight as UX — legal/ethical requirement elevates this)
- **Evaluation against:** Wireframe HTML structure, ARIA landmarks, annotation comments, design token color contrast
- **MCP enhancement:** When Axe MCP is available, run automated WCAG scan on wireframe HTML files; when not, use manual checklist from wcag-baseline.md
- **Key questions:**
  - Do semantic landmarks exist? (role=banner, main, nav, contentinfo) — verifiable from wireframe HTML
  - Do all interactive elements have accessible labels?
  - Is color contrast sufficient (4.5:1 for text, 3:1 for large text)?
  - Is focus order logical and following visual layout?
  - Do state variants have aria-live regions for dynamic updates?
  - Are all interactive targets at least 24x24 CSS pixels? (WCAG 2.5.8)
- **WCAG 2.2 new criteria to check:** 2.4.11 Focus Not Obscured, 2.5.7 Dragging Movements, 2.5.8 Target Size, 3.2.6 Consistent Help, 3.3.7 Redundant Entry, 3.3.8 Accessible Authentication

#### Perspective 4: Business Alignment
- **Frameworks:** Brief-derived evaluation — product type constraints, personas, key value propositions, scope boundaries
- **Weight:** 1.0x
- **Evaluation against:** Brief (product type, goals, personas, constraints, out-of-scope items), flows (business outcomes per journey)
- **Key questions:**
  - Do screens support the user journeys defined in the flows? Is the journey completion path clear?
  - Does the product name, messaging, and feature emphasis match the brief's positioning?
  - Are any out-of-scope features present in the wireframes? (brief's Scope Boundaries section)
  - Do the personas' stated goals align with the primary CTAs on each screen?
  - Does the product type (software/hardware/hybrid) influence the interaction model correctly?
  - Are the brief's constraints (e.g., offline-first, accessibility requirements, platform constraints) visible in the wireframe decisions?

### Pattern 4: Scoring System

**What:** Each perspective receives a score 0-100. The composite is a weighted average. The composite maps to a letter grade and maturity level.

**Score calculation:**
```
Score per perspective = 100 - (sum of finding penalties)
  Critical finding: -25 points
  Major finding: -10 points
  Minor finding: -4 points
  Nit: -1 point

Weighted composite = (UX_score * 1.5 + hierarchy_score * 1.0 + a11y_score * 1.5 + business_score * 1.0) / 5.0

Letter grade:
  90-100: A (Excellent — ready for handoff with minor polish)
  80-89: B (Good — minor issues to resolve before handoff)
  70-79: C (Fair — several issues should be addressed in iteration)
  60-69: D (Poor — significant issues require revision before handoff)
  Below 60: F (Critical — major structural or usability problems)

Maturity level:
  A: handoff-ready
  B: iteration-recommended
  C: iteration-required
  D/F: major-revision-required
```

**Rationale for 1.5x weights on UX and Accessibility:** UX usability is the primary quality signal for any product design. Accessibility is a legal/ethical requirement — critical violations are non-negotiable. Visual hierarchy and business alignment are important but correctable without structural rework.

### Pattern 5: "What Works" Section (Success Criterion 4)

**What:** The critique report must include a "What Works" section to preserve intentional design decisions during iteration. This is explicitly required by success criterion 4.

**Placement:** Between the Scorecard and the Findings by Priority sections in the output (per the critique-report.md template flow).

**Content:** For each perspective, identify 1-3 specific design decisions that demonstrate intentional, correct choices. These are labeled with their perspective source and should be referenced in `/pde:iterate` to prevent regressing on them.

```markdown
## What Works

| Element | What's Working | Perspective | Keep It |
|---------|----------------|-------------|---------|
| {screen.element} | {specific observation} | {perspective} | Yes — do not change in iteration |
```

**Why this matters:** Without this section, iteration pressure may cause executors to "improve" intentional choices, breaking the design. The "What Works" section acts as a preservation contract between critique and iterate.

### Pattern 6: Screen-Scoping Argument

**What:** `/pde:critique` accepts an optional comma-separated list of screen slugs to critique a subset of wireframes. When no argument is provided, all wireframes in `ux/wireframes/` are critiqued (full batch).

**Source:** `references/skill-style-guide.md` — Per-Item Filtering section

```
/pde:critique "login, dashboard"    # critique only these two screens
/pde:critique                       # critique all screens in wireframes/
/pde:critique "login" --quick       # critique one screen without MCP enhancements
```

**Single report covers all critiqued screens.** The CRT-critique-v{N}.md contains all findings across all screens evaluated in that run. Screen-specific sections are organized within each perspective's findings.

**Finding location format:** Every finding's "Location" field must identify the screen, element, and approximate position:
```
Location: login.html > main > .pde-state--default > .form-group:nth-child(2) > label
```

### Pattern 7: Versioned Critique Report

**What:** Each critique run produces `CRT-critique-v{N}.md` in `.planning/design/review/`. Version increments on each run (like FLW, SYS).

**Why versioning matters for critique specifically:** The `/pde:iterate` skill reads the critique version that triggered the iteration. If critiques were overwriting (like wireframes), iterating on v2 wireframes after a critique-on-v1-wireframes run would reference stale findings. Versioning makes the critique-iterate feedback loop traceable.

**Version gate:** Same pattern as flows.md — Glob for existing `CRT-critique-v*.md`, increment, prompt user if --force not present.

### Pattern 8: Manifest Registration (CRT artifact code)

**What:** The critique skill registers its output using artifact code `CRT`. One manifest entry per critique run (not per screen). Domain is `review`.

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update CRT code CRT
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update CRT name "Design Critique"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update CRT type critique
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update CRT domain review
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update CRT path ".planning/design/review/CRT-critique-v{N}.md"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update CRT status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update CRT version {N}
```

### Pattern 9: ux Domain DESIGN-STATE Update (Open Critique Items)

**What:** Step 6 updates the `ux/DESIGN-STATE.md` "Open Critique Items" table with all Critical and Major findings. This makes critique findings discoverable in the domain state without reading the full report.

**Source:** `templates/design-state-domain.md` — "Open Critique Items" section already exists in the template.

```
| {finding_id} | CRT-critique-v{N}.md | {critical|major} | open |
```

Only Critical and Major findings are added to DESIGN-STATE. Minor and nit findings stay in the full report only (keeping the DESIGN-STATE focused on action-required items).

### Anti-Patterns to Avoid

- **Generic critique without product context:** If both brief and flows are absent, the critique will produce generic heuristic feedback that ignores product intent. This is precisely what CRT-02 prohibits. Hard-block, don't continue with degraded output.
- **Findings without actionable suggestions:** "The button color is hard to read" is not actionable. "Increase contrast ratio from current ~2.8:1 to minimum 4.5:1 — change button background from #9ca3af to #6b7280 or darker" is actionable. Every finding MUST have a concrete suggestion.
- **Omitting "What Works":** The "What Works" section is required by success criterion 4. Omitting it causes iterate to over-correct, regressing on intentional choices.
- **Critiquing the wrong fidelity level:** Lo-fi wireframes do not have real colors — accessibility color contrast findings are not applicable. Severity must be calibrated to fidelity level. At lo-fi, color contrast is a "nit" (placeholder only); at hi-fi, it is major/critical.
- **Coverage flag clobber:** Same as all prior skills — always read coverage-check before setting hasCritique: true, preserve all other flags.
- **Registering one CRT entry per screen:** CRT is one entry per critique run (covering all critiqued screens). Do not create WFR-login-critique, WFR-dashboard-critique entries.
- **Blocking on single missing prerequisite:** The block condition is BOTH brief AND flows absent. If only one is missing, warn and continue.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Evaluation criteria | Custom usability framework | `references/design-principles.md` (Nielsen, Shneiderman, Norman, Gestalt, quantitative laws) | Already specified, cited, and calibrated; CRT-exclusive ownership |
| Accessibility criteria | Custom a11y checklist | `references/wcag-baseline.md` (WCAG 2.2 A/AA) | Complete 56-criterion checklist; maps to POUR, includes WCAG 2.2 additions |
| Accessibility scanning | Manual inspection loop | Axe MCP (`mcp__a11y__*`) | Automated axe-core engine; degrades gracefully to manual checklist |
| Report format | Custom markdown structure | `templates/critique-report.md` | Template already specified; iterate and handoff skills consume it |
| Perspective template | Custom custom-perspective schema | `templates/perspective.md` | Standard schema for user-defined perspectives |
| Directory init | Custom mkdir logic | `pde-tools.cjs design ensure-dirs` | Idempotent, tested Phase 12 |
| Write-lock | Custom file locking | `pde-tools.cjs design lock-acquire/release` | 60s TTL, stale-lock auto-clear |
| Manifest update | Direct JSON editing | `pde-tools.cjs design manifest-update` | Atomic, merge semantics |
| Coverage flag | Custom field setter | `pde-tools.cjs design coverage-check` + `manifest-set-top-level` | Prevents clobber across skills |
| Wireframe path discovery | Custom glob | `pde-tools.cjs design artifact-path WFR` | Resolves canonical path from manifest |

**Key insight:** Phase 17 is exclusively a workflow-authoring and critique-reasoning task. The evaluation frameworks, output template, and all infrastructure already exist. No new Node.js code is required.

---

## Common Pitfalls

### Pitfall 1: Generic Critique Without Product Context (CRT-02 Core Risk)

**What goes wrong:** Critique runs when brief or flows are absent (or both), producing findings like "button is too small" rather than "the primary CTA on the checkout screen is undersized relative to the persona's stated urgency to complete purchase before a sale ends (from brief Goals section)."

**Why it happens:** The skill does not enforce the block condition, or it degrades gracefully (warning + continue) when it should halt.

**How to avoid:** Step 2 MUST check for both brief AND flows. If both are absent: halt with the structured error message (Pattern 2). The error message must name the missing artifacts AND explain WHY they are required (not just "artifact not found").

**Warning signs:** Critique findings contain no persona names, no journey references, and no product-specific terminology from the brief. Findings read as generic UI heuristics.

### Pitfall 2: Fidelity-Inappropriate Findings

**What goes wrong:** Critique of a lo-fi wireframe reports "color contrast fails WCAG 4.5:1 ratio" — which is meaningless since lo-fi uses only neutral gray placeholders, not real colors.

**Why it happens:** The workflow does not read the wireframe HTML to determine the fidelity level before evaluating.

**How to avoid:** Step 4 must read the fidelity level from the wireframe HTML's body class (`pde-layout--lofi`, `pde-layout--midfi`, `pde-layout--hifi`). Adjust evaluation criteria by fidelity:
- **Lo-fi:** Evaluate structure, information architecture, hierarchy, flow completeness. Skip: color contrast, typography quality, token application.
- **Mid-fi:** Add realistic layout, spacing proportions, microcopy quality. Skip: brand color precision.
- **Hi-fi:** Full evaluation across all four perspectives including color contrast, token application, animation/motion.

**Fidelity-severity table:**
| Finding Type | Lo-fi Severity | Mid-fi Severity | Hi-fi Severity |
|-------------|----------------|----------------|----------------|
| Missing screen for journey step | Critical | Critical | Critical |
| Color contrast failure | Skip | Minor (placeholder) | Major/Critical |
| CTA prominence (visual weight) | Minor (structure only) | Major | Major |
| ARIA label missing | Major (structure visible) | Major | Critical |
| Token not applied | Skip | Minor | Major |

### Pitfall 3: Findings Without Concrete Suggestions

**What goes wrong:** Finding: "The login form has poor accessibility." This violates CRT-03's requirement for actionable recommendations.

**Why it happens:** The workflow does not require that suggestions include specific values or actions.

**How to avoid:** The workflow must include the requirement: every finding's Suggestion field must specify the concrete fix. Examples:
- Bad: "Increase font size for better readability."
- Good: "Increase `.form-label` font-size from current `var(--font-size-xs)` (~0.75rem) to `var(--font-size-sm)` (~0.875rem) minimum. Per WCAG 1.4.4, text must remain readable at 200% zoom."
- Bad: "Add aria-label to the icon button."
- Good: "Add `aria-label='Close dialog'` to the X button in `.modal-header`. Without it, screen readers announce 'button' with no context."

### Pitfall 4: Missing "What Works" Section

**What goes wrong:** Iterate receives the critique report and "fixes" intentional design choices (e.g., "improves" a deliberately minimal login form by adding social login when the brief explicitly excludes social login from scope).

**Why it happens:** The workflow does not require the "What Works" section.

**How to avoid:** The critique output template (`templates/critique-report.md`) does not yet have the "What Works" section in its current form — the workflow must generate it. The workflow MUST include this section before the Findings by Priority section. Format: table of intentional design decisions to preserve, with the perspective that validated them.

### Pitfall 5: Coverage Flag Clobbering (Recurring)

**What goes wrong:** After running /pde:critique, `hasWireframes: true`, `hasFlows: true`, and `hasDesignSystem: true` are reset to `false`.

**Why it happens:** `manifest-set-top-level designCoverage` replaces the entire object.

**How to avoid:** Always run `design coverage-check` first. Parse ALL six fields. Merge `hasCritique: true`. Write full merged object. Same pattern as Phases 14, 15, 16.

### Pitfall 6: Wrong Output Directory

**What goes wrong:** Critique report written to `ux/` instead of `review/`.

**Why it happens:** The flows and wireframe workflows use `ux/` for everything, so it's an easy default to carry over.

**How to avoid:** The existing `.planning/design/` directory already has a `review/` subdirectory (confirmed by `ls`). CRT domain is `review`. All critique-related artifacts go in `.planning/design/review/CRT-critique-v{N}.md`. This is the correct domain per the manifest schema and DESIGN-STATE template (review is a separate domain from ux).

### Pitfall 7: Blocking on Single Missing Prerequisite

**What goes wrong:** The workflow halts when brief is missing but flows exist (or vice versa). This is overly restrictive — one artifact provides sufficient context for a meaningful (though less complete) critique.

**Why it happens:** CRT-02 says "blocked when absent" and the implementer reads "absent" as "either artifact absent."

**How to avoid:** The block is triggered only when BOTH brief AND flows are absent. See Pattern 2 decision table. When only one is absent: warn, log what partial context is being used, and continue.

---

## Code Examples

Verified patterns from existing project source files:

### Step 1: Initialize Design Directories

```bash
# Source: workflows/flows.md Step 1 / workflows/wireframe.md Step 1 (identical)
INIT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design ensure-dirs)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

### Step 2: Prerequisite Check — Brief

```bash
# Source: workflows/flows.md Step 2 pattern (same Glob-sort-read pattern)
# Check .planning/design/strategy/BRF-brief-v*.md
# Sort descending by version number, read highest version
# If absent: set BRIEF_AVAILABLE = false, store WARNING
```

### Step 2: Prerequisite Check — Flows

```bash
# Check .planning/design/ux/FLW-flows-v*.md
# Sort descending by version, read highest version
# If absent: set FLOWS_AVAILABLE = false, store WARNING
```

### Step 2: Hard-Block Logic

```
IF BRIEF_AVAILABLE is false AND FLOWS_AVAILABLE is false:
  Output error message (Pattern 2)
  HALT

IF BRIEF_AVAILABLE is false:
  Output warning: "Design brief not found. Critique proceeds with flows context."
  Continue

IF FLOWS_AVAILABLE is false:
  Output warning: "User flows not found. Critique proceeds with brief context."
  Continue

IF both available:
  Display: "Step 2/7: Prerequisites verified. Brief v{N} and Flows v{M} loaded."
  Continue
```

### Step 2: Wireframe Discovery

```bash
# Discover wireframes to critique
# If screen argument provided: use those slugs from FLW-screen-inventory.json
# If no argument: discover all .html files in .planning/design/ux/wireframes/ (excluding index.html)
# Read fidelity level from body class of first discovered wireframe: pde-layout--{fidelity}
```

### Step 4: Perspective Evaluation with Sequential Thinking

```
IF SEQUENTIAL_THINKING_AVAILABLE:
  For each perspective:
    Use mcp__sequential-thinking__think with prompt:
      "Evaluate this wireframe ({screen_slug}.html) from the {perspective_name} perspective.
       Product context: {brief summary}
       User journey context: {journey step for this screen from flows}
       Evaluation framework: {Nielsen H1-H10 / Gestalt / WCAG 2.2 / business brief}
       For each finding: identify specific location, severity, and concrete actionable suggestion."
  Use structured reasoning output to generate per-finding entries.
  Tag: [Enhanced by Sequential Thinking MCP -- {perspective_name} perspective analysis]
```

### Step 6: Update Open Critique Items in ux/DESIGN-STATE.md

```bash
# Source: templates/design-state-domain.md — "Open Critique Items" section exists in template
# Read .planning/design/ux/DESIGN-STATE.md
# For each Critical and Major finding in the critique report:
#   Add row to Open Critique Items table:
#   | {finding_id} | CRT-critique-v{N}.md | {critical|major} | open |
# Write updated DESIGN-STATE.md
```

### Step 7: Coverage Flag (Read-Before-Set)

```bash
# Source: workflows/flows.md Step 7 (identical pattern, different flag key)
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
# Parse COV JSON to extract current values for ALL fields
# Merge hasCritique: true
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasCritique":true,"hasWireframes":{current},"hasFlows":{current},"hasDesignSystem":{current},"hasHandoff":{current},"hasHardwareSpec":{current}}'
```

### Critique Report Output Structure (from templates/critique-report.md)

The workflow generates this structure for each critique run:

```markdown
---
Generated: "{date}"
Skill: /pde:critique (CRT)
Version: v{N}
Status: draft
Mode: "{full|quick|focused}"
Groups Evaluated: "UX/Usability, Visual Hierarchy, Accessibility, Business Alignment"
Enhanced By: "{Sequential Thinking MCP, Axe MCP | none}"
---

# Critique Report: Wireframes v{N} ({fidelity})

## Summary Scorecard
| Group | Score | Weight | Weighted |
| UX/Usability | {score}/100 | 1.5x | {weighted} |
| Visual Hierarchy | {score}/100 | 1.0x | {weighted} |
| Accessibility | {score}/100 | 1.5x | {weighted} |
| Business Alignment | {score}/100 | 1.0x | {weighted} |
| **Composite** | | | **{composite}/100** |

**Overall:** {letter} | {numeric}/100 | {maturity_level}

## What Works
| Element | What's Working | Perspective | Keep It |
...

## Findings by Priority
| # | Severity | Effort | Location | Issue | Suggestion | Perspective | Weight |
...

## Detailed Findings by Perspective Group
### UX / Usability
### Visual Hierarchy
### Accessibility
### Business Alignment

## Action List for /pde:iterate
- [ ] {finding_summary} -- {severity}/{effort}

## Resolved Findings (Cumulative)
(empty on first run)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Generic UI heuristic review | Product-grounded critique using brief + flows as mandatory context | Phase 17 (this phase) | Prevents critique from degenerating into generic advice that ignores product intent |
| commands/critique.md stub text "Planned -- available in PDE v2" | @workflows/critique.md delegation | Phase 17 (this phase) | Unblocks iterate and handoff pipeline |
| Manual WCAG review only | Axe MCP optional enhancement with wcag-baseline.md fallback | Phase 17 (this phase) | Automated accessibility scan when available; graceful degradation to manual checklist |

**Deprecated/outdated:**
- `commands/critique.md` stub text "Planned -- available in PDE v2": replaced by `@workflows/critique.md` delegation.
- Single-perspective critique (UX only): replaced by weighted four-perspective evaluation.

---

## Open Questions

1. **Does `review/` domain need a DESIGN-STATE.md of its own, or is the ux/ DESIGN-STATE sufficient for critique findings?**
   - What we know: `templates/design-state-domain.md` has an "Open Critique Items" section. The ux DESIGN-STATE already exists after Phase 15. The CRT manifest entry has `domain: review`. The review/ subdirectory exists in `.planning/design/`.
   - What's unclear: Should critique populate `review/DESIGN-STATE.md` (for the review domain) or update `ux/DESIGN-STATE.md` (where the wireframes it reviews live)?
   - Recommendation: Update `ux/DESIGN-STATE.md` "Open Critique Items" section (it was designed for exactly this purpose — the template shows critique items tracked within the domain being critiqued). The `review/` directory is for the critique report file only; no separate DESIGN-STATE is needed for a single-artifact domain.

2. **What is the `--focused` mode for critique?**
   - What we know: `templates/critique-report.md` frontmatter includes `Mode: "{full|quick|focused}"`. The `skill-style-guide.md` documents `--quick` as a universal flag. The critique skill needs to define what focused means.
   - What's unclear: Is `--focused` a perspective filter (only evaluate one named perspective), or a finding filter (only report Critical/Major findings)?
   - Recommendation: Define `--focused "UX"` as a perspective filter argument — evaluate only the named perspective(s). This mirrors the screen-scoping argument pattern. `--quick` skips MCP enhancements (standard). Full mode = all four perspectives + MCP enhancements.

3. **How does critique handle wireframes at multiple fidelity levels in the same project?**
   - What we know: WFR artifact is a single entry pointing to `ux/wireframes/` directory. Multiple fidelity levels can exist (lofi, midfi, hifi versions of the same screen). The current WFR manifest entry doesn't track which screens were generated at which fidelity.
   - What's unclear: If `login.html` is lofi but `dashboard.html` is hifi (from separate wireframe runs), should critique auto-detect per-file or use the most recent fidelity flag?
   - Recommendation: Read fidelity from each screen's body class (`pde-layout--{fidelity}`) individually. Adjust severity calibration per-screen. Note mixed fidelity in the critique report frontmatter: `Mode: "full (mixed fidelity: lofi/hifi)"`.

---

## Validation Architecture

`workflow.nyquist_validation` is `true` in `.planning/config.json` — this section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in `assert` + manual end-to-end (same as Phases 14-16) |
| Config file | None — no test runner; infrastructure tests use `--self-test` flag pattern |
| Quick run command | `node bin/lib/design.cjs --self-test` |
| Full suite command | `node bin/lib/design.cjs --self-test` + manual: run `/pde:critique` on a test project and inspect critique report output |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CRT-01 | `/pde:critique` produces `review/CRT-critique-v1.md` with all four perspective sections | smoke | `node -e "const f=require('fs');const r=f.readFileSync('.planning/design/review/CRT-critique-v1.md','utf8');require('assert')(r.includes('UX / Usability')&&r.includes('Visual Hierarchy')&&r.includes('Accessibility')&&r.includes('Business Alignment'))"` after skill run | ❌ Wave 0 |
| CRT-01 | Critique report contains Summary Scorecard and What Works section | smoke | `node -e "const f=require('fs').readFileSync('...CRT-critique-v1.md','utf8');require('assert')(f.includes('Summary Scorecard')&&f.includes('What Works'))"` | ❌ Wave 0 |
| CRT-02 | `/pde:critique` halts with error when both brief and flows are absent | manual | Delete/rename brief and flows, run `/pde:critique`, verify error message appears and no CRT file is written | ❌ Wave 0 (manual) |
| CRT-02 | `/pde:critique` continues (with warning) when only brief is missing but flows exist | manual | Remove brief only, run `/pde:critique`, verify warning message and CRT file IS written | ❌ Wave 0 (manual) |
| CRT-03 | Every finding in the findings table has non-empty Severity, Location, Issue, and Suggestion fields | smoke | Parse critique report markdown, verify table rows all have 8 non-empty columns | ❌ Wave 0 (manual parse) |
| CRT-03 | Critique report contains Action List for /pde:iterate section | smoke | `node -e "require('assert')(require('fs').readFileSync('...','utf8').includes('Action List for /pde:iterate'))"` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `node bin/lib/design.cjs --self-test` (Phase 12 infrastructure)
- **Per wave merge:** Manual end-to-end: run `/pde:critique` on a project with brief + flows + wireframes; verify CRT-critique-v1.md is written to `review/`; verify all four perspective sections present
- **Phase gate:** All three CRT requirements verified before `/gsd:verify-work`:
  - CRT-01: Critique report exists with four perspective sections and What Works
  - CRT-02: Hard-block verified when both prerequisites absent; warn-and-continue verified when only one absent
  - CRT-03: Every finding has severity + actionable suggestion; Action List section present

### Wave 0 Gaps

- [ ] `workflows/critique.md` — primary deliverable (Wave 1)
- [ ] `commands/critique.md` — update from stub to `@workflows/critique.md` delegation (Wave 1)
- [ ] No new test file needed in `design.cjs` — critique uses no new infrastructure code
- [ ] Manual smoke test procedure: document in VALIDATION.md (Phase gate)

*(No new test infrastructure gaps — existing `design.cjs` self-tests cover all infrastructure calls. Critique content generation and report quality are validated by manual end-to-end execution.)*

---

## Sources

### Primary (HIGH confidence)

- `templates/critique-report.md` — Read directly: output scaffold, frontmatter fields, section order, findings table schema, Axe MCP source tag formats
- `references/design-principles.md` — Read directly: Nielsen H1-H10 (with checklists, common violations, industry examples), Shneiderman S1-S8 (with checklists), Norman's principles (affordance, signifiers, constraints, mapping, feedback, conceptual models), Gestalt principles (proximity, similarity, continuity, closure, figure-ground, common region), Fitts's Law, Hick's Law, Miller's Law — CRT-exclusive ownership
- `references/wcag-baseline.md` — Read (first 80 lines): confirmed WCAG 2.2 scope (Level A/AA, ~56 criteria), POUR overview, WCAG 2.2 new criteria (2.4.11, 2.5.7, 2.5.8, 3.2.6, 3.3.7, 3.3.8), accessible authentication pattern — HIG-owned but referenced by critique for accessibility perspective
- `references/mcp-integration.md` — Read (first 200 lines + targeted sections): confirmed Axe MCP as CRT enhancement with `Compliance Perspective` recipe; confirmed Sequential Thinking MCP enhancement recipe for CRT (deeper per-perspective reasoning); confirmed `--no-axe` and `--no-sequential-thinking` flags
- `templates/perspective.md` — Read directly: custom perspective schema (evaluation criteria, severity guidance, weight override, references) — for `--perspective {file}` argument support
- `references/skill-style-guide.md` — Read directly: universal flags, per-item filtering, output summary table, error messaging standards, output ordering convention — all apply to CRT
- `templates/design-manifest.json` — Read directly: confirmed `hasCritique` field in `designCoverage` object; confirmed `domain: review` pattern
- `templates/design-state-domain.md` — Read directly: confirmed "Open Critique Items" table exists in ux domain DESIGN-STATE template; confirmed severity values (critical/major/minor/nit) and status values (open/resolved/deferred)
- `workflows/flows.md` — Read directly: 7-step pipeline structure, Step 1-7 pattern, write-lock sequence, coverage-check read-before-set pattern, manifest-update (7-call pattern), prerequisite check (Glob → version sort → read), version gate with --force
- `.planning/phases/16-wireframing-pde-wireframe/16-RESEARCH.md` — Read directly: established conventions (7-step pattern, file paths, manifest registration, coverage clobber pitfall) that CRT follows
- `commands/critique.md` — Read directly: current stub status confirmed ("Planned -- available in PDE v2"); existing frontmatter (name, description, allowed-tools)
- `.planning/STATE.md` — Read directly: Phase 16 decision "Fixed wireframes/ directory as non-versioned path — Phase 17 critique needs stable path"; `hasCritique` field confirmed in designCoverage manifest schema; design manifest coverage object schema confirmed

### Secondary (MEDIUM confidence)

- `references/mcp-integration.md` Axe enhancement recipe — directly read; integration pattern is clear; Axe MCP availability in the user's environment is unknown at research time (not a confidence issue for the workflow, since degradation is documented)

### Tertiary (LOW confidence)

- Axe MCP exact tool call signature — not verified from implementation; known from mcp-integration.md reference patterns and the general `mcp__a11y__*` namespace convention. Flag for Step 3 verification during implementation.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all tooling is existing project infrastructure; no external libraries; critique-report.md template fully specifies output format; design-principles.md provides complete evaluation criteria
- Architecture patterns: HIGH — directly derived from `workflows/flows.md` and `workflows/wireframe.md` (implemented, working); template provides exact output scaffold; design-principles.md confirms four evaluation frameworks
- Block condition (CRT-02): HIGH — requirements text, phase success criteria, and STATE.md decisions are unambiguous; block-on-both pattern is clear
- Pitfalls: HIGH for pitfalls 1-6 (derived from template, existing decision patterns, CRT-02 requirement); MEDIUM for fidelity-sensitivity calibration (proposed severity table is recommended, not validated by implementation)
- Open questions: MEDIUM — review domain vs. ux domain DESIGN-STATE update is a plausible ambiguity resolved by reading the template; --focused mode is proposed based on pattern matching to wireframe's screen selection argument

**Research date:** 2026-03-15
**Valid until:** Stable — no external dependencies; all tooling is in-project; valid until Phase 18 (iterate) changes how critique findings are consumed (check iterate research for any schema changes)
