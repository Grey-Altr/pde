---
gsd_state_version: 1.0
milestone: v0.20
milestone_name: CLI-Anything + Asset Engine
status: Ready to plan
stopped_at: null
last_updated: "2026-03-28T00:00:00.000Z"
progress:
  total_phases: 8
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)

**Core value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.
**Current focus:** Phase 163 — CLI Ingestion + Capability Model

## Current Position

Phase: 163 of 170 (CLI Ingestion + Capability Model)
Plan: Not started
Status: Ready to plan
Last activity: 2026-03-28 — Roadmap created for v0.20 (Phases 163-170, 41 requirements)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Prior milestone reference:**

- v0.19: 7 phases, 16 plans, 30 requirements, 7 commits (1 day)
- v0.18: 13 phases, 28 plans, 54 requirements, 129 commits (2 days)
- v0.17: 13 phases, 27 plans, 27 requirements, 224 commits (2 days)
- v0.16: 8 phases, 15 plans, 26 requirements, 48 commits

*Updated after each plan completion*

## Accumulated Context

### Decisions

- All v0.20 services must use free or open-source toolchains — no paid API keys required (constraint from PROJECT.md)
- CLI-Anything: unified capability model is the shared data structure consumed by all downstream generators (tool(), SKILL.md, MCP server)
- Image pipeline: .planning/design/assets/ is the canonical output directory with metadata JSON sidecar per asset
- 3D pipeline: .planning/design/3d/ is the canonical output directory for generated GLB/STEP files with generation metadata
- Visual diff (IMG-05/06) is the engine layer; UTL-04 is the /pde: command surface that calls it — clean separation across phases
- Phase 169 (CAD) depends on Phase 168 (3D) because CadQuery output lives in the same 3D asset directory and builds on the 3D pipeline conventions

### Pending Todos

(None)

### Blockers/Concerns

- TRD-01/TRD-02: TripoSR/SF3D require local GPU inference — document minimum hardware and provide CPU fallback path during planning
- VID-03/VID-04: Remotion requires Node.js 18+ and a bundler; verify compatibility with existing PDE toolchain before planning Phase 167
- CLI-03: GraphQL introspection requires a live endpoint — plan must handle offline/schema-file fallback

## Session Continuity

Last session: 2026-03-28
Stopped at: Roadmap written for v0.20 — 8 phases, 41 requirements mapped
Resume with: `/gsd:plan-phase 163`
Resume file: None
