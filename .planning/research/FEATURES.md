# Feature Research

**Domain:** Bidirectional multi-editor context sync (PDE v0.16)
**Researched:** 2026-03-24
**Confidence:** HIGH (v0.15 infrastructure well-documented; editor formats verified via official sources)

---

## Context: What Already Exists in v0.15

These features are NOT in scope — they are the foundation this milestone builds on:

- One-way PDE → Cursor: `.cursor/rules/*.mdc` generation with YAML frontmatter (pde-project, pde-design-tokens, pde-components, pde-architecture, pde-pipeline)
- One-way PDE → Antigravity: `SKILL.md` + `DESIGN.md` generation
- One-way PDE → Gemini: `GEMINI.md` hierarchical files with `@file` imports
- Hook-driven auto-regeneration on `.planning/` changes (`CTX-06`)
- 3-tier divergence detection (structural/content/behavioral) on code vs handoff specs (`DIV-01` through `DIV-06`)
- Standalone MCP server with 10 read-only tools (`MCP-01` through `MCP-05`)
- Hash-based staleness markers on generated context files (`CTX-08`)

The v0.16 milestone adds the **reverse path**: editor changes flowing back into PDE state.

---

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Cursor → PDE reverse sync: .mdc rule changes propagate to .planning/ | If users can edit .mdc files (they can and do), edits must round-trip or they silently diverge | HIGH | Requires .mdc YAML frontmatter parsing + semantic diffing against .planning/ source of truth; the existing 3-tier divergence detector covers code divergence but not context file divergence |
| Conflict detection on reverse sync | Bidirectional sync without conflict detection causes silent data loss — the most common failure mode in sync tools | MEDIUM | PDE is already the authoritative source for design state; conflict = editor edited something PDE auto-generates → must surface, not silently overwrite |
| Manual conflict resolution prompt | Auto-resolution without user input loses intent; "editor wins" vs "PDE wins" vs "show diff" must be user-controlled | LOW | Can be a simple CLI prompt + CONFLICT.md diff output; defer to PDE as default since .planning/ is source of truth |
| Antigravity → PDE reverse sync: SKILL.md edits propagate back | Antigravity users modify SKILL.md to tune agent behavior; those edits should not be clobbered on next PDE sync | MEDIUM | Requires section-level parsing (YAML frontmatter + fenced instruction blocks); only user-modified sections should propagate; PDE-generated sections should be protected |
| Live file watching (Cursor .mdc changes trigger sync) | Without a watcher, users must manually invoke sync after every editor edit; defeats the purpose of integration | HIGH | Node.js `fs.watch` / chokidar pattern well-established; must debounce (200-500ms) to avoid thrashing on editor saves; hooks architecture (already used for PDE→editor) is the natural extension point |
| Single source of truth for design tokens (shared token state) | DTCG tokens already live in `.planning/design/tokens.json`; Antigravity DESIGN.md is a derived view; if Antigravity can write tokens back, there must be one authoritative file | HIGH | Shared state problem: resolve by making `.planning/design/tokens.json` the master; DESIGN.md is always read-only derivative; write-backs from Antigravity must parse and merge into tokens.json, not replace it |
| Sync status visibility | Users need to know when sync is in-progress, when conflicts exist, and when state is clean | LOW | Can extend existing DIVERGENCE.md pattern + dashboard pane; a SYNC-STATUS.md or dashboard row covers this |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Section-aware merge (preserve user edits in PDE-generated files) | Most sync tools are whole-file: overwrite or skip. Section-aware merge lets users annotate regions as "user-owned" that survive PDE regeneration | MEDIUM | Pattern: HTML comment fencing in .mdc and SKILL.md files; PDE regeneration preserves fenced blocks; similar to @generated markers used in GraphQL codegen and Prisma client |
| Agent coordination via MCP (PDE and Antigravity delegate work) | Antigravity agents can query PDE state via MCP to make context-aware decisions without duplicating state; PDE agents can trigger Antigravity skill execution | HIGH | Builds directly on existing read-only MCP server; requires adding write/notification tools (e.g., notify-state-change, request-skill-execution); MCP A2A patterns emerging in 2026 as standard |
| Richer .mdc generation (deeper context, better globs, more rules) | Current .mdc files are functional but thin; richer rules with per-file-type glob targeting, inline examples, and cross-file relationship annotations make Cursor AI responses measurably better | MEDIUM | Cursor docs confirm .mdc with well-scoped globs reduces context token usage by activating only relevant rules; this is enhancement to existing CTX-02, not a new capability class |
| Richer SKILL.md + DESIGN.md generation (enhanced Antigravity output) | Current Antigravity outputs cover design DNA basics; richer output includes component relationship graphs, constraint annotations, and Antigravity-native workflow hooks | MEDIUM | Antigravity Skills support workflows: declarations in SKILL.md YAML frontmatter; PDE can auto-generate workflow stubs from .planning/ pipeline state |
| Conflict audit trail (SYNC-LOG.md) | When conflicts are auto-resolved, a timestamped log of what changed and why gives users traceability and the ability to undo | LOW | Append-only log in `.planning/logs/` using existing NDJSON event bus infrastructure; near-zero implementation cost given v0.8 event system |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time continuous sync daemon | "I want changes to appear instantly everywhere" | A persistent background process contradicts Claude Code's session-based model; a daemon can't be reliably started/stopped within a session, creates orphan processes, and conflicts with worktree isolation | Use hook-driven sync (already the pattern): changes trigger on file events within the session, not via a separate daemon |
| Auto-merge all conflicts without user consent | "I want zero interruptions" | Silent auto-merge on semantic conflicts (e.g., user renamed a token in Antigravity, PDE regenerated with old name) produces corrupted state that's hard to diagnose | Default to PDE-wins with a prompt on divergence; log all auto-resolutions to SYNC-LOG.md so they're auditable |
| Bidirectional sync for all editor files (GEMINI.md, AGENTS.md, .cursorrules) | "Sync everything in both directions" | GEMINI.md and AGENTS.md are pure PDE-generated outputs with no user-editable sections; adding reverse sync creates a second write path into .planning/ that bypasses validation | Limit reverse sync to files that users meaningfully edit: .mdc rules (Cursor workflow customization) and SKILL.md (Antigravity agent tuning); GEMINI.md and AGENTS.md remain write-once from PDE |
| Automatic Antigravity agent invocation on PDE state changes | "When PDE updates tokens, Antigravity should automatically re-run" | Antigravity invocation requires an active Antigravity session; triggering it from a PDE hook creates cross-process coupling with no error recovery path | Expose state-change notifications via MCP so Antigravity agents can poll or subscribe; let Antigravity initiate, not PDE |
| Write tools added to pde-mcp-server | "Antigravity should be able to update .planning/ via MCP" | Creates a second write path bypassing pde-tools.cjs validation and locking (already documented as out-of-scope in PROJECT.md); MCP write tools in the existing server would create race conditions with active Claude sessions | Use the existing file-based sync path: Antigravity writes to its own files (SKILL.md, DESIGN.md), PDE watches and ingests; the MCP server stays read-only |
| Field-level CRDT merge for design tokens | "Merge token changes at the property level without conflicts" | CRDT implementations (Yjs, Automerge) add significant complexity and npm dependencies, violating the zero-dependency constraint for pde-tools.cjs | Use append-log + timestamp merge: tokens.json has a _lastModified per token group; last-writer-wins per group is sufficient for the solo/small-team use case |

---

## Feature Dependencies

```
[Cursor Live File Watching]
    └──enables──> [Cursor → PDE Reverse Sync]
                      └──requires──> [Section-Aware Merge]
                      └──requires──> [Conflict Detection]
                                         └──enables──> [Manual Conflict Resolution Prompt]
                                         └──enables──> [Conflict Audit Trail / SYNC-LOG.md]

[Antigravity → PDE Reverse Sync]
    └──requires──> [Section-Aware Merge]
    └──requires──> [Shared Token State (tokens.json as master)]

[Agent Coordination via MCP]
    └──requires──> [Existing MCP Server (v0.15 read-only tools)]
    └──enhances──> [Antigravity → PDE Reverse Sync]

[Richer .mdc Generation]
    └──builds-on──> [Existing CTX-02 (v0.15 .mdc generation)]

[Richer SKILL.md + DESIGN.md Generation]
    └──builds-on──> [Existing CTX-05 / STH-01 (v0.15 Antigravity output)]

[Sync Status Visibility]
    └──builds-on──> [Existing Event Bus (v0.8 NDJSON infrastructure)]
    └──builds-on──> [Existing 7-pane Dashboard (v0.10)]
```

### Dependency Notes

- **Cursor live file watching requires session context**: The watcher must run within an active Claude Code session (hook-triggered); it cannot be a daemon. The PostToolUse hook pattern used in v0.15 for auto-regeneration is the correct foundation.
- **Section-aware merge is a prerequisite for both reverse sync paths**: Without it, every PDE regeneration destroys user edits in .mdc and SKILL.md, making reverse sync useless. This must be built before the reverse sync features.
- **Conflict detection must exist before conflict resolution**: Detection produces a CONFLICT.md diff; resolution consumes it. They ship together as one phase.
- **Shared token state is a prerequisite for Antigravity → PDE token sync**: If the source-of-truth question is unresolved, any token write-back risks creating a forked state. Establish tokens.json as master first.
- **Agent coordination via MCP is additive**: It enhances the Antigravity sync path but is not required for it. Can be deferred to a sub-phase.

---

## MVP Definition

### Launch With (v1 of this milestone)

- [ ] Section-aware merge (user-owned fencing in .mdc and SKILL.md) — prerequisite for everything; without it, reverse sync destroys user edits
- [ ] Cursor → PDE reverse sync (.mdc rule changes propagate to .planning/) — the primary new capability
- [ ] Conflict detection (divergence between editor edits and PDE state) — prevents silent data loss
- [ ] Manual conflict resolution prompt (user choice: PDE wins / editor wins / show diff) — required for safe reverse sync
- [ ] Live file watching for .mdc changes (hook-triggered, debounced) — makes reverse sync automatic rather than manual-only
- [ ] Antigravity → PDE reverse sync (SKILL.md section edits propagate back) — second primary capability; symmetric with Cursor path
- [ ] Shared design token state (tokens.json as master, DESIGN.md as derivative) — required for AG token sync correctness

### Add After Validation (v1.x)

- [ ] Conflict audit trail (SYNC-LOG.md) — trigger: first time a user loses track of an auto-resolved conflict
- [ ] Richer .mdc generation (deeper globs, inline examples) — trigger: user feedback that Cursor rules are not activating correctly
- [ ] Richer SKILL.md + DESIGN.md generation (workflow stubs, constraint annotations) — trigger: Antigravity agents producing generic outputs despite PDE context

### Future Consideration (v2+)

- [ ] Agent coordination via MCP (PDE and Antigravity A2A delegation) — defer: MCP A2A standards still maturing in 2026; implement once Antigravity's MCP interface stabilizes
- [ ] Sync status dashboard pane — defer: SYNC-LOG.md in the filesystem is sufficient for solo/small-team use; a pane adds polish but not capability

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Section-aware merge | HIGH | MEDIUM | P1 |
| Cursor → PDE reverse sync | HIGH | HIGH | P1 |
| Conflict detection | HIGH | MEDIUM | P1 |
| Manual conflict resolution | HIGH | LOW | P1 |
| Live file watching (.mdc) | HIGH | HIGH | P1 |
| Antigravity → PDE reverse sync | HIGH | MEDIUM | P1 |
| Shared token state (tokens.json master) | HIGH | MEDIUM | P1 |
| Conflict audit trail (SYNC-LOG.md) | MEDIUM | LOW | P2 |
| Richer .mdc generation | MEDIUM | MEDIUM | P2 |
| Richer SKILL.md + DESIGN.md generation | MEDIUM | MEDIUM | P2 |
| Agent coordination via MCP | MEDIUM | HIGH | P3 |
| Sync status dashboard pane | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for launch (bidirectional sync is broken without these)
- P2: Should have, add when possible (quality improvements)
- P3: Nice to have, future consideration (ecosystem evolution)

---

## Workflow Analysis: User Workflows to Support

### Workflow 1: Cursor user customizes .mdc rules

A developer opens `.cursor/rules/pde-design-tokens.mdc` and modifies the glob pattern to exclude test files. On save, the live watcher detects the change, parses the diff, identifies the glob modification as user-authored, and propagates it back to `.planning/config/` as an override. Next PDE regeneration respects the override.

Key requirements: live file watching, section-aware merge (to protect the user's glob change from being overwritten), conflict detection if PDE also updated the same section.

### Workflow 2: Antigravity agent tunes SKILL.md workflow instructions

During an Antigravity session, the agent appends a new skill instruction block to `.agent/skills/pde-design/SKILL.md`. When the user runs `/pde:editor-sync` (or on next hook trigger), PDE detects the new block, determines it is in the user-fenced section, and copies it into the PDE memory system.

Key requirements: section-aware merge, Antigravity → PDE reverse sync path, SKILL.md section parser.

### Workflow 3: Design tokens updated in PDE, Antigravity sees latest

User runs `/pde:system` and generates new DTCG tokens. The hook triggers regeneration of `DESIGN.md`. Antigravity (active in parallel session) picks up the updated `DESIGN.md` via its file-watching or next-read. No user intervention needed.

Key requirements: existing `STH-01` (DESIGN.md generation) already handles this; the v0.16 addition is ensuring `tokens.json` is the single master and `DESIGN.md` is never modified directly.

### Workflow 4: Conflict — user edited .mdc, PDE regenerated same section

User manually edits `pde-components.mdc` to add a component alias. Separately, `/pde:build` runs and regenerates the same .mdc. On next sync, conflict detector finds the same section modified in both sources. PDE surfaces a `CONFLICT.md` diff and prompts the user to choose: keep PDE version, keep editor version, or view diff. User picks "keep editor version." Change is logged to SYNC-LOG.md.

Key requirements: conflict detection, manual resolution prompt, conflict audit trail.

---

## Competitor Feature Analysis

| Feature | Mutagen / rsync-style tools | Git-based sync (Syncthing) | PDE v0.16 approach |
|---------|---------------------------|---------------------------|-------------------|
| Conflict detection | Two-way-safe mode flags conflicts | Creates .sync-conflict- files | CONFLICT.md with section-level diff |
| Conflict resolution | CLI prompt or auto-discard | Manual file inspection | CLI prompt with PDE-wins default |
| File watching | inotify/kqueue/FSEvents native | Background daemon | Claude Code hook-triggered (session-scoped) |
| Merge granularity | Whole file | Whole file | Section-aware (fenced blocks) |
| Source of truth | Equal precedence | Equal precedence | PDE (.planning/) is authoritative master |
| Dependencies | External binary | External daemon | Zero external dependencies (Node.js built-ins) |

The PDE approach diverges from generic sync tools by being opinionated about authority: `.planning/` is always master, editor files are derived views. This avoids the hardest class of bidirectional sync problem (equal-precedence conflict resolution) by design.

---

## V0.15 Infrastructure Dependencies

| v0.15 Component | v0.16 Dependency |
|----------------|-----------------|
| CTX-06 hook-driven auto-regeneration | Live file watching must plug into the same hook architecture (extending PostToolUse hooks for file watch events) |
| CTX-08 hash-based staleness markers | Conflict detection reads these hashes to determine if a file was PDE-generated or user-modified since last generation |
| DIV-01/02/03 divergence detection | Conflict detection for reverse sync is a new divergence type; the same DIVERGENCE.md output pattern should be extended |
| MCP-01/02 read-only MCP server | Agent coordination builds on this; write/notification tools would be additive to the existing server structure |
| STH-01/03 Stitch bridge artifact flow | Shared token state (tokens.json as master) is the formalization of the directional artifact flow already described in STH-03 |
| v0.8 NDJSON event bus | SYNC-LOG.md / conflict audit trail should use the existing event infrastructure for consistency |

---

## Sources

- [Rules | Cursor Docs](https://cursor.com/docs/rules) — HIGH confidence; official Cursor documentation on .mdc format, YAML frontmatter, globs
- [Authoring Google Antigravity Skills | Google Codelabs](https://codelabs.developers.google.com/getting-started-with-antigravity-skills) — MEDIUM confidence; official Antigravity SKILL.md format documentation
- [MCP vs A2A: The Complete Guide to AI Agent Protocols in 2026](https://dev.to/pockit_tools/mcp-vs-a2a-the-complete-guide-to-ai-agent-protocols-in-2026-30li) — LOW confidence (community article); MCP A2A patterns still maturing
- [Conflict resolution strategies in Data Synchronization](https://mobterest.medium.com/conflict-resolution-strategies-in-data-synchronization-2a10be5b82bc) — MEDIUM confidence; standard sync patterns (last-write-wins, three-way merge, field-level merge)
- [Context Management Strategies for Google Antigravity](https://datalakehousehub.com/blog/2026-03-context-management-google-antigravity/) — LOW confidence; community article, unverified
- v0.15 REQUIREMENTS.md (local, `.planning/milestones/v0.15-REQUIREMENTS.md`) — HIGH confidence; shipped requirements define the exact foundation this milestone extends
- PDE PROJECT.md (local, `.planning/PROJECT.md`) — HIGH confidence; v0.16 target features explicitly listed

---
*Feature research for: PDE v0.16 Bidirectional Multi-Editor Context Sync*
*Researched: 2026-03-24*
