---
phase: 8
slug: onboarding-distribution
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — bash script (no test framework in project) |
| **Config file** | none — Wave 0 creates scripts/validate-install.sh |
| **Quick run command** | `bash scripts/validate-install.sh` |
| **Full suite command** | `bash scripts/validate-install.sh` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bash scripts/validate-install.sh`
- **After every plan wave:** Run `bash scripts/validate-install.sh`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | BRAND-06 | automated grep | `bash scripts/validate-install.sh` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 1 | BRAND-06 | automated grep | `bash scripts/validate-install.sh` | ❌ W0 | ⬜ pending |
| 08-03-01 | 03 | 2 | BRAND-06 | manual + automated | `bash scripts/validate-install.sh` | ❌ W0 | ⬜ pending |
| 08-04-01 | 04 | 2 | BRAND-06 | version check | `bash scripts/validate-install.sh` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/validate-install.sh` — checks for hardcoded usernames, GSD references, version consistency, marketplace.json existence

*Validation script covers all BRAND-06 checks and portability verification.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Plugin installs on different machine | BRAND-06 | Requires separate machine/user account | Ask collaborator to run install commands from GETTING-STARTED.md |
| /pde: commands visible in palette | BRAND-06 | Requires Claude Code UI interaction | After install, type `/pde:` and verify command list appears |
| /pde:help returns expected output | BRAND-06 | Requires live Claude Code session | Run `/pde:help` and verify PDE-branded output |
| README renders correctly on GitHub | BRAND-06 | Requires push to GitHub | Push and verify Mermaid diagram renders, badges display |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
