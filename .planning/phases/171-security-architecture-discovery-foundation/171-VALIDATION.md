---
phase: 171
slug: security-architecture-discovery-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 171 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.1 |
| **Config file** | vitest.config.ts (root) |
| **Quick run command** | `npx vitest run tests/phase-171/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/phase-171/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 171-01-01 | 01 | 0 | DISC-01 | unit | `npx vitest run tests/phase-171/app-discovery.test.mjs` | ❌ W0 | ⬜ pending |
| 171-01-02 | 01 | 0 | DISC-02 | unit | `npx vitest run tests/phase-171/app-registry.test.mjs` | ❌ W0 | ⬜ pending |
| 171-01-03 | 01 | 0 | DISC-04 | unit | `npx vitest run tests/phase-171/col-preprocess.test.mjs` | ❌ W0 | ⬜ pending |
| 171-02-01 | 02 | 1 | DISC-01 | unit | `npx vitest run tests/phase-171/app-discovery.test.mjs` | ❌ W0 | ⬜ pending |
| 171-02-02 | 02 | 1 | DISC-03 | unit | `npx vitest run tests/phase-171/app-discovery.test.mjs` | ❌ W0 | ⬜ pending |
| 171-02-03 | 02 | 1 | DISC-05 | unit | `npx vitest run tests/phase-171/app-discovery.test.mjs` | ❌ W0 | ⬜ pending |
| 171-03-01 | 03 | 1 | DISC-02 | unit | `npx vitest run tests/phase-171/app-registry.test.mjs` | ❌ W0 | ⬜ pending |
| 171-04-01 | 04 | 2 | DISC-06 | smoke | `test -f references/app-integrations.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-171/app-discovery.test.mjs` — stubs for DISC-01, DISC-03, DISC-05
- [ ] `tests/phase-171/app-registry.test.mjs` — stubs for DISC-02
- [ ] `tests/phase-171/col-preprocess.test.mjs` — stubs for DISC-04

*Pattern: follow tests/phase-170/mermaid-renderer.test.mjs exactly — CJS createRequire, _execFn injection, no real binaries installed*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| DISC-06 catalog content review | DISC-06 | Markdown content quality not automatable | Verify references/app-integrations.md contains bundle IDs, pip status, executionMode, discovery hints for Blender, GIMP, Inkscape |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
