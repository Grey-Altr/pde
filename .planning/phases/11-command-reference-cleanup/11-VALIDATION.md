---
phase: 11
slug: command-reference-cleanup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash (grep/diff-based verification) |
| **Config file** | none — shell commands only |
| **Quick run command** | `grep -roh '/pde:[a-z_-]*' workflows/ references/ \| sort -u \| while read cmd; do name="${cmd#/pde:}"; [ -f "commands/${name}.md" ] && continue; echo "MISSING: $cmd"; done` |
| **Full suite command** | `grep -roh '/pde:[a-z_-]*' workflows/ references/ \| sort -u \| while read cmd; do name="${cmd#/pde:}"; [ -f "commands/${name}.md" ] && continue; echo "MISSING: $cmd"; done` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must return zero output
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | CMD-01 | integration | grep audit | ❌ W0 | ⬜ pending |
| 11-01-02 | 01 | 1 | CMD-01 | integration | grep audit | ❌ W0 | ⬜ pending |
| 11-01-03 | 01 | 1 | CMD-01 | integration | grep audit | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — verification is grep-based, no test framework needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Command stubs route to correct skills | CMD-01 | Requires Claude Code runtime | Invoke each /pde: command and verify it routes correctly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
