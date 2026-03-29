---
phase: 160
slug: declarative-approval-gates-workflow-flags
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-28
validated: 2026-03-28
---

# Phase 160 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | dashboard/vitest.config.ts |
| **Quick run command** | `cd dashboard && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd dashboard && npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~1 second (phase tests), ~1 second (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `cd dashboard && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd dashboard && npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 1 second

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 160-01-01 | 01 | 1 | WFL-01 | source-inspection | `cd dashboard && npx vitest run lib/__tests__/approval-gate-tool.test.ts lib/__tests__/planning-gates.test.ts` | ✅ | ✅ green |
| 160-01-02 | 01 | 1 | WFL-01 | source-inspection | `cd dashboard && npx vitest run lib/__tests__/approval-gate-tool.test.ts` | ✅ | ✅ green |
| 160-02-01 | 02 | 1 | WFL-02 | source-inspection | `cd dashboard && npx vitest run lib/__tests__/workflow-flags.test.ts` | ✅ | ✅ green |
| 160-02-02 | 02 | 1 | WFL-03 | source-inspection | `cd dashboard && npx vitest run lib/__tests__/workflow-flags.test.ts` | ✅ | ✅ green |
| 160-02-03 | 02 | 1 | WFL-04 | source-inspection | `cd dashboard && npx vitest run lib/__tests__/workflow-flags.test.ts` | ✅ | ✅ green |
| 160-02-04 | 02 | 1 | WFL-05 | source-inspection | `cd dashboard && npx vitest run lib/__tests__/workflow-flags.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Test File Inventory

| Test File | Tests | Requirement | Status |
|-----------|-------|-------------|--------|
| `dashboard/lib/__tests__/approval-gate-tool.test.ts` | 12 | WFL-01 | ✅ green |
| `dashboard/lib/__tests__/planning-gates.test.ts` | 8 | WFL-01 | ✅ green |
| `dashboard/lib/__tests__/workflow-flags.test.ts` | 16 | WFL-02, WFL-03, WFL-04, WFL-05 | ✅ green |

**Total: 36 tests, 36 passing, 0 failing**

---

## Wave 0 Requirements

- [x] `dashboard/lib/__tests__/approval-gate-tool.test.ts` — WFL-01 (approval gate tool registration, inputSchema, handler)
- [x] `dashboard/lib/__tests__/planning-gates.test.ts` — WFL-01 (API route source inspection)
- [x] `dashboard/lib/__tests__/workflow-flags.test.ts` — WFL-02 through WFL-05 (--webmcp flag parsing and output sections)

*All Wave 0 test files created during execution.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Browser AI agent can call approval gate tool | WFL-01 | Requires live WebMCP client | Open dashboard in Chrome, verify tool appears in navigator.modelContext |
| Existing approval flow unchanged without --webmcp | WFL-01 | Regression check | Run /pde:wireframe without --webmcp, confirm output unchanged |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 1s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-28

---

## Validation Audit 2026-03-28

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 5 requirements (WFL-01 through WFL-05) have automated verification via 36 source-inspection tests across 3 test files. No gaps detected.
