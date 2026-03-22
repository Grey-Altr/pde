---
phase: 92-deploy-skill
plan: 01
subsystem: deploy
tags: [next.js, vercel, stripe, resend, react-email, tailwind, deploy-staging]

# Dependency graph
requires:
  - phase: 91-handoff-launch-kit-assembly
    provides: OTR outreach artifact, LKT launch kit manifest, hasLaunchKit coverage flag
  - phase: 89-wireframe-stage-launch-artifacts
    provides: LDP landing page wireframe spec, STR Stripe pricing config
provides:
  - workflows/deploy.md — Stage 14 deploy workflow with 4 mandatory approval gates
  - 21-assertion Nyquist test scaffold covering DEPLOY-01 through DEPLOY-09
affects: [93-designcoverage-audit, 94-nyquist-regression, build.md Stage 14 wiring]

# Tech tracking
tech-stack:
  added:
    - Next.js 16.2.1 (pinned — App Router scaffold target)
    - Tailwind v4 (4.2.2, CSS-first config via @theme in globals.css)
    - stripe@20.4.1 (npm SDK, pinned for scaffold package.json)
    - resend@6.9.4 (pinned for email template package.json)
    - "@react-email/components@1.0.10 (email template stubs)"
    - vercel CLI 50.35.0 (invoked via npx, no local install)
  patterns:
    - Write-tool-direct scaffold generation (offline-capable, no create-next-app)
    - Sequential approval gates (Gate N/4 pattern with AskUserQuestion + Halt option)
    - deploy-staging/ as separate artifact domain from design/
    - review_required: true per artifact in deploy-manifest.json
    - npx vercel --prod --no-wait --yes for non-blocking deploy URL capture
    - vercel whoami pre-check before Gate 4 (auth gate pattern)
    - [YOUR_X] structural placeholders for all generated content/pricing/keys
    - pk_test_REPLACE_WITH_YOUR_KEY as only acceptable Stripe key value in output

key-files:
  created:
    - workflows/deploy.md (942 lines — Stage 14 deploy workflow, 6 steps, 4 gates)
    - .planning/phases/92-deploy-skill/tests/test-deploy-skill.cjs (234 lines — 21 Nyquist assertions)
  modified: []

key-decisions:
  - "deploy.md writes scaffold via Write-tool-direct (not create-next-app) — offline-capable, idempotent, version-pinnable"
  - "Four approval gates are NOT resumable — declining any gate halts clean, user must re-run /pde:deploy to restart"
  - "deploy-manifest.json is standalone JSON (not registered in design-manifest.json) — deploy-staging is a separate artifact domain"
  - "Stripe config always uses pk_test_REPLACE_WITH_YOUR_KEY — live keys prohibited in generated output"
  - "Vercel deploy uses --no-wait --yes --cwd flags together — --no-wait for non-blocking, --yes to skip setup prompts, --cwd for correct directory"
  - "Tailwind v4 uses CSS-first config in globals.css (@import tailwindcss + @theme) — no tailwind.config.js generated"
  - ".planning/deploy-staging/.gitignore with * wildcard — self-contained gitignore, does not modify project root .gitignore"
  - "DEPLOY-08 (commands/deploy.md) deferred to Plan 02 — this plan creates the workflow, Plan 02 creates the slash command and build.md wiring"

patterns-established:
  - "deploy-staging/ domain: all deploy scaffold artifacts go here, never to .planning/design/"
  - "Gate N/4 label pattern: 'Gate 1/4 — Name' for approval gate identification in AskUserQuestion"
  - "Halt clean pattern: Gate decline shows exact context (what was written, what was not) and HALT without partial state"
  - "review_required: true in deploy-manifest.json for every artifact — user must explicitly mark reviewed: true before going live"

requirements-completed: [DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04, DEPLOY-05, DEPLOY-06, DEPLOY-07, DEPLOY-09]

# Metrics
duration: 4min
completed: 2026-03-22
---

# Phase 92 Plan 01: Deploy Skill Summary

**Stage 14 deploy workflow (workflows/deploy.md) with 4 approval-gated Next.js/Stripe/Resend scaffold generation and non-blocking Vercel CLI deployment — 19/21 Nyquist tests GREEN**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-22T22:28:55Z
- **Completed:** 2026-03-22T22:33:01Z
- **Tasks:** 2
- **Files created:** 2 (1,176 lines total)

## Accomplishments

- Created `workflows/deploy.md` (942 lines) as Stage 14 of the PDE build pipeline — the first PDE workflow that writes files outside `.planning/design/` and invokes external CLIs
- Implemented 4 sequential AskUserQuestion approval gates: Next.js scaffold → Stripe config → Resend email templates → Vercel deployment; each gate halts clean on decline
- Specified Next.js 16.2.1 App Router scaffold with pinned versions (Tailwind v4, Stripe v20, Resend 6.9.4) using Write-tool-direct generation from LDP artifact — no create-next-app
- Defined deploy-manifest.json schema with `review_required: true` per artifact, standalone in `.planning/deploy-staging/` separate from design-manifest.json
- Created 21-assertion Nyquist test scaffold — 19/21 GREEN (DEPLOY-08 x2 deferred to Plan 02 when commands/deploy.md is created)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Nyquist test scaffold for DEPLOY-01 through DEPLOY-09** - `1f81c87` (test)
2. **Task 2: Create workflows/deploy.md — Stage 14 deploy workflow** - `bd88aa8` (feat)

**Plan metadata:** (docs commit follows this SUMMARY)

## Files Created/Modified

- `workflows/deploy.md` — Stage 14 deploy workflow (6 steps, 4 approval gates, 8 anti-patterns, 942 lines)
- `.planning/phases/92-deploy-skill/tests/test-deploy-skill.cjs` — 21 Nyquist structural assertions for DEPLOY-01 through DEPLOY-09

## Decisions Made

- Write-tool-direct scaffold generation chosen over `create-next-app` — offline-capable, idempotent, version-pinnable from LDP spec
- Four approval gates are non-resumable by design — declining any gate halts clean, user must re-run `/pde:deploy` to restart from the beginning
- `deploy-manifest.json` is a standalone file in `.planning/deploy-staging/` (not registered in `design-manifest.json`) — deploy-staging is an entirely separate artifact domain
- Stripe config always uses `pk_test_REPLACE_WITH_YOUR_KEY` — live keys are architecturally prohibited in any generated output
- Tailwind v4 CSS-first config: `@import "tailwindcss"` + `@theme {}` in `globals.css`, no `tailwind.config.js` (deprecated in v4)
- `DEPLOY-08` (`commands/deploy.md` slash command entry point) scoped to Plan 02 — plan boundary is workflow + tests only

## Deviations from Plan

None — plan executed exactly as written. The 2 failing tests for DEPLOY-08 are expected RED (plan explicitly states "DEPLOY-08 remains RED until Plan 02 creates commands/deploy.md").

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required at this phase.

## Next Phase Readiness

- `workflows/deploy.md` complete and structurally verified — ready for Plan 02 which adds:
  - `commands/deploy.md` slash command entry point (DEPLOY-08)
  - `build.md` Stage 14 conditional wiring (businessMode gate in STAGES list)
- All 19 DEPLOY-01 through DEPLOY-07 + DEPLOY-09 Nyquist assertions GREEN
- Plan 02 will bring test suite to 21/21 GREEN

---
*Phase: 92-deploy-skill*
*Completed: 2026-03-22*

## Self-Check: PASSED

Verified:
- `workflows/deploy.md` exists — FOUND
- `.planning/phases/92-deploy-skill/tests/test-deploy-skill.cjs` exists — FOUND
- Commit `1f81c87` exists — FOUND (`test(92-01): add Nyquist test scaffold`)
- Commit `bd88aa8` exists — FOUND (`feat(92-01): create workflows/deploy.md`)
- 19/21 Nyquist tests GREEN — CONFIRMED
