---
phase: 161
slug: auto-generated-competitor-tools
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-28
---

# Phase 161 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | dashboard/vitest.config.ts |
| **Quick run command** | `cd dashboard && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd dashboard && npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd dashboard && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd dashboard && npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 161-01-01 | 01 | 1 | ADV-01 | structural | `grep -q 'Step 8' workflows/competitive.md` | N/A | ⬜ pending |
| 161-01-02 | 01 | 1 | ADV-02 | structural | `grep -q 'sanitizeToolDescription' workflows/competitive.md` | N/A | ⬜ pending |
| 161-01-03 | 01 | 1 | ADV-04 | structural | `test -f dashboard/app/api/planning/competitor-tools/route.ts` | N/A | ⬜ pending |
| 161-02-01 | 02 | 2 | ADV-03 | unit | `cd dashboard && npx vitest run lib/__tests__/competitor-tools.test.ts -t "use-competitor-tools.ts"` | ❌ W0 | ⬜ pending |
| 161-02-02 | 02 | 2 | ADV-03 | structural | `grep -q 'useCompetitorTools' dashboard/hooks/use-webmcp-tools.ts` | N/A | ⬜ pending |
| 161-02-03 | 02 | 2 | ADV-03 | structural | `grep -c 'export' dashboard/lib/mcp/browser-tools/index.ts` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dashboard/lib/__tests__/competitor-tools.test.ts` — stubs for ADV-03 browser tool hook (created by Plan 02 Task 1)

*Plan 01 tasks use grep/file-check verify — no Wave 0 vitest stubs required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Browser AI agent sees competitor tool | ADV-03 | Requires live WebMCP browser environment | 1. Run competitive with --webmcp 2. Approve a tool via gate 3. Check navigator.modelContext |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-28
