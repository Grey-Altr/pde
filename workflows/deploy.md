<purpose>
Generate deployable scaffold code from upstream launch artifacts (LDP, STR, OTR) with mandatory human approval gates before every external write. Stage 14 of the PDE design pipeline — conditionally executed ONLY when `businessMode === true`. Produces a Next.js 16.2.1 App Router landing page scaffold, a Stripe pricing config with test-mode keys, Resend-compatible React Email template stubs, and initiates a non-blocking Vercel deployment. All artifacts are staged in `.planning/deploy-staging/` and tracked in `deploy-manifest.json` with `review_required: true` per artifact.
</purpose>

<required_reading>
@references/launch-frameworks.md
@references/business-financial-disclaimer.md
@references/business-legal-disclaimer.md
</required_reading>

<process>

## /pde:deploy — Stage 14: Deploy Skill

> **Stage 14** of the `/pde:build` pipeline. Conditionally appended ONLY when `businessMode === true`. Declining any approval gate halts the entire deploy — gates are NOT resumable.

Check for flags in $ARGUMENTS before beginning: `--dry-run`, `--verbose`, `--force`.

---

### Step 1/6: Initialize and verify prerequisites

#### 1a. Read businessMode from manifest

```bash
BM=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-get-top-level businessMode 2>/dev/null)
if [[ "$BM" == @file:* ]]; then BM=$(cat "${BM#@file:}"); fi
```

If `$BM` is NOT `"true"`:

```
Deploy is only available for business-mode projects.
businessMode is currently: false (or not set).

To enable business mode, run /pde:brief on a project description
containing business intent signals. PDE will detect business intent
and set businessMode: true in the design manifest.
```

HALT.

#### 1b. Read businessTrack from manifest

```bash
BT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-get-top-level businessTrack 2>/dev/null)
if [[ "$BT" == @file:* ]]; then BT=$(cat "${BT#@file:}"); fi
```

Store as `$BT` for use in manifest and scaffold generation.

#### 1c. Check hasLaunchKit coverage flag

```bash
HLK=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check hasLaunchKit 2>/dev/null)
if [[ "$HLK" == @file:* ]]; then HLK=$(cat "${HLK#@file:}"); fi
```

If `$HLK` is NOT `"true"` and `--force` is NOT set:

```
Launch kit not yet assembled. hasLaunchKit: false.

The deploy stage requires the launch kit to be complete before
generating deployment scaffolds. Run /pde:handoff to assemble:
  - LKT-launch-kit manifest
  - CNT-content-calendar artifact
  - OTR-outreach email sequence artifact

Then re-run /pde:deploy.
```

HALT.

If `--force` is set: Display `Warning: --force set. Proceeding without confirmed launch kit.` and continue.

#### 1d. Collision detection for existing deploy-staging

```bash
ls ".planning/deploy-staging/landing-page/package.json" 2>/dev/null
COLLISION_EXIT=$?
```

If `$COLLISION_EXIT == 0`:

Display:

```
Warning: Deploy staging already exists at .planning/deploy-staging/.

Continuing will overwrite existing scaffold files. If you have
customized the scaffold, those changes will be lost.
```

Use AskUserQuestion with:
- question: `"Existing deploy staging found. Continue and overwrite?"`
- options: `["Continue — overwrite existing scaffold", "Cancel — keep existing files"]`

If user selects "Cancel": Display `Deploy cancelled. Existing scaffold preserved at .planning/deploy-staging/.` HALT.

Display: `Step 1/6: Prerequisites verified. businessMode: true, businessTrack: ${BT}.`

---

### Step 2/6: Read upstream launch artifacts

Use Glob to find the latest versions of each upstream artifact:

```bash
# Find latest LDP artifact
LDP_FILE=$(ls .planning/design/launch/LDP-landing-page-v*.md 2>/dev/null | sort -V | tail -1)

# Find latest STR artifact
STR_FILE=$(ls .planning/design/launch/STR-stripe-pricing-v*.json 2>/dev/null | sort -V | tail -1)

# Find latest OTR artifact
OTR_FILE=$(ls .planning/design/launch/OTR-outreach-sequences-v*.md 2>/dev/null | sort -V | tail -1)
```

If `$LDP_FILE` is empty:

```
Required artifact not found: LDP-landing-page

The deploy workflow requires a Landing Page Wireframe spec to generate
the Next.js scaffold. Expected path pattern:
  .planning/design/launch/LDP-landing-page-v{N}.md

Run /pde:wireframe (in business mode) to generate the LDP artifact first.
```

HALT.

If `$STR_FILE` is empty:

```
Required artifact not found: STR-stripe-pricing

Expected: .planning/design/launch/STR-stripe-pricing-v{N}.json
Run /pde:wireframe to generate the STR artifact.
```

HALT.

If `$OTR_FILE` is empty:

```
Required artifact not found: OTR-outreach

Expected: .planning/design/launch/OTR-outreach-sequences-v{N}.md
Run /pde:handoff to generate the OTR artifact.
```

HALT.

Read each artifact using the Read tool. Extract:
- From LDP: Section Map table (component names, Next.js paths, Server/Client designation)
- From STR: Pricing tier names, billing intervals, trial periods, checkout mode
- From OTR: Email sequence names, triggers, delays, CTA descriptions

Store as `$LDP_SECTIONS`, `$STR_TIERS`, `$OTR_EMAILS` for use in scaffold generation.

Display: `Step 2/6: Upstream artifacts loaded. LDP: ${LDP_FILE}, STR: ${STR_FILE}, OTR: ${OTR_FILE}.`

---

### Step 3/6: Approval-gated scaffold generation

This step contains Approval Gates 1/4, 2/4, and 3/4. Each gate is independent — declining any gate halts without partial rollback of previously written files.

#### Gate 1/4 — Next.js Landing Page Scaffold

Use AskUserQuestion with:
- question: `"Approval Gate 1/4 — Next.js Landing Page Scaffold\n\nAbout to generate Next.js 16.2.1 App Router scaffold at:\n  .planning/deploy-staging/landing-page/\n\nPinned versions:\n  - Next.js 16.2.1\n  - Tailwind v4 (4.2.2)\n  - Stripe v20 (20.4.1)\n  - Resend 6.9.4\n\nComponents from LDP spec:\n  ${LDP_SECTIONS}\n\nAll content uses [YOUR_X] structural placeholders — no live data generated.\n\nProceed?"`
- options: `["Proceed", "Halt -- stop deployment"]`

If user selects "Halt -- stop deployment":

```
Deploy halted at Gate 1/4. No files written.
Re-run /pde:deploy to restart from the beginning.
```

HALT.

If user selects "Proceed":

Create `.planning/deploy-staging/.gitignore` using the Write tool:

```
# PDE deploy staging — do not commit to project repository
# This directory contains generated scaffold files and placeholder keys.
# Replace all [YOUR_X] placeholders and API keys before deploying.
*
```

Generate the Next.js scaffold files using the Write tool. Create each file individually. All content placeholders use `[YOUR_X]` format — no actual product names, pricing, or personal data.

**File: `.planning/deploy-staging/landing-page/package.json`**

```json
{
  "name": "[your-product-slug]",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "16.2.1",
    "react": "^19",
    "react-dom": "^19",
    "stripe": "20.4.1",
    "resend": "6.9.4",
    "tailwindcss": "4.2.2"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "latest",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.1"
  }
}
```

**File: `.planning/deploy-staging/landing-page/next.config.ts`**

```typescript
// Source: Next.js 16.2.1 App Router — minimal config
// https://nextjs.org/docs/app/api-reference/config/next-config-js
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // TODO: Add your Next.js configuration here
  // See: https://nextjs.org/docs/app/api-reference/config/next-config-js
}

export default nextConfig
```

**File: `.planning/deploy-staging/landing-page/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**File: `.planning/deploy-staging/landing-page/postcss.config.mjs`**

```javascript
// Source: Tailwind v4 CSS-first config — postcss.config.mjs is minimal
// Tailwind v4 configuration lives in app/globals.css via @theme directive
export default {
  plugins: {},
}
```

**File: `.planning/deploy-staging/landing-page/app/globals.css`**

```css
/* Source: LDP artifact, Tailwind v4 CSS-first configuration */
/* https://tailwindcss.com/docs/v4-upgrade */
@import "tailwindcss";

@theme {
  /* TODO: Replace with your brand tokens from .planning/design/visual/SYS-brand-tokens.json */
  --color-primary: oklch(0.5 0.2 250);
  --color-primary-foreground: oklch(1 0 0);
  --color-background: oklch(1 0 0);
  --color-foreground: oklch(0.1 0 0);
  --font-sans: 'Inter', sans-serif;
}
```

**File: `.planning/deploy-staging/landing-page/app/layout.tsx`**

```typescript
// Source: Next.js 16.2.1 App Router — root layout
// https://nextjs.org/docs/app/getting-started/project-structure
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '[YOUR_PRODUCT_NAME]',
  description: '[YOUR_PRODUCT_DESCRIPTION]',
  openGraph: {
    title: '[YOUR_PRODUCT_NAME]',
    description: '[YOUR_PRODUCT_DESCRIPTION]',
    url: '[YOUR_PRODUCT_URL]',
    siteName: '[YOUR_PRODUCT_NAME]',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

**File: `.planning/deploy-staging/landing-page/app/(marketing)/layout.tsx`**

```typescript
// Source: LDP artifact — marketing route group layout
// Route group (marketing) separates landing pages from app routes
import SiteNav from './_components/site-nav'
import SiteFooter from './_components/site-footer'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
    </>
  )
}
```

**File: `.planning/deploy-staging/landing-page/app/(marketing)/page.tsx`**

Generate this file with imports from each LDP section component and an assembly JSX block. The section list comes from the LDP Section Map. Use the following structure:

```typescript
// Source: LDP artifact — page assembles all section components from Section Map
// TODO: Review each section component and replace [YOUR_X] placeholders
import HeroSection from './_components/hero-section'
import FeaturesGrid from './_components/features-grid'
import PricingTable from './_components/pricing-table'
import CtaBanner from './_components/cta-banner'
// Add additional imports for sections present in LDP Section Map:
// LogoBar, ProblemStatement, HowItWorks, TestimonialsBlock, FaqAccordion

export default function MarketingPage() {
  return (
    <>
      <HeroSection />
      <FeaturesGrid />
      <PricingTable />
      <CtaBanner />
      {/* TODO: Add/remove sections based on LDP Section Map */}
    </>
  )
}
```

**Files: `.planning/deploy-staging/landing-page/app/(marketing)/_components/`**

Generate the following component stub files. Each file follows the structure:
- `// Source: LDP artifact, Section: {section name}` comment header
- `'use client'` directive for Client Components per LDP spec
- Props typed from LDP `Props` column
- All content as `[YOUR_X]` structural placeholders

Create stubs for all sections found in the LDP Section Map. Minimum set:

`.planning/deploy-staging/landing-page/app/(marketing)/_components/hero-section.tsx`:
```typescript
// Source: LDP artifact, Section: Hero
// TODO: Replace all [YOUR_X] placeholders with your brand content
export default function HeroSection() {
  return (
    <section className="hero">
      <h1>[YOUR_HEADLINE]</h1>
      <p>[YOUR_SUBHEADLINE]</p>
      <a href="[YOUR_CTA_URL]">[YOUR_CTA_TEXT]</a>
    </section>
  )
}
```

`.planning/deploy-staging/landing-page/app/(marketing)/_components/features-grid.tsx`:
```typescript
// Source: LDP artifact, Section: Features Grid
export default function FeaturesGrid() {
  return (
    <section className="features">
      <h2>[YOUR_FEATURES_HEADLINE]</h2>
      {/* TODO: Map your features from .planning/design/strategy/BTH-thesis-v1.md */}
      <div className="grid">[YOUR_FEATURES]</div>
    </section>
  )
}
```

`.planning/deploy-staging/landing-page/app/(marketing)/_components/pricing-table.tsx`:
```typescript
// Source: LDP artifact, Section: Pricing Table
// Source: STR artifact — pricing tiers from Stripe config
// IMPORTANT: Never use real dollar amounts here — use [YOUR_PRICE] placeholders
export default function PricingTable() {
  return (
    <section className="pricing">
      <h2>[YOUR_PRICING_HEADLINE]</h2>
      {/* TODO: Wire to Stripe pricing from .planning/deploy-staging/stripe/stripe-config.json */}
      <div className="tiers">[YOUR_PRICING_TIERS]</div>
    </section>
  )
}
```

`.planning/deploy-staging/landing-page/app/(marketing)/_components/cta-banner.tsx`:
```typescript
// Source: LDP artifact, Section: CTA Banner
export default function CtaBanner() {
  return (
    <section className="cta">
      <h2>[YOUR_CTA_HEADLINE]</h2>
      <p>[YOUR_CTA_BODY]</p>
      <a href="[YOUR_CTA_URL]">[YOUR_CTA_BUTTON]</a>
    </section>
  )
}
```

`.planning/deploy-staging/landing-page/app/(marketing)/_components/site-nav.tsx`:
```typescript
// Source: LDP artifact, Section: Navigation
'use client'
// Client component: handles mobile hamburger state

export default function SiteNav() {
  return (
    <nav>
      <a href="/">[YOUR_PRODUCT_NAME]</a>
      {/* TODO: Add navigation links */}
    </nav>
  )
}
```

`.planning/deploy-staging/landing-page/app/(marketing)/_components/site-footer.tsx`:
```typescript
// Source: LDP artifact, Section: Footer
export default function SiteFooter() {
  return (
    <footer>
      <p>&copy; {new Date().getFullYear()} [YOUR_COMPANY_NAME]. All rights reserved.</p>
      {/* TODO: Add footer links, legal, social */}
    </footer>
  )
}
```

If the LDP Section Map contains additional sections (logo-bar, problem-statement, how-it-works, testimonials-block, faq-accordion), generate corresponding stub components following the same pattern.

**File: `.planning/deploy-staging/landing-page/README.md`**

```markdown
# [YOUR_PRODUCT_NAME] Landing Page Scaffold

Generated by PDE `/pde:deploy` from LDP artifact: ${LDP_FILE}

## Before Deploying

1. Replace all `[YOUR_X]` placeholders with actual content
2. Add your brand tokens from `.planning/design/visual/SYS-brand-tokens.json`
3. Configure Stripe: copy `.../deploy-staging/stripe/stripe-config.json` values to `.env.local`
4. Configure Resend: add `RESEND_API_KEY` to `.env.local`
5. Review components against LDP wireframe spec

## Install Dependencies

\`\`\`bash
npm install
\`\`\`

## Development

\`\`\`bash
npm run dev
# Open http://localhost:3000
\`\`\`

## Environment Variables (.env.local)

\`\`\`
STRIPE_PUBLISHABLE_KEY=pk_test_REPLACE_WITH_YOUR_KEY
STRIPE_SECRET_KEY=sk_test_REPLACE_WITH_YOUR_KEY
RESEND_API_KEY=re_REPLACE_WITH_YOUR_KEY
NEXT_PUBLIC_BASE_URL=http://localhost:3000
\`\`\`

## Deploy to Vercel

\`\`\`bash
npx vercel --prod
\`\`\`

> Note: This scaffold was deployed non-blocking during PDE generation.
> Check the Vercel dashboard for build status.
```

Display: `Step 3/6 (Gate 1/4): Next.js 16.2.1 landing page scaffold written to .planning/deploy-staging/landing-page/`

#### Gate 2/4 — Stripe Pricing Config

Use AskUserQuestion with:
- question: `"Approval Gate 2/4 — Stripe Pricing Config\n\nAbout to generate Stripe pricing config at:\n  .planning/deploy-staging/stripe/stripe-config.json\n\nKey: pk_test_REPLACE_WITH_YOUR_KEY (test mode only — never live keys)\nPricing tiers from STR spec:\n  ${STR_TIERS}\n\nAll prices use [YOUR_PRICE_IN_CENTS] placeholders — no real amounts generated.\n\nProceed?"`
- options: `["Proceed", "Halt -- stop deployment"]`

If user selects "Halt -- stop deployment":

```
Deploy halted at Gate 2/4.
Landing page scaffold was written but Stripe config was not generated.
Re-run /pde:deploy to restart from the beginning.
```

HALT.

If user selects "Proceed":

**File: `.planning/deploy-staging/stripe/stripe-config.json`**

Generate from STR artifact. Use the following schema structure (values from STR spec):

```json
{
  "_comment": "PDE Stripe Config Scaffold — NEVER use live keys. Replace all [YOUR_X] placeholders.",
  "_source": "Generated from STR artifact by PDE /pde:deploy",
  "publishable_key": "pk_test_REPLACE_WITH_YOUR_KEY",
  "secret_key": "sk_test_REPLACE_WITH_YOUR_KEY",
  "product": {
    "name": "[YOUR_PRODUCT_NAME]",
    "description": "[YOUR_PRODUCT_DESCRIPTION]",
    "metadata": {}
  },
  "prices": [
    {
      "nickname": "[YOUR_PLAN_NAME]",
      "currency": "usd",
      "unit_amount": "[YOUR_PRICE_IN_CENTS]",
      "recurring": {
        "interval": "month",
        "interval_count": 1
      },
      "lookup_key": "[YOUR_LOOKUP_KEY]",
      "trial_period_days": null
    }
  ],
  "checkout_mode": "subscription"
}
```

Populate the `prices` array with one entry per pricing tier found in the STR artifact. Preserve billing interval and trial period data from STR. All `unit_amount` values MUST use `"[YOUR_PRICE_IN_CENTS]"` — never real numbers.

**File: `.planning/deploy-staging/stripe/README.md`**

```markdown
# Stripe Pricing Config

Generated by PDE `/pde:deploy` from STR artifact: ${STR_FILE}

## Before Going Live

1. Replace `pk_test_REPLACE_WITH_YOUR_KEY` with your Stripe publishable key
2. Replace `sk_test_REPLACE_WITH_YOUR_KEY` with your Stripe secret key
3. Set actual prices in `unit_amount` (in cents — e.g., 2900 for $29.00)
4. Create products in Stripe Dashboard and update `product.name`

## Create Stripe Products via CLI

\`\`\`bash
stripe products create --name "[YOUR_PRODUCT_NAME]"
stripe prices create --currency usd --unit-amount [YOUR_PRICE] --recurring-interval month --product [PRODUCT_ID]
\`\`\`

## Environment Setup

Add to `.env.local` in your Next.js app:
\`\`\`
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY
STRIPE_SECRET_KEY=sk_live_YOUR_KEY
\`\`\`
```

Display: `Step 3/6 (Gate 2/4): Stripe pricing config written to .planning/deploy-staging/stripe/`

#### Gate 3/4 — Resend Email Templates

Use AskUserQuestion with:
- question: `"Approval Gate 3/4 — Resend Email Templates\n\nAbout to generate React Email template stubs at:\n  .planning/deploy-staging/email/emails/\n\nUsing: @react-email/components 1.0.10\nOTR email sequences from artifact:\n  ${OTR_EMAILS}\n\nAll personalization fields use [YOUR_X] placeholders.\nNo company names, partner references, or investor firm names are generated.\n\nProceed?"`
- options: `["Proceed", "Halt -- stop deployment"]`

If user selects "Halt -- stop deployment":

```
Deploy halted at Gate 3/4.
Landing page scaffold and Stripe config were written.
Email templates were not generated.
Re-run /pde:deploy to restart from the beginning.
```

HALT.

If user selects "Proceed":

**File: `.planning/deploy-staging/email/package.json`**

```json
{
  "name": "[your-product-slug]-emails",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@react-email/components": "1.0.10",
    "react": "^19",
    "react-dom": "^19",
    "resend": "6.9.4"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/react": "^19"
  }
}
```

**Email template stubs from OTR artifact:**

For each email in the OTR onboarding sequence, generate one TSX file in `.planning/deploy-staging/email/emails/`. Use sequential naming: `onboarding-01-welcome.tsx`, `onboarding-02-{name}.tsx`, etc. Base the file names on the OTR email names.

Template structure for each email:

```typescript
// Source: OTR artifact — Onboarding Email {N}: {email name}
// Trigger: {trigger from OTR}, Delay: {delay from OTR}
// TODO: Replace all [YOUR_X] placeholders before sending
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

export default function {EmailName}Email() {
  return (
    <Html>
      <Head />
      <Preview>[YOUR_PREVIEW_TEXT]</Preview>
      <Body>
        <Container>
          <Heading>[YOUR_EMAIL_HEADLINE]</Heading>
          <Text>[YOUR_EMAIL_BODY]</Text>
          <Section>
            <Button href="[YOUR_CTA_URL]">[YOUR_CTA_TEXT]</Button>
          </Section>
          <Text>
            [YOUR_COMPANY_NAME] | <a href="[YOUR_UNSUBSCRIBE_URL]">Unsubscribe</a>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

For the investor outreach sequence from OTR, generate files named `investor-01-intro.tsx`, `investor-02-{name}.tsx`, `investor-03-{name}.tsx`. Use the same component structure. All company names, investor firm names, and personal details MUST use `[YOUR_X]` placeholders.

**File: `.planning/deploy-staging/email/README.md`**

````markdown
# Email Templates

Generated by PDE `/pde:deploy` from OTR artifact: ${OTR_FILE}

Uses `@react-email/components` 1.0.10 + Resend 6.9.4.

## Before Sending

1. Replace all `[YOUR_X]` placeholders in each template
2. Add `RESEND_API_KEY` to your environment
3. Test with Resend's Email Preview: `https://react.email/`

## Send Pattern

```typescript
import { Resend } from 'resend'
import WelcomeEmail from './emails/onboarding-01-welcome'

const resend = new Resend(process.env.RESEND_API_KEY)

await resend.emails.send({
  from: '[YOUR_FROM_ADDRESS]',
  to: '[YOUR_TO_ADDRESS]',
  subject: '[YOUR_SUBJECT]',
  react: WelcomeEmail(),
})
```

## Template Index

Onboarding sequence (from OTR artifact):
- `onboarding-01-welcome.tsx` — Welcome email
- *(additional files from OTR sequence)*

Investor outreach sequence (from OTR artifact, gated on pitch deck completion):
- `investor-01-intro.tsx` — Initial introduction
- `investor-02-followup.tsx` — Follow-up
- `investor-03-update.tsx` — Progress update
````

Display: `Step 3/6 (Gate 3/4): React Email template stubs written to .planning/deploy-staging/email/emails/`

---

### Step 4/6: Approval-gated Vercel deployment

#### Gate 4/4 — Vercel Deploy

Pre-check Vercel CLI authentication:

```bash
VERCEL_AUTH=$(npx vercel whoami 2>/dev/null)
VERCEL_EXIT=$?
```

If `$VERCEL_EXIT != 0`:

```
Not authenticated with Vercel CLI.

The deploy stage requires Vercel CLI authentication to proceed.
Run the following command, then re-run /pde:deploy:

  npx vercel login

This opens a browser-based OAuth flow. Once complete, Vercel stores
your credentials locally and the deploy gate will succeed.
```

HALT.

Use AskUserQuestion with:
- question: `"Approval Gate 4/4 — Vercel Deployment\n\nAuthenticated as: ${VERCEL_AUTH}\n\nAbout to deploy:\n  .planning/deploy-staging/landing-page/ → Vercel production\n\nCommand:\n  npx vercel --prod --no-wait --yes\n\nThis queues a deployment and returns a URL immediately without waiting\nfor the build to complete. Check Vercel dashboard for build status.\n\nProceed?"`
- options: `["Proceed", "Halt -- stop deployment"]`

If user selects "Halt -- stop deployment":

```
Deploy halted at Gate 4/4.
All scaffolds have been generated but the Vercel deployment was not triggered.

To deploy manually:
  cd .planning/deploy-staging/landing-page/
  npx vercel --prod

Or re-run /pde:deploy to go through the gates again.
```

HALT.

If user selects "Proceed":

```bash
DEPLOY_URL=$(npx vercel --prod --no-wait --yes --cwd ".planning/deploy-staging/landing-page/" 2>.planning/deploy-staging/deploy-error.txt)
DEPLOY_EXIT=$?
```

If `$DEPLOY_EXIT != 0`:

```
Vercel deployment failed.

Error output:
```
[contents of .planning/deploy-staging/deploy-error.txt]
```

Scaffold files are preserved at .planning/deploy-staging/. Resolve
the error above and re-run /pde:deploy to retry.
```

HALT.

If `$DEPLOY_EXIT == 0`:

Store `$DEPLOY_URL` for the manifest. Display: `Step 4/6: Vercel deployment queued. URL: ${DEPLOY_URL}`

**Write hasDeployStaging coverage flag:**

Read current coverage state:
```bash
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
```

Parse all 21 field values from COV JSON output (default absent fields to false). Then write the complete 21-field coverage object:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":ACTUAL,"hasWireframes":ACTUAL,"hasFlows":ACTUAL,"hasHardwareSpec":ACTUAL,"hasCritique":ACTUAL,"hasIterate":ACTUAL,"hasHandoff":ACTUAL,"hasIdeation":ACTUAL,"hasCompetitive":ACTUAL,"hasOpportunity":ACTUAL,"hasMockup":ACTUAL,"hasHigAudit":ACTUAL,"hasRecommendations":ACTUAL,"hasStitchWireframes":ACTUAL,"hasPrintCollateral":ACTUAL,"hasProductionBible":ACTUAL,"hasBusinessThesis":ACTUAL,"hasMarketLandscape":ACTUAL,"hasServiceBlueprint":ACTUAL,"hasLaunchKit":ACTUAL,"hasDeployStaging":true}'
```

Where each ACTUAL is replaced with the literal `true` or `false` value read from the parsed coverage. `hasDeployStaging` is hardcoded to `true` — this is the flag deploy.md owns. All other 20 fields use their current values.

**CRITICAL:** This write MUST be inside the `if $DEPLOY_EXIT == 0:` success path (after Gate 4 success), NOT before Gate 4 or at the start of Step 5. The flag should only be set when deploy actually succeeded.

---

### Step 5/6: Write deploy-manifest.json

Write `.planning/deploy-staging/deploy-manifest.json` using the Write tool.

Generate the JSON with the following schema. All four artifact entries have `review_required: true` and `reviewed: false`:

```json
{
  "generated_at": "[ISO8601 timestamp from current datetime]",
  "business_track": "${BT}",
  "ldp_source": "${LDP_FILE}",
  "str_source": "${STR_FILE}",
  "otr_source": "${OTR_FILE}",
  "artifacts": {
    "landing_page": {
      "status": "ready",
      "path": ".planning/deploy-staging/landing-page/",
      "review_required": true,
      "reviewed": false,
      "notes": "Next.js 16.2.1 App Router scaffold — replace all [YOUR_X] placeholders, run npm install, then test locally before deploying"
    },
    "stripe_config": {
      "status": "ready",
      "path": ".planning/deploy-staging/stripe/stripe-config.json",
      "review_required": true,
      "reviewed": false,
      "notes": "Replace pk_test_REPLACE_WITH_YOUR_KEY with your Stripe publishable key. Set real unit_amount values (in cents) before going live."
    },
    "email_templates": {
      "status": "ready",
      "path": ".planning/deploy-staging/email/emails/",
      "review_required": true,
      "reviewed": false,
      "notes": "Replace [YOUR_X] placeholders in all templates. Requires RESEND_API_KEY in environment. Test with React Email preview before sending."
    },
    "vercel_deployment": {
      "status": "queued",
      "deployment_url": "${DEPLOY_URL}",
      "review_required": true,
      "reviewed": false,
      "notes": "Deployment in progress — check Vercel dashboard for build status. URL is live once the build completes."
    }
  }
}
```

Display: `Step 5/6: deploy-manifest.json written to .planning/deploy-staging/`

---

### Step 6/6: Output summary

Display a final summary:

```
╔══════════════════════════════════════════════════════════════╗
║  /pde:deploy — Stage 14 Complete                             ║
╚══════════════════════════════════════════════════════════════╝

Business Track: ${BT}

Generated Artifacts:
  ✓ Next.js landing page scaffold
      .planning/deploy-staging/landing-page/
      Pinned: Next.js 16.2.1, Tailwind v4, Stripe v20, Resend 6.9.4
      review_required: true

  ✓ Stripe pricing config
      .planning/deploy-staging/stripe/stripe-config.json
      Key: pk_test_REPLACE_WITH_YOUR_KEY (test mode)
      review_required: true

  ✓ Resend email templates
      .planning/deploy-staging/email/emails/
      Framework: @react-email/components 1.0.10
      review_required: true

  ✓ Vercel deployment (queued)
      URL: ${DEPLOY_URL}
      review_required: true

Manifest: .planning/deploy-staging/deploy-manifest.json

Next Steps:
  1. Review each artifact — replace all [YOUR_X] placeholders
  2. Set API keys in .env.local (Stripe, Resend)
  3. npm install in .planning/deploy-staging/landing-page/
  4. Test locally: npm run dev
  5. Monitor Vercel build: ${DEPLOY_URL}
  6. Go live: replace test Stripe keys with live keys

Note: .planning/deploy-staging/ is gitignored (contains placeholder keys).
      Copy final scaffold to your project root when ready to ship.
```

---

## Anti-Patterns

1. **NEVER skip an approval gate.** Each gate exists because it protects the user from unreviewed external writes. There is no `--skip-gates` flag.

2. **NEVER use live Stripe keys.** The only acceptable publishable key value in generated output is `pk_test_REPLACE_WITH_YOUR_KEY`. Any other value containing `pk_live_` is a security violation.

3. **NEVER write deploy artifacts to `.planning/design/`.** Deploy scaffolds are staged output, not design artifacts. They belong exclusively in `.planning/deploy-staging/`.

4. **NEVER use `create-next-app`.** It requires interactive TTY input and network access. Use the Write tool to generate each file directly — offline-capable and idempotent.

5. **NEVER omit `--yes` from the Vercel CLI command.** Without `--yes`, the CLI prompts for project setup interactively, which hangs the Bash tool indefinitely.

6. **NEVER omit `--no-wait` from the Vercel CLI command.** Without `--no-wait`, the CLI blocks the Claude Code session for 30-120 seconds while the build completes. The URL is returned immediately with `--no-wait`.

7. **NEVER generate dollar amounts.** All pricing values in generated scaffold code must use `[YOUR_PRICE_IN_CENTS]` format. The `unit_amount` field must always be a string placeholder, not a number.

8. **NEVER generate specific company names, investor firm names, or partner references in email templates.** All email content fields must use `[YOUR_X]` structural placeholders. The only organization reference allowed is `[YOUR_COMPANY_NAME]`.

</process>
