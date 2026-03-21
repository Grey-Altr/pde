# Requirements: Platform Development Engine

**Defined:** 2026-03-21
**Core Value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.

## v0.11 Requirements

Requirements for Experience Product Type milestone. Each maps to roadmap phases.

### Foundation & Detection

- [ ] **FNDX-01**: PDE detects "experience" product type from brief prompt with 5 sub-types (single-night, multi-day, recurring-series, installation, hybrid-event)
- [ ] **FNDX-02**: All 14 pipeline workflow files updated with experience branch sites alongside existing software/hardware/hybrid conditionals
- [ ] **FNDX-03**: Cross-type regression smoke matrix established covering all 4 product types x critical pipeline paths
- [ ] **FNDX-04**: Sub-types implemented as parametric prompt attributes (not pipeline branches) — locked as Key Decision

### Brief Extensions

- [ ] **BREF-01**: Experience brief captures promise statement (one sentence an attendee tells a friend)
- [ ] **BREF-02**: Experience brief captures vibe contract (emotional arc with peak timing, energy level, aesthetic register)
- [ ] **BREF-03**: Experience brief captures audience archetype (crowd composition, mobility needs, group size, energy profile)
- [ ] **BREF-04**: Experience brief captures venue constraints (capacity, curfew, noise limits, load-in windows, fixed infrastructure)
- [ ] **BREF-05**: Experience brief captures repeatability intent (one-off vs series with cadence)

### Design System

- [ ] **DSYS-01**: Sonic design tokens generated (genre/BPM corridor, volume curve, system spec, transition strategy)
- [ ] **DSYS-02**: Lighting design tokens generated (color palette per zone/phase, intensity curve, fixture types, house lights protocol)
- [ ] **DSYS-03**: Spatial design tokens generated (zone definitions with mood, density targets, sightlines, material palette)
- [ ] **DSYS-04**: Thermal/atmospheric tokens generated (ventilation, outdoor/indoor transitions, haze levels)
- [ ] **DSYS-05**: Wayfinding design tokens generated (sign hierarchy, arrow/icon standards, legibility distances, outdoor contrast)
- [ ] **DSYS-06**: Brand coherence tokens generated (flyer → wristband → signage → merch identity, tone of voice, sensory signature)
- [ ] **DSYS-07**: Experience tokens stored in separate file (SYS-experience-tokens.json) to prevent schema pollution

### Flows

- [ ] **FLOW-01**: Temporal flow diagram generated (awareness → anticipation → arrival → immersion → peak → comedown → departure → afterglow)
- [ ] **FLOW-02**: Spatial flow diagram generated (entry funnel → zones → circulation → bottlenecks → emergency egress)
- [ ] **FLOW-03**: Social flow diagram generated (solo vs group, meeting points, stranger interaction, dancefloor density)
- [ ] **FLOW-04**: Spaces inventory JSON produced alongside flow diagrams for floor plan consumption

### Wireframe

- [ ] **WIRE-01**: Floor plan wireframe generated as SVG-in-HTML with zone boundaries, capacity annotations, flow arrows, infrastructure placement, accessibility routes
- [ ] **WIRE-02**: Timeline wireframe generated as gantt-style HTML with parallel tracks, operational beats, energy curve overlay
- [ ] **WIRE-03**: Floor plan and timeline registered in design-manifest.json with FPL/TML artifact codes

### Critique

- [ ] **CRIT-01**: Safety critique perspective checks crush risk, emergency egress time, medical coverage ratio, fire safety
- [ ] **CRIT-02**: Accessibility critique perspective checks step-free access, BSL, quiet/sensory zones, wheelchair platforms
- [ ] **CRIT-03**: Operations critique perspective checks bar capacity, changeover realism, cancellation contingency
- [ ] **CRIT-04**: Sustainability critique perspective checks reusable materials, transport options, food waste, power source
- [ ] **CRIT-05**: Licensing/legal critique perspective checks noise curfew, alcohol hours, public liability
- [ ] **CRIT-06**: Financial critique perspective checks break-even ticket count, partial-capacity scenarios
- [ ] **CRIT-07**: Community critique perspective checks local scene contribution, artist inclusion, neighborhood impact
- [ ] **CRIT-08**: All regulatory values include [VERIFY WITH LOCAL AUTHORITY] disclaimer

### HIG — Physical Interface Guidelines

- [ ] **PHIG-01**: Wayfinding audit checks signage at decision points, low-light readability, multilingual support
- [ ] **PHIG-02**: Acoustic zoning audit checks conversation-possible zones adjacent to high-volume areas
- [ ] **PHIG-03**: Queue UX audit checks wait time communication, weather protection, skip-queue tiers
- [ ] **PHIG-04**: Transaction speed audit checks bar order < 90s, entry processing < 30s per person targets
- [ ] **PHIG-05**: Toilet ratio audit checks minimum 1:75 (female), 1:100 (male)
- [ ] **PHIG-06**: Hydration audit checks free water points clearly signed
- [ ] **PHIG-07**: First aid audit checks trained staff reachable within 2min from any point

### Handoff — Production Bible

- [ ] **HDOF-01**: Advance document generated (load-in, sound check, doors, curfew, load-out, contact sheet, rider fulfillment)
- [ ] **HDOF-02**: Run sheet generated (minute-by-minute timeline, responsible person, technical cue, contingency notes)
- [ ] **HDOF-03**: Staffing plan generated (roles, headcount, shifts, briefing time, door policy, bar menu/pricing)
- [ ] **HDOF-04**: Budget framework generated (line-item costs, revenue at 60%/80%/100% capacity, break-even)
- [ ] **HDOF-05**: Post-event template generated (feedback collection, financial reconciliation, retrospective)
- [ ] **HDOF-06**: Print spec output for all collateral artifacts (bleed, safe area, DPI, color mode, trim size)

### Print Collateral

- [ ] **PRNT-01**: Event flyer generated as print-ready HTML at standard dimensions (A5, A4, Instagram square/story)
- [ ] **PRNT-02**: Series identity template generated with {{variable}} slots for recurring events
- [ ] **PRNT-03**: Festival program generated as multi-page HTML (schedule grid, artist bios, map, sponsors)
- [ ] **PRNT-04**: All print artifacts follow Awwwards-level composition (focal point, negative space, type hierarchy, max 2-3 typefaces)

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
| FNDX-01 | Pending | Pending |
| FNDX-02 | Pending | Pending |
| FNDX-03 | Pending | Pending |
| FNDX-04 | Pending | Pending |
| BREF-01 | Pending | Pending |
| BREF-02 | Pending | Pending |
| BREF-03 | Pending | Pending |
| BREF-04 | Pending | Pending |
| BREF-05 | Pending | Pending |
| DSYS-01 | Pending | Pending |
| DSYS-02 | Pending | Pending |
| DSYS-03 | Pending | Pending |
| DSYS-04 | Pending | Pending |
| DSYS-05 | Pending | Pending |
| DSYS-06 | Pending | Pending |
| DSYS-07 | Pending | Pending |
| FLOW-01 | Pending | Pending |
| FLOW-02 | Pending | Pending |
| FLOW-03 | Pending | Pending |
| FLOW-04 | Pending | Pending |
| WIRE-01 | Pending | Pending |
| WIRE-02 | Pending | Pending |
| WIRE-03 | Pending | Pending |
| CRIT-01 | Pending | Pending |
| CRIT-02 | Pending | Pending |
| CRIT-03 | Pending | Pending |
| CRIT-04 | Pending | Pending |
| CRIT-05 | Pending | Pending |
| CRIT-06 | Pending | Pending |
| CRIT-07 | Pending | Pending |
| CRIT-08 | Pending | Pending |
| PHIG-01 | Pending | Pending |
| PHIG-02 | Pending | Pending |
| PHIG-03 | Pending | Pending |
| PHIG-04 | Pending | Pending |
| PHIG-05 | Pending | Pending |
| PHIG-06 | Pending | Pending |
| PHIG-07 | Pending | Pending |
| HDOF-01 | Pending | Pending |
| HDOF-02 | Pending | Pending |
| HDOF-03 | Pending | Pending |
| HDOF-04 | Pending | Pending |
| HDOF-05 | Pending | Pending |
| HDOF-06 | Pending | Pending |
| PRNT-01 | Pending | Pending |
| PRNT-02 | Pending | Pending |
| PRNT-03 | Pending | Pending |
| PRNT-04 | Pending | Pending |

**Coverage:**
- v0.11 requirements: 47 total
- Mapped to phases: 0
- Unmapped: 47

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 after initial definition*
