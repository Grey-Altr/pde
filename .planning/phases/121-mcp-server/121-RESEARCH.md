# Phase 121: MCP Server - Research

**Researched:** 2026-03-23
**Domain:** @modelcontextprotocol/sdk v1.x — TypeScript MCP server, stdio transport, npx distribution
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- MCP server isolated in subdirectory to preserve zero-npm-dependency constraint at plugin root
- Read-only MCP contract enforced from design phase — no write tools to avoid second write path
- 10 tools: get-project, get-design-state, get-manifest, get-tokens, get-handoff, get-artifact, get-roadmap, get-requirements, get-pipeline-status, list-artifacts
- get-tokens serves Tailwind v4 @theme format via DTCG-to-Tailwind conversion (Phase 120 artifact-format.cjs)
- Pipeline status exposed as MCP resource (passive context)
- npx distribution via package.json bin field
- stdio transport (standard for local MCP servers)
- MCP SDK v1.x (v2 deferred to v0.16 if it ships)

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

### Deferred Ideas (OUT OF SCOPE)
None — discuss phase skipped.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MCP-01 | Standalone MCP server package in isolated subdirectory with @modelcontextprotocol/sdk, TypeScript, stdio transport | SDK API patterns verified; isolated subdirectory layout documented |
| MCP-02 | Server exposes 10 read-only tools: get-project, get-design-state, get-manifest, get-tokens, get-handoff, get-artifact, get-roadmap, get-requirements, get-pipeline-status, list-artifacts | Tool registration API verified; .planning/ artifact paths identified for each tool |
| MCP-03 | Server distributable via npx pde-mcp-server with automatic .planning/ directory discovery | npx bin field pattern verified; walk-up discovery algorithm documented |
| MCP-04 | Pipeline status exposed as MCP resource (passive context) for editor consumption | MCP resource vs tool distinction verified; registerResource() API documented |
| MCP-05 | Design tokens served as Tailwind v4 @theme format via get-tokens tool with DTCG-to-Tailwind conversion | generateTailwindTheme() from artifact-format.cjs confirmed reusable; import path identified |
</phase_requirements>

---

## Summary

Phase 121 builds a standalone MCP server package in an isolated subdirectory (e.g., `packages/pde-mcp-server/`) that exposes PDE state to any MCP-compatible editor. The server uses `@modelcontextprotocol/sdk` v1.x with `McpServer` and `StdioServerTransport`, compiled from TypeScript and distributed via `npx pde-mcp-server`.

The critical implementation constraint is subdirectory isolation: the plugin root enforces a zero-npm-dependency rule, so all npm dependencies (`@modelcontextprotocol/sdk`, `zod`, `typescript`) must live inside the MCP server's own `package.json`. The server reads the same `.planning/` directory structure that `pde-tools.cjs` already reads, so data access patterns are well-established. The `generateTailwindTheme()` function from Phase 120's `artifact-format.cjs` is directly reusable for the `get-tokens` tool.

The MCP SDK v1.x (latest: 1.26.0 as of research date) uses `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js` with a `server.registerTool()` / `server.registerResource()` API. Tools return `{ content: [{ type: 'text', text }] }` and resources return `{ contents: [{ uri, text }] }`. All 10 tools are read-only file readers — no writes, no network.

**Primary recommendation:** Build `packages/pde-mcp-server/` as a self-contained TypeScript package. Compile to `dist/index.js` with shebang, publish with `bin: { "pde-mcp-server": "./dist/index.js" }`. Tool implementations require `.planning/` files; use a walk-up algorithm from `process.cwd()` to find the project root.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @modelcontextprotocol/sdk | ^1.26.0 | MCP server protocol (McpServer, StdioServerTransport) | Official SDK maintained by Anthropic; v1.x stable for production; v2 deferred |
| zod | ^3.25+ | Input schema validation for tool parameters | Required by SDK; v1.x is compatible with zod v3.25+ |
| typescript | ^5.x | TypeScript compilation | Standard for MCP server packages |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node built-ins (fs, path, os) | — | .planning/ file reading | All tool implementations; zero dep constraint preserved inside dist/index.js |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| McpServer (high-level) | Server (low-level) | McpServer simplifies tool/resource registration; low-level Server requires manual schema/handler dispatch |
| ESM ("type": "module") | CJS | ESM is standard for new TypeScript packages; note the existing plugin uses CJS but the MCP server is a separate package — ESM is fine here |

**Installation (inside `packages/pde-mcp-server/`):**
```bash
npm install @modelcontextprotocol/sdk zod
npm install -D typescript @types/node
```

---

## Architecture Patterns

### Recommended Project Structure
```
packages/
└── pde-mcp-server/
    ├── src/
    │   ├── index.ts         # Entry point: McpServer setup, tool/resource registration, StdioServerTransport
    │   ├── discover.ts      # .planning/ directory discovery (walk-up from process.cwd())
    │   ├── tools/
    │   │   ├── get-project.ts
    │   │   ├── get-design-state.ts
    │   │   ├── get-manifest.ts
    │   │   ├── get-tokens.ts
    │   │   ├── get-handoff.ts
    │   │   ├── get-artifact.ts
    │   │   ├── get-roadmap.ts
    │   │   ├── get-requirements.ts
    │   │   ├── get-pipeline-status.ts
    │   │   └── list-artifacts.ts
    │   └── resources/
    │       └── pipeline-status.ts  # MCP resource (passive context)
    ├── dist/                # Compiled output (gitignored)
    ├── package.json         # Independent dependencies
    └── tsconfig.json        # Compiles src/ → dist/
```

### Pattern 1: McpServer Tool Registration
**What:** Register read-only tools using `server.registerTool()` with zod input schemas.
**When to use:** All 10 PDE tools — each reads one or more .planning/ files and returns text content.
**Example:**
```typescript
// Source: https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/README.md
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const server = new McpServer({ name: 'pde-mcp-server', version: '1.0.0' });

server.registerTool(
  'get-project',
  {
    description: 'Returns the PDE PROJECT.md contents describing project identity, tech stack, and constraints',
    inputSchema: {},   // no parameters for most tools
  },
  async () => {
    const content = safeReadFile(path.join(planningDir, 'PROJECT.md'));
    if (!content) return { content: [{ type: 'text', text: 'PROJECT.md not found' }], isError: true };
    return { content: [{ type: 'text', text: content }] };
  }
);
```

### Pattern 2: MCP Resource Registration (Pipeline Status)
**What:** Register pipeline status as a passive resource (not a callable tool). Resources expose ambient context that editors can surface proactively.
**When to use:** MCP-04 requirement — pipeline status resource.
**Example:**
```typescript
// Source: https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/README.md
server.registerResource(
  'pipeline-status',
  'pde://pipeline-status',
  {
    description: 'Current PDE pipeline stage and design coverage from DESIGN-STATE.md and design-manifest.json',
    mimeType: 'application/json',
  },
  async (uri) => {
    const state = safeReadFile(path.join(planningDir, 'design', 'DESIGN-STATE.md'));
    const manifest = safeReadFile(path.join(planningDir, 'design', 'design-manifest.json'));
    const data = {
      designState: state || null,
      manifest: manifest ? JSON.parse(manifest) : null,
    };
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      }],
    };
  }
);
```

### Pattern 3: StdioServerTransport and Entry Point
**What:** Wire McpServer to stdio transport for local process spawning.
**When to use:** Always — stdio is the locked transport choice.
**Example:**
```typescript
// Source: https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/README.md
#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// ... register tools and resources ...
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Pattern 4: .planning/ Directory Discovery
**What:** Walk up from `process.cwd()` to find the project root containing `.planning/`.
**When to use:** All tools — the server is invoked from the user's project directory (or the editor sets cwd).
**Example:**
```typescript
// Source: pattern derived from standard monorepo root-finding conventions
import * as fs from 'node:fs';
import * as path from 'node:path';

export function discoverPlanningDir(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, '.planning');
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
  return null;
}
```

### Pattern 5: get-tokens Tool Using artifact-format.cjs
**What:** Read DTCG tokens JSON from .planning/design/ and return Tailwind v4 @theme block.
**When to use:** MCP-05 requirement.
**Example:**
```typescript
// Source: artifact-format.cjs generateTailwindTheme() — Phase 120
// NOTE: artifact-format.cjs is CJS; when the MCP server is ESM, use createRequire
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { generateTailwindTheme } = require('../../../bin/lib/artifact-format.cjs');

server.registerTool(
  'get-tokens',
  {
    description: 'Returns design tokens as Tailwind v4 @theme CSS block from DTCG token source',
    inputSchema: {},
  },
  async () => {
    const manifestRaw = safeReadFile(path.join(planningDir, 'design', 'design-manifest.json'));
    if (!manifestRaw) return { content: [{ type: 'text', text: 'No design manifest found' }], isError: true };
    const manifest = JSON.parse(manifestRaw);
    const tokensPath = manifest?.artifacts?.tokens;
    if (!tokensPath) return { content: [{ type: 'text', text: 'No tokens artifact in manifest' }] };
    const raw = safeReadFile(tokensPath);
    if (!raw) return { content: [{ type: 'text', text: 'Tokens file not found' }], isError: true };
    const tokens = JSON.parse(raw);
    const theme = generateTailwindTheme(tokens);
    return { content: [{ type: 'text', text: theme }] };
  }
);
```

### Pattern 6: package.json for npx Distribution
```json
{
  "name": "pde-mcp-server",
  "version": "0.1.0",
  "description": "MCP server for querying PDE project state from any MCP-compatible editor",
  "type": "module",
  "bin": {
    "pde-mcp-server": "./dist/index.js"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.26.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

### Pattern 7: tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Anti-Patterns to Avoid
- **Including @modelcontextprotocol/sdk in the root package.json:** Violates the zero-npm-dependency constraint at the plugin root. All SDK deps live in `packages/pde-mcp-server/package.json` only.
- **Write tools:** Out of scope by design (see Requirements Out of Scope table). Any attempt to add mutation tools violates the read-only contract.
- **Hardcoded .planning/ path:** Use the walk-up discovery algorithm — the server may be invoked from any directory.
- **Not adding the shebang:** Without `#!/usr/bin/env node` as the first line of `dist/index.js`, `npx pde-mcp-server` will fail to execute.
- **Using server.tool() (legacy):** Prefer `server.registerTool()` — the newer API supports the `title` metadata field needed for editor display.
- **Resource for get-pipeline-status tool:** Pipeline status is BOTH a resource (MCP-04) AND a tool (get-pipeline-status in MCP-02). Implement both: the resource for passive ambient context, the tool for explicit on-demand query.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MCP protocol framing, tool dispatch, JSON-RPC | Custom stdin/stdout JSON-RPC handler | @modelcontextprotocol/sdk McpServer | Protocol has capability negotiation, pagination, error codes, schema introspection |
| Input validation for tool parameters | Custom type-checking | Zod schemas in registerTool() | SDK validates automatically and surfaces schema to editors |
| DTCG-to-Tailwind conversion | Re-implement token converter | generateTailwindTheme() from bin/lib/artifact-format.cjs | Phase 120 already implemented and tested; use createRequire() to bridge ESM→CJS |

**Key insight:** The entire MCP protocol layer is handled by the SDK. Tool implementations are just file reads + JSON.parse/stringify. Resist the urge to add protocol logic.

---

## Common Pitfalls

### Pitfall 1: Shebang Missing From Compiled Output
**What goes wrong:** `npx pde-mcp-server` fails with "not executable" or executes as a text file.
**Why it happens:** TypeScript compiles `src/index.ts` → `dist/index.js` but strips or moves the shebang.
**How to avoid:** Add `#!/usr/bin/env node` as the first line of `src/index.ts`. Verify it appears as line 1 of `dist/index.js` after compilation. If `tsc` strips it, add a `postbuild` script: `"postbuild": "echo '#!/usr/bin/env node' | cat - dist/index.js > tmp && mv tmp dist/index.js && chmod +x dist/index.js"`.
**Warning signs:** `npx pde-mcp-server` returns "command not found" or "permission denied" rather than starting the server.

### Pitfall 2: .planning/ Discovery Returns Null
**What goes wrong:** All tools return "not found" errors because the walk-up algorithm doesn't find `.planning/`.
**Why it happens:** MCP editors may spawn the server process from the editor's own working directory, not the user's project root.
**How to avoid:** Log the resolved `planningDir` to stderr on startup. Provide a `--planning-dir` CLI arg override as fallback. Document in README that users should configure the MCP server with the project root as `cwd`.
**Warning signs:** All tool calls return error responses despite `.planning/` existing in the project.

### Pitfall 3: CJS/ESM Interop for artifact-format.cjs
**What goes wrong:** `import { generateTailwindTheme } from '../../../bin/lib/artifact-format.cjs'` fails in ESM context.
**Why it happens:** The plugin root uses CJS (`'use strict'`); if the MCP package uses `"type": "module"`, named imports from `.cjs` files require `createRequire`.
**How to avoid:** Use `import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);` then `const { generateTailwindTheme } = require(resolvedPath)`. Alternatively, keep the MCP server as CJS (`"type": "commonjs"`) to avoid the interop entirely.
**Warning signs:** `SyntaxError: Named export not found` when importing from `.cjs` files.

### Pitfall 4: Double-Publishing to Root package.json
**What goes wrong:** The root plugin package picks up `@modelcontextprotocol/sdk` as a dependency, breaking the zero-npm-dependency constraint.
**Why it happens:** Confusion about which package.json to modify.
**How to avoid:** The root directory has no package.json (verified in project scan). The MCP server's package.json at `packages/pde-mcp-server/package.json` is the only one to modify.
**Warning signs:** A new package.json appears at the repo root, or npm install is run from the project root.

### Pitfall 5: Resource URI Scheme Conflicts
**What goes wrong:** Editor rejects the resource or fails to render it.
**Why it happens:** MCP resource URIs must be unique and follow a scheme. Generic URIs like `status://` may collide with other servers.
**How to avoid:** Use a namespaced scheme: `pde://pipeline-status`. This matches the project name and avoids collisions.
**Warning signs:** Editor MCP panel shows two resources with identical URIs when multiple servers are registered.

---

## Code Examples

### Minimal Runnable Server Structure
```typescript
// Source: https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/README.md
#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { discoverPlanningDir } from './discover.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

const planningDir = discoverPlanningDir(process.cwd());
if (!planningDir) {
  process.stderr.write('pde-mcp-server: No .planning/ directory found\n');
  process.exit(1);
}

const server = new McpServer({
  name: 'pde-mcp-server',
  version: '0.1.0',
});

// Register all 10 tools + 1 resource ...

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Tool With No Input (most tools)
```typescript
// Source: https://blog.agentailor.com/posts/mcp-typescript-sdk-complete-guide
server.registerTool(
  'get-design-state',
  {
    description: 'Returns the current PDE pipeline stage from DESIGN-STATE.md',
    inputSchema: {},
  },
  async () => {
    const content = safeReadFile(path.join(planningDir, 'design', 'DESIGN-STATE.md'));
    if (!content) return { content: [{ type: 'text', text: 'DESIGN-STATE.md not found' }], isError: true };
    return { content: [{ type: 'text', text: content }] };
  }
);
```

### Tool With String Parameter (get-artifact, get-handoff)
```typescript
// Source: https://blog.agentailor.com/posts/mcp-typescript-sdk-complete-guide
server.registerTool(
  'get-artifact',
  {
    description: 'Returns the contents of a named design artifact',
    inputSchema: {
      name: z.string().describe('Artifact name from the design manifest (e.g. "tokens", "wireframes")'),
    },
  },
  async ({ name }) => {
    const manifestRaw = safeReadFile(path.join(planningDir, 'design', 'design-manifest.json'));
    if (!manifestRaw) return { content: [{ type: 'text', text: 'No manifest found' }], isError: true };
    const manifest = JSON.parse(manifestRaw);
    const artifactPath = manifest?.artifacts?.[name];
    if (!artifactPath) return { content: [{ type: 'text', text: `Artifact "${name}" not in manifest` }] };
    const content = safeReadFile(artifactPath);
    if (!content) return { content: [{ type: 'text', text: `Artifact file not found at ${artifactPath}` }], isError: true };
    return { content: [{ type: 'text', text: content }] };
  }
);
```

### list-artifacts Tool
```typescript
// Lists all artifact keys from design-manifest.json
server.registerTool(
  'list-artifacts',
  { description: 'Lists all available design artifacts by name', inputSchema: {} },
  async () => {
    const manifestRaw = safeReadFile(path.join(planningDir, 'design', 'design-manifest.json'));
    if (!manifestRaw) return { content: [{ type: 'text', text: '[]' }] };
    const manifest = JSON.parse(manifestRaw);
    const keys = Object.keys(manifest?.artifacts || {});
    return { content: [{ type: 'text', text: JSON.stringify(keys) }] };
  }
);
```

---

## Tool-to-File Mapping

Each of the 10 required tools maps to specific .planning/ files:

| Tool | File(s) Read | Notes |
|------|-------------|-------|
| get-project | `.planning/PROJECT.md` | Direct read |
| get-design-state | `.planning/design/DESIGN-STATE.md` | Direct read |
| get-manifest | `.planning/design/design-manifest.json` | Return as JSON string |
| get-tokens | `.planning/design/design-manifest.json` → tokens artifact path | Requires generateTailwindTheme() |
| get-handoff | `.planning/design/handoff/*.md` | Accept optional `name` param; list dir if no param |
| get-artifact | `.planning/design/design-manifest.json` → artifact path | Requires `name` param |
| get-roadmap | `.planning/ROADMAP.md` | Direct read |
| get-requirements | `.planning/REQUIREMENTS.md` | Direct read |
| get-pipeline-status | `.planning/design/DESIGN-STATE.md` + `design-manifest.json` | JSON summary |
| list-artifacts | `.planning/design/design-manifest.json` | Returns artifact key array |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| server.tool() method | server.registerTool() | SDK v1.x | New API has title + better metadata for editor display |
| Manual JSON-RPC dispatch | McpServer high-level API | SDK v1.0 | Handles capability negotiation and tool dispatch automatically |
| HTTP transport for local servers | stdio transport | MCP spec | stdio is the universal standard for local process-based servers |

**Deprecated/outdated:**
- `server.tool()` / `server.resource()`: Still functional for backwards compatibility but `registerTool()` / `registerResource()` is the preferred API in v1.x.
- MCP SDK v2 (main branch): Anticipated stable in Q1 2026 per Anthropic; v1.x locked per CONTEXT.md decision.

---

## Open Questions

1. **CJS vs ESM for the MCP server package**
   - What we know: The project root is CJS; artifact-format.cjs uses `'use strict'` with `module.exports`
   - What's unclear: Whether ESM is preferred for clean SDK imports or CJS is simpler for CJS interop
   - Recommendation: Default to CJS (`"type": "commonjs"`) to avoid createRequire complexity when importing artifact-format.cjs. The MCP SDK works with both.

2. **Handoff files discovery (get-handoff with no param)**
   - What we know: `.planning/design/handoff/` may contain multiple `.md` files
   - What's unclear: Whether get-handoff should require a name param, list all files, or return concatenated content when no param given
   - Recommendation: Accept optional `name` param. If omitted, list available handoff files. If provided, return that file's content.

3. **package name for npx**
   - What we know: CONTEXT.md specifies `npx pde-mcp-server`
   - What's unclear: Whether this is a public npm package name or private
   - Recommendation: Use `"name": "pde-mcp-server"` in package.json to match the npx command. Treat as unpublished initially; document local install path for Claude Code's `claude mcp add` command.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node:test`) |
| Config file | none — run directly |
| Quick run command | `node --test tests/phase-121/test-mcp-server.cjs` |
| Full suite command | `node --test tests/phase-118/test-context-sync.cjs tests/phase-119/test-antigravity-stitch.cjs tests/phase-120/test-artifact-format.cjs tests/phase-121/test-mcp-server.cjs` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MCP-01 | Isolated package structure with correct package.json fields (bin, type, files) | unit | `node --test tests/phase-121/test-mcp-server.cjs` | ❌ Wave 0 |
| MCP-02 | All 10 tools registered; each returns correct content from mock .planning/ fixtures | unit | `node --test tests/phase-121/test-mcp-server.cjs` | ❌ Wave 0 |
| MCP-03 | discoverPlanningDir() walks up from cwd and finds .planning/ | unit | `node --test tests/phase-121/test-mcp-server.cjs` | ❌ Wave 0 |
| MCP-04 | Pipeline resource registered with correct URI and returns JSON with designState + manifest | unit | `node --test tests/phase-121/test-mcp-server.cjs` | ❌ Wave 0 |
| MCP-05 | get-tokens returns @theme { } block from DTCG token fixture via generateTailwindTheme() | unit | `node --test tests/phase-121/test-mcp-server.cjs` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/phase-121/test-mcp-server.cjs`
- **Per wave merge:** Full suite command above
- **Phase gate:** Full suite green before `/pde:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-121/test-mcp-server.cjs` — covers MCP-01 through MCP-05
- [ ] `packages/pde-mcp-server/` — directory and package.json scaffold

**Note:** The MCP server's TypeScript compilation (`tsc`) is not part of the test runner. Tests import the tool handler functions directly (CJS) or test the discovery module. Build verification is manual.

---

## Sources

### Primary (HIGH confidence)
- `github.com/modelcontextprotocol/typescript-sdk` v1.x branch — McpServer API, StdioServerTransport, import paths
- `github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/README.md` — Tool/resource registration signatures
- `bin/lib/artifact-format.cjs` (local) — generateTailwindTheme() API verified via source read
- `bin/lib/context-sync.cjs` (local) — IR builder pattern for .planning/ reading
- `.planning/design/design-manifest.json` (local) — Artifact registry schema for get-manifest, get-artifact, get-tokens

### Secondary (MEDIUM confidence)
- `blog.agentailor.com/posts/mcp-typescript-sdk-complete-guide` — registerTool/registerResource API examples; verified against SDK docs
- `aihero.dev/publish-your-mcp-server-to-npm` — bin field, shebang, prepublishOnly pattern; verified against npm docs

### Tertiary (LOW confidence)
- MCP SDK v1.26.0 version number from WebSearch result snippet — not independently verified against npm registry

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — SDK import paths and API verified against official GitHub v1.x branch
- Architecture: HIGH — follows established Phase 118-120 patterns; isolated subdirectory constraint clear
- Pitfalls: HIGH — CJS/ESM interop and shebang issues are concrete, well-documented Node.js problems
- Tool-to-file mapping: HIGH — .planning/ files inspected directly; manifest schema confirmed

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (SDK is fast-moving; v2 anticipated but locked out per CONTEXT.md)
