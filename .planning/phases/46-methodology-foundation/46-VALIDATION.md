---
phase: 46
slug: methodology-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 46 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js test runner (node --test) |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `node --test tests/phase-46/` |
| **Full suite command** | `node --test tests/` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-46/ 2>&1 | tail -5`
- **After every plan wave:** Run `node --test tests/phase-46/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 46-01-01 | 01 | 1 | FOUND-01 | unit | `node --test tests/phase-46/project-context.test.mjs` | ❌ W0 | ⬜ pending |
| 46-01-02 | 01 | 1 | FOUND-02 | integration | `node --test tests/phase-46/subagent-context-injection.test.mjs` | ❌ W0 | ⬜ pending |
| 46-02-01 | 02 | 1 | INFR-01 | unit | `node --test tests/phase-46/manifest-format.test.mjs` | ❌ W0 | ⬜ pending |
| 46-02-02 | 02 | 1 | INFR-02 | unit | `node --test tests/phase-46/manifest-init.test.mjs` | ❌ W0 | ⬜ pending |
| 46-02-03 | 02 | 1 | INFR-03 | unit | `node --test tests/phase-46/manifest-sync.test.mjs` | ❌ W0 | ⬜ pending |
| 46-03-01 | 03 | 1 | FOUND-03 | smoke | `node --test tests/phase-46/workflow-methodology.test.mjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-46/project-context.test.mjs` — covers FOUND-01: 4KB cap, section presence, content extraction from source files
- [ ] `tests/phase-46/subagent-context-injection.test.mjs` — covers FOUND-02: grep execute-phase.md for project-context.md in files_to_read blocks
- [ ] `tests/phase-46/workflow-methodology.test.mjs` — covers FOUND-03: file exists, required sections present, no BMAD/PAUL terms in user-facing content
- [ ] `tests/phase-46/manifest-format.test.mjs` — covers INFR-01: CSV columns, SHA256 length (64 hex chars), source enum values
- [ ] `tests/phase-46/manifest-init.test.mjs` — covers INFR-02: manifest init creates file, entry count matches tracked files list
- [ ] `tests/phase-46/manifest-sync.test.mjs` — covers INFR-03: stock file hash match → auto-update; disk hash differs → preserve; null manifest entry → preserve

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| workflow-methodology.md readability | FOUND-03 | Jargon detection is partially subjective | Read document; verify no raw BMAD/PAUL terms appear outside the Terminology Mapping table |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
