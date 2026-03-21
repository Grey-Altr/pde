# Phase 75: Brief Extensions — Research

**Researched:** 2026-03-21
**Domain:** Extending `workflows/brief.md` to capture five experience-specific fields when product type is `experience`, with zero impact on non-experience product types
**Confidence:** HIGH — grounded entirely in direct codebase inspection of Phase 74 output and current brief.md implementation

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BREF-01 | Experience brief captures promise statement (one sentence an attendee tells a friend) | Step 5 synthesis section in brief.md is the insertion point; section name `## Promise Statement` follows established heading pattern |
| BREF-02 | Experience brief captures vibe contract (emotional arc with peak timing, energy level, aesthetic register) | Step 5 synthesis section; section name `## Vibe Contract`; field structure derived from event planning domain terminology |
| BREF-03 | Experience brief captures audience archetype (crowd composition, mobility needs, group size, energy profile) | Step 5 synthesis section; section name `## Audience Archetype`; replaces/extends personas for experience type |
| BREF-04 | Experience brief captures venue constraints (capacity, curfew, noise limits, load-in windows, fixed infrastructure) | Step 5 synthesis section; section name `## Venue Constraints`; feeds downstream spatial tokens (Phase 76) |
| BREF-05 | Experience brief captures repeatability intent (one-off vs series with cadence) | Step 5 synthesis section; section name `## Repeatability Intent`; links to REPT-01/REPT-02 future requirements |

</phase_requirements>

---

## Summary

Phase 75 extends `workflows/brief.md` to produce five additional output sections when the product type resolves to `experience`. All five fields were absent from the codebase before this phase. Phase 74 established detection and classification — Phase 75 is where that detection drives different content in the generated `BRF-brief-v{N}.md` file.

The core implementation is a conditional block in brief.md Step 5 (Synthesize brief content): when `product_type = "experience"`, after generating all common sections (Problem Statement, Target Users, Jobs to Be Done, Constraints, etc.), five additional experience-specific sections are written into the brief. When `product_type` is anything else, no new sections are written and the output must be byte-identical to the pre-milestone baseline.

The most important discovery from codebase inspection is that brief.md currently has an incomplete `## Product Type` section instruction: it says `**Type:** {software | hardware | hybrid}` (missing `experience`) and has no `For 'experience' type, the Design Constraints table MUST cover:` clause. Phase 75 must fix this alongside adding the five new sections. The `templates/design-brief.md` template has the same gap. Both files require targeted edits.

The second critical discovery is that "prompting" per the success criteria does not mean interactive Q&A. Brief.md generates content from PROJECT.md context — it does not interactively ask users for values field by field. The five new sections are synthesized from PROJECT.md content (plus any upstream context artifacts) exactly as all existing sections are. When a user's PROJECT.md provides insufficient context for a field, the brief generates a best-effort placeholder with a `[PROVIDE: ...]` marker pattern. This is the correct interpretation of "prompts for" in the success criteria — it means the fields appear in the output with structured placeholders when source data is thin.

**Primary recommendation:** Add one conditional block in brief.md Step 5 that fires only for `product_type === "experience"`, generating all five sections in a single guarded block. This is the minimum change that satisfies BREF-01 through BREF-05 without touching any non-experience code path.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:test` | Node.js built-in (v18+) | Test runner for Phase 75 Nyquist assertions | Established in Phase 74 and all prior test phases; zero npm dependency |
| `node:assert/strict` | Node.js built-in | Assertions | Same pattern used across phases 64-74 |
| `node:fs` / `node:path` | Node.js built-in | Read workflow .md files in tests | Established pattern |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pde-tools.cjs design manifest-set-top-level` | PDE built-in | Existing manifest write pattern | Already used for `productType` and `experienceSubType` in brief.md Step 7; no new commands needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Conditional block in existing Step 5 | New Step 5b for experience only | Conditional block is simpler and keeps step numbering unchanged; a new step would require renumbering Steps 6 and 7 and updating all step display messages |
| `[PROVIDE: ...]` marker for thin context | Hard-fail if field values absent | Soft placeholder preserves brief completeness; downstream Phase 76 tokens still generate with placeholders visible; hard-fail breaks the non-interactive workflow model |

**Installation:** No new packages. All test code uses Node.js built-ins. No npm install step required.

---

## Architecture Patterns

### Recommended Project Structure

```
tests/
└── phase-75/
    └── brief-extensions.test.mjs   # Nyquist assertions — written first (Wave 0)

workflows/
└── brief.md    # MODIFIED: +experience Design Constraints in Step 5, +5 experience sections in Step 5

templates/
└── design-brief.md    # MODIFIED: +experience to Type field, +experience Design Constraints clause
```

### Pattern 1: Conditional Experience Section Block in brief.md Step 5

**What:** A single `IF product_type == "experience"` guard in brief.md Step 5, after all common sections are written. Generates five named sections only for experience products. The entire block is skipped for non-experience types.

**When to use:** Only in brief.md Step 5, after `## Scope Boundaries`. This preserves the existing section order and keeps all five experience sections grouped together.

**Example:**

```markdown
**If `product_type == "experience"`**, after writing `## Scope Boundaries`, add these five sections in this order:

**`## Promise Statement`** — One sentence in the voice of an attendee: what they would tell a friend about this event. Synthesize from PROJECT.md event description, atmosphere goals, and any language about the intended attendee experience. If PROJECT.md does not provide enough context, write: `[PROVIDE: One sentence your attendee tells a friend — what makes this event unmissable?]`

**`## Vibe Contract`** — The emotional arc of the event with three components:
- **Emotional arc:** Opening mood → build → peak → comedown → departure feeling (derive from event goals in PROJECT.md)
- **Peak timing:** When does the event reach maximum energy? (derive from run-of-show signals in PROJECT.md, or `[PROVIDE: Peak timing — e.g., "midnight drop" or "golden hour finale"]`)
- **Aesthetic register:** The sensory vocabulary of the event: lighting aesthetic, sound character, material mood (derive from atmosphere signals in PROJECT.md)
- **Energy level:** Low / Medium / High / Transcendent — where does this sit on the physiological engagement scale?

**`## Audience Archetype`** — The crowd composition described in four dimensions:
| Dimension | Value |
|-----------|-------|
| Crowd composition | {demographic mix — age range, scene membership, first-timers vs regulars} |
| Mobility needs | {accessibility requirements — step-free, seating zones, companion spaces} |
| Group size | {typical party size — solo, pairs, groups of 4-6, large crews} |
| Energy profile | {physical engagement expectation — active dance floor, seated performance, mixed zones} |

Synthesize from PROJECT.md audience descriptions. Use `[PROVIDE: ...]` for any dimension with no PROJECT.md basis.

**`## Venue Constraints`** — The fixed physical parameters of the venue:
| Constraint | Value |
|------------|-------|
| Capacity | {maximum legal capacity — `[PROVIDE]` if unknown} [VERIFY WITH LOCAL AUTHORITY] |
| Curfew | {noise curfew time — `[PROVIDE]` if unknown} [VERIFY WITH LOCAL AUTHORITY] |
| Noise limits | {dB SPL limit or zone restrictions — `[PROVIDE]` if unknown} [VERIFY WITH LOCAL AUTHORITY] |
| Load-in windows | {when production can access the venue — `[PROVIDE]` if unknown} |
| Fixed infrastructure | {PA system, stage, lighting rigs, bar locations, structural restrictions} |

Synthesize from PROJECT.md venue signals. ALL numerical regulatory values MUST carry `[VERIFY WITH LOCAL AUTHORITY]` inline per `@references/experience-disclaimer.md`.

**`## Repeatability Intent`** — Whether this is a one-off or a series:

**Format:**
```markdown
**Type:** one-off | series
**Cadence:** {if series: weekly / monthly / quarterly / annual / irregular} | N/A
**Edition naming:** {if series: how editions are distinguished — "Autumn 2026", "Vol. 3", etc.} | N/A
**Template mode:** {enabled if series — downstream artifacts will include {{variable}} slots} | disabled
```

Derive from sub_type signals: `recurring-series` → series type. `single-night`, `multi-day`, `installation` → one-off unless PROJECT.md states otherwise.
```

**Critical:** The entire block above runs ONLY when `product_type == "experience"`. For software, hardware, and hybrid products, nothing in this block executes.

### Pattern 2: Experience Design Constraints in `## Product Type` Section

**What:** Add a `For 'experience' type, the Design Constraints table MUST cover:` clause to the Step 5 `## Product Type` section instruction in brief.md, parallel to the existing software/hardware/hybrid clauses.

**When to use:** brief.md Step 5, `## Product Type` section — exactly where the `For 'software' type, ...` and `For 'hardware' type, ...` clauses already live.

**Example:**

```markdown
For `experience` type, the Design Constraints table MUST cover:
- Venue capacity (legal maximum attendee count) — drives spatial token density targets in Phase 76
- Noise ordinance (applicable dB SPL limit or curfew time) — [VERIFY WITH LOCAL AUTHORITY]
- Egress requirement (minimum exit widths, emergency egress routes) — [VERIFY WITH LOCAL AUTHORITY]
- Accessibility standard (step-free access routes, BSL provision, quiet zones)
- Sub-type (single-night | multi-day | recurring-series | installation | hybrid-event) — locked by Phase 74 detection
```

**Also update:** The `**Type:** {software | hardware | hybrid}` line to `**Type:** {software | hardware | hybrid | experience}`.

### Pattern 3: Template Sync (design-brief.md)

**What:** The `templates/design-brief.md` file is used as the output structure reference in brief.md Step 5. It currently shows `**Type:** {software | hardware | hybrid}` and has no experience sections. Update it to reflect experience as a valid type and add the five experience section stubs.

**When to use:** Update `templates/design-brief.md` as part of the same task that modifies brief.md Step 5.

### Pattern 4: Regression Test Structure

**What:** `tests/phase-75/brief-extensions.test.mjs` — Nyquist structural assertions verifying the five new sections are present in brief.md and that non-experience product type sections are NOT contaminated.

**When to use:** Written in Wave 0 before any workflow modifications.

**Example:**

```javascript
// Phase 75 — Brief Extensions
// Source: follows exact pattern from tests/phase-74/experience-regression.test.mjs

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

describe('BREF-01: promise statement section in brief.md', () => {
  test('brief.md contains Promise Statement section generation instruction', () => {
    const content = readFileSync(join(ROOT, 'workflows/brief.md'), 'utf8');
    assert.ok(content.includes('Promise Statement'), 'brief.md missing Promise Statement section');
    assert.ok(content.includes('promise statement') || content.includes('Promise Statement'),
      'brief.md missing promise statement generation logic');
  });
});

describe('BREF-02: vibe contract section in brief.md', () => {
  test('brief.md contains Vibe Contract section generation instruction', () => {
    const content = readFileSync(join(ROOT, 'workflows/brief.md'), 'utf8');
    assert.ok(content.includes('Vibe Contract'), 'brief.md missing Vibe Contract section');
    assert.ok(content.includes('emotional arc'), 'brief.md missing emotional arc field');
  });
});

describe('BREF-03: audience archetype section in brief.md', () => {
  test('brief.md contains Audience Archetype section generation instruction', () => {
    const content = readFileSync(join(ROOT, 'workflows/brief.md'), 'utf8');
    assert.ok(content.includes('Audience Archetype'), 'brief.md missing Audience Archetype section');
    assert.ok(content.includes('mobility needs'), 'brief.md missing mobility needs field');
  });
});

describe('BREF-04: venue constraints section in brief.md', () => {
  test('brief.md contains Venue Constraints section generation instruction', () => {
    const content = readFileSync(join(ROOT, 'workflows/brief.md'), 'utf8');
    assert.ok(content.includes('Venue Constraints'), 'brief.md missing Venue Constraints section');
    assert.ok(content.includes('Curfew') || content.includes('curfew'), 'brief.md missing curfew field');
    assert.ok(content.includes('Noise limits') || content.includes('noise limits'), 'brief.md missing noise limits field');
  });
});

describe('BREF-05: repeatability intent section in brief.md', () => {
  test('brief.md contains Repeatability Intent section generation instruction', () => {
    const content = readFileSync(join(ROOT, 'workflows/brief.md'), 'utf8');
    assert.ok(content.includes('Repeatability Intent'), 'brief.md missing Repeatability Intent section');
    assert.ok(content.includes('one-off') || content.includes('series'), 'brief.md missing one-off/series field');
  });
});

describe('Cross-type regression: non-experience sections untouched', () => {
  test('experience sections are guarded by product_type conditional', () => {
    const content = readFileSync(join(ROOT, 'workflows/brief.md'), 'utf8');
    // The five experience sections must appear AFTER a product_type == experience guard
    const promiseIdx = content.indexOf('Promise Statement');
    const experienceGuardIdx = content.indexOf('product_type == "experience"') !== -1
      ? content.indexOf('product_type == "experience"')
      : content.indexOf("product_type === 'experience'");
    assert.ok(promiseIdx !== -1, 'Promise Statement section not found');
    assert.ok(experienceGuardIdx !== -1, 'No experience product_type guard found in brief.md');
    assert.ok(
      experienceGuardIdx < promiseIdx,
      'Experience guard must appear before Promise Statement section'
    );
  });

  test('brief.md still contains VERIFY WITH LOCAL AUTHORITY in venue constraints', () => {
    const content = readFileSync(join(ROOT, 'workflows/brief.md'), 'utf8');
    assert.ok(
      content.includes('VERIFY WITH LOCAL AUTHORITY'),
      'brief.md missing [VERIFY WITH LOCAL AUTHORITY] in venue constraints'
    );
  });
});
```

### Anti-Patterns to Avoid

- **Experience sections outside the guard:** Adding `## Promise Statement` to the COMMON section list (before the `product_type == "experience"` check) causes it to appear in software/hardware/hybrid briefs. Every experience-specific section MUST be inside the conditional block.
- **Hard-failing on thin PROJECT.md context:** If PROJECT.md has no event description, brief.md should not halt. Use `[PROVIDE: ...]` markers. Halting makes the skill useless for users who run it before fully specifying their project.
- **Forgetting the template sync:** `templates/design-brief.md` is the output structure reference. If brief.md Step 5 generates `## Promise Statement` but the template doesn't show it, there's a schema inconsistency that confuses downstream phases.
- **Adding `Sub-type` as a section of the brief:** Sub-type is already written to the manifest and DESIGN-STATE.md Quick Reference in Step 7 (Phase 74). It does NOT need to be a separate `## Sub-type` section in the brief body — that would be redundant. Sub-type belongs only in the `## Product Type` Design Constraints table row and in the manifest.
- **Inline disclaimer at the file level instead of field level:** The `[VERIFY WITH LOCAL AUTHORITY]` tag must appear on the same line as each specific regulatory value in `## Venue Constraints`, per `references/experience-disclaimer.md`. Grouping disclaimers at the bottom of the section violates the established pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Context-gathering for experience fields | Interactive Q&A prompt sequence | PROJECT.md synthesis with `[PROVIDE: ...]` markers | Brief.md is a synthesis skill, not a wizard; all other sections work the same way; forcing interactivity breaks `--dry-run` and `--force` flows |
| Regulatory value generation | Real occupancy limits, dB limits by jurisdiction | Placeholder values + `[VERIFY WITH LOCAL AUTHORITY]` inline tag | Jurisdiction-specific permits are explicitly out of scope (REQUIREMENTS.md); the disclaimer pattern exists in `references/experience-disclaimer.md` |
| New brief format for experience products | Separate `BRF-experience-brief-v{N}.md` file format | Experience sections appended to existing brief structure | Downstream consumers (flows.md, system.md) read from `BRF-brief-v*.md` path — a new filename breaks all existing artifact discovery logic |
| `[PROVIDE]` validation enforcement | Schema validation that rejects briefs with unfilled placeholders | Leave validation to the user — markers are visible and self-documenting | Phase 76+ skills will read these values; they handle absent/placeholder values gracefully |

**Key insight:** The brief.md generation model is always synthesis from PROJECT.md context, never interactive form collection. The five new sections follow this same model exactly. The only new behavior is the `IF product_type == "experience"` guard that enables them.

---

## Common Pitfalls

### Pitfall 1: Experience Sections Appear in Software Briefs

**What goes wrong:** The five new sections render in software product briefs because the conditional guard was placed incorrectly or forgotten.

**Why it happens:** Editing the wrong position in brief.md Step 5 — adding sections to the common section generation list rather than inside the experience-only conditional.

**How to avoid:** The product_type conditional guard MUST syntactically precede all five experience section generation instructions. The test `cross-type regression: experience sections guarded by product_type conditional` catches this structurally.

**Warning signs:** Running the regression test and seeing `experienceGuardIdx < promiseIdx` fail. Alternatively, manually generating a brief for a software product and seeing `## Promise Statement` appear in the output.

### Pitfall 2: Venue Constraints Without Disclaimers

**What goes wrong:** The `## Venue Constraints` section generates numerical values (capacity, dB limits, egress widths) without the `[VERIFY WITH LOCAL AUTHORITY]` inline tag.

**Why it happens:** The disclaimer reference file exists (`references/experience-disclaimer.md`) but its usage guidance (inline per value, not grouped at section end) is not followed in the generation instructions.

**How to avoid:** Each row in the Venue Constraints table that contains a regulatory value MUST include `[VERIFY WITH LOCAL AUTHORITY]` inline. The test `brief.md still contains VERIFY WITH LOCAL AUTHORITY in venue constraints` catches this.

**Warning signs:** Generating an experience brief and seeing a Capacity or Curfew value without the disclaimer tag.

### Pitfall 3: Template/Workflow Desync

**What goes wrong:** `workflows/brief.md` is updated to generate the five new sections, but `templates/design-brief.md` still shows only software/hardware/hybrid in the Product Type line. The template is the schema reference; downstream phases read it.

**Why it happens:** Two files to update, easy to miss the second one.

**How to avoid:** The planner must include `templates/design-brief.md` in the same task that modifies brief.md Step 5. One task, two files, atomic commit.

**Warning signs:** `templates/design-brief.md` still contains `**Type:** {software | hardware | hybrid}` after Phase 75.

### Pitfall 4: Sub-type Section Added as a Separate Brief Section

**What goes wrong:** A `## Sub-type` section or `## Experience Sub-type` section is added to the brief body, duplicating what Phase 74 already writes to `| Sub-type |` in DESIGN-STATE.md Quick Reference and `experienceSubType` in the manifest.

**Why it happens:** Natural to think "if there are 5 new sections, maybe sub-type is a 6th."

**How to avoid:** Sub-type is captured as a Design Constraints table row within `## Product Type` (one line) and in DESIGN-STATE/manifest (already implemented in Phase 74). It is NOT a standalone section. The requirements BREF-01 through BREF-05 enumerate exactly five fields — sub-type is not among them.

**Warning signs:** Brief body contains `## Sub-type` or `## Experience Sub-type` as a top-level heading.

### Pitfall 5: Software Brief Byte-Identity Broken

**What goes wrong:** The success criteria requires "Running `/pde:brief` for a software product produces no new fields — existing output is byte-identical to pre-milestone baseline." A change to the common section generation logic (not the experience-only block) breaks this.

**Why it happens:** Editing brief.md Step 5 common section instructions while also adding the experience block — a whitespace change, a reordering, or an accidental section addition.

**How to avoid:** Only edit two places in brief.md Step 5: (1) add experience to the `**Type:**` enum line and add the `For 'experience' type` Design Constraints clause, (2) add the five-section conditional block at the END of the common section sequence (after `## Scope Boundaries`). Do not touch any other existing instruction text.

**Warning signs:** Diffing the brief output for a software project before and after Phase 75 reveals any difference in the common sections.

---

## Code Examples

Verified patterns from direct codebase inspection:

### Exact Insertion Location in brief.md Step 5

The five experience sections go AFTER the existing `## Scope Boundaries` instruction block, which ends at approximately line 410 of the current brief.md. The block to add:

```markdown
<!-- Source: brief.md Step 5 — experience-specific section generation, Phase 75 -->
**If `product_type == "experience"`**, write these five additional sections after `## Scope Boundaries`:

[five section definitions as documented in Pattern 1]
```

### Experience Design Constraints Block (brief.md Step 5, `## Product Type` section)

Insert after the existing `For 'hybrid' type, include BOTH software AND hardware...` clause:

```markdown
For `experience` type, the Design Constraints table MUST cover:
- Venue capacity (legal maximum attendee count) — [VERIFY WITH LOCAL AUTHORITY]
- Noise ordinance (dB SPL limit at boundary / curfew time) — [VERIFY WITH LOCAL AUTHORITY]
- Egress requirement (minimum exit count, route widths, emergency egress) — [VERIFY WITH LOCAL AUTHORITY]
- Accessibility standard (step-free access routes, BSL provision, quiet zones, platform seating)
- Sub-type (single-night | multi-day | recurring-series | installation | hybrid-event) — detected in Step 4
```

### design-brief.md Template Update

```markdown
<!-- BEFORE -->
**Type:** {software | hardware | hybrid}

<!-- AFTER -->
**Type:** {software | hardware | hybrid | experience}
```

And add experience section stubs at the end of the template (after Scope Boundaries):

```markdown
<!-- Experience product type only — omit for software, hardware, hybrid -->
## Promise Statement

{One sentence an attendee tells a friend}

## Vibe Contract

- **Emotional arc:** {opening mood → build → peak → comedown → departure feeling}
- **Peak timing:** {when peak energy occurs}
- **Aesthetic register:** {lighting aesthetic, sound character, material mood}
- **Energy level:** {Low | Medium | High | Transcendent}

## Audience Archetype

| Dimension | Value |
|-----------|-------|
| Crowd composition | {demographic mix} |
| Mobility needs | {accessibility requirements} |
| Group size | {typical party size} |
| Energy profile | {physical engagement expectation} |

## Venue Constraints

| Constraint | Value |
|------------|-------|
| Capacity | {maximum legal capacity} [VERIFY WITH LOCAL AUTHORITY] |
| Curfew | {noise curfew time} [VERIFY WITH LOCAL AUTHORITY] |
| Noise limits | {dB SPL limit} [VERIFY WITH LOCAL AUTHORITY] |
| Load-in windows | {when production can access venue} |
| Fixed infrastructure | {PA, stage, lighting rigs, bar locations, structural restrictions} |

## Repeatability Intent

**Type:** one-off | series
**Cadence:** {weekly / monthly / quarterly / annual / irregular} | N/A
**Edition naming:** {how editions are distinguished} | N/A
**Template mode:** enabled | disabled
```

### Regression Test Running

```bash
# Wave 0: run before any workflow edits (expected to FAIL — validates pre-state)
node --test tests/phase-75/brief-extensions.test.mjs

# After implementation: run to confirm all BREF requirements pass
node --test tests/phase-75/brief-extensions.test.mjs

# Always run Phase 74 smoke matrix to confirm no regression
node --test tests/phase-74/experience-regression.test.mjs
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| brief.md generates same sections for all product types | brief.md generates 5 additional sections for experience type | Phase 75 | Downstream phases 76-81 now have experience-specific data to parametrize |
| `**Type:** {software \| hardware \| hybrid}` | `**Type:** {software \| hardware \| hybrid \| experience}` | Phase 75 | Brief correctly names experience type in Design Constraints output |
| No venue constraints in briefs | `## Venue Constraints` table in experience briefs | Phase 75 | Capacity feeds spatial token density in Phase 76; curfew feeds handoff in Phase 81 |
| No repeatability concept in PDE | `## Repeatability Intent` drives template mode in REPT-01/REPT-02 | Phase 75 | Foundation for series identity system in future milestones |

**Pattern confirmed unchanged:** The `manifest-set-top-level experienceSubType` command and Sub-type row in DESIGN-STATE.md Quick Reference were added in Phase 74. Phase 75 does NOT re-implement these — they already exist. Phase 75 only extends the BRF artifact content (the `.md` brief file body).

---

## Open Questions

1. **Interaction model for "prompts for" in the success criteria**
   - What we know: brief.md generates content from PROJECT.md synthesis — it does not run an interactive form wizard. The existing brief generation for all 9+ sections is non-interactive.
   - What's unclear: Whether "prompts for" in the success criteria means (a) the generated brief contains prompts/placeholders for the user to fill in when PROJECT.md context is thin, or (b) the skill literally asks the user interactive questions before generating.
   - Recommendation: Interpret as (a) — synthesis with `[PROVIDE: ...]` markers. This is consistent with every other section in the brief and with the `--dry-run` / `--force` flag model. Interactive prompting would break flag-driven workflows and the non-interactive `autonomous: true` execution model.
   - Confidence: HIGH — no other section in brief.md uses interactive input; PROJECT.md is the canonical input model.

2. **Whether `## Audience Archetype` replaces or supplements `## Target Users`**
   - What we know: `## Target Users` is a common section generated for ALL product types (personas, JTBD). Audience archetype is an experience-specific concept. These overlap but are not identical — personas focus on individual user psychology, while audience archetype describes crowd-level composition.
   - What's unclear: Should experience briefs have BOTH `## Target Users` (individual promoter/attendee personas) AND `## Audience Archetype` (crowd composition), or should `## Audience Archetype` replace `## Target Users`?
   - Recommendation: Keep BOTH. `## Target Users` remains a common section (includes the promoter persona as primary, and the attendee persona as secondary). `## Audience Archetype` is an ADDITIONAL experience-only section that describes the crowd at an aggregate level — this feeds Phase 76 spatial token density calculations, which operate on crowd-level data, not individual personas.
   - Confidence: MEDIUM — reasonable inference from how downstream phases consume brief data; not explicitly specified in REQUIREMENTS.md.

3. **`[PROVIDE: ...]` marker standardization**
   - What we know: No existing brief section currently uses a `[PROVIDE: ...]` marker pattern. This is a new pattern introduced for experience-specific fields.
   - What's unclear: Whether a standard marker already exists in any PDE reference file that Phase 75 should reuse.
   - Recommendation: Introduce `[PROVIDE: ...]` as the standard thin-context placeholder marker for Phase 75. It is self-documenting and visually distinct from `[VERIFY WITH LOCAL AUTHORITY]` (which is a regulatory disclaimer, not a user input request).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` (Node.js 18+) |
| Config file | None — tests are standalone .mjs files |
| Quick run command | `node --test tests/phase-75/brief-extensions.test.mjs` |
| Full suite command | `node --test tests/phase-75/*.mjs && node --test tests/phase-74/experience-regression.test.mjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BREF-01 | brief.md generates `## Promise Statement` for experience type | structural | `node --test tests/phase-75/brief-extensions.test.mjs` | Wave 0 |
| BREF-02 | brief.md generates `## Vibe Contract` with emotional arc fields | structural | `node --test tests/phase-75/brief-extensions.test.mjs` | Wave 0 |
| BREF-03 | brief.md generates `## Audience Archetype` with mobility needs field | structural | `node --test tests/phase-75/brief-extensions.test.mjs` | Wave 0 |
| BREF-04 | brief.md generates `## Venue Constraints` with curfew, noise limits | structural | `node --test tests/phase-75/brief-extensions.test.mjs` | Wave 0 |
| BREF-05 | brief.md generates `## Repeatability Intent` with one-off/series field | structural | `node --test tests/phase-75/brief-extensions.test.mjs` | Wave 0 |
| Cross-type | Experience sections guarded by product_type conditional | structural | `node --test tests/phase-75/brief-extensions.test.mjs` | Wave 0 |
| Cross-type | `[VERIFY WITH LOCAL AUTHORITY]` present in venue constraints section | structural | `node --test tests/phase-75/brief-extensions.test.mjs` | Wave 0 |
| Regression | Phase 74 smoke matrix still passes (no regression) | structural | `node --test tests/phase-74/experience-regression.test.mjs` | Exists (Phase 74) |

### Sampling Rate

- **Per task commit:** `node --test tests/phase-75/brief-extensions.test.mjs`
- **Per wave merge:** `node --test tests/phase-75/*.mjs && node --test tests/phase-74/experience-regression.test.mjs`
- **Phase gate:** Both test suites green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-75/brief-extensions.test.mjs` — covers BREF-01 through BREF-05 plus cross-type regression assertions; must be written BEFORE any workflow edits

---

## Key Discoveries from Codebase Inspection

These findings answer the "what I don't know that I don't know" question:

1. **The `## Product Type` section in brief.md Step 5 currently reads `**Type:** {software | hardware | hybrid}` — it does NOT include `experience`.** This must be fixed in Phase 75. The design-brief.md template has the same gap. Fixing only brief.md's five new sections without fixing the Product Type line leaves experience type incorrectly documented in every generated brief.

2. **Brief.md generates from PROJECT.md context — it does NOT interactively ask users for field values.** The success criteria phrase "prompts for" means the generated brief contains structured placeholders when source data is insufficient. No interactive input flow is built anywhere in the existing skill.

3. **The five new sections belong AFTER `## Scope Boundaries` in Step 5, guarded by a single `IF product_type == "experience"` conditional.** This is the minimum-change approach. The common section sequence must not be reordered.

4. **`[VERIFY WITH LOCAL AUTHORITY]` must appear inline per regulatory value in `## Venue Constraints`, not grouped at the section end.** This is specified in `references/experience-disclaimer.md` which was wired into critique.md and handoff.md in Phase 74. Phase 75 must honor the same inline requirement when generating the venue constraints table.

5. **Sub-type is already fully handled by Phase 74** (manifest field, DESIGN-STATE Quick Reference row, brief.md Step 7 write). Phase 75 does NOT re-implement sub-type storage. Sub-type appears in the `## Product Type` Design Constraints table as ONE row — that's its only new presence in the brief body.

6. **Downstream consumers (flows.md, system.md) read from `BRF-brief-v*.md` by Glob.** They extract `Product type from the brief frontmatter or Product Type section` (confirmed at flows.md line 68). Phase 76 reads `PRODUCT_TYPE` from `**Type:**` line. The brief's `## Product Type` section MUST correctly show `experience` for downstream to branch correctly.

---

## Sources

### Primary (HIGH confidence)

- `workflows/brief.md` (direct codebase inspection, 2026-03-21) — Step 4 detection logic (lines 170-224); Step 5 section generation instructions (lines 227-413); Step 7 manifest write (lines 446-528); anti-patterns (lines 553-561); complete understanding of the synthesis-from-PROJECT.md model
- `workflows/flows.md` (direct codebase inspection, 2026-03-21) — lines 52-73 confirm how brief is consumed: `extract product type from the brief frontmatter or Product Type section`; Phase 74 experience stub at line 72
- `workflows/system.md` (direct codebase inspection, 2026-03-21) — lines 59-88 confirm PRODUCT_TYPE extraction from brief `**Type:**` line; Phase 74 stub at line 71
- `templates/design-brief.md` (direct codebase inspection, 2026-03-21) — confirmed `**Type:** {software | hardware | hybrid}` (line 19) missing `experience`; confirmed no experience sections in template
- `templates/design-state-root.md` (direct codebase inspection, 2026-03-21) — confirmed `Sub-type` row already exists (Phase 74 implementation); no Phase 75 changes needed to this file
- `references/experience-disclaimer.md` (direct codebase inspection, 2026-03-21) — confirmed inline-per-value disclaimer requirement
- `tests/phase-74/experience-regression.test.mjs` (direct codebase inspection, 2026-03-21) — confirmed test patterns, ROOT resolution, describe/test structure; Phase 75 tests follow identical pattern
- `.planning/phases/74-*/74-01-PLAN.md` (direct inspection, 2026-03-21) — confirmed experienceSubType manifest write already implemented; DESIGN-STATE Sub-type row already implemented
- `.planning/phases/74-*/74-02-SUMMARY.md` (direct inspection, 2026-03-21) — confirmed Phase 74 complete, all stubs in place, no regressions

### Secondary (MEDIUM confidence)

- `.planning/REQUIREMENTS.md` (authoritative requirements source, 2026-03-21) — BREF-01 through BREF-05 field descriptions; success criteria for software byte-identity
- `.planning/STATE.md` (authoritative project state, 2026-03-21) — confirmed "all experience behavior lives as conditional blocks in existing workflow files" as locked irreversible decision; Phase 75 is next

### Tertiary (LOW confidence)

- None — all findings grounded in direct codebase inspection or project-defined locked decisions

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — `node:test` is the established pattern across 6+ phases; no new tools
- Architecture: HIGH — fully derivable from direct codebase inspection; software/hardware/hybrid precedent is the exact model
- Pitfalls: HIGH — all five pitfalls derived from actual codebase gaps (confirmed by inspection) and prior phase patterns; not speculative

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable domain — no external dependencies; codebase is the reference)
