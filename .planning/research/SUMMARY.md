# Project Research Summary

**Project:** PDE v0.11 — Experience Product Type
**Domain:** Extension of the existing 13-stage PDE design pipeline to support events, festivals, installations, and recurring series as a first-class product type
**Researched:** 2026-03-21
**Confidence:** HIGH

## Executive Summary

PDE v0.11 adds an `experience` product type to the existing pipeline, joining `software`, `hardware`, and `hybrid`. An experience product is defined by time, space, and bodies rather than screens — the design deliverables shift from component specs and TypeScript interfaces to floor plans, running orders, and production bibles. Research confirms that every required capability (SVG floor plans, Mermaid gantt timelines, print-spec HTML collateral, multi-sensory DTCG token extensions, structured production documents) is implementable using technologies already in the pipeline: inline SVG, CSS `@page`, existing Mermaid rendering, and the existing DTCG JSON structure. No new npm packages are required.

The recommended implementation strategy follows the established `hardware` branching pattern: add a conditional `ELSE IF experience` block within each of the 8 affected workflow files, driven by a canonical `product_type: "experience"` string stored in the brief and design-manifest.json. Five sub-types (single-night, multi-day, recurring-series, installation, hybrid-event) are metadata attributes, not structural branches — they inform prompt content, not code paths. This decision is load-bearing and must be locked in Phase 1. The six new artifact codes (FLP, TML, FLY, POS, PRG, BIB) follow existing naming conventions and register in the manifest under the existing artifact schema.

The dominant risk is not technical but architectural: experience extensions touch every workflow file simultaneously, creating multiple cross-type regression opportunities. The most critical mitigations are establishing a smoke matrix regression test in Phase 1 (covering all four product types against every affected workflow) and separating experience DTCG tokens into a standalone `SYS-experience-tokens.json` file rather than merging them into the existing 7-category token structure. Without these two guard rails, the milestone will silently break existing software/hardware/hybrid projects and produce over-specified token files that are operationally useless.

---

## Key Findings

### Recommended Stack

No new packages are required. All five new capability areas use established PDE formats extended for physical design. Inline SVG inside self-contained HTML files handles floor plans — the same pattern proven by `WFR-*.html` wireframes. Mermaid `gantt` with `dateFormat HH:mm` handles running orders — the same Mermaid render path already used for flowcharts. CSS `@page` with physical `mm` units handles print-spec flyers and posters via browser print-to-PDF. DTCG 2025.10 JSON extended with custom category names handles multi-sensory design tokens — the existing `tokens-to-css` command iterates all categories generically, so new category names produce CSS custom properties automatically.

The only infrastructure changes required are: add `'physical'` to the `DOMAIN_DIRS` array in `design.cjs`, add `experienceSubType` to `templates/design-manifest.json`, add experience signals to Step 4 of `workflows/brief.md`, and add two new reference files (`references/experience-hig.md`, `references/experience-tokens.md`). All new behavior lives as conditional blocks inside existing workflow files.

**Core technologies:**
- Inline SVG in self-contained HTML: floor plan and spatial zone artifacts (FLP) — `viewBox="0 0 1000 750"` abstract coordinate system, no SVG library needed, LLM generates source directly
- Mermaid `gantt` with `dateFormat HH:mm`: timeline/running order artifacts (TML) — reuses existing Mermaid render path, time-of-day scheduling via `axisFormat %H:%M`
- CSS `@page` with `mm` units: print-ready flyer and poster artifacts (FLY, POS, PRG) — Chrome/Edge honor `@page size` for print-to-PDF; browser is the renderer, no Puppeteer or WeasyPrint needed
- DTCG 2025.10 JSON with custom category names: sonic, lighting, spatial, atmospheric, print token categories — zero parser changes required; `tokens-to-css` is already a generic category iterator
- Markdown (structured): production bible, run sheet, staffing plan, advance document (BIB) — matches existing HND handoff document pattern exactly

See `.planning/research/STACK.md` for complete token schemas, SVG coordinate strategy, print bleed handling, and sub-type-specific artifact matrix.

### Expected Features

Experience product type practitioners expect a complete pipeline from creative brief through operational handoff. The most expected deliverable — by far — is the floor plan wireframe. Its absence signals an incomplete pipeline to any event producer. After floor plan: the production bible (the equivalent of the TypeScript handoff), run sheet, staffing plan, event flyer, and safety critique perspective.

**Must have (table stakes) — v0.11 launch:**
- Experience sub-type detection (5 sub-types: single-night, multi-day, recurring-series, installation, hybrid-event) — gates all downstream differentiation
- Brief extensions: promise statement, vibe contract, audience archetype, venue constraints, repeatability intent — foundational inputs for all physical artifact generation
- Temporal flow diagram — event equivalent of a user flow; required before run sheet can be generated
- Spatial flow diagram — required input for floor plan layout; cannot generate credible spatial design without it
- Floor plan wireframe (FLP artifact) — the single most expected deliverable; absence signals an incomplete pipeline
- Timeline wireframe (TML artifact) — production schedule visualization; pairs with run sheet in handoff
- Production bible / advance document (BIB artifact) — experience equivalent of TypeScript handoff; the completion artifact
- Run sheet — required by every professional production team; component of production bible
- Staffing plan — required operational deliverable; component of production bible
- Safety critique perspective — non-optional for physical experiences with liability implications
- Event flyer artifact (FLY) as print-spec HTML — first deliverable any event planner creates; absence signals incomplete pipeline
- Wayfinding design tokens — required for any multi-zone event

**Should have (competitive differentiators) — v0.11.x:**
- Vibe contract design system (sonic, lighting, atmospheric token extensions) — no other design tool connects emotional brief to design system
- Physical HIG (wayfinding legibility, queue UX, toilet ratio, hydration, first aid proximity) — unique to PDE
- Operations and sustainability critique perspectives — extends critique advantage to physical events
- Budget framework in handoff — structured line item generation from brief scale and sub-type
- Post-event review template — tailored to specific event design decisions; useful for recurring series

**Defer (v0.12+ or future iterations):**
- Series identity template artifact — requires repeatability flag to be tested first; architecturally significant
- Festival program artifact (PRG) — composite document requiring multiple upstream artifacts
- Repeatability-aware `{{variable}}` template generation across all stages — architectural mode switch; defer until single-run pipeline is stable
- Licensing/financial critique perspective — requires careful scoping to avoid harmful legal advice

See `.planning/research/FEATURES.md` for full competitor analysis, feature dependency graph, and MVP definition.

### Architecture Approach

The architecture is purely additive: conditional blocks within existing workflow files, two new reference files, and minor template modifications. The established `hardware` branching pattern in `handoff.md` is the template for every experience extension. No new workflow files are created (which would break `--from` stage resumption), no directory structure is added beyond the `physical` domain directory, and no architectural components are restructured. Sub-types are metadata attributes, not structural branches — they calibrate prompt content within the single `ELSE IF experience` code path.

**Major components affected:**

1. `workflows/brief.md` (MODIFIED) — add experience signal detection in Step 4, add venue constraints, vibe contract, and sub-type fields in Step 5
2. `workflows/flows.md` (MODIFIED) — add temporal, spatial, and social flow dimensions when experience type detected
3. `workflows/system.md` (MODIFIED) — generate `SYS-experience-tokens.json` alongside existing token file when experience type detected; separate file, never merged
4. `workflows/wireframe.md` (MODIFIED) — emit FLP (floor plan) and TML (timeline) artifact codes for experience products
5. `workflows/critique.md` (MODIFIED) — add safety, operations, and sustainability perspectives
6. `workflows/hig.md` (MODIFIED) — replace WCAG/digital checks with physical interface guidelines (wayfinding, acoustic zones, queue UX, ratios)
7. `workflows/handoff.md` (MODIFIED) — emit production bible sections instead of software component APIs
8. `references/experience-hig.md` (NEW) — physical HIG reference library loaded via existing `@references/` pattern
9. `references/experience-tokens.md` (NEW) — sonic/lighting/spatial/atmospheric token schemas and examples

See `.planning/research/ARCHITECTURE.md` for complete dispatch pattern, all 5 architectural patterns, and the sub-type calibration map.

### Critical Pitfalls

Research identified 8 pitfalls across pipeline integration, token architecture, artifact quality, and LLM safety. The top 5 requiring proactive mitigation:

1. **Default-else regression (CRITICAL)** — adding `ELSE IF experience` to every workflow branch risks silently removing the `software` fallback default. The final `ELSE` in every chain must remain a software default, never an error state. Audit all 14 branch sites with `grep -rn "software|hardware|hybrid" workflows/` before writing any new code. Address in Phase 1.

2. **Token schema pollution (CRITICAL)** — experience token categories must live in a separate `SYS-experience-tokens.json`, never merged into the existing 7-category `SYS-tokens.json`. The existing `tokens-to-css` transformer skips unknown categories silently. Separate file architecture must be established in Phase 3 before any experience tokens are authored.

3. **SVG floor plan illegibility (HIGH)** — LLM-generated SVG passes XML validation but produces operationally useless output: 6px labels, 0.5px walls, uniformly-sized zones regardless of stated capacity. Mitigate with a mandatory coordinate system (`1 SVG unit = 0.1m`, `viewBox="0 0 1500 1000"`), minimum stroke/font values, scale bar elements, and an explicit "SCHEMATIC ONLY" disclaimer text element. Address in Phase 5.

4. **Print color space mismatch (HIGH)** — OKLCH colors used throughout PDE have no lossless CMYK equivalent; high-chroma event branding colors flatten severely when converted. Never use the phrase "print-ready" without a mandatory prepress disclaimer. Include a CMYK approximation table in the design system output. Frame all print artifacts as "composition reference guides, not production print files." Address in Phase 7.

5. **LLM safety and licensing hallucination (HIGH)** — production bibles and safety critique perspectives will confidently assert jurisdiction-specific regulations that are outdated, jurisdiction-wrong, or invented. Every regulatory value must carry a `[VERIFY WITH LOCAL AUTHORITY]` inline tag. Replace specific regulatory thresholds with industry guidance ranges. Reframe safety critique from "applicable regulations" to "questions to verify with your AHJ." Define the mandatory disclaimer block in Phase 1. Address in Phases 8 and 9.

See `.planning/research/PITFALLS.md` for Pitfalls 6-8 (sub-type scope creep, missing cross-type regression tests, multi-sensory token overload) with full warning signs and avoidance strategies.

---

## Implications for Roadmap

Based on research, the dependency chain drives phase order. Brief extensions gate everything. Floor plan gates safety critique, physical HIG, and advance document. Experience token architecture must precede token generation. Cross-type regression testing must be established before any workflow changes are made.

### Phase 1: Foundation and Regression Infrastructure
**Rationale:** Every downstream phase modifies existing workflow files. Without a cross-type regression safety net, each modification can silently break software/hardware/hybrid projects. This phase is the mandatory guard before any pipeline changes. It also locks the two irreversible architecture decisions: sub-types as metadata (not branches) and experience tokens in a separate file.
**Delivers:** `experience` added to the `productType` enum in brief and manifest; sub-type detection in brief Step 4; `experience-regression.test.mjs` smoke matrix covering all 4 product types against 3 critical shared paths; mandatory disclaimer block template; Key Decisions recorded in PROJECT.md (sub-type architecture, token separation architecture)
**Addresses:** Sub-type detection (FEATURES.md table stakes); repeatability intent flag (FEATURES.md table stakes)
**Avoids:** Default-else regression (Pitfall 1), sub-type scope creep (Pitfall 6), missing regression tests (Pitfall 7)

### Phase 2: Brief Extensions
**Rationale:** All downstream artifact generation requires structured brief data — venue constraints, vibe contract, audience archetype, repeatability intent. These are the physical design equivalents of software brief fields and must exist before any pipeline stage runs for experience products.
**Delivers:** Venue constraints capture (capacity, indoor/outdoor, ceiling height, power, infrastructure), promise statement and vibe contract fields, audience archetype extensions (mobility needs, energy profile), repeatability intent flag with series cadence, `Sub-type` row in DESIGN-STATE.md Quick Reference
**Addresses:** All brief extension table stakes (FEATURES.md); experience sub-type dispatch pattern (ARCHITECTURE.md Pattern 1 and 2)
**Avoids:** Incomplete brief data causing floor plan generation with fictitious venue constraints

### Phase 3: Experience Design Token Architecture
**Rationale:** Design tokens must be established before wireframe, critique, or handoff stages that consume them. The separate-file architecture decision is irreversible — retrofitting after downstream stages are written is the most expensive rework possible.
**Delivers:** `SYS-experience-tokens.json` with sonic (2 entries max), lighting (3 entries max), spatial (3 entries max), atmospheric (reference-only), print, and wayfinding categories; separate `SYS-experience-tokens.css` generated by an `--experience` flag on `tokens-to-css`; token count assertion (30 entries max); wayfinding token categories in system stage
**Addresses:** Wayfinding design tokens (FEATURES.md table stakes); vibe contract design system (FEATURES.md differentiator); multi-sensory token extensions (STACK.md)
**Avoids:** Token schema pollution (Pitfall 2), multi-sensory token overload (Pitfall 8)

### Phase 4: Flow Diagrams (Temporal and Spatial)
**Rationale:** Temporal and spatial flow diagrams are dependencies of the floor plan wireframe, timeline wireframe, and production bible. Floor plan generation without a spatial flow diagram produces layout without design rationale. Run sheet generation without a temporal flow diagram produces timing without structure.
**Delivers:** Temporal flow diagram (Mermaid gantt or sequence showing attendee journey arcs), spatial flow diagram (Mermaid flowchart with zone nodes and crowd pressure annotations), both registered as flow artifacts in manifest
**Addresses:** Temporal flow and spatial flow table stakes (FEATURES.md); flow diagram dependency on floor plan (FEATURES.md dependency graph)
**Avoids:** Floor plan generated without spatial design rationale

### Phase 5: Wireframe Stage Extensions — Floor Plan and Timeline
**Rationale:** Floor plan is the single most expected deliverable. It gates safety critique, physical HIG, and advance document. Timeline wireframe pairs with run sheet in handoff. Both must exist before handoff stage can produce a complete production bible.
**Delivers:** FLP artifact (self-contained HTML with inline SVG, `viewBox="0 0 1500 1000"`, 1 SVG unit = 0.1m, mandatory scale bar, "SCHEMATIC ONLY" disclaimer, minimum stroke-width=3/font-size=14 rules, zone sizing proportional to venue capacity); TML artifact (Markdown with Mermaid gantt, `dateFormat HH:mm`, multi-section for multi-stage events)
**Addresses:** Floor plan wireframe and timeline wireframe table stakes (FEATURES.md); all FLP/TML artifact code specifications (STACK.md)
**Avoids:** SVG floor plan illegibility (Pitfall 3); coordinate system decisions locked here and not retrofittable

### Phase 6: Critique and HIG Extensions
**Rationale:** Safety critique and physical HIG can only run after the floor plan exists. They are review stages, not generation stages — they require upstream artifacts to evaluate. HIG for experience products replaces WCAG checks entirely with physical interface guidelines.
**Delivers:** Safety critique perspective (exit path clearance, crowd density per zone, first aid proximity, toilet ratio, accessible routing); physical HIG replacing WCAG when experience type detected (wayfinding legibility, acoustic zoning, queue UX, toilet ratio EN 16747, hydration provision, first aid coverage, accessible routes); permits and licensing checklist (questions, not compliance assertions)
**Addresses:** Safety critique perspective table stake (FEATURES.md); physical HIG differentiator (FEATURES.md); HIG replacement pattern (ARCHITECTURE.md Pattern 4)
**Avoids:** LLM regulatory hallucination (Pitfall 5) — every regulatory value carries `[VERIFY WITH LOCAL AUTHORITY]` tag

### Phase 7: Print Collateral Artifacts
**Rationale:** Event flyer is table stakes — its absence signals an incomplete pipeline to practitioners. Print artifacts require design tokens from Phase 3 and brand color decisions. This phase is isolated because print color space handling (CMYK approximation, prepress disclaimer) requires dedicated scope definition before any print artifact is authored.
**Delivers:** FLY artifact (self-contained HTML with CSS `@page { size: 210mm 297mm }`, bleed zone as dashed CSS border, safe zone at 5mm, CMYK approximation table, mandatory prepress disclaimer); POS artifact (A3 portrait); `physical` domain directory extension in `design.cjs`
**Addresses:** Event flyer artifact table stake (FEATURES.md); print spec output table stake (FEATURES.md); CSS `@page` and OKLCH-to-CMYK approach (STACK.md)
**Avoids:** Print color space mismatch (Pitfall 4) — "print-ready" phrase never used without disclaimer; scope established before workflow is authored

### Phase 8: Handoff — Production Bible
**Rationale:** Production bible is a composite document that aggregates outputs from all upstream stages. It is the completion artifact for the experience pipeline — equivalent to the TypeScript interface handoff for software products. It must be generated last because it references floor plan, timeline, run sheet, staffing plan, and HIG checklist.
**Delivers:** BIB artifact (structured markdown with: Event Overview, Venue and Site Plan, Schedule and Running Order, Staffing Plan, Artist Advance template, Technical Rider Summary, Budget Outline framework, Health and Safety with `[VERIFY WITH LOCAL AUTHORITY]` tags throughout, Sustainability Notes, Post-Event Review Template); run sheet as structured markdown table (time, duration, activity, owner, technical cue, contingency columns); staffing plan as role matrix derived from brief scale
**Addresses:** Production bible, run sheet, staffing plan, budget framework, post-event review template (FEATURES.md); BIB artifact generation approach (STACK.md); handoff replacement pattern (ARCHITECTURE.md)
**Avoids:** LLM regulatory hallucination (Pitfall 5) — disclaimer block from Phase 1 injected into every safety and licensing section

### Phase 9: Integration Validation and Regression Audit
**Rationale:** All 8 affected workflows have been modified. A full cross-type regression run is required to confirm that software, hardware, and hybrid project outputs are byte-identical to pre-milestone baselines, and that experience projects produce the full artifact set for each sub-type.
**Delivers:** Full smoke matrix pass (all 4 product types against all affected workflows); sub-type coverage validation (one project per sub-type exercised); regression assertions for all 14 branch sites; updated skill registry confirming no new workflow files were added
**Addresses:** Cross-type regression test coverage (Pitfall 7); default-else regression verification (Pitfall 1)
**Avoids:** Silent regression of software/hardware/hybrid behavior discovered by users post-release

### Phase Ordering Rationale

- Phase 1 before everything: regression infrastructure cannot be retrofitted; architecture decisions made here cannot be changed without cascading rework
- Phase 2 before Phase 3: token generation is parametrized by brief data (venue capacity drives spatial tokens, vibe drives lighting palette); tokens authored without brief data are fiction
- Phase 3 before Phase 4: flow diagrams consume design tokens for zone color annotations; token file must exist
- Phase 4 before Phase 5: floor plan requires spatial flow as layout rationale; timeline requires temporal flow as schedule structure
- Phase 5 before Phase 6: critique and HIG require the floor plan to evaluate; no layout means no safety review
- Phase 6 before Phase 8: HIG checklist is a required section of the production bible; HIG must be complete before BIB is assembled
- Phase 7 before Phase 8: flyer artifacts are referenced in the production bible handoff; print spec section requires them to exist
- Phase 9 last: all modifications complete before regression validation runs

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5 (Floor Plan and Timeline):** SVG spatial reasoning quality is an open empirical question — the coordinate system and constraint rules from PITFALLS.md reduce the risk but cannot eliminate LLM spatial generation variance. Recommend generating 2-3 example floor plans before committing to the prompt architecture.
- **Phase 7 (Print Collateral):** CSS `@page` browser compatibility varies (Chrome reliable, Firefox partial, Safari partial). Test print-to-PDF output in Chrome against A4 and A3 sizes before finalizing the artifact specification. CMYK approximation table implementation needs concrete design.
- **Phase 8 (Production Bible):** Composite document assembly from multiple upstream artifacts is the most complex handoff workflow in the pipeline. Aggregation logic needs explicit workflow design before implementation.

Phases with well-documented patterns (skip research-phase):
- **Phase 1 (Regression Infrastructure):** Established testing patterns; smoke matrix structure clearly defined in PITFALLS.md
- **Phase 2 (Brief Extensions):** Follows existing brief extension pattern from hardware type; field additions are additive
- **Phase 3 (Token Architecture):** DTCG 2025.10 spec verified; separate-file approach architecturally clear; token schemas fully specified in STACK.md
- **Phase 4 (Flow Diagrams):** Mermaid gantt and flowchart patterns established; extends existing flows skill
- **Phase 6 (Critique and HIG):** Physical HIG standards well-documented in PITFALLS.md and FEATURES.md; replacement pattern (ARCHITECTURE.md Pattern 4) is clear
- **Phase 9 (Integration Validation):** Standard regression validation; no new research needed

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies verified against MDN, Mermaid docs, DTCG 2025.10 spec, and direct codebase inspection. No npm packages involved — all capabilities confirmed native to existing pipeline. Browser compatibility for CSS `@page` documented with specific caveats. |
| Features | MEDIUM-HIGH | Table stakes verified against AllSeated, Social Tables, Cvent, Prismm feature sets and industry production documents. Differentiators inferred from PDE pipeline capabilities. Physical design standards (ESA, ADA, EAA) verified from authoritative sources. Sub-type feature scope is well-reasoned but not empirically validated against practitioner workflows. |
| Architecture | HIGH | Fully derivable from direct codebase inspection of all 14 pipeline branch sites. Hardware branching pattern is proven precedent. Sub-type-as-metadata decision is well-justified. Separate token file approach addresses a confirmed `tokens-to-css` limitation. |
| Pitfalls | HIGH (integration) / MEDIUM (LLM quality) | Pipeline integration pitfalls grounded in direct codebase inspection with specific branch site enumeration. SVG floor plan and print color space pitfalls are fundamental technical constraints. LLM regulatory hallucination risk is well-documented in general but cannot be quantified for specific output quality. |

**Overall confidence:** HIGH

### Gaps to Address

- **SVG spatial generation quality:** Research establishes the constraint framework but cannot predict actual LLM output quality for floor plans. Validate with example generation early in Phase 5 before finalizing prompt architecture. If quality is insufficient, fall back to template-based floor plan generation with LLM filling zone labels only.
- **CMYK approximation implementation:** The approach (hex fallback with sRGB annotation) is defined but how the approximation table is generated without npm packages needs concrete design. Resolve during Phase 3 when token schema is finalized — hex approximations for OKLCH brand colors can be documented inline in the token file.
- **Multi-stage festival timeline legibility:** Mermaid gantt with many parallel sections becomes illegible above ~20 items. For multi-day festivals with 4+ stages, one gantt per stage produces multiple TML artifacts per event. Manifest artifact naming convention for multi-stage events needs explicit design in Phase 4.
- **Hybrid-event dual-surface output:** The hybrid-event sub-type produces both software API handoff and production bible. How the handoff skill outputs both in a single pass — and how the manifest registers both artifact sets — needs explicit design. Research identifies the requirement; implementation design is deferred to Phase 8 planning.

---

## Sources

### Primary (HIGH confidence)
- MDN Web Docs: CSS `@page` — `size` property, physical units, `@media print`, confirmed `bleed`/`marks` not implemented (fetched 2026-03-21)
- MDN Web Docs: `device-cmyk()` — confirmed no browser support (fetched 2026-03-21)
- Mermaid documentation: Gantt diagrams (`dateFormat`, `axisFormat`, sections, milestones) and Timeline type limitations (fetched 2026-03-21)
- DTCG Format Module 2025.10 — confirmed arbitrary category names allowed; only `$type` and `$value` constrained (verified 2026-03-21)
- `bin/lib/design.cjs` (direct codebase inspection) — `DOMAIN_DIRS` array, `ensure-dirs`, `tokens-to-css` generic category iteration
- `templates/design-manifest.json` (direct codebase inspection) — `designCoverage` flags schema, artifact code pattern, `productType` enum values
- `workflows/brief.md`, `workflows/system.md`, `workflows/handoff.md` (direct codebase inspection) — product type branch sites, hardware conditional pattern
- Event Safety Alliance — crowd management, egress, and safety standards (authoritative industry body)
- IBM Event Design: signage and wayfinding — primary/secondary/tertiary sign hierarchy, legibility standards

### Secondary (MEDIUM confidence)
- AllSeated/Prismm, Social Tables/Cvent — floor plan, seating chart, and operations feature sets
- Canva and Figma official docs — 3mm bleed standard, PDF/X export, CMYK handling, standard flyer sizes
- Asana, SpotMe — run of show structure and operational column conventions
- Ticket Fairy — festival production guides, advance documents, site maps, vibe and moodboard frameworks
- Festival and Event Production resource site — industry-standard production document types
- vFairs, Monday.com — event budget line item categories, contingency fund conventions (10-15%)
- North American Signs, IBM Event Design — wayfinding best practices and sign hierarchy
- Sara Soueidan: SVG Coordinate Systems — `viewBox`, abstract coordinate system pattern

### Tertiary (LOW confidence)
- SaaSworthy feature comparison (AllSeated vs Social Tables) — general feature parity claims
- Grand Tents — festival tent layout and crowd flow zoning (practitioner blog)
- BitterSweet Creative — event branding guidelines and sensory experience design

---

*Research completed: 2026-03-21*
*Ready for roadmap: yes*
