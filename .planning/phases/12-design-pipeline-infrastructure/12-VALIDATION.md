---
phase: 12
slug: design-pipeline-infrastructure
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-15
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in `assert` module — embedded in `design.cjs --self-test` mode (zero-dep constraint) |
| **Config file** | none — tests are inline assertions in the module itself |
| **Quick run command** | `node bin/lib/design.cjs --self-test` |
| **Full suite command** | `bash scripts/validate-install.sh && node bin/lib/design.cjs --self-test` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node -e "require('./bin/lib/design.cjs')" 2>&1 && echo 'syntax OK'`
- **After every plan wave:** Run `node bin/lib/design.cjs --self-test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | INFRA-01 | unit | `node bin/lib/design.cjs --self-test` | ❌ W0 | ⬜ pending |
| 12-01-02 | 01 | 1 | INFRA-01 | unit | `node bin/lib/design.cjs --self-test` | ❌ W0 | ⬜ pending |
| 12-01-03 | 01 | 1 | INFRA-01 | unit | `node bin/lib/design.cjs --self-test` | ❌ W0 | ⬜ pending |
| 12-01-04 | 01 | 1 | INFRA-01 | unit | `node bin/lib/design.cjs --self-test` | ❌ W0 | ⬜ pending |
| 12-02-01 | 02 | 1 | INFRA-02 | unit | `node bin/lib/design.cjs --self-test` | ❌ W0 | ⬜ pending |
| 12-02-02 | 02 | 1 | INFRA-02 | unit | `node bin/lib/design.cjs --self-test` | ❌ W0 | ⬜ pending |
| 12-02-03 | 02 | 1 | INFRA-02 | unit | `node bin/lib/design.cjs --self-test` | ❌ W0 | ⬜ pending |
| 12-03-01 | 03 | 1 | INFRA-03 | unit | `node bin/lib/design.cjs --self-test` | ❌ W0 | ⬜ pending |
| 12-03-02 | 03 | 1 | INFRA-03 | unit | `node bin/lib/design.cjs --self-test` | ❌ W0 | ⬜ pending |
| 12-03-03 | 03 | 1 | INFRA-03 | unit | `node bin/lib/design.cjs --self-test` | ❌ W0 | ⬜ pending |
| 12-03-04 | 03 | 1 | INFRA-03 | unit | `node bin/lib/design.cjs --self-test` | ❌ W0 | ⬜ pending |
| 12-04-01 | 04 | 1 | INFRA-04 | unit | `node bin/lib/design.cjs --self-test` | ❌ W0 | ⬜ pending |
| 12-04-02 | 04 | 1 | INFRA-04 | unit | `node bin/lib/design.cjs --self-test` | ❌ W0 | ⬜ pending |
| 12-04-03 | 04 | 1 | INFRA-04 | unit | `node bin/lib/design.cjs --self-test` | ❌ W0 | ⬜ pending |
| 12-04-04 | 04 | 1 | INFRA-04 | unit | `node bin/lib/design.cjs --self-test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `bin/lib/design.cjs` with `--self-test` entry point — covers all 17 INFRA unit tests (17/17 passing)

*Existing infrastructure covers framework needs — zero-dep `--self-test` pattern integrates into `validate-install.sh`.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 2s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete -- 2026-03-15
