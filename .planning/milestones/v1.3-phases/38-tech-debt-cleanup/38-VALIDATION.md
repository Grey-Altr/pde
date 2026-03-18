---
phase: 38
slug: tech-debt-cleanup
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-18
---

# Phase 38 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bash scripts (established pattern, phases 29-37) |
| **Config file** | None — standalone scripts |
| **Quick run command** | `node bin/pde-tools.cjs validate-skill "workflows/pressure-test.md"` |
| **Full suite command** | See Per-Task Verification Map below |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run the verification command for that task
- **After every plan wave:** Run all 4 verification commands
- **Before `/gsd:verify-work`:** All verification commands must pass
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 38-01-01 | 01 | 1 | CROSS-02 | smoke | `node bin/pde-tools.cjs validate-skill "workflows/pressure-test.md"` | ✅ | ⬜ pending |
| 38-01-02 | 01 | 1 | AUDIT-09 | smoke | `node -e "JSON.parse(require('fs').readFileSync('.planning/audit-baseline.json','utf-8'))"` | ❌ W0 | ⬜ pending |
| 38-01-03 | 01 | 1 | AUDIT-11 | smoke | `node bin/pde-tools.cjs frontmatter-get ".planning/phases/30-self-improvement-fleet-audit-command/30-03-SUMMARY.md" requirements-completed` | ✅ | ⬜ pending |
| 38-01-04 | 01 | 1 | QUAL-06 | smoke | `grep -E "AUD\|IMP\|PRT" skill-registry.md \| grep active` | ✅ | ⬜ pending |
| 38-01-05 | 01 | 1 | QUAL-06 | smoke | `node bin/pde-tools.cjs frontmatter-get ".planning/phases/30-self-improvement-fleet-audit-command/30-VALIDATION.md" nyquist_compliant` | ✅ | ⬜ pending |
| 38-01-06 | 01 | 1 | QUAL-06 | smoke | `node bin/pde-tools.cjs frontmatter-get ".planning/phases/36-design-elevation-handoff-flows-cross-cutting/36-VALIDATION.md" nyquist_compliant` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `.planning/audit-baseline.json` — covers AUDIT-09; must be created as part of this phase

*All other verification commands run against existing files — no additional stubs needed.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
