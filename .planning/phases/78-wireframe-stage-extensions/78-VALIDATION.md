---
phase: 78
slug: wireframe-stage-extensions
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 78 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (Node.js built-in, v18+) |
| **Config file** | None — tests run via `node --test` |
| **Quick run command** | `node --test tests/phase-78/wireframe-stage-extensions.test.mjs 2>&1` |
| **Full suite command** | `node --test tests/**/*.test.mjs 2>&1` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-78/wireframe-stage-extensions.test.mjs 2>&1`
- **After every plan wave:** Run `node --test tests/**/*.test.mjs 2>&1`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 78-01-01 | 01 | 0 | WIRE-01 | unit (structural) | `node --test tests/phase-78/wireframe-stage-extensions.test.mjs 2>&1` | ❌ W0 | ⬜ pending |
| 78-01-02 | 01 | 0 | WIRE-01 | unit (structural) | same | ❌ W0 | ⬜ pending |
| 78-01-03 | 01 | 0 | WIRE-02 | unit (structural) | same | ❌ W0 | ⬜ pending |
| 78-01-04 | 01 | 0 | WIRE-03 | unit (structural) | same | ❌ W0 | ⬜ pending |
| 78-01-05 | 01 | 0 | Isolation | unit (ordering) | same | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-78/wireframe-stage-extensions.test.mjs` — stubs for WIRE-01, WIRE-02, WIRE-03, isolation checks
- [ ] Phase 82 `tests/milestone-completion.test.mjs` already has test.todo markers for WIRE-01/02/03 — converted to passing tests alongside wireframe.md edits

*Existing Phase 82 milestone tests provide cross-phase regression coverage.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| FLP SVG renders visually correct floor plan with readable labels | WIRE-01 | Visual rendering quality cannot be automated via structural tests | Open FLP-floor-plan-v1.html in browser; verify zone labels readable, flow arrows visible, scale bar present |
| TML Mermaid gantt renders with energy curve overlay | WIRE-02 | Mermaid rendering is client-side; structural tests verify source but not rendered output | Open TML-timeline-v1.html in browser; verify gantt tracks visible, energy curve overlay rendered |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
