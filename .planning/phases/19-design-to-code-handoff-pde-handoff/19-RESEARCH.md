# Phase 19: Design-to-Code Handoff (/pde:handoff) - Research

**Researched:** 2026-03-15
**Domain:** PDE skill workflow pattern — design pipeline synthesis, component API generation, TypeScript interface authoring
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HND-01 | /pde:handoff synthesizes all design artifacts into implementation specifications | The full upstream artifact set is discoverable from design-manifest.json and a set of Glob patterns. Templates/handoff-spec.md already defines the output document structure with Route Structure, Component APIs, Token Mappings, Accessibility Overview, Gap Analysis, Test Specs, and Per-Screen Detail Specs sections. The workflow reads every available upstream artifact (BRF brief, FLW flows + screen inventory, SYS design system, WFR wireframes, CRT critique reports, ITR changelogs) and synthesizes them into a single HND-handoff-spec-v{N}.md at `.planning/design/handoff/`. The manifest's designCoverage flags tell the skill which artifacts are available. |
| HND-02 | Handoff produces component APIs with TypeScript interfaces | TypeScript interfaces are written by Claude as text output (per STACK.md confirmed decision: no json-schema-to-typescript). The primary source for interface shapes is wireframe ANNOTATION comments from WFR HTML files — Phase 16 made these mandatory. Each `<!-- ANNOTATION: ... -->` block above a `pde-state--*` div and each interactive element annotation describes triggers, payloads, and transitions. The skill synthesizes annotation content plus the critique report's findings into interface Props definitions with JSDoc. |
| HND-03 | Handoff reads STACK.md for project-specific technology alignment | `.planning/research/STACK.md` exists in this project. The handoff skill reads it and aligns prop naming conventions, import patterns, and component stub templates to the detected framework (React/Vue/Svelte/none). The file is a hard dependency with a recovery message if absent. The handoff-spec.md template already includes React, Vue, and Svelte stubs in the Per-Screen Detail Specs section. |
</phase_requirements>

---

## Summary

Phase 19 implements `/pde:handoff`, the terminal synthesis skill in the v1.1 design pipeline. Its job is to read every available upstream artifact produced by the pipeline — brief, flows, screen inventory, design system tokens, wireframe HTML (including all ANNOTATION comments), critique reports, and iteration changelogs — and synthesize them into two outputs: (1) a `HND-handoff-spec-v{N}.md` document that implementation engineers can use directly without accessing raw wireframes, and (2) a `HND-types-v{N}.ts` file containing TypeScript interface declarations for every identified component.

The implementation follows the identical 7-step PDE skill workflow pattern used across all prior skills (wireframe, flows, critique, iterate). All inputs are already in `.planning/design/` as files produced by prior skills. No new tools are needed: pde-tools.cjs handles manifest registration and lock management; Claude writes both the markdown spec and the TypeScript file as text output. The STACK.md prerequisite is the one genuinely new design decision — this skill must read it to know which framework stub to use for component API examples and import path conventions.

The critical path for TypeScript interface quality runs through wireframe annotations. Phase 16 explicitly documented that ANNOTATION comments on all state variants and interactive elements are "mandatory — Phase 19 handoff reads these to generate TypeScript component APIs." If annotations are sparse, interface quality degrades. The research flag in STATE.md confirms this is a known risk; the skill should include an annotation completeness check as part of its prerequisite validation step.

**Primary recommendation:** Implement as a single `workflows/handoff.md` using the 7-step pipeline pattern, reading STACK.md as a hard dependency (with recovery message, not silent halt), synthesizing all available upstream artifacts, and writing two files: HND-handoff-spec-v{N}.md and HND-types-v{N}.ts. Wire `commands/handoff.md` as a delegation stub matching the exact pattern of `commands/critique.md` and `commands/iterate.md`.

---

## Standard Stack

### Core

| Component | Version/Path | Purpose | Why Standard |
|-----------|-------------|---------|--------------|
| `pde-tools.cjs design` subcommands | existing | ensure-dirs, lock-acquire/release, manifest-update, manifest-set-top-level, coverage-check | Same CLI used by every prior PDE skill — zero new dependencies |
| `@references/skill-style-guide.md` | existing | Universal flags, output format, error messaging conventions | Required reading for all PDE skills |
| `@references/mcp-integration.md` | existing | Sequential Thinking MCP probe pattern, flag handling | Required reading for all PDE skills with MCP enhancement |
| Write tool | Claude tool | Create HND-handoff-spec-v{N}.md and HND-types-v{N}.ts | Same mechanism used by all prior skills |
| Edit tool | Claude tool | Update domain DESIGN-STATE, critique report references | Preferred over full rewrite for targeted mutations |
| `templates/handoff-spec.md` | existing | Output document scaffold with all required sections | Already defines the full handoff spec structure including hardware sections |

### Supporting

| Component | Purpose | When to Use |
|-----------|---------|-------------|
| Sequential Thinking MCP (`mcp__sequential-thinking__think`) | Reason through ambiguous component API shapes from sparse annotations | Use when SEQUENTIAL_THINKING_AVAILABLE = true and annotation completeness is low |
| Glob tool | Discover all upstream artifacts (briefs, flows, wireframes, critiques, changelogs) | Step 2 prerequisite discovery |
| Read tool | Load wireframe HTML (for ANNOTATION parsing), design system tokens, brief, flows | Steps 2 and 4 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| LLM-written TypeScript interfaces | json-schema-to-typescript v15 | Confirmed in STACK.md: LLM-authored TypeScript is more contextually accurate for UI component APIs; v15 CJS compatibility unconfirmed |
| Claude writes HND-types-v{N}.ts | Compile annotations to schema then to TypeScript | Adds a mechanical transformation step; annotations describe behavior, not data schema — Claude's semantic reasoning produces better interfaces |
| STACK.md for framework detection | Auto-detect package.json framework | User's STACK.md provides explicit intent; auto-detection from package.json can be wrong or project may not have package.json yet |

**Installation:** No new dependencies. Zero new npm packages. Everything runs on existing `pde-tools.cjs` and Claude tools.

---

## Architecture Patterns

### Recommended Project Structure

The skill produces files in one existing directory:

```
.planning/design/
├── strategy/
│   └── BRF-brief-v{N}.md          # INPUT: design brief (soft dependency)
├── ux/
│   ├── FLW-flows-v{N}.md          # INPUT: user flows (soft dependency)
│   ├── FLW-screen-inventory.json  # INPUT: screen inventory (soft dependency)
│   └── wireframes/
│       ├── WFR-{screen}.html      # INPUT: wireframes with ANNOTATION comments
│       └── WFR-{screen}-v{N}.html # INPUT: iterated wireframes
├── assets/
│   └── tokens.css                 # INPUT: design system CSS (soft dependency)
├── review/
│   ├── CRT-critique-v{N}.md       # INPUT: critique reports (soft dependency)
│   └── ITR-changelog-v{N}.md      # INPUT: iteration changelogs (soft dependency)
└── handoff/                       # OUTPUT directory
    ├── HND-handoff-spec-v{N}.md   # OUTPUT: implementation spec (Write tool)
    └── HND-types-v{N}.ts          # OUTPUT: TypeScript interfaces (Write tool)
```

**Naming convention decisions:**
- Handoff spec: `HND-handoff-spec-v{N}.md` where N is the next available version integer.
- TypeScript types: `HND-types-v{N}.ts` where N matches the handoff spec version.
- Both files are versioned together — they form a pair for one handoff run.

### Pattern 1: 7-Step Skill Workflow (established project pattern)

**What:** All PDE skills follow a 7-step pipeline: (1) ensure-dirs, (2) check prerequisites and parse arguments, (3) probe MCP availability, (4) core generation/synthesis work, (5) write output files with lock, (6) update domain DESIGN-STATE, (7) update root DESIGN-STATE + manifest + coverage flag.

**When to use:** Always — this is the canonical structure for every PDE skill.

**Step mapping for /pde:handoff:**

```
Step 1/7: Initialize design directories (ensure-dirs — identical to all prior skills)

Step 2/7: Check prerequisites and discover artifacts
  2a. Read .planning/research/STACK.md (HARD dependency — halt with recovery message if absent)
      Parse: framework (React/Vue/Svelte/none), typescript: true/false, import path conventions
  2b. Read design-manifest.json coverage flags (soft — use Glob as fallback if manifest missing)
  2c. Discover brief: Glob for .planning/design/strategy/BRF-brief-v*.md (soft — warn if absent)
  2d. Discover flows: Glob for .planning/design/ux/FLW-flows-v*.md (soft — warn if absent)
  2e. Discover screen inventory: Glob for .planning/design/ux/FLW-screen-inventory.json (soft)
  2f. Discover wireframes: Glob for .planning/design/ux/wireframes/WFR-*.html excluding index.html
      For each screen: prefer highest versioned WFR-{screen}-v{N}.html over original WFR-{screen}.html
  2g. Discover design system tokens: Glob for .planning/design/assets/tokens.css (soft)
  2h. Discover critique: Glob for .planning/design/review/CRT-critique-v*.md (soft)
  2i. Discover changelogs: Glob for .planning/design/review/ITR-changelog-v*.md (soft)
  2j. Annotation completeness check: for each discovered wireframe, scan for <!-- ANNOTATION: ... -->
      Count annotated state blocks. If < 50% of pde-state--* divs have ANNOTATION comments:
      warn user ("Low annotation coverage — TypeScript interface quality may be degraded.
        Re-run /pde:wireframe to regenerate with full annotations.")
  2k. Determine HND version: Glob for .planning/design/handoff/HND-handoff-spec-v*.md
      HND_VERSION = max(N) + 1 (or 1 if none exist)

Step 3/7: Probe MCP availability
  - Sequential Thinking MCP only (no Axe, no Playwright)
  - Respects --no-mcp, --quick, --no-sequential-thinking flags

Step 4/7: Synthesize artifacts into spec content
  4a. Read all discovered artifacts into memory (brief, flows, screen inventory, wireframe HTML, tokens.css, critique, changelogs)
  4b. Extract ANNOTATION content from each wireframe's pde-state--* and interactive element blocks
  4c. Parse screen inventory for route mappings and component context
  4d. Parse design system tokens for Global Token Mappings section
  4e. Parse critique What Works + Deferred findings for Completeness Warnings section
  4f. If SEQUENTIAL_THINKING_AVAILABLE and annotation coverage is low:
      use mcp__sequential-thinking__think to reason about implied component interfaces
  4g. For each screen: derive component name list (from slug + type), TypeScript interface, breakpoint spec, interaction spec, token mappings, accessibility requirements, test spec
  4h. Build global sections: Design Coverage Summary, Route Structure, Shared Component APIs,
      Accessibility Overview, Gap Analysis, Test Specs Overview

Step 5/7: Write output files with lock
  5a. Acquire lock-acquire pde-handoff (retry 3 times, warn and continue if still locked)
  5b. Write .planning/design/handoff/HND-handoff-spec-v{HND_VERSION}.md (Write tool)
      Use templates/handoff-spec.md as structural scaffold
  5c. Write .planning/design/handoff/HND-types-v{HND_VERSION}.ts (Write tool)
      TypeScript interfaces only — no runtime code, no imports, just interface declarations
  5e. Release lock-release pde-handoff (ALWAYS release, even on error)

Step 6/7: Update handoff domain DESIGN-STATE
  - Use Glob to find .planning/design/handoff/DESIGN-STATE.md
  - If absent: create with standard domain template (design-state-domain.md)
  - Add HND artifact row to Artifact Index table
  - Column names: Code, Name, Skill, Status, Version, Enhanced By, Dependencies, Updated

Step 7/7: Update root DESIGN-STATE + manifest + coverage flag
  7a. Update root .planning/design/DESIGN-STATE.md (Edit tool)
      - Pipeline Progress: mark Handoff as complete
      - Decision Log: append entry
      - Iteration History: append HND-handoff-spec-v{HND_VERSION}.md entry
  7b. Register HND artifact in manifest (7 calls — same pattern as all prior skills)
  7c. Set coverage flag (read-before-set — CRITICAL to prevent clobber)
      Set hasHandoff: true, preserving all other fields
  7d. Output skill summary table (per skill-style-guide.md conventions)
```

### Pattern 2: STACK.md Hard Dependency with Recovery Message

**What:** Read `.planning/research/STACK.md` before any synthesis work. If absent, emit a specific recovery message and halt. This is the only hard dependency beyond ensure-dirs.

**When to use:** Step 2a, before any other prerequisite check.

**Recovery message (exact format to match skill-style-guide.md error structure):**

```
Error: No STACK.md found at .planning/research/STACK.md.
  /pde:handoff requires STACK.md to align component APIs to your project's technology.
  Create .planning/research/STACK.md documenting your tech stack:
    - Framework: React | Vue | Svelte | none
    - TypeScript: true | false
    - Component import path pattern (e.g., src/components/{ComponentName}.tsx)
    Then re-run /pde:handoff.
```

**Why hard dependency:** Without STACK.md, the component stubs section (React/Vue/Svelte) cannot be correctly generated. Producing framework-misaligned stubs is worse than halting — it creates confusion for the implementation engineer who receives the handoff spec.

**STACK.md parsing targets:**
- Framework: scan for "React", "Vue", "Svelte", "none" (case-insensitive) in the file
- TypeScript presence: scan for "TypeScript: true" or "tsx" extension references
- Import path pattern: scan for src/ path conventions mentioned in the stack
- Token import path: scan for CSS import pattern or token file location

### Pattern 3: Annotation-to-TypeScript Interface Synthesis

**What:** Parse `<!-- ANNOTATION: ... -->` comments from wireframe HTML to derive component prop shapes.

**When to use:** Step 4b, for every screen's wireframe file.

**Annotation parsing targets (defined in wireframe.md Step 4d):**

```
State blocks (pde-state--default, loading, error, empty):
  <!-- ANNOTATION: {trigger}. {what user sees}. {transition/recovery}. -->
  → Props: triggers load state, shows on condition, etc.
  → Events: onSuccess, onError, onRetry callbacks

Interactive elements:
  <!-- ANNOTATION: Click opens modal dialog with {content}. Close via X. Focus traps inside. -->
  → Props: isOpen, onClose, children
  → ARIA: role="dialog", aria-modal="true", focus trap behavior

  <!-- ANNOTATION: Form submit triggers POST to /api/{resource}. Submit disabled during POST.
       Loading state replaces form on success. Redirects to {screen} on completion.
       Field-level validation errors shown inline on failure. -->
  → Props: onSubmit, isLoading, errors
  → Events: onSubmit(formData), onSuccess(response), onError(errors)
```

**TypeScript interface shape derived from annotations:**

```typescript
// Source: wireframe ANNOTATION comments + screen context
interface LoginFormProps {
  /** Submission handler — fires POST to /api/auth/login */
  onSubmit: (data: LoginFormData) => Promise<void>;
  /** Controls loading state — disables submit button and shows loading state */
  isLoading?: boolean;
  /** Field-level validation errors keyed by field name */
  errors?: Record<string, string>;
  /** Callback on successful login — redirects to dashboard */
  onSuccess?: (user: User) => void;
}
```

**Interface naming convention:**
- One interface per identified component (named from screen slug + element type)
- Props interface: `{ComponentName}Props`
- Event payload types: defined inline or as named types if reused
- Callbacks: `on{EventName}: (payload: {PayloadType}) => void | Promise<void>`

### Pattern 4: Wireframe Version Selection (prefer iterated)

**What:** For each screen, prefer the highest-versioned iterated wireframe (`WFR-{screen}-v{N}.html`) over the original (`WFR-{screen}.html`). Iterated wireframes contain critique-applied improvements and are the most recent state of the design.

**When to use:** Step 2f, before any annotation parsing.

**Selection logic:**
```
For each screen slug in screen inventory:
  1. Glob for .planning/design/ux/wireframes/WFR-{screen}-v*.html
  2. If any exist: use highest version (max N suffix integer)
  3. If none exist: use .planning/design/ux/wireframes/WFR-{screen}.html (original)
  4. If neither exists: emit WARNING: "No wireframe found for screen '{screen}'.
       Run /pde:wireframe first for richer handoff output." — continue without this screen.
```

### Pattern 5: Design Coverage Summary with Completeness Warnings

**What:** The `## Design Coverage Summary` section in handoff-spec.md documents what was and was not available during synthesis. This is honest reporting for the implementation engineer.

**When to use:** Step 5b, when writing the spec document.

**Completeness warning triggers:**
- Wireframe exists but has zero `<!-- ANNOTATION: -->` comments → warn "No annotations found — TypeScript interface generated from element structure only, not behavioral specification"
- Critique exists but has open Critical or Major findings → warn "{N} unresolved critical/major findings from CRT-critique-v{N}.md — review before implementation"
- No iteration run (`hasIterate: false` in coverage) → info "Designs have not been through critique-driven iteration — consider running /pde:critique + /pde:iterate before implementing"
- Screen exists in screen inventory but no wireframe was generated → warn "Screen '{screen}' has no wireframe — no component spec produced for this screen"

### Anti-Patterns to Avoid

- **Generating runtime code:** HND-types-v{N}.ts must contain ONLY TypeScript interface declarations. No `export default`, no `const`, no React component JSX — only `interface {Name} { ... }` and `type {Name} = { ... }` declarations. Implementation engineers or AI coding agents write the actual code.
- **Overwriting existing handoff spec on re-run:** Always increment HND_VERSION. Never write to a path that already exists.
- **Setting hasHandoff without coverage-check:** Same read-before-set pattern as every prior skill. Required to prevent clobbering other skills' coverage flags.
- **Halting when upstream artifacts are missing:** Brief, flows, tokens, critique, changelogs are all soft dependencies. Emit warnings for each missing artifact and continue with the available data. Only STACK.md absence causes a halt.
- **Reading STACK.md from a wrong location:** The hard dependency path is `.planning/research/STACK.md`. Do not search parent directories or project root — use this exact path.
- **Assuming framework from package.json when STACK.md exists:** STACK.md is the authoritative source. Do not read package.json — STACK.md was explicitly created to provide this guidance.
- **Mapping ANNOTATION comments mechanically:** Annotations describe behavioral intent. Use Claude's reasoning to map them to appropriate TypeScript signatures, not string extraction. An annotation saying "Click opens modal with {content}" → `isOpen: boolean; onClose: () => void;` — this requires semantic understanding.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Manifest registration | Custom JSON writer | `pde-tools.cjs design manifest-update HND ...` | Same 7-call pattern tested across 6 prior skills |
| Write locking | Custom lock file | `pde-tools.cjs design lock-acquire pde-handoff` | 60s TTL, auto-clear on stale lock, operates on root DESIGN-STATE.md |
| Coverage flag update | Direct JSON edit | `coverage-check` + `manifest-set-top-level designCoverage` | Read-before-set pattern prevents clobbering 7 existing flags |
| TypeScript interface generation | json-schema-to-typescript | Claude writes TypeScript text directly | LLM-authored interfaces are more semantically accurate; confirmed in STACK.md |
| Framework detection | package.json parser | Read `.planning/research/STACK.md` | STACK.md is explicit design intent; package.json auto-detection can be wrong |
| Annotation extraction | HTML/regex parser | Claude reads wireframe HTML and reasons about annotations | Annotations describe behavioral semantics; regex extracts text but misses intent |
| Handoff spec template | New document structure | Follow `templates/handoff-spec.md` exactly | Template already defines all required sections including hardware sections |
| Iteration depth detection | Separate state | Glob for `ITR-changelog-v*.md` (same pattern as iterate skill) | Self-evident from existing files; consistent with prior skills |

**Key insight:** This skill is a synthesis task, not a transformation task. Claude's value here is interpreting meaning from ANNOTATION comments, critique findings, and design system tokens to produce coherent component interfaces — not mechanical extraction. The only mechanical operations (manifest update, lock management) are already handled by pde-tools.cjs.

---

## Common Pitfalls

### Pitfall 1: Sparse Annotations → Empty TypeScript Interfaces

**What goes wrong:** Wireframes were generated with `--quick` or at lo-fi fidelity without full annotation blocks. The handoff skill reads the wireframes but finds few or no `<!-- ANNOTATION: -->` comments. The generated TypeScript interfaces are skeletal (`interface LoginProps {}`) or contain only generic placeholder props.

**Why it happens:** Phase 16 documents that ANNOTATION comments are "mandatory" but the wireframe workflow only WARNS when an annotation is absent — it does not halt. Lo-fi wireframes in particular may have minimal annotation content.

**How to avoid:** In Step 2j, count annotated state blocks per screen. Surface a warning when annotation coverage is below threshold. Recommend the user re-run `/pde:wireframe` to regenerate with full annotations before handoff. Use Sequential Thinking MCP when available to reason about implied interfaces from the unannotated wireframe structure.

**Warning signs:** Generated `HND-types-v{N}.ts` contains empty or single-property interfaces for complex screens like dashboards or forms.

### Pitfall 2: Wrong Framework Stubs from Misread STACK.md

**What goes wrong:** The skill searches STACK.md for "React" and finds it in a sentence like "Unlike React, this project uses Vue 3" — and generates React stubs when the project uses Vue.

**Why it happens:** STACK.md is free-form text written by researchers, not a structured configuration file. Simple string search can produce false positives.

**How to avoid:** When parsing STACK.md for framework, look for the primary framework recommendation section — typically under "Core Technologies" or "Standard Stack" tables. Look for patterns like `| React |`, `| Vue |`, `| Svelte |` in table rows, or explicit "Use X" statements. If ambiguous, output ALL three stub variants (React, Vue, Svelte) and note "Framework detection was ambiguous — review stubs and remove non-applicable sections."

**Warning signs:** The user's project uses Vue but `HND-types-v{N}.ts` contains JSX-style React stubs.

### Pitfall 3: Overwriting Output from a Prior Run

**What goes wrong:** The skill writes `HND-handoff-spec-v1.md` on re-run, overwriting the prior version 1 spec.

**Why it happens:** The version gate logic in Step 2k uses `max(N) + 1` — if not implemented correctly, it could default to version 1 on every run.

**How to avoid:** In Step 2k, always Glob for `HND-handoff-spec-v*.md` before writing. If the glob returns no matches, use version 1. If it returns matches, use `max(N from matches) + 1`. Log the determined version number at end of Step 2.

**Warning signs:** `HND-handoff-spec-v1.md` exists but was just overwritten — check `design-manifest.json` for the prior version path.

### Pitfall 4: hasHandoff Coverage Flag Clobbers Prior Flags

**What goes wrong:** Step 7c calls `manifest-set-top-level designCoverage` with only `{"hasHandoff": true}`, resetting all other coverage flags to their defaults.

**Why it happens:** `manifest-set-top-level` replaces the ENTIRE designCoverage object. Called without a prior coverage-check, it wipes `hasDesignSystem`, `hasFlows`, `hasWireframes`, `hasCritique`, `hasIterate`, and `hasHardwareSpec`.

**How to avoid:** Always run `coverage-check` before calling `manifest-set-top-level`. Extract all current field values (now 7 fields, including `hasIterate` introduced by Phase 18) and merge `hasHandoff: true` before writing. The full object:

```bash
# Source: pattern from workflows/iterate.md Step 7c
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
# Parse COV JSON. Extract ALL seven current flag values.
# Merge hasHandoff: true.
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasFlows":{current},"hasWireframes":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":true,"hasHardwareSpec":{current}}'
```

**Warning signs:** After running handoff, `coverage-check` shows `hasDesignSystem: false` when it was previously true.

### Pitfall 5: Iterated vs Original Wireframe Selection

**What goes wrong:** The skill reads the original `WFR-{screen}.html` instead of the latest iterated `WFR-{screen}-v{N}.html`. The resulting handoff spec reflects pre-critique design decisions that were subsequently revised.

**Why it happens:** Globbing for `WFR-*.html` without filtering for versioned files returns all files including the original.

**How to avoid:** For each screen slug, Glob separately for versioned files (`WFR-{screen}-v*.html`). If any versioned file exists, use the highest N. Only fall back to the original if no versioned file is found. See Pattern 4 above for exact logic.

**Warning signs:** Handoff spec describes a design state that predates critique-driven improvements — e.g., missing an accessibility fix that was applied in `WFR-login-v1.html`.

### Pitfall 6: Hardware Sections Written for Software-Only Product

**What goes wrong:** The handoff spec includes `## BOM Export`, `## Dimension Drawings`, etc., for a software product.

**Why it happens:** The `templates/handoff-spec.md` template includes hardware sections. A naive "fill in the template" approach copies them for software products.

**How to avoid:** Check the `productType` field from the design brief (or design-manifest.json). If `productType === "software"`, omit all hardware sections. If `productType === "hardware"`, omit the software component API sections. If `productType === "hybrid"`, include both. The template's `*(When product type is hardware or hybrid)*` comment marks the hardware section as conditional.

**Warning signs:** Software product handoff spec contains `## BOM Export` table.

---

## Code Examples

Verified patterns from existing project workflows:

### Ensure-dirs (Step 1 — identical across all skills)

```bash
# Source: workflows/iterate.md Step 1 / workflows/critique.md Step 1
INIT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design ensure-dirs)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

### STACK.md Hard Dependency (Step 2a)

```bash
# Read from exact path — do not search elsewhere
# Use Read tool to load .planning/research/STACK.md
# If file does not exist (Read tool returns error): HALT with this message:
#
# Error: No STACK.md found at .planning/research/STACK.md.
#   /pde:handoff requires STACK.md to align component APIs to your project's technology.
#   Create .planning/research/STACK.md documenting your tech stack:
#     - Framework: React | Vue | Svelte | none
#     - TypeScript: true | false
#     - Component import path pattern (e.g., src/components/{ComponentName}.tsx)
#   Then re-run /pde:handoff.
```

### Version Gate for Handoff Output (Step 2k)

```bash
# Glob for: .planning/design/handoff/HND-handoff-spec-v*.md
# Parse v{N} suffix from each match, extract max N
# HND_VERSION = max(N) + 1  (or 1 if none exist)
# Both files use the same version: HND-handoff-spec-v{HND_VERSION}.md and HND-types-v{HND_VERSION}.ts
```

### Wireframe Version Selection (Step 2f)

```bash
# For each screen slug in SCREENS:
#   Glob for: .planning/design/ux/wireframes/WFR-{screen}-v*.html
#   If any exist: use highest version (parse v{N} suffix, take max N)
#   If none exist: fall back to .planning/design/ux/wireframes/WFR-{screen}.html
#   If neither: emit warning and skip this screen
```

### Lock-Acquire/Release for File Writes (Step 5)

```bash
# Source: workflows/iterate.md Step 5a / workflows/critique.md Step 5a
LOCK=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-acquire pde-handoff)
if [[ "$LOCK" == @file:* ]]; then LOCK=$(cat "${LOCK#@file:}"); fi
# Parse {"acquired": true/false} — retry 3 times on false, warn and continue if still locked

# ALWAYS release — even on error:
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-release pde-handoff
```

### Manifest Registration (Step 7b — 7-call pattern)

```bash
# Source: workflows/iterate.md Step 7b — same 7-call pattern
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update HND code HND
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update HND name "Design Handoff"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update HND type handoff
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update HND domain handoff
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update HND path ".planning/design/handoff/HND-handoff-spec-v${HND_VERSION}.md"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update HND status complete
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update HND version ${HND_VERSION}
```

### Coverage Flag (Step 7c — read-before-set with 7 fields)

```bash
# Source: workflows/iterate.md Step 7c — mandatory read-before-set
# IMPORTANT: Phase 18 introduced hasIterate as the 7th field.
# The live manifest NOW has 7 fields in designCoverage.
# Read-before-set must extract ALL 7 values, not just the original 6.
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
# Parse COV JSON. Extract all 7 current flag values: hasDesignSystem, hasFlows,
# hasWireframes, hasCritique, hasIterate, hasHandoff, hasHardwareSpec.
# Set hasHandoff: true.
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasFlows":{current},"hasWireframes":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":true,"hasHardwareSpec":{current}}'
```

### TypeScript Interface Output Format (HND-types-v{N}.ts)

```typescript
// Source: templates/handoff-spec.md Shared Component APIs section + per-screen Component APIs
// Claude writes this as text output — no runtime code, no imports, only interface declarations

// ─── Shared Component APIs ────────────────────────────────────────────────────

interface {ComponentName}Props {
  /** {description derived from ANNOTATION and screen context} */
  {propName}: {type};
  /** {description} */
  {optionalProp}?: {type};
  /** Callback fired when {event derived from ANNOTATION trigger description} */
  on{EventName}?: (payload: {PayloadType}) => void;
}

// ─── Screen: {ScreenName} ─────────────────────────────────────────────────────
// Wireframe: WFR-{screen}[-v{N}].html
// Route: {/path from FLW-screen-inventory.json if available}

interface {ScreenName}{ComponentName}Props {
  // ... derived from screen-specific ANNOTATION comments
}
```

### commands/handoff.md Replacement (complete process section)

```markdown
<process>
Follow @workflows/handoff.md exactly.

Pass all of $ARGUMENTS to the workflow.
</process>
```

The `allowed-tools` frontmatter must include `mcp__sequential-thinking__*` (same as `commands/critique.md` and `commands/iterate.md`).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-----------------|--------------|--------|
| handoff as planned stub (`commands/handoff.md` says "Planned -- available in PDE v2") | Full workflow implementation following 7-step pattern | Phase 19 | Replace stub content entirely; the stub references "mockup" in prerequisites which is wrong for v1.1 |
| `hasHandoff` already in coverage schema | `hasHandoff` is one of the ORIGINAL 6 fields in the template manifest | Confirmed by design-manifest.json inspection | Unlike `hasIterate` (introduced by Phase 18), `hasHandoff` already exists — do NOT introduce it as new; just set it to true |
| designCoverage has 6 fields | designCoverage now has 7 fields (hasIterate introduced by Phase 18) | Phase 18 | Coverage-check read-before-set must extract 7 fields, not 6 |
| No `.planning/design/handoff/` content | HND-handoff-spec-v{N}.md and HND-types-v{N}.ts written here | Phase 19 | handoff/ directory already created by ensure-dirs (DOMAIN_DIRS includes "handoff"); no mkdir needed |
| Critique and iterate are upstream inputs | handoff is a READER of CRT and ITR artifacts, not a writer | Architecture confirmed | handoff does NOT modify critique reports or changelogs — it reads them for Completeness Warnings and design decisions |

**Deprecated/outdated:**
- `commands/handoff.md` stub: the `<process>` block must be replaced with the delegation pattern. The stub references "mockup" which is not part of the v1.1 pipeline.
- The stub description mentions "component APIs, spacing and token annotations, interaction specifications, and an asset export manifest" — this remains accurate for the v1.1 output but "final mockups" as the source is wrong; the source is wireframes (not mockups).

---

## Open Questions

1. **Whether to generate a separate HND-types-v{N}.ts or embed TypeScript inline in the spec**
   - What we know: `templates/handoff-spec.md` includes TypeScript interfaces inline within the Per-Screen Detail Specs sections. The STACK.md describes TypeScript interfaces as a separate output.
   - What's unclear: Whether implementation engineers prefer a single document (easier to read) or two files (easier to import the types file into a codebase).
   - Recommendation: Generate BOTH. The spec document includes inline interface declarations for readability; the `.ts` file is the same content extracted for direct import. The cost is minimal (Claude writes the same content twice); the benefit is that engineers get the right file for each use case.

2. **How to handle no upstream artifacts at all**
   - What we know: All non-STACK.md prerequisites are soft dependencies. The skill could theoretically run against an empty design directory.
   - What's unclear: Is a completely empty handoff spec (no wireframes, no brief, no flows) useful?
   - Recommendation: After checking all soft dependencies in Step 2, count how many are present. If NONE are present (no brief, no flows, no wireframes, no tokens), emit a warning and halt gracefully: "No design artifacts found. Run /pde:brief, /pde:flows, /pde:wireframe before handoff." This prevents an empty spec from being written. One or more artifacts present → proceed with what's available.

3. **Whether to register HND-types-v{N}.ts as a separate manifest artifact**
   - What we know: The manifest uses a single entry per skill run (artifact code HND). The path points to one file. Prior skills (WFR) use the directory path when multiple files are produced.
   - What's unclear: Whether the types file warrants its own artifact code.
   - Recommendation: Use a single HND artifact entry. Set path to `.planning/design/handoff/` (directory) to capture both files. This is consistent with how WFR registers the wireframes/ directory. Optionally add a second `HND-types` entry if Phase 20 (build orchestrator) needs to detect the types file separately — but do not over-engineer for a requirement that hasn't been stated.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in (`--self-test` flag in design.cjs) |
| Config file | None — tests are inline in `bin/lib/design.cjs` |
| Quick run command | `node bin/lib/design.cjs --self-test` |
| Full suite command | `node bin/lib/design.cjs --self-test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HND-01 | /pde:handoff produces HND-handoff-spec-v{N}.md with Route Structure, Component APIs, Token Mappings sections | manual-only | manual — requires Claude inference to synthesize upstream artifacts | N/A |
| HND-01 | Handoff spec includes Design Coverage Summary with staleness and completeness warnings | manual-only | manual — verify section presence and warning accuracy | N/A |
| HND-02 | HND-types-v{N}.ts contains TypeScript interfaces for each identified component | manual-only | manual — verify file content and interface shape quality | N/A |
| HND-02 | TypeScript interfaces derive from ANNOTATION comments in wireframe HTML | manual-only | manual — compare annotation content against generated interface props | N/A |
| HND-03 | Handoff halts with recovery message when STACK.md is absent | manual-only | manual — delete STACK.md and verify error message | N/A |
| HND-03 | Component stubs use framework-appropriate syntax based on STACK.md | manual-only | manual — verify React/Vue/Svelte stubs match STACK.md framework | N/A |

**Rationale for manual-only classification:** All HND requirements involve Claude inference (synthesizing multiple upstream artifacts into a coherent spec, deriving TypeScript interfaces from semantic annotation content, framework detection from STACK.md). These are the same class of workflow-level tests that all prior PDE skills have classified as manual-only, consistent with the precedent from Phase 15.1.

### Sampling Rate

- **Per task commit:** `node bin/lib/design.cjs --self-test` (infrastructure regression check)
- **Per wave merge:** `node bin/lib/design.cjs --self-test`
- **Phase gate:** `node bin/lib/design.cjs --self-test` green + manual acceptance criteria verification

### Wave 0 Gaps

None — existing test infrastructure (`design.cjs --self-test`) covers the infrastructure layer. The handoff skill itself is a workflow file (markdown), not a code module, so no new test files are needed.

---

## Sources

### Primary (HIGH confidence)

- `templates/handoff-spec.md` (full file, 404 lines) — complete output document structure: Design Coverage Summary, Route Structure, Global Token Mappings, Shared Component APIs, Accessibility Overview, Motion System, Gap Analysis, Test Specs Overview, Per-Screen Detail Specs (with React/Vue/Svelte stubs), Hardware Handoff (conditional on product type)
- `templates/handoff-manifest.json` — confirmed: separate handoff manifest template exists (schema_version, source_stage, target_stage, artifacts array)
- `commands/handoff.md` — confirmed stub: "Planned -- available in PDE v2" text to be replaced; allowed-tools already includes Read, Write, Edit, Bash, Glob, Grep, Task; missing `mcp__sequential-thinking__*`
- `workflows/iterate.md` (full file) — canonical 7-step structure, lock-acquire/release pattern, manifest registration 7-call pattern, coverage-check read-before-set, anti-patterns — directly reused in handoff
- `workflows/wireframe.md` Step 4d — confirmed: ANNOTATION comment format, placement rules, interactive element annotation types (modal, form, drawer, dropdown, tabs, pagination) — primary source for annotation parsing spec
- `.planning/research/STACK.md` (full file) — confirmed: TypeScript interface generation decision ("Claude writes .ts files directly as text output"); STACK.md file path confirmed as `.planning/research/STACK.md`; framework detection from file reading not package.json
- `bin/lib/design.cjs` (full file) — confirmed: `handoff` is in `DOMAIN_DIRS` array (line 17) — directory already created by ensure-dirs; `readManifest`, `writeManifest`, `updateManifestArtifact`, `cmdManifestSetTopLevel` implementations verified
- `.planning/design/design-manifest.json` (live) — confirmed: `hasHandoff` IS in the original 6-field designCoverage schema (not introduced by Phase 19 — already present); `hasIterate` introduced by Phase 18 makes 7 total fields
- `workflows/critique.md` commands/critique.md — confirmed delegation pattern: `Follow @workflows/critique.md exactly. Pass all of $ARGUMENTS to the workflow.`
- `.planning/STATE.md` lines 93, 109 — Phase 16 decision: "ANNOTATION: comments are mandatory on all state variants and interactive elements — Phase 19 handoff reads these to generate TypeScript component APIs"; research flag: "TypeScript interface quality degrades if wireframe annotations are sparse"
- `.planning/REQUIREMENTS.md` — HND-01, HND-02, HND-03 requirement text confirmed
- `references/skill-style-guide.md` — error message structure (What/Why/What-to-do), summary table format, progress indicator format, prerequisite warning format

### Secondary (MEDIUM confidence)

- `templates/design-state-domain.md` — handoff domain DESIGN-STATE column names: Code, Name, Skill, Status, Version, Enhanced By, Dependencies, Updated (note: "Dependencies" is the column in domain template, not "Notes" as in ux domain)
- `.planning/phases/18-critique-driven-iteration-pde-iterate/18-RESEARCH.md` — upstream interface confirmation: hasIterate field introduced, coverage flag now 7 fields, What Works parsing from live CRT file, iteration changelog format

### Tertiary (LOW confidence)

None — all claims in this research are grounded in directly read project files.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools verified by direct inspection of existing skill workflows and design.cjs source; no new libraries required
- Architecture patterns: HIGH — 7-step pattern observed across wireframe.md, flows.md, critique.md, iterate.md; annotation parsing source derived from wireframe.md Step 4d (verbatim rules); STACK.md path confirmed from live file; output structure derived from templates/handoff-spec.md
- Pitfalls: HIGH — hasHandoff already-in-schema confirmed by direct manifest inspection; hasIterate-as-7th-field confirmed from Phase 18 research; annotation quality risk confirmed by STATE.md research flag; version gate logic derived from iterate.md and wireframe.md patterns; hardware section conditionality evident from template markers
- TypeScript generation: HIGH — STACK.md decision confirmed (LLM writes .ts directly); annotation-to-interface mapping derived from wireframe.md annotation format specifications

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable project — no external dependencies that could drift)
