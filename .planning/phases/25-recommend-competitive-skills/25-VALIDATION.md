---
phase: 25
slug: recommend-competitive-skills
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-16
nyquist_audited: 2026-03-17
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash structural tests (grep-based verification of markdown workflow files) |
| **Config file** | none |
| **Quick run command** | `bash .planning/phases/25-recommend-competitive-skills/test_rec01_command_and_workflow_structure.sh && bash .planning/phases/25-recommend-competitive-skills/test_rec02_project_md_and_catalog.sh && bash .planning/phases/25-recommend-competitive-skills/test_comp01_command_and_workflow_structure.sh && bash .planning/phases/25-recommend-competitive-skills/test_comp02_03_analysis_sections.sh` |
| **Full suite command** | same as quick run |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run the four test scripts above
- **After every plan wave:** Run the four test scripts above
- **Before `/pde:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File | Status |
|---------|------|------|-------------|-----------|-------------------|------|--------|
| 25-01-01 | 01 | 1 | REC-01 | structural/smoke | `bash .planning/phases/25-recommend-competitive-skills/test_rec01_command_and_workflow_structure.sh` | test_rec01_command_and_workflow_structure.sh | ✅ green |
| 25-01-02 | 01 | 1 | REC-02 | structural/smoke | `bash .planning/phases/25-recommend-competitive-skills/test_rec02_project_md_and_catalog.sh` | test_rec02_project_md_and_catalog.sh | ✅ green |
| 25-01-03 | 01 | 1 | REC-03 | integration | Manual — Phase 27 | N/A | manual |
| 25-02-01 | 02 | 1 | COMP-01 | structural/smoke | `bash .planning/phases/25-recommend-competitive-skills/test_comp01_command_and_workflow_structure.sh` | test_comp01_command_and_workflow_structure.sh | ✅ green |
| 25-02-02 | 02 | 1 | COMP-02 | structural/smoke | `bash .planning/phases/25-recommend-competitive-skills/test_comp02_03_analysis_sections.sh` | test_comp02_03_analysis_sections.sh | ✅ green |
| 25-02-03 | 02 | 1 | COMP-03 (structural) | structural/smoke | `bash .planning/phases/25-recommend-competitive-skills/test_comp02_03_analysis_sections.sh` | test_comp02_03_analysis_sections.sh | ✅ green |
| 25-02-03 | 02 | 1 | COMP-03 (integration) | integration | Manual — compare CMP output with OPP input | N/A | manual |

*Status: manual · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `workflows/recommend.md` — full workflow file (covers REC-01, REC-02)
- [x] `workflows/competitive.md` — full workflow file (covers COMP-01, COMP-02, COMP-03)
- [x] `commands/recommend.md` — update stub to `@workflows/recommend.md` delegation
- [x] `commands/competitive.md` — update stub to `@workflows/competitive.md` delegation
- [x] Skill registry entries for REC and CMP (skill_code tags present in workflow files)

---

## Nyquist Audit Results (2026-03-17)

Gaps filled by gsd-nyquist-auditor:

| Gap ID | Requirement | Test File | Tests | Result |
|--------|-------------|-----------|-------|--------|
| REC-01 | Command delegation + v1.2 sections + 7 steps + 13-field coverage write | test_rec01_command_and_workflow_structure.sh | 28 | 28/28 pass |
| REC-02 | Step 2 PROJECT.md hard-require + 7-category inline catalog | test_rec02_project_md_and_catalog.sh | 13 | 13/13 pass |
| COMP-01 | Command delegation + v1.2 sections + 7 steps + hasCompetitive:true coverage write | test_comp01_command_and_workflow_structure.sh | 28 | 28/28 pass |
| COMP-02 | Feature comparison matrix + positioning map + confidence label framework | test_comp02_03_analysis_sections.sh | 15 | 15/15 pass |
| COMP-03 (structural) | Opportunity Highlights section with Source/Estimated reach/Competitive advantage sub-fields | test_comp02_03_analysis_sections.sh | (included above) | pass |
| REC-03 | Cross-skill Skill() invocation from /pde:ideate | N/A | manual | kept manual — Phase 27 required |
| COMP-03 (integration) | Cross-skill output parsing by /pde:opportunity | N/A | manual | kept manual — integration test only |

**Total automated tests: 84 | All pass**

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Recommend degrades when MCP registry unreachable | REC-01 SC2 | Requires removing mcp-compass MCP | Run `/pde:recommend` without mcp-compass installed; verify offline catalog output |
| Skill() invocation from /pde:ideate | REC-03 | Phase 27 not yet built | Run `/pde:ideate` when Phase 27 is complete; verify recommend output is incorporated |
| Competitive gaps machine-readable for opportunity | COMP-03 | Cross-skill integration | Run `/pde:competitive`, then check `## Opportunity Highlights` section is parseable by /pde:opportunity |
| Confidence labels on every claim | COMP-02 SC4 | Requires runtime output inspection | Grep competitive output for cells without `[confirmed]`, `[inferred]`, or `[unverified]` |

---

## Validation Sign-Off

- [x] All tasks have automated verify or documented manual-only reason
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s (actual: ~5s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** nyquist-audited 2026-03-17
