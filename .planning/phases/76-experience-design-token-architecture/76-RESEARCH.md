# Phase 76: Experience Design Token Architecture — Research

**Researched:** 2026-03-21
**Domain:** Extending `workflows/system.md` to generate `SYS-experience-tokens.json` (six physical-domain token categories, max 30 tokens) alongside the base `SYS-tokens.json` when product type is `experience`, without polluting the base file or the `tokens-to-css` pipeline
**Confidence:** HIGH — grounded entirely in direct codebase inspection of the existing system.md, design.cjs, pde-tools.cjs, and the Phase 74/75 test patterns

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DSYS-01 | Sonic design tokens generated (genre/BPM corridor, volume curve, system spec, transition strategy) | Token schema defined from brief Vibe Contract and Venue Constraints fields established by Phase 75; category key `sonic` in experience token file |
| DSYS-02 | Lighting design tokens generated (color palette per zone/phase, intensity curve, fixture types, house lights protocol) | Derived from Vibe Contract aesthetic register + venue infrastructure; category key `lighting` in experience token file |
| DSYS-03 | Spatial design tokens generated (zone definitions with mood, density targets, sightlines, material palette) | Derived from Venue Constraints capacity and Audience Archetype crowd data; category key `spatial` |
| DSYS-04 | Thermal/atmospheric tokens generated (ventilation, outdoor/indoor transitions, haze levels) | Derived from venue constraints and aesthetic register; category key `atmospheric` |
| DSYS-05 | Wayfinding design tokens generated (sign hierarchy, arrow/icon standards, legibility distances, outdoor contrast) | Derived from spatial zone data and capacity; category key `wayfinding` |
| DSYS-06 | Brand coherence tokens generated (flyer → wristband → signage → merch identity, tone of voice, sensory signature) | Derived from Vibe Contract and brief brand signals; category key `brand-coherence` |
| DSYS-07 | Experience tokens stored in separate file (SYS-experience-tokens.json) to prevent schema pollution | Architecture decision locked in STATE.md: "Experience tokens live in SYS-experience-tokens.json, never merged into SYS-tokens.json — established in Phase 76, irreversible" |

</phase_requirements>

---

## Summary

Phase 76 extends `workflows/system.md` with a conditional block that fires only when `PRODUCT_TYPE == "experience"`. When triggered, it generates a second JSON file (`SYS-experience-tokens.json`) containing six physical-domain token categories derived from the five experience brief fields added in Phase 75 (Promise Statement, Vibe Contract, Audience Archetype, Venue Constraints, Repeatability Intent). The base `SYS-tokens.json` must not change — its contents must be byte-identical to what a non-experience product generates.

The separation is architecturally locked. STATE.md records: "Experience tokens live in SYS-experience-tokens.json, never merged into SYS-tokens.json — established in Phase 76, irreversible." The system.md Step 2 stub already carries the marker: `<!-- Experience product type: experience-specific design system extensions (SYS-experience-tokens.json) added in Phase 76. Phase 74 stub — proceed with software path as temporary fallback for experience product type. -->`. Phase 76 replaces that stub comment with the real conditional block.

The Phase 82 milestone test has seven `test.todo()` markers for Phase 76 (DSYS-01 through DSYS-07) that must be converted to positive passing assertions, exactly as Phase 75 did for its BREF markers.

The 30-token cap is a hard constraint named in the success criteria and DSYS-07's spirit. With 6 categories and ~5 tokens per category, the cap is achievable. Token design must be prescriptive (one "best" value per field, not a palette scale) — these are operational descriptors, not visual primitives like color steps.

**Primary recommendation:** Add one conditional block in system.md Step 5 (after SYS-tokens.json generation) that gates on `PRODUCT_TYPE == "experience"` and writes a separate `SYS-experience-tokens.json` with 6 category keys. Add a `tokens-to-css --experience` flag path in the CLI invocation (or as a separate workflow step). Write Wave 0 tests first. Update Phase 82 milestone test todo markers to passing assertions at completion.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:test` | Node.js built-in (v18+) | Test runner for Phase 76 Nyquist assertions | Established across phases 64-75; zero npm dependency |
| `node:assert/strict` | Node.js built-in | Assertions | Same pattern in all existing test files |
| `node:fs` / `node:path` | Node.js built-in | Read workflow and generated JSON files in tests | Established pattern |
| `pde-tools.cjs design tokens-to-css` | PDE built-in | Convert DTCG JSON to CSS custom properties | Already handles the base file; must accept the experience file path via same interface |
| `pde-tools.cjs design manifest-update` | PDE built-in | Register `SYS-EXP` artifact in design-manifest.json | Existing command, no changes needed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pde-tools.cjs design manifest-set-top-level` | PDE built-in | Write `hasExperienceTokens: true` coverage flag if added to schema | Only if a new coverage flag is introduced; current 16-field schema does not include it yet |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate `SYS-experience-tokens.json` | Merged into `SYS-tokens.json` under `experience` key | Architecture is locked: merging violates DSYS-07 and the STATE.md irreversible decision |
| Operational token schema (single value per field) | DTCG 11-step palette per field | Sonic BPM, lighting intensity, zone density are operational specs — palette scales don't apply; one value with `$value`/`$type` is correct |
| New `tokens-to-css --experience` flag on CLI | Separate CLI subcommand | Flag is simpler; the existing `cmdTokensToCss` already accepts any file path — the `--experience` flag needs no code change to the library, only to the workflow instruction |

**Installation:** No new packages. All code uses Node.js built-ins and existing pde-tools.cjs.

---

## Architecture Patterns

### Recommended Project Structure

```
tests/
├── phase-74/
│   └── experience-regression.test.mjs  # MUST still pass after Phase 76
├── phase-75/
│   └── brief-extensions.test.mjs       # MUST still pass after Phase 76
├── phase-76/
│   └── experience-tokens.test.mjs      # NEW: Nyquist assertions (Wave 0 first)
└── phase-82/
    └── milestone-completion.test.mjs   # MUST be updated: flip DSYS todo markers to passing tests

workflows/
└── system.md    # MODIFIED: replace Phase 74 stub with real experience conditional block
```

### Pattern 1: Phase 74 Stub Replacement in system.md Step 2

**What:** The Phase 74 stub comment at line 71 in system.md (`<!-- Experience product type: experience-specific design system extensions (SYS-experience-tokens.json) added in Phase 76. Phase 74 stub — proceed with software path as temporary fallback for experience product type. -->`) is the anchor insertion point. Phase 76 replaces this with real conditional behavior.

**When to use:** Immediately after the `PRODUCT_TYPE` extraction line in Step 2. The stub comment was placed here to mark where Phase 76 behavior begins — when PRODUCT_TYPE is "experience", the standard Steps 3-5 still run (generating the base SYS-tokens.json identically), but a new Step 5b generates the experience file.

**Example:**
```markdown
  - `PRODUCT_TYPE` — from `**Type:**` line in brief (software|hardware|hybrid|experience)
  <!-- Experience product type: Phase 76 — generate SYS-experience-tokens.json after SYS-tokens.json (Step 5b) -->
```

### Pattern 2: Conditional Experience Token Block in system.md Step 5

**What:** After Step 5 writes `SYS-tokens.json` (File 1 in the step), add a conditional Step 5b that fires only for `PRODUCT_TYPE == "experience"`. Reads the five Phase 75 brief fields (Vibe Contract, Venue Constraints, Audience Archetype, Promise Statement) and generates `SYS-experience-tokens.json` with 6 categories.

**When to use:** Placement is Step 5 (file generation), not Step 4 (token data computation). This preserves the existing step structure and ensures the base token file is already written before the experience file is attempted.

**Structural example:**
```markdown
#### Step 5b: Experience token file (experience products only)

**IF `PRODUCT_TYPE == "experience"`:**

Read the five experience brief sections from the loaded brief file:
- `VIBE_CONTRACT` — Emotional arc, peak timing, aesthetic register, energy level
- `VENUE_CONSTRAINTS` — Capacity, curfew, noise limits, fixed infrastructure
- `AUDIENCE_ARCHETYPE` — Crowd composition, mobility needs, group size, energy profile
- `PROMISE_STATEMENT` — One-sentence attendee summary

Generate `SYS-experience-tokens.json` as a DTCG-compliant JSON file with 6 top-level keys:
`sonic`, `lighting`, `spatial`, `atmospheric`, `wayfinding`, `brand-coherence`.

Total token count across all 6 categories MUST NOT exceed 30 leaf nodes.

Write to: `.planning/design/visual/SYS-experience-tokens.json`

Register in manifest:
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS-EXP path ".planning/design/visual/SYS-experience-tokens.json"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS-EXP type experience-tokens
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS-EXP domain visual
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS-EXP status draft
```
```

### Pattern 3: tokens-to-css --experience Flag

**What:** The success criteria require `tokens-to-css --experience` to produce `SYS-experience-tokens.css`. The existing `pde-tools.cjs design tokens-to-css <file>` already accepts any file path. The `--experience` flag is a workflow instruction to pass the experience file path, not a new CLI feature.

**When to use:** In system.md summary / after Step 5b, add one sentence:
```markdown
To generate CSS from the experience token file:
```bash
CSS_EXP=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design tokens-to-css ".planning/design/visual/SYS-experience-tokens.json" --raw)
```
Write the output to `.planning/design/visual/SYS-experience-tokens.css`.
```

**Important:** The existing `cmdTokensToCss` function in `design.cjs` is already capable — it accepts any path. No changes to `design.cjs` or `pde-tools.cjs` are needed.

### Pattern 4: Wave 0 TDD — Tests Written Before Workflow Edits

**What:** Write `tests/phase-76/experience-tokens.test.mjs` with all DSYS structural assertions BEFORE editing `system.md`. Tests must fail first (confirming the pre-state), then pass after the workflow edit.

**Example test structure:**
```javascript
// Phase 76 — Experience Design Token Architecture
// Nyquist structural assertions for DSYS-01 through DSYS-07.
// Written BEFORE workflow edits (Wave 0) — expected to FAIL until system.md is updated.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

function readWorkflow(name) {
  return readFileSync(join(ROOT, name), 'utf8');
}

// DSYS-07: Separate file assertion (structural — verifies system.md instruction)
describe('DSYS-07: experience tokens in separate file', () => {
  test('system.md instructs generation of SYS-experience-tokens.json separate from SYS-tokens.json', () => {
    const content = readWorkflow('workflows/system.md');
    assert.ok(
      content.includes('SYS-experience-tokens.json'),
      'system.md missing SYS-experience-tokens.json generation instruction'
    );
  });
  test('system.md contains product_type == "experience" guard before SYS-experience-tokens.json', () => {
    const content = readWorkflow('workflows/system.md');
    const guardIdx = content.indexOf('PRODUCT_TYPE == "experience"') !== -1
      ? content.indexOf('PRODUCT_TYPE == "experience"')
      : content.indexOf("product_type == 'experience'");
    const expFileIdx = content.indexOf('SYS-experience-tokens.json');
    assert.ok(guardIdx !== -1, 'system.md missing PRODUCT_TYPE experience guard');
    assert.ok(expFileIdx !== -1, 'system.md missing SYS-experience-tokens.json reference');
    assert.ok(guardIdx < expFileIdx, 'guard must appear before SYS-experience-tokens.json instruction');
  });
});
```

### Pattern 5: Phase 82 Test Migration (todo → passing)

**What:** The seven `test.todo()` markers for Phase 76 in `tests/phase-82/milestone-completion.test.mjs` (lines 264-270) must be replaced with positive assertions once system.md is updated. This is mandatory — Phase 75 established this pattern.

**The markers to replace:**
```javascript
test.todo('Phase 76: DSYS-01 — sonic design tokens generated');
test.todo('Phase 76: DSYS-02 — lighting design tokens generated');
test.todo('Phase 76: DSYS-03 — spatial design tokens generated');
test.todo('Phase 76: DSYS-04 — thermal/atmospheric tokens generated');
test.todo('Phase 76: DSYS-05 — wayfinding design tokens generated');
test.todo('Phase 76: DSYS-06 — brand coherence tokens generated');
test.todo('Phase 76: DSYS-07 — experience tokens in separate SYS-experience-tokens.json');
```

**Replaced by a describe block similar to Phase 75's BREF replacement:**
```javascript
describe('Phase 76 — experience design token architecture (COMPLETE)', () => {
  test('system.md instructs generation of SYS-experience-tokens.json for experience products (DSYS-07)', () => {
    const content = readWorkflow('workflows/system.md');
    assert.ok(content.includes('SYS-experience-tokens.json'), 'DSYS-07 not implemented');
  });
  test('system.md includes sonic token generation (DSYS-01)', () => {
    const content = readWorkflow('workflows/system.md');
    assert.ok(content.includes('sonic'), 'DSYS-01 sonic tokens missing from system.md');
  });
  // ... DSYS-02 through DSYS-06 similarly
});
```

**The existing Phase 74 stub assertion MUST also be updated:** Line 221-227 in milestone-completion.test.mjs asserts `system.md still has Phase 74 stub (Phase 76 pending)` — this test checks that the Phase 74 stub comment is still present. Once Phase 76 replaces the stub, this assertion will fail. It must be removed or replaced with a positive Phase 76 assertion in the same commit as the system.md edit.

### Anti-Patterns to Avoid

- **Merging experience tokens into SYS-tokens.json:** Architecture is locked irreversible in STATE.md. Any `sonic`, `lighting`, etc. category appearing in the base file violates DSYS-07 and breaks the byte-identical regression test (success criterion 4).
- **Skipping `$type` on leaf nodes:** W3C DTCG 2025.10 requires `$type` on every leaf node. The existing `dtcgToCssLines` function in `design.cjs` already handles this format — omitting `$type` would produce silent breakage in `tokens-to-css`.
- **Building a palette scale for operational tokens:** Experience token values are operational specs (e.g., `"bpm-range": "120-132"`), not visual primitives. Do not generate 11-step scales — one value per token is correct.
- **Removing the Phase 74 stub comment without also updating Phase 82 test:** The milestone-completion.test.mjs line 221 asserts the stub is still present. Removing the stub without updating this test will cause the Phase 82 suite to fail.
- **Writing experience tokens for non-experience products:** The `IF PRODUCT_TYPE == "experience"` guard must gate the entire Step 5b block. Non-experience products must never generate `SYS-experience-tokens.json`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSS custom property generation from experience JSON | Custom serializer | `pde-tools.cjs design tokens-to-css <path>` | Already handles DTCG → CSS; accepts any file path; `design.cjs`'s `dtcgToCssLines` is the tested implementation |
| Manifest artifact registration | Direct JSON writes | `pde-tools.cjs design manifest-update SYS-EXP <field> <value>` | Existing tool handles write and updatedAt timestamp; matches all other artifact registrations in system.md |
| Test runner | Any external test library | `node:test` + `node:assert/strict` | Established in all phases 64-76; zero npm dependency |

**Key insight:** The `tokens-to-css` CLI is already a general-purpose DTCG-to-CSS transformer. No new code is required in `design.cjs` or `pde-tools.cjs` — the experience CSS is generated by passing the experience JSON file path to the existing command.

---

## Common Pitfalls

### Pitfall 1: Phase 82 Stub Test Breakage

**What goes wrong:** Editing system.md to remove the Phase 74 stub comment causes the Phase 82 test at line 221 to fail: `'system.md still has Phase 74 stub (Phase 76 pending)'`. This assertion was written to confirm Phase 76 is NOT yet implemented — it breaks the moment Phase 76 is implemented.

**Why it happens:** The Phase 82 test intentionally uses negative/stub detection to track which phases are still pending. The same breakage pattern occurred in Phase 75 (BREF negative assertions).

**How to avoid:** Plan must include updating the Phase 82 test in the same wave as the system.md edit. Never commit the system.md change without also committing the Phase 82 test update.

**Warning signs:** Running `node --test tests/phase-82/milestone-completion.test.mjs` fails on `system.md still has Phase 74 stub (Phase 76 pending)`.

### Pitfall 2: Base Token Pollution

**What goes wrong:** Experience token categories (`sonic`, `lighting`, etc.) appear in `SYS-tokens.json` instead of only in `SYS-experience-tokens.json`. This violates success criterion 4 ("SYS-tokens.json for an experience project is byte-identical to a software project's token file").

**Why it happens:** The generation logic in system.md Step 4 or Step 5 is modified unconditionally instead of being gated on `PRODUCT_TYPE == "experience"`.

**How to avoid:** The experience block must be Step 5b (after SYS-tokens.json is written), not an addition to Step 4 (shared token computation). Step 4 generates the base token data — do not touch it for experience products.

**Warning signs:** Test assertion checking that the base token file does NOT contain `sonic`, `lighting`, etc. keys.

### Pitfall 3: Over-Engineering Token Schema

**What goes wrong:** Attempting to model experience tokens as visual token palettes (11-step scales, semantic aliases, dark mode variants) in the same style as the base design system. This generates far more than 30 tokens and produces meaningless scales.

**Why it happens:** The DTCG format encourages scale-based thinking for visual tokens. Experience tokens are fundamentally different — they are operational specs, not visual variables.

**How to avoid:** Each DSYS category should have no more than 5 leaf nodes. BPM is a range string, volume curve is an enumeration, lighting palette is 3-4 zone colors. The 30-token cap enforces this discipline.

**Warning signs:** Token count exceeds 30 in `SYS-experience-tokens.json`.

### Pitfall 4: tokens-to-css CLI Flag Confusion

**What goes wrong:** Assuming `--experience` is a flag that must be implemented in `pde-tools.cjs` or `design.cjs`. This creates unnecessary code changes with no behavioral gain.

**Why it happens:** Success criterion 3 says `tokens-to-css --experience` produces the CSS file, implying a new CLI flag.

**How to avoid:** The existing `tokens-to-css <file>` already accepts any file path. The `--experience` notation in the success criteria refers to passing the experience file path as the argument, not adding a flag to the CLI. The workflow instruction should read: "Run `pde-tools.cjs design tokens-to-css .planning/design/visual/SYS-experience-tokens.json` to produce SYS-experience-tokens.css" — no new code required.

---

## Code Examples

Verified patterns from codebase inspection:

### DTCG JSON format for experience tokens (sourced from system.md lines 888-916 pattern)

```json
{
  "sonic": {
    "$description": "Sonic design tokens — genre, BPM, volume, system spec, transitions",
    "bpm-range": {
      "$value": "120-132",
      "$type": "string",
      "$description": "Target BPM corridor derived from vibe contract energy level"
    },
    "genre-primary": {
      "$value": "techno",
      "$type": "string",
      "$description": "Primary genre from vibe contract aesthetic register"
    },
    "volume-curve": {
      "$value": "gradual-ramp",
      "$type": "string",
      "$description": "Volume progression: gradual-ramp | drop-in | steady"
    },
    "system-spec": {
      "$value": "full-range PA + sub",
      "$type": "string",
      "$description": "Minimum PA specification from venue fixed infrastructure"
    },
    "transition-strategy": {
      "$value": "beatmatch",
      "$type": "string",
      "$description": "DJ/act transition approach: beatmatch | silence | crossfade | live-segue"
    }
  },
  "lighting": {
    "$description": "Lighting design tokens — zone palettes, intensity, fixtures, house protocol",
    "zone-main-color": {
      "$value": "oklch(0.35 0.25 270)",
      "$type": "color",
      "$description": "Primary lighting hue for main floor — derived from vibe aesthetic register"
    }
    // ... up to ~5 tokens per category, 30 total across all 6
  }
}
```

### tokens-to-css invocation for experience file (sourced from system.md lines 1596-1601 pattern)

```bash
CSS_EXP=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design tokens-to-css ".planning/design/visual/SYS-experience-tokens.json" --raw)
if [[ "$CSS_EXP" == @file:* ]]; then CSS_EXP=$(cat "${CSS_EXP#@file:}"); fi
```

Write to `.planning/design/visual/SYS-experience-tokens.css`.

### Manifest registration for experience token artifact (sourced from system.md lines 1827-1833 pattern)

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS-EXP code SYS-EXP
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS-EXP name "Experience Design Tokens"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS-EXP type experience-tokens
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS-EXP domain visual
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS-EXP path ".planning/design/visual/SYS-experience-tokens.json"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS-EXP status draft
```

### Wave 0 test file structure (sourced from Phase 75 brief-extensions.test.mjs pattern)

```javascript
// Phase 76 — Experience Design Token Architecture
// Nyquist structural assertions for DSYS-01 through DSYS-07.
// Written BEFORE workflow edits (Wave 0) — expected to FAIL until system.md is updated.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

function readWorkflow(name) {
  return readFileSync(join(ROOT, name), 'utf8');
}

describe('DSYS-07: experience tokens in separate file', () => {
  test('system.md contains SYS-experience-tokens.json generation instruction', () => {
    const content = readWorkflow('workflows/system.md');
    assert.ok(content.includes('SYS-experience-tokens.json'), 'DSYS-07 missing');
  });
  test('PRODUCT_TYPE experience guard appears before SYS-experience-tokens.json', () => {
    const content = readWorkflow('workflows/system.md');
    const guardIdx = Math.max(
      content.indexOf('PRODUCT_TYPE == "experience"'),
      content.indexOf("PRODUCT_TYPE === 'experience'")
    );
    const expIdx = content.indexOf('SYS-experience-tokens.json');
    assert.ok(guardIdx !== -1, 'system.md missing PRODUCT_TYPE experience guard');
    assert.ok(expIdx !== -1, 'system.md missing SYS-experience-tokens.json reference');
    assert.ok(guardIdx < expIdx, 'guard must precede SYS-experience-tokens.json instruction');
  });
});
```

---

## Token Schema Reference

The six categories and their canonical token fields (5 tokens per category, 30 total):

| Category | Key | Token Fields | Source in Brief |
|----------|-----|-------------|-----------------|
| Sonic | `sonic` | `bpm-range`, `genre-primary`, `volume-curve`, `system-spec`, `transition-strategy` | Vibe Contract (energy level, aesthetic register) + Venue Constraints (fixed infrastructure) |
| Lighting | `lighting` | `zone-main-color`, `intensity-curve`, `fixture-type-primary`, `peak-color`, `house-lights-protocol` | Vibe Contract (aesthetic register) + Venue Constraints (fixed infrastructure) |
| Spatial | `spatial` | `zone-count`, `main-floor-mood`, `density-target`, `sightlines`, `material-palette` | Audience Archetype (crowd composition, energy profile) + Venue Constraints (capacity) |
| Atmospheric | `atmospheric` | `ventilation-type`, `indoor-outdoor`, `haze-level`, `temperature-target`, `air-movement` | Venue Constraints (fixed infrastructure, capacity) + Vibe Contract (aesthetic register) |
| Wayfinding | `wayfinding` | `sign-hierarchy`, `arrow-standard`, `legibility-distance`, `outdoor-contrast`, `hierarchy-levels` | Audience Archetype (mobility needs) + Venue Constraints (capacity, load-in) |
| Brand Coherence | `brand-coherence` | `identity-thread`, `tone-of-voice`, `sensory-signature`, `collateral-sequence`, `wristband-color` | Promise Statement + Vibe Contract (aesthetic register) |

**Token type distribution:** `sonic` and `atmospheric` tokens are `string` type; `lighting` zone colors are `color` type (oklch); `spatial` density targets are `number` type; wayfinding distances are `string` or `dimension` type; `brand-coherence` tokens are `string` type. All conform to DTCG 2025.10 — every leaf must have `$value` and `$type`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single SYS-tokens.json for all product types | Separate SYS-experience-tokens.json for physical domain | Phase 76 (this phase) | Prevents visual token schema from being polluted by operational specs |
| Phase 74 stub (fallback to software path for experience products) | Real conditional block generating experience token file | Phase 76 (this phase) | `/pde:system` now generates two files for experience products |

**Deprecated/outdated:**
- Phase 74 stub comment in system.md Step 2: superseded by real conditional block in Phase 76. The comment must be replaced — but the Phase 82 test checking for it must be updated simultaneously.

---

## Open Questions

1. **No explicit `hasExperienceTokens` coverage flag in design-manifest.json**
   - What we know: The 16-field `designCoverage` schema (confirmed from design-manifest.json) does not currently include `hasExperienceTokens`.
   - What's unclear: Whether Phase 76 should add this flag or defer it to Phase 82 / a future phase.
   - Recommendation: Register the experience artifact under `SYS-EXP` code in the artifacts map (which is how SYS is registered), but do not add a new `designCoverage` flag. The artifact's presence in the manifest is sufficient for downstream consumers (flows.md, wireframe.md) to detect it. Adding a new flag requires updating the full 16-field object write in system.md AND in any downstream skill that reads coverage — scope risk outweighs benefit for this phase.

2. **Token value derivation quality with thin brief data**
   - What we know: The brief fields from Phase 75 include `[PROVIDE: ...]` placeholders if the brief was generated without full venue data.
   - What's unclear: Whether `[PROVIDE: ...]` placeholders should propagate into token values or trigger a warning.
   - Recommendation: Propagate `[PROVIDE: ...]` as the `$value` string verbatim. This is consistent with the brief's approach and makes gaps visible. Document in system.md that `[PROVIDE: ...]` token values indicate incomplete brief data.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` (Node.js built-in, v18+) |
| Config file | None — no config file needed |
| Quick run command | `node --test tests/phase-76/experience-tokens.test.mjs` |
| Full suite command | `node --test tests/phase-76/experience-tokens.test.mjs && node --test tests/phase-82/milestone-completion.test.mjs && node --test tests/phase-75/brief-extensions.test.mjs && node --test tests/phase-74/experience-regression.test.mjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DSYS-01 | Sonic tokens in system.md | structural | `node --test tests/phase-76/experience-tokens.test.mjs` | ❌ Wave 0 |
| DSYS-02 | Lighting tokens in system.md | structural | `node --test tests/phase-76/experience-tokens.test.mjs` | ❌ Wave 0 |
| DSYS-03 | Spatial tokens in system.md | structural | `node --test tests/phase-76/experience-tokens.test.mjs` | ❌ Wave 0 |
| DSYS-04 | Atmospheric tokens in system.md | structural | `node --test tests/phase-76/experience-tokens.test.mjs` | ❌ Wave 0 |
| DSYS-05 | Wayfinding tokens in system.md | structural | `node --test tests/phase-76/experience-tokens.test.mjs` | ❌ Wave 0 |
| DSYS-06 | Brand coherence tokens in system.md | structural | `node --test tests/phase-76/experience-tokens.test.mjs` | ❌ Wave 0 |
| DSYS-07 | Separate file, PRODUCT_TYPE guard before reference | structural | `node --test tests/phase-76/experience-tokens.test.mjs` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test tests/phase-76/experience-tokens.test.mjs`
- **Per wave merge:** `node --test tests/phase-76/experience-tokens.test.mjs && node --test tests/phase-82/milestone-completion.test.mjs && node --test tests/phase-74/experience-regression.test.mjs`
- **Phase gate:** Full 4-suite regression green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-76/experience-tokens.test.mjs` — covers DSYS-01 through DSYS-07 (structural assertions on system.md content)
- [ ] `tests/phase-76/` directory — does not exist yet

*(Framework infrastructure — `node:test`, `node:assert/strict` — already exists from prior phases. No framework install needed.)*

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection — `workflows/system.md` (Phase 74 stub at line 71, token generation Step 4-5, manifest registration Step 7, tokens-to-css invocation at line 1599)
- Direct codebase inspection — `bin/lib/design.cjs` (lines 161-192: `dtcgToCssLines`, `generateCssVars`, `cmdTokensToCss` — verified current implementation accepts any file path)
- Direct codebase inspection — `bin/pde-tools.cjs` (lines 532-533: `tokens-to-css` routes to `design.cmdTokensToCss`)
- Direct codebase inspection — `.planning/design/design-manifest.json` — confirmed 16-field `designCoverage` schema and `artifacts` map structure
- Direct codebase inspection — `tests/phase-82/milestone-completion.test.mjs` (lines 221-227, 264-270: stub test and 7 DSYS todo markers)
- Direct codebase inspection — `tests/phase-75/brief-extensions.test.mjs` — Wave 0 TDD pattern for Phase 76 to follow
- Direct codebase inspection — `.planning/STATE.md` lines 57, 77-79 — Phase 76 architecture decisions locked

### Secondary (MEDIUM confidence)

- DTCG 2025.10 W3C spec format: `{ "$value": "...", "$type": "..." }` on every leaf — confirmed by system.md line 892-896 commentary and code examples at lines 905-913

### Tertiary (LOW confidence)

- None identified. All claims grounded in direct codebase inspection.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools confirmed present and functional in codebase
- Architecture: HIGH — insertion point (system.md Step 5 after File 1), pattern (Phase 75 conditional block), and invariants (DSYS-07 separation) all confirmed from direct inspection
- Token schema: MEDIUM — 6-category / 5-per-category / 30-token design is derived from requirement text and event production domain knowledge; specific field names are prescriptions, not confirmed by prior code
- Pitfalls: HIGH — Phase 82 stub test breakage confirmed by inspecting line 221-227; base pollution risk confirmed from architecture lock

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable codebase, no external dependencies)
