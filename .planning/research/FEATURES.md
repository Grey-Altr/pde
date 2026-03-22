# Feature Research

**Domain:** Business product type — venture design engine with `business:` orthogonal dimension in PDE's design pipeline
**Researched:** 2026-03-22
**Confidence:** MEDIUM-HIGH (table stakes verified against Lean Canvas (Ash Maurya), Business Model Canvas (Osterwalder/Pigneur), Y Combinator/Sequoia pitch deck frameworks, Stripe Atlas guides, Vercel SaaS starter templates, and venture design methodology literature; differentiators inferred from PDE's existing pipeline capabilities; deployment scaffolding verified against Vercel and Next.js official documentation)

---

> **Scope note:** This file covers what v0.12 adds to PDE. The `business:` dimension is **orthogonal** — it layers on top of all existing product types (software, hardware, hybrid, experience). All existing pipeline infrastructure (13-stage design pipeline, DTCG tokens, DESIGN-STATE.md, design-manifest.json, wireframe/mockup/critique/handoff skills, build orchestrator, experience pipeline) is a stable dependency — not rebuilt here. Every feature described is either a reinterpretation of an existing pipeline stage through a business lens, or a new artifact type that is additive alongside existing outputs. The key architectural insight: `business:` is a _mode modifier_, not a fourth product type — it can be `business: software`, `business: hardware`, or `business: experience`.

---

## What "Business" Means in PDE Context

A business product is defined not primarily by its user interface or physical design but by its viability as a commercial venture. Where a software product has a screen inventory and user flows, a business product has a revenue model and a go-to-market sequence. Where an experience product has a production bible, a business product has an investor pitch deck and a launch kit. The fundamental design question shifts from "what does the user see?" to "who pays, how much, why now, and can we reach them?"

Key distinctions from pure product types that drive feature scope:

1. **Strategy precedes execution.** Business design starts with validating a thesis before designing a solution. The Lean Canvas front-loads assumptions explicitly to be proven or disproven — this changes brief and competitive stages fundamentally.
2. **Market is a primary design constraint.** TAM/SAM/SOM, competitive positioning, and pricing strategy are not marketing afterthoughts — they shape what gets built and how it is packaged.
3. **User tracks are materially different.** A solo founder needs fast, opinionated artifacts and can act on a single decision. A startup team needs presentation-ready artifacts for alignment. A product leader inside an enterprise needs strategic framing compatible with organizational vocabulary (OKRs, P&L impact, build vs buy). Same underlying data, radically different output format and depth.
4. **Deployment is a first-class deliverable.** For software-backed business products, "launch" means something is live on the internet. PDE should produce deployable artifacts (Next.js landing page, Stripe pricing config, Resend email templates), not just design specifications.
5. **Human approval gates are mandatory before any live deployment.** PDE never auto-deploys. Every stage that would put code or configuration into production requires an explicit confirmation before proceeding.

---

## Feature Landscape

### Table Stakes (Users Expect These)

These features must exist for the `business:` dimension to feel complete. Missing any of them means PDE produces design artifacts but fails to close the gap to a launchable business. Practitioners who reach for venture design tools or "business in a box" platforms expect all of these.

| Feature | Why Expected | Complexity | Pipeline Stage | Notes |
|---------|--------------|------------|----------------|-------|
| **Lean Canvas generation** | The Lean Canvas (Ash Maurya / Running Lean) is the de facto hypothesis-tracking artifact for early-stage ventures. Over a million entrepreneurs, accelerators (MassChallenge, Techstars), and university programs use it. Not generating one means PDE's business output looks incomplete to any founder who has done an accelerator or read Lean Startup. | MEDIUM | Brief | 9 boxes: Problem, Solution, UVP, Unfair Advantage, Customer Segments, Channels, Revenue Streams, Cost Structure, Key Metrics. Output as structured markdown table with confidence level per hypothesis (validated/assumed/unknown). |
| **Business thesis statement** | Every investor pitch begins with the thesis: the problem, the insight, the timing argument ("why now"). This is the business equivalent of the product brief's value proposition. Without a crisp thesis, all downstream artifacts are unanchored. | LOW | Brief | One-paragraph structured output: problem statement (who suffers, how much), insight (what most people miss), timing argument (why now is the right moment), hypothesis (what we believe, what would prove us wrong). |
| **Market landscape (TAM/SAM/SOM)** | Any business pitch, investor conversation, or strategic planning session requires market sizing. TAM/SAM/SOM is standard vocabulary across VC, corporate venture, and accelerator contexts. Missing it means the competitive stage is incomplete for business mode. | MEDIUM | Competitive | Extends existing competitive analysis skill. Adds: TAM (total addressable market), SAM (serviceable addressable market), SOM (target for year 1-3), market sizing methodology note (top-down vs bottom-up), primary data source citations. |
| **Competitor landscape with positioning matrix** | No venture design tool or investor pitch skips competitive analysis. The positioning matrix (2×2 with chosen axes) is the visual artifact investors expect. | MEDIUM | Competitive | Extends existing competitive analysis. Adds business-mode dimensions: pricing tier positioning, target customer segment, distribution channel, revenue model type. Generates markdown 2×2 positioning matrix with narrative. |
| **Business model RICE prioritization** | The existing opportunity skill uses RICE for features. In business mode, the same framework applies to business initiatives: what revenue experiments to run first, what GTM channels to prioritize. Founders and product leaders expect prioritized backlogs, not just lists. | MEDIUM | Opportunity | Extends existing RICE skill. Business-mode RICE applies to: pricing experiments, distribution channels, partnership opportunities, content marketing bets. Output is ranked initiative list with RICE score and confidence flag. |
| **Operational flow diagram (service blueprint)** | A service blueprint maps the full delivery of value: customer-facing actions (frontstage), staff/system actions (backstage), support processes, and evidence artifacts at each touchpoint. This is the business-mode equivalent of a user flow — it reveals how the venture actually operates, not just how it appears. | MEDIUM | Flows | Extends existing flows skill. New artifact: service-blueprint.md — five swim lanes: customer actions, frontstage interactions, line of visibility, backstage processes, support infrastructure. Uses Mermaid sequence diagram variant. |
| **Go-to-market (GTM) channel flow** | Every launch requires a customer acquisition story: which channel reaches the ICP first, what the conversion sequence is, what the unit economics imply. Founders know "I need to think about distribution" — they expect the tool to produce a channel map and conversion funnel. | MEDIUM | Flows | New artifact: gtm-channel-flow.md — maps primary and secondary acquisition channels, conversion steps (awareness → consideration → trial → purchase → retention), estimated CAC per channel, LTV implication. Mermaid flowchart. |
| **Brand system with business positioning** | The existing system skill generates a DTCG design token set. In business mode, the brand system must also answer: what is the brand personality relative to competitors, what is the tone of voice, what is the visual differentiation rationale. Without this, the landing page and pitch deck lack coherent brand expression. | LOW | System | Additive to existing system skill. Business-mode extension: brand positioning statement (for [audience] who [need], [brand] is the [category] that [differentiator], unlike [competitor] which [weakness]), tone of voice spectrum (formal/casual, playful/serious), visual differentiation note. |
| **Landing page wireframe (deployable-spec)** | The single most expected deliverable from any "launch kit" or "business in a box" tool. A landing page wireframe in business mode must be deployable — not just a visual sketch but a structured spec from which a Next.js page can be scaffolded. | HIGH | Wireframe | New artifact: landing-page-wireframe.md — structured as hero section, social proof row, feature/benefit section, pricing section, CTA section, footer. Each section contains: copy placeholders (headline, subheadline, CTA text), content requirements (what goes here and why), and Next.js component mapping (`<HeroSection>`, `<PricingTable>`, etc.). |
| **Pricing configuration spec** | Pricing is not a marketing decision — it is a product and engineering decision. The Stripe pricing config (product IDs, price IDs, billing intervals, trial periods) is a deployable artifact, not just a strategy note. Solo founders who use Stripe expect to know what to configure. | MEDIUM | Wireframe | New artifact: pricing-config-spec.md — Stripe-compatible pricing table definition: plan names, feature sets per tier, monthly/annual price, trial period, Stripe product object spec (structured as Stripe API object reference without code generation). Includes pricing strategy rationale (good/better/best tier logic, anchor pricing). |
| **Pitch deck structure (investor-ready)** | Any business product targeting external funding needs a pitch deck. The Y Combinator format (10-15 slides: problem, solution, market, product, business model, traction, GTM, competition, team, financials, ask) is industry standard — deviating from it without reason signals naivety. | HIGH | Wireframe | New artifact: pitch-deck-outline.md — slide-by-slide structured outline with: slide title, key message (one sentence), required content elements, recommended data/visuals, speaker note cues. Not a presentation file — a structured spec from which any deck tool can be populated. 10-slide default (YC format), expandable to Sequoia 13-slide variant. |
| **Business critique perspectives** | The existing critique skill applies UX, engineering, accessibility, and business perspectives. In business mode, business critique must be deep, not surface-level: Is the unit economics sustainable? Is the GTM channel appropriate for this ICP? Is the pricing tier logic coherent? Is the pitch thesis falsifiable? | MEDIUM | Critique | Business-mode critique adds/deepens: unit economics review (CAC vs LTV ratio, payback period reasonableness), GTM channel-ICP fit assessment, pricing psychology review (anchoring, value metric alignment), investor readiness assessment (are claims substantiated or asserted?), unfair advantage defensibility check. |
| **Content calendar skeleton** | "When do we launch what?" is a question every solo founder, startup team, and product leader faces. A 30-day or 90-day content calendar (not content itself, but the scheduling skeleton) is a standard launch kit component. | LOW | Handoff | New artifact: content-calendar-skeleton.md — week-by-week pre-launch, launch, and post-launch sequence. Includes: announcement categories (waitlist, beta invite, launch day, press, social, email), channel-specific cadence, milestone-gated triggers. Empty slots for user to fill content — not generated copy. |
| **Email sequence spec (investor + user)** | Transactional and marketing email sequences are standard in every SaaS launch kit. The spec (not the copy) should define: sequence triggers, delay intervals, subject line strategy, CTA per email. Resend is the current standard for transactional email in Next.js stacks. | LOW | Handoff | New artifact: email-sequence-spec.md — two sequences: user onboarding (welcome → activation → retention nudge, 5-7 emails) and investor outreach (cold intro → follow-up → deck send, 3-email sequence). Defines: trigger, delay, subject strategy, CTA, Resend template reference. Not generated email copy. |
| **Domain and brand identity strategy** | Every founder asks "what domain do I use?" before anything else. A business launch requires a domain strategy: primary domain, social handle consistency, subdomain conventions (app., docs., api.). | LOW | Brief/Handoff | Brief extension captures proposed domain and handle. Handoff produces domain-strategy.md: primary domain recommendation rationale, handle availability check reminder, subdomain map (app., docs., status., api.), email configuration note (custom domain for Resend, SPF/DKIM reminder). |
| **Deployment scaffolding with human approval gates** | The defining feature of a "venture design engine" vs a "design tool" is that PDE can scaffold real deployment artifacts. A Next.js landing page, Stripe configuration, and Resend email template are not design outputs — they are deployable infrastructure. But every deployment step requires explicit human review and approval before proceeding. | HIGH | New skill: deploy | New skill: `/pde:deploy`. Scaffolds: (1) Next.js landing page from landing page wireframe spec, (2) Stripe product/price configuration from pricing config spec, (3) Resend email template from email sequence spec. Each stage is gated by a human approval step (`[APPROVE TO CONTINUE]` prompt with diff preview). Vercel deployment as final step, also gated. Never auto-deploys. |

### Differentiators (Competitive Advantage)

These features distinguish PDE's business dimension from generic pitch deck generators, lean canvas tools, and "startup in a box" templates. They leverage PDE's connected pipeline — each stage feeds the next — in ways no standalone tool can match.

| Feature | Value Proposition | Complexity | Pipeline Stage | Notes |
|---------|-------------------|------------|----------------|-------|
| **Three-track output adaptation (solo founder / startup team / product leader)** | No venture design tool adapts its output format and depth based on who is using it. A solo founder needs a 1-page lean canvas and a deployable landing page in hours. A startup team needs investor-presentation-ready artifacts that the full team can align on. A product leader inside an enterprise needs strategic vocabulary (OKRs, initiative ROI, build vs buy analysis) compatible with existing organizational frameworks. Same pipeline, radically different outputs. | HIGH | All stages | Track selection in brief. Downstream skills read track flag and adapt: depth of financial modeling (solo: rough estimates; startup: detailed projections; leader: P&L framing), artifact format (solo: markdown; startup: presentation-ready structured docs; leader: executive summary format), vocabulary calibration (solo: founder-speak; startup: investor-speak; leader: strategy-speak). |
| **Lean Canvas as living hypothesis tracker** | Most tools generate a Lean Canvas once and it becomes a static document. PDE can treat the Lean Canvas as a hypothesis tracker — each field annotated with confidence level (validated/assumed/unknown) and evidence type (customer interview, revenue signal, cohort data). As the pipeline progresses, the canvas is the source of truth for what has been validated. | MEDIUM | Brief + Iterate | Lean Canvas in business mode includes: per-field confidence status, evidence summary per validated hypothesis, open questions per unknown assumption. Iterate skill in business mode updates canvas confidence levels, not just design iterations. |
| **Business thesis → pitch deck coherence check** | Pitch deck generators produce slides from prompts. PDE can check whether the pitch deck's claims are coherent with the Lean Canvas assumptions, the competitive analysis findings, and the GTM channel selection. This is a unique cross-stage consistency check that no single-tool generator can do. | MEDIUM | Critique | New critique check: pitch-coherence. Cross-references: lean canvas UVP vs pitch deck solution slide, canvas key metrics vs traction slide, canvas channels vs GTM slide. Flags contradictions (e.g., claiming network effects as UVP but showing single-sided acquisition funnel). |
| **Unit economics derivation from pricing spec** | From the pricing config spec (monthly price, trial period, expected churn rate), PDE can derive unit economics: estimated LTV, implied CAC ceiling for profitability, payback period at different churn assumptions. No design tool does this — it is normally done in a separate spreadsheet, disconnected from the design system. | MEDIUM | Opportunity/Critique | Unit economics are computed inline from pricing spec fields. Output: LTV formula, CAC ceiling calculation, payback period at 3 churn scenarios (low/mid/high), sustainability flag (is LTV:CAC ratio > 3?). Presented as a structured note, not a financial model — explicitly labeled as estimates requiring validation. |
| **GTM channel → content calendar → email sequence coherence** | These three artifacts are always generated independently by different tools (Linear/Notion for GTM, Notion/Coda for content calendar, Mailchimp/ConvertKit for email sequences). PDE generates all three as a coherent system — the channels from GTM flow dictate which content types appear in the content calendar, and the email sequence is timed to the content calendar milestones. | HIGH | Handoff | Content calendar skeleton and email sequence spec are generated from GTM channel flow output. Channel priorities determine which calendar slots are most critical. Email trigger timings reference content calendar dates. All three artifacts reference each other explicitly. |
| **Deployable landing page from wireframe spec** | Tools like v0 by Vercel can generate landing pages from prompts. PDE generates a landing page from the landing page wireframe spec, which itself was generated from the brand system tokens, GTM channel selection, and ICP definition from the brief. The result is not a generic landing page — it is one grounded in a coherent strategy. | HIGH | Deploy skill | Landing page scaffold consumes: brand system DTCG tokens (colors, typography), ICP headline from brief, hero copy from pitch deck solution slide, pricing from pricing config spec, testimonial placeholder slots from traction slide. Uses Next.js 15 App Router conventions, Tailwind CSS, shadcn/ui components. |
| **Investor outreach sequence timed to pitch deck** | Investor outreach email sequence is calibrated to the pitch deck structure: email 1 references the thesis (problem + insight), email 2 is the "deck send" email (timed to when deck is ready), email 3 is the follow-up. This sequence depends on having a finished pitch deck — PDE can gate the sequence generation on deck completion, which no other tool does. | LOW | Handoff | Email sequence spec for investor track is generated only after pitch deck outline exists in design-manifest.json. Follow-up email references specific slides ("I wanted to highlight the traction slide, specifically..."). Gated by `hasPitchDeck` in designCoverage. |
| **Business model → service blueprint → operational flow alignment** | The business model canvas defines what the venture does. The service blueprint defines how it delivers it. Most tools produce one or the other. PDE produces both and checks alignment: if the revenue stream is "per-seat SaaS subscription," the service blueprint's support process lane should include churn prevention touchpoints. | MEDIUM | Flows/Critique | Service blueprint is generated from business model fields (channels, key activities, key resources, key partnerships — BMC fields that complement Lean Canvas). Critique checks: revenue model vs support infrastructure alignment, pricing model vs delivery model coherence. |
| **Vertical deployment stack (Next.js + Stripe + Resend + Vercel)** | Most deployment scaffolding tools provide generic boilerplate. PDE produces deployment scaffolding specific to the venture's design decisions: landing page copy derived from the pitch deck, pricing tiers derived from the pricing config spec, email templates derived from the GTM sequence. The stack (Next.js + Stripe + Resend via Vercel) is opinionated and proven — not a menu of options. | HIGH | Deploy skill | Opinionated stack is a feature, not a limitation. Eliminates decision fatigue. Stack: Next.js 15 (App Router), Tailwind CSS + shadcn/ui, Stripe (Billing API, Products + Prices), Resend (transactional + marketing email), Vercel (deploy). Each component is chosen for zero-friction integration and official Next.js ecosystem support. |

### Anti-Features (Avoid These in v0.12)

These features seem natural for a venture design engine but create scope, quality, or architectural problems that outweigh their value in this milestone.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Fully autonomous deployment (no approval gates)** | "Just ship it for me" is the appeal of automation | PDE never auto-deploys without human review. Deploying a landing page, creating Stripe products, or sending emails has real-world financial and reputational consequences. Silent deployment of any external-facing artifact is an architectural safety violation for this system. | Every deploy step shows a diff preview and requires explicit `[APPROVE]` confirmation before proceeding. Mandatory gate, not optional. |
| **Financial model / P&L generation** | Founders always ask "can PDE build my financial model?" | Building a credible financial model requires real business data (actual CAC, actual churn, actual COGS) that does not exist at design time. Generating one from assumptions produces a document that looks authoritative but is disconnected from reality — dangerous for investor conversations. | Unit economics derivation from pricing spec (LTV, CAC ceiling, payback period) is included as a rough framework. Full financial modeling is explicitly deferred to accounting/FP&A tools. Label all estimates with `~est.` and include a validation disclaimer. |
| **Legal document generation (terms of service, privacy policy)** | "Can PDE draft my ToS?" | Legal documents drafted by AI without legal review create real liability. Founders might deploy them without review, which is harmful. | Handoff includes a legal checklist: categories of documents needed (ToS, Privacy Policy, GDPR/CCPA notice, cookie consent), recommended services (Termly, Iubenda, Clerky for incorporation), and a clear disclaimer that PDE output is not legal advice. |
| **Investor matching / fundraising automation** | "Connect me with investors" | This requires a live database, relationship intelligence, and trust signals that a design tool cannot provide. Any list PDE generated would be stale, incomplete, or wrong. | Pitch deck outline includes a "target investor profile" section: stage, check size, thesis alignment, domain expertise needed. User populates from their own network research. PDE prepares the materials, not the introductions. |
| **Market research data fetching** | "PDE should pull real market size data" | Real-time data fetching for TAM/SAM/SOM violates PDE's offline-capable design model and creates dependency on external data sources with unpredictable quality. | Market landscape skill provides methodology for sizing (top-down vs bottom-up approaches, typical sources: Statista, IBISWorld, Pitchbook, SEC filings) with placeholder slots for the user to populate with researched figures. |
| **Social media copy generation** | "Generate all my launch tweets" | Social copy generation is a content task, not a venture design task. Including it makes the handoff documents unwieldy and dilutes the strategic focus. It also requires brand voice inputs that belong in a content strategy workflow, not a venture design workflow. | Content calendar skeleton includes content category slots (announcement, education, social proof, engagement) with copy brief prompts for each slot — enough to brief a copywriter or use a dedicated copy generation tool. |
| **Multi-provider email integration (Mailchimp, ConvertKit, ActiveCampaign)** | Founders use different email tools | Supporting multiple email providers creates a combinatorial matrix of integration complexity. Resend is the current standard for transactional email in Next.js + Vercel stacks, has an official Next.js integration, and is free at launch volumes. | Support Resend only. Document that the email sequence spec (the artifact PDE generates) is provider-agnostic — the structured sequence can be manually imported into any provider. |
| **Equity / cap table calculation** | "Help me think through founder equity splits" | Equity decisions have permanent legal consequences. Generating cap table models implies authority PDE does not have. | Not addressed. Equity is outside venture design scope. Direct users to Carta, Pulley, or legal counsel for equity questions. |
| **Automated SEO optimization** | "Generate meta tags, structured data, sitemaps for my landing page" | SEO optimization requires actual content and real keyword data. Automated SEO on placeholder content produces low-quality, misleading output. | Landing page wireframe spec includes an SEO placeholder section: title format, meta description character limit guide, primary keyword slot, OG image spec. User populates with real content. |
| **CRM integration (HubSpot, Salesforce, Pipedrive)** | "Sync my leads to CRM automatically" | CRM integration requires live data, authentication management, and ongoing maintenance. It is an operational tool concern, not a design pipeline concern. | Email sequence spec includes a CRM integration note: what data to capture from landing page form (name, email, company, role), what fields map to common CRM objects. User configures their CRM separately. |

---

## Feature Dependencies

```
[Brief: business thesis + lean canvas + user track]
    └──required-by──> [Competitive: market landscape + positioning matrix]
    └──required-by──> [Opportunity: business RICE initiatives]
    └──required-by──> [Flows: service blueprint + GTM channel flow]
    └──required-by──> [System: brand system + positioning]
    └──required-by──> [Wireframe: landing page + pricing config + pitch deck]
    └──required-by──> [Handoff: content calendar + email sequence + domain strategy]
    └──required-by──> [Deploy: scaffolding artifacts]

[Competitive: market landscape]
    └──required-by──> [Wireframe: pitch deck] (market size slide)
    └──required-by──> [Critique: pitch coherence check]

[Opportunity: business RICE]
    └──enhances──> [Wireframe: pitch deck] (business model slide)
    └──produces──> [unit economics derivation]

[Flows: GTM channel flow]
    └──required-by──> [Handoff: content calendar skeleton]
              └──required-by──> [Handoff: email sequence spec] (sequence timed to calendar)

[Flows: service blueprint]
    └──required-by──> [Critique: business model → delivery alignment check]

[System: brand system + positioning]
    └──required-by──> [Wireframe: landing page] (DTCG tokens → component styles)
    └──required-by──> [Wireframe: pitch deck] (visual identity consistency)

[Wireframe: pricing config spec]
    └──required-by──> [Wireframe: landing page] (pricing section)
    └──required-by──> [Deploy: Stripe scaffolding]
    └──produces──> [unit economics derivation] (via Opportunity/Critique)

[Wireframe: pitch deck outline]
    └──required-by──> [Critique: pitch coherence check]
    └──required-by──> [Handoff: investor email sequence] (deck-gated sequence generation)

[Wireframe: landing page wireframe]
    └──required-by──> [Deploy: Next.js landing page scaffolding]

[Brief: user track = solo founder]
    └──modifies──> [all stages: abbreviated depth, markdown output, fast-path defaults]

[Brief: user track = startup team]
    └──modifies──> [all stages: presentation-ready format, investor vocabulary, team-facing sections]

[Brief: user track = product leader]
    └──modifies──> [all stages: executive summary format, OKR framing, build-vs-buy analysis]

[Deploy: all stages]
    └──requires──> [human approval gate before each deployment action]
    └──depends-on──> [landing page wireframe] (scaffold source)
    └──depends-on──> [pricing config spec] (Stripe scaffold source)
    └──depends-on──> [email sequence spec] (Resend template source)
```

### Dependency Notes

- **Brief is the strategy anchor:** The business thesis, lean canvas, and user track selection all originate in the brief. All downstream stages read the user track to adapt their output format and depth. This is the single most critical input — all other stages degrade gracefully if upstream stages are missing, but the user track flag is used everywhere.
- **Pricing config gates two downstream artifacts:** The pricing config spec is the source for the landing page pricing section AND the Stripe deployment scaffold. It must exist before the landing page wireframe is finalized, and before deploy runs.
- **Pitch deck gates investor email sequence:** The investor outreach email sequence spec should only be generated after the pitch deck outline exists in the design manifest — the emails reference specific slides. This is a soft gate (not a hard blocker), but the sequence quality degrades without the deck.
- **GTM channel flow is the distribution backbone:** Content calendar and email sequence both derive their structure from the GTM channel flow. Without a GTM flow, the handoff artifacts are generic rather than channel-specific.
- **Deploy skill is the terminal stage:** Deploy depends on all upstream artifacts being complete. It is the final stage of the business pipeline, not an early step. Running it before upstream artifacts exist will produce a scaffolded structure with empty slots — which is acceptable but suboptimal.
- **Unit economics is derived, not declared:** Unit economics are computed from pricing config spec fields (price, trial period, estimated churn) in the opportunity/critique stages. No separate unit economics input step — it emerges from existing artifacts.
- **User track adaptation is cross-cutting:** The track flag (`solo_founder`, `startup_team`, `product_leader`) is read by every stage. This is not a pipeline branch — it is a vocabulary and depth modifier. The same 13-stage pipeline runs for all tracks; output format and depth adapts.

---

## MVP Definition (for v0.12 Milestone)

### Launch With (v0.12 core — minimum to make `business:` dimension credible)

These are the features without which a founder, team, or product leader would look at PDE's business output and say "this is missing the core deliverable."

- [ ] **Business thesis statement in brief** — foundational anchor for all downstream artifacts; without it, pitch deck and lean canvas are disconnected from each other
- [ ] **Lean Canvas generation in brief** — the single most expected artifact from any venture design tool; 9-box hypothesis tracker with confidence levels per field
- [ ] **User track selection (solo founder / startup team / product leader)** — without track adaptation, all three users get the same output depth and format, which is wrong for all of them
- [ ] **Market landscape with TAM/SAM/SOM in competitive stage** — required for pitch deck market slide; without it the pitch deck is incomplete
- [ ] **Service blueprint in flows stage** — the business-mode equivalent of user flows; shows how the venture delivers value operationally
- [ ] **GTM channel flow in flows stage** — required source for content calendar and email sequence; defines distribution strategy
- [ ] **Landing page wireframe (deployable-spec format)** — the single most expected deliverable from any launch kit; must be structured for Next.js scaffolding, not just visual
- [ ] **Pricing configuration spec** — Stripe-compatible pricing table definition; foundational for both landing page pricing section and deployment scaffolding
- [ ] **Pitch deck outline (YC/Sequoia 10-12 slides)** — structured slide-by-slide spec; required for investor track and product leader track
- [ ] **Business critique perspectives (unit economics, GTM-ICP fit, pricing psychology, investor readiness)** — required to make the pipeline's output quality self-aware, not just output-generating
- [ ] **Content calendar skeleton in handoff** — 30-day pre-launch, launch, post-launch schedule; standard in every launch kit
- [ ] **Email sequence spec (onboarding + investor outreach) in handoff** — trigger/delay/CTA spec for both sequences; Resend-compatible
- [ ] **Deploy skill with human approval gates** — the terminal stage that makes PDE a venture design engine rather than a design tool; Next.js + Stripe + Resend + Vercel stack with mandatory human review at each stage

### Add After Validation (v0.12.x — once core pipeline is working)

- [ ] **Pitch coherence check (lean canvas ↔ pitch deck cross-reference)** — high value differentiator; requires both lean canvas AND pitch deck to be complete; add once both are shipping reliably
- [ ] **Unit economics derivation from pricing spec** — add once pricing config spec is stable; computation is low complexity but depends on the spec format being finalized
- [ ] **GTM → content calendar → email sequence coherence wiring** — add once all three artifacts are individually working; coherence checks are additive
- [ ] **Business model → service blueprint alignment critique** — add once service blueprint is stable
- [ ] **Investor outreach email sequence gated on pitch deck completion** — add once pitch deck and email sequence are both shipping; gate logic is low complexity

### Future Consideration (v0.13+)

- [ ] **Repeatability / series launch template mode** — for recurring cohort launches, subscription programs, or seasonal campaigns; architecturally similar to experience's `repeatability_intent` flag; defer until single-launch pipeline is validated
- [ ] **Product leader OKR framing layer** — deep enterprise vocabulary adaptation (initiative framing, OKR contribution, build-vs-buy analysis); complex vocabulary calibration; defer until startup team track is validated
- [ ] **Multi-product-type business overlay (business: experience, business: hardware)** — composing `business:` with non-software product types requires testing each combination; defer until software-mode `business:` is stable
- [ ] **Advanced competitor intelligence (positioning map auto-generation)** — requires external data sources; defer to AutoResearch milestone (v0.13)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Business thesis in brief | HIGH — anchors all downstream | LOW — structured brief extension | P1 |
| Lean Canvas generation | HIGH — universal founder artifact | MEDIUM — 9-box structured output with confidence levels | P1 |
| User track selection | HIGH — required for output relevance | MEDIUM — cross-cutting flag, read by all stages | P1 |
| Market landscape (TAM/SAM/SOM) | HIGH — pitch deck dependency | MEDIUM — extends existing competitive skill | P1 |
| Service blueprint in flows | HIGH — delivery model visibility | MEDIUM — new Mermaid diagram type | P1 |
| GTM channel flow | HIGH — distribution backbone | MEDIUM — new flow artifact type | P1 |
| Landing page wireframe (deployable-spec) | HIGH — launch kit cornerstone | HIGH — new structured format, Next.js component mapping | P1 |
| Pricing config spec | HIGH — Stripe + landing page dependency | MEDIUM — structured artifact with pricing logic | P1 |
| Pitch deck outline (YC format) | HIGH — investor track essential | HIGH — 10-12 slide structured spec with narrative guidance | P1 |
| Business critique perspectives | HIGH — self-aware pipeline output | MEDIUM — new critique dimensions, extends existing skill | P1 |
| Content calendar skeleton | MEDIUM — standard launch kit item | LOW — structured 30/90-day template | P1 |
| Email sequence spec | MEDIUM — launch kit standard | LOW — trigger/delay/CTA structured table | P1 |
| Deploy skill with approval gates | HIGH — venture engine differentiator | HIGH — new skill, three deployment targets, approval gate logic | P1 |
| Pitch coherence check | HIGH — unique differentiator | MEDIUM — cross-reference lean canvas ↔ pitch deck | P2 |
| Unit economics derivation | HIGH — founder decision support | MEDIUM — formula-based derivation from pricing spec | P2 |
| GTM → calendar → email coherence | MEDIUM — artifact alignment | MEDIUM — cross-artifact reference wiring | P2 |
| Business model → service blueprint critique | MEDIUM — delivery alignment | LOW — extends existing critique | P2 |
| Three-track vocabulary adaptation (deep) | HIGH — product leader track specifically | HIGH — enterprise vocabulary calibration across all stages | P3 |
| Repeatability / series mode | MEDIUM — recurring launches only | HIGH — architectural mode switch, parallel to experience | P3 |

**Priority key:**
- P1: Must have for v0.12 milestone to close
- P2: Include if implementation permits; strong v0.12.x candidates
- P3: Future milestone or later iteration

---

## Competitor Feature Analysis

| Feature | Lean Canvas (leanfoundry.com) | Upmetrics / LivePlan | Notion "Startup in a Box" | PDE v0.12 Approach |
|---------|-------------------------------|----------------------|--------------------------|-------------------|
| Lean Canvas generation | Core product — 9-box canvas editor | Business plan auto-generation with financial forecasts | Template-based canvas blocks, manual fill | AI-generated 9-box canvas with per-field confidence levels, connected to downstream pipeline |
| Pitch deck | None | Pitch deck export from business plan | Template-based slide structure | Slide-by-slide structured outline spec aligned to YC/Sequoia format, coherence-checked against Lean Canvas |
| Market landscape | None | Prompted input, no methodology | None | TAM/SAM/SOM with sizing methodology note, extends existing competitive skill |
| Service blueprint | None | None | None | Full 5-lane service blueprint from business model fields and GTM channel selection |
| Landing page | None | None | None | Deployable-spec wireframe with Next.js component mapping, brand token integration |
| Pricing config | None | Financial model input | Template table | Stripe-compatible pricing spec with unit economics derivation |
| Deployment | None | None | None | Next.js + Stripe + Resend + Vercel scaffolding with mandatory human approval gates |
| User track adaptation | None | None | None | Three tracks (solo founder, startup team, product leader) adapting depth and vocabulary across all stages |
| Pipeline coherence | None — standalone tool | None — standalone tool | None — templates don't talk to each other | Connected 13-stage pipeline: brief → competitive → opportunity → flows → system → wireframe → critique → handoff → deploy |
| Content calendar | None | None | Template | Structured skeleton derived from GTM channel flow, coherent with email sequence |
| Email sequence | None | None | None | Trigger/delay/CTA spec for onboarding and investor outreach, Resend-compatible |

**Key differentiation:** All competitor tools are point solutions for one artifact type (canvas, business plan, or template). None connect a validated hypothesis (Lean Canvas) through a design pipeline to a deployable landing page with pricing and email infrastructure. PDE's differentiator is the connected, artifact-coherent pipeline — every output references and reinforces every other output, and the terminal artifact is deployable, not just documented.

---

## Sources

- [Lean Canvas — Ash Maurya / LeanFoundry](https://www.leanfoundry.com/articles/why-lean-canvas-versus-business-model-canvas) — 9-box structure, why not BMC, hypothesis tracking (HIGH confidence — official creator documentation)
- [Lean Canvas — 9 components explainer, Conceptboard](https://conceptboard.com/blog/lean-canvas-template-free-template/) — component-by-component breakdown (MEDIUM confidence — secondary source, consistent with official)
- [Venture Design Process — Alexander Cowan](https://www.alexandercowan.com/venture-design/) — venture design stages, strategy → operations → launch flow (MEDIUM confidence — practitioner-authored methodology)
- [Service Blueprints Definition — Nielsen Norman Group](https://www.nngroup.com/articles/service-blueprints-definition/) — 5-lane structure, frontstage/backstage, line of visibility (HIGH confidence — authoritative UX research body)
- [Service Blueprint Components — Deliverable UX](https://www.deliverableux.com/what-are-the-components-of-a-service-blueprint) — components, swim lanes, business design value (MEDIUM confidence)
- [Pitch deck structure for investors 2025 — Prezent.ai](https://www.prezent.ai/blog/pitch-deck-structure) — standard slide order, YC format, Sequoia variant (MEDIUM confidence — consistent with verified YC guidance)
- [Y Combinator Pitch Deck Guide — Leland](https://www.joinleland.com/library/a/y-combinator-pitch-deck) — 10-slide YC format, slide-by-slide requirements (MEDIUM confidence — community synthesis of YC guidance)
- [Stripe Atlas — Pitch Deck Guide](https://stripe.com/guides/atlas/pitchdeck) — three-act structure, investor expectations (HIGH confidence — Stripe official)
- [Startup Launch Kit components — Medium / Pennington](https://medium.com/@isabellapennington/best-cheap-startup-launch-toolkits-for-a-powerful-business-kickoff-in-2025-4720d472a0a5) — launch kit components: messaging, landing page, onboarding email, press kit, KPI dashboard, feedback loop (MEDIUM confidence)
- [Vercel SaaS Starter Templates — official](https://vercel.com/templates/saas) — Next.js + Stripe + Supabase/Resend template stack (HIGH confidence — Vercel official)
- [Next.js SaaS Starter with Stripe + Resend — Vercel](https://vercel.com/templates/authentication/next-js-saas-starter) — stack: Next.js 14, Prisma, Auth.js v5, Resend, shadcn/ui, Stripe (HIGH confidence — Vercel official template)
- [Stripe & Supabase SaaS Starter Kit — Vercel](https://vercel.com/templates/next.js/stripe-supabase-saas-starter-kit) — Stripe Billing API, DrizzleORM, subscription management (HIGH confidence — Vercel official)
- [Vercel Deployment Protection — official docs](https://vercel.com/docs/deployment-protection) — deployment protection methods, approval concepts (HIGH confidence — Vercel official)
- [Solo Founders Report 2025 — Carta](https://carta.com/data/solo-founders-report/) — solo founder prevalence, workflow patterns (MEDIUM confidence — Carta official data)
- [Solo Founder Tech Stack 2025 — Startupbricks](https://www.startupbricks.in/blog/solo-founder-tech-stack-2025) — solo founder tooling patterns, Notion/Airtable/Zapier stack (MEDIUM confidence)
- [Product Management in 2025 — David Bennell / Medium](https://medium.com/@david.bennell/product-management-in-2025-dc3f1e1b4319) — AI tools blurring PM/designer/engineer roles, PRD tooling (MEDIUM confidence)
- [AI Tools for Startups 2026 — DavidKramaley.com](https://www.davidkramaley.com/ai-tools-startups-2026) — current AI-assisted founder tooling landscape (LOW confidence — single practitioner blog)
- [How Top Product Teams Leverage AI 2025 — Salesforce Ventures](https://salesforceventures.com/perspectives/how-top-product-teams-are-actually-leveraging-ai-in-2025/) — product leader vs founder AI tool usage, OKR framing (MEDIUM confidence)
- [Investing in Business-in-a-Box AI solutions — M13](https://www.m13.co/article/investing-in-business-in-a-box-ai-solutions) — market thesis for AI venture tooling, solopreneur wave (MEDIUM confidence)

---

*Feature research for: PDE v0.12 — Business Product Type (`business:` orthogonal dimension)*
*Researched: 2026-03-22*
