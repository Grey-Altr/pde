# Phase 163: CLI Ingestion + Capability Model - Research

**Researched:** 2026-03-28
**Domain:** API spec ingestion (OpenAPI, JSON Schema, GraphQL, MCP) + AI SDK tool generation
**Confidence:** HIGH

## Summary

Phase 163 builds the `/pde:ingest` skill command plus four CJS parser modules and a Zod-based code generator. The inputs are API specs in four formats; the output is a unified `capability-model.json` plus a `.ts` file of AI SDK `tool()` exports. All tooling is already available in the project — the MCP SDK is installed in `packages/pde-mcp-server/`, Zod v4.3.6 is in root `node_modules/`, and `tsc` v5.9.3 is in `packages/pde-mcp-server/node_modules/.bin/`. No new npm dependencies are required for the core parsers; only YAML support for OpenAPI specs delivered as `.yaml`/`.yml` files would need a new package, but the context decisions do not require YAML support (JSON/remote fetch only is implied by the spec-type detection rules).

The four parsers have distinct I/O patterns: OpenAPI and JSON Schema read local or remote JSON files using Node 20's built-in `fetch()`; GraphQL hits a live HTTP endpoint via introspection query (falling back to a `.graphql` file); MCP uses `@modelcontextprotocol/sdk` v1.27.1 `Client` + `StdioClientTransport` to call `client.listTools()`. All four map their results into the same flat `{ meta, capabilities[] }` shape. Code generation walks the collected JSON Schema trees for each capability's `inputSchema` and emits Zod v4 builder calls (`z.object`, `z.string`, `z.number`, `z.array`, `z.enum`, `z.boolean`, `z.optional`) plus a stub `execute` function using `fetch()` or `client.callTool()` as appropriate. The generated `.ts` file is type-checked with `tsc --noEmit` using the compiler at `packages/pde-mcp-server/node_modules/.bin/tsc` (TypeScript 5.9.3).

**Primary recommendation:** Build each parser as an independent `bin/lib/cli-anything/parsers/{type}.cjs` module that exports a single `async function parse(source): Promise<Capability[]>` function. Keep the capability model assembler and code generator as separate modules. Wire everything through a `bin/lib/cli-anything/ingest.cjs` orchestrator that auto-detects spec type and delegates. Expose the orchestrator as a new `case 'cli-anything'` block in `bin/pde-tools.cjs`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Invocation Interface**
- `/pde:ingest <spec-path>` skill command — consistent with all other PDE commands
- Auto-detect spec type from file extension + content sniffing (.json to OpenAPI/JSON Schema via presence of `openapi` key, .graphql to GraphQL, mcp:// to MCP)
- Accept both local files and HTTP(S) URLs for remote specs, MCP server addresses for MCP introspection
- Output unified capability model to `.planning/cli-anything/{slug}/capability-model.json`

**Capability Model Schema**
- Top-level structure: `{ meta: {source, type, version, auth}, capabilities: [{name, description, inputSchema, outputSchema, method, path, extensions}] }` — flat capability array with metadata
- `extensions` object per capability for source-specific data (e.g., GraphQL type info, HTTP method/path)
- `meta.auth` section captures auth schemes from the spec (apiKey, bearer, oauth)
- Validate generated model against a Zod schema before writing — fail fast on malformed output

**Parser Architecture**
- One CJS module per spec type in `bin/lib/cli-anything/parsers/` (openapi.cjs, jsonschema.cjs, graphql.cjs, mcp.cjs)
- GraphQL: try introspection query on live endpoint first, fall back to .graphql/.gql file parsing
- MCP: use `@modelcontextprotocol/sdk` client to connect via stdio/SSE transport, call `tools/list`
- Large specs (1000+ endpoints): chunk into batches, generate capability model incrementally, warn if >500 capabilities

**AI SDK Tool Generation**
- Output `.ts` file with named exports — one `tool()` call per capability
- Walk JSON Schema tree to emit Zod builder calls — pure codegen, no runtime dependency on json-schema-to-zod
- Generate stub execute functions with fetch() for REST, GraphQL query for GQL, MCP tool call for MCP
- Run `tsc --noEmit` on generated .ts files as post-generation type-safety check

### Claude's Discretion
No items deferred to Claude's discretion — all grey areas resolved by user.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CLI-01 | User can ingest an OpenAPI spec and produce a unified capability model | openapi.cjs parser: reads OpenAPI 3.x `paths` object, maps each operation to a capability with method/path/inputSchema/outputSchema |
| CLI-02 | User can ingest a JSON Schema file and produce a unified capability model | jsonschema.cjs parser: maps top-level `properties` or root schema to capabilities; `definitions`/`$defs` become individual capabilities |
| CLI-03 | User can ingest a GraphQL endpoint (introspection) and produce a unified capability model | graphql.cjs parser: sends standard `IntrospectionQuery` via HTTP POST, maps Query/Mutation fields to capabilities; offline fallback reads `.graphql` file |
| CLI-04 | User can introspect any MCP server and produce a unified capability model | mcp.cjs parser: `Client` + `StdioClientTransport` then `client.listTools()` then map `tools[].inputSchema` to capabilities |
| CLI-05 | User can generate AI SDK tool() definitions from any unified capability model | codegen.cjs: reads capability-model.json, emits named `tool()` export per capability with correct `inputSchema:` property |
| CLI-06 | Generated tool definitions include Zod inputSchema and typed execute functions | JSON Schema to Zod codegen: `z.object({...})` walker; stub `execute: async (input) => fetch(...)` typed by input shape; `tsc --noEmit` validates |
</phase_requirements>

## Standard Stack

### Core (all already available — no new installations needed for core path)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@modelcontextprotocol/sdk` | 1.27.1 | MCP client for `tools/list` introspection | Already installed in `packages/pde-mcp-server/node_modules/`; provides `Client`, `StdioClientTransport`, `SSEClientTransport` |
| `zod` | 4.3.6 | Capability model validation + Zod codegen target | Already in root `node_modules/`; used throughout PDE |
| Node.js built-in `fetch` | Node 20.20.0 | HTTP requests for remote OpenAPI specs, GraphQL introspection | Native — no dependency needed |
| Node.js built-in `fs` | Node 20.20.0 | Local file reading | Native |
| TypeScript (`tsc`) | 5.9.3 | Post-generation type-safety check (`tsc --noEmit`) | Available at `packages/pde-mcp-server/node_modules/.bin/tsc` |
| `vitest` | 4.1.1 | Test framework | Already in root `node_modules/`; config at `vitest.config.ts` |

### Optional (only if YAML OpenAPI support is needed — not in phase scope per decisions)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `yaml` | 2.8.3 (current npm) | Parse YAML OpenAPI specs | Only if `.yaml`/`.yml` file support is added — NOT in scope for this phase per decisions (JSON + HTTP only) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled JSON Schema to Zod codegen | `json-schema-to-zod` npm package | User explicitly decided pure codegen — avoids runtime dep, more control, but codegen must cover common schema types |
| Hand-rolled GraphQL introspection | `graphql` npm package (v16) | `graphql` provides `buildClientSchema`/`getIntrospectionQuery` helpers but adds ~350KB dep; bare HTTP POST + manual field walking is simpler and sufficient here |
| `StdioClientTransport` for MCP | `SSEClientTransport` / `StreamableHTTPClientTransport` | SSE/StreamableHTTP are for remote servers over HTTP; stdio is for local process spawning — use based on address format |

**Installation:** No new npm installs needed for core implementation. `@modelcontextprotocol/sdk` must be required from `packages/pde-mcp-server/node_modules/` path (not root).

**Version verification (confirmed 2026-03-28):**
- `@modelcontextprotocol/sdk`: 1.27.1 (installed in `packages/pde-mcp-server/`)
- `zod`: 4.3.6 (installed in root `node_modules/`)
- `vitest`: 4.1.1 (installed in root `node_modules/`)
- `typescript`: 5.9.3 (installed in `packages/pde-mcp-server/node_modules/`)
- Node.js: 20.20.0 (built-in `fetch` available, no polyfill needed)

## Architecture Patterns

### Recommended Project Structure

```
bin/lib/cli-anything/
├── ingest.cjs           # Orchestrator: auto-detect -> delegate -> validate -> write
├── detect.cjs           # Spec type detection (extension + content sniffing)
├── model.cjs            # Capability model Zod schema + validator
├── codegen.cjs          # JSON Schema -> Zod builder calls + tool() template
└── parsers/
    ├── openapi.cjs      # OpenAPI 3.x paths -> capabilities[]
    ├── jsonschema.cjs   # JSON Schema properties/$defs -> capabilities[]
    ├── graphql.cjs      # GraphQL introspection -> capabilities[]
    └── mcp.cjs          # MCP tools/list -> capabilities[]

commands/
└── ingest.md            # /pde:ingest command definition

.planning/cli-anything/
└── {slug}/
    ├── capability-model.json
    └── tools.ts
```

### Pattern 1: Spec Type Auto-Detection

**What:** Determine parser to use from file extension, URL scheme, and JSON content keys
**When to use:** Entry point of `ingest.cjs` before any parser is loaded

```javascript
// Source: verified by testing detection logic 2026-03-28
function detectSpecType(source, parsedContent) {
  // URL scheme detection first
  if (source.startsWith('mcp://')) return 'mcp';

  // Extension detection
  if (source.endsWith('.graphql') || source.endsWith('.gql')) return 'graphql';

  // Content sniffing on parsed JSON
  if (parsedContent) {
    if (parsedContent.openapi) return 'openapi';    // OpenAPI 3.x
    if (parsedContent.swagger) return 'openapi';    // Swagger 2.x (normalize same)
    if (parsedContent.$schema || parsedContent.type || parsedContent.properties) {
      return 'jsonschema';
    }
  }

  // HTTP URL without content yet: try GraphQL introspection first, fall back to OpenAPI
  if (source.startsWith('http://') || source.startsWith('https://')) return 'http-probe';

  return 'unknown';
}
```

### Pattern 2: OpenAPI 3.x Parser

**What:** Map `paths` + `components.schemas` to flat capability array
**When to use:** When spec type is `openapi`

```javascript
// Source: OpenAPI 3.1.0 spec structure, verified 2026-03-28
function parseOpenAPI(spec) {
  const capabilities = [];
  for (const [path, pathItem] of Object.entries(spec.paths || {})) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
      const op = pathItem[method];
      if (!op) continue;
      const inputSchema = buildInputSchema(op.parameters, op.requestBody, spec.components);
      const outputSchema = buildOutputSchema(op.responses, spec.components);
      capabilities.push({
        name: op.operationId || `${method}_${path.replace(/\W+/g, '_')}`,
        description: op.summary || op.description || '',
        inputSchema,
        outputSchema,
        method: method.toUpperCase(),
        path,
        extensions: { operationId: op.operationId, tags: op.tags || [] }
      });
    }
  }
  return capabilities;
}
```

**Key pitfall:** OpenAPI uses `$ref` pointers to `#/components/schemas/Foo`. The parser must resolve `$ref` values before building `inputSchema`. A simple recursive resolver against `spec.components.schemas` is sufficient — no external ref-parser needed since inlined specs are the common case.

### Pattern 3: MCP Parser (critical path)

**What:** Spawn or connect to MCP server, call `listTools()`, map tool list to capabilities
**When to use:** When source starts with `mcp://`

```javascript
// Source: verified against @modelcontextprotocol/sdk 1.27.1 dist/cjs/ 2026-03-28
// CJS require paths confirmed working — SDK is in packages/pde-mcp-server/node_modules/

const SDK_BASE = path.join(
  __dirname,
  '../../../../packages/pde-mcp-server/node_modules/@modelcontextprotocol/sdk/dist/cjs'
);
const { Client } = require(path.join(SDK_BASE, 'client/index.js'));
const { StdioClientTransport } = require(path.join(SDK_BASE, 'client/stdio.js'));

async function parseMCP(serverCommand, serverArgs) {
  const client = new Client({ name: 'pde-ingest', version: '0.1.0' });
  const transport = new StdioClientTransport({ command: serverCommand, args: serverArgs || [] });
  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description || '',
      inputSchema: tool.inputSchema || { type: 'object', properties: {} },
      outputSchema: null,
      method: null,
      path: null,
      extensions: { transport: 'stdio' }
    }));
  } finally {
    await transport.close().catch(() => {});
  }
}
```

### Pattern 4: GraphQL Introspection Parser

**What:** POST a standard introspection query to a GraphQL HTTP endpoint, map Query/Mutation fields to capabilities
**When to use:** When source is an HTTP URL to a GraphQL endpoint, or a `.graphql` file

```javascript
// Source: GraphQL spec introspection query structure, verified 2026-03-28
const INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      queryType { name }
      mutationType { name }
      types {
        name kind description
        fields(includeDeprecated: false) {
          name description
          args { name description type { name kind ofType { name kind } } }
          type { name kind ofType { name kind ofType { name kind } } }
        }
      }
    }
  }
`;

async function parseGraphQL(endpoint) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: INTROSPECTION_QUERY }),
  });
  const { data } = await res.json();
  const schema = data.__schema;
  const rootTypeNames = new Set([
    schema.queryType?.name,
    schema.mutationType?.name,
  ].filter(Boolean));
  const rootTypes = schema.types.filter(t => rootTypeNames.has(t.name));
  // Map root type fields to capabilities
  return rootTypes.flatMap(type =>
    (type.fields || []).map(field => ({
      name: field.name,
      description: field.description || '',
      inputSchema: argsToJsonSchema(field.args || []),
      outputSchema: gqlTypeToJsonSchema(field.type),
      method: null,
      path: null,
      extensions: { parentType: type.name, returnType: field.type }
    }))
  );
}
```

### Pattern 5: JSON Schema to Zod Codegen Walker

**What:** Recursively walk a JSON Schema object and emit Zod v4 builder call string
**When to use:** During `codegen.cjs` to build `inputSchema` expression for each capability

```javascript
// Source: verified against Zod 4.3.6 API 2026-03-28
// Key Zod v4 facts: z.enum() takes array (NOT object), .describe() and .optional() chain correctly
function jsonSchemaToZod(schema, depth) {
  if (!schema || typeof schema !== 'object') return 'z.unknown()';
  if (depth > 8) return 'z.unknown()'; // depth guard against circular refs

  switch (schema.type) {
    case 'string': {
      if (schema.enum) {
        return `z.enum([${schema.enum.map(v => JSON.stringify(v)).join(', ')}])`;
      }
      const s = schema.description
        ? `z.string().describe(${JSON.stringify(schema.description)})`
        : 'z.string()';
      return s;
    }
    case 'number':
    case 'integer':
      return schema.description
        ? `z.number().describe(${JSON.stringify(schema.description)})`
        : 'z.number()';
    case 'boolean':
      return 'z.boolean()';
    case 'array':
      return `z.array(${jsonSchemaToZod(schema.items || {}, depth + 1)})`;
    case 'object': {
      if (!schema.properties) return 'z.record(z.unknown())';
      const required = new Set(schema.required || []);
      const fields = Object.entries(schema.properties)
        .map(([k, v]) => {
          const fieldExpr = jsonSchemaToZod(v, depth + 1);
          const optionalSuffix = required.has(k) ? '' : '.optional()';
          return `  ${k}: ${fieldExpr}${optionalSuffix}`;
        })
        .join(',\n');
      return `z.object({\n${fields}\n})`;
    }
    default:
      if (schema.enum) {
        return `z.enum([${schema.enum.map(v => JSON.stringify(v)).join(', ')}])`;
      }
      return 'z.unknown()';
  }
}
```

### Pattern 6: Generated tools.ts File Structure

**What:** A `.ts` file with AI SDK `tool()` named exports, one per capability
**When to use:** Output of codegen phase; placed in `.planning/cli-anything/{slug}/tools.ts`

The generated file format (this is output for end-user projects, not PDE itself):

```
// Auto-generated by /pde:ingest
// Source: https://api.example.com/openapi.json
// Generated: 2026-03-28
// WARNING: stub execute functions — customize before production use

import { tool } from 'ai';
import { z } from 'zod';

export const createUser = tool({
  description: 'Create a new user account',
  inputSchema: z.object({
    username: z.string().describe('The username'),
    email: z.string().describe('The email address'),
    age: z.number().optional(),
  }),
  execute: async (input) => {
    const res = await fetch('https://api.example.com/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return res.json();
  },
});
```

**AI SDK tool() confirmed signature (verified ai-sdk.dev 2026-03-28):**
- `description: string` — purpose of the tool
- `inputSchema: ZodSchema` — use `z.object({...})` built by the codegen walker
- `execute: async (input) => result` — input type is inferred from inputSchema
- Property is `inputSchema:` NOT `parameters:` (old v3 name, will fail tsc)

### Pattern 7: Capability Model Zod Validation Schema

**What:** Validate the assembled capability model before writing to disk
**When to use:** After all parsers complete, before writing `capability-model.json`

```javascript
// Source: verified against Zod 4.3.6 2026-03-28
const { z } = require('zod'); // from root node_modules

const CapabilitySchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()).nullable(),
  method: z.string().nullable(),
  path: z.string().nullable(),
  extensions: z.record(z.unknown()),
});

const CapabilityModelSchema = z.object({
  meta: z.object({
    source: z.string(),
    type: z.enum(['openapi', 'jsonschema', 'graphql', 'mcp']),
    version: z.string(),
    auth: z.record(z.unknown()),
    generatedAt: z.string(),
  }),
  capabilities: z.array(CapabilitySchema),
});
```

### Pattern 8: tsc --noEmit Validation

**What:** Run TypeScript compiler on the generated `.ts` file to confirm it is type-correct
**When to use:** After writing `tools.ts`, as the CLI-06 success criterion

```javascript
// Source: confirmed tsc at packages/pde-mcp-server/node_modules/.bin/tsc 2026-03-28
const { execSync } = require('child_process');
const path = require('path');

const TSC_BIN = path.join(
  __dirname,
  '../../../../packages/pde-mcp-server/node_modules/.bin/tsc'
);

function typeCheckGeneratedFile(outputDir) {
  // outputDir contains tools.ts + tsconfig.validate.json + node_modules/ai
  const tsconfigPath = path.join(outputDir, 'tsconfig.validate.json');
  try {
    execSync(`"${TSC_BIN}" --noEmit -p "${tsconfigPath}"`, { stdio: 'pipe' });
    return { ok: true };
  } catch (err) {
    return { ok: false, output: err.stdout?.toString() || err.stderr?.toString() || err.message };
  }
}
```

The `tsconfig.validate.json` in the output directory should include:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["tools.ts"]
}
```

The `ai` package must be present for the import to resolve. Options (in order of preference):
1. Add `"ai": "^6.0.0"` to root `package.json` devDependencies — cleanest, available globally
2. Run `npm install ai` in the output directory before tsc check — isolated but slower
3. Emit a stub `declare module 'ai' { export function tool(def: any): any; }` alongside tools.ts — no install needed but less accurate

### Anti-Patterns to Avoid

- **Requiring `@modelcontextprotocol/sdk` from root `node_modules/`:** It is NOT installed there — only in `packages/pde-mcp-server/node_modules/`. Use explicit absolute require paths.
- **Treating all GraphQL types as capabilities:** Only fields on `queryType` and `mutationType` root types map to callable operations. Input types, interfaces, scalars, and enums are schema components, not capabilities.
- **Generating `z.enum({ a: 'a', b: 'b' })`:** Zod v4 uses `z.enum(['a', 'b'])` (array). The object form is `z.nativeEnum()` for TypeScript enums. Using the object form produces a TypeScript error.
- **Using `parameters:` in generated tool() calls:** AI SDK v4+ renamed this to `inputSchema:`. Any generated file using `parameters:` will fail `tsc --noEmit`.
- **Not closing MCP transport after listTools:** `StdioClientTransport` spawns a child process. Always call `transport.close()` in a `finally` block or the process hangs.
- **Skipping `$ref` resolution in OpenAPI:** Copy-pasting `$ref` strings into the capability model produces invalid capability models; the Zod codegen walker will fall back to `z.unknown()` for every unresolved field.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MCP server connection + handshake | Custom stdio JSON-RPC | `Client` + `StdioClientTransport` from `@modelcontextprotocol/sdk` | SDK handles `initialize` handshake, capability negotiation, pagination cursor on `tools/list` |
| TypeScript compilation | Shell string parsing of tsc output | `execSync` on the binary path with `stdio: 'pipe'` | Binary handles all tsconfig resolution and error formatting |
| Capability model validation | Ad-hoc field presence checks | Zod `.safeParse()` with `CapabilityModelSchema` | Structured errors, consistent with existing PDE patterns |
| Slug generation | Custom string sanitize | `node bin/pde-tools.cjs generate-slug <text>` | Already implemented, handles all edge cases consistently |
| Output directory creation | Manual `fs.mkdirSync` sequence | `fs.mkdirSync(dir, { recursive: true })` | One call, idempotent |

**Key insight:** The two genuinely custom pieces are (1) the JSON Schema to Zod code string walker and (2) the spec-type auto-detector. Everything else uses existing infrastructure.

## Runtime State Inventory

SKIPPED — this is a greenfield feature phase, not a rename/refactor/migration. No runtime state to inventory.

## Environment Availability Audit

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 20+ (built-in fetch) | All parsers | ✓ | 20.20.0 | — |
| `@modelcontextprotocol/sdk` | mcp.cjs parser | ✓ | 1.27.1 (packages/pde-mcp-server/node_modules/) | — |
| `zod` | Model validation, codegen target | ✓ | 4.3.6 (root node_modules/) | — |
| `tsc` (TypeScript) | Post-generation type check | ✓ | 5.9.3 (packages/pde-mcp-server/node_modules/.bin/) | — |
| `vitest` | Tests | ✓ | 4.1.1 (root node_modules/) | — |
| `ai` npm package | Generated tools.ts type check | ✗ | — | Stub `declare module 'ai'` alongside tools.ts (less accurate), or install as root devDep |
| Live GraphQL endpoint | CLI-03 integration test | ✗ (no local server) | — | Use public endpoint (countries.trevorblades.com) or mock fetch in unit tests |
| Live MCP server | CLI-04 integration test | ✓ | pde-mcp-server 0.1.0 | Can use pde-mcp-server as the test target |

**Missing dependencies with no fallback:** None that block core implementation.

**Missing dependencies with fallback:**
- `ai` package: add `"ai": "^6.0.0"` to root `package.json` devDependencies in Wave 0. This is the cleanest option and makes the type check accurate.
- Live GraphQL endpoint for CLI-03: mock `fetch` in unit tests using vitest `vi.stubGlobal('fetch', mockFn)` with a fixture introspection response.

## Common Pitfalls

### Pitfall 1: MCP SDK Require Path

**What goes wrong:** `require('@modelcontextprotocol/sdk/...')` throws `MODULE_NOT_FOUND` at runtime.
**Why it happens:** The SDK is only in `packages/pde-mcp-server/node_modules/`, not root `node_modules/`. CJS `require()` walks up from the calling file's directory and never reaches that nested location.
**How to avoid:** In `mcp.cjs`, build the require path using `path.join(__dirname, '../../../../packages/pde-mcp-server/node_modules/@modelcontextprotocol/sdk/dist/cjs/client/index.js')` and use `require()` with the absolute path.
**Warning signs:** `MODULE_NOT_FOUND` error mentioning `@modelcontextprotocol/sdk` at parse time.

### Pitfall 2: OpenAPI $ref Resolution

**What goes wrong:** `inputSchema` in the capability model contains `{ "$ref": "#/components/schemas/X" }` strings instead of resolved schema objects.
**Why it happens:** The OpenAPI parser copies parameter/requestBody schemas verbatim without resolving `$ref` pointers.
**How to avoid:** Before emitting a capability's `inputSchema`, walk the object recursively: when encountering `{ "$ref": "#/components/schemas/X" }`, replace it with `spec.components.schemas[X]`. Add a visited-set depth guard against circular refs (return `{}` at depth > 8).
**Warning signs:** Capability model JSON contains `$ref` strings; Zod codegen emits `z.unknown()` for most fields.

### Pitfall 3: Zod v4 enum() Syntax

**What goes wrong:** Codegen emits `z.enum({ foo: 'foo', bar: 'bar' })` which is a TypeScript/runtime error.
**Why it happens:** Zod v3 accepted both array and object forms; Zod v4 only accepts arrays for `z.enum()`.
**How to avoid:** Always emit `z.enum([...])` with a JSON array when building from JSON Schema `enum` arrays. Confirmed working: `z.enum(['a', 'b', 'c'])`.
**Warning signs:** `tsc --noEmit` reports type error on enum fields in generated file.

### Pitfall 4: AI SDK tool() Parameter Name

**What goes wrong:** Generated `.ts` file uses `parameters:` and fails `tsc --noEmit` with "Object literal may only specify known properties".
**Why it happens:** Pre-v4 AI SDK used `parameters`, renamed to `inputSchema` in current versions (v6.0.141 current).
**How to avoid:** Codegen always emits `inputSchema:` — never `parameters:`. Verified correct property name against ai-sdk.dev docs 2026-03-28.
**Warning signs:** `tsc --noEmit` reports `parameters` as unknown property on tool() argument.

### Pitfall 5: MCP Transport Not Closed

**What goes wrong:** `/pde:ingest` command hangs after producing output because the spawned MCP server child process is still alive.
**Why it happens:** `StdioClientTransport` spawns the server as a child process. The parent process waits for it unless explicitly closed.
**How to avoid:** Always `await transport.close()` in a `finally` block after `listTools()`. Set a connect timeout to fail fast if server is unresponsive.
**Warning signs:** Command prints capability model but does not return to shell prompt.

### Pitfall 6: GraphQL Introspection on Non-GraphQL HTTP Endpoints

**What goes wrong:** Parser sends introspection query to an OpenAPI REST endpoint, gets 404 or HTML, throws JSON parse error.
**Why it happens:** Auto-detection for plain HTTP URLs can't distinguish GraphQL from REST before fetching.
**How to avoid:** For HTTP URLs: attempt introspection, check if response JSON has `data.__schema`. If yes, proceed as GraphQL. If no, re-fetch and sniff for `openapi`/`swagger` keys. If neither, fail with a clear error.
**Warning signs:** `JSON.parse` error or `TypeError: Cannot read properties of undefined (reading '__schema')`.

## Code Examples

### Verified: MCP Client listTools

```javascript
// Source: verified @modelcontextprotocol/sdk 1.27.1 dist/cjs/ 2026-03-28
// Client.exports confirmed: { Client, getSupportedElicitationModes }
// StdioClientTransport.exports confirmed: { StdioClientTransport }
// client.listTools() confirmed: returns { tools: Array<{ name, description, inputSchema }> }

const SDK_CJS = path.join(
  __dirname,
  '../../../../packages/pde-mcp-server/node_modules/@modelcontextprotocol/sdk/dist/cjs'
);
const { Client } = require(path.join(SDK_CJS, 'client/index.js'));
const { StdioClientTransport } = require(path.join(SDK_CJS, 'client/stdio.js'));

async function listMCPTools(command, args) {
  const client = new Client({ name: 'pde-ingest', version: '0.1.0' });
  const transport = new StdioClientTransport({ command, args: args || [] });
  try {
    await client.connect(transport);
    const result = await client.listTools();
    return result.tools; // Array<{ name, description, inputSchema }>
  } finally {
    await transport.close().catch(() => {});
  }
}
```

### Verified: Zod v4 Model Validation

```javascript
// Source: verified zod 4.3.6 root node_modules/ 2026-03-28
// safeParse returns { success: boolean, data?, error?: { issues: [...] } }

function validateCapabilityModel(data) {
  const result = CapabilityModelSchema.safeParse(data);
  if (!result.success) {
    const issues = JSON.stringify(result.error.issues, null, 2);
    throw new Error(`Invalid capability model: ${issues}`);
  }
  return result.data;
}
```

### Verified: Node 20 Built-in fetch for Remote Specs

```javascript
// Source: confirmed Node 20.20.0 has fetch natively 2026-03-28 (typeof fetch === 'function')

async function fetchRemoteSpec(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json();
}
```

### Verified: pde-tools.cjs Subcommand Pattern

```javascript
// Source: verified pde-tools.cjs switch/case routing pattern 2026-03-28
// Add a new top-level case block in the main switch statement

case 'cli-anything': {
  const { cmdIngest } = require('./lib/cli-anything/ingest.cjs');
  const subcommand = args[1];
  if (subcommand === 'ingest') {
    await cmdIngest(cwd, args.slice(2));
  } else {
    error(`Unknown cli-anything subcommand: ${subcommand}. Available: ingest`);
  }
  break;
}
```

### Verified: vitest fetch Mock for GraphQL Tests

```javascript
// Source: vitest 4.1.1 API — vi.stubGlobal works in CJS test files
// Use in graphql-parser.test.cjs to avoid live network dependency

import { vi, describe, it, expect, beforeEach } from 'vitest';

const MOCK_INTROSPECTION = {
  data: {
    __schema: {
      queryType: { name: 'Query' },
      mutationType: null,
      types: [{
        name: 'Query', kind: 'OBJECT', description: '',
        fields: [{
          name: 'user',
          description: 'Get a user by ID',
          args: [{ name: 'id', description: 'User ID', type: { name: 'String', kind: 'SCALAR', ofType: null } }],
          type: { name: 'User', kind: 'OBJECT', ofType: null }
        }]
      }]
    }
  }
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => MOCK_INTROSPECTION,
  }));
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AI SDK `parameters:` on tool() | `inputSchema:` on tool() | AI SDK v4+ (current: v6.0.141) | Codegen must emit `inputSchema:` or tsc check fails |
| Zod v3 `z.enum({ a: 'a' })` object form | Zod v4 `z.enum(['a'])` array only | Zod v4.0 | Codegen must use array form for z.enum |
| MCP SSE transport (legacy) | StreamableHTTPClientTransport preferred for remote | MCP 2025-03-26 spec | For stdio (this phase): StdioClientTransport is still canonical |
| OpenAPI 2.x (Swagger) `swagger:` key | OpenAPI 3.x `openapi:` key | Wide adoption 2020+ | Parser handles both; normalizes to same capability shape |
| GraphQL `getIntrospectionQuery` from graphql package | Hand-written introspection query string | N/A (never required the package) | Avoids graphql npm dep; query is stable and short |

**Deprecated/outdated:**
- AI SDK `parameters:` property on `tool()`: replaced by `inputSchema:` — any generated code using `parameters:` fails `tsc --noEmit`
- `json-schema-to-zod` as a runtime dep: user decided pure codegen approach — emit Zod code strings from the JSON Schema walker

## Open Questions

1. **`ai` package for tsc validation**
   - What we know: `ai` is not installed anywhere in PDE. The generated `tools.ts` imports from `'ai'`.
   - What's unclear: Whether to install globally or use a stub declaration.
   - Recommendation: Add `"ai": "^6.0.0"` to root `package.json` devDependencies in Wave 0. Clean, no stubs, accurate type checking.

2. **`mcp://` URL format convention**
   - What we know: The CONTEXT.md specifies `mcp://` as the address prefix for MCP servers.
   - What's unclear: The exact parsing — is `mcp://node/path/to/server.js` the intended format? Or `mcp://node path/to/server.js` (with space)?
   - Recommendation: Define and document a clear convention in the command help text: `mcp://COMMAND ARGS...` where everything after `mcp://` up to a space is the command, and the rest are args. Example: `mcp://node ./server.js --port 3000`.

3. **JSON Schema file with multiple `$defs` — one capability or many?**
   - What we know: CLI-02 targets standalone JSON Schema files. OpenAPI uses JSON Schema internally.
   - What's unclear: Whether top-level `$defs` entries each become a capability, or the root schema is one capability.
   - Recommendation: Treat each top-level `$defs` entry as a separate capability (one per operation shape). If the file has no `$defs` and only a root schema with `properties`, produce a single capability named after the slug.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run tests/phase-163/` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLI-01 | OpenAPI spec produces capability model with all endpoints | unit | `npx vitest run tests/phase-163/openapi-parser.test.cjs` | ❌ Wave 0 |
| CLI-02 | JSON Schema file produces capability model | unit | `npx vitest run tests/phase-163/jsonschema-parser.test.cjs` | ❌ Wave 0 |
| CLI-03 | GraphQL introspection produces capability model | unit (mocked fetch) | `npx vitest run tests/phase-163/graphql-parser.test.cjs` | ❌ Wave 0 |
| CLI-04 | MCP tools/list produces capability model | integration (pde-mcp-server) | `npx vitest run tests/phase-163/mcp-parser.test.cjs` | ❌ Wave 0 |
| CLI-05 | Capability model produces tools.ts with correct exports | unit | `npx vitest run tests/phase-163/codegen.test.cjs` | ❌ Wave 0 |
| CLI-06 | Generated tools.ts compiles without TypeScript errors | integration (tsc) | `npx vitest run tests/phase-163/tsc-check.test.cjs` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/phase-163/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-163/openapi-parser.test.cjs` — covers CLI-01; use a minimal inline OpenAPI 3.0 fixture with 2-3 operations
- [ ] `tests/phase-163/jsonschema-parser.test.cjs` — covers CLI-02; use an inline JSON Schema fixture with `$defs`
- [ ] `tests/phase-163/graphql-parser.test.cjs` — covers CLI-03; mock `fetch` via `vi.stubGlobal` with a fixture introspection response
- [ ] `tests/phase-163/mcp-parser.test.cjs` — covers CLI-04; spawn `pde-mcp-server` as test target (it has `tools/list` handler)
- [ ] `tests/phase-163/codegen.test.cjs` — covers CLI-05; assert generated .ts contains `export const`, `inputSchema:`, `execute:`
- [ ] `tests/phase-163/tsc-check.test.cjs` — covers CLI-06; write fixture tools.ts, run tsc --noEmit, assert exit code 0
- [ ] Wave 0 must add `"ai": "^6.0.0"` to root `package.json` devDependencies and run `npm install` for tsc-check tests

## Project Constraints (from CLAUDE.md)

CLAUDE.md does not exist at the project root. The following constraints apply from STATE.md and CONTEXT.md:

- All v0.20 services must use free or open-source toolchains — no paid API keys required
- CJS modules (`.cjs`) in `bin/` and `bin/lib/` — all new parsers and orchestrator follow this convention
- JSON output with structured metadata following event bus NDJSON pattern
- Output to `.planning/` directory for all generated artifacts
- `pde-tools.cjs` subcommand pattern — new `cli-anything` case block in the main switch

## Sources

### Primary (HIGH confidence)
- `packages/pde-mcp-server/node_modules/@modelcontextprotocol/sdk/dist/cjs/` — verified `Client` exports, `StdioClientTransport` constructor, `SSEClientTransport`, `StreamableHTTPClientTransport`; confirmed `client.listTools()` signature returns `{ tools: Array }`
- `node_modules/zod/` — verified Zod v4.3.6 API: all standard types present, `z.enum()` takes array, `.describe()` and `.optional()` chain correctly
- `packages/pde-mcp-server/node_modules/.bin/tsc --version` — confirmed TypeScript 5.9.3 available for `--noEmit` check
- `vitest.config.ts` + `node_modules/vitest/` — confirmed vitest 4.1.1, `tests/**/*.{test,spec}.{cjs,mjs,js,ts}` include pattern
- Node.js 20.20.0 — confirmed `typeof fetch === 'function'` natively
- `bin/pde-tools.cjs` — verified switch/case subcommand routing pattern
- `bin/lib/manifest.cjs`, `bin/lib/design.cjs` — verified CJS `'use strict'` + `module.exports` pattern

### Secondary (MEDIUM confidence)
- ai-sdk.dev docs (fetched 2026-03-28) — confirmed `tool()` uses `inputSchema:` (not `parameters:`), `execute:` types inferred from inputSchema; current AI SDK version 6.0.141
- OpenAPI 3.1.0 spec (standard) — `paths` object structure, `$ref` resolution pattern, auth scheme locations (`securitySchemes`)

### Tertiary (LOW confidence)
- GraphQL introspection query field structure: based on GraphQL spec knowledge; validate against a real endpoint before treating as authoritative
- countries.trevorblades.com as a test GraphQL endpoint: not verified for uptime; use mocked fetch in tests instead

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against installed packages by direct node -e inspection
- Architecture: HIGH — patterns verified against existing CJS modules, SDK dist source, and Zod v4 runtime behavior
- Pitfalls: HIGH — MCP require path, Zod enum syntax, AI SDK parameter rename all directly verified
- Validation architecture: HIGH — vitest config, test include patterns, and test directory structure verified

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable ecosystem — SDK and Zod v4 are stable releases)
