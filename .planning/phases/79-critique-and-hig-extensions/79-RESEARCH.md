# Phase 79: Critique and HIG Extensions — Research

**Researched:** 2026-03-21
**Domain:** Extending critique.md with seven event-specific perspectives and hig.md with physical interface guidelines, both gated by PRODUCT_TYPE detection and enforcing [VERIFY WITH LOCAL AUTHORITY] on all regulatory values
**Confidence:** HIGH — grounded entirely in direct codebase inspection of critique.md, hig.md, experience-disclaimer.md, and the Phase 74 precedent patterns

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CRIT-01 | Safety critique perspective checks crush risk, emergency egress time, medical coverage ratio, fire safety | Perspective structure pattern identified in critique.md Step 4; safety checklist items derived from REQUIREMENTS.md and experience-disclaimer.md |
| CRIT-02 | Accessibility critique perspective checks step-free access, BSL, quiet/sensory zones, wheelchair platforms | Distinct from software WCAG accessibility; physical space accessibility model documented |
| CRIT-03 | Operations critique perspective checks bar capacity, changeover realism, cancellation contingency | Operational continuity domain identified; no software analog — pure experience branch content |
| CRIT-04 | Sustainability critique perspective checks reusable materials, transport options, food waste, power source | Environmental domain identified |
| CRIT-05 | Licensing/legal critique perspective checks noise curfew, alcohol hours, public liability | Regulatory domain; [VERIFY WITH LOCAL AUTHORITY] mandatory on every numerical value |
| CRIT-06 | Financial critique perspective checks break-even ticket count, partial-capacity scenarios | Financial domain identified; numerical values carry disclaimer tag |
| CRIT-07 | Community critique perspective checks local scene contribution, artist inclusion, neighborhood impact | Soft/qualitative domain; no regulatory values |
| CRIT-08 | All regulatory values include [VERIFY WITH LOCAL AUTHORITY] disclaimer | Disclaimer block already exists at references/experience-disclaimer.md; inline tag pattern confirmed |
| PHIG-01 | Wayfinding audit checks signage at decision points, low-light readability, multilingual support | Physical HIG structure replaces WCAG POUR structure; seven audit domains confirmed |
| PHIG-02 | Acoustic zoning audit checks conversation-possible zones adjacent to high-volume areas | Acoustic domain — no software analog |
| PHIG-03 | Queue UX audit checks wait time communication, weather protection, skip-queue tiers | Queue domain — physical experience |
| PHIG-04 | Transaction speed audit checks bar order < 90s, entry processing < 30s per person targets | Numerical targets carry disclaimer tag (jurisdiction-agnostic but best-practice values) |
| PHIG-05 | Toilet ratio audit checks minimum 1:75 (female), 1:100 (male) | Numerical regulatory target — disclaimer mandatory |
| PHIG-06 | Hydration audit checks free water points clearly signed | Safety-adjacent physical requirement |
| PHIG-07 | First aid audit checks trained staff reachable within 2min from any point | Numerical target — disclaimer mandatory; floor plan artifact is the input being audited |

</phase_requirements>

---

## Summary

Phase 79 extends two existing workflow files — `critique.md` and `hig.md` — by filling in the experience branch stubs that were installed in Phase 74. Neither file gets structural surgery; both get conditional block content added at the already-identified insertion points. The implementation scope is purely within these two files plus a new Nyquist test suite.

For `critique.md`: The Phase 74 stub is at line 400, inside Step 4/7 just before Perspective 4 (Business Alignment). The experience branch replaces the placeholder comment with seven named perspectives (safety, accessibility, operations, sustainability, licensing/legal, financial, community) that evaluate the floor plan artifact (FLP) and timeline (TML) from Phase 78 instead of the wireframe HTML files the software path evaluates. Each perspective produces findings using the same severity/effort/location/issue/suggestion/reference table format already defined for the four software perspectives. Every numerical regulatory value in the safety, accessibility, operations, licensing, and financial perspectives must carry an inline `[VERIFY WITH LOCAL AUTHORITY]` tag — this is already enforced by the disclaimer block loaded via `@references/experience-disclaimer.md` in `<required_reading>`.

For `hig.md`: The Phase 74 stub is at line 49, inside the `<context_routing>` and `<required_reading>` section. The experience branch replaces WCAG-based POUR analysis with seven physical interface guideline domains (wayfinding, acoustic zoning, queue UX, transaction speed, toilet ratio, hydration, first aid). The artifact being audited changes from wireframe HTML to the floor plan SVG-in-HTML (FLP artifact). The WCAG criteria table is skipped entirely for experience products — no WCAG findings appear in the output.

The critical isolation requirement: software and hardware product pipelines must produce zero experience-specific output. The experience branch is gated by `PRODUCT_TYPE === "experience"` detection in both workflows. This is verified by a new Nyquist test suite in `tests/phase-79/`.

**Primary recommendation:** Write the Nyquist test suite first (Wave 0), then fill in the critique.md experience branch (Wave 1), then fill in the hig.md experience branch (Wave 2). Both workflow files share the same disclaimer enforcement pattern and floor plan artifact detection pattern.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:test` | Node.js built-in (v18+) | Test runner for Nyquist assertions | Established across all prior phases; zero npm dependency |
| `node:assert/strict` | Node.js built-in | Assertion library | Same pattern used in phases 64-74 |
| `node:fs` / `node:path` | Node.js built-in | Read workflow .md files in tests | Established in all existing test files |
| `references/experience-disclaimer.md` | PDE built-in | Reusable regulatory disclaimer block | Created in Phase 74; wired into critique.md required_reading already |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pde-tools.cjs design manifest-read` | PDE built-in | Detect FLP/TML artifact paths from manifest | critique.md and hig.md need to discover floor plan and timeline artifacts |
| `pde-tools.cjs design manifest-update` | PDE built-in | Update manifest after critique/HIG run | Pass-through-all coverage pattern for hasCritique and hasHigAudit flags |
| `pde-tools.cjs design coverage-check` | PDE built-in | Read all 14 coverage flags before writing | Read-before-set pattern — must not clobber other flags |
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

workflows/
├── critique.md    # MODIFIED: experience branch stub (line ~400) → seven perspectives
└── hig.md         # MODIFIED: experience branch stub (line ~49) → physical HIGs

(No new files other than the test suite)
```

### Pattern 1: critique.md Experience Branch — Seven Perspectives Structure

**What:** Replace the Phase 74 stub comment inside Step 4/7 of critique.md with a fully-specified experience branch that activates when `PRODUCT_TYPE === "experience"`. The branch produces seven perspectives instead of the software pipeline's four, and the artifact being evaluated changes from wireframe HTML to the floor plan (FLP) artifact.

**When to use:** Only when `productType === "experience"` in the design manifest. The four software perspectives (UX, Visual Hierarchy, Accessibility as WCAG, Business Alignment) are skipped entirely for experience products.

**Insertion point:** Inside Step 4/7, immediately before the existing Perspective 1 (UX/Usability) block, at the location of the Phase 74 comment:
```
<!-- Experience product type — Phase 74 stub: seven event-specific critique perspectives ... -->
```

**Branch structure:**

```markdown
#### Experience Product Type Gate (PRODUCT_TYPE check)

Read PRODUCT_TYPE from design manifest:

```bash
MANIFEST=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-read)
if [[ "$MANIFEST" == @file:* ]]; then MANIFEST=$(cat "${MANIFEST#@file:}"); fi
```

Parse `productType` from the JSON result.

IF productType === "experience":

  **Artifact detection — floor plan required (not wireframe HTML):**

  Use the Glob tool to check for `.planning/design/ux/wireframes/FLP-floor-plan-v*.html`.
  - If found: SET FLOOR_PLAN_ARTIFACT = path to highest version. SET EXPERIENCE_ARTIFACT_AVAILABLE = true.
  - If not found: HALT with error:
    ```
    Error: No floor plan found for experience product critique.
      /pde:critique for experience products requires the floor plan artifact (FLP).
      Run /pde:wireframe first to generate the floor plan, then re-run /pde:critique.
    ```

  Use the Glob tool to check for `.planning/design/ux/wireframes/TML-timeline-v*.html`.
  - If found: SET TIMELINE_ARTIFACT = path to highest version.
  - If not found: note in report frontmatter — "Timeline wireframe not found; critique evaluates floor plan only."

  Load @references/experience-disclaimer.md into context before evaluating any perspective.

  Apply seven experience-specific perspectives (in order):
  1. Safety
  2. Physical Accessibility
  3. Operations
  4. Sustainability
  5. Licensing/Legal
  6. Financial
  7. Community

  For each perspective, produce findings using the SAME table format as software perspectives:
  | Severity | Effort | Location | Issue | Suggestion | Reference |
  |----------|--------|----------|-------|------------|-----------|

  SKIP software perspectives (Perspective 1: UX/Usability, Perspective 2: Visual Hierarchy,
  Perspective 3: Accessibility as WCAG, Perspective 4: Business Alignment) entirely.
  Do NOT produce WCAG findings for experience products.

  **Score calculation:** Same formula as software path (100 - penalties). All seven perspectives
  are weighted equally (1.0x) — no Awwwards dimension mapping for physical perspectives.

  Proceed to Step 5/7 (write report) — all other steps unchanged.

ELSE:
  Proceed with software critique path (Perspectives 1-4). No experience-specific perspectives.
```

### Pattern 2: Seven Critique Perspectives — Domain Specifications

**What:** The specific checklist items for each of the seven experience perspectives. Derived from REQUIREMENTS.md and common event safety/operations practice.

**Perspective 1: Safety**

```markdown
#### Experience Perspective 1: Safety

Evaluate the floor plan against safety thresholds. Every numerical value cited MUST be
immediately followed by `[VERIFY WITH LOCAL AUTHORITY]`.

Checklist:
- Crush risk: crowd density in peak zones. Industry guidance: ≤ 4 persons/m² for comfortable;
  > 6 persons/m² is dangerous [VERIFY WITH LOCAL AUTHORITY]. Read zone capacity annotations
  from floor plan SVG.
- Emergency egress: distance from any point to nearest exit. Industry guidance: ≤ 45m to
  nearest exit [VERIFY WITH LOCAL AUTHORITY]. Verify exit width against capacity.
- Medical coverage ratio: industry guidance 1 trained first aider per 100–250 attendees
  [VERIFY WITH LOCAL AUTHORITY]. Check staffing plan if available.
- Fire safety: clear paths to fire exits, extinguisher placement, no obstructions in egress routes.
  Evaluate from floor plan zone layout.

Finding format: same severity/effort/location/issue/suggestion/reference table.
Location field: reference floor plan zone name (e.g., "FLP > Main Stage Zone > West Egress")
```

**Perspective 2: Physical Accessibility (not WCAG)**

```markdown
#### Experience Perspective 2: Physical Accessibility

Note: This perspective covers physical/spatial accessibility for an event venue.
It does NOT apply WCAG criteria (no keyboard, focus, or screen reader findings here).

Checklist:
- Step-free access routes from entry to all primary zones (main stage, bar, toilets, first aid)
- BSL (British Sign Language) interpreter sightlines at performance areas
- Quiet/sensory zones: designated low-stimulation area with reduced sound and lighting
- Wheelchair viewing platforms: elevated or protected areas providing unobstructed sightlines
- Accessible toilet facilities: number and location relative to attendance

Finding format: same severity/effort/location/issue/suggestion/reference table.
Reference column: cite DDA 2010 (UK) or ADA (US) [VERIFY WITH LOCAL AUTHORITY] for
numerical ratios; cite best practice for sightlines and sensory zones.
```

**Perspective 3: Operations**

```markdown
#### Experience Perspective 3: Operations

Checklist:
- Bar capacity: serving points vs expected attendance. Industry guidance: 1 bar station per
  75–100 attendees [VERIFY WITH LOCAL AUTHORITY]. Check against capacity annotation.
- Changeover realism: stage layout supports technical changeover time between acts per
  the timeline wireframe (if available).
- Cancellation contingency: indoor backup or cancellation protocol documented in brief
  or flows for outdoor events.
- Load-in/load-out: vehicle access paths on floor plan do not conflict with public egress.
- Staff briefing area: designated staff-only zone identifiable on floor plan.
```

**Perspective 4: Sustainability**

```markdown
#### Experience Perspective 4: Sustainability

Checklist:
- Reusable materials: signage, cups, and servingware noted as reusable or single-use.
  Flag if single-use plastics are implied without mitigation note.
- Transport options: active transport provisions (cycle parking, shuttle drop-off, public
  transit proximity) visible in venue context.
- Food waste management: food vendor zone placement and waste station placement on floor plan.
- Power source: generator vs grid connection. Generator implies higher emissions — flag if
  no renewable energy note in brief.

No numerical regulatory values in this perspective — disclaimer tag not required for qualitative observations.
```

**Perspective 5: Licensing/Legal**

```markdown
#### Experience Perspective 5: Licensing/Legal

Every numerical threshold MUST carry [VERIFY WITH LOCAL AUTHORITY].

Checklist:
- Noise curfew: if brief or flows reference curfew time, check floor plan for acoustic
  zoning that supports curfew compliance (e.g., speaker orientation, barrier placement).
  Industry guidance: outdoor events typically face 11pm–12am curfews in residential areas
  [VERIFY WITH LOCAL AUTHORITY].
- Alcohol hours: check if licensed bar hours align with timeline wireframe (if available).
  [VERIFY WITH LOCAL AUTHORITY] — alcohol licensing hours vary by jurisdiction and venue.
- Public liability: note if brief references public liability insurance coverage.
  Minimum £5M PLI common for UK events [VERIFY WITH LOCAL AUTHORITY].
- Temporary structure permits: marquees, stages, and rigging typically require structural
  engineer sign-off and permits [VERIFY WITH LOCAL AUTHORITY].
```

**Perspective 6: Financial**

```markdown
#### Experience Perspective 6: Financial

Numerical values are projections, not regulatory thresholds — [VERIFY WITH LOCAL AUTHORITY]
is not required for financial calculations, but financial projections should be labeled
as estimates only.

Checklist:
- Break-even ticket count: derive from brief if cost estimates and ticket price are present.
  Example: if total cost is £10,000 and ticket price is £20, break-even is 500 tickets.
  Flag if attendance capacity < break-even as Critical finding.
- Partial-capacity scenarios: evaluate floor plan viability at 60%, 80%, 100% capacity.
  Check if floor plan zoning allows partial-capacity operation without exposed empty areas.
- Revenue diversification: identify revenue streams beyond ticket sales (bar, merch, sponsorship)
  noted in brief or floor plan zone allocation.
```

**Perspective 7: Community**

```markdown
#### Experience Perspective 7: Community

Qualitative perspective — no numerical regulatory values, no disclaimer tag required.

Checklist:
- Local scene contribution: does artist/performer lineup (from brief) include local/emerging acts?
- Artist inclusion: diversity of representation in lineup noted in brief.
- Neighborhood impact: load-in/out timing, noise, and pedestrian flow impact on surrounding area.
  Cross-reference with noise curfew in Perspective 5.
- Local vendor sourcing: food/drink vendors noted as local in brief.
```

### Pattern 3: hig.md Experience Branch — Physical Interface Guidelines

**What:** Replace the Phase 74 stub comment in hig.md with a fully-specified experience branch that activates when `productType === "experience"`. The WCAG POUR audit is replaced by seven physical interface guideline domains. The artifact being evaluated changes from wireframe HTML to the floor plan (FLP) artifact.

**Insertion point:** The Phase 74 stub is at line 49 in hig.md, inside the `<context_routing>` block (comment-only placeholder). The actual behavioral change needs to go inside Step 4/7 (Execute WCAG + HIG audit), immediately before the existing `IF --light mode` block.

**Implementation approach:** The experience branch gate should appear at the start of Step 4/7, before either the light mode check or the full WCAG audit:

```markdown
### Step 4/7: Execute audit

**Read PRODUCT_TYPE from design manifest:**

```bash
MANIFEST=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-read)
if [[ "$MANIFEST" == @file:* ]]; then MANIFEST=$(cat "${MANIFEST#@file:}"); fi
```

Parse `productType` from the JSON result.

IF productType === "experience":

  **Switch audit target to floor plan:**
  Use the Glob tool to check for `.planning/design/ux/wireframes/FLP-floor-plan-v*.html`.
  - If found: SET AUDIT_ARTIFACT = floor plan path (highest version). FIDELITY_LEVEL = lofi (floor plans are always schematic).
  - If not found: HALT with error pointing to /pde:wireframe prerequisite.

  Load @references/experience-disclaimer.md into context.

  **Run seven physical interface guideline domains:**

  [Seven domains — see Pattern 4 below]

  **SKIP all WCAG criteria and POUR analysis entirely.**
  Do NOT produce findings for color contrast, keyboard, focus, touch targets, or any WCAG criterion.

  **Tag all output:** `[Physical HIG -- /pde:hig experience mode]`

  Proceed to Step 5/7 (write artifact) with PHYSICAL_HIG_MODE = true.
  Report format: substitute WCAG section headers with physical domain headers.

ELSE:
  Proceed with standard WCAG/HIG audit path (existing Steps 4a–4i).
```

### Pattern 4: Seven Physical HIG Domains — Domain Specifications

**PHIG-01: Wayfinding**

```markdown
#### Physical HIG Domain 1: Wayfinding

Checklist:
- Signage at all decision points: every route fork on the floor plan has an identified
  sign position. Decision points are: entry → main zones, main zones → toilets/bar/exit.
- Low-light readability: sign specifications reference retro-reflective or illuminated materials
  for night events. Minimum sign size guidance: 75mm letter height for 10m viewing distance
  [VERIFY WITH LOCAL AUTHORITY].
- Multilingual support: primary signage in at least two languages if international audience
  is indicated in brief audience archetype.
- Accessibility wayfinding: step-free routes are distinctly signed.

Severity calibration:
- No signage at primary entry: Critical
- Missing sign at secondary decision point: Major
- No low-light specification for night event: Major
- Missing multilingual for international audience: Minor
```

**PHIG-02: Acoustic Zoning**

```markdown
#### Physical HIG Domain 2: Acoustic Zoning

Checklist:
- Conversation-possible zone: at least one clearly identifiable low-volume zone adjacent to
  (not in) the high-volume main stage area. Industry guidance: < 70dB for conversation comfort
  [VERIFY WITH LOCAL AUTHORITY].
- Zone transition: gradual acoustic transition (buffer zones or barriers) between high- and
  low-volume areas rather than abrupt adjacency.
- Hearing protection notice: recommended for zones > 85dB sustained [VERIFY WITH LOCAL AUTHORITY].

Severity:
- No conversation-possible zone: Major (attendee welfare)
- Abrupt high-to-low zone adjacency: Minor
```

**PHIG-03: Queue UX**

```markdown
#### Physical HIG Domain 3: Queue UX

Checklist:
- Wait time communication: position for status board or visual communication of queue progress
  at entry and bar queues.
- Weather protection: covered queue area for entry gateline (critical for UK outdoor events).
- Skip-queue tiers: if VIP or access tiers exist in brief, separate gateline designated on
  floor plan.
- Queue capacity: physical space allocated for maximum expected queue length without
  extending into pedestrian circulation routes.
```

**PHIG-04: Transaction Speed**

```markdown
#### Physical HIG Domain 4: Transaction Speed

Every numerical target carries [VERIFY WITH LOCAL AUTHORITY] as they represent industry
guidance benchmarks, not legal requirements.

Checklist:
- Bar order target: < 90s per transaction from approach to receipt [VERIFY WITH LOCAL AUTHORITY].
  Derive from bar station count on floor plan and peak hourly attendance from brief.
- Entry processing target: < 30s per person at gateline [VERIFY WITH LOCAL AUTHORITY].
  Derive from gateline width and expected arrival peak in timeline (if available).
- Cashless vs cash: floor plan bar placement should support cashless-only if brief indicates
  cashless-only event (faster transaction speed).
```

**PHIG-05: Toilet Ratio**

```markdown
#### Physical HIG Domain 5: Toilet Ratio

Every numerical threshold MUST carry [VERIFY WITH LOCAL AUTHORITY].

Checklist:
- Female ratio: minimum 1 toilet unit per 75 female attendees [VERIFY WITH LOCAL AUTHORITY].
  Derive from expected female attendance ratio (use 50/50 if not specified in brief).
- Male ratio: minimum 1 toilet/urinal unit per 100 male attendees [VERIFY WITH LOCAL AUTHORITY].
- Accessible facilities: minimum 1 fully accessible cubicle per provision unit
  [VERIFY WITH LOCAL AUTHORITY].
- Distance: toilet facilities reachable within 150m from any zone [VERIFY WITH LOCAL AUTHORITY].
- Check against: capacity annotation on floor plan + toilet block position.

Severity:
- Ratio below minimum: Critical
- Accessible facility absent: Critical
- Distance > 150m from any zone: Major
```

**PHIG-06: Hydration**

```markdown
#### Physical HIG Domain 6: Hydration

Checklist:
- Free water points: at least one clearly signed free water refill station per 500 attendees
  [VERIFY WITH LOCAL AUTHORITY — some jurisdictions mandate free water at licensed events].
- Visibility: water stations positioned in high-traffic areas, not obscured by other
  infrastructure on floor plan.
- Signage: "Free Water" sign conspicuous and at wayfinding decision points.

Severity:
- No free water provision: Critical (welfare risk, potential licensing requirement)
- Water point not signed: Major
```

**PHIG-07: First Aid**

```markdown
#### Physical HIG Domain 7: First Aid

Every numerical target MUST carry [VERIFY WITH LOCAL AUTHORITY].

Checklist:
- Response time: trained first aider reachable within 2 minutes from any point on site
  [VERIFY WITH LOCAL AUTHORITY]. Verify from floor plan layout — 2 minutes at walking pace
  ≈ 170m maximum distance to first aid post.
- First aid post: clearly identified on floor plan with cross/medical symbol.
- Staffing ratio: industry guidance 1 first aider per 100–250 attendees
  [VERIFY WITH LOCAL AUTHORITY].
- Defibrillator (AED): clearly positioned and signed [VERIFY WITH LOCAL AUTHORITY —
  mandatory in some jurisdictions for events over certain attendance thresholds].

Severity:
- No first aid post on floor plan: Critical
- Response time > 2 minutes from any zone: Critical
- No AED position marked for large events (>500 attendees): Major
```

### Pattern 5: Disclaimer Tag Placement — Inline Pattern

**What:** The `[VERIFY WITH LOCAL AUTHORITY]` tag must appear immediately adjacent to the numerical regulatory value, not grouped at the end. This is specified in `references/experience-disclaimer.md`.

**Correct pattern:**
```markdown
Industry guidance: ≤ 4 persons/m² for comfortable density; > 6 persons/m² is dangerous [VERIFY WITH LOCAL AUTHORITY].
```

**Prohibited pattern:**
```markdown
Industry guidance: ≤ 4 persons/m² for comfortable density; > 6 persons/m² is dangerous.
...
[Note: All values should be verified with local authorities.]
```

### Pattern 6: HIG Artifact Output Format — Physical Mode

**What:** The HIG audit artifact (`HIG-audit-v{N}.md`) uses different section headers in experience mode. WCAG POUR sections are replaced with physical domain sections.

**Experience mode output structure:**

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

## Executive Summary
[Overall physical accessibility and operational readiness assessment]

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

## Findings by Severity
[All findings sorted critical → major → minor → nit]

## Findings by Domain
[Subsection per domain]

## Recommendations
[Priority-ordered remediation actions]

---
[VERIFY WITH LOCAL AUTHORITY] — All numerical values represent industry guidance ranges.
See @references/experience-disclaimer.md for full disclaimer.

*Generated by PDE-OS /pde:hig | {date} | Mode: physical-hig-experience | Artifact: FLP*
```

### Anti-Patterns to Avoid

- **Applying WCAG findings to experience products:** The POUR assessment and all 56 WCAG 2.2 criteria are irrelevant for physical event spaces. Findings like "color contrast 4.5:1" or "focus indicator missing" MUST NOT appear in experience HIG output.
- **Applying event perspectives to software products:** The seven experience perspectives MUST NOT appear in software, hardware, or hybrid critiques. The gate is `productType === "experience"` — not a flag or a guess.
- **Grouping disclaimers at section end:** Every individual regulatory value carries its own inline tag. Do not collect disclaimers into a single block at the end of the section.
- **Inventing jurisdiction-specific values:** All numerical values must be labeled "industry guidance" or "best practice" with the `[VERIFY WITH LOCAL AUTHORITY]` tag. Never state a value as legally required without the disclaimer.
- **Floor plan not found but continuing anyway:** If the floor plan (FLP) artifact is absent, both critique and HIG must HALT with a clear prerequisite error pointing to `/pde:wireframe`. Do not fall through to the software path silently.
- **New experience workflow files:** No new `critique-experience.md` or `hig-physical.md` files. All changes live as conditional blocks in the existing files.
- **Writing WCAG sections in --light mode for experience products:** When critique delegates to `hig.md --light` for Perspective 3, the experience gate must be respected — if experience product, return physical accessibility perspective (PHIG scope) not WCAG findings.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Regulatory disclaimer formatting | Inline disclaimer logic per value | `references/experience-disclaimer.md` loaded via `@references/` pattern | Single source of truth; already wired into critique.md required_reading in Phase 74 |
| Physical HIG audit checklist | Custom checklist built into workflow prose | The seven domain specifications in Pattern 4 (derived from REQUIREMENTS.md) | Requirements define exactly what to check — no research gap here |
| PRODUCT_TYPE detection in critique/HIG | Re-detecting from brief signals | `pde-tools.cjs design manifest-read` then parse `productType` | Source of truth is the manifest written by brief.md; never re-detect type in downstream workflows |
| Floor plan artifact discovery | Hard-coded path | Glob for `FLP-floor-plan-v*.html` then read highest version | Same Glob pattern used by wireframe, critique, and HIG for WFR/WFR artifacts |
| Cross-type isolation | Runtime flags or environment variables | `productType === "experience"` gate reading from manifest | Manifest is the canonical product type store; all other detection is unreliable |

**Key insight:** Both workflows already contain all the structural machinery (manifest-read, artifact discovery, write-lock, pass-through-all coverage, DESIGN-STATE updates). Phase 79 adds content to the experience branches, not infrastructure.

---

## Common Pitfalls

### Pitfall 1: Experience Critique Runs Software Perspectives in Addition to Event Perspectives

**What goes wrong:** The `IF productType === "experience"` branch activates the seven event perspectives but does not skip the four software perspectives. Output contains both WCAG accessibility findings AND physical accessibility findings.

**Why it happens:** Adding the experience branch above the software perspectives without an ELSE guard.

**How to avoid:** The experience branch must use IF/ELSE, not IF-then-add. The structure is:
```
IF productType === "experience":
  run seven event perspectives
  SKIP software perspectives
ELSE:
  run four software perspectives
```

**Warning signs:** Test CRIT-08 in the Nyquist suite: `software product produces no experience-specific perspectives`. This test reads critique.md and asserts the experience branch has an ELSE guard.

### Pitfall 2: Disclaimer Tag on Wrong Values (Missing or Overused)

**What goes wrong:** Numerical values in the Safety, Licensing, Financial, and HIG perspectives appear without `[VERIFY WITH LOCAL AUTHORITY]`, OR the tag appears on qualitative statements (e.g., "Include local artists" does not need a disclaimer).

**Why it happens:** The disclaimer rule is applied uniformly or inconsistently.

**How to avoid:** Apply the tag only to numerical thresholds and regulatory ratios. Qualitative checklist items (Community perspective, most of Sustainability perspective) do not need the tag. Test CRIT-08: the Nyquist test checks that safety perspective content contains the disclaimer string.

**Warning signs:** `grep "[VERIFY WITH LOCAL AUTHORITY]" .planning/design/review/CRT-critique-v*.md` returns 0 results on an experience product critique.

### Pitfall 3: Floor Plan Artifact Not Found — Silent Fallthrough to Software Path

**What goes wrong:** The floor plan (FLP) artifact does not exist yet (Phase 78 not run), and the experience branch silently falls through to the software wireframe path, producing WCAG findings for a non-existent wireframe.

**Why it happens:** Missing HALT check on floor plan absence.

**How to avoid:** Add explicit HALT with clear prerequisite error message when `FLP-floor-plan-v*.html` glob returns no results in experience mode.

**Warning signs:** An experience product critique produces wireframe findings against no files, or worse, against an old software wireframe from a prior project.

### Pitfall 4: HIG --light Mode Ignores Experience Gate

**What goes wrong:** When critique.md delegates Perspective 3 to `hig.md --light`, the HIG workflow runs WCAG 5 mandatory checks even though `productType === "experience"`.

**Why it happens:** The `--light` mode short-circuit in hig.md skips the full audit setup but may also skip the PRODUCT_TYPE detection.

**How to avoid:** The PRODUCT_TYPE check must occur before the light mode check, not after. Structure:
```
Read productType from manifest
IF productType === "experience":
  → physical accessibility checklist (light physical HIG)
ELSE IF --light:
  → 5 mandatory WCAG checks (existing behavior)
ELSE:
  → full WCAG audit
```

**Warning signs:** A critique for an experience product produces WCAG findings tagged `[HIG skill -- /pde:hig --light]`.

### Pitfall 5: Coverage Flag Clobbering

**What goes wrong:** The hasCritique or hasHigAudit coverage flag update overwrites other flags because the read-before-set pattern was not followed.

**Why it happens:** Writing only the changed flag with `manifest-set-top-level designCoverage '{"hasCritique": true}'` instead of passing all 14 flags.

**How to avoid:** Both critique.md and hig.md already implement the read-before-set pattern in Step 7. Phase 79 does not change this — it must be preserved when extending the workflows.

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
# Source: derived from wireframe.md WFR artifact discovery pattern
# Phase 78 writes floor plan to: .planning/design/ux/wireframes/FLP-floor-plan-v{N}.html
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
// Source: derived from tests/phase-74/experience-regression.test.mjs pattern
// tests/phase-79/critique-hig-extensions.test.mjs

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

describe('CRIT-01 through CRIT-07: seven experience perspectives in critique.md', () => {
  const critiqueContent = readFileSync(join(ROOT, 'workflows/critique.md'), 'utf8');

  test('critique.md contains safety perspective for experience', () => {
    assert.ok(critiqueContent.includes('Safety'), 'critique.md missing Safety perspective');
  });

  test('critique.md contains Physical Accessibility perspective for experience', () => {
    assert.ok(
      critiqueContent.includes('Physical Accessibility') ||
      critiqueContent.includes('physical accessibility'),
      'critique.md missing Physical Accessibility perspective'
    );
  });

  test('critique.md contains Operations perspective for experience', () => {
    assert.ok(critiqueContent.includes('Operations'), 'critique.md missing Operations perspective');
  });

  test('critique.md contains Sustainability perspective for experience', () => {
    assert.ok(critiqueContent.includes('Sustainability'), 'critique.md missing Sustainability perspective');
  });

  test('critique.md contains Licensing/Legal perspective for experience', () => {
    assert.ok(
      critiqueContent.includes('Licensing') || critiqueContent.includes('legal'),
      'critique.md missing Licensing/Legal perspective'
    );
  });

  test('critique.md contains Financial perspective for experience', () => {
    assert.ok(critiqueContent.includes('Financial'), 'critique.md missing Financial perspective');
  });

  test('critique.md contains Community perspective for experience', () => {
    assert.ok(critiqueContent.includes('Community'), 'critique.md missing Community perspective');
  });
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
    // The experience branch must not fall through to software perspectives
    const expIdx = critiqueContent.indexOf('experience');
    assert.ok(expIdx !== -1, 'experience branch not found in critique.md');
    // Verify ELSE is present after the experience block to guard the software perspectives
    const elseAfterExp = critiqueContent.indexOf('ELSE', expIdx);
    assert.ok(
      elseAfterExp !== -1,
      'No ELSE guard found after experience branch in critique.md — software perspectives may bleed through'
    );
  });
});

describe('PHIG-01 through PHIG-07: seven physical HIG domains in hig.md', () => {
  const higContent = readFileSync(join(ROOT, 'workflows/hig.md'), 'utf8');

  test('hig.md contains Wayfinding domain for experience', () => {
    assert.ok(
      higContent.includes('Wayfinding') || higContent.includes('wayfinding'),
      'hig.md missing Wayfinding domain'
    );
  });

  test('hig.md contains Acoustic Zoning domain for experience', () => {
    assert.ok(
      higContent.includes('Acoustic') || higContent.includes('acoustic'),
      'hig.md missing Acoustic Zoning domain'
    );
  });

  test('hig.md contains Queue UX domain for experience', () => {
    assert.ok(
      higContent.includes('Queue') || higContent.includes('queue'),
      'hig.md missing Queue UX domain'
    );
  });

  test('hig.md contains Transaction Speed domain for experience', () => {
    assert.ok(
      higContent.includes('Transaction') || higContent.includes('transaction'),
      'hig.md missing Transaction Speed domain'
    );
  });

  test('hig.md contains Toilet Ratio domain for experience', () => {
    assert.ok(
      higContent.includes('Toilet') || higContent.includes('toilet'),
      'hig.md missing Toilet Ratio domain'
    );
  });

  test('hig.md contains Hydration domain for experience', () => {
    assert.ok(
      higContent.includes('Hydration') || higContent.includes('hydration'),
      'hig.md missing Hydration domain'
    );
  });

  test('hig.md contains First Aid domain for experience', () => {
    assert.ok(
      higContent.includes('First Aid') || higContent.includes('first aid'),
      'hig.md missing First Aid domain'
    );
  });

  test('hig.md WCAG findings suppressed for experience (no POUR in experience branch)', () => {
    // The experience branch must not produce WCAG POUR findings
    // Verify ELSE guard after experience HIG block (WCAG path should be in ELSE)
    const expHigIdx = higContent.indexOf('experience');
    assert.ok(expHigIdx !== -1, 'experience branch not found in hig.md');
    const elseAfterHigExp = higContent.indexOf('ELSE', expHigIdx);
    assert.ok(
      elseAfterHigExp !== -1,
      'No ELSE guard in hig.md experience branch — WCAG findings may bleed into experience output'
    );
  });
});

describe('Cross-type isolation: software product produces no experience perspectives', () => {
  test('critique.md experience branch does not execute for software products', () => {
    const content = readFileSync(join(ROOT, 'workflows/critique.md'), 'utf8');
    // Presence of the productType check is the structural guarantee
    assert.ok(
      content.includes('productType') || content.includes('PRODUCT_TYPE'),
      'critique.md missing productType gate for experience branch'
    );
  });

  test('hig.md experience branch does not execute for software products', () => {
    const content = readFileSync(join(ROOT, 'workflows/hig.md'), 'utf8');
    assert.ok(
      content.includes('productType') || content.includes('PRODUCT_TYPE'),
      'hig.md missing productType gate for experience branch'
    );
  });
});
```

### Example 5: HIG Artifact Code for Experience Mode

```bash
# Source: derived from hig.md Step 7 manifest-update pattern (existing 7-call sequence)
# In experience mode, the artifact type changes from "hig-audit" to "physical-hig-audit"
# All 7 manifest-update calls remain the same except the type field:
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update HIG type physical-hig-audit
# All other calls (code, name, domain, path, status, version) unchanged
# Coverage flag: hasHigAudit: true — same flag, same read-before-set pattern
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| critique.md evaluates four software perspectives only | Seven event perspectives for experience, four software perspectives for other types | Phase 79 | Floor plan becomes the primary critique artifact for experience products |
| hig.md evaluates WCAG 2.2 AA criteria only | Physical HIGs for experience, WCAG for other types | Phase 79 | No WCAG findings for experience products — different audit ontology |
| Disclaimer block exists but evaluates nothing | Seven perspectives and seven HIG domains enforce inline disclaimer on regulatory values | Phase 79 | Phase 74's disclaimer infrastructure now has consumers |
| Phase 74 stub comments are placeholders | Phase 79 fills in the content at the stub insertion points | Phase 79 | Stubs become live behavior |

**Deprecated/outdated:**
- Phase 74 stub comment in critique.md line ~400: replaced with live experience branch in Phase 79
- Phase 74 stub comment in hig.md line ~49: replaced with live experience branch in Phase 79

---

## Open Questions

1. **Floor plan artifact code (FLP vs FPL)**
   - What we know: ROADMAP.md references `FLP` (Floor PLan) and `TML` (TiMeLine). Phase 78 success criteria say "registered in design-manifest.json with FPL/TML artifact codes." ROADMAP.md line 248 says "FPL/TML".
   - What's unclear: Is the artifact code `FLP` or `FPL`? These are two different codes in the manifest.
   - Recommendation: The planner should check Phase 78's plan (when available) or use `FLP` as the more semantically obvious code (Floor PLan not FLoor Plan abbreviated differently). If Phase 78 uses `FPL`, update the Glob pattern to `FPL-*` in both critique.md and hig.md.

2. **Timeline artifact for financial critique**
   - What we know: The financial perspective (CRIT-06) could benefit from reading the timeline to check changeover timing vs act fees. The timeline is a soft dependency.
   - What's unclear: Whether Phase 79 should read the TML artifact at all, or just the floor plan.
   - Recommendation: Make TML a soft dependency (same pattern as critique's brief/flows soft dependencies). Log a warning if absent, continue without it. Do not hard-block on missing timeline.

3. **HIG --light mode for experience products in critique delegation**
   - What we know: Critique delegates Perspective 3 (Accessibility) to `hig.md --light`. For experience products, the physical accessibility checklist replaces WCAG 5 mandatory checks.
   - What's unclear: Whether the light physical HIG (from critique delegation) should produce the same 7 domains as the full HIG, or a condensed subset.
   - Recommendation: Light physical HIG produces only the Physical Accessibility domain (CRIT-02 scope: step-free, BSL, sensory zones, wheelchair platforms) as a single condensed perspective — this matches the scope of Perspective 2 (Physical Accessibility) in the seven critique perspectives. The full seven physical HIGs are reserved for standalone `/pde:hig` runs.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` (no version beyond Node.js 18+) |
| Config file | None — tests are standalone .mjs files |
| Quick run command | `node --test tests/phase-79/critique-hig-extensions.test.mjs` |
| Full suite command | `node --test tests/phase-79/*.mjs && node --test tests/phase-74/experience-regression.test.mjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CRIT-01 | critique.md contains Safety perspective | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | Wave 0 |
| CRIT-02 | critique.md contains Physical Accessibility perspective | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | Wave 0 |
| CRIT-03 | critique.md contains Operations perspective | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | Wave 0 |
| CRIT-04 | critique.md contains Sustainability perspective | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | Wave 0 |
| CRIT-05 | critique.md contains Licensing/Legal perspective | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | Wave 0 |
| CRIT-06 | critique.md contains Financial perspective | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | Wave 0 |
| CRIT-07 | critique.md contains Community perspective | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | Wave 0 |
| CRIT-08 | critique.md contains [VERIFY WITH LOCAL AUTHORITY] tag | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | Wave 0 |
| CRIT-08 | experience branch has ELSE guard (no software bleed) | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | Wave 0 |
| PHIG-01 | hig.md contains Wayfinding domain | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | Wave 0 |
| PHIG-02 | hig.md contains Acoustic Zoning domain | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | Wave 0 |
| PHIG-03 | hig.md contains Queue UX domain | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | Wave 0 |
| PHIG-04 | hig.md contains Transaction Speed domain | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | Wave 0 |
| PHIG-05 | hig.md contains Toilet Ratio domain | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | Wave 0 |
| PHIG-06 | hig.md contains Hydration domain | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | Wave 0 |
| PHIG-07 | hig.md contains First Aid domain | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | Wave 0 |
| PHIG (cross-type) | hig.md has ELSE guard (WCAG not suppressed for software) | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | Wave 0 |
| CRIT+PHIG (cross-type) | productType gate present in both workflows | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | Wave 0 |

Additionally, the Phase 74 regression suite must continue to pass throughout Phase 79:
`node --test tests/phase-74/experience-regression.test.mjs`

### Sampling Rate

- **Per task commit:** `node --test tests/phase-79/critique-hig-extensions.test.mjs`
- **Per wave merge:** `node --test tests/phase-79/*.mjs && node --test tests/phase-74/experience-regression.test.mjs`
- **Phase gate:** Both phase-79 and phase-74 test suites green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-79/critique-hig-extensions.test.mjs` — covers all 15 requirements above
  - Must be written BEFORE any workflow edits so failing tests validate the pre-state

*(No other gaps — existing test infrastructure from phase-74 covers the regression baseline)*

---

## Sources

### Primary (HIGH confidence)

- `workflows/critique.md` (direct codebase inspection, 2026-03-21) — full 7-step pipeline; Phase 74 stub at line 400 confirmed as experience branch insertion point; four software perspectives structure; disclaimer loaded via required_reading; manifest-read pattern; lock-acquire/release/coverage-check patterns
- `workflows/hig.md` (direct codebase inspection, 2026-03-21) — full 7-step pipeline; Phase 74 stub at line 49 confirmed; WCAG POUR criteria list; manifest-update 7-call pattern; hasHigAudit pass-through-all coverage pattern; --light mode structure
- `references/experience-disclaimer.md` (direct codebase inspection, 2026-03-21) — disclaimer content; Usage section inline tag rules; Prohibited Patterns section; Consumers list
- `tests/phase-74/experience-regression.test.mjs` (direct codebase inspection, 2026-03-21) — Nyquist test structure pattern; describe/test/assert.ok pattern; ROOT path resolution; PIPELINE_WORKFLOW_FILES list
- `.planning/REQUIREMENTS.md` (direct inspection, 2026-03-21) — exact CRIT-01 through CRIT-08 and PHIG-01 through PHIG-07 checklist items; canonical list of seven critique perspectives and seven HIG domains
- `.planning/STATE.md` (direct inspection, 2026-03-21) — locked architectural decisions: no new workflow files, all experience behavior in existing files; regulatory disclaimer requirement
- `.planning/PROJECT.md` (direct inspection, 2026-03-21) — pass-through-all coverage pattern; read-before-set for designCoverage; lock-acquire/release pattern; manifest-update 7-call pattern
- `templates/design-manifest.json` (direct inspection, 2026-03-21) — designCoverage flag names; 14-field JSON; hasCritique and hasHigAudit flags confirmed present

### Secondary (MEDIUM confidence)

- `.planning/ROADMAP.md` Phase 79 success criteria (2026-03-21) — canonical success criteria; FPL/TML artifact code ambiguity identified; dependency on Phase 78 confirmed
- `.planning/phases/74-foundation-and-regression-infrastructure/74-RESEARCH.md` (2026-03-21) — Phase 74 Nyquist test patterns; branch stub architecture; disclaimer block pattern; read-before-set rationale

### Tertiary (LOW confidence)

- None — all findings grounded in direct codebase inspection or locked project decisions

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — `node:test` established; all PDE tools used are existing commands with confirmed signatures
- Architecture: HIGH — insertion points confirmed by direct line inspection; all patterns derived from Phase 74 precedent and existing workflow structure
- Pitfalls: HIGH — all five pitfalls derived from structural analysis of the existing workflow code and the experience branch guard requirement

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable domain — no external dependencies; codebase is the reference)
