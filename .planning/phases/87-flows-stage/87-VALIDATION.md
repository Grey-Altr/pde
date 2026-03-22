---
phase: 87
slug: flows-stage
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 87 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 87-01-01 | 01 | 1 | OPS-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 87-01-02 | 01 | 1 | OPS-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 87-01-03 | 01 | 1 | OPS-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 87-01-04 | 01 | 1 | OPS-04 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for OPS-01 (service blueprint generation)
- [ ] Test stubs for OPS-02 (GTM channel flow)
- [ ] Test stubs for OPS-03 (designCoverage tracking)
- [ ] Test stubs for OPS-04 (businessTrack adaptation)

*Exact file paths and fixtures TBD by planner — will be refined when plans are created.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 5-lane Mermaid visual correctness | OPS-01 | Visual diagram layout | Render output in Mermaid live editor, verify 5 lanes visible |
| GTM flow channel annotations | OPS-02 | Visual annotation check | Render output, verify acquisition→conversion→retention labels |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
