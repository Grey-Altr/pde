---
phase: 13-problem-framing-pde-brief
plan: "01"
subsystem: design-pipeline
tags: [brief, workflow, skill, design-pipeline, pde-tools]
dependency_graph:
  requires:
    - Phase 12: design pipeline infrastructure (bin/lib/design.cjs, pde-tools.cjs design subcommands, templates)
  provides:
    - workflows/brief.md — full /pde:brief workflow implementation
    - commands/brief.md — wired slash command delegation
  affects:
    - All downstream design skills (flows, system, wireframe, critique, iterate, handoff) — all read BRF brief as anchor
tech_stack:
  added: []
  patterns:
    - Skill-as-Self-Contained-Workflow (command stub delegates to workflow file)
    - pde-tools.cjs design subcommand calls for all infrastructure operations
    - Sequential Thinking MCP probe/use/degrade pattern
    - Write-lock protocol for root DESIGN-STATE.md updates
key_files:
  created:
    - workflows/brief.md
  modified:
    - commands/brief.md
decisions:
  - "[13-01] Jobs-to-be-done section added between Target Users and Constraints — template omits it but plan success criteria require it; workflow adds the section without modifying the template file"
  - "[13-01] --force flag added as skill-specific flag for non-interactive re-generation — allows CI/orchestrator invocations to skip confirmation prompt"
  - "[13-01] Scope Boundaries (Out of scope sub-section) serves as the non-goals section — no new template section needed; workflow labels it clearly"
metrics:
  duration: "5 minutes"
  completed_date: "2026-03-15"
  tasks_completed: 2
  files_modified: 2
requirements-completed: [BRF-01, BRF-02]
---

# Phase 13 Plan 01: /pde:brief Workflow Implementation Summary

**One-liner:** Full /pde:brief skill with 7-step pipeline, software/hardware/hybrid product type detection, and DESIGN-STATE write-lock protocol delegated from thin command stub.

## What Was Built

### Task 1: workflows/brief.md (484 lines)

Created the complete /pde:brief skill as a self-contained workflow. Key capabilities:

**7-step pipeline:**
1. Initialize design directories via `pde-tools.cjs design ensure-dirs`
2. Check prerequisites (PROJECT.md hard error, REQUIREMENTS.md soft dependency, version detection)
3. Probe Sequential Thinking MCP with probe/use/degrade pattern (30s timeout, 1 retry)
4. Detect product type (software/hardware/hybrid) from PROJECT.md signals + platform detection
5. Synthesize brief content — all 9 required sections including Jobs to Be Done
6. Create/update strategy domain DESIGN-STATE.md
7. Acquire write lock, update root DESIGN-STATE.md, release lock (always), update manifest

**Product type detection (BRF-02):**
- 40+ software signals: Node.js, React, SaaS, deploy, web browser, etc.
- 40+ hardware signals: PCB, CAD, BOM, firmware, microcontroller, etc.
- Classification: hybrid if both; hardware if hardware-only; software as default
- Platform detection: web, mobile, desktop, embedded, multi-platform
- Type-specific design constraints tables for each type

**Anti-pattern guards:**
- NEVER overwrite versioned brief — always increment version
- NEVER write root DESIGN-STATE.md without lock
- NEVER skip strategy/DESIGN-STATE.md creation
- NEVER continue if PROJECT.md missing (hard error)
- ALWAYS canonical lowercase product type in all three locations
- ALWAYS release write lock even on error
- NEVER add hasBrief flag to manifest (use artifacts.BRF presence instead)

### Task 2: commands/brief.md (updated)

Replaced stub content with standard delegation pattern:
- Removed "Planned -- available in PDE v2" placeholder and all descriptive text
- Added `@workflows/brief.md` reference in `<process>` block
- Added `@references/skill-style-guide.md` reference
- YAML frontmatter unchanged (correct name, description, 7 allowed-tools)

## Verification Results

| Check | Result |
|-------|--------|
| workflows/brief.md exists | PASS |
| 150+ lines | PASS (484 lines) |
| All acceptance criteria (20+ checks) | PASS |
| Command delegates to workflow | PASS |
| Stub language removed | PASS |
| Phase 12 self-test | PASS (17/17 tests) |
| pde-tools.cjs design calls | PASS (12 calls, 5+ required) |

## Deviations from Plan

None — plan executed exactly as written.

The three open questions from 13-RESEARCH.md were resolved as recommended:
1. Jobs-to-be-done section added between Target Users and Constraints in workflow output instructions (no template change needed)
2. `--force` flag implemented as skill-specific flag
3. Scope Boundaries (Out of scope sub-section) treated as the non-goals section

## Self-Check: PASSED

Files created/modified:
- FOUND: /Users/greyaltaer/code/projects/Platform Development Engine/workflows/brief.md
- FOUND: /Users/greyaltaer/code/projects/Platform Development Engine/commands/brief.md

Commits:
- FOUND: b1f563a feat(13-01): create workflows/brief.md
- FOUND: f07b1c6 feat(13-01): update commands/brief.md
