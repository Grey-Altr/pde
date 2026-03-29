---
phase: 173
slug: mcp-bridge-dynamic-registration
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-29
---

# Phase 173 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | existing project vitest config |
| **Quick run command** | `npx vitest run tests/phase-173/` |
| **Full suite command** | `npx vitest run tests/phase-173/` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/phase-173/`
- **After every plan wave:** Run `npx vitest run tests/phase-173/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 173-01-01 | 01 | 0 | REG-01, REG-04 | unit | `npx vitest run tests/phase-173/mcp-bridge-dynamic.test.mjs` | W0 | pending |
| 173-01-02 | 01 | 1 | REG-01, REG-04 | unit | `npx vitest run tests/phase-173/mcp-bridge-dynamic.test.mjs` | W0 | pending |
| 173-02-01 | 02 | 1 | REG-03 | unit | `npx vitest run tests/phase-173/server-gen-python.test.mjs` | W0 | pending |
| 173-02-02 | 02 | 1 | REG-02 | unit | `npx vitest run tests/phase-173/pde-tools-app-register.test.mjs` | W0 | pending |
| 173-02-03 | 02 | 1 | REG-02 | unit | `npx vitest run tests/phase-173/pde-tools-app-register.test.mjs` | W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-173/mcp-bridge-dynamic.test.mjs` — stubs for REG-01, REG-04 (created in Plan 01 Task 1)
- [ ] `tests/phase-173/server-gen-python.test.mjs` — stubs for REG-03 (created in Plan 02 Task 1 RED step)
- [ ] `tests/phase-173/pde-tools-app-register.test.mjs` — stubs for REG-02 (created in Plan 02 Task 2)

*Test infrastructure exists from prior phases.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Claude Code session sees dynamic tools | REG-01 | Requires live Claude Code session | Approve app in registry, restart session, verify TOOL_MAP |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
