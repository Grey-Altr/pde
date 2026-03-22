# Phase 89: Wireframe Stage Launch Artifacts — Research

**Researched:** 2026-03-22
**Domain:** Workflow prompt engineering — extending `workflows/wireframe.md` with business-mode LDP (landing page wireframe), STR (Stripe pricing config), and pitch deck outline artifacts
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LAUNCH-01 | `wireframe.md` produces LDP (Landing Page) artifact in deployable-spec format with Next.js component mapping (hero, features, pricing, CTA, footer sections) | LDP artifact structure, Next.js component mapping schema, and insertion pattern documented below |
| LAUNCH-02 | STR (Stripe Pricing Config) artifact generated with Stripe-compatible schema (product names, price amounts as placeholders, billing intervals, trial periods, checkout mode) | STR schema already in `references/launch-frameworks.md` Pricing Config Schema section; generation pattern documented below |
| LAUNCH-03 | Pitch deck outline generated in YC/Sequoia format with track-specific depth (solo: 10 slides, startup: 12-15, leader: internal business case format) | Pitch deck formats locked in `references/launch-frameworks.md`; track branching pattern from business-track.md documented below |
| LAUNCH-04 | Landing page wireframe consumes brand system tokens (Phase 88) and GTM flow (Phase 87) for copy framing | MKT artifact reference contract and SYS-brand-tokens.json consumption pattern documented below |
| LAUNCH-05 | Pricing config references Lean Canvas revenue streams block and competitive pricing landscape | LCV consumption pattern and competitive landscape reference documented below |
| LAUNCH-06 | All launch artifacts stored in `.planning/design/launch/` directory, not in `ux/` or `visual/` | launch/ dir exists (FOUND-03 complete); artifact path pattern and domain routing documented below |
</phase_requirements>

---

## Summary

Phase 89 extends `workflows/wireframe.md` (2100 lines, 7 steps) with three new business-mode artifact types: an LDP landing page deployable spec, an STR Stripe pricing config, and a track-appropriate pitch deck outline. This is the same prompt-engineering pattern applied in Phases 85-88 — business logic inserted as conditional sub-steps gated on `businessMode == true`, step count stays at 7.

The schemas and templates for all three artifact types are already locked in `references/launch-frameworks.md` (Pricing Config Schema section — present) and the pitch deck format table. The LDP artifact schema needs to be added to `launch-frameworks.md` (it defines `<required_reading>` for wireframe.md). The critical upstream dependency is BRAND-03: the positioning statement and tone of voice from the MKT artifact must be referenced in the LDP and pitch deck — this reference contract was established in Phase 88 but Phase 89 must consume it correctly.

The main complexity in this phase is the three-artifact fan-out (one wireframe.md execution produces three distinct launch/ artifacts), the 20-field designCoverage upgrade (wireframe.md still writes 16 fields), and the track-branching for pitch deck format selection (three distinct slide structures: YC 10, Sequoia 13, internal business case).

**Primary recommendation:** Implement Phase 89 as two plans. Plan 01: add LDP artifact schema to `launch-frameworks.md`, add businessMode detection and LDP+STR artifact generation to wireframe.md (Steps 4h/4i), upgrade designCoverage to 20 fields, wire LAUNCH-04/05/06. Plan 02: add pitch deck outline generation (Step 4j), DESIGN-STATE wiring for all three launch artifacts, test scaffold.

---

## Standard Stack

### Core — No New Dependencies

| File | Current State | Modification | Change Size |
|------|--------------|--------------|-------------|
| `workflows/wireframe.md` | 2100 lines, 7 steps, 16-field designCoverage write | Add businessMode/businessTrack detection in Step 2; add Steps 4h/4i/4j (LDP artifact + STR artifact + pitch deck outline); upgrade designCoverage write from 16 to 20 fields; add LDP/STR/deck DESIGN-STATE entries; add 3 manifest registrations | ~200 lines added |
| `references/launch-frameworks.md` | 230 lines; has Pricing Config Schema, Pitch Deck, Service Blueprint, Brand System sections | Add `## Landing Page Wireframe Spec` section with LDP artifact schema and Next.js component mapping format | ~60 lines added |
| `references/business-track.md` | COMPLETE — Phase 84 | Read-only; add to wireframe.md `<required_reading>` block | None |
| `references/business-financial-disclaimer.md` | COMPLETE — Phase 84 | Read-only; add to wireframe.md `<required_reading>` block | None |
| `references/business-legal-disclaimer.md` | COMPLETE — Phase 84 | Read-only; add to wireframe.md `<required_reading>` block (footer legal links section) | None |

### No New Commands Needed

All operations use existing `pde-tools.cjs` commands: `design manifest-update`, `design manifest-set-top-level`, `design coverage-check`, `design manifest-get-top-level`, `design lock-acquire`, `design lock-release`. No new npm packages. No new CLI tools.

### Required Reading Block Extension for wireframe.md

`workflows/wireframe.md` currently loads:
```
@references/skill-style-guide.md
@references/mcp-integration.md
@references/web-modern-css.md
@references/composition-typography.md
```

Phase 89 must add four entries:
```
@references/business-track.md
@references/business-financial-disclaimer.md
@references/business-legal-disclaimer.md
@references/launch-frameworks.md
```

---

## Architecture Patterns

### Recommended Project Structure

All three launch artifacts go in `.planning/design/launch/` — the directory already exists (FOUND-03). No artifacts go in `ux/` or `visual/`.

```
.planning/design/
├── launch/                               # Target for all 3 Phase 89 artifacts
│   ├── LDP-landing-page-v{N}.md         # NEW: Landing page deployable spec
│   ├── STR-stripe-pricing-v{N}.json     # NEW: Stripe pricing config
│   └── DPD-pitch-deck-outline-v{N}.md  # NEW: Pitch deck outline
├── strategy/
│   ├── MKT-brand-system-v{N}.md         # Phase 88 upstream (read-only)
│   ├── GTM-channel-flow-v{N}.md         # Phase 87 upstream (read-only)
│   └── LCV-lean-canvas-v{N}.md          # Phase 85 upstream (read-only)
└── visual/
    └── SYS-brand-tokens.json            # Phase 88 upstream (read-only)
```

### Pattern 1: Business Sub-Step Insertion (Established Project Pattern)

**What:** Business-mode content is added as numbered sub-steps (Step 4h, 4i, 4j) gated on `$BM == "true"`. The main step count stays at 7.

**When to use:** Always — this is the locked architectural pattern for all v0.12 business mode additions.

**Insertion point in wireframe.md:** Steps 4h/4i/4j are inserted AFTER the experience product type blocks but BEFORE Step 5 (write output artifacts). The existing experience block is at Step 4-EXP. Business mode blocks go after 4-EXP.

**Detection:** businessMode and businessTrack must be read in Step 2 (alongside the brief read in Step 2e). The existing wireframe.md Step 2e reads the brief and extracts PRODUCT_TYPE — this is where `$BM` and `$BT` should be captured.

```bash
# Add to wireframe.md Step 2e (after reading PRODUCT_TYPE):
BM=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-get-top-level businessMode 2>/dev/null)
BT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-get-top-level businessTrack 2>/dev/null)
```

### Pattern 2: LDP Artifact — Deployable Spec Format with Next.js Component Mapping

**What:** The LDP artifact is a markdown file that specifies landing page sections as structured component specs, not raw HTML. It is consumed downstream by Phase 92 (deploy skill) to scaffold an actual Next.js landing page.

**Artifact code:** `LDP`
**File path:** `.planning/design/launch/LDP-landing-page-v{N}.md`
**Domain:** `launch`
**Version:** matches wireframe version (same N from wireframe.md Step 2)

**Why "deployable-spec" not HTML:** Phase 92 (Deploy Skill) reads this artifact to generate a real Next.js scaffold. An HTML wireframe would require parsing; a structured spec is directly consumed. This is different from the WFR HTML wireframes in `ux/wireframes/` which are for browser preview.

**LDP artifact section schema — add to `references/launch-frameworks.md`:**

```markdown
---
artifact: LDP-landing-page
version: v{N}
skill: /pde:wireframe (LDP)
businessTrack: {solo_founder|startup_team|product_leader}
dependsOn: BRF, MKT, GTM, LCV
---

# Landing Page Wireframe — Deployable Spec

*Generated by /pde:wireframe (business mode) v{N} | {ISO date}*

## Section Map

| Section | Component | Next.js Path | Data Source |
|---------|-----------|-------------|-------------|
| hero | HeroSection | app/(landing)/hero.tsx | MKT positioning statement |
| features | FeaturesGrid | app/(landing)/features.tsx | BTH solution features |
| pricing | PricingTable | app/(landing)/pricing.tsx | LCV revenue streams (STR artifact) |
| cta | CTABanner | app/(landing)/cta.tsx | MKT brand voice CTA example |
| footer | SiteFooter | app/(landing)/footer.tsx | Legal checklist items |

## Hero Section

**Component:** `HeroSection`
**Next.js path:** `app/(landing)/hero.tsx`
**Props:**
- `headline`: [Derived from MKT Positioning Statement — primary benefit]
- `subheadline`: [GTM channel flow first acquisition touchpoint message]
- `ctaText`: [Derived from MKT Brand Voice CTA example]
- `ctaHref`: `#pricing`
**Brand tokens:** `brand-marketing.brand-voice.tone-primary`, `campaign-palette-variants.primary-campaign`
**Copy framing:** [Tone of voice descriptor from MKT artifact]

## Features Section

**Component:** `FeaturesGrid`
**Next.js path:** `app/(landing)/features.tsx`
**Props:**
- `features[]`: Array of {icon, title, description} — derived from BTH solution block (top 3-4 features)
**Layout:** 3-column grid on desktop, single-column on mobile
**Brand tokens:** `campaign-palette-variants.accent-campaign`

## Pricing Section

**Component:** `PricingTable`
**Next.js path:** `app/(landing)/pricing.tsx`
**Props:**
- `plans[]`: Array of {name, price, interval, features[]} — derived from STR artifact plan names
- `highlightedPlan`: [YOUR_HIGHLIGHTED_PLAN_NAME]
**[VERIFY FINANCIAL ASSUMPTIONS]** All plan prices reference `[YOUR_PRICE_IN_CENTS]` from STR artifact — never populated with dollar amounts here.

## CTA Section

**Component:** `CTABanner`
**Next.js path:** `app/(landing)/cta.tsx`
**Props:**
- `headline`: [Secondary CTA headline from MKT brand voice examples]
- `ctaText`: [MKT brand voice CTA example — avoid commodity phrasing]
- `ctaHref`: `#pricing`

## Footer Section

**Component:** `SiteFooter`
**Next.js path:** `app/(landing)/footer.tsx`
**Props:**
- `links[]`: Navigation links array
- `legalLinks[]`: Legal document link stubs (per legal checklist)
**Legal checklist [CONSULT LEGAL COUNSEL]:**
- `[ ] Terms of Service — [CONSULT LEGAL COUNSEL] Engage a business attorney to draft`
- `[ ] Privacy Policy — [CONSULT LEGAL COUNSEL] Engage a privacy attorney or use a compliant generator service`
- `[ ] Cookie Consent — [CONSULT LEGAL COUNSEL] Implement consent management per applicable regulations`

## Upstream References

- MKT artifact: `.planning/design/strategy/MKT-brand-system-v{N}.md` (positioning statement, tone of voice, brand voice examples)
- GTM artifact: `.planning/design/strategy/GTM-channel-flow-v{N}.md` (acquisition channel messaging)
- LCV artifact: `.planning/design/strategy/LCV-lean-canvas-v{N}.md` (customer segments, UVP)
- STR artifact: `.planning/design/launch/STR-stripe-pricing-v{N}.json` (plan names for pricing section)
```

### Pattern 3: STR Artifact — Stripe-Compatible JSON Config

**What:** The STR artifact is a JSON file following the schema in `references/launch-frameworks.md` Pricing Config Schema section. It is already fully specified — no schema additions needed.

**Artifact code:** `STR`
**File path:** `.planning/design/launch/STR-stripe-pricing-v{N}.json`
**Domain:** `launch`
**Version:** matches wireframe version

**Data sources (LAUNCH-05):**
- Plan names and tier structure: derived from LCV revenue streams block (box 9)
- Billing intervals and trial periods: derived from LCV revenue model type (one-time vs recurring)
- Competitive pricing structure: informed by MLS competitive landscape (number of tiers typical in this space)

**Key invariants from existing project decisions:**
- `unit_amount` is ALWAYS the string `"[YOUR_PRICE_IN_CENTS]"` — never a number
- `checkout_mode` is `"subscription"` for recurring models, `"payment"` for one-time models
- `trial_period_days` can be a number or `null` — use `null` unless LCV revenue model explicitly mentions free trial
- Product names use descriptive placeholders: `"[YOUR_PRODUCT_NAME]"` for the product, plan names derived from revenue stream labels with `[YOUR_PLAN_NAME e.g. Starter]` format

**Multi-tier pricing pattern** (when LCV revenue streams has multiple tiers):
```json
{
  "product": {
    "name": "[YOUR_PRODUCT_NAME]",
    "description": "[YOUR_PRODUCT_DESCRIPTION]",
    "metadata": {}
  },
  "prices": [
    {
      "nickname": "[YOUR_PLAN_NAME e.g. Starter]",
      "currency": "usd",
      "unit_amount": "[YOUR_PRICE_IN_CENTS]",
      "recurring": { "interval": "month", "interval_count": 1 },
      "lookup_key": "[YOUR_LOOKUP_KEY_STARTER]",
      "trial_period_days": null
    },
    {
      "nickname": "[YOUR_PLAN_NAME e.g. Pro]",
      "currency": "usd",
      "unit_amount": "[YOUR_PRICE_IN_CENTS]",
      "recurring": { "interval": "month", "interval_count": 1 },
      "lookup_key": "[YOUR_LOOKUP_KEY_PRO]",
      "trial_period_days": null
    },
    {
      "nickname": "[YOUR_PLAN_NAME e.g. Enterprise]",
      "currency": "usd",
      "unit_amount": "[YOUR_PRICE_IN_CENTS]",
      "recurring": { "interval": "year", "interval_count": 1 },
      "lookup_key": "[YOUR_LOOKUP_KEY_ENTERPRISE]",
      "trial_period_days": null
    }
  ],
  "checkout_mode": "subscription"
}
```

**Annual billing variant:** When generating a Pro or Enterprise tier that typically has annual billing, add a second price entry per tier with `"interval": "year"` and `"interval_count": 1`. The annual `lookup_key` appends `_ANNUAL` (e.g., `[YOUR_LOOKUP_KEY_PRO_ANNUAL]`).

**How LCV revenue streams map to STR tiers:**
- LCV box 9 (revenue streams) describes the revenue model — solo_founder with a simple SaaS model usually has 1-2 tiers; startup_team typically has 3 tiers (Starter/Pro/Enterprise); product_leader typically has 2 tiers (Team/Enterprise) with annual billing emphasis.

### Pattern 4: DPD Artifact — Pitch Deck Outline (Track-Dependent Format)

**What:** The pitch deck outline is a markdown file with slide-by-slide content prompts. It is NOT a presentation file — it is a structured outline specifying what each slide should cover, sourced from upstream artifacts.

**Artifact code:** `DPD`
**File path:** `.planning/design/launch/DPD-pitch-deck-outline-v{N}.md`
**Domain:** `launch`
**Version:** matches wireframe version

**Track-to-format mapping (from `references/launch-frameworks.md` and `references/business-track.md`):**

| businessTrack | Format | Slide count | Format source |
|---------------|--------|-------------|---------------|
| `solo_founder` | YC 10-slide | 10 | launch-frameworks.md YC 10-Slide Format |
| `startup_team` | YC 10-slide default; expandable to Sequoia 13 if external funding detected | 10-13 | launch-frameworks.md; check BTH for funding signals |
| `product_leader` | Internal business case format | 13 | launch-frameworks.md Product Leader format; Team→Resource Requirements, Ask→Initiative ROI |

**Funding context detection for startup_team expansion:** Scan BRF/BTH for signals: "seed", "Series A", "investors", "fundraising", "pre-seed", "investor presentation". If any signals present: use Sequoia 13. If absent: default to YC 10.

**DPD artifact slide-per-section schema:**

Each slide in the outline has:
- Slide number and title
- `Source:` — which upstream artifact provides the content
- `Key question:` — from the pitch deck format table in launch-frameworks.md
- `Content prompts:` — 2-4 bullet points guiding what to write for this slide

**Solo founder YC 10-slide example (first 3 slides):**
```markdown
## Slide 1 — Problem

**Source:** BTH problem section, LCV box 1
**Key question:** What pain exists and who has it?
**Content prompts:**
- State the top 1-2 problems from LCV box 1 (status: [validated/assumed/unknown])
- Describe who has the problem using LCV customer segments box 5 language (plain English — no "ICP")
- Quantify the pain with a [Source required] data point or leave as [YOUR_EVIDENCE]
```

**Product leader internal business case — substituted slides:**
```markdown
## Slide 12 — Resource Requirements
*(Replaces "Team" slide from Sequoia 13)*

**Source:** BRF project team, BTH unfair advantage, business-track.md vocabulary
**Key question:** What headcount, budget, and systems are required?
**Content prompts:**
- List required headcount categories (engineering, design, ops) — not names
- [VERIFY FINANCIAL ASSUMPTIONS] Budget envelope: [YOUR_BUDGET_ENVELOPE]
- Systems and tooling required (reference SBP backstage lane from Phase 87)

## Slide 13 — Initiative ROI
*(Replaces "Ask" slide from Sequoia 13)*

**Source:** LCV revenue streams, MLS market sizing, business-financial-disclaimer.md
**Key question:** What is the expected return, payback period, and success metric?
**Content prompts:**
- [VERIFY FINANCIAL ASSUMPTIONS] Expected return: [YOUR_ROI_TARGET]
- [VERIFY FINANCIAL ASSUMPTIONS] Payback period: [YOUR_PAYBACK_PERIOD]
- Primary success metric: [YOUR_SUCCESS_METRIC] (OKR framing per business-track.md product_leader vocabulary)
```

### Pattern 5: wireframe.md Step Structure — Where Business Steps Insert

```
Step 1/7: Initialize design directories
Step 1.5/7: Load Figma design context
Step 2/7: Check prerequisites and parse arguments
  2a: Screen inventory
  2b: Fidelity argument
  2c: Screen selection
  2d: Version gate
  2e: Read design brief          <- ADD: read $BM and $BT after PRODUCT_TYPE extraction
  2f: Read design tokens
  2g: Parse --use-stitch
  2h: Print collateral prerequisites (experience only)
Step 3/7: Probe MCP tools
Step 4/7: Generate wireframes
  4-EXP: Experience wireframes (experience products only)
  *** 4h: LDP landing page spec generation (business mode only) — INSERT HERE ***
  *** 4i: STR Stripe pricing config generation (business mode only) — INSERT HERE ***
  *** 4j: DPD pitch deck outline generation (business mode only) — INSERT HERE ***
Step 5/7: Write output artifacts
Step 6/7: Update ux domain DESIGN-STATE
Step 7/7: Update root DESIGN-STATE and manifest
  7d: Coverage flag            <- UPGRADE from 16-field to 20-field (add hasLaunchKit)
  *** 7e-launch: Launch artifact DESIGN-STATE wiring and manifest registration (business mode only) ***
```

### Pattern 6: 20-Field designCoverage Upgrade in wireframe.md

`wireframe.md` Step 7d currently writes 16 fields (confirmed at line 2019). The upgrade is identical to the pattern applied in flows.md, competitive.md, brief.md, and system.md.

**Critical:** `hasLaunchKit` is set to `false` here (not `true`) — `hasLaunchKit` is only set to `true` by Phase 91 handoff.md when the complete launch kit is assembled. wireframe.md sets `hasWireframes: true` only.

```bash
# wireframe.md Step 7d — upgrade from 16 to 20 fields:
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasWireframes":true,"hasFlows":{current},"hasHardwareSpec":{current},
    "hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},
    "hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},
    "hasRecommendations":{current},"hasStitchWireframes":{current},"hasPrintCollateral":{current},
    "hasProductionBible":{current},"hasBusinessThesis":{current},"hasMarketLandscape":{current},
    "hasServiceBlueprint":{current},"hasLaunchKit":{current}}'
```

### Pattern 7: Artifact Manifest Registration for Three Launch Artifacts

Each artifact requires the standard 7-call manifest-update registration pattern:

```bash
# LDP artifact
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update LDP code LDP
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update LDP name "Landing Page Spec"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update LDP type landing-page-spec
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update LDP domain launch
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update LDP path ".planning/design/launch/LDP-landing-page-v${N}.md"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update LDP status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update LDP dependsOn '["BRF","MKT","GTM","LCV"]'

# STR artifact
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update STR code STR
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update STR name "Stripe Pricing Config"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update STR type pricing-config
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update STR domain launch
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update STR path ".planning/design/launch/STR-stripe-pricing-v${N}.json"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update STR status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update STR dependsOn '["LCV","MLS"]'

# DPD artifact
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update DPD code DPD
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update DPD name "Pitch Deck Outline"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update DPD type pitch-deck-outline
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update DPD domain launch
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update DPD path ".planning/design/launch/DPD-pitch-deck-outline-v${N}.md"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update DPD status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update DPD dependsOn '["BTH","LCV","MLS","MKT"]'
```

### Pattern 8: DESIGN-STATE Wiring for launch/ Domain Artifacts

Following the SBP/GTM pattern from Phase 87 and the MKT pattern from Phase 88, launch artifact DESIGN-STATE rows go in the ROOT DESIGN-STATE under an `IF LDP_WRITTEN == true` guard block:

```markdown
**IF `LDP_WRITTEN == true` (and STR_WRITTEN == true and DPD_WRITTEN == true):**

Root DESIGN-STATE updates:
- Cross-Domain Dependency Map: `| LDP | launch | BRF,MKT,GTM,LCV | current |`
- Cross-Domain Dependency Map: `| STR | launch | LCV,MLS | current |`
- Cross-Domain Dependency Map: `| DPD | launch | BTH,LCV,MLS,MKT | current |`
- Quick Reference: `| Landing Page Spec | v{N} |`
- Quick Reference: `| Stripe Pricing Config | v{N} |`
- Quick Reference: `| Pitch Deck Outline | v{N} |`
- Decision Log: `| LDP,STR,DPD | launch artifacts generated, {businessTrack} track | {date} |`
```

### Anti-Patterns to Avoid

- **Writing launch artifacts to `ux/` or `visual/` directories:** LDP, STR, and DPD all go to `launch/`. This is LAUNCH-06 and is an explicit test gate.
- **Setting `hasLaunchKit: true` in wireframe.md:** This flag is owned by Phase 91 handoff.md. wireframe.md must pass through the current value (not override it).
- **16-field designCoverage write:** wireframe.md currently writes only 16 fields. This WILL clobber `hasBusinessThesis`, `hasMarketLandscape`, `hasServiceBlueprint`. The 20-field upgrade is mandatory in Plan 01 before launch artifact generation is added.
- **Populating STR `unit_amount` with a number:** The `unit_amount` field MUST be the string `"[YOUR_PRICE_IN_CENTS]"`, never an integer. This matches the schema in launch-frameworks.md and the financial disclaimer prohibition.
- **Fetching MKT content without checking its file exists first:** wireframe.md Step 4h must glob for the MKT artifact before reading it. If absent, emit WARNING and generate LDP without MKT branding (fallback to BRF domain strategy section).
- **Generating the pitch deck outline as a presentation file (PPTX, HTML slides):** DPD is a markdown outline only. Presentation generation is out of scope for Phase 89.
- **Using ELSE IF between 4-EXP and 4h/4i/4j blocks:** The experience block and business mode blocks are INDEPENDENT conditionals. A business:experience composition should execute both 4-EXP AND 4h/4i/4j.
- **One manifest entry per launch artifact version (numbered artifacts):** The three launch artifacts (LDP, STR, DPD) are SEPARATE manifest entries with SEPARATE artifact codes — not all lumped under a single "launch" entry.
- **Reading businessMode in Step 4h without first reading it in Step 2e:** businessMode and businessTrack must be read once in Step 2e (alongside PRODUCT_TYPE) and cached as `$BM` / `$BT` for reuse. Do not add redundant manifest reads inside Step 4h/4i/4j.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pricing config schema | Custom JSON structure | `references/launch-frameworks.md` Pricing Config Schema (already exists) | Schema is locked and matches Stripe Products/Prices API fields; downstream deploy skill (Phase 92) reads this exact structure |
| Pitch deck slide formats | Custom slide templates | `references/launch-frameworks.md` YC 10-Slide, Sequoia 13-Slide, Product Leader format tables | Formats are locked and track-routed; business-track.md specifies which track gets which format |
| Track branching logic | New IF/ELSE conditions from scratch | The `$BT` variable with `solo_founder` / `startup_team` / `product_leader` branches (same as competitive.md, flows.md, system.md) | All four prior phases use identical pattern; planner must copy the branching structure verbatim |
| Manifest registration | Custom artifact write | 7-call `manifest-update` pattern | All 15+ existing artifacts use this — downstream skills (handoff, critique, deploy) rely on exact field structure |
| Write lock for DESIGN-STATE | Custom lock mechanism | `design lock-acquire pde-wireframe` / `design lock-release` (already in wireframe.md Step 7a) | The lock window is ALREADY OPEN in Step 7 — launch artifact DESIGN-STATE updates happen inside the existing lock window, not in a new one |
| Financial placeholder enforcement | Custom dollar-amount check | `grep -qE '\$[0-9]'` check against STR file (same as MKT check in Phase 88 code examples) | Same pattern already established; catches `$9`, `$99`, `$499` etc. |
| Legal checklist | Custom legal content | `references/business-legal-disclaimer.md` legal checklist format | Legal disclaimer file is already loaded by wireframe.md as required_reading in Phase 89 |

**Key insight:** Phase 89 is purely a composition and wiring problem. All schemas, templates, track branching rules, manifest commands, and disclaimer patterns exist in the project. The planner's job is to assemble them correctly into wireframe.md Steps 4h/4i/4j and 7d/7e-launch.

---

## Common Pitfalls

### Pitfall 1: 16-Field Coverage Write Clobbers Business Flags

**What goes wrong:** wireframe.md Step 7d writes a 16-field designCoverage object. After Phase 85 sets `hasBusinessThesis: true`, Phase 86 sets `hasMarketLandscape: true`, and Phase 87 sets `hasServiceBlueprint: true`, a subsequent `/pde:wireframe` run will overwrite those flags with `false` (their default value in the 16-field write).

**Why it happens:** wireframe.md has not yet been upgraded to 20 fields. This is the same regression fixed for brief.md (Phase 85), competitive.md (Phase 86), flows.md (Phase 87), and system.md (Phase 88).

**How to avoid:** The 20-field upgrade MUST be the first change in Plan 01 of Phase 89, before any launch artifact generation is added. The Nyquist test must assert `hasBusinessThesis` appears in wireframe.md's coverage write.

**Warning signs:** Any designCoverage write in wireframe.md that does not include all four of `hasBusinessThesis`, `hasMarketLandscape`, `hasServiceBlueprint`, `hasLaunchKit`.

### Pitfall 2: Missing MKT Artifact When Generating LDP Content

**What goes wrong:** Step 4h attempts to read the MKT artifact to extract the positioning statement and tone of voice for the LDP hero section. If the user ran `/pde:wireframe` without first running `/pde:system` in business mode, the MKT artifact does not exist.

**Why it happens:** Phase 89 has a soft dependency on Phase 88 (brand system). The REQUIREMENTS say "landing page wireframe consumes brand system tokens" (LAUNCH-04) but the workflow must be resilient if the upstream artifact is absent.

**How to avoid:** Step 4h must glob for `strategy/MKT-brand-system-v*.md` before attempting to read it. If absent: emit WARNING and derive LDP hero content from the BRF Domain Strategy section instead. The BRF Domain Strategy section (from BRIEF-05) contains brand positioning seeds that serve as an adequate fallback. Do NOT halt.

**Warning signs:** Hard dependency (`HALT if absent`) on MKT artifact. Should be a soft dependency with WARNING.

### Pitfall 3: STR Unit_Amount Populated with Number Instead of Placeholder

**What goes wrong:** The agent generating the STR artifact populates `unit_amount` with an integer (e.g., `999` for $9.99) instead of the required string placeholder `"[YOUR_PRICE_IN_CENTS]"`.

**Why it happens:** Stripe's actual API uses integer cents, and the agent may pattern-match to produce a "valid" Stripe schema. But the financial disclaimer explicitly prohibits specific dollar amounts.

**How to avoid:** The STR generation step instruction must explicitly state: `unit_amount MUST be the string "[YOUR_PRICE_IN_CENTS]" — never an integer, never a calculated amount.` Add the financial disclaimer validation check after STR artifact write:

```bash
if grep -qE '\"unit_amount\": [0-9]' ".planning/design/launch/STR-stripe-pricing-v${N}.json" 2>/dev/null; then
  echo "ERROR: Numeric unit_amount detected in STR artifact. Use \"[YOUR_PRICE_IN_CENTS]\" string placeholder only."
  exit 1
fi
```

**Warning signs:** Any `unit_amount` value that is not the exact string `"[YOUR_PRICE_IN_CENTS]"`.

### Pitfall 4: Pitch Deck Format Not Track-Branched

**What goes wrong:** All three tracks get the same YC 10-slide format. The product_leader track gets an investor pitch deck instead of an internal business case format.

**Why it happens:** The track branching for pitch deck format is in `references/launch-frameworks.md` and `references/business-track.md` but the planner may not wire the IF/ELSE correctly for the DPD generation step.

**How to avoid:** Step 4j must have explicit three-way branching:
```
IF $BT == "solo_founder": generate YC 10-slide outline
IF $BT == "startup_team": check for funding signals → YC 10 (no signals) OR Sequoia 13 (signals present)
IF $BT == "product_leader": generate internal business case format (Sequoia 13 base with Team→Resource Requirements, Ask→Initiative ROI substitutions)
```

**Warning signs:** A `product_leader` track deck that includes "Ask" slide instead of "Initiative ROI" or "Team" slide instead of "Resource Requirements".

### Pitfall 5: Three Artifacts Inside One DESIGN-STATE Lock Window vs Three Separate Lock Acquisitions

**What goes wrong:** The planner creates three separate `lock-acquire / DESIGN-STATE update / lock-release` windows for LDP, STR, and DPD — one per artifact. This is 3x the lock contention and 3x the risk of partial failure.

**Why it happens:** Each artifact update may seem to need its own lock cycle by analogy to how each workflow has one lock cycle.

**How to avoid:** All three launch artifact DESIGN-STATE updates happen inside a SINGLE lock window in Step 7e-launch. The existing Step 7a lock acquisition (for the WFR manifest) is already open at this point — add the launch DESIGN-STATE updates INSIDE that same lock window before the 7e lock release.

**Warning signs:** `lock-acquire pde-wireframe` called more than once in the workflow.

### Pitfall 6: LDP Artifact Written to Wrong Directory

**What goes wrong:** The LDP artifact gets written to `ux/` or `visual/` instead of `launch/`. This is an explicit Nyquist test gate (LAUNCH-06).

**Why it happens:** wireframe.md's existing output artifacts all go to `ux/wireframes/`. The path pattern may be copy-pasted from WFR artifact registration.

**How to avoid:** LDP, STR, and DPD paths explicitly use `.planning/design/launch/` prefix. Nyquist test must assert that `launch/` appears in each of the three path registrations in wireframe.md.

**Warning signs:** `ux/` or `visual/` in any LDP/STR/DPD file path.

---

## Code Examples

Verified patterns from project source files:

### Business Mode Detection (from flows.md lines 157-159 — confirmed pattern)
```bash
BM=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-get-top-level businessMode 2>/dev/null)
BT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-get-top-level businessTrack 2>/dev/null)
```

### MKT Artifact Soft Dependency Glob (for Step 4h)
```bash
# Soft dependency: MKT artifact
MKT_FILE=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design glob "strategy/MKT-brand-system-v*.md" 2>/dev/null | head -1)
if [[ -z "$MKT_FILE" ]]; then
  echo "Warning: MKT brand system artifact not found. LDP hero content derived from BRF Domain Strategy section."
  echo "  Run /pde:system in business mode for richer brand-aligned copy framing."
  MKT_AVAILABLE=false
else
  MKT_AVAILABLE=true
fi
```

### STR Financial Validation Check (adapted from MKT financial check in Phase 88)
```bash
if grep -qE '"unit_amount": [0-9]' ".planning/design/launch/STR-stripe-pricing-v${N}.json" 2>/dev/null; then
  echo "ERROR: Numeric unit_amount detected in STR artifact. Use \"[YOUR_PRICE_IN_CENTS]\" string placeholder only."
  grep -nE '"unit_amount": [0-9]' ".planning/design/launch/STR-stripe-pricing-v${N}.json"
  exit 1
fi
```

### 20-Field designCoverage Write for wireframe.md Step 7d (upgrade pattern)
```bash
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
# Parse ALL 20 current flag values, merge hasWireframes: true, preserve all others
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasWireframes":true,"hasFlows":{current},"hasHardwareSpec":{current},
    "hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},
    "hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},
    "hasRecommendations":{current},"hasStitchWireframes":{current},"hasPrintCollateral":{current},
    "hasProductionBible":{current},"hasBusinessThesis":{current},"hasMarketLandscape":{current},
    "hasServiceBlueprint":{current},"hasLaunchKit":{current}}'
```

### Track-Branched Pitch Deck Format Selection (Step 4j pattern)
```bash
IF $BT == "solo_founder":
  DECK_FORMAT="yc_10"
  DECK_SLIDE_COUNT=10
ELIF $BT == "startup_team":
  # Check for funding context signals in BTH/BRF content
  if [funding signals present]:
    DECK_FORMAT="sequoia_13"
    DECK_SLIDE_COUNT=13
  else:
    DECK_FORMAT="yc_10"
    DECK_SLIDE_COUNT=10
ELIF $BT == "product_leader":
  DECK_FORMAT="internal_business_case"
  DECK_SLIDE_COUNT=13
ELSE:
  # Default to YC 10
  DECK_FORMAT="yc_10"
  DECK_SLIDE_COUNT=10
```

### LDP Artifact Path Pattern
```
.planning/design/launch/LDP-landing-page-v{N}.md
.planning/design/launch/STR-stripe-pricing-v{N}.json
.planning/design/launch/DPD-pitch-deck-outline-v{N}.md
```

Where `{N}` matches the wireframe version number read from the design manifest in Step 2d.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 16-field designCoverage write in wireframe.md | 20-field pass-through-all | Each phase upgrades its own workflow (Phase 85-88 each fixed theirs) | wireframe.md is the last workflow to upgrade in v0.12 pipeline |
| No business-mode artifacts from wireframe.md | 3 launch artifacts (LDP, STR, DPD) in launch/ domain | Phase 89 | wireframe.md becomes a multi-artifact-type generator in business mode |
| Business logic in new top-level steps | Business logic as sub-steps (4h, 4i, 4j) | Established Phase 85, carried through 86-88 | Step count stays at 7; non-business runs byte-identical to pre-v0.12 |
| Pitch deck in YC format only | Track-dependent format (YC 10, Sequoia 13, internal business case) | Established in launch-frameworks.md Phase 84 | Product leader track gets executive-ready format without investor framing |

**No deprecated approaches to document for this phase.**

---

## Open Questions

1. **Does wireframe.md Step 2e currently read businessMode?**
   - What we know: Confirmed by grep — `businessMode` does NOT appear anywhere in wireframe.md (0 matches). businessMode/businessTrack detection is absent.
   - What's unclear: Whether to add detection in Step 2e (alongside PRODUCT_TYPE extraction) or at the top of Step 4h.
   - Recommendation: Add detection in Step 2e alongside the existing `PRODUCT_TYPE` extraction — this matches where competitive.md and flows.md do their detection (top of the analysis step). Both approaches work; Step 2e is preferable because `$BM` and `$BT` are available for any Step that needs them (including potential future Step 2h print collateral business mode check).

2. **Should LDP artifact schema be added to launch-frameworks.md in Plan 01 or Plan 02?**
   - What we know: launch-frameworks.md currently has no LDP section. wireframe.md Step 4h cannot reference a canonical LDP template without it.
   - What's unclear: Whether the LDP schema is simple enough to be self-contained in Step 4h's instruction prose.
   - Recommendation: Add `## Landing Page Wireframe Spec` to `references/launch-frameworks.md` in Plan 01, before wireframe.md Step 4h is authored. This makes the schema reusable by Phase 92 (deploy skill) and is consistent with how launch-frameworks.md was built for all other artifact types.

3. **How many STR price entries should be generated by default?**
   - What we know: launch-frameworks.md Pricing Config Schema shows a single-tier example. The description says "repeat the prices array entry for each tier."
   - What's unclear: The LCV revenue streams box may be sparse (status: unknown) with no clear tier count.
   - Recommendation: Default to 2 tiers for `solo_founder` (Free/Paid or Starter/Pro), 3 tiers for `startup_team` (Starter/Pro/Enterprise), 2 tiers for `product_leader` (Team/Enterprise). If LCV revenue streams box has explicit tier language, follow it.

4. **Does wireframe.md Step 2d version gate need updating to account for launch/ artifacts?**
   - What we know: Step 2d checks for existing wireframe HTML files in `ux/wireframes/`. There is no check for existing launch/ artifacts.
   - What's unclear: Whether `--force` should also overwrite existing LDP/STR/DPD artifacts.
   - Recommendation: Reuse the existing `--force` flag for launch artifact overwrite (consistent with WFR overwrite behavior). If launch artifacts already exist and `--force` is absent, prompt for confirmation. Add this check to Step 4h's gate condition.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (node:test) |
| Config file | none — tests run directly with `node --test {file}` |
| Quick run command | `node --test .planning/phases/89-wireframe-stage-launch-artifacts/tests/test-wireframe-launch.cjs` |
| Full suite command | `node --test .planning/phases/89-wireframe-stage-launch-artifacts/tests/test-wireframe-launch.cjs` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LAUNCH-01 | wireframe.md contains "LDP-landing-page" artifact filename pattern | unit (structural) | `node --test .planning/phases/89-wireframe-stage-launch-artifacts/tests/test-wireframe-launch.cjs` | Wave 0 |
| LAUNCH-01 | wireframe.md contains businessMode gate before LDP generation | unit (structural) | same | Wave 0 |
| LAUNCH-01 | wireframe.md LDP section contains hero, features, pricing, CTA, footer section markers | unit (structural) | same | Wave 0 |
| LAUNCH-02 | wireframe.md contains "STR-stripe-pricing" artifact filename pattern | unit (structural) | same | Wave 0 |
| LAUNCH-02 | wireframe.md contains `unit_amount` placeholder string pattern (not numeric) | unit (structural) | same | Wave 0 |
| LAUNCH-03 | wireframe.md contains "DPD-pitch-deck-outline" artifact filename pattern | unit (structural) | same | Wave 0 |
| LAUNCH-03 | wireframe.md contains track branching for solo_founder, startup_team, product_leader deck formats | unit (structural) | same | Wave 0 |
| LAUNCH-04 | wireframe.md references MKT artifact in LDP upstream dependencies | unit (structural) | same | Wave 0 |
| LAUNCH-05 | wireframe.md STR section references LCV lean canvas and MLS competitive landscape | unit (structural) | same | Wave 0 |
| LAUNCH-06 | wireframe.md LDP/STR/DPD paths all contain `launch/` directory prefix | unit (structural) | same | Wave 0 |
| LAUNCH-06 | wireframe.md designCoverage write contains all 20 fields including hasBusinessThesis | unit (structural) | same | Wave 0 |

All 11 structural assertions read `workflows/wireframe.md` from the project root — no runtime execution of the workflow itself.

### Sampling Rate

- **Per task commit:** `node --test .planning/phases/89-wireframe-stage-launch-artifacts/tests/test-wireframe-launch.cjs`
- **Per wave merge:** same (single file contains all assertions)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `.planning/phases/89-wireframe-stage-launch-artifacts/tests/test-wireframe-launch.cjs` — covers LAUNCH-01 through LAUNCH-06 (11 structural assertions against `workflows/wireframe.md`)

*(Framework install: not needed — node:test is built-in to Node.js ≥18 which is already in use)*

---

## Sources

### Primary (HIGH confidence)

- `workflows/wireframe.md` (full read, 2100 lines) — Step structure map, Step 7d 16-field coverage write (confirmed at line 2019), no businessMode detection present (confirmed by grep returning 0 matches), existing manifest registration patterns (lines 1938-1946), WFR artifact code and domain conventions
- `references/launch-frameworks.md` (full read, 230 lines) — Pricing Config Schema (lines 128-162), Pitch Deck Formats (lines 44-82), no LDP section exists (confirmed by full read), Brand System section added in Phase 88 (confirmed present), consumer list (wireframe.md Phase 89 listed)
- `references/business-track.md` (full read, 92 lines) — Track definitions, vocabulary substitutions, depth thresholds table (pitch deck format row), artifact format differences
- `references/business-financial-disclaimer.md` (full read, 51 lines) — Prohibited patterns, placeholder format, `[YOUR_PRICE_IN_CENTS]` placeholder for pricing, dollar-amount detection pattern
- `references/business-legal-disclaimer.md` (full read, 47 lines) — Legal checklist format, footer legal links pattern, `[CONSULT LEGAL COUNSEL]` tag format
- `.planning/phases/88-brand-system/88-RESEARCH.md` (full read) — BRAND-03 downstream reference contract: MKT artifact positioning statement and tone of voice feeds Phase 89 LDP and pitch deck; confirmed token alias paths; 20-field upgrade pattern
- `.planning/phases/87-flows-stage/87-RESEARCH.md` (partial read, 100 lines) — Business sub-step insertion pattern, GTM artifact path and domain
- `.planning/phases/86-competitive-opportunity-extensions/86-RESEARCH.md` (partial read, 100 lines) — 20-field pass-through-all pattern, businessMode detection placement
- `.planning/phases/88-brand-system/tests/test-brand-system.cjs` (full read) — Canonical test file structure for Phase 89 test to follow
- `.planning/REQUIREMENTS.md` — LAUNCH-01 through LAUNCH-06 verbatim requirements
- `.planning/STATE.md` — locked decisions: businessMode is boolean false, businessTrack uses pipe-separated string comment, 4 new designCoverage fields, launch/ is 10th DOMAIN_DIRS element

### Secondary (MEDIUM confidence)

- `.planning/ROADMAP.md` — Phase 89 success criteria, dependencies (Phase 86 market analysis, Phase 87 GTM, Phase 88 brand system), plan count (2 plans)
- `.planning/config.json` — `workflow.nyquist_validation: true` — Validation Architecture section required in RESEARCH.md

### Tertiary (LOW confidence)

None — all research was performed against project source files with direct evidence. No external documentation was required because all schemas, formats, and patterns are locked in project reference files authored in Phase 84.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tooling verified against project source files; no external dependencies needed; wireframe.md confirmed to have 0 businessMode occurrences (grep verified); 16-field coverage write confirmed at line 2019
- Architecture patterns: HIGH — derived directly from established Phase 85-88 precedent patterns with exact line references; LDP/STR/DPD schemas and formats are locked in launch-frameworks.md and business-track.md
- Pitfalls: HIGH — derived from code analysis of actual wireframe.md gaps (16-field coverage at line 2019 confirmed; no businessMode detection confirmed; no LDP schema in launch-frameworks.md confirmed by full read); financial placeholder prohibition confirmed in business-financial-disclaimer.md Prohibited Patterns section

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable internal tooling, no external dependencies)

---

## Deep Dive: Stripe Pricing Configuration (STR)

**Researched:** 2026-03-22
**Sources:** Stripe official docs (docs.stripe.com) — HIGH confidence
**Scope:** Stripe API schema verification, billing model mapping, placeholder conventions, test key format, LCV→tier mapping, competitive positioning, STR format recommendation

---

### Current Stripe API Schema

All field documentation verified against Stripe official API reference as of 2026-03-22.

#### Product Object — Required and Optional Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | YES | "Meant to be displayable to the customer" — maps to product/tier name |
| `description` | string | no | Long-form explanation; used for own rendering purposes |
| `metadata` | object | no | Key-value pairs; good for tagging product type, track, version |
| `url` | string | no | Publicly accessible product page URL |
| `marketing_features` | array | no | Up to 15 feature strings; used by Stripe's pricing table embed |
| `statement_descriptor` | string | no | Max 22 chars; appears on customer bank statements |
| `unit_label` | string | no | Max 12 chars; shown on receipts (e.g., "seat", "user", "request") |
| `active` | boolean | no | Defaults to `true` |
| `default_price_data` | object | no | Inline price creation at product creation time |

**For STR artifact:** Only `name`, `description`, and `metadata` are relevant as placeholders. `marketing_features` is optional enhancement for `startup_team` and `product_leader` tracks.

#### Price Object — Required and Optional Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `currency` | string (ISO 4217) | YES | Lowercase 3-letter code (e.g., `"usd"`) |
| `product` | string | YES (or `product_data`) | Existing Product ID, OR use `product_data` for inline creation |
| `unit_amount` | integer (cents) | Conditionally required | Required for `per_unit` billing_scheme. NOT required for tiered or custom_unit_amount |
| `unit_amount_decimal` | string | no | Decimal alternative when sub-cent precision needed |
| `billing_scheme` | enum | no | `"per_unit"` (default) or `"tiered"` |
| `recurring` | object | no (required for subscriptions) | Omit for one-time payments |
| `recurring.interval` | enum | required if recurring present | `"day"`, `"week"`, `"month"`, `"year"` |
| `recurring.interval_count` | integer | no | Defaults to 1; set to 12 for annual-only billing |
| `recurring.usage_type` | enum | no | `"licensed"` (default, flat-rate) or `"metered"` (usage-based) |
| `nickname` | string | no | Internal label; shown in Stripe dashboard |
| `lookup_key` | string | no | Up to 200 chars; enables price lookup by key instead of ID |
| `trial_period_days` | integer | no | Days of free trial; max 730 (2 years) |
| `tax_behavior` | enum | no | `"inclusive"`, `"exclusive"`, or `"unspecified"` |
| `tiers` | array | required if `billing_scheme=tiered` | Unit count brackets with per-unit cost per bracket |
| `tiers_mode` | enum | required if `billing_scheme=tiered` | `"graduated"` or `"volume"` |
| `metadata` | object | no | Key-value storage |

**Critical finding:** In Stripe's actual API, `unit_amount` is an integer (cents). The STR artifact MUST use the string placeholder `"[YOUR_PRICE_IN_CENTS]"` — never an integer. This intentionally produces a non-API-ready JSON until the user replaces the placeholder. The financial disclaimer in `references/business-financial-disclaimer.md` requires this. The downstream deploy skill (Phase 93+) reads plan names and structure from STR; it does not auto-provision Stripe Products.

**`currency` field:** Unlike `unit_amount`, the `currency` field is not a financial value — it is a structural field specifying the payment currency. The STR artifact sets `"currency": "usd"` as a concrete default. If the project operates in a non-USD market, the user must replace this. The financial disclaimer only prohibits specific dollar amounts, not currency codes.

#### Checkout Session — Key Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `mode` | enum | YES | `"payment"` (one-time), `"subscription"` (recurring), `"setup"` (save card) |
| `line_items` | array | YES for payment/subscription | Each item: `price` (ID) + `quantity` (integer); max 20 recurring + 20 one-time per session |
| `success_url` | string | YES | Redirect URL after successful checkout |
| `cancel_url` | string | YES (except embedded mode) | Redirect URL when customer cancels |
| `subscription_data.trial_period_days` | integer | no | Free trial length in days; max 730 |
| `payment_method_collection` | enum | no | `"always"` (default) or `"if_required"` — use `if_required` for free trials without card capture |

**`checkout_mode` field in STR artifact:** Maps directly to Checkout Session `mode`. Use `"subscription"` for recurring SaaS models (most business-mode products). Use `"payment"` only when LCV revenue streams explicitly describes one-time payment.

**`trial_period_days` in STR vs Checkout Session:** The STR artifact stores `trial_period_days` at the price level (not nested under `subscription_data`). When the deploy skill (Phase 93+) reads the STR artifact to provision a Checkout Session, it must move this value to `subscription_data.trial_period_days` in the session payload. Note this in the STR artifact as a comment.

---

### Billing Model Coverage Per Track

Stripe supports five primary billing models. The STR artifact template must cover the appropriate subset for each track. Full usage-based and tiered billing (requiring `billing_scheme=tiered`, `tiers[]`, `recurring.usage_type=metered`) are not appropriate for the STR artifact — they require live event ingestion infrastructure that is far outside the launch artifact scope.

| Billing Model | Stripe Fields | solo_founder | startup_team | product_leader |
|---------------|--------------|--------------|--------------|----------------|
| One-time payment | `unit_amount`, no `recurring` | Supported (digital products, templates) | Rare | Rare |
| Recurring monthly | `recurring.interval=month` | Primary model | Primary model | Secondary |
| Recurring annual | `recurring.interval=year` | Optional (annual variant) | Standard add-on | Primary (enterprise) |
| Per-seat | `recurring.usage_type=licensed`, `quantity` per subscription | Not in STR | Optional for startup_team | Optional for product_leader |
| Metered / usage-based | `recurring.usage_type=metered`, `meter` field | Out of scope | Out of scope | Out of scope |
| Tiered (graduated/volume) | `billing_scheme=tiered`, `tiers[]` | Out of scope | Out of scope | Out of scope |

**Rationale for scope limits:** Metered and tiered billing require backend infrastructure (usage event ingestion, meter creation) that is not a launch artifact concern. These models are appropriate for Phase 93+ (deploy skill), not Phase 89 (wireframe stage). If LCV revenue streams mentions usage-based pricing, the STR artifact should include a comment placeholder noting that metered billing requires additional backend setup.

**Checkout mode defaults by track:**

| Track | Default `checkout_mode` | Condition to change |
|-------|------------------------|---------------------|
| `solo_founder` | `"subscription"` | Change to `"payment"` only if LCV revenue streams explicitly says one-time |
| `startup_team` | `"subscription"` | Always subscription — investor-ready ARR story requires recurring revenue |
| `product_leader` | `"subscription"` | Always subscription — P&L impact framing requires recurring MRR/ARR |

---

### Placeholder Convention Patterns

All monetary values MUST use `[YOUR_X]` format per `references/business-financial-disclaimer.md`. The following table maps each STR field to its correct placeholder handling:

| STR Field | Placeholder Approach | Example | Rationale |
|-----------|---------------------|---------|-----------|
| `unit_amount` | String placeholder — ALWAYS | `"[YOUR_PRICE_IN_CENTS]"` | Financial prohibition; structural only |
| `currency` | Concrete value — always `"usd"` | `"usd"` | Not a financial value; structural/technical |
| `product.name` | Descriptive string placeholder | `"[YOUR_PRODUCT_NAME]"` | No dollar amount involved |
| `product.description` | Descriptive string placeholder | `"[YOUR_PRODUCT_DESCRIPTION]"` | No dollar amount involved |
| `prices[].nickname` | Descriptive from LCV revenue streams | `"Starter"` or `"[YOUR_PLAN_NAME e.g. Starter]"` | May be concrete if LCV has named tiers |
| `prices[].lookup_key` | Structured placeholder | `"[YOUR_LOOKUP_KEY_STARTER]"` | Must be unique per price |
| `trial_period_days` | `null` or integer placeholder | `null` or `"[YOUR_TRIAL_DAYS]"` | Use `null` when LCV is silent on trials; use integer string if LCV mentions a specific trial |
| `recurring.interval` | Concrete — `"month"` or `"year"` | `"month"` | Technical routing — not a financial value |
| `recurring.interval_count` | Concrete integer | `1` | Technical — always 1 for standard billing |
| `checkout_mode` | Concrete — `"subscription"` or `"payment"` | `"subscription"` | Technical routing — not financial |

**Naming pattern for plan nicknames:** When LCV revenue streams box 9 is status `unknown` (no tier names provided), use the generic placeholder format: `"[YOUR_PLAN_NAME e.g. Starter]"`. When LCV provides named tiers (e.g., "Hobbyist, Creator, Agency"), use those names directly — they are not financial values.

**Annual billing variant lookup key convention:** Append `_ANNUAL` suffix. Examples:
- Monthly Starter: `"[YOUR_LOOKUP_KEY_STARTER]"`
- Annual Starter: `"[YOUR_LOOKUP_KEY_STARTER_ANNUAL]"`
- Monthly Pro: `"[YOUR_LOOKUP_KEY_PRO]"`
- Annual Pro: `"[YOUR_LOOKUP_KEY_PRO_ANNUAL]"`

**Currency placeholder question:** The `currency` field should be `"usd"` as a concrete default, not `"[YOUR_CURRENCY]"`. The financial disclaimer prohibits dollar amounts, not currency codes. Using `"usd"` is not a financial value claim. If the project signals a non-USD market (e.g., UK, EU, APAC signals in BRF), the STR generation step should emit a WARNING: "Currency defaulted to USD — verify against your Stripe account's supported currencies."

---

### Stripe Test Key Format

**Verified against Stripe official docs (docs.stripe.com/keys):**

| Key Type | Format | Example from official docs |
|----------|--------|---------------------------|
| Publishable test key | `pk_test_...` | `pk_test_REPLACE_WITH_YOUR_KEY` |
| Secret test key | `sk_test_...` | `sk_test_REPLACE_WITH_YOUR_KEY` |
| Publishable live key | `pk_live_...` | (never in code) |
| Secret live key | `sk_live_...` | (never in code; never in STR artifact) |

**STR artifact placeholder pattern:** The STR artifact does NOT include API keys — keys belong in environment variables (`.env.local`), not in a design planning artifact. However, the STR artifact SHOULD include a `_meta.integration_notes` field with guidance:

```json
"_meta": {
  "stripe_key_env_var": "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "stripe_key_format": "pk_test_REPLACE_WITH_YOUR_KEY (test) / pk_live_REPLACE_WITH_YOUR_KEY (live)",
  "note": "Never commit API keys to version control. Set via .env.local or Vercel environment variables."
}
```

This `_meta` field is non-standard (Stripe ignores unknown top-level fields when the JSON is used to provision via API), but serves as human-readable integration guidance within the artifact file.

---

### LCV Revenue Streams to Pricing Tier Mapping

The Lean Canvas (LCV artifact, box 9) Revenue Streams box maps to STR tiers as follows:

| LCV Box 9 State | STR Generation Behavior |
|----------------|------------------------|
| `status: validated`, named tiers present | Use LCV tier names directly as price nicknames; derive `checkout_mode` from revenue model type |
| `status: assumed`, revenue model described (e.g., "monthly subscription") | Use descriptive placeholder names matching the assumed model; set `checkout_mode` accordingly |
| `status: unknown`, no tier structure | Apply track-default tier count and generic placeholders |
| LCV mentions "freemium" | Add a free tier entry with `unit_amount: 0` (this IS a concrete integer — zero cost is not a prohibited financial value) |
| LCV mentions "annual discount" | Add annual billing variant entries with `_ANNUAL` lookup key suffix |
| LCV mentions "enterprise / custom pricing" | Add enterprise tier with `unit_amount: "[YOUR_PRICE_IN_CENTS]"` and `"contact_sales": true` in metadata |

**Revenue model signal parsing for `checkout_mode`:**

| LCV Revenue Streams Signal | `checkout_mode` |
|---------------------------|----------------|
| "monthly", "subscription", "SaaS", "recurring" | `"subscription"` |
| "one-time", "purchase", "license fee", "template", "course" | `"payment"` |
| "freemium", "free tier + paid upgrade" | `"subscription"` (free tier uses `unit_amount: 0`) |
| No signal | Default to `"subscription"` |

---

### Competitive Pricing Positioning

Phase 86 produces the MLS (Market Landscape) artifact in `.planning/design/strategy/MLS-market-landscape-v{N}.md`. The STR artifact reads this for tier structure cues, not for specific dollar amounts.

**What the STR step reads from MLS:**

| MLS Data Point | How STR Uses It |
|---------------|----------------|
| Number of pricing tiers typical in category | Informs default tier count (if LCV is silent) |
| Competitor tier names (Starter/Pro/Enterprise, Free/Hobby/Business) | Suggests naming conventions for plan nicknames |
| Pricing model category convention (seat-based, usage-based, flat-rate) | Confirms appropriate `billing_scheme` and `recurring.usage_type` |
| Free trial conventions (standard in category or not) | Informs `trial_period_days` default (null vs integer placeholder) |

**What the STR step does NOT use from MLS:** Specific dollar amounts from competitor pricing. The MLS artifact itself uses `[Source required]` for unverified market sizing figures (per Phase 86 design). STR must not infer unit prices from competitor data — that would violate the financial prohibition.

**Positioning signal in STR artifact `_meta`:** The STR artifact includes a `_meta.competitive_positioning` comment field (non-functional for Stripe API) that the user can populate:

```json
"_meta": {
  "competitive_positioning": "[YOUR_POSITIONING_RELATIVE_TO_MARKET: premium/market-rate/undercut]",
  "positioning_note": "Set unit_amount values relative to your competitive positioning. See MLS artifact for category pricing conventions."
}
```

---

### Track-Specific Tier Defaults

These defaults apply when LCV box 9 is status `unknown`. When LCV has explicit tier content, follow LCV over these defaults.

#### solo_founder — 2 tiers (Free/Paid or Starter/Pro)

**Rationale:** Solo founders typically launch with a simple binary model: free (to build audience/validate) and paid (core product). Three tiers adds marketing complexity without PMF evidence.

```json
{
  "product": {
    "name": "[YOUR_PRODUCT_NAME]",
    "description": "[YOUR_PRODUCT_DESCRIPTION]",
    "metadata": {}
  },
  "prices": [
    {
      "nickname": "[YOUR_PLAN_NAME e.g. Free]",
      "currency": "usd",
      "unit_amount": 0,
      "lookup_key": "[YOUR_LOOKUP_KEY_FREE]",
      "trial_period_days": null
    },
    {
      "nickname": "[YOUR_PLAN_NAME e.g. Pro]",
      "currency": "usd",
      "unit_amount": "[YOUR_PRICE_IN_CENTS]",
      "recurring": { "interval": "month", "interval_count": 1 },
      "lookup_key": "[YOUR_LOOKUP_KEY_PRO]",
      "trial_period_days": null
    }
  ],
  "checkout_mode": "subscription",
  "_meta": {
    "track": "solo_founder",
    "tier_rationale": "2-tier free/paid model. Replace [YOUR_PRICE_IN_CENTS] with your monthly price in cents (e.g., 900 for $9.00). [VERIFY FINANCIAL ASSUMPTIONS]",
    "stripe_key_env_var": "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "stripe_key_format": "pk_test_REPLACE_WITH_YOUR_KEY"
  }
}
```

**Note on `unit_amount: 0` for free tier:** Zero is a concrete integer, not a financial assertion. This is structurally correct and not prohibited by the financial disclaimer. Free tiers with `unit_amount: 0` are a standard Stripe pattern for freemium.

#### startup_team — 3 tiers (Starter/Pro/Enterprise) with annual variants

**Rationale:** Startup teams need a pricing ladder that demonstrates CAC recovery and LTV growth for investors. Three tiers is the standard SaaS positioning (accessible entry, main monetization, high-value enterprise). Annual variants are included because ARR storytelling requires visible annual commitment option.

```json
{
  "product": {
    "name": "[YOUR_PRODUCT_NAME]",
    "description": "[YOUR_PRODUCT_DESCRIPTION]",
    "metadata": {}
  },
  "prices": [
    {
      "nickname": "[YOUR_PLAN_NAME e.g. Starter]",
      "currency": "usd",
      "unit_amount": "[YOUR_PRICE_IN_CENTS]",
      "recurring": { "interval": "month", "interval_count": 1 },
      "lookup_key": "[YOUR_LOOKUP_KEY_STARTER]",
      "trial_period_days": "[YOUR_TRIAL_DAYS]"
    },
    {
      "nickname": "[YOUR_PLAN_NAME e.g. Pro]",
      "currency": "usd",
      "unit_amount": "[YOUR_PRICE_IN_CENTS]",
      "recurring": { "interval": "month", "interval_count": 1 },
      "lookup_key": "[YOUR_LOOKUP_KEY_PRO]",
      "trial_period_days": "[YOUR_TRIAL_DAYS]"
    },
    {
      "nickname": "[YOUR_PLAN_NAME e.g. Pro Annual]",
      "currency": "usd",
      "unit_amount": "[YOUR_PRICE_IN_CENTS]",
      "recurring": { "interval": "year", "interval_count": 1 },
      "lookup_key": "[YOUR_LOOKUP_KEY_PRO_ANNUAL]",
      "trial_period_days": null
    },
    {
      "nickname": "[YOUR_PLAN_NAME e.g. Enterprise]",
      "currency": "usd",
      "unit_amount": "[YOUR_PRICE_IN_CENTS]",
      "recurring": { "interval": "year", "interval_count": 1 },
      "lookup_key": "[YOUR_LOOKUP_KEY_ENTERPRISE]",
      "trial_period_days": null,
      "metadata": { "contact_sales": "true" }
    }
  ],
  "checkout_mode": "subscription",
  "_meta": {
    "track": "startup_team",
    "tier_rationale": "3-tier Starter/Pro/Enterprise model with annual Pro variant. [VERIFY FINANCIAL ASSUMPTIONS] Replace all [YOUR_PRICE_IN_CENTS] with actual amounts in cents before Stripe provisioning.",
    "stripe_key_env_var": "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "stripe_key_format": "pk_test_REPLACE_WITH_YOUR_KEY",
    "competitive_positioning": "[YOUR_POSITIONING_RELATIVE_TO_MARKET: premium/market-rate/undercut]"
  }
}
```

#### product_leader — 2 tiers (Team/Enterprise) with annual emphasis

**Rationale:** Product leaders operate within an organization selling to enterprise buyers. Pricing is typically annual-only, seat-based or flat enterprise license. Self-serve "Starter" tiers are irrelevant. Two tiers with annual billing emphasis matches the P&L vocabulary of the track.

```json
{
  "product": {
    "name": "[YOUR_PRODUCT_NAME]",
    "description": "[YOUR_PRODUCT_DESCRIPTION]",
    "metadata": {}
  },
  "prices": [
    {
      "nickname": "[YOUR_PLAN_NAME e.g. Team]",
      "currency": "usd",
      "unit_amount": "[YOUR_PRICE_IN_CENTS]",
      "recurring": { "interval": "year", "interval_count": 1 },
      "lookup_key": "[YOUR_LOOKUP_KEY_TEAM_ANNUAL]",
      "trial_period_days": null
    },
    {
      "nickname": "[YOUR_PLAN_NAME e.g. Enterprise]",
      "currency": "usd",
      "unit_amount": "[YOUR_PRICE_IN_CENTS]",
      "recurring": { "interval": "year", "interval_count": 1 },
      "lookup_key": "[YOUR_LOOKUP_KEY_ENTERPRISE_ANNUAL]",
      "trial_period_days": null,
      "metadata": { "contact_sales": "true" }
    }
  ],
  "checkout_mode": "subscription",
  "_meta": {
    "track": "product_leader",
    "tier_rationale": "2-tier Team/Enterprise model with annual billing. [VERIFY FINANCIAL ASSUMPTIONS] Enterprise tier typically requires sales-assisted pricing — set contact_sales metadata accordingly.",
    "stripe_key_env_var": "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "stripe_key_format": "pk_test_REPLACE_WITH_YOUR_KEY",
    "packaging_note": "Align with your organization P&L model. See MLS artifact for market packaging conventions."
  }
}
```

---

### STR Artifact Format Recommendation

**Format: JSON (`.json` extension) — confirmed correct.**

This was already locked in the existing research as `.planning/design/launch/STR-stripe-pricing-v{N}.json`. The deep-dive confirms this choice is correct for the following reasons:

| Criterion | JSON | YAML | Markdown with embedded JSON |
|-----------|------|------|----------------------------|
| Stripe API compatibility | Direct — the JSON can be adapted for API calls | Requires conversion | Requires extraction |
| Human readability | Moderate — field names are self-describing | Higher | Highest |
| Phase 93+ deploy skill consumption | Direct `JSON.parse()` | Requires `js-yaml` | Requires regex extraction |
| Validation (financial check) | `grep -qE '"unit_amount": [0-9]'` works directly | Requires YAML parser | More complex |
| Existing project convention | Already in launch-frameworks.md as JSON | Not used elsewhere for artifacts | Not used for machine-readable artifacts |

**`_meta` field:** The `_meta` top-level key is non-standard for Stripe's API but serves as embedded documentation within the artifact. When the deploy skill (Phase 93+) reads the STR artifact, it must skip `_meta` when constructing Stripe API calls. Include this note in the `_meta` block itself:

```json
"_meta": {
  "_note": "This field is for human guidance only. Skip when constructing Stripe API calls.",
  ...
}
```

**Versioning:** `STR-stripe-pricing-v{N}.json` where `{N}` matches the wireframe version number. This is already locked in the existing research.

**Connection to existing `references/launch-frameworks.md` schema:** The Pricing Config Schema in launch-frameworks.md (lines 134-156) shows the base single-tier template. The deep-dive additions (track-specific tier counts, `_meta` field, `unit_amount: 0` for free tiers, annual variants) extend but do not contradict that schema. The launch-frameworks.md Pricing Config Schema section needs no updates — the extension logic lives in wireframe.md Step 4i as conditional instruction prose.

---

### Summary of Additions to Existing Research

The existing research (lines 1-722) correctly establishes:
- STR artifact code, path, domain (all confirmed correct)
- `unit_amount` must be string placeholder (confirmed by API schema: it IS an integer in Stripe's API, meaning the placeholder is intentionally non-API-ready)
- `checkout_mode` routing for subscription vs payment (confirmed)
- Multi-tier pricing pattern (confirmed and extended)
- Track-default tier counts (2/3/2 — confirmed appropriate)

New findings from this deep-dive:
- `currency: "usd"` is a concrete default (not a placeholder) — not a financial value
- `unit_amount: 0` for free tiers is a valid concrete integer — zero cost is not prohibited
- `trial_period_days` in STR price object maps to `subscription_data.trial_period_days` in Checkout Session — deploy skill (Phase 93+) must handle this translation
- Annual billing variants should use `_ANNUAL` lookup key suffix (naming convention clarified)
- `_meta` field pattern for integration notes, competitive positioning, key format guidance
- `startup_team` default includes 4 price entries (Starter monthly + Pro monthly + Pro annual + Enterprise annual) not 3 — the "3 tiers" is marketing tiers, but the JSON has 4 price objects
- `product_leader` enterprise tier uses `"contact_sales": "true"` in metadata, annual billing only

---

### Deep Dive Sources

| Source | Confidence | What Was Verified |
|--------|-----------|-------------------|
| [Stripe Create a Price — API Reference](https://docs.stripe.com/api/prices/create) | HIGH | All Price fields, types, required/optional status, `unit_amount` type (integer), `billing_scheme` enum values, `recurring` sub-fields |
| [Stripe Create a Product — API Reference](https://docs.stripe.com/api/products/create) | HIGH | Product fields, `name` as only required field, `marketing_features`, `metadata` |
| [Stripe Checkout Session — API Reference](https://docs.stripe.com/api/checkout/sessions/create) | HIGH | `mode` enum values, `line_items` structure, `subscription_data.trial_period_days` |
| [Stripe Configure free trials](https://docs.stripe.com/payments/checkout/free-trials) | HIGH | `subscription_data.trial_period_days` placement in Checkout Session, max 730 days, `payment_method_collection=if_required` |
| [Stripe API Keys](https://docs.stripe.com/keys) | HIGH | `pk_test_` and `sk_test_` prefix format; placeholder format in Stripe documentation examples |
| [Stripe Recurring Pricing Models](https://docs.stripe.com/products-prices/pricing-models) | HIGH | Flat rate, per-seat, tiered, usage-based model taxonomy |
| [Stripe Per-Seat Pricing](https://docs.stripe.com/subscriptions/pricing-models/per-seat-pricing) | MEDIUM | `recurring.usage_type=licensed` for per-seat; `quantity` per subscription |
