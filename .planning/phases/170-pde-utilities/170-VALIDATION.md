---
phase: 170
slug: pde-utilities
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 170 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run tests/phase-170` |
| **Full suite command** | `npx vitest run tests/phase-170` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/phase-170`
- **After every plan wave:** Run `npx vitest run tests/phase-170`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 8 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 170-01-01 | 01 | 1 | UTL-01 | unit | `npx vitest run tests/phase-170/mermaid-renderer.test.mjs` | ❌ W0 | ⬜ pending |
| 170-01-02 | 01 | 1 | UTL-02,UTL-03 | unit | `npx vitest run tests/phase-170/token-validator.test.mjs` | ❌ W0 | ⬜ pending |
| 170-02-01 | 02 | 1 | UTL-05,UTL-06 | unit | `npx vitest run tests/phase-170/flow-test-gen.test.mjs` | ❌ W0 | ⬜ pending |
| 170-02-02 | 02 | 1 | UTL-07,UTL-08 | unit | `npx vitest run tests/phase-170/handoff-verifier.test.mjs` | ❌ W0 | ⬜ pending |
| 170-03-01 | 03 | 2 | UTL-01-08 | integration | `npx vitest run tests/phase-170/` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Note: UTL-04 (visual diff) is satisfied by the existing `pde-tools.cjs image diff` command and `commands/visual-diff.md` skill file. No dedicated test file needed — verified by `grep -q "pde-tools.cjs image diff" commands/visual-diff.md` in Plan 03 Task 2.*

---

## Wave 0 Requirements

- [ ] `tests/phase-170/mermaid-renderer.test.mjs` — stubs for UTL-01
- [ ] `tests/phase-170/token-validator.test.mjs` — stubs for UTL-02, UTL-03
- [ ] `tests/phase-170/flow-test-gen.test.mjs` — stubs for UTL-05, UTL-06
- [ ] `tests/phase-170/handoff-verifier.test.mjs` — stubs for UTL-07, UTL-08

*Existing vitest infrastructure covers framework requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| mmdr renders faster than mermaid-cli | UTL-01 | Requires both renderers installed | Time both: `time mmdr -i test.mmd -o out.svg` vs `time mmdc -i test.mmd -o out.svg` |
| Visual diff screenshots match across branches | UTL-04 | Requires Playwright + multiple git branches | Run /pde:visual-diff on a branch with known CSS changes |
| Generated Playwright tests are runnable | UTL-06 | Requires Playwright runtime | Run /pde:gen-tests, then npx playwright test on output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 8s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
