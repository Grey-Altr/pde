# Stack Research

**Domain:** Business product type — venture design engine additions to existing PDE platform (v0.12)
**Researched:** 2026-03-22
**Confidence:** HIGH for deployment stack (verified against official docs and npm); MEDIUM for artifact format conventions (no dominant JSON schema standard exists for BMC/service blueprints — PDE defines its own)

---

## Scope

This document covers ONLY the net-new stack additions required for the v0.12 Business Product Type milestone. The existing PDE stack (Node.js CommonJS, DTCG 2025.10 JSON tokens, OKLCH CSS custom properties, HTML/CSS wireframes, Mermaid flowcharts, zero npm deps at plugin root, mcp-bridge.cjs, pde-tools.cjs) is validated and out of scope.

**Core verdict:** Three isolated npm dependency surfaces are required — the generated landing page scaffold (Next.js + Stripe + Resend + React Email), the deployment CLI (Vercel CLI), and optionally the Stripe MCP server for live product/price management. All three are scoped to user-deployed projects or one-time CLI invocations, never installed at the plugin root. The PDE plugin itself adds zero new npm packages.

---

## Recommended Stack

### Core Technologies: New Additions

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.2.1 (latest stable as of 2026-03-18) | Generated landing page scaffold | The standard for Vercel-deployed React apps. App Router is now the default, Server Actions replace `/api/` routes for form handling, Turbopack is the default bundler. PDE generates a `next.config.ts`, `app/` directory, and `package.json` as a deployable artifact — not installed in the plugin. Landing pages with pricing, email capture, and hero sections are the canonical Next.js use case. |
| Stripe Node.js SDK | `stripe@20.4.1` (latest as of 2026-03-22) | Pricing config, payment intent, subscription lifecycle in generated landing page | Official Stripe SDK for Node.js/Next.js. Server Actions in Next.js 16 call `stripe.checkout.sessions.create()` directly — no `/api/checkout` route needed. v20 is the current major version with full TypeScript types and native async/await. Goes into the generated project's `package.json`, not the plugin. |
| @stripe/stripe-js | `8.11.0` (latest as of 2026-03-22) | Client-side Stripe.js loading in generated landing page | The client-side companion to the server SDK. Loads Stripe.js securely, handles card element rendering. Required alongside the server SDK for embedded checkout or Stripe Elements integration. Generated into the landing page scaffold. |
| Resend SDK | `resend@6.9.4` (latest as of 2026-03-22) | Transactional email sending from generated landing page | The standard for sending email from Next.js + Vercel. Co-created with React Email — native TypeScript API, `resend.emails.send()` accepts a React component directly. Generates a `RESEND_API_KEY` env var requirement documented in the PDE deployment checklist. Goes into the generated project's `package.json`. |
| React Email | `react-email@5.2.9` + `@react-email/components` (latest as of 2026-03-22) | Email template component library for generated templates | The canonical React-based email builder. Renders to HTML that works across Gmail, Outlook, and Apple Mail. `npx react-email dev` provides a local preview server. PDE generates JSX email templates (welcome, investor update, launch announcement) as files in `emails/` within the landing page scaffold. Goes into the generated project's `package.json`. |
| Vercel CLI | `vercel` (current stable, invoke via `npx vercel`) | Deployment orchestration with human approval gate | The only reliable programmatic deployment path for Vercel without requiring a git remote. `vercel --prod --no-wait` returns immediately with a deployment URL. PDE's deployment workflow wraps this with a mandatory human confirmation step before the CLI call — matching the pattern documented in `vercel-labs/agent-skills`. Invoked via `npx vercel` so no global install is required. |

### Supporting Libraries: Generated Project Only

These go into the user's generated landing page `package.json`. PDE generates the scaffold files. None are installed in the plugin directory.

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tailwindcss` | `^4.0` | Utility CSS for landing page | Tailwind v4 ships as a CSS plugin (no PostCSS config required in Next.js 16). Use for all generated landing page UI — hero, pricing table, social proof sections. Standard choice for Next.js landing pages in 2026. |
| `@stripe/react-stripe-js` | `5.6.1` | React wrappers for Stripe Elements | Only needed if generating embedded card elements. For pricing tables using Stripe's hosted Checkout, this is optional — the embedded pricing table uses a script tag and web component, not React. Include only when the project requires custom card UI. |
| `@vercel/analytics` | latest | Vercel web analytics in generated pages | Zero-config analytics available on all Vercel plans. Inject as `<Analytics />` component in the root layout. PDE generates this by default since founders need baseline traffic data from day one. |
| `zod` | `^3.23` | Schema validation for Server Actions in generated landing page | Next.js 16 Server Actions validate form input server-side. Zod is the standard validation library for this pattern and has zero client-side bundle impact. PDE generates Zod schemas for email capture and waitlist forms. |

### Stripe MCP Server (Optional Integration)

| Integration | Version | Purpose | When to Use |
|-------------|---------|---------|-------------|
| `@stripe/mcp` | `0.2.5` (latest as of 2026-03-22) | Live Stripe product/price management via MCP | Add to `APPROVED_SERVERS` in `mcp-bridge.cjs` when the user wants to create Stripe products and prices interactively during the business pipeline. Allows PDE to generate a Stripe pricing config spec AND optionally provision the actual Stripe resources via MCP tool calls. Uses the same probe/degrade/consent gate pattern as existing MCP integrations. This is additive — the pricing config spec is always generated; MCP provisioning is an enhancement. |

---

## Artifact Format Definitions (No External Standard)

No dominant JSON schema standard exists for business model canvas or service blueprint artifacts in a developer context. PDE defines its own formats, following the same philosophy as `design-manifest.json` and DTCG tokens: structured JSON for machine consumption, markdown for human readability.

### Business Thesis Artifact (BIZ-thesis)

Markdown document. Derived from the brief stage when `product_type === "business"`. Captures:
- One-sentence venture thesis (what, for whom, why now)
- Problem statement with evidence
- Solution hypothesis
- Unfair advantage / moat
- Comparable companies with positioning delta
- Stage of business (pre-product, pre-revenue, post-revenue)

Format: Markdown with structured H2 sections. Stored at `.planning/design/strategy/BIZ-thesis-v{N}.md`.

### Business Model Canvas Artifact (BIZ-canvas)

JSON document following the 9-block Osterwalder framework. PDE defines the schema:

```json
{
  "version": "1.0",
  "product_type": "business",
  "canvas_type": "lean" | "full",
  "blocks": {
    "value_proposition": { "primary": "string", "supporting": ["string"] },
    "customer_segments": [{ "name": "string", "description": "string", "size": "string" }],
    "channels": [{ "type": "string", "description": "string", "owned": true }],
    "customer_relationships": [{ "type": "string", "description": "string" }],
    "revenue_streams": [{ "name": "string", "model": "string", "estimated_arpu": "string" }],
    "key_resources": [{ "type": "string", "description": "string" }],
    "key_activities": ["string"],
    "key_partnerships": [{ "partner": "string", "type": "string", "value": "string" }],
    "cost_structure": [{ "item": "string", "type": "fixed | variable", "estimated": "string" }]
  },
  "generated_at": "ISO8601",
  "track": "solo_founder | startup_team | product_leader"
}
```

Stored at `.planning/design/strategy/BIZ-canvas-v{N}.json`. Also rendered as a Markdown summary for human review.

### Market Landscape Artifact (BIZ-landscape)

Structured markdown, replacing the competitive analysis artifact for `business:` dimension. Sections:
- Market size (TAM / SAM / SOM with sourcing notes)
- Competitive positioning grid (2x2 matrix rendered as ASCII or Mermaid quadrant)
- Competitor profiles (same format as existing `CMP-*.md` but with business model analysis appended)
- Market timing argument
- Regulatory landscape (if applicable)

Stored at `.planning/design/strategy/BIZ-landscape-v{N}.md`.

### Service Blueprint Artifact (BIZ-blueprint)

Markdown document with swimlane structure. UX service blueprints follow a 5-row swimlane standard (Nielsen Norman Group): customer actions, frontstage interactions, backstage interactions, support processes, physical evidence. PDE renders this as a Mermaid sequence diagram (for simple linear flows) or a structured markdown table (for multi-channel parallel flows).

Format: Markdown. Stored at `.planning/design/ux/BIZ-blueprint-v{N}.md`.

### Launch Kit Index (BIZ-launch-kit)

JSON manifest listing all launch artifacts generated for the business track. Machine-readable. Consumed by the deployment workflow.

```json
{
  "version": "1.0",
  "generated_at": "ISO8601",
  "track": "solo_founder | startup_team | product_leader",
  "artifacts": {
    "landing_page": { "path": "launch/landing-page/", "status": "generated | deployed", "url": null },
    "pitch_deck": { "path": "launch/pitch-deck.md", "status": "generated" },
    "pricing_config": { "path": "launch/stripe-pricing.json", "status": "generated | provisioned" },
    "email_templates": [
      { "name": "welcome", "path": "launch/emails/welcome.tsx", "status": "generated" },
      { "name": "investor_outreach", "path": "launch/emails/investor-outreach.tsx", "status": "generated" }
    ],
    "content_calendar": { "path": "launch/content-calendar.md", "status": "generated" },
    "investor_sequence": { "path": "launch/investor-outreach-sequence.md", "status": "generated" },
    "operational_playbook": { "path": "launch/operational-playbook.md", "status": "generated" },
    "domain_strategy": { "path": "launch/domain-strategy.md", "status": "generated" }
  }
}
```

Stored at `.planning/design/handoff/BIZ-launch-kit.json`.

### Stripe Pricing Config Spec (BIZ-pricing)

JSON document specifying the exact Stripe product/price configuration to create. Consumed by the deployment workflow for optional MCP provisioning or manual dashboard setup.

```json
{
  "products": [
    {
      "name": "string",
      "description": "string",
      "prices": [
        {
          "nickname": "string",
          "currency": "usd",
          "unit_amount": 2900,
          "recurring": { "interval": "month" } | null,
          "lookup_key": "string"
        }
      ]
    }
  ],
  "checkout_mode": "payment | subscription",
  "success_url": "string",
  "cancel_url": "string"
}
```

Stored at `.planning/design/handoff/BIZ-pricing-v{N}.json` and copied to `launch/stripe-pricing.json` in the generated landing page scaffold.

---

## Generated Landing Page Scaffold Structure

PDE generates a deployable Next.js project at `.planning/launch/landing-page/`. The scaffold structure:

```
landing-page/
  app/
    layout.tsx          # Root layout with Analytics, font, metadata
    page.tsx            # Hero + social proof + pricing table
    actions.ts          # Server Actions: email capture, Stripe checkout session
    api/
      webhooks/
        stripe/
          route.ts      # Stripe webhook handler (signature verification)
  emails/
    welcome.tsx         # React Email welcome template
    investor-outreach.tsx
  public/               # Static assets
  .env.example          # Documents required env vars
  next.config.ts
  package.json          # Generated with exact versions above
  tailwind.config.ts    # (if needed — Tailwind v4 may not require this)
  tsconfig.json
  vercel.json           # { "framework": "nextjs" } — minimal config
```

The `package.json` is generated with pinned versions matching the versions in this document. The `.env.example` documents all required env vars:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

---

## Deployment Workflow Stack

PDE's deployment workflow (the `/pde:deploy` command or equivalent) uses the Vercel CLI with a mandatory human approval gate. The pattern, derived from `vercel-labs/agent-skills`:

1. Check if the landing page scaffold exists at `.planning/launch/landing-page/`
2. Check if the directory is already linked to Vercel (`vercel inspect` or check `.vercel/project.json`)
3. Present a deployment summary to the user: what will be deployed, which env vars are needed
4. **PAUSE. Require explicit user confirmation before proceeding.**
5. If not linked: run `vercel link` (interactive — hands off to user)
6. If env vars missing: display the list from `.env.example` and instruct the user to set them via `vercel env add` or the Vercel dashboard
7. After confirmation: run `npx vercel --prod --no-wait` — returns the deployment URL immediately
8. Display the URL and next steps (webhook endpoint configuration for Stripe, DNS for custom domain)

The `--no-wait` flag is essential: it prevents the Claude Code session from blocking on build completion (which can take 2-5 minutes). The deployment URL is returned immediately and displayed in the terminal.

---

## Installation

The plugin itself installs nothing. All packages are in generated project scaffolds.

```bash
# PDE plugin: zero new npm packages at plugin root
# (Same as v0.11 — no change to plugin-level dependencies)

# Generated landing page scaffold: installed by the user in their project
# (PDE generates the package.json; user runs npm install in the generated directory)
cd .planning/launch/landing-page/
npm install

# Dev dependencies in generated project
npm install -D typescript @types/node @types/react @types/react-dom

# Optional: Stripe CLI for local webhook testing (user's machine, not plugin)
# brew install stripe/stripe-cli/stripe
# stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js 16 App Router | Next.js 16 Pages Router | Never for new projects — Pages Router is in maintenance mode; App Router has been the recommended path since Next.js 13. Server Actions in App Router eliminate the need for separate API routes for form handling, which is exactly what landing page email capture and Stripe checkout need. |
| Next.js 16 App Router | Remix / SvelteKit / Astro | If the user's team has strong Remix or Svelte expertise. For PDE-generated scaffolds, Next.js is the correct default: it is Vercel's own framework, has the most deployment integrations (Vercel Marketplace, Stripe, Resend), and the largest ecosystem of reference implementations. Astro is an option for purely static landing pages with no server logic — but Stripe webhooks and email capture require a server runtime. |
| Resend + React Email | SendGrid / Postmark | Resend is the modern default for Next.js + Vercel projects. Its API design is simpler (no template IDs, no dashboard-configured templates — code is the template). React Email components render correctly in Gmail and Outlook, which is the primary requirement for transactional startup email. Use SendGrid or Postmark if the user already has an account there — Resend has a free tier (3,000 emails/month) suitable for early-stage launch. |
| Stripe hosted Checkout + embedded pricing table | Stripe Elements (custom card UI) | Use Stripe Elements when the user explicitly needs custom card input styling embedded in the page. For most early-stage SaaS landing pages, the hosted Checkout provides adequate UX and requires zero client-side Stripe JavaScript beyond the pricing table web component. The PDE scaffold generates Stripe hosted Checkout by default; Elements can be added later. |
| Vercel CLI (`npx vercel --prod`) | `@vercel/client` npm package | `@vercel/client` is the programmatic API for deployments, but it requires Node.js setup in a persistent process and is designed for CI/CD pipelines. The CLI is simpler for one-shot deployments from a development machine, which is PDE's use case. Use `@vercel/client` if PDE later builds a persistent deployment agent. |
| BMC + thesis in markdown/JSON (PDE-defined) | External BMC SaaS tools (Miro, Creately, Visual Paradigm) | External tools require accounts, browser access, and export steps. PDE's strength is generating all artifacts as local files in `.planning/`. The BMC JSON is machine-readable for downstream pipeline stages (pricing → Stripe config, segments → email sequences). Miro/Creately add zero value over the PDE-generated formats for the AI-assisted workflow. |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Any npm package at plugin root for business features | Violates the zero-npm-deps-at-plugin-root constraint. All business pipeline logic is prompt-driven template generation — no library needed to generate a JSON business model canvas or a markdown pitch deck. | Template generation in workflow markdown files using the same pattern as all existing PDE skills |
| `@stripe/react-stripe-js` in generated scaffold by default | Adds client-side complexity and bundle weight that most early-stage landing pages don't need. Stripe's embeddable pricing table (web component via script tag) handles the pricing display with zero React integration. | Embeddable pricing table web component; add `@stripe/react-stripe-js` only when explicitly requiring Stripe Elements for custom card UI |
| Pitch deck as PPTX or PDF output | Generating binary formats requires npm packages (pptxgenjs, PDFKit) which violate zero-npm-deps at plugin root. Pitch decks in `.md` format are readable, editable, and convertible to any format by the user. | Markdown pitch deck with structured sections; users export to PDF or PPTX via Pandoc, Slides.com, or Canva import |
| External CRM integration (HubSpot, Salesforce) for investor outreach | Adds OAuth flows, external API dependencies, and scope creep. The investor outreach sequence is a content artifact (email copy + cadence), not a CRM workflow. PDE's role is to generate the content; the user manages the sending. | Investor outreach sequence as structured markdown with email copy, timing, and instructions; user pastes into their email client or CRM |
| Automatic DNS configuration | DNS changes require domain registrar access and have propagation delays. Any automation here creates unrecoverable state if something goes wrong. Vercel's dashboard DNS setup is 3 clicks — simpler than any programmatic alternative. | Document DNS steps in the deployment checklist with exact values from `vercel inspect` output |
| Multi-cloud deployment targets (AWS Amplify, Railway, Render) | Vercel is the correct default for Next.js deployments — it is the same company, has zero-config detection, and the free tier handles launch-stage traffic. Supporting multiple deployment targets multiplies the deployment workflow surface with minimal user benefit. | Vercel exclusively; note in the deployment skill that the generated Next.js scaffold is portable to any platform if the user prefers |
| Business plan financial modeling (revenue projections, unit economics calculations) | Requires domain-specific financial modeling that varies by business model and stage. PDE generates the budget framework structure and prompts; actual numbers are user-supplied. | Budget outline template in the operational playbook with formulas documented as prose, not computed values |
| `@stripe/mcp` in APPROVED_SERVERS by default | MCP tool passthrough to subagents already has a documented constraint. The Stripe MCP server requires STRIPE_SECRET_KEY in scope — a high-privilege credential. Add to APPROVED_SERVERS only as an explicit opt-in with user consent, not automatically. | Generate the BIZ-pricing-vN.json spec first; offer MCP provisioning as an optional step with a clear consent gate |

---

## Stack Patterns by User Track

**If track is `solo_founder`:**
- Generate lean BMC (fewer blocks, simplified vocabulary: "how you make money" not "revenue streams")
- Landing page scaffold: single page, email capture CTA, one pricing tier or waitlist
- Stripe config: single product, optional free tier
- Email templates: welcome + update sequence (2-3 emails)
- Pitch deck: 10-slide format (problem/solution/market/product/traction/team/ask)
- Investor sequence: warm intro and cold outreach variant
- Operational playbook: solo-operator format (no org chart, no team communication plan)

**If track is `startup_team`:**
- Generate full BMC with all 9 blocks
- Landing page scaffold: hero + features + social proof + pricing table + FAQ
- Stripe config: 2-3 pricing tiers with annual/monthly toggle
- Email templates: welcome, onboarding sequence, investor update
- Pitch deck: 12-15 slides with team slide and financial projections section
- Investor sequence: warm intro, cold outreach, investor update cadence
- Operational playbook: team roles, communication rhythm, OKR template

**If track is `product_leader`:**
- Generate business thesis focused on internal business case framing (not external fundraising)
- Landing page scaffold: internal tool launch page or product microsite
- Stripe config: not always applicable — generate only if the product has an external pricing model
- Email templates: internal announcement, stakeholder update
- Pitch deck: internal business case format (not investor deck)
- Investor sequence: not applicable — replace with stakeholder communication sequence
- Operational playbook: product launch checklist, success metrics, rollback plan

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `next@16.2.1` | `react@19.2`, `react-dom@19.2` | Next.js 16.2 ships with React 19.2. Generated `package.json` pins `next@latest react@latest react-dom@latest`. Turbopack is the default bundler — no `--turbopack` flag needed. |
| `stripe@20.4.1` | Node.js 18+ | Stripe Node SDK v20 requires Node.js 18+. Vercel's default runtime is Node.js 20. Compatible. |
| `resend@6.9.4` | `react-email@5.2.9`, Next.js 16 Server Actions | Resend's `send()` method accepts a React element rendered by `@react-email/render`. The render step happens server-side in a Server Action or Route Handler — compatible with Next.js 16 App Router. |
| `react-email@5.2.9` | React 19.2 | React Email v5 is compatible with React 19. The `react-email dev` preview server runs independently on a separate port — no conflict with Next.js dev server. |
| `tailwindcss@^4.0` | Next.js 16 | Tailwind v4 works as a CSS plugin via `@import "tailwindcss"` in the global CSS file. No `tailwind.config.ts` required by default. Compatible with Turbopack. |
| `@stripe/mcp@0.2.5` | `mcp-bridge.cjs` probe/degrade pattern | Stripe MCP server uses stdio transport — same transport as other MCP integrations in PDE. Probe/degrade contract applies: if `STRIPE_SECRET_KEY` is not set, MCP bridge degrades gracefully to the static pricing config spec output. |

---

## Sources

- Next.js 16.2 official blog post: [nextjs.org/blog/next-16-2](https://nextjs.org/blog/next-16-2) — version 16.2.1, released 2026-03-18, Turbopack default, React 19.2, Server Function Logging, Adapters stable (HIGH confidence — official source, fetched 2026-03-22)
- npm registry: `stripe@20.4.1` — 12 days ago (as of 2026-03-22), MEDIUM confidence (search result, npm page 403'd)
- npm registry: `@stripe/stripe-js@8.11.0` — 3 days ago, MEDIUM confidence (search result)
- npm registry: `@stripe/react-stripe-js@5.6.1` — 14 days ago, MEDIUM confidence (search result)
- npm registry: `resend@6.9.4` — 5 days ago, MEDIUM confidence (search result)
- npm registry: `react-email@5.2.9` — 16 days ago (as of 2026-03-22), MEDIUM confidence (search result)
- npm registry: `@stripe/mcp@0.2.5` — confirmed from search results (MEDIUM confidence)
- Stripe Docs: [Embeddable pricing table](https://docs.stripe.com/payments/checkout/pricing-table) — web component embed pattern, no React required (HIGH confidence — official docs)
- Resend Docs: [Send with Next.js](https://resend.com/docs/send-with-nextjs) — Server Action pattern, `resend.emails.send()` with React Email component (HIGH confidence — official docs)
- Vercel agent-skills repo: [deploy-to-vercel skill](https://github.com/vercel-labs/agent-skills/blob/main/skills/deploy-to-vercel/SKILL.md) — human approval gate pattern, `vercel --prod --no-wait`, env var discovery (HIGH confidence — official Vercel Labs source)
- Vercel Docs: [CLI deploy](https://vercel.com/docs/cli/deploy) — `--no-wait` flag, deployment URL return (HIGH confidence — official docs)
- Nielsen Norman Group: [Service Blueprinting FAQ](https://www.nngroup.com/articles/service-blueprinting-faq/) — 5-swimlane standard (customer actions, frontstage, backstage, support, physical evidence) (HIGH confidence — authoritative UX research source)
- Osterwalder & Pigneur: Business Model Generation — 9-block BMC schema (HIGH confidence — original source, widely standardized)
- WebSearch verified: no dominant JSON schema standard exists for BMC in developer tools (2026 search results confirm all BMC tooling uses proprietary formats) (MEDIUM confidence — absence of evidence, cross-referenced multiple sources)

---

*Stack research for: PDE v0.12 Business Product Type — net-new stack additions only*
*Researched: 2026-03-22*
