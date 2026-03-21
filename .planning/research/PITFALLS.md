# Pitfalls Research

**Domain:** Adding "experience" product type to existing multi-type design pipeline (PDE v0.11)
**Researched:** 2026-03-21
**Confidence:** HIGH for pipeline integration pitfalls (grounded in direct codebase inspection of all 14 workflow branch sites); MEDIUM for LLM safety/licensing accuracy claims (cross-referenced WebSearch findings with known hallucination patterns); MEDIUM for SVG floor plan and print color space claims (fundamental technical constraints, not PDE-specific)

---

## Critical Pitfalls

### Pitfall 1: Default-Else Regression — Existing Types Silently Fall Into Experience Branch

**What goes wrong:**
Every workflow that handles product type branching uses a chain like `IF software ... ELSE IF hardware ... ELSE IF hybrid ...`. Adding `experience` to that chain requires inserting a new branch without accidentally making it the new catch-all or erasing the existing default. If the final `ELSE` is converted to `ELSE IF experience` — a natural refactor — the implicit software default disappears. Any unclassified project or any project whose brief lacks a Product Type field will fall through to an error state or to experience logic applied to a software project.

**Why it happens:**
The brief detection step in `brief.md` (Step 4/7) currently resolves to exactly one of three canonical strings: `software`, `hardware`, `hybrid`. All downstream consumers read that string and branch. Adding a fourth value requires updating every branch site. Developers typically update the detection step correctly but miss one or two downstream consumers, or they place `ELSE IF experience` after `ELSE IF hybrid` and inadvertently remove the fallback default.

**How to avoid:**
- Before writing any new code, audit every `product_type` branch site across all 14 workflows. Known sites confirmed by codebase inspection: `brief.md` (Step 4, Step 7 frontmatter), `system.md` (Step 3 color fallback), `wireframe.md` (Step 3 CSS defaults), `handoff.md` (Steps 4i hardware sections, Step 2b coverage parse, Step 11 hardware section gate), `flows.md`, `hig.md`, `critique.md`. Run `grep -rn "software\|hardware\|hybrid" workflows/` to find all sites.
- At every branch site, the required pattern is: `IF software ... ELSE IF hardware ... ELSE IF hybrid ... ELSE IF experience ... ELSE [default to software, never error]`. The final ELSE must remain a software fallback.
- Update `design-manifest.json` template's `productType` comment field from `"software | hardware | hybrid"` to `"software | hardware | hybrid | experience"` in the same commit that adds detection. This is a sentinel — if the template still reads 3 values, the update is incomplete.
- Write two Nyquist regression assertions: (1) a project with no detectable product type signals defaults to `software`, not an error; (2) `experience`-type tokens never appear in a software project's manifest.

**Warning signs:**
- An existing software project brief run through the updated pipeline produces experience-specific output (floor plan placeholder, vibe contract section, sonic token references).
- A project with no product type signals throws an error rather than defaulting to software.
- The DESIGN-STATE.md Quick Reference `| Product Type |` row shows `experience` for a project that was classified as software before the milestone.
- Running `grep -rn "product_type === 'experience'" workflows/` returns hits in more files than anticipated.

**Phase to address:**
Phase 1 (product type detection extension in `brief.md`). All branch sites in downstream workflows must be updated in the same phase — not split across phases. The pattern "add detection in Phase 1, update consumers in Phase 5" creates a window where the pipeline is in a broken state and tests will not catch it.

---

### Pitfall 2: Token Schema Pollution — Experience Token Categories Corrupt the Existing DTCG Tree

**What goes wrong:**
The existing `system.md` DTCG tree has exactly 7 top-level categories: `color`, `typography`, `spacing`, `shadow`, `border`, `motion`, `component`. Adding experience token categories (sonic, lighting, spatial, thermal/atmospheric) as additional top-level keys inside `SYS-tokens.json` will not cause JSON errors, but will silently break the `tokens-to-css` CLI transformer in `pde-tools.cjs`, which walks known category keys and skips unrecognized ones. Unknown categories produce incomplete CSS with no error or warning. More critically, if experience tokens share key names with existing categories (e.g., extending `color` with a `lighting` sub-tree), the merge silently overrides software color semantics.

**Why it happens:**
The DTCG 2025.10 spec (which reached stable status October 2025) explicitly allows `$extensions` for custom data. Developers reasonably assume adding new top-level keys is safe because the spec says tools should ignore what they don't understand. PDE's `tokens-to-css` transformer is not a generic DTCG tool — it is a hardcoded walker of the 7 known categories. Unknown keys are skipped, not flagged. The Figma MCP integration additionally drops `$extensions` on round-trip export — confirmed behavior per DTCG Community Group reports.

**How to avoid:**
- Experience token categories belong in a separate `SYS-experience-tokens.json` file alongside the existing `SYS-tokens.json`, never merged into it. A matching `SYS-experience-tokens.css` is generated separately.
- For any experience metadata that must coexist with the main token file (e.g., to survive Figma import), use DTCG `$extensions` with reverse-domain notation: `"com.pde.experience.sonic"`. This avoids collision with both existing PDE keys and future DTCG spec additions.
- Update `tokens-to-css` to accept an `--experience` flag that processes the separate experience token file instead of modifying the core 7-category transformer.
- Gate experience token generation behind `product_type === "experience"`. Experience tokens must never be generated for software, hardware, or hybrid projects.
- Add Nyquist assertion: running `pde-tools.cjs design tokens-to-css` on a software project after the milestone produces byte-identical CSS to the pre-milestone baseline.

**Warning signs:**
- `pde-tools.cjs design tokens-to-css` on an experience project produces CSS with fewer variables than expected and no error message.
- A software project re-run through system skill after the milestone produces a token file with sonic, lighting, or thermal keys.
- Figma MCP sync of an experience project discards experience token categories on export with no warning.
- The `SYS-tokens.json` template in `templates/` has more than 7 top-level category keys after the milestone.

**Phase to address:**
Phase 3 (design system extensions). The separate-file architecture must be established before any experience token categories are authored. The architecture decision made here propagates to handoff, Figma sync, and critique — retrofitting to separate files after those workflows are written is the most expensive possible rework.

---

### Pitfall 3: SVG Floor Plan Illegibility — Plans Pass Validation but Are Operationally Useless

**What goes wrong:**
LLM-generated SVG floor plans will produce structurally valid XML that looks like a floor plan but is unusable for actual event operations: zone labels at 6px font-size (invisible at print resolution), walls at 0.5px stroke (disappears at 100% zoom in print preview), a "1:100" scale label with no relationship to the actual SVG coordinate system, and zones (stage, FOH, catering, toilets) sized uniformly as equal rectangles regardless of stated venue capacity. The output passes a `xmllint` validation. It fails any operational review.

**Why it happens:**
SVG generation is a text task — the model emits `<rect>` and `<text>` tags without spatial reasoning grounded in architectural constraints. The model optimizes for "does this look like a floor plan in the rendered output" not "is this useful for a production manager." There is no training signal connecting SVG coordinate values to real-world spatial relationships: the model does not know how large a stage needs to be relative to an FOH mix position at a 1200-person venue, or that fire egress paths must be drawn proportionally wider than decorative pathways.

**How to avoid:**
- Establish a fixed SVG coordinate system in the wireframe workflow prompt: 1 SVG unit = 0.1m, canonical viewBox `0 0 1500 1000` (150m × 100m maximum). This is explicit and mandatory, not a suggestion.
- Mandate minimum stroke and font values: walls at `stroke-width="3"`, zone borders at `stroke-width="1.5"`, all text labels at `font-size="14"` minimum.
- Require a scale bar element: `<line x1="50" y1="950" x2="150" y2="950" stroke="black" stroke-width="2"/>` with a `<text>10m</text>` label (100 SVG units = 10m per the coordinate system above).
- Scope the artifact explicitly as a "zone layout schematic" not a "scale architectural drawing." Include a mandatory SVG `<text>` disclaimer element: content `SCHEMATIC ONLY — not to scale — verify dimensions with venue`.
- Read venue capacity from the brief extension fields (venue_capacity, stage_dimensions, venue_dimensions) to constrain zone proportions: stage zone must occupy at least 15% of total viewBox area for venues over 500 capacity.
- Do not attempt realistic egress path geometry. Label egress paths as named zones ("Emergency Exit A") without attempting to draw egress route widths to scale.

**Warning signs:**
- Floor plan SVG contains no `<line>` element with a scale bar label.
- Stage area `<rect>` is smaller than the toilet block `<rect>`.
- Font-size attributes below 12 on any visible text element.
- Zone widths are uniform (all `<rect>` elements have identical `width` attributes) regardless of stated venue capacity.
- No disclaimer text element present in the SVG output.
- viewBox dimensions do not correspond to the venue size stated in the brief.

**Phase to address:**
Phase 5 (wireframe stage extensions — floor plan artifact). The coordinate system, minimum stroke/font rules, and zone-sizing conventions must be embedded in the workflow prompt before any floor plan generation is attempted. Coordinate system decisions are not retrofittable: existing floor plans become inconsistent with new ones if the convention changes mid-milestone.

---

### Pitfall 4: Print Artifact Color Space Mismatch — HTML/CSS Flyers Are Presented as Print-Ready

**What goes wrong:**
PDE's mockup and wireframe skills produce HTML/CSS artifacts using RGB and OKLCH color values derived from the DTCG token system. Event flyers and festival programs targeting commercial printing require CMYK color values, 3mm bleed areas, crop marks, and PDF/X-1a or PDF/X-4 format. Generating a "print-ready" flyer as HTML/CSS with OKLCH token references produces an artifact that looks correct on screen and prints incorrectly. High-chroma OKLCH colors — electric blues, vivid greens, hot pinks common in event branding — have no CMYK equivalent and flatten to dull analogues when converted. The color gamut gap is significant: CMYK delivers approximately 16,000 shades versus over 16 million in RGB.

**Why it happens:**
PDE's design system is built for screen output using OKLCH, a perceptually uniform color space optimized for digital rendering. Reusing those tokens for print artifacts assumes RGB-to-CMYK conversion is lossless, which it is not. PDE has no print color pipeline and no mechanism to declare CMYK equivalents of OKLCH values. The system skill does not generate an ICC profile. Calling the HTML artifact "print-ready" misrepresents its nature to users who may send it directly to a commercial printer.

**How to avoid:**
- Scope all print artifacts explicitly as "print layout reference guides" in the workflow output, not "production print files." The exact phrase "print-ready" must not appear in any output artifact without an accompanying disclaimer.
- Include a mandatory CMYK approximation table in the design system output for experience projects: for each brand color token, provide the nearest CMYK equivalent using a lookup table. Document this as an approximation without ICC profile validation, not a specification.
- Add a bleed and margin guide to the HTML layout: a 3mm bleed zone as a dashed border CSS element, safe zone at 5mm from edge, crop mark overlays as SVG elements. These are guides for the designer, not production values.
- Include in the production bible handoff section: "All print artifacts require professional prepress review and conversion to PDF/X-1a or PDF/X-4 format before sending to commercial printer. PDE print layouts are composition references, not press-ready files."
- Never claim `PDF/X-1a` or `PDF/X-4` output capability. PDE cannot produce ICC-profile-embedded PDFs.

**Warning signs:**
- A flyer template uses high-chroma OKLCH values (chroma > 0.2) without a CMYK approximation in the design system documentation.
- No bleed or crop mark indicators present in the print layout HTML.
- The handoff artifact description includes "print-ready" without a prepress disclaimer.
- The production bible contains no statement directing users to professional prepress conversion.

**Phase to address:**
Phase 7 (flyer and print collateral). The scope boundary — "layout reference with CMYK approximations, not production print file" — must be written into the phase requirements before any print artifact workflow is authored. The scope boundary is load-bearing: without it, the natural tendency is to claim full print-production fidelity, which is technically impossible for this pipeline.

---

### Pitfall 5: LLM Safety and Licensing Hallucination — Production Bible Contains Dangerous Inaccuracies

**What goes wrong:**
The production bible (advance document, run sheet, staffing plan) and the critique stage safety and licensing perspectives will contain jurisdiction-specific regulations that the model states confidently but which are outdated, jurisdiction-wrong, or invented. Examples: asserting a specific first-aid station count per 1000 attendees as a regulatory fact (invented ratio with no universal legal basis), citing fire egress widths in centimeters that apply to one state or country but not another, specifying a noise ordinance dB limit at the property line from the wrong jurisdiction. A production team relying on these figures without independent verification risks non-compliance with actual local requirements.

**Why it happens:**
Event safety regulations are jurisdiction-specific (municipal fire codes, county zoning, state liquor licensing, EPA and local noise ordinances, ADA requirements), updated frequently, and unevenly represented in LLM training data. The model cannot know which jurisdiction applies to the event unless explicitly told, and even when told, may apply training data from a different jurisdiction if the target jurisdiction is underrepresented. Unlike web development standards (which are stable and universal), event permitting law varies significantly between cities within the same country. The model has no way to signal this uncertainty internally — it presents jurisdiction-specific facts at the same confidence level as universal facts.

**How to avoid:**
- Every section of the critique safety perspective and production bible that touches regulations must include a section-level disclaimer: "Regulatory requirements vary significantly by jurisdiction. Verify all occupancy limits, egress widths, noise ordinances, alcohol licensing, and safety ratios with your local authority having jurisdiction (AHJ) before finalizing."
- Replace specific numerical regulatory thresholds with industry guidance ranges labeled as such: instead of "1 toilet per 100 attendees (required)", write "Industry guidance ranges: 1 toilet per 75-150 attendees depending on event duration and alcohol service — verify with local health authority."
- Frame the critique safety perspective as "questions to verify with your AHJ" not "here are the applicable regulations." Every regulatory claim is a question: "Has the venue fire marshal confirmed maximum occupancy for this layout?" not "Maximum occupancy is N persons per fire code."
- Add a mandatory `[VERIFY WITH LOCAL AUTHORITY]` inline tag to every numerical value in the production bible that derives from regulatory requirements.
- Include a "Regulatory Verification Checklist" section in the production bible structured as a to-do list of questions (not a statement of compliance): fire marshal occupancy confirmation, noise ordinance check, liquor license verification, temporary food permit, etc.

**Warning signs:**
- Production bible states a specific maximum occupancy as a bare fact without citing the venue's certificate of occupancy.
- Critique safety perspective references specific regulation codes (e.g., "NFPA 101 Section 7.3") without a jurisdiction and AHJ-verification qualifier.
- Staffing plan specifies a "legally required" security-to-attendee ratio without jurisdiction qualifier.
- No disclaimer text appears anywhere in any safety-adjacent section of the production bible or critique report.
- The advance document contains a "Compliance Status: COMPLIANT" assertion generated by the model.

**Phase to address:**
Phase 8 (critique stage experience perspectives) and Phase 9 (handoff production bible). Both phases must begin with a mandatory disclaimer architecture — a reusable disclaimer block template that is injected into every safety and licensing section. This is not optional polish; it is a liability mitigation requirement. Define the disclaimer block in Phase 1 (brief extensions) so it is available to all downstream phases.

---

### Pitfall 6: Sub-Type Scope Creep — Five Sub-Types Become Five Separate Pipeline Branches

**What goes wrong:**
The five sub-types (single-night, multi-day, recurring-series, installation, hybrid-event) begin as classification metadata in the brief but evolve into separate pipeline branches as each phase developer reasons about differences. "Multi-day events need a per-day timeline wireframe" becomes a new branch. "Recurring-series events need a series identity template in handoff" becomes another. "Installation events need a different floor plan orientation" becomes a third. By Phase 5, each sub-type has unique conditional logic in flows, wireframe, and handoff. The test matrix is 5× larger than anticipated, and the pipeline has 40+ sub-type-specific branch points that must all be kept consistent.

**Why it happens:**
Sub-type differences are real and meaningful, but they can be handled through parametric variation (one prompt template with a `sub_type` field that adjusts specific sentences) rather than separate pipeline branches. The instinct to make differences explicit in code is correct in isolation but wrong at scale: 5 sub-types × 8 pipeline stages = 40 branch points to maintain. Each subsequent milestone that touches these workflows inherits this complexity.

**How to avoid:**
- Lock in the architecture decision in Phase 1: sub-types are metadata attributes on the `experience` product type, not separate product types. The sub-type is stored as `sub_type` in the brief frontmatter but the pipeline has exactly one `experience` branch in every workflow — not five.
- Drive sub-type variation through parametric prompt strings, not conditional branches. The flows workflow for experience type reads the `sub_type` field and adjusts the temporal dimension prompt with a single conditional sentence insertion — one prompt path, not two.
- Cap sub-type branching at the brief stage. Every workflow after brief reads `product_type: experience` and `sub_type: [value]` and uses one unified experience path with sub-type-aware parametric sections.
- Document the complete sub-type influence map explicitly and treat it as a closed list: `single-night` — `repeatability_intent` field only; `multi-day` — adds per-day sections to timeline wireframe; `recurring-series` — adds series identity template to handoff; `installation` — changes floor plan orientation (landscape) and removes run sheet; `hybrid-event` — adds digital flow dimensions alongside physical flow. This is the complete list.

**Warning signs:**
- Any workflow file other than `brief.md` contains `IF sub_type === "installation"` or equivalent conditional branches.
- The wireframe stage has multiple floor plan prompt paths differentiated by sub-type.
- The handoff stage contains sub-type-specific section generation blocks beyond the documented complete list.
- Test count for experience product type exceeds 2× the test count added for any prior product type in a single milestone.
- A phase plan introduces a new sub-type distinction not on the documented complete list.

**Phase to address:**
Phase 1 (product type detection and brief extensions). The sub-type architecture decision must be made and recorded as a Key Decision in PROJECT.md in Phase 1. If deferred, each subsequent phase makes local sub-type branching decisions that become globally inconsistent and unmaintainable.

---

### Pitfall 7: Cross-Product-Type Regression Tests Are Missing — Experience Tests Are Only Additive

**What goes wrong:**
The test suite grows by 40+ new assertions for experience-type behavior. None of them test that software/hardware/hybrid behavior is unchanged. A developer updates the experience branch in `handoff.md` and accidentally removes the `ELSE` default that routes hardware projects to their BOM Export section. The error is not caught by the experience-type tests (which pass), not caught by the positive-path hardware tests (which are not run post-milestone), and is discovered by a user six weeks later. The regression is real but the test suite shows green.

**Why it happens:**
Additive testing is the natural mode for new features: write tests that verify the new behavior exists. Regression testing for existing behavior requires deliberately thinking about what could break — which requires understanding the old code paths well enough to know which ones are at risk. Developers adding experience-specific assertions focus on proving the new behavior, not disproving breakage of old behavior.

**How to avoid:**
- For every new conditional branch added to an existing workflow, write a minimum of 3 cross-type assertions: (1) existing type X does not get experience output; (2) the new experience type gets expected output; (3) the default fallback (no product type detected) still produces software output. These three assertions per branch are more valuable than 10 experience-only positive assertions.
- Create a single smoke matrix test file `experience-regression.test.mjs` that covers all 4 product types against the 3 most critical shared paths: brief detection produces correct `productType` field; system skill produces correct token file count per type; handoff skill produces correct sections per type. This matrix test is the regression guard for the entire milestone.
- Apply the pass-through-all coverage pattern to experience: every skill that reads coverage flags must pass through new experience-specific flags (`hasFloorPlan`, `hasProductionBible`, `hasEventFlyer`) without overwriting or omitting them. New flags not in the pass-through-all pattern of an existing skill will be silently zeroed out.
- Run the smoke matrix test at the end of every phase, not just at milestone completion.

**Warning signs:**
- Phase test files contain experience-type positive assertions with no complementary software-type negative assertions.
- The test suite reports zero failures after Phase 3 but running a software project through the system skill manually produces experience token category keys.
- Coverage flags `hasFloorPlan` or `hasProductionBible` appear in a software project's `design-manifest.json`.
- The smoke matrix test file does not exist by the end of Phase 1.

**Phase to address:**
Phase 1 (establish smoke matrix test architecture). The cross-type regression test strategy and smoke matrix file must be created in Phase 1 — not written as a final validation step at milestone completion. Each subsequent phase appends cross-type assertions to the existing matrix.

---

### Pitfall 8: Multi-Sensory Token Overload — Experience Design System Becomes a Specification Document

**What goes wrong:**
A sonic + lighting + spatial + thermal token set sounds comprehensive. In practice, the model will generate 60-120 additional token entries: sonic BPM tempo ranges, reverb time constants in seconds, color temperature in Kelvin for 8 distinct lighting zones, lux levels for wayfinding vs. stage wash, thermal humidity targets per area type, HVAC capacity formulas. The resulting `SYS-experience-tokens.json` is a multi-sensory specification document, not a design system. No design tool reads sonic BPM or thermal humidity as tokens. The critique stage evaluates token compliance metrics against these entries and produces nonsense output (APCA contrast ratios applied to reverb time constants). The handoff stage references "see design system for complete sonic specification" but the sound engineer has no way to open a JSON file.

**Why it happens:**
The multi-sensory design space is large. The experience brief includes sonic, lighting, spatial, and thermal dimensions, each with legitimate design parameters. Without explicit scope constraints in the workflow prompt, the model fills every dimension comprehensively, optimizing for apparent completeness rather than artifact usefulness. The academic literature on multi-sensory architecture covers dozens of controllable dimensions — the model has seen this literature.

**How to avoid:**
- Limit experience design system tokens to the actionable subset: tokens that inform a physical artifact (floor plan annotations, flyer color palette, wayfinding signage palette) or a vendor brief (lighting color temperature range, target SPL). Exclude tokens with no physical artifact expression.
- Define hard entry limits per experience token category in the system.md workflow prompt: `color` — brand palette + 2 zone variants (10 entries max); `lighting` — 3 entries max (color temp range, zones description, intensity guidance); `sonic` — 2 entries max (target SPL and genre tempo guidance); `spatial` — 3 entries max (zone labels). Total experience tokens: 30 entries maximum.
- Frame sonic and thermal tokens as "vendor brief parameters" not "design system values." They belong as plain-text sections in the production bible, not as DTCG leaf nodes.
- Add a clarity check assertion to the system skill experience branch: total experience-specific token entries must not exceed 30. Generation exceeding 30 entries is a scope violation.

**Warning signs:**
- `SYS-experience-tokens.json` contains more than 50 token entries.
- Token entries include values like `"reverb.time.stage": { "$value": "1.2s", "$type": "duration" }`.
- The critique stage outputs APCA contrast ratio violations for sonic or thermal tokens.
- The handoff production bible references the token file for a vendor who cannot interpret JSON.

**Phase to address:**
Phase 3 (design system extensions). Token category scope limits must be defined in the workflow prompt before generation begins — not discovered through iteration after an oversized token file is already in place.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Add `experience` to `productType` enum in brief detection only, update downstream consumers "in the next phase" | Faster Phase 1 | Pipeline in broken state between phases; tests pass in isolation but fail in integration | Never — branch site updates are atomic with detection changes |
| Merge experience tokens into `SYS-tokens.json` alongside the existing 7 categories | Single-file simplicity | Breaks `tokens-to-css` transformer silently; corrupts software project runs; Figma sync drops experience tokens on export | Never |
| Write sub-type conditional branches per workflow rather than parametric prompt strings | Explicit, readable sub-type logic | 5 sub-types × 8 stages = 40 branches; each new sub-type or stage addition multiplies this | Never at this milestone scale |
| Write only positive-path experience tests without cross-type regression guards | Faster test authoring | Silent regressions in software/hardware flows found only by users post-ship | Only acceptable if a manual regression smoke test is documented, run, and recorded in RECONCILIATION.md before ship |
| Describe print artifacts as "print-ready" without CMYK approximations or disclaimers | Better output marketing copy | Users send HTML to printer; colors shift; trust is damaged and not recoverable without a support workflow | Never — always scope as "layout reference" |
| Include specific regulatory ratios or capacity limits as stated facts in the production bible | More specific, apparently more actionable output | Jurisdiction mismatch creates real operational risk; users rely on wrong numbers without knowing to verify | Never without an inline `[VERIFY WITH LOCAL AUTHORITY]` tag on every numerical value |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `pde-tools.cjs design manifest-set-top-level productType experience` | Calling this command without updating the template schema comment | Update `templates/design-manifest.json` `productType` field comment to include `experience` in the same commit; downstream tools that validate against the template will otherwise reject the new value |
| Figma MCP DTCG export for experience tokens | Including experience tokens in the main `SYS-tokens.json` file that Figma sync reads | Keep experience tokens in `SYS-experience-tokens.json`; document in handoff that experience tokens do not round-trip through Figma and must be maintained in PDE manually |
| DESIGN-STATE.md coverage flags pass-through | Adding `hasFloorPlan` and `hasProductionBible` as new coverage flags without updating the pass-through-all pattern in every existing skill | Run `grep -rn "coverage-check\|designCoverage" workflows/` to find every skill that reads coverage; each must be updated to pass through the new flags |
| DESIGN-STATE.md `\| Product Type \|` row updates | Existing skills that update this row via regex may not recognize `experience` as valid and overwrite it with `software` | Audit every skill that writes to DESIGN-STATE.md Quick Reference table and add `experience` to any validation regex or conditional |
| Google Stitch for floor plan generation | Attempting `--use-stitch` on the floor plan wireframe artifact | Stitch is a UI screen tool; requesting event floor plans via Stitch produces screen mockups, not spatial schematics. Floor plans must be generated as inline SVG by the model directly. Document Stitch exclusion explicitly in the wireframe workflow for experience type. |
| Critique stage DTCG token compliance checks | Running the standard DTCG token compliance checker against experience-specific token files | Experience tokens in `SYS-experience-tokens.json` are not DTCG standard types (sonic, thermal); the compliance checker must skip this file or the critique will produce invalid findings |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Generating the full production bible (advance document + run sheet + staffing plan + budget) in a single prompt | Token budget exceeded mid-generation; handoff output is truncated at the staffing plan section | Split production bible into 4 separate generation calls, each writing its own artifact; aggregate paths into the manifest | Any venue with >500 capacity; budget templates alone reach 2000+ tokens of tabular content |
| Generating a multi-day event timeline wireframe as a single SVG | SVG file exceeds 50KB; the model loses spatial coherence for later days; zones are inconsistently sized across days | Generate one timeline SVG per event day and aggregate as a multi-file compound artifact | Any event with 3+ days and more than 8 distinct programming zones |
| Running all 7 critique perspectives (safety, accessibility, operations, sustainability, licensing, financial, community) in a single pass | Perspectives 5-7 contain generic, non-domain-specific findings; the model exhausts its domain-specific knowledge by perspective 4 | Run safety and licensing perspectives separately from aesthetic and community perspectives; 2-pass critique for experience type | All experience projects — the domain breadth always exceeds single-pass quality |
| Floor plan SVG with full zone detail labels for 12+ zones | SVG becomes illegible at A3 print size; labels overlap when rendered at 150% zoom | Use zone codes (S1, FOH, C1, T1, E1) on the floor plan diagram with a separate reference legend table in the wireframe markdown file | Any venue with more than 8 distinct zones |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Production bible includes specific vendor names and pricing sourced from LLM training data | LLM-hallucinated vendor details presented as real; users contact non-existent vendors or rely on fabricated pricing in budget planning | Never generate specific vendor names or pricing in production bible templates; use placeholder categories ("preferred AV vendor — obtain 3 quotes", "catering partner TBD") with explicit "populate from actual quotes" instructions |
| Floor plan presented without disclaimer for emergency egress planning | Emergency services or venue managers given schematic geometry that does not reflect actual egress route dimensions; safety hazard in an emergency | Every floor plan SVG must contain a mandatory disclaimer text element: "SCHEMATIC ONLY — not for emergency planning or regulatory submissions without professional architectural review" |
| Regulatory compliance numbers stated without jurisdiction in critique or production bible | Non-compliant event because production team relied on rules from the wrong jurisdiction | Every regulatory figure must be tagged `[JURISDICTION-SPECIFIC — verify with AHJ]` inline; never present a number as a universal regulatory fact |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Pipeline fails silently when `experience` sub-type value is not in the allowed set | User runs `/pde:build --from brief` with a custom sub-type and gets software-default output with no error; discovers the problem at wireframe stage when no floor plan appears | Add sub-type validation to brief Step 4: if `sub_type` is present but not in the 5-value allowed set, emit a WARNING in DESIGN-STATE.md and halt with a descriptive error listing valid values |
| Experience-type critique applies software HIG audit criteria | Safety and operations perspectives produce digital-product findings ("ensure sufficient touch target size", "keyboard navigation is missing") that are accurate for software but irrelevant for a physical event | Explicitly gate the HIG audit perspective by product type: for experience type, suppress digital interface criteria and substitute physical interface guidelines (wayfinding legibility at 5m, queue UX, transaction speed, toilet ratio) |
| Production bible run sheet uses bare time values without timezone | A run sheet that says "16:00 stage check" without timezone is unusable for events with international crew or for multi-venue events | All run sheet timestamps must include a venue timezone label; capture `venue_timezone` as a required field in the brief extension alongside `venue_name` and `venue_location` |
| Floor plan and timeline wireframe exist as disconnected artifacts | User generates a floor plan for Phase 1 of a multi-day event but the timeline wireframe covers the full event; zones are inconsistent between the two artifacts | Wireframe stage for experience type must treat floor plan and timeline as a compound artifact: the timeline references zone codes from the floor plan; both are registered under a single compound artifact code |

---

## "Looks Done But Isn't" Checklist

- [ ] **Product type detection complete:** `experience` added to `brief.md` detection — verify all 14 downstream workflows handle the 4th value, not just `brief.md`. Run `grep -rn "software\|hardware\|hybrid" workflows/` and confirm every site has been updated.
- [ ] **Design manifest schema updated:** `productType` comment includes `experience` — verify `pde-tools.cjs design manifest-set-top-level productType experience` executes without validation error.
- [ ] **Token file separation:** Experience tokens in a separate file — verify running `pde-tools.cjs design tokens-to-css` on a software project after the milestone produces byte-identical CSS output to the pre-milestone baseline.
- [ ] **Pass-through-all coverage pattern extended:** New flags `hasFloorPlan`, `hasProductionBible`, `hasEventFlyer` pass through all existing skills — verify a software project run through the full pipeline has none of these flags set in `design-manifest.json`.
- [ ] **Safety disclaimers in production bible:** All regulatory sections include `[VERIFY WITH LOCAL AUTHORITY]` — verify no bare numerical regulatory value appears in any handoff template without this tag.
- [ ] **Sub-type branching locked to brief stage:** No sub-type conditionals in workflows beyond `brief.md` — run `grep -rn "sub_type" workflows/` and confirm results are limited to `brief.md` and parametric prompt strings in `flows.md` and `wireframe.md`.
- [ ] **Print scope disclaimer present:** Flyer and print artifact output includes "layout reference, not production print file" — verify "print-ready" does not appear in any artifact description without an accompanying disclaimer.
- [ ] **Smoke matrix test exists and passes:** `experience-regression.test.mjs` covers 4 product types × 3 critical paths — confirm the file exists and is included in the milestone acceptance test gate.
- [ ] **DESIGN-STATE `| Product Type |` row updated:** Run a brief with experience signals and confirm DESIGN-STATE shows `experience`, not `software`.
- [ ] **Stitch exclusion for floor plans documented:** Verify the wireframe workflow prompt for experience type explicitly states floor plan artifacts are not eligible for `--use-stitch` generation.
- [ ] **SVG floor plan has scale bar:** Verify every generated floor plan SVG contains a scale bar element and disclaimer text element before the wireframe phase is marked complete.
- [ ] **Production bible generation split across 4 calls:** Verify the handoff workflow for experience type generates advance document, run sheet, staffing plan, and budget template as separate sequential generation steps, not as a single prompt.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Default-else regression discovered post-ship | HIGH | Audit all 14 workflow branch sites; patch each; re-run full Nyquist test suite; re-ship affected files; affected user projects must re-run brief to regenerate correct `productType` field — existing brief artifacts are not automatically corrected |
| Token schema pollution (experience tokens merged into `SYS-tokens.json`) | HIGH | Create separate `SYS-experience-tokens.json` architecture; update `tokens-to-css`; update all consumers; every experience project that ran system skill must re-run it to get clean token separation |
| Sub-type branch explosion discovered mid-milestone | MEDIUM | Consolidate sub-type branches into parametric prompt strings; delete branch-specific workflow variants; rewrite affected test assertions; expect 2-3 day delay per affected phase |
| Production bible regulatory inaccuracy discovered by user post-ship | MEDIUM | Add disclaimer architecture in a patch release; previously generated documents cannot be retracted; issue communication about required AHJ verification for all regulatory values |
| Floor plan SVG coordinate system inconsistency (wrong system used in early phases) | MEDIUM | Update coordinate system constants in wireframe workflow; all previously generated floor plans must be regenerated by users; coordinate system change is not backward-compatible |
| Print artifact sent to commercial printer directly (no CMYK conversion) | LOW (for PDE) | Add scope disclaimer in a patch; not a code regression; ensure CMYK approximations section is added to the design system output for experience projects in the same patch |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Default-else regression (Pitfall 1) | Phase 1: Product type detection extension | All 14 workflow branch sites updated; smoke matrix test passes for all 4 product types; default fallback produces `software`, not error |
| Token schema pollution (Pitfall 2) | Phase 3: Design system extensions | `pde-tools.cjs design tokens-to-css` on a software project produces identical CSS to pre-milestone baseline; experience tokens in separate file |
| SVG floor plan illegibility (Pitfall 3) | Phase 5: Wireframe stage extensions | Generated floor plan SVG contains scale bar element, minimum 14px font-size, disclaimer text element, and viewBox dimensions corresponding to brief venue size |
| Print artifact color space mismatch (Pitfall 4) | Phase 7: Flyer and print collateral | Handoff section contains CMYK approximation table; "print-ready" does not appear without disclaimer; output described as "layout reference" |
| LLM safety/licensing hallucination (Pitfall 5) | Phase 8: Critique experience perspectives + Phase 9: Handoff production bible | Every numerical regulatory value tagged `[VERIFY WITH LOCAL AUTHORITY]`; no bare regulatory facts; AHJ verification checklist present in production bible |
| Sub-type scope creep (Pitfall 6) | Phase 1: Brief extensions (decision locked here) | `grep -rn "sub_type" workflows/` returns results only in `brief.md` and parametric prompt strings — zero conditional branch blocks outside `brief.md` |
| Cross-type regression testing gap (Pitfall 7) | Phase 1: Smoke matrix test established | `experience-regression.test.mjs` exists and covers 4 product types × 3 paths; run as part of pre-ship acceptance gate for every subsequent phase |
| Multi-sensory token overload (Pitfall 8) | Phase 3: Design system extensions | `SYS-experience-tokens.json` contains 30 entries or fewer; no reverb, humidity, or non-artifact-expressible token types present; critique stage does not attempt APCA compliance checks on experience-specific tokens |

---

## Sources

- PDE codebase inspection: `workflows/brief.md` (Step 4/7 product type detection, allowed values: `software | hardware | hybrid`), `workflows/system.md` (7-category DTCG structure, `tokens-to-css` dependency), `workflows/handoff.md` (Steps 4i, 2b, 11 hardware section gating), `workflows/wireframe.md` (Step 3 CSS default fallback), `workflows/critique.md`, `workflows/flows.md`, `bin/lib/design.cjs` (`cmdCoverageCheck`, `designCoverage` field), `templates/design-manifest.json` (schema structure, `productType` field), `bin/pde-tools.cjs` (manifest commands) — HIGH confidence: direct codebase evidence
- DTCG 2025.10 specification stable release: https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/ — confirmed `$extensions` support and Figma export behavior (MEDIUM confidence: community group announcement; Figma behavior based on reported tool status)
- `$extensions` namespace behavior: https://www.alwaystwisted.com/articles/understanding-extensions-in-the-design-tokens-spec — reverse-domain notation recommendation (MEDIUM confidence: single source, consistent with spec intent)
- AI hallucination in event planning: https://sched.com/blog/ai-event-planning-pitfalls/ — vendor hallucination and fabricated fact patterns (MEDIUM confidence: domain-specific, consistent with known LLM behavior)
- CMYK vs RGB gamut gap: https://www.dusted.com/insights/rgb-vs-cmyk-colour-spaces-explained and https://ironmarkusa.com/cmyk-vs-rgb-whats-the-difference/ — 16M vs 16K shade differential; PDF/X format requirements (HIGH confidence: multiple independent sources, fundamental color science)
- Event licensing jurisdiction variation: https://www.venuesnyc.com/blog/permits-licenses-required-for-events-in-NYC and https://diamondevent.com/blog/utah-event-permits-and-regulations/ — illustrative examples of jurisdiction-specific requirements and variation (MEDIUM confidence: illustrative, not exhaustive)
- AI document generation accuracy cycles: https://www.mindstudio.ai/blog/building-ai-powered-documentation-systems-manufacturing — 3-5 review cycles required; right-first-time rates 5-20% for production documents (MEDIUM confidence: manufacturing domain extrapolated to event production documents)
- Feature flag testing matrix complexity: https://testrigor.com/blog/feature-flags-how-to-test/ — permutation explosion per conditional flag (MEDIUM confidence: illustrative of pattern)
- SVG floor plan coordinate conventions: https://visual-integrity.com/svg-floor-plan/ and Home Assistant floorplan community guidance — general SVG floor plan conventions (LOW confidence: no event-venue-specific SVG standard exists; coordinate system recommendations are PDE-specific design decisions)

---

*Pitfalls research for: PDE v0.11 Experience Product Type — adding new product type to existing multi-type design pipeline*
*Researched: 2026-03-21*
