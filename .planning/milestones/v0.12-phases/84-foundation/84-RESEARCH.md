# Phase 84: Foundation - Research

**Researched:** 2026-03-22
**Domain:** Manifest schema extension + directory infrastructure + reference file authoring
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-01 | Manifest schema extended with `businessMode: false` and `businessTrack: null` top-level fields in design-manifest.json template | Exact current field order verified; insertion position confirmed after `experienceSubType`; null-coalescing default `?? false` pattern means no migration needed for existing projects |
| FOUND-02 | designCoverage schema grows from 16 to 20 fields with `hasBusinessThesis`, `hasMarketLandscape`, `hasServiceBlueprint`, `hasLaunchKit` | All 16 current field names verified by direct manifest read; 4 new field names confirmed in REQUIREMENTS.md; append-to-bottom pattern confirmed as correct (do not reorder existing 16) |
| FOUND-03 | `launch/` subdirectory added to `.planning/design/` via `ensure-dirs` in design.cjs | `DOMAIN_DIRS` constant at line 17 of design.cjs verified; exact addition is `'launch'` appended to array; idempotent mkdirSync pattern already handles repeat calls |
| FOUND-04 | `references/business-track.md` created with track vocabulary, depth thresholds, and artifact format differences for solo_founder/startup_team/product_leader | Track signal lists and vocabulary tables from ARCHITECTURE.md verified; concrete depth thresholds (line counts, section counts) researched and locked below |
| FOUND-05 | `references/launch-frameworks.md` created with business artifact templates (lean canvas, pitch deck slides, service blueprint lanes, pricing config schema) | Lean Canvas 9-box schema from Ash Maurya verified; YC 10-slide and Sequoia 13-slide formats documented; 5-lane service blueprint from Nielsen Norman Group verified; Stripe pricing object schema confirmed |
| FOUND-06 | `references/business-financial-disclaimer.md` created with structural placeholder patterns — never dollar amounts, always `[YOUR_X]` format | `experience-disclaimer.md` pattern analyzed as precedent; exact format with inline disclaimer, prohibited patterns, and consumer list documented below |
| FOUND-07 | `references/business-legal-disclaimer.md` created with legal checklist pattern — service recommendations only, never generated legal documents | Pattern parallels FOUND-06; legal section header format, mandatory disclaimer paragraph, and prohibited patterns documented below |
</phase_requirements>

---

## Summary

Phase 84 is a pure infrastructure phase — no workflow logic is authored here. Its entire purpose is to ensure that every subsequent business-mode workflow author starts from a correct foundation: the right manifest schema, the right directory layout, and the right reference files that enforce financial and legal guardrails.

The three architectural time bombs from the project research are all addressed in this phase. The designCoverage clobber risk (Pitfall 6 in PITFALLS.md) is neutralized by updating the manifest template to 20 fields before any workflow is authored. The financial hallucination risk (Pitfall 2) is neutralized by creating `business-financial-disclaimer.md` before any financial content template is authored. The legal risk (Pitfall 5) is neutralized by creating `business-legal-disclaimer.md` with explicit prohibited-pattern enforcement.

The work is mechanical with zero architectural uncertainty. Every deliverable is either a JSON field addition, a single constant array entry, or a new markdown reference file following an exact established pattern. The precedent for every pattern is already in the codebase: `design-manifest.json` fields for FOUND-01/02, `DOMAIN_DIRS` for FOUND-03, `experience-disclaimer.md` for FOUND-06/07, and `references/strategy-frameworks.md` for FOUND-04/05.

**Primary recommendation:** Execute all seven FOUND requirements as a single plan in order. The manifest template and design.cjs are the only code file modifications. The five reference files are all new markdown files with no code dependencies. No workflow files are touched in this phase.

---

## Standard Stack

### Core

| File | Current State | Modification | Change Size |
|------|--------------|--------------|-------------|
| `templates/design-manifest.json` | 127 lines, 16 designCoverage fields | Add `businessMode`/`businessTrack` top-level fields + 4 new coverage fields | ~10 lines |
| `bin/lib/design.cjs` | DOMAIN_DIRS at line 17: 9-element array | Add `'launch'` to array | 1 line (+ self-test update) |

### New Reference Files

| File | Purpose | Pattern Precedent |
|------|---------|-------------------|
| `references/business-track.md` | Single source of truth for solo/startup/leader vocabulary and depth | `references/strategy-frameworks.md` (loaded via `@references/` by workflows) |
| `references/launch-frameworks.md` | Artifact templates — lean canvas, pitch deck, service blueprint, pricing config schema | `references/strategy-frameworks.md` (TAM/SAM/SOM, RICE, BCG templates) |
| `references/business-financial-disclaimer.md` | Financial placeholder enforcement — structural patterns only | `references/experience-disclaimer.md` (exact structural mirror) |
| `references/business-legal-disclaimer.md` | Legal checklist pattern — no legal document generation | `references/experience-disclaimer.md` (structural mirror, different domain) |

### No NPM Packages

Phase 84 adds zero npm dependencies. The plugin itself has a zero-npm-deps-at-plugin-root constraint (all new dependencies are in generated scaffolds only, which belongs to Phase 92). This phase is pure file content.

---

## Architecture Patterns

### Recommended Project Structure Changes

```
templates/
└── design-manifest.json          MODIFIED — +businessMode, +businessTrack, +4 coverage fields

bin/lib/design.cjs                MODIFIED — +launch/ to DOMAIN_DIRS

references/                       EXISTING directory
├── experience-disclaimer.md      EXISTING — pattern precedent (read-only reference)
├── business-track.md             NEW — track vocabulary and depth thresholds
├── launch-frameworks.md          NEW — lean canvas, pitch deck, service blueprint, pricing schemas
├── business-financial-disclaimer.md   NEW — financial placeholder enforcement
└── business-legal-disclaimer.md  NEW — legal checklist enforcement

.planning/design/
└── launch/                       CREATED by ensureDesignDirs() on next project init
```

### Pattern 1: Manifest Top-Level Field Extension

**What:** Two new fields inserted after `experienceSubType` in design-manifest.json, before `outputRoot`.

**Exact diff to apply:**

```json
// BEFORE (line 8):
"experienceSubType": "single-night | multi-day | recurring-series | installation | hybrid-event | null",
"outputRoot": "string -- path to output directory (e.g., ./pde-output or .planning/design)",

// AFTER:
"experienceSubType": "single-night | multi-day | recurring-series | installation | hybrid-event | null",
"businessMode": false,
"businessTrack": "solo_founder | startup_team | product_leader | null",
"outputRoot": "string -- path to output directory (e.g., ./pde-output or .planning/design)",
```

**Null-coalescing safety:** All downstream workflows read this as `manifest.businessMode ?? false` — existing projects that lack the field are treated as non-business automatically. No migration of existing project manifests is needed.

**Confidence:** HIGH — verified against current manifest template.

### Pattern 2: designCoverage Extension (16 → 20 fields)

**What:** Four new boolean flags appended to the end of `designCoverage`. Field order must NOT change for existing 16 fields (some grep-based audit tooling in Phase 93 counts fields by position).

**Exact 20-field schema:**

```json
"designCoverage": {
  "_comment": "Boolean flags indicating which design artifact types exist. PDE uses this to determine what design context is available for engineering planning.",
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

**Critical constraint:** These 4 new fields are appended AFTER `hasProductionBible` (the last v0.11 field). Never insert between existing fields. The Phase 93 audit will verify all 20 fields appear in every workflow's write block.

**Confidence:** HIGH — all 16 current field names verified by direct read of templates/design-manifest.json.

### Pattern 3: DOMAIN_DIRS Addition in design.cjs

**What:** Single array entry added to the `DOMAIN_DIRS` constant at line 17 of `bin/lib/design.cjs`.

**Exact current value:**
```javascript
const DOMAIN_DIRS = ['assets', 'strategy', 'ux', 'ux/mockups', 'visual', 'review', 'handoff', 'hardware', 'physical'];
```

**New value after Phase 84:**
```javascript
const DOMAIN_DIRS = ['assets', 'strategy', 'ux', 'ux/mockups', 'visual', 'review', 'handoff', 'hardware', 'physical', 'launch'];
```

**Side effects:** The `ensureDesignDirs` self-test at line 388 checks `DOMAIN_DIRS` length. The test comment at line 388 reads `'creates all 9 domain subdirectories (including ux/mockups, physical)'` — this comment must be updated to `'creates all 10 domain subdirectories (including ux/mockups, physical, launch)'`. The test calls `for (const domain of DOMAIN_DIRS)` dynamically, so the assertion itself does not hardcode the count — only the comment is stale.

**Idempotency:** `mkdirSync` is called with `{ recursive: true }` — adding `launch/` to an already-initialized project directory is harmless. Existing projects get the directory created on the next `design ensure-dirs` call.

**Confidence:** HIGH — verified current array contents and test structure by direct read.

### Pattern 4: Reference File Structure (experience-disclaimer.md Mirror)

**What:** All new reference files in Phase 84 follow the exact structure of `references/experience-disclaimer.md`.

**experience-disclaimer.md structure (the precedent):**

```markdown
# [Title] — [Context]

> [VERIFY TAG] — [Main disclaimer prose]
> [Continuation prose about variability]

## Usage

[How and where this disclaimer MUST appear]
[Inline vs footer guidance]

## Consumers

- `workflows/critique.md` — [phase]: [what section uses it]
- `workflows/handoff.md` — [phase]: [what section uses it]

## Prohibited Patterns

- [Anti-pattern 1]
- [Anti-pattern 2]
- [Anti-pattern 3]
```

**Key structural rules from the precedent:**
1. Block-quote disclaimer at top — visible immediately, not buried
2. `## Usage` section specifies WHERE the disclaimer must appear inline (not just at section end)
3. `## Consumers` section lists the exact workflow files that load this reference
4. `## Prohibited Patterns` section lists things the workflow MUST NOT do

**Confidence:** HIGH — verified by direct read of experience-disclaimer.md.

### Pattern 5: @references/ Loading in Workflow Files

**What:** Reference files are loaded via `<required_reading>` blocks at the top of workflow files. The format is `@references/filename.md`.

**Verified examples from codebase:**
```
# handoff.md line 6-9:
@references/skill-style-guide.md
@references/mcp-integration.md
@references/motion-design.md
@references/experience-disclaimer.md

# competitive.md line 56-58:
@references/skill-style-guide.md
@references/mcp-integration.md
@references/strategy-frameworks.md
```

**Inline reference in workflow prose:** The pattern for invoking a disclaimer at the point of use is:
```
ALL [type] values MUST carry [TAG] inline per `@references/[file].md`.
```

Example from brief.md line 443:
```
ALL numerical regulatory values MUST carry `[VERIFY WITH LOCAL AUTHORITY]` inline per `@references/experience-disclaimer.md`.
```

**Confidence:** HIGH — verified by grep across all workflow files.

### Pattern 6: Business Track Depth Thresholds (Concrete)

**What:** The business-track.md reference file must specify concrete depth thresholds so every downstream workflow author uses consistent sizing. The research had a gap here — exact thresholds were "not yet defined." This phase locks them.

**Track thresholds based on research synthesis:**

| Track | Brief length | Competitive depth | Artifact format | Vocabulary register |
|-------|-------------|-------------------|-----------------|---------------------|
| `solo_founder` | 1-2 page max (< 60 lines per section) | 3 competitors, 1-2 paragraphs each | Markdown, skimmable bullets, action-first | "you", "your product", "customers", plain English, no jargon |
| `startup_team` | 3-5 pages (60-120 lines per section) | 5-8 competitors, scoring matrix included | Structured docs, investor-presentation-ready | "your team", "your ICP", startup terminology (ARR, MRR, CAC, LTV, churn) |
| `product_leader` | 5-8 pages (120+ lines per section) | 8+ competitors, full positioning matrix with axes | Executive summary + detail sections, board-ready | "your organization", "your stakeholders", OKR framing, P&L vocabulary, build-vs-buy language |

**Track signal lists (for brief.md detection):**
```
solo_founder signals: "solo", "indie", "solo founder", "one person", "bootstrapped", "side project", "just me"
startup_team signals: "startup", "seed", "early stage", "founding team", "co-founder", "pre-seed", "Series A"
product_leader signals: "product leader", "PM", "head of product", "enterprise", "director", "VP", "product manager"
default: "solo_founder" if ambiguous or no signals detected
```

**Vocabulary substitutions per track (concrete examples):**

| Concept | solo_founder | startup_team | product_leader |
|---------|-------------|--------------|----------------|
| Revenue target | "revenue goal" | "ARR target" | "P&L impact" |
| Customers | "customers" | "ICP" | "key accounts" / "target segments" |
| Launch | "going live" | "launch" / "ship" | "go-to-market" |
| Competitors | "competing tools" | "competitive landscape" | "market alternatives" / "build-vs-buy" |
| Pricing | "what you charge" | "pricing tiers" / "pricing model" | "monetization strategy" / "packaging" |
| Team | "you" | "your team" / "co-founders" | "your organization" / "stakeholders" |

### Pattern 7: Lean Canvas Schema (Concrete 9-Box Definition)

**Source:** Ash Maurya, Running Lean (HIGH confidence — canonical source).

**9 boxes in canonical order:**

```
Box 1: Problem         — Top 3 problems the customer faces
Box 2: Solution        — Top 3 features that address the problem
Box 3: UVP             — Single clear compelling message — why you are different
Box 4: Unfair Advantage — Cannot be easily copied or bought
Box 5: Customer Segments — Target customers and users
Box 6: Key Metrics     — Key activities you measure
Box 7: Channels        — Path to customers
Box 8: Cost Structure  — Customer acquisition costs, distribution costs, hosting, people
Box 9: Revenue Streams — Revenue model, lifetime value, revenue, gross margin
```

**Confidence level annotations per box (PDE-specific addition):**
```
status: validated | assumed | unknown
evidence: [brief description of evidence, or "none yet"]
```

**Output format in launch-frameworks.md:** Markdown table with 9 rows, each containing: box name, content placeholder, status field, evidence field.

### Pattern 8: Pitch Deck Formats (YC and Sequoia)

**Source:** Y Combinator application guidelines (HIGH confidence — widely documented public format); Sequoia Capital pitch deck format (MEDIUM confidence — documented in multiple authoritative sources).

**YC 10-slide format (default for all tracks):**

| Slide | Title | Key Question |
|-------|-------|-------------|
| 1 | Problem | What pain exists and who has it? |
| 2 | Solution | What do you do? |
| 3 | Market Size | How big is the opportunity (TAM/SAM/SOM)? |
| 4 | Product | How does it work? |
| 5 | Business Model | How do you make money? |
| 6 | Traction | What have you proven so far? |
| 7 | Go-to-Market | How do you reach customers? |
| 8 | Competition | How are you different? |
| 9 | Team | Why are you the team to do this? |
| 10 | Ask | What do you need and what will you do with it? |

**Sequoia 13-slide expansion (startup_team and product_leader tracks):**
Adds: Purpose/Mission (before Problem), Why Now (after Market Size), Financials (after Traction).

**Track-to-format mapping:**
- `solo_founder`: YC 10-slide
- `startup_team`: YC 10-slide, expandable to Sequoia 13 if external funding context detected
- `product_leader`: Internal business case format — replaces investor "Ask" with "Initiative ROI" and "Team" with "Resource Requirements"

### Pattern 9: Service Blueprint 5-Lane Schema

**Source:** Nielsen Norman Group, Service Blueprinting FAQ (HIGH confidence — industry standard).

**5 lanes in canonical order:**

```
Lane 1: Customer Actions      — What the customer does (journey stages)
Lane 2: Frontstage Interactions — Direct touchpoints (UI, staff, communications)
         LINE OF VISIBILITY
Lane 3: Backstage Actions     — Internal processes not visible to customer
Lane 4: Support Processes     — Internal systems/tools that enable frontstage
Lane 5: Physical Evidence     — Tangible artifacts at each touchpoint
```

**Mermaid representation:** Sequence diagram variant (not flowchart) — customer actions as top-level sequence, other lanes as participant blocks below.

### Pattern 10: Stripe Pricing Config Schema

**Source:** Stripe API documentation, Products and Prices objects (HIGH confidence — verified against official docs in project SUMMARY.md).

**Minimal valid Stripe-compatible schema for PDE's STR artifact:**

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
      "unit_amount": "[YOUR_PRICE_IN_CENTS e.g. 2900 for $29]",
      "recurring": {
        "interval": "month",
        "interval_count": 1
      },
      "lookup_key": "[YOUR_LOOKUP_KEY e.g. starter-monthly]",
      "trial_period_days": null
    }
  ],
  "checkout_mode": "subscription"
}
```

**CRITICAL: All `unit_amount` values MUST use structural placeholders — never real numbers.** The `[YOUR_PRICE_IN_CENTS]` format with an example is the correct pattern. This is a financial content constraint from business-financial-disclaimer.md.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| New manifest field registration pattern | Custom field insertion logic | Follow existing JSON template addition pattern (edit `templates/design-manifest.json` directly) | The `stripCommentKeys` + `parsed.artifacts = {}` pattern in `ensureDesignDirs` already handles template initialization correctly — no new code needed |
| Directory creation for `launch/` | Custom directory creation code | Add `'launch'` to `DOMAIN_DIRS` array in design.cjs | `ensureDesignDirs` already loops over `DOMAIN_DIRS` with `mkdirSync({ recursive: true })` — same call handles `launch/` as all other dirs |
| Disclaimer injection mechanism | Custom reference loading | `@references/file.md` in `<required_reading>` block | Already the established pattern — adding to `<required_reading>` is sufficient; no new infrastructure needed |
| Track depth enforcement | Per-workflow branching code | `references/business-track.md` as single source of truth | Centralizing depth thresholds in one file means downstream workflow authors read it rather than inventing their own interpretation |
| Lean Canvas output format | Custom schema | Use the Ash Maurya 9-box schema exactly | Already the industry standard; deviating requires explanation and creates user expectation mismatch |

---

## Common Pitfalls

### Pitfall 1: Inserting New designCoverage Fields Between Existing Fields

**What goes wrong:** Fields are inserted in alphabetical order or "logical grouping" rather than appended to end. Phase 93's coverage audit relies on the consistent serialization order — insertion between fields causes grep-count-based assertions to pass while field-name-based assertions may diverge from the template.

**How to avoid:** Always append new fields after `hasProductionBible`. Never reorder existing 16 fields.

**Warning sign:** The new fields appear anywhere in the `designCoverage` object before `hasProductionBible` in the template JSON.

### Pitfall 2: Adding businessMode as a productType Enum Value

**What goes wrong:** The template gains `"productType": "software | hardware | hybrid | experience | business"` instead of a separate `businessMode` boolean field. All 14 workflows branch on `productType` — adding `"business"` as a value breaks all existing type checks.

**How to avoid:** `businessMode` is a separate top-level boolean field. `productType` enum is NOT changed. These are independent axes.

**Warning sign:** The `productType` field comment in the manifest includes "business" as a valid value.

### Pitfall 3: Writing experience-disclaimer.md Content Into the Business Disclaimers

**What goes wrong:** The financial disclaimer reuses language from the experience disclaimer (regulatory, AHJ, local authority) because the structure looks the same. Users are confused by event safety language in a business finance context.

**How to avoid:** `business-financial-disclaimer.md` and `business-legal-disclaimer.md` contain entirely different content — they only share the structural PATTERN (block-quote, Usage, Consumers, Prohibited Patterns), not any text.

**Warning sign:** Either business disclaimer mentions AHJ, occupancy limits, or noise ordinances.

### Pitfall 4: Vague Track Depth Thresholds

**What goes wrong:** `business-track.md` says "solo_founder artifacts are concise" without specifying what "concise" means. Downstream workflow authors in Phases 85-91 each interpret "concise" differently, resulting in inconsistent artifact depths.

**How to avoid:** Use the concrete thresholds from Pattern 6 above — line counts, section counts, exact vocabulary substitution tables. Do not use qualitative descriptions without accompanying quantitative anchors.

**Warning sign:** `business-track.md` contains words like "shorter", "more detail", or "executive-level" without corresponding line count ranges.

### Pitfall 5: Forgetting the Self-Test Comment Update in design.cjs

**What goes wrong:** After adding `'launch'` to `DOMAIN_DIRS`, the self-test at line 388 still says "creates all 9 domain subdirectories" — this passes (the test is dynamic, not counting 9 literally) but the comment is a documentation debt that misleads future maintainers.

**How to avoid:** Update the test comment from `'creates all 9 domain subdirectories (including ux/mockups, physical)'` to `'creates all 10 domain subdirectories (including ux/mockups, physical, launch)'`.

### Pitfall 6: Using Dollar Amounts as "Examples" in launch-frameworks.md

**What goes wrong:** The Stripe pricing config schema in `launch-frameworks.md` uses a real dollar amount like `"unit_amount": 2900` as an illustrative example. Downstream workflow authors copy the example template verbatim, producing STR artifacts with real-looking prices.

**How to avoid:** All monetary values in launch-frameworks.md MUST use the `[YOUR_X]` placeholder format. For Stripe amounts specifically: `"unit_amount": "[YOUR_PRICE_IN_CENTS — e.g. 2900 for $29.00/mo]"` — the example goes inside the placeholder label, not as an actual value.

---

## Code Examples

### How ensureDesignDirs Currently Works (verified)

```javascript
// Source: bin/lib/design.cjs line 17, 45-49
const DOMAIN_DIRS = ['assets', 'strategy', 'ux', 'ux/mockups', 'visual', 'review', 'handoff', 'hardware', 'physical'];

function ensureDesignDirs(cwd) {
  const designRoot = path.join(cwd, '.planning', 'design');
  fs.mkdirSync(designRoot, { recursive: true });
  for (const domain of DOMAIN_DIRS) {
    fs.mkdirSync(path.join(designRoot, domain), { recursive: true });
  }
  // ... (manifest and state file init, idempotent)
}
```

**After Phase 84:** `'launch'` is the 10th element. The loop handles it identically to the other 9.

### Current manifest-set-top-level designCoverage Pattern (16-field, from handoff.md)

```bash
# Source: workflows/handoff.md line 1207 — exact current production pattern
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},
    "hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},
    "hasHandoff":true,"hasIdeation":{current},"hasCompetitive":{current},
    "hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},
    "hasRecommendations":{current},"hasStitchWireframes":{current},
    "hasPrintCollateral":{current},"hasProductionBible":{current}}'
```

**After Phase 84 (20-field pattern — what every workflow must use from Phase 85 onward):**

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},
    "hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},
    "hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},
    "hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},
    "hasRecommendations":{current},"hasStitchWireframes":{current},
    "hasPrintCollateral":{current},"hasProductionBible":{current},
    "hasBusinessThesis":{current},"hasMarketLandscape":{current},
    "hasServiceBlueprint":{current},"hasLaunchKit":{current}}'
```

This is the canonical 20-field write pattern. The ARCHITECTURE.md includes a version of this at its Pattern 3 section — this matches exactly.

### business-financial-disclaimer.md Content (what to write)

The file should follow the experience-disclaimer.md structure precisely:

```markdown
# Business — Financial Content Disclaimer

> [STRUCTURAL PLACEHOLDERS ONLY] — Financial projections, unit economics estimates,
> pricing recommendations, and market sizing figures in PDE business mode output are
> structural templates, not grounded calculations. PDE has no access to your actual
> cost structure, revenue history, market data, or geography. All bracketed values
> ([YOUR_X] format) require replacement with verified actuals before use in investor
> conversations, financial planning, or strategic decisions. LLM-generated financial
> figures that appear authoritative are not grounded and must not be treated as such.

## Usage

This disclaimer block MUST appear inline in every financial artifact section — not
only in section footers. Specifically required in:

- Any section containing `[YOUR_MONTHLY_BURN]`, `[YOUR_ARR_GOAL]`, or similar placeholders
- TAM/SAM/SOM figures — must appear adjacent to each figure with source citation requirement
- Unit economics calculations — LTV, CAC, payback period estimates
- Pricing tier recommendations when tied to revenue projections

The `[STRUCTURAL PLACEHOLDERS ONLY]` tag must appear at the top of every financial
section. Do not group disclaimers only at document end.

## Consumers

- `workflows/brief.md` — Phase 85: lean canvas revenue streams box, business thesis revenue model
- `workflows/competitive.md` — Phase 86: TAM/SAM/SOM sizing section
- `workflows/opportunity.md` — Phase 86: unit economics inputs
- `workflows/handoff.md` — Phase 91: content calendar, email sequence, pricing spec
- `workflows/deploy.md` — Phase 92: Stripe pricing config generation

## Prohibited Patterns

- Generating specific dollar amounts for TAM, revenue, burn rate, or pricing without [YOUR_X] wrapper
- Stating a market size (e.g., "$4.2B addressable market") without a user-provided source citation
- Writing unit economics with filled-in values (e.g., "LTV of $480 at $40/month with 12-month average")
- Investor outreach that names specific investors, check sizes, or investment theses
- Pricing recommendations that state "you should charge $X/month" rather than providing structural rationale
```

### business-legal-disclaimer.md Content (what to write)

```markdown
# Business — Legal Content Disclaimer

> [STRUCTURAL GUIDANCE ONLY — NOT LEGAL ADVICE] — Legal checklist items, entity
> structure notes, and compliance guidance in PDE business mode output are general
> patterns observed in startup formation contexts. They are not legal advice. PDE
> has no knowledge of your jurisdiction, tax situation, co-founder agreements, or
> regulatory environment. Every legal consideration in PDE output requires review
> by a qualified attorney before any decision is made.

## Usage

This disclaimer block MUST appear as the first paragraph of every legal considerations
section. The exact heading format is required:

`## Legal Considerations (Structural Guidance Only — Not Legal Advice)`

The disclaimer paragraph must immediately follow this heading before any content.
Do not place disclaimers only at section end.

## Consumers

- `workflows/brief.md` — Phase 85: entity formation note in domain/brand section
- `workflows/handoff.md` — Phase 91: launch kit legal checklist section

## Prohibited Patterns

- Recommending a specific entity structure ("You should form a Delaware C-Corp") without jurisdiction disclaimer
- Naming specific investor firms, partners, or check sizes in investor outreach sections
- Generating terms of service, privacy policies, or any legal document content
- Stating a legal requirement as fact without "Consult a qualified attorney in your jurisdiction"
- Implying that PDE-generated legal checklists are sufficient for compliance decisions
```

---

## State of the Art

| Old Pattern | Phase 84 Pattern | Impact |
|-------------|-----------------|--------|
| 16-field designCoverage object | 20-field designCoverage object | Every workflow's coverage write block must be updated to include 4 new fields — Phase 93 audit handles this |
| No `businessMode` field in manifest | `businessMode: false` default | Downstream workflows read `?? false` — zero impact on existing non-business projects |
| 9-directory DOMAIN_DIRS | 10-directory DOMAIN_DIRS (+ `launch/`) | New `launch/` directory created on next `design ensure-dirs` call; no impact on existing projects |
| No financial/legal reference files | `business-financial-disclaimer.md` + `business-legal-disclaimer.md` | All financial and legal content in Phases 85-92 loads these files via `@references/` |

**Deprecated / not applicable:**
- The pattern of encoding `business` in `productType` enum — NEVER. This was explicitly rejected in project architecture decisions (see STATE.md and ARCHITECTURE.md).
- Reusing `experience-disclaimer.md` for business disclaimers — separate files are required per PITFALLS.md.

---

## Open Questions

1. **Self-test at line 388 in design.cjs**
   - What we know: The test comment hardcodes "9 domain subdirectories" but the test itself dynamically loops over `DOMAIN_DIRS` — so the test passes correctly after adding `launch/`
   - What's unclear: Should the test comment string be updated in the same commit as the DOMAIN_DIRS change? Yes — the comment is documentation.
   - Recommendation: Update the comment string in the same task as the DOMAIN_DIRS change.

2. **businessTrack field comment in manifest template**
   - What we know: The template uses comment strings (not JSON schema validation) to document valid values
   - What's unclear: Whether to use `"solo_founder | startup_team | product_leader | null"` or `"solo | startup | leader | null"` as the comment — ARCHITECTURE.md uses both forms
   - Recommendation: Use the full form `"solo_founder | startup_team | product_leader | null"` to match the vocabulary that `business-track.md` will define. Brief.md detection can map short signals to long forms.

3. **launch-frameworks.md scope boundary**
   - What we know: Phase 84 creates this file; Phase 89 (wireframe) and Phase 91 (handoff) use it most heavily
   - What's unclear: Whether to include the full service blueprint Mermaid template or just the 5-lane schema definition
   - Recommendation: Include the schema definition and an example Mermaid skeleton — not a filled-in template. This matches how `strategy-frameworks.md` provides the RICE table schema without filling in example project data.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in `assert` module (design.cjs self-test pattern) |
| Config file | none — self-test is embedded in design.cjs via `--self-test` flag |
| Quick run command | `node bin/lib/design.cjs --self-test` |
| Full suite command | `node bin/lib/design.cjs --self-test` (same — test is self-contained) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | `businessMode: false` present in initialized manifest | unit | `node bin/lib/design.cjs --self-test` (extended) | ❌ Wave 0 — extend self-test |
| FOUND-02 | All 20 designCoverage fields present in initialized manifest | unit | `node bin/lib/design.cjs --self-test` (extended) | ❌ Wave 0 — extend self-test |
| FOUND-03 | `launch/` directory created by `ensureDesignDirs` | unit | `node bin/lib/design.cjs --self-test` (existing test group 1 extended) | ❌ Wave 0 — extend existing test |
| FOUND-04 | `references/business-track.md` exists and contains track vocabulary sections | smoke | `ls references/business-track.md` | ❌ Wave 0 — created in this phase |
| FOUND-05 | `references/launch-frameworks.md` exists and contains lean canvas section | smoke | `ls references/launch-frameworks.md` | ❌ Wave 0 — created in this phase |
| FOUND-06 | `references/business-financial-disclaimer.md` exists | smoke | `ls references/business-financial-disclaimer.md` | ❌ Wave 0 — created in this phase |
| FOUND-07 | `references/business-legal-disclaimer.md` exists | smoke | `ls references/business-legal-disclaimer.md` | ❌ Wave 0 — created in this phase |

### Sampling Rate

- **Per task commit:** `node bin/lib/design.cjs --self-test`
- **Per wave merge:** `node bin/lib/design.cjs --self-test` + file existence checks for all 4 reference files
- **Phase gate:** All 7 FOUND requirements passing before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] Extend test group 1 in design.cjs self-test to verify `launch/` directory is created
- [ ] Extend manifest initialization test to verify `businessMode: false` is present in initialized manifest
- [ ] Extend manifest initialization test to verify all 20 `designCoverage` fields present (not just `{}` for artifacts)
- [ ] 4 reference file smoke checks (FOUND-04 through FOUND-07) — verified via file existence checks post-creation

---

## Sources

### Primary (HIGH confidence)

- Direct codebase read: `templates/design-manifest.json` — verified all 16 current designCoverage field names, field ordering, top-level structure
- Direct codebase read: `bin/lib/design.cjs` — verified DOMAIN_DIRS constant (line 17), ensureDesignDirs function (lines 45-78), self-test structure (lines 379-596)
- Direct codebase read: `references/experience-disclaimer.md` — verified exact structure pattern (block-quote, Usage, Consumers, Prohibited Patterns)
- Direct codebase read: `workflows/handoff.md` — verified 16-field designCoverage write pattern (lines 1203-1213), @references/ loading pattern (lines 6-9)
- Direct codebase read: `workflows/flows.md` — verified Step 4-EXP conditional block structure as precedent
- Direct codebase read: `workflows/iterate.md` — verified experience guard stub comment pattern (line 10)
- `.planning/REQUIREMENTS.md` — FOUND-01 through FOUND-07 requirements, new field names
- `.planning/research/ARCHITECTURE.md` — 20-field schema definition, composite flag pattern, DOMAIN_DIRS modification scope
- `.planning/research/PITFALLS.md` — financial/legal disclaimer requirements, guard pattern
- `.planning/research/SUMMARY.md` — Ash Maurya Lean Canvas source, YC/Sequoia pitch formats, Nielsen Norman Group service blueprint source

### Secondary (MEDIUM confidence)

- `.planning/research/FEATURES.md` — feature descriptions for lean canvas, service blueprint, pricing config schemas
- `.planning/STATE.md` — architectural decisions (composite flag, financial placeholder-only constraint)
- `workflows/brief.md` line 443 — inline @references/ usage pattern in workflow prose

### Tertiary (LOW confidence)

- None — all Phase 84 deliverables are mechanical file changes with direct codebase precedents; no external sources required

---

## Metadata

**Confidence breakdown:**

- Manifest schema changes: HIGH — all current field names verified by direct read; new field names from REQUIREMENTS.md; JSON structure fully understood
- design.cjs modification: HIGH — DOMAIN_DIRS constant verified by direct read; ensureDesignDirs behavior fully understood; self-test structure verified
- Reference file content: HIGH — experience-disclaimer.md structure verified as precedent; financial/legal disclaimer content derived from PITFALLS.md which cross-references 2025 legal research sources
- Track depth thresholds: MEDIUM-HIGH — synthesized from ARCHITECTURE.md vocabulary tables + PITFALLS.md concrete line-count guidance; not empirically validated but consistent with methodology literature
- Lean canvas schema: HIGH — Ash Maurya canonical source cited in SUMMARY.md
- Pitch deck formats: HIGH (YC) / MEDIUM (Sequoia) — YC format is well-documented public standard; Sequoia documented via multiple authoritative secondary sources
- Service blueprint lanes: HIGH — Nielsen Norman Group FAQ cited as primary source in SUMMARY.md
- Stripe pricing schema: HIGH (field names) — verified via official Stripe docs citation in SUMMARY.md; re-verify at Phase 92 implementation since Stripe APIs evolve

**Research date:** 2026-03-22
**Valid until:** Stable — manifest JSON patterns and reference file structures are stable; re-verify Stripe schema at Phase 92 implementation time
