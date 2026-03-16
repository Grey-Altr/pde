# Phase 13: Problem Framing (/pde:brief) - Research

**Researched:** 2026-03-15
**Domain:** Claude Code skill implementation — workflow authoring, Markdown artifact generation, DESIGN-STATE update protocol
**Confidence:** HIGH (all findings verified by direct inspection of existing PDE source; no training-data guesses used)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BRF-01 | `/pde:brief` reads PROJECT.md and produces `BRF-brief-v1.md` in `.planning/design/strategy/` covering problem statement, personas, jobs-to-be-done, goals, constraints, and non-goals | `templates/design-brief.md` defines the exact output structure. `ensureDesignDirs()` from `bin/lib/design.cjs` initializes the `strategy/` domain directory. The workflow reads `.planning/PROJECT.md` as primary input. |
| BRF-02 | Brief detects software/hardware/hybrid product type and records design constraints specific to that type | Product type detection: read `PROJECT.md` for tech stack signals (Node.js/React/CSS → software; PCB/CAD/BOM → hardware; both signals → hybrid). Type is written into brief frontmatter and the `## Product Type` section. Constraints specific to each type are documented below. |
</phase_requirements>

---

## Summary

Phase 13 implements the first design pipeline skill: `/pde:brief`. The skill reads the project's existing `.planning/PROJECT.md` (and optionally `.planning/REQUIREMENTS.md`) and produces a structured Markdown brief at `.planning/design/strategy/BRF-brief-v1.md`. This brief becomes the single anchor document that all downstream design skills (flows, system, wireframe, critique, iterate, handoff) read for product context.

The implementation has two deliverables: (1) a workflow file at `workflows/brief.md` that contains the full brief-generation logic, and (2) an update to `commands/brief.md` that replaces the "planned — available in v2" stub with a reference to the new workflow. Both files follow patterns already established for all 29 existing v1.0 skills. No new libraries, no new pde-tools.cjs subcommands, and no structural changes to Phase 12's infrastructure are needed.

The one technically interesting requirement is product-type detection (BRF-02). This is a reasoning task, not a code task — the workflow instructs Claude to scan PROJECT.md for signals (stack keywords, constraint language, user persona descriptions) and make a classification decision. The classification drives which constraint table is written into the brief's `## Product Type` section. For v1.1 the three valid values are `software`, `hardware`, and `hybrid`.

**Primary recommendation:** Implement `workflows/brief.md` first (BRF-01 + BRF-02 logic), then update `commands/brief.md` to reference it. The workflow is a single self-contained file — there is no task decomposition needed.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Markdown + YAML frontmatter | — | `BRF-brief-v1.md` output format | All design artifacts use Markdown; `templates/design-brief.md` is the authoritative template for this artifact |
| `bin/lib/design.cjs` | Phase 12 | Directory init, DESIGN-STATE update, manifest write | Implemented and self-tested in Phase 12; the brief workflow calls `design ensure-dirs` and `design manifest-update` via `bin/pde-tools.cjs` |
| Node.js `fs` (via pde-tools.cjs) | built-in | Read `.planning/PROJECT.md`; write `BRF-brief-v1.md` | Zero-dep constraint is non-negotiable for v1.1 |
| `templates/design-brief.md` | — | Canonical output structure | Template already exists; workflow uses it as a filling guide, not a string-interpolated template (Claude fills in the sections) |
| `templates/design-state-domain.md` | — | Canonical structure for `strategy/DESIGN-STATE.md` | Created by brief workflow when it writes the first strategy-domain artifact |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Sequential Thinking MCP | STABLE | Enhanced product-type reasoning and persona synthesis | Probe per `mcp-integration.md`; degrade gracefully if unavailable |
| `references/skill-style-guide.md` | 1.0 | Output formatting conventions (summary table, step progress, error messages) | Loaded via `@` reference in `commands/brief.md` |
| `references/mcp-integration.md` | 1.1.0 | MCP probe/use/degrade pattern | Loaded via `@` reference in `commands/brief.md` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Workflow fills template sections via Claude reasoning | String-interpolated template engine | Claude filling template sections produces richer, context-specific content; string interpolation just moves placeholders around |
| `pde-tools.cjs design manifest-update` for manifest writes | Direct `fs.writeFileSync` in workflow | Using the manifest-update subcommand keeps all manifest writes behind the same abstraction used by all design skills; direct writes would bypass the `updatedAt` timestamp logic |
| Single `BRF-brief-v1.md` artifact code | Multiple artifact codes (BRF-problem, BRF-personas, BRF-constraints) | Single code matches the template design; downstream skills reference `BRF` as one anchor; splitting would complicate manifest lookups |

**Installation:** No new npm packages. Zero dependencies (same as Phase 12).

---

## Architecture Patterns

### Recommended Project Structure

Phase 13 creates two source files and produces one runtime artifact:

```
# Source files (in PDE plugin repo):
commands/brief.md           MODIFY — replace stub <process> with @workflows/brief.md reference
workflows/brief.md          NEW — full brief workflow implementation

# Runtime artifacts (created when /pde:brief runs in a user project):
.planning/design/
├── DESIGN-STATE.md                          (already exists from Phase 12)
├── design-manifest.json                     (already exists from Phase 12)
└── strategy/
    ├── DESIGN-STATE.md                      NEW — created by brief workflow (strategy domain state)
    └── BRF-brief-v1.md                      NEW — the primary artifact
```

### Pattern 1: Command Stub → Workflow Reference

**What:** The existing `commands/brief.md` stub has a `<process>` section that says "planned — available in v2." Phase 13 replaces that content with two lines: an `@` reference to `workflows/brief.md` and a reference to `references/skill-style-guide.md`.

**When to use:** All design pipeline skills follow this exact pattern. The command file is thin — it declares the slash command YAML and delegates all logic to the workflow file.

**Example (target state for `commands/brief.md`):**

```yaml
---
name: pde:brief
description: Generate a structured product design brief from your project context
argument-hint: ""
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
---
```

```markdown
<process>
@workflows/brief.md
</process>
```

**Source:** Verified from all 29 existing `commands/*.md` files — every non-stub command uses this exact delegation pattern. The stub cleanup was the purpose of Phase 11 (Command Reference Cleanup).

### Pattern 2: Skill-as-Self-Contained-Workflow

**What:** `workflows/brief.md` is a complete workflow that can run when invoked directly (`/pde:brief`) or when called by the Phase 20 orchestrator (`/pde:build`). It follows the Skill-as-Self-Contained-Workflow pattern documented in `ARCHITECTURE.md` Pattern 1.

**The 7-step structure every design skill must follow:**
1. Read `.planning/design/DESIGN-STATE.md` to see what artifacts already exist
2. Check prerequisite artifacts — brief has only one: `PROJECT.md` must exist
3. If prerequisites missing: warn user, offer guidance
4. Produce output artifacts
5. Update domain DESIGN-STATE.md (`strategy/DESIGN-STATE.md`)
6. Update root DESIGN-STATE.md cross-domain dependency map (acquire lock, merge, release)
7. Update `design-manifest.json`
8. Display summary table per `skill-style-guide.md` conventions

**Standalone vs. orchestrated behavior:** Because the workflow reads DESIGN-STATE.md on startup and checks artifact existence independently, running `/pde:brief` directly produces the same `BRF-brief-v1.md` as running it through `/pde:build`. The orchestrator adds no behavior — it only calls skills in order. This satisfies BRF-01 success criterion 4.

### Pattern 3: DESIGN-STATE Write Protocol (Brief-Specific)

**What:** The brief is the first skill to run in any new pipeline, so it initializes state that all downstream skills depend on. The protocol has three write operations:

```
Step A: Call `node bin/pde-tools.cjs design ensure-dirs` (idempotent — creates dirs if absent)
Step B: Write BRF-brief-v1.md to .planning/design/strategy/
Step C: Write strategy/DESIGN-STATE.md from templates/design-state-domain.md (create if absent)
          → Add BRF artifact row to Artifact Index table
Step D: Acquire root write lock
Step E: Update root DESIGN-STATE.md:
          → Add BRF row to Cross-Domain Dependency Map
          → Update Quick Reference: Product Type, Platform
          → Append to Decision Log: "BRF — brief complete, product type detected as {type}"
          → Append to Iteration History: BRF-brief-v1 | v1 | Created by /pde:brief | {date}
Step F: Release root write lock
Step G: Update design-manifest.json:
          → Set artifacts.BRF = { code, name, type, domain, path, status, version, dependsOn, ... }
          → (designCoverage.hasBrief does not exist in manifest schema — this is fine, brief completion is tracked via artifacts.BRF presence)
```

**Lock pattern (exact pde-tools.cjs calls):**
```bash
node bin/pde-tools.cjs design lock-acquire pde-brief
# ... write to root DESIGN-STATE.md ...
node bin/pde-tools.cjs design lock-release
```

### Pattern 4: Product Type Detection Algorithm

**What:** BRF-02 requires detecting `software | hardware | hybrid`. This is a reasoning task done by Claude within the workflow — not code. The workflow instructs Claude to scan PROJECT.md for these signals:

**Software signals:**
- Tech stack mentions: Node.js, React, Vue, TypeScript, Python, Swift, Kotlin, SQL, API, SaaS, web app, mobile app, CLI
- Deployment terms: deploy, server, cloud, containerize, npm, pip, app store
- Distribution: web browser, mobile OS, desktop OS

**Hardware signals:**
- Physical components: PCB, circuit board, 3D print, CAD, BOM, enclosure, firmware, microcontroller, sensor, actuator, embedded
- Manufacturing terms: assembly, injection mold, CNC, FDM, tolerance, BOM
- Distribution: product box, physical unit, supply chain

**Hybrid signals:** Presence of BOTH software and hardware signals in the same project description.

**Fallback:** When signals are ambiguous, default to `software` (the most common case) and document the reasoning in the brief's `## Product Type` section under "Rationale."

**Design constraints per product type:**

| Type | Constraint Categories |
|------|-----------------------|
| software | Screen resolution targets, browser/OS compatibility, accessibility requirements (WCAG 2.2 AA), touch vs. mouse interaction model, responsive breakpoints |
| hardware | Physical dimensions and tolerances, material constraints, manufacturing process limits, regulatory compliance (CE, UL, FCC), IP rating if applicable |
| hybrid | Combined software UX constraints + hardware physical constraints + integration protocol (BLE, USB, API bridge) |

### Anti-Patterns to Avoid

- **Writing BRF-brief-v1.md without calling `ensure-dirs` first:** The `strategy/` directory may not exist if this is the first design skill to run. Always call `ensure-dirs` as the first step — it is idempotent.
- **Overwriting BRF-brief-v1.md on re-run:** If `BRF-brief-v1.md` already exists, the workflow should prompt the user to confirm regeneration and then write `BRF-brief-v2.md`, not overwrite v1. DESIGN-STATE.md current version pointer is updated to v2.
- **Writing to root DESIGN-STATE.md without the write lock:** Another skill or the orchestrator may be running concurrently. Always acquire the lock via `pde-tools.cjs design lock-acquire`, write, then release. Do not write to root DESIGN-STATE.md directly without the lock.
- **Skipping domain DESIGN-STATE.md creation:** The brief must create `strategy/DESIGN-STATE.md` from `templates/design-state-domain.md`. If this file is absent, `/pde:flows` (Phase 15) will have no domain state to read and cannot discover prior brief artifacts.
- **Treating PROJECT.md as optional:** PROJECT.md is the brief's primary input. If it is absent, the workflow must error (not warn), because it cannot synthesize a meaningful brief without project context. All other prerequisites are soft dependencies; PROJECT.md is a hard dependency.
- **Confusing design-manifest.json `designCoverage` flags with brief completion:** The manifest schema has flags like `hasDesignSystem`, `hasWireframes`, `hasFlows`, but NOT `hasBrief`. Brief completion is determined by the presence of `artifacts.BRF` in the manifest, not by a coverage flag. Do not add a `hasBrief` flag to the manifest — it is not in the schema.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Initializing design directories | Custom mkdir logic in workflow | `pde-tools.cjs design ensure-dirs` | Already implemented and tested in Phase 12; idempotent, handles DESIGN-STATE.md and manifest initialization |
| Writing to design-manifest.json | Direct `fs.writeFileSync` in workflow | `pde-tools.cjs design manifest-update BRF <field> <value>` | Manifest writes need `updatedAt` timestamp and artifact structure consistency; manifest-update handles this |
| Acquiring write lock | Markdown table manipulation in workflow | `pde-tools.cjs design lock-acquire pde-brief` | Write lock logic is in design.cjs; don't duplicate |
| Resolving artifact paths | Manual path concatenation in workflow | `pde-tools.cjs design artifact-path BRF` | Canonical path logic in manifest; one source of truth |
| Brief output structure | Custom Markdown schema invented in workflow | `templates/design-brief.md` | Template is the authoritative structure; all downstream skills know this structure |
| Domain DESIGN-STATE.md structure | Custom schema invented in workflow | `templates/design-state-domain.md` | Domain state template is authoritative; consistent schema enables Phase 20 orchestrator to read all domains uniformly |

**Key insight:** The brief workflow's job is reasoning and synthesis, not infrastructure. Every infrastructure concern (directory creation, state management, manifest updates, lock management) is already solved in Phase 12 and exposed via `pde-tools.cjs` subcommands. The workflow uses those subcommands and focuses entirely on extracting product context from PROJECT.md and writing a high-quality brief.

---

## Common Pitfalls

### Pitfall 1: PROJECT.md Not Found — Workflow Continues Anyway

**What goes wrong:** The workflow attempts to read PROJECT.md, receives a null/empty result, and continues generating a brief full of placeholder text. Downstream skills receive a structurally valid but content-empty brief.

**Why it happens:** Soft error handling that treats a missing input as a warning rather than a halt condition.

**How to avoid:** Check for PROJECT.md existence as the first step after `ensure-dirs`. If absent, error (not warn) with the exact error format from `skill-style-guide.md`:
```
Error: PROJECT.md not found at .planning/PROJECT.md
  /pde:brief requires a project description to generate a design brief.
  Run /pde:new-project first to initialize your project, then re-run /pde:brief.
```

**Warning signs:** BRF-brief-v1.md contains sections filled with template placeholder text like "{1-2 paragraph description}".

### Pitfall 2: Re-Run Overwrites Existing Brief

**What goes wrong:** User runs `/pde:brief` twice (perhaps to regenerate with updated PROJECT.md). The second run overwrites `BRF-brief-v1.md`, destroying the original that flows/wireframes were based on. DESIGN-STATE.md still points to "v1" but the content has changed.

**Why it happens:** Missing version-check logic at the start of the workflow.

**How to avoid:** At startup, check if `strategy/BRF-brief-v1.md` exists. If it does:
- In standalone mode: prompt user: "A brief already exists (v1, created {date}). Generate a new version? (This will create BRF-brief-v2.md)"
- In orchestrated mode (via /pde:build): skip — brief is already complete; report "brief: already complete (v1)"
- Never overwrite an existing versioned artifact.

**Warning signs:** Only one BRF-brief file exists in strategy/ despite multiple `/pde:brief` invocations.

### Pitfall 3: strategy/DESIGN-STATE.md Not Created

**What goes wrong:** The workflow writes `BRF-brief-v1.md` but skips initializing `strategy/DESIGN-STATE.md`. The strategy domain has no state file. `/pde:flows` cannot read strategy domain state and has no way to discover that a brief exists.

**Why it happens:** The workflow author focuses on the primary artifact and forgets the domain state file, which is a supporting infrastructure step.

**How to avoid:** After writing `BRF-brief-v1.md`, explicitly write `strategy/DESIGN-STATE.md` from `templates/design-state-domain.md` (replacing `{domain_name}` with `strategy` and `{Domain}` with `Strategy`) and append the BRF artifact row to its Artifact Index table.

**Warning signs:** `ls .planning/design/strategy/` shows `BRF-brief-v1.md` but no `DESIGN-STATE.md`.

### Pitfall 4: Root DESIGN-STATE.md Written Without Lock

**What goes wrong:** The workflow updates the root `DESIGN-STATE.md` directly, concurrent with another process that also writes (e.g., `/pde:build` running skills in rapid sequence). The file becomes corrupted with interleaved partial writes.

**Why it happens:** The write-lock step is omitted or the lock-release step is skipped on error.

**How to avoid:** Always use the try/finally-style pattern:
1. `pde-tools.cjs design lock-acquire pde-brief` — if returns `{"acquired":false}`, retry after 2 seconds (stale locks are auto-cleared by acquire logic)
2. Write to root DESIGN-STATE.md
3. `pde-tools.cjs design lock-release` — in the final cleanup step, not only on success

**Warning signs:** Root DESIGN-STATE.md Write Lock table has a row with an unexpired Expires timestamp long after the skill completed.

### Pitfall 5: Product Type Classification Written Inconsistently

**What goes wrong:** The workflow writes `Type: Software` (capitalized, singular) in the brief frontmatter but `software` (lowercase) in the `## Product Type` section, and the root DESIGN-STATE.md Quick Reference gets `sw`. Three different representations of the same value in three places.

**Why it happens:** No explicit canonicalization of the product type value before writing.

**How to avoid:** Resolve the product type to one of the three canonical lowercase values (`software`, `hardware`, `hybrid`) before writing anything. Use this exact string in all three places: brief frontmatter `Product Type`, brief `## Product Type` section, and root DESIGN-STATE.md Quick Reference `| Product Type |` row.

**Warning signs:** Running `grep -r "product type" .planning/design/` produces inconsistently cased or formatted values.

### Pitfall 6: design-manifest.json Not Updated After Brief Creation

**What goes wrong:** BRF-brief-v1.md is created and DESIGN-STATE files are updated, but `design-manifest.json` is not updated. The manifest still has `"artifacts": {}`. Phase 20 orchestrator reads the manifest to determine pipeline progress — it will conclude the brief has not run and attempt to re-run it.

**Why it happens:** The manifest update step is the last step and is skipped when the workflow author stops after writing the primary artifact.

**How to avoid:** Manifest update is REQUIRED as a final step. The minimum fields for the BRF artifact entry are:
```json
{
  "code": "BRF",
  "name": "Design Brief",
  "type": "brief",
  "domain": "strategy",
  "path": ".planning/design/strategy/BRF-brief-v1.md",
  "status": "draft",
  "version": 1,
  "dependsOn": [],
  "children": []
}
```

**Warning signs:** `node bin/pde-tools.cjs design manifest-read | grep BRF` returns nothing after running `/pde:brief`.

---

## Code Examples

Verified patterns from existing source:

### Calling pde-tools.cjs from a workflow (Bash tool pattern)

```bash
# Source: pattern verified from workflows/new-project.md — all existing workflows use this pattern
INIT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design ensure-dirs)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi

# Acquire write lock
LOCK=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-acquire pde-brief)
# Parse {"acquired": true} or {"acquired": false}

# Update manifest after writing BRF artifact
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BRF path ".planning/design/strategy/BRF-brief-v1.md"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BRF type "brief"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BRF domain "strategy"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BRF status "draft"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BRF version 1

# Release lock (always, even on error)
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-release
```

### BRF artifact entry structure (from templates/design-manifest.json)

```json
{
  "BRF": {
    "code": "BRF",
    "name": "Design Brief",
    "type": "brief",
    "domain": "strategy",
    "path": "strategy/BRF-brief-v1.md",
    "status": "draft",
    "version": 1,
    "dependsOn": [],
    "children": [],
    "tokens": [],
    "implementation": {
      "routes": [],
      "components": [],
      "tokenRefs": [],
      "notes": "Problem framing document. Defines product scope, personas, and constraints. Informs all subsequent design and engineering decisions.",
      "suggestedPhase": "01-foundation"
    }
  }
}
```

### Brief template structure (from templates/design-brief.md)

The output Markdown document must have these sections, all filled in from PROJECT.md context:

```markdown
---
Generated: "{date}"
Skill: /pde:brief (BRF)
Version: v{N}
Status: draft
Enhanced By: "{MCP list or none}"
---

# Design Brief

## Problem Statement
{1-2 paragraphs from PROJECT.md context}

## Product Type
**Type:** {software | hardware | hybrid}
**Platform:** {web | mobile | desktop | embedded | multi-platform}
**Rationale:** {why this classification}
**Design Constraints:**
{table specific to the detected type}

## Target Users
### Primary Persona: {name}
...
### Secondary Persona: {name}
...

## Constraints
| Constraint | Type | Impact |
...

## Success Criteria
| Criterion | Metric | Target |
...

## Competitive Context
| Competitor | Strength | Weakness | Differentiation Opportunity |
...

## Key Assumptions
...

## Scope Boundaries
...

---
*Generated by PDE-OS /pde:brief | {date}*
```

### Skill output summary table (from references/skill-style-guide.md)

Every skill invocation MUST end with this exact format:

```
## Summary

| Property | Value |
|----------|-------|
| Files created | .planning/design/strategy/BRF-brief-v1.md (Markdown, {size}), .planning/design/strategy/DESIGN-STATE.md (Markdown, {size}) |
| Files modified | .planning/design/DESIGN-STATE.md, .planning/design/design-manifest.json |
| Next suggested skill | /pde:flows |
| Elapsed time | {duration} |
| Estimated tokens | ~{count} |
| MCP enhancements | {MCP1}, {MCP2} (or "none") |
```

### Step progress format (from references/skill-style-guide.md)

```
Step 1/7: Reading project context from .planning/PROJECT.md...
Step 2/7: Detecting product type...
  -> Detected: software (signals: Node.js, web app, API)
Step 3/7: Synthesizing problem statement...
Step 4/7: Identifying personas and jobs-to-be-done...
Step 5/7: Writing design brief...
  -> Created: .planning/design/strategy/BRF-brief-v1.md
Step 6/7: Updating domain DESIGN-STATE...
Step 7/7: Updating root DESIGN-STATE and manifest...
```

### strategy/DESIGN-STATE.md initialization

The brief must write `strategy/DESIGN-STATE.md` from `templates/design-state-domain.md` with this BRF artifact row added to the Artifact Index:

```markdown
| BRF | Design Brief | /pde:brief | draft | v1 | {MCP list or "none"} | -- | {date} |
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `commands/brief.md` — stub with "available in v2" | `commands/brief.md` — thin delegation to `workflows/brief.md` | Phase 13 | `/pde:brief` becomes a functioning skill |
| No `.planning/design/` directory | `design/` initialized by `design ensure-dirs` on first skill run | Phase 12 (complete) | Directory and manifest already exist when brief runs |
| DESIGN-STATE.md as a planning concept | DESIGN-STATE.md write-lock protocol as running code | Phase 12 (complete) | Brief can use the lock safely |
| Brief as a "nice to have" planning artifact | Brief as the mandatory anchor for all downstream design skills | v1.1 architecture decision | Brief is a hard prerequisite for flows, system, and all downstream skills |

**Note:** The brief is the only design skill with no design artifact prerequisites. PROJECT.md is always available from v1.0 project initialization. This makes the brief the natural entry point for the entire design pipeline.

---

## Open Questions

1. **Jobs-to-be-done (JTBD) section not in the template**
   - What we know: `templates/design-brief.md` has Problem Statement, Target Users (personas), Constraints, Success Criteria, Competitive Context, Key Assumptions, Scope Boundaries — but NOT an explicit "Jobs to be Done" section.
   - What's unclear: The Phase 13 success criterion says the brief must cover "jobs-to-be-done." The template does not have this section header.
   - Recommendation: Add a `## Jobs to Be Done` section to the brief workflow's output instructions, placed between `## Target Users` and `## Constraints`. The workflow (not the template) defines the output — the template is a starting guide. This does NOT require changing the template file itself.

2. **`--force` flag for re-generation**
   - What we know: `skill-style-guide.md` documents `--dry-run`, `--quick`, `--verbose`, `--no-mcp` as universal flags. There is no `--force` flag defined universally.
   - What's unclear: When `/pde:brief` is re-run and a brief exists, should there be a `--force` flag to skip the confirmation prompt?
   - Recommendation: Implement the confirmation prompt for the interactive case (no flag). Add `--force` as a skill-specific flag for `commands/brief.md` to allow re-generation without prompting. Document in the help text.

3. **Non-goals section not in template**
   - What we know: Success criterion 1 says the brief must cover "non-goals." `templates/design-brief.md` has `## Scope Boundaries` with "Out of scope (v1)" — this is effectively non-goals.
   - Recommendation: Treat "Scope Boundaries — Out of scope" as the non-goals section. No new template section needed; the workflow can name it "Non-goals" in the fill instructions while writing to the "Out of scope" sub-section.

---

## Validation Architecture

`nyquist_validation` is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in `assert` — embedded `--self-test` mode consistent with Phase 12 pattern; plus manual workflow execution verification |
| Config file | none — zero-dep constraint; no Jest/Vitest |
| Quick run command | `node -e "require('./bin/lib/design.cjs')" 2>&1 && echo 'infrastructure OK'` |
| Full suite command | `node bin/lib/design.cjs --self-test && node bin/pde-tools.cjs design ensure-dirs 2>&1 && echo 'Phase 12 infra OK'` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BRF-01 | `commands/brief.md` references `workflows/brief.md` | smoke | `grep -q 'workflows/brief.md' commands/brief.md && echo 'OK'` | ❌ Wave 0 |
| BRF-01 | `workflows/brief.md` exists | smoke | `test -f workflows/brief.md && echo 'OK'` | ❌ Wave 0 |
| BRF-01 | Running `/pde:brief` (via Bash simulate) creates `BRF-brief-v1.md` | integration | Manual invocation + file existence check | ❌ Wave 0 |
| BRF-01 | `BRF-brief-v1.md` contains all required sections | smoke | `grep -c '## Problem Statement\|## Target Users\|## Constraints\|## Success Criteria\|## Scope Boundaries' .planning/design/strategy/BRF-brief-v1.md` (expect 5) | ❌ Wave 0 |
| BRF-01 | `strategy/DESIGN-STATE.md` is created with BRF artifact row | smoke | `test -f .planning/design/strategy/DESIGN-STATE.md && grep -q 'BRF' .planning/design/strategy/DESIGN-STATE.md && echo 'OK'` | ❌ Wave 0 |
| BRF-01 | `design-manifest.json` has `artifacts.BRF` entry after run | smoke | `node bin/pde-tools.cjs design manifest-read \| grep -q '"BRF"' && echo 'OK'` | ❌ Wave 0 |
| BRF-01 | Standalone run produces same artifact as orchestrated run | manual | Manual — run `/pde:brief` standalone; verify BRF-brief-v1.md; reset; run via simulated orchestrator; verify identical structure | ❌ Wave 0 |
| BRF-02 | Brief detects software product type from PROJECT.md signals | integration | Run on PDE's own PROJECT.md; verify `**Type:** software` in output | ❌ Wave 0 |
| BRF-02 | Brief records software design constraints (responsive breakpoints, WCAG, browser compat) | smoke | After BRF-01 integration test: `grep -q 'WCAG\|responsive\|browser' .planning/design/strategy/BRF-brief-v1.md && echo 'OK'` | ❌ Wave 0 |
| BRF-02 | Product type written consistently: brief frontmatter, brief body, root DESIGN-STATE.md | smoke | Verify the same canonical value appears in all three locations | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `node -e "require('./bin/lib/design.cjs')" 2>&1 && echo 'Phase 12 infra OK'` — verify Phase 12 foundation still loads
- **Per wave merge:** `node bin/lib/design.cjs --self-test` — full Phase 12 self-test passes
- **Phase gate:** Manual `/pde:brief` invocation on a real test project produces `BRF-brief-v1.md` with all required sections AND `design-manifest.json` shows `artifacts.BRF` entry before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `workflows/brief.md` — the main deliverable; does not exist yet
- [ ] `commands/brief.md` — needs stub replaced with workflow reference
- [ ] Integration test scaffold: a minimal `test-project/` directory with a representative `PROJECT.md` that can be used to validate brief generation end-to-end

*(Phase 12 test infrastructure is complete — `node bin/lib/design.cjs --self-test` passes 17 tests. Phase 13 depends on Phase 12 infrastructure being stable, which it is.)*

---

## Sources

### Primary (HIGH confidence)

- PDE source: `bin/lib/design.cjs` — Phase 12 implementation; verified to export `ensureDesignDirs`, `acquireWriteLock`, `releaseWriteLock`, `updateManifestArtifact` (direct read, self-test passes 17 tests)
- PDE source: `bin/pde-tools.cjs` — design subcommand router; `case 'design'` block present with all 8 subcommands
- PDE source: `commands/brief.md` — current stub; confirmed "Status: Planned -- available in PDE v2" language that Phase 13 replaces
- PDE source: `workflows/new-project.md` — Skill-as-Self-Contained-Workflow pattern baseline; `ensure-dirs` call pattern
- PDE templates: `templates/design-brief.md` — authoritative output structure; direct read confirmed 11 sections
- PDE templates: `templates/design-state-domain.md` — domain DESIGN-STATE schema; direct read confirmed Artifact Index, Staleness Tracker, Open Critique Items structure
- PDE templates: `templates/design-manifest.json` — BRF artifact example entry; confirms `code`, `name`, `type`, `domain`, `path`, `status`, `version`, `dependsOn`, `children`, `implementation` fields
- PDE research: `.planning/research/ARCHITECTURE.md` — Pattern 1 (Skill-as-Self-Contained-Workflow), Pattern 3 (DESIGN-STATE write-lock), component responsibility table, data flow diagram
- PDE research: `.planning/research/STACK.md` — v1.1 core principle ("LLM IS the generator"), zero new npm dependencies confirmed
- PDE references: `references/skill-style-guide.md` — standard summary table format, step progress format, error message format, output ordering
- PDE references: `references/mcp-integration.md` — Sequential Thinking MCP enhancement recipe for design skills

### Secondary (MEDIUM confidence)

- Phase 12 RESEARCH.md — confirms write-lock protocol, anti-patterns, and domain DESIGN-STATE.md creation patterns established and tested

### Tertiary (LOW confidence)

None — all critical claims verified from direct source inspection.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — zero new dependencies; all tools (design.cjs, pde-tools.cjs, templates) exist and are verified working
- Architecture: HIGH — workflow pattern derived from existing workflows and the fully-specified ARCHITECTURE.md; no new patterns invented
- Pitfalls: HIGH — derived from direct inspection of Phase 12 patterns, manifest schema, template structure, and write-lock protocol edge cases
- Validation: HIGH — smoke/integration tests directly correspond to success criteria; testing approach consistent with Phase 12 pattern

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable; all referenced files are in the project repo; no external dependencies; templates are locked)
