---
phase: 43
slug: pencil-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 43 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (`node --test`) |
| **Config file** | none — direct file invocation |
| **Quick run command** | `node --test tests/phase-43/*.test.mjs` |
| **Full suite command** | `node --test tests/phase-40/*.test.mjs tests/phase-41/*.test.mjs tests/phase-42/*.test.mjs tests/phase-43/*.test.mjs` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-43/*.test.mjs`
- **After every plan wave:** Run `node --test tests/phase-40/*.test.mjs tests/phase-41/*.test.mjs tests/phase-42/*.test.mjs tests/phase-43/*.test.mjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 43-01-01 | 01 | 1 | PEN-01, PEN-02, PEN-03 | unit | `node -e "const b=require('./bin/lib/mcp-bridge.cjs'); console.log(Object.keys(b.TOOL_MAP).length)"` | N/A (modifies existing) | ⬜ pending |
| 43-01-02 | 01 | 1 | PEN-01, PEN-02 | unit+grep | `grep -c 'mcp__pencil__' commands/system.md && grep -c 'mcp__pencil__' commands/critique.md && node --test tests/phase-40/mcp-bridge-toolmap.test.mjs tests/phase-41/linear-toolmap.test.mjs tests/phase-42/figma-toolmap.test.mjs 2>&1 \| tail -5` | N/A (modifies existing) | ⬜ pending |
| 43-02-01 | 02 | 2 | PEN-01 | unit (TDD) | `node --test tests/phase-43/pencil-toolmap.test.mjs tests/phase-43/token-to-pencil.test.mjs` | ❌ W0 | ⬜ pending |
| 43-02-02 | 02 | 2 | PEN-01, PEN-03 | structural | `node --test tests/phase-43/pencil-toolmap.test.mjs tests/phase-43/token-to-pencil.test.mjs tests/phase-43/sync-pencil-workflow.test.mjs` | ❌ W0 | ⬜ pending |
| 43-02-03 | 02 | 2 | PEN-01 | grep | `grep -c 'sync-pencil.md' workflows/system.md && grep -c 'pencilConnected' workflows/system.md` | N/A (modifies existing) | ⬜ pending |
| 43-03-01 | 03 | 2 | PEN-02 | structural (TDD) | `node --test tests/phase-43/pencil-toolmap.test.mjs tests/phase-43/token-to-pencil.test.mjs` | ❌ W0 | ⬜ pending |
| 43-03-02 | 03 | 2 | PEN-02, PEN-03 | structural | `node --test tests/phase-43/critique-pencil-screenshot.test.mjs` | ❌ W0 | ⬜ pending |
| 43-03-03 | 03 | 2 | PEN-02 | grep | `grep -c 'critique-pencil-screenshot.md' workflows/critique.md && grep -c 'pencilConnected' workflows/critique.md` | N/A (modifies existing) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-43/pencil-toolmap.test.mjs` — validates 7 Pencil TOOL_MAP entries, APPROVED_SERVERS.pencil (Plan 02 Task 1)
- [ ] `tests/phase-43/token-to-pencil.test.mjs` — validates dtcgToPencilVariables and mergePencilVariables (Plan 02 Task 1)
- [ ] `tests/phase-43/sync-pencil-workflow.test.mjs` — structural tests for sync-pencil.md (Plan 02 Task 1)
- [ ] `tests/phase-43/critique-pencil-screenshot.test.mjs` — structural tests for critique-pencil-screenshot.md (Plan 03 Task 1)
- [ ] `tests/phase-40/mcp-bridge-toolmap.test.mjs` — UPDATE TOOL_MAP count 29 → 36 (Plan 01 Task 2)
- [ ] `tests/phase-41/linear-toolmap.test.mjs` — UPDATE TOOL_MAP count 29 → 36 (Plan 01 Task 2)
- [ ] `tests/phase-42/figma-toolmap.test.mjs` — UPDATE TOOL_MAP count 29 → 36 + pencil probeTool test (Plan 01 Task 2)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pencil canvas receives variables | PEN-01 | Requires live VS Code + Pencil | Open Pencil, run sync-pencil workflow, verify variables appear |
| Screenshot captured in critique | PEN-02 | Requires live Pencil canvas | Open Pencil with design, run /pde:critique, verify screenshot in output |
| Degraded-mode message shown | PEN-03 | Requires Pencil to be disconnected | Close VS Code, run /pde:system, verify message |
| system.md dispatches to sync-pencil | PEN-01 | Requires live Pencil + token generation | Run /pde:system with Pencil connected, verify tokens pushed |
| critique.md dispatches to screenshot | PEN-02 | Requires live Pencil + wireframes | Run /pde:critique with Pencil connected, verify screenshot captured |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
