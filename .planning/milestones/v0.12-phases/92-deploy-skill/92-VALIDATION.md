---
phase: 92
slug: deploy-skill
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 92 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (existing Nyquist pattern) |
| **Config file** | none — node --test direct |
| **Quick run command** | `node --test .planning/phases/92-deploy-skill/tests/test-deploy-skill.cjs` |
| **Full suite command** | `node --test .planning/phases/92-deploy-skill/tests/test-deploy-skill.cjs` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test .planning/phases/92-deploy-skill/tests/test-deploy-skill.cjs`
- **After every plan wave:** Run full suite
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 92-01-01 | 01 | 1 | DEPLOY-01 | unit | `node --test ... -t "DEPLOY-01"` | W0 | pending |
| 92-01-02 | 01 | 1 | DEPLOY-02 | unit | `node --test ... -t "DEPLOY-02"` | W0 | pending |
| 92-01-03 | 01 | 1 | DEPLOY-03 | unit | `node --test ... -t "DEPLOY-03"` | W0 | pending |
| 92-01-04 | 01 | 1 | DEPLOY-04 | unit | `node --test ... -t "DEPLOY-04"` | W0 | pending |
| 92-01-05 | 01 | 1 | DEPLOY-05 | unit | `node --test ... -t "DEPLOY-05"` | W0 | pending |
| 92-01-06 | 01 | 1 | DEPLOY-06 | unit | `node --test ... -t "DEPLOY-06"` | W0 | pending |
| 92-01-07 | 01 | 1 | DEPLOY-07 | unit | `node --test ... -t "DEPLOY-07"` | W0 | pending |
| 92-01-08 | 01 | 1 | DEPLOY-08 | unit | `node --test ... -t "DEPLOY-08"` | W0 | pending |
| 92-01-09 | 01 | 1 | DEPLOY-09 | unit | `node --test ... -t "DEPLOY-09"` | W0 | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [ ] `tests/test-deploy-skill.cjs` — stubs for DEPLOY-01 through DEPLOY-09
- [ ] Existing test infrastructure covers framework needs

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Vercel deploy actually returns URL | DEPLOY-05 | Requires Vercel auth and network | Run /pde:deploy on a test project with Vercel CLI authenticated |
| Approval gate halts on decline | DEPLOY-06 | Requires interactive user input | Decline each gate and verify no partial artifacts written |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
