---
phase: 42
slug: figma-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 42 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in Node.js) |
| **Config file** | none |
| **Quick run command** | `node --test tests/phase-42/*.test.mjs` |
| **Full suite command** | `node --test tests/phase-42/*.test.mjs && node --test tests/phase-41/*.test.mjs && node --test tests/phase-40/mcp-bridge-toolmap.test.mjs` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-42/*.test.mjs`
- **After every plan wave:** Run `node --test tests/phase-42/*.test.mjs && node --test tests/phase-41/*.test.mjs && node --test tests/phase-40/mcp-bridge-toolmap.test.mjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 42-01-01 | 01 | 1 | FIG-01 | unit | `node --test tests/phase-42/figma-toolmap.test.mjs` | ❌ W0 | ⬜ pending |
| 42-01-02 | 01 | 1 | FIG-01 | unit | `node --test tests/phase-42/sync-figma-workflow.test.mjs` | ❌ W0 | ⬜ pending |
| 42-01-03 | 01 | 1 | FIG-01 | unit | `node --test tests/phase-42/token-conversion.test.mjs` | ❌ W0 | ⬜ pending |
| 42-02-01 | 02 | 1 | FIG-02 | unit | `node --test tests/phase-42/wireframe-figma-workflow.test.mjs` | ❌ W0 | ⬜ pending |
| 42-03-01 | 03 | 1 | FIG-03 | unit | `node --test tests/phase-42/handoff-figma-workflow.test.mjs` | ❌ W0 | ⬜ pending |
| 42-04-01 | 04 | 1 | FIG-04 | unit | `node --test tests/phase-42/mockup-export-figma-workflow.test.mjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-42/figma-toolmap.test.mjs` — stubs for FIG-01 TOOL_MAP
- [ ] `tests/phase-42/sync-figma-workflow.test.mjs` — stubs for FIG-01 workflow
- [ ] `tests/phase-42/token-conversion.test.mjs` — stubs for FIG-01 conversion logic
- [ ] `tests/phase-42/wireframe-figma-workflow.test.mjs` — stubs for FIG-02
- [ ] `tests/phase-42/handoff-figma-workflow.test.mjs` — stubs for FIG-03
- [ ] `tests/phase-42/mockup-export-figma-workflow.test.mjs` — stubs for FIG-04

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Figma MCP OAuth connection | FIG-01-04 | Requires live Figma account + MCP server | Run `/pde:connect figma --confirm` with real Figma credentials |
| Token import from live Figma file | FIG-01 | Requires real Figma file with variables | Run `/pde:sync --figma` with connected Figma file |
| Mockup export confirmation gate | FIG-04 | Requires user interaction + live MCP | Run mockup export workflow and verify confirmation prompt appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
