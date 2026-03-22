# Phase 90: Critique + HIG Extensions — Research

**Researched:** 2026-03-22
**Domain:** Workflow extension — adding business-mode perspectives to existing critique and HIG skills
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| QUAL-01 | `critique.md` adds 4 business critique perspectives: unit economics viability, GTM-ICP fit, pricing psychology, investor readiness | Architecture: new `BUSINESS MODE GATE` block in Step 4, after the experience gate, mirroring the `$BM` detection pattern from wireframe.md |
| QUAL-02 | Pitch coherence cross-check: lean canvas UVP matches pitch deck solution slide, canvas key metrics match traction slide | Cross-artifact read: load LCV artifact (lean canvas) and DPD artifact (pitch deck outline) and compare box 3 UVP against slide 2 solution text, box 6 metrics against slide 6 traction text |
| QUAL-03 | `hig.md` adds business communications HIG section: pitch deck readability, email cadence, content calendar structure | New Step 4 sub-section gated on `$BM == "true"`, analogous to physical HIG domain blocks in experience mode |
| QUAL-04 | Business critique findings classified as standard severity levels (critical/major/minor/info) — consistent with existing critique output | Use `critical/major/minor/nit` ONLY — the requirements doc says "info" but existing skill uses "nit"; use "nit" to preserve format consistency |

</phase_requirements>

---

## Summary

Phase 90 extends two existing workflow skills — `critique.md` and `hig.md` — to add business-mode-specific evaluation when `businessMode === true` in the design manifest. This is a pure workflow extension phase: no new files, no new artifact codes, and no new manifest fields are introduced. The extension follows patterns already established in Phase 87 (flows.md), Phase 88 (system.md), and Phase 89 (wireframe.md).

The critique extension adds four new perspectives (unit economics viability, GTM-ICP fit, pricing psychology, investor readiness) and a pitch coherence cross-check section. The HIG extension adds a business communications section covering pitch deck readability, email cadence structure, and content calendar guidelines. Both extensions are gated on the `$BM == "true"` flag read from the design manifest — they are invisible to non-business product types, preserving the byte-identical baseline requirement from INTG-02.

The key risk in this phase is the pitch coherence cross-check (QUAL-02), which requires loading two prior artifacts (LCV lean canvas, DPD pitch deck outline) and comparing specific fields across them. This is a new pattern not seen in existing perspectives — all prior critique perspectives evaluate wireframes only.

**Primary recommendation:** Insert business critique as independent conditional blocks in critique.md Step 4 (not ELSE IF chains), add pitch coherence as a standalone post-step section, and add business communications as a new conditional block in hig.md Step 4. Follow the exact `$BM == "true"` detection and `$BT` branching pattern from wireframe.md.

---

## Standard Stack

### Core

This phase involves no external libraries. All work is workflow text extension.

| Component | Source | Purpose | Why Standard |
|-----------|--------|---------|--------------|
| `manifest-get-top-level businessMode` | pde-tools.cjs | Detects business mode in manifest | Same call used by wireframe.md, system.md, flows.md |
| `manifest-get-top-level businessTrack` | pde-tools.cjs | Reads solo_founder/startup_team/product_leader | Same call used by wireframe.md |
| `Glob` tool | Built-in | Discover LCV and DPD artifacts for cross-check | Same pattern used in Step 2 for brief/flows discovery |
| `Read` tool | Built-in | Load LCV and DPD content for comparison | Standard artifact loading pattern |
| `node:test` + `node:assert` | Node.js built-in | Nyquist structural tests | Same framework as Phases 85-89 |

### Supporting References

| Reference File | Purpose | Loaded by Phase 90 workflows |
|----------------|---------|------------------------------|
| `references/business-track.md` | Track vocabulary, depth thresholds | Determines critique depth by businessTrack |
| `references/launch-frameworks.md` | Lean canvas schema, pitch deck slide map | Cross-check anchors: LCV box 3/6, DPD slide 2/6 |
| `references/business-financial-disclaimer.md` | Financial placeholder rules | Unit economics critique must not produce dollar amounts |
| `references/business-legal-disclaimer.md` | Legal checklist pattern | Investor readiness perspective references only |

---

## Architecture Patterns

### Existing Business Mode Extension Pattern

Every prior business-mode extension in v0.12 follows this exact structure in the relevant Step 4:

```
**Business mode detection (cached for use throughout):**

```bash
BM=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-get-top-level businessMode 2>/dev/null)
if [[ "$BM" == @file:* ]]; then BM=$(cat "${BM#@file:}"); fi
BT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-get-top-level businessTrack 2>/dev/null)
if [[ "$BT" == @file:* ]]; then BT=$(cat "${BT#@file:}"); fi
```

IF `$BM == "true"`:
  Load @references/business-track.md
  Load @references/business-financial-disclaimer.md
  [business-specific generation based on $BT]
```

The critique.md business mode detection should be placed in Step 4 immediately after the existing experience product type gate (after line ~408 where the `ELSE: Proceed with existing software critique path` clause ends), mirroring the independent conditional block pattern from Phase 88-brand-system decision in STATE.md.

### Recommended Project Structure for Phase 90

```
workflows/
├── critique.md      # MODIFIED: business mode gate added to Step 4, pitch coherence as post-step section
├── hig.md           # MODIFIED: business communications block added to Step 4
references/
└── (no new files)   # All references already exist from prior phases
.planning/phases/90-critique-hig-extensions/
└── tests/
    └── test-critique-hig-business.cjs   # Wave 0: Nyquist structural tests
```

### Pattern 1: Business Mode Gate in Step 4 (critique.md)

**What:** After completing the four existing software perspectives (UX, Visual Hierarchy, Accessibility, Business Alignment), insert a business-mode conditional block that adds four additional perspectives.

**When to use:** Only when `$BM == "true"` AND `productType !== "experience"`. (Experience products already skip software perspectives entirely — do not apply business perspectives to experience products.)

**Placement logic:**
```
IF productType === "experience":
  [experience path — 7 experience perspectives, then Step 5]

ELSE:
  [standard software path — 4 perspectives: UX, Hierarchy, Accessibility, Business Alignment]

  #### Step 4-BUSINESS: Business Mode Critique Extension (conditional)

  IF `$BM != "true"`: skip this block entirely. Continue to score calculation.

  IF `$BM == "true"`:
    Load @references/business-track.md
    Load @references/business-financial-disclaimer.md
    [4 business perspectives below]
```

This is an INDEPENDENT `IF` block (not `ELSE IF`), matching the Phase 88/89 pattern decision logged in STATE.md.

**Score integration:** Business perspectives add to the weighted composite score. Recommended weights:
- Unit Economics Viability: 1.0x (financial clarity, not design quality)
- GTM-ICP Fit: 1.0x (strategy alignment)
- Pricing Psychology: 1.5x (directly affects conversion — closely tied to UX)
- Investor Readiness: 1.0x (completeness check)

The composite formula must be updated to include business perspectives when in business mode. Business mode composite: `(UX*1.5 + hierarchy*1.0 + a11y*1.5 + business*1.0 + unitEconomics*1.0 + gtmIcp*1.0 + pricingPsych*1.5 + investorReady*1.0) / 9.0`. Note: the denominator is the sum of weights (9.0), not the count of perspectives.

**Scorecard table extension (Step 5b):** When business mode is active, the Summary Scorecard table gains four additional rows. The frontmatter `Groups Evaluated` field expands to include the four business perspective names.

### Pattern 2: Pitch Coherence Cross-Check (critique.md post-step section)

**What:** After all perspective evaluation (Step 4), before writing the report (Step 5), add a pitch coherence validation block that compares lean canvas and pitch deck fields.

**When to use:** Only when `$BM == "true"` AND both LCV and DPD artifacts exist.

**Cross-check logic:**
```
#### Step 4-COHERENCE: Pitch Coherence Cross-Check (conditional)

IF `$BM != "true"`: skip entirely.

IF `$BM == "true"`:
  LCV_FILE=$(ls .planning/design/strategy/LCV-lean-canvas-v*.md 2>/dev/null | sort -t v -k2 -n | tail -1)
  DPD_FILE=$(ls .planning/design/launch/DPD-pitch-deck-outline-v*.md 2>/dev/null | sort -t v -k2 -n | tail -1)

  IF LCV_FILE is absent:
    Set COHERENCE_AVAILABLE = false
    Log: "Pitch coherence cross-check skipped: LCV lean canvas not found. Run /pde:wireframe first."

  IF DPD_FILE is absent:
    Set COHERENCE_AVAILABLE = false
    Log: "Pitch coherence cross-check skipped: DPD pitch deck outline not found. Run /pde:wireframe first."

  IF both present:
    Read LCV_FILE using Read tool. Extract:
      - LCV_UVP: content of Box 3 (Unique Value Proposition)
      - LCV_METRICS: content of Box 6 (Key Metrics)
    Read DPD_FILE using Read tool. Extract:
      - DPD_SOLUTION: content of Solution slide (slide 2 in YC format, slide 3 in Sequoia format)
      - DPD_TRACTION: content of Traction slide (slide 6 in YC format, slide 8 in Sequoia format)

    Cross-check 1: LCV_UVP vs DPD_SOLUTION
      - Pass if LCV UVP language appears in, or is materially consistent with, the DPD solution slide content
      - Fail: severity = major (UVP incoherence is investor-visible pitch risk)

    Cross-check 2: LCV_METRICS vs DPD_TRACTION
      - Pass if LCV key metrics appear in, or match, the DPD traction slide content
      - Fail: severity = major (metrics mismatch undermines traction credibility)

    SET COHERENCE_FINDINGS = [list of cross-check results]
```

**Report section:** Coherence findings appear in the critique report as a dedicated `## Pitch Coherence Cross-Check` section, not mixed into the perspective findings tables. Coherence findings are included in the Action List for /pde:iterate but do NOT affect the composite score (they are structural consistency checks, not design quality scores).

### Pattern 3: Business Communications HIG Section (hig.md)

**What:** In hig.md Step 4, after the standard WCAG/HIG audit path, add a business communications evaluation block.

**When to use:** Only when `$BM == "true"` AND LIGHT_MODE is false (full audit only — not for --light delegation mode).

**Placement logic:**
```
ELSE (standard software/hardware/hybrid products):
  [existing WCAG/HIG audit — 4a through 4i]

  #### Step 4-BUSINESS: Business Communications HIG (conditional)

  IF `$LIGHT_MODE == true`: skip this block entirely (never runs in --light delegation mode).
  IF `$BM != "true"`: skip this block entirely.

  IF `$BM == "true"` AND `$LIGHT_MODE == false`:
    Load @references/business-track.md

    [Three business communications domain checks below]
```

**Three domain checks:**

Domain 1: Pitch Deck Readability
- Check DPD artifact (if present): slide count vs. track format expectation
- Check: each slide's headline/question is concise (< 12 words)
- Check: solution slide contains the UVP from LCV box 3
- Severity: major if UVP absent from solution slide; minor if headline > 12 words

Domain 2: Email Cadence Structure
- Check OTR artifact (if present — from Phase 91, may not exist yet during Phase 90)
- If OTR absent: note "OTR email sequence not yet generated; run /pde:handoff to create"
- Check: onboarding sequence email count matches track expectation (solo: 5, startup: 5-7, leader: 7)
- Check: each email has trigger/delay/CTA fields populated
- Severity: minor for count mismatch; major for missing CTA fields

Domain 3: Content Calendar Structure
- Check CNT artifact (if present — from Phase 91, may not exist yet)
- If CNT absent: note "CNT content calendar not yet generated; run /pde:handoff to create"
- Check: 30-day skeleton present with pre-launch/launch/post-launch phases
- Check: content slots derive from GTM channel priorities (GTM artifact cross-reference)
- Severity: minor for missing phases; major if no GTM cross-reference

Note: OTR and CNT are Phase 91 artifacts. During Phase 90 standalone runs, they will not exist — the HIG business communications check MUST degrade gracefully with advisory notes rather than halting.

### Anti-Patterns to Avoid

- **ELSE IF chaining business gate onto experience gate**: Experience products are completely separate — business perspectives do not apply to them. Use independent IF blocks.
- **Modifying the four existing perspective weights**: UX (1.5x), Visual Hierarchy (1.0x), Accessibility (1.5x), Business Alignment (1.0x) are locked. Only the NEW business perspectives get new weights.
- **Affecting the composite score with coherence findings**: The pitch coherence cross-check is a structural consistency check, not a quality scoring perspective. Keep it out of score calculation.
- **Running HIG business communications in --light mode**: The --light mode is used by /pde:critique as a delegation. Business communications HIG must only run in full mode.
- **Writing dollar amounts in unit economics critique**: Unit economics critique must use structural placeholders per `business-financial-disclaimer.md`. Finding descriptions may say "LTV/CAC ratio appears imbalanced" but never "LTV should be $200".
- **Using "nit" renamed as "info"**: QUAL-04 specifies "standard severity levels" — the existing severity system uses `nit` not `info`. Do not introduce a new severity value.
- **Forgetting the 20-field designCoverage write**: critique.md and hig.md already write designCoverage — any modification must preserve all 20 fields (not the old 16-field pattern).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Business mode detection | Custom manifest file reader | `pde-tools.cjs manifest-get-top-level businessMode` | Already works; used in 4+ prior workflows |
| LCV/DPD artifact discovery | Custom glob pattern | Glob tool + `sort -t v -k2 -n \| tail -1` version selection | Standard artifact discovery pattern in critique Step 2 |
| Track depth lookup | Inline if-else chains | `@references/business-track.md` depth threshold table | Single source of truth for all track vocabulary |
| Financial disclaimer text | Custom warning strings | `@references/business-financial-disclaimer.md` | Required for consistency; already pre-written |
| Pitch deck slide numbering | Hardcoded slide numbers | Read `launch-frameworks.md` YC/Sequoia slide maps | Slide numbers differ by track/format — reference is authoritative |
| Severity scale | New severity values | Existing `critical/major/minor/nit` exactly | Adding "info" would break --focused flag parsing and score calculation |

**Key insight:** Every data structure, vocabulary rule, and artifact schema needed for Phase 90 already exists in the reference library from Phases 84-89. This phase is purely additive text extension to two workflow files.

---

## Common Pitfalls

### Pitfall 1: Experience Product Type Collision

**What goes wrong:** Business perspectives accidentally apply to experience products (e.g., a business:experience composition), generating irrelevant unit economics findings against a floor plan artifact.

**Why it happens:** The experience gate skips the software path entirely (`SKIP software perspectives`). If the business gate is placed outside the ELSE clause, it runs for experience products too.

**How to avoid:** Nest the business mode gate INSIDE the ELSE clause that contains the software path. `IF productType !== "experience"` is the guard — business perspectives belong inside that guard.

**Warning signs:** Test that runs /pde:critique on an experience product and finds business perspective output in the CRT artifact.

### Pitfall 2: Pitch Coherence Check Halts When Artifacts Missing

**What goes wrong:** LCV or DPD artifact not found causes /pde:critique to halt with an error, breaking the pipeline for users who haven't run /pde:wireframe in business mode.

**Why it happens:** Using HALT on missing artifacts rather than graceful degradation.

**How to avoid:** Coherence check MUST degrade gracefully. If LCV or DPD is absent: log advisory note, set COHERENCE_AVAILABLE = false, add a note to the critique report ("Pitch coherence cross-check requires LCV and DPD artifacts. Run /pde:wireframe in business mode."). Never halt.

**Warning signs:** User runs /pde:critique before /pde:wireframe and gets an error instead of a partial critique report.

### Pitfall 3: Composite Score Formula Denominator Error

**What goes wrong:** Business mode composite score is calculated with the wrong denominator (e.g., dividing by 4 instead of the sum of weights), producing scores > 100 or incorrect weighting.

**Why it happens:** The existing formula `(UX*1.5 + hierarchy*1.0 + a11y*1.5 + business*1.0) / 5.0` uses 5.0 as the sum of weights (1.5+1.0+1.5+1.0=5.0). If business perspectives are added naively the denominator must update.

**How to avoid:** Document the updated formula explicitly in Step 5b: business mode composite = `(UX*1.5 + hierarchy*1.0 + a11y*1.5 + business*1.0 + unitEcon*1.0 + gtmIcp*1.0 + pricingPsych*1.5 + investorReady*1.0) / 9.0`. The denominator (9.0) is the sum of all weights.

**Warning signs:** Composite score above 100 or composite not matching manual calculation from finding penalties.

### Pitfall 4: HIG Business Section in --light Mode

**What goes wrong:** Business communications HIG runs in --light delegation mode (called from /pde:critique), adding unexpected output and potentially writing files when /pde:critique expects --light to produce only inline findings.

**Why it happens:** Missing guard for `LIGHT_MODE` flag at the business section start.

**How to avoid:** The VERY FIRST check in the business communications block must be `IF LIGHT_MODE == true: skip entirely`. This is non-negotiable.

**Warning signs:** /pde:critique produces extra business communications output tagged as HIG --light findings.

### Pitfall 5: 20-Field designCoverage Write Becoming 16-Field

**What goes wrong:** When modifying critique.md or hig.md, the existing designCoverage write command gets overwritten with a 16-field version (missing the 4 business fields added in Phase 84).

**Why it happens:** Copying coverage-set patterns from pre-v0.12 sources or forgetting the hasBusinessThesis/hasMarketLandscape/hasServiceBlueprint/hasLaunchKit fields.

**How to avoid:** Always read the existing designCoverage write in the file being modified. Verify it contains all 20 fields. The Nyquist test must assert `hasBusinessThesis` is present in the coverage write.

**Warning signs:** `hasBusinessThesis` absent from designCoverage write (Nyquist test assertion: contains "hasBusinessThesis").

### Pitfall 6: Business Critique Findings Mixed Into Software Perspective Tables

**What goes wrong:** Business perspectives are added as Perspective 5-8 in the same sorted findings table as Perspectives 1-4, requiring updates to table rendering logic and score calculation simultaneously.

**Why it happens:** Treating business perspectives as extensions of the 4-perspective model rather than a separate business mode block.

**How to avoid:** Render business perspective findings in a separate `## Business Mode Findings` section in the critique report. Update the frontmatter `Groups Evaluated` to list business perspectives separately. This keeps the existing rendering logic untouched for non-business runs.

---

## Code Examples

Verified patterns from existing workflows in this codebase:

### Business Mode Detection (from wireframe.md)
```bash
# Source: workflows/wireframe.md Step 4h
BM=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-get-top-level businessMode 2>/dev/null)
if [[ "$BM" == @file:* ]]; then BM=$(cat "${BM#@file:}"); fi
BT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-get-top-level businessTrack 2>/dev/null)
if [[ "$BT" == @file:* ]]; then BT=$(cat "${BT#@file:}"); fi
```

### Artifact Discovery Pattern (from critique.md Step 2b)
```
# Source: workflows/critique.md Step 2b
Use the Glob tool to check for `.planning/design/ux/FLW-flows-v*.md`.
Sort all matches descending by version number, read the highest version using the Read tool.
```

For LCV and DPD in Phase 90:
```
# LCV lean canvas (lives in launch/ not strategy/)
LCV_FILE: Glob `.planning/design/launch/LCV-lean-canvas-v*.md` → highest version

# DPD pitch deck outline
DPD_FILE: Glob `.planning/design/launch/DPD-pitch-deck-outline-v*.md` → highest version
```

### Severity Rating Format (from critique.md Step 4 finding format)
```
# Source: workflows/critique.md — Finding format section
- **Severity:** `critical` | `major` | `minor` | `nit`
- **Effort:** `quick-fix` | `moderate` | `significant`
```

Business critique findings MUST use this exact format. "info" is NOT a valid severity level in this system.

### Finding Table Format (from existing perspectives)
```markdown
| Severity | Effort | Location | Issue | Suggestion | Reference |
|----------|--------|----------|-------|------------|-----------|
| major | moderate | LCV Box 3 > UVP | UVP not reflected in pitch deck Solution slide | Update DPD slide 2 to open with the LCV UVP statement | Pitch coherence: LCV box 3 ↔ DPD slide 2 |
```

### Track Depth Branch Pattern (from wireframe.md Step 4j)
```
# Source: workflows/wireframe.md Step 4j
IF $BT == "solo_founder":
  SET DECK_FORMAT = "yc_10"
ELIF $BT == "startup_team":
  [detect funding signals in BTH/BRF content]
ELIF $BT == "product_leader":
  SET DECK_FORMAT = "internal_business_case"
```

Business critique depth should follow this same pattern per track:
- `solo_founder`: 2-3 findings per business perspective (action-first, no jargon)
- `startup_team`: 4-5 findings per business perspective (investor vocabulary, metrics framing)
- `product_leader`: 4-5 findings per business perspective (P&L vocabulary, OKR framing, board-ready format)

### 20-Field designCoverage Write Pattern (from system.md)
```bash
# Source: workflows/system.md (Phase 88 — most recent correct version)
# ALWAYS read-before-set to avoid clobber
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi

# Parse ALL 20 fields, set only the target flag to true
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":true,"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current},"hasPrintCollateral":{current},"hasProductionBible":{current},"hasBusinessThesis":{current},"hasMarketLandscape":{current},"hasServiceBlueprint":{current},"hasLaunchKit":{current}}'
```

The canonical field order has 20 fields. The final 4 (`hasBusinessThesis`, `hasMarketLandscape`, `hasServiceBlueprint`, `hasLaunchKit`) were added in Phase 84. Any coverage write in critique.md or hig.md that does not include all 20 fields is incorrect.

---

## Business Critique Perspective Specifications

Researched against business critique frameworks. These are the specific checklist items for each of the four new perspectives.

### Perspective BIZ-1: Unit Economics Viability (weight 1.0x)

**Evaluation sources:**
- LCV lean canvas: Box 8 (Cost Structure), Box 9 (Revenue Streams)
- STR Stripe pricing config: tier structure and checkout mode
- Business financial disclaimer constraints: NO dollar amounts in findings

**Checklist:**
- LTV/CAC structural relationship: Does the pricing config support positive unit economics? (e.g., single tier at free with no paid tier = no viable LTV path)
- Payback period signal: Is there a trial period in STR? Does the pricing model enable recovery within a reasonable period (flag if STR shows `trial_period_days > 90` with no accelerated conversion path)?
- Churn risk: Does the lean canvas revenue stream imply recurring vs one-time revenue? One-time revenue with no retention mechanism in flows = higher churn risk.
- Cost structure coverage: Does the lean canvas Box 8 show any cost items? If empty placeholders only, flag as minor (founder hasn't thought through cost structure yet).

**Finding locations:** Reference LCV artifact path + box number. E.g., "LCV Box 9 > Revenue Streams".

**Financial disclaimer rule:** When citing unit economics findings, ALWAYS use structural placeholders. Never say "your CAC should be under $X". Say "the LCV cost structure does not indicate a CAC ceiling — complete [YOUR_CAC_CEILING] in LCV Box 8".

### Perspective BIZ-2: GTM-ICP Fit (weight 1.0x)

**Evaluation sources:**
- LCV lean canvas: Box 5 (Customer Segments), Box 7 (Channels)
- GTM flow artifact: acquisition → conversion → retention flowchart
- BRF brief: persona definitions
- MLS market landscape: competitive positioning

**Checklist:**
- ICP specificity: Is LCV Box 5 specific enough to target? ("anyone who..." = major finding; "B2B SaaS companies 50-500 employees" = pass)
- Channel-ICP alignment: Do the GTM channels in Box 7 match where the ICP actually spends time? (e.g., SEO as primary channel for enterprise ICP is misaligned)
- Channel count: Are there more than 3 primary channels listed? (3+ channels without sequencing is a common early-stage trap — flag as minor)
- GTM sequencing: Does the GTM flow artifact show an acquisition → conversion → retention sequence? If flow artifact is absent, flag advisory.

### Perspective BIZ-3: Pricing Psychology (weight 1.5x)

**Evaluation sources:**
- STR Stripe pricing config: tier structure, names, trial periods
- LCV lean canvas: Box 3 (UVP), Box 9 (Revenue Streams)
- LDP landing page wireframe: PricingTable section

**Checklist:**
- Tier anchoring: Does the pricing config show a clear anchor tier (most expensive) that makes middle tiers appear more reasonable? (Single-tier pricing lacks anchoring — minor finding for solo_founder, major for startup_team)
- Decoy pricing: For 3-tier configs, is the middle tier clearly the "best value"? If all three tiers appear equally valuable, anchoring effect is lost.
- Free trial psychological commitment: Does the trial structure encourage commitment before the trial ends? (7-day trial: minor risk; 30-day trial: ensure onboarding flow drives activation before day 14)
- UVP in pricing table: Does the PricingTable component in LDP wireframe reference the UVP from LCV Box 3? Generic pricing copy without UVP language reduces conversion.
- Plan naming: Are plan names communicating value (e.g., "Growth") rather than just size (e.g., "Large")? Generic size-based names are a pricing psychology miss.

### Perspective BIZ-4: Investor Readiness (weight 1.0x)

**Evaluation sources:**
- DPD pitch deck outline: all slides
- LCV lean canvas: all boxes
- MLS market landscape: TAM/SAM/SOM
- BTH business thesis: unfair advantage

**Checklist:**
- Narrative arc: Does the pitch deck follow Problem → Solution → Market → Product → Business Model → Traction → GTM → Competition → Team → Ask? (Missing slides = major by count: 1 missing = major, 2+ = critical)
- Ask slide completeness: Does the DPD Ask slide include what is being asked for? If placeholder only and track is startup_team, flag as major.
- Market size credibility: Does MLS include SAM/SOM (not just TAM)? TAM-only market claims are a common investor red flag.
- Unfair advantage specificity: Is BTH unfair advantage field specific (technology moat, network effect, regulatory barrier) or generic ("passion", "team")? Generic unfair advantage = major.
- Traction presence: Does the traction slide exist and include at least one metric placeholder? If track is startup_team and traction slide has no metric placeholders, flag as major.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Business critique as separate workflow | Integrated into existing /pde:critique via conditional gate | Phase 90 (this phase) | No new slash command; /pde:critique handles business mode automatically |
| 16-field designCoverage | 20-field designCoverage | Phase 84 | All coverage writes must include 4 new fields |
| Experience product type = ELSE branch | Experience = first gate, software/business = ELSE | Phase 84-89 pattern | Business gate sits inside ELSE clause |
| Standalone HIG audit | HIG called with --light from /pde:critique | Pre-v0.12 | Business HIG must not run in --light mode |

**Deprecated/outdated patterns:**
- 16-field designCoverage write: any coverage write missing hasBusinessThesis/hasMarketLandscape/hasServiceBlueprint/hasLaunchKit is incorrect in v0.12
- Separate business critique command: not being introduced — all business critique is part of /pde:critique

---

## Validation Architecture

Nyquist validation is enabled (`nyquist_validation: true` in `.planning/config.json`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | node:test (Node.js built-in test runner) |
| Config file | `.planning/phases/90-critique-hig-extensions/tests/test-critique-hig-business.cjs` |
| Quick run command | `node --test .planning/phases/90-critique-hig-extensions/tests/test-critique-hig-business.cjs` |
| Full suite command | `node --test .planning/phases/90-critique-hig-extensions/tests/test-critique-hig-business.cjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QUAL-01 | `critique.md` contains `manifest-get-top-level businessMode` in Step 4 | structural | grep pattern assertion in test file | ❌ Wave 0 |
| QUAL-01 | `critique.md` contains 4 business perspective names (unit economics, GTM-ICP, pricing psychology, investor readiness) | structural | grep pattern assertion in test file | ❌ Wave 0 |
| QUAL-02 | `critique.md` contains `LCV-lean-canvas` artifact discovery pattern | structural | grep pattern assertion in test file | ❌ Wave 0 |
| QUAL-02 | `critique.md` contains `DPD-pitch-deck-outline` artifact discovery pattern | structural | grep pattern assertion in test file | ❌ Wave 0 |
| QUAL-03 | `hig.md` contains `manifest-get-top-level businessMode` in Step 4 | structural | grep pattern assertion in test file | ❌ Wave 0 |
| QUAL-03 | `hig.md` contains business communications domain names (pitch deck readability, email cadence, content calendar) | structural | grep pattern assertion in test file | ❌ Wave 0 |
| QUAL-04 | `critique.md` does NOT contain `\| info \|` as severity value (only critical/major/minor/nit permitted) | structural | negative grep assertion in test file | ❌ Wave 0 |
| QUAL-04 | `critique.md` business section uses `critical\|major\|minor\|nit` severity table | structural | grep pattern assertion in test file | ❌ Wave 0 |
| INTG-02 | `critique.md` designCoverage write contains `hasBusinessThesis` (20-field, not 16) | structural | grep pattern assertion in test file | ❌ Wave 0 |
| INTG-02 | `hig.md` designCoverage write contains `hasBusinessThesis` (20-field, not 16) | structural | grep pattern assertion in test file | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test .planning/phases/90-critique-hig-extensions/tests/test-critique-hig-business.cjs`
- **Per wave merge:** same (single-file test suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `.planning/phases/90-critique-hig-extensions/tests/test-critique-hig-business.cjs` — covers QUAL-01 through QUAL-04 and INTG-02 partial (designCoverage 20-field)

---

## Open Questions

1. **Business critique scoring in mixed critique runs (--focused flag)**
   - What we know: The `--focused` flag limits which perspectives run (e.g., `--focused business`)
   - What's unclear: Should `--focused business` run ONLY the existing Business Alignment perspective, or also the 4 new business perspectives when in business mode?
   - Recommendation: `--focused business` in business mode should run both the existing Business Alignment perspective AND the 4 new business perspectives. Update the `--focused` flag documentation to note this behavior. The `--focused` valid values list should remain `ux, hierarchy, accessibility, business` — the 4 new perspectives run automatically when `business` is focused in business mode.

2. **LCV artifact path** — RESOLVED
   - Path confirmed: `.planning/design/strategy/LCV-lean-canvas-v{N}.md`
   - Source: `workflows/brief.md` Step 5c (line 668): `File path: .planning/design/strategy/LCV-lean-canvas-v{N}.md`
   - LCV domain is `strategy` (not `launch`). The cross-check glob pattern is `.planning/design/strategy/LCV-lean-canvas-v*.md`.

3. **DPD artifact path: launch/ vs strategy/**
   - What we know: DPD is generated in wireframe.md Step 4j and routes to `launch/` per LAUNCH-06.
   - What's unclear: Confirmed path is `.planning/design/launch/DPD-pitch-deck-outline-v{N}.md` based on wireframe.md content seen at line 663.
   - Recommendation: Use `.planning/design/launch/DPD-pitch-deck-outline-v*.md` glob pattern. HIGH confidence.

---

## Sources

### Primary (HIGH confidence)

- `workflows/critique.md` (read in full) — existing 4-perspective architecture, experience gate pattern, score formula, finding format, Stitch gate, coverage write
- `workflows/hig.md` (read in full) — existing WCAG audit architecture, --light mode contract, experience mode, coverage write
- `workflows/wireframe.md` (read lines 155-731) — business mode detection pattern, `$BM`/`$BT` variable pattern, Steps 4h/4i/4j business artifact generation
- `workflows/flows.md` (read lines 150-200) — business mode detection pattern in Step 4
- `references/business-track.md` — track definitions, depth thresholds, vocabulary substitutions
- `references/launch-frameworks.md` — lean canvas schema (box 3, box 6 for cross-check), pitch deck slide maps (YC/Sequoia slide numbering)
- `references/business-financial-disclaimer.md` — prohibited patterns, structural placeholder format
- `.planning/REQUIREMENTS.md` — QUAL-01 through QUAL-04 verbatim requirements
- `.planning/STATE.md` — prior phase decisions (independent IF blocks, not ELSE IF; 20-field coverage write; Step sub-section insertion patterns)
- `.planning/config.json` — nyquist_validation: true confirmed
- `templates/critique-report.md` — report structure the planner must preserve

### Secondary (MEDIUM confidence)

- Phase 89 VALIDATION.md and test file — confirmed Nyquist test pattern (node:test, .cjs format, pattern-grep approach)
- Phase 88 STATE.md decisions — "Steps 5c/5d are INDEPENDENT conditional blocks (not ELSE IF)" — directly applicable to Phase 90 business gate design

### Tertiary (LOW confidence)

- Business critique framework content (unit economics, GTM-ICP fit, pricing psychology, investor readiness checklists) — derived from training knowledge of startup/investor evaluation frameworks. These are well-established frameworks (YC, a16z evaluation criteria, pricing psychology literature by Madhavan Ramanujam) but not verified against a live source during this research session.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools are pde-tools.cjs patterns used in 4+ prior phases
- Architecture: HIGH — directly observed from reading critique.md, hig.md, wireframe.md, flows.md source
- Pitfalls: HIGH — derived from explicit decisions in STATE.md and observable patterns in existing code
- Business perspective checklists: MEDIUM — training knowledge of startup frameworks, structurally consistent with existing PDE design
- LCV artifact path: MEDIUM — path confirmed in launch-frameworks.md but not directly verified in brief.md output

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (workflows are stable between milestone phases)
