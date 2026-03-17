---
phase: 24
slug: schema-migration-infrastructure
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-16
gaps_filled: 2026-03-17
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in self-test in pde-tools.cjs + bash structural tests |
| **Config file** | none — self-test is embedded in pde-tools.cjs |
| **Quick run command** | `node bin/lib/design.cjs --self-test` |
| **Full suite command** | `node bin/lib/design.cjs --self-test && bash .planning/phases/24-schema-migration-infrastructure/test_infra01_workflow_pass_through.sh && bash .planning/phases/24-schema-migration-infrastructure/test_infra02_manifest_schema.sh` |
| **Estimated runtime** | ~3 seconds |

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
| 24-01-01 | 01 | 1 | INFRA-01 | structural | `bash .planning/phases/24-schema-migration-infrastructure/test_infra01_workflow_pass_through.sh` | ✅ | ✅ green |
| 24-01-02 | 01 | 1 | INFRA-02 | structural | `bash .planning/phases/24-schema-migration-infrastructure/test_infra02_manifest_schema.sh` | ✅ | ✅ green |
| 24-01-03 | 01 | 1 | INFRA-03 | integration | `node bin/lib/design.cjs --self-test` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

None — all requirements now have automated structural tests.

---

## Gap Fill Record (2026-03-17)

| Gap ID | Was | Now | Test File |
|--------|-----|-----|-----------|
| INFRA-01 | PARTIAL — no automated structural test | green | `test_infra01_workflow_pass_through.sh` |
| INFRA-02 | PARTIAL — no automated structural test | green | `test_infra02_manifest_schema.sh` |

---

## Validation Sign-Off

- [x] All tasks have automated verify
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 3s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** gaps-filled 2026-03-17
