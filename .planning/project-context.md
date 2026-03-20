---
generated: 2026-03-20
source: PROJECT.md
max_size: 4KB
---

# PDE — Project Context

> Compact project baseline for subagent context injection. Auto-generated from PROJECT.md.

## Current Milestone

**v0.6 — Advanced Workflow Methodology**

Goal: Import BMAD and PAUL methodology patterns into PDE's existing workflow engine to strengthen business analysis, architecture planning, and agent role specialization.

Status: In progress (Phase 53 — milestone polish)

## Tech Stack

- **Runtime:** Node.js (CommonJS) — zero npm deps at plugin root
- **Interface:** Claude Code plugin API (skills as slash commands)
- **State model:** File-based `.planning/` directory — markdown + CSV + JSON
- **Architecture:** skills → workflows → agents → templates → references → bin scripts → config
- **Design pipeline:** 13 skills (recommend, competitive, opportunity, ideate, brief, system, flows, wireframe, critique, iterate, mockup, hig, handoff)
- **MCP layer:** mcp-bridge.cjs central adapter, TOOL_MAP (36 entries), APPROVED_SERVERS (5 services)
- **Testing:** Node.js test runner (`node --test`), bash grep validation

## Active Requirements

v0.6 requirements (24 total, all mapped):

- FOUND-01: project-context.md compact baseline, ≤4KB, required sections
- FOUND-02: project-context.md injected into all subagent spawn blocks
- FOUND-03: workflow-methodology.md published with required sections
- INFR-01/02/03: files-manifest.csv format, init, and sync behaviors
- TRCK-01/02/03: workflow-status.md init, update, and read behaviors
- AGNT-01/02/03/04/05: assumptions gate, analyst agent, memory injection

## Key Constraints

- Must work as a Claude Code plugin (no standalone distribution)
- Zero npm deps at plugin root
- File-based state — no database, no server
- MCP security: verified-sources-only policy
