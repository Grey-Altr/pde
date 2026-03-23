# Phase 85: Brief Extensions + Detection — Research

**Researched:** 2026-03-22
**Domain:** Workflow prompt engineering — extending `workflows/brief.md` with business intent detection and artifact generation
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BRIEF-01 | `brief.md` detects business intent from project description keyword signals and sets `businessMode: true` in manifest | `manifest-set-top-level businessMode true` already works (design.cjs line 264 confirms top-level field write); pattern mirrors product_type detection already in Step 4 of brief.md |
| BRIEF-02 | User track selection (solo_founder / startup_team / product_leader) stored as `businessTrack` in manifest, with track-specific vocabulary and depth applied downstream | `manifest-set-top-level businessTrack <value>` command exists; `references/business-track.md` defines all three tracks and their detection signals as sole source of truth |
| BRIEF-03 | Business thesis statement generated as BTH artifact in `strategy/` directory with structured problem/solution/market/unfair-advantage framing | Artifact pattern (versioned markdown in `strategy/` domain) matches BRF, IDT, CMP artifacts; manifest-update BTH + DESIGN-STATE update follow the identical 4-command pattern used by all prior artifacts |
| BRIEF-04 | Lean Canvas generated as 9-box structured output with confidence levels per hypothesis (validated/assumed/unknown) — anchored to BTH artifact | Lean Canvas schema is fully defined in `references/launch-frameworks.md` (9-box table with status/evidence columns); artifact code is LCV, domain is `strategy/` |
| BRIEF-05 | Domain strategy capture (naming, domain availability notes, brand positioning seeds) included in brief output for downstream brand system consumption | Appended as a new section to the BRF artifact itself (no new artifact file needed); brief.md already writes the BRF file directly with Write tool in Step 5 |
| BRIEF-06 | `hasBusinessThesis` coverage flag set in designCoverage after BTH artifact creation | 20-field pass-through-all pattern now required (not 16-field) — field order is the 16 existing fields + hasBusinessThesis, hasMarketLandscape, hasServiceBlueprint, hasLaunchKit |
| BRIEF-07 | Financial content in brief uses structural placeholders only per `business-financial-disclaimer.md` — no dollar amounts generated | `[YOUR_X]` format from `references/business-financial-disclaimer.md`; lean canvas Cost Structure (box 8) and Revenue Streams (box 9) use `[YOUR_CAC_CEILING]`, `[YOUR_ARR_TARGET]`, `[YOUR_LTV_ESTIMATE]` |
</phase_requirements>

---

## Summary

Phase 85 extends `workflows/brief.md` with business intent detection and two new artifact generation paths (BTH business thesis + LCV lean canvas). This is pure prompt-engineering work — no code files change. The implementation follows established patterns in the existing skill system with zero novel infrastructure.

The brief.md skill already has a product type detection step (Step 4) that scans PROJECT.md for signal keywords and applies classification logic. Business intent detection (BRIEF-01) follows the identical pattern: scan for business signals, set a boolean, write to manifest via `manifest-set-top-level`. Track detection (BRIEF-02) is a second pass over the same PROJECT.md content using signals already defined in `references/business-track.md` — it must default to `solo_founder` when signals are ambiguous, per the reference file definition.

The BTH and LCV artifacts (BRIEF-03, BRIEF-04) are new versioned markdown files in `strategy/` following the exact same artifact pattern as BRF, IDT, CMP, and OPP. The manifest-update pattern (4 commands: code, name, type, domain, path, status, version) and DESIGN-STATE update (Cross-Domain Map + Decision Log + Iteration History rows) are already established. The lean canvas schema is fully specified in `launch-frameworks.md` — no design work needed in this phase.

The designCoverage write (BRIEF-06) must use the 20-field pass-through-all pattern. This is the critical breaking change from prior phases: existing workflows hardcode 16 fields, but this phase must use all 20 (the 4 new fields from Phase 84 are now in the manifest template). The planner must ensure the implemented workflow explicitly lists all 20 field names in the correct order.

**Primary recommendation:** Implement Phase 85 as two plans: (1) detection and manifest writes (BRIEF-01, BRIEF-02, BRIEF-05, BRIEF-07 — all within Step 4/5/7 of brief.md), and (2) artifact generation (BRIEF-03, BRIEF-04, BRIEF-06 — new steps inserted between Step 5 and Step 6).

---

## Standard Stack

### Core — No New Dependencies

| File | Current State | Modification | Change Size |
|------|--------------|--------------|-------------|
| `workflows/brief.md` | 624 lines, 7 steps | Add business intent detection to Step 4; add business section to Step 5 BRF output; add new Steps 5b+5c for BTH/LCV artifact generation; add businessMode/businessTrack manifest writes to Step 7 | ~200 lines added |
| `references/business-track.md` | COMPLETE — created in Phase 84 | Read-only (loaded via `@references/business-track.md`) | None |
| `references/launch-frameworks.md` | COMPLETE — created in Phase 84 | Read-only (loaded via `@references/launch-frameworks.md`) | None |
| `references/business-financial-disclaimer.md` | COMPLETE — created in Phase 84 | Read-only | None |

### No New Reference Files, No New Commands

Phase 85 adds zero new reference files, zero new commands, and zero npm dependencies. All infrastructure was created in Phase 84. This phase is purely a modification of `workflows/brief.md`.

### Required Reading Block (in brief.md `<required_reading>`)

The extended `brief.md` must add these references:

```
@references/skill-style-guide.md       (existing)
@references/mcp-integration.md         (existing)
@references/business-track.md          (NEW — for track detection + vocabulary)
@references/launch-frameworks.md       (NEW — for lean canvas schema)
@references/business-financial-disclaimer.md  (NEW — for financial placeholder enforcement)
```

---

## Architecture Patterns

### How the Existing Brief.md Step Structure Works

```
Step 1/7: Initialize design directories (pde-tools ensure-dirs)
Step 2/7: Check prerequisites (read PROJECT.md, upstream context injection)
Step 3/7: Probe MCP (Sequential Thinking availability)
Step 4/7: Detect product type   <- BUSINESS INTENT DETECTION INSERTED HERE
Step 5/7: Synthesize brief content (write BRF artifact)  <- DOMAIN STRATEGY SECTION ADDED
  [NEW] Step 5b: Generate BTH artifact (if businessMode)
  [NEW] Step 5c: Generate LCV artifact (if businessMode)
Step 6/7: Update strategy domain DESIGN-STATE
Step 7/7: Update root DESIGN-STATE and manifest  <- businessMode/businessTrack writes added
```

### Pattern 1: Business Intent Detection (BRIEF-01)

**What:** After existing product_type detection in Step 4, scan PROJECT.md for business-specific signals and set `businessMode`.

**Signal categories to detect:**

| Category | Example Signals |
|----------|----------------|
| Business model | "business model", "revenue", "monetize", "SaaS", "subscription", "pricing", "freemium", "B2B", "B2C" |
| Market context | "market", "customers", "target market", "go-to-market", "GTM", "acquisition", "churn", "LTV", "CAC" |
| Launch intent | "launch", "startup", "found", "venture", "bootstrap", "seed", "funding", "investor", "pitch" |
| Competitive framing | "compete", "competitive advantage", "differentiation", "unfair advantage", "market position" |
| Business outcomes | "profit", "margin", "unit economics", "runway", "burn rate", "ARR", "MRR", "growth" |

**Classification logic:**

```
IF 3+ distinct business signals detected across 2+ categories:
  businessMode = true
ELSE IF strong single signal ("business model", "revenue model", "go-to-market"):
  businessMode = true
ELSE:
  businessMode = false
```

**Default:** `businessMode = false` when signals are absent or count is below threshold.

**When Sequential Thinking MCP available AND businessMode detection is ambiguous** (2 signals, single category): use Sequential Thinking to reason about whether business intent dominates the project description. Use the result to set `businessMode`.

### Pattern 2: Track Detection (BRIEF-02)

**What:** If `businessMode = true`, detect track from PROJECT.md signals using `references/business-track.md` signal lists.

**Implementation (from business-track.md):**

```
Check for product_leader signals first (most specific):
  "product leader", "PM", "head of product", "enterprise", "director", "VP", "product manager"

Check for startup_team signals second:
  "startup", "seed", "early stage", "founding team", "co-founder", "pre-seed", "Series A"

Check for solo_founder signals:
  "solo", "indie", "solo founder", "one person", "bootstrapped", "side project", "just me"

Default: solo_founder when no signals detected or signals are ambiguous
```

**User prompt for track confirmation:**

Since track selection is explicitly interactive (BRIEF-02 says "User is prompted to select"), the implementation presents the detected track and asks the user to confirm or choose:

```
Business intent detected. Select your track:

  1. solo_founder — individual builder or bootstrapped maker
  2. startup_team — early-stage startup with co-founders or investors
  3. product_leader — PM or product director within an organization

Detected from your description: {detected_track}
Press Enter to confirm or type 1/2/3 to change.
```

Store the user-confirmed value as `businessTrack`. This is the only interactive prompt in the business detection flow.

### Pattern 3: BTH Artifact Generation (BRIEF-03)

**Artifact code:** `BTH`
**Domain:** `strategy`
**File path:** `.planning/design/strategy/BTH-thesis-v{N}.md`

**Structure:**

```markdown
---
Generated: "{ISO 8601}"
Skill: /pde:brief (BTH)
Version: v{N}
businessTrack: {track}
---

# Business Thesis

## Problem
[1-2 paragraphs: specific problem, who has it, why it matters now]

## Solution
[1-2 paragraphs: how the product solves the problem uniquely]

## Market
[Market context: who the customers are, size estimate as structural placeholder only]
[YOUR_TAM_SIZE] [VERIFY FINANCIAL ASSUMPTIONS]

## Unfair Advantage
[What the team/product has that cannot be easily copied or bought]
```

**Anchoring to BRF:** BTH consumes the BRF's Problem Statement and Target Users sections. The planner must read the freshly-written BRF-brief-v{N}.md (already in memory from Step 5) — no additional file reads needed.

**DESIGN-STATE update:** Add `BTH | strategy | BRF | current` to the Cross-Domain Dependency Map and append to Decision Log and Iteration History.

### Pattern 4: LCV Artifact Generation (BRIEF-04)

**Artifact code:** `LCV`
**Domain:** `strategy`
**File path:** `.planning/design/strategy/LCV-lean-canvas-v{N}.md`

**Schema:** Exactly the 9-box table from `references/launch-frameworks.md`:

| # | Box | Content | Status | Evidence |
|---|-----|---------|--------|----------|
| 1 | Problem | derived from BRF Problem Statement | assumed or unknown | per BRF |
| 2 | Solution | derived from BRF brief | assumed | per BRF |
| 3 | Unique Value Proposition | synthesized from BTH Solution + Unfair Advantage | unknown | none yet |
| 4 | Unfair Advantage | from BTH Unfair Advantage section | unknown | none yet |
| 5 | Customer Segments | from BRF Target Users | assumed | per BRF |
| 6 | Key Metrics | from BRF Success Criteria | unknown | none yet |
| 7 | Channels | synthesized from BRF Competitive Context and brief signals | unknown | none yet |
| 8 | Cost Structure | `[YOUR_CAC_CEILING]`, `[YOUR_HOSTING_COST]` | unknown | none yet [VERIFY FINANCIAL ASSUMPTIONS] |
| 9 | Revenue Streams | `[YOUR_ARR_TARGET]`, `[YOUR_LTV_ESTIMATE]` | unknown | none yet [VERIFY FINANCIAL ASSUMPTIONS] |

**Confidence rules (per launch-frameworks.md):**
- `validated` — only when user provides explicit evidence
- `assumed` — when derived from BRF content the user authored
- `unknown` — default for all synthesized or inferred values
- Financial boxes (8, 9) — never mark as `validated` without explicit user evidence

**LCV anchoring to BTH:** LCV must reference the BTH artifact path in its frontmatter (`dependsOn: BTH`) so the Cross-Domain Dependency Map reflects the correct chain: BRF -> BTH -> LCV.

### Pattern 5: Domain Strategy Capture (BRIEF-05)

**What:** Additional section in the BRF artifact, not a new file. The brief.md Step 5 content template gains a conditional section.

**Added to BRF artifact (after `## Scope Boundaries`, before the footer):**

```markdown
## Domain Strategy
*(Generated when businessMode = true)*

**Naming Direction:**
[2-3 candidate naming directions derived from the UVP — descriptive, evocative, or coined word approaches]

**Domain Availability Notes:**
[Placeholder notes — user must verify availability]
[YOUR_DOMAIN_NAME].com — [verify availability]

**Brand Positioning Seeds:**
[3-5 positioning phrases derived from UVP and Unfair Advantage for downstream brand system consumption]
```

**Key constraint:** This is appended to the BRF brief file only, not a separate artifact. It does not create a new manifest artifact entry.

### Pattern 6: hasBusinessThesis Coverage Write (BRIEF-06)

**Critical:** The coverage write must use the 20-field pass-through-all pattern. The field order is:

```
hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate, hasHandoff,
hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations,
hasStitchWireframes, hasPrintCollateral, hasProductionBible,
hasBusinessThesis, hasMarketLandscape, hasServiceBlueprint, hasLaunchKit
```

**Command pattern:**

```bash
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
# Parse all 20 fields, then:
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{curr},...,"hasProductionBible":{curr},"hasBusinessThesis":true,"hasMarketLandscape":{curr},"hasServiceBlueprint":{curr},"hasLaunchKit":{curr}}'
```

**Anti-pattern:** Writing only `{"hasBusinessThesis": true}` will erase all 19 other fields. This is the primary correctness risk for BRIEF-06.

### Pattern 7: businessMode and businessTrack Manifest Writes (Step 7)

Two additional `manifest-set-top-level` commands are added to Step 7 of brief.md:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level businessMode true
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level businessTrack {confirmed_track}
```

When `businessMode = false`, these commands still run but write `false` and `null` respectively. The manifest always reflects current state.

### Recommended Project Structure Changes

```
workflows/
└── brief.md                MODIFIED — ~200 lines added for business extensions

references/
├── business-track.md       EXISTING (Phase 84) — read-only
├── launch-frameworks.md    EXISTING (Phase 84) — read-only
└── business-financial-disclaimer.md  EXISTING (Phase 84) — read-only

No new files created. No code changes.
```

### Where New Steps Insert in brief.md

The new business-mode logic inserts at three points:

1. **Step 4 (product type detection):** After product_type is resolved, run business signal scan and track detection. Display additional line: `  -> Business mode: {true/false}. Track: {track or N/A}.`

2. **Step 5 (brief content synthesis):** If `businessMode = true`, add `## Domain Strategy` section to BRF output; after writing BRF file, run Steps 5b and 5c.

3. **Step 7 (manifest update):** After existing `manifest-set-top-level` calls, add `businessMode` and `businessTrack` writes; include `hasBusinessThesis: true` in the 20-field coverage write.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Lean canvas schema | Custom 9-box template | `references/launch-frameworks.md` lean canvas table | Already verified against Ash Maurya's schema; planner must load this reference, not reinvent |
| Track signal lists | Ad-hoc keyword lists in brief.md | `references/business-track.md` signal lists | Single source of truth — downstream workflows (competitive.md, flows.md etc.) will also use this reference |
| Financial placeholder format | Custom placeholder naming | `[YOUR_X]` format from `business-financial-disclaimer.md` | Consistent naming enables INTG tests to grep for prohibited `$[digit]` patterns across all artifacts |
| Artifact registration pattern | New manifest schema | Existing `manifest-update` + `manifest-set-top-level` commands | Both commands exist in pde-tools.cjs; no design.cjs changes needed |
| Coverage field write | Partial coverage object | 20-field pass-through-all JSON blob | Partial write silently erases other coverage flags — the tool has no merge semantics |

**Key insight:** Every piece of infrastructure for Phase 85 already exists. The only work is authoring the prompt text that instructs Claude how to use it.

---

## Common Pitfalls

### Pitfall 1: 16-Field Coverage Write (Most Critical Risk)

**What goes wrong:** The planner authors the coverage write with only 16 fields (the pre-Phase-84 count), omitting the 4 new fields. `manifest-set-top-level designCoverage` replaces the entire object — all omitted fields silently become absent.

**Why it happens:** Existing workflows (opportunity.md, hig.md, flows.md) all hardcode 16 fields. Copying any of them verbatim produces the wrong count.

**How to avoid:** BRIEF-06 implementation must explicitly list all 20 fields in the canonical order. The test must verify the 20-field count in the written manifest (the existing test-foundation.cjs already asserts 20 fields exist in the template — the Phase 85 test should assert the count after a workflow run).

**Warning signs:** `grep "hasLaunchKit" .planning/design/design-manifest.json` returns no match after /pde:brief runs.

### Pitfall 2: businessMode Detection Over-Triggering

**What goes wrong:** The business signal word list is too broad. A software product that mentions "pricing page" or "subscription tiers" accidentally gets `businessMode: true`, generating unwanted BTH and LCV artifacts.

**Why it happens:** Many software product descriptions use business vocabulary incidentally without meaning "design a business strategy."

**How to avoid:** Require 3+ signals across 2+ categories (not a single match). Treat domain-specific infrastructure terms (Stripe, subscription, pricing) as ONE signal only — not automatic triggers. The confirmation prompt approach (showing detected track and asking user to confirm) also catches this: if businessMode fires incorrectly, the user will decline.

**Warning signs:** Test project descriptions for non-business software products trigger the detection.

### Pitfall 3: Financial Content in BTH/LCV Without Placeholders

**What goes wrong:** The synthesized business thesis or lean canvas includes dollar amounts or specific percentages (e.g., "target $10K MRR", "15% churn assumption").

**Why it happens:** Claude's training naturally fills financial context with plausible numbers. Without explicit instruction to use `[YOUR_X]` format, the model will hallucinate financial values.

**How to avoid:** BRIEF-07 must include explicit instructions in the workflow: "For all financial fields, use `[YOUR_X]` format from `@references/business-financial-disclaimer.md`. Never write dollar amounts. Never write specific percentages as facts." Add a post-write verification step: after writing BTH and LCV, grep the output files for `$[digit]` patterns and halt with error if found.

**Warning signs:** Dollar sign followed by a digit anywhere in BTH or LCV content.

### Pitfall 4: BTH/LCV Generated When businessMode = false

**What goes wrong:** Steps 5b and 5c run unconditionally, generating business artifacts for non-business projects.

**Why it happens:** The condition gate (`IF businessMode == true`) is omitted or evaluated incorrectly.

**How to avoid:** Both Steps 5b and 5c must be wrapped in explicit conditionals. The summary table display logic must also conditionally include/exclude BTH and LCV from the "Files created" row.

**Warning signs:** `strategy/BTH-thesis-v1.md` exists for a project where PROJECT.md has no business signals.

### Pitfall 5: LCV Not Anchored to BTH in DESIGN-STATE

**What goes wrong:** LCV gets its own manifest entry but the `dependsOn` field doesn't reference BTH. The Cross-Domain Dependency Map in DESIGN-STATE.md shows LCV without its parent artifact chain.

**Why it happens:** Artifact registration commands don't include a dependsOn write.

**How to avoid:** After `manifest-update LCV code LCV`, add `manifest-update LCV dependsOn '["BTH"]'`. Add `| LCV | strategy | BTH | current |` row to DESIGN-STATE Cross-Domain Dependency Map.

### Pitfall 6: User Prompt for Track Blocks --force Mode

**What goes wrong:** When `--force` is in $ARGUMENTS, brief.md skips the existing version confirmation prompt. But if a business track prompt is added without checking for `--force` or `--quick`, the skill hangs waiting for input in automated contexts.

**How to avoid:** The track selection prompt must be skipped when `--force` is present. When skipped, use the auto-detected track value. Log: `  -> --force mode: using detected track {track} without confirmation prompt.`

---

## Code Examples

Verified patterns from existing brief.md and opportunity.md:

### Business Intent Detection Logic (Step 4 extension)

```markdown
**Business intent detection (BRIEF-01):**

After product_type detection, scan PROJECT.md content for business signals:

BUSINESS_SIGNAL_COUNT = 0
BUSINESS_CATEGORY_COUNT = 0

Check each category:
  Model signals: "business model", "revenue", "monetize", "SaaS", "subscription", "pricing",
                 "freemium", "B2B", "B2C" -> if any found: BUSINESS_SIGNAL_COUNT++, BUSINESS_CATEGORY_COUNT++
  Market signals: "go-to-market", "GTM", "acquisition", "churn", "LTV", "CAC", "market fit",
                  "target market" -> if any found: BUSINESS_SIGNAL_COUNT++, BUSINESS_CATEGORY_COUNT++
  Launch signals: "startup", "found", "venture", "bootstrap", "seed", "funding", "investor",
                  "pitch deck" -> if any found: BUSINESS_SIGNAL_COUNT++, BUSINESS_CATEGORY_COUNT++
  Metrics signals: "ARR", "MRR", "burn rate", "runway", "unit economics", "profit",
                   "margin" -> if any found: BUSINESS_SIGNAL_COUNT++, BUSINESS_CATEGORY_COUNT++
  Positioning signals: "competitive advantage", "differentiation", "unfair advantage",
                       "market position" -> if any found: BUSINESS_SIGNAL_COUNT++, BUSINESS_CATEGORY_COUNT++

IF BUSINESS_SIGNAL_COUNT >= 3 AND BUSINESS_CATEGORY_COUNT >= 2:
  SET businessMode = true
ELSE IF strong single signal found ("business model", "revenue model", "go-to-market strategy"):
  SET businessMode = true
ELSE:
  SET businessMode = false
```

### 20-Field Coverage Write Pattern (BRIEF-06)

```bash
# Source: modeled on opportunity.md lines 465-480, extended to 20 fields
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi

# Parse all 20 flags, default absent fields to false
# Then write full 20-field JSON:
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{curr},"hasWireframes":{curr},"hasFlows":{curr},"hasHardwareSpec":{curr},"hasCritique":{curr},"hasIterate":{curr},"hasHandoff":{curr},"hasIdeation":{curr},"hasCompetitive":{curr},"hasOpportunity":{curr},"hasMockup":{curr},"hasHigAudit":{curr},"hasRecommendations":{curr},"hasStitchWireframes":{curr},"hasPrintCollateral":{curr},"hasProductionBible":{curr},"hasBusinessThesis":true,"hasMarketLandscape":{curr},"hasServiceBlueprint":{curr},"hasLaunchKit":{curr}}'
```

### Manifest Top-Level Writes for businessMode/businessTrack (Step 7 addition)

```bash
# Source: design.cjs cmdManifestSetTopLevel (line 256) — sets manifest[field] = value directly
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level businessMode true
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level businessTrack solo_founder
```

### Financial Placeholder Enforcement Pattern (BRIEF-07)

```markdown
## Lean Canvas — Box 8: Cost Structure
| Cost Driver | Placeholder | Status | Evidence |
|-------------|-------------|--------|----------|
| Customer acquisition | [YOUR_CAC_CEILING] [VERIFY FINANCIAL ASSUMPTIONS] | unknown | none yet |
| Hosting/infrastructure | [YOUR_HOSTING_COST] [VERIFY FINANCIAL ASSUMPTIONS] | unknown | none yet |

## Lean Canvas — Box 9: Revenue Streams
| Revenue Driver | Placeholder | Status | Evidence |
|----------------|-------------|--------|----------|
| Annual recurring revenue | [YOUR_ARR_TARGET] [VERIFY FINANCIAL ASSUMPTIONS] | unknown | none yet |
| Lifetime value per customer | [YOUR_LTV_ESTIMATE] [VERIFY FINANCIAL ASSUMPTIONS] | unknown | none yet |
```

### BTH Artifact Registration (Step 5b — manifest commands)

```bash
# Source: same pattern as BRF registration in brief.md Step 7
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BTH code BTH
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BTH name "Business Thesis"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BTH type thesis
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BTH domain strategy
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BTH path ".planning/design/strategy/BTH-thesis-v{N}.md"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BTH status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BTH version {N}
```

### LCV Artifact Registration (Step 5c)

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update LCV code LCV
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update LCV name "Lean Canvas"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update LCV type canvas
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update LCV domain strategy
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update LCV path ".planning/design/strategy/LCV-lean-canvas-v{N}.md"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update LCV status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update LCV version {N}
```

---

## State of the Art

| Old Pattern | Current Pattern | When Changed | Impact |
|-------------|-----------------|--------------|--------|
| 16-field designCoverage write | 20-field designCoverage write | Phase 84 (this milestone) | Every workflow that writes designCoverage must now use 20 fields — Phase 85 is the FIRST workflow to implement this after Phase 84 |
| No business artifacts in brief | BTH + LCV generated conditionally | Phase 85 (this phase) | brief.md becomes a branching skill for the first time |
| productType-only classification | productType + businessMode orthogonal flags | Phase 84 architecture decision | business: is not a 5th productType — it overlays any existing type |

**Architecture decision (from STATE.md):** `business:` is an orthogonal boolean flag (`businessMode` + `businessTrack`) — NOT a new productType enum value. This decision prevents a 14-workflow rewrite later. Phase 85 must respect this: when `businessMode = true`, the brief still writes `productType = "software"` (or whatever was detected) — businessMode is additive, never replacing productType.

---

## Open Questions

1. **Track prompt in --dry-run mode**
   - What we know: `--dry-run` skips all file writes and halts after Step 4 display
   - What's unclear: Should the track selection prompt appear in dry-run mode?
   - Recommendation: Skip the interactive track prompt in --dry-run. Display `  -> Business track: {detected_track} (dry-run — no prompt)` and halt normally.

2. **BTH/LCV versioning when brief increments**
   - What we know: BRF versions increment (v1, v2, v3) — each brief run creates a new BRF version
   - What's unclear: Should BTH and LCV version numbers stay in sync with BRF (both v2 when brief is v2)?
   - Recommendation: Yes — use the same N. If this is BRF v2, write BTH-thesis-v2.md and LCV-lean-canvas-v2.md. This maintains artifact version cohesion within a single brief run.

3. **LCV generated when BTH fails**
   - What we know: LCV is described as "anchored to BTH artifact" in BRIEF-04
   - What's unclear: If BTH write fails partway through, should LCV still be generated?
   - Recommendation: Treat BTH as a prerequisite for LCV. If BTH write fails, skip LCV generation and report: `  Warning: LCV skipped — BTH generation failed.` Do not halt the entire brief run.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | node:test (built-in, zero npm) |
| Config file | none — inline test scripts |
| Quick run command | `node .planning/phases/85-brief-extensions-detection/tests/test-brief-extensions.cjs` |
| Full suite command | `node .planning/phases/85-brief-extensions-detection/tests/test-brief-extensions.cjs` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BRIEF-01 | businessMode: true written to manifest after detection | structural | `grep '"businessMode": true' .planning/design/design-manifest.json` | ❌ Wave 0 |
| BRIEF-02 | businessTrack written with valid enum value | structural | `grep '"businessTrack"' .planning/design/design-manifest.json` | ❌ Wave 0 |
| BRIEF-03 | BTH artifact file exists in strategy/ | file-exists | `test -f .planning/design/strategy/BTH-thesis-v1.md` | ❌ Wave 0 |
| BRIEF-04 | LCV artifact contains all 9 boxes and status fields | structural | grep for all 9 box headers in LCV file | ❌ Wave 0 |
| BRIEF-05 | BRF brief contains Domain Strategy section | structural | `grep "## Domain Strategy" .planning/design/strategy/BRF-brief-v*.md` | ❌ Wave 0 |
| BRIEF-06 | designCoverage has hasBusinessThesis: true AND 20 total fields | structural | parse designCoverage from manifest, check field count and hasBusinessThesis value | ❌ Wave 0 |
| BRIEF-07 | No dollar amounts in BTH or LCV output | negative-structural | `! grep -E '\$[0-9]' .planning/design/strategy/BTH-thesis-v*.md .planning/design/strategy/LCV-lean-canvas-v*.md` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `node .planning/phases/85-brief-extensions-detection/tests/test-brief-extensions.cjs`
- **Per wave merge:** `node .planning/phases/85-brief-extensions-detection/tests/test-brief-extensions.cjs`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `.planning/phases/85-brief-extensions-detection/tests/test-brief-extensions.cjs` — covers BRIEF-01 through BRIEF-07

**Note:** Unlike Phase 84 tests which verify file content of reference files, Phase 85 tests verify runtime output of the workflow against a fixture project description containing known business intent signals. The test scaffold must create a minimal `.planning/PROJECT.md` fixture with business signals and verify the manifest state after the workflow logic would execute. Since the workflow is a Claude skill (not a Node.js module), tests use grep/file-exists assertions against known fixture output rather than importing and calling functions directly.

---

## Sources

### Primary (HIGH confidence)

- Direct file read: `workflows/brief.md` (624 lines) — verified existing step structure, flag handling, product type detection pattern, manifest write commands
- Direct file read: `references/business-track.md` — verified all three track names, signal lists, default behavior, vocabulary substitution tables
- Direct file read: `references/launch-frameworks.md` — verified Lean Canvas 9-box schema with status/evidence columns, confidence annotation format
- Direct file read: `references/business-financial-disclaimer.md` — verified `[YOUR_X]` placeholder format, `[VERIFY FINANCIAL ASSUMPTIONS]` inline tag requirement, `## Prohibited Patterns` section
- Direct file read: `templates/design-manifest.json` — verified `businessMode: false` and `businessTrack` fields at lines 9-10, `designCoverage` with all 20 fields at lines 110-132
- Direct file read: `bin/lib/design.cjs` — verified `cmdManifestSetTopLevel` function (line 256) performs direct field assignment; `cmdManifestUpdate` updates artifact sub-objects
- Direct file read: `bin/pde-tools.cjs` — verified `manifest-set-top-level` subcommand route (line 528-529); confirmed `businessMode`/`businessTrack` are valid top-level field targets
- Direct file read: `workflows/opportunity.md` (lines 465-480) — verified 16-field coverage write pattern as the canonical precedent this phase extends to 20 fields
- Direct file read: `.planning/REQUIREMENTS.md` — verified all 7 BRIEF requirements and their exact descriptions

### Secondary (MEDIUM confidence)

- Direct file read: `.planning/STATE.md` — architectural decision "business: is orthogonal boolean flag" confirmed as locked, preventing alternative interpretations

### Tertiary (LOW confidence — none)

No WebSearch or unverified claims in this research. All findings are from direct code and file inspection.

---

## Metadata

**Confidence breakdown:**
- Standard stack (no new dependencies): HIGH — verified by direct inspection of design.cjs and pde-tools.cjs; no npm packages required
- Architecture patterns (business detection): HIGH — signal-based classification pattern mirrors existing Step 4 product type detection exactly; track defaults confirmed from business-track.md
- Lean canvas schema: HIGH — verified against launch-frameworks.md which was built in Phase 84
- designCoverage 20-field write: HIGH — field names and positions verified in templates/design-manifest.json; anti-pattern (16-field copy from prior workflows) is documented and specific
- Financial placeholder enforcement: HIGH — format verified from business-financial-disclaimer.md; prohibition on `$[digit]` pattern is the exact test assertion

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable infrastructure, no external dependencies)

---

## Deep Dive

*Added 2026-03-22 — full source inspection of all 7 domains per checkpoint request.*

---

### Domain 1: Business Intent Detection (BRIEF-01)

#### Current State

`workflows/brief.md` Step 4 (lines 169-224 of the 624-line file) already implements signal-based product_type classification. The pattern is:

1. Define explicit signal word lists for each type (software, hardware, experience)
2. Scan PROJECT.md content for matches
3. Apply precedence logic with a defined default
4. Record rationale for the classification
5. Display result with signal list in the Step 4 output line

The existing Step 4 display is:
```
Step 4/7: Product type detected.
  -> Type: {product_type}
  -> Platform: {platform}
  -> Signals found: {comma-separated list of key signals}
```

Business intent detection extends this step — it runs AFTER product_type is resolved, as a second scan of the same PROJECT.md content.

#### Signal Taxonomy — Verified Against Real Project Descriptions

The 5-category signal taxonomy is designed to prevent false positives on pure-software projects. Key distinctions:

**False positive risk signals (should NOT trigger businessMode alone):**
- "pricing" — a software product can have pricing without being a business design project
- "subscription" — SaaS infrastructure term, not business strategy term
- "customers" — any product has customers
- "launch" — software teams launch products
- "market" — any project can mention "market"

**True positive signals (strong enough alone or in combination):**
- "business model" — explicit business strategy vocabulary
- "go-to-market strategy" — explicit GTM framing
- "revenue model" — explicit monetization design
- "CAC", "LTV", "ARR", "MRR" as acronyms (not spelled out) — strong startup/business signal

**Threshold rationale (3+ signals across 2+ categories):**

The 2-category requirement prevents a single domain's repetitive vocabulary from triggering detection. A founder describing their SaaS might say "subscription pricing, subscription tiers, subscription billing" — three model-category signals but all from one category. The cross-category requirement forces genuine business intent: if "revenue model" AND "go-to-market" AND "investors" appear, that is genuinely a business design project.

The "strong single signal" override (`"business model"`, `"revenue model"`, `"go-to-market strategy"`) handles cases where the project description uses the phrase explicitly as a design artifact name rather than a passing mention.

#### Threshold Calibration — False Positive / False Negative Analysis

| Test case | Expected | Signal count | Correct? |
|-----------|----------|-------------|---------|
| Pure software: "We're building a React SaaS app with subscription billing and Stripe" | false | Model: 2 (SaaS, subscription) — single category | Correct — below threshold |
| Business project: "We're building a B2B SaaS startup with go-to-market strategy and ARR targets" | true | Model: 2 (B2B, SaaS), Market: 1 (go-to-market), Metrics: 1 (ARR) — 4 signals, 3 categories | Correct |
| Ambiguous: "Bootstrap startup focusing on pricing and subscription revenue" | AMBIGUOUS | Model: 2 (subscription, pricing), Launch: 1 (bootstrap) — 3 signals, 2 categories | Triggers businessMode — acceptable given user confirmation prompt |
| Experience product: "We're running a festival with ticket revenue, sponsorship revenue, and profit sharing" | false (should skip) | Metrics: 2 (revenue x2, profit) — single category | Correct — below 2-category threshold |

The user confirmation prompt (track selection) is the final safety net for all false positives.

#### Sequential Thinking Integration Point

When `SEQUENTIAL_THINKING_AVAILABLE = true` AND signal count is 2 in a single category (ambiguous zone), the workflow should use Sequential Thinking with this prompt structure:

```
Analyze this PROJECT.md content and determine whether the primary intent is business design
(requires business model, market strategy, or financial planning artifacts) or product/software
design (requires UX, flows, or technical specification artifacts).

Business signals found: {list}
Content summary: {first 300 chars of PROJECT.md}

Return: BUSINESS_INTENT or PRODUCT_INTENT with one-sentence rationale.
```

This prevents the ambiguous zone from becoming a hard false positive.

---

### Domain 2: designCoverage 20-Field Write (BRIEF-06)

#### Critical Finding: manifest-set-top-level Stores Raw String, Not Parsed JSON

**Source:** Direct inspection of `bin/lib/design.cjs` lines 256-267 and `bin/pde-tools.cjs` line 529.

`cmdManifestSetTopLevel(cwd, field, value, raw)` performs:
```javascript
manifest[field] = value;  // value is args[3] — the raw CLI argument string
writeManifest(cwd, manifest);
```

`value` arrives as the raw CLI argument string. When the workflow executes:
```bash
node pde-tools.cjs design manifest-set-top-level designCoverage '{"hasDesignSystem":false,...}'
```

The shell passes `{"hasDesignSystem":false,...}` as `args[3]` (a string). The function stores this string at `manifest.designCoverage`. `writeManifest` then calls `JSON.stringify(manifest)`, which serializes the object. Since `manifest.designCoverage` is now a JavaScript string (not an object), `JSON.stringify` produces:

```json
"designCoverage": "{\"hasDesignSystem\":false,...}"
```

This is a JSON string value, not a JSON object — it would BREAK `coverage-check` which expects `manifest.designCoverage` to be an object.

**However:** This is the existing mechanism used in opportunity.md and all prior workflows. No workflow has actually executed the coverage write against the live manifest since Phase 84 updated the template (the live manifest at `.planning/design/design-manifest.json` was written on 2026-03-15 and still shows the pre-Phase-84 16-field object format).

**Resolution:** The workflow instructions must account for this behavior. Two valid approaches:

**Approach A — Accepted behavior (string storage):** The designCoverage is stored as a JSON string. The `coverage-check` command then returns a string, not an object. The workflow parsing step (`Parse the JSON result`) correctly JSON.parses the string to extract flag values. When writing back, the workflow passes a newly constructed string. The designCoverage field in the manifest file is always a string. This is technically consistent — as long as all writers and readers of designCoverage treat it as a string consistently.

**Approach B — Correct object storage (requires design.cjs change):** Add JSON.parse coercion to `cmdManifestSetTopLevel` when the value is a valid JSON string. This would make the field an object in the manifest file, which is cleaner.

**Recommendation for Phase 85:** Use Approach A. Do NOT make code changes to design.cjs in Phase 85 (this is a workflow-only phase). Document the string-storage behavior explicitly in the workflow instructions. The workflow must JSON.parse the coverage-check output (which returns the raw field value) before processing it.

**The correct workflow instruction text:**

```markdown
Read the current designCoverage:

```bash
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
```

Parse the result: if COV is a JSON string (starts with `{`), parse it as JSON to extract flag values.
Default all 20 fields to `false` for any field not present in the parsed result.

Then construct the complete 20-field JSON string with actual boolean values substituted,
and write it back:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":ACTUAL_VALUE,...,"hasBusinessThesis":true,...}'
```

Where each ACTUAL_VALUE is replaced with the literal `true` or `false` string read from the parsed coverage.
```

**Critical:** The planner must write the instruction such that Claude substitutes real boolean values (`true`/`false`) — NOT template placeholders like `{curr}`. The workflow prompt must make this concrete.

#### Exact 20-Field Write Order (Verified from templates/design-manifest.json)

The canonical order (lines 112-131 of templates/design-manifest.json):

```
1.  hasDesignSystem
2.  hasWireframes
3.  hasFlows
4.  hasHardwareSpec
5.  hasCritique
6.  hasIterate
7.  hasHandoff
8.  hasIdeation
9.  hasCompetitive
10. hasOpportunity
11. hasMockup
12. hasHigAudit
13. hasRecommendations
14. hasStitchWireframes
15. hasPrintCollateral
16. hasProductionBible
17. hasBusinessThesis   (NEW — Phase 84)
18. hasMarketLandscape  (NEW — Phase 84)
19. hasServiceBlueprint (NEW — Phase 84)
20. hasLaunchKit        (NEW — Phase 84)
```

#### All Workflows That Currently Write designCoverage (Verified)

Searched all workflow files for `manifest-set-top-level designCoverage`:

| Workflow | Fields Written | Status |
|----------|---------------|--------|
| `workflows/opportunity.md` | 16 fields (hasOpportunity: true) | Needs update in Phase 93 (INTG-01) |
| Other workflows | 16 fields each | Needs update in Phase 93 |
| `workflows/brief.md` (Phase 85) | 20 fields (hasBusinessThesis: true) | FIRST to use 20 fields |

Phase 85 sets the precedent. Phase 93 (INTG-01) will update all other workflows to 20 fields.

#### Verification Pattern for Test

The BRIEF-06 test must verify the manifest's designCoverage is an object with exactly 20 fields and `hasBusinessThesis === true`. Given the string-storage behavior, the test must handle both cases:

```javascript
// After workflow runs, read manifest
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
let coverage = manifest.designCoverage;

// Handle both string and object storage
if (typeof coverage === 'string') {
  coverage = JSON.parse(coverage);
}

const keys = Object.keys(coverage).filter(k => k !== '_comment');
assert.strictEqual(keys.length, 20);
assert.strictEqual(coverage.hasBusinessThesis, true);
```

---

### Domain 3: BTH Artifact Generation (BRIEF-03)

#### Current State: strategy/ Domain Artifact Pattern

The `strategy/` domain already contains BRF, IDT, CMP, and OPP artifacts. All follow this pattern:

1. File naming: `{CODE}-{slug}-v{N}.md`
2. YAML frontmatter with Generated, Skill, Version, Status, Enhanced By
3. Markdown content sections
4. Registration via 7 `manifest-update` commands
5. DESIGN-STATE entry in both domain DESIGN-STATE.md and root DESIGN-STATE.md

The `strategy/` DESIGN-STATE.md exists when BRF has been run. Brief.md creates it in Step 6. BTH artifact updates to this DESIGN-STATE follow the same Edit-tool append pattern as BRF.

#### BTH Content Generation — Anchoring to BRF

The BTH is a DERIVED artifact — its content comes from the BRF, not from new synthesis. The workflow instructions must be explicit:

```
Business Thesis (BTH) content sources:

## Problem section:
  Source: BRF "## Problem Statement" — condense to 1-2 paragraphs focused on
  the specific pain, who has it, and why now is the right time to solve it.
  Do NOT introduce new problems not in the BRF.

## Solution section:
  Source: BRF "## Product Type" (rationale) + "## Scope Boundaries" (in-scope list) —
  synthesize into 1-2 paragraphs explaining the product's unique approach.

## Market section:
  Source: BRF "## Target Users" (who they are) + "## Competitive Context" (landscape) —
  describe the market in terms of who the customers are and their context.
  ALWAYS use [YOUR_TAM_SIZE] [VERIFY FINANCIAL ASSUMPTIONS] for any size reference.

## Unfair Advantage section:
  Source: BRF "## Key Assumptions" + "## Competitive Context" (differentiation column) —
  synthesize what cannot be easily copied. Be specific; avoid generic phrases like
  "first-mover advantage" unless the BRF specifically supports that claim.
```

#### BTH File Naming Convention

The BTH version N must match the BRF version N from the same run. If this is BRF v2, write `BTH-thesis-v2.md`. The frontmatter `Version: v{N}` field confirms the link.

#### BTH DESIGN-STATE Rows (Exact Format)

Cross-Domain Dependency Map (append to strategy/DESIGN-STATE.md):
```
| BTH | Business Thesis | /pde:brief | draft | v{N} | none | BRF | {YYYY-MM-DD} |
```

Root DESIGN-STATE.md Cross-Domain Dependency Map:
```
| BTH | strategy | BRF | current |
```

Root DESIGN-STATE.md Decision Log:
```
| BTH | business thesis generated from BRF v{N} | {date} |
```

Root DESIGN-STATE.md Iteration History:
```
| BTH-thesis-v{N} | v{N} | Created by /pde:brief | {date} |
```

---

### Domain 4: Lean Canvas (LCV) Artifact (BRIEF-04)

#### Standard Lean Canvas — Ash Maurya's 9-Box Schema (Verified)

Source: `references/launch-frameworks.md` (Phase 84) which cites "Ash Maurya, Running Lean."

The 9-box table in launch-frameworks.md is the authoritative source. The boxes in order:

| # | Box Name | Key Question |
|---|----------|-------------|
| 1 | Problem | What are the top 3 problems the customer faces? |
| 2 | Solution | What are the top 3 features that address the problem? |
| 3 | Unique Value Proposition | What is the single clear compelling message — why are you different? |
| 4 | Unfair Advantage | What cannot be easily copied or bought? |
| 5 | Customer Segments | Who are your target customers and users? |
| 6 | Key Metrics | What are the key activities you measure? |
| 7 | Channels | What is the path to customers? |
| 8 | Cost Structure | What are the customer acquisition costs, distribution costs, hosting, people? |
| 9 | Revenue Streams | What is the revenue model, lifetime value, revenue, gross margin? |

#### Confidence Status Rules (Verified from launch-frameworks.md)

The file explicitly states:
- `validated` — only when user provides explicit evidence
- Default all boxes to `unknown` if no evidence is present
- Financial values (boxes 8, 9) — never `validated` without explicit user evidence

For Phase 85, the correct status for each box based on BRF-only input:
- Box 1 (Problem): `assumed` — derived from BRF which the user authored
- Box 2 (Solution): `assumed` — derived from BRF scope
- Box 3 (UVP): `unknown` — synthesized, not user-stated
- Box 4 (Unfair Advantage): `unknown` — synthesized from BTH
- Box 5 (Customer Segments): `assumed` — derived from BRF Target Users
- Box 6 (Key Metrics): `unknown` — synthesized from BRF Success Criteria
- Box 7 (Channels): `unknown` — synthesized from competitive context
- Box 8 (Cost Structure): `unknown` — always financial placeholder
- Box 9 (Revenue Streams): `unknown` — always financial placeholder

#### LCV File Format — Full Structure

```markdown
---
Generated: "{ISO 8601}"
Skill: /pde:brief (LCV)
Version: v{N}
businessTrack: {track}
dependsOn: BTH
---

# Lean Canvas

*Source: Ash Maurya, Running Lean*
*Status key: validated | assumed | unknown*

| # | Box | Content | Status | Evidence |
|---|-----|---------|--------|----------|
| 1 | Problem | {derived from BRF Problem Statement — 2-3 specific problems} | assumed | BRF-brief-v{N}.md |
| 2 | Solution | {derived from BRF scope — 2-3 solution features} | assumed | BRF-brief-v{N}.md |
| 3 | Unique Value Proposition | {synthesized from BTH Solution + Unfair Advantage — one compelling sentence} | unknown | none yet |
| 4 | Unfair Advantage | {from BTH Unfair Advantage section} | unknown | none yet |
| 5 | Customer Segments | {from BRF Target Users — primary and secondary personas} | assumed | BRF-brief-v{N}.md |
| 6 | Key Metrics | {from BRF Success Criteria — 2-3 measurable indicators} | unknown | none yet |
| 7 | Channels | {synthesized from BRF Competitive Context and product type signals} | unknown | none yet |
| 8 | Cost Structure | [YOUR_CAC_CEILING] [VERIFY FINANCIAL ASSUMPTIONS], [YOUR_HOSTING_COST] [VERIFY FINANCIAL ASSUMPTIONS] | unknown | none yet |
| 9 | Revenue Streams | [YOUR_ARR_TARGET] [VERIFY FINANCIAL ASSUMPTIONS], [YOUR_LTV_ESTIMATE] [VERIFY FINANCIAL ASSUMPTIONS] | unknown | none yet |

---

*Generated by PDE-OS /pde:brief | {ISO 8601 date}*
```

#### BTH -> LCV Dependency Chain

The `dependsOn: BTH` frontmatter field is informational — it is NOT processed by pde-tools.cjs (the manifest-update command writes to `artifacts.LCV.dependsOn`, not the file frontmatter). Both must be set:

1. In LCV frontmatter: `dependsOn: BTH` (human-readable)
2. In manifest via command: `manifest-update LCV dependsOn '["BTH"]'` (machine-readable)

#### Track-Specific Depth in LCV

business-track.md does not specify LCV-specific depth variations. The lean canvas is always 9 boxes. Track vocabulary DOES affect the language:

| Box | solo_founder | startup_team | product_leader |
|-----|-------------|--------------|----------------|
| 5 (Segments) | "customers" | "ICP" | "key accounts" |
| 6 (Metrics) | "what you measure" | "key metrics / KPIs" | "OKRs / P&L impact" |
| 9 (Revenue) | "what you charge" | "ARR target / pricing tiers" | "monetization strategy / packaging" |

Apply vocabulary substitution from business-track.md to the non-financial cells of the LCV.

---

### Domain 5: Financial Placeholder Enforcement (BRIEF-07)

#### business-financial-disclaimer.md — Complete Placeholder Inventory

Source: Direct read of `references/business-financial-disclaimer.md`.

The file defines these explicit placeholder names:
- `[YOUR_PRICE_IN_CENTS]` — pricing values
- `[YOUR_ARR_TARGET]` — revenue targets
- `[YOUR_CAC_CEILING]` — customer acquisition cost
- `[YOUR_LTV_ESTIMATE]` — lifetime value
- `[YOUR_CHURN_RATE]` — churn percentage
- `[YOUR_PAYBACK_PERIOD]` — months to recoup CAC
- `[YOUR_TAM_SIZE]` — total addressable market
- `[YOUR_SAM_SIZE]` — serviceable addressable market
- `[YOUR_SOM_SIZE]` — serviceable obtainable market
- `[YOUR_MONTHLY_REVENUE]` — monthly revenue target
- `[YOUR_GROSS_MARGIN]` — gross margin percentage

For Phase 85 (BTH and LCV only), the relevant ones are: `[YOUR_TAM_SIZE]`, `[YOUR_CAC_CEILING]`, `[YOUR_ARR_TARGET]`, `[YOUR_LTV_ESTIMATE]`, `[YOUR_HOSTING_COST]`.

Note: `[YOUR_HOSTING_COST]` appears in the LCV template (launch-frameworks.md box 8) but is NOT in the explicit list in business-financial-disclaimer.md. The `[YOUR_X]` format makes it consistent. The workflow must use this exact string.

#### Where Dollar Amounts Can Leak — Edge Cases

The financial disclaimer prohibits `$[digit]` patterns. Dollar amounts can appear in unexpected places:

| Location | Risk | Mitigation |
|----------|------|-----------|
| BTH Market section | LLM may write "the $50B market" as shorthand | Instruction must say "no dollar amounts in market section — use [YOUR_TAM_SIZE]" |
| LCV box 3 (UVP) | LLM may write "saves customers $200/month" | Instruction must say "no dollar amounts in UVP — use qualitative language only" |
| LCV box 6 (Key Metrics) | LLM may write "target $10K MRR" as a metric | Instruction must say "for revenue metrics use [YOUR_ARR_TARGET] or [YOUR_MONTHLY_REVENUE]" |
| LCV boxes 8-9 | Explicit financial fields — highest risk | Already required to use [YOUR_X] format |
| BRF Domain Strategy section (BRIEF-05) | Brand positioning seeds could include pricing references | "Brand positioning seeds must be qualitative, no dollar amounts" |

#### Post-Write Verification Pattern (BRIEF-07)

After writing BTH and LCV files, the workflow must verify no dollar amounts leaked:

```bash
# Verify BTH — halt if any dollar amount found
if grep -qE '\$[0-9]' ".planning/design/strategy/BTH-thesis-v${N}.md" 2>/dev/null; then
  echo "ERROR: Dollar amount detected in BTH artifact. Financial content must use [YOUR_X] placeholders."
  echo "Offending lines:"
  grep -nE '\$[0-9]' ".planning/design/strategy/BTH-thesis-v${N}.md"
  # Halt and do not proceed to LCV generation
fi

# Verify LCV — halt if any dollar amount found
if grep -qE '\$[0-9]' ".planning/design/strategy/LCV-lean-canvas-v${N}.md" 2>/dev/null; then
  echo "ERROR: Dollar amount detected in LCV artifact. Financial content must use [YOUR_X] placeholders."
  echo "Offending lines:"
  grep -nE '\$[0-9]' ".planning/design/strategy/LCV-lean-canvas-v${N}.md"
fi
```

The `$` in the grep pattern matches literal dollar signs, not the regex end-anchor, because it is followed by `[0-9]`. This correctly catches `$10`, `$100K`, `$50B`, `$1M` and their variants.

#### Prohibited Patterns (From Source File)

The business-financial-disclaimer.md `## Prohibited Patterns` section explicitly lists:

- Generating specific dollar amounts (specific price per month, specific yearly price, specific CAC dollar figure)
- Generating specific percentage values as facts (e.g., "15% churn rate", "80% gross margin")
- Stating market size as a researched fact without `[Source required]` annotation
- Using "recommended pricing" or "optimal price point" language
- Generating financial projections (revenue forecasts, growth curves) with specific numbers
- Presenting unit economics calculations with filled-in values

The workflow instructions for BRIEF-07 must mirror these prohibitions verbatim. Including the source file content as `@references/business-financial-disclaimer.md` in the required_reading block is necessary but not sufficient — the workflow must also contain explicit inline reminders at each financial output point.

---

### Domain 6: Track Selection UX (BRIEF-02)

#### business-track.md — Complete Signal and Vocabulary Tables (Verified)

Source: Direct read of `references/business-track.md`.

**Detection signal lists (exact from source):**

| Track | Signals |
|-------|---------|
| solo_founder (default) | "solo", "indie", "solo founder", "one person", "bootstrapped", "side project", "just me" |
| startup_team | "startup", "seed", "early stage", "founding team", "co-founder", "pre-seed", "Series A" |
| product_leader | "product leader", "PM", "head of product", "enterprise", "director", "VP", "product manager" |

**Detection order:** product_leader first (most specific signals), then startup_team, then solo_founder. Default: solo_founder.

**Vocabulary substitution (exact from source):**

| Concept | solo_founder | startup_team | product_leader |
|---------|-------------|--------------|----------------|
| Revenue target | "revenue goal" | "ARR target" | "P&L impact" |
| Customers | "customers" | "ICP" | "key accounts" / "target segments" |
| Launch | "going live" | "launch" / "ship" | "go-to-market" |
| Competitors | "competing tools" | "competitive landscape" | "market alternatives" / "build-vs-buy" |
| Pricing | "what you charge" | "pricing tiers" / "pricing model" | "monetization strategy" / "packaging" |
| Team | "you" | "your team" / "co-founders" | "your organization" / "stakeholders" |

**Depth thresholds (exact from source):**

| Dimension | solo_founder | startup_team | product_leader |
|-----------|-------------|--------------|----------------|
| Brief section length | < 60 lines per section | 60-120 lines per section | 120+ lines per section |
| Competitive depth | 3 competitors, 1-2 paragraphs each | 5-8 competitors, scoring matrix | 8+ competitors, full positioning matrix |

For Phase 85, depth thresholds affect BTH section lengths and LCV content depth. Brief section length means the BTH sections (Problem, Solution, Market, Unfair Advantage) should be calibrated:
- solo_founder: 2-3 sentences per section
- startup_team: 1-2 paragraphs per section
- product_leader: 2-3 paragraphs per section with executive summary framing

#### AskUserQuestion Interaction Pattern

The PDE skill system uses direct user prompts (the LLM asks the user a question and waits for reply). The existing model in brief.md is at Step 2/7:

```
If brief exists AND --force flag NOT present: prompt the user:
  "A brief already exists (BRF-brief-v1.md). Generate a new version?
  This will create BRF-brief-v2.md without modifying the existing v1.
  (yes / no)"
```

The track selection prompt follows the identical pattern: present the detected value, offer numbered alternatives, await reply. The LLM pauses execution until the user responds.

**Key difference from Step 2 prompt:** The track selection prompt is presented AFTER Step 4 detection, not before. The display line must be:

```
Step 4/7: Product type detected.
  -> Type: {product_type}
  -> Platform: {platform}
  -> Signals found: {list}
  -> Business mode: true
  -> Business track detected: {detected_track}

Business intent detected. Select your track:

  1. solo_founder — individual builder or bootstrapped maker
  2. startup_team — early-stage startup with co-founders or investors
  3. product_leader — PM or product director within an organization

Detected from your description: {detected_track}
Press Enter to confirm or type 1/2/3 to change.
```

The display output and the prompt are presented together — the user sees the detection result and can immediately override it.

#### Flag Handling for Track Prompt

| Flag | Track prompt behavior |
|------|--------------------|
| `--force` | Skip prompt, use auto-detected track. Log: `  -> --force: using detected track {track} without confirmation.` |
| `--dry-run` | Skip prompt, log detected track. Display: `  -> Business track: {detected_track} (dry-run — no prompt)`. Then halt (no file writes). |
| `--quick` | Skip prompt, use auto-detected track. Same behavior as --force for this specific prompt. |
| `--no-mcp` | Track prompt still shown — no MCP involved in this prompt. |
| None | Show prompt, await user confirmation. |

This mirrors how brief.md handles the existing version confirmation prompt (--force skips it, dry-run displays without acting).

---

### Domain 7: Existing brief.md Architecture (Full Map)

#### Complete Step-by-Step Breakdown (Verified from Full File Read)

The 624-line `workflows/brief.md` has this exact structure:

**`<purpose>` block (lines 1-3):** Describes BRF output in `.planning/design/strategy/`.

**`<required_reading>` block (lines 5-8):** Currently loads:
- `@references/skill-style-guide.md`
- `@references/mcp-integration.md`

Phase 85 adds 3 more references here.

**`<flags>` block (lines 10-21):** Defines 6 flags:
- `--dry-run`: Runs Steps 1-4 only, no file writes
- `--quick`: Skip MCP probes
- `--verbose`: Detailed progress
- `--no-mcp`: Skip all MCP probes
- `--no-sequential-thinking`: Skip Sequential Thinking MCP only
- `--force`: Skip existing-brief confirmation prompt

**`<process>` block (lines 23-616):** Main execution logic.

**`<output>` block (lines 618-623):** Lists 4 output files.

#### Step-by-Step Flow (Lines Verified)

**Step 1/7 (lines 31-46):** Run `pde-tools.cjs design ensure-dirs`. Parse JSON result. Hard error on failure. Display: `Step 1/7: Design directories initialized.`

**Step 2/7 (lines 50-131):**
- Read PROJECT.md (hard required)
- Read REQUIREMENTS.md (soft — enriches brief)
- Check for existing BRF via Glob tool
- Version determination (N=1, or max+1, or prompt user)
- Sub-step 2c: Upstream context injection — probes for IDT, CMP, OPP, ANL artifacts and NOTES_CONTEXT. All soft. Stores contexts for Step 5 use.

**Step 3/7 (lines 133-165):** Flag checks (--no-mcp, --no-sequential-thinking, --quick skip the probe). Probe Sequential Thinking MCP with test prompt. 30s timeout, retry once. Sets `SEQUENTIAL_THINKING_AVAILABLE` flag.

**Step 4/7 (lines 169-224):**
- Scan PROJECT.md for software/hardware/experience signals
- Classify product_type (experience > hybrid > hardware > software default)
- If ambiguous and MCP available: use Sequential Thinking
- Detect platform (web/mobile/desktop/embedded/multi-platform)
- Record rationale
- Display: `Step 4/7: Product type detected. -> Type/Platform/Signals`

**INSERTION POINT 1:** After the Step 4 display, before Step 5.

**Step 5/7 (lines 226-470):**
- --dry-run check: display planned output, HALT
- Synthesize brief content from PROJECT.md + upstream contexts
- Populate 8 required sections (Problem Statement, Product Type, Target Users, JTBDs, Constraints, Success Criteria, Competitive Context, Key Assumptions, Scope Boundaries)
- Experience-type additional sections (Promise Statement, Vibe Contract, Audience Archetype, Venue Constraints, Repeatability Intent) — lines 413-455
- Write BRF-brief-v{N}.md via Write tool
- Display: `Step 5/7: Brief written. -> Created: ...`

**INSERTION POINT 2:** After BRF is written, conditionally run Step 5b (BTH) and Step 5c (LCV).

**Step 6/7 (lines 474-495):**
- Check for strategy/DESIGN-STATE.md existence
- Create it from template if absent
- Add BRF row to Artifact Index table
- Display: `Step 6/7: Strategy DESIGN-STATE.md updated.`

**INSERTION POINT 3 (partial):** Step 5b/5c also update the strategy/DESIGN-STATE.md with BTH/LCV rows. These updates happen BEFORE Step 6 processes. The ordering matters: when Step 6 runs `Glob + Edit`, it must update the Artifact Index to include BTH and LCV rows too, OR Steps 5b/5c must add their own rows separately.

**Recommended approach:** Steps 5b and 5c each append their rows to strategy/DESIGN-STATE.md using the Edit tool independently. Step 6 only processes the BRF row. This keeps each step self-contained and avoids Step 6 needing to know about business mode.

**Step 7/7 (lines 499-582):**
- Acquire write lock via `pde-tools.cjs design lock-acquire pde-brief`
- Update root DESIGN-STATE.md (4 updates: Cross-Domain Map, Quick Reference, Decision Log, Iteration History)
- ALWAYS release write lock
- 7-command manifest-update for BRF artifact
- 2 manifest-set-top-level for projectName and productType
- Write experienceSubType (or null)
- Display: `Step 7/7: Root DESIGN-STATE and manifest updated.`

**INSERTION POINT 3 (remainder):** After BRF manifest writes, before Summary display:
- Write businessMode (true or false)
- Write businessTrack (confirmed track or null)
- Write 20-field designCoverage (only if businessMode = true; coverage check always runs)

**`## Summary` block (lines 586-602):** Display final summary table. Must be extended to conditionally include BTH/LCV in "Files created" when businessMode = true.

**`## Anti-Patterns` block (lines 606-614):** 7 guard rules. Phase 85 does not modify these.

**`<output>` block (lines 618-623):** Lists 4 output files. Phase 85 adds BTH and LCV to this list conditionally.

#### Three Exact Insertion Points

```
INSERTION POINT 1: After Step 4 display line (line ~224), before Step 5 header
  Content: Business detection logic + track detection + interactive track prompt
  Condition: Always run detection; prompt only when businessMode = true AND NOT --force/--dry-run/--quick

INSERTION POINT 2: After BRF Write tool call (line ~274), before Step 5 display line
  Content: IF businessMode = true: Step 5b (BTH generation + registration + DESIGN-STATE update) + Step 5c (LCV generation + registration + DESIGN-STATE update)
  Condition: Gated on businessMode = true

INSERTION POINT 3: After existing manifest-set-top-level commands in Step 7 (line ~579), before Summary block
  Content: businessMode write + businessTrack write + 20-field designCoverage write
  Condition: businessMode write always; businessTrack write always (null when false); designCoverage write always with 20 fields
```

#### Mutual Exclusion of experience-type Sections and businessMode

The experience-type additional sections (lines 413-455) are conditioned on `product_type == "experience"`. Since businessMode is orthogonal, a `business:experience` project would generate BOTH the experience sections AND the Domain Strategy section. The insertion order in the BRF file:

```
...
## Scope Boundaries

[experience-only sections IF product_type == "experience"]
  ## Promise Statement
  ## Vibe Contract
  ## Audience Archetype
  ## Venue Constraints
  ## Repeatability Intent

[business-only section IF businessMode == true]
  ## Domain Strategy

---
*Generated by PDE-OS /pde:brief | {date}*
```

This ordering places the experience sections first (they are type-specific design constraints) and the business section last (it is business-strategy context). Both can coexist in the same BRF file.

#### Summary Table Extension (businessMode = true)

The existing Summary table "Files created" row:
```
| Files created | .planning/design/strategy/BRF-brief-v{N}.md (Markdown, {size}), .planning/design/strategy/DESIGN-STATE.md (Markdown, {size}) |
```

When businessMode = true, extend to:
```
| Files created | .planning/design/strategy/BRF-brief-v{N}.md (Markdown, {size}), .planning/design/strategy/BTH-thesis-v{N}.md (Markdown, {size}), .planning/design/strategy/LCV-lean-canvas-v{N}.md (Markdown, {size}), .planning/design/strategy/DESIGN-STATE.md (Markdown, {size}) |
```

Also add a new summary row:
```
| Business mode | {businessMode} — track: {businessTrack or N/A} |
```

---

### Cross-Domain Integration Notes

#### Signal Overlap Between Product Type and Business Detection

The existing software signals include "SaaS" and "web app". The business model signals also include "SaaS". This creates potential double-counting:

- "SaaS" contributes to software product_type detection (correct)
- "SaaS" also counts as a business model signal (also correct, but does not alone trigger businessMode)

This is intentional — a product can be correctly classified as `software` type AND have `businessMode = true`. The signals serve different purposes.

#### businessTrack Does Not Affect BRF Sections

The track vocabulary substitution (business-track.md) affects BTH and LCV content depth and vocabulary. It does NOT change the BRF artifact content — the BRF always uses the standard section format regardless of track. The track is applied when generating BTH and LCV, not when generating the BRF.

#### Lock Acquisition Scope

The write lock (`pde-tools.cjs design lock-acquire pde-brief`) covers root DESIGN-STATE.md writes in Step 7. Steps 5b and 5c write to strategy/DESIGN-STATE.md (domain-level, not root-level) — no lock is needed for those writes. The root lock is only needed for root DESIGN-STATE.md.

The manifest writes (`manifest-update`, `manifest-set-top-level`) are also done under the lock in Step 7. This is correct — all manifest writes should happen while the lock is held.

#### The AskUserQuestion Timing Problem

The track selection prompt happens at the end of Step 4, before any file writes. This is the correct timing — the track value is needed for BTH and LCV content in Step 5b/5c. The prompt must happen before Step 5 begins.

If the user provides `--force` and the auto-detected track is wrong, they have no recourse in that single run. The next run of `/pde:brief` (creating BRF v2) will prompt again if `--force` is not used. This is acceptable behavior — document it in the Anti-Patterns section.

---
