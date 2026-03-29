---
phase: 163-cli-ingestion-capability-model
plan: 02
subsystem: api
tags: [openapi, jsonschema, parsers, cli-anything, zod, capability-model]

# Dependency graph
requires:
  - phase: 163-cli-ingestion-capability-model
    plan: 01
    provides: CapabilitySchema/CapabilityModelSchema Zod models in model.cjs, detect.cjs type detector

provides:
  - OpenAPI 3.x parser (openapi.cjs) converting paths/operations to capability array with $ref resolution
  - JSON Schema parser (jsonschema.cjs) converting root properties and $defs to capability array
  - 22 passing tests covering both parsers against real fixture files
affects:
  - 163-03 (GraphQL parser — same parse(source, content) contract)
  - 163-04 (MCP parser — same contract)
  - 163-05 (codegen — consumes capabilities from these parsers)
  - ingest.cjs orchestrator — wires these parsers

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Parser module contract: exports async parse(source, content) => Promise<Capability[]>"
    - "resolveRefs walks object tree recursively with circular ref guard via Set"
    - "buildInputSchema merges parameters + requestBody into single flat object schema"
    - "slugFromSource extracts clean identifier from file path for JSON Schema capability naming"

key-files:
  created:
    - bin/lib/cli-anything/parsers/openapi.cjs
    - bin/lib/cli-anything/parsers/jsonschema.cjs
    - tests/phase-163/openapi-parser.test.mjs
    - tests/phase-163/jsonschema-parser.test.mjs
  modified: []

key-decisions:
  - "resolveRefs paths starting with 'components/' are resolved relative to spec.components, not spec root — handles standard OpenAPI $ref format '#/components/schemas/X'"
  - "buildInputSchema flattens requestBody object properties directly into inputSchema.properties (not nested under 'body') when the body schema is type:object with properties"
  - "JSON Schema parser uses path.basename(source) slug as capability name for root schema, preserving the definition name for $defs entries"
  - "Both parsers produce capabilities with outputSchema: null when no response schema is defined rather than omitting the field"

patterns-established:
  - "TDD pattern: write failing tests referencing real fixture files first, implement parser second"
  - "Parser test pattern: lazy-require the parser module inside describe block so test file loads even before implementation exists"

requirements-completed: [CLI-01, CLI-02]

# Metrics
duration: 12min
completed: 2026-03-29
---

# Phase 163 Plan 02: OpenAPI and JSON Schema Parsers Summary

**OpenAPI 3.x parser with recursive $ref resolution and JSON Schema parser with $defs expansion — both produce CapabilitySchema-validated arrays from real fixture files, 22 tests green**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-29T01:00:40Z
- **Completed:** 2026-03-29T01:12:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- OpenAPI parser converts Petstore fixture to 3 typed capabilities (listPets, createPet, getPet) with fully resolved $ref schemas — no $ref strings leak into output
- JSON Schema parser converts Users fixture to 3 capabilities (root + Address + Preferences) with correct required arrays and enum fields
- Both parsers export `parse(source, content)` async function matching the unified parser contract, plus OpenAPI exports `resolveRefs`, `buildInputSchema`, `buildOutputSchema`, `extractAuth` helpers

## Task Commits

Each task was committed atomically:

1. **Task 1: OpenAPI 3.x parser with $ref resolution** - `c8f25b1` (feat)
2. **Task 2: JSON Schema parser with $defs handling** - `3c56a38` (feat)

**Plan metadata:** (docs commit — see below)

_Note: Both tasks used TDD: RED (failing tests) then GREEN (implementation). No REFACTOR pass needed._

## Files Created/Modified

- `/Users/greyaltaer/code/projects/Platform Development Engine/bin/lib/cli-anything/parsers/openapi.cjs` - OpenAPI 3.x parser: resolveRefs, buildInputSchema, buildOutputSchema, extractAuth, parse
- `/Users/greyaltaer/code/projects/Platform Development Engine/bin/lib/cli-anything/parsers/jsonschema.cjs` - JSON Schema parser: slugFromSource, parse
- `/Users/greyaltaer/code/projects/Platform Development Engine/tests/phase-163/openapi-parser.test.mjs` - 10 test cases covering Petstore fixture, $ref resolution, CapabilitySchema validation, extractAuth
- `/Users/greyaltaer/code/projects/Platform Development Engine/tests/phase-163/jsonschema-parser.test.mjs` - 12 test cases covering Users fixture, $defs expansion, edge cases (no-$defs, $defs-only), CapabilitySchema validation

## Decisions Made

- `resolveRefs` paths starting with `components/` are resolved relative to `spec.components` — handles the standard OpenAPI `$ref` format `#/components/schemas/X` correctly
- `buildInputSchema` flattens requestBody object properties directly into the top-level `inputSchema.properties` when the body schema is `type:object` with properties (createPet gets `name`, `id`, `tag` at top level)
- JSON Schema parser uses `path.basename(source)` slug as capability name for root schema, preserving the definition key name for `$defs` entries (Address, Preferences)
- Both parsers return `outputSchema: null` (not undefined) when no response schema is defined — required for Zod `.nullable()` validation

## Deviations from Plan

None — plan executed exactly as written. The plan's code samples were accurate and all tests passed on first run after implementation.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- OpenAPI parser (CLI-01) and JSON Schema parser (CLI-02) are complete
- `parsers/` directory exists and follows the established contract: `async parse(source, content) => Promise<Capability[]>`
- Plan 163-03 can implement `parsers/graphql.cjs` using the same export shape
- Plan 163-04 can implement `parsers/mcp.cjs` using the same export shape
- `ingest.cjs` orchestrator (163-05 or 163-06) can import all four parsers from `parsers/` directory

---
*Phase: 163-cli-ingestion-capability-model*
*Completed: 2026-03-29*
