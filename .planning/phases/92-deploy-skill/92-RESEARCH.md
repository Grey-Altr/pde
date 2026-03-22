# Phase 92: Deploy Skill - Research

**Researched:** 2026-03-22
**Domain:** New PDE workflow (deploy.md), external CLI integration, Next.js scaffold generation, Stripe/Resend config stubs, human approval gates
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEPLOY-01 | New `workflows/deploy.md` as Stage 14, conditionally appended to build orchestrator only when `businessMode === true` | Build orchestrator STAGES pattern studied; Stage 14 insertion point and businessMode gate identified |
| DEPLOY-02 | Next.js landing page scaffold at `.planning/deploy-staging/landing-page/` with pinned versions (Next.js 16.2.1, Stripe v20, Resend 6.9.4, Tailwind v4), consuming LDP wireframe spec | Next.js 16.2.1 App Router structure verified via official docs; all package versions verified via npm registry |
| DEPLOY-03 | Stripe pricing config scaffold with test-mode placeholder keys (`pk_test_REPLACE_WITH_YOUR_KEY`) — never live keys | Stripe v20 test-mode key format verified; pricing config schema documented in launch-frameworks.md |
| DEPLOY-04 | Resend email template stubs from OTR sequence spec with React Email components | React Email 1.0.10 + @react-email/components 1.0.10 verified; component API patterns documented |
| DEPLOY-05 | Vercel deployment via `npx vercel --prod --no-wait` returning URL without blocking | Vercel CLI --no-wait behavior verified via official docs: stdout is ALWAYS the Deployment URL; exits immediately after upload |
| DEPLOY-06 | Four mandatory human approval gates: (1) before Next.js scaffold, (2) before Stripe config, (3) before Resend templates, (4) before Vercel deploy | AskUserQuestion pattern documented from build.md; halt-on-decline pattern established |
| DEPLOY-07 | All deployment artifacts in `.planning/deploy-staging/` with `.gitignore` — never in `.planning/design/` | New directory convention; gitignore pattern established |
| DEPLOY-08 | `/pde:deploy` slash command as entry point for Stage 14 | Command file pattern from commands/handoff.md + commands/wireframe.md documented |
| DEPLOY-09 | `deploy-manifest.json` tracks deployment artifact statuses with `review_required: true` | Manifest schema design documented; mirrors design-manifest.json artifact entry pattern |
</phase_requirements>

---

## Summary

Phase 92 is architecturally novel within PDE: it is the first workflow that (a) writes files outside `.planning/design/` (to `.planning/deploy-staging/`), (b) invokes external CLIs (`npx vercel`), and (c) requires four sequential human approval gates as a hard architectural constraint, not a UX nicety.

The Vercel CLI `--no-wait` behavior is confirmed: stdout is ALWAYS the Deployment URL, and the flag exits immediately without waiting for deployment completion. URL capture is via `DEPLOY_URL=$(npx vercel --prod --no-wait 2>/dev/null)`. Authentication failure produces a non-zero exit code with error on stderr — the workflow must check exit code and surface the error cleanly.

The deploy workflow's relationship to the build orchestrator is conditional append only: `workflows/deploy.md` becomes Stage 14 of `build.md` ONLY when `businessMode === true`. This matches the Phase 91 pattern of independent IF blocks, but at the orchestrator level. The STAGES list in `build.md` must gain a 14th entry that skips when `businessMode !== true`.

The scaffold generation approach is Write-tool-direct (not `create-next-app`): the workflow uses Claude's Write tool to generate each file individually, consuming the LDP spec for structure and the LCV lean canvas for pricing tier names. `create-next-app` cannot be used because it requires interactive prompts and internet access at generation time; Write-tool generation is offline-capable and idempotent.

**Primary recommendation:** Implement deploy.md as a 6-step workflow (Init → Read upstream artifacts → Four approval-gated artifact writes → Vercel deploy gate → Manifest registration → Output). The approval gate pattern uses AskUserQuestion with ["Proceed", "Halt"] options — declining any gate halts the entire deploy with no partial writes.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.1 | Landing page scaffold framework | Pinned per DEPLOY-02; current stable release as of 2026-03-22 |
| Tailwind CSS | v4 (4.2.2) | Styling scaffold | Pinned per DEPLOY-02; verified current stable |
| stripe (npm) | v20 (20.4.1) | Stripe Node.js SDK | Pinned per DEPLOY-02; DEPLOY-03 uses this for config reference |
| resend | 6.9.4 | Resend SDK | Pinned per DEPLOY-02; current stable release verified |
| @react-email/components | 1.0.10 | React Email component set | DEPLOY-04 email template stubs; current stable verified |
| vercel CLI | 50.35.0 (npx) | Deployment trigger | DEPLOY-05; invoked via `npx vercel` — no local install required |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/node | latest | TypeScript Node types | In package.json for scaffold |
| typescript | ^5 | TypeScript compilation | Next.js App Router with TypeScript |
| eslint-config-next | 16.2.1 | Next.js ESLint config | Matches Next.js version |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Write-tool-direct scaffold generation | `npx create-next-app` | create-next-app requires interactive prompts and network access; Write-tool is offline-capable, idempotent, and version-pinnable |
| `npx vercel --prod --no-wait` | `npx vercel --prod` (blocking) | Blocking deploy would freeze the Claude session for 30–120 seconds; --no-wait returns URL immediately from stdout |
| Separate `deploy.md` workflow | Inline in `handoff.md` | handoff.md is already 1,573 lines; inline deploy logic would violate single-responsibility principle; deploy needs its own slash command entry point |

**Installation command for generated scaffold:**
```bash
# This goes in the generated .planning/deploy-staging/landing-page/package.json install instructions
npm install
# NOT executed by the workflow — generated as a stub the user runs
```

**Version verification (confirmed 2026-03-22):**
```bash
npm view next version          # 16.2.1
npm view tailwindcss version   # 4.2.2
npm view stripe version        # 20.4.1
npm view resend version        # 6.9.4
npm view @react-email/components version  # 1.0.10
npm view vercel version        # 50.35.0
```

---

## Architecture Patterns

### Recommended Project Structure

```
workflows/
└── deploy.md                  # New: Stage 14 workflow

commands/
└── deploy.md                  # New: /pde:deploy slash command

.planning/deploy-staging/       # New directory convention
├── .gitignore                  # Never committed to git
├── deploy-manifest.json        # DEPLOY-09: artifact status tracker
├── landing-page/               # DEPLOY-02: Next.js scaffold
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── postcss.config.mjs
│   ├── app/
│   │   ├── (marketing)/
│   │   │   ├── layout.tsx      # SiteNav + SiteFooter
│   │   │   ├── page.tsx        # Assembles all section components
│   │   │   └── _components/
│   │   │       ├── hero-section.tsx
│   │   │       ├── logo-bar.tsx
│   │   │       ├── problem-statement.tsx
│   │   │       ├── features-grid.tsx
│   │   │       ├── how-it-works.tsx
│   │   │       ├── testimonials-block.tsx
│   │   │       ├── pricing-table.tsx
│   │   │       ├── faq-accordion.tsx
│   │   │       └── cta-banner.tsx
│   │   ├── layout.tsx          # Root layout
│   │   └── globals.css
│   └── README.md               # Deploy instructions for user
├── stripe/                     # DEPLOY-03: Stripe config
│   ├── stripe-config.json      # Pricing config scaffold
│   └── README.md
└── email/                      # DEPLOY-04: Email templates
    ├── emails/
    │   ├── onboarding-01-welcome.tsx
    │   ├── onboarding-02-setup.tsx
    │   └── ...                 # One file per OTR email
    ├── package.json
    └── README.md
```

### Pattern 1: Approval Gate with AskUserQuestion

**What:** Four sequential human approval gates, each using AskUserQuestion, each independently halting on decline.
**When to use:** Before every external write in the deploy workflow.
**Example:**
```
Use AskUserQuestion with:
  - question: "Gate 1/4: Ready to generate Next.js landing page scaffold at .planning/deploy-staging/landing-page/? This will create [N] files."
  - options: ["Proceed", "Halt — stop deployment"]

If user selects "Halt — stop deployment":
  Display: "Deploy halted at Gate 1/4. No files written. Re-run /pde:deploy to start over."
  HALT (clean exit, no partial state)
```

The key constraint from REQUIREMENTS.md Out of Scope: "Declining halts without partial deployment." Gates are NOT resumable — if user halts at Gate 2, they must re-run `/pde:deploy` to restart. The deploy workflow is not designed to resume from mid-gate.

### Pattern 2: Vercel CLI --no-wait URL Capture

**What:** Invoke Vercel CLI, capture stdout as deployment URL, check exit code.
**When to use:** Gate 4 of deploy workflow (the external deploy invocation).
**Example:**
```bash
# Source: Vercel official docs https://vercel.com/docs/cli/deploy
DEPLOY_URL=$(npx vercel --prod --no-wait --yes 2>deploy-error.txt)
DEPLOY_EXIT=$?

if [ $DEPLOY_EXIT -eq 0 ]; then
  # DEPLOY_URL contains the deployment URL (stdout is always the URL)
  echo "Deployment queued: $DEPLOY_URL"
else
  cat deploy-error.txt
  # Surface error to user, halt
fi
```

**Critical finding:** `--no-wait` exits BEFORE the deployment completes. stdout is the deployment URL (a `dpl_...` or `https://...` URL). The deployment continues asynchronously on Vercel. The user must wait for Vercel to finish building before the URL is live.

**Authentication requirement:** Vercel CLI requires `vercel login` or `VERCEL_TOKEN` env var. If neither is present, the CLI prompts interactively — which will hang in a non-TTY context. The workflow MUST gate with: "Ensure you are logged in to Vercel CLI (`npx vercel login`) before proceeding" as part of Gate 4 pre-check.

**Also add `--yes`** flag alongside `--no-wait`: `--yes` skips the setup questions (project linking) and uses defaults. Without `--yes`, the CLI prompts for project setup interactively.

### Pattern 3: Write-Tool-Direct Scaffold Generation

**What:** Use the Write tool to generate each scaffold file individually from LDP spec.
**When to use:** Step 3 of deploy workflow — Next.js scaffold generation.

The LDP artifact (`.planning/design/launch/LDP-landing-page-v{N}.md`) contains the Section Map table with component names, Next.js paths, and Server/Client designations. The workflow reads LDP and generates each component as a stub TypeScript file with:
- `// Source: LDP artifact, Section: {section name}` comment header
- Props typed from LDP `Props` field
- `TODO: Replace with actual content` body
- 'use client' directive for Client Components

The STR artifact (`.planning/design/launch/STR-stripe-pricing-v{N}.md`) contains the pricing config schema from `launch-frameworks.md`. The Stripe config scaffold at `.planning/deploy-staging/stripe/stripe-config.json` is generated from this artifact.

### Pattern 4: Build Orchestrator Stage 14 Conditional

**What:** The 14th stage in `build.md` STAGES list, conditionally executed only when `businessMode === true`.
**Architectural constraint:** The STAGES list in `build.md` is defined once and all counts derived from it. Adding Stage 14 changes TOTAL to 14 — all display messages update automatically because they use `{TOTAL}` not literals (build.md anti-pattern #9).

The gate mechanism: in build.md Step 2/4, after reading coverage, check businessMode:
```bash
BM=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-get-top-level businessMode 2>/dev/null)
if [[ "$BM" == @file:* ]]; then BM=$(cat "${BM#@file:}"); fi
```

If `BM != "true"`: Stage 14 status = "skipped (non-business project)" regardless of hasDeployStaging flag.
If `BM == "true"`: Stage 14 participates normally in completion check via `hasDeployStaging` coverage flag.

### Pattern 5: deploy-manifest.json Schema

**What:** A standalone JSON file at `.planning/deploy-staging/deploy-manifest.json` tracking deployment artifact statuses.
**When to use:** Written during deploy.md Step 5 (after each artifact write, before lock release).

```json
{
  "generated_at": "[ISO8601 timestamp]",
  "business_track": "[solo_founder|startup_team|product_leader]",
  "artifacts": {
    "landing_page": {
      "status": "ready",
      "path": ".planning/deploy-staging/landing-page/",
      "review_required": true,
      "reviewed": false,
      "notes": "Next.js 16.2.1 scaffold — populate TODOs before deploying"
    },
    "stripe_config": {
      "status": "ready",
      "path": ".planning/deploy-staging/stripe/stripe-config.json",
      "review_required": true,
      "reviewed": false,
      "notes": "Replace all [YOUR_X] placeholders and pk_test_REPLACE_WITH_YOUR_KEY before going live"
    },
    "email_templates": {
      "status": "ready",
      "path": ".planning/deploy-staging/email/emails/",
      "review_required": true,
      "reviewed": false,
      "notes": "Replace [YOUR_X] placeholders. Requires Resend API key in .env.local"
    },
    "vercel_deployment": {
      "status": "queued",
      "deployment_url": "[DEPLOYMENT_URL_FROM_VERCEL_CLI]",
      "review_required": true,
      "reviewed": false,
      "notes": "Deployment in progress. Check Vercel dashboard for build status."
    }
  }
}
```

### Pattern 6: .planning/deploy-staging/.gitignore

**What:** The `.gitignore` file prevents the scaffold from being committed to the user's project repo.
**Why critical:** The scaffold may contain placeholder keys and draft content. It belongs in `.planning/deploy-staging/` as a PDE staging area, not in the project source.

```
# .planning/deploy-staging/.gitignore
# PDE deploy staging — do not commit to project repository
*
```

The alternative is to add `.planning/deploy-staging/` to the project root `.gitignore`, but that requires modifying a file outside PDE's scope. The self-contained `.gitignore` inside `deploy-staging/` is the safer convention.

### Anti-Patterns to Avoid

- **Using `create-next-app` for scaffold generation:** Requires TTY input and network access. PDE workflows are offline-capable by design.
- **Blocking Vercel deploy (without --no-wait):** Blocks the Claude session for 30-120 seconds while the deployment builds. The `--no-wait` flag is mandatory per DEPLOY-05.
- **Omitting `--yes` from vercel command:** Without `--yes`, the CLI asks project setup questions interactively, hanging the Bash tool.
- **Resumable gates:** Gates are binary — proceed or halt clean. Partial deploy state (e.g., scaffold written but Stripe config not yet written) is confusing. If user halts, entire deploy-staging/ directory should be cleaned or left incomplete with clear messaging.
- **Writing live Stripe keys:** The REQUIREMENTS.md Out of Scope table explicitly lists "Stripe live keys in generated scaffolding." The only acceptable key placeholder is `pk_test_REPLACE_WITH_YOUR_KEY`. The workflow must assert this before writing.
- **Adding deploy Stage 14 unconditionally to STAGES:** The STAGES list addition must be guarded. Non-business products must not see a Stage 14 entry in their pipeline output.
- **Storing deploy artifacts in .planning/design/:** DEPLOY-07 is explicit — deploy-staging is a separate directory from design artifacts.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email template HTML | Custom HTML email builder | @react-email/components | Email clients (Gmail, Outlook) have 60+ rendering quirks; React Email handles compatibility |
| Stripe checkout flow | Custom payment form | stripe npm + Stripe Checkout | PCI compliance scope, webhook handling, subscription lifecycle — 100+ edge cases |
| File scaffolding with deps | Custom template engine | Write tool directly generating files | PDE already has Write tool; no new dependency needed |
| Deployment URL parsing | Custom stdout parser | Direct shell assignment: `URL=$(npx vercel ...)` | Vercel official docs state "stdout is always the Deployment URL" — direct capture is authoritative |
| Vercel project setup | Custom API calls to Vercel API | `npx vercel --yes` | --yes skips all interactive project-linking setup with defaults |

**Key insight:** The scaffold itself is stub-only. PDE does not implement a working Next.js app — it generates the file structure that the user fills in. The "don't hand-roll" principle here means: don't invent custom email HTML or payment forms when industry-standard libraries exist that the user will integrate.

---

## Common Pitfalls

### Pitfall 1: Vercel CLI Hangs Without --yes
**What goes wrong:** `npx vercel --prod --no-wait` prompts "Set up and deploy?" when no `.vercel/project.json` exists in the target directory. This hangs the Bash tool indefinitely.
**Why it happens:** The `--no-wait` flag skips waiting for deployment completion, but does NOT skip the project-setup interactive questions.
**How to avoid:** Always use `npx vercel --prod --no-wait --yes`. The `--yes` flag answers all setup questions with defaults.
**Warning signs:** Bash tool shows no output for 30+ seconds on the vercel command.

### Pitfall 2: Vercel CLI Not Authenticated
**What goes wrong:** `npx vercel` returns exit code 1 with "Error: You need to be logged in to deploy" on stderr. The workflow tries to parse an empty stdout as a URL.
**Why it happens:** Vercel CLI requires authentication via `vercel login` or `VERCEL_TOKEN` environment variable. PDE cannot pre-authenticate for the user.
**How to avoid:** Gate 4 pre-check must explicitly verify authentication: run `npx vercel whoami 2>/dev/null` and check exit code. If non-zero, display clear instructions to run `npx vercel login` and halt.
**Warning signs:** Exit code 1 on the vercel command, empty DEPLOY_URL variable.

### Pitfall 3: LDP Artifact Not Found
**What goes wrong:** The deploy workflow tries to read `LDP-landing-page-v*.md` but Phase 89 was not run (or businessMode was false at wireframe time).
**Why it happens:** DEPLOY-02 requires consuming the LDP wireframe spec. If Phase 89 skipped LDP generation, the spec is absent.
**How to avoid:** Step 1 of deploy.md must check for LDP artifact via Glob. If absent: halt with message "LDP artifact not found at .planning/design/launch/LDP-landing-page-v*.md. Run /pde:wireframe to generate it first."
**Warning signs:** Glob returns empty result on LDP path pattern.

### Pitfall 4: deploy-staging Directory Collides with Existing Project
**What goes wrong:** User's project already has a `.planning/deploy-staging/` directory with content. The scaffold generation overwrites it.
**Why it happens:** The workflow does not check for existing content before writing.
**How to avoid:** Step 1 check: if `.planning/deploy-staging/landing-page/package.json` exists, present a confirmation gate (not a standard approval gate — a collision warning): "Deploy staging already exists. Overwrite? [Yes / No]".
**Warning signs:** Glob finds files at `.planning/deploy-staging/**` before Step 2.

### Pitfall 5: Stage 14 Visible to Non-Business Pipelines
**What goes wrong:** Adding Stage 14 to `build.md` STAGES list makes it appear in the pipeline output for ALL product types, showing "Stage 14/14: /pde:deploy — skipped (non-business)" even for software/hardware products.
**Why it happens:** The STAGES list is unconditional; completion check is conditional.
**How to avoid:** The build orchestrator's STAGES list should include Stage 14, but the Step 2/4 business mode check marks it as "skipped (non-business)" with clear messaging. The TOTAL count increases to 14 — but the skipped stage display is acceptable per the existing `--from` skip pattern.
**Warning signs:** Non-business users see unexpected "Stage 14" in their pipeline status.

### Pitfall 6: Structural Placeholder Contamination
**What goes wrong:** The scaffold generation uses actual product names from the LDP spec in Stripe config or email templates instead of structural placeholders.
**Why it happens:** LDP spec contains real content (derived from MKT brand system). The workflow copies content slots into Stripe/email config without converting to placeholders.
**How to avoid:** Stripe config MUST use `pk_test_REPLACE_WITH_YOUR_KEY` for publishable key. Email templates MUST use `[YOUR_PRODUCT_NAME]`, `[YOUR_FROM_ADDRESS]`, `[YOUR_COMPANY_NAME]` in from/to/subject fields — actual content only in copy body stubs. Assert this in the deploy-manifest.json notes field.
**Warning signs:** Any `@` sign in email from/to fields without `[YOUR_` prefix.

### Pitfall 7: React Email Components Not Imported
**What goes wrong:** Generated email template stubs reference `@react-email/components` but the email package.json doesn't list it as a dependency.
**Why it happens:** The workflow writes the TSX files but forgets to generate a package.json for the email directory.
**How to avoid:** DEPLOY-04 must generate `.planning/deploy-staging/email/package.json` with `@react-email/components`, `react`, `react-dom` as dependencies.
**Warning signs:** `import { Body, Container, Text }` in TSX files but no package.json in the email directory.

---

## Code Examples

Verified patterns from official sources:

### Next.js 16.2.1 App Router Minimal Root Layout
```typescript
// Source: https://nextjs.org/docs/app/getting-started/project-structure
// .planning/deploy-staging/landing-page/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '[YOUR_PRODUCT_NAME]',
  description: '[YOUR_PRODUCT_DESCRIPTION]',
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

### Next.js App Router Marketing Route Group
```typescript
// Source: https://nextjs.org/docs/app/getting-started/project-structure (Route groups section)
// .planning/deploy-staging/landing-page/app/(marketing)/layout.tsx
// 'use client' — SiteNav needs client-side state for mobile hamburger

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

### React Email Stub (DEPLOY-04)
```typescript
// Source: https://react.email/docs/integrations/resend
// @react-email/components version 1.0.10
// .planning/deploy-staging/email/emails/onboarding-01-welcome.tsx
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

// Source: OTR artifact — Email 1: Welcome (trigger: immediate, delay: 0)
// TODO: Replace all [YOUR_X] placeholders before sending

export default function WelcomeEmail() {
  return (
    <Html>
      <Head />
      <Preview>[YOUR_PREVIEW_TEXT]</Preview>
      <Body>
        <Container>
          <Heading>[YOUR_WELCOME_HEADLINE]</Heading>
          <Text>[YOUR_WELCOME_BODY]</Text>
          <Section>
            <Button href="[YOUR_CTA_URL]">[YOUR_CTA_TEXT]</Button>
          </Section>
          <Text>
            [YOUR_COMPANY_NAME] | [YOUR_UNSUBSCRIBE_LINK]
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

### Resend Send Pattern (reference for email/ README)
```typescript
// Source: https://react.email/docs/integrations/resend
// This is the USER's send pattern — NOT generated by PDE
// Generated as a README code snippet, not an executable file
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

### Stripe Pricing Config (DEPLOY-03)
```json
// Source: launch-frameworks.md Pricing Config Schema (Phase 84)
// .planning/deploy-staging/stripe/stripe-config.json
// IMPORTANT: pk_test_REPLACE_WITH_YOUR_KEY is a placeholder — never use live keys
{
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

### Vercel CLI No-Wait Deployment (DEPLOY-05)
```bash
# Source: https://vercel.com/docs/cli/deploy
# "When deploying, stdout is always the Deployment URL."
# Gate 4 of deploy.md

# Pre-check authentication
VERCEL_AUTH=$(npx vercel whoami 2>/dev/null)
if [ $? -ne 0 ]; then
  echo "Not authenticated with Vercel CLI. Run: npx vercel login"
  exit 1
fi

# Deploy (from .planning/deploy-staging/landing-page/ directory)
DEPLOY_URL=$(npx vercel --prod --no-wait --yes --cwd .planning/deploy-staging/landing-page/ 2>deploy-error.txt)
DEPLOY_EXIT=$?

if [ $DEPLOY_EXIT -eq 0 ]; then
  echo "Deployment queued: $DEPLOY_URL"
else
  echo "Deployment failed:"
  cat deploy-error.txt
  exit 1
fi
```

### AskUserQuestion Approval Gate (DEPLOY-06)
```
// Source: workflows/build.md interactive gate pattern
// Approval Gate 1 of 4 — before Next.js scaffold write

Use AskUserQuestion with:
  - question: "Approval Gate 1/4 — Next.js Scaffold\n\nAbout to generate [N] files at .planning/deploy-staging/landing-page/.\nComponents from LDP spec: [list of sections from LDP]\n\nProceed?"
  - options: ["Proceed", "Halt — stop deployment"]

If user selects "Halt — stop deployment":
  Display: "Deploy halted at Gate 1/4. No files written. Re-run /pde:deploy to restart."
  HALT (clean exit)
```

### deploy-manifest.json Status Update
```bash
# Source: established pde-tools.cjs manifest-update pattern from handoff.md Step 7b-lkt
# Analogous pattern — deploy.md uses Write tool directly for deploy-manifest.json
# (deploy-manifest.json is NOT in design-manifest.json — it's a standalone file)
```

Note: Unlike design-manifest.json (managed via pde-tools.cjs CLI), `deploy-manifest.json` is a standalone file written directly by the deploy workflow using the Write tool. It does NOT use manifest-update CLI commands.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `now` CLI (Vercel's old CLI) | `vercel` CLI | 2020 | --no-wait flag available; stdout is always the URL |
| React Email separate per-component packages | `@react-email/components` monorepo package | React Email 2.0 | Single install for all components |
| Tailwind v3 config (tailwind.config.js) | Tailwind v4 (CSS-first config via `@import "tailwindcss"`) | Tailwind v4 (2025) | No `tailwind.config.js` needed; configuration in CSS via `@theme` directive |
| Next.js `next.config.js` | `next.config.ts` (TypeScript) | Next.js 15+ | TypeScript config file is now the standard |

**Deprecated/outdated:**
- `tailwind.config.js`: In Tailwind v4, configuration lives in CSS via `@theme {}` blocks in `globals.css`. Generating a legacy config file is incorrect for v4.
- `pages/` directory: App Router (`app/`) is the standard for Next.js 15+/16. Do not scaffold with Pages Router.
- Individual React Email component packages (`@react-email/button`, etc.): Replaced by `@react-email/components` monorepo package.
- `vercel.json` with `version: 2`: The version field is deprecated; modern vercel.json omits it.

---

## Open Questions

1. **`--cwd` vs `cd` for Vercel deploy directory**
   - What we know: `vercel --cwd [path]` is documented. The scaffold is at `.planning/deploy-staging/landing-page/`.
   - What's unclear: Whether `--cwd` path is relative to CWD or absolute. Bash tool CWD resets between calls.
   - Recommendation: Use absolute path for `--cwd` or cd into the directory before calling vercel. The Bash tool requires absolute paths as standard practice.

2. **hasDeployStaging coverage flag vs separate deploy-manifest.json**
   - What we know: All other PDE stages set a coverage flag in designCoverage. DEPLOY-09 asks for `deploy-manifest.json`, not a coverage flag.
   - What's unclear: Does the planner need to add `hasDeployStaging` to the 20-field designCoverage schema? Or is deploy-manifest.json sufficient?
   - Recommendation: Add `hasDeployStaging` as a 21st designCoverage field set by deploy.md. This allows build.md Stage 14 completion check to use the existing coverage pattern. This is consistent — every stage owns its coverage flag. Note: this means INTG-01 (Phase 93) must verify the 21-field schema.

3. **deploy.md Stage 14 gating: STAGES list vs runtime skip**
   - What we know: The STAGES list drives completion status display. Adding Stage 14 unconditionally changes TOTAL to 14.
   - What's unclear: Whether non-business users should see Stage 14 in their pipeline table at all.
   - Recommendation: Add Stage 14 to STAGES but mark it as "skipped (non-business)" in the completion check for `BM != "true"`. This is consistent with the `--from` skip behavior already documented in build.md.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node:test`) |
| Config file | none — tests invoked directly |
| Quick run command | `node --test .planning/phases/92-deploy-skill/tests/test-deploy-skill.cjs` |
| Full suite command | `node --test .planning/phases/92-deploy-skill/tests/test-deploy-skill.cjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEPLOY-01 | `workflows/deploy.md` exists and is referenced in `build.md` as Stage 14 | structural | `node --test .../test-deploy-skill.cjs` | ❌ Wave 0 |
| DEPLOY-02 | deploy.md contains pinned version references (16.2.1, v20, 6.9.4, v4) and LDP artifact read | structural | `node --test .../test-deploy-skill.cjs` | ❌ Wave 0 |
| DEPLOY-03 | deploy.md contains `pk_test_REPLACE_WITH_YOUR_KEY` and Stripe config write | structural | `node --test .../test-deploy-skill.cjs` | ❌ Wave 0 |
| DEPLOY-04 | deploy.md references `@react-email/components` and OTR artifact consumption | structural | `node --test .../test-deploy-skill.cjs` | ❌ Wave 0 |
| DEPLOY-05 | deploy.md contains `npx vercel --prod --no-wait` | structural | `node --test .../test-deploy-skill.cjs` | ❌ Wave 0 |
| DEPLOY-06 | deploy.md contains 4 AskUserQuestion gates with "Halt" option | structural | `node --test .../test-deploy-skill.cjs` | ❌ Wave 0 |
| DEPLOY-07 | deploy.md references `.planning/deploy-staging/` not `.planning/design/` | structural | `node --test .../test-deploy-skill.cjs` | ❌ Wave 0 |
| DEPLOY-08 | `commands/deploy.md` exists with `name: pde:deploy` | structural | `node --test .../test-deploy-skill.cjs` | ❌ Wave 0 |
| DEPLOY-09 | deploy.md contains `deploy-manifest.json` and `review_required` | structural | `node --test .../test-deploy-skill.cjs` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test .planning/phases/92-deploy-skill/tests/test-deploy-skill.cjs`
- **Per wave merge:** `node --test .planning/phases/92-deploy-skill/tests/test-deploy-skill.cjs`
- **Phase gate:** All assertions GREEN before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `.planning/phases/92-deploy-skill/tests/test-deploy-skill.cjs` — covers DEPLOY-01 through DEPLOY-09
- [ ] Framework: `node:test` built-in — no install needed (Node.js 18+)

---

## Sources

### Primary (HIGH confidence)
- [Vercel CLI `vercel deploy` docs](https://vercel.com/docs/cli/deploy) — `--no-wait` behavior, stdout URL capture, `--yes` flag
- [Next.js 16.2.1 Project Structure](https://nextjs.org/docs/app/getting-started/project-structure) — App Router file conventions, route groups, special files
- npm registry (live query 2026-03-22): `next@16.2.1`, `tailwindcss@4.2.2`, `stripe@20.4.1`, `resend@6.9.4`, `@react-email/components@1.0.10`, `vercel@50.35.0`
- `references/launch-frameworks.md` (Phase 84) — LDP section map, Stripe pricing config schema, email sequence spec
- `workflows/build.md` — STAGES pattern, AskUserQuestion interactive gate, TOTAL derivation, anti-patterns
- `workflows/handoff.md` — Step 5e lock/write pattern, Step 7b-lkt manifest registration, businessMode detection pattern
- `commands/handoff.md` + `commands/wireframe.md` — slash command file format (YAML front-matter + objective + process)

### Secondary (MEDIUM confidence)
- [React Email Resend integration docs](https://react.email/docs/integrations/resend) — component imports, send pattern
- [React Email 5.0 announcement](https://resend.com/blog/react-email-5) — Tailwind v4 support in React Email confirmed

### Tertiary (LOW confidence)
- None — all critical claims verified against primary sources.

---

## Metadata

**Confidence breakdown:**
- Standard stack (package versions): HIGH — all versions verified via live npm registry query
- Vercel CLI --no-wait behavior: HIGH — verified via official Vercel docs
- Next.js App Router structure: HIGH — verified via official Next.js 16.2.1 docs
- AskUserQuestion gate pattern: HIGH — pattern extracted from existing build.md
- Architecture patterns (deploy.md structure): HIGH — derived from established PDE phase patterns (85-91)
- deploy-manifest.json schema: MEDIUM — designed for this phase; no prior precedent in PDE
- hasDeployStaging coverage flag: MEDIUM — logical extension of existing pattern; requires planner confirmation

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable libraries; Next.js and Vercel CLI change infrequently)
