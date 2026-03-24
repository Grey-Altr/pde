# Phase 131: MCP Write Tools — Research

**Researched:** 2026-03-24
**Domain:** MCP SDK tool registration, Node.js CJS filesystem writes, NDJSON audit logging
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INF-01 | pde-mcp-server accepts --enable-writes flag; absent = read-only (v0.15 behavior); present = 4 additional write tools registered; stderr log on write mode activation | Flag parsing pattern confirmed from existing --planning-dir precedent in index.ts |
| INF-02 | pde_update_constraints: overwrites PROJECT.md Constraints section; validates 1-4000 chars, no marker injection; calls emitAll() post-write; logs to mcp-writes.ndjson | replaceSectionInFile() already exported from context-sync.cjs; appendConflictLog() shows NDJSON append pattern |
| INF-03 | pde_update_tech_stack: same as INF-02 for Tech Stack section | Same replaceSectionInFile() path, fieldMap key 'Tech Stack' already used in reconcileOnStart() |
| INF-04 | pde_append_context_note: appends timestamped note to .planning/context-notes/<category>-notes.md; category enum; path traversal prevention | .planning/context-notes/ directory exists on disk; append + mkdir pattern established |
| INF-05 | pde_flag_divergence: writes component/reason/severity to divergence-flags.json; no emitAll() | JSON read-modify-write pattern; divergence-flags.json does not yet exist (new file) |
</phase_requirements>

---

## Summary

Phase 131 extends `packages/pde-mcp-server` with four write tools gated behind an `--enable-writes` CLI flag. The existing server is a compiled TypeScript ESM package (`type: "module"`) using `@modelcontextprotocol/sdk` 1.27.1 and Zod 3.25.76. Each tool follows a two-layer pattern: a thin TypeScript wrapper in `src/tools/` that defines name/description/inputSchema, and a handler implementation in `handlers.cjs` that is imported via `createRequire(import.meta.url)`.

All write operations delegate to functions already exported from `bin/lib/context-sync.cjs`. `replaceSectionInFile()` handles PROJECT.md section overwrites. `emitAll()` re-normalizes all editor files post-write. The NDJSON append pattern for audit logging is established in `appendConflictLog()` — the same pattern applies directly to `mcp-writes.ndjson`. Input validation (char limits, marker injection prevention) lives entirely in the handler layer in `handlers.cjs`, not in the Zod schema (Zod handles type coercion, not business-rule validation).

The flag gating pattern follows the existing `--planning-dir` precedent in `index.ts`: parse `process.argv` before server setup, pass a boolean into each tool factory, and conditionally register write tools only when the flag is present.

**Primary recommendation:** Add an `enableWrites` boolean parsed from `process.argv` in `index.ts`, pass it to a `registerWriteTools(server, planningDir)` function in a new `src/write-tools.ts` entry point. All write handlers live in `handlers.cjs` alongside the existing 10 read handlers, following the established CJS-in-ESM pattern.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@modelcontextprotocol/sdk` | 1.27.1 (installed) | McpServer, StdioServerTransport, registerTool | Already in use; this phase adds no new dependencies |
| `zod` | 3.25.76 (installed) | Input schema definition for MCP tools | Already in use; write tools follow the same Zod inputSchema pattern |
| Node.js built-ins (`fs`, `path`, `node:fs`) | Node.js 20+ | File I/O, atomic writes, NDJSON append | Zero-dependency constraint already established in context-sync.cjs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:test` + `node:assert/strict` | Node.js built-in | Nyquist tests | All phase tests use this exact framework (phases 126-130) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CJS handlers.cjs pattern | Native ESM in src/ | handlers.cjs allows direct CJS test imports without compilation; keeps test runner fast |
| Inline validation in Zod schema | Business-rule validation in handler | Zod schema must be a literal object for MCP SDK; runtime validation belongs in handler |

**Installation:** No new packages required. All dependencies are already installed.

**Version verification:** MCP SDK 1.27.1 and Zod 3.25.76 confirmed via `node -e "require('./package.json')"` against installed node_modules.

---

## Architecture Patterns

### Tool Registration Pattern (existing — MUST follow)

Every tool in the server is a factory function in `src/tools/<tool-name>.ts` that:
1. Creates a `require` via `createRequire(import.meta.url)` to load `handlers.cjs`
2. Returns `{ name, description, inputSchema, handler }`
3. Is imported in `index.ts` and passed to `server.registerTool(tool.name, { description, inputSchema }, tool.handler)`

Write tools follow this same pattern. The only difference is they are only imported and registered when `enableWrites === true`.

### Flag Gating Pattern (existing — MUST follow for --planning-dir precedent)

```typescript
// Source: packages/pde-mcp-server/src/index.ts (existing pattern)
const planningDirArgIdx = process.argv.indexOf('--planning-dir');
if (planningDirArgIdx !== -1 && process.argv[planningDirArgIdx + 1]) {
  planningDir = process.argv[planningDirArgIdx + 1];
  process.stderr.write(`pde-mcp-server: Using --planning-dir override: ${planningDir}\n`);
}
```

Apply the same approach for `--enable-writes`:

```typescript
// In index.ts — parsed BEFORE server.connect()
const enableWrites = process.argv.includes('--enable-writes');
if (enableWrites) {
  process.stderr.write('pde-mcp-server: Write mode enabled — 4 write tools registered\n');
}
```

### Handler Pattern (existing — MUST follow)

```typescript
// Source: packages/pde-mcp-server/src/tools/get-handoff.ts (existing pattern with params)
import { createRequire } from 'node:module';
import { z } from 'zod';

const require = createRequire(import.meta.url);

export function updateConstraintsTool(planningDir: string) {
  const handlers = require('../../handlers.cjs');
  return {
    name: 'pde_update_constraints',
    description: 'Overwrites the Constraints section of PROJECT.md and re-emits all editor context files',
    inputSchema: {
      content: z.string().describe('New constraints content (1-4000 chars)'),
    },
    handler: (params: { content: string }) =>
      handlers.handleUpdateConstraints(planningDir, params),
  };
}
```

### Write Tools Entry Point Pattern

Rather than adding 4 conditional imports to `index.ts`, use a single registration function in `src/write-tools.ts`:

```typescript
// src/write-tools.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { updateConstraintsTool } from './tools/update-constraints.js';
import { updateTechStackTool } from './tools/update-tech-stack.js';
import { appendContextNoteTool } from './tools/append-context-note.js';
import { flagDivergenceTool } from './tools/flag-divergence.js';

export function registerWriteTools(server: McpServer, planningDir: string): void {
  const writeTools = [
    updateConstraintsTool(planningDir),
    updateTechStackTool(planningDir),
    appendContextNoteTool(planningDir),
    flagDivergenceTool(planningDir),
  ];
  for (const tool of writeTools) {
    server.registerTool(tool.name, { description: tool.description, inputSchema: tool.inputSchema }, tool.handler);
  }
}
```

In `index.ts`:
```typescript
if (enableWrites) {
  registerWriteTools(server, planningDir);
}
```

### NDJSON Audit Log Pattern (from appendConflictLog in context-sync.cjs)

```javascript
// Source: bin/lib/context-sync.cjs line 1085 — appendConflictLog pattern
function appendMcpWriteLog(planningDir, entry) {
  try {
    var logPath = path.join(planningDir, 'logs', 'mcp-writes.ndjson');
    // Ensure logs/ directory exists
    fs.mkdirSync(path.join(planningDir, 'logs'), { recursive: true });
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf-8');
  } catch (err) {
    process.stderr.write('[pde-mcp] write log error: ' + err.message + '\n');
  }
}
```

Log entry shape for INF-02/INF-03:
```json
{ "ts": "2026-03-24T21:00:00.000Z", "tool": "pde_update_constraints", "section": "Constraints", "contentLen": 142, "emitResult": "ok" }
```

Log entry shape for INF-04:
```json
{ "ts": "2026-03-24T21:00:00.000Z", "tool": "pde_append_context_note", "category": "technical", "noteLen": 87 }
```

Log entry shape for INF-05:
```json
{ "ts": "2026-03-24T21:00:00.000Z", "tool": "pde_flag_divergence", "component": "Button", "severity": "medium" }
```

### replaceSectionInFile Usage (from context-sync.cjs line 1277-1283)

```javascript
// Source: bin/lib/context-sync.cjs — reconcileOnStart pattern
const fieldMap = { techStack: 'Tech Stack', constraints: 'Constraints' };
// Use 'Constraints' for pde_update_constraints
// Use 'Tech Stack' for pde_update_tech_stack
replaceSectionInFile(projectMd, fieldMap[field], mergedContent);
```

The function returns `false` when section not found (never throws). Handle the false return as an error response.

### Path Traversal Prevention for pde_append_context_note

```javascript
// Allowlist approach — do not use path.join(userInput) directly
const VALID_CATEGORIES = ['design', 'technical', 'product', 'research', 'decision'];
function handleAppendContextNote(planningDir, params) {
  if (!VALID_CATEGORIES.includes(params.category)) {
    return { content: [{ type: 'text', text: 'Invalid category' }], isError: true };
  }
  // Safe: category validated against enum before path construction
  const notesPath = path.join(planningDir, 'context-notes', `${params.category}-notes.md`);
  // ...
}
```

Never construct a path from free-form user input. Category must match enum before use.

### divergence-flags.json Write Pattern (INF-05)

```javascript
function handleFlagDivergence(planningDir, params) {
  const flagsPath = path.join(planningDir, 'divergence-flags.json');
  // Read existing or start fresh
  let flags = [];
  try {
    const raw = fs.readFileSync(flagsPath, 'utf-8');
    flags = JSON.parse(raw);
  } catch { /* file doesn't exist yet — start with empty array */ }

  flags.push({
    ts: new Date().toISOString(),
    component: params.component,
    reason: params.reason,
    severity: params.severity,
  });

  const tmpPath = flagsPath + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(flags, null, 2), 'utf-8');
  fs.renameSync(tmpPath, flagsPath);
  // NOTE: does NOT call emitAll() per INF-05
}
```

Use atomic write-rename (same pattern as `writeStateFile` in context-sync.cjs — `tmpPath + '.pid.tmp'` then `fs.renameSync`).

### Recommended Project Structure (additions only)

```
packages/pde-mcp-server/
├── src/
│   ├── index.ts                    MODIFIED — add enableWrites flag, import registerWriteTools
│   ├── write-tools.ts              NEW — registerWriteTools() function
│   └── tools/
│       ├── update-constraints.ts   NEW — tool factory
│       ├── update-tech-stack.ts    NEW — tool factory
│       ├── append-context-note.ts  NEW — tool factory
│       └── flag-divergence.ts      NEW — tool factory
├── handlers.cjs                    MODIFIED — add 4 handleXxx() functions
└── dist/                           REBUILT — npm run build
tests/
└── phase-131/
    └── test-mcp-write-tools.cjs    NEW — Nyquist tests
```

### Anti-Patterns to Avoid

- **Putting validation logic in Zod schema:** Zod `inputSchema` in MCP tools must be a static object literal. Business rules (char limits, regex validation) belong in the handler function, not the schema.
- **Using `fs.appendFileSync` without `mkdirSync`:** The `logs/` directory may not exist on first write. Always call `fs.mkdirSync(logsDir, { recursive: true })` before the append.
- **Calling emitAll() for pde_flag_divergence:** INF-05 explicitly says no emitAll. Divergence flags are not part of editor context. Do not add it.
- **Using `path.join(planningDir, userInput)` for context-notes path:** Always validate category against `VALID_CATEGORIES` enum before constructing the path.
- **Importing context-sync.cjs in TypeScript source files directly:** The established pattern is handlers.cjs loads its dependencies via CJS require. The TypeScript layer stays thin (name/description/schema only).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Section replacement in PROJECT.md | Custom regex | `replaceSectionInFile()` from context-sync.cjs (already exported) | Handles heading detection, body replacement, next-heading boundary; tested in phases 128-129 |
| emitAll post-write | Custom emitter calls | `emitAll(cwd)` from context-sync.cjs (already exported) | Handles all 6 emitters + writeStateFile atomically |
| Atomic file writes | `writeFileSync` directly | `writeFileSync(tmp) + renameSync(tmp, dest)` pattern from writeStateFile | Prevents corrupt state on crash mid-write |
| NDJSON append | Custom log format | `fs.appendFileSync(path, JSON.stringify(entry) + '\n')` — exact pattern from `appendConflictLog` | Established audit format in this codebase |

**Key insight:** This phase is thin — it adds a flag gate and 4 tool registrations. The actual write logic is already battle-tested in context-sync.cjs. The risk is accidentally reimplementing what already exists.

---

## Common Pitfalls

### Pitfall 1: Build Required Before Testing
**What goes wrong:** Editing `.ts` source files and testing without rebuilding. `dist/index.js` is what runs; `src/` is not the runtime entry point.
**Why it happens:** TypeScript is compiled to `dist/`; the `bin` field in package.json points to `dist/index.js`.
**How to avoid:** Run `npm run build` from `packages/pde-mcp-server/` after every TypeScript change. Tests that import `handlers.cjs` directly bypass this issue.
**Warning signs:** Handler changes have no effect when running the server binary.

### Pitfall 2: enableWrites Check After server.connect()
**What goes wrong:** Registering tools after `server.connect()` — MCP SDK may not surface them to the client.
**Why it happens:** Natural reading order in index.ts places connect() last.
**How to avoid:** All `server.registerTool()` calls MUST precede `server.connect(transport)`. Flag check and write tool registration must occur in the setup block before transport connect.
**Warning signs:** Tools registered but not visible to MCP client.

### Pitfall 3: replaceSectionInFile Returns false — Not an Exception
**What goes wrong:** Handler calls `replaceSectionInFile()` without checking return value, silently no-ops when section is missing.
**Why it happens:** The function signature returns `boolean`, not `void`, but callers may ignore the return.
**How to avoid:** Check `if (!replaceSectionInFile(...)) { return { isError: true, content: [...] }; }` in all three PROJECT.md write handlers.
**Warning signs:** Tool returns success but PROJECT.md is unchanged.

### Pitfall 4: emitAll() Needs the Project Root (cwd), Not planningDir
**What goes wrong:** Calling `emitAll(planningDir)` instead of `emitAll(cwd)` — emitAll internally computes `path.join(cwd, '.planning')`, so passing planningDir double-nests the path.
**Why it happens:** Handlers receive `planningDir` as their primary argument, but emitAll() takes `cwd`.
**How to avoid:** Derive `cwd` as `path.dirname(planningDir)` in the handler before calling `emitAll(cwd)`.
**Warning signs:** emitAll writes to `.planning/.planning/` paths, silently creating wrong directories.

### Pitfall 5: Marker Injection Validation Must Block `<!--` and `-->`
**What goes wrong:** Attacker passes `content` containing `<!-- PDE-GENERATED | hash:... -->` which corrupts loop-break detection.
**Why it happens:** HTML comment syntax is valid in Markdown; no automatic escaping occurs.
**How to avoid:** Validate that `content` does not contain `<!--` or `PDE-GENERATED` before writing. Return `isError: true` if detected.
**Warning signs:** emitAll loop-break misfires after a write.

### Pitfall 6: context-notes Directory May Not Have Category Files
**What goes wrong:** `fs.appendFileSync` on a file inside a subdirectory fails if the parent directory does not exist.
**Why it happens:** `.planning/context-notes/` exists (verified on disk) but `<category>-notes.md` files may not exist yet — `appendFileSync` creates the file but NOT missing parent directories.
**How to avoid:** Call `fs.mkdirSync(path.join(planningDir, 'context-notes'), { recursive: true })` before the append. This is a no-op if the directory already exists.
**Warning signs:** ENOENT error on first note for any category.

---

## Code Examples

### Complete handler skeleton for pde_update_constraints (INF-02)

```javascript
// Source: handlers.cjs addition — follows established handler pattern
async function handleUpdateConstraints(planningDir, params) {
  const content = params && params.content;
  if (!content || typeof content !== 'string') {
    return { content: [{ type: 'text', text: 'Parameter "content" is required' }], isError: true };
  }
  // INF-02: 1-4000 char validation
  if (content.length < 1 || content.length > 4000) {
    return { content: [{ type: 'text', text: `Content must be 1-4000 chars, got ${content.length}` }], isError: true };
  }
  // INF-02: No marker injection
  if (content.includes('<!--') || content.includes('PDE-GENERATED')) {
    return { content: [{ type: 'text', text: 'Content must not contain HTML comment markers' }], isError: true };
  }

  const projectMd = path.join(planningDir, 'PROJECT.md');
  const replaced = replaceSectionInFile(projectMd, 'Constraints', content);
  if (!replaced) {
    return { content: [{ type: 'text', text: 'Constraints section not found in PROJECT.md' }], isError: true };
  }

  // INF-02: emitAll post-write
  const cwd = path.dirname(planningDir);
  let emitStatus = 'ok';
  try {
    emitAll(cwd);
  } catch (err) {
    emitStatus = 'error: ' + err.message;
  }

  // INF-02: NDJSON audit log
  appendMcpWriteLog(planningDir, {
    ts: new Date().toISOString(),
    tool: 'pde_update_constraints',
    section: 'Constraints',
    contentLen: content.length,
    emitResult: emitStatus,
  });

  return { content: [{ type: 'text', text: 'Constraints updated and context re-emitted' }] };
}
```

### Write tools TypeScript factory pattern

```typescript
// Source: pattern from src/tools/get-handoff.ts — add params type
import { createRequire } from 'node:module';
import { z } from 'zod';

const require = createRequire(import.meta.url);

export function updateConstraintsTool(planningDir: string) {
  const handlers = require('../../handlers.cjs');
  return {
    name: 'pde_update_constraints',
    description: 'Overwrites the Constraints section of PROJECT.md, validates content, and re-emits all editor context files',
    inputSchema: {
      content: z.string().describe('New constraints content (1–4000 characters). No HTML comment markers.'),
    },
    handler: (params: { content: string }) =>
      handlers.handleUpdateConstraints(planningDir, params),
  };
}
```

### Timestamped note append for pde_append_context_note (INF-04)

```javascript
async function handleAppendContextNote(planningDir, params) {
  const VALID_CATEGORIES = ['design', 'technical', 'product', 'research', 'decision'];
  const category = params && params.category;
  const note = params && params.note;

  if (!category || !VALID_CATEGORIES.includes(category)) {
    return { content: [{ type: 'text', text: `Category must be one of: ${VALID_CATEGORIES.join(', ')}` }], isError: true };
  }
  if (!note || typeof note !== 'string' || note.trim().length === 0) {
    return { content: [{ type: 'text', text: 'Parameter "note" is required and must not be empty' }], isError: true };
  }

  // Path traversal prevention: category is validated against enum — safe to use in path
  const notesDir = path.join(planningDir, 'context-notes');
  fs.mkdirSync(notesDir, { recursive: true });

  const notesPath = path.join(notesDir, `${category}-notes.md`);
  const timestamp = new Date().toISOString();
  const entry = `\n## ${timestamp}\n\n${note.trim()}\n`;

  fs.appendFileSync(notesPath, entry, 'utf-8');

  // INF-04: emitAll post-write
  const cwd = path.dirname(planningDir);
  emitAll(cwd);

  appendMcpWriteLog(planningDir, {
    ts: timestamp,
    tool: 'pde_append_context_note',
    category,
    noteLen: note.length,
  });

  return { content: [{ type: 'text', text: `Note appended to ${category}-notes.md` }] };
}
```

---

## Environment Availability

Step 2.6: Minimal external dependency check performed.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | System node (20+) | — |
| `@modelcontextprotocol/sdk` | Tool registration | Yes | 1.27.1 (installed) | — |
| `zod` | Input schema | Yes | 3.25.76 (installed) | — |
| TypeScript compiler (`tsc`) | Build step | Yes | 5.x (devDep, installed) | — |
| `.planning/context-notes/` | pde_append_context_note | Yes | Directory exists | — |
| `.planning/divergence-flags.json` | pde_flag_divergence | No (not yet created) | — | Handler creates on first write |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** `divergence-flags.json` — handler creates it on first write with an empty array seed.

---

## Validation Architecture

nyquist_validation is enabled (config.json `workflow.nyquist_validation: true`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` + `node:assert/strict` (Node.js built-in) |
| Config file | None — run directly with `node` |
| Quick run command | `node tests/phase-131/test-mcp-write-tools.cjs` |
| Full suite command | `node tests/phase-131/test-mcp-write-tools.cjs` |

Tests use CJS (`require`) to import `handlers.cjs` directly — no TypeScript compilation needed for tests. This is the established pattern in all phases 126-130.

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INF-01 | Starting without --enable-writes = no write tools visible | unit (argv check) | `node tests/phase-131/test-mcp-write-tools.cjs` | No — Wave 0 |
| INF-01 | Starting with --enable-writes = write tools registered + stderr log | unit (argv check) | `node tests/phase-131/test-mcp-write-tools.cjs` | No — Wave 0 |
| INF-02 | pde_update_constraints with valid content — replaces section, calls emitAll, logs NDJSON | unit (handler isolation) | `node tests/phase-131/test-mcp-write-tools.cjs` | No — Wave 0 |
| INF-02 | pde_update_constraints with content > 4000 chars — returns isError | unit | `node tests/phase-131/test-mcp-write-tools.cjs` | No — Wave 0 |
| INF-02 | pde_update_constraints with `<!--` injection — returns isError | unit | `node tests/phase-131/test-mcp-write-tools.cjs` | No — Wave 0 |
| INF-02 | pde_update_constraints — mcp-writes.ndjson entry written | unit | `node tests/phase-131/test-mcp-write-tools.cjs` | No — Wave 0 |
| INF-03 | pde_update_tech_stack with valid content — replaces Tech Stack section | unit | `node tests/phase-131/test-mcp-write-tools.cjs` | No — Wave 0 |
| INF-04 | pde_append_context_note with valid category/note — appended with timestamp | unit | `node tests/phase-131/test-mcp-write-tools.cjs` | No — Wave 0 |
| INF-04 | pde_append_context_note with invalid category — returns isError | unit | `node tests/phase-131/test-mcp-write-tools.cjs` | No — Wave 0 |
| INF-04 | pde_append_context_note path traversal prevention | unit | `node tests/phase-131/test-mcp-write-tools.cjs` | No — Wave 0 |
| INF-05 | pde_flag_divergence — writes entry to divergence-flags.json | unit | `node tests/phase-131/test-mcp-write-tools.cjs` | No — Wave 0 |
| INF-05 | pde_flag_divergence — does NOT call emitAll() | unit | `node tests/phase-131/test-mcp-write-tools.cjs` | No — Wave 0 |
| INF-05 | pde_flag_divergence — component pattern validation | unit | `node tests/phase-131/test-mcp-write-tools.cjs` | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `node tests/phase-131/test-mcp-write-tools.cjs`
- **Per wave merge:** `node tests/phase-131/test-mcp-write-tools.cjs`
- **Phase gate:** All tests green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-131/test-mcp-write-tools.cjs` — covers INF-01 through INF-05 (13 tests)

---

## Open Questions

1. **Does `replaceSectionInFile` need to be exported from handlers.cjs or should handlers.cjs require it from context-sync.cjs?**
   - What we know: `replaceSectionInFile` is already exported from `context-sync.cjs`. `handlers.cjs` currently has its own `safeReadFile` rather than importing from `core.cjs`.
   - What's unclear: Whether the handler should inline the require path or if there's a cleaner factoring.
   - Recommendation: In `handlers.cjs`, require `context-sync.cjs` only for `replaceSectionInFile` and `emitAll`. Use `path.join(__dirname, '..', '..', 'bin', 'lib', 'context-sync.cjs')` — same relative path resolution as `artifact-format.cjs` in `getGenerateTailwindTheme()`.

2. **Should mcp-writes.ndjson go in `.planning/logs/` or `.planning/` root?**
   - What we know: `.sync-conflicts.log` is at `.planning/.sync-conflicts.log` (root). `sync-reconciliation.log` is in `.planning/logs/`.
   - Recommendation: Use `.planning/logs/mcp-writes.ndjson` — consistent with INF-02 spec wording and the structured logs directory pattern from phase 129.

---

## Sources

### Primary (HIGH confidence)
- Direct source code reading: `packages/pde-mcp-server/src/index.ts` — tool registration pattern, `--planning-dir` flag precedent
- Direct source code reading: `packages/pde-mcp-server/src/tools/get-handoff.ts` — parameterized tool factory pattern with Zod
- Direct source code reading: `packages/pde-mcp-server/handlers.cjs` — handler return shape `{ content: [{ type: 'text', text }], isError? }`
- Direct source code reading: `bin/lib/context-sync.cjs` lines 1085-1092 — `appendConflictLog` NDJSON pattern
- Direct source code reading: `bin/lib/context-sync.cjs` lines 1184-1197 — `replaceSectionInFile` implementation
- Direct source code reading: `bin/lib/context-sync.cjs` lines 1145-1171 — `emitAll(cwd)` signature and return
- `npm view` against installed node_modules — @modelcontextprotocol/sdk 1.27.1, zod 3.25.76

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` INF-01 through INF-05 — authoritative spec for this phase
- `.planning/STATE.md` Accumulated Context — prior decisions including "MCP server stays read-only by default; --enable-writes flag required for write tools"

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; confirmed installed versions
- Architecture: HIGH — all patterns derived from reading actual source; no assumptions
- Pitfalls: HIGH — derived from code analysis (replaceSectionInFile return value, emitAll cwd vs planningDir)

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable — Node.js built-ins, MCP SDK patterns unlikely to change)
