# Feature Research

**Domain:** Experience product type — events, festivals, installations, recurring series in PDE's design pipeline
**Researched:** 2026-03-21
**Confidence:** MEDIUM-HIGH (table stakes verified against AllSeated/Social Tables/Cvent/Prismm feature sets and industry production documents; differentiators inferred from PDE's existing pipeline capabilities; physical design standards verified against Event Safety Alliance and ADA/EAA sources)

---

> **Scope note:** This file covers what v0.11 adds to PDE. All existing pipeline infrastructure (13-stage design pipeline, DTCG tokens, OKLCH color system, DESIGN-STATE.md, design-manifest.json, wireframe/mockup/critique/handoff skills, build orchestrator) is a stable dependency — not rebuilt here. Every feature described is either an extension of an existing pipeline stage or a new artifact type added alongside existing outputs.

---

## What "Experience" Means in PDE Context

An experience product is defined not by screens but by time, space, and bodies. Where a software product has a screen inventory and user flows, an experience product has a site plan and a run of show. Where software produces DTCG design tokens, an experience produces a production bible. The fundamental design question shifts from "what does the user see?" to "what does the attendee feel, in what sequence, in which part of the physical space?"

Key distinctions from software products that drive feature scope:

1. **Time is non-linear and multi-track.** A festival has simultaneous stages. An installation has dwell time, not navigation. A single-night event has a scripted sequence that cannot be re-run.
2. **Space is not virtualized.** Floors plan to scale. Acoustic zones interact physically. Crowd density is a safety variable, not a UX variable.
3. **Repeatability is a first-class design dimension.** A single-night event optimizes for peak experience. A recurring series optimizes for operational reproducibility and brand consistency across iterations.
4. **Physical collateral is a design deliverable.** Event flyers, wayfinding signage, stage backdrops, wristband designs, and festival programs are as much part of the design system as color tokens.
5. **Production documents are the handoff.** The equivalent of a TypeScript interface file is a run sheet. The equivalent of a component spec is a staffing plan.

---

## Feature Landscape

### Table Stakes (Users Expect These)

These features must exist for the `experience` product type to feel complete and professional. Missing any of them means the pipeline produces output that practicing event producers would immediately identify as inadequate.

| Feature | Why Expected | Complexity | Pipeline Stage | Notes |
|---------|--------------|------------|----------------|-------|
| **Experience sub-type detection** | Event producers distinguish single-night events from recurring series from festivals from installations — each has materially different planning requirements, risk profiles, and deliverable sets. Detection without sub-typing is useless. | LOW | Brief | 5 sub-types: `single-night`, `multi-day`, `recurring-series`, `installation`, `hybrid-event`. Detection from brief prompt heuristics. |
| **Promise statement and vibe contract** | Creative briefs for experiences always include an emotional statement of intent ("what should attendees feel?") and a description of the atmosphere. This is the experience equivalent of the product value proposition. Without it, all downstream design decisions are unmoored. | LOW | Brief | Vibe contract includes: energy level (intimate/social/euphoric/contemplative), aesthetic register, sensory priorities (sound-led, visual-led, spatial-led). |
| **Audience archetype definition** | Experience design is explicitly audience-shaped — a rave and a corporate conference with identical venue capacity require completely different spatial layouts, wayfinding approaches, and production specs. The brief must capture who is coming. | LOW | Brief | Extends existing audience framing in software brief. Adds: mobility/accessibility needs estimate, alcohol/substance context, average group size, age range and energy profile. |
| **Venue constraints capture** | Floor plan generation requires knowing structural facts: capacity (total, by zone), indoor/outdoor split, load-in access, power availability, ceiling height constraints for rigging, existing fixed infrastructure (bars, stages, pillars). Without this, floor plans are fiction. | MEDIUM | Brief | Structured venue profile attached to brief. User provides or PDE prompts for it. Treated as a required input, not optional context. |
| **Repeatability intent flag** | A recurring series requires every production document to be templated and reproducible. A one-off event can afford bespoke solutions. This is a fundamental fork in design strategy that must be declared at the brief stage. | LOW | Brief | Boolean + series cadence (weekly/monthly/annually). Downstream skills use this flag to decide whether outputs should be templates or single-use artifacts. |
| **Temporal flow diagram** | The event equivalent of a user flow. Maps attendee journey through time: pre-event arrival sequence, peak experience moments, transitions between programming, departure. Without temporal flow, the run sheet has no design foundation. | MEDIUM | Flows | New artifact type alongside existing Mermaid flowchart. Timeline-style Mermaid diagram (gantt or sequence) showing programming stages, transitions, support activities. |
| **Spatial flow diagram** | Maps how crowds move through the physical space: entry points, main circulation paths, choke points, zone transitions, egress routes. This is not floor plan geometry — it is annotated movement logic. Essential input for floor plan generation. | MEDIUM | Flows | Mermaid flowchart variant with zone nodes and directional edges annotated with crowd pressure estimates (high/medium/low). |
| **Floor plan wireframe** | The single most expected deliverable from any event design tool. Scaled 2D layout of venue showing: stage position(s), attendee zones, bar/vendor positions, toilet blocks, first aid, entry/exit points, backstage/load-in areas. AllSeated, Social Tables, Prismm, Tripleseat, EventDraw — all exist primarily to produce this artifact. | HIGH | Wireframe | New artifact type. HTML/CSS scaled floor plan rendered at lofi/midfi fidelity. Not architectural CAD — schematic clarity is the goal. Uses venue dimensions from brief. |
| **Timeline wireframe** | The event-day schedule rendered as a visual artifact, not just a text list. Shows: all programming tracks on parallel timeline axes, crew call times, vendor arrival windows, load-in, sound check, doors, programming, pack-down. Standard in any professional production package. | MEDIUM | Wireframe | New artifact type. HTML/CSS gantt-style timeline. Multi-track for festivals. Single-track for single-stage events. |
| **Production bible / advance document** | The master production document that venue, crew, and artists receive in advance. Contains: technical specifications, stage plot and input list, schedule, hospitality requirements, emergency procedures, contacts. This is industry-standard nomenclature — any professional event producer knows what an advance document is. | HIGH | Handoff | Replaces/extends software handoff (TypeScript interfaces). Structured markdown document with sections: event overview, technical specs, run sheet, staffing matrix, contacts, emergency procedures. |
| **Run sheet** | Minute-by-minute script of the event from crew perspective. Timing, owner, cue, contingency note per line item. Asana, Bizzabo, SpotMe, vFairs — all provide run sheet templates as table stakes. Not having one means the handoff is incomplete. | MEDIUM | Handoff | Structured markdown table. Columns: time, duration, activity, owner/dept, technical cue, contingency. Generated from temporal flow + brief + venue constraints. |
| **Staffing plan** | Who is needed, when, and where. Role matrix with: role name, headcount, call time, release time, reporting location, radio channel, key responsibilities. Missing this means the event cannot be operationally executed. | MEDIUM | Handoff | Markdown table. Roles derived from event type and scale. Recurring-series flag triggers template format rather than one-off. |
| **Event flyer as first-class artifact** | Practitioners producing an event always produce a promotional flyer. In Canva, Figma, Adobe Express — this is the first thing any event planner creates. PDE not producing one means the design pipeline is incomplete for this product type. | MEDIUM | New skill or Wireframe extension | Print-spec HTML artifact: 3mm bleed, safe margin, CMYK-safe colors flagged. Standard sizes: A5 portrait (148×210mm), A4 (210×297mm), US Letter. Text hierarchy: headline, supporting act/description, date/time/venue, ticket info. |
| **Safety perspective in critique** | The Event Safety Alliance, ADA (US), EAA (EU), and venue licensing requirements make safety a mandatory design review dimension for physical experiences. Crowd density, egress width, first aid access, fire exit clearance — these are not optional considerations. They are legal requirements. | MEDIUM | Critique | New critique perspective alongside existing UX/engineering/accessibility/business. Safety perspective checks: exit path clearance, first aid proximity, crowd density estimate per zone, toilet ratio (1:75 minimum), accessible routing. |
| **Wayfinding design tokens** | Any event with more than one zone requires wayfinding. The design system must include: sign hierarchy (primary/secondary/tertiary), arrow and iconography standards, legibility at distance (minimum font size for 5m reading distance), color contrast for outdoor daylight, and material specs (laminated PVC, foam board, fabric). | MEDIUM | System | Extension of existing DTCG token system. New token categories: `wayfinding.sign.primary`, `wayfinding.sign.secondary`, `wayfinding.type.legibility-distance`, `wayfinding.color.outdoor-contrast`. |
| **Event flyer print spec output** | When a flyer is designed, the handoff must include print-ready specifications: bleed (3mm), safe area (5mm inset), DPI (300 for offset, 150 for large-format), color mode (CMYK with Pantone fallback), file format (PDF/X-1a for print), trim size. Industry standard — Canva, Figma, and every print service provider requires these. | LOW | Handoff | Addendum to handoff document when print collateral artifacts exist. Lists spec per artifact. |

### Differentiators (Competitive Advantage)

These features distinguish PDE's experience product type from generic event planning tools and from what practitioners could produce manually. They leverage PDE's existing AI-powered pipeline capabilities in ways no floor plan SaaS or run sheet template can match.

| Feature | Value Proposition | Complexity | Pipeline Stage | Notes |
|---------|-------------------|------------|----------------|-------|
| **Vibe contract design system** | No event design tool generates a design system from an atmospheric brief. PDE can produce OKLCH color palettes tuned to emotional register (warm amber for intimate, electric cyan for euphoric), motion tokens (tempo-matched transitions), and spatial material specs from a vibe description. This is a differentiator because it connects the creative brief directly to the technical design system. | HIGH | System | Extends existing OKLCH palette generation. New token categories: lighting palette (gel colors, brightness zones), sonic palette (BPM range, genre anchor, reference tracks as notes), thermal/atmospheric (indoor/outdoor, seasonal context notes). |
| **Social flow diagram** | Beyond how people move (spatial) and when things happen (temporal), effective experience design plans how social dynamics unfold: when do strangers become communities, where do groups form and disperse, how does the programming create shared moments. This is understudied in event tooling and highly valued by experience designers. | MEDIUM | Flows | New flow diagram type. Mermaid or custom markdown. Maps: group formation points, shared moment choreography, social friction zones (queues), community hubs. |
| **Critique with operations and sustainability perspectives** | Event SaaS tools (AllSeated, Cvent) offer no design critique. PDE's critique engine is already differentiated in software; extending it to include operations viability (can the staffing plan actually execute this layout?) and sustainability impact (single-use materials, waste generation, carbon from transport) makes it genuinely more valuable than a floor plan tool alone. | MEDIUM | Critique | Additional critique perspectives: Operations (timing realism, staffing ratios, vendor SLAs), Sustainability (material reuse, travel impact, catering waste), Licensing/Financial (capacity vs license limit, revenue model sustainability). |
| **Repeatability-aware template generation** | For recurring-series events, every artifact PDE produces can include a templating layer: variable substitution for date, headliner, capacity, with a stable structural shell. No event planning tool produces AI-generated repeatable templates from a design brief. | HIGH | All stages | When `repeatability_intent: true`, handoff includes template versions of run sheet, staffing plan, and flyer with `{{variable}}` slots. Recurring-series flag triggers this path. |
| **Physical HIG (wayfinding, acoustic, queue UX)** | PDE's existing HIG audit checks WCAG 2.2 AA for screens. Extending this to physical space guidelines — minimum 5m sign legibility, acoustic zone separation, queue maximum dwell time standards, toilet ratio (1:75), hydration station placement (1 per 500), first aid proximity (max 3 minutes walk) — gives practitioners a checklist no other AI tool provides. | HIGH | HIG | New HIG mode for experience product type. Physical interface guidelines (PIGs) parallel to WCAG for screens. Sources: Event Safety Alliance, ADA, Purple Guide (UK). |
| **Series identity template for festivals/recurring events** | A single event needs one flyer. A recurring series needs a visual identity template: consistent typographic lockup, date/headliner variable slots, color themes per edition that remain within brand system. Canva offers templates but not AI-generated brand-coherent templates from a vibe brief. | HIGH | New artifact | New artifact type: series-identity-template.html. Same print spec as flyer but with explicit `{{variable}}` slots and a style guide section documenting which elements are fixed vs flexible per edition. |
| **Festival program as structured artifact** | Multi-day events need a program: schedule grids, artist/speaker bios, venue map reference, sponsor acknowledgements, rules/policies. No AI tool generates a coherent program from a brief and a schedule. PDE can produce a structured HTML program that is both readable and print-spec. | HIGH | New artifact | New artifact type: festival-program.html. Composite document assembled from: temporal flow data, brief (headliners/artists), venue floor plan reference, brand design tokens. Print-spec: A5 booklet (folded A4), 4-8 pages. |
| **Post-event template in handoff** | Practitioners who run recurring events need a post-event debrief template: what worked, what didn't, attendance vs forecast, revenue vs budget, vendor performance, operational incidents, attendee feedback themes. Generating this template during design (not after the event) ensures it is tailored to the specific event type and design decisions. | LOW | Handoff | Section within production bible: post-event review template with pre-populated sections derived from the run sheet and staffing plan. |
| **Integrated budget line item generation** | No design tool generates a production budget framework from the design brief and floor plan. PDE can derive line items from the event type: venue rental, AV, lighting, staffing (from staffing plan), catering estimate, security ratio, insurance estimate, licensing (ASCAP/BMI for music events), print collateral. Not financial advice — a structured starting framework that practitioners complete. | MEDIUM | Handoff | Budget framework section in handoff. Line items derived from brief sub-type and scale (capacity). Includes: contingency flag (10-15% of total), licensing reminders (music: ASCAP/BMI, venue: PRS), insurance note (liability typically required by venue). |

### Anti-Features (Avoid These in v0.11)

These features seem natural for an experience product type but create scope, architectural, or quality problems that outweigh their value.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **3D venue rendering** | AllSeated/Prismm offer 3D walkthroughs — users may expect this | PDE produces HTML/CSS artifacts, not 3D geometry. Producing accurate 3D venue models requires either CAD data (user-provided) or parameterized 3D generation far outside the current system. Attempting it produces low-quality, misleading output. | Produce high-quality 2D floor plans at midfi/hifi fidelity with clear spatial annotation. This is what practitioners actually need for operational decision-making. Reference that Stitch (Google's design tool) or Figma can be used for visual refinement via existing `--use-stitch` flag. |
| **Live seating chart / guest list management** | Social Tables' primary feature — users know it | PDE is a design pipeline, not a data management system. Guest list management requires a database, real-time updates, and operational tooling that is fundamentally incompatible with PDE's file-based state model. | Handoff includes a seating chart schema (structured markdown zone/table layout) that can be imported into Airtable, Notion, or Social Tables. PDE designs the layout; operational tools manage the data. |
| **Ticketing and revenue system integration** | Event producers ask "what about ticketing?" | Out of scope at the plugin layer. Ticketing involves payment processing, customer data, PCI compliance, real-time inventory — all require server infrastructure PDE explicitly avoids. | Brief captures target ticket price and capacity as design constraints. Budget framework in handoff includes a ticketing platform recommendation line item (e.g., Eventbrite, DICE, Fever). |
| **Real-time crowd monitoring** | AI-powered crowd flow simulation sounds relevant | Requires live sensor data, real-time processing, and continuous updates. PDE is a design tool, not a live event operations platform. This conflates the design phase (what PDE addresses) with the operational phase (what venue management software addresses). | Floor plan wireframe includes static crowd density annotations (high/medium/low zones) derived from spatial flow analysis. This is design-time guidance, not runtime monitoring. |
| **Auto-generated performer/artist riders** | "PDE could generate technical riders for artists" | A technical rider is an artist's requirements document — it comes from the artist, not the promoter. Auto-generating it would produce fictitious requirements that could harm real production relationships. | Handoff includes an advance document template with a section structured to receive rider information. The advance document is the promoter's response to riders, not the rider itself. |
| **Acoustic simulation** | Physical acoustic design sounds like natural scope | Accurate acoustic modeling requires specialized software (EASE, ODEON, Ramsete), room impulse response data, and acoustic engineering expertise. PDE cannot produce valid acoustic models. Attempting to do so risks producing output that practitioners would trust to their detriment. | Design system includes acoustic zoning tokens (zone:stage-wash, zone:conversation, zone:silent) that define intent and inform speaker placement rationale. Note the limitation explicitly in the HIG output. |
| **Regulatory permit generation** | "PDE could draft permit applications" | Permits are jurisdiction-specific legal documents. Generating them without legal review is harmful — practitioners might submit PDE output directly. Venue capacity limits, noise ordinances, liquor licenses, and fire safety permits all require local authority verification. | HIG output includes a permits and licensing checklist: categories of permits typically required by event sub-type, with a clear note that local authority verification is required and PDE output is not a legal document. |
| **Social media content generation for events** | "Generate the promotional content too" | Social media copy, caption writing, and hashtag strategy are outside the design pipeline scope. Mixing them in risks making the handoff document unwieldy and dilutes the production-focused value of the experience product type. | Flyer and series identity artifacts are print-first but render to screen sizes. Flyer HTML artifacts can be screenshot at 1:1 for Instagram square or cropped for story format — this is noted in the flyer artifact spec. |

---

## Feature Dependencies

```
[Brief: experience sub-type + venue constraints]
    └──required-by──> [Flows: temporal flow diagram]
    └──required-by──> [Flows: spatial flow diagram]
    └──required-by──> [Wireframe: floor plan]
    └──required-by──> [Wireframe: timeline wireframe]
    └──required-by──> [System: vibe contract design system]
    └──required-by──> [Handoff: production bible]
    └──required-by──> [Handoff: staffing plan]
    └──required-by──> [Handoff: budget framework]

[Flows: spatial flow diagram]
    └──required-by──> [Wireframe: floor plan]
              └──required-by──> [Critique: safety perspective]
              └──required-by──> [HIG: physical interface guidelines]
              └──required-by──> [Handoff: advance document]

[Flows: temporal flow diagram]
    └──required-by──> [Wireframe: timeline wireframe]
              └──required-by──> [Handoff: run sheet]

[System: vibe contract design tokens]
    └──required-by──> [Wireframe: event flyer]
    └──required-by──> [Wireframe: series identity template]
    └──enhances──> [Wireframe: floor plan] (zone color coding)

[Brief: repeatability_intent = true]
    └──triggers──> [template output mode across all stages]
              └──modifies──> [Handoff: run sheet → run sheet template with {{variables}}]
              └──modifies──> [Handoff: staffing plan → staffing template]
              └──modifies──> [Wireframe: flyer → series identity template]

[Wireframe: floor plan + timeline wireframe]
    └──required-by──> [Mockup: hi-fi interactive versions]
              └──required-by──> [Handoff: advance document (embeds floor plan reference)]

[Critique: safety + operations + sustainability perspectives]
    └──depends-on──> [Wireframe: floor plan] (safety checks require layout)
    └──depends-on──> [Handoff: staffing plan draft] (operations checks require staffing ratios)

[HIG: physical interface guidelines]
    └──depends-on──> [Wireframe: floor plan]
    └──depends-on──> [System: wayfinding tokens]
    └──produces──> [permits and licensing checklist]

[Handoff: production bible]
    └──aggregates──> [Handoff: run sheet]
    └──aggregates──> [Handoff: staffing plan]
    └──aggregates──> [Handoff: budget framework]
    └──aggregates──> [HIG: physical interface guidelines output]
    └──aggregates──> [Wireframe: floor plan reference]
    └──aggregates──> [Handoff: post-event review template]
```

### Dependency Notes

- **Brief is the master input:** Venue constraints, sub-type, and repeatability intent all originate in the brief. All downstream stages gate on brief completion. The experience brief is more data-dense than the software brief because physical constraints (venue dimensions, power, capacity) must be declared early, not inferred.
- **Floor plan gates several stages:** Safety critique, physical HIG, and advance document all require the floor plan to exist. Floor plan in turn requires spatial flow diagram (which requires brief venue constraints). This three-stage dependency chain is the deepest critical path in the experience pipeline.
- **Repeatability intent forks output format:** When `repeatability_intent: true`, the handoff skill must produce template-format outputs rather than completed documents. This is a mode switch, not a new skill — the same skills run but with a different output disposition.
- **Vibe contract enables design system coherence:** Without the vibe contract, the design system produces generic tokens. The vibe contract (energy, aesthetic register, sensory priority) is what makes the OKLCH palette choices and lighting token values meaningful rather than arbitrary.
- **Flyer requires design system tokens:** Print collateral must use the design system color tokens (OKLCH converted to CMYK-safe values). Flyer generation before system generation produces inconsistent brand artifacts.
- **Production bible is a composite document:** The advance document/production bible aggregates outputs from multiple stages (run sheet from temporal flow, staffing plan from brief scale, floor plan reference from wireframe, HIG checklist). It should be generated last in the handoff stage, after all upstream artifacts exist.

---

## MVP Definition (for v0.11 Milestone)

### Launch With (v0.11 core — minimum to make experience product type credible)

These are the features without which an event producer would look at PDE's output and say "this is missing the core deliverable."

- [ ] **Experience sub-type detection (5 sub-types)** — gate for all other features; without it, nothing downstream is differentiated
- [ ] **Brief extensions: promise statement, vibe contract, audience archetype, venue constraints, repeatability intent** — foundational inputs; floor plan generation and all downstream stages require them
- [ ] **Temporal flow diagram** — experience equivalent of user flow; must exist before run sheet can be generated
- [ ] **Spatial flow diagram** — required input for floor plan; cannot generate credible floor plan layout without it
- [ ] **Floor plan wireframe artifact** — the single most expected deliverable for any experience product; its absence makes the pipeline feel fundamentally incomplete
- [ ] **Timeline wireframe artifact** — production schedule visualization; pairs with run sheet in handoff
- [ ] **Production bible / advance document** — the experience equivalent of the TypeScript handoff; without it the design pipeline has no completion artifact
- [ ] **Run sheet** — required by every professional event production team; component of production bible
- [ ] **Staffing plan** — required operational deliverable; component of production bible
- [ ] **Safety critique perspective** — non-optional for physical experiences with liability implications
- [ ] **Event flyer artifact (print-spec HTML)** — first thing any event producer creates; absence signals the pipeline is incomplete for experience products
- [ ] **Wayfinding design tokens in system stage** — any multi-zone event requires wayfinding; missing tokens means the design system does not cover physical collateral

### Add After Validation (v0.11.x — once core pipeline is working)

- [ ] **Vibe contract design system (sonic, lighting, atmospheric tokens)** — high value but requires core pipeline to be stable first; the token extension is additive
- [ ] **Social flow diagram** — differentiator; add when temporal and spatial flows are working and users request social dimension
- [ ] **Operations and sustainability critique perspectives** — add once safety perspective is shipped and tested
- [ ] **Physical HIG (wayfinding, acoustic, queue UX, toilet ratio, hydration)** — add when floor plan generation is reliable enough to run HIG checks against
- [ ] **Budget framework in handoff** — add once production bible structure is stable; line items depend on brief sub-type being reliably detected
- [ ] **Post-event review template in handoff** — low complexity; add once production bible format is finalized

### Future Consideration (v0.12+ or later experience iterations)

- [ ] **Series identity template artifact** — high complexity; requires repeatability flag to be working and tested before adding template-mode output
- [ ] **Festival program artifact** — composite document requiring multiple upstream artifacts; defer until multi-artifact assembly is validated
- [ ] **Repeatability-aware template generation across all stages** — the `{{variable}}` template mode is architecturally significant; defer until single-run pipeline is stable
- [ ] **Licensing/financial critique perspective** — requires legal domain knowledge that needs careful scoping to avoid harmful advice

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Experience sub-type detection | HIGH — gates everything | LOW — heuristic classification | P1 |
| Brief extensions (vibe, venue, repeatability) | HIGH — foundational inputs | MEDIUM — new structured fields in brief workflow | P1 |
| Temporal flow diagram | HIGH — core design artifact | MEDIUM — new Mermaid diagram type in flows skill | P1 |
| Spatial flow diagram | HIGH — floor plan dependency | MEDIUM — new Mermaid variant in flows skill | P1 |
| Floor plan wireframe | HIGH — most expected deliverable | HIGH — new HTML/CSS artifact type with scale constraints | P1 |
| Timeline wireframe | HIGH — production schedule visualization | MEDIUM — HTML/CSS gantt-style, simpler than floor plan | P1 |
| Production bible / advance document | HIGH — completion artifact for handoff | HIGH — composite document aggregating multiple stage outputs | P1 |
| Run sheet | HIGH — required by every production team | MEDIUM — structured markdown table from temporal flow | P1 |
| Staffing plan | HIGH — operational deliverable | MEDIUM — role matrix derived from brief scale | P1 |
| Safety critique perspective | HIGH — liability-relevant, non-optional | MEDIUM — new critique perspective with checklist | P1 |
| Event flyer artifact (print-spec HTML) | HIGH — first deliverable any planner creates | MEDIUM — new artifact type with print spec parameters | P1 |
| Wayfinding design tokens | MEDIUM — required for multi-zone events | LOW — additive token categories to existing DTCG system | P1 |
| Physical HIG (wayfinding, queue, toilet ratio) | HIGH — unique differentiator | HIGH — new HIG mode with physical interface guidelines | P2 |
| Vibe contract design system extensions | HIGH — differentiator | HIGH — new token categories, color-emotion mapping | P2 |
| Operations critique perspective | MEDIUM — valuable, not critical path | MEDIUM — additional critique perspective | P2 |
| Sustainability critique perspective | MEDIUM — increasingly expected | MEDIUM — additional critique perspective | P2 |
| Budget framework in handoff | MEDIUM — helpful but not design | MEDIUM — line item generation from brief | P2 |
| Post-event review template | LOW-MEDIUM — useful for recurring series | LOW — additive section in handoff | P2 |
| Social flow diagram | MEDIUM — differentiator | MEDIUM — new flow type | P3 |
| Series identity template | HIGH value, recurring-series only | HIGH — template-mode output architecture | P3 |
| Festival program artifact | MEDIUM — multi-day events only | HIGH — composite assembly | P3 |
| Repeatability template generation (all stages) | HIGH for recurring series | HIGH — architectural mode switch | P3 |

**Priority key:**
- P1: Must have for v0.11 milestone to close
- P2: Include if implementation permits; strong v0.11.x candidates
- P3: Future milestone or v0.12 scope

---

## Competitor Feature Analysis

| Feature | AllSeated / Prismm | Social Tables / Cvent | Notion / Airtable | PDE v0.11 Approach |
|---------|-------------------|----------------------|-------------------|-------------------|
| Floor plan generation | Core product — to-scale 2D/3D, drag-and-drop furniture | Core product — to-scale 2D, seating chart integration | Template-based checklist, no spatial geometry | AI-generated HTML/CSS floor plan from venue constraints + spatial flow, lofi/midfi/hifi fidelity |
| Design brief | None | None | Freeform text blocks | Structured brief with sub-type detection, vibe contract, venue constraints — all feeding downstream pipeline |
| Design system / brand tokens | None | None | None | Full DTCG token extension with wayfinding, lighting, sonic, atmospheric categories |
| Timeline / run sheet | Operations module (AllSeated Ops) | Limited | Template tables in Notion/Airtable | AI-generated run sheet from temporal flow diagram — structured markdown with timing, owner, contingency columns |
| Staffing plan | None | Limited volunteer management | Custom Airtable bases | AI-generated role matrix from brief scale and event sub-type |
| Design critique | None | None | None | 7-perspective critique including safety (unique to PDE) |
| Flyer / print collateral | None | None | Canva integration | Print-spec HTML flyer as first-class pipeline artifact — bleed, safe area, CMYK notes, standard sizes |
| Wayfinding design | None | None | None | Wayfinding design token system + HIG physical guidelines |
| Post-event template | None | None | Manual | Auto-generated post-event review template tailored to event design decisions |
| Repeatability / series | No template mode | No template mode | Manual template copying | `repeatability_intent` flag triggers template-mode output across all pipeline stages |
| Safety checklist | Guest flow tools only | Seating compliance | None | Dedicated safety critique perspective with ADA/EAA/ESA standards |

**Key differentiation:** All existing tools are specialized operations platforms — floor plan SaaS, database templates, or print design apps. None of them connect a creative brief to a coherent design system, generate layout artifacts from flow analysis, and produce a complete production bible. PDE's differentiator is the connected pipeline — every stage feeds the next, and the entire output set emerges from a single brief.

---

## Sources

- [Social Tables / Cvent Event Diagramming — feature set](https://www.socialtables.com/) — floor plan, seating chart, collaboration features (HIGH confidence — official product)
- [AllSeated / Prismm — 2D/3D diagramming features](https://www.prismm.com/) — 360 scanning, VR walkthroughs, ops module (HIGH confidence — official product)
- [AllSeated vs Social Tables comparison — SaaSworthy](https://www.saasworthy.com/compare/social-tables-vs-allseated?pIds=8310,10000) — feature comparison matrix (MEDIUM confidence)
- [Best Event Floor Plan Software — The Seat Co.](https://theseatco.com/blog/best-event-floor-plan-softwares/) — market landscape (MEDIUM confidence)
- [Figma print specifications — official Figma docs](https://www.figma.com/resource-library/flyer-sizes/) — flyer sizes, bleed, print spec (HIGH confidence — official)
- [Canva bleed and crop marks — official Canva help](https://www.canva.com/help/margins-bleed-crop-marks/) — 3mm bleed standard, PDF/X export, CMYK (HIGH confidence — official)
- [Asana run of show template](https://asana.com/templates/run-of-show) — run sheet structure, columns, operational use (MEDIUM confidence)
- [SpotMe — event run of show guide](https://spotme.com/blog/event-run-of-show-template/) — timing, ownership, technical cues, contingency structure (MEDIUM confidence)
- [Ticket Fairy — festival production definitive guide](https://www.ticketfairy.com/blog/festival-production-the-definitive-guide-for-producers) — technical riders, advance documents, site maps (MEDIUM confidence)
- [Ticket Fairy — advance festival planning](https://www.ticketfairy.com/blog/advance-festival-planning-and-checklists-ensuring-nothing-is-overlooked) — advancing process, production documents (MEDIUM confidence)
- [Event Safety Alliance — standards and guidance](https://eventsafetyalliance.org/standards-guidance) — crowd management, egress, safety standards (HIGH confidence — authoritative industry body)
- [Cvent — event planning accessibility](https://www.cvent.com/en/blog/events/event-planning-accessibility-tips-and-best-practices) — ADA, EAA, WCAG 2.2 for events (MEDIUM confidence)
- [North American Signs — wayfinding best practices 2025](https://northamericansigns.com/wayfinding-sign-systems-best-practices-for-2025/) — sign hierarchy, 3-second processing, tiered system (MEDIUM confidence)
- [IBM Event Design — signage and wayfinding](https://www.ibm.com/design/event/architecture/signage-wayfinding/) — primary/secondary/tertiary sign hierarchy, legibility at distance (HIGH confidence — authoritative design source)
- [Ticket Fairy — sound and sight brand building](https://www.ticketfairy.com/blog/2025/08/24/sound-sight-brand-building-a-cohesive-festival-identity/) — sonic palette, visual identity system for festivals (MEDIUM confidence)
- [BitterSweet Creative — event branding guidelines](https://www.bittersweetcreative.com/journal/event-branding-guidelines-to-transform-your-next-event) — visual identity, color palette, sensory experience (MEDIUM confidence)
- [Airtable event planning templates](https://www.airtable.com/templates/event-planning) — run sheets, budgets, guest lists, vendor management structure (MEDIUM confidence)
- [Notion event planning templates — NotionApps 2025](https://www.notionapps.com/blog/best-notion-templates-event-planners-2025) — timeline, volunteer scheduling, sponsor management (MEDIUM confidence)
- [Grand Tents — festival tent layout crowd flow tips](https://www.grandtentsandevents.com/blog/festival-tent-layout-secrets-maximizing-space-for-better-guest-flow-and-experience) — crowd flow zoning, acoustic considerations, lighting zones (MEDIUM confidence)
- [vFairs — event budget guide](https://www.vfairs.com/blog/event-budget/) — line item categories, contingency fund (10-15%), hidden costs (MEDIUM confidence)
- [Monday.com — event budget templates 2026](https://monday.com/blog/project-management/event-budget-template/) — staffing, AV, insurance, licensing line items (MEDIUM confidence)
- [Ticket Fairy — pre-visualising festival vibe moodboards](https://www.ticketfairy.com/blog/pre-visualising-the-festival-vibe-moodboards-to-build-by) — vibe contract elements, creative direction (MEDIUM confidence)

---

*Feature research for: PDE v0.11 — Experience Product Type Pipeline Extensions*
*Researched: 2026-03-21*
