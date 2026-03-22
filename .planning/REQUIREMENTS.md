# Requirements: PDE v0.12 Business Product Type

**Defined:** 2026-03-22
**Core Value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.

## v0.12 Requirements

Requirements for the business product type milestone. Each maps to roadmap phases.

### Foundation

- [ ] **FOUND-01**: Manifest schema extended with `businessMode: false` and `businessTrack: null` top-level fields in design-manifest.json template
- [ ] **FOUND-02**: designCoverage schema grows from 16 to 20 fields with `hasBusinessThesis`, `hasMarketLandscape`, `hasServiceBlueprint`, `hasLaunchKit`
- [ ] **FOUND-03**: `launch/` subdirectory added to `.planning/design/` via `ensure-dirs` in design.cjs
- [ ] **FOUND-04**: `references/business-track.md` created with track vocabulary, depth thresholds, and artifact format differences for solo_founder/startup_team/product_leader
- [ ] **FOUND-05**: `references/launch-frameworks.md` created with business artifact templates (lean canvas, pitch deck slides, service blueprint lanes, pricing config schema)
- [ ] **FOUND-06**: `references/business-financial-disclaimer.md` created with structural placeholder patterns — never dollar amounts, always `[YOUR_X]` format
- [ ] **FOUND-07**: `references/business-legal-disclaimer.md` created with legal checklist pattern — service recommendations only, never generated legal documents

### Detection & Brief

- [ ] **BRIEF-01**: `brief.md` detects business intent from project description keyword signals and sets `businessMode: true` in manifest
- [ ] **BRIEF-02**: User track selection (solo_founder / startup_team / product_leader) stored as `businessTrack` in manifest, with track-specific vocabulary and depth applied downstream
- [ ] **BRIEF-03**: Business thesis statement generated as BTH artifact in `strategy/` directory with structured problem/solution/market/unfair-advantage framing
- [ ] **BRIEF-04**: Lean Canvas generated as 9-box structured output with confidence levels per hypothesis (validated/assumed/unknown) — anchored to BTH artifact
- [ ] **BRIEF-05**: Domain strategy capture (naming, domain availability notes, brand positioning seeds) included in brief output for downstream brand system consumption
- [ ] **BRIEF-06**: `hasBusinessThesis` coverage flag set in designCoverage after BTH artifact creation
- [ ] **BRIEF-07**: Financial content in brief uses structural placeholders only per `business-financial-disclaimer.md` — no dollar amounts generated

### Market Analysis

- [ ] **MRKT-01**: `competitive.md` produces MLS (Market Landscape) artifact with TAM/SAM/SOM sizing (user-provided sources only, `[Source required]` when absent)
- [ ] **MRKT-02**: Competitive positioning matrix generated as 2x2 quadrant diagram (Mermaid or ASCII) with differentiation analysis
- [ ] **MRKT-03**: `opportunity.md` extends RICE scoring with business initiative framing — unit economics inputs (LTV formula, CAC ceiling, payback period at 3 churn scenarios) as structural placeholders
- [ ] **MRKT-04**: `hasMarketLandscape` coverage flag set in designCoverage after MLS artifact creation
- [ ] **MRKT-05**: Market landscape content adapts depth per `businessTrack` (solo: 1-page summary, startup: competitive deep-dive, leader: build-vs-buy analysis)

### Operational Design

- [ ] **OPS-01**: `flows.md` produces SBP (Service Blueprint) artifact as 5-lane Mermaid sequence diagram (customer actions, frontstage, line of visibility, backstage, support processes)
- [ ] **OPS-02**: GTM channel flow artifact produced as acquisition → conversion → retention Mermaid flowchart with channel priority annotations
- [ ] **OPS-03**: `hasServiceBlueprint` coverage flag set in designCoverage after SBP artifact creation
- [ ] **OPS-04**: Service blueprint and GTM flow depth adapt per `businessTrack` (solo: single-product flow, startup: multi-channel, leader: cross-functional)

### Brand & Visual

- [ ] **BRAND-01**: `system.md` produces MKT (Brand/Marketing System) artifact with positioning statement, tone of voice spectrum, and visual differentiation rationale
- [ ] **BRAND-02**: Brand system tokens extend existing DTCG output with marketing-specific token group (brand voice, campaign palette variants)
- [ ] **BRAND-03**: Positioning statement and tone of voice feed downstream into landing page wireframe and pitch deck content

### Launch Artifacts

- [ ] **LAUNCH-01**: `wireframe.md` produces LDP (Landing Page) artifact in deployable-spec format with Next.js component mapping (hero, features, pricing, CTA, footer sections)
- [ ] **LAUNCH-02**: STR (Stripe Pricing Config) artifact generated with Stripe-compatible schema (product names, price amounts as placeholders, billing intervals, trial periods, checkout mode)
- [ ] **LAUNCH-03**: Pitch deck outline generated in YC/Sequoia format (10-slide default, expandable to 13) with track-specific depth (solo: 10 slides, startup: 12-15, leader: internal business case format)
- [ ] **LAUNCH-04**: Landing page wireframe consumes brand system tokens (Phase 5) and GTM flow (Phase 4) for copy framing
- [ ] **LAUNCH-05**: Pricing config references Lean Canvas revenue streams block and competitive pricing landscape
- [ ] **LAUNCH-06**: All launch artifacts stored in `.planning/design/launch/` directory, not in `ux/` or `visual/`

### Quality Review

- [ ] **QUAL-01**: `critique.md` adds 4 business critique perspectives: unit economics viability, GTM-ICP fit, pricing psychology, investor readiness
- [ ] **QUAL-02**: Pitch coherence cross-check: lean canvas UVP matches pitch deck solution slide, canvas key metrics match traction slide
- [ ] **QUAL-03**: `hig.md` adds business communications HIG section: pitch deck readability, email cadence, content calendar structure guidelines
- [ ] **QUAL-04**: Business critique findings classified as standard severity levels (critical/major/minor/info) consistent with existing critique output

### Launch Kit Assembly

- [ ] **KIT-01**: `handoff.md` assembles LKT (Launch Kit) manifest artifact listing all business artifacts with paths, statuses, and deployment readiness flags
- [ ] **KIT-02**: CNT (Content Calendar) artifact produced as 30-day pre-launch / launch / post-launch skeleton with content category slots derived from GTM channel priorities
- [ ] **KIT-03**: OTR (Outreach/Email Sequence) artifact produced with onboarding sequence (5-7 emails, trigger/delay/CTA format, Resend-compatible) and investor outreach sequence (3 emails, gated on pitch deck completion)
- [ ] **KIT-04**: Domain strategy notes consolidated from brief capture into launch kit
- [ ] **KIT-05**: `hasLaunchKit` coverage flag set in designCoverage after LKT artifact creation — gates deploy stage
- [ ] **KIT-06**: Email sequence uses structural placeholders for personalization fields — never generates specific company names or partner references

### Deployment

- [ ] **DEPLOY-01**: New `workflows/deploy.md` created as Stage 14, conditionally appended to build orchestrator only when `businessMode === true`
- [ ] **DEPLOY-02**: Next.js landing page scaffold generated at `.planning/deploy-staging/landing-page/` with pinned versions (Next.js 16.2.1, Stripe v20, Resend 6.9.4, Tailwind v4), consuming LDP wireframe spec
- [ ] **DEPLOY-03**: Stripe pricing config scaffold generated with test-mode placeholder keys (`pk_test_REPLACE_WITH_YOUR_KEY`) — never live keys
- [ ] **DEPLOY-04**: Resend email template stubs generated from OTR sequence spec with React Email components
- [ ] **DEPLOY-05**: Vercel deployment invoked via `npx vercel --prod --no-wait` returning deployment URL without blocking session
- [ ] **DEPLOY-06**: Four mandatory human approval gates: (1) before Next.js scaffold write, (2) before Stripe config write, (3) before Resend template generation, (4) before Vercel deploy command
- [ ] **DEPLOY-07**: All deployment artifacts stored in `.planning/deploy-staging/` with generated `.gitignore` entry — never in `.planning/design/`
- [ ] **DEPLOY-08**: `/pde:deploy` slash command created as entry point for Stage 14
- [ ] **DEPLOY-09**: Deploy skill tracks deployment status in `deploy-manifest.json` with `review_required: true` per artifact

### Pipeline Integrity

- [ ] **INTG-01**: All 14+ designCoverage-writing workflows verified to include all 20 fields in their write calls (pass-through-all pattern preserved)
- [ ] **INTG-02**: Non-business product types (software, hardware, hybrid, experience) produce byte-identical manifest output to pre-v0.12 baseline when `businessMode === false`
- [ ] **INTG-03**: `business:software` composition produces both software-specific and business-specific artifacts in single pipeline run
- [ ] **INTG-04**: `business:hardware` composition produces both hardware-specific and business-specific artifacts in single pipeline run
- [ ] **INTG-05**: `business:experience` composition produces both experience-specific and business-specific artifacts in single pipeline run
- [ ] **INTG-06**: Deploy workflow halts at each approval gate without proceeding when user declines — no partial deployment
- [ ] **INTG-07**: Nyquist regression tests cover all composition cases with structural assertions
- [ ] **INTG-08**: `businessTrack` branching consistency verified across all modified workflows — `grep -rn "businessTrack"` hit count matches `grep -rn "businessMode"` hit count in workflows/

## Future Requirements

Deferred to v0.12.x or later. Tracked but not in current roadmap.

### Coherence & Intelligence

- **COH-01**: Unit economics auto-derivation from pricing spec (LTV formula, CAC ceiling, payback period at 3 churn scenarios)
- **COH-02**: GTM channel flow → content calendar → email sequence coherence wiring (channel priorities dictate calendar slots)
- **COH-03**: Business model → service blueprint alignment critique (revenue model vs support infrastructure check)
- **COH-04**: Investor email sequence dynamically references specific pitch deck slides
- **COH-05**: Lean Canvas confidence-level update mechanism through iterate skill passes

### Enterprise & Advanced

- **ENT-01**: Product leader OKR framing layer (deep enterprise vocabulary calibration across all stages)
- **ENT-02**: Repeatability / series launch template mode (parallel to experience's repeatability flag)
- **ENT-03**: Stripe MCP integration (`@stripe/mcp`) added to APPROVED_SERVERS for direct Stripe product/price management

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Autonomous deployment without approval gates | Every external write is irreversible; approval gates are architectural, not optional |
| Full financial model / P&L generation | LLM hallucination exceeds 15% in financial contexts; structural placeholders only |
| Legal document generation (ToS, Privacy Policy) | Legal checklist and service recommendations only — generating legal documents creates liability |
| Live market research data fetching | Violates offline-capable design model; methodology guide and placeholder slots instead |
| Multi-provider email integration | Resend only in v0.12; email sequence spec is provider-agnostic for manual import |
| Stripe live keys in generated scaffolding | Security risk; always test-mode placeholder keys |
| Multi-product-type business overlay validation beyond software/hardware/experience | Validate core compositions first; edge cases deferred |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | 84 | Pending |
| FOUND-02 | 84 | Pending |
| FOUND-03 | 84 | Pending |
| FOUND-04 | 84 | Pending |
| FOUND-05 | 84 | Pending |
| FOUND-06 | 84 | Pending |
| FOUND-07 | 84 | Pending |
| BRIEF-01 | 85 | Pending |
| BRIEF-02 | 85 | Pending |
| BRIEF-03 | 85 | Pending |
| BRIEF-04 | 85 | Pending |
| BRIEF-05 | 85 | Pending |
| BRIEF-06 | 85 | Pending |
| BRIEF-07 | 85 | Pending |
| MRKT-01 | 86 | Pending |
| MRKT-02 | 86 | Pending |
| MRKT-03 | 86 | Pending |
| MRKT-04 | 86 | Pending |
| MRKT-05 | 86 | Pending |
| OPS-01 | 87 | Pending |
| OPS-02 | 87 | Pending |
| OPS-03 | 87 | Pending |
| OPS-04 | 87 | Pending |
| BRAND-01 | 88 | Pending |
| BRAND-02 | 88 | Pending |
| BRAND-03 | 88 | Pending |
| LAUNCH-01 | 89 | Pending |
| LAUNCH-02 | 89 | Pending |
| LAUNCH-03 | 89 | Pending |
| LAUNCH-04 | 89 | Pending |
| LAUNCH-05 | 89 | Pending |
| LAUNCH-06 | 89 | Pending |
| QUAL-01 | 90 | Pending |
| QUAL-02 | 90 | Pending |
| QUAL-03 | 90 | Pending |
| QUAL-04 | 90 | Pending |
| KIT-01 | 91 | Pending |
| KIT-02 | 91 | Pending |
| KIT-03 | 91 | Pending |
| KIT-04 | 91 | Pending |
| KIT-05 | 91 | Pending |
| KIT-06 | 91 | Pending |
| DEPLOY-01 | 92 | Pending |
| DEPLOY-02 | 92 | Pending |
| DEPLOY-03 | 92 | Pending |
| DEPLOY-04 | 92 | Pending |
| DEPLOY-05 | 92 | Pending |
| DEPLOY-06 | 92 | Pending |
| DEPLOY-07 | 92 | Pending |
| DEPLOY-08 | 92 | Pending |
| DEPLOY-09 | 92 | Pending |
| INTG-01 | 93 | Pending |
| INTG-08 | 93 | Pending |
| INTG-02 | 94 | Pending |
| INTG-03 | 94 | Pending |
| INTG-04 | 94 | Pending |
| INTG-05 | 94 | Pending |
| INTG-06 | 94 | Pending |
| INTG-07 | 94 | Pending |

**Coverage:**
- v0.12 requirements: 59 total
- Mapped to phases: 59
- Unmapped: 0

---
*Requirements defined: 2026-03-22*
*Last updated: 2026-03-22 after roadmap creation — all 59 requirements mapped to phases 84-94*
