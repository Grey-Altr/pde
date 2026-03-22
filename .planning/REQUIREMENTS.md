# Requirements: Platform Development Engine

**Defined:** 2026-03-21
**Core Value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.

## v0.11 Requirements

Requirements for Experience Product Type milestone. Each maps to roadmap phases.

### Foundation & Detection

- [x] **FNDX-01**: PDE detects "experience" product type from brief prompt with 5 sub-types (single-night, multi-day, recurring-series, installation, hybrid-event)
- [x] **FNDX-02**: All 14 pipeline workflow files updated with experience branch sites alongside existing software/hardware/hybrid conditionals
- [x] **FNDX-03**: Cross-type regression smoke matrix established covering all 4 product types x critical pipeline paths
- [x] **FNDX-04**: Sub-types implemented as parametric prompt attributes (not pipeline branches) — locked as Key Decision

### Brief Extensions

- [x] **BREF-01**: Experience brief captures promise statement (one sentence an attendee tells a friend)
- [x] **BREF-02**: Experience brief captures vibe contract (emotional arc with peak timing, energy level, aesthetic register)
- [x] **BREF-03**: Experience brief captures audience archetype (crowd composition, mobility needs, group size, energy profile)
- [x] **BREF-04**: Experience brief captures venue constraints (capacity, curfew, noise limits, load-in windows, fixed infrastructure)
- [x] **BREF-05**: Experience brief captures repeatability intent (one-off vs series with cadence)

### Design System

- [x] **DSYS-01**: Sonic design tokens generated (genre/BPM corridor, volume curve, system spec, transition strategy)
- [x] **DSYS-02**: Lighting design tokens generated (color palette per zone/phase, intensity curve, fixture types, house lights protocol)
- [x] **DSYS-03**: Spatial design tokens generated (zone definitions with mood, density targets, sightlines, material palette)
- [x] **DSYS-04**: Thermal/atmospheric tokens generated (ventilation, outdoor/indoor transitions, haze levels)
- [x] **DSYS-05**: Wayfinding design tokens generated (sign hierarchy, arrow/icon standards, legibility distances, outdoor contrast)
- [x] **DSYS-06**: Brand coherence tokens generated (flyer → wristband → signage → merch identity, tone of voice, sensory signature)
- [x] **DSYS-07**: Experience tokens stored in separate file (SYS-experience-tokens.json) to prevent schema pollution

### Flows

- [x] **FLOW-01**: Temporal flow diagram generated (awareness → anticipation → arrival → immersion → peak → comedown → departure → afterglow)
- [x] **FLOW-02**: Spatial flow diagram generated (entry funnel → zones → circulation → bottlenecks → emergency egress)
- [x] **FLOW-03**: Social flow diagram generated (solo vs group, meeting points, stranger interaction, dancefloor density)
- [x] **FLOW-04**: Spaces inventory JSON produced alongside flow diagrams for floor plan consumption

### Wireframe

- [x] **WIRE-01**: Floor plan wireframe generated as SVG-in-HTML with zone boundaries, capacity annotations, flow arrows, infrastructure placement, accessibility routes
- [x] **WIRE-02**: Timeline wireframe generated as gantt-style HTML with parallel tracks, operational beats, energy curve overlay
- [x] **WIRE-03**: Floor plan and timeline registered in design-manifest.json with FLP/TML artifact codes

### Critique

- [x] **CRIT-01**: Safety critique perspective checks crush risk, emergency egress time, medical coverage ratio, fire safety
- [x] **CRIT-02**: Accessibility critique perspective checks step-free access, BSL, quiet/sensory zones, wheelchair platforms
- [x] **CRIT-03**: Operations critique perspective checks bar capacity, changeover realism, cancellation contingency
- [x] **CRIT-04**: Sustainability critique perspective checks reusable materials, transport options, food waste, power source
- [x] **CRIT-05**: Licensing/legal critique perspective checks noise curfew, alcohol hours, public liability
- [x] **CRIT-06**: Financial critique perspective checks break-even ticket count, partial-capacity scenarios
- [x] **CRIT-07**: Community critique perspective checks local scene contribution, artist inclusion, neighborhood impact
- [x] **CRIT-08**: All regulatory values include [VERIFY WITH LOCAL AUTHORITY] disclaimer

### HIG — Physical Interface Guidelines

- [x] **PHIG-01**: Wayfinding audit checks signage at decision points, low-light readability, multilingual support
- [x] **PHIG-02**: Acoustic zoning audit checks conversation-possible zones adjacent to high-volume areas
- [x] **PHIG-03**: Queue UX audit checks wait time communication, weather protection, skip-queue tiers
- [x] **PHIG-04**: Transaction speed audit checks bar order < 90s, entry processing < 30s per person targets
- [x] **PHIG-05**: Toilet ratio audit checks minimum 1:75 (female), 1:100 (male)
- [x] **PHIG-06**: Hydration audit checks free water points clearly signed
- [x] **PHIG-07**: First aid audit checks trained staff reachable within 2min from any point

### Handoff — Production Bible

- [x] **HDOF-01**: Advance document generated (load-in, sound check, doors, curfew, load-out, contact sheet, rider fulfillment)
- [x] **HDOF-02**: Run sheet generated (minute-by-minute timeline, responsible person, technical cue, contingency notes)
- [x] **HDOF-03**: Staffing plan generated (roles, headcount, shifts, briefing time, door policy, bar menu/pricing)
- [x] **HDOF-04**: Budget framework generated (line-item costs, revenue at 60%/80%/100% capacity, break-even)
- [x] **HDOF-05**: Post-event template generated (feedback collection, financial reconciliation, retrospective)
- [x] **HDOF-06**: Print spec output for all collateral artifacts (bleed, safe area, DPI, color mode, trim size)

### Print Collateral

- [x] **PRNT-01**: Event flyer generated as print-ready HTML at standard dimensions (A5, A4, Instagram square/story)
- [x] **PRNT-02**: Series identity template generated with {{variable}} slots for recurring events
- [x] **PRNT-03**: Festival program generated as multi-page HTML (schedule grid, artist bios, map, sponsors)
- [x] **PRNT-04**: All print artifacts follow Awwwards-level composition (focal point, negative space, type hierarchy, max 2-3 typefaces)

## Future Requirements

### Repeatability Template System

- **REPT-01**: All experience artifacts support {{variable}} template mode when repeatability_intent is true
- **REPT-02**: Template validation ensures variable slots produce valid output across editions

### Advanced Experience Features

- **ADVX-01**: Acoustic simulation integration via external tool recommendation
- **ADVX-02**: 3D venue rendering via Stitch or external tool integration
- **ADVX-03**: Ticketing platform integration recommendations in handoff

## Out of Scope

| Feature | Reason |
|---------|--------|
| 3D venue rendering | PDE produces HTML/CSS, not 3D geometry; recommend Stitch/Figma for visual refinement |
| Live seating chart / guest list management | Requires database and real-time updates incompatible with file-based state model |
| Ticketing and revenue system integration | Payment processing requires server infrastructure PDE explicitly avoids |
| Real-time crowd monitoring | Design-time tool, not live operations platform |
| Auto-generated performer/artist riders | Riders come from artists, not promoters; generating them creates fiction |
| Acoustic simulation | Requires specialized software (EASE, ODEON); PDE provides acoustic zoning tokens only |
| Regulatory permit generation | Jurisdiction-specific legal documents; harmful to generate without legal review |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FNDX-01 | Phase 74 | Complete |
| FNDX-02 | Phase 74 | Complete |
| FNDX-03 | Phase 74 | Complete |
| FNDX-04 | Phase 74 | Complete |
| BREF-01 | Phase 75 | Complete |
| BREF-02 | Phase 75 | Complete |
| BREF-03 | Phase 75 | Complete |
| BREF-04 | Phase 75 | Complete |
| BREF-05 | Phase 75 | Complete |
| DSYS-01 | Phase 76 | Complete |
| DSYS-02 | Phase 76 | Complete |
| DSYS-03 | Phase 76 | Complete |
| DSYS-04 | Phase 76 | Complete |
| DSYS-05 | Phase 76 | Complete |
| DSYS-06 | Phase 76, Phase 83 | Pending |
| DSYS-07 | Phase 76 | Complete |
| FLOW-01 | Phase 77 | Complete |
| FLOW-02 | Phase 77 | Complete |
| FLOW-03 | Phase 77 | Complete |
| FLOW-04 | Phase 77 | Complete |
| WIRE-01 | Phase 78 | Complete |
| WIRE-02 | Phase 78 | Complete |
| WIRE-03 | Phase 78 | Complete |
| CRIT-01 | Phase 79 | Complete |
| CRIT-02 | Phase 79 | Complete |
| CRIT-03 | Phase 79 | Complete |
| CRIT-04 | Phase 79 | Complete |
| CRIT-05 | Phase 79 | Complete |
| CRIT-06 | Phase 79 | Complete |
| CRIT-07 | Phase 79 | Complete |
| CRIT-08 | Phase 79 | Complete |
| PHIG-01 | Phase 79 | Complete |
| PHIG-02 | Phase 79 | Complete |
| PHIG-03 | Phase 79 | Complete |
| PHIG-04 | Phase 79 | Complete |
| PHIG-05 | Phase 79 | Complete |
| PHIG-06 | Phase 79 | Complete |
| PHIG-07 | Phase 79 | Complete |
| HDOF-01 | Phase 81 | Complete |
| HDOF-02 | Phase 81 | Complete |
| HDOF-03 | Phase 81 | Complete |
| HDOF-04 | Phase 81 | Complete |
| HDOF-05 | Phase 81 | Complete |
| HDOF-06 | Phase 81, Phase 83 | Pending |
| PRNT-01 | Phase 80 | Complete |
| PRNT-02 | Phase 80 | Complete |
| PRNT-03 | Phase 80 | Complete |
| PRNT-04 | Phase 80, Phase 83 | Pending |

**Coverage:**
- v0.11 requirements: 48 total (note: initial estimate was 47; actual count is 48 across 9 categories)
- Mapped to phases: 48
- Unmapped: 0

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 — traceability mapped to phases 74-81 during roadmap creation*
