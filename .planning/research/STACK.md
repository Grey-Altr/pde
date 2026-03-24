# Stack Research: v0.16 Bidirectional Multi-Editor Context Sync

**Domain:** File-watching reverse-sync pipeline + write-capable MCP tools for AI editor integration
**Researched:** 2026-03-24
**Confidence:** HIGH (file watching, MCP write tools, .mdc format), MEDIUM (Antigravity write-back patterns), LOW (Antigravity shared design token state protocol)

---

## Scope Boundary

This document covers ONLY what v0.16 adds or changes relative to v0.15. The v0.15 stack (MCP SDK, Zod, TypeScript in `packages/pde-mcp-server/`, zero-npm-dep at plugin root) is validated and unchanged. See `v0.15-STACK.md` for full foundation context.

**New capabilities this milestone:**
1. Cursor `.mdc` change detection and reverse sync back to `.planning/`
2. Cursor conflict resolution (PDE-generated vs user-edited `.mdc` files)
3. Antigravity Stitch output → `.planning/` reverse sync
4. Antigravity shared design token state (`DESIGN.md` ↔ `design-manifest.json`)
5. Antigravity agent coordination via write-capable MCP tools

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| chokidar | ^4.0.3 | Watch `.cursor/rules/*.mdc` and `.agent/skills/pde-design/` for changes | v4 is the only version that is dual ESM/CJS — critical because the watching daemon is a `.cjs` module following PDE convention. v5 (Nov 2025) is ESM-only, breaks `require('chokidar')`. v3 carries 13 transitive deps vs v4's 1. Node 20.20.0 installed locally. |
| Node.js `fs` (built-in) | Node 20.20.0 | Read/write `.mdc` frontmatter, write `.planning/` artifacts on reverse sync | Already used throughout `context-sync.cjs`. No new dependency for write-back — only the watcher itself needs a library. |
| Node.js `crypto` (built-in) | Node 20.20.0 | SHA-256 hash of `.mdc` content for sync-loop prevention and idempotency | Already used in `context-sync.cjs` via `computeSourceHash()`. Same pattern extended to detect whether a file change was made by PDE or by an external editor. |
| @modelcontextprotocol/sdk | ^1.27.1 (existing) | Add write-capable tools to `pde-mcp-server` for Antigravity agent coordination | Already installed in `packages/pde-mcp-server/`. New write tools use the same `server.registerTool()` pattern as existing read tools. No version bump required. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| chokidar | ^4.0.3 | Persistent file watcher daemon for `.cursor/rules/` and `.agent/` directories | Used exclusively in the new `reverse-sync-daemon.cjs`. Isolated in `packages/reverse-sync/` (new subdir), not plugin root. |

### What Goes Where (Isolation Map)

| New Component | Location | Has npm deps? | Rationale |
|---------------|----------|--------------|-----------|
| `reverse-sync-daemon.cjs` | `bin/lib/` | Imports from `packages/reverse-sync/` | Long-running watcher process. chokidar isolated in its own subpackage. |
| `mdc-parser.cjs` | `bin/lib/` | NO | Parses `.mdc` frontmatter with regex. Format is a known 4-field subset — no YAML library needed. |
| `conflict-resolver.cjs` | `bin/lib/` | NO | Implements LWW (last-write-wins) via `fs.statSync().mtimeMs` comparison. |
| `antigravity-reverse-sync.cjs` | `bin/lib/` | NO | Reads `DESIGN.md` changes, maps hex colors back to DTCG token format in `design-manifest.json`. |
| `write-design-decision.ts` | `packages/pde-mcp-server/src/tools/` | NO (uses existing deps) | New write-capable MCP tool exposed to Antigravity agents. |

**chokidar isolation constraint:** chokidar goes in `packages/reverse-sync/package.json` — a new isolated subdir, never the plugin root. This mirrors how `packages/pde-mcp-server/` isolates the MCP SDK.

---

## Cursor Reverse Sync Stack

### File Watching: chokidar v4 in a daemon

**Why chokidar v4, not `fs.watch`:**
- `fs.watch` on macOS reports most changes as `rename` events, not `change` events (Node.js issue #47058)
- `fs.watch` may not report the filename reliably on macOS (confirmed in Node.js docs)
- chokidar v4 uses FSEvents on macOS for reliable, coalesced events with correct filenames
- chokidar v4 is dual CJS/ESM — `require('chokidar')` works from `.cjs` files
- chokidar v4 drops 12 of v3's 13 dependencies (uses 1: `readdirp`)

**Why not `fs.watchFile` (polling):**
- 500ms–5s default latency
- Higher sustained CPU usage for an always-on daemon
- chokidar uses FSEvents (macOS) / inotify (Linux) with polling as an internal graceful fallback — the best of both worlds

### .mdc Conflict Resolution: Last-Write-Wins via mtime

The existing `.mdc` files already carry a `PDE-GENERATED` marker with a `generated:` ISO timestamp. Conflict resolution logic:

1. Watcher fires on `.mdc` change
2. Read the changed file — check for `PDE-GENERATED` marker:
   - **Absent** → user-authored rule (no marker was ever set), skip unconditionally
   - **Present** → PDE-generated file, check if user modified it after generation
3. Compare `fs.statSync(mdcFile).mtimeMs` vs the `generated:` timestamp parsed from the marker
4. If `mtime > generatedAt + 500ms` (500ms grace period for write-flush latency): user made edits → extract new content and sync to `.planning/context-notes/cursor-custom-rules.md`
5. Store the file's current content SHA-256 as the "last seen" hash to prevent re-triggering on the same content

**Why mtime is reliable enough:** macOS APFS/HFS+ has millisecond-resolution mtime. The 500ms grace absorbs any write-flush lag. No vector clocks needed for a single-user, local-filesystem case.

### .mdc Frontmatter Parser: Regex, No YAML Library

The `.mdc` frontmatter is a constrained 4-field format:
```
description: string
globs: string | null
alwaysApply: boolean
```
Plus the `PDE-GENERATED` HTML comment line. A regex parser in `mdc-parser.cjs` handles this cleanly — no `js-yaml` or `gray-matter` dependency. The format has been stable since v0.15 and is confirmed against the Cursor docs.

### Sync Loop Prevention

When the watcher fires on a `.mdc` file:
- Compute SHA-256 of current content
- Compare to hash stored in the `PDE-GENERATED` comment (`hash:` field already present)
- If equal: the change came from PDE's own `emitAll()` — skip reverse sync
- If different: external edit detected → proceed with conflict resolution

This is the same idempotency pattern already used in `context-sync-hook.cjs` (marker file in `os.tmpdir()`), applied in the opposite direction.

---

## Antigravity Reverse Sync Stack

### Write-Back: File-Based, Zero New Dependencies

Antigravity agents write to the project workspace via their native file tools (no special protocol). PDE detects these writes via the same chokidar watcher watching `.agent/skills/pde-design/` and `DESIGN.md`. The reverse-sync handler maps changes back to `.planning/`.

**DESIGN.md → design-manifest.json mapping:**
- Parse hex color values from DESIGN.md `## 2. Color Palette & Roles` section using regex (same pattern as `oklchToHex()` in `context-sync.cjs`, in reverse)
- Write back to `manifest.tokens.color` entries in `design-manifest.json`
- Trigger source hash recompute so next `emitAll()` sees the updated manifest

**SKILL.md → planning sync:**
- SKILL.md changes indicate an Antigravity agent updated component catalog or design constraints
- Extract the `## Component Catalog` section and reconcile with `.planning/design/handoff/` filenames
- Log reconciliation in `.planning/context-notes/antigravity-sync.md`

### Shared Design Token State: DESIGN.md as the Bridge

**Pattern:** `DESIGN.md` at project root is the bidirectional bridge.

| Direction | Mechanism | Already Exists? |
|-----------|-----------|----------------|
| PDE → DESIGN.md | `emitDesignMd()` in `context-sync.cjs` | YES (v0.15) |
| DESIGN.md → PDE | `antigravity-reverse-sync.cjs` watching DESIGN.md | NEW (v0.16) |

The `PDE-GENERATED` marker in DESIGN.md serves the same function as in `.mdc` files — if Antigravity rewrites DESIGN.md (removing the marker or updating content), the watcher detects the hash mismatch and triggers reverse sync.

### Antigravity Agent Coordination via MCP Write Tools

**What Antigravity agents need to write back via MCP:**
- Design decisions (approved component specs, chosen palette)
- Stitch asset references (`.agent/stitch/*.png` paths registered in `design-manifest.json`)
- Critique feedback ("approved", "needs-revision" status for a given design artifact)

**New write tools in `packages/pde-mcp-server/src/tools/`:**

```typescript
// write-design-decision.ts
// Allows Antigravity agent to commit a design decision to .planning/design/design-manifest.json
server.registerTool('pde_write_design_decision', {
  description: 'Write an Antigravity agent design decision back to PDE planning state',
  inputSchema: {
    type: 'object',
    properties: {
      artifactCode: { type: 'string' },
      decision: { type: 'string', enum: ['approved', 'needs-revision', 'deferred'] },
      notes: { type: 'string' }
    },
    required: ['artifactCode', 'decision']
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,   // writes are additive, not destructive
    idempotentHint: true      // same decision written twice = same manifest state
  }
}, handler);
```

**Why write tools beat raw file writes from SKILL.md scripts:**
A write tool gives Antigravity a typed, validated, documented API that routes through PDE's manifest validation logic — the same rationale as `pde-tools.cjs` validation gates. Raw file writes bypass validation and risk corrupting `design-manifest.json` schema.

---

## Installation

```bash
# New isolated subdir for chokidar only
mkdir -p "packages/reverse-sync"
cd "packages/reverse-sync"
cat > package.json << 'EOF'
{
  "name": "pde-reverse-sync",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "chokidar": "^4.0.3"
  }
}
EOF
npm install

# packages/pde-mcp-server: no package.json changes, just new tool files
# Plugin root: zero changes to package.json
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| chokidar v4 | chokidar v5 | If the daemon is refactored to ESM. v5 is 80kb vs v4's 150kb but breaks `require()`. Not worth the migration cost when all PDE hooks are CJS. |
| chokidar v4 | `fs.watch` (built-in) | Never for production on macOS. Misses events, reports wrong types, unreliable filenames. |
| chokidar v4 | `fs.watchFile` (polling) | Only if watching network-mounted directories. For local filesystem: FSEvents via chokidar is superior. |
| mtime LWW conflict resolution | Three-way merge | If users frequently co-edit `.mdc` files. LWW is correct here — user's intentional edits always win over PDE's generated content. Three-way merge adds complexity without benefit. |
| MCP write tools for Antigravity | Raw SKILL.md scripts writing files directly | If MCP tool setup is skipped. File writes work but bypass PDE manifest validation. Use write tools. |
| Isolated `packages/reverse-sync/` for chokidar | Adding chokidar to `packages/pde-mcp-server/` | Never — the MCP server has no need for file watching. Separate concerns, separate packages. |
| Regex `.mdc` frontmatter parser | `gray-matter` or `js-yaml` | Never for this use case. The frontmatter is a 4-field subset with no nesting or special YAML types. Regex is 20 lines and zero deps. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `fs.watch` for reverse sync | Unreliable on macOS: reports most changes as `rename`, may not report filenames, misses events from editor save patterns (confirmed Node.js issue #47058) | chokidar v4 with FSEvents backend |
| `fs.watchFile` (polling) as primary | 500ms+ latency, higher sustained CPU; unnecessary when FSEvents is available | chokidar v4 (uses polling as internal fallback automatically) |
| chokidar v5 | ESM-only — breaks `require('chokidar')` in `.cjs` daemon files | chokidar v4 (dual CJS/ESM, latest stable: 4.0.3) |
| `gray-matter` or `js-yaml` | Adds a dep for a constrained 4-field format that regex handles | Custom regex parser in `mdc-parser.cjs` (zero deps) |
| Adding chokidar to plugin root `package.json` | Violates zero-npm-dep constraint at plugin root | `packages/reverse-sync/package.json` (isolated subdir) |
| Bidirectional sync inside `context-sync-hook.cjs` | Hook is PostToolUse-only, synchronous, zero-stdout contract. Adding file watching creates re-entrant sync loops. | Separate `reverse-sync-daemon.cjs` long-running process |
| HTTP/SSE transport for write MCP tools | Adds auth, CORS, port management for local-only tools | stdio transport (already used, Antigravity supports natively) |
| Write tools at plugin root (no npm deps) | Plugin root has zero-npm-dep constraint; write tools live in `packages/pde-mcp-server/` which already has dependencies | `packages/pde-mcp-server/src/tools/write-design-decision.ts` |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| chokidar@^4.0.3 | Node.js v14+ (v20.20.0 installed) | v4 uses `readdirp` v4 (1 dep total). Fully compatible with Node 20.20.0. |
| chokidar@^4.0.3 | CommonJS `require()` | v4 is dual-mode. `require('chokidar')` works from `.cjs` files. v5 is ESM-only. |
| @modelcontextprotocol/sdk@^1.27.1 | Write tool annotations | `readOnlyHint`, `destructiveHint`, `idempotentHint` supported in 1.27.x. Annotations are hints only — do not affect execution, improve client presentation. |
| DESIGN.md bridge | Antigravity v1.20.3+ | DESIGN.md is plain markdown; compatible with all Antigravity versions. AGENTS.md support confirmed v1.20.3 (March 5, 2026). |
| `.mdc` frontmatter (4 fields) | Cursor (current) | Format confirmed stable in Cursor docs. No breaking changes observed in community reports as of March 2026. |
| `PDE-GENERATED` comment format | All existing emitters | Already present in outputs of `emitAgentsMd`, `emitCursorRules`, `emitCursorrules`, `emitGeminiMd`, `emitAntigravitySkill`, `emitDesignMd`. No format changes needed. |

---

## Integration with Existing `context-sync.cjs`

**No changes to `context-sync.cjs` itself.** The existing emitter pipeline (PDE → editors) is unchanged. v0.16 adds the reverse direction:

| Layer | Component | Role |
|-------|-----------|------|
| Existing | `context-sync.cjs` + `context-sync-hook.cjs` | PDE → editors (unchanged) |
| New | `reverse-sync-daemon.cjs` + chokidar | Watch editor output files for changes |
| New | `mdc-parser.cjs` + `conflict-resolver.cjs` | Extract user edits from `.mdc` files |
| New | `antigravity-reverse-sync.cjs` | Map DESIGN.md/SKILL.md changes back to `.planning/` |
| New | `write-design-decision.ts` (MCP tool) | Typed write-back API for Antigravity agents |

The sync loop prevention chain: watcher fires → compute SHA-256 → compare to `hash:` field in `PDE-GENERATED` comment → if equal, PDE wrote this, skip; if different, external edit, reverse sync.

---

## Sources

- [chokidar GitHub](https://github.com/paulmillr/chokidar) — v4 dual CJS/ESM, v5 ESM-only, 1 dep in v4. HIGH confidence.
- [chokidar releases](https://github.com/paulmillr/chokidar/releases) — v5.0.0 Nov 25, 2024 (ESM-only, min Node 20); v4.0.3 Dec 18, 2023 (CJS compatible). HIGH confidence.
- [Vite issue #12495 — fs.watch vs chokidar](https://github.com/vitejs/vite/issues/12495) — ecosystem confirmation of chokidar preference over native. MEDIUM confidence.
- [Node.js issue #47058 — fs.watch reliability](https://github.com/nodejs/node/issues/47058) — confirmed fs.watch macOS event type problems. HIGH confidence.
- [MCP Tools spec](https://modelcontextprotocol.io/specification/2025-06-18/server/tools) — `readOnlyHint`, `destructiveHint`, `idempotentHint` annotation fields. HIGH confidence.
- [Cursor rules docs](https://cursor.com/docs/context/rules) — .mdc frontmatter format (4 fields), no native write-back API. HIGH confidence.
- [Cursor forum: mdc change management](https://forum.cursor.com/t/improve-mdc-rule-file-change-management/50533) — confirms no native reverse sync in Cursor; change management is a known gap. MEDIUM confidence.
- [Antigravity skill codelab](https://codelabs.developers.google.com/getting-started-with-antigravity-skills) — skills write to project workspace; SKILL.md structure and `.agent/skills/` path. HIGH confidence.
- [Antigravity context management guide](https://datalakehousehub.com/blog/2026-03-context-management-google-antigravity/) — .agent/workflows/, file write patterns. MEDIUM confidence.
- [oneuptime: last-write-wins pattern](https://oneuptime.com/blog/post/2026-01-30-last-write-wins/view) — LWW conflict resolution with mtime. MEDIUM confidence.
- [Node.js filesystem docs](https://nodejs.org/en/learn/manipulating-files/working-with-different-filesystems) — mtime resolution on macOS. HIGH confidence.
- [v0.15-STACK.md](./v0.15-STACK.md) — validated foundation stack this milestone builds on. HIGH confidence.

---
*Stack research for: v0.16 Bidirectional Multi-Editor Context Sync*
*Researched: 2026-03-24*
