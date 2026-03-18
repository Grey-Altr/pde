---
phase: 30
slug: self-improvement-fleet-audit-command
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (existing) + bash integration tests |
| **Config file** | `jest.config.js` (existing) |
| **Quick run command** | `npm test -- --testPathPattern="audit\|fleet\|improve"` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --testPathPattern="audit|fleet|improve"`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 30-01-01 | 01 | 1 | AUDIT-01 | unit | `npm test -- --testPathPattern="audit-command"` | ❌ W0 | ⬜ pending |
| 30-01-02 | 01 | 1 | AUDIT-02 | unit | `npm test -- --testPathPattern="auditor-agent"` | ❌ W0 | ⬜ pending |
| 30-01-03 | 01 | 1 | AUDIT-03 | unit | `npm test -- --testPathPattern="quality-standards"` | ❌ W0 | ⬜ pending |
| 30-02-01 | 02 | 2 | AUDIT-04 | unit | `npm test -- --testPathPattern="improver"` | ❌ W0 | ⬜ pending |
| 30-02-02 | 02 | 2 | AUDIT-05 | unit | `npm test -- --testPathPattern="validator"` | ❌ W0 | ⬜ pending |
| 30-02-03 | 02 | 2 | AUDIT-06 | integration | `npm test -- --testPathPattern="protected-files"` | ❌ W0 | ⬜ pending |
| 30-03-01 | 03 | 3 | AUDIT-07 | unit | `npm test -- --testPathPattern="validate-skill"` | ❌ W0 | ⬜ pending |
| 30-03-02 | 03 | 3 | AUDIT-08 | unit | `npm test -- --testPathPattern="health-report"` | ❌ W0 | ⬜ pending |
| 30-03-03 | 03 | 3 | AUDIT-09 | integration | `npm test -- --testPathPattern="baseline"` | ❌ W0 | ⬜ pending |
| 30-04-01 | 04 | 3 | AUDIT-10 | unit | `npm test -- --testPathPattern="fleet"` | ❌ W0 | ⬜ pending |
| 30-04-02 | 04 | 3 | AUDIT-11 | integration | `npm test -- --testPathPattern="audit-e2e"` | ❌ W0 | ⬜ pending |
| 30-04-03 | 04 | 3 | AUDIT-12 | integration | `npm test -- --testPathPattern="delta"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/audit-command.test.js` — stubs for AUDIT-01 (command routing, argument parsing)
- [ ] `tests/auditor-agent.test.js` — stubs for AUDIT-02 (read-only evaluation)
- [ ] `tests/improver.test.js` — stubs for AUDIT-04, AUDIT-05 (propose/validate fixes)
- [ ] `tests/validate-skill.test.js` — stubs for AUDIT-07 (CLI validation)
- [ ] `tests/health-report.test.js` — stubs for AUDIT-08 (baseline measurements)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Audit report readability | AUDIT-01 | Subjective formatting quality | Review `.planning/audit-report.md` output for clear severity sections |
| Improvement diff clarity | AUDIT-04 | Subjective before/after presentation | Review `.planning/improvements/` for readable diffs |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
