# Phase 81: Handoff — Production Bible — Research

**Researched:** 2026-03-21
**Domain:** Extending `workflows/handoff.md` with an experience branch that produces a BIB (production bible) artifact — replacing the Phase 74 stub at Step 4i and Step 5 output with six structured sections, new coverage flag `hasProductionBible`, and dual-surface output for `hybrid-event` sub-type
**Confidence:** HIGH — grounded entirely in direct codebase inspection of `handoff.md`, `design-manifest.json`, `references/experience-disclaimer.md`, Phase 74/79/80 research and plan docs, `.planning/research/ARCHITECTURE.md`, `.planning/research/PITFALLS.md`, and `.planning/research/STACK.md`

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HDOF-01 | Advance document generated (load-in, sound check, doors, curfew, load-out, contact sheet, rider fulfillment) | Section structure derived from ARCHITECTURE.md BIB template; disclaimer required on all curfew/timing values |
| HDOF-02 | Run sheet generated (minute-by-minute timeline, responsible person, technical cue, contingency notes) | Consumes TML timeline artifact; markdown table format (not gantt — tabular precision required); timezone label mandatory (PITFALLS.md) |
| HDOF-03 | Staffing plan generated (roles, headcount, shifts, briefing time, door policy, bar menu/pricing) | Derived from brief capacity field + spatial tokens; role matrix table pattern |
| HDOF-04 | Budget framework generated (line-item costs, revenue at 60%/80%/100% capacity, break-even) | ARCHITECTURE.md BIB template covers budget table; placeholder vendors only — no specific pricing (PITFALLS.md) |
| HDOF-05 | Post-event template generated (feedback collection, financial reconciliation, retrospective) | Blank template sections; ARCHITECTURE.md Section 5 structure |
| HDOF-06 | Print spec output for all collateral artifacts (bleed, safe area, DPI, color mode, trim size) | Consumes FLY/SIT/PRG artifact paths from manifest; CMYK approximation table from Phase 80 STACK.md; print-ready prohibition enforced |

</phase_requirements>

---

## Summary

Phase 81 fills in two stubs in `workflows/handoff.md` that Phase 74 deliberately planted. The Phase 74 comment at Step 4i (line ~517) reads: `"experience": Phase 74 stub — experience-specific content added in subsequent phases.` A second stub exists at line ~658 in the Step 5 output section. Both stubs carry an explicit `NEVER produce floor plans, production bibles, or experience token files from this stub` guard that Phase 81 removes and replaces with production behavior.

The implementation scope is confined to `workflows/handoff.md`. No new command file, workflow file, or `pde-tools.cjs` function is needed. The BIB artifact is a structured markdown document (not HTML — see Architecture Patterns). Six sections replace the software component API sections for experience products. Coverage is tracked via a new `hasProductionBible` flag in `designCoverage`, following the read-before-set pattern used by every prior experience flag (`hasCritique`, `hasPrintCollateral`).

The critical complexity in this phase is the hybrid-event dual-surface case: when `experienceSubType === "hybrid-event"`, the handoff must produce both the production bible (BIB) and the software handoff spec (HND). This is the only case where two output files are produced in a single `/pde:handoff` run. The manifest must register both. The STACK.md check in Step 2a must run for hybrid-event (it is needed for framework detection) but may be skipped for pure experience products.

The PITFALLS.md document provides explicit architecture guidance for this phase: the production bible must be generated across **four separate generation passes** (not one), because budget tables and staffing matrices alone exceed single-pass token budgets for venues above 500 capacity. Each pass writes its own section; the sections are assembled into the final BIB document at the end.

**Primary recommendation:** Write the Nyquist test suite first (Wave 0), then replace the Step 4i and Step 5 stubs in `handoff.md` (Wave 1), then add BIB artifact registration to Step 7 manifest update (Wave 2). The split-generation pattern (four passes) must be documented explicitly in the workflow instructions.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:test` | Node.js built-in (v18+) | Test runner for Nyquist assertions | Established across all prior phases (64-80); zero npm dependency |
| `node:assert/strict` | Node.js built-in | Assertion library | Same pattern used in phases 64-80 |
| `node:fs` / `node:path` | Node.js built-in | Read workflow .md files in tests | Established in all existing test files |
| `references/experience-disclaimer.md` | PDE built-in | Reusable regulatory disclaimer block | Created in Phase 74; already wired into `handoff.md` `<required_reading>` at line 9 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pde-tools.cjs design manifest-read` | PDE built-in | Discover FLP/TML/FLY/SIT/PRG artifact paths from manifest | Step 4i experience branch needs to discover upstream artifacts |
| `pde-tools.cjs design manifest-update` | PDE built-in | Register BIB artifact after generation | Step 7b: manifest-update calls for BIB code |
| `pde-tools.cjs design coverage-check` | PDE built-in | Read all 14 coverage flags before writing | Read-before-set pattern — must not clobber existing flags |
| `pde-tools.cjs design lock-acquire` | PDE built-in | Write lock before manifest and DESIGN-STATE updates | Already used in Step 5a and 5d of handoff.md |
| `pde-tools.cjs design manifest-set-top-level` | PDE built-in | Write merged coverage flags object | Step 7c: add `hasProductionBible: true` while preserving all 14 existing flags |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Markdown for production bible | HTML (like print artifacts) | HTML requires a browser to read; production staff need editable text; markdown maps to the HND-handoff-spec pattern already established; STACK.md explicitly locked: markdown not DOCX |
| Four-pass split generation | Single-pass generation | Single pass truncates at ~500 capacity due to token budget; PITFALLS.md explicit: "Token budget exceeded mid-generation; handoff output is truncated at the staffing plan section" |
| New `pde:bible` command | Extension of existing `pde:handoff` | New command would break `--from handoff` resumption in `build.md`; all experience behavior lives as conditional blocks in existing workflow files (locked in STATE.md) |

**Installation:** No new packages. All logic lives inside `workflows/handoff.md` as prose instructions.

---

## Architecture Patterns

### Recommended Project Structure

No new files except the test suite and the BIB artifact output:

```
tests/
└── phase-81/
    └── handoff-production-bible.test.mjs   # Nyquist tests — written FIRST (Wave 0)

workflows/
└── handoff.md    # MODIFIED: experience stub (lines ~517, ~658) → six-section production bible

(No new command files, no new workflow files)
```

BIB artifact output location (written by the workflow, not hardcoded here):

```
.planning/design/handoff/
├── BIB-{event-slug}-v{N}.md         # Production bible — experience products
├── HND-handoff-spec-v{N}.md         # Software handoff spec — software/hardware/hybrid only
└── HND-types-v{N}.ts                # TypeScript interfaces — software/hardware/hybrid only
```

For `hybrid-event` sub-type: both `BIB-*` and `HND-*` files are written in a single run.

### Pattern 1: Step 4i Experience Branch — Replace Both Stubs

**What:** Replace the Phase 74 stub comment in Step 4i (productType conditional) with the full experience branch, and replace the second stub in Step 5 (output section 11) with the BIB generation instructions.

**When to use:** `PRODUCT_TYPE === "experience"` read from the design manifest.

**Stub locations (confirmed by direct inspection):**

Step 4i stub (line ~517):
```
- "experience":  Phase 74 stub — experience-specific content added in subsequent phases.
                 Current behavior: proceed with software path as temporary fallback.
                 NEVER produce floor plans, production bibles, or experience token files from this stub.
```

Step 5 stub (line ~658, inside section 11 of the handoff spec structure):
```
    If PRODUCT_TYPE is "experience": Phase 74 stub — production bible and experience handoff sections added in Phase 81.
                 Current behavior: proceed with software path as temporary fallback.
                 NEVER produce floor plans, production bibles, or experience token files from this stub.
```

**Branch structure to insert at Step 4i:**

```markdown
- "experience":
  1. STACK.md check: IF experienceSubType is "hybrid-event": STACK.md check is REQUIRED
     (framework detection needed for digital layer). IF experienceSubType is any other value
     (single-night, multi-day, recurring-series, installation): SKIP STACK.md check.
     Set FRAMEWORK = "none", TYPESCRIPT = false.

  2. Discover upstream experience artifacts from manifest:
     - FLP: Glob `.planning/design/ux/wireframes/FLP-floor-plan-v*.html` — highest version
     - TML: Glob `.planning/design/ux/wireframes/TML-timeline-v*.html` — highest version
     - FLY: Glob `.planning/design/physical/print/FLY-event-flyer-v*.html` — highest version
     - SIT: Glob `.planning/design/physical/print/SIT-series-identity-v*.html` — highest version
     - PRG: Glob `.planning/design/physical/print/PRG-festival-program-v*.html` — highest version
     Store each as: FLP_PATH, TML_PATH, FLY_PATH, SIT_PATH, PRG_PATH (null if not found).
     WARN if FLP_PATH is null ("Floor plan artifact not found — production bible will omit site plan reference").
     WARN if TML_PATH is null ("Timeline artifact not found — run sheet will use brief temporal data only").

  3. Load @references/experience-disclaimer.md into context before generating any section.

  4. Set BIB_GENERATES_SECTIONS = true.
     Set HND_GENERATES_SOFTWARE = false (unless experienceSubType is "hybrid-event").
     IF experienceSubType is "hybrid-event": ALSO set HND_GENERATES_SOFTWARE = true.

  5. Extract from BRIEF_CONTENT (if available):
     - event_name, venue_name, venue_location, venue_capacity
     - experienceSubType
     - curfew (from venue constraints)
     - load_in_window (from venue constraints)
     - artist_lineup (if present)
     Set BIB_CONTEXT from these extracted fields.

  6. Proceed to Step 5 BIB generation (four-pass split).
```

### Pattern 2: Step 5 BIB Generation — Four-Pass Split

**What:** Generate the six BIB sections across four separate generation calls to avoid token budget truncation. This is a performance requirement, not a stylistic choice.

**Split rationale:** PITFALLS.md explicitly documents: "Generating the full production bible (advance document + run sheet + staffing plan + budget) in a single prompt — Token budget exceeded mid-generation; handoff output is truncated at the staffing plan section. Split production bible into 4 separate generation calls, each writing its own artifact; aggregate paths into the manifest. Any venue with >500 capacity; budget templates alone reach 2000+ tokens of tabular content."

**Pass breakdown:**

| Pass | Sections Generated | Output Variable |
|------|-------------------|-----------------|
| Pass A | Section 1: Advance Document | BIB_SECTION_ADVANCE |
| Pass B | Section 2: Run Sheet | BIB_SECTION_RUNSHEET |
| Pass C | Section 3: Staffing Plan + Section 4: Budget Framework | BIB_SECTION_STAFFING_BUDGET |
| Pass D | Section 5: Post-Event Template + Section 6: Print Spec Output | BIB_SECTION_POST_PRINT |

After all four passes, assemble into the final BIB document and write once using the Write tool.

### Pattern 3: BIB Document Structure

**What:** The complete structure of `BIB-{event-slug}-v{N}.md`.

```markdown
---
Generated: "{YYYY-MM-DD}"
Skill: /pde:handoff (HND)
Version: v{N}
Status: draft
Product Type: "experience"
Experience Sub-type: "{experienceSubType}"
Event: "{event_name}"
Venue: "{venue_name}"
---

# Production Bible: {event_name}

> **Regulatory Notice:** All regulatory values in this document (capacity limits, egress distances,
> staffing ratios, timing requirements) are industry guidance ranges only.
> [VERIFY WITH LOCAL AUTHORITY] before finalizing any operational plan.
> See: `references/experience-disclaimer.md`

## 1. Advance Document
### 1.1 Day-of Schedule
| Time | Activity | Owner | Notes |
|------|----------|-------|-------|
| {load_in_window} | Load-in begins | Production Manager | [VERIFY WITH LOCAL AUTHORITY] |
| ... | Sound check | FOH Engineer | |
| ... | Doors open | Door Manager | |
| {curfew} | Curfew [VERIFY WITH LOCAL AUTHORITY] | Venue Liaison | |
| ... | Load-out complete | Production Manager | |

### 1.2 Contact Sheet
| Role | Name | Phone | Email | On-site From |
|------|------|-------|-------|-------------|
| {role} | TBD | TBD | TBD | {time} |

### 1.3 Rider Fulfillment Checklist
- [ ] Technical rider items confirmed with venue
- [ ] Hospitality rider items sourced
- [ ] Dietary requirements confirmed

## 2. Run Sheet
> Source: TML timeline artifact ({TML_PATH or "not found — derived from brief"})
> All times in {venue_timezone or "local time — confirm venue timezone"}.

| Time | Duration | Activity | Responsible | Technical Cue | Contingency |
|------|----------|----------|-------------|---------------|-------------|
| {time} | {Xmin} | {activity} | {role} | {cue or "–"} | {contingency or "–"} |

## 3. Staffing Plan
### 3.1 Role Matrix
| Role | Headcount | Shift Start | Shift End | Zone | Briefing Time | Notes |
|------|-----------|-------------|-----------|------|---------------|-------|
| Door Manager | {N} | {time} | {curfew} | Entry | {time} | |
| Bar Staff | {N} [VERIFY WITH LOCAL AUTHORITY] | {time} | {close} | Bar Zone | {time} | |
| Security | {N} [VERIFY WITH LOCAL AUTHORITY] | {time} | {close} | All zones | {time} | |

### 3.2 Door Policy
{Derived from brief door_policy field or placeholder}

### 3.3 Bar Menu Framework
| Item | Price Point | Notes |
|------|------------|-------|
| {item} | TBD — set based on venue agreement | Populate from venue bar contract |

## 4. Budget Framework
### 4.1 Line Items
| Category | Line Item | Estimated Cost | Notes |
|----------|-----------|----------------|-------|
| Venue | Hire fee | TBD — obtain from venue | |
| Technical | AV/PA — preferred vendor TBD (obtain 3 quotes) | TBD | |
| Staffing | Door, bar, security (see Staffing Plan) | TBD | |
| Marketing | Print collateral (see Print Spec) | TBD | |
| Contingency | 10% on total production costs [VERIFY WITH LOCAL AUTHORITY] | TBD | |

### 4.2 Revenue Scenarios
| Capacity | Ticket Price | Gross Revenue | Net (after 15% fees) |
|----------|-------------|---------------|---------------------|
| 60% ({N} attendees) | TBD | TBD | TBD |
| 80% ({N} attendees) | TBD | TBD | TBD |
| 100% ({venue_capacity} attendees) | TBD | TBD | TBD |

### 4.3 Break-even Analysis
Break-even ticket count = Total Costs / (Ticket Price × (1 - fee%))
[Populate once ticket price and total cost estimates are confirmed]

## 5. Post-Event Template
### 5.1 Feedback Collection
- [ ] Attendee survey (method: TBD — email/QR code)
- [ ] Artist / performer debrief
- [ ] Venue staff debrief
- [ ] Social media sentiment capture (24-hour window)

### 5.2 Financial Reconciliation
| Category | Budget | Actual | Variance |
|----------|--------|--------|---------|
| [All line items from Section 4] | | | |

### 5.3 Retrospective Template
**What went well:**
**What to improve:**
**Key decisions for next edition:**
**Regulatory findings to address:** [note any AHJ feedback received]

## 6. Print Spec Output
{Generated only if at least one print artifact exists in manifest}

| Artifact | Code | Path | Format | Dimensions | Bleed | Safe Area | DPI | Color Mode | Trim Size |
|----------|------|------|--------|------------|-------|-----------|-----|-----------|-----------|
| Event Flyer | FLY | {FLY_PATH or "not generated"} | HTML→PDF | A5 / A4 / 1080px | 3mm | 5mm | 300 DPI min | sRGB (CMYK approx. in file) | {size} |
| Series Identity Template | SIT | {SIT_PATH or "not generated — recurring-series only"} | HTML→PDF | A5 | 3mm | 5mm | 300 DPI min | sRGB | A5 |
| Festival Program | PRG | {PRG_PATH or "not generated — multi-day only"} | HTML→PDF | A5 multi-page | 3mm | 5mm | 300 DPI min | sRGB | A5 |

> **Print Scope Disclaimer:** All print artifacts are composition reference guides only.
> They are not production print files. Professional prepress conversion (PDF/X-1a or PDF/X-4)
> and CMYK profile conversion by a qualified printer are required before commercial printing.

---
*Generated by PDE-OS /pde:handoff | {date} | Product Type: experience | Sub-type: {experienceSubType}*
```

### Pattern 4: Hybrid-Event Dual-Surface Output

**What:** For `experienceSubType === "hybrid-event"`, both BIB and HND outputs are produced in a single run. Two separate files are written and both are registered in the manifest.

**Implementation:**

```
IF HND_GENERATES_SOFTWARE is true (hybrid-event only):
  Run all standard software handoff generation (Steps 4b through 4h, 5b, 5c)
  Set BIB_VERSION = HND_VERSION (same version number for cohesion)
  Write BIB-{event-slug}-v{N}.md (experience bible)
  Write HND-handoff-spec-v{N}.md (software spec)
  Write HND-types-v{N}.ts (TypeScript interfaces)
  Register all three in manifest under BIB, HND codes respectively

ELSE (pure experience — single-night, multi-day, recurring-series, installation):
  Write BIB-{event-slug}-v{N}.md ONLY
  Do NOT write HND-handoff-spec or HND-types
  Register only BIB in manifest
```

**Manifest registration for BIB artifact:**

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BIB code BIB
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BIB name "Production Bible"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BIB type production-bible
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BIB domain handoff
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BIB path ".planning/design/handoff/"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BIB status complete
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BIB version ${BIB_VERSION}
```

### Pattern 5: Coverage Flag — `hasProductionBible`

**What:** New boolean flag added to `designCoverage` in `design-manifest.json`.

**PITFALLS.md explicit requirement:** "New flags `hasFloorPlan`, `hasProductionBible`, `hasEventFlyer` pass through all existing skills — verify a software project run through the full pipeline has none of these flags set in `design-manifest.json`."

**Current coverage flags (14 existing):** `hasDesignSystem`, `hasWireframes`, `hasFlows`, `hasHardwareSpec`, `hasCritique`, `hasIterate`, `hasHandoff`, `hasIdeation`, `hasCompetitive`, `hasOpportunity`, `hasMockup`, `hasHigAudit`, `hasRecommendations`, `hasStitchWireframes`.

**Phase 81 adds:** `hasProductionBible` as flag 15, alongside the already-planned `hasFloorPlan` and `hasPrintCollateral` (the latter was added in Phase 80 as flag 15 — confirm current count via coverage-check before writing).

**Read-before-set pattern (from handoff.md Step 7c precedent):**

```bash
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
# Parse ALL current flag values, merge hasProductionBible: true, preserve all others
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},...,"hasProductionBible":true}'
```

The `design-manifest.json` template must also be updated to add `hasProductionBible: false` to its `designCoverage` object.

### Pattern 6: STACK.md Check Bypass for Pure Experience

**What:** The hard STACK.md dependency in Step 2a must be conditionally skipped for pure experience products (non-hybrid-event).

**Implementation (documented in ARCHITECTURE.md):**

```
IF PRODUCT_TYPE is "experience" AND experienceSubType is NOT "hybrid-event":
  SKIP STACK.md check — production bible does not require framework detection
  Set FRAMEWORK = "none", TYPESCRIPT = false
  Display: "Step 2/7 (2a): STACK.md check skipped — experience product (non-hybrid). Framework: none."
ELSE:
  [existing STACK.md hard-requirement logic unchanged]
```

This is a modification to Step 2a prose, not a structural change to the workflow.

### Anti-Patterns to Avoid

- **Single-pass BIB generation:** Never generate all six sections in one prompt. The four-pass split is mandatory per PITFALLS.md for venues above 500 capacity, and is best practice regardless of size.
- **Specific vendor names or pricing:** Never generate actual vendor names ("Book XYZ Sound" or "£2,500 for PA hire"). Use placeholder categories only: "preferred AV vendor — obtain 3 quotes", "catering partner TBD".
- **Bare regulatory thresholds:** Never state a specific ratio, distance, or occupancy limit without `[VERIFY WITH LOCAL AUTHORITY]` on the same line. This applies to every numerical value in Sections 1, 3, and 4.
- **STACK.md required for pure experience:** The hard-stop error message from Step 2a must not trigger for non-hybrid experience products. The Step 2a bypass is a Wave 1 modification alongside the Step 4i stub replacement.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Regulatory disclaimer injection | Custom disclaimer generation logic | `@references/experience-disclaimer.md` loaded via `<required_reading>` | Already wired into handoff.md line 9 from Phase 74; single source of truth |
| Artifact discovery | Custom file-reading logic | `pde-tools.cjs design manifest-read` + Glob | Manifest already stores all upstream artifact paths with versions |
| Coverage flag writes | Direct JSON file edit | `pde-tools.cjs design manifest-set-top-level designCoverage` | Read-before-set pattern prevents clobber; established in every phase since 67 |
| Write lock | Direct file write without lock | `pde-tools.cjs design lock-acquire` / `lock-release` | Already in Step 5a/5d of handoff.md; concurrent write risk |
| BIB version numbering | Custom version logic | Glob pattern + parse N suffix (same as HND_VERSION logic in Step 2k) | HND_VERSION pattern is already implemented; BIB_VERSION mirrors it |
| CMYK values | Custom color space math | Inline 12-line sRGB-to-CMYK function (from Phase 80 STACK.md) | Already documented in Phase 80; no npm package needed |
| Print spec values | Research/derive from scratch | Read FLY/SIT/PRG artifact paths from manifest; values are fixed (3mm bleed, 5mm safe, 300 DPI) | Phase 80 locked these values; they are not variable by project |

**Key insight:** The production bible is a document assembly problem, not a generation problem. Almost all content comes from upstream artifacts already in the manifest. The workflow's job is to read, structure, and write — not to invent content.

---

## Common Pitfalls

### Pitfall 1: Single-Pass Token Truncation
**What goes wrong:** The workflow generates all six production bible sections in a single LLM call. For events with >500 capacity, the budget and staffing tables exhaust the token budget. The output is truncated mid-section with no error message.
**Why it happens:** Single-pass generation looks correct for small events during development but fails silently at scale.
**How to avoid:** Explicitly document the four-pass split in the workflow. Each pass generates specific named sections. The final assembly step collects all four outputs.
**Warning signs:** BIB document ends abruptly mid-section; budget table stops at line 5 of 20.

### Pitfall 2: STACK.md Hard-Stop for Pure Experience Products
**What goes wrong:** Step 2a still requires STACK.md for experience products. Pure experience projects (single-night, multi-day) don't have STACK.md because there is no software layer. The workflow halts with "No STACK.md found" before generating any output.
**Why it happens:** The Step 2a check predates experience product type; the bypass condition was documented in ARCHITECTURE.md but not yet implemented in the workflow.
**How to avoid:** Wave 1 modification must include the Step 2a bypass condition alongside the Step 4i stub replacement.
**Warning signs:** Test for experience product type → STACK.md error before reaching Step 4.

### Pitfall 3: hasProductionBible Flag Clobbering Existing Flags
**What goes wrong:** The coverage-check read at Step 7c reads 14 flags; the write at Step 7c writes 14 flags but omits `hasProductionBible` (flag 15). All 14 existing flags are preserved but the new flag is never written.
**Why it happens:** The hardcoded coverage-check write string in Step 7c currently lists exactly 14 flags. Phase 81 adds a 15th.
**How to avoid:** Update the Step 7c write string to include `hasProductionBible: true` alongside the 14 existing flags. Also update `templates/design-manifest.json` to add `hasProductionBible: false` to the `designCoverage` object.
**Warning signs:** Running `/pde:handoff` for experience product → coverage-check still shows `hasProductionBible` absent.

### Pitfall 4: Software Products Receiving Production Bible Sections
**What goes wrong:** A software project that triggers the `"experience"` branch due to a manifest detection error receives production bible sections instead of TypeScript interfaces. The handoff output is unusable for engineering teams.
**Why it happens:** Experience gate at Step 4i relies on `PRODUCT_TYPE` read from manifest; if the manifest has incorrect `productType`, the wrong branch executes.
**How to avoid:** Nyquist tests must assert that a software product type produces `HND-handoff-spec-v*.md` and `HND-types-v*.ts` but NOT `BIB-*` output. The existing cross-type regression test in `tests/phase-74/experience-regression.test.mjs` covers product type detection; Phase 81 tests cover handoff output isolation.
**Warning signs:** Smoke matrix test failure on "software → no BIB artifact" assertion.

### Pitfall 5: Regulatory Values Without Disclaimer Tags
**What goes wrong:** Production bible contains capacity limits, staffing ratios, or curfew times stated as bare facts without `[VERIFY WITH LOCAL AUTHORITY]` inline tags. Users rely on these as accurate for their jurisdiction.
**Why it happens:** LLM generates plausible-sounding regulatory numbers from training data without including the disclaimer.
**How to avoid:** The `@references/experience-disclaimer.md` is already in `<required_reading>` (wired in Phase 74). The workflow instructions for each BIB section must explicitly state "every numerical regulatory value MUST be immediately followed by `[VERIFY WITH LOCAL AUTHORITY]`." Nyquist tests assert the tag appears in the BIB section of the workflow instructions.
**Warning signs:** Handoff output contains "maximum occupancy: 450 persons" without disclaimer tag.

### Pitfall 6: Hybrid-Event Producing Only BIB (Missing Software Layer)
**What goes wrong:** For `experienceSubType === "hybrid-event"`, the workflow only generates the production bible and skips the software handoff. The digital layer of the hybrid event has no TypeScript interfaces.
**Why it happens:** The experience branch at Step 4i short-circuits software generation (`HND_GENERATES_SOFTWARE = false` by default).
**How to avoid:** Step 4i must explicitly check `IF experienceSubType === "hybrid-event": SET HND_GENERATES_SOFTWARE = true` and then execute the full software handoff path in addition to the BIB path.
**Warning signs:** A hybrid-event project has `BIB-*.md` but no `HND-handoff-spec-*.md` in the manifest.

### Pitfall 7: Run Sheet Without Timezone
**What goes wrong:** Run sheet contains time values like "16:00 stage check" without a timezone label. Unusable for events with international crew.
**Why it happens:** Timezone is not currently a required field in the brief extension; it defaults to omission.
**How to avoid:** Step 4 BIB context extraction should check for `venue_timezone` in brief content. If absent, include the label "(local time — confirm venue timezone)" on every time value in the run sheet.
**Warning signs:** Run sheet table rows lack timezone suffix.

### Pitfall 8: Print Spec Section When No Print Artifacts Exist
**What goes wrong:** Section 6 (Print Spec Output) is generated for an experience product that never ran `/pde:wireframe` for print collateral. The table rows list `FLY_PATH = "not generated"` — an empty section that could confuse users.
**Why it happens:** Section 6 is unconditionally included in the BIB template.
**How to avoid:** Section 6 should be conditional: only generate if at least one of `FLY_PATH`, `SIT_PATH`, or `PRG_PATH` is non-null. If all are null, include a single-sentence placeholder: "No print collateral artifacts found. Run `/pde:wireframe` to generate event flyer and program."
**Warning signs:** Section 6 table has all rows showing "not generated".

---

## Code Examples

Verified patterns from codebase inspection:

### Manifest Artifact Registration for BIB (from handoff.md Step 7b precedent)

```bash
# Source: workflows/handoff.md Step 7b — exact pattern from HND registration
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BIB code BIB
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BIB name "Production Bible"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BIB type production-bible
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BIB domain handoff
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BIB path ".planning/design/handoff/"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BIB status complete
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BIB version ${BIB_VERSION}
```

### Read-Before-Set for Coverage Flag (from handoff.md Step 7c precedent)

```bash
# Source: workflows/handoff.md Step 7c — read-before-set pattern (Phase 81 adds hasProductionBible as flag 15)
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
# Parse ALL current flag values (14 existing + hasProductionBible)
# Merge hasProductionBible: true while preserving all others
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current},"hasPrintCollateral":{current},"hasProductionBible":true}'
```

Note: `hasPrintCollateral` was added in Phase 80 and is now flag 15. `hasProductionBible` becomes flag 16. Verify current flag count via `pde-tools.cjs design coverage-check` before writing.

### Nyquist Test Pattern (from tests/phase-79/critique-hig-extensions.test.mjs)

```javascript
// Source: tests/phase-79/critique-hig-extensions.test.mjs — established test pattern
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

describe('HDOF-01: Advance document in handoff.md', () => {
  const content = readFileSync(join(ROOT, 'workflows/handoff.md'), 'utf8');

  test('handoff.md contains Advance Document section instruction', () => {
    assert.ok(
      content.includes('Advance Document') || content.includes('advance document'),
      'handoff.md missing advance document section instruction'
    );
  });
});
```

### BIB Version Numbering (from handoff.md Step 2k precedent for HND_VERSION)

```markdown
## BIB Version Gate

Use the Glob tool to find all files matching `.planning/design/handoff/BIB-*-v*.md`.
Parse the `v{N}` suffix from each filename. Find the maximum N among all matches.

- If no BIB files exist: set `BIB_VERSION = 1`
- If files exist: set `BIB_VERSION = max(N) + 1`

Display: `Step 2/7 (2k-bib): BIB production bible v{BIB_VERSION} will be generated.`
```

### Experience Product Upstream Artifact Discovery (from critique.md Phase 79 precedent)

```markdown
## FLP/TML Artifact Detection (from critique.md experience branch — Phase 79)

Use the Glob tool to check for `.planning/design/ux/wireframes/FLP-floor-plan-v*.html`.
- If found: SET FLP_PATH = path to highest version.
- If not found: WARN (non-blocking for BIB — unlike critique where FLP is a HALT)

Use the Glob tool to check for `.planning/design/ux/wireframes/TML-timeline-v*.html`.
- If found: SET TML_PATH = path to highest version.
- If not found: WARN — "run sheet will use brief temporal data only"
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Software-only HND output for all product types | Product-type-conditional output (software → HND, experience → BIB) | Phase 81 | Experience products receive operationally meaningful output instead of empty TypeScript interfaces |
| Phase 74 stub that falls back to software path | Populated experience branch with four-pass BIB generation | Phase 81 | Stub removal eliminates the "NEVER produce production bibles" guard that was preventing Phase 81 work |
| hasHandoff as the only handoff coverage flag | hasHandoff (software) + hasProductionBible (experience) as separate flags | Phase 81 | Correct coverage tracking; software projects never show hasProductionBible = true |
| STACK.md hard-required for all /pde:handoff calls | STACK.md bypassed for pure experience products | Phase 81 | Experience-only projects no longer HALT at Step 2a |

**Deprecated/outdated:**
- Phase 74 stub comment `"NEVER produce floor plans, production bibles, or experience token files from this stub"` — removed in Phase 81 when the stub is replaced.
- Fallback behavior `"Current behavior: proceed with software path as temporary fallback"` — removed in Phase 81.

---

## Open Questions

1. **Exact coverage flag count before Phase 81**
   - What we know: Phase 80 added `hasPrintCollateral` as a new flag. The manifest template currently shows 14 flags.
   - What's unclear: Whether `hasPrintCollateral` is already in the template or only in the workflow instructions.
   - Recommendation: Run `pde-tools.cjs design coverage-check` in Wave 0 to confirm current flag count before writing the Step 7c merge string.

2. **BIB artifact slug convention**
   - What we know: The artifact is registered as `BIB` code. The STACK.md uses `BIB-{event-slug}-v{N}.md` filename pattern.
   - What's unclear: How `event-slug` is derived (from `event_name` in brief, or from `.planning/` directory name).
   - Recommendation: Use the same derivation as `project_name` in the existing handoff spec frontmatter (derive from brief or `.planning/` directory name using kebab-case).

3. **Temporal flow artifact (FLOW-01) vs TML timeline (WIRE-02)**
   - What we know: The run sheet must consume "minute-by-minute timeline" data. TML is the timeline wireframe (Phase 78). Temporal flow is FLOW-01 (Phase 77). Both are upstream artifacts.
   - What's unclear: Whether the run sheet should prefer TML (more detailed, visual) or FLOW-01 (flow structure, may lack timestamps).
   - Recommendation: Prefer TML if available (it has actual time columns in the gantt). Fall back to FLOW-01 for structure if TML is absent. This aligns with the FLP as primary / TML as secondary pattern established in Phase 79 critique.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` (Node.js built-in, v18+) |
| Config file | None — tests run via `node --test` |
| Quick run command | `node --test tests/phase-81/handoff-production-bible.test.mjs 2>&1` |
| Full suite command | `node --test tests/**/*.test.mjs 2>&1` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HDOF-01 | `handoff.md` contains advance document section instruction | unit (structural) | `node --test tests/phase-81/handoff-production-bible.test.mjs 2>&1` | ❌ Wave 0 |
| HDOF-02 | `handoff.md` contains run sheet table instruction with time/duration/responsible/technical cue/contingency columns | unit (structural) | same | ❌ Wave 0 |
| HDOF-03 | `handoff.md` contains staffing plan section with roles/headcount/shifts | unit (structural) | same | ❌ Wave 0 |
| HDOF-04 | `handoff.md` contains budget framework section with revenue scenarios | unit (structural) | same | ❌ Wave 0 |
| HDOF-05 | `handoff.md` contains post-event template section | unit (structural) | same | ❌ Wave 0 |
| HDOF-06 | `handoff.md` contains print spec output section referencing FLY/SIT/PRG artifacts | unit (structural) | same | ❌ Wave 0 |
| HDOF-03 (disclaimer) | `handoff.md` contains `[VERIFY WITH LOCAL AUTHORITY]` tag in experience branch | unit (structural) | same | ❌ Wave 0 |
| Success 4 | `handoff.md` experience branch does NOT produce TypeScript interfaces or component specs for pure experience | unit (isolation) | same | ❌ Wave 0 |
| Success 5 | `handoff.md` hybrid-event branch sets `HND_GENERATES_SOFTWARE = true` | unit (structural) | same | ❌ Wave 0 |
| HDOF-06 (manifest) | `templates/design-manifest.json` contains `hasProductionBible` in `designCoverage` | unit (structural) | same | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test tests/phase-81/handoff-production-bible.test.mjs 2>&1`
- **Per wave merge:** `node --test tests/**/*.test.mjs 2>&1`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-81/handoff-production-bible.test.mjs` — covers HDOF-01 through HDOF-06, disclaimer enforcement, isolation (no BIB for software), hybrid-event dual-surface, print spec conditional generation

*(No framework install needed — `node:test` is built-in)*

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection: `workflows/handoff.md` (lines 1-960+) — Step 4i stub location at line ~517, Step 5 stub at line ~658, Step 7b manifest registration pattern, Step 7c read-before-set pattern
- Direct codebase inspection: `templates/design-manifest.json` — 14 existing coverage flags, `productType` and `experienceSubType` fields confirmed
- Direct codebase inspection: `references/experience-disclaimer.md` — disclaimer block content, usage rules, `workflows/handoff.md` listed as consumer
- Direct codebase inspection: `.planning/research/ARCHITECTURE.md` (lines 629-691) — Stage 7 Handoff production bible structure, STACK.md bypass condition, hybrid-event dual-surface, BIB document template
- Direct codebase inspection: `.planning/research/PITFALLS.md` (lines 250, 261, 273, 282-291) — four-pass split requirement, vendor placeholder rule, timezone requirement, pass-through-all coverage pattern
- Direct codebase inspection: `.planning/research/STACK.md` (lines 301-363) — BIB artifact format table, required sections, markdown-not-HTML decision, sub-type behavior by type
- Direct codebase inspection: `.planning/STATE.md` — locked decisions, all experience behavior in existing workflow files, disclaimer wiring, `hasPrintCollateral` as flag 15 from Phase 80
- Direct codebase inspection: `tests/phase-79/critique-hig-extensions.test.mjs` and `tests/phase-80/print-collateral.test.mjs` — test pattern for Nyquist structural assertions
- Direct codebase inspection: `.planning/phases/74-foundation-and-regression-infrastructure/74-02-PLAN.md` — handoff.md experience stub insertion points (lines ~510-516, ~651, ~929, ~554)

### Secondary (MEDIUM confidence)

- `.planning/research/FEATURES.md` — production bible as completion artifact, composite document assembly pattern, run sheet requirement confirmed from industry context

### Tertiary (LOW confidence)

- None — all claims in this research are grounded in direct codebase inspection of committed files.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools are Node.js built-ins or existing PDE pde-tools.cjs commands confirmed in handoff.md
- Architecture patterns: HIGH — stub locations confirmed by direct line-by-line inspection; BIB structure from ARCHITECTURE.md and STACK.md
- Pitfalls: HIGH — all pitfalls sourced from PITFALLS.md (explicit, documented, with detection patterns) or from cross-phase pattern analysis
- Coverage flag mechanics: HIGH — read-before-set pattern observed in handoff.md Step 7c and every prior phase; flag count confirmed in design-manifest.json template

**Research date:** 2026-03-21
**Valid until:** Stable — no external dependencies; all claims grounded in committed codebase files. Re-verify only if `handoff.md` or `design-manifest.json` template is modified before planning begins.
