# v0.16 Requirements — Multi-Editor Context Sync

## SYN — Sync Foundation

- [ ] **SYN-01**: Context sync state file (.planning/.context-sync-state.json) records last IR snapshot, emission timestamp, and source hash — written atomically by emitAll(), excluded from computeSourceHash(), git-ignored
- [ ] **SYN-02**: Loop-break via PDE-GENERATED hash comparison — when editor file change detected, compare embedded hash against current source hash; if match, skip reverse sync (PDE wrote it); if differ, proceed to parse
- [ ] **SYN-03**: IR snapshot stored in state file as 3-way merge base — captures writable IR fields (techStack, constraints, componentCatalog, designTokens) post-emission for conflict detection
- [ ] **SYN-04**: Session-start reconciliation sweep — on SessionStart hook, scan monitored editor files for mtime newer than lastEmittedAt; queue changed files for reverse parse; log to sync-reconciliation.log; complete in <500ms
- [ ] **SYN-05**: `pde context-sync --ingest` CLI command — full scan of all monitored editor files, parse if changed, merge, write-back to .planning/; summary output with file/change/conflict counts; idempotent

## CUR — Cursor Bidirectional Sync

- [ ] **CUR-01**: .mdc reverse parser — extract YAML frontmatter (description, globs, alwaysApply) from .cursor/rules/pde-*.mdc files using regex; skip files without PDE-GENERATED marker; strip inline comments; log parse errors without throwing
- [ ] **CUR-02**: .mdc PDE-owned section extraction — content between `<!-- PDE:BEGIN -->` / `<!-- PDE:END -->` markers is PDE-parseable; content outside is user-authored (preserved, never written back); maps pde-project.mdc Conventions to constraints IR, pde-architecture.mdc Tech Stack to techStack IR
- [ ] **CUR-03**: Live mtime change detection — hook-triggered scan of .mdc files during .planning/ writes; compare mtime against lastEmittedAt + 500ms grace; debounce 200ms; queue in state file pendingIngest; zero stdout; <10ms overhead
- [ ] **CUR-04**: Conflict detection — 3-way merge using lastIR as base: if both PDE and editor changed same field to different values, log conflict to .sync-conflicts.log (NDJSON) with both values; auto-resolve when only one side changed
- [ ] **CUR-05**: Conflict resolution — planning-wins default policy; configurable per-field in config.json contextSync.fieldPolicies; editor-wins overwrites .planning/ value; prompt policy defers resolution and blocks emitAll(); policy read at ingest start
- [ ] **CUR-06**: Enhanced .mdc generation — `<!-- PDE:BEGIN -->` / `<!-- PDE:END -->` section markers in each .mdc body; user content below PDE:END preserved across regeneration; improved globs (**.{css,scss,tsx,jsx,ts} for tokens, **.{tsx,jsx,stories.tsx,test.tsx} for components); inline examples in pde-project.mdc

## AGR — Antigravity Bidirectional Sync

- [ ] **AGR-01**: SKILL.md reverse parser — section-aware extraction from .agent/skills/pde-design/SKILL.md; parse Design Tokens, Component Catalog, Constraints sections to partial IR; capture unknown sections as agentAdditions; skip files without PDE-GENERATED marker; handle marker-before-frontmatter ordering
- [ ] **AGR-02**: DESIGN.md reverse parser — extract hex color values from Color Palette section using pattern `- **Name** (#hex) -- role`; format version detection via `<!-- pde-format-version: 1.0 -->`; capture unknown sections as agentAdditions; lenient fallback for unknown versions
- [ ] **AGR-03**: DESIGN.md write-back — value-only DTCG update in design-manifest.json; update only $value field of color tokens; preserve $type, $description, $extensions, group hierarchy; hex-to-OKLCH reverse conversion with 4-decimal precision; log precision warnings >0.001 delta; recompute hash and emitAll() after write
- [ ] **AGR-04**: Shared token state contract — design-manifest.json is canonical source; DESIGN.md includes `<!-- SOURCE: design-manifest.json | DERIVE-ONLY -->` comment; emitDesignMd() never reads DESIGN.md as input; no code path writes manifest without merge engine
- [ ] **AGR-05**: Agent-written SKILL.md additions preserved — emitAntigravitySkill() parses existing agentAdditions from current SKILL.md, regenerates PDE sections, appends agent block below `<!-- AGENT-ADDITIONS: DO NOT EDIT THIS LINE -->` marker
- [ ] **AGR-06**: Enhanced SKILL.md generation — Workflows section listing pipeline stages with completion status from DESIGN-STATE.md; full Constraints from PROJECT.md; exact DTCG token path; `<!-- pde-skill-version: 1.0 -->` format marker
- [ ] **AGR-07**: Enhanced DESIGN.md generation — `<!-- pde-format-version: 1.0 -->` format version marker for parser version detection; version incremented only on breaking changes

## INF — Infrastructure

- [ ] **INF-01**: MCP server --enable-writes flag — pde-mcp-server accepts flag; absent = read-only (v0.15 behavior); present = 4 additional write tools registered; stderr log on write mode activation
- [ ] **INF-02**: MCP write tool pde_update_constraints — overwrites PROJECT.md Constraints section; validates input (1-4000 chars, no marker injection); calls emitAll() post-write; logs to mcp-writes.ndjson; idempotent
- [ ] **INF-03**: MCP write tool pde_update_tech_stack — overwrites PROJECT.md Tech Stack section; same validation as INF-02; calls emitAll() post-write; logs to mcp-writes.ndjson
- [ ] **INF-04**: MCP write tool pde_append_context_note — appends timestamped note to .planning/context-notes/<category>-notes.md; category enum (design/technical/product/research/decision); prevents path traversal; calls emitAll() post-write
- [ ] **INF-05**: MCP write tool pde_flag_divergence — writes component/reason/severity entry to .planning/divergence-flags.json; component name pattern validation; does NOT call emitAll() (divergence flags not in editor context)
- [ ] **INF-06**: Sync audit trail — .planning/logs/SYNC-LOG.md append-only markdown entries per sync operation (trigger, files scanned, changes, write-backs, conflicts); git-committed; trimmed at 500 entries
- [ ] **INF-07**: Sync rollback — pre-write snapshots in .planning/sync-snapshots/ with file content backup; 30-day auto-cleanup; git-ignored; /pde:sync-rollback restores selected snapshot then calls emitAll()
- [ ] **INF-08**: Conflict UX commands — /pde:sync-status shows last sync time, monitored files, unresolved conflicts, pending ingests; /pde:sync-rollback lists snapshots and restores selected one with confirmation

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SYN-01 | TBD | Pending |
| SYN-02 | TBD | Pending |
| SYN-03 | TBD | Pending |
| SYN-04 | TBD | Pending |
| SYN-05 | TBD | Pending |
| CUR-01 | TBD | Pending |
| CUR-02 | TBD | Pending |
| CUR-03 | TBD | Pending |
| CUR-04 | TBD | Pending |
| CUR-05 | TBD | Pending |
| CUR-06 | TBD | Pending |
| AGR-01 | TBD | Pending |
| AGR-02 | TBD | Pending |
| AGR-03 | TBD | Pending |
| AGR-04 | TBD | Pending |
| AGR-05 | TBD | Pending |
| AGR-06 | TBD | Pending |
| AGR-07 | TBD | Pending |
| INF-01 | TBD | Pending |
| INF-02 | TBD | Pending |
| INF-03 | TBD | Pending |
| INF-04 | TBD | Pending |
| INF-05 | TBD | Pending |
| INF-06 | TBD | Pending |
| INF-07 | TBD | Pending |
| INF-08 | TBD | Pending |

## Coverage

- **Total:** 26
- **Satisfied:** 0
- **Pending:** 26
