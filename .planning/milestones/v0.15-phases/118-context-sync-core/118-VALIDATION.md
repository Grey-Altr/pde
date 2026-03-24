---
phase: 118
slug: context-sync-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 118 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in) |
| **Config file** | none — Wave 0 creates test file |
| **Quick run command** | `node --test tests/phase-118/*.cjs` |
| **Full suite command** | `node --test tests/phase-118/*.cjs` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-118/*.cjs`
- **After every plan wave:** Run `node --test tests/phase-118/*.cjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 118-01-01 | 01 | 1 | CTX-01 | structural | `node --test tests/phase-118/test-context-sync.cjs` | ❌ W0 | ⬜ pending |
| 118-01-02 | 01 | 1 | CTX-02 | structural | `node --test tests/phase-118/test-context-sync.cjs` | ❌ W0 | ⬜ pending |
| 118-01-03 | 01 | 1 | CTX-03 | structural | `node --test tests/phase-118/test-context-sync.cjs` | ❌ W0 | ⬜ pending |
| 118-01-04 | 01 | 1 | CTX-04 | structural | `node --test tests/phase-118/test-context-sync.cjs` | ❌ W0 | ⬜ pending |
| 118-01-05 | 01 | 1 | CTX-08 | structural | `node --test tests/phase-118/test-context-sync.cjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-118/test-context-sync.cjs` — structural tests for AGENTS.md, .mdc, .cursorrules, GEMINI.md generation and hash freshness
- [ ] Existing node:test infrastructure covers framework needs

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cursor loads .mdc files | CTX-02 | Requires Cursor IDE | Open project in Cursor, verify rules appear in AI context |
| Gemini CLI reads GEMINI.md | CTX-04 | Requires Gemini CLI | Run `gemini` in project root, verify context loaded |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 3s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
