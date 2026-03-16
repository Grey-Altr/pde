# Phase 25: Recommend & Competitive Skills - Research

**Researched:** 2026-03-16
**Domain:** Claude Code plugin skill authoring — prompt-based skills (markdown + YAML frontmatter), workflow files, template artifacts, MCP integration
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REC-01 | User can discover relevant MCP servers and tools via `/pde:recommend` | Workflow pattern established; command stub exists; `templates/recommendations.md` template ready; `mcp-integration.md` has recommendation engine section |
| REC-02 | Recommend reads project context to tailor suggestions | Brief/flows skill pattern: read PROJECT.md + DESIGN-STATE for context; pde-tools.cjs design ensure-dirs already established |
| REC-03 | Recommend integrates into ideation workflow when called from `/pde:ideate` | Phase 27 will call Skill() on recommend; this phase builds recommend as a standalone that degrades gracefully |
| COMP-01 | User can run structured competitive landscape analysis via `/pde:competitive` | Workflow pattern established; command stub exists; `templates/competitive-landscape.md` template ready |
| COMP-02 | Competitive output includes feature comparison matrix and positioning map | Template already has both; `references/strategy-frameworks.md` has SVG template and Porter's Five Forces |
| COMP-03 | Competitive gaps feed into opportunity scoring as candidate input | `templates/opportunity-evaluation.md` already has "Pre-populated from `/pde:competitive` gap analysis" section; need structured gap artifact |
</phase_requirements>

---

## Summary

Phase 25 builds two new skills — `/pde:recommend` and `/pde:competitive` — both as fully implemented workflow files that replace the existing "Planned -- available in PDE v2" stubs in `commands/recommend.md` and `commands/competitive.md`. This is entirely a prompt-engineering and skill-authoring phase. No new Node.js code, no new npm packages, no new binaries. The existing `pde-tools.cjs` infrastructure (design ensure-dirs, lock-acquire, lock-release, manifest-update) is fully sufficient.

The `/pde:recommend` skill reads project context (PROJECT.md, REQUIREMENTS.md, DESIGN-STATE.md, package.json, stack files) and produces a ranked, installation-ready `recommendations.md` artifact in `.planning/design/strategy/`. It gracefully degrades when no live MCP discovery is available by falling back to a curated inline catalog. The skill writes the `hasRecommendations` coverage flag to design-manifest.json (introduced in Phase 24).

The `/pde:competitive` skill produces a structured `CMP-competitive-v{N}.md` artifact containing: competitor profiles, feature comparison matrix, positioning map (SVG), Porter's Five Forces, pricing analysis, gap analysis, and differentiation recommendations. The gap analysis section is the key downstream contract — it feeds `/pde:opportunity` as candidate input. Every claim in competitive output must carry a confidence label. The skill writes the `hasCompetitive` coverage flag.

**Primary recommendation:** Follow the established `brief.md` workflow pattern exactly — `<purpose>`, `<required_reading>`, `<flags>`, `<process>` with numbered steps, and `<output>` sections. Both skills are structurally similar to `/pde:brief` with the main differences being their domain (strategy) and MCP integration points.

---

## Standard Stack

### Core

| Component | Source | Purpose | Authority |
|-----------|--------|---------|-----------|
| Skill command file | `commands/{name}.md` | YAML frontmatter + `@workflows/{name}.md` delegation | All 9 existing implemented skills follow this pattern |
| Workflow file | `workflows/{name}.md` | Full skill logic in `<purpose>`, `<required_reading>`, `<flags>`, `<process>`, `<output>` sections | `workflows/brief.md` is the canonical reference |
| Template file | `templates/{artifact}.md` | Output artifact structure with YAML frontmatter | `templates/competitive-landscape.md` and `templates/recommendations.md` already exist |
| pde-tools.cjs | `bin/pde-tools.cjs` | design ensure-dirs, lock-acquire, lock-release, manifest-update, manifest-set-top-level | All existing design skills use this |
| design-manifest.json | `.planning/design/design-manifest.json` | Coverage flags — `hasRecommendations`, `hasCompetitive` added in Phase 24 | Phase 24 extends schema; Phase 25 writes these flags |

### Supporting

| Component | Source | Purpose | When to Use |
|-----------|--------|---------|-------------|
| `references/mcp-integration.md` | Existing reference | Probe/use/degrade patterns for all MCPs; Recommendation Engine section already defined | Load via `@` in `<required_reading>` |
| `references/strategy-frameworks.md` | Existing reference | RICE, Porter's Five Forces, positioning map SVG template, market sizing | Load via `@` in competitive workflow |
| `references/skill-style-guide.md` | Existing reference | Output formatting, flags, error patterns, summary table | Load via `@` in both workflows |
| Sequential Thinking MCP | Universal MCP | Enhanced competitor analysis reasoning; multi-step market synthesis | Probe in both skills; use for complex analysis sections |
| WebSearch MCP (if installed) | Optional targeted MCP | Live competitor data, current pricing, current market sizing | Probe in competitive skill; degrade to training knowledge |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline catalog in workflow | Separate `ecosystem-catalog.json` file | The mcp-integration.md references ecosystem-catalog.json but no such file exists. Rather than create new infrastructure, embed the catalog directly in the recommend workflow as a structured YAML-like section. Simpler to maintain, same execution. |
| WebSearch MCP for live competitor data | Training knowledge only | WebSearch MCP is optional — must not be required. Competitive skill degrades gracefully to training knowledge with `[Using training knowledge -- install WebSearch MCP for live market data]` tags. |

**Installation:** No new packages required for this phase.

---

## Architecture Patterns

### Recommended Project Structure

Phase 25 adds these files:

```
commands/
  recommend.md          # UPDATED: replace stub with @workflows/recommend.md
  competitive.md        # UPDATED: replace stub with @workflows/competitive.md

workflows/
  recommend.md          # NEW: full recommend skill logic
  competitive.md        # NEW: full competitive skill logic

templates/
  recommendations.md    # EXISTS: machine-readable recommendations artifact (already in place)
  competitive-landscape.md  # EXISTS: competitive analysis artifact (already in place)
```

No new directories. No new binaries. No schema changes (Phase 24 handles those).

### Pattern 1: Skill Command File Pattern

**What:** The command file is a thin stub that delegates entirely to a workflow file via `@` reference.
**When to use:** Always. Every implemented PDE skill follows this exact pattern.

```markdown
---
name: pde:recommend
description: Discover and install MCPs and tools relevant to your project
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
Execute the /pde:recommend command.
</objective>

<process>
@workflows/recommend.md
@references/skill-style-guide.md
</process>
```

Source: `commands/brief.md` — exact same structure, used by all 9 implemented skills.

### Pattern 2: Workflow File Structure

**What:** All skill logic lives in a workflow file with five sections in a fixed order.
**When to use:** Always, for every new workflow file.

```markdown
<purpose>
[One paragraph: what the skill produces, what inputs it reads, what downstream skills consume it]
</purpose>

<required_reading>
@references/skill-style-guide.md
@references/mcp-integration.md
</required_reading>

<flags>
## Supported Flags
| Flag | Type | Behavior |
...
</flags>

<process>
## /pde:{name} — {Skill Name} Pipeline

Check for flags in $ARGUMENTS before beginning...

### Step 1/N: Initialize design directories
[pde-tools.cjs design ensure-dirs pattern]

### Step 2/N: Check prerequisites
[Read PROJECT.md (hard requirement or soft), check for existing artifact, determine version N]

### Step 3/N: Probe MCPs
[Check --no-mcp, --no-{name} flags; attempt probe; set availability flags]

### Step 4/N: [Core skill logic]
...

### Step M/N: Update domain DESIGN-STATE
[Create domain DESIGN-STATE if absent, add/update artifact row]

### Step N/N: Update root DESIGN-STATE and manifest
[lock-acquire, update root DESIGN-STATE cross-domain map + decision log + iteration history,
lock-release, manifest-update for coverage flag]

## Summary
[Standard summary table]

## Anti-Patterns (Guard Against)
[Skill-specific guards]
</process>

<output>
- [list of files written]
</output>
```

Source: `workflows/brief.md` — canonical reference for all v1.1 skills.

### Pattern 3: Graceful Degradation for MCP-Dependent Sections

**What:** Any section that benefits from a live data source (MCP or API) must produce valid output even without it.
**When to use:** `/pde:recommend` (MCP registry probe may fail), `/pde:competitive` (WebSearch MCP may be absent).

```markdown
IF WEBSEARCH_AVAILABLE = true:
  Use WebSearch to fetch current competitor pricing, feature updates, funding data
  TAG: [Enhanced by WebSearch MCP -- live competitor data as of {date}]

IF WEBSEARCH_AVAILABLE = false:
  Use training knowledge for competitor data
  Add currency disclaimer to every claim (inferred/unverified)
  TAG: [Using training knowledge -- install WebSearch MCP for current market data]
```

Source: `references/mcp-integration.md` — probe/use/degrade pattern.

### Pattern 4: Versioned Artifact with Domain DESIGN-STATE

**What:** Skills never overwrite existing artifacts — always increment version. Domain DESIGN-STATE is created if absent.
**When to use:** Both recommend and competitive skills produce versioned artifacts.

```bash
# Check for existing artifact — determine N
Glob .planning/design/strategy/REC-recommendations-v*.md
# If v1 exists, N = 2. If none, N = 1.

# Create domain DESIGN-STATE if absent
Glob .planning/design/strategy/DESIGN-STATE.md
# If absent: create from templates/design-state-domain.md

# Write artifact
Write .planning/design/strategy/REC-recommendations-v{N}.md

# Acquire lock, update root DESIGN-STATE, release lock
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-acquire pde-recommend
# ... update ...
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-release
```

Source: `workflows/brief.md` Steps 6-7 — exact pattern to replicate.

### Pattern 5: Confidence Labeling for Claims

**What:** Competitive output requirement (SC4): every claim carries `confirmed / inferred / unverified` label.
**When to use:** Throughout competitive output, especially in feature matrix and gap analysis.

```markdown
| Feature | Our Product | Competitor A | Competitor B |
|---------|:---:|:---:|:---:|
| Real-time sync | full | full [confirmed] | partial [inferred] |
| Offline mode | none | none [confirmed] | unknown [unverified] |
```

The confidence labels map to:
- **confirmed** — directly verified (from competitor's own docs, pricing page, or WebSearch MCP result)
- **inferred** — reasonably concluded from indirect evidence (feature category implies capability)
- **unverified** — cannot confirm from available sources; flagged for manual validation

### Anti-Patterns to Avoid

- **Removing the stub status** without replacing with full process: the command file's `<process>` section must contain `@workflows/{name}.md`, not inline logic.
- **Writing root DESIGN-STATE without a write lock:** every root DESIGN-STATE write MUST go through lock-acquire / lock-release.
- **Hard-failing when WebSearch MCP is unavailable:** competitive skill must complete with training knowledge. WebSearch is enhancement, not requirement.
- **Skipping skill_code and skill_domain sections in the workflow:** lint rules LINT-001 through LINT-005 require `<purpose>`, `<skill_code>`, `<skill_domain>`, `<context_routing>`, and `<process>` sections.
- **Using `ecosystem-catalog.json` as if it exists:** the file is referenced in `mcp-integration.md` but does not exist in the codebase. The recommend skill must embed its catalog inline or generate dynamically from context.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Design directory initialization | Custom mkdir logic | `pde-tools.cjs design ensure-dirs` | Handles all required subdirs including `ux/mockups/` added in Phase 24 |
| Write lock management | File-based mutex | `pde-tools.cjs design lock-acquire` / `lock-release` | 60s TTL, retry logic, already battle-tested across all v1.1 skills |
| Design manifest updates | Direct JSON writes | `pde-tools.cjs design manifest-update` | Handles merge, existing key preservation, schema version |
| SVG positioning maps | Custom SVG generation | Use the template in `strategy-frameworks.md` | Template already defines correct viewBox, axis, label, competitor dot, and own-product dot patterns |
| RICE scoring formula | Inline math | Load `@references/strategy-frameworks.md` | Full formula including design extensions and composite scoring already defined |
| Porter's Five Forces layout | Inline definition | Load `@references/strategy-frameworks.md` | Complete force definitions, rating indicators, and design implications already documented |
| Artifact output structure | Build from scratch | Use `templates/competitive-landscape.md` and `templates/recommendations.md` | Both templates are fully designed including all required sections and YAML frontmatter |
| MCP probe/use/degrade | Custom retry logic | Follow `mcp-integration.md` probe pattern exactly | Timeout values, retry counts, and log format already standardized for all 7 MCPs |

**Key insight:** This phase is 100% prompt engineering. The infrastructure is complete. The task is to write high-quality workflow files that follow established patterns and produce rich, well-structured artifacts.

---

## Common Pitfalls

### Pitfall 1: ecosystem-catalog.json Does Not Exist

**What goes wrong:** `mcp-integration.md` mentions "Catalog MCPs: Uses pre-written integration entries from ecosystem-catalog.json" but this file does not exist in the codebase (confirmed by find, no results).
**Why it happens:** The reference was written speculatively during v1.1 with the intent that recommend would be built in v1.2.
**How to avoid:** The recommend workflow must either embed a hardcoded inline catalog in the workflow file itself, or generate recommendations purely from project context analysis. The simpler path (and the one consistent with the rest of the codebase) is to embed the catalog inline as a structured section within the workflow file.
**Warning signs:** Any plan step that reads `ecosystem-catalog.json` will fail at runtime.

### Pitfall 2: Coverage Flag Names Must Match Phase 24 Schema Exactly

**What goes wrong:** Phase 24 extends `design-manifest.json` with exactly these new flags: `hasIdeation`, `hasCompetitive`, `hasOpportunity`, `hasMockup`, `hasHigAudit`, `hasRecommendations`. Using any other name (e.g., `hasRecommend`, `hasCompetitiveAnalysis`) will silently write an unmapped field.
**Why it happens:** Multiple names were used in requirements and roadmap documents (e.g., "hasRecommend" in INFRA-02, but "hasRecommendations" in the ROADMAP.md success criteria and template file).
**How to avoid:** Use `hasRecommendations` for the recommend skill and `hasCompetitive` for the competitive skill. These are the canonical names in the Phase 24 success criteria and the template `templates/recommendations.md` header comment.
**Warning signs:** DESIGN-STATE says `hasRecommendations: true` but `/pde:build` checks `hasRecommend`.

### Pitfall 3: Competitive Output Without Confidence Labels Fails SC4

**What goes wrong:** Every claim in competitive output must carry a confidence label. If the workflow doesn't explicitly instruct the LLM to label each cell/claim, output will be missing labels.
**Why it happens:** It's natural to write competitive tables without inline confidence labels — most templates don't require per-cell labeling.
**How to avoid:** The workflow process section must explicitly state: for every factual claim about a competitor, append `[confirmed]`, `[inferred]`, or `[unverified]` immediately after the claim. Provide a clear three-definition block early in the process so the model applies labels correctly and consistently.
**Warning signs:** Feature comparison matrix cells have no label in brackets.

### Pitfall 4: Gap Analysis Must Be Structured for Machine Consumption

**What goes wrong:** COMP-03 requires competitive gaps to feed into `/pde:opportunity` as candidate input. If the gap analysis is purely narrative prose, the opportunity skill cannot parse it.
**Why it happens:** It's easy to write a rich prose gap analysis that's human-readable but not machine-readable.
**How to avoid:** The gap analysis section in the competitive artifact MUST follow the structured format already defined in `templates/competitive-landscape.md`. Specifically, the `## Opportunity Highlights` section uses a numbered list with Source, Estimated reach, and Competitive advantage sub-fields. The opportunity skill reads this section by looking for `## Opportunity Highlights` and parsing the numbered list.
**Warning signs:** Opportunity skill cannot pre-populate its candidates from the competitive artifact.

### Pitfall 5: Recommend Skill Does Not Know Current MCP Registry State

**What goes wrong:** The recommend skill promises to query the MCP registry, but there is no officially defined public MCP registry API.
**Why it happens:** The MCP ecosystem is still maturing. `mcp-compass` is referenced in `mcp-integration.md` but there is no confirmed stable API.
**How to avoid:** The recommend skill should: (1) probe for mcp-compass and degrade gracefully if absent, (2) use WebSearch MCP if available to discover MCPs relevant to the project, and (3) always fall back to a curated inline catalog of well-known MCPs with known install commands. The skill should NEVER hard-fail because a registry is unreachable — this is SC2.
**Warning signs:** Skill throws an error when mcp-compass is not installed.

### Pitfall 6: Skill Code Registration in Tooling Patterns

**What goes wrong:** `references/tooling-patterns.md` references a `skill-registry.md` that skills must be registered in (LINT-010). If the new skills aren't registered, `/pde:test --lint` will produce errors.
**Why it happens:** New skills get overlooked for registry updates.
**How to avoid:** After writing the workflow files, add entries to `skill-registry.md` for both REC (recommend) and CMP (competitive). Use skill codes REC and CMP — these match the codes already referenced in `tooling-patterns.md` Expected File Lists and `templates/competitive-landscape.md` YAML frontmatter.
**Warning signs:** LINT-010 fails: "skill_code in file does not match entry in skill-registry.md".

### Pitfall 7: Lint Required Sections

**What goes wrong:** Lint rules (LINT-001 through LINT-005) require these sections in every skill workflow: `<purpose>`, `<skill_code>`, `<skill_domain>`, `<context_routing>`, `<process>`. Missing any one fails lint.
**Why it happens:** New workflow files copy from brief.md which is well-formed, but `brief.md` may not contain all lint-required sections explicitly.
**How to avoid:** Every workflow file must contain all 5 lint-required sections. `<skill_domain>` for both skills is `strategy`. `<context_routing>` should detect PROJECT.md and existing artifacts.
**Warning signs:** LINT-001 through LINT-005 errors during `/pde:test --lint`.

---

## Code Examples

Verified patterns from existing codebase:

### Skill Command File (thin stub)

```markdown
---
name: pde:competitive
description: Run competitive landscape analysis for your product space
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
Execute the /pde:competitive command.
</objective>

<process>
@workflows/competitive.md
@references/skill-style-guide.md
</process>
```

Source: Pattern from `commands/brief.md`, `commands/flows.md`, `commands/system.md` — all 9 implemented skills.

### Design Directory Initialization (Step 1 of every skill)

```bash
INIT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design ensure-dirs)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

Source: `workflows/brief.md` Step 1.

### Write Lock Pattern (Step N/N of every skill)

```bash
LOCK=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-acquire pde-competitive)
if [[ "$LOCK" == @file:* ]]; then LOCK=$(cat "${LOCK#@file:}"); fi
# Parse {"acquired": true/false}
# If false: wait 2 seconds, retry once
# Update root DESIGN-STATE using Edit tool

# ALWAYS release even on error
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-release
```

Source: `workflows/brief.md` Step 7.

### Manifest Coverage Flag Update

```bash
# Competitive skill writes hasCompetitive flag
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update CMP code CMP
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update CMP name "Competitive Landscape Analysis"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update CMP type competitive
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update CMP domain strategy
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update CMP path ".planning/design/strategy/CMP-competitive-v{N}.md"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update CMP status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update CMP version {N}

# Write coverage flag (added by Phase 24 schema migration)
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-coverage hasCompetitive true
```

Source: Pattern from `workflows/brief.md` Step 7 manifest-update calls.

### MCP Probe Pattern (recommend skill — mcp-compass)

```
IF --no-mcp in arguments: SET ALL_MCP_DISABLED = true, skip all probes

Attempt: mcp-compass search (or equivalent tool)
  with query based on project type and stack
  Timeout: 10 seconds
  Result:
    - Tool responds: MCP_COMPASS_AVAILABLE = true
    - Tool not found or errors: MCP_COMPASS_AVAILABLE = false (degrade immediately — targeted MCP)

IF MCP_COMPASS_AVAILABLE = false:
  Fall back to inline catalog
  TAG: [Using offline catalog -- install mcp-compass for live MCP registry search]
```

Source: `references/mcp-integration.md` — probe/use/degrade pattern for targeted MCPs.

### Confidence Label Application (competitive skill)

```
For EVERY factual claim about a competitor, immediately after the claim append one of:
  [confirmed]   -- directly verified from competitor's own docs, pricing page, or WebSearch MCP
  [inferred]    -- concluded from indirect evidence; competitor in this category likely has this
  [unverified]  -- cannot confirm; flag for user to validate manually

In the feature matrix, apply to each cell:
  | Real-time sync | full | full [confirmed] | partial [inferred] |

In the gap analysis, apply to each unmet need:
  | Offline mode | critical | Competitor A: none [confirmed]; B: partial [inferred] | First-mover opportunity |
```

Source: Phase 25 requirement SC4 — research interpretation of how to implement it.

### YAML Artifact Frontmatter

```yaml
---
Generated: "2026-03-16"
Skill: /pde:competitive (CMP)
Version: v1
Status: draft
Scope: "standard"
Data Currency: "Analysis based on data available as of 2026-03-16. Verify critical data points before strategic decisions."
Enhanced By: "Sequential Thinking MCP"
---
```

Source: `templates/competitive-landscape.md` YAML frontmatter.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stub commands (status: Planned) | Full workflow implementation | Phase 25 | Both commands become operational |
| Inline `<process>` in command files | `@workflows/{name}.md` delegation | v1.1 design pipeline (Phases 12-23) | All logic in workflow files, command files are thin |
| Single design-manifest.json schema (7 flags) | Extended schema (13 flags, 6 new) | Phase 24 | `hasRecommendations` and `hasCompetitive` now available to write |
| No structured gap → opportunity pipeline | Structured artifact handoff | Phase 25-26 | `## Opportunity Highlights` section in CMP artifact feeds OPP candidates |

**Deprecated/outdated:**
- The "Status: Planned" stub content in `commands/competitive.md` and `commands/recommend.md` — this entire `<process>` section body gets replaced with `@workflows/{name}.md`.
- Any reference to `ecosystem-catalog.json` as a file to read at runtime — this file does not exist.

---

## Open Questions

1. **Does `pde-tools.cjs` have `manifest-set-coverage` command?**
   - What we know: `manifest-update` exists and is used by brief.md for artifact fields. Phase 24 extends the `designCoverage` object in the schema.
   - What's unclear: Whether Phase 24 adds a specific `manifest-set-coverage` command or whether coverage flags are set via `manifest-update` on the `designCoverage` key.
   - Recommendation: Plans should check pde-tools.cjs source after Phase 24 lands; if no dedicated coverage command, use the same `manifest-update` pattern with `designCoverage.hasCompetitive` as the key path.

2. **What is the skill-registry.md current content?**
   - What we know: Lint rule LINT-010 checks that each skill code is registered in `skill-registry.md`. REC and CMP codes are referenced in tooling-patterns.md expected file lists but no skill-registry.md was found in the file search.
   - What's unclear: Whether skill-registry.md exists (was not surfaced in the ls output) and what its format is.
   - Recommendation: Plans should include a step to verify skill-registry.md exists and add REC + CMP entries if they're not already present.

3. **What is the exact manifest command to write coverage flags?**
   - What we know: Phase 24 adds `hasRecommendations` and `hasCompetitive` to the manifest schema. The manifest-update command exists.
   - What's unclear: Whether Phase 24 introduces `manifest-set-coverage hasCompetitive true` or whether coverage flags are written with `manifest-update designCoverage.hasCompetitive true`.
   - Recommendation: Planner should note this as a Phase 24 output dependency. After Phase 24 lands, verify the exact command before writing Phase 25 plans.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | PDE `/pde:test` (skill lint + smoke tests) |
| Config file | none — tests are defined in `references/tooling-patterns.md` and executed by the `/pde:test` skill itself |
| Quick run command | `/pde:test competitive,recommend --lint` |
| Full suite command | `/pde:test competitive,recommend` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REC-01 | `/pde:recommend` produces ranked artifact with install instructions | smoke | `/pde:test recommend` | ❌ Wave 0 (workflow to be built) |
| REC-02 | Recommend reads PROJECT.md context and tailors output | smoke | `/pde:test recommend` with project context | ❌ Wave 0 |
| REC-03 | Recommend callable from ideation workflow (Skill()) | integration | Manual — Phase 27 tests | N/A Phase 27 |
| COMP-01 | `/pde:competitive` produces structured landscape artifact | smoke | `/pde:test competitive` | ❌ Wave 0 (workflow to be built) |
| COMP-02 | Competitive output has feature matrix and positioning map | smoke | `/pde:test competitive` + section check | ❌ Wave 0 |
| COMP-03 | Gap analysis section machine-readable for opportunity skill | integration | Manual — compare CMP output with OPP input | Manual |

### Sampling Rate

- **Per task commit:** `/pde:test competitive,recommend --lint` (lint validation only, fast)
- **Per wave merge:** `/pde:test competitive,recommend` (lint + smoke)
- **Phase gate:** Full suite lint-clean before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `workflows/recommend.md` — full workflow to be built (covers REC-01, REC-02)
- [ ] `workflows/competitive.md` — full workflow to be built (covers COMP-01, COMP-02, COMP-03)
- [ ] `commands/recommend.md` — update stub to `@workflows/recommend.md` delegation
- [ ] `commands/competitive.md` — update stub to `@workflows/competitive.md` delegation
- [ ] Skill registry entries for REC and CMP (covers LINT-010)

---

## Sources

### Primary (HIGH confidence)

- Codebase: `workflows/brief.md` — canonical workflow file structure, all 7 steps, anti-patterns
- Codebase: `commands/brief.md` — canonical command file pattern
- Codebase: `references/mcp-integration.md` — probe/use/degrade patterns, recommendation engine section
- Codebase: `references/strategy-frameworks.md` — RICE, Porter's Five Forces, positioning SVG template
- Codebase: `references/skill-style-guide.md` — output formatting, lint rules, error patterns
- Codebase: `references/tooling-patterns.md` — lint rules LINT-001 through LINT-042, smoke test definitions
- Codebase: `templates/competitive-landscape.md` — full competitive artifact structure
- Codebase: `templates/recommendations.md` — full recommendations artifact structure
- Codebase: `templates/opportunity-evaluation.md` — confirms CMP → OPP candidate pre-population contract
- Codebase: `templates/design-manifest.json` — `designCoverage` object, existing flag names
- Codebase: `.planning/ROADMAP.md` — Phase 25 success criteria, dependency chain
- Codebase: `.planning/REQUIREMENTS.md` — REC-01/02/03, COMP-01/02/03 requirements

### Secondary (MEDIUM confidence)

- Codebase: `commands/opportunity.md` — confirms OPP also a stub, Phase 25 CMP must be ready before Phase 26 OPP
- Codebase: `commands/competitive.md` and `commands/recommend.md` — confirms stub content to be replaced
- `.planning/STATE.md` — confirms Phase 25 dependency order decisions

### Tertiary (LOW confidence)

- `mcp-integration.md` reference to `ecosystem-catalog.json` — file does not exist; treated as aspirational reference that must be resolved inline within the workflow.
- `mcp-integration.md` reference to `mcp-compass` — no official MCP compass registry API confirmed; treat as optional enhancement with immediate degradation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components verified by reading codebase; no guesswork
- Architecture patterns: HIGH — direct inspection of 9 implemented skill workflows
- Pitfalls: HIGH — discovered by auditing code (ecosystem-catalog.json, coverage flag naming, lint rules)
- Validation architecture: MEDIUM — `/pde:test` framework confirmed; specific commands depend on Phase 24 manifest changes

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (30 days — stable patterns, but Phase 24 output affects coverage flag commands)
