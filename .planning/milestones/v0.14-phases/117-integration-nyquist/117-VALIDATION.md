---
phase: 117
slug: integration-nyquist
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 117 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js assert (ESM) |
| **Config file** | none — uses existing Nyquist test patterns |
| **Quick run command** | `node --test tests/phase-117/integration-nyquist.test.mjs` |
| **Full suite command** | `find tests/ -name "*.test.mjs" -o -name "*.test.cjs" \| xargs node --test` |
| **Estimated runtime** | ~30 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run quick command
- **After every plan wave:** Run full suite
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 117-01-01 | 01 | 1 | INTG-01 | structural | `node --test tests/phase-117/integration-nyquist.test.mjs` | ❌ W0 | ⬜ pending |
| 117-02-01 | 02 | 2 | INTG-02 | regression | full suite command | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-117/integration-nyquist.test.mjs` — stubs for INTG-01, INTG-02

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
