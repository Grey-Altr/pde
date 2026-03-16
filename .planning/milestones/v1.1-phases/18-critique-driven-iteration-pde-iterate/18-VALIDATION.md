---
phase: 18
slug: critique-driven-iteration-pde-iterate
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-15
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | grep / bash assertions (skill file validation) |
| **Config file** | none — skill files are markdown, validated structurally |
| **Quick run command** | `grep -c "Step 1/7" workflows/iterate.md` |
| **Full suite command** | `bash -c 'test -f workflows/iterate.md && test -f commands/iterate.md && echo PASS || echo FAIL'` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick validation command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | ITR-01 | structural | `grep -c "WFR-.*-v" workflows/iterate.md` | ✅ | ✅ green |
| 18-01-02 | 01 | 1 | ITR-01 | structural | `grep -c "ITR-changelog" workflows/iterate.md` | ✅ | ✅ green |
| 18-01-03 | 01 | 1 | ITR-02 | structural | `grep -c "convergence" workflows/iterate.md` | ✅ | ✅ green |
| 18-01-04 | 01 | 1 | ITR-02 | structural | `grep -c "handoff" workflows/iterate.md` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Skill file structure validated against existing patterns (e.g., critique.md, wireframe.md)
- [x] Template file structure validated against templates/ directory conventions

*Existing infrastructure covers framework requirements — skills are markdown-based.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Versioned wireframe quality | ITR-01 | LLM output quality requires human judgment | Run `/pde:iterate` on a sample wireframe after critique and verify v2 HTML is correct |
| Convergence checklist accuracy | ITR-02 | Handoff readiness judgment | Run 3+ iteration cycles and verify convergence checklist surfaces correctly |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 2s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete -- 2026-03-15

---

## Validation Audit 2026-03-15

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 4 automated grep targets confirmed present (WFR-*-v=9, ITR-changelog=12, convergence=4, handoff=3). No path corrections needed. No gaps found.
