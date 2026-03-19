---
phase: 44
slug: end-to-end-validation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 44 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (`node --test`) |
| **Config file** | none — direct file invocation |
| **Quick run command** | `node --test tests/phase-44/*.test.mjs` |
| **Full suite command** | `cd "/Users/greyaltaer/code/projects/Platform Development Engine" && node --test tests/phase-40/*.test.mjs tests/phase-41/*.test.mjs tests/phase-42/*.test.mjs tests/phase-43/*.test.mjs tests/phase-44/*.test.mjs` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-44/*.test.mjs`
- **After every plan wave:** Run full suite (phase 40-44)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 44-01-01 | 01 | 0 | VAL-01 | structural | `node --test tests/phase-44/concurrency-isolation.test.mjs` | ❌ W0 | ⬜ pending |
| 44-01-02 | 01 | 0 | VAL-02 | structural | `node --test tests/phase-44/auth-recovery-structure.test.mjs` | ❌ W0 | ⬜ pending |
| 44-01-03 | 01 | 0 | VAL-03 | structural | `node --test tests/phase-44/writeback-confirmation.test.mjs` | ❌ W0 | ⬜ pending |
| 44-01-04 | 01 | 1 | VAL-01 | structural | `node --test tests/phase-44/concurrency-isolation.test.mjs` | ❌ W0 | ⬜ pending |
| 44-01-05 | 01 | 1 | VAL-02 | structural | `node --test tests/phase-44/auth-recovery-structure.test.mjs` | ❌ W0 | ⬜ pending |
| 44-01-06 | 01 | 1 | VAL-03 | structural | `node --test tests/phase-44/writeback-confirmation.test.mjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-44/concurrency-isolation.test.mjs` — stubs for VAL-01 (routing, section isolation, ROADMAP.md write pattern, Pencil dispatch)
- [ ] `tests/phase-44/auth-recovery-structure.test.mjs` — stubs for VAL-02 (loadConnections in all 10 MCP workflows, mcp-bridge.cjs schema)
- [ ] `tests/phase-44/writeback-confirmation.test.mjs` — stubs for VAL-03 (gate order for 4 write-back workflows, case-insensitive y/yes)

*All three files are Wave 0 — must exist before implementation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 2+ MCP servers connected simultaneously and sync commands work without interference | VAL-01 | Requires live MCP OAuth sessions; cannot be automated without external auth | 1. Connect GitHub + Linear MCP servers. 2. Run `/pde:sync --github`. 3. Run `/pde:sync --linear`. 4. Verify no state corruption in `.planning/REQUIREMENTS.md` (sections are separate). |
| After context compaction, re-run MCP-dependent command recovers auth from disk | VAL-02 | Requires live context compaction event; cannot be triggered programmatically | 1. Connect any MCP server. 2. Fill context until compaction triggers. 3. Run any MCP command. 4. Verify no re-auth prompt (OAuth token from keychain + metadata from mcp-connections.json). |
| Write-back command presents confirmation prompt listing write operations | VAL-03 | Requires live MCP write session; structural test covers gate existence, not runtime prompt behavior | 1. Run `/pde:handoff --github`. 2. Verify "Create this PR? (y/n)" prompt appears with PR details BEFORE any PR creation. 3. Type "n". 4. Verify "No PRs created." message. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 3s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
