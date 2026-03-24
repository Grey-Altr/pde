---
phase: 116
slug: pressure-test-meta-optimization-ideation-brief-reference
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 116 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js assert (CJS/ESM) |
| **Config file** | none — uses existing Nyquist test patterns |
| **Quick run command** | `node --test tests/phase-116/phase-116-tests.mjs` |
| **Full suite command** | `node --test tests/phase-116/phase-116-tests.mjs` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-116/phase-116-tests.mjs`
- **After every plan wave:** Run `node --test tests/phase-116/phase-116-tests.mjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 116-01-01 | 01 | 1 | PRES-01..04 | structural | `grep -q 'visual_score\|visual_quality' skills/pressure-test/SKILL.md` | ❌ W0 | ⬜ pending |
| 116-01-02 | 01 | 1 | META-01..04 | structural | `grep -q 'strategy\|weight' bin/lib/strategy-weights.cjs` | ❌ W0 | ⬜ pending |
| 116-02-01 | 02 | 1 | IDT-01..04 | structural | `grep -q 'diversity\|variance' skills/ideate/SKILL.md` | ❌ W0 | ⬜ pending |
| 116-02-02 | 02 | 1 | BREF-01..04 | structural | `grep -q 'reference.*screenshot\|capture.*url' skills/brief/SKILL.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-116/phase-116-tests.mjs` — stubs for PRES, META, IDT, BREF requirements

*Existing Nyquist infrastructure covers test runner patterns.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| N/A | — | — | — |

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
