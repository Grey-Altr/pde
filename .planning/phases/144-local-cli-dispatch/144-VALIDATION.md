---
phase: 144
slug: local-cli-dispatch
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 144 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.1 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run tests/dispatcher/ --reporter=verbose` |
| **Full suite command** | `npx vitest run tests/ --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/dispatcher/ --reporter=verbose`
- **After every plan wave:** Run `npx vitest run tests/ --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 144-01-xx | 01 | 1 | DSP-01 | unit | `npx vitest run tests/dispatcher/spawn.test.cjs` | No — W0 | pending |
| 144-01-xx | 01 | 1 | DSP-03 | unit | `npx vitest run tests/dispatcher/spawn.test.cjs` | No — W0 | pending |
| 144-01-xx | 01 | 1 | DSP-09 | unit | `npx vitest run tests/dispatcher/spawn.test.cjs` | No — W0 | pending |
| 144-01-xx | 01 | 1 | DSP-02 | unit | `npx vitest run tests/dispatcher/registry.test.cjs` | No — W0 | pending |
| 144-01-xx | 01 | 1 | DSP-07 | unit | `npx vitest run tests/dispatcher/registry.test.cjs` | No — W0 | pending |
| 144-01-xx | 01 | 1 | DSP-06 | unit | `npx vitest run tests/dispatcher/queue.test.cjs` | No — W0 | pending |
| 144-01-xx | 01 | 1 | DSP-08 | unit | `npx vitest run tests/dispatcher/aggregator.test.cjs` | No — W0 | pending |
| 144-xx-xx | xx | 2 | DSP-04 | integration | manual | No | pending |
| 144-xx-xx | xx | 2 | DSP-05 | integration | manual | No | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `tests/dispatcher/spawn.test.cjs` — covers DSP-01, DSP-03, DSP-09
- [ ] `tests/dispatcher/registry.test.cjs` — covers DSP-02, DSP-07
- [ ] `tests/dispatcher/queue.test.cjs` — covers DSP-06
- [ ] `tests/dispatcher/aggregator.test.cjs` — covers DSP-08

*Existing vitest infrastructure covers framework needs. Wave 0 adds test files only.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `--parallel` absent produces identical behavior | DSP-04 | Requires full CLI invocation comparison | Run `/gsd:execute-phase N` without `--parallel`; verify output matches pre-v0.18 |
| `--parallel` on autonomous enables plan-level parallelism | DSP-05 | Requires full autonomous workflow | Run `/gsd:autonomous --parallel`; verify plans in same wave spawn concurrently |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
