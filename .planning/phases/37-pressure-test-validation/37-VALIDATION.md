---
phase: 37
slug: pressure-test-validation
status: approved
nyquist_compliant: true
wave_0_complete: true
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
| 37-01-01 | 01 | 1 | PRES-01 | integration | `bash tests/test-pres01-command.sh` | ✅ | ✅ green (5/5) |
| 37-01-02 | 01 | 1 | PRES-02 | integration | `bash tests/test-pres02-compliance.sh` | ✅ | ✅ green (5/5) |
| 37-01-03 | 01 | 1 | PRES-03 | integration | `bash tests/test-pres03-rubric.sh` | ✅ | ✅ green (5/5) |
| 37-01-04 | 01 | 1 | PRES-04 | integration | `bash tests/test-pres04-fixtures.sh` | ✅ | ✅ green (6/6) |
| 37-01-05 | 01 | 1 | PRES-05 | integration | `bash tests/test-pres05-report.sh` | ✅ | ✅ green (5/5) |
| 37-01-06 | 01 | 1 | PRES-06 | integration | `bash tests/test-pres06-ai-aesthetic.sh` | ✅ | ✅ green (4/4) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/run-quick.sh` — quick smoke test runner
- [x] `tests/run-all.sh` — full suite runner
- [x] `tests/test-pres01-command.sh` — PRES-01 (5/5)
- [x] `tests/test-pres02-compliance.sh` — PRES-02 (5/5)
- [x] `tests/test-pres03-rubric.sh` — PRES-03 (5/5)
- [x] `tests/test-pres04-fixtures.sh` — PRES-04 (6/6)
- [x] `tests/test-pres05-report.sh` — PRES-05 (5/5)
- [x] `tests/test-pres06-ai-aesthetic.sh` — PRES-06 (4/4)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Quality rubric produces specific, citation-based findings | PRES-03 | AI judge output quality requires human judgment | Review report for named elements vs generic observations |
| AI aesthetic avoidance checks are meaningful | PRES-04 | Subjective assessment of detection heuristics | Verify checks cite specific design elements, not boilerplate |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-18

---

## Validation Audit 2026-03-18

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 6 requirements have automated verification. 30/30 checks green across 6 test scripts.
