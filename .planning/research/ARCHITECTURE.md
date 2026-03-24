# Architecture Research: Bidirectional Multi-Editor Context Sync

**Domain:** Bidirectional editor context synchronization — reverse parsing, conflict detection, MCP write-back
**Researched:** 2026-03-24
**Confidence:** HIGH for integration patterns (code verified), MEDIUM for Antigravity MCP write-back (official AG write API undocumented)

---

## System Overview: Current vs. Target State

### Current (Unidirectional, v0.15)

```
.planning/ state files
        │
        ▼
bin/lib/context-sync.cjs (IR builder)
        │ buildContextIR()
        ▼
  [Intermediate Representation]
        │
   ┌────┴──────────────────────────────────┐
   ▼          ▼          ▼          ▼      ▼
AGENTS.md  .cursor/   GEMINI.md  SKILL.md DESIGN.md
           rules/*.mdc
```

**Trigger:** PostToolUse(Write|Edit) → context-sync-hook.cjs → hash check → emitAll()
**Direction:** .planning/ → editor files only (read-only in reverse)

### Target (Bidirectional, Next Milestone)

```
.planning/ state files  ◄──────────────────────────┐
        │                                           │
        ▼                                           │ write-back
bin/lib/context-sync.cjs (IR builder + IR receiver) │
        │ buildContextIR()                          │
        ▼                          ┌────────────────┴──────┐
  [Intermediate Representation]    │  bin/lib/ir-merger.cjs │
        │                          │  (3-way merge engine)  │
   ┌────┴──────────────────────────└──────────────┐
   ▼          ▼          ▼          ▼      ▼      │
AGENTS.md  .cursor/   GEMINI.md  SKILL.md DESIGN.md│
           rules/*.mdc                             │
                │                                 │
                ▼                                 │
   ┌────────────────────────────────────────────┐ │
   │  bin/lib/reverse-parsers/                  │ │
   │  cursor-mdc-parser.cjs                     ├─┘
   │  antigravity-skill-parser.cjs              │
   └────────────────────────────────────────────┘
           ▲             ▲
           │             │
   Cursor edits    Antigravity edits
   .mdc rules      SKILL.md / DESIGN.md
```

**New triggers:** PostToolUse on .cursor/rules/*.mdc or .agent/ files → reverse parse → merge → write-back

---

## Component Responsibilities

| Component | Type | Responsibility | Status |
|-----------|------|----------------|--------|
| `bin/lib/context-sync.cjs` | MODIFY | Add `parseIRFromMdc()`, `parseIRFromSkill()` entry points; `buildContextIR()` unchanged | Existing |
| `bin/lib/reverse-parsers/cursor-mdc-parser.cjs` | NEW | Parse .cursor/rules/*.mdc YAML frontmatter + body back into partial IR fields | New |
| `bin/lib/reverse-parsers/antigravity-skill-parser.cjs` | NEW | Parse SKILL.md / DESIGN.md back into partial IR fields | New |
| `bin/lib/ir-merger.cjs` | NEW | 3-way merge between .planning/-sourced IR, editor-sourced IR delta, and last-sync IR snapshot | New |
| `bin/lib/conflict-resolver.cjs` | NEW | Escalate irreconcilable conflicts to user prompt; implement last-write-wins policy for automatic resolution | New |
| `hooks/context-sync-hook.cjs` | MODIFY | Add watcher path for editor files, call reverse parsers when editor files change, feed merge engine | Existing |
| `hooks/hooks.json` | MODIFY | Add PostToolUse matcher for .cursor/rules/ and .agent/ paths | Existing |
| `packages/pde-mcp-server/` | MODIFY | Add write tools: `update-planning-section`, `append-constraint`, `flag-divergence` | Existing |
| `bin/lib/ag-mcp-bridge.cjs` | NEW | Antigravity-specific MCP write-back channel with consent gate | New |

---

## Detailed Component Design

### Pattern 1: Reverse Parser Architecture

**What:** Each editor format gets a dedicated parser that extracts only the fields it owns back into a partial IR object. The parser does NOT attempt to reconstruct fields it never wrote.

**Why this design:** The `buildContextIR()` function assembles IR from 4 authoritative source files. A reverse parser can only claim ownership of fields it originally emitted — for example, `.mdc` body content may contain user-added custom rules not originating from PDE. The parser must distinguish PDE-generated sections (via the `PDE-GENERATED` HTML comment marker) from user-authored additions.

**Critical constraint:** The `PDE-GENERATED | hash:... | generated:...` comment already exists in every emitted file. This is the anchor for safe reverse parsing — only content in PDE-generated sections participates in merge; user-added content below the last PDE section is preserved verbatim.

```javascript
// bin/lib/reverse-parsers/cursor-mdc-parser.cjs
// Returns a PARTIAL IR — only fields cursor rules can contribute
function parseCursorMdcToPartialIR(rulesDir) {
  // 1. Read all pde-*.mdc files
  // 2. Verify PDE-GENERATED marker — skip files without it
  // 3. Parse YAML frontmatter (description, globs, alwaysApply)
  // 4. Extract body sections by ## heading
  // 5. Return { constraints, techStack, ... } — ONLY fields this emitter owns
  // 6. Include { _sourceHash, _parsedAt } for 3-way merge anchor
  return { _partial: true, _source: 'cursor-mdc', constraints, techStack };
}
```

**Owned fields by emitter:**

| Emitter | Fields it owns (can write back) |
|---------|--------------------------------|
| `emitCursorRules` | `constraints` (from pde-project.mdc), `techStack` (from pde-architecture.mdc), `pipelineStatus` (from pde-pipeline.mdc) |
| `emitAntigravitySkill` | `designTokens`, `componentCatalog` (SKILL.md body sections) |
| `emitDesignMd` | Color palette section, typography section (DESIGN.md sections 2-3) |
| `emitAgentsMd` | `projectSummary`, `constraints` (AGENTS.md — only if PDE-GENERATED) |
| `emitGeminiMd` | `pipelineStatus`, `projectSummary` (read-only — Gemini CLI is consume-only) |

### Pattern 2: Hash-Anchored 3-Way Merge

**What:** IR merger uses the last-emitted hash as the "base" for a 3-way merge. This mirrors git's 3-way merge but operates on IR fields rather than text lines.

**How it works:**

```
base_IR   = IR snapshot from last emitAll() run (stored in .planning/.context-sync-state.json)
current_IR = IR freshly built from .planning/ sources via buildContextIR()
editor_IR  = partial IR parsed from editor files (reverse parsers)

For each IR field:
  if current_IR[field] == base_IR[field] AND editor_IR[field] != base_IR[field]:
    → Editor changed it, .planning/ did not: accept editor change → write-back to .planning/
  if current_IR[field] != base_IR[field] AND editor_IR[field] == base_IR[field]:
    → .planning/ changed it, editor did not: push forward (re-emit, skip write-back)
  if current_IR[field] != base_IR[field] AND editor_IR[field] != base_IR[field]:
    → Both changed: CONFLICT → escalate to conflict-resolver.cjs
  if both unchanged:
    → No-op
```

**State file:** `.planning/.context-sync-state.json`

```json
{
  "lastHash": "abc123...",
  "lastEmittedAt": "2026-03-24T10:00:00Z",
  "lastIR": { "constraints": "...", "techStack": "..." }
}
```

This file must be excluded from the `SOURCE_FILES` array in `context-sync.cjs` hash computation to avoid circular invalidation.

### Pattern 3: File Watcher Integration Within Hook Constraints

**What:** Claude Code hooks fire PostToolUse for Write and Edit — but Cursor and Antigravity write files directly, bypassing Claude Code's tool invocations. A persistent file watcher is required to detect these external edits.

**Constraint:** Claude Code hooks run as short-lived processes (stdin → process → exit). They cannot host a long-running `fs.watch()` daemon. A separate watcher process must run alongside.

**Recommended architecture: poll-on-hook + debounced daemon**

Two complementary approaches:

1. **Poll-on-hook (lightweight, no daemon):** When `context-sync-hook.cjs` fires for any `.planning/` write, also scan editor file mtimes against the state file's `lastEmittedAt`. If an editor file is newer than the last emit, trigger reverse parsing. This requires no daemon and no `fs.watch()`.

2. **Explicit trigger command:** Add a `pde context-sync --ingest` CLI flag that Cursor or Antigravity users invoke when they want their edits to propagate back to `.planning/`. This is the most explicit and lowest-risk approach for an initial milestone.

**Avoid:** A persistent `fs.watch()` daemon in a hook — hooks must not spawn long-lived background processes. If a daemon approach is needed in the future, it belongs in the MCP server (which is already a long-running process).

**Recommended for this milestone:** Option 2 (explicit `--ingest` CLI flag) + Option 1 (mtime scan on hook) as a secondary passive detection layer.

```javascript
// hooks/context-sync-hook.cjs — addition to existing handleHookPayload
function checkEditorFilesForInboundChanges(cwd, state) {
  const editorPaths = [
    path.join(cwd, '.cursor', 'rules'),
    path.join(cwd, '.agent', 'skills', 'pde-design'),
    path.join(cwd, 'DESIGN.md'),
  ];
  // Compare mtime of each file against state.lastEmittedAt
  // Return list of files modified after last emit
}
```

### Pattern 4: Conflict Detection Algorithm

**What:** When both .planning/ and an editor file have changed since last emit, a conflict exists. The algorithm must distinguish genuine conflicts (incompatible intent) from stale staleness (user forgot to sync).

**Decision tree:**

```
Is the conflict in a user-authored section (no PDE-GENERATED marker)?
  YES → Preserve user content unconditionally. No conflict.
  NO  → Both PDE-generated sections changed since last hash.
    Are the changes semantically equivalent (same normalized content)?
      YES → Accept either, update hash. No conflict.
      NO  → Genuine conflict:
        Is auto-resolution policy set?
          "planning-wins" → .planning/ is source of truth, discard editor change
          "editor-wins"   → editor change propagates to .planning/ (write-back)
          "prompt"        → escalate to user (emit warning to stderr, skip write-back)
```

**Default policy:** `planning-wins` — safer because .planning/ is the authoritative source of truth and agents have already validated it. Editor changes are advisory.

**Configuration:** `.planning/config.json` extended with:
```json
{
  "contextSync": {
    "conflictPolicy": "planning-wins",
    "writeBackEnabled": true,
    "writeBackTargets": ["cursor", "antigravity"]
  }
}
```

### Pattern 5: MCP Write-Back Architecture

**What:** The existing `pde-mcp-server` is read-only. Adding write tools requires careful safety design to prevent Antigravity (or any external MCP caller) from corrupting `.planning/` state.

**Safety requirements:**
- Write tools must validate input against known IR field names — no freeform path writes
- Each write is logged to the NDJSON event bus (via existing emit-event.cjs infrastructure)
- Write tools trigger `emitAll()` post-write to keep editor files in sync
- Writes to `.planning/PROJECT.md` require the section name to be explicitly whitelisted

**New MCP tools to add to `packages/pde-mcp-server/`:**

| Tool Name | Input | Effect | Safety Gate |
|-----------|-------|--------|-------------|
| `update-constraints` | `{ constraints: string }` | Overwrites Constraints section in PROJECT.md | Validates non-empty, max 2000 chars |
| `update-tech-stack` | `{ techStack: string }` | Overwrites Tech Stack section in PROJECT.md | Validates non-empty, max 2000 chars |
| `append-context-note` | `{ note: string, category: string }` | Appends to `.planning/context-notes/` | Category must be in allowlist |
| `flag-divergence` | `{ component: string, reason: string }` | Writes to `.planning/divergence-flags.json` | Component name validated |

**Architecture decision: Extend existing server vs. separate write server**

Extend the existing `pde-mcp-server` with an optional write-mode flag (`--enable-writes`). The server starts read-only by default. Users must explicitly opt in. This avoids process proliferation and reuses the existing `planningDir` resolution, `@modelcontextprotocol/sdk` setup, and tool registration pattern.

```typescript
// packages/pde-mcp-server/src/index.ts — addition
const writesEnabled = process.argv.includes('--enable-writes');
if (writesEnabled) {
  const writeTool = updateConstraintsTool(planningDir);
  server.registerTool(writeTool.name, { ... }, writeTool.handler);
  // ... register other write tools
}
```

### Pattern 6: Agent Coordination Protocol

**What:** PDE (Claude Code) and Antigravity agents operate independently. When Antigravity modifies SKILL.md, PDE should not race-write it back without checking AG's changes. Coordination happens through the `.planning/.context-sync-state.json` file as a shared lock file.

**Protocol:**

```
AG writes SKILL.md
    ↓
pde-mcp-server (long-running) detects file change via fs.watch on .agent/ dir
    ↓
Parses SKILL.md → partial IR delta
    ↓
Compares against state.json base
    ↓
Writes delta to .planning/.ag-inbound-delta.json
    ↓
Next PDE hook invocation reads delta → runs ir-merger → clears delta file
```

**Lock semantics:** `.planning/.context-sync-state.json` tracks `lastWrittenBy` (pde|ag|cursor) and `lockedUntil` timestamp. A writer checks the lock before proceeding. Lock TTL is 30 seconds — prevents deadlock if a writer crashes.

**Note on Antigravity MCP write-back confidence:** The Antigravity Agent Manager's MCP write API is not publicly documented as of March 2026. The recommended approach is to use the file-system as the coordination channel (SKILL.md / DESIGN.md files) rather than attempting direct MCP calls from PDE to AG. This avoids requiring Antigravity MCP write permissions and works with any AG version.

---

## Recommended Project Structure (New Files)

```
bin/lib/
├── context-sync.cjs            # MODIFY: add parseIRFromMdc(), parseIRFromSkill()
├── ir-merger.cjs               # NEW: 3-way merge engine
├── conflict-resolver.cjs       # NEW: conflict detection + escalation
└── reverse-parsers/
    ├── cursor-mdc-parser.cjs   # NEW: .cursor/rules/*.mdc → partial IR
    └── antigravity-skill-parser.cjs  # NEW: SKILL.md/DESIGN.md → partial IR

hooks/
├── context-sync-hook.cjs       # MODIFY: add inbound change detection + --ingest path
└── hooks.json                  # MODIFY: add .cursor/rules/ + .agent/ matchers

packages/pde-mcp-server/src/
├── index.ts                    # MODIFY: add --enable-writes flag + write tool registration
└── tools/
    ├── update-constraints.ts   # NEW
    ├── update-tech-stack.ts    # NEW
    ├── append-context-note.ts  # NEW
    └── flag-divergence.ts      # NEW

.planning/
├── .context-sync-state.json    # NEW: base IR snapshot + lock state (git-ignored)
├── .ag-inbound-delta.json      # NEW: AG-written delta queue (git-ignored)
└── config.json                 # MODIFY: add contextSync block
```

---

## Data Flow

### Outbound Flow (Unchanged from v0.15)

```
.planning/ write (by agent or user)
    ↓ PostToolUse hook fires
hooks/context-sync-hook.cjs
    ↓ hash check (marker file in tmpdir)
bin/lib/context-sync.cjs → buildContextIR()
    ↓
emitAll() → 6 emitters → editor files written
    ↓
.planning/.context-sync-state.json updated (lastHash, lastIR snapshot)
```

### Inbound Flow (New — Editor → .planning/)

```
Cursor user edits .cursor/rules/pde-project.mdc
    ↓ next PostToolUse hook fires (any .planning/ write)
hooks/context-sync-hook.cjs → checkEditorFilesForInboundChanges()
    ↓ mtime newer than lastEmittedAt → inbound change detected
reverse-parsers/cursor-mdc-parser.cjs → partial IR extracted
    ↓
bin/lib/ir-merger.cjs → 3-way merge(base_IR, current_IR, editor_partial_IR)
    ↓
  NO CONFLICT → apply delta to .planning/PROJECT.md
  CONFLICT    → conflict-resolver.cjs → log warning, skip write-back
    ↓
emitAll() re-runs to normalize all editor files from merged .planning/ state
```

### Antigravity Write-Back Flow (New)

```
AG agent modifies DESIGN.md or SKILL.md
    ↓ pde-mcp-server fs.watch detects change (long-running process)
    ↓
reverse-parsers/antigravity-skill-parser.cjs → partial IR
    ↓
writes .planning/.ag-inbound-delta.json
    ↓ next PDE hook fires
context-sync-hook.cjs detects .ag-inbound-delta.json → reads + clears it
    ↓
ir-merger → merge → write-back to .planning/ if no conflict
    ↓
emitAll() re-normalizes all editor files
```

---

## Integration Points with context-sync.cjs

### What changes in context-sync.cjs

1. **Export `computeSourceHash`** — already exported (used by hook). No change needed.
2. **Add `buildBaseIRSnapshot(planningDir)`** — identical to `buildContextIR()` but writes result to `.context-sync-state.json`. Called at end of `emitAll()`.
3. **Add `parseIRFromEditorFiles(projectRoot)`** — entry point that delegates to reverse parsers and returns merged partial IR.
4. **`emitAll()` extended** — after writing files, call `buildBaseIRSnapshot()` to update the state file.

### What does NOT change in context-sync.cjs

- `buildContextIR()` — authoritative IR construction from .planning/ unchanged
- All 6 emitter functions — format contracts unchanged
- `computeSourceHash()` — unchanged
- `makeHeader()` / `PDE-GENERATED` marker — unchanged (reverse parsers rely on it)
- CLI command `cmdContextSync()` — gains `--ingest` subcommand but core unchanged

### Hook constraint: zero stdout, always exit 0

The existing hook contract (`ZERO stdout — Claude Code displays hook stdout to user`, `Always exits 0`) must be preserved in all new hook code. Merge conflicts must be logged to a file (`.planning/.sync-conflicts.log`) not to stdout.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 editor tool (Cursor only) | Reverse parser + mtime scan on hook. No daemon needed. |
| 2 editor tools (Cursor + Antigravity) | Add ag-skill-parser. pde-mcp-server handles AG change detection via fs.watch in its long-running process. |
| 3+ tools simultaneously editing | Shared lock file TTL becomes important. Consider atomic rename pattern for `.context-sync-state.json` writes to prevent torn reads. |
| High-frequency edits | Hash-based idempotency in hook already handles this. Debounce inbound checks to 500ms after last detected change. |

---

## Anti-Patterns

### Anti-Pattern 1: Bidirectional Sync on All Fields

**What people do:** Attempt to round-trip every IR field through every editor format, creating a symmetric sync.

**Why it's wrong:** The IR is lossy in most editor formats. `.mdc` rules cannot represent `design-manifest.json` token data; SKILL.md cannot represent PROJECT.md requirements. Attempting full round-trip produces phantom conflicts and data loss.

**Do this instead:** Assign clear field ownership per emitter. Each editor format only writes back the specific fields it visibly surfaces to users. Everything else flows one-way from .planning/.

### Anti-Pattern 2: Direct .planning/ writes from MCP tools without emitAll()

**What people do:** Add write tools to pde-mcp-server that patch PROJECT.md but don't trigger re-emission of editor files.

**Why it's wrong:** Editor files become stale. The next time a user looks at their `.mdc` rules, they see outdated content, undermining trust in the sync system.

**Do this instead:** Every MCP write tool handler ends with `emitAll(planningDir)` before returning. The overhead is negligible (pure Node.js file I/O, ~10ms) and guarantees consistency.

### Anti-Pattern 3: fs.watch() inside a hook process

**What people do:** Spawn a persistent file watcher from the hook to catch editor changes in real time.

**Why it's wrong:** Claude Code hooks are short-lived. Node.js won't exit while `fs.watch()` handles are open, causing the hook to hang indefinitely. Claude Code will eventually kill the hung process, potentially mid-write.

**Do this instead:** File watching belongs in the already-long-running `pde-mcp-server` process. For hooks, use the mtime comparison pattern — cheap, deterministic, no hanging processes.

### Anti-Pattern 4: Parsing user-authored sections as PDE-generated

**What people do:** Reverse parsers extract all content from editor files regardless of whether PDE wrote it.

**Why it's wrong:** Users add custom rules below PDE sections. A naive parser will attempt to write these back to .planning/ as if they were PDE-originated fields, corrupting PROJECT.md with editor-specific formatting.

**Do this instead:** Reverse parsers treat the `<!-- PDE-GENERATED | hash:... -->` marker as a section boundary. Content within PDE-generated sections is parseable. Content outside those sections (user-added) is captured in a `userAdditions` field and preserved verbatim in the output file but never written back to .planning/.

---

## Integration Boundaries

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `context-sync-hook.cjs` ↔ `context-sync.cjs` | CommonJS `require()` | Already established. New: also requires `ir-merger.cjs` |
| `ir-merger.cjs` ↔ `reverse-parsers/` | CommonJS `require()` | New internal dependency |
| `pde-mcp-server` ↔ `.planning/` | Direct file I/O | Write tools use `fs.writeFileSync` + call emitAll via handler |
| `pde-mcp-server` ↔ `.ag-inbound-delta.json` | File-based message queue | Long-running server writes; hook reads and clears |
| `conflict-resolver.cjs` ↔ `.planning/.sync-conflicts.log` | Append-only log | Conflicts logged for user review; never to stdout |

### External Integration Points

| System | Channel | Notes |
|--------|---------|-------|
| Cursor | `.cursor/rules/*.mdc` file system | Cursor reads/writes these directly. PDE detects via mtime. |
| Antigravity | `.agent/skills/pde-design/SKILL.md` + `DESIGN.md` | AG writes these files. PDE detects via fs.watch in MCP server. |
| Claude Code hooks | stdin JSON → stdout/stderr | Hook contract: zero stdout, exit 0. All new code must follow. |
| MCP protocol | StdioServerTransport (existing) | Write tools added to same server, same transport. |

---

## Build Order (Dependency-Aware)

```
Phase A: Foundation (no deps on new components)
  1. .planning/.context-sync-state.json schema + writer in context-sync.cjs
  2. Extend emitAll() to write state snapshot after each emit
  3. Tests: state file written correctly, not included in source hash

Phase B: Reverse Parsers (dep: state file schema)
  4. bin/lib/reverse-parsers/cursor-mdc-parser.cjs
  5. bin/lib/reverse-parsers/antigravity-skill-parser.cjs
  6. Tests: round-trip fidelity (emit → parse → verify field match)

Phase C: Merge Engine (deps: reverse parsers + state file)
  7. bin/lib/ir-merger.cjs (3-way merge logic)
  8. bin/lib/conflict-resolver.cjs (conflict log + policy)
  9. Tests: merge cases (no-conflict, .planning-wins, editor-wins, conflict)

Phase D: Hook Integration (deps: merge engine)
  10. Extend context-sync-hook.cjs with mtime scan + ingest path
  11. Add --ingest flag to cmdContextSync CLI command
  12. Extend hooks.json with .cursor/rules/ and .agent/ matchers
  13. Tests: end-to-end: edit .mdc → hook fires → .planning/ updated

Phase E: MCP Write Tools (deps: emitAll sync guarantee)
  14. packages/pde-mcp-server/src/tools/update-constraints.ts
  15. packages/pde-mcp-server/src/tools/update-tech-stack.ts
  16. packages/pde-mcp-server/src/tools/append-context-note.ts
  17. packages/pde-mcp-server/src/tools/flag-divergence.ts
  18. Extend index.ts with --enable-writes flag
  19. Tests: each write tool + emitAll re-emission post-write

Phase F: Antigravity Coordination (deps: all above)
  20. fs.watch in pde-mcp-server targeting .agent/ dir
  21. .ag-inbound-delta.json queue protocol
  22. Hook reads and processes delta file
  23. Tests: AG write simulation → delta queue → merge → .planning/ update
```

---

## Sources

- Code verified directly: `/bin/lib/context-sync.cjs` (emitAll, buildContextIR, PDE-GENERATED marker)
- Code verified directly: `/hooks/context-sync-hook.cjs` (hash-based idempotency, hook contract)
- Code verified directly: `/hooks/hooks.json` (PostToolUse Write|Edit matcher, async: true)
- Code verified directly: `/packages/pde-mcp-server/src/index.ts` (StdioServerTransport, 10 read-only tools)
- Code verified directly: `/bin/lib/divergence.cjs` (ANNOTATION_RE pattern, 3-tier detection)
- 3-way merge pattern: standard git merge-base algorithm adapted to IR field granularity
- fs.watch in long-running process: Node.js docs (built-in, no dependencies)
- Antigravity MCP write API: LOW confidence — not publicly documented as of March 2026; file-system channel recommended as safe fallback

---

*Architecture research for: Bidirectional Multi-Editor Context Sync (next milestone after v0.15)*
*Researched: 2026-03-24*
