# Phase 88: Brand System — Research

**Researched:** 2026-03-22
**Domain:** Brand identity architecture, DTCG token extension, PDE system.md workflow extension
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BRAND-01 | `system.md` produces MKT (Brand/Marketing System) artifact with positioning statement, tone of voice spectrum, and visual differentiation rationale | Artifact structure, content framework, and insertion pattern fully documented below |
| BRAND-02 | Brand system tokens extend existing DTCG output with marketing-specific token group (`brand-voice`, `campaign-palette-variants`) without clobbering existing token groups | DTCG group extension pattern, namespace conventions, and safe merge strategy documented below |
| BRAND-03 | Positioning statement and tone of voice from the MKT artifact are referenced in the landing page wireframe and pitch deck content generated in Phase 89 | Downstream reference contract and DESIGN-STATE wiring documented below |
</phase_requirements>

---

## Summary

Phase 88 extends `/pde:system` so that when `businessMode == true`, it produces an MKT (Brand/Marketing System) artifact alongside the standard DTCG design system output. The phase has three deliverables: the MKT markdown artifact, a DTCG token group extension (`SYS-brand-tokens.json`), and the DESIGN-STATE / manifest wiring that makes both visible to Phase 89 downstream.

The implementation follows the same structural pattern as Phase 75 (experience tokens — Step 5b) and Phase 87 (business sub-steps — Steps 4f/4g). Business-mode logic is inserted as sub-steps that are gated on `businessMode == true`, keeping the existing 7-step structure intact. The step count stays at 7 and non-business runs produce byte-identical output to the pre-v0.12 baseline (INTG-02).

`system.md` already has a 16-field designCoverage write that needs to be upgraded to 20-fields — this is the same upgrade that competitive.md, flows.md, and brief.md all received in their respective phases. The key invariant is pass-through-all: read all existing flags from coverage-check, merge the new flag, write the full 20-field object.

**Primary recommendation:** Add Step 5c (business brand tokens, gates on `BM == "true"`) immediately after the existing Step 5b (experience tokens) block. Add Step 5d (MKT artifact write, gates on `BM == "true"`) after Step 5c. Upgrade Step 7 designCoverage write from 16 to 20 fields. Register MKT artifact in manifest and DESIGN-STATE.

---

## Standard Stack

### Core

| Library / Tool | Version | Purpose | Why Standard |
|----------------|---------|---------|--------------|
| Node.js built-in test runner | Node.js ≥18 (already in project) | Structural assertions for BRAND-01/02/03 | Project-wide pattern — every phase uses `node --test` |
| DTCG 2025.10 format | W3C spec (already in project) | Token group extension schema | `system.md` already emits DTCG-compliant JSON; extension must be same format |
| pde-tools.cjs manifest-update | (already in project) | Registering MKT artifact in design-manifest.json | All artifact registration uses 7-call manifest-update pattern |
| pde-tools.cjs manifest-set-top-level | (already in project) | Writing 20-field designCoverage object | Existing pattern in flows.md, brief.md, competitive.md |

### Supporting

| Library / Tool | Version | Purpose | When to Use |
|----------------|---------|---------|-------------|
| pde-tools.cjs tokens-to-css | (already in project) | Generate CSS custom properties from brand token JSON | Used in Step 5b (experience tokens) — same pattern applies for brand tokens |
| pde-tools.cjs design lock-acquire / lock-release | (already in project) | Write-lock for root DESIGN-STATE.md | Required in Step 7 (already present in system.md) |
| references/business-track.md | v1.0 | Track vocabulary and depth thresholds for brand voice | Already loaded in flows.md, competitive.md — add to system.md required_reading |
| references/launch-frameworks.md | v1.0 | Needs new Brand System section added (see Architecture Patterns) | Loaded by flows.md — system.md should load it too in business mode |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate `SYS-brand-tokens.json` file | Merge brand tokens into `SYS-tokens.json` | Separate file is safer: no risk of clobbering existing token groups; consistent with SYS-experience-tokens.json precedent |
| New `/pde:brand` skill command | Extension inside system.md | Separate command adds surface area; user mental model is simpler if branding is part of system generation |

**Installation:** No new packages needed. All tooling is already present.

---

## Architecture Patterns

### Recommended Project Structure

The MKT artifact goes in `strategy/` — brand positioning is a strategic artifact, not a visual one, matching the SBP and GTM domain routing precedent from Phase 87.

```
.planning/design/
├── strategy/
│   ├── MKT-brand-system-v{N}.md      # NEW: MKT artifact (BRAND-01)
│   ├── SBP-service-blueprint-v{N}.md  # Phase 87
│   ├── GTM-channel-flow-v{N}.md       # Phase 87
│   ├── BTH-thesis-v{N}.md             # Phase 85
│   └── LCV-lean-canvas-v{N}.md        # Phase 85
├── visual/
│   ├── SYS-tokens.json                # Existing (7 categories)
│   ├── SYS-brand-tokens.json          # NEW: DTCG brand extension (BRAND-02)
│   ├── SYS-brand-tokens.css           # NEW: CSS vars from brand tokens
│   └── SYS-experience-tokens.json     # Phase 74/76
```

### Pattern 1: Business Sub-Step Insertion (Established Project Pattern)

**What:** Business-mode content is added as numbered sub-steps (Step 4f, 4g, Step 5b, Step 5c, etc.) gated on `$BM == "true"`. The main step count stays at 7.

**When to use:** Always. Every business-mode addition in v0.12 follows this pattern.

**Example (from flows.md, Phase 87):**
```markdown
#### Step 5c: Brand token generation (business mode only)

BM=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-get-top-level businessMode 2>/dev/null)
BT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-get-top-level businessTrack 2>/dev/null)

**IF `$BM == "true"`:** proceed to Steps 5c and 5d below before continuing to Step 6.

**ELSE (`$BM != "true"`):** Skip silently. Set BRAND_TOKENS_GENERATED=false. Continue to Step 6.
```

Note: `$BM` and `$BT` are already fetched in the Step 2 prerequisites (system.md Step 2 reads the brief). The business mode detection block must check these before Step 5c.

### Pattern 2: DTCG Group Extension Without Clobbering

**What:** The brand token group is written to a SEPARATE file (`SYS-brand-tokens.json`), not merged into `SYS-tokens.json`. This is identical to how `SYS-experience-tokens.json` works.

**Why separate file:** The `manifest-set-top-level` command does FLAT key assignment — there is no documented "deep merge" operation on `SYS-tokens.json` that preserves all 7 existing categories while adding an 8th. Writing a separate file avoids any risk of partial-write corruption.

**DTCG namespace convention:** Top-level group key is `brand-marketing`. Sub-groups are `brand-voice` and `campaign-palette-variants`. Full qualified token paths are `brand-marketing.brand-voice.tone-primary` etc.

**Example DTCG structure:**
```json
{
  "brand-marketing": {
    "$description": "Marketing-specific brand tokens. Extends SYS-tokens.json without modifying core design system categories.",
    "brand-voice": {
      "tone-primary": {
        "$value": "[BRAND_VOICE_PRIMARY_DERIVED_FROM_UVP]",
        "$type": "string",
        "$description": "Primary tone descriptor derived from UVP and business thesis"
      },
      "tone-spectrum-warm": {
        "$value": "[WARM_END_OF_TONE_SPECTRUM]",
        "$type": "string",
        "$description": "Warm/approachable end of the tone of voice spectrum"
      },
      "tone-spectrum-authoritative": {
        "$value": "[AUTHORITATIVE_END_OF_TONE_SPECTRUM]",
        "$type": "string",
        "$description": "Authoritative/expert end of the tone of voice spectrum"
      },
      "positioning-statement": {
        "$value": "[POSITIONING_STATEMENT_FROM_MKT_ARTIFACT]",
        "$type": "string",
        "$description": "Reference to MKT artifact positioning statement — for downstream consumption by wireframe and pitch deck"
      },
      "audience-voice-descriptor": {
        "$value": "[HOW_AUDIENCE_TALKS_DERIVED_FROM_LEAN_CANVAS_CUSTOMER_SEGMENTS]",
        "$type": "string",
        "$description": "Language register of target audience — calibrates copy tone"
      }
    },
    "campaign-palette-variants": {
      "primary-campaign": {
        "$value": "{color.primitive.primary.500}",
        "$type": "color",
        "$description": "Primary campaign color — references core design system primary via token alias"
      },
      "accent-campaign": {
        "$value": "{color.harmony.analogous-warm.500}",
        "$type": "color",
        "$description": "Accent campaign color — warm harmony from design system"
      },
      "neutral-campaign": {
        "$value": "{color.primitive.neutral.100}",
        "$type": "color",
        "$description": "Campaign background neutral — light surface from design system"
      },
      "cta-campaign": {
        "$value": "{color.semantic.action}",
        "$type": "color",
        "$description": "Campaign CTA color — semantic action alias from design system"
      }
    }
  }
}
```

**Critical:** Campaign palette variant tokens MUST use `{token.path}` alias syntax pointing into `SYS-tokens.json` categories — never raw oklch values. This way they inherit dark mode overrides automatically and remain coherent with the core palette.

**Critical:** Every leaf node MUST have `$value`, `$type`, and `$description` per DTCG 2025.10.

### Pattern 3: MKT Artifact Structure (Brand/Marketing System)

**What:** The MKT artifact is a markdown file following the same frontmatter + section pattern as SBP and GTM artifacts.

**Artifact code:** `MKT`
**File path:** `.planning/design/strategy/MKT-brand-system-v{N}.md`
**Domain:** `strategy` (matches SBP/GTM domain routing from Phase 87)
**Version:** matches SYS version (same N from system.md Step 2)

**Content sections (derive from BRF Domain Strategy seeds, BTH, and CMP artifacts):**

```markdown
---
artifact: MKT-brand-system
version: v{N}
Skill: /pde:system (MKT)
businessTrack: {solo_founder|startup_team|product_leader}
dependsOn: BRF, BTH, LCV
---

# Brand & Marketing System

*Generated by /pde:system (business mode) v{N} | {ISO date}*

## Positioning Statement

[One sentence: For [target customer], [product name] is the [category] that [primary benefit] because [unique differentiator]. Derived from BTH Solution + Unfair Advantage + LCV UVP box. Use structural language — no dollar amounts.]

## Tone of Voice Spectrum

| Dimension | Warm End | Authoritative End | Primary Position |
|-----------|----------|-------------------|-----------------|
| Formality | Conversational | Professional | [position on spectrum] |
| Energy | Calm | Dynamic | [position on spectrum] |
| Expertise | Accessible | Expert | [position on spectrum] |
| Personality | Playful | Serious | [position on spectrum] |

**Primary tone descriptor:** [Single most important voice characteristic]
**Secondary tone descriptor:** [Supporting voice characteristic]
**Voice to avoid:** [Tone that would undermine brand positioning]

## Visual Differentiation Rationale

**Category visual conventions:** [What competitors in this space typically look like — derive from CMP competitive positioning matrix]
**Our differentiation:** [How visual choices deliberately depart from category conventions]
**Primary palette role:** [How the design system's primary color supports brand positioning]
**Typography personality:** [How typeface selection reinforces brand character]

## Brand Voice Examples

*Track-depth controlled: solo_founder = 2 examples, startup_team = 4 examples, product_leader = 6 examples*

| Context | Avoid | Prefer |
|---------|-------|--------|
| Headline | [generic category language] | [differentiating brand language] |
| CTA | [commodity phrasing] | [brand-specific action language] |

## Downstream References

- Landing page wireframe (Phase 89): Use Positioning Statement for hero headline framing, Tone of Voice for CTA and feature copy
- Pitch deck (Phase 89): Use Positioning Statement for solution slide, Visual Differentiation for competition slide

---
*Generated by /pde:system (MKT) v{N} | {ISO date}*
```

### Pattern 4: Step 7 DESIGN-STATE Wiring for MKT Artifact

Following the exact pattern from flows.md Step 7 (SBP/GTM), the MKT artifact DESIGN-STATE rows are added in a conditional block under `IF MKT_WRITTEN == true`:

```markdown
**IF `MKT_WRITTEN == true`:**

Add MKT row to visual/DESIGN-STATE.md Artifact Index (this is in the strategy domain but Step 6 already handles visual DESIGN-STATE — add MKT to root DESIGN-STATE only):

Root DESIGN-STATE updates:
- Cross-Domain Dependency Map: `| MKT | strategy | BRF,BTH | current |`
- Quick Reference: `| Brand System | v{N} |`
- Decision Log: `| MKT | brand system generated, {businessTrack} track | {date} |`
- Iteration History: `| MKT-brand-system-v{N}.md | v{N} | Created by /pde:system | {date} |`
```

### Pattern 5: 20-Field designCoverage Upgrade in system.md

`system.md` currently writes a 16-field `designCoverage` object. It must be upgraded to 20 fields (adding `hasBusinessThesis`, `hasMarketLandscape`, `hasServiceBlueprint`, `hasLaunchKit`) before Phase 88 ships, or any `/pde:system` run will erase those flags set by earlier workflow skills.

The 20-field write pattern (from flows.md line 1062):
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":true,"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},
    "hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},
    "hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},
    "hasRecommendations":{current},"hasStitchWireframes":{current},"hasPrintCollateral":{current},
    "hasProductionBible":{current},"hasBusinessThesis":{current},"hasMarketLandscape":{current},
    "hasServiceBlueprint":{current},"hasLaunchKit":{current}}'
```

### Anti-Patterns to Avoid

- **Merging brand tokens into SYS-tokens.json:** Writing a new root key into the existing SYS-tokens.json is unsafe because there is no atomic merge operation — any partial write would corrupt the 7-category token source. Use a separate file exactly as experience tokens do.
- **Raw oklch values in campaign-palette-variants:** Campaign palette tokens must alias into SYS-tokens.json via `{token.path}` syntax, not embed raw values. Raw values would drift out of sync when the core system is regenerated.
- **String-type `$value` for positioning statement in DTCG:** Positioning statement content is `$type: "string"`. The value should be the actual statement text, not a CSS var reference.
- **Skipping `$type` on any leaf node:** W3C DTCG 2025.10 requires leaf-level `$type` on every node. The existing system.md anti-patterns section already flags this — brand tokens must comply.
- **Writing MKT artifact to visual/ domain:** MKT is a strategy artifact. visual/ domain is for token files and CSS. This matches the SBP/GTM domain routing decision from Phase 87.
- **Fetching businessMode inside Step 5c without prior detection:** businessMode and businessTrack should be read once in Step 2 (where brief is loaded) and reused in Step 5c/5d. Do not add redundant manifest reads mid-step.
- **16-field coverage write:** system.md Step 7 currently writes only 16 fields. This will clobber `hasBusinessThesis`, `hasMarketLandscape`, `hasServiceBlueprint`, `hasLaunchKit`. The 20-field upgrade is mandatory and should happen in Plan 01.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Writing CSS vars from brand token JSON | Custom token-to-CSS loop | `pde-tools.cjs design tokens-to-css` | Already handles DTCG 2025.10 format, wraps in `:root {}`, tested in production |
| Manifest registration of MKT artifact | Custom JSON write | 7-call `manifest-update` pattern (code, name, type, domain, path, status, dependsOn) | Same pattern used by all 15+ existing artifacts — planner and downstream skills expect this exact structure |
| Acquiring write lock for DESIGN-STATE | Custom lock file | `pde-tools.cjs design lock-acquire / lock-release` | 60s TTL, retry logic, already integrated in Step 7 — add MKT state updates inside the existing lock window |
| Tone of voice framework | Custom framework | Two-axis spectrum model (warm↔authoritative, accessible↔expert) matching 4 dimensions | This is a well-established brand strategy pattern; the existing `business-track.md` vocabulary table already describes tone language per track |
| Positioning statement format | Custom format | "For [target customer], [product] is the [category] that [benefit] because [differentiator]" template | This is the standard Geoffrey Moore positioning statement format — every brand consultant uses it; it maps directly to BTH artifact sections |

**Key insight:** Every tool needed already exists in the project. Phase 88 is purely a workflow authoring and wiring problem, not a tooling problem.

---

## Common Pitfalls

### Pitfall 1: system.md PRODUCT_TYPE reads "experience" and interferes with business mode

**What goes wrong:** system.md Step 2 extracts `PRODUCT_TYPE` from the brief. Step 5b (experience tokens) runs if `PRODUCT_TYPE == "experience"`. A product could be `business:experience` composition — `businessMode == true` AND `PRODUCT_TYPE == "experience"`. Both Step 5b AND Step 5c/5d should run in that case.

**Why it happens:** The experience branch in Step 5b is currently the only conditional sub-step. Naive insertion of business mode gating could accidentally create an either/or condition.

**How to avoid:** Step 5b (experience tokens) and Steps 5c/5d (business brand tokens) must be independent conditional blocks. The existing flows.md pattern has this right — the SBP step reads: "proceed to Step 4f below (business artifacts apply to experience+business compositions too) before jumping to Step 5-EXP." Follow this exact comment pattern.

**Warning signs:** Any `ELSE IF` or `ELSE` branching between Step 5b and Steps 5c/5d would indicate this error.

### Pitfall 2: campaign-palette-variants token aliases pointing to non-existent paths

**What goes wrong:** If SYS-tokens.json uses a different nested path than expected (e.g., `color.primitive.primary.500` vs `color.primary.500`), the `{token.path}` alias in SYS-brand-tokens.json will be a dangling reference at Style Dictionary transform time.

**Why it happens:** The actual paths in SYS-tokens.json are fixed (verified in Code Examples section below), but a careless planner might guess wrong paths.

**How to avoid:** Campaign palette variant token paths MUST use paths verified from the SYS-tokens.json example in system.md Step 4 (`Construct DTCG JSON token tree` section lines 900-1000). Correct paths: `{color.primitive.primary.500}`, `{color.harmony.analogous-warm.500}`, `{color.primitive.neutral.100}`, `{color.semantic.action}`.

**Warning signs:** `{color.primary.500}` (missing `primitive.` prefix) is wrong. `{color.semantic.primary}` does not exist. `{color.harmony.warm.500}` (missing `analogous-`) is wrong.

### Pitfall 3: 20-field coverage upgrade missing — clobbering business flags

**What goes wrong:** `system.md` Step 7 currently writes a 16-field designCoverage object. After Phase 85 (brief) sets `hasBusinessThesis: true` and Phase 87 (flows) sets `hasServiceBlueprint: true`, a subsequent `/pde:system` run will write the old 16-field object and erase those flags.

**Why it happens:** Each phase upgraded its own workflow's coverage write, but system.md was not in scope for Phases 85-87. Phase 88 is the natural time to fix it.

**How to avoid:** Plan 01 of Phase 88 MUST upgrade the system.md designCoverage write to 20 fields as its first action, before any other work. This is the highest-risk item.

**Warning signs:** If the Nyquist tests for Phase 88 do not assert that `hasBusinessThesis` appears in system.md's coverage write, the test coverage has a gap.

### Pitfall 4: MKT artifact content deriving from wrong upstream sources

**What goes wrong:** The MKT artifact's positioning statement and tone of voice must be derived from the BRF Domain Strategy section (brand positioning seeds from BRIEF-05), BTH artifact, and LCV UVP box. If the skill tries to invent these from scratch without reading those upstream artifacts, the content will be inconsistent with the business thesis.

**Why it happens:** system.md Step 2 already reads the BRF brief. It does NOT currently read BTH or LCV artifacts.

**How to avoid:** The Step 5c business mode block must either (a) read BTH-thesis-v{N}.md explicitly before generating MKT content, or (b) instruct the agent to derive MKT content from the BRF's `## Domain Strategy` section (which already contains brand positioning seeds from BRIEF-05). Option (b) is simpler and avoids adding a glob step inside an already-complex workflow. The Domain Strategy section in BRF is explicitly documented as "for downstream brand system consumption in Phase 88" (brief.md line 554).

**Warning signs:** MKT positioning statement that does not reference the product name, category, or UVP from the brief.

### Pitfall 5: launch-frameworks.md lacks a Brand System section

**What goes wrong:** `launch-frameworks.md` is the shared template/schema reference for business artifacts. It currently has sections for Lean Canvas, Pitch Deck, Service Blueprint, and Pricing Config. It has NO Brand System section. Without a canonical template here, the system.md MKT generation step has no reference to load.

**Why it happens:** launch-frameworks.md was authored in Phase 84 before Phase 88 scope was detailed.

**How to avoid:** Plan 01 of Phase 88 must ADD a `## Brand System` section to `references/launch-frameworks.md` containing the MKT artifact template, the positioning statement format, the tone of voice spectrum table schema, and the visual differentiation rationale structure. This reference must be added to system.md's `<required_reading>` block alongside the existing business-track.md reference.

**Warning signs:** system.md `<required_reading>` block does not include `@references/launch-frameworks.md` by the end of Phase 88.

---

## Code Examples

Verified patterns from project source files:

### Business Mode Detection Read (from flows.md lines 157-159)
```bash
BM=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-get-top-level businessMode 2>/dev/null)
BT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-get-top-level businessTrack 2>/dev/null)
```

### Artifact Registration Pattern — 7 calls (from flows.md SBP block, lines 757-763)
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update MKT code MKT
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update MKT name "Brand Marketing System"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update MKT type brand-system
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update MKT domain strategy
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update MKT path ".planning/design/strategy/MKT-brand-system-v${N}.md"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update MKT status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update MKT dependsOn '["BRF","BTH","LCV"]'
```

### DTCG Brand Token CSS Generation (from system.md Step 5b experience pattern, lines 1824-1829)
```bash
CSS_BRAND=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design tokens-to-css ".planning/design/visual/SYS-brand-tokens.json" --raw)
if [[ "$CSS_BRAND" == @file:* ]]; then CSS_BRAND=$(cat "${CSS_BRAND#@file:}"); fi
# Write $CSS_BRAND to .planning/design/visual/SYS-brand-tokens.css
```

### Correct DTCG Token Paths in SYS-tokens.json (from system.md lines 900-1000)
The following token alias paths exist in the canonical SYS-tokens.json structure:
- `{color.primitive.primary.500}` — primary brand shade
- `{color.primitive.secondary.500}` — secondary brand shade
- `{color.primitive.neutral.50}` — near-white background
- `{color.primitive.neutral.100}` — light surface background
- `{color.harmony.analogous-warm.500}` — warm harmony color
- `{color.harmony.complementary.500}` — complementary accent
- `{color.semantic.action}` — semantic CTA color alias
- `{color.semantic.bg.default}` — semantic background alias

### 20-Field designCoverage Write (from flows.md line 1062)
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":true,"hasWireframes":{current},"hasFlows":{current},
    "hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},
    "hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},
    "hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},
    "hasRecommendations":{current},"hasStitchWireframes":{current},
    "hasPrintCollateral":{current},"hasProductionBible":{current},
    "hasBusinessThesis":{current},"hasMarketLandscape":{current},
    "hasServiceBlueprint":{current},"hasLaunchKit":{current}}'
```

### Financial Disclaimer Enforcement (from flows.md lines 749-754)
```bash
if grep -qE '\$[0-9]' ".planning/design/strategy/MKT-brand-system-v${N}.md" 2>/dev/null; then
  echo "ERROR: Dollar amount detected in MKT artifact. Use [YOUR_X] placeholders only."
  grep -nE '\$[0-9]' ".planning/design/strategy/MKT-brand-system-v${N}.md"
  exit 1
fi
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single SYS-tokens.json with 7 categories | Separate extension files per product type (SYS-experience-tokens.json, SYS-brand-tokens.json) | Phase 74/76 established the pattern | Extension files cannot break the canonical source |
| 16-field designCoverage write | 20-field designCoverage write | Phase 85 started; each phase upgrades its own workflow | Prevents flag erasure between skills |
| Business logic in new top-level steps | Business logic inserted as sub-steps (4f, 4g, 5b, 5c, 5d) | Established in Phase 85, carried through 86-88 | Step count stays at 7; non-business runs are byte-identical |

**No deprecated approaches relevant to this phase.**

---

## Open Questions

1. **Does system.md Step 2 currently read businessMode?**
   - What we know: system.md Step 2 reads the brief and extracts PRODUCT_TYPE, BRAND_COLORS, etc. Searching the file shows no businessMode manifest read in Step 2.
   - What's unclear: The step 2 grep output did not show manifest-get-top-level businessMode in system.md — it appears this detection is NOT yet in system.md (unlike flows.md).
   - Recommendation: Plan 01 must add the businessMode/businessTrack manifest reads to system.md Step 2 (or as a new early block in Step 5c). Safest is to add them at the top of Step 5c (immediately before the `IF $BM == "true"` gate) to avoid modifying the existing Step 2 prerequisites block. This is consistent with the minimal-change philosophy.

2. **Does launch-frameworks.md need updating by Plan 01 or can it be deferred to Plan 02?**
   - What we know: launch-frameworks.md has no Brand System section. system.md cannot load it as a reference for brand generation without it.
   - What's unclear: Whether the brand system section needs to be in launch-frameworks.md or can be self-contained in system.md's Step 5c instructions.
   - Recommendation: Add the Brand System template to launch-frameworks.md in Plan 01. This makes the template reusable by Phase 89 wireframe.md (which will also need to reference MKT content). Add `@references/launch-frameworks.md` to system.md `<required_reading>` at the same time.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (node:test) |
| Config file | none — tests run directly with `node --test {file}` |
| Quick run command | `node --test .planning/phases/88-brand-system/tests/test-brand-system.cjs` |
| Full suite command | `node --test .planning/phases/88-brand-system/tests/test-brand-system.cjs` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BRAND-01 | system.md contains MKT-brand-system artifact filename pattern | unit (structural) | `node --test .planning/phases/88-brand-system/tests/test-brand-system.cjs` | Wave 0 |
| BRAND-01 | system.md contains businessMode gate before MKT generation | unit (structural) | same | Wave 0 |
| BRAND-01 | system.md contains positioning-statement, tone-of-voice, visual-differentiation section markers | unit (structural) | same | Wave 0 |
| BRAND-02 | system.md contains SYS-brand-tokens.json filename pattern | unit (structural) | same | Wave 0 |
| BRAND-02 | system.md contains brand-marketing DTCG group key | unit (structural) | same | Wave 0 |
| BRAND-02 | system.md designCoverage write contains all 20 fields including hasBusinessThesis | unit (structural) | same | Wave 0 |
| BRAND-03 | MKT artifact frontmatter references BRF,BTH as dependsOn | unit (structural) | same | Wave 0 |
| BRAND-03 | references/launch-frameworks.md contains Brand System section | unit (structural) | same | Wave 0 |

All 8 structural assertions read `workflows/system.md` and `references/launch-frameworks.md` from the project root — no runtime execution of the workflow.

### Sampling Rate

- **Per task commit:** `node --test .planning/phases/88-brand-system/tests/test-brand-system.cjs`
- **Per wave merge:** same (single file contains all assertions)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `.planning/phases/88-brand-system/tests/test-brand-system.cjs` — covers BRAND-01, BRAND-02, BRAND-03 (8 structural assertions against `workflows/system.md` and `references/launch-frameworks.md`)

*(Framework install: not needed — node:test is built-in to Node.js ≥18 which is already in use)*

---

## Sources

### Primary (HIGH confidence)

- `workflows/system.md` (full read, 2033 lines) — DTCG token structure, Step 5b experience pattern, Step 7 designCoverage write, manifest registration pattern, anti-patterns section
- `workflows/flows.md` (grep analysis) — businessMode detection pattern, sub-step insertion pattern (Step 4f/4g), 20-field designCoverage write, SBP/GTM artifact registration
- `workflows/brief.md` (grep analysis) — Domain Strategy section (BRIEF-05), brand positioning seeds contract for Phase 88, Steps 5b/5c pattern
- `references/business-track.md` (full read, 92 lines) — track definitions, depth thresholds, vocabulary substitutions, consumer list (confirms system.md is listed as Phase 88 consumer)
- `references/launch-frameworks.md` (full read, 169 lines) — current scope (Lean Canvas, Pitch Deck, Service Blueprint, Pricing Config), confirmed NO Brand System section exists
- `.planning/REQUIREMENTS.md` — BRAND-01, BRAND-02, BRAND-03 verbatim requirements
- `.planning/phases/87-flows-stage/87-VERIFICATION.md` — confirmed test pattern, test run command, 20-field upgrade evidence
- `.planning/phases/87-flows-stage/tests/test-flows-sbp.cjs` — canonical test file structure for Phase 88 test to follow

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` — project decisions log, confirmed sub-step insertion is the locked architectural pattern for all v0.12 business mode additions

### Tertiary (LOW confidence)

None — all research was performed against project source files with direct evidence.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tooling verified against project source files; no external dependencies needed
- Architecture patterns: HIGH — derived directly from established Phase 87 and Phase 74/76 precedent patterns in the codebase
- Pitfalls: HIGH — derived from code analysis of current system.md gaps (16-field coverage write confirmed by reading lines 1938-1943; no businessMode detection in system.md confirmed by grep; no Brand System in launch-frameworks.md confirmed by full file read)

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable internal tooling, no external dependencies)
