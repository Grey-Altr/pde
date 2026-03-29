---
phase: 169
slug: parametric-cad-generation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 169 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run tests/phase-169` |
| **Full suite command** | `npx vitest run tests/phase-169` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/phase-169`
- **After every plan wave:** Run `npx vitest run tests/phase-169`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 169-01-01 | 01 | 1 | TRD-06 | unit | `npx vitest run tests/phase-169/cad.test.js` | ❌ W0 | ⬜ pending |
| 169-01-02 | 01 | 1 | TRD-06 | unit | `npx vitest run tests/phase-169/cad.test.js` | ❌ W0 | ⬜ pending |
| 169-02-01 | 02 | 2 | TRD-07 | unit | `npx vitest run tests/phase-169/cad.test.js` | ❌ W0 | ⬜ pending |
| 169-02-02 | 02 | 2 | TRD-06 | integration | `npx vitest run tests/phase-169/cad.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-169/cad.test.js` — test stubs for TRD-06, TRD-07
- [ ] Test fixtures: sample CadQuery Python script, expected STEP header

*Existing vitest infrastructure covers framework requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| STEP file opens in FreeCAD/Fusion 360 | TRD-06 | Requires CAD software | Open generated .step file in any CAD viewer, verify geometry renders |
| Parameterized script scaling | TRD-06 | Visual geometry check | Change PARAMS values, re-run, verify dimensions changed proportionally |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
