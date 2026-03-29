---
phase: 164
slug: cli-wrapping-publishing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 164 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.1 |
| **Config file** | vitest.config.ts (root) |
| **Quick run command** | `npx vitest run tests/phase-164/ --reporter=verbose` |
| **Full suite command** | `npx vitest run tests/phase-164/ --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/phase-164/ --reporter=verbose`
- **After every plan wave:** Run `npx vitest run tests/phase-164/ --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 164-01-01 | 01 | 1 | CLI-07..11 | unit | `npx vitest run tests/phase-164/` | ❌ W0 | ⬜ pending |
| 164-02-01 | 02 | 2 | CLI-07 | unit | `npx vitest run tests/phase-164/help-parser.test.mjs` | ❌ W0 | ⬜ pending |
| 164-02-02 | 02 | 2 | CLI-08,11 | unit | `npx vitest run tests/phase-164/server-gen.test.mjs` | ❌ W0 | ⬜ pending |
| 164-03-01 | 03 | 3 | CLI-09 | unit | `npx vitest run tests/phase-164/skill-gen.test.mjs` | ❌ W0 | ⬜ pending |
| 164-03-02 | 03 | 3 | CLI-10 | unit | `npx vitest run tests/phase-164/registry.test.mjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-164/` directory — test scaffolds for all modules
- [ ] `tests/phase-164/fixtures/` — sample --help outputs for testing

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Wrap real CLI binary (e.g., git) | CLI-07 | Requires git installed | Run `/pde:wrap git`, verify MCP server starts |
| MCP server stdio communication | CLI-07,08 | Requires MCP client | Connect Claude Code to generated server, call a tool |
| Publish + list roundtrip | CLI-10 | Requires registry state | Run `/pde:publish`, then `pde-tools.cjs cli-anything list` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
