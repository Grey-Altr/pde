---
phase: 188
slug: verification-coverage
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 188 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x + manual CLI verification |
| **Config file** | vitest.config.mjs |
| **Quick run command** | `npx vitest run tests/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Verify changed files exist and contain expected content
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 188-01-01 | 01 | 1 | VER-01 | file check | `ls .planning/phases/176-*/*-VALIDATION.md` through 184 | ✅ partial | ⬜ pending |
| 188-02-01 | 02 | 1 | VER-02 | grep | `grep -c 'one-liner:' .planning/phases/54-*/*-SUMMARY.md` | ✅ | ⬜ pending |
| 188-03-01 | 03 | 2 | VER-03 | CLI | `node bin/pde-tools.cjs health consistency v0.22` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers VALIDATION.md and SUMMARY.md work. The health consistency subcommand is new code (Wave 2).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| VALIDATION.md assertion quality | VER-01 | Requires judgment on assertion meaningfulness | Read 2-3 VALIDATION.md files, verify assertions test behavior not just key existence |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
