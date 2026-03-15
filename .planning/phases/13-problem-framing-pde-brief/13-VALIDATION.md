---
phase: 13
slug: problem-framing-pde-brief
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash smoke tests (no npm test framework needed) |
| **Config file** | none — CLI smoke tests only |
| **Quick run command** | `node bin/pde-tools.cjs design ensure-dirs 2>&1` |
| **Full suite command** | `bash -c 'node bin/pde-tools.cjs design ensure-dirs && echo PASS'` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick smoke test
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | BRF-01 | smoke | `grep -l 'problem_statement' workflows/brief.md` | ❌ W0 | ⬜ pending |
| 13-01-02 | 01 | 1 | BRF-02 | smoke | `grep -l 'product_type' workflows/brief.md` | ❌ W0 | ⬜ pending |
| 13-01-03 | 01 | 1 | BRF-01 | smoke | `grep -l 'brief' commands/brief.md` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `workflows/brief.md` — main workflow file (created in Wave 1)
- [ ] `commands/brief.md` — update existing stub command

*Existing design infrastructure from Phase 12 covers directory creation and state management.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Brief output quality | BRF-01 | Claude reasoning quality cannot be automated | Run `/pde:brief` on a test project and verify sections are populated with relevant content |
| Product type detection accuracy | BRF-02 | Requires reading PROJECT.md with varying content | Test with software-only, hardware-only, and hybrid PROJECT.md files |
| Standalone vs orchestrator parity | BRF-01 | Requires running both paths and comparing | Run `/pde:brief` directly and via `/pde:build`, compare outputs |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
