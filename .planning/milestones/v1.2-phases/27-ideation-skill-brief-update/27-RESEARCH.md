# Phase 27: Ideation Skill & Brief Update — Research

**Researched:** 2026-03-16
**Domain:** Claude Code plugin skill authoring — two-pass diverge→converge ideation workflow, brief soft update for upstream context injection, IDT artifact design
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| IDEAT-01 | User can run multi-phase diverge→converge ideation via `/pde:ideate` | No stub exists — new `commands/ideate.md` and `workflows/ideate.md` required; two-pass structure (diverge then converge) is the core pattern; 5+ divergent directions with no evaluative language in diverge pass |
| IDEAT-02 | User can score and assess concept readiness before proceeding to brief | Converge pass applies concept readiness scoring against stated goal; recommend runs at diverge→converge checkpoint to surface feasibility signals; explicit recommended direction produced |
| IDEAT-03 | Tool discovery (recommend) runs automatically during ideation diverge phase | `workflows/recommend.md` is callable via `Skill("pde:recommend", "--quick")` — never via Task(); recommend already designed as composable per Phase 25 STATE.md decision |
| IDEAT-04 | Ideation produces a brief seed artifact consumable by `/pde:brief` | `templates/brief-seed.md` already exists; IDT artifact in `.planning/design/strategy/IDT-ideation-v{N}.md` with status `ideation-complete` and a `## Brief Seed` section; brief.md requires a soft update to detect and inject IDT/CMP/OPP context |
</phase_requirements>

---

## Summary

Phase 27 is a pure prompt-engineering phase that delivers two artifacts: a new `/pde:ideate` skill implemented as command + workflow files (no stub exists), and a surgical update to `workflows/brief.md` to soft-inject upstream context from CMP, OPP, and IDT artifacts when present. No new Node.js code, no new npm dependencies, no pde-tools.cjs changes. The entire existing infrastructure — design ensure-dirs, lock-acquire, manifest-update, coverage-check, manifest-set-top-level — is fully sufficient.

The `/pde:ideate` skill is the most architecturally complex new skill in v1.2. It must implement a genuine two-pass workflow: a diverge pass that generates 5+ directions with no evaluative language, followed by a checkpoint that invokes `/pde:recommend --quick` via `Skill()` (never `Task()`, due to Issue #686 nested-agent freeze), followed by a converge pass that scores each direction for feasibility and readiness, assigns an explicit recommended direction, and writes the IDT artifact. The artifact's `## Brief Seed` section uses the exact structure from `templates/brief-seed.md` so that `/pde:brief` can detect and consume it directly.

The brief update is surgical: add one soft-dependency probe step (read IDT/CMP/OPP artifacts if present, warn if absent, never hard-fail) and inject the found context into the problem statement, competitive context, and key assumptions sections. The brief must produce the same output for users who have not run ideation — the injection is enrichment only.

**Primary recommendation:** Build ideate workflow first (it is entirely new with no prior code to migrate), then apply the surgical brief update, testing that brief still functions correctly without any upstream artifacts.

---

## Standard Stack

### Core

| Component | Source | Purpose | Authority |
|-----------|--------|---------|-----------|
| Skill command file | `commands/ideate.md` (new — no stub) | YAML frontmatter + `@workflows/ideate.md` delegation | All 13 implemented skills use this exact pattern |
| Workflow file | `workflows/ideate.md` (new) | Full ideate skill logic — `<purpose>`, `<skill_code>`, `<skill_domain>`, `<context_routing>`, `<required_reading>`, `<flags>`, `<process>`, `<output>` | `workflows/competitive.md` and `workflows/recommend.md` are canonical v1.2 references |
| `templates/brief-seed.md` | EXISTS at project root | IDT artifact's `## Brief Seed` section schema | Confirmed by direct file read — has concept, problem statement, product type, target users, scope, constraints, key decisions, risk register, next steps fields |
| `workflows/brief.md` (modify) | EXISTS | Receives surgical update for soft-dependency context injection | Read steps 2-5 carefully before modifying; injection must not break the existing no-artifact code path |
| `pde-tools.cjs design` commands | `bin/pde-tools.cjs` | ensure-dirs, lock-acquire, lock-release, coverage-check, manifest-update, manifest-set-top-level | Unchanged from prior phases — all commands verified live in Phases 24-26 |
| `design-manifest.json` | `.planning/design/design-manifest.json` | 13-field designCoverage schema — `hasIdeation` is the Phase 27 flag | Phase 24 schema migration confirmed; `hasIdeation` is field 8 in canonical 13-field order |
| `skill-registry.md` | Project root | IDT skill code must be added as new row | Registry confirmed at project root; currently 13 entries (BRF through REC); needs IDT row added |

### Supporting

| Component | Source | Purpose | When to Use |
|-----------|--------|---------|-------------|
| `references/mcp-integration.md` | Existing reference | Skill() invocation pattern (not Task()); probe/use/degrade for Sequential Thinking | Load via `@` in `<required_reading>` |
| `references/skill-style-guide.md` | Existing reference | Output formatting, universal flags, error patterns, summary table | Load via `@` in `<required_reading>` |
| `references/strategy-frameworks.md` | Existing reference | Concept scoring rubric basis (adapt RICE-like scoring for direction readiness) | Load via `@` — scoring framework terminology |
| `workflows/recommend.md` | EXISTS | Called internally via `Skill("pde:recommend", "--quick")` at diverge→converge checkpoint | Not loaded as `@` reference — invoked at runtime via Skill() |
| Sequential Thinking MCP | Universal MCP | Enhanced ideation synthesis, multi-round reasoning, analogous domain import | Probe in ideate workflow; enhance diverge generation and converge scoring when available |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Skill("pde:recommend", "--quick")` | `Task()` tool | Issue #686 — nested Task agents freeze the session. This is confirmed in `workflows/build.md` anti-patterns and `.planning/research/ARCHITECTURE.md` line 263. Skill() is the only correct invocation pattern. |
| IDT artifact in `strategy/` domain | IDT artifact in a new `ideation/` domain | All strategy artifacts (BRF, CMP, OPP, REC) already live in `.planning/design/strategy/`. IDT belongs there too — same domain, same DESIGN-STATE, simpler artifact discovery for brief injection. |
| Hard-requiring IDT before brief | Soft dependency with warning | SC4 (IDEAT-04) explicitly requires brief to produce normally with a warning when upstream artifacts are absent, not a failure. Match the established prerequisite warning pattern in `skill-style-guide.md`. |
| Two separate workflow files (diverge.md + converge.md) | Single `ideate.md` with explicit phase checkpoint | Single file is simpler, matches all other PDE skills, and the checkpoint is an in-workflow state transition rather than a file boundary. |

**Installation:** No new packages required for this phase.

---

## Architecture Patterns

### Recommended Project Structure

Phase 27 adds/modifies these files:

```
commands/
  ideate.md           # NEW: thin stub, no existing stub to replace

workflows/
  ideate.md           # NEW: full ideate skill logic (two-pass diverge→converge)
  brief.md            # MODIFIED: add soft context injection step

templates/
  brief-seed.md       # EXISTS: IDT artifact uses this schema for ## Brief Seed section

skill-registry.md     # MODIFIED: add IDT row
```

No new directories. No new templates (brief-seed.md exists). No pde-tools.cjs changes.

### Pattern 1: New Command File (No Stub)

**What:** Unlike prior Phase 27 skills, there is no existing `commands/ideate.md` to replace — this is a purely new file.
**When to use:** This exact pattern applies.

```markdown
---
name: pde:ideate
description: Run multi-phase diverge→converge ideation to explore product directions
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
<objective>
Execute the /pde:ideate command.
</objective>

<process>
@workflows/ideate.md
@references/skill-style-guide.md
</process>
```

Source: `commands/brief.md`, `commands/competitive.md` — all 13 implemented skills follow this exact structure.

### Pattern 2: Two-Pass Diverge→Converge Workflow

**What:** The ideation skill must structurally enforce two separate passes. A single LLM prompt that asks for divergent ideas AND evaluation simultaneously collapses into shallow output because convergence pressure suppresses divergent generation.
**When to use:** The ideate workflow process section must use this explicit two-phase structure.

```
Pass 1 — DIVERGE:
  Generate minimum 5 distinct directions
  RULE: NO evaluative language in diverge output (no "best", "recommended", "superior")
  RULE: Each direction must be meaningfully distinct (different problem scope, technology,
        target user, or business model — not just name variations)
  RULE: Write IDT file with status = "diverge-complete" before proceeding
  OUTPUT: Numbered list with [Direction Name], [Core Concept], [Key Assumption], [Open Question]

--- CHECKPOINT: Invoke recommend ---
  Skill("pde:recommend", "--quick")
  Use REC artifact to annotate each direction with tooling feasibility signal
  (e.g., "Direction 3 requires real-time sync — Postgres MCP recommended")

Pass 2 — CONVERGE:
  Score each direction against readiness rubric (feasibility, goal alignment, distinctiveness)
  RULE: Show scores for ALL directions — do not silently drop any
  RULE: Produce explicit recommended direction with rationale
  OUTPUT: Scored table + recommended direction + brief-seed for top direction
```

Source: Research in `.planning/research/ARCHITECTURE.md` Pitfall 3 (ideation single-pass collapse); `.planning/research/SUMMARY.md` "Should have" features.

### Pattern 3: IDT Artifact Structure

**What:** The IDT artifact is the primary output of `/pde:ideate`. It contains the diverge log, converge scores, and a `## Brief Seed` section that `/pde:brief` can read directly.
**When to use:** The workflow writes this file at `.planning/design/strategy/IDT-ideation-v{N}.md`.

```yaml
---
Generated: "{ISO 8601 date}"
Skill: /pde:ideate (IDT)
Version: v{N}
Status: ideation-complete
Scope: "{N} directions diverged, 1 recommended"
Enhanced By: "{Sequential Thinking MCP if used, or 'none'}"
---
```

Required sections in order:
1. `# Ideation: {product_name}` — top-level heading
2. `## Diverge Phase` — minimum 5 directions, no evaluative language, each with Core Concept + Key Assumption + Open Question
3. `## Recommend Checkpoint` — REC artifact path, per-direction feasibility annotations
4. `## Converge Phase` — scored table with Direction, Goal Alignment (0-3), Feasibility (0-3), Distinctiveness (0-3), Total, Recommended flag
5. `## Recommended Direction` — name, rationale, assumptions, risks
6. `## Brief Seed` — filled from `templates/brief-seed.md` schema for the recommended direction

Source: `templates/brief-seed.md` (confirmed fields); `.planning/research/ARCHITECTURE.md` Component Responsibilities IDT entry; ROADMAP.md Phase 27 SC3.

### Pattern 4: Brief Soft Context Injection

**What:** `/pde:brief` receives a new soft-dependency probe step that reads IDT/CMP/OPP artifacts when present and injects their context into the brief. The existing brief pipeline (steps 1-7) must remain intact for users without upstream artifacts.
**When to use:** Inject as a new sub-step within Step 2 (Check Prerequisites), after the existing PROJECT.md and REQUIREMENTS.md reads.

```
Sub-step 2c: Optional upstream context injection

Use Glob to find: .planning/design/strategy/IDT-ideation-v*.md
  If found: Read most recent version. Parse ## Recommended Direction and ## Brief Seed.
    → Use for: Problem Statement enrichment, Target Users, Scope Boundaries
    → Log: "  -> Ideation artifact found: enriching brief with recommended direction"
  If not found:
    → Log: "  -> No ideation artifact — generating brief from PROJECT.md alone"
    → Continue normally (NOT a failure)

Use Glob to find: .planning/design/strategy/CMP-competitive-v*.md
  If found: Read most recent version. Parse ## Gap Analysis / ## Opportunity Highlights.
    → Use for: Competitive Context section of brief
    → Log: "  -> Competitive artifact found: enriching brief competitive context"
  If not found:
    → Log: "  -> No competitive artifact — using PROJECT.md for competitive context"

Use Glob to find: .planning/design/strategy/OPP-opportunity-v*.md
  If found: Read most recent version. Parse ## Now / Next / Later Buckets, top Now items.
    → Use for: Key Assumptions (high-confidence opportunities), Scope Boundaries (in-scope)
    → Log: "  -> Opportunity artifact found: enriching brief scope with high-priority items"
  If not found:
    → Log: "  -> No opportunity artifact — scope boundaries derived from PROJECT.md only"
```

The brief's standard summary table should add a new row when context was injected:
```
| Upstream context | IDT v{N} (ideation), CMP v{N} (competitive), OPP v{N} (opportunity) |
```
or:
```
| Upstream context | none — using PROJECT.md only |
```

Source: ROADMAP.md Phase 27 SC4; `workflows/brief.md` Step 2 pattern for soft dependencies; `skill-style-guide.md` "Missing prerequisite" warning pattern.

### Pattern 5: Skill() Invocation for Recommend

**What:** The ideate workflow invokes `/pde:recommend` at the diverge→converge checkpoint using the `Skill()` flat invocation pattern — identical to how `/pde:build` invokes all sub-skills.
**When to use:** Exactly once in the ideate workflow, between Pass 1 (diverge) and Pass 2 (converge).

```
Skill("pde:recommend", "--quick")

After completion:
- Glob .planning/design/strategy/REC-recommendations-v*.md to find latest REC artifact
- Read the artifact
- For each diverge direction, check if any recommended tool is specifically relevant
- Append feasibility note to each direction in the converge scoring
```

The `--quick` flag skips MCP probes in recommend for faster execution during ideation. This is an established flag already documented in `workflows/recommend.md`.

Source: `workflows/build.md` lines 104, 169 — flat Skill() invocation anti-Task() pattern; `workflows/recommend.md` `--quick` flag definition.

### Anti-Patterns to Avoid

- **Using Task() instead of Skill() for recommend invocation:** Issue #686 causes nested Task agents to freeze the session. The build orchestrator and the ideate workflow both use Skill() for sub-skill invocation. This is non-negotiable.
- **Generating convergence evaluations during the diverge pass:** The diverge output must contain zero evaluative language. Any judgment language ("best", "recommended", "superior", "most promising") in the diverge section is a failure. Evaluation belongs exclusively in the converge pass.
- **IDT artifact without `## Brief Seed` section:** IDEAT-04 requires brief to be able to consume the IDT artifact directly. If the `## Brief Seed` section is missing or uses a different schema than `templates/brief-seed.md`, the brief injection step cannot parse it.
- **Making brief hard-fail when IDT/CMP/OPP are absent:** IDEAT-04 explicitly says "running without those artifacts produces the brief normally with a warning (not a failure)". The injection is always soft.
- **Skipping the IDT file write between diverge and converge:** The workflow must write an intermediate IDT file with `Status: diverge-complete` before invoking recommend and beginning converge. This ensures state is preserved if the session is interrupted.
- **Not registering IDT in skill-registry.md:** LINT-010 requires skill_code to match an entry in skill-registry.md. IDT must be added as a new row.
- **Using `hasIdeation` as a dot-notation path with manifest-set-top-level:** Always pass the full 13-field JSON to `manifest-set-top-level`. The canonical 13-field order is: hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate, hasHandoff, hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Invoking recommend from ideate | Custom Task() agent | `Skill("pde:recommend", "--quick")` | Issue #686 — Task() nested agents freeze; Skill() is immune; this exact pattern is live in build.md |
| Design directory initialization | Custom mkdir logic | `pde-tools.cjs design ensure-dirs` | Handles all required subdirs; battle-tested across all v1.2 skills |
| Write lock for root DESIGN-STATE | File-based mutex | `pde-tools.cjs design lock-acquire` / `lock-release` | 60s TTL, retry logic, exact same pattern in every skill |
| Coverage flag update | Direct JSON write | `coverage-check` then `manifest-set-top-level` with full 13-field JSON | Pass-through-all pattern established in Phase 24; dot-notation silently clobbers other flags |
| Concept scoring rubric | Custom framework | Adapt existing RICE-adjacent 0-3 scales from `references/strategy-frameworks.md` | Consistent scoring vocabulary across all PDE strategy skills; users already familiar with 0-3 scales |
| Brief-seed section schema | Custom IDT schema | `templates/brief-seed.md` fields verbatim | This template was designed specifically for this handoff; using it ensures brief can parse it without custom parsing logic |

**Key insight:** This phase is 100% prompt engineering. The only new files are `commands/ideate.md`, `workflows/ideate.md`, and a targeted edit to `workflows/brief.md`. All infrastructure, templates, and reference files are already in place.

---

## Common Pitfalls

### Pitfall 1: Single-Pass Ideation Collapse

**What goes wrong:** If the ideate workflow generates divergent ideas AND evaluates them in the same prompt pass, the LLM produces a shallow, predictable list because convergence pressure suppresses divergent generation. The minimum 5 directions required by IDEAT-01 may be met numerically but will be superficially similar variations.
**Why it happens:** The natural LLM tendency is to produce "best-ish" answers. Without an explicit structural barrier between diverge and converge, the model self-edits during generation.
**How to avoid:** The workflow process section must use an explicit checkpoint after diverge output. Write the intermediate IDT file with `Status: diverge-complete` before any evaluation occurs. The converge section must begin with a structural separator (e.g., `---` and a new heading) that makes the phase boundary visible.
**Warning signs:** Diverge output contains any of: "the most promising", "recommended", "strongest", "best approach" — these signal collapse into premature convergence.

### Pitfall 2: Task() Invocation for Recommend

**What goes wrong:** If the ideate workflow calls recommend using the Task tool (e.g., `Task("run /pde:recommend --quick")`), the session will freeze due to Issue #686 nested-agent deadlock.
**Why it happens:** Task() is listed in the command's `allowed-tools` YAML frontmatter (it's there for all design skills for legitimate subagent use). But Issue #686 makes nested Task agents within a running skill incompatible with the skill invocation pattern.
**How to avoid:** Use `Skill("pde:recommend", "--quick")` — the exact same invocation pattern that `workflows/build.md` uses for all sub-skill calls. Document this explicitly in the ideate workflow anti-patterns section.
**Warning signs:** Skill invocation via Task() anywhere in ideate workflow process steps.

### Pitfall 3: Missing Brief-Seed Section in IDT Artifact

**What goes wrong:** If the IDT artifact does not contain a `## Brief Seed` section, or if the section uses different field names than `templates/brief-seed.md`, the brief injection step (IDEAT-04) cannot parse it. The brief will silently skip the IDT context even though the IDT file exists.
**Why it happens:** The IDT artifact structure is easy to design independently without checking the consuming skill's parsing contract.
**How to avoid:** The ideate workflow must explicitly reference `templates/brief-seed.md` as the output schema for the `## Brief Seed` section. The section headers and field names must be identical. The brief update step must parse by exact section heading (`## Brief Seed`).
**Warning signs:** Running `/pde:brief` after `/pde:ideate` does not inject the recommended direction into the brief's Problem Statement, even though IDT artifact exists.

### Pitfall 4: Brief Update Breaks No-Context Code Path

**What goes wrong:** The surgical update to `workflows/brief.md` introduces a regression where users who have not run ideation, competitive, or opportunity analysis get an error or degraded output because the brief now expects upstream artifacts.
**Why it happens:** It's easy to add a context injection step without fully testing the "no artifacts present" branch.
**How to avoid:** The injection step must be purely additive. The existing brief pipeline (steps 1-7, all section generation logic) must be unchanged. The injection adds content to existing sections when context is found; it does not restructure the pipeline or add mandatory steps.
**Warning signs:** `/pde:brief` with no upstream artifacts produces a warning that blocks execution, or produces an empty Competitive Context section that was previously generated from PROJECT.md.

### Pitfall 5: hasIdeation Coverage Flag Clobbered

**What goes wrong:** If the 13-field pass-through-all pattern is not followed exactly when writing `hasIdeation`, one of the other 12 flags gets reset to `false` silently.
**Why it happens:** Temptation to use dot-notation or write only `{"hasIdeation": true}` instead of the full 13-field merge.
**How to avoid:** Always run `coverage-check` first, parse all 13 fields (defaulting absent fields to `false`), set `hasIdeation = true`, write the complete 13-field JSON. This is the same pattern used by every v1.2 skill. The canonical order in this project is: hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate, hasHandoff, **hasIdeation**, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations.
**Warning signs:** After running `/pde:ideate`, `coverage-check` shows `hasIdeation: true` but `hasCompetitive`, `hasOpportunity`, or `hasRecommendations` have been reset to `false`.

### Pitfall 6: Skill Code IDT Not Registered

**What goes wrong:** LINT-010 requires each skill's `<skill_code>` to match an entry in `skill-registry.md`. IDT is a brand new skill code not currently in the registry. Omitting the registry addition makes the skill lint-fail.
**Why it happens:** skill-registry.md is a separate file and easy to forget.
**How to avoid:** Phase 27 plans must include an explicit task to add the IDT row to skill-registry.md. Row format: `| IDT | /pde:ideate | workflows/ideate.md | strategy | active |`
**Warning signs:** LINT-010 error: "skill_code IDT not found in skill-registry.md".

---

## Code Examples

Verified patterns from existing codebase:

### New Command File (thin stub)

```markdown
---
name: pde:ideate
description: Run multi-phase diverge→converge ideation to explore product directions
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
<objective>
Execute the /pde:ideate command.
</objective>

<process>
@workflows/ideate.md
@references/skill-style-guide.md
</process>
```

Source: `commands/brief.md`, `commands/competitive.md` — all 13 implemented skills.

### Skill() Invocation Pattern (recommend from ideate)

```
## /pde:ideate Step 4/7: Recommend checkpoint

Invoke recommend at the diverge→converge transition:

Skill("pde:recommend", "--quick")

After recommend completes:
  Use Glob to find .planning/design/strategy/REC-recommendations-v*.md
  Read the most recent version
  For each diverge direction, scan REC artifact for tools relevant to that direction's tech requirements
  Add feasibility annotation: "Feasibility note: {tool relevance summary}"
```

Source: `workflows/build.md` Skill() invocation pattern (lines 104, 169).

### IDT Artifact Frontmatter

```yaml
---
Generated: "{ISO 8601 date}"
Skill: /pde:ideate (IDT)
Version: v{N}
Status: ideation-complete
Scope: "{N} directions diverged, {recommended_name} recommended"
Enhanced By: "{Sequential Thinking MCP if used, or 'none'}"
---
```

Source: Derived from `workflows/competitive.md` and `workflows/opportunity.md` YAML frontmatter patterns — exact same schema except for Scope and Status fields.

### IDT Coverage Flag Update (pass-through-all)

```bash
# Read all 13 existing flags first
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi

# Parse JSON, extract all 13 fields (default absent fields to false)
# Canonical order: hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec,
#   hasCritique, hasIterate, hasHandoff, hasIdeation, hasCompetitive,
#   hasOpportunity, hasMockup, hasHigAudit, hasRecommendations

# Write full 13-field JSON, setting hasIdeation=true, all others pass-through
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":true,"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current}}'
```

Source: `workflows/opportunity.md` Step 7 — exact pass-through-all pattern. `hasIdeation` is field 8.

### Brief Soft Context Injection Step (new sub-step 2c)

```
Sub-step 2c: Upstream context injection (all soft — never halt)

// Ideation context
IDT_CONTEXT = null
IDT_FILES = Glob(".planning/design/strategy/IDT-ideation-v*.md")
IF IDT_FILES not empty:
  Sort by version descending, read highest version
  Parse "## Recommended Direction" section
  Parse "## Brief Seed" section (using templates/brief-seed.md schema)
  SET IDT_CONTEXT = {direction_name, problem_statement, target_users, scope, constraints}
  Log: "  -> Ideation artifact found: v{N} ({direction_name} direction enriching brief)"
ELSE:
  Log: "  -> No ideation artifact — brief generated from PROJECT.md"

// Competitive context
CMP_CONTEXT = null
CMP_FILES = Glob(".planning/design/strategy/CMP-competitive-v*.md")
IF CMP_FILES not empty:
  Sort by version descending, read highest version
  Parse "## Gap Analysis" or "## Opportunity Highlights" section
  SET CMP_CONTEXT = {top_gaps, differentiators}
  Log: "  -> Competitive artifact found: v{N} (enriching brief competitive context)"
ELSE:
  Log: "  -> No competitive artifact — competitive context from PROJECT.md"

// Opportunity context
OPP_CONTEXT = null
OPP_FILES = Glob(".planning/design/strategy/OPP-opportunity-v*.md")
IF OPP_FILES not empty:
  Sort by version descending, read highest version
  Parse "## Now / Next / Later Buckets" section — extract Now candidates
  SET OPP_CONTEXT = {now_items}
  Log: "  -> Opportunity artifact found: v{N} (enriching brief scope boundaries)"
ELSE:
  Log: "  -> No opportunity artifact — scope from PROJECT.md"
```

Source: `workflows/brief.md` Step 2 soft-dependency pattern for REQUIREMENTS.md; `skill-style-guide.md` prerequisite warning pattern.

### Skill Registry Entry (IDT row to add)

```markdown
| IDT | /pde:ideate | workflows/ideate.md | strategy | active |
```

Source: `skill-registry.md` existing row format for BRF, CMP, OPP, REC.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No ideation skill — users start with `/pde:brief` directly | `/pde:ideate` before brief — explore 5+ directions, score readiness, produce brief-seed handoff | Phase 27 (this phase) | Brief now has upstream context; brief-seed section eliminates manual re-entry of ideation decisions |
| Brief generates competitive context from training data only | Brief injected with CMP artifact gap analysis when available | Phase 27 (this phase) | Brief competitive context is grounded in actual competitive research, not hallucinated |
| `/pde:recommend` standalone only | Recommend composable — callable from ideate via Skill() | Phase 25 (designed) + Phase 27 (wired) | Per-idea feasibility annotations at diverge→converge checkpoint without user having to run recommend separately |
| Stub commands for ideate — "Status: Planned" | No stub exists — fully new command + workflow | Phase 27 | commands/ideate.md must be created from scratch, not modified |

**Deprecated/outdated:**
- None in this phase — this is purely additive. No existing patterns are superseded.

---

## Open Questions

1. **How does the brief handle conflicting information between IDT brief-seed and PROJECT.md?**
   - What we know: IDT brief-seed has a Problem Statement derived from the ideation session; PROJECT.md has a separately authored problem description.
   - What's unclear: When both exist, which takes precedence in the brief's Problem Statement section?
   - Recommendation: IDT brief-seed enriches and refines the PROJECT.md statement — treat IDT as the "latest thinking" that supersedes raw PROJECT.md content in the Problem Statement section. Document this clearly in the ideate workflow so users understand the handoff contract.

2. **Should ideation produce one IDT artifact per direction or one combined artifact?**
   - What we know: IDEAT-04 says "an IDT artifact" (singular) with a brief-seed section. ROADMAP.md SC3 says "IDT artifact with status `ideation-complete`".
   - What's unclear: Whether the brief-seed is for the single recommended direction only, or for all scored directions with the user choosing.
   - Recommendation: Single combined IDT artifact with brief-seed for the **recommended direction only**. This matches the success criteria language ("a brief seed artifact") and simplifies brief injection to a single read.

3. **Does the ideate workflow need a `--from-cmp` or `--from-opp` flag to explicitly wire upstream context?**
   - What we know: The ideation workflow reads CMP and OPP artifacts if present as optional enrichment context for the diverge phase (knowing competitive gaps can seed ideation directions).
   - What's unclear: Whether explicit flags are needed or auto-detection via Glob is sufficient.
   - Recommendation: Auto-detection via Glob in `<context_routing>` is sufficient and consistent with how OPP already auto-detects CMP. No new flags needed.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | PDE `/pde:test` (skill lint + smoke tests) |
| Config file | none — tests defined in `references/tooling-patterns.md` and executed by `/pde:test` skill |
| Quick run command | `/pde:test ideate --lint` |
| Full suite command | `/pde:test ideate` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IDEAT-01 | `/pde:ideate` produces 5+ divergent directions with no evaluative language in diverge section | smoke | `/pde:test ideate` | ❌ Wave 0 (workflow to be built) |
| IDEAT-02 | Convergence scores each direction; explicit recommended direction present | smoke | `/pde:test ideate` + section check | ❌ Wave 0 |
| IDEAT-03 | Recommend invoked automatically at checkpoint; feasibility annotations in converge output | integration | Manual — check REC artifact written + annotations present | Manual |
| IDEAT-04 | IDT artifact has `## Brief Seed` section; `/pde:brief` with IDT present injects direction context | integration | Manual — run brief after ideate, verify Problem Statement enrichment | Manual |

### Sampling Rate

- **Per task commit:** `/pde:test ideate --lint` (lint validation only, fast)
- **Per wave merge:** `/pde:test ideate` (lint + smoke)
- **Phase gate:** Full suite lint-clean before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `commands/ideate.md` — new command stub (no existing file to modify)
- [ ] `workflows/ideate.md` — full two-pass workflow (no existing file)
- [ ] IDT row in `skill-registry.md` — LINT-010 requires this before lint can pass
- [ ] Targeted edit to `workflows/brief.md` — add sub-step 2c context injection

*(No test framework gaps — `/pde:test` framework is operational from prior phases)*

---

## Sources

### Primary (HIGH confidence)

- Codebase: `workflows/brief.md` — exact step structure to preserve during brief update; Step 2 soft-dependency probe pattern; prerequisite warning format
- Codebase: `workflows/recommend.md` — confirms `--quick` flag is defined; confirms composable design for Skill() invocation
- Codebase: `workflows/competitive.md` — canonical v1.2 workflow file structure reference
- Codebase: `workflows/opportunity.md` — coverage flag pass-through-all pattern; domain DESIGN-STATE update pattern
- Codebase: `workflows/build.md` lines 104, 169 — Skill() invocation anti-Task() mandate; Issue #686 documented
- Codebase: `templates/brief-seed.md` — confirmed fields: concept, slug, type, generated_from, product_type, problem statement, platform, target users, scope, constraints, key decisions, risk register, next steps
- Codebase: `skill-registry.md` — 13 current entries (BRF through REC); IDT must be added
- Codebase: `templates/design-manifest.json` — 13-field designCoverage schema; `hasIdeation` field 8 in canonical order
- Codebase: `references/skill-style-guide.md` — output conventions, flag naming, prerequisite warning pattern
- Codebase: `references/mcp-integration.md` — Skill() invocation context; probe/use/degrade
- Codebase: `references/tooling-patterns.md` — LINT-001 through LINT-010; IDT must pass all lint rules
- Planning: `.planning/ROADMAP.md` Phase 27 — success criteria SC1-SC4, explicit "no stub exists" statement
- Planning: `.planning/research/ARCHITECTURE.md` — Pitfall 3 (single-pass collapse), Pitfall 7 (recommend not in ideation), IDT Component Responsibilities, Skill() invocation pattern line 263
- Planning: `.planning/research/SUMMARY.md` — Phase 4 build rationale; IDT dependency order
- Planning: `.planning/STATE.md` — "Recommend skill designed as standalone and composable — callable from /pde:ideate via Skill() invocation"

### Secondary (MEDIUM confidence)

- Codebase: `workflows/competitive.md` context_routing section — confirms auto-detection Glob pattern for soft dependencies
- Planning: `.planning/phases/25-recommend-competitive-skills/25-RESEARCH.md` — pattern documentation for coverage flag naming (hasIdeation canonical name)
- Planning: `.planning/phases/26-opportunity-mockup-hig-skills/26-RESEARCH.md` — confirms 13-field pass-through-all pattern used by all v1.2 skills

### Tertiary (LOW confidence)

- None — all findings verified directly from codebase source files.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components verified by direct file read; no guesswork
- Architecture patterns: HIGH — derived from direct inspection of 13 implemented skill workflows + build orchestrator
- Pitfalls: HIGH — discovered through codebase inspection (Issue #686 documented in build.md, pass-through-all in opportunity.md, brief-seed schema in template file)
- Validation architecture: HIGH — /pde:test framework live from Phase 26; IDT smoke test gap is expected (workflow to be built)

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (30-day window — all patterns stable; no external dependencies)
