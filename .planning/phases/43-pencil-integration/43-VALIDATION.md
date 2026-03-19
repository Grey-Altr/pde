---
phase: 43
slug: pencil-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 43 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js assert (built-in, zero deps) |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `node tests/43-pencil-integration/run.cjs` |
| **Full suite command** | `node tests/43-pencil-integration/run.cjs --full` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node tests/43-pencil-integration/run.cjs`
- **After every plan wave:** Run `node tests/43-pencil-integration/run.cjs --full`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 43-01-01 | 01 | 1 | PEN-01 | unit | `node tests/43-pencil-integration/run.cjs` | ❌ W0 | ⬜ pending |
| 43-01-02 | 01 | 1 | PEN-02 | unit | `node tests/43-pencil-integration/run.cjs` | ❌ W0 | ⬜ pending |
| 43-01-03 | 01 | 1 | PEN-03 | unit | `node tests/43-pencil-integration/run.cjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/43-pencil-integration/test-pencil-tool-map.cjs` — stubs for PEN-01 (TOOL_MAP entries)
- [ ] `tests/43-pencil-integration/test-dtcg-to-pencil.cjs` — stubs for PEN-01 (token conversion)
- [ ] `tests/43-pencil-integration/test-degraded-mode.cjs` — stubs for PEN-03 (graceful degradation)
- [ ] `tests/43-pencil-integration/run.cjs` — test runner

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pencil canvas receives variables | PEN-01 | Requires live VS Code + Pencil | Open Pencil, run sync-pencil workflow, verify variables appear |
| Screenshot captured in critique | PEN-02 | Requires live Pencil canvas | Open Pencil with design, run /pde:critique, verify screenshot in output |
| Degraded-mode message shown | PEN-03 | Requires Pencil to be disconnected | Close VS Code, run /pde:system, verify message |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
