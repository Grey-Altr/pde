# Phase 177: Command Interface + Workflow Shell - Research

**Researched:** 2026-03-30
**Domain:** PDE skill authoring, command routing, workflow file structure, persona registry design
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Command name is `/pde:present` (locked by ROADMAP)
- Argument is persona slug (e.g., `executive-summary`, `case-study`)
- No argument = list all personas with descriptions
- Invalid argument = error message + valid persona list
- 15 personas total (locked by ROADMAP: CLU-01 through portfolio-overview)
- Each persona has: slug, display name, one-line description, audience
- Registry is a static data structure (not generated at runtime)
- Workflow file at `workflows/present.md` (follows existing PDE skill pattern)
- Skill SKILL.md file with metadata for `/pde:present` command
- Workflow reads IR from `pde-tools presentation artifact-read` (Phase 176)
- Workflow passes IR + persona config to LLM for narration
- Output written to `.planning/presentations/[persona]-[date].html` and `.md`

### Claude's Discretion
- Persona registry data format (JSON, JS object, inline in workflow)
- Workflow file structure and step organization
- Error message formatting
- Whether persona listing uses a table, list, or other format

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CMD-01 | `/pde:present [persona]` generates a presentation for the specified persona | Skill command file + workflow file with persona dispatch; IR read via `pde-tools presentation artifact-read`; output to `.planning/presentations/` |
| CMD-02 | `/pde:present` (no argument) lists available personas with descriptions | Argument detection in workflow; persona registry provides slug + description + audience per entry |
</phase_requirements>

---

## Summary

Phase 177 wires the `/pde:present` command into the PDE skill system. The work is entirely configuration and orchestration — no new extraction logic (that is Phase 176), no new rendering logic (that is Phase 178). This phase creates three artifacts: `commands/present.md` (command file), `workflows/present.md` (workflow file), and an entry in `skill-registry.md`.

The PDE skill system has a well-established two-file pattern: a thin `commands/X.md` that describes metadata (allowed tools, argument hints) and delegates to `@workflows/X.md`, plus a `workflows/X.md` file that contains the full execution logic in numbered steps. Both files must use XML-style sections (`<purpose>`, `<skill_code>`, `<skill_domain>`, `<context_routing>`, `<process>`) to pass lint (LINT-001 through LINT-005). The workflow is the primary artifact for this phase.

The persona registry must be a static data structure embedded in the workflow. All 15 persona slugs, display names, one-line descriptions, and audience labels are known at author time from REQUIREMENTS.md. The workflow reads the IR via a shell call to `node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" presentation artifact-read`, parses the JSON (handling the `@file:` large-payload redirection pattern), then dispatches to the correct generation prompt with the IR + persona config. In Phase 177, since Phase 178 hasn't built the actual generators yet, the workflow produces a generation scaffold that Phase 178 will fill in — the dispatch routing and IR hand-off are what this phase delivers.

**Primary recommendation:** Create a minimal, well-structured workflow that (1) handles the three argument states (no arg, valid persona, invalid persona), (2) embeds the 15-persona registry as an inline data table in the workflow, (3) reads the IR from pde-tools, and (4) produces a clear stub invocation step that Phase 178 will replace with actual rendering logic. Use `tooling` as the skill domain since presentations are an infrastructure/reporting capability, not a design capability.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `commands/X.md` | pattern | Claude Code command definition file (YAML frontmatter + objective + process) | Every PDE command follows this two-file pattern |
| `workflows/X.md` | pattern | Full execution logic with XML sections | All 17 existing PDE skills use this structure |
| `skill-registry.md` | pattern | Maps skill code to workflow and domain | Required by LINT-010; validated by `/pde:test --lint` |
| `node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" presentation artifact-read` | Phase 176 | Reads Phase 176 IR and returns JSON | Already shipped and tested (38/38 tests green) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@file:` large-payload redirection | PDE convention | pde-tools writes large JSON to temp file, returns `@file:/path` | Always wrap in: `if [[ "$IR" == @file:* ]]; then IR=$(cat "${IR#@file:}"); fi` |
| `${CLAUDE_PLUGIN_ROOT}` | env var | Points to PDE plugin root directory | Use instead of relative paths in workflow bash blocks |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline persona registry in workflow | Separate JSON file | Inline is simpler for 15 static entries; JSON file adds I/O overhead and a dependency |
| Inline persona registry in workflow | Separate JS module in `bin/lib/` | JS module adds unnecessary complexity; personas don't need programmatic access at Phase 177 |
| `tooling` skill domain | `system` skill domain | `tooling` is the closest fit per LINT-003 valid domains (strategy, visual, ux, review, system, tooling, hardware, handoff); presentations are an infrastructure reporting concern |

**Installation:** No new npm dependencies required. Node.js built-ins and the existing `pde-tools` CLI are sufficient.

---

## Architecture Patterns

### File Structure for This Phase
```
commands/
└── present.md            # Command file: YAML frontmatter + @workflows/present.md delegation

workflows/
└── present.md            # Workflow file: XML sections + numbered steps

skill-registry.md         # Add: | PRS | /pde:present | workflows/present.md | tooling | active |
```

### Pattern 1: Command File Structure
**What:** Thin YAML frontmatter + objective + process delegation
**When to use:** Every PDE command file follows this exact pattern

```markdown
---
name: pde:present
description: Generate a stakeholder presentation for the specified persona, or list available personas
argument-hint: "[persona-slug] [--dry-run] [--verbose]"
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
Execute the /pde:present command.
</objective>

<process>
Follow @workflows/present.md exactly.

Pass all of $ARGUMENTS to the workflow.
</process>
```
Source: Pattern extracted from `commands/audit.md`, `commands/recommend.md`.

### Pattern 2: Workflow File Required Sections (LINT rules enforced)
**What:** XML-style sections that the lint validator checks. All five are mandatory errors if missing.

```markdown
<purpose>
[description of what skill produces]
</purpose>

<skill_code>PRS</skill_code>

<skill_domain>tooling</skill_domain>

<context_routing>
[file loading table and mode detection]
</context_routing>

<process>
## Step 1/N: Initialize
...
</process>
```
Source: `references/tooling-patterns.md` LINT-001 through LINT-005.

### Pattern 3: IR Acquisition from pde-tools
**What:** Standard shell invocation + `@file:` redirect handling
**When to use:** Any workflow that needs the presentation IR

```bash
IR=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" presentation artifact-read --raw)
if [[ "$IR" == @file:* ]]; then IR=$(cat "${IR#@file:}"); fi
```
Source: Confirmed from `bin/pde-tools.cjs` line 1679-1680, and `@file:` pattern used throughout existing workflows.

Note: the `--raw` flag outputs plain JSON without the output wrapper. Without `--raw`, the core `output()` function may add envelope fields. Verify behavior — if `output()` returns the IR directly without wrapping, `--raw` may not be needed. The existing Phase 176 tests call without `--raw` and get valid JSON.

### Pattern 4: Argument Dispatch in Workflows
**What:** Three-branch argument handling: no arg, valid arg, invalid arg

```markdown
## Step 1/N: Detect invocation mode

Parse $ARGUMENTS:
- If $ARGUMENTS is empty → LIST MODE: display persona table, then halt
- If $ARGUMENTS matches a known persona slug → GENERATE MODE: proceed to Step N
- Otherwise → ERROR MODE: display error with valid persona list, then halt
```
Source: Pattern inferred from skill-style-guide.md error standards and CONTEXT.md locked decisions.

### Pattern 5: Standard Error for Invalid Persona
**What:** What/Why/What-to-do error structure per `references/skill-style-guide.md`

```
Error: Unknown persona "executive-summry".
  "/pde:present" requires a valid persona slug.
  Valid personas: executive-summary, investor-update, sprint-review, client-deliverable,
    stakeholder-status, product-manager, project-manager, case-study, agile-report,
    design-persona, research-persona, post-mortem, adr-summary, launch-announcement,
    portfolio-overview
  Usage: /pde:present executive-summary
```

### Persona Registry (15 personas, static, locked by ROADMAP)

| Slug | Req ID | Display Name | Audience | One-Line Description |
|------|--------|--------------|----------|---------------------|
| `executive-summary` | CLU-01 | Executive Summary | Executives, sponsors | Progress, blockers, timeline confidence in one page |
| `investor-update` | CLU-02 | Investor Update | Investors, board | Milestone velocity, technical moat, market positioning |
| `sprint-review` | CLU-03 | Sprint Review | Development team | What shipped, demo screenshots, what's next |
| `client-deliverable` | CLU-04 | Client Deliverable Report | Clients | Feature specs, acceptance criteria met, screenshots |
| `stakeholder-status` | CLU-05 | Stakeholder Status Update | Project stakeholders | RAG status, decisions needed, risks |
| `product-manager` | CLU-06 | Product Manager View | Product managers | Feature prioritization, requirement coverage, roadmap health |
| `project-manager` | CLU-07 | Project Manager View | Project managers | Timeline tracking, dependency analysis, risk register |
| `case-study` | CLR-01 | Case Study / Portfolio Piece | Prospective clients, recruiters | Problem, approach, outcome, lessons learned |
| `agile-report` | CLR-02 | Agile Project Report | Agile coaches, retrospectives | Retro narrative with burndown and velocity metrics |
| `design-persona` | CLR-03 | Design Persona Report | Design reviewers, design teams | Design decisions, system tokens, wireframe evolution |
| `research-persona` | CLR-04 | Research Persona Report | Technical reviewers | Findings summary, tech evaluations, competitive landscape |
| `post-mortem` | CLR-05 | Technical Post-Mortem | Engineering teams | What broke, root cause, prevention strategies |
| `adr-summary` | CLR-06 | ADR Summary | Architects, technical leads | Context, options considered, decisions, consequences |
| `launch-announcement` | CLR-07 | Launch Announcement | Public, press, community | What it is, who it's for, how to get started |
| `portfolio-overview` | CLR-08 | Portfolio Overview | Hiring managers, clients | Cross-project patterns, skills demonstrated |

### Anti-Patterns to Avoid
- **Reading .planning/ files directly in the workflow:** The workflow MUST read the IR from `pde-tools presentation artifact-read`, never from raw .planning/ files. This is a locked architectural decision from STATE.md.
- **Generating output in Phase 177:** Phase 177 wires the command shell. The actual HTML/Markdown rendering is Phase 178's work. The workflow should call a generation step that Phase 178 will implement.
- **Skipping the `@file:` redirect check:** pde-tools writes large JSON to a temp file and returns `@file:/path` when output exceeds a threshold. Workflows that don't handle this will parse a path string as JSON and fail.
- **Using a domain not in the valid list:** LINT-003 enforces: strategy, visual, ux, review, system, tooling, hardware, handoff. Any other domain causes a lint error.
- **Missing LINT-010 registration:** The skill_code used in `workflows/present.md` must exactly match the entry in `skill-registry.md`. If `PRS` is chosen, both the workflow and registry entry must use `PRS`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IR extraction | Custom file readers in the workflow | `pde-tools presentation artifact-read` | Phase 176 built and tested all 10 extractors; re-reading .planning/ files in the workflow violates the locked extraction-first architecture |
| Persona listing format | Custom formatting code | Inline markdown table in workflow | 15 static entries; no code needed for a static table |
| Large-payload JSON handling | Custom temp-file logic | `@file:` pattern already in pde-tools `output()` | Consistent with all other pde-tools commands |

---

## Common Pitfalls

### Pitfall 1: `@file:` Redirect Not Handled
**What goes wrong:** Workflow does `IR=$(node ... artifact-read)` then tries to parse IR as JSON; fails because IR = `@file:/var/folders/.../pde-XXXXXXX.json`.
**Why it happens:** `pde-tools` uses `output()` from `core.cjs` which writes large payloads to temp files. The full presentation IR is large enough to trigger this.
**How to avoid:** Always follow with: `if [[ "$IR" == @file:* ]]; then IR=$(cat "${IR#@file:}"); fi`
**Warning signs:** `JSON.parse` or `jq` errors on what looks like a valid command.

### Pitfall 2: Skill Code Collision
**What goes wrong:** Choosing a skill code already used in skill-registry.md causes LINT-011 to fail.
**Why it happens:** The registry has 17 entries; code must be 2-4 uppercase letters, unique.
**How to avoid:** Audit `skill-registry.md` before selecting `PRS`. Current codes: BRF, FLW, SYS, WFR, MCK, CRT, HIG, ITR, HND, HDW, CMP, OPP, REC, IDT, AUD, IMP, PRT. `PRS` is available. `PRE` is also available.
**Warning signs:** `/pde:test --lint` LINT-011 error.

### Pitfall 3: Phase 177 Builds the Renderer
**What goes wrong:** The workflow attempts to generate actual HTML output for the persona, but Phase 178 hasn't been implemented yet.
**Why it happens:** The success criterion says "triggers the full generation pipeline and produces output files" — this can be misread as requiring real output in Phase 177.
**How to avoid:** Phase 177 success criterion 1 says the command "triggers the full generation pipeline." In Phase 177, the pipeline can emit a stub/placeholder file to `.planning/presentations/` confirming the dispatch worked. Full HTML rendering is Phase 178. The test for Phase 177 is that the routing logic works, not that the output is production-quality.
**Warning signs:** Trying to write EJS templates or HTML rendering logic in Phase 177.

### Pitfall 4: `<skill_domain>` Using Invalid Value
**What goes wrong:** LINT-003 rejects the workflow file during `/pde:test --lint`.
**Why it happens:** Valid domains are strictly: `strategy, visual, ux, review, system, tooling, hardware, handoff`. "output", "presentation", "reporting" are not valid.
**How to avoid:** Use `tooling` — presentations are an infrastructure/reporting capability of the platform, closest to the tooling domain.

### Pitfall 5: Persona Registry Out of Sync
**What goes wrong:** The workflow's inline registry lists fewer or more than 15 personas, or slugs don't match what Phase 178-182 will implement.
**Why it happens:** Persona slugs are referenced across multiple phases; inconsistency causes generation calls to fail.
**How to avoid:** The 15 slugs are locked (CLU-01 through CLR-08 per REQUIREMENTS.md). Use the exact slug table documented in this research's Architecture Patterns section.

---

## Code Examples

### IR Acquisition Pattern (Verified)
```bash
# Source: pde-tools.cjs line 1679 + @file: pattern from multiple existing workflows
IR=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" presentation artifact-read)
if [[ "$IR" == @file:* ]]; then IR=$(cat "${IR#@file:}"); fi
```
Confirmed: `pde-tools presentation artifact-read` currently returns `@file:/var/folders/.../pde-XXXXXXXX.json` — the `@file:` redirect IS triggered for the full IR payload.

### Persona Slug Validation (Workflow Logic)
```markdown
## Step 2/N: Validate argument

PERSONA="$ARGUMENTS"  (first token, stripped of flags)

VALID_SLUGS=(
  executive-summary investor-update sprint-review client-deliverable
  stakeholder-status product-manager project-manager
  case-study agile-report design-persona research-persona
  post-mortem adr-summary launch-announcement portfolio-overview
)

If PERSONA is empty → go to LIST MODE
If PERSONA is in VALID_SLUGS → go to GENERATE MODE
Otherwise → display error with valid list, halt
```

### Skill Registry Entry
```markdown
| PRS | /pde:present | workflows/present.md | tooling | active |
```

### Output File Naming Convention (from REQUIREMENTS.md RND-06)
```
.planning/presentations/executive-summary-2026-03-30.html
.planning/presentations/executive-summary-2026-03-30.md
```
Pattern: `[persona-slug]-[YYYY-MM-DD].html` and `.md`

---

## Environment Availability

Step 2.6: Dependency audit — Phase 177 has no external dependencies beyond Node.js and the already-shipped pde-tools binary.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | `pde-tools presentation artifact-read` | Yes | runtime | — |
| `bin/pde-tools.cjs` presentation subcommand | IR reading | Yes | Phase 176 (38/38 tests green) | — |
| `workflows/` directory | Workflow file creation | Yes | — | — |
| `commands/` directory | Command file creation | Yes | — | — |
| `skill-registry.md` | Skill code registration | Yes | — | — |

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (CJS + ESM, configured in vitest.config.ts) |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run tests/phase-177/ --reporter=verbose` |
| Full suite command | `npx vitest run tests/phase-177/ --reporter=verbose` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CMD-01 | `/pde:present executive-summary` triggers pipeline and produces output in `.planning/presentations/` | integration | `npx vitest run tests/phase-177/present-cmd.test.mjs` | No — Wave 0 |
| CMD-02 | `/pde:present` (no argument) displays list of all 15 personas with descriptions | integration | `npx vitest run tests/phase-177/present-cmd.test.mjs` | No — Wave 0 |
| CMD-01 | `/pde:present unknown-persona` produces error with valid persona list | integration | `npx vitest run tests/phase-177/present-cmd.test.mjs` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/phase-177/ --reporter=verbose`
- **Per wave merge:** `npx vitest run tests/phase-177/ --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-177/present-cmd.test.mjs` — covers CMD-01, CMD-02 (command routing, persona list display, error path, output file creation)

The test pattern should mirror `tests/phase-176/presentation-cmd.test.mjs`: spawn `pde-tools` via `execFileSync`, handle `@file:` redirect, and assert on output structure. For Phase 177, the test needs to also exercise `commands/present.md` routing (via direct workflow execution is not automatable, but pde-tools routing can be tested). The primary automated test is: can the workflow dispatch execute without error, producing a placeholder output file for a known persona slug?

Note: `/pde:present` command file execution (the Claude Code slash command) cannot be unit tested with vitest — only the downstream `pde-tools` calls are automatable. The command file itself is tested via manual acceptance criteria during `/gsd:verify-work`.

---

## Sources

### Primary (HIGH confidence)
- `bin/lib/presentation.cjs` — Phase 176 IR schema, `buildPresentationIR`, `cmdPresentationArtifactRead` — directly read from codebase
- `bin/pde-tools.cjs` lines 1676-1685 — presentation subcommand routing — directly read
- `references/tooling-patterns.md` — LINT-001 through LINT-042 rules — directly read
- `references/skill-style-guide.md` — error format, output standards, flag conventions — directly read
- `skill-registry.md` — existing skill codes and domains — directly read
- `commands/audit.md`, `commands/recommend.md` — command file patterns — directly read
- `workflows/audit.md`, `workflows/recommend.md` — workflow file patterns — directly read
- `tests/phase-176/presentation-cmd.test.mjs` — test pattern for pde-tools integration — directly read
- `.planning/REQUIREMENTS.md` — CMD-01, CMD-02 definitions; all 15 persona requirement IDs — directly read
- Live `pde-tools presentation artifact-read` run — confirmed `@file:` redirect is triggered for full IR

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — extraction-first architecture decision (verified as locked)
- `.planning/ROADMAP.md` — Phase 177 success criteria and persona count (15)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all patterns verified from live codebase
- Architecture: HIGH — command/workflow two-file pattern is consistent across 17 existing skills
- Pitfalls: HIGH — `@file:` redirect confirmed by live test; lint rules confirmed from tooling-patterns.md
- Persona registry: HIGH — all 15 personas derived directly from REQUIREMENTS.md, count confirmed by ROADMAP

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable — PDE skill architecture is not changing mid-milestone)
