---
phase: 84
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 84 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in, zero npm) |
| **Config file** | none — inline test scripts |
| **Quick run command** | `node .planning/phases/84-foundation/tests/test-foundation.cjs` |
| **Full suite command** | `node .planning/phases/84-foundation/tests/test-foundation.cjs` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node .planning/phases/84-foundation/tests/test-foundation.cjs`
- **After every plan wave:** Run `node .planning/phases/84-foundation/tests/test-foundation.cjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 84-01-01 | 01 | 1 | FOUND-01 | structural | `grep "businessMode" templates/design-manifest.json` | ❌ W0 | ⬜ pending |
| 84-01-02 | 01 | 1 | FOUND-02 | structural | `grep "hasBusinessThesis" templates/design-manifest.json` | ❌ W0 | ⬜ pending |
| 84-01-03 | 01 | 1 | FOUND-03 | structural | `grep "'launch'" bin/lib/design.cjs` | ❌ W0 | ⬜ pending |
| 84-02-01 | 02 | 1 | FOUND-04 | file-exists | `test -f references/business-track.md` | ❌ W0 | ⬜ pending |
| 84-02-02 | 02 | 1 | FOUND-05 | file-exists | `test -f references/launch-frameworks.md` | ❌ W0 | ⬜ pending |
| 84-02-03 | 02 | 1 | FOUND-06 | structural | `grep "YOUR_" references/business-financial-disclaimer.md` | ❌ W0 | ⬜ pending |
| 84-02-04 | 02 | 1 | FOUND-07 | structural | `grep "checklist" references/business-legal-disclaimer.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `.planning/phases/84-foundation/tests/test-foundation.cjs` — structural assertions for all 7 FOUND requirements

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Track depth thresholds are concrete and actionable | FOUND-04 | Content quality requires human review | Read business-track.md, verify each track has specific line counts and vocabulary |
| Launch frameworks templates are complete | FOUND-05 | Template completeness requires domain judgment | Read launch-frameworks.md, verify lean canvas has 9 boxes, pitch deck has slide structures |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
