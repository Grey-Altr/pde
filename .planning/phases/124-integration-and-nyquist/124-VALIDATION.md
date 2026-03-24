---
phase: 124
slug: integration-and-nyquist
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 124 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in) |
| **Config file** | none |
| **Quick run command** | `node --test tests/phase-124/test-integration-nyquist.cjs` |
| **Full suite command** | `for f in tests/phase-{118,119,120,121,122,123,124}/*.cjs; do node --test "$f"; done` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick command
- **After every plan wave:** Run full suite
- **Max feedback latency:** 15 seconds

---

## Wave 0 Requirements

- [ ] `tests/phase-124/test-integration-nyquist.cjs` — integration and Nyquist gates

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
