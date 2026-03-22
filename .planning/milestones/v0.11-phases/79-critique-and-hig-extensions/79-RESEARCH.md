# Phase 79: Critique and HIG Extensions — Research

**Researched:** 2026-03-21 (updated 2026-03-21 post-implementation)
**Domain:** Extending critique.md with seven event-specific perspectives and hig.md with physical interface guidelines, both gated by PRODUCT_TYPE detection and enforcing [VERIFY WITH LOCAL AUTHORITY] on all regulatory values
**Confidence:** HIGH — grounded in direct codebase inspection of critique.md, hig.md, experience-disclaimer.md, the Phase 74 precedent patterns, and post-implementation verification against the shipped code

> **Update note (2026-03-21):** Phase 79 is fully implemented and verified (9/9 truths, 20/20 Nyquist tests passing). This update resolves the three open questions from the original research and corrects the predicted gate placement versus the actual implementation.

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CRIT-01 | Safety critique perspective checks crush risk, emergency egress time, medical coverage ratio, fire safety | Implemented at critique.md line 298: `Experience Perspective 1: Safety` |
| CRIT-02 | Accessibility critique perspective checks step-free access, BSL, quiet/sensory zones, wheelchair platforms | Implemented at critique.md line 317: `Experience Perspective 2: Physical Accessibility` |
| CRIT-03 | Operations critique perspective checks bar capacity, changeover realism, cancellation contingency | Implemented at critique.md line 333: `Experience Perspective 3: Operations` |
| CRIT-04 | Sustainability critique perspective checks reusable materials, transport options, food waste, power source | Implemented at critique.md line 345: `Experience Perspective 4: Sustainability` |
| CRIT-05 | Licensing/legal critique perspective checks noise curfew, alcohol hours, public liability | Implemented at critique.md line 358: `Experience Perspective 5: Licensing/Legal` |
| CRIT-06 | Financial critique perspective checks break-even ticket count, partial-capacity scenarios | Implemented at critique.md line 374: `Experience Perspective 6: Financial` |
| CRIT-07 | Community critique perspective checks local scene contribution, artist inclusion, neighborhood impact | Implemented at critique.md line 389: `Experience Perspective 7: Community` |
| CRIT-08 | All regulatory values include [VERIFY WITH LOCAL AUTHORITY] disclaimer | 12 occurrences in critique.md; ELSE guard confirmed; Nyquist tests CRIT-08a and CRIT-08b pass |
| PHIG-01 | Wayfinding audit checks signage at decision points, low-light readability, multilingual support | Implemented at hig.md line 237: `Physical HIG Domain 1: Wayfinding` |
| PHIG-02 | Acoustic zoning audit checks conversation-possible zones adjacent to high-volume areas | Implemented at hig.md line 251: `Physical HIG Domain 2: Acoustic Zoning` |
| PHIG-03 | Queue UX audit checks wait time communication, weather protection, skip-queue tiers | Implemented at hig.md line 262: `Physical HIG Domain 3: Queue UX` |
| PHIG-04 | Transaction speed audit checks bar order < 90s, entry processing < 30s per person targets | Implemented at hig.md line 270: `Physical HIG Domain 4: Transaction Speed` |
| PHIG-05 | Toilet ratio audit checks minimum 1:75 (female), 1:100 (male) | Implemented at hig.md line 277: `Physical HIG Domain 5: Toilet Ratio` |
| PHIG-06 | Hydration audit checks free water points clearly signed | Implemented at hig.md line 290: `Physical HIG Domain 6: Hydration` |
| PHIG-07 | First aid audit checks trained staff reachable within 2min from any point | Implemented at hig.md line 301: `Physical HIG Domain 7: First Aid` |

</phase_requirements>

---

## Summary

Phase 79 extends two existing workflow files — `critique.md` and `hig.md` — by filling in the experience branch stubs installed in Phase 74. Neither file receives structural surgery; both receive conditional block content added at already-identified insertion points. The implementation scope is purely within these two files plus a new Nyquist test suite.

For `critique.md`: The experience IF/ELSE gate was placed before Perspective 1 (UX/Usability) — not at the Phase 74 stub line 400 (between Perspectives 3 and 4). This earlier placement is critical: the stub location would have allowed experience products to run Perspectives 1-3 before being caught. The gate activates seven named perspectives (safety, physical accessibility, operations, sustainability, licensing/legal, financial, community) that evaluate the floor plan artifact (FLP) from Phase 78 instead of wireframe HTML. Every numerical regulatory value carries an inline `[VERIFY WITH LOCAL AUTHORITY]` tag — enforced by the disclaimer block loaded via `@references/experience-disclaimer.md` in `<required_reading>` and explicitly re-loaded inside the experience branch.

For `hig.md`: The experience gate is positioned in Step 4/7 before the `--light` mode check. This ordering is non-negotiable — placing it after would allow experience products reaching hig.md via critique's `--light` delegation to receive WCAG findings. The experience branch replaces WCAG-based POUR analysis with seven physical interface guideline domains. The artifact changes from wireframe HTML to the floor plan (FLP). The `--light` + experience combination produces an abbreviated physical accessibility check only (no full seven domains) and stops before Steps 5-7. The manifest artifact type is `physical-hig-audit` (not `hig-audit`) for experience products; the coverage flag name `hasHigAudit` is identical across all product types.

The critical isolation requirement — software and hardware pipelines produce zero experience-specific output — is verified by a 20-test Nyquist suite in `tests/phase-79/` covering all 15 requirement IDs plus ELSE guard structural tests.

**Primary recommendation:** Write the Nyquist test suite first (Wave 0), then fill critique.md experience branch (Wave 1, Plan 01), then fill hig.md experience branch (Wave 2, Plan 02). The test suite remains shared across both plans. Gate placement must precede the per-artifact evaluation loop for critique, and must precede the `--light` mode check for HIG.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:test` | Node.js built-in (v18+) | Test runner for Nyquist assertions | Established across all prior phases; zero npm dependency |
| `node:assert/strict` | Node.js built-in | Assertion library | Same pattern used in phases 64-74 |
| `node:fs` / `node:path` | Node.js built-in | Read workflow .md files in tests | Established in all existing test files |
| `references/experience-disclaimer.md` | PDE built-in | Reusable regulatory disclaimer block | Created in Phase 74; wired into critique.md required_reading; also wired into hig.md required_reading in Phase 79 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pde-tools.cjs design manifest-read` | PDE built-in | Detect productType and FLP/TML artifact paths from manifest | critique.md and hig.md need to discover floor plan and timeline artifacts |
| `pde-tools.cjs design manifest-update` | PDE built-in | Update manifest after critique/HIG run | Experience products write `physical-hig-audit` as artifact type; software writes `hig-audit` |
| `pde-tools.cjs design coverage-check` | PDE built-in | Read all coverage flags before writing | Read-before-set pattern — must not clobber other flags |
| `pde-tools.cjs design lock-acquire` | PDE built-in | Write lock before manifest and DESIGN-STATE updates | Already used in both critique.md and hig.md Steps 5 and 7 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline disclaimer tags on every value | Single disclaimer block at section end | Prohibited by experience-disclaimer.md Usage section: "Do not group disclaimers at the end of a section" |
| New hig-physical.md workflow file | Experience branch inside existing hig.md | New workflow files break --from stage resumption in build.md; all experience behavior lives in existing files (locked architectural decision) |
| Separate critique-experience.md | Experience branch inside existing critique.md | Same rationale — locked in STATE.md Key Decisions |

**Installation:** No new packages. All code uses Node.js built-ins and existing PDE tools.

---

## Architecture Patterns

### Recommended Project Structure

```
tests/
└── phase-79/
    └── critique-hig-extensions.test.mjs   # Nyquist tests — written FIRST (Wave 0)
                                            # 20 tests, 5 describe blocks, ~55ms runtime

workflows/
├── critique.md    # MODIFIED: experience gate before Perspective 1 → seven perspectives
└── hig.md         # MODIFIED: experience gate before --light check → seven physical HIG domains

(No new files other than the test suite)
```

### Pattern 1: critique.md Experience Gate — Placement Before the Per-Artifact Loop

**What:** The productType gate must be placed BEFORE the `For each wireframe file in WIREFRAME_FILES:` loop — not at the Phase 74 stub line (which was between Perspectives 3 and 4). Placing the gate after any software perspective would allow experience products to receive software findings.

**When to use:** Only when `productType === "experience"` in the design manifest. The four software perspectives (UX, Visual Hierarchy, Accessibility as WCAG, Business Alignment) are skipped entirely for experience products.

**Actual gate location:** Before Perspective 1 (UX/Usability), with an ELSE that explicitly says "Proceed with existing software critique path (Perspectives 1-4 below)."

**Branch structure (as-built):**

```markdown
#### Experience Product Type Gate

Read PRODUCT_TYPE from design manifest:

```bash
MANIFEST=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-read)
if [[ "$MANIFEST" == @file:* ]]; then MANIFEST=$(cat "${MANIFEST#@file:}"); fi
```

Parse `productType` from the JSON result.

IF productType === "experience":

  **Artifact detection — floor plan required (not wireframe HTML):**

  Use the Glob tool to check for `.planning/design/ux/wireframes/FLP-floor-plan-v*.html`.
  - If found: SET FLOOR_PLAN_ARTIFACT = path to highest version.
  - If not found: HALT with error pointing to /pde:wireframe prerequisite.

  Use the Glob tool to check for `.planning/design/ux/wireframes/TML-timeline-v*.html`.
  - If found: SET TIMELINE_ARTIFACT = path to highest version.
  - If not found: note in report frontmatter — "Timeline wireframe not found; critique evaluates
    floor plan only." (soft dependency — do NOT HALT)

  Load @references/experience-disclaimer.md into context before evaluating any perspective.

  Apply seven experience-specific perspectives:
  1. Experience Perspective 1: Safety
  2. Experience Perspective 2: Physical Accessibility
  3. Experience Perspective 3: Operations
  4. Experience Perspective 4: Sustainability
  5. Experience Perspective 5: Licensing/Legal
  6. Experience Perspective 6: Financial
  7. Experience Perspective 7: Community

  For each perspective, produce findings using the same table format as software perspectives:
  | Severity | Effort | Location | Issue | Suggestion | Reference |

  Location field references floor plan zone names (e.g., "FLP > Main Stage Zone > West Egress")

  SKIP software perspectives entirely. Proceed to Step 5/7.

ELSE:
  Proceed with existing software critique path (Perspectives 1-4 below).
```

### Pattern 2: hig.md Experience Gate — Placement Before --light Check

**What:** The productType gate in hig.md Step 4/7 must execute before the `--light` mode check. This is the most safety-critical ordering rule in Phase 79: if `--light` check ran first, experience products delegated from critique would receive WCAG 5 mandatory checks.

**As-built gate ordering in Step 4/7:**

```
1. Read productType from manifest
2. IF productType === "experience":
   a. IF --light mode + experience: run abbreviated physical accessibility only → STOP (no Steps 5-7)
   b. IF full mode: run all seven physical HIG domains → proceed to Step 5 with PHYSICAL_HIG_MODE=true
3. ELSE (non-experience products):
   a. IF --light: run 5 mandatory WCAG checks (existing behavior)
   b. ELSE: run full WCAG audit (existing behavior)
```

### Pattern 3: Seven Critique Perspectives — Domain Specifications

**Perspective 1: Safety**

Checklist items: crush density (≤ 4 persons/m² comfortable; > 6 persons/m² dangerous), emergency egress distance (≤ 45m to nearest exit), medical coverage ratio (1 per 100-250 attendees), fire safety (exit paths clear). Every numerical value tagged `[VERIFY WITH LOCAL AUTHORITY]`.

**Perspective 2: Physical Accessibility (not WCAG)**

Checklist items: step-free access routes, BSL interpreter sightlines, quiet/sensory zones, wheelchair viewing platforms, accessible toilet facilities. Reference column cites DDA 2010 (UK) or ADA (US) with `[VERIFY WITH LOCAL AUTHORITY]`.

**Perspective 3: Operations**

Checklist items: bar capacity (1 station per 75-100 attendees `[VERIFY WITH LOCAL AUTHORITY]`), changeover realism against TML timeline, cancellation contingency for outdoor events, load-in/load-out vehicle access, staff briefing area on floor plan.

**Perspective 4: Sustainability**

Qualitative only — no disclaimer tags required. Checklist items: reusable materials, transport provisions, food waste management, power source (generator vs grid). No numerical regulatory values.

**Perspective 5: Licensing/Legal**

Numerical thresholds all carry `[VERIFY WITH LOCAL AUTHORITY]`. Checklist items: noise curfew compliance (industry guidance 11pm-12am outdoor residential), alcohol hours alignment with TML, public liability insurance (minimum £5M PLI UK `[VERIFY WITH LOCAL AUTHORITY]`), temporary structure permits.

**Perspective 6: Financial**

Projections labeled as estimates only — `[VERIFY WITH LOCAL AUTHORITY]` not required for financial calculations. Checklist items: break-even ticket count derivation, partial-capacity viability (60%/80%/100%), revenue diversification.

**Perspective 7: Community**

Qualitative only — no disclaimer tags required. Checklist items: local/emerging acts in lineup, diversity of representation, neighborhood load-in/out impact, local vendor sourcing.

**Score calculation:** Same formula as software path (100 - penalties). All seven perspectives weighted equally at 1.0x — no Awwwards dimension mapping for physical perspectives.

### Pattern 4: Seven Physical HIG Domains — Domain Specifications

**PHIG-01: Wayfinding**

Signage at all route forks (entry to main zones, zones to toilets/bar/exit). Low-light readability spec (retro-reflective or illuminated; 75mm letter height for 10m viewing `[VERIFY WITH LOCAL AUTHORITY]`). Multilingual support for international audiences. Accessibility wayfinding for step-free routes.

**PHIG-02: Acoustic Zoning**

Conversation-possible zone (< 70dB `[VERIFY WITH LOCAL AUTHORITY]`) adjacent to high-volume area. Gradual acoustic transition between zones. Hearing protection notice for > 85dB sustained `[VERIFY WITH LOCAL AUTHORITY]`.

**PHIG-03: Queue UX**

Wait time communication position at entry and bar. Weather-covered entry gateline. Separate VIP/access gateline if tiered. Physical space for maximum queue without blocking circulation.

**PHIG-04: Transaction Speed**

Bar order < 90s per transaction `[VERIFY WITH LOCAL AUTHORITY]`. Entry processing < 30s per person `[VERIFY WITH LOCAL AUTHORITY]`. Cashless-only implications for speed if indicated in brief.

**PHIG-05: Toilet Ratio**

Female: minimum 1 per 75 `[VERIFY WITH LOCAL AUTHORITY]`. Male: minimum 1 per 100 `[VERIFY WITH LOCAL AUTHORITY]`. Accessible: minimum 1 fully accessible cubicle per provision unit `[VERIFY WITH LOCAL AUTHORITY]`. Distance: ≤ 150m from any zone `[VERIFY WITH LOCAL AUTHORITY]`. Severity: below minimum = Critical; no accessible facility = Critical.

**PHIG-06: Hydration**

Free water refill stations: minimum 1 per 500 attendees `[VERIFY WITH LOCAL AUTHORITY — some jurisdictions mandate free water at licensed events]`. Stations in high-traffic areas. "Free Water" sign at wayfinding decision points. No free water provision = Critical severity.

**PHIG-07: First Aid**

Response time: trained first aider within 2 minutes from any point `[VERIFY WITH LOCAL AUTHORITY]` (≈ 170m maximum walking distance). First aid post identified on floor plan. Staffing ratio: 1 per 100-250 `[VERIFY WITH LOCAL AUTHORITY]`. AED position marked for events > 500 attendees `[VERIFY WITH LOCAL AUTHORITY]`. No first aid post = Critical; response > 2 minutes from any zone = Critical.

### Pattern 5: Disclaimer Tag Placement — Inline Pattern

The `[VERIFY WITH LOCAL AUTHORITY]` tag must appear immediately adjacent to the numerical regulatory value, not grouped at the end. Specified in `references/experience-disclaimer.md`.

**Correct:**
```markdown
Industry guidance: ≤ 4 persons/m² comfortable; > 6 persons/m² is dangerous [VERIFY WITH LOCAL AUTHORITY].
```

**Prohibited:**
```markdown
Industry guidance: ≤ 4 persons/m² comfortable; > 6 persons/m² is dangerous.
...
[Note: All values should be verified with local authorities.]
```

### Pattern 6: HIG Artifact Output — Physical Mode Format

Experience mode HIG artifact uses `Mode: physical-hig-experience` in frontmatter and `Physical HIG Domains` summary table (seven rows) replacing WCAG sections. Manifest artifact type is `physical-hig-audit`. Coverage flag `hasHigAudit` is identical regardless of mode.

```markdown
---
Generated: "{ISO 8601 date}"
Skill: /pde:hig (HIG)
Version: v{N}
Status: draft
Mode: physical-hig-experience
Artifact: Floor Plan FLP-v{N}
---

# Physical Interface Guidelines Audit: {project_name}

## Physical HIG Domains — Summary Table
| Domain | Status | Findings | Priority |
|--------|--------|----------|---------|
| Wayfinding | pass/fail/partial | {n} | {level} |
| Acoustic Zoning | ... | ... | ... |
| Queue UX | ... | ... | ... |
| Transaction Speed | ... | ... | ... |
| Toilet Ratio | ... | ... | ... |
| Hydration | ... | ... | ... |
| First Aid | ... | ... | ... |
```

Manifest update call: `pde-tools.cjs design manifest-update HIG type physical-hig-audit`

### Anti-Patterns to Avoid

- **Placing the critique experience gate at the Phase 74 stub line (between Perspectives 3 and 4):** Experience products would run UX, Visual Hierarchy, and Accessibility perspectives before the gate catches them. The gate must precede the per-artifact loop.
- **Placing the hig.md productType check after the --light mode check:** Experience products delegated from critique via `--light` would receive WCAG findings. Ordering is: read manifest → IF experience → ELSE IF --light.
- **Applying WCAG findings to experience products:** POUR assessment and all 56 WCAG 2.2 criteria are irrelevant for physical event spaces. The explicit suppression text at hig.md line 314 ("SKIP all WCAG criteria and POUR analysis entirely") must be preserved.
- **Applying event perspectives to software products:** The seven experience perspectives must not appear in software, hardware, or hybrid critiques. The gate is `productType === "experience"` — not a flag or guess.
- **Grouping disclaimers at section end:** Every individual regulatory value carries its own inline tag.
- **Inventing jurisdiction-specific values:** All numerical values must be labeled "industry guidance" or "best practice" with the `[VERIFY WITH LOCAL AUTHORITY]` tag.
- **Floor plan not found but continuing anyway:** Both critique and HIG HALT with clear prerequisite error pointing to `/pde:wireframe`. No silent fallthrough.
- **New experience workflow files:** No `critique-experience.md` or `hig-physical.md`. All changes live as conditional blocks in existing files.
- **Writing WCAG sections in --light mode for experience products:** When critique delegates to `hig.md --light`, the experience gate runs first. The abbreviated output covers physical accessibility only and stops before Steps 5-7 — it does not produce WCAG findings.
- **Using different hasHigAudit flag names per product type:** The coverage flag name is `hasHigAudit` for both `hig-audit` (software) and `physical-hig-audit` (experience). The manifest artifact *type* differs; the coverage flag name does not.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Regulatory disclaimer formatting | Inline disclaimer logic per value | `references/experience-disclaimer.md` loaded via `@references/` pattern | Single source of truth; wired into both critique.md and hig.md required_reading |
| Physical HIG audit checklist | Custom checklist built into workflow prose | The seven domain specifications in Pattern 4 (derived from REQUIREMENTS.md) | Requirements define exactly what to check — no research gap |
| PRODUCT_TYPE detection in critique/HIG | Re-detecting from brief signals | `pde-tools.cjs design manifest-read` then parse `productType` | Source of truth is the manifest written by brief.md; never re-detect type in downstream workflows |
| Floor plan artifact discovery | Hard-coded path | Glob for `FLP-floor-plan-v*.html` then read highest version | Versioned artifact pattern consistent with all Phase 78 wireframe discoveries |
| Cross-type isolation | Runtime flags or environment variables | `productType === "experience"` gate reading from manifest + ELSE guard | Manifest is canonical product type store; ELSE guard makes routing explicit and grep-verifiable |

**Key insight:** Both workflows already contain all structural machinery (manifest-read, artifact discovery, write-lock, pass-through-all coverage, DESIGN-STATE updates). Phase 79 adds content to the experience branches, not infrastructure.

---

## Common Pitfalls

### Pitfall 1: Experience Critique Runs Software Perspectives in Addition to Event Perspectives

**What goes wrong:** The experience branch activates the seven event perspectives but does not skip the four software perspectives. Output contains both WCAG accessibility findings AND physical accessibility findings.

**Why it happens:** Adding the experience branch above the software perspectives without an ELSE guard, or placing the gate at the wrong line (stub line vs. per-artifact loop entry).

**How to avoid:** The experience branch uses IF/ELSE, not IF-then-add. ELSE explicitly labels the software path. Gate precedes the per-artifact evaluation loop.

**Warning signs:** Test CRIT-08b in the Nyquist suite: `experience branch has ELSE guard`. This test reads critique.md and asserts an ELSE guard exists after the experience block.

### Pitfall 2: Disclaimer Tag on Wrong Values (Missing or Overused)

**What goes wrong:** Numerical values appear without the tag, OR the tag appears on qualitative statements (Community perspective, Sustainability qualitative items do not need it).

**How to avoid:** Apply the tag only to numerical thresholds and regulatory ratios. Qualitative checklist items do not need the tag.

**Warning signs:** `grep "[VERIFY WITH LOCAL AUTHORITY]" .planning/design/review/CRT-critique-v*.md` returns 0 results on an experience product critique.

### Pitfall 3: Floor Plan Artifact Not Found — Silent Fallthrough to Software Path

**What goes wrong:** The floor plan (FLP) artifact does not exist yet, and the experience branch falls through to the software wireframe path, producing WCAG findings.

**How to avoid:** Explicit HALT with clear prerequisite error when `FLP-floor-plan-v*.html` glob returns no results in experience mode. Applies to both critique.md and hig.md.

**Warning signs:** An experience product critique produces wireframe findings against no files, or falls through to software perspectives.

### Pitfall 4: HIG --light Mode Ignores Experience Gate

**What goes wrong:** When critique.md delegates Perspective 3 to `hig.md --light`, the HIG workflow runs WCAG 5 mandatory checks even though `productType === "experience"`.

**Why it happens:** The `--light` mode check precedes the PRODUCT_TYPE detection in Step 4/7.

**How to avoid:** PRODUCT_TYPE check must occur before the light mode check. Actual ordering: read manifest → IF experience (handle both light and full experience modes) → ELSE IF --light (WCAG light) → ELSE (full WCAG).

**Warning signs:** A critique for an experience product produces WCAG findings tagged `[HIG skill -- /pde:hig --light]`.

### Pitfall 5: Coverage Flag Clobbering

**What goes wrong:** The `hasHigAudit` or `hasCritique` coverage flag update overwrites other flags because read-before-set pattern was not followed.

**How to avoid:** Both critique.md and hig.md already implement read-before-set in Step 7. Phase 79 must preserve this when extending the workflows. The `hasHigAudit` flag name is identical regardless of experience vs software mode.

**Warning signs:** `pde-tools.cjs design coverage-check` returns false for flags that were true before the experience critique ran.

---

## Code Examples

### Example 1: PRODUCT_TYPE Detection in Workflow (manifest-read pattern)

```bash
# Source: existing pattern from critique.md Step 5a (lock-acquire), handoff.md Step 2l
# and wireframe.md — manifest-read used in all downstream workflows
MANIFEST=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-read)
if [[ "$MANIFEST" == @file:* ]]; then MANIFEST=$(cat "${MANIFEST#@file:}"); fi
# Parse productType from JSON output — use the string value directly
# "productType": "experience" → branch on === "experience"
```

### Example 2: Floor Plan Artifact Discovery (Glob pattern for FLP)

```
# Source: confirmed by post-implementation inspection of critique.md and hig.md
# Phase 78 writes floor plan to: .planning/design/ux/wireframes/FLP-floor-plan-v{N}.html
# Artifact code is FLP (not FPL — this ambiguity from original research is RESOLVED)
# Discover highest version:
Use the Glob tool to check for `.planning/design/ux/wireframes/FLP-floor-plan-v*.html`.
Sort all matches descending by version number (parse the v{N} suffix).
Read the highest version using the Read tool.
```

### Example 3: Disclaimer-Inline Finding Example

```markdown
# Source: pattern derived from experience-disclaimer.md Usage section
# Correct inline pattern for a regulatory value finding:

**Finding: Crush density risk in Main Stage Zone**
- **Location:** FLP > Main Stage Zone
- **Severity:** major
- **Effort:** significant
- **Issue:** Zone capacity annotation shows 650 persons in 85m² = 7.6 persons/m². Industry
  guidance: > 6 persons/m² is dangerous crush density [VERIFY WITH LOCAL AUTHORITY].
- **Suggestion:** Reduce zone capacity to ≤ 4 persons/m² (≤ 340 persons) or expand zone
  to ≥ 163m² for current capacity annotation [VERIFY WITH LOCAL AUTHORITY].
- **Reference:** Event Safety Alliance crowd management guidelines [VERIFY WITH LOCAL AUTHORITY]
```

### Example 4: Nyquist Test Patterns for Phase 79

```javascript
// Source: tests/phase-79/critique-hig-extensions.test.mjs (as-built)
// 20 tests, 5 describe blocks, ~55ms runtime, all passing

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

describe('CRIT-01 through CRIT-07: seven experience perspectives in critique.md', () => {
  const critiqueContent = readFileSync(join(ROOT, 'workflows/critique.md'), 'utf8');

  test('critique.md contains Safety perspective for experience', () => {
    assert.ok(critiqueContent.includes('Safety'), 'critique.md missing Safety perspective');
  });
  // ... (six more perspective tests follow the same pattern)
});

describe('CRIT-08: regulatory disclaimer tags in critique.md', () => {
  const critiqueContent = readFileSync(join(ROOT, 'workflows/critique.md'), 'utf8');

  test('critique.md contains VERIFY WITH LOCAL AUTHORITY tag', () => {
    assert.ok(
      critiqueContent.includes('[VERIFY WITH LOCAL AUTHORITY]'),
      'critique.md missing [VERIFY WITH LOCAL AUTHORITY] disclaimer tag'
    );
  });

  test('critique.md experience branch has ELSE guard (software path skipped for experience)', () => {
    const expIdx = critiqueContent.indexOf('experience');
    assert.ok(expIdx !== -1, 'experience branch not found in critique.md');
    const elseAfterExp = critiqueContent.indexOf('ELSE', expIdx);
    assert.ok(elseAfterExp !== -1, 'No ELSE guard found after experience branch in critique.md');
  });
});

describe('PHIG-01 through PHIG-07: seven physical HIG domains in hig.md', () => {
  // Seven domain tests — Wayfinding, Acoustic Zoning, Queue UX, Transaction Speed,
  // Toilet Ratio, Hydration, First Aid — each asserts case-insensitive presence in hig.md
});

describe('PHIG isolation: WCAG suppressed for experience', () => {
  test('hig.md WCAG findings suppressed for experience (ELSE guard after experience block)', () => {
    const content = readFileSync(join(ROOT, 'workflows/hig.md'), 'utf8');
    const expHigIdx = content.indexOf('experience');
    const elseAfterHigExp = content.indexOf('ELSE', expHigIdx);
    assert.ok(elseAfterHigExp !== -1, 'No ELSE guard in hig.md — WCAG may bleed into experience output');
  });
});

describe('Cross-type isolation: productType gate present in both workflows', () => {
  test('critique.md has productType gate', () => { /* ... */ });
  test('hig.md has productType gate', () => { /* ... */ });
});
```

### Example 5: HIG Manifest Update for Experience Mode

```bash
# Source: hig.md Step 7/7 (as-built)
# Experience products use physical-hig-audit artifact type; coverage flag name unchanged
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update HIG type physical-hig-audit
# All other calls (code=HIG, name, domain, path, status, version) unchanged from software path
# Coverage flag: hasHigAudit: true — same flag name for both software and experience products
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| critique.md evaluates four software perspectives only | Seven event perspectives for experience (gated before per-artifact loop), four software perspectives for other types | Phase 79 Plan 01 | Floor plan is the primary critique artifact for experience products |
| hig.md evaluates WCAG 2.2 AA criteria only | Physical HIGs for experience (gated before --light check), WCAG for other types | Phase 79 Plan 02 | No WCAG findings for experience products — different audit ontology |
| Disclaimer block exists but evaluates nothing | Seven perspectives and seven HIG domains enforce inline disclaimer on regulatory values | Phase 79 | Phase 74's disclaimer infrastructure has consumers |
| Phase 74 stub comments are placeholders | Phase 79 fills content at insertion points; gate placement corrected from predicted position | Phase 79 | Gate placed before per-artifact loop (critique) and before --light check (HIG) — earlier than stub lines |
| Open question: FLP vs FPL artifact code | Confirmed: artifact code is `FLP` (Floor PLan) | Phase 79 verification | Glob patterns use `FLP-floor-plan-v*.html` in both workflows |
| Open question: --light + experience produces how many domains | Confirmed: abbreviated physical accessibility only (not full seven), stops before Steps 5-7 | Phase 79 Plan 02 | Prevents double-counting when critique delegates via --light |

**Deprecated/outdated:**
- Phase 74 stub comment in critique.md line ~400: replaced with live experience branch before Perspective 1 in Phase 79
- Phase 74 stub comment in hig.md line 49: replaced with reference comment pointing to Step 4/7 gate in Phase 79
- Original research open questions: all three resolved (FLP artifact code, --light behavior, timeline soft dependency confirmed)

---

## Open Questions

All three open questions from the original research have been resolved by implementation:

1. **FLP vs FPL artifact code — RESOLVED**
   - Resolution: Artifact code is `FLP` (Floor PLan). Both critique.md and hig.md use `FLP-floor-plan-v*.html` glob pattern. Confirmed at critique.md line 277 and hig.md line 205.

2. **Timeline (TML) as soft or hard dependency — RESOLVED**
   - Resolution: TML is a soft dependency for critique. If absent, the system notes "Timeline wireframe not found; critique evaluates floor plan only" in the report frontmatter. Does not HALT. Confirmed in 79-01-SUMMARY.md and VERIFICATION.md.

3. **--light + experience mode behavior — RESOLVED**
   - Resolution: --light + experience produces abbreviated physical accessibility check only (not all seven physical HIG domains), and stops before Steps 5-7. Tag: `[Physical HIG -- /pde:hig --light experience mode]`. Confirmed at hig.md lines 216-232.

No remaining open questions for Phase 79.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` (no version beyond Node.js 18+) |
| Config file | None — tests are standalone .mjs files |
| Quick run command | `node --test tests/phase-79/critique-hig-extensions.test.mjs` |
| Full suite command | `node --test tests/phase-79/critique-hig-extensions.test.mjs && node --test tests/phase-74/experience-regression.test.mjs` |
| Estimated runtime | ~55ms |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CRIT-01 | critique.md contains Safety perspective | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ green |
| CRIT-02 | critique.md contains Physical Accessibility perspective | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ green |
| CRIT-03 | critique.md contains Operations perspective | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ green |
| CRIT-04 | critique.md contains Sustainability perspective | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ green |
| CRIT-05 | critique.md contains Licensing/Legal perspective | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ green |
| CRIT-06 | critique.md contains Financial perspective | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ green |
| CRIT-07 | critique.md contains Community perspective | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ green |
| CRIT-08 | critique.md contains [VERIFY WITH LOCAL AUTHORITY] tag | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ green |
| CRIT-08 | experience branch has ELSE guard (no software bleed) | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ green |
| PHIG-01 | hig.md contains Wayfinding domain | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ green |
| PHIG-02 | hig.md contains Acoustic Zoning domain | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ green |
| PHIG-03 | hig.md contains Queue UX domain | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ green |
| PHIG-04 | hig.md contains Transaction Speed domain | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ green |
| PHIG-05 | hig.md contains Toilet Ratio domain | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ green |
| PHIG-06 | hig.md contains Hydration domain | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ green |
| PHIG-07 | hig.md contains First Aid domain | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ green |
| PHIG (cross-type) | hig.md has ELSE guard (WCAG not suppressed for software) | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ green |
| CRIT+PHIG (cross-type) | productType gate present in both workflows | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ green |

Phase 74 regression suite: `node --test tests/phase-74/experience-regression.test.mjs` — 7/7 passing throughout Phase 79.

### Sampling Rate

- **Per task commit:** `node --test tests/phase-79/critique-hig-extensions.test.mjs`
- **Per wave merge:** `node --test tests/phase-79/critique-hig-extensions.test.mjs && node --test tests/phase-74/experience-regression.test.mjs`
- **Phase gate:** Both phase-79 and phase-74 test suites green before `/gsd:verify-work`

### Wave 0 Gaps

None — `tests/phase-79/critique-hig-extensions.test.mjs` exists and all 20 tests pass green.

---

## Sources

### Primary (HIGH confidence)

- `workflows/critique.md` (direct codebase inspection, 2026-03-21) — experience branch at lines 264-405; gate placement before per-artifact loop confirmed; seven perspectives with [VERIFY WITH LOCAL AUTHORITY] at 12 locations; ELSE guard at line 406
- `workflows/hig.md` (direct codebase inspection, 2026-03-21) — experience branch at lines 192-322; gate before --light check confirmed; seven physical HIG domains; PHYSICAL_HIG_MODE propagated to Steps 5 and 7; physical-hig-audit manifest type at line 770
- `tests/phase-79/critique-hig-extensions.test.mjs` (direct codebase inspection, 2026-03-21) — 20 tests, 5 describe blocks, all passing green; ~55ms runtime
- `.planning/phases/79-critique-and-hig-extensions/79-VERIFICATION.md` (2026-03-21) — 9/9 observable truths verified; all 15 requirements satisfied; 3 implementation commits confirmed
- `.planning/phases/79-critique-and-hig-extensions/79-01-SUMMARY.md` (2026-03-21) — gate placement deviation documented; decisions locked
- `.planning/phases/79-critique-and-hig-extensions/79-02-SUMMARY.md` (2026-03-21) — Plan 02 decisions: physical-hig-audit type, hasHigAudit flag consistency, --light + experience behavior

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` Key Decisions section (2026-03-21) — Phase 79 decisions locked: experience gate placement before Perspective 1, FLP as hard prerequisite, TML as soft dependency, productType gate before --light check, physical-hig-audit manifest type, hasHigAudit flag name identical across modes

### Tertiary (LOW confidence)

None — all claims are grounded in direct codebase inspection or VERIFICATION.md evidence.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — confirmed by implementation; no new packages
- Architecture: HIGH — gate placements confirmed by VERIFICATION.md line references and SUMMARY deviation notes
- Pitfalls: HIGH — Pitfall 4 (--light ordering) was the highest-risk pitfall; confirmed prevented by actual implementation ordering
- Open questions: HIGH — all three resolved by implementation facts

**Research date:** 2026-03-21 (initial); 2026-03-21 (updated post-implementation)
**Valid until:** Stable — Phase 79 is complete and verified; changes would require new plan
