# Architecture Research

**Domain:** Business product type integration — PDE v0.12
**Researched:** 2026-03-22
**Confidence:** HIGH (based on direct codebase analysis of v0.11 experience type as the direct precedent)

---

> **Scope note:** This file covers the v0.12 business product type milestone ONLY.
> Existing PDE architecture (event bus, tmux dashboard, workflow engine, state model, Stitch integration) is documented in PROJECT.md.
> The v0.11 experience type implementation is the primary architectural precedent for all patterns used here.

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                       Skills Layer (slash commands)                   │
│  /pde:brief  /pde:competitive  /pde:flows  /pde:wireframe  ...       │
│  + NEW: /pde:deploy (launch scaffolding with human approval gates)   │
├──────────────────────────────────────────────────────────────────────┤
│                   Workflow Engine (14 .md workflow files)             │
│                                                                       │
│  EXISTING (conditional blocks added)       NEW                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐  ┌──────────────────────┐  │
│  │ brief.md │ │competit. │ │ flows.md │  │  deploy.md           │  │
│  │ +BIZ blk │ │ +BIZ blk │ │ +BIZ blk │  │  (launch scaffold)   │  │
│  └──────────┘ └──────────┘ └──────────┘  └──────────────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                             │
│  │system.md │ │wirfrm.md │ │ handoff  │                             │
│  │ +BIZ blk │ │ +BIZ blk │ │ +BIZ blk │                             │
│  └──────────┘ └──────────┘ └──────────┘                             │
├──────────────────────────────────────────────────────────────────────┤
│                     State Layer (.planning/design/)                   │
│  ┌───────────────────────────┐  ┌────────────────────────────────┐  │
│  │   design-manifest.json    │  │       DESIGN-STATE.md          │  │
│  │                           │  │                                │  │
│  │  productType: "software"  │  │  Quick Reference table         │  │
│  │  businessMode: true/false │  │  + business: [on/off] row      │  │
│  │  businessTrack: "solo"    │  │  Artifact Index (all codes)    │  │
│  │  designCoverage: {        │  └────────────────────────────────┘  │
│  │    ...16 existing flags.. │                                       │
│  │    hasBusinessThesis: bool│  (NEW coverage flags added to the    │
│  │    hasMarketLandscape:bool│   existing 16-field object — total   │
│  │    hasServiceBlueprint:   │   becomes 20 fields)                 │
│  │    hasLaunchKit: bool     │                                       │
│  │  }                        │                                       │
│  └───────────────────────────┘                                       │
├──────────────────────────────────────────────────────────────────────┤
│                  Artifact Storage (.planning/design/)                 │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  strategy/    ux/             visual/        launch/ (NEW)   │   │
│  │  BRF-*        FLW-* (ops)     SYS-brand-*    LKT-launchkit-*│   │
│  │  BTH-*        SBP-*           MKT-market-*   LDP-landing-*  │   │
│  │  MLS-*                                       STR-pricing-*  │   │
│  │                                              CNT-calendar-* │   │
│  │                                              OTR-outreach-* │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | New vs Modified |
|-----------|----------------|-----------------|
| `design-manifest.json` (template) | Registry for artifacts + coverage flags | MODIFIED — add `businessMode`, `businessTrack` top-level fields; add 4 new coverage flags to `designCoverage` |
| `workflows/brief.md` | Product type detection + brief sections | MODIFIED — add `business:` signal detection, 5 business sections, write `businessMode`/`businessTrack` to manifest |
| `workflows/competitive.md` | Competitive analysis | MODIFIED — add market landscape path when `businessMode === true` |
| `workflows/opportunity.md` | RICE scoring | MODIFIED — add business initiative scoring when `businessMode === true` |
| `workflows/flows.md` | User journey mapping | MODIFIED — add operational and service flow paths when `businessMode === true` |
| `workflows/system.md` | Design system + brand tokens | MODIFIED — add brand/marketing system sections when `businessMode === true` |
| `workflows/wireframe.md` | Wireframe generation | MODIFIED — add service blueprint (SBP) + landing page (LDP) paths when `businessMode === true` |
| `workflows/handoff.md` | Implementation handoff | MODIFIED — add launch kit (LKT) assembly when `businessMode === true` |
| `workflows/critique.md` | Design critique | MODIFIED — add business alignment perspective when `businessMode === true` |
| `workflows/iterate.md` | Design iteration | MODIFIED — guard stub (same pattern as v0.11 experience stubs) |
| `workflows/mockup.md` | Hi-fi mockup | MODIFIED — guard stub (same pattern as v0.11 experience stubs) |
| `workflows/hig.md` | Interface guidelines | MODIFIED — add business communications HIG when `businessMode === true` |
| `workflows/recommend.md` | Tool discovery | MODIFIED — add business tool category (Stripe MCP, Resend MCP, analytics) when `businessMode === true` |
| `workflows/build.md` | Pipeline orchestrator | MODIFIED — add `deploy` as Stage 14 when `businessMode === true` |
| `workflows/deploy.md` | Deployment scaffolding | NEW — Next.js landing page, Stripe config, Resend templates, Vercel deploy with approval gates |
| `references/business-track.md` | Track definitions (solo/startup/leader) | NEW — shared reference loaded by all business-mode workflows |
| `references/launch-frameworks.md` | Lean canvas, GTM templates, investor narrative | NEW — business artifact templates analogous to `experience-disclaimer.md` |
| `commands/deploy.md` | `/pde:deploy` slash command entry point | NEW — follows existing command bootstrap pattern |
| `templates/design-manifest.json` | Schema template | MODIFIED — add new top-level fields and 4 new coverage flags |
| `bin/lib/design.cjs` | Coverage check + manifest ops | MODIFIED — add `launch/` to `ensure-dirs` directory creation list (3 lines) |

---

## Recommended Project Structure

The `business:` layer adds to the existing `.planning/design/` tree without restructuring it:

```
.planning/design/
├── strategy/
│   ├── BRF-brief-v{N}.md              (existing — gains 5 business sections)
│   ├── BTH-thesis-v{N}.md             (NEW — business thesis artifact)
│   ├── MLS-market-landscape-v{N}.md   (NEW — market landscape from competitive)
│   └── ANL-analyst-brief-v*.md        (existing)
├── ux/
│   ├── FLW-flows-v{N}.md              (existing — gains operational/service flow sections)
│   ├── SBP-blueprint-v{N}.md          (NEW — service blueprint from wireframe)
│   └── screen-inventory.json          (existing)
├── visual/
│   ├── SYS-tokens-v*.json             (existing)
│   └── MKT-brand-system-v{N}.md       (NEW — marketing brand system from system.md)
└── launch/                             (NEW directory — created by ensure-dirs)
    ├── LKT-launchkit-v{N}.md          (NEW — assembled launch kit)
    ├── LDP-landing-v{N}.html          (NEW — deployable landing page wireframe)
    ├── STR-pricing-v{N}.json          (NEW — Stripe pricing config spec)
    ├── CNT-calendar-v{N}.md           (NEW — content calendar skeleton)
    └── OTR-outreach-v{N}.md           (NEW — investor/customer outreach sequence)
```

### Structure Rationale

- **strategy/BTH and MLS:** Business thesis and market landscape are strategy-layer outputs. They belong alongside BRF (brief) and CMP (competitive) artifacts — not in a new top-level directory. The artifact code prefix (BTH, MLS) follows the same 3-letter convention as all other artifact codes.
- **ux/SBP:** Service blueprints are a UX discipline output — they map service delivery flows the same way FLW maps user journeys. The `ux/` domain is the correct home.
- **visual/MKT:** Marketing brand system sits adjacent to the design system tokens it extends. It is a visual-layer artifact.
- **launch/:** Launch kit artifacts are fundamentally different from design artifacts — they are executable, deployable files, not design specifications. Isolating them in `launch/` prevents confusion with `ux/` and `visual/` domains and makes the deploy workflow's file reading predictable. The `deploy.md` workflow knows to look in `launch/` for every file it processes.
- **No new top-level sibling to `.planning/design/`:** The business layer composes with the existing design pipeline. It does not fork it. All artifacts stay under `.planning/design/` to keep manifest paths relative and consistent.

---

## Architectural Patterns

### Pattern 1: Orthogonal Dimension via Manifest Flag

**What:** `businessMode` is a boolean top-level field in `design-manifest.json`, set by `brief.md` during Step 4 (product type detection). All downstream workflows read `businessMode` from the manifest at the start of execution. This is separate from `productType` — a project can be `productType: "software"` AND `businessMode: true`. The dimension is additive, not replacing.

**When to use:** Every workflow that needs to branch for business-specific behavior reads `businessMode` from the manifest, not from the brief document. This gives workflows a single authoritative source.

**Implementation pattern (consistent across all 14 workflows):**
```
Read manifest early in Step 2 (prerequisites):
  businessMode = manifest.businessMode ?? false
  businessTrack = manifest.businessTrack ?? "solo"

...existing workflow steps unchanged...

<!-- Business product type — Phase N: [description] -->
IF businessMode === true:
  → execute business-specific path or additional sections
  → vocabulary and depth determined by businessTrack
ELSE:
  → skip (no output for non-business projects)
<!-- End business product type block -->
```

**Why not a new `productType` value:** Experience type demonstrated that adding a new productType creates exclusive branches — experience products bypass software wireframes entirely. Business is orthogonal: a software product being launched still needs wireframes AND a service blueprint. Using `productType = "business"` would force either/or logic where both/and is correct. `businessMode` preserves both.

**Confidence:** HIGH — matches the existing `experienceSubType` metadata pattern and the `SUPPRESS_TOKEN_FINDINGS` per-artifact flag pattern from critique.md.

### Pattern 2: Track-Aware Vocabulary via Single Reference File

**What:** `references/business-track.md` defines how each of the three user tracks differs in vocabulary, output depth, and artifact format. Workflows load this reference via `@references/business-track.md` in `<required_reading>` blocks. The `businessTrack` field from the manifest selects the applicable register.

**Track resolution in brief.md Step 4:**
```
Track signals detected after businessMode = true is set:
  "solo": "solo", "indie", "solo founder", "one person", "bootstrapped", "side project"
  "startup": "startup", "seed", "early stage", "founding team", "co-founder", "pre-seed"
  "leader": "product leader", "PM", "head of product", "enterprise", "director", "VP"
  default: "solo" if ambiguous or no signals
```

**Track effects on output:**

| Track | Vocabulary | Artifact Depth | Key Format |
|-------|-----------|---------------|------------|
| solo | Plain English, lean | Essentials only, 1-pagers | Skimmable, action-focused |
| startup | Standard startup language | Full artifacts, investor-ready | Deck-compatible, metric-forward |
| leader | Enterprise / product language | Executive summary + detail | Board-ready, stakeholder-formatted |

The reference file defines concrete vocabulary substitutions (e.g., "revenue goal" vs "ARR target" vs "P&L impact") and section depth tables so workflows do not need to hard-code track logic.

### Pattern 3: New Coverage Flags Follow the 16-Field Pass-Through Contract

**What:** Four new boolean flags are added to the `designCoverage` object in `design-manifest.json`, growing it from 16 to 20 fields. Every workflow that writes `designCoverage` must read all 20 fields first, then write the full merged object with only its own flag flipped. The pass-through pattern is identical to the existing behavior — only the field count grows.

**New flags:**
- `hasBusinessThesis` — set by `brief.md` when BTH artifact is written
- `hasMarketLandscape` — set by `competitive.md` when MLS artifact is written
- `hasServiceBlueprint` — set by `wireframe.md` when SBP artifact is written
- `hasLaunchKit` — set by `handoff.md` when LKT artifact is assembled

**Critical constraint:** All 14 existing workflows that write `designCoverage` must be updated to include the 4 new flags in their write objects (as `{current}` pass-through). This is the cross-cutting audit analogous to v0.11 Phase 83 which found 10 broken workflows clobbering `hasPrintCollateral` and `hasProductionBible`.

**Example updated write call (brief.md setting hasBusinessThesis):**
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},
    "hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},
    "hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},
    "hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},
    "hasRecommendations":{current},"hasStitchWireframes":{current},
    "hasPrintCollateral":{current},"hasProductionBible":{current},
    "hasBusinessThesis":true,"hasMarketLandscape":{current},
    "hasServiceBlueprint":{current},"hasLaunchKit":{current}}'
```

### Pattern 4: Deploy Workflow as Guarded New Skill

**What:** `workflows/deploy.md` is a new workflow file — not a modification of handoff. It is only invocable when `businessMode === true`. The build orchestrator conditionally adds a `deploy` stage at index 14 only for business-mode projects.

**Guard in build.md:**
```
After reading manifest in Step 1:
  businessMode = manifest.businessMode ?? false

STAGES definition:
  Stages 1-13: unchanged (recommend through handoff)
  IF businessMode === true:
    Stage 14: deploy | pde:deploy | coverage | hasLaunchKit
  ELSE:
    STAGES ends at index 13
```

**Human approval gates (mandatory, every external write):**

Deploy workflow must halt before any action that writes outside `.planning/` or calls an external CLI:

| Gate Point | What User Sees | CLI Call |
|-----------|----------------|----------|
| Next.js scaffold | File list to be created, target directory | User types "yes" or "no" |
| Stripe config write | Full JSON to be written | User types "yes" or "no" |
| Resend template stubs | Template content preview | User types "yes" or "no" |
| `vercel --dry-run` | Dry run output shown | No approval — display only |
| `vercel deploy` | Dry run output + "Deploy now?" | User types "yes" or "no" |

This follows the VAL-03 write-back confirmation gate pattern from the MCP integration layer. Halt on "no" at any gate — do not proceed to the next step.

---

## Data Flow

### Business Mode Activation Flow

```
User writes PROJECT.md with business signals
    ↓
/pde:brief Step 4: detect product type (existing) + business mode (new)
    ↓
manifest-set-top-level productType {type}          (existing behavior)
manifest-set-top-level businessMode true            (NEW)
manifest-set-top-level businessTrack "solo"         (NEW)
    ↓
Step 5: write BRF artifact with 5 business sections (NEW conditional block)
    ↓
Step 7: set designCoverage with hasBusinessThesis: true (NEW in merged object)
    ↓
All downstream workflows read manifest → businessMode gate activates
```

### Business Pipeline Data Flow

```
BRF-brief (businessThesis, targetMarket, revenueModel, businessTrack)
    ↓
competitive.md (businessMode=true → MLS path)
  → MLS-market-landscape (TAM/SAM/SOM, competitive map, business RICE)
  → designCoverage.hasMarketLandscape = true
    ↓
opportunity.md (businessMode=true → business initiative scoring)
  → OPP artifact gains business initiative rows alongside standard RICE
    ↓
flows.md (businessMode=true → Step 4-BIZ operational + service flows)
  → FLW artifact gains operational journey + customer lifecycle sections
  → designCoverage.hasFlows = true (existing flag, extended content)
    ↓
system.md (businessMode=true → brand + marketing system sections)
  → MKT-brand-system (positioning, messaging hierarchy, voice/tone)
  → designCoverage.hasDesignSystem = true (existing flag, extended content)
    ↓
wireframe.md (businessMode=true → Step 4-BIZ service blueprint + landing page)
  → LDP-landing-v{N}.html (deployable landing page wireframe)
  → SBP-blueprint-v{N}.md (service blueprint)
  → designCoverage.hasWireframes = true, hasServiceBlueprint = true
    ↓
critique.md (businessMode=true → business alignment perspective added)
  → CRT artifact gains business alignment section
    ↓
handoff.md (businessMode=true → Step 7-BIZ launch kit assembly)
  → LKT-launchkit-v{N}.md (assembled: thesis + market + pricing + calendar + outreach)
  → STR-pricing-v{N}.json, CNT-calendar-v{N}.md, OTR-outreach-v{N}.md
  → designCoverage.hasLaunchKit = true
    ↓
deploy.md (NEW Stage 14, businessMode=true only)
  → Human approval → Next.js scaffold
  → Human approval → Stripe config write
  → Human approval → Resend template stubs
  → vercel --dry-run → Human approval → vercel deploy
  → artifacts.DEPLOY registered in manifest with deployment URL
```

### How business: Composes With All Product Types

```
productType = "software"    businessMode = false  →  Standard 13-stage pipeline (unchanged)
productType = "software"    businessMode = true   →  13-stage software path + Stage 14 deploy
productType = "hardware"    businessMode = true   →  13-stage hardware path + Stage 14 deploy
productType = "hybrid"      businessMode = true   →  13-stage hybrid path + Stage 14 deploy
productType = "experience"  businessMode = false  →  13-stage experience path (v0.11, unchanged)
productType = "experience"  businessMode = true   →  13-stage experience path + Stage 14 deploy
```

The business layer is purely additive. The experience type's exclusive branches (FLP replaces WFR, BIB replaces HND for non-hybrid-event) are unaffected. Business-mode adds conditional sections inside existing workflows and appends Stage 14 to the pipeline — it never replaces existing stages.

---

## New vs Modified File Inventory

### New Files

| File | Purpose | Why New |
|------|---------|---------|
| `workflows/deploy.md` | Launch scaffolding with human approval gates | No existing workflow handles filesystem scaffolding outside `.planning/` or CLI deployment |
| `commands/deploy.md` | `/pde:deploy` slash command entry point | New user-facing command following existing command bootstrap pattern |
| `references/business-track.md` | Track vocabulary and depth definitions for solo/startup/leader | Shared reference for all 14+ workflows — avoids duplicating track logic in each workflow |
| `references/launch-frameworks.md` | Lean canvas, GTM templates, investor narrative templates | Business artifact template library analogous to `experience-disclaimer.md` |

### Modified Files

| File | Modification | Estimated Scope |
|------|-------------|-----------------|
| `workflows/brief.md` | Step 4: add business signal detection + track detection; Step 5: add 5 business sections (gated); Step 7: set `businessMode`, `businessTrack`, `hasBusinessThesis` in manifest | ~100 lines added |
| `workflows/competitive.md` | Context routing: read `businessMode`; output: add MLS market landscape path | ~80 lines added |
| `workflows/opportunity.md` | Add business initiative RICE scoring path when `businessMode === true` | ~60 lines added |
| `workflows/flows.md` | Add Step 4-BIZ block for operational and service flows (parallel to Step 4-EXP pattern) | ~150 lines added |
| `workflows/system.md` | Add Step N-BIZ for brand system + marketing messaging sections | ~80 lines added |
| `workflows/wireframe.md` | Add SBP (service blueprint) and LDP (landing page) generation paths (parallel to FLP/TML for experience) | ~200 lines added |
| `workflows/critique.md` | Add business alignment perspective section when `businessMode === true` | ~50 lines added |
| `workflows/handoff.md` | Add Step 7-BIZ launch kit assembly (LKT, STR, CNT, OTR artifacts) | ~150 lines added |
| `workflows/hig.md` | Add business communications HIG when `businessMode === true` | ~40 lines added |
| `workflows/recommend.md` | Add business tool category (Stripe MCP, Resend MCP, analytics tools) | ~40 lines added |
| `workflows/iterate.md` | Add guard stub (same 5-line comment pattern as v0.11 experience stubs) | ~5 lines added |
| `workflows/mockup.md` | Add guard stub (same 5-line comment pattern as v0.11 experience stubs) | ~5 lines added |
| `workflows/build.md` | Add conditional Stage 14 (deploy) when `businessMode === true`; read manifest earlier | ~30 lines added |
| `templates/design-manifest.json` | Add `businessMode: false`, `businessTrack: null` top-level fields; add 4 new `designCoverage` flags | ~10 lines modified |
| `bin/lib/design.cjs` | Add `launch/` to the `ensure-dirs` directory creation list | ~3 lines modified |
| **All 14 designCoverage-writing workflows** | Add 4 new flags to every `manifest-set-top-level designCoverage` call (as `{current}` pass-through) | ~4 lines per workflow = ~56 lines total across the audit phase |

---

## Integration Points

### Business Signal Detection (brief.md Step 4)

New signal set added to the existing software/hardware/experience classification block. Detection is orthogonal — `businessMode` is set independently of `productType`:

```
Business signals: "launch", "go-to-market", "GTM", "revenue model", "pricing",
  "investor", "fundraising", "seed", "Series A", "pitch deck", "venture",
  "startup", "founder", "bootstrapped", "SaaS pricing", "market fit", "PMF",
  "customer acquisition", "CAC", "LTV", "churn", "runway", "MRR", "ARR",
  "business model", "monetization", "subscription", "freemium", "enterprise sales",
  "go live", "launch date", "pre-launch", "waitlist", "landing page", "domain"

IF business signals present:
  SET businessMode = true
  DETECT businessTrack from secondary signals (solo/startup/leader)
  SET businessTrack = detected track or "solo" default
ELSE:
  SET businessMode = false
  SET businessTrack = null
```

This runs AFTER the existing software/hardware/experience classification. Both axes are independently detected.

### Manifest Top-Level Fields Added

```json
{
  "productType": "software | hardware | hybrid | experience",
  "experienceSubType": "single-night | multi-day | recurring-series | installation | hybrid-event | null",
  "businessMode": false,
  "businessTrack": "solo | startup | leader | null"
}
```

`businessMode` defaults to `false` in the manifest template. All existing projects that lack the field read it as `false` (via `?? false` null-coalescing in workflows) — no migration needed.

### designCoverage Schema Evolution (16 → 20 fields)

```json
{
  "_comment": "v0.12 adds 4 new flags at the bottom. All 20 must be preserved in every write.",
  "hasDesignSystem": false,
  "hasWireframes": false,
  "hasFlows": false,
  "hasHardwareSpec": false,
  "hasCritique": false,
  "hasIterate": false,
  "hasHandoff": false,
  "hasIdeation": false,
  "hasCompetitive": false,
  "hasOpportunity": false,
  "hasMockup": false,
  "hasHigAudit": false,
  "hasRecommendations": false,
  "hasStitchWireframes": false,
  "hasPrintCollateral": false,
  "hasProductionBible": false,
  "hasBusinessThesis": false,
  "hasMarketLandscape": false,
  "hasServiceBlueprint": false,
  "hasLaunchKit": false
}
```

### New Artifact Codes

| Code | Artifact | Producer | Coverage Flag | Storage Path |
|------|----------|----------|---------------|-------------|
| `BTH` | Business Thesis | `brief.md` | `hasBusinessThesis` | `strategy/BTH-thesis-v{N}.md` |
| `MLS` | Market Landscape | `competitive.md` | `hasMarketLandscape` | `strategy/MLS-market-landscape-v{N}.md` |
| `MKT` | Brand/Marketing System | `system.md` | (child of `hasDesignSystem`) | `visual/MKT-brand-system-v{N}.md` |
| `SBP` | Service Blueprint | `wireframe.md` | `hasServiceBlueprint` | `ux/SBP-blueprint-v{N}.md` |
| `LKT` | Launch Kit | `handoff.md` | `hasLaunchKit` | `launch/LKT-launchkit-v{N}.md` |
| `LDP` | Landing Page Wireframe | `wireframe.md` | (child of `hasWireframes`) | `launch/LDP-landing-v{N}.html` |
| `STR` | Stripe Pricing Config | `handoff.md` | (child of `hasLaunchKit`) | `launch/STR-pricing-v{N}.json` |
| `CNT` | Content Calendar | `handoff.md` | (child of `hasLaunchKit`) | `launch/CNT-calendar-v{N}.md` |
| `OTR` | Outreach Sequence | `handoff.md` | (child of `hasLaunchKit`) | `launch/OTR-outreach-v{N}.md` |
| `DEPLOY` | Deployment Record | `deploy.md` | (no coverage flag) | manifest only |

**Coverage flag assignment rationale:** Only artifacts that represent a significant design category get their own coverage flag. Child artifacts (LDP, STR, CNT, OTR, MKT) are subcomponents of their parent category's flag. This follows the same principle as how `hasWireframes` covers all WFR-{slug} artifacts without a separate flag per screen.

### External Services (deploy.md only)

| Service | Integration Pattern | Approval Gate |
|---------|---------------------|---------------|
| Vercel | `vercel` CLI via Bash tool — dry-run first, deploy on approval | Hard gate before `vercel deploy` |
| Next.js | File scaffolding via Write tool to project directory outside `.planning/` | Hard gate showing full file list |
| Stripe | Config spec written to `STR-pricing-v{N}.json` — no live Stripe API calls | Hard gate before writing |
| Resend | Template stubs written as markdown files — no live API calls | Hard gate before writing |

No new MCP server registrations are required for deploy.md. Stripe and Resend are write-side config generation only — no read-side API calls in the pipeline.

---

## Anti-Patterns

### Anti-Pattern 1: Treating business: as a New productType Value

**What people do:** Add `"business"` as a valid value for `productType` in brief detection.
**Why it's wrong:** A business-mode project is still software, hardware, hybrid, or experience at the product design layer. Setting `productType = "business"` would force exclusive branches throughout all 14 workflows (what wireframes does a "business" product get?), break the experience type's exclusive-branch system, and destroy the composability goal entirely.
**Do this instead:** Use `businessMode: true` as an orthogonal flag alongside the existing `productType`. The manifest holds both. Workflows read both independently.

### Anti-Pattern 2: Storing Launch Kit Artifacts Under ux/ or visual/

**What people do:** Store `LDP-landing-v1.html` under `ux/` alongside wireframes, or `STR-pricing.json` under `visual/`.
**Why it's wrong:** Launch kit artifacts are pre-deployment executables, not design specifications. Mixing them into `ux/` confuses the handoff consumer (which reads `ux/` for component specs) and makes the deploy workflow's file discovery non-deterministic.
**Do this instead:** Use a dedicated `launch/` directory. The `design ensure-dirs` command creates it. All launch artifact paths are predictably `launch/{CODE}-{slug}-v{N}.{ext}`.

### Anti-Pattern 3: Clobbering the 20-Field designCoverage Object

**What people do:** Write only the new flag when updating coverage (e.g., `{"hasBusinessThesis": true}` omitting all 19 other fields).
**Why it's wrong:** `manifest-set-top-level designCoverage` replaces the ENTIRE object. Any field not included reverts to absent (treated as `false`). This is the exact cross-phase clobber bug that caused v0.11 Phase 83 to find 10 broken workflows.
**Do this instead:** Always run `coverage-check` first, parse all 20 current values, write the full 20-field merged object.

### Anti-Pattern 4: Auto-Deploying Without Human Approval Gates

**What people do:** Wire `vercel deploy` as an automatic step after scaffolding completes.
**Why it's wrong:** Deployment is irreversible and potentially billing-relevant. It can expose unfinished code publicly. PDE has always required user consent for external writes (VAL-03 pattern from MCP integrations). Deployment is higher-stakes than a Linear ticket write.
**Do this instead:** Show the user exactly what will be deployed (file list, project name, domain), run `vercel --dry-run`, present output for review, require explicit "yes" confirmation before `vercel deploy`. Halt on "no" or timeout.

### Anti-Pattern 5: Adding businessMode Stage at the Wrong Pipeline Position

**What people do:** Insert a `business-thesis` stage as Stage 1 in build.md (before brief), reasoning that business framing should come first.
**Why it's wrong:** The business thesis IS generated inside `brief.md` Step 5 — it reads upstream IDT/CMP/OPP context and PROJECT.md to synthesize it. Extracting it as a pre-brief stage breaks the upstream context injection chain and the `--from brief` resume path.
**Do this instead:** Business thesis sections live inside `brief.md` Step 5, gated on `businessMode === true`. The BTH artifact is registered in the manifest by brief's Step 7. The deploy stage goes at position 14 (after handoff), not at the beginning.

### Anti-Pattern 6: Skipping the Coverage Clobber Audit Phase

**What people do:** Add the 4 new flags to the template and the 3-4 primary-producer workflows, then skip auditing the other 10 workflows that also write `designCoverage`.
**Why it's wrong:** Any workflow that writes `designCoverage` without including the 4 new flags will silently zero them out. A user who runs `brief` (sets `hasBusinessThesis: true`), then runs `flows` (writes coverage without the new flags), will find `hasBusinessThesis` reset to absent. The build orchestrator won't detect this because it reads coverage at the start of the pipeline, not between stages.
**Do this instead:** Dedicate a phase to auditing all 14 workflows, update each one to include the 4 new pass-through fields, write Nyquist tests that verify the flag count.

---

## Suggested Build Order

Based on architectural dependency chain derived from v0.11 precedent:

| Phase | Files | Rationale |
|-------|-------|-----------|
| 1 | `templates/design-manifest.json`, `bin/lib/design.cjs` | Schema and ensure-dirs must land first — all subsequent phases depend on manifest reading new fields without crashing. `launch/` directory must exist before any artifact tries to write there. |
| 2 | `references/business-track.md`, `references/launch-frameworks.md` | Reference files before any workflow that loads them (same precedent: `experience-disclaimer.md` created before being `@` referenced). |
| 3 | `workflows/brief.md`, `commands/brief.md` N/A (brief has no separate command) | Central: brief sets `businessMode` + `businessTrack` + `hasBusinessThesis` in manifest. All downstream gates depend on this. |
| 4 | `workflows/competitive.md` | Depends on brief (`businessMode` set). MLS is soft-consumed by handoff. |
| 5 | `workflows/opportunity.md` | Depends on brief + competitive. Business RICE needs MLS market data as soft input. |
| 6 | `workflows/flows.md` | Depends on brief. Operational flows need BTH for business context, MLS for market framing. |
| 7 | `workflows/system.md` | Depends on brief. Brand system is parallel to token generation. |
| 8 | `workflows/wireframe.md` | Depends on flows (service flows inform blueprint) + system (brand tokens inform LDP). |
| 9 | `workflows/critique.md`, `workflows/hig.md` | Depend on wireframe (SBP + LDP are the artifacts being critiqued). |
| 10 | `workflows/handoff.md` | Assembles all upstream business artifacts into LKT. Depends on: BTH, MLS, LDP, SBP artifacts being registered in manifest. |
| 11 | `commands/deploy.md`, `workflows/deploy.md` | New skill. Depends on LKT artifact from handoff. `build.md` Stage 14 added in this phase. |
| 12 | `workflows/recommend.md`, `workflows/iterate.md`, `workflows/mockup.md` | Lower-priority additions. iterate + mockup are guard stubs only. recommend adds a tool category. |
| 13 | Coverage clobber audit — all 14 designCoverage-writing workflows | Analogous to v0.11 Phase 83. Isolated phase so regression surface is clearly bounded. |
| 14 | Nyquist regression tests | Verify: non-business projects unaffected, business + software compose correctly, business + experience compose correctly (most complex case), deploy workflow halts at each approval gate. |

---

## Sources

- Direct codebase analysis — HIGH confidence:
  - `workflows/brief.md` — product type detection, upstream context injection, manifest write pattern
  - `workflows/flows.md`, `wireframe.md`, `critique.md`, `hig.md`, `mockup.md`, `iterate.md` — experience type conditional block patterns
  - `workflows/handoff.md` — experience BIB assembly, coverage write pattern, STACK.md bypass for non-software types
  - `workflows/competitive.md`, `opportunity.md`, `recommend.md` — experience stub patterns
  - `workflows/build.md` — STAGES table, coverage check pattern, conditional stage logic
  - `templates/design-manifest.json` — 16-field designCoverage schema, top-level field conventions, artifact code conventions
  - `bin/lib/design.cjs` — `cmdManifestSetTopLevel`, `cmdCoverageCheck`, `cmdArtifactPath`, `ensure-dirs` implementation
  - `references/strategy-frameworks.md` — existing TAM/SAM/SOM, Porter's Five Forces, RICE (relevant to business content scope)
  - `.planning/PROJECT.md` — v0.12 milestone requirements, v0.11 precedents, key decisions log

---
*Architecture research for: PDE v0.12 — Business Product Type Integration*
*Researched: 2026-03-22*
