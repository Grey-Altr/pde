---
phase: 97
slug: consumer-glob-mismatch-fixes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 97 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js test runner (node --test) |
| **Config file** | none — existing infrastructure |
| **Quick run command** | `node --test tests/nyquist/test-foundation.cjs` |
| **Full suite command** | `node --test tests/nyquist/*.cjs` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/nyquist/test-foundation.cjs`
- **After every plan wave:** Run `node --test tests/nyquist/*.cjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 97-01-01 | 01 | 1 | LAUNCH-02, DEPLOY-03 | grep | `grep 'STR-stripe-pricing-v\*\.json' workflows/deploy.md` | ✅ | ⬜ pending |
| 97-01-02 | 01 | 1 | KIT-01 | grep | `grep 'STR-stripe-pricing-v\*' workflows/handoff.md` | ✅ | ⬜ pending |
| 97-01-03 | 01 | 1 | KIT-01, KIT-03 | grep | `grep 'DPD-pitch-deck-outline-v\*' workflows/handoff.md` | ✅ | ⬜ pending |
| 97-01-04 | 01 | 1 | KIT-01, KIT-02, OPS-02 | grep | `grep 'GTM-channel-flow-v\*' workflows/handoff.md` | ✅ | ⬜ pending |
| 97-01-05 | 01 | 1 | QUAL-01 | grep | `grep 'STR-stripe-pricing-v\*' workflows/critique.md` | ✅ | ⬜ pending |
| 97-01-06 | 01 | 1 | ALL | regression | `node --test tests/nyquist/*.cjs` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files needed — verification is via grep on the fixed glob patterns plus full Nyquist regression suite.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Deploy E2E flow completes | LAUNCH-02, DEPLOY-03 | Requires full pipeline run | Run `/pde:build business:software` through deploy preflight |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
