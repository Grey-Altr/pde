# Project Research Summary

**Project:** PDE v0.16 — Bidirectional Multi-Editor Context Sync
**Domain:** File-watching reverse-sync pipeline with conflict resolution and write-back coordination
**Researched:** 2026-03-24
**Confidence:** HIGH (stack and architecture verified against live code), MEDIUM (Antigravity write-back, DESIGN.md format), LOW (DTCG round-trip precision, MCP A2A coordination)

## Executive Summary

PDE v0.15 established a solid unidirectional context generation pipeline: `.planning/` state drives six editor output files (`.cursor/rules/*.mdc`, `AGENTS.md`, `GEMINI.md`, `SKILL.md`, `DESIGN.md`) via a hook-triggered IR build-and-emit cycle. v0.16 adds the reverse direction — detecting when Cursor or Antigravity users modify those derived files, parsing only the fields each editor format can meaningfully own, merging those changes back into `.planning/` state via a 3-way merge engine, and re-emitting to normalize all editors. The core architectural insight is that `.planning/` remains the single source of truth at all times; editor files are derived views, never canonical inputs. This design eliminates the hardest class of bidirectional sync problem (equal-precedence conflict resolution) by making authority explicit rather than symmetric.

The implementation strategy is conservative and well-precedented: hash-anchored 3-way merge (base IR snapshot vs. current `.planning/` IR vs. editor-parsed partial IR), section-aware merge using the existing `PDE-GENERATED` comment markers as ownership boundaries, and mtime-based inbound change detection on hook fire rather than a persistent watcher daemon. The recommended approach avoids adding a separate background daemon (which conflicts with Claude Code's session-based model) by using poll-on-hook mtime scanning as the primary detection path and an explicit `pde context-sync --ingest` command as the user-controlled fallback. Session-start reconciliation catches all out-of-session editor changes, making correctness independent of whether the watcher is running.

The highest-confidence risks are all well-documented across integration platform post-mortems: infinite sync loops (prevented by write-origin markers and hash comparison in the existing `PDE-GENERATED` comment), MCP write-back bypassing pde-tools.cjs validation (prevented by keeping the MCP server read-only and routing all write-back through hook-based file watching), and state conflicts from concurrent token edits (resolved by field-level ownership assignment and last-write-wins per field with user escalation on genuine conflicts). The lower-confidence risks — DTCG round-trip precision loss and Antigravity DESIGN.md format instability — are mitigated by value-only write-back (preserving DTCG metadata) and defensive versioned parsing respectively. Both require explicit Nyquist test coverage before shipping.

## Key Findings

### Recommended Stack

The v0.16 stack adds exactly one new npm dependency: **chokidar v4** (`^4.0.3`), isolated in a new `packages/reverse-sync/` subpackage. All other new components use Node.js built-ins already present in the codebase (`fs`, `crypto`), following the zero-npm-dep constraint at plugin root and the isolation pattern established by `packages/pde-mcp-server/`. The existing `@modelcontextprotocol/sdk@^1.27.1` and the full `context-sync.cjs` infrastructure are reused without changes to their core logic.

Chokidar v4 is mandatory over `fs.watch` (confirmed unreliable on macOS: wrong event types, unreliable filenames, Node.js issue #47058) and over chokidar v5 (ESM-only, breaks `require()` from `.cjs` daemon files). The `.mdc` frontmatter parser uses regex over `gray-matter` or `js-yaml` — the format is a constrained 4-field subset with no nesting, and a regex parser is 20 lines with zero dependencies.

**Core technologies:**
- **chokidar v4.0.3**: FSEvents-backed file watching for `.cursor/rules/` and `.agent/skills/pde-design/` — only reliable macOS event source; isolated in `packages/reverse-sync/` (never plugin root)
- **Node.js `fs` + `crypto` (built-in)**: Read/write `.mdc` frontmatter and `.planning/` artifacts; SHA-256 hash for sync-loop prevention using the same `computeSourceHash()` pattern already in `context-sync.cjs`
- **`@modelcontextprotocol/sdk` ^1.27.1 (existing)**: Write tools added to `packages/pde-mcp-server/` behind `--enable-writes` flag; `readOnlyHint: false`, `idempotentHint: true` annotations supported in 1.27.x
- **`context-sync.cjs` (existing, minimally modified)**: Add `buildBaseIRSnapshot()` post-emit and `parseIRFromEditorFiles()` entry point; `buildContextIR()` and all 6 emitters are unchanged

### Expected Features

**Must have (P1 — bidirectional sync is broken without these):**
- Section-aware merge using `<!-- PDE-GENERATED -->` markers as ownership boundaries — prerequisite for all reverse sync; without it, every PDE regeneration destroys user edits
- Cursor to PDE reverse sync: `.mdc` rule changes propagate to `.planning/` — primary new capability
- Conflict detection: divergence between editor edits and PDE state surfaced before write-back
- Manual conflict resolution prompt: user choice (PDE wins / editor wins / show diff); PDE wins as default
- Live file watching for `.mdc` changes: hook-triggered mtime scan + debounced detection (not daemon)
- Antigravity to PDE reverse sync: SKILL.md section edits propagate back — symmetric with Cursor path
- Shared design token state: `tokens.json` as master, `DESIGN.md` as derivative view only

**Should have (P2 — quality and traceability):**
- Conflict audit trail (SYNC-LOG.md) — append-only log of auto-resolved conflicts
- Richer `.mdc` generation: deeper glob targeting, inline examples for better Cursor AI activation
- Richer SKILL.md + DESIGN.md generation: workflow stubs, constraint annotations for Antigravity

**Defer (P3 / v2+):**
- Agent coordination via MCP (PDE and Antigravity A2A delegation) — MCP A2A standards still maturing as of March 2026
- Sync status dashboard pane — SYNC-LOG.md in the filesystem is sufficient for solo/small-team use

**Anti-features to reject outright:**
- Real-time continuous sync daemon: contradicts Claude Code's session-based model, creates orphan processes
- Auto-merge all conflicts without user consent: silent merge on semantic conflicts produces corrupted state
- Bidirectional sync for GEMINI.md and AGENTS.md: pure PDE outputs with no user-editable sections
- MCP write tools writing directly to `.planning/`: bypasses pde-tools.cjs validation — explicitly out of scope in PROJECT.md

### Architecture Approach

The architecture extends the existing IR pipeline with three new layers without modifying its core. Outbound flow is unchanged: hook fires → `buildContextIR()` → `emitAll()` → 6 editor files. The new inbound flow runs when an editor file's mtime is newer than the `lastEmittedAt` timestamp in `.planning/.context-sync-state.json`: reverse parsers extract a partial IR from the editor file, the IR merger runs a 3-way merge against the base IR snapshot and fresh `.planning/`-sourced IR, the conflict resolver either applies the delta or escalates to the user, then `emitAll()` re-normalizes all editor files. The state file is the coordination primitive and is explicitly excluded from the source hash computation to prevent circular invalidation.

**Major components:**
1. `bin/lib/reverse-parsers/cursor-mdc-parser.cjs` — parses `.cursor/rules/*.mdc` YAML frontmatter and PDE-owned sections into a partial IR; ignores user-authored sections below `PDE-GENERATED` markers
2. `bin/lib/reverse-parsers/antigravity-skill-parser.cjs` — parses SKILL.md and DESIGN.md back into partial IR at section-level granularity only (`## Colors`, `## Typography`, `## Spacing`)
3. `bin/lib/ir-merger.cjs` — hash-anchored 3-way merge: `base_IR` (last emit snapshot) vs. `current_IR` (fresh from `.planning/`) vs. `editor_IR` (reverse-parsed partial); field-level ownership determines merge policy
4. `bin/lib/conflict-resolver.cjs` — conflict detection when both sides changed since base; user escalation or `planning-wins` default policy; logs to `.planning/.sync-conflicts.log`, never to stdout
5. `packages/pde-mcp-server/src/tools/` (4 new write tools) — `update-constraints`, `update-tech-stack`, `append-context-note`, `flag-divergence`; all behind `--enable-writes` flag; each write triggers `emitAll()` post-write

**Key patterns:**
- Field ownership assignment: each emitter declares which IR fields it owns for write-back; reverse parsers only contribute owned fields; everything else flows one-way from `.planning/`
- PDE-GENERATED marker as sync anchor: existing comment format already in all 6 output files; reverse parsers use it as the section boundary between parseable and user-preserved content
- `emitAll()` always follows write-back: ensures all editor files normalize to merged `.planning/` state; overhead is approximately 10ms of pure Node.js file I/O

### Critical Pitfalls

1. **Infinite sync loop** — Editor change triggers PDE regeneration which triggers another editor change, causing CPU-pegged sessions and disk-filling commits. Prevention: write-origin marker in every PDE-generated file (`PDE-GENERATED` comment already present) plus SHA-256 hash comparison before triggering reverse sync. Both defenses must be active simultaneously — hash comparison alone has a race condition window during in-flight writes.

2. **MCP write-back bypassing pde-tools.cjs validation** — Adding write tools that patch `.planning/` files directly would resurrect the flag-clobber bugs from v0.11/v0.12/v0.14. Prevention: MCP server stays read-only for external callers; all write-back routes through hook-based file watching, never through MCP tool calls. The `--enable-writes` flag exposes write tools that route through the same `pde-tools.cjs` validation gates as all other PDE writes.

3. **DTCG to CSS to DTCG round-trip precision loss** — Tailwind v4 CSS custom properties cannot represent DTCG `$description`, `$extensions`, `$type`, or group hierarchy. On write-back these fields are silently lost. Prevention: value-only write-back (update `$value` only; preserve all other DTCG metadata unchanged); explicit CSS variable name to DTCG token path mapping table; round-trip Nyquist test as a hard gate.

4. **Session boundary gap** — File watchers exist only for the duration of the active Claude Code session. Editor changes made with Claude Code closed are invisible to the sync engine. Prevention: session-start reconciliation sweep comparing all monitored editor file hashes against `sync-state.json`; explicit `/pde:editor-sync` command works as a complete reconciliation regardless of session state.

5. **Antigravity DESIGN.md format instability** — The DESIGN.md format is community-documented without an official stability guarantee. Antigravity version updates may change section structure, causing silent parse failures and wrong token write-backs. Prevention: versioned defensive parsing with `<!-- pde-format-version: 1.0 -->` marker; section-level granularity only; unknown sections preserved verbatim; format-version detection assertion in Nyquist test suite.

6. **.mdc frontmatter round-trip loss** — Cursor may normalize frontmatter fields; inline comments on `globs:` lines cause confirmed YAML parse failures (Cursor forum documented). Prevention: error-tolerant frontmatter parsing with regex fallback; `<!-- PDE:BEGIN -->` / `<!-- PDE:END -->` section markers for surgical regeneration; never overwrite an entire `.mdc` file; round-trip test simulating common user edits as a Nyquist gate.

## Implications for Roadmap

Based on combined research, the build order is strictly dependency-driven. The 3-way merge engine cannot function without the base IR snapshot. Reverse parsers cannot be safely integrated without section-marker ownership semantics established. Conflict resolution cannot function without detection. Hook integration cannot function without the merge engine. MCP write tools must come last because they call `emitAll()`, which depends on the state file being maintained correctly.

### Phase A: Sync Foundation
**Rationale:** Everything downstream depends on the base IR snapshot and the state file schema. This phase has no dependencies on other new components and can be built and tested in isolation. The loop-prevention guarantee must be in place before any watcher is wired — adding it after means testing in a live-fire environment where loops can fill disk or exhaust API quotas within seconds.
**Delivers:** `.planning/.context-sync-state.json` schema and writer in `context-sync.cjs`; `buildBaseIRSnapshot()` called at end of every `emitAll()`; state file excluded from source hash computation; SHA-256 hash comparison as the primary loop-break mechanism
**Addresses:** Infinite sync loop (Pitfall 1) — must be in place before any watcher is live
**Avoids:** The highest-cost failure mode in the research: CPU-pegged sessions and disk-filling commits

### Phase B: Reverse Parsers
**Rationale:** Parser fidelity must be proven independently before the merge engine relies on parser output. Round-trip tests in this phase are the gate for Phase C. The value-only write-back strategy and CSS variable name mapping table must be defined here — retrofitting precision preservation after users lose DTCG metadata is rated HIGH recovery cost.
**Delivers:** `cursor-mdc-parser.cjs` (`.mdc` frontmatter plus PDE-owned sections to partial IR); `antigravity-skill-parser.cjs` (SKILL.md and DESIGN.md sections to partial IR); CSS variable name to DTCG token path mapping table; `<!-- PDE:BEGIN -->` / `<!-- PDE:END -->` section marker implementation; round-trip Nyquist tests
**Addresses:** .mdc frontmatter round-trip loss (Pitfall 5); DTCG precision loss (Pitfall 7); Antigravity format instability (Pitfall 6)
**Avoids:** Producing corrupted partial IRs that the merge engine then writes to `.planning/`

### Phase C: Merge Engine and Conflict Resolution
**Rationale:** The 3-way merge logic is the correctness core of bidirectional sync. It must be verified against all merge cases (no-conflict, planning-wins, editor-wins, genuine conflict) before hook integration puts it on the hot path triggered by every `.planning/` write.
**Delivers:** `ir-merger.cjs` (field-level 3-way merge with field ownership table); `conflict-resolver.cjs` (conflict detection, `planning-wins` default, user escalation, `.sync-conflicts.log`); `.planning/config.json` `contextSync` block (conflict policy, write-back targets)
**Addresses:** State conflicts and last-write-wins silent data loss (Pitfall 3)
**Avoids:** Automatic conflict resolution without user awareness; raw JSON diff presentation (show semantic token diffs, not JSON)

### Phase D: Hook Integration — Cursor Write-Back Path
**Rationale:** With parsers and merge engine proven in isolation, hook integration is the wiring layer that makes the system automatic. Cursor path comes first because its format is more stable and better documented than Antigravity's, reducing risk for the first end-to-end test.
**Delivers:** Inbound change detection in `context-sync-hook.cjs` (mtime scan against `lastEmittedAt`); `--ingest` flag on `cmdContextSync` CLI; session-start reconciliation sweep; hooks.json extended with `.cursor/rules/` matchers; end-to-end verification: edit `.mdc` → hook fires → `.planning/` updated → `emitAll()` normalizes
**Addresses:** Section-aware merge (P1 feature); Cursor to PDE reverse sync (P1 feature); live file watching (P1 feature); session boundary gap (Pitfall 4)
**Avoids:** Hanging hooks — no `fs.watch()` inside the hook process (mtime comparison only); stdout pollution — conflicts log to file, never stdout (hook zero-stdout contract)

### Phase E: Antigravity Write-Back Path
**Rationale:** Antigravity reuses the merge engine and parsers proven in Phases C and D. The new surface is DESIGN.md format detection and the `.ag-inbound-delta.json` file-based queue for changes detected by the MCP server's long-running `fs.watch` on `.agent/`. The Antigravity path has lower confidence than Cursor (community-documented format) and is correctly sequenced after the Cursor path validates the shared infrastructure.
**Delivers:** `antigravity-skill-parser.cjs` fully integrated with format-version detection; `pde-mcp-server` `fs.watch` on `.agent/` directory; `.ag-inbound-delta.json` delta queue protocol; `tokens.json` formally established as master with `DESIGN.md` as derivative-only; Antigravity to PDE reverse sync (P1 feature); shared design token state (P1 feature)
**Addresses:** Antigravity DESIGN.md format instability (Pitfall 6); shared token state clarity
**Avoids:** Treating DESIGN.md as a canonical input; TOON to DTCG conversion loss (versioned parser plus Nyquist test required before shipping)

### Phase F: MCP Write Tools
**Rationale:** Write tools are additive to the established sync architecture and depend on all prior phases — they call `emitAll()`, they must route through validation, and they log to the event bus established in earlier phases. Sequencing them last prevents the temptation to use them as a shortcut before the hook-based write-back path is proven.
**Delivers:** 4 write tools in `packages/pde-mcp-server/` behind `--enable-writes`: `update-constraints`, `update-tech-stack`, `append-context-note`, `flag-divergence`; each validated, triggers `emitAll()` post-write, logged to NDJSON event bus
**Addresses:** MCP write-back bypass risk (Pitfall 2) — by routing through validation, not around it; `idempotentHint: true` on all tools
**Avoids:** Confused deputy attack surface; race conditions with active Claude sessions

### Phase G: Conflict UX and Audit Trail
**Rationale:** Deliver after core sync paths are validated end-to-end. SYNC-LOG.md and the rollback command convert the system from technically correct to user-trustable. This phase addresses UX pitfalls that are rated MEDIUM recovery cost — resolvable but damaging to user trust if encountered first.
**Delivers:** SYNC-LOG.md conflict audit trail (P2 feature); `/pde:sync-rollback` command with auto-snapshot to `.planning/sync-snapshots/` before each write-back batch; semantic conflict presentation (token name plus old and new values, not raw JSON diff); sync events visible in tmux dashboard Pane 7 via existing NDJSON event bus
**Addresses:** Silent write-back with no user notification; no undo path for bad syncs; false conflict alarms from clock skew (hash-based comparison prevents timestamp false positives)
**Avoids:** Users losing track of auto-resolved conflicts and eventually distrusting the sync system

### Phase Ordering Rationale

- Phase A before everything: loop prevention must precede any watcher. The research explicitly calls out that adding loop protection after the watcher is live means "testing in a live-fire environment where loops can fill disk or exhaust API quotas within seconds."
- Phases B and C before Phase D: parser fidelity and merge correctness must be independently verified before being put on the hook's hot path (every `.planning/` write fires the hook).
- Phase D (Cursor) before Phase E (Antigravity): Cursor path has a more stable, well-documented format (HIGH confidence) vs. Antigravity's community-documented format (MEDIUM confidence). Proven merge patterns from Phase D reduce integration risk in Phase E.
- Phase F after Phase E: write tools call `emitAll()`, which depends on the state file (Phase A), parsers (Phase B), and merge engine (Phase C). Building write tools before these foundations inverts the dependency order and would require retrofitting validation.
- Phase G last: audit trail and rollback are quality-of-life improvements on top of a working system. Building them first would optimize the escape hatch before validating the primary path.

### Research Flags

Phases needing deeper research during planning:
- **Phase E (Antigravity write-back):** Antigravity MCP write API is undocumented as of March 2026. DESIGN.md format is community-documented and version-unstable. TOON to DTCG conversion is lossy with limited post-mortem data (LOW confidence). Recommend `/gsd:research-phase` before implementation targeting specifically: TOON converter precision requirements and any Antigravity v1.21+ format changes.
- **Phase F (MCP write tools):** MCP A2A coordination patterns are still maturing. Verify whether Antigravity prefers invoking write tools via MCP or continues to prefer direct file writes. This affects the write tool API surface and whether the tools will actually be used.

Phases with well-established patterns (skip research-phase):
- **Phase A (Sync Foundation):** SHA-256 hash comparison and state file patterns are directly implemented in existing `context-sync.cjs`. The `computeSourceHash()` function already exists and will be reused unchanged.
- **Phase B (Reverse Parsers):** Regex frontmatter parsing and PDE-GENERATED marker boundaries are verified against live code. The 4-field `.mdc` format is confirmed stable against official Cursor docs.
- **Phase C (Merge Engine):** Field-level 3-way merge is a well-documented algorithm. The field ownership table is fully specified in ARCHITECTURE.md and can be implemented directly.
- **Phase D (Hook Integration):** mtime comparison pattern is explicitly designed in ARCHITECTURE.md with code examples. Hook zero-stdout constraint is well-understood from 15 milestones of PDE hook development.
- **Phase G (Conflict UX):** NDJSON event bus and tmux dashboard Pane 7 are existing infrastructure. Append-only log pattern is established from v0.8 event system.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | chokidar v4 choice verified against Node.js issue #47058 and chokidar release history; MCP SDK annotations verified against spec; all other components use existing dependencies verified against live code in `context-sync.cjs` and `pde-mcp-server/` |
| Features | HIGH | v0.15 foundation thoroughly documented; Cursor formats verified via official docs; anti-features grounded in specific failure modes from PROJECT.md scope decisions; dependency graph fully mapped |
| Architecture | HIGH (internal patterns), MEDIUM (Antigravity coordination) | Internal patterns verified by reading live `context-sync.cjs`, `context-sync-hook.cjs`, `hooks.json`, and `pde-mcp-server/src/index.ts`; Antigravity MCP write API explicitly flagged as undocumented |
| Pitfalls | HIGH (loop prevention, MCP bypass, session gaps), MEDIUM (DESIGN.md format), LOW (DTCG round-trip) | Loop prevention sourced from multiple integration platform post-mortems and a confirmed CVE (EscapeRoute); DTCG round-trip limited post-mortem data, spec v1 only stable since October 2025 |

**Overall confidence:** HIGH for Phases A through D; MEDIUM for Phase E; LOW for MCP A2A coordination in Phase F.

### Gaps to Address

- **Antigravity DESIGN.md format version:** No official stability guarantee exists. Build format-version detection as a first-class concern in Phase E, not a retrofit. Treat any format change as a breaking change requiring a parser update.
- **TOON to DTCG conversion:** Lossy operation with limited documentation. Define the explicit conversion table and precision requirements (OKLCH values to 4 decimal places) before writing any TOON-related sync code. The round-trip must be a Nyquist assertion.
- **Antigravity MCP write API:** Undocumented. Recommended mitigation: use the file system as the coordination channel (SKILL.md, DESIGN.md) rather than direct MCP calls from PDE to AG. Revisit in Phase F if Antigravity publishes an official write API.
- **chokidar on Windows:** `awaitWriteFinish` must be used (editors write files in bursts); polling fallback must degrade gracefully to manual sync rather than enabling polling mode (400MB+ memory, lost events on large directories per chokidar issue #228).
- **Session-start reconciliation scope:** Must explicitly enumerate which files are monitored (`.cursor/rules/*.mdc`, `AGENTS.md`, `GEMINI.md`, `DESIGN.md`, `.agent/skills/pde-design/SKILL.md`). Not `.planning/` internals — watching those creates inevitable loops.

## Sources

### Primary (HIGH confidence)
- Live codebase: `bin/lib/context-sync.cjs`, `hooks/context-sync-hook.cjs`, `hooks/hooks.json`, `packages/pde-mcp-server/src/index.ts`, `bin/lib/divergence.cjs` — verified against actual implementation
- [chokidar GitHub](https://github.com/paulmillr/chokidar) and [releases](https://github.com/paulmillr/chokidar/releases) — v4 CJS/ESM dual mode confirmed, v5 ESM-only confirmed
- [Node.js issue #47058](https://github.com/nodejs/node/issues/47058) — `fs.watch` macOS event type unreliability confirmed
- [MCP Tools spec](https://modelcontextprotocol.io/specification/2025-06-18/server/tools) — annotation fields `readOnlyHint`, `destructiveHint`, `idempotentHint` verified
- [Cursor Rules docs](https://cursor.com/docs/context/rules) — `.mdc` 4-field frontmatter format confirmed stable
- [Antigravity Skills codelab](https://codelabs.developers.google.com/getting-started-with-antigravity-skills) — SKILL.md format, `.agent/skills/` path verified
- [EscapeRoute CVE-2025-53109/53110](https://cymulate.com/blog/cve-2025-53109-53110-escaperoute-anthropic/) — MCP filesystem write safety risks confirmed
- [DTCG v1 stable spec](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/) — token schema and color space metadata

### Secondary (MEDIUM confidence)
- [Valence bi-directional sync loop prevention](https://docs.valence.app/en/latest/guides/stop-infinite-loops.html) — origin tracking and fingerprinting patterns
- [Cursor forum: mdc best practices](https://forum.cursor.com/t/my-best-practices-for-mdc-rules-and-troubleshooting/50526) — frontmatter parsing ambiguities and inline comment YAML bug confirmed
- [Antigravity context management guide](https://datalakehousehub.com/blog/2026-03-context-management-google-antigravity/) — file write patterns
- [Tailwind CSS 4 @theme design tokens](https://www.maviklabs.com/blog/design-tokens-tailwind-v4-2026) — CSS variable architecture and OKLCH usage
- [Conflict resolution strategies in data synchronization](https://mobterest.medium.com/conflict-resolution-strategies-in-data-synchronization-2a10be5b82bc) — LWW and 3-way merge patterns
- `.planning/PROJECT.md` (local) — v0.16 target features and explicit out-of-scope decisions

### Tertiary (LOW confidence)
- [MCP vs A2A guide](https://dev.to/pockit_tools/mcp-vs-a2a-the-complete-guide-to-ai-agent-protocols-in-2026-30li) — MCP A2A patterns still maturing, community article
- Antigravity MCP write API — undocumented as of March 2026; file-system channel recommended as safe fallback
- DTCG round-trip precision loss — limited post-mortem data; DTCG spec v1 only stable since October 2025

---
*Research completed: 2026-03-24*
*Ready for roadmap: yes*
