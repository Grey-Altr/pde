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
Step 4/7: Detect product type   ← BUSINESS INTENT DETECTION INSERTED HERE
Step 5/7: Synthesize brief content (write BRF artifact)  ← DOMAIN STRATEGY SECTION ADDED
  [NEW] Step 5b: Generate BTH artifact (if businessMode)
  [NEW] Step 5c: Generate LCV artifact (if businessMode)
Step 6/7: Update strategy domain DESIGN-STATE
Step 7/7: Update root DESIGN-STATE and manifest  ← businessMode/businessTrack writes added
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

**LCV anchoring to BTH:** LCV must reference the BTH artifact path in its frontmatter (`dependsOn: BTH`) so the Cross-Domain Dependency Map reflects the correct chain: BRF → BTH → LCV.

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
                 "freemium", "B2B", "B2C" → if any found: BUSINESS_SIGNAL_COUNT++, BUSINESS_CATEGORY_COUNT++
  Market signals: "go-to-market", "GTM", "acquisition", "churn", "LTV", "CAC", "market fit",
                  "target market" → if any found: BUSINESS_SIGNAL_COUNT++, BUSINESS_CATEGORY_COUNT++
  Launch signals: "startup", "found", "venture", "bootstrap", "seed", "funding", "investor",
                  "pitch deck" → if any found: BUSINESS_SIGNAL_COUNT++, BUSINESS_CATEGORY_COUNT++
  Metrics signals: "ARR", "MRR", "burn rate", "runway", "unit economics", "profit",
                   "margin" → if any found: BUSINESS_SIGNAL_COUNT++, BUSINESS_CATEGORY_COUNT++
  Positioning signals: "competitive advantage", "differentiation", "unfair advantage",
                       "market position" → if any found: BUSINESS_SIGNAL_COUNT++, BUSINESS_CATEGORY_COUNT++

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

### Phase Requirements → Test Map

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
