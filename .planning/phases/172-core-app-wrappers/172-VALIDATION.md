---
phase: 172
slug: core-app-wrappers
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 172 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.1 |
| **Config file** | vitest.config.ts (root) |
| **Quick run command** | `npx vitest run tests/phase-172/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/phase-172/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 172-01-01 | 01 | 1 | WRAP-01 | unit | `npx vitest run tests/phase-172/blender-wrapper.test.mjs` | ❌ W0 | ⬜ pending |
| 172-01-02 | 01 | 1 | WRAP-01 | unit | `npx vitest run tests/phase-172/blender-wrapper.test.mjs` | ❌ W0 | ⬜ pending |
| 172-01-03 | 01 | 1 | WRAP-01 | unit | `npx vitest run tests/phase-172/blender-wrapper.test.mjs` | ❌ W0 | ⬜ pending |
| 172-02-01 | 02 | 1 | WRAP-02 | unit | `npx vitest run tests/phase-172/gimp-wrapper.test.mjs` | ❌ W0 | ⬜ pending |
| 172-02-02 | 02 | 1 | WRAP-02 | unit | `npx vitest run tests/phase-172/gimp-wrapper.test.mjs` | ❌ W0 | ⬜ pending |
| 172-02-03 | 02 | 1 | WRAP-02 | unit | `npx vitest run tests/phase-172/gimp-wrapper.test.mjs` | ❌ W0 | ⬜ pending |
| 172-02-04 | 02 | 1 | WRAP-02 | unit | `npx vitest run tests/phase-172/gimp-wrapper.test.mjs` | ❌ W0 | ⬜ pending |
| 172-02-05 | 02 | 1 | WRAP-02 | unit | `npx vitest run tests/phase-172/gimp-wrapper.test.mjs` | ❌ W0 | ⬜ pending |
| 172-03-01 | 03 | 1 | WRAP-03 | unit | `npx vitest run tests/phase-172/inkscape-wrapper.test.mjs` | ❌ W0 | ⬜ pending |
| 172-03-02 | 03 | 1 | WRAP-03 | unit | `npx vitest run tests/phase-172/inkscape-wrapper.test.mjs` | ❌ W0 | ⬜ pending |
| 172-04-01 | 01 | 2 | WRAP-04 | unit | `npx vitest run tests/phase-172/skill-gen-integration.test.mjs` | ❌ W0 | ⬜ pending |
| 172-04-02 | 01 | 2 | WRAP-04 | unit | `npx vitest run tests/phase-172/skill-gen-integration.test.mjs` | ❌ W0 | ⬜ pending |
| 172-05-01 | 01 | 1 | WRAP-05 | unit | `npx vitest run tests/phase-172/blender-wrapper.test.mjs` | ❌ W0 | ⬜ pending |
| 172-06-01 | 02 | 1 | WRAP-06 | unit | `npx vitest run tests/phase-172/gimp-wrapper.test.mjs` | ❌ W0 | ⬜ pending |
| 172-06-02 | 01 | 1 | WRAP-06 | unit | `npx vitest run tests/phase-172/blender-wrapper.test.mjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-172/blender-wrapper.test.mjs` — covers WRAP-01, WRAP-05, WRAP-06 (Blender)
- [ ] `tests/phase-172/gimp-wrapper.test.mjs` — covers WRAP-02, WRAP-06 (GIMP)
- [ ] `tests/phase-172/inkscape-wrapper.test.mjs` — covers WRAP-03
- [ ] `tests/phase-172/skill-gen-integration.test.mjs` — covers WRAP-04 (path fix verification)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Display server missing detected at probe time | WRAP-06 | Requires actual display-less environment | Run `pde-tools app wrap blender` on headless server; verify capability degradation in tool map |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
