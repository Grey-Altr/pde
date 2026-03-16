---
phase: 25
slug: recommend-competitive-skills
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | PDE `/pde:test` (skill lint + smoke tests) |
| **Config file** | none — tests defined in `references/tooling-patterns.md` |
| **Quick run command** | `/pde:test recommend,competitive --lint` |
| **Full suite command** | `/pde:test recommend,competitive` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `/pde:test recommend,competitive --lint`
- **After every plan wave:** Run `/pde:test recommend,competitive`
- **Before `/pde:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 25-01-01 | 01 | 1 | REC-01 | smoke | `/pde:test recommend` | ❌ W0 | ⬜ pending |
| 25-01-02 | 01 | 1 | REC-02 | smoke | `/pde:test recommend` | ❌ W0 | ⬜ pending |
| 25-01-03 | 01 | 1 | REC-03 | integration | Manual — Phase 27 | N/A | ⬜ pending |
| 25-02-01 | 02 | 1 | COMP-01 | smoke | `/pde:test competitive` | ❌ W0 | ⬜ pending |
| 25-02-02 | 02 | 1 | COMP-02 | smoke | `/pde:test competitive` | ❌ W0 | ⬜ pending |
| 25-02-03 | 02 | 1 | COMP-03 | integration | Manual — compare CMP output with OPP input | Manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `workflows/recommend.md` — full workflow file (covers REC-01, REC-02)
- [ ] `workflows/competitive.md` — full workflow file (covers COMP-01, COMP-02, COMP-03)
- [ ] `commands/recommend.md` — update stub to `@workflows/recommend.md` delegation
- [ ] `commands/competitive.md` — update stub to `@workflows/competitive.md` delegation
- [ ] Skill registry entries for REC and CMP (covers LINT-010)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Recommend degrades when MCP registry unreachable | REC-01 SC2 | Requires removing mcp-compass MCP | Run `/pde:recommend` without mcp-compass installed; verify offline catalog output |
| Competitive gaps machine-readable for opportunity | COMP-03 | Cross-skill integration | Run `/pde:competitive`, then check `## Opportunity Highlights` section is parseable |
| Confidence labels on every claim | COMP-02 SC4 | Requires content inspection | Grep competitive output for cells without `[confirmed]`, `[inferred]`, or `[unverified]` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
