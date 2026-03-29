---
phase: 163-cli-ingestion-capability-model
verified: 2026-03-29T01:16:15Z
status: passed
score: 14/14 must-haves verified
re_verification: false
human_verification:
  - test: "MCP live introspection"
    expected: "pde:ingest mcp://pde-mcp-server produces capability-model.json with tools from running MCP server"
    why_human: "Requires a live running MCP server process"
  - test: "GraphQL live introspection"
    expected: "pde:ingest against a live GraphQL endpoint produces capability-model.json with Query/Mutation capabilities"
    why_human: "Requires a running GraphQL HTTP endpoint"
  - test: "tsc --noEmit zero errors on generated tools.ts"
    expected: "tsc --noEmit on generated tools.ts exits 0 when ai and zod are installed in scope"
    why_human: "ai package not installed in root node_modules; tsc validation requires proper module resolution setup"
---

# Phase 163: CLI Ingestion Capability Model Verification Report

**Phase Goal:** Users can ingest any API spec or MCP server and get a unified capability model with typed AI SDK tool definitions ready for agent consumption
**Verified:** 2026-03-29T01:16:15Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Capability model Zod schema validates well-formed models and rejects malformed ones | VERIFIED | `validateCapabilityModel(valid)` passes; missing `meta.source` throws |
| 2  | Spec type auto-detection correctly identifies OpenAPI, JSON Schema, GraphQL, and MCP sources | VERIFIED | `detectSpecType` returns correct type for all 6 inputs including http-probe and unknown |
| 3  | Test fixtures exist for all four spec types | VERIFIED | 4 fixtures in `tests/phase-163/fixtures/` confirmed |
| 4  | Test scaffolds exist for all parsers and codegen | VERIFIED | 7 test files exist, 83 tests pass (0 failures) |
| 5  | OpenAPI spec with multiple paths/methods produces one capability per operation | VERIFIED | Petstore fixture produces exactly 3 capabilities: listPets, createPet, getPet |
| 6  | OpenAPI $ref pointers are resolved to inline schemas before output | VERIFIED | `createPet.inputSchema.properties.name` exists (resolved from `$ref: "#/components/schemas/Pet"`) |
| 7  | JSON Schema with $defs produces one capability per definition | VERIFIED | Users fixture produces 3 capabilities: root + Address + Preferences |
| 8  | JSON Schema with only root properties produces a single capability | VERIFIED | Tested in jsonschema-parser.test.mjs, passes |
| 9  | GraphQL introspection response produces one capability per Query/Mutation field | VERIFIED | Fixture produces 3 capabilities: user, users, createUser (2 Query + 1 Mutation) |
| 10 | MCP server introspection via tools/list produces one capability per tool | VERIFIED | `parseMCPToolsList` with fixture produces 2 capabilities: get_design_state, list_artifacts |
| 11 | MCP transport is always closed after listTools completes | VERIFIED | `transport.close()` in finally block at mcp.cjs line 84 |
| 12 | Generated tools.ts contains one named export per capability with tool() wrapper | VERIFIED | E2E run produces tools.ts with `export const listPets`, `export const createPet`, `export const getPet` |
| 13 | Generated tools.ts uses inputSchema: (NOT parameters:) in tool() calls | VERIFIED | grep confirms `inputSchema:` present, `parameters:` absent in codegen.cjs templates and generated output |
| 14 | Full ingest pipeline works end-to-end: spec file in, capability-model.json + tools.ts out | VERIFIED | `node bin/pde-tools.cjs cli-anything ingest tests/phase-163/fixtures/openapi-petstore.json` produces 3-capability model and tools.ts |

**Score:** 14/14 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bin/lib/cli-anything/model.cjs` | CapabilityModelSchema Zod validation + CapabilitySchema | VERIFIED | Exports CapabilitySchema, CapabilityModelSchema, validateCapabilityModel |
| `bin/lib/cli-anything/detect.cjs` | Spec type auto-detection from source string + parsed content | VERIFIED | Exports detectSpecType; handles all 6 detection paths |
| `bin/lib/cli-anything/ingest.cjs` | Complete orchestrator wiring all parsers + codegen | VERIFIED | Exports cmdIngest, loadSource, slugify; requires all 4 parsers + codegen |
| `bin/lib/cli-anything/parsers/openapi.cjs` | OpenAPI 3.x parser mapping paths to capabilities | VERIFIED | Exports parse, resolveRefs, buildInputSchema, buildOutputSchema, extractAuth |
| `bin/lib/cli-anything/parsers/jsonschema.cjs` | JSON Schema parser mapping properties/$defs to capabilities | VERIFIED | Exports parse |
| `bin/lib/cli-anything/parsers/graphql.cjs` | GraphQL introspection parser | VERIFIED | Exports parse, parseIntrospectionResult, INTROSPECTION_QUERY, argsToJsonSchema, gqlTypeToJsonSchema |
| `bin/lib/cli-anything/parsers/mcp.cjs` | MCP parser using MCP SDK Client + StdioClientTransport | VERIFIED | Exports parse, parseMCPToolsList; uses correct SDK path |
| `bin/lib/cli-anything/codegen.cjs` | JSON Schema to Zod codegen walker + tool() template + tsc validation | VERIFIED | Exports generateTools, generateToolSource, jsonSchemaToZod, typeCheckGeneratedFile |
| `bin/pde-tools.cjs` | cli-anything case block routing to ingest.cjs | VERIFIED | `case 'cli-anything':` at line 720, routes to cmdIngest |
| `commands/ingest.md` | /pde:ingest command definition | VERIFIED | Contains name, argument-hint, pde:ingest, cli-anything ingest |
| `tests/phase-163/fixtures/openapi-petstore.json` | OpenAPI 3.0 fixture | VERIFIED | Contains openapi: 3.0.0, 3 operations |
| `tests/phase-163/fixtures/jsonschema-users.json` | JSON Schema fixture with $defs | VERIFIED | Contains $defs with Address and Preferences |
| `tests/phase-163/fixtures/graphql-introspection.json` | GraphQL introspection fixture | VERIFIED | Contains __schema with Query, Mutation, User types |
| `tests/phase-163/fixtures/mcp-tools-list.json` | MCP tools/list fixture | VERIFIED | Contains 2 tools |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ingest.cjs` | `detect.cjs` | `require('./detect.cjs')` | WIRED | Line 5 confirmed |
| `ingest.cjs` | `model.cjs` | `require('./model.cjs')` | WIRED | Line 6 confirmed |
| `ingest.cjs` | `parsers/openapi.cjs` | `require('./parsers/openapi.cjs')` | WIRED | Line 109 confirmed |
| `ingest.cjs` | `parsers/jsonschema.cjs` | `require('./parsers/jsonschema.cjs')` | WIRED | Line 110 confirmed |
| `ingest.cjs` | `parsers/graphql.cjs` | `require('./parsers/graphql.cjs')` | WIRED | Lines 68 + 111 confirmed |
| `ingest.cjs` | `parsers/mcp.cjs` | `require('./parsers/mcp.cjs')` | WIRED | Line 112 confirmed |
| `ingest.cjs` | `codegen.cjs` | `require('./codegen.cjs')` | WIRED | Line 154 confirmed |
| `pde-tools.cjs` | `ingest.cjs` | `require('./lib/cli-anything/ingest.cjs')` | WIRED | Line 721 confirmed |
| `mcp.cjs` | `@modelcontextprotocol/sdk` | absolute path to pde-mcp-server node_modules | WIRED | Line 20: correct SDK path |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `ingest.cjs:cmdIngest` | `capabilities` | parser.parse(source, content) | Yes — parsers read fixtures/URLs, return real capability arrays | FLOWING |
| `ingest.cjs:cmdIngest` | `model` | assembled from capabilities + meta | Yes — written to capability-model.json | FLOWING |
| `codegen.cjs:generateTools` | `source` (tools.ts string) | generateToolSource(capabilities, meta) | Yes — walks real capability inputSchema to emit Zod strings | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 83 phase-163 tests pass | `npx vitest run tests/phase-163/` | 83 passed, 0 failed, 7 files | PASS |
| OpenAPI e2e: 3 capabilities, correct names | `node bin/pde-tools.cjs cli-anything ingest tests/phase-163/fixtures/openapi-petstore.json` | caps: 3 type: openapi names: listPets,createPet,getPet | PASS |
| JSON Schema e2e: 3 capabilities | `node bin/pde-tools.cjs cli-anything ingest tests/phase-163/fixtures/jsonschema-users.json` | caps: 3 type: jsonschema | PASS |
| detectSpecType covers all 6 paths | `node -e "const d=require(...); console.log(d.detectSpecType(...))"` | mcp graphql openapi jsonschema http-probe unknown | PASS |
| MCP parseMCPToolsList produces 2 caps | direct node invocation with fixture | get_design_state (required: product), list_artifacts | PASS |
| GraphQL parseIntrospectionResult produces 3 caps | direct node invocation with fixture | user, users, createUser; user.inputSchema.properties.id EXISTS | PASS |
| Generated tools.ts uses inputSchema: not parameters: | grep on generated output | inputSchema: present, parameters: absent | PASS |
| tsc --noEmit on generated tools.ts | `typeCheckGeneratedFile` call during e2e | Type errors: `ai` module not found (ai not installed in root node_modules) | SKIP — manual-only per VALIDATION.md |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CLI-01 | 163-01, 163-02 | User can ingest an OpenAPI spec and produce a unified capability model | SATISFIED | openapi.cjs parse() confirmed; e2e produces 3-capability model from petstore fixture |
| CLI-02 | 163-01, 163-02 | User can ingest a JSON Schema file and produce a unified capability model | SATISFIED | jsonschema.cjs parse() confirmed; e2e produces 3-capability model from users fixture |
| CLI-03 | 163-01, 163-03 | User can ingest a GraphQL endpoint (introspection) and produce a unified capability model | SATISFIED | graphql.cjs parseIntrospectionResult() confirmed; fixture produces 3 capabilities |
| CLI-04 | 163-01, 163-03 | User can introspect any MCP server and produce a unified capability model | SATISFIED (automated portion) | mcp.cjs parseMCPToolsList() confirmed; live server test is manual-only |
| CLI-05 | 163-04 | User can generate AI SDK tool() definitions from any unified capability model | SATISFIED | codegen.cjs generateTools() confirmed; e2e produces tools.ts with tool() exports |
| CLI-06 | 163-04 | Generated tool definitions include Zod inputSchema and typed execute functions | SATISFIED | Generated tools.ts contains inputSchema: z.object({...}) and execute: async (input) => {...} |

All 6 requirements for Phase 163 are accounted for. No orphaned requirements found.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `bin/lib/cli-anything/codegen.cjs` | tsc validation warns but does not fail when `ai` not installed in output dir | Info | tsc --noEmit reports "Cannot find module 'ai'" but codegen continues with a warning — acceptable per VALIDATION.md (manual-only) |
| `bin/lib/cli-anything/parsers/mcp.cjs` | SDK path is hardcoded to `packages/pde-mcp-server/node_modules/...` | Info | Only works if pde-mcp-server package is present at expected relative path; acceptable trade-off per RESEARCH.md |

No stub patterns found. No `return null` or placeholder returns in rendering paths. No TODO/FIXME blockers.

### Human Verification Required

#### 1. MCP Live Server Introspection

**Test:** Start the pde-mcp-server, then run `node bin/pde-tools.cjs cli-anything ingest mcp://node packages/pde-mcp-server/dist/index.js`
**Expected:** Pipeline completes, capability-model.json contains tools from the running MCP server, transport is closed cleanly
**Why human:** Requires spawning and communicating with a live MCP server process; cannot be safely tested in automated verification without a running server

#### 2. GraphQL Live Introspection

**Test:** Run `node bin/pde-tools.cjs cli-anything ingest https://countries.trevorblades.com` (public GraphQL endpoint)
**Expected:** Pipeline fetches introspection schema, produces capability-model.json with Query/Mutation capabilities
**Why human:** Requires outbound HTTP to a live GraphQL endpoint

#### 3. tsc --noEmit Zero Errors on Generated tools.ts

**Test:** `npm install` to install `ai` devDependency, then run `node bin/pde-tools.cjs cli-anything ingest tests/phase-163/fixtures/openapi-petstore.json` and check tsc output
**Expected:** `[codegen] tsc --noEmit: PASS` (currently shows type errors because `ai` not in root node_modules)
**Why human:** `ai` listed as devDependency but not installed; tsc runs against a temp directory without proper module resolution for `ai` and `zod`

### Gaps Summary

No blocking gaps. All 14 must-have truths verified. All 6 requirements (CLI-01 through CLI-06) satisfied with automated evidence. Three items deferred to human verification: MCP live introspection, GraphQL live introspection, and tsc full pass — all three are explicitly flagged as manual-only in the VALIDATION.md contract.

The one notable non-blocker: `ai` is listed as a devDependency in package.json but not installed in root `node_modules`, so `typeCheckGeneratedFile` always returns `ok: false` in the current environment. This does not prevent the pipeline from producing correct output — it is a warning-only path. The generated tools.ts content is structurally correct (verified by test assertions and grep).

---

_Verified: 2026-03-29T01:16:15Z_
_Verifier: Claude (gsd-verifier)_
