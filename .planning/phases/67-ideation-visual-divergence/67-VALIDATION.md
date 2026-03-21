---
phase: 67
slug: ideation-visual-divergence
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 67 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (existing project test infrastructure) |
| **Config file** | jest.config.js (existing) |
| **Quick run command** | `npx jest --testPathPattern="ideate" --no-coverage` |
| **Full suite command** | `npx jest --no-coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern="ideate" --no-coverage`
- **After every plan wave:** Run `npx jest --no-coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 67-01-01 | 01 | 1 | IDT-01 | unit | `npx jest --testPathPattern="batch-consent"` | W0 | pending |
| 67-01-02 | 01 | 1 | IDT-02 | unit | `npx jest --testPathPattern="ideate-stitch"` | W0 | pending |
| 67-01-03 | 01 | 1 | IDT-03 | unit | `npx jest --testPathPattern="visual-distinct"` | W0 | pending |
| 67-01-04 | 01 | 1 | IDT-04 | unit | `npx jest --testPathPattern="partial-batch"` | W0 | pending |
| 67-01-05 | 01 | 1 | EFF-03 | unit | `npx jest --testPathPattern="convergence-surface"` | W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for batch-consent, ideate-stitch, visual-distinct, partial-batch, convergence-surface
- [ ] Shared fixtures for Stitch MCP mock responses and quota state

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual distinctness of generated PNGs | IDT-03 | Requires actual Stitch API call + color extraction | Generate 3 variants, extract dominant colors, verify meaningful palette differences |

*All other behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
