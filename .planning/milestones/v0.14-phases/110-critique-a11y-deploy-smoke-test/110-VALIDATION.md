---
phase: 110
slug: critique-a11y-deploy-smoke-test
status: compliant
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-23
---

# Phase 110 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (`node:test`) |
| **Config file** | none — run directly |
| **Quick run command** | `node --test tests/phase-110/*.test.mjs` |
| **Full suite command** | `node --test tests/**/*.test.mjs` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-110/*.test.mjs`
- **After every plan wave:** Run `node --test tests/**/*.test.mjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 110-01-01 | 01 | 1 | A11Y-01 | structural | `node --test tests/phase-110/critique-a11y-aom.test.mjs` | ✅ | ✅ green |
| 110-01-02 | 01 | 1 | A11Y-02 | structural | `node --test tests/phase-110/critique-a11y-aom.test.mjs` | ✅ | ✅ green |
| 110-01-03 | 01 | 1 | A11Y-03 | structural | `node --test tests/phase-110/critique-a11y-aom.test.mjs` | ✅ | ✅ green |
| 110-01-04 | 01 | 1 | A11Y-04 | structural | `node --test tests/phase-110/critique-a11y-aom.test.mjs` | ✅ | ✅ green |
| 110-02-01 | 02 | 1 | DEP-01 | structural | `node --test tests/phase-110/deploy-smoke-test.test.mjs` | ✅ | ✅ green |
| 110-02-02 | 02 | 1 | DEP-02 | structural | `node --test tests/phase-110/deploy-smoke-test.test.mjs` | ✅ | ✅ green |
| 110-02-03 | 02 | 1 | DEP-03 | structural | `node --test tests/phase-110/deploy-smoke-test.test.mjs` | ✅ | ✅ green |
| 110-02-04 | 02 | 1 | DEP-04 | structural | `node --test tests/phase-110/deploy-smoke-test.test.mjs` | ✅ | ✅ green |
| 110-02-05 | 02 | 1 | DEP-05 | structural | `node --test tests/phase-110/deploy-smoke-test.test.mjs` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/phase-110/critique-a11y-aom.test.mjs` — 12 assertions for A11Y-01 through A11Y-04 (GREEN)
- [x] `tests/phase-110/deploy-smoke-test.test.mjs` — 17 assertions for DEP-01 through DEP-05 (GREEN)

*Existing infrastructure covers test framework — only test files needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live Playwright AOM output matches expected YAML format | A11Y-01 | Requires live Playwright MCP server | Start Playwright MCP, run `/pde:critique` on a wireframe, verify AOM YAML in output |
| Live Axe + Playwright merge produces combined table | A11Y-03 | Requires both MCP servers running | Start both MCPs, run `/pde:critique`, verify combined findings table |
| Deploy smoke test navigates to real Vercel URL | DEP-02 | Requires live deployment + Playwright | Run `/pde:deploy` on a project with Vercel configured, verify screenshot captured |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-23

---

## Validation Audit 2026-03-23

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Total tests | 29 |
| Pass rate | 100% |
