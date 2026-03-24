# Roadmap: PDE v0.16 — Multi-Editor Context Sync

## Overview

v0.15 established a unidirectional context generation pipeline: `.planning/` state drives six editor output files via hook-triggered IR build-and-emit. v0.16 closes the loop — detecting when Cursor or Antigravity users modify those derived files, parsing only the fields each editor format can meaningfully own, merging changes back into `.planning/` state via a 3-way merge engine, and re-emitting to normalize all editors. The pipeline runs across seven phases: sync state foundation and loop prevention, then reverse parsers for both editors, then the merge engine and conflict resolution, then live hook wiring for Cursor, then Antigravity write-back, then MCP write tools, then conflict UX and generation enhancements. `.planning/` remains the single source of truth throughout.

## Milestones

- ✅ **v0.15 Multi-Editor Integration** - Phases 119-125 (shipped 2026-03-24)
- 🚧 **v0.16 Multi-Editor Context Sync** - Phases 126-132 (in progress)

## Phases

<details>
<summary>✅ v0.15 Multi-Editor Integration (Phases 119-125) — SHIPPED 2026-03-24</summary>

Phases 119-125 delivered the unidirectional context generation pipeline: context-sync.cjs with 6 emitters, hook-driven auto-sync, standalone MCP server with 10 read-only tools, Cursor .mdc generation, Antigravity SKILL.md + DESIGN.md generation, DTCG-to-Tailwind v4 artifact formatting, and 3-tier divergence detection.

</details>

### 🚧 v0.16 Multi-Editor Context Sync (In Progress)

**Milestone Goal:** Bidirectional sync between `.planning/` and Cursor + Antigravity editor files — changes flow both ways through a 3-way merge engine with conflict detection, resolution policy, and audit trail.

- [x] **Phase 126: Sync Foundation** - State file schema, base IR snapshot, loop-break hash comparison (completed 2026-03-24)
- [x] **Phase 127: Reverse Parsers** - .mdc and SKILL.md/DESIGN.md reverse parsers with section-marker ownership (completed 2026-03-24)
- [x] **Phase 128: Merge Engine and Conflict Resolution** - 3-way merge, conflict detection, configurable resolution policy (completed 2026-03-24)
- [x] **Phase 129: Hook Integration** - Live mtime detection, CLI ingest command, session-start reconciliation (completed 2026-03-24)
- [x] **Phase 130: Antigravity Write-Back** - DESIGN.md value-only write-back, agent additions preservation, token state contract (completed 2026-03-24)
- [x] **Phase 131: MCP Write Tools** - Four validated write tools behind --enable-writes flag (completed 2026-03-24)
- [ ] **Phase 132: Conflict UX and Generation Enhancements** - Audit trail, rollback, conflict commands, enhanced .mdc and SKILL.md output

## Phase Details

### Phase 126: Sync Foundation
**Goal**: The sync infrastructure prerequisite exists — loop prevention is active, the state file tracks IR snapshots, and emitAll() maintains the base for 3-way merges before any watcher is live
**Depends on**: Phase 125 (v0.15 context-sync.cjs)
**Requirements**: SYN-01, SYN-02, SYN-03
**Success Criteria** (what must be TRUE):
  1. `.planning/.context-sync-state.json` is written atomically after every emitAll() call, recording lastEmittedAt timestamp, source hash, and writable IR field snapshot
  2. When a PDE-generated file is detected as changed, the embedded PDE-GENERATED hash is compared against the current source hash — if they match, reverse sync is skipped entirely (no loop)
  3. The state file is excluded from computeSourceHash() so updating it never triggers a new emission cycle
  4. The stored IR snapshot captures techStack, constraints, componentCatalog, and designTokens as the 3-way merge base for subsequent phases
**Plans**: 2 plans

Plans:
- [x] 126-01-PLAN.md — State file infrastructure: writeStateFile(), readStateFile(), emitAll() integration, gitignore (SYN-01, SYN-03)
- [x] 126-02-PLAN.md — Loop-break gate: computeLoopBreak() with PDE_HASH_RE hash comparison (SYN-02)

### Phase 127: Reverse Parsers
**Goal**: PDE can parse editor-authored changes from .mdc files and SKILL.md/DESIGN.md into partial IR objects, with section-marker ownership boundaries enforced and round-trip fidelity verified
**Depends on**: Phase 126
**Requirements**: CUR-01, CUR-02, AGR-01, AGR-02
**Success Criteria** (what must be TRUE):
  1. The .mdc reverse parser extracts YAML frontmatter (description, globs, alwaysApply) and PDE-owned section content from `.cursor/rules/pde-*.mdc` files — files without PDE-GENERATED marker are silently skipped
  2. Content between `<!-- PDE:BEGIN -->` and `<!-- PDE:END -->` markers is parsed as PDE-owned; content outside those markers is preserved verbatim and never written back to .planning/
  3. The SKILL.md reverse parser extracts Design Tokens, Component Catalog, and Constraints sections into a partial IR, preserving unknown sections as agentAdditions
  4. The DESIGN.md reverse parser extracts hex color values from the Color Palette section using the `- **Name** (#hex) -- role` pattern, with format-version detection via `<!-- pde-format-version: 1.0 -->` and lenient fallback
  5. Round-trip Nyquist tests confirm partial IR extraction round-trips without data loss for all fields the parsers are responsible for
**Plans**: 2 plans

Plans:
- [x] 127-01-PLAN.md — .mdc reverse parser: parseMdcContent() with YAML frontmatter extraction, PDE:BEGIN/END section markers, section-to-IR mapping (CUR-01, CUR-02)
- [x] 127-02-PLAN.md — SKILL.md + DESIGN.md reverse parsers: parseSkillMd(), parseDesignMd() with agentAdditions, format-version detection, round-trip tests (AGR-01, AGR-02)

### Phase 128: Merge Engine and Conflict Resolution
**Goal**: A 3-way merge engine correctly merges editor-parsed partial IR against the base IR snapshot and current .planning/ IR, with conflicts detected, logged, and resolved per configurable field policy
**Depends on**: Phase 127
**Requirements**: CUR-04, CUR-05, AGR-04
**Success Criteria** (what must be TRUE):
  1. When only the editor changed a field since the base snapshot, the editor value wins and is written to .planning/ without user intervention
  2. When only PDE changed a field since the base snapshot, the PDE value is preserved and the editor file is re-normalized on next emitAll()
  3. When both PDE and an editor changed the same field to different values, a conflict entry is written to `.planning/.sync-conflicts.log` as NDJSON with both values — emitAll() is not blocked by default (planning-wins policy applies)
  4. The conflict resolution policy is configurable per-field in config.json contextSync.fieldPolicies — planning-wins, editor-wins, and prompt policies are all supported
  5. design-manifest.json is established as the canonical token source; no code path writes to it without passing through the merge engine
**Plans**: 2 plans

Plans:
- [x] 128-01-PLAN.md — Core 3-way merge engine: mergePartialIR(), appendConflictLog(), parseMdcContent Architecture Conventions fix, SOURCE comment (CUR-04, AGR-04)
- [x] 128-02-PLAN.md — Per-field conflict resolution policies: readFieldPolicy(), config.json fieldPolicies, designTokens format reconciliation (CUR-05)

### Phase 129: Hook Integration
**Goal**: Editor file changes are detected automatically during active sessions and ingested on session start, with zero stdout overhead and the full Cursor write-back path verified end-to-end
**Depends on**: Phase 128
**Requirements**: SYN-04, SYN-05, CUR-03
**Success Criteria** (what must be TRUE):
  1. On SessionStart, all monitored editor files with mtime newer than lastEmittedAt are queued for reverse parse, with a summary written to sync-reconciliation.log — the sweep completes in under 500ms
  2. `pde context-sync --ingest` runs a full scan of all monitored editor files, reports file/change/conflict counts, and is idempotent (running it twice with no changes produces no writes)
  3. When a .mdc file is modified during an active session, the change is detected via mtime comparison within 200ms debounce, queued in the state file's pendingIngest list, and produces zero stdout output with under 10ms hook overhead
  4. An end-to-end scenario succeeds: user edits a PDE-owned section in a .mdc file → hook detects the change → .planning/ is updated with the merged value → emitAll() re-normalizes all editor files
**Plans**: 2 plans

Plans:
- [x] 129-01-PLAN.md — Session-start reconciliation + CLI ingest: reconcileOnStart(), ingestAll(), MONITORED_FILES, --ingest routing (SYN-04, SYN-05)
- [ ] 129-02-PLAN.md — Live mtime detection in PostToolUse hook: scanMonitoredFiles(), debounce, pendingIngest queue, E2E verification (CUR-03)

### Phase 130: Antigravity Write-Back
**Goal**: Changes to Antigravity SKILL.md and DESIGN.md are parsed, merged into .planning/ state, and write-back to design-manifest.json uses value-only DTCG updates that preserve all token metadata
**Depends on**: Phase 128
**Requirements**: AGR-03, AGR-05, AGR-07
**Success Criteria** (what must be TRUE):
  1. When an Antigravity agent edits a color in DESIGN.md, the hex value is converted to OKLCH with 4-decimal precision and written to the corresponding `$value` field in design-manifest.json — all other DTCG fields ($type, $description, $extensions, group hierarchy) are preserved unchanged
  2. When emitAntigravitySkill() regenerates SKILL.md, content below the `<!-- AGENT-ADDITIONS: DO NOT EDIT THIS LINE -->` marker is read from the existing file and re-appended verbatim — agent-written additions are never lost
  3. DESIGN.md carries a `<!-- pde-format-version: 1.0 -->` marker that the reverse parser uses to select the correct parsing strategy — unknown format versions fall back to lenient mode rather than throwing
  4. A precision warning is logged when hex-to-OKLCH conversion delta exceeds 0.001, allowing detection of round-trip loss before it silently corrupts token values
**Plans**: 2 plans
**UI hint**: yes

Plans:
- [x] 130-01-PLAN.md — hex-to-OKLCH conversion + DESIGN.md write-back to design-manifest.json + format-version marker (AGR-03, AGR-07)
- [x] 130-02-PLAN.md — Agent additions preservation in SKILL.md regeneration: read-before-write + AGENT-ADDITIONS marker (AGR-05)

### Phase 131: MCP Write Tools
**Goal**: The MCP server exposes four validated write tools behind an --enable-writes flag that route all writes through pde-tools.cjs validation and call emitAll() post-write
**Depends on**: Phase 130
**Requirements**: INF-01, INF-02, INF-03, INF-04, INF-05
**Success Criteria** (what must be TRUE):
  1. Starting pde-mcp-server without --enable-writes flag produces read-only behavior identical to v0.15 — no write tools are registered and a stderr log confirms read-only mode
  2. `pde_update_constraints` overwrites the PROJECT.md Constraints section, validates input (1-4000 chars, no marker injection), calls emitAll() post-write, and logs the operation to mcp-writes.ndjson
  3. `pde_update_tech_stack` overwrites the PROJECT.md Tech Stack section with the same validation and post-write behavior as pde_update_constraints
  4. `pde_append_context_note` appends a timestamped note to the appropriate .planning/context-notes/<category>-notes.md file using the category enum (design/technical/product/research/decision), with path traversal prevention
  5. `pde_flag_divergence` writes a component/reason/severity entry to .planning/divergence-flags.json with component name pattern validation, and does not call emitAll() (divergence flags are not part of editor context)
**Plans**: 2 plans

Plans:
- [x] 131-01-PLAN.md — Flag gate + section-overwrite handlers: --enable-writes in index.ts, handleUpdateConstraints, handleUpdateTechStack, NDJSON audit log (INF-01, INF-02, INF-03)
- [x] 131-02-PLAN.md — Context note + divergence flag tools: handleAppendContextNote, handleFlagDivergence, full 4-tool registration (INF-04, INF-05)

### Phase 132: Conflict UX and Generation Enhancements
**Goal**: Sync operations are auditable and reversible, conflicts are presented semantically, and .mdc and SKILL.md generation produces richer output that gives Cursor and Antigravity better context
**Depends on**: Phase 131
**Requirements**: INF-06, INF-07, INF-08, CUR-06, AGR-06
**Success Criteria** (what must be TRUE):
  1. Every sync operation appends a structured entry to .planning/logs/SYNC-LOG.md recording trigger, files scanned, changes applied, write-backs, and conflicts — the log is git-committed and trimmed to 500 entries
  2. Before each write-back batch, file contents are snapshotted to .planning/sync-snapshots/ — `/pde:sync-rollback` lists available snapshots and restores a selected one with confirmation, then calls emitAll()
  3. `/pde:sync-status` displays last sync time, list of monitored files, count of unresolved conflicts, and any pending ingest items — all from the state file, no file scanning required
  4. Each regenerated .mdc file contains `<!-- PDE:BEGIN -->` / `<!-- PDE:END -->` section markers, user content below PDE:END is preserved across regeneration, and globs use the improved patterns (**.{css,scss,tsx,jsx,ts} for tokens)
  5. The regenerated SKILL.md includes a Workflows section listing pipeline stages with completion status from DESIGN-STATE.md, full Constraints from PROJECT.md, and exact DTCG token paths
**Plans**: TBD

## Progress

**Execution Order:** 126 → 127 → 128 → 129 → 130 → 131 → 132

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 126. Sync Foundation | 2/2 | Complete   | 2026-03-24 |
| 127. Reverse Parsers | 2/2 | Complete    | 2026-03-24 |
| 128. Merge Engine and Conflict Resolution | 2/2 | Complete    | 2026-03-24 |
| 129. Hook Integration | 1/2 | Complete    | 2026-03-24 |
| 130. Antigravity Write-Back | 2/2 | Complete    | 2026-03-24 |
| 131. MCP Write Tools | 2/2 | Complete   | 2026-03-24 |
| 132. Conflict UX and Generation Enhancements | 0/TBD | Not started | - |
