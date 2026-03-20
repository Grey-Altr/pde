---
phase: 55
slug: research-validation-agent
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-19
audited: 2026-03-20
---

# Phase 55 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (agent is a markdown file; no unit tests for agents) |
| **Config file** | none |
| **Quick run command** | `grep "MUST NOT write" agents/pde-research-validator.md` |
| **Full suite command** | N/A — validation is manual invoke and inspect |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `grep "MUST NOT write" agents/pde-research-validator.md`
- **After every plan wave:** Verify agent file structure with grep checks
- **Before `/gsd:verify-work`:** All 6 RVAL requirements TRUE
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 55-01-01 | 01 | 1 | RVAL-01 | smoke | `grep -E "LLM\|extract.*claim\|claim.*extract" agents/pde-research-validator.md` | ✅ exists | ✅ green (9 matches) |
| 55-01-02 | 01 | 1 | RVAL-02 | smoke | `grep -E "Tier 1\|Tier 2\|Tier 3\|T1\|T2\|T3" agents/pde-research-validator.md` | ✅ exists | ✅ green (7 matches) |
| 55-01-03 | 01 | 1 | RVAL-03 | smoke | `test -f .planning/phases/54-tech-debt-closure/54-RESEARCH-VALIDATION.md` | ✅ exists | ✅ green |
| 55-01-04 | 01 | 1 | RVAL-04 | smoke | `grep -c "VERIFIED\|UNVERIFIABLE\|CONTRADICTED" agents/pde-research-validator.md` (expect 3+) | ✅ exists | ✅ green (11 matches) |
| 55-01-05 | 01 | 1 | RVAL-05 | smoke | `grep "MUST NOT write" agents/pde-research-validator.md` | ✅ exists | ✅ green |
| 55-01-06 | 01 | 1 | RVAL-06 | smoke | `grep "validated_at_phase" agents/pde-research-validator.md` | ✅ exists | ✅ green (2 matches) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `agents/pde-research-validator.md` — the agent itself; covers all RVAL requirements

*Agent file created — all structural checks pass.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Agent extracts meaningful claims from RESEARCH.md | RVAL-01 | LLM behavior cannot be deterministically tested | Run agent against 54-RESEARCH.md; inspect claim list for relevance |
| Agent correctly classifies CONTRADICTED vs UNVERIFIABLE | RVAL-04 | Requires LLM judgment evaluation | Review output for a research file with known contradictions |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 2s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-20

## Validation Audit 2026-03-20

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Manual-only | 2 (LLM quality, classification judgment) |

All 6 RVAL requirements have automated structural verification via grep/test. Two manual-only items for LLM behavior quality assessment.
