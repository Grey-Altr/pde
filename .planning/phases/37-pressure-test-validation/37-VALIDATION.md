---
phase: 37
slug: pressure-test-validation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 37 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash + node (Nyquist bash test pattern from Phase 36) |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `bash .planning/phases/37-pressure-test-validation/tests/run-quick.sh` |
| **Full suite command** | `bash .planning/phases/37-pressure-test-validation/tests/run-all.sh` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bash .planning/phases/37-pressure-test-validation/tests/run-quick.sh`
- **After every plan wave:** Run `bash .planning/phases/37-pressure-test-validation/tests/run-all.sh`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 37-01-01 | 01 | 1 | PRES-01 | integration | `bash tests/test-command-exists.sh` | ❌ W0 | ⬜ pending |
| 37-01-02 | 01 | 1 | PRES-02 | integration | `bash tests/test-compliance-check.sh` | ❌ W0 | ⬜ pending |
| 37-01-03 | 01 | 1 | PRES-03 | integration | `bash tests/test-quality-rubric.sh` | ❌ W0 | ⬜ pending |
| 37-01-04 | 01 | 1 | PRES-04 | integration | `bash tests/test-ai-aesthetic-checks.sh` | ❌ W0 | ⬜ pending |
| 37-01-05 | 01 | 1 | PRES-05 | integration | `bash tests/test-fixture-greenfield.sh` | ❌ W0 | ⬜ pending |
| 37-01-06 | 01 | 1 | PRES-06 | integration | `bash tests/test-fixture-partial.sh` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/run-quick.sh` — quick smoke test runner
- [ ] `tests/run-all.sh` — full suite runner
- [ ] `tests/test-command-exists.sh` — PRES-01 stub
- [ ] `tests/test-compliance-check.sh` — PRES-02 stub
- [ ] `tests/test-quality-rubric.sh` — PRES-03 stub
- [ ] `tests/test-ai-aesthetic-checks.sh` — PRES-04 stub
- [ ] `tests/test-fixture-greenfield.sh` — PRES-05 stub
- [ ] `tests/test-fixture-partial.sh` — PRES-06 stub

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Quality rubric produces specific, citation-based findings | PRES-03 | AI judge output quality requires human judgment | Review report for named elements vs generic observations |
| AI aesthetic avoidance checks are meaningful | PRES-04 | Subjective assessment of detection heuristics | Verify checks cite specific design elements, not boilerplate |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
