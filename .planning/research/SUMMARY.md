# Project Research Summary

**Project:** PDE v0.12 — Business Product Type (Venture Design Engine)
**Domain:** Orthogonal `business:` dimension added to existing multi-type design pipeline
**Researched:** 2026-03-22
**Confidence:** HIGH

## Executive Summary

PDE v0.12 introduces the `business:` dimension as an orthogonal modifier that layers on top of all four existing product types (software, hardware, hybrid, experience) rather than replacing any of them. The key architectural insight driving all decisions: a business:software project is still a software project — it runs the same 13-stage design pipeline and produces all the same design artifacts, plus business-specific outputs. The dimension is implemented via a `businessMode` boolean flag in `design-manifest.json` alongside a `businessTrack` field (solo_founder / startup_team / product_leader), not as a new `productType` enum value. This composability is non-negotiable — encoding business mode as a fourth product type would break existing pipelines and destroy the orthogonal design goal. The analogy to v0.11 is instructive but limited: where `experience:` added exclusive branches that replaced software paths, `business:` adds conditional sections that augment all existing paths simultaneously.

The recommended approach treats the business pipeline as a 14-stage extension: stages 1-13 run as before with business-mode conditional blocks added inside each workflow, and a new Stage 14 (`deploy.md`) is appended exclusively when `businessMode === true`. The stack additions are scoped entirely to generated project scaffolds — the plugin itself adds zero new npm packages, preserving the zero-npm-deps-at-plugin-root constraint. Generated landing pages use Next.js 16.2.1 + Tailwind v4 + Stripe v20 + Resend 6.9.4 + Vercel CLI, all current as of 2026-03-22 and verified against official sources. The deploy skill produces a deployable Next.js scaffold, Stripe config (test-mode defaults), and Resend email templates — making PDE a venture design engine that generates launchable artifacts, not just design specifications.

The primary risks are three architectural time bombs that must be defused before any workflow is authored: (1) inadvertently encoding business mode as a peer product type rather than an orthogonal dimension — recovery cost is HIGH (full rewrite of all 14 workflows); (2) LLM-generated financial and legal content that appears authoritative but is hallucinated — requiring hard guardrails (structural placeholders only, never dollar amounts, mandatory disclaimer reference files); (3) the `designCoverage` pass-through clobber pattern that caused 10 regression bugs in v0.11 — the same mechanism applies when adding 4 new coverage flags to the existing 16-field object. All three require preventive architecture decisions in Phase 1 before implementation begins.

---

## Key Findings

### Recommended Stack

See `.planning/research/STACK.md` for full detail, complete schemas, and alternatives considered.

The plugin itself adds no npm packages. All new dependencies live in generated project scaffolds only. This preserves the zero-npm-deps-at-plugin-root constraint without exception.

**Core technologies (generated scaffold only):**
- Next.js 16.2.1 (App Router, Turbopack default, React 19.2): landing page scaffold — canonical Vercel-deployed React app; Server Actions replace /api/ routes for email capture and Stripe checkout, eliminating a separate API layer
- Stripe Node SDK `stripe@20.4.1` + `@stripe/stripe-js@8.11.0`: payment infrastructure — v20 requires Node.js 18+ (Vercel default runtime is 20); server SDK in Server Actions, client SDK for Stripe Elements if needed
- Resend `resend@6.9.4` + React Email `react-email@5.2.9`: transactional email — native TypeScript API, `resend.emails.send()` accepts React component directly, free tier (3,000 emails/month) covers launch volumes
- Tailwind CSS `^4.0`: zero-config CSS plugin (`@import "tailwindcss"` in global CSS, no config file required), Turbopack-compatible
- Vercel CLI (`npx vercel --prod --no-wait`): deployment orchestration — `--no-wait` returns deployment URL immediately without blocking the session; used via npx so no global install required
- `@stripe/mcp@0.2.5` (optional): Stripe product/price management via MCP — added to APPROVED_SERVERS only as explicit opt-in with consent gate, not by default

**Artifact format note:** No dominant JSON schema standard exists for BMC or service blueprints in developer contexts. PDE defines its own formats (BIZ-canvas JSON, BIZ-thesis markdown, SBP-blueprint markdown, STR-pricing JSON, LKT-launch-kit JSON) following the same philosophy as `design-manifest.json` — structured JSON for machine consumption, markdown for human readability. No external tooling is required to parse or consume these formats.

### Expected Features

See `.planning/research/FEATURES.md` for full competitor analysis, feature dependency graph, and prioritization matrix.

**Must have for v0.12 (P1 — table stakes, without these `business:` is not credible):**
- Business thesis statement in brief — foundational anchor; without it, pitch deck and lean canvas are disconnected from each other
- Lean Canvas generation in brief (9-box, confidence level per hypothesis: validated/assumed/unknown) — universal founder artifact; every accelerator and startup program uses this
- User track selection (solo_founder / startup_team / product_leader) — without track adaptation, all users receive wrong output depth and format; this flag is cross-cutting, read by every stage
- Market landscape with TAM/SAM/SOM in competitive stage — hard dependency for the pitch deck market slide
- Service blueprint in flows stage (5-lane Mermaid sequence: customer actions, frontstage, line of visibility, backstage, support) — business-mode equivalent of user flows
- GTM channel flow in flows stage (acquisition → conversion → retention funnel) — backbone for content calendar and email sequence
- Landing page wireframe in deployable-spec format (structured with Next.js component mapping) — single most expected launch kit deliverable
- Pricing configuration spec (Stripe-compatible: product names, price amounts, billing intervals, trial periods) — gates both landing page pricing section and Stripe deployment scaffold
- Pitch deck outline YC/Sequoia format (10-slide default, expandable to 13) — required for investor and product leader tracks
- Business critique perspectives (unit economics, GTM-ICP fit, pricing psychology, investor readiness)
- Content calendar skeleton (30-day pre-launch / launch / post-launch schedule with content category slots)
- Email sequence spec (onboarding 5-7 emails + investor outreach 3 emails; trigger/delay/CTA format, Resend-compatible)
- Deploy skill with human approval gates (Stage 14) — the terminal stage that makes PDE a venture design engine; Next.js + Stripe + Resend + Vercel stack, mandatory approval gates at every external write

**Should have after validation (P2 — differentiators, v0.12.x):**
- Pitch coherence check (lean canvas UVP vs pitch deck solution, canvas key metrics vs traction slide) — unique cross-stage consistency check no standalone generator can do
- Unit economics derivation from pricing spec (LTV formula, CAC ceiling, payback period at 3 churn scenarios)
- GTM channel flow → content calendar → email sequence coherence wiring (channel priorities dictate calendar slots and email trigger timing)
- Business model → service blueprint alignment critique (revenue model vs support infrastructure check)
- Investor email sequence gated on pitch deck completion (emails reference specific slides)

**Defer to v0.13+:**
- Multi-product-type business overlay (business:experience, business:hardware) — validate software-mode first
- Product leader OKR framing layer (deep enterprise vocabulary calibration across all stages)
- Repeatability / series launch template mode (architecturally significant; parallel to experience's repeatability flag)

**Anti-features — never implement in v0.12:**
- Autonomous deployment without approval gates — every external write is irreversible; approval gates are architectural, not optional
- Full financial model / P&L generation — structural placeholders only; dollar amounts are a liability risk
- Legal document generation (ToS, Privacy Policy) — legal checklist and service recommendations only
- Live market research data fetching — violates offline-capable design model; methodology guide and placeholder slots instead
- Multi-provider email integration — Resend only; the email sequence spec artifact is provider-agnostic for manual import

### Architecture Approach

See `.planning/research/ARCHITECTURE.md` for complete component inventory, data flow diagrams, anti-patterns, and suggested build order.

The business layer is purely additive. `businessMode` is an orthogonal boolean flag set by `brief.md` alongside the existing `productType` field. All downstream workflows read both fields independently using the pattern: evaluate `productType` for type-specific logic first, then evaluate `businessMode` for business overlays. Business overlays append to, never replace, type-specific sections. A new Stage 14 (`deploy.md`) is conditionally appended to the build orchestrator pipeline only when `businessMode === true`.

**Major components:**
1. `design-manifest.json` template (MODIFIED) — adds `businessMode: false` and `businessTrack: null` top-level fields; `designCoverage` grows from 16 to 20 fields (adding `hasBusinessThesis`, `hasMarketLandscape`, `hasServiceBlueprint`, `hasLaunchKit`)
2. `workflows/brief.md` (MODIFIED) — central detection point; sets `businessMode`, `businessTrack`, writes BTH artifact, sets `hasBusinessThesis`; all 12 downstream workflow gates depend on this
3. `workflows/deploy.md` (NEW) — Stage 14, only when `businessMode === true`; four mandatory approval gates (Next.js scaffold, Stripe config write, Resend template stubs, Vercel deploy)
4. `references/business-track.md` (NEW) — single source of truth for track vocabulary, depth, and artifact format differences across solo/startup/leader tracks; loaded via `@references/` by all workflows
5. `references/launch-frameworks.md` (NEW) — business artifact templates analogous to `experience-disclaimer.md`
6. 13 existing workflow files (MODIFIED) — each gains a `<!-- Business product type -->` conditional block; estimated additions range from 5 lines (iterate/mockup guard stubs) to 200 lines (wireframe.md)
7. `bin/lib/design.cjs` (MODIFIED) — adds `launch/` to `ensure-dirs` directory creation list (3 lines)

**New artifact directory:** `launch/` under `.planning/design/` holds all deployable artifacts (LKT, LDP, STR, CNT, OTR) separate from design specifications in `ux/` and `visual/`. The isolation prevents confusion between design artifacts and executable launch artifacts, and makes the deploy workflow's file discovery predictable.

**New artifact codes:** BTH (Business Thesis, strategy/), MLS (Market Landscape, strategy/), MKT (Brand/Marketing System, visual/), SBP (Service Blueprint, ux/), LKT (Launch Kit, launch/), LDP (Landing Page Wireframe, launch/), STR (Stripe Pricing Config, launch/), CNT (Content Calendar, launch/), OTR (Outreach Sequence, launch/)

### Critical Pitfalls

See `.planning/research/PITFALLS.md` for full warning signs, recovery strategies, and pitfall-to-phase mapping.

1. **Orthogonal dimension encoded as productType enum value** — writing `IF software ... ELSE IF business` collapses the orthogonal dimension into sequential logic; a business:software project triggers the business branch and loses all software-specific logic. Represent as composite flag pair (`businessMode` boolean + `businessTrack`) in manifest. Recovery cost if discovered after all 14 workflows are written: HIGH (full rewrite). Address in Phase 1 before any workflow is authored.

2. **LLM financial and legal hallucination** — LLMs generate plausible-looking financial projections with confident-sounding numbers that are ungrounded in the user's actual cost structure. Every financial artifact section must use structural placeholders (`[YOUR_MONTHLY_BURN]`), never dollar amounts. TAM/SAM/SOM must cite user-provided sources only — if no source is in the brief, the output must be `[TAM: Source required — PDE cannot estimate this]`. Investor outreach must never name specific firms or partners. Prevent via `references/business-financial-disclaimer.md` and `references/business-legal-disclaimer.md` created in Phase 1 before any launch kit workflow is authored.

3. **designCoverage pass-through clobber (20-field version of v0.11's 16-field bug)** — v0.11's Phase 83 found 10 workflows clobbering flags set by earlier phases by writing partial `designCoverage` objects. v0.12 adds 4 new flags making it 20 fields; every one of the 14 coverage-writing workflows must include all 20 fields in their write calls. Prevent by updating the manifest template before any workflow is authored. Dedicate an isolated audit phase to verify all 14 workflows include the new pass-through fields.

4. **Deployment artifacts without approval gates** — Stripe config with live keys, Vercel deployments, and Resend emails are irreversible external writes with financial consequences. Every deployment action must halt with a `[HUMAN APPROVAL REQUIRED]` prompt listing exactly what will be written/deployed. Stripe config must default to test-mode placeholder keys (`pk_test_REPLACE_WITH_YOUR_KEY`). `.planning/deploy-staging/` must have a `.gitignore` entry by default.

5. **User track branching inconsistency across workflows** — track adaptation applied in `brief.md` but missed in `competitive.md` or `flows.md` produces incoherent artifacts (product leader brief fed into solo-founder-depth competitive analysis). Verify: `grep -rn "businessTrack" workflows/` hit count must match `grep -rn "businessMode" workflows/` hit count. DESIGN-STATE.md Quick Reference must include a `business:` row with both mode and track values.

---

## Implications for Roadmap

Based on combined research, the architecture document's 14-phase suggested build order reflects the true dependency chain. The ordering is non-negotiable: manifest schema before workflows, reference files before workflows, brief before downstream stages, deploy (Stage 14) after handoff (Stage 13), audit phase after all workflow modifications.

### Phase 1: Foundation — Manifest Schema + Reference Files
**Rationale:** All downstream phases read `businessMode`, `businessTrack`, and the 20-field `designCoverage` from the manifest. Authoring any workflow before the manifest template is updated guarantees the coverage clobber bug. The disclaimer reference files (`business-financial-disclaimer.md`, `business-legal-disclaimer.md`) must exist before any financial or legal content template is authored. Architecture decisions made here (composite flag vs enum, `launch/` directory isolation) cannot be changed without cascading rework.
**Delivers:** Updated `design-manifest.json` template (20 coverage fields, `businessMode: false`, `businessTrack: null`), `bin/lib/design.cjs` with `launch/` in `ensure-dirs`, `references/business-track.md`, `references/launch-frameworks.md`, `references/business-financial-disclaimer.md`, `references/business-legal-disclaimer.md`
**Avoids:** designCoverage clobber (Pitfall 3), orthogonal dimension model error (Pitfall 1), financial hallucination (Pitfall 2)

### Phase 2: Brief Extensions + Business Mode Detection
**Rationale:** `brief.md` is the system's detection point — it sets `businessMode`, `businessTrack`, writes the BTH artifact, and flags `hasBusinessThesis`. All 12 downstream workflows gate on `businessMode` read from the manifest. Brief must be complete before any downstream workflow can be authored against real behavior. Financial content guardrails are also applied here first since the brief stage originates the initial financial framing.
**Delivers:** Updated `workflows/brief.md` (business signal detection, track detection, 5 business sections including business thesis + lean canvas + domain strategy captures, BTH artifact, manifest writes), lean canvas generation with 9-box confidence-level output, business thesis structured output
**Uses:** `references/business-track.md` (track vocabulary), `references/business-financial-disclaimer.md` (financial placeholder pattern)
**Avoids:** Track branching inconsistency (Pitfall 5), financial hallucination in early-stage outputs (Pitfall 2)

### Phase 3: Competitive + Opportunity Stage Extensions
**Rationale:** Market landscape (TAM/SAM/SOM) is a hard dependency of the pitch deck market slide. Business RICE prioritization extends the existing opportunity skill. Both stages read `businessMode` set by Phase 2. Self-contained modifications with no new file dependencies beyond Phase 1 reference files.
**Delivers:** Updated `workflows/competitive.md` (MLS market landscape path, competitive positioning matrix), updated `workflows/opportunity.md` (business initiative RICE scoring, unit economics framework), MLS artifact, market positioning 2x2 matrix (Mermaid quadrant or ASCII)
**Addresses:** Market landscape with TAM/SAM/SOM (table stakes), competitor landscape with positioning matrix (table stakes), business model RICE prioritization (table stakes)

### Phase 4: Flows Stage (Service Blueprint + GTM Channel Flow)
**Rationale:** Service blueprint and GTM channel flow are direct dependencies of the handoff content calendar and email sequence. The flows stage reads the BTH artifact from Phase 2 for business context. GTM channel selection becomes the backbone for Phase 8 handoff artifacts.
**Delivers:** Updated `workflows/flows.md` (service blueprint path + GTM channel flow path), SBP artifact (5-lane Mermaid sequence diagram), GTM channel flow artifact (acquisition → conversion → retention Mermaid flowchart)
**Addresses:** Operational flow diagram / service blueprint (table stakes), GTM channel flow (table stakes)

### Phase 5: System Stage (Brand System + Marketing Positioning)
**Rationale:** Brand system tokens and positioning are required by the landing page wireframe (Phase 6) — DTCG tokens flow into landing page component styles. The brand positioning statement and tone of voice define the visual differentiation rationale for the pitch deck. The system stage is parallel to flows (no dependency between them) but must precede wireframe.
**Delivers:** Updated `workflows/system.md` (brand system + marketing positioning sections), MKT-brand-system artifact (positioning statement, tone of voice spectrum, visual differentiation note)
**Addresses:** Brand system with business positioning (table stakes)

### Phase 6: Wireframe Stage (Landing Page + Pricing Config + Pitch Deck)
**Rationale:** The wireframe stage is the highest-complexity phase — it produces three new artifacts (landing page wireframe in deployable-spec format, Stripe-compatible pricing config, pitch deck outline) that are depended on by critique, handoff, and deploy. It requires brand tokens (Phase 5), GTM flow (Phase 4), and market landscape (Phase 3). The pricing config is a hard dependency of Stripe deployment scaffolding in Phase 9 and of the landing page pricing section.
**Delivers:** Updated `workflows/wireframe.md` (SBP + LDP + STR-pricing + pitch deck paths), LDP artifact (deployable-spec landing page wireframe with Next.js component mapping), STR-pricing artifact (Stripe-compatible pricing config spec), pitch deck outline (YC 10-slide format with track-specific depth), SBP artifact registered from flows stage
**Addresses:** Landing page wireframe (table stakes), pricing configuration spec (table stakes), pitch deck structure (table stakes), service blueprint (table stakes)
**Avoids:** Launch artifacts stored in ux/ or visual/ (Architecture Anti-Pattern 2)

### Phase 7: Critique + HIG Stage Extensions
**Rationale:** Business critique perspectives (unit economics, GTM-ICP fit, pricing psychology, investor readiness) require upstream artifacts — especially pitch deck and pricing config. HIG business communications section is a lower-complexity addition in the same phase. Both are review stages, not generation stages.
**Delivers:** Updated `workflows/critique.md` (business alignment perspective, unit economics review, pitch coherence cross-check hooks), updated `workflows/hig.md` (business communications HIG — pitch deck readability, email cadence, content calendar structure)
**Addresses:** Business critique perspectives (table stakes), pitch coherence check (P2 differentiator setup)

### Phase 8: Handoff Stage (Launch Kit Assembly)
**Rationale:** Handoff assembles the complete launch kit from all upstream business artifacts. It requires BTH, MLS, LDP, SBP, STR-pricing all registered in the manifest. Content calendar derives from GTM channel flow (Phase 4). Email sequence spec is Resend-compatible; the investor outreach sequence references pitch deck slides. This sets `hasLaunchKit: true` which gates the deploy stage.
**Delivers:** Updated `workflows/handoff.md` (launch kit assembly path), LKT artifact (assembled launch kit manifest with all artifact paths and statuses), CNT-calendar artifact (30-day pre-launch / launch / post-launch skeleton), OTR-outreach artifact (email sequence specs for onboarding + investor outreach), domain strategy notes
**Addresses:** Content calendar skeleton (table stakes), email sequence spec (table stakes), domain and brand identity strategy (table stakes)

### Phase 9: Deploy Skill (New Stage 14)
**Rationale:** Deploy is the terminal stage, depending on the complete launch kit from Phase 8 (`hasLaunchKit: true`). It introduces the most novel architectural element in PDE's history — writing files outside `.planning/` and invoking external CLIs — and carries the highest side-effect risk. Mandatory approval gates at every external write are architecturally enforced, not optional.
**Delivers:** New `workflows/deploy.md` (four approval-gated stages: Next.js scaffold, Stripe config, Resend templates, Vercel deploy), new `commands/deploy.md` (`/pde:deploy` slash command entry point), updated `workflows/build.md` (Stage 14 conditional on `businessMode === true`), Next.js landing page scaffold at `.planning/launch/landing-page/` (generated `package.json` with pinned versions, `app/layout.tsx`, `app/page.tsx`, `app/actions.ts`, Stripe webhook handler, React Email templates, `.env.example`)
**Uses:** Stack — Next.js 16.2.1, `stripe@20.4.1`, `resend@6.9.4`, `react-email@5.2.9`, Tailwind v4, `vercel --prod --no-wait`
**Avoids:** Autonomous deployment (Anti-Feature), live Stripe keys in generated scaffolding (Security Mistake), Vercel deployment blocking Claude session (use `--no-wait`)

### Phase 10: Secondary Workflow Modifications
**Rationale:** Remaining workflow modifications are lower-complexity additions with no cross-phase dependencies. `recommend.md` gains a business tool category. `iterate.md` and `mockup.md` receive guard stubs only (same 5-line comment pattern as v0.11 experience stubs).
**Delivers:** Updated `workflows/recommend.md` (business tool category: Stripe MCP, Resend MCP, analytics), updated `workflows/iterate.md` (guard stub), updated `workflows/mockup.md` (guard stub)

### Phase 11: designCoverage Clobber Audit (All 14 Workflows)
**Rationale:** Isolated audit phase following the v0.11 Phase 83 precedent exactly. Every workflow that writes `designCoverage` must be verified to include all 20 fields in its write call. This regression surface is invisible until a full pipeline run — isolating the audit in its own phase ensures scope is clearly bounded, complete, and verifiable.
**Delivers:** All 14 designCoverage-writing workflows verified to include all 20 fields in their write blocks (~56 lines modified across 14 files). Nyquist assertion added: field count in every designCoverage write must equal 20.
**Avoids:** designCoverage clobber (Pitfall 3) — identical prevention to v0.11 Phase 83

### Phase 12: Nyquist Regression Tests + Full Pipeline Validation
**Rationale:** Terminal validation phase. Four composition cases must be verified: non-business software project produces byte-identical manifest to pre-v0.12 baseline; business:software project produces software artifacts AND business artifacts (not one or the other); business:hardware composes correctly; deploy workflow halts at each approval gate without proceeding on "no".
**Delivers:** Nyquist regression assertions covering all four composition cases, verified non-regression of existing product types (software/hardware/hybrid/experience), approval gate halt verification for deploy workflow

### Phase Ordering Rationale

- Phase 1 before everything: manifest schema and disclaimer reference files cannot be retrofitted; the 20-field designCoverage template must exist before any workflow author knows how many fields to include
- Phase 2 before all downstream: `businessMode` and `businessTrack` must be set in the manifest before any downstream workflow can be tested against real behavior; detection is the dependency of everything
- The artifact dependency chain (brief → competitive → flows → system → wireframe → critique → handoff → deploy) directly dictates workflow implementation phases 2-9
- Phase 11 (audit) isolated after all workflow modifications: scope must be bounded; auditing as you go risks missing workflows that aren't written yet
- Phase 12 (Nyquist) last: validates the complete integrated system; cannot run meaningfully until all modifications are complete

### Research Flags

Phases likely needing deeper research or careful judgment during planning:

- **Phase 9 (Deploy Skill):** Novel architectural territory — first PDE workflow that writes files outside `.planning/` and invokes external CLIs. Vercel CLI behavior with `--no-wait`, approval gate UX sequencing, and Next.js App Router scaffold structure need validation against the official `vercel-labs/agent-skills` source before implementation. Recommend generating a test scaffold before committing to the full workflow prompt architecture.
- **Phase 6 (Wireframe — Pitch Deck):** YC vs Sequoia format differences and track-specific depth variations (solo: 10 slides, startup: 12-15 slides with team/financial sections, product_leader: internal business case format with OKR framing) add branching complexity. The exact slide structure per track must be specified in `references/launch-frameworks.md` (Phase 1) before Phase 6 authors interpret depth independently.
- **Phase 2 (Brief — Financial Guardrail Calibration):** The line between "structural placeholder" and "helpful estimate" requires deliberate judgment. The financial disclaimer pattern established in Phase 1 must be concrete and unambiguous so Phase 2 authors do not interpret it loosely.

Phases with standard, well-documented patterns (can proceed without additional research):

- **Phase 1 (Manifest Schema):** Mechanical extension of existing 16-field schema; zero architectural uncertainty; direct precedent in v0.11 schema extension
- **Phase 3 (Competitive + Opportunity):** Both extend existing skills with patterns directly established in v0.11; TAM/SAM/SOM methodology and RICE business adaptation are well-documented
- **Phase 5 (System Stage):** Brand positioning section is additive to existing token generation; clear scope, no novel patterns
- **Phase 11 (designCoverage Audit):** Mechanical audit following identical v0.11 Phase 83 process; procedure is fully documented in ARCHITECTURE.md

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Next.js 16.2.1, Vercel CLI `--no-wait` pattern, Resend Server Action pattern all verified against official docs. Package versions (Stripe SDK, React Email, Resend) are MEDIUM confidence — confirmed via npm search results as of 2026-03-22; re-verify at Phase 9 implementation since npm packages are frequently updated. Stripe embeddable pricing table web component pattern is HIGH confidence (official docs). |
| Features | MEDIUM-HIGH | Table stakes verified against Lean Canvas (Ash Maurya), Business Model Canvas (Osterwalder/Pigneur), YC/Sequoia pitch frameworks, and Stripe Atlas guides. Feature prioritization and track depth estimates are inferred from methodology literature and PDE pipeline capabilities, not empirical user research. P1 feature set is solid; P2/P3 boundaries are provisional and should be validated once the core pipeline is working. |
| Architecture | HIGH | Grounded in direct codebase inspection of v0.11 experience type as the direct implementation precedent. Orthogonal flag pattern, designCoverage 16-field pass-through, and experience conditional block patterns all directly verified. The key distinction (orthogonal modifier vs additive type) is well-established through the codebase analysis and the v0.11 post-mortem on designCoverage clobber. |
| Pitfalls | HIGH (pipeline integration) / MEDIUM (external services) | Pipeline integration risks (clobber bug, orthogonal dimension model, track branching) are HIGH confidence grounded in v0.11 Phase 83 post-mortem and direct codebase inspection. Financial/legal hallucination risks are MEDIUM confidence from 2025 legal/AI research sources. Stripe/Vercel/Resend integration pitfalls are MEDIUM confidence from official docs and community reports — real-world CLI behavior in Claude Code context needs empirical testing. |

**Overall confidence:** HIGH

### Gaps to Address

- **User track depth thresholds:** The architecture specifies that solo founder artifacts are "1-2 pages" and product leader artifacts are "5-8 pages" — but the exact section counts and line count ranges per track are not defined in the research. These must be specified in `references/business-track.md` during Phase 1. If each downstream workflow author interprets "solo depth" independently, track consistency breaks silently.

- **Stripe pricing config API compatibility:** The BIZ-pricing JSON schema (STACK.md) specifies current Stripe API object structure as of 2026-03-22. Verify against the live Stripe API reference when Phase 9 begins — Stripe APIs evolve and the schema fields (`checkout_mode`, `lookup_key`, `recurring.interval`) should be re-confirmed at implementation time.

- **Human approval gate UX definition:** The deploy workflow requires four distinct approval gates. The exact prompt format (what the user sees, what constitutes valid approval, what timeout behavior applies) is specified at a high level in ARCHITECTURE.md but needs concrete UX definition before Phase 9 implementation. The existing VAL-03 pattern from MCP integrations provides a starting point.

- **business:experience composition scope:** FEATURES.md defers `business:experience` to v0.13+, but ARCHITECTURE.md's Nyquist tests include verifying the composition works. This tension should be resolved during roadmap planning — either add explicit Phase 12 validation for the business:experience case or explicitly narrow Phase 12 scope to business:software and business:hardware only.

- **Lean Canvas confidence-level tracking:** The research specifies a `confidence: "validated | assumed | unknown"` field per Lean Canvas box. How this confidence level is updated through subsequent pipeline stages (particularly via the iterate skill in business mode) needs design — the research identifies this as a differentiator but the update mechanism is underspecified.

---

## Sources

### Primary (HIGH confidence)
- Next.js 16.2.1 official blog post (nextjs.org/blog/next-16-2) — version, Turbopack default, React 19.2, Server Actions pattern
- Vercel agent-skills repo (vercel-labs/agent-skills/skills/deploy-to-vercel/SKILL.md) — human approval gate pattern, `vercel --prod --no-wait` behavior
- Vercel Docs (vercel.com/docs/cli/deploy) — `--no-wait` flag, deployment URL return
- Stripe Docs (docs.stripe.com/payments/checkout/pricing-table) — embeddable pricing table web component, no React required
- Resend Docs (resend.com/docs/send-with-nextjs) — Server Action pattern, `resend.emails.send()` with React Email component
- Stripe Dev Blog (stripe.dev/blog/avoiding-test-mode-tangles-with-stripe-sandboxes) — test mode isolation pattern, sandbox strategy
- Stripe Docs (docs.stripe.com/keys) — API key security, test vs live mode defaults
- Nielsen Norman Group (nngroup.com/articles/service-blueprinting-faq) — 5-swimlane service blueprint standard (customer actions, frontstage, line of visibility, backstage, support)
- Osterwalder & Pigneur, Business Model Generation — 9-block BMC schema (original source)
- Ash Maurya, Running Lean — Lean Canvas 9-box framework with confidence-level annotation pattern
- Direct codebase inspection: all 14 v0.11 workflow files, `design-manifest.json` template, `bin/lib/design.cjs`, `PROJECT.md` v0.11 key decisions, v0.11 Phase 83 designCoverage clobber post-mortem

### Secondary (MEDIUM confidence)
- npm registry search results (2026-03-22): `stripe@20.4.1`, `@stripe/stripe-js@8.11.0`, `resend@6.9.4`, `react-email@5.2.9`, `@stripe/mcp@0.2.5` — confirmed as current versions
- BizTech Magazine (2025) — LLM hallucination rates exceeding 15% in financial contexts (biztechmagazine.com)
- techandmedialaw.com (2025) — AI hallucination liability, disclaimers rarely eliminate liability when user reasonably relies on content
- danielrosslawfirm.com (2025) — AI contracts, waiver and limitation of liability provisions for AI tools
- moldstud.com — common Stripe payment processing mistakes in developer implementations
- vercel.com/kb/guide/ai-agents — AI agent deployment patterns on Vercel
- Y Combinator startup pitch deck format — 10-slide standard (problem/solution/market/product/business model/traction/GTM/competition/team/ask)
- Sequoia Capital pitch deck format — 13-slide variant
- WebSearch verification: no dominant JSON schema standard for BMC in developer tools (confirmed across multiple sources)

### Tertiary (LOW confidence)
- toksta.com Resend review (2025) — community review of Resend deliverability and Next.js integration quality
- baytechconsulting.com — hidden dangers of AI hallucinations in financial services (general framing)

---
*Research completed: 2026-03-22*
*Ready for roadmap: yes*
