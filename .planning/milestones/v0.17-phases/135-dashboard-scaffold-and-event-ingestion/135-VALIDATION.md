---
phase: 135
slug: dashboard-scaffold-and-event-ingestion
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-25
audited: 2026-03-25
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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Test File | Status |
|---------|------|------|-------------|-----------|-------------------|-----------|--------|
| 135-01-01 | 01 | 0 | DSH-01 | setup | `cd dashboard && npx next build` | N/A (build check) | ✅ green |
| 135-02-01 | 02 | 1 | DSH-01 | integration | `cd dashboard && npx vitest run lib/__tests__/ingest.test.ts` | `dashboard/lib/__tests__/ingest.test.ts` | ✅ green |
| 135-02-02 | 02 | 1 | DSH-06 | unit | `cd dashboard && npx vitest run lib/__tests__/auth.test.ts` | `dashboard/lib/__tests__/auth.test.ts` | ✅ green |
| 135-03-01 | 03 | 1 | DSH-02 | integration | `cd dashboard && npx vitest run lib/__tests__/events.test.ts` | `dashboard/lib/__tests__/events.test.ts` | ✅ green |
| 135-03-02 | 03 | 1 | DSH-01 | unit | `cd dashboard && npx vitest run lib/__tests__/wire-schema.test.ts` | `dashboard/lib/__tests__/wire-schema.test.ts` | ✅ green |
| 135-04-01 | 04 | 2 | DSH-03 | unit | `cd dashboard && npx vitest run lib/__tests__/session-status.test.ts` | `dashboard/lib/__tests__/session-status.test.ts` | ✅ green |
| 135-04-02 | 04 | 2 | DSH-04 | unit | `cd dashboard && npx vitest run lib/__tests__/queries.test.ts` | `dashboard/lib/__tests__/queries.test.ts` | ✅ green |

*Status: pending / ✅ green / ❌ red / ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `dashboard/` — Next.js 16 app scaffold with package.json, tsconfig.json
- [x] `dashboard/vitest.config.ts` — vitest configuration
- [x] `dashboard/lib/__tests__/` — test directory structure
- [x] vitest + @testing-library/react installed as devDependencies

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

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete

---

## Validation Audit 2026-03-25

| Metric | Count |
|--------|-------|
| Gaps found | 2 |
| Resolved | 2 |
| Escalated | 0 |
| Total tests (automated) | 7 (6 test files) |
| Phase 135 new tests | 6 test files (ingest, auth, wire-schema, events, session-status, queries) |
| Manual-only items | 3 (SSE Vercel timeout, Clerk login flow, mobile visual layout) |
| Requirements covered (automated) | DSH-01, DSH-02, DSH-03, DSH-04, DSH-06 |
| Requirements covered (manual) | DSH-05 (Clerk OAuth) |

**Gaps resolved:**
1. Row 135-05-01 referenced non-existent Plan 05 — removed. DSH-05 is manual-only (Clerk OAuth redirect).
2. Test commands updated from --grep patterns to actual file paths matching dashboard/lib/__tests__/*.test.ts.

Phase verified with score 5/5 per 135-VERIFICATION.md. All 4 plans completed successfully. 7 automated task verifications across Plans 01-04 with no sampling continuity gaps.
