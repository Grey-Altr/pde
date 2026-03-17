---
phase: 28
slug: build-orchestrator-expansion
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 28 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | grep-based structural verification (prompt-engineering phase, no runtime code) |
| **Config file** | none — no test framework needed |
| **Quick run command** | `grep -c "STAGES=" workflows/build.md` |
| **Full suite command** | `grep -c "STAGES=" workflows/build.md && grep -c "recommend\|competitive\|opportunity\|ideate\|brief\|system\|flows\|wireframe\|critique\|iterate\|mockup\|hig\|handoff" workflows/build.md` |
| **Estimated runtime** | ~1 second |

---

## Sampling Rate

- **After every task commit:** Run quick grep verification
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 1 second

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | BUILD-01, BUILD-02, BUILD-03 | structural | `grep` commands per task | ⬜ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. This is a prompt-engineering phase — verification uses grep-based structural checks on markdown workflow files.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full 13-stage pipeline dry-run | BUILD-01 | Requires running `/pde:build --dry-run` in Claude Code | Run command, verify 13 stages listed in order |
| Mid-pipeline entry | BUILD-02 | Requires running `/pde:build --from wireframe` | Run command, verify preceding stages skipped |
| Coverage flag completeness | BUILD-03 | Requires full pipeline run + manifest inspection | Run full pipeline, check design-manifest.json |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 1s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
