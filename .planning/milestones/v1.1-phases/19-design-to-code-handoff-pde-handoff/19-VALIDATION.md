---
phase: 19
slug: design-to-code-handoff-pde-handoff
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-15
updated: 2026-03-15
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash + grep verification (skill-level integration tests) |
| **Config file** | none — skills validated via structural grep on workflow/command files |
| **Quick run command** | `grep -c "Step 1/7\|Step 2/7\|Step 3/7\|Step 4/7\|Step 5/7\|Step 6/7\|Step 7/7" workflows/handoff.md` |
| **Full suite command** | `bash .planning/phases/19-design-to-code-handoff-pde-handoff/test_hnd_gaps.sh` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick verification commands
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 19-01-01 | 01 | 1 | HND-01 | integration | `bash .planning/phases/19-design-to-code-handoff-pde-handoff/test_hnd_gaps.sh` | workflows/handoff.md | green |
| 19-01-02 | 01 | 1 | HND-02 | integration | `bash .planning/phases/19-design-to-code-handoff-pde-handoff/test_hnd_gaps.sh` | workflows/handoff.md | green |
| 19-01-03 | 01 | 1 | HND-03 | integration | `bash .planning/phases/19-design-to-code-handoff-pde-handoff/test_hnd_gaps.sh` | workflows/handoff.md | green |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

- workflows/handoff.md and commands/handoff.md already exist at correct paths
- Design manifest schema verified in Phase 12 infrastructure — handoff fields added at runtime

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| STACK.md hard stop at runtime | HND-03 | Requires live /pde:handoff execution | Run /pde:handoff in project without .planning/research/STACK.md; verify "Error: No STACK.md found" halt |
| Low annotation coverage warning | HND-01 | Requires fixture wireframes with <50% annotation coverage | Run /pde:handoff with wireframes having fewer ANNOTATION: comments than pde-state-- divs |
| TypeScript interface-only output quality | HND-02 | Generated file quality requires post-execution inspection | Inspect HND-types-v1.ts after live run: no imports, no const, only export interface/type |
| Manifest hasHandoff: true after run | HND-01 | Manifest state requires live execution | Inspect design-manifest.json after /pde:handoff: hasHandoff true, all 7 coverage fields present |

---

## Validation Sign-Off

- [x] All tasks have automated verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** green — 45/45 automated assertions pass (bash .planning/phases/19-design-to-code-handoff-pde-handoff/test_hnd_gaps.sh)
