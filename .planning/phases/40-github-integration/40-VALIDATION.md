---
phase: 40
slug: github-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 40 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (node --test) |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `node --test tests/phase-40/*.test.mjs` |
| **Full suite command** | `node --test tests/phase-40/*.test.mjs` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-40/*.test.mjs`
- **After every plan wave:** Run `node --test tests/phase-40/*.test.mjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 40-01-01 | 01 | 0 | INFRA | unit | `grep TOOL_MAP bin/lib/mcp-bridge.cjs` | ❌ W0 | ⬜ pending |
| 40-02-01 | 02 | 1 | GH-01 | integration | `node --test tests/phase-40/sync-github.test.mjs` | ❌ W0 | ⬜ pending |
| 40-03-01 | 03 | 1 | GH-02 | integration | `node --test tests/phase-40/handoff-prs.test.mjs` | ❌ W0 | ⬜ pending |
| 40-04-01 | 04 | 1 | GH-03 | integration | `node --test tests/phase-40/brief-github.test.mjs` | ❌ W0 | ⬜ pending |
| 40-05-01 | 05 | 2 | GH-04 | integration | `node --test tests/phase-40/ci-status.test.mjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-40/` — test directory for phase 40
- [ ] TOOL_MAP populated in `bin/lib/mcp-bridge.cjs` with GitHub canonical→raw mappings
- [ ] `mcp-connections.json` schema extended with `repo` field for GitHub

*Wave 0 must complete before any GH-* workflow can function.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GitHub MCP server connectivity | GH-01..04 | Requires live MCP server + auth token | Run `/pde:mcp-status`, verify GitHub shows "connected" |
| PR creation confirmation gate | GH-02 | Requires interactive user confirmation | Run `/pde:handoff --create-prs`, verify prompt appears before any write |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
