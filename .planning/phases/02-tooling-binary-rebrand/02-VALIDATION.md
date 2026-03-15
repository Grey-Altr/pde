---
phase: 2
slug: tooling-binary-rebrand
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — shell-based grep and node invocation |
| **Config file** | None — no test runner needed for this phase |
| **Quick run command** | `grep -rni "gsd\|get-shit-done" bin/ && echo FAIL \|\| echo PASS` |
| **Full suite command** | See Per-Task Verification Map below |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `grep -rni "gsd\|get-shit-done" bin/ && echo FAIL || echo PASS`
- **After every plan wave:** Run full suite (all commands in verification map)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | TOOL-01 | smoke | `test -f bin/pde-tools.cjs && echo PASS \|\| echo FAIL` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | TOOL-01 | smoke | `node bin/pde-tools.cjs 2>&1 \| grep -q "pde-tools" && echo PASS \|\| echo FAIL` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | TOOL-02 | unit | `grep -rn "\.gsd" bin/ && echo FAIL \|\| echo PASS` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | TOOL-05 | unit | `grep -q "\.pde/defaults.json" bin/lib/config.cjs && echo PASS \|\| echo FAIL` | ❌ W0 | ⬜ pending |
| 02-01-05 | 01 | 1 | TOOL-05 | unit | `grep -q "\.pde/brave_api_key" bin/lib/config.cjs && echo PASS \|\| echo FAIL` | ❌ W0 | ⬜ pending |
| 02-01-06 | 01 | 1 | TOOL-06 | unit | `grep -q "pde/phase-" bin/lib/core.cjs && echo PASS \|\| echo FAIL` | ❌ W0 | ⬜ pending |
| 02-01-07 | 01 | 1 | TOOL-06 | unit | `grep -q "pde/phase-" bin/lib/config.cjs && echo PASS \|\| echo FAIL` | ❌ W0 | ⬜ pending |
| 02-01-08 | 01 | 1 | All | regression | `grep -rni "gsd\|get-shit-done" bin/ && echo FAIL \|\| echo PASS` | ❌ W0 | ⬜ pending |
| 02-01-09 | 01 | 1 | All | integration | `claude plugin validate .` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bin/pde-tools.cjs` — copy from `~/.claude/pde/bin/pde-tools.cjs`
- [ ] `bin/lib/` directory — copy all 11 lib files from `~/.claude/pde/bin/lib/`
- [ ] `chmod +x bin/pde-tools.cjs` — ensure executable permission

*No test framework install needed — tests are pure shell one-liners.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Two installs don't share config | TOOL-05 | Requires two simultaneous installs | Install both GSD and PDE, change `~/.pde/defaults.json`, verify GSD is unaffected |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
