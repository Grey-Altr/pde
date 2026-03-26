---
phase: 141
slug: approval-response-stdio-fix
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 141 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (latest) |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run tests/relay-stdio.test.cjs --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/relay-stdio.test.cjs --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 141-01-01 | 01 | 1 | APR-04 (SC-1) | unit | `npx vitest run tests/relay-stdio.test.cjs` | ❌ W0 | ⬜ pending |
| 141-01-02 | 01 | 1 | APR-04 (SC-2) | integration | `npx vitest run tests/relay-stdio.test.cjs` | ❌ W0 | ⬜ pending |
| 141-01-03 | 01 | 1 | APR-04 (SC-3) | unit | `npx vitest run tests/relay-stdio.test.cjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/relay-stdio.test.cjs` — covers APR-04 (SC-1, SC-2, SC-3); test IDs RS-01, RS-02, RS-03
- [ ] No framework install needed — vitest already installed at project root

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
