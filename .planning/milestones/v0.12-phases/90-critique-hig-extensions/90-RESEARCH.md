# Phase 90: Critique + HIG Extensions — Research

**Researched:** 2026-03-22 (UPDATE pass)
**Domain:** Workflow extension — adding business-mode perspectives to existing critique and HIG skills
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| QUAL-01 | `critique.md` adds 4 business critique perspectives: unit economics viability, GTM-ICP fit, pricing psychology, investor readiness | Architecture: new `BUSINESS MODE GATE` block in Step 4 ELSE clause, after the 4 software perspectives, using the `$BM` detection pattern from wireframe.md |
| QUAL-02 | Pitch coherence cross-check: lean canvas UVP matches pitch deck solution slide, canvas key metrics match traction slide | Cross-artifact read: load LCV artifact (`.planning/design/strategy/LCV-lean-canvas-v*.md`) and DPD artifact (`.planning/design/launch/DPD-pitch-deck-outline-v*.md`). DPD contains explicit coherence anchors (`LCV.box3.UVP = [YOUR_UVP]` on slide 2, `LCV.box6.metrics = ...` on slide 6/8) that simplify the comparison |
| QUAL-03 | `hig.md` adds business communications HIG section: pitch deck readability, email cadence, content calendar structure | New Step 4 sub-section gated on `$BM == "true"` AND `LIGHT_MODE == false`, analogous to physical HIG domain blocks in experience mode |
| QUAL-04 | Business critique findings classified as standard severity levels (critical/major/minor/info) — consistent with existing critique output | Both critique.md and hig.md use `critical/major/minor/nit` — NOT "info". QUAL-04 says "info" but the canonical severity system uses "nit". Use "nit" to preserve format consistency with existing output |

</phase_requirements>

---

## Summary

Phase 90 extends two existing workflow skills — `critique.md` and `hig.md` — to add business-mode-specific evaluation when `businessMode === true` in the design manifest. This is a pure workflow extension phase: no new files, no new artifact codes, and no new manifest fields are introduced. The extension follows patterns already established in Phase 87 (flows.md), Phase 88 (system.md), and Phase 89 (wireframe.md).

The critique extension adds four new perspectives (unit economics viability, GTM-ICP fit, pricing psychology, investor readiness) and a pitch coherence cross-check section. The HIG extension adds a business communications section covering pitch deck readability, email cadence structure, and content calendar guidelines. Both extensions are gated on the `$BM == "true"` flag read from the design manifest — they are invisible to non-business product types, preserving the byte-identical baseline requirement from INTG-02.

**Critical finding from deep verification:** Both `critique.md` (Step 7c) and `hig.md` (Step 7) currently use the OLD 16-field `designCoverage` write — they were NOT updated when Phase 84 added the 4 business fields. Phase 90 MUST upgrade both to the 20-field pattern as part of its scope (this satisfies INTG-02 partial coverage for the review domain). The pitch coherence cross-check (QUAL-02) is simplified by the fact that the DPD artifact contains explicit coherence anchors embedded by wireframe.md Step 4j — the cross-check reads these anchors directly rather than parsing raw LCV box content.

**Primary recommendation:** Insert business critique as an independent `IF $BM == "true"` block INSIDE the ELSE clause of critique.md Step 4 (after the 4 software perspectives). Add pitch coherence as a separate post-perspectives block. Add business communications as an independent block in hig.md Step 4 ELSE clause. Upgrade both files' coverage writes from 16 to 20 fields. Follow the exact `$BM == "true"` detection and `$BT` branching pattern from wireframe.md.

---

## Standard Stack

### Core

This phase involves no external libraries. All work is workflow text extension.

| Component | Source | Purpose | Why Standard |
|-----------|--------|---------|--------------|
| `manifest-get-top-level businessMode` | pde-tools.cjs | Detects business mode in manifest | Same call used by wireframe.md, system.md, flows.md, opportunity.md |
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

Every prior business-mode extension in v0.12 follows this exact structure. Verified from `workflows/wireframe.md` lines 155-163:

```bash
# Step 4 preamble — business mode detection (read once, cache for use throughout)
BM=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-get-top-level businessMode 2>/dev/null)
if [[ "$BM" == @file:* ]]; then BM=$(cat "${BM#@file:}"); fi
BT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-get-top-level businessTrack 2>/dev/null)
if [[ "$BT" == @file:* ]]; then BT=$(cat "${BT#@file:}"); fi
```

`$BM` is a string `"true"` or `"false"` (not boolean). `$BT` is `"solo_founder"`, `"startup_team"`, or `"product_leader"`.

### Recommended Project Structure for Phase 90

```
workflows/
├── critique.md      # MODIFIED: business mode detection + gate added to Step 4 ELSE clause; pitch coherence post-perspectives block; 16→20 field coverage write upgrade in Step 7c
├── hig.md           # MODIFIED: business communications block added to Step 4 ELSE clause; 16→20 field coverage write upgrade in Step 7
references/
└── (no new files)   # All references already exist from prior phases
.planning/phases/90-critique-hig-extensions/
└── tests/
    └── test-critique-hig-business.cjs   # Wave 0: Nyquist structural tests
```

### Pattern 1: Business Mode Gate in Step 4 ELSE Clause (critique.md)

**What:** After completing the four existing software perspectives (UX, Visual Hierarchy, Accessibility, Business Alignment), insert a business-mode conditional block that adds four additional perspectives.

**Exact placement:** In critique.md, the existing Step 4 structure is:

```
IF productType === "experience":
  [7 experience perspectives]
  SKIP to Step 5.

ELSE:
  [business mode detection — BM/BT vars cached here]
  [Perspective 1: UX/Usability (1.5x)]
  [Perspective 2: Visual Hierarchy (1.0x)]
  [Perspective 3: Accessibility (1.5x) — delegates to /pde:hig --light]
  [Perspective 4: Business Alignment (1.0x)]
  [fidelity-severity calibration table]
  [score calculation per perspective]
  [finding format]
  [What Works identification]
  [Step 4e: AI Aesthetic Pattern Detection]
  [Step 4f: Motion Choreography Assessment]
  [Step 4g: Visual observations from screenshot]

  #### Step 4-BUSINESS: Business Mode Critique Extension (conditional)
  <<< INSERT HERE — after Step 4g, before Step 5 >>>

  IF `$BM != "true"`: skip this block entirely. Continue to Step 5.

  IF `$BM == "true"`:
    Load @references/business-track.md
    Load @references/business-financial-disclaimer.md
    [4 business perspectives — BIZ-1 through BIZ-4]

  #### Step 4-COHERENCE: Pitch Coherence Cross-Check (conditional)
  <<< INSERT HERE — after Step 4-BUSINESS >>>
  [see Pattern 2 below]
```

**IMPORTANT: This is an INDEPENDENT `IF` block (not `ELSE IF`)**, matching the Phase 88/89 pattern decision logged in STATE.md: "Steps 5c/5d are INDEPENDENT conditional blocks (not ELSE IF)."

**Score integration:** Business perspectives add to the weighted composite score. Weights:
- Unit Economics Viability: 1.0x
- GTM-ICP Fit: 1.0x
- Pricing Psychology: 1.5x
- Investor Readiness: 1.0x

**Composite formula update:** The existing formula is `(UX*1.5 + hierarchy*1.0 + a11y*1.5 + business*1.0) / 5.0` where 5.0 is the sum of weights (1.5+1.0+1.5+1.0=5.0). Business mode adds 4 perspectives. New total weight = 1.5+1.0+1.5+1.0+1.0+1.0+1.5+1.0 = **9.5**. Business mode composite formula: `(UX*1.5 + hierarchy*1.0 + a11y*1.5 + business*1.0 + unitEcon*1.0 + gtmIcp*1.0 + pricingPsych*1.5 + investorReady*1.0) / 9.5`

**Scorecard table extension (Step 5b):** When business mode is active, the Summary Scorecard table gains four additional rows. The frontmatter `Groups Evaluated` field expands to include the four business perspective names: `"UX/Usability, Visual Hierarchy, Accessibility, Business Alignment, Unit Economics Viability, GTM-ICP Fit, Pricing Psychology, Investor Readiness"`.

**--focused flag behavior (verified from critique.md):** The flag's valid values list (`ux, hierarchy, accessibility, business`) does NOT include the new business perspectives by name. When `--focused business` is invoked in business mode, it runs: (a) the existing Perspective 4: Business Alignment, and (b) all 4 new business perspectives. The `--focused` valid values list stays at the current 4 entries — update the flag documentation to note that `business` includes business perspectives in business mode.

### Pattern 2: Pitch Coherence Cross-Check (post-perspectives block)

**What:** After all perspective evaluation (Step 4-BUSINESS), before writing the report (Step 5), add a pitch coherence validation block.

**Key insight from code verification:** wireframe.md Step 4j embeds explicit coherence anchors in the DPD artifact:
- Solution slide (slide 2 YC / slide 2-3 Sequoia): `LCV.box3.UVP = [YOUR_UVP]`
- Traction slide (slide 6 YC / slide 8 Sequoia): `LCV.box6.metrics = [YOUR_METRIC_1], [YOUR_METRIC_2]`

The cross-check SHOULD look for these anchor strings in the DPD content — if present and still containing the `[YOUR_UVP]` placeholder, flag as advisory (user hasn't filled in their UVP). If the anchor is present but has real content, compare it against LCV box 3. This is simpler than parsing arbitrary box content.

**Artifact paths (verified from workflows):**

```
LCV path: .planning/design/strategy/LCV-lean-canvas-v*.md
           └── VERIFIED: brief.md line 668, 727 — domain: strategy
DPD path: .planning/design/launch/DPD-pitch-deck-outline-v*.md
           └── VERIFIED: wireframe.md line 658, 2348 — domain: launch
```

**Cross-check logic:**

```
#### Step 4-COHERENCE: Pitch Coherence Cross-Check (conditional)

IF `$BM != "true"`: skip entirely.

IF `$BM == "true"`:
  Use Glob to find: .planning/design/strategy/LCV-lean-canvas-v*.md
  → sort by version number, take highest → SET LCV_FILE

  Use Glob to find: .planning/design/launch/DPD-pitch-deck-outline-v*.md
  → sort by version number, take highest → SET DPD_FILE

  IF LCV_FILE is absent:
    SET COHERENCE_AVAILABLE = false
    Note in report: "Pitch coherence cross-check skipped: LCV lean canvas not found. Run /pde:brief in business mode first."

  IF DPD_FILE is absent:
    SET COHERENCE_AVAILABLE = false
    Note in report: "Pitch coherence cross-check skipped: DPD pitch deck outline not found. Run /pde:wireframe in business mode first."

  IF both present (COHERENCE_AVAILABLE = true):
    Read LCV_FILE. Extract Box 3 (UVP) content.
    Read DPD_FILE. Look for the coherence anchor on the Solution slide:
      - Anchor text: "LCV.box3.UVP ="
      - If anchor present with placeholder value ("[YOUR_UVP]"): flag as advisory (UVP not customized)
      - If anchor present with real content: compare against LCV box 3 text
      - If anchor absent (older DPD without QUAL-02 anchors): fall back to searching Solution slide for LCV UVP language

    Look for traction coherence anchor:
      - Anchor text: "LCV.box6.metrics ="
      - Apply same pass/advisory/fail logic

    Cross-check 1: LCV UVP ↔ DPD Solution slide
      Pass: UVP language appears in solution slide content
      Advisory: solution slide contains placeholder "[YOUR_UVP]" — user hasn't customized
      Fail: no relationship between LCV UVP and solution slide — severity = major

    Cross-check 2: LCV Key Metrics ↔ DPD Traction slide
      Pass: LCV metrics appear in traction slide content
      Advisory: traction slide contains placeholder "[YOUR_METRIC_1]" — user hasn't customized
      Fail: no relationship — severity = major

    SET COHERENCE_FINDINGS = [list of cross-check results]
```

**Report section:** Coherence findings appear in the critique report as a dedicated `## Pitch Coherence Cross-Check` section, not mixed into the perspective findings tables. Coherence findings are included in the Action List for /pde:iterate but do NOT affect the composite score.

### Pattern 3: Business Communications HIG Section (hig.md)

**What:** In hig.md Step 4, inside the ELSE clause (standard software/hardware/hybrid path), after the full WCAG audit (steps 4a through 4i), add a business communications evaluation block.

**Exact placement (verified from hig.md):**

The hig.md Step 4 structure is:
```
IF productType === "experience":
  [7 physical HIG domains]
  Proceed to Step 5/7.

ELSE:  (line 322: "Standard WCAG/HIG audit path")
  IF --light mode (LIGHT_MODE=true):
    [5 mandatory checks only]
    STOP HERE

  IF full mode (LIGHT_MODE=false):
    [4a. POUR Compliance Assessment]
    [4b. 5 Mandatory Checks]
    [4c. WCAG 2.2 New Criteria]
    [4d. Platform-Specific HIG Checks]
    [4e. Component-Grouped View]
    [4f. Severity Rating]
    [4g. Motion Accessibility Audit]
    [4h. Animation Performance Audit]
    [4i. Touch Target During Motion State]

    #### Step 4-BUSINESS: Business Communications HIG (conditional)
    <<< INSERT HERE — after 4i, before "Display: Step 4/7 complete" >>>

    IF `$LIGHT_MODE == true`: skip this block entirely (defense-in-depth guard).
    IF `$BM != "true"`: skip this block entirely.

    IF `$BM == "true"` AND `$LIGHT_MODE == false`:
      Load @references/business-track.md
      [Three business communications domain checks]
```

**Three domain checks:**

Domain 1: Pitch Deck Readability
- Check DPD artifact (if present): slide count vs. track format expectation
- Check: each slide's headline/question is concise (< 12 words)
- Check: solution slide contains the UVP from LCV box 3
- Severity: major if UVP absent from solution slide; minor if headline > 12 words

Domain 2: Email Cadence Structure
- Check OTR artifact (`.planning/design/launch/OTR-email-sequence-v*.md`) — from Phase 91, will not exist during Phase 90 runs
- If OTR absent: note "OTR email sequence not yet generated; run /pde:handoff to create" — do NOT halt
- If OTR present: check onboarding email count matches track expectation (solo: 5, startup: 5-7, leader: 7)
- Check: each email has trigger/delay/CTA fields populated
- Severity: minor for count mismatch; major for missing CTA fields

Domain 3: Content Calendar Structure
- Check CNT artifact (`.planning/design/launch/CNT-content-calendar-v*.md`) — from Phase 91, will not exist during Phase 90 runs
- If CNT absent: note "CNT content calendar not yet generated; run /pde:handoff to create" — do NOT halt
- If CNT present: check 30-day skeleton present with pre-launch/launch/post-launch phases
- Check: content slots derive from GTM channel priorities
- Severity: minor for missing phases; major if no GTM cross-reference

### Pattern 4: 16→20 Field Coverage Write Upgrade (BOTH files)

**What:** Both critique.md and hig.md currently use the old 16-field `designCoverage` write. Phase 90 must upgrade both to the 20-field pattern.

**Current (WRONG) state verified from code:**

`critique.md` Step 7c (line 1020):
> "Extract ALL sixteen current flag values: hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate, hasHandoff, hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations, hasStitchWireframes, hasPrintCollateral, hasProductionBible"

`hig.md` Step 7 (line 792):
> "Extract ALL 16 current coverage flag values (default absent fields to `false`): hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate, hasHandoff, hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations, hasStitchWireframes, hasPrintCollateral, hasProductionBible"

**Correct pattern (20 fields) from wireframe.md:**

```bash
# Read-before-set:
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi

# Extract ALL TWENTY fields. Default absent fields to false.
# Set hasCritique: true (for critique.md) OR hasHigAudit: true (for hig.md) — pass all others through.
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":true,"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current},"hasPrintCollateral":{current},"hasProductionBible":{current},"hasBusinessThesis":{current},"hasMarketLandscape":{current},"hasServiceBlueprint":{current},"hasLaunchKit":{current}}'
```

The hig.md version sets `"hasHigAudit":true` instead of `"hasCritique":true`.

### Anti-Patterns to Avoid

- **ELSE IF chaining business gate onto experience gate**: Experience products are completely separate — business perspectives do not apply to them. Use independent IF blocks inside the ELSE clause.
- **Placing business gate OUTSIDE the ELSE clause**: If placed outside, it runs for experience products too, generating irrelevant unit economics findings against a floor plan artifact.
- **Modifying the four existing perspective weights**: UX (1.5x), Visual Hierarchy (1.0x), Accessibility (1.5x), Business Alignment (1.0x) are locked. Only the NEW business perspectives get new weights.
- **Affecting the composite score with coherence findings**: The pitch coherence cross-check is a structural consistency check, not a quality scoring perspective. Keep it out of score calculation.
- **Running HIG business communications in --light mode**: The --light mode is used by /pde:critique as a delegation. Business communications HIG must only run in full mode. The `LIGHT_MODE == false` guard must be the FIRST check in the business communications block.
- **Writing dollar amounts in unit economics critique**: Unit economics critique must use structural placeholders per `business-financial-disclaimer.md`. Never "LTV should be $200". Say "the LCV cost structure does not indicate a CAC ceiling — complete [YOUR_CAC_CEILING] in LCV Box 8".
- **Using "info" severity**: QUAL-04 says "info" but the canonical severity system uses `nit`. Do not introduce a new severity value.
- **Using wrong denominator (9.0) in composite formula**: Sum of all 8 weights is 9.5, not 9.0. Business mode composite denominator = 9.5.
- **Writing 16-field designCoverage**: critique.md and hig.md currently have 16-field writes — these MUST be upgraded to 20 fields in Phase 90. The Nyquist test must assert `hasBusinessThesis` is present in both files' coverage writes.
- **Wrong LCV path**: LCV is in `strategy/` not `launch/`. Glob pattern: `.planning/design/strategy/LCV-lean-canvas-v*.md`.
- **Halting on missing OTR/CNT**: These are Phase 91 artifacts. HIG business communications MUST degrade gracefully.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Business mode detection | Custom manifest file reader | `pde-tools.cjs manifest-get-top-level businessMode` | Already works; used in 5+ prior workflows |
| LCV/DPD artifact discovery | Custom glob pattern | Glob tool + `sort -t v -k2 -n \| tail -1` version selection | Standard artifact discovery pattern in critique Step 2 |
| Track depth lookup | Inline if-else chains | `@references/business-track.md` depth threshold table | Single source of truth for all track vocabulary |
| Financial disclaimer text | Custom warning strings | `@references/business-financial-disclaimer.md` | Required for consistency; already pre-written |
| Pitch deck slide numbering | Hardcoded slide numbers | DPD coherence anchors + `references/launch-frameworks.md` slide maps | Slide numbers differ by track/format — DPD anchors are authoritative |
| Severity scale | New severity values | Existing `critical/major/minor/nit` exactly | Adding "info" would break --focused flag parsing and score calculation |
| 20-field coverage write | Partial coverage write | Full 20-field read-before-set pattern from wireframe.md | Skipping coverage-check resets flags set by other skills |

**Key insight:** Every data structure, vocabulary rule, and artifact schema needed for Phase 90 already exists in the reference library from Phases 84-89. This phase is purely additive text extension to two workflow files, plus a coverage write upgrade in both files.

---

## Common Pitfalls

### Pitfall 1: Experience Product Type Collision

**What goes wrong:** Business perspectives accidentally apply to experience products (e.g., a business:experience composition), generating irrelevant unit economics findings against a floor plan artifact.

**Why it happens:** The experience gate skips the software path entirely. If the business gate is placed outside the ELSE clause, it runs for experience products too.

**How to avoid:** The business mode gate MUST be INSIDE the ELSE clause that contains the software path. Verified from STATE.md: "Steps 5c/5d are INDEPENDENT conditional blocks (not ELSE IF) — business:experience compositions run both experience and business brand token generation." The same independence applies here, but both must be inside the ELSE clause.

**Warning signs:** Test that runs /pde:critique on an experience product and finds business perspective output in the CRT artifact.

### Pitfall 2: Pitch Coherence Check Halts When Artifacts Missing

**What goes wrong:** LCV or DPD artifact not found causes /pde:critique to halt with an error.

**Why it happens:** Using HALT on missing artifacts rather than graceful degradation.

**How to avoid:** Coherence check MUST degrade gracefully. Set COHERENCE_AVAILABLE = false, log advisory note, add note to critique report. Never halt.

**Warning signs:** User runs /pde:critique before /pde:wireframe and gets an error.

### Pitfall 3: Composite Score Formula Denominator Error

**What goes wrong:** Business mode composite score uses wrong denominator.

**Why it happens:** The existing denominator is 5.0 (sum: 1.5+1.0+1.5+1.0). Adding 4 business perspectives (1.0+1.0+1.5+1.0=4.5) gives new sum = 5.0+4.5 = **9.5**, not 9.0.

**How to avoid:** Document the updated formula explicitly: `(UX*1.5 + hierarchy*1.0 + a11y*1.5 + business*1.0 + unitEcon*1.0 + gtmIcp*1.0 + pricingPsych*1.5 + investorReady*1.0) / 9.5`.

**Warning signs:** Composite score above 100 or not matching manual calculation.

### Pitfall 4: HIG Business Section in --light Mode

**What goes wrong:** Business communications HIG runs in --light delegation mode (called from /pde:critique), adding unexpected output.

**How to avoid:** The VERY FIRST check in the business communications block must be `IF LIGHT_MODE == true: skip entirely`. Defense-in-depth: also check before the business mode detection.

### Pitfall 5: 16-Field designCoverage Write Surviving Phase 90

**What goes wrong:** critique.md or hig.md still uses 16-field coverage write after Phase 90 implementation, breaking the INTG-02 requirement that all workflows use 20-field coverage.

**Why it happens:** Both files currently have 16-field writes. If only the new business blocks are added without upgrading the coverage write, the INTG-02 test will fail.

**How to avoid:** Phase 90 MUST explicitly upgrade BOTH files' coverage writes. The Nyquist test must assert `hasBusinessThesis` appears in both files' coverage write commands.

### Pitfall 6: Business Critique Findings Mixed Into Software Perspective Tables

**What goes wrong:** Business perspectives rendered as Perspectives 5-8 in same sorted findings table as Perspectives 1-4.

**How to avoid:** Render business perspective findings in a separate `## Business Mode Findings` section in the critique report. Keep the existing rendering logic untouched for non-business runs.

### Pitfall 7: Wrong LCV Artifact Path

**What goes wrong:** LCV glob pattern uses `launch/` instead of `strategy/`, finding nothing.

**Root cause:** LCV is the Lean Canvas artifact — it was generated in Phase 85 (brief skill) and lives in `strategy/`. It is NOT a launch artifact despite being consumed by launch artifact generation in Phase 89. Only LDP, STR, and DPD live in `launch/`.

**How to avoid:** Use `.planning/design/strategy/LCV-lean-canvas-v*.md` for LCV. Use `.planning/design/launch/DPD-pitch-deck-outline-v*.md` for DPD.

---

## Code Examples

Verified patterns from existing workflows in this codebase:

### Business Mode Detection (verified from wireframe.md lines 159-163)
```bash
# Source: workflows/wireframe.md lines 159-163
BM=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-get-top-level businessMode 2>/dev/null)
if [[ "$BM" == @file:* ]]; then BM=$(cat "${BM#@file:}"); fi
BT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-get-top-level businessTrack 2>/dev/null)
if [[ "$BT" == @file:* ]]; then BT=$(cat "${BT#@file:}"); fi
# Store as $BM ("true"/"false") and $BT ("solo_founder"/"startup_team"/"product_leader")
```

### Artifact Discovery Pattern (verified from critique.md Step 2b)
```
# Source: workflows/critique.md Step 2b
Use the Glob tool to check for `.planning/design/ux/FLW-flows-v*.md`.
Sort all matches descending by version number, read the highest version using the Read tool.
```

For LCV and DPD in Phase 90 — VERIFIED paths:
```
# LCV lean canvas — lives in strategy/ (generated by /pde:brief)
LCV_FILE: Glob `.planning/design/strategy/LCV-lean-canvas-v*.md` → highest version

# DPD pitch deck outline — lives in launch/ (generated by /pde:wireframe)
DPD_FILE: Glob `.planning/design/launch/DPD-pitch-deck-outline-v*.md` → highest version
```

### Severity Rating Format (verified from critique.md Step 4 finding format, line 600)
```
# Source: workflows/critique.md Step 4 "Finding format" section
- **Severity:** `critical` | `major` | `minor` | `nit`
- **Effort:** `quick-fix` | `moderate` | `significant`
```

Business critique findings MUST use this exact format. "info" is NOT a valid severity level in this system.

### hig.md Severity Format (verified from hig.md Step 4f, line 495)
```
# Source: workflows/hig.md Step 4f "Severity Rating"
Every finding MUST be rated using this EXACT scale (matches critique exactly):
- `critical`: Blocks access entirely
- `major`: Significant barrier
- `minor`: Moderate issue
- `nit`: Polish
Finding format: | {critical|major|minor|nit} | {quick-fix|moderate|significant} | ...
```

### Finding Table Format
```markdown
| Severity | Effort | Location | Issue | Suggestion | Reference |
|----------|--------|----------|-------|------------|-----------|
| major | moderate | LCV Box 3 > UVP | UVP not reflected in pitch deck Solution slide | Update DPD slide 2 to open with the LCV UVP statement | Pitch coherence: LCV box 3 ↔ DPD slide 2 |
```

### Track Depth Branch Pattern (verified from wireframe.md Step 4j)
```
# Source: workflows/wireframe.md Step 4j
IF $BT == "solo_founder":
  SET DECK_FORMAT = "yc_10"
ELIF $BT == "startup_team":
  [detect funding signals in BTH/BRF content]
ELIF $BT == "product_leader":
  SET DECK_FORMAT = "internal_business_case"
```

Business critique depth follows this same pattern per track:
- `solo_founder`: 2-3 findings per business perspective (action-first, no jargon)
- `startup_team`: 4-5 findings per business perspective (investor vocabulary, metrics framing)
- `product_leader`: 4-5 findings per business perspective (P&L vocabulary, OKR framing, board-ready format)

### 20-Field designCoverage Write (verified from wireframe.md lines 2379-2383)
```bash
# Source: workflows/wireframe.md lines 2379-2383 — canonical 20-field pattern
# ALWAYS read-before-set to avoid clobber
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi

# For critique.md upgrade (set hasCritique: true, pass others through):
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":true,"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current},"hasPrintCollateral":{current},"hasProductionBible":{current},"hasBusinessThesis":{current},"hasMarketLandscape":{current},"hasServiceBlueprint":{current},"hasLaunchKit":{current}}'

# For hig.md upgrade (set hasHigAudit: true, pass others through):
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":true,"hasRecommendations":{current},"hasStitchWireframes":{current},"hasPrintCollateral":{current},"hasProductionBible":{current},"hasBusinessThesis":{current},"hasMarketLandscape":{current},"hasServiceBlueprint":{current},"hasLaunchKit":{current}}'
```

### DPD Coherence Anchor Format (verified from wireframe.md lines 683, 687)
```markdown
# Source: workflows/wireframe.md Step 4j — coherence anchors embedded in DPD artifact
# On Solution slide (slide 2 YC):
LCV.box3.UVP = [YOUR_UVP]

# On Traction slide (slide 6 YC / slide 8 Sequoia):
LCV.box6.metrics = [YOUR_METRIC_1], [YOUR_METRIC_2]
```

The pitch coherence cross-check reads these anchor strings. If present with `[YOUR_X]` placeholders, flag as advisory. If present with real content, compare against LCV box content.

### Nyquist Test Pattern (verified from Phase 89 test file)
```javascript
// Source: .planning/phases/89-wireframe-stage-launch-artifacts/tests/test-wireframe-launch.cjs
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const critiqueContent = fs.readFileSync(path.join(ROOT, 'workflows', 'critique.md'), 'utf-8');
const higContent = fs.readFileSync(path.join(ROOT, 'workflows', 'hig.md'), 'utf-8');

describe('QUAL-01: businessMode detection in critique.md', () => {
  it('critique.md contains "manifest-get-top-level businessMode"', () => {
    assert.ok(
      critiqueContent.includes('manifest-get-top-level businessMode'),
      'critique.md must contain businessMode detection'
    );
  });
});

// negative assertion example (QUAL-04):
it('critique.md does NOT use "| info |" as severity value', () => {
  assert.ok(
    !critiqueContent.includes('| info |'),
    'critique.md must not introduce "info" severity — use "nit" instead'
  );
});

// 20-field coverage assertion (INTG-02):
it('critique.md designCoverage write contains "hasBusinessThesis" (20-field, not 16)', () => {
  assert.ok(
    critiqueContent.includes('hasBusinessThesis'),
    'critique.md must use 20-field designCoverage write'
  );
});
```

---

## Business Critique Perspective Specifications

### Perspective BIZ-1: Unit Economics Viability (weight 1.0x)

**Evaluation sources:**
- LCV lean canvas: Box 8 (Cost Structure), Box 9 (Revenue Streams)
- STR Stripe pricing config: tier structure and checkout mode
- Business financial disclaimer: NO dollar amounts in findings

**Checklist:**
- LTV/CAC structural relationship: Does the pricing config support positive unit economics? (single tier at free with no paid tier = no viable LTV path)
- Payback period signal: Is there a trial period in STR? Does the pricing model enable recovery within a reasonable period?
- Churn risk: Does the lean canvas revenue stream imply recurring vs one-time revenue? One-time revenue with no retention mechanism = higher churn risk.
- Cost structure coverage: Does LCV Box 8 show any cost items? If empty placeholders only, flag as minor.

**Financial disclaimer rule:** ALWAYS use structural placeholders. Say "the LCV cost structure does not indicate a CAC ceiling — complete [YOUR_CAC_CEILING] in LCV Box 8". Never say "your CAC should be under $X".

### Perspective BIZ-2: GTM-ICP Fit (weight 1.0x)

**Evaluation sources:**
- LCV lean canvas: Box 5 (Customer Segments), Box 7 (Channels)
- GTM flow artifact: acquisition → conversion → retention flowchart
- BRF brief: persona definitions
- MLS market landscape: competitive positioning

**Checklist:**
- ICP specificity: Is LCV Box 5 specific enough to target? ("anyone who..." = major; "B2B SaaS companies 50-500 employees" = pass)
- Channel-ICP alignment: Do GTM channels match where ICP actually spends time?
- Channel count: More than 3 primary channels without sequencing = minor finding
- GTM sequencing: Does GTM flow show acquisition → conversion → retention? If absent, flag advisory.

### Perspective BIZ-3: Pricing Psychology (weight 1.5x)

**Evaluation sources:**
- STR Stripe pricing config: tier structure, names, trial periods
- LCV lean canvas: Box 3 (UVP), Box 9 (Revenue Streams)
- LDP landing page wireframe: PricingTable section

**Checklist:**
- Tier anchoring: Does pricing config show clear anchor tier? Single-tier pricing lacks anchoring (minor for solo_founder, major for startup_team).
- Decoy pricing: For 3-tier configs, is the middle tier clearly "best value"?
- Free trial commitment: Does trial structure encourage commitment before trial ends?
- UVP in pricing table: Does PricingTable reference UVP from LCV Box 3? Generic pricing copy reduces conversion.
- Plan naming: Value-based names ("Growth") vs size-based names ("Large")?

### Perspective BIZ-4: Investor Readiness (weight 1.0x)

**Evaluation sources:**
- DPD pitch deck outline: all slides
- LCV lean canvas: all boxes
- MLS market landscape: TAM/SAM/SOM
- BTH business thesis: unfair advantage

**Checklist:**
- Narrative arc: Does pitch deck follow Problem → Solution → Market → Product → Business Model → Traction → GTM → Competition → Team → Ask? (1 missing slide = major; 2+ = critical)
- Ask slide completeness: Does Ask slide include what is being asked for? If placeholder only and track is startup_team, flag as major.
- Market size credibility: Does MLS include SAM/SOM (not just TAM)? TAM-only = common investor red flag.
- Unfair advantage specificity: Is BTH unfair advantage specific (technology moat, network effect, regulatory barrier) or generic ("passion", "team")? Generic = major.
- Traction presence: Does traction slide exist and include at least one metric placeholder? If startup_team track and traction slide has no metrics, flag as major.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Business critique as separate workflow | Integrated into existing /pde:critique via conditional gate | Phase 90 (this phase) | No new slash command; /pde:critique handles business mode automatically |
| 16-field designCoverage (critique.md, hig.md) | 20-field designCoverage | Phase 84 added fields; Phase 90 upgrades critique.md and hig.md | Both files MUST be upgraded in Phase 90 |
| Experience product type = ELSE branch | Experience = first gate, software/business = ELSE | Phase 84-89 pattern | Business gate sits inside ELSE clause |
| Standalone HIG audit | HIG called with --light from /pde:critique | Pre-v0.12 | Business HIG must not run in --light mode |
| Raw LCV box parsing for coherence | DPD coherence anchors (`LCV.box3.UVP = ...`) | Phase 89 wireframe.md Step 4j | Simpler coherence check; read anchors directly |

**Deprecated/outdated patterns:**
- 16-field designCoverage write: any coverage write missing hasBusinessThesis/hasMarketLandscape/hasServiceBlueprint/hasLaunchKit is incorrect in v0.12. critique.md and hig.md currently have this bug — Phase 90 fixes it.
- Separate business critique command: not being introduced — all business critique is part of /pde:critique.
- "info" severity: not used anywhere in the system. Use "nit".

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
| QUAL-01 | `critique.md` contains `manifest-get-top-level businessMode` in Step 4 | structural | pattern assert on critique.md content | ❌ Wave 0 |
| QUAL-01 | `critique.md` contains 4 business perspective names (unit economics, GTM-ICP, pricing psychology, investor readiness) | structural | pattern assert on critique.md content | ❌ Wave 0 |
| QUAL-02 | `critique.md` contains `LCV-lean-canvas` glob pattern in strategy/ directory | structural | assert `LCV-lean-canvas` + `strategy` both present | ❌ Wave 0 |
| QUAL-02 | `critique.md` contains `DPD-pitch-deck-outline` glob pattern | structural | pattern assert on critique.md content | ❌ Wave 0 |
| QUAL-02 | `critique.md` contains coherence anchor search strings (`LCV.box3.UVP`) | structural | pattern assert on critique.md content | ❌ Wave 0 |
| QUAL-03 | `hig.md` contains `manifest-get-top-level businessMode` | structural | pattern assert on hig.md content | ❌ Wave 0 |
| QUAL-03 | `hig.md` contains business communications domain names (pitch deck readability, email cadence, content calendar) | structural | pattern assert on hig.md content | ❌ Wave 0 |
| QUAL-04 | `critique.md` does NOT contain `\| info \|` as severity value | structural | negative assert on critique.md | ❌ Wave 0 |
| QUAL-04 | `hig.md` does NOT contain `\| info \|` as severity value | structural | negative assert on hig.md | ❌ Wave 0 |
| INTG-02 | `critique.md` designCoverage write contains `hasBusinessThesis` (20-field, not 16) | structural | assert `hasBusinessThesis` in critique.md | ❌ Wave 0 |
| INTG-02 | `hig.md` designCoverage write contains `hasBusinessThesis` (20-field, not 16) | structural | assert `hasBusinessThesis` in hig.md | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test .planning/phases/90-critique-hig-extensions/tests/test-critique-hig-business.cjs`
- **Per wave merge:** same (single-file test suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `.planning/phases/90-critique-hig-extensions/tests/test-critique-hig-business.cjs` — covers QUAL-01 through QUAL-04 and INTG-02 (designCoverage 20-field for both critique.md and hig.md)

---

## Open Questions

1. **Business critique scoring in mixed critique runs (--focused flag)** — RESOLVED
   - The `--focused` flag valid values (`ux, hierarchy, accessibility, business`) remain unchanged. The 4 new business perspectives are treated as sub-perspectives of `business`. When `--focused business` is invoked in business mode, it runs both the existing Perspective 4: Business Alignment AND the 4 new business perspectives. The flag documentation should note this behavior.

2. **LCV artifact path** — RESOLVED (correction from first-pass research)
   - Path confirmed: `.planning/design/strategy/LCV-lean-canvas-v{N}.md`
   - Source: `workflows/brief.md` lines 668, 726-727: `File path: .planning/design/strategy/LCV-lean-canvas-v{N}.md`, manifest domain: `strategy`
   - LCV domain is `strategy` (not `launch`). The first-pass research Code Examples section had an error — the correct glob pattern is `.planning/design/strategy/LCV-lean-canvas-v*.md`.

3. **DPD artifact path** — RESOLVED
   - Path confirmed: `.planning/design/launch/DPD-pitch-deck-outline-v{N}.md`
   - Source: `workflows/wireframe.md` line 658, 2348. Domain: `launch`.

4. **Coherence check approach** — RESOLVED
   - wireframe.md Step 4j embeds explicit coherence anchors in the DPD artifact: `LCV.box3.UVP = [YOUR_UVP]` and `LCV.box6.metrics = [YOUR_METRIC_1], [YOUR_METRIC_2]`. The cross-check reads these anchors directly. This is simpler than raw box parsing and is the intended QUAL-02 implementation target.

5. **Composite score denominator** — RESOLVED
   - Sum of all 8 perspective weights: 1.5 (UX) + 1.0 (Hierarchy) + 1.5 (A11y) + 1.0 (Business) + 1.0 (UnitEcon) + 1.0 (GTM-ICP) + 1.5 (PricingPsych) + 1.0 (InvestorReady) = **9.5**, not 9.0. The first-pass research had this wrong.

---

## Sources

### Primary (HIGH confidence)

- `workflows/critique.md` (read in full — 1077 lines) — existing 4-perspective architecture, experience gate pattern (line 273-408), ELSE clause software path (line 406-730), score formula (line 783), finding format (line 600), coverage write (line 1020-1023 — CONFIRMED 16-field)
- `workflows/hig.md` (read in full — 859 lines) — existing WCAG audit architecture, --light mode contract (line 326-356), experience mode (line 201-320), coverage write (line 792-799 — CONFIRMED 16-field)
- `workflows/wireframe.md` (read lines 155-731, 2375-2390) — business mode detection pattern (lines 159-163), Steps 4h/4i/4j business artifact generation, DPD coherence anchors (lines 683, 687), 20-field coverage write (lines 2379-2390)
- `workflows/brief.md` (grep verified) — LCV path confirmed at `strategy/` domain (lines 668, 726-727)
- `workflows/competitive.md` (grep verified) — 20-field coverage write anti-pattern note (line 754)
- `.planning/REQUIREMENTS.md` — QUAL-01 through QUAL-04 verbatim requirements
- `.planning/STATE.md` — prior phase decisions (independent IF blocks, not ELSE IF; 20-field coverage write; Step sub-section insertion patterns; Phase 89 DPD/LCV paths)
- `.planning/phases/89-wireframe-stage-launch-artifacts/tests/test-wireframe-launch.cjs` — Nyquist test format (node:test, .cjs, describe/it, assert.ok pattern)

### Secondary (MEDIUM confidence)

- grep results for `businessMode|businessTrack|\$BM|\$BT` across all workflows — confirmed only wireframe.md, system.md, opportunity.md, brief.md, flows.md, competitive.md have business mode gates; critique.md and hig.md do NOT yet have gates
- grep results for `hasBusinessThesis|hasMarketLandscape|hasServiceBlueprint|hasLaunchKit` — confirmed critique.md and hig.md are NOT in the list of 20-field writers; this is the Phase 90 upgrade task

### Tertiary (LOW confidence)

- Business critique framework content (unit economics, GTM-ICP fit, pricing psychology, investor readiness checklists) — derived from training knowledge of startup/investor evaluation frameworks (YC, a16z evaluation criteria, pricing psychology literature). Structurally consistent with PDE design but not verified against a live source.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools are pde-tools.cjs patterns used in 5+ prior phases
- Architecture patterns: HIGH — directly verified by reading critique.md, hig.md, wireframe.md source line by line
- LCV/DPD paths: HIGH — verified from brief.md (LCV domain: strategy) and wireframe.md (DPD domain: launch)
- 16-field coverage bug: HIGH — verified by reading exact text of critique.md Step 7c and hig.md Step 7
- Coherence anchors: HIGH — verified from wireframe.md Step 4j lines 683, 687
- Composite score denominator: HIGH — calculated from verified weights (9.5 not 9.0)
- Business perspective checklists: MEDIUM — training knowledge of startup frameworks, structurally consistent with existing PDE design

**Research date:** 2026-03-22 (UPDATE pass)
**Valid until:** 2026-04-22 (workflows are stable between milestone phases)
