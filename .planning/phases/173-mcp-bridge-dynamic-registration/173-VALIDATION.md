---
phase: 173
slug: mcp-bridge-dynamic-registration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 173 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x / vitest |
| **Config file** | existing project test config |
| **Quick run command** | `node --test tests/phase-173/*.test.cjs` |
| **Full suite command** | `node --test tests/phase-173/` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-173/*.test.cjs`
- **After every plan wave:** Run `node --test tests/phase-173/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 173-01-01 | 01 | 0 | REG-01 | unit | `node --test tests/phase-173/load-dynamic-servers.test.cjs` | ❌ W0 | ⬜ pending |
| 173-01-02 | 01 | 1 | REG-02 | unit | `node --test tests/phase-173/registry-filter.test.cjs` | ❌ W0 | ⬜ pending |
| 173-02-01 | 02 | 1 | REG-03 | unit | `node --test tests/phase-173/app-cli-routing.test.cjs` | ❌ W0 | ⬜ pending |
| 173-02-02 | 02 | 1 | REG-04 | unit | `node --test tests/phase-173/python-module-handler.test.cjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-173/load-dynamic-servers.test.cjs` — stubs for REG-01
- [ ] `tests/phase-173/registry-filter.test.cjs` — stubs for REG-02
- [ ] `tests/phase-173/app-cli-routing.test.cjs` — stubs for REG-03
- [ ] `tests/phase-173/python-module-handler.test.cjs` — stubs for REG-04

*Test infrastructure exists from prior phases.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Claude Code session sees dynamic tools | REG-01 | Requires live Claude Code session | Approve app in registry, restart session, verify TOOL_MAP |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
