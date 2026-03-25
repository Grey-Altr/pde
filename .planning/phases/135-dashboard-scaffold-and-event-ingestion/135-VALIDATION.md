---
phase: 135
slug: dashboard-scaffold-and-event-ingestion
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 135 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x (dashboard-scoped) |
| **Config file** | dashboard/vitest.config.ts |
| **Quick run command** | `cd dashboard && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd dashboard && npx vitest run --reporter=verbose --coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd dashboard && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd dashboard && npx vitest run --reporter=verbose --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 135-01-01 | 01 | 0 | DSH-01 | setup | `cd dashboard && npx next build` | ❌ W0 | ⬜ pending |
| 135-02-01 | 02 | 1 | DSH-01 | integration | `cd dashboard && npx vitest run --grep ingest` | ❌ W0 | ⬜ pending |
| 135-02-02 | 02 | 1 | DSH-06 | unit | `cd dashboard && npx vitest run --grep auth` | ❌ W0 | ⬜ pending |
| 135-03-01 | 03 | 1 | DSH-02 | integration | `cd dashboard && npx vitest run --grep sse` | ❌ W0 | ⬜ pending |
| 135-03-02 | 03 | 1 | DSH-02 | unit | `cd dashboard && npx vitest run --grep polling` | ❌ W0 | ⬜ pending |
| 135-04-01 | 04 | 2 | DSH-03 | unit | `cd dashboard && npx vitest run --grep session-list` | ❌ W0 | ⬜ pending |
| 135-04-02 | 04 | 2 | DSH-04 | unit | `cd dashboard && npx vitest run --grep status-card` | ❌ W0 | ⬜ pending |
| 135-05-01 | 05 | 2 | DSH-05 | integration | `cd dashboard && npx vitest run --grep clerk` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dashboard/` — Next.js 16 app scaffold with package.json, tsconfig.json
- [ ] `dashboard/vitest.config.ts` — vitest configuration
- [ ] `dashboard/lib/__tests__/` — test directory structure
- [ ] vitest + @testing-library/react installed as devDependencies

*Wave 0 establishes the project scaffold and test infrastructure.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SSE connection survives Vercel timeout | DSH-02 | Requires deployed Vercel environment | Deploy to preview, open browser DevTools Network tab, observe SSE connection for 60s+, verify heartbeat messages arrive |
| Clerk login flow | DSH-05 | Requires Clerk OAuth redirect flow | Navigate to dashboard URL, verify redirect to Clerk sign-in, sign in, verify redirect back to dashboard |
| Visual layout on mobile | DSH-03, DSH-04 | Requires visual inspection | Open on phone or Chrome DevTools mobile emulation, verify stacked cards layout and touch targets |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
