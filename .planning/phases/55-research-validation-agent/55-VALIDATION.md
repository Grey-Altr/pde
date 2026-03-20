---
phase: 55
slug: research-validation-agent
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
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
| 55-01-01 | 01 | 1 | RVAL-01 | smoke | `grep -E "LLM\|extract.*claim\|claim.*extract" agents/pde-research-validator.md` | ❌ W0 | ⬜ pending |
| 55-01-02 | 01 | 1 | RVAL-02 | smoke | `grep -E "Tier 1\|Tier 2\|Tier 3\|T1\|T2\|T3" agents/pde-research-validator.md` | ❌ W0 | ⬜ pending |
| 55-01-03 | 01 | 1 | RVAL-03 | smoke | `grep "artifact_content" agents/pde-research-validator.md` | ❌ W0 | ⬜ pending |
| 55-01-04 | 01 | 1 | RVAL-04 | smoke | `grep -c -E "Tier 1\|Tier 2\|Tier 3" agents/pde-research-validator.md` (expect 3+) | ❌ W0 | ⬜ pending |
| 55-01-05 | 01 | 1 | RVAL-05 | smoke | `grep "allowed-tools" -A 10 agents/pde-research-validator.md \| grep -v "Write\|Edit"` | ❌ W0 | ⬜ pending |
| 55-01-06 | 01 | 1 | RVAL-06 | smoke | `grep "validated_at_phase" agents/pde-research-validator.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `agents/pde-research-validator.md` — the agent itself; covers all RVAL requirements

*Existing infrastructure covers all phase requirements once the agent file is created.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Agent extracts meaningful claims from RESEARCH.md | RVAL-01 | LLM behavior cannot be deterministically tested | Run agent against 54-RESEARCH.md; inspect claim list for relevance |
| Agent correctly classifies CONTRADICTED vs UNVERIFIABLE | RVAL-04 | Requires LLM judgment evaluation | Review output for a research file with known contradictions |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
