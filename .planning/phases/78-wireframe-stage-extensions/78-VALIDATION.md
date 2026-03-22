---
phase: 78
slug: wireframe-stage-extensions
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-21
approved: 2026-03-21
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
| 78-01-01 | 01 | 0 | WIRE-01 | unit (structural) | `node --test tests/phase-78/wireframe-stage-extensions.test.mjs 2>&1` | ✅ | ✅ green |
| 78-01-02 | 01 | 0 | WIRE-01 | unit (structural) | same | ✅ | ✅ green |
| 78-01-03 | 01 | 0 | WIRE-02 | unit (structural) | same | ✅ | ✅ green |
| 78-01-04 | 01 | 0 | WIRE-03 | unit (structural) | same | ✅ | ✅ green |
| 78-01-05 | 01 | 0 | Isolation | unit (ordering) | same | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/phase-78/wireframe-stage-extensions.test.mjs` — 13 assertions for WIRE-01, WIRE-02, WIRE-03, isolation checks — all passing
- [x] Phase 82 `tests/milestone-completion.test.mjs` — WIRE-01/02/03 todo markers converted to positive passing assertions (0 todo markers remain)

*Existing Phase 82 milestone tests provide cross-phase regression coverage.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| FLP SVG renders visually correct floor plan with readable labels | WIRE-01 | Visual rendering quality cannot be automated via structural tests | Open FLP-floor-plan-v1.html in browser; verify zone labels readable, flow arrows visible, scale bar present |
| TML Mermaid gantt renders with energy curve overlay | WIRE-02 | Mermaid rendering is client-side; structural tests verify source but not rendered output | Open TML-timeline-v1.html in browser; verify gantt tracks visible, energy curve overlay rendered |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved — 2026-03-21 — 13/13 tests pass, 0 failures, 0 todo markers
