---
phase: 24
slug: schema-migration-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in self-test in pde-tools.cjs |
| **Config file** | none — self-test is embedded in pde-tools.cjs |
| **Quick run command** | `node pde-tools.cjs self-test` |
| **Full suite command** | `node pde-tools.cjs self-test` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node pde-tools.cjs self-test`
- **After every plan wave:** Run `node pde-tools.cjs self-test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 24-01-01 | 01 | 1 | INFRA-01 | integration | `node pde-tools.cjs self-test` | ✅ | ⬜ pending |
| 24-01-02 | 01 | 1 | INFRA-02 | integration | `node pde-tools.cjs self-test` | ✅ | ⬜ pending |
| 24-01-03 | 01 | 1 | INFRA-03 | integration | `node pde-tools.cjs self-test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Coverage flag preservation | INFRA-01 | Requires simulating a v1.2 skill run followed by a v1.1 skill run | 1. Set hasIdeation=true in manifest 2. Run wireframe workflow 3. Verify hasIdeation still true |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
