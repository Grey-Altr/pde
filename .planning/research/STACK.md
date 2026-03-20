# Stack Research

**Domain:** Pipeline reliability and validation — automated research claim verification,
cross-phase dependency checking, plan edge case analysis, integration point verification
for an existing Node.js CommonJS Claude Code plugin (PDE v0.7)
**Researched:** 2026-03-19
**Confidence:** HIGH (Node.js built-in capabilities verified against official docs),
HIGH (acorn 8.16.0 confirmed via changelog), MEDIUM (dependency-graph 1.0.0 confirmed
stable but 2-year-old release), HIGH (zero-npm constraint verified by absent package.json)

---

> **Scope note:** This file covers ONLY what is new for v0.7. The existing PDE stack —
> Node.js v20 CommonJS, Claude Code plugin API, markdown-based `.planning/` state,
> pde-tools.cjs CLI with 20+ lib modules, zero npm dependencies at plugin root — is
> the immovable baseline. Every recommendation here must fit within that baseline.

---

## Constraint Summary

| Constraint | Source | Implication |
|------------|--------|-------------|
| Node.js v20 (active LTS) | env, no package.json | `fs.promises.glob` not available (added in v22.2.0); use `fs.readdirSync` or manual recursion |
| Zero npm dependencies at plugin root | No package.json found anywhere in repo | All new capabilities must use Node.js builtins OR be bundled inline as lib/*.cjs modules |
| CommonJS only | Every existing module uses `require()` | No ESM, no `import`, no top-level `await` |
| No external processes | Plugin runs inside Claude Code session | No spawning background daemons, no persistent watchers |
| File-based state only | `.planning/` directory, no database | All analysis outputs written to markdown files |

---

## Recommended Stack

### Core Technologies (no changes from existing)

| Technology | Version | Purpose | Why Kept |
|------------|---------|---------|----------|
| Node.js | 20 LTS | Runtime for all bin/ scripts | Already pinned; v20 is the Claude Code runtime |
| CommonJS (`require`) | N/A | Module system | All 20+ lib modules use it; no migration path |
| `node:fs` | Built-in | File I/O, directory traversal | Replaces glob — v20 has `readdirSync` with `recursive: true` option (added v18.17) |
| `node:path` | Built-in | Path resolution | Already used universally |

### New Capability: AST Parsing for Code Verification

**Problem:** The automated research validation agent needs to verify claims like "function X exists in file Y" or "module exports Z" against the actual codebase.

**Recommendation: `acorn` + `acorn-walk` as inline-bundled lib modules.**

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| acorn | 8.16.0 | JavaScript AST parser | Produces ESTree-compliant AST from .cjs source; supports `sourceType: "commonjs"` (added 8.16.0); pure JS, no native bindings — bundleable as single file |
| acorn-walk | 8.3.5 | AST traversal | `simple()` visitor pattern for finding function declarations, exports, require() calls; part of acorn project; same license |

**Why acorn over alternatives:**
- acorn is Node.js's own bundled JS parser (used internally by Node.js since v0.10) — proven stable
- `sourceType: "commonjs"` treats top-level as function scope, matching PDE's .cjs files exactly
- Ships as a single CJS-compatible module with no transitive dependencies
- 8.16.0 released February 2026 — actively maintained
- Alternative (babel parser): 15x larger, requires 4+ packages, ESM-first design; overkill for structural analysis
- Alternative (esprima): unmaintained since 2020 (last release 4.0.1 in 2019)
- Alternative (typescript compiler API): TypeScript only; PDE is plain JavaScript

**Bundling approach:** Copy `acorn/dist/acorn.cjs` and `acorn-walk/dist/walk.cjs` into `bin/lib/vendor/` as committed files (two files, ~150KB total). No `npm install`. No package.json. This matches the pattern of inline conversion functions already used for figmaColorToCss and dtcgToPencilVariables.

**What AST parsing enables:**
- Verify export declarations: `module.exports.X = ...` and `module.exports = { X, ... }`
- Verify `require()` call targets
- Detect orphan exports (exported but never required anywhere)
- Verify function name existence before claims like "function parsePhase exists"

**What AST parsing is NOT needed for:**
- Markdown file analysis (regex is sufficient for structured `.planning/` files)
- Claim extraction from research files (regex pattern matching on text)
- Cross-phase dependency checking (markdown parsing + dependency graph)

### New Capability: Cross-Phase Dependency Graph

**Problem:** Plans reference other phases' outputs (e.g., "phase 47 produces X, phase 48 consumes X"). Pre-execution verification needs to detect when a consumer phase references a dependency that the producer phase hasn't been defined to produce.

**Recommendation: Build a lightweight graph in-process using a Map/Set structure, OR vendor `dependency-graph` 1.0.0.**

| Approach | Complexity | When to Use |
|----------|-----------|-------------|
| Hand-built Map-based graph | ~40 lines of code | If only cycle detection and topological sort are needed |
| `dependency-graph` 1.0.0 | Vendor as single file (~400 lines) | If full DepGraph API (dependenciesOf, dependantsOf, overallOrder, circular detection) is needed |

**Recommendation: Hand-built Map in a new `bin/lib/dep-graph.cjs` module.** The dependency-graph package is 1.0.0 released December 2023 and has been stable-but-unmaintained since — it's a simple data structure that doesn't need external maintenance. But the full API is more than PDE needs. PDE's phase dependency graph is:
1. Nodes = phases (strings like "47", "48")
2. Edges = "phase A produces artifact consumed by phase B"
3. Operations needed: add nodes, add edges, detect cycles, topological sort

That is ~40 lines of Map/Set code with no external dependency, matching PDE's inline-function philosophy.

**If the graph grows complex** (more than simple topological sort), vendor dependency-graph 1.0.0 from its `lib/dep_graph.js` as `bin/lib/vendor/dep-graph.cjs`.

### New Capability: Claim Extraction from Markdown

**Problem:** Research files (SUMMARY.md, STACK.md, FEATURES.md) contain claims like "uses Node.js v20" or "exports parsePhase function". The validation agent needs to extract these claims programmatically.

**Recommendation: Regex pattern matching — no new library.**

| Pattern | What It Extracts |
|---------|-----------------|
| `/\*\*([^*]+)\*\*/g` | Bold claims |
| `/`([^`]+)`/g` | Inline code references (function names, file paths) |
| `/- ([^\n]+)/g` | Bullet point assertions |
| `/\| ([^\|]+) \|/g` | Table cell values |

The existing `sharding.cjs` and `readiness.cjs` already demonstrate that XML-tag regex (`/<task[^>]*>([\s\S]*?)<\/task>/gi`) is sufficient for structured extraction in PDE's markdown documents. The same approach extends to claim extraction.

**Why not a markdown parser library (marked, markdown-it):**
- PDE research files are author-controlled structured documents, not arbitrary user markdown
- The claim vocabulary is narrow and consistent (bold text, backtick code, bullets, tables)
- Adding a parser introduces ESM compatibility issues (marked v17 is ESM-first) and 150KB+ size
- Regex on known structure is faster, simpler, and zero-dependency

### New Capability: Integration Point Verification

**Problem:** Verify that when skill A exports a function, skill B actually calls it with matching arguments — detecting interface drift across the pipeline.

**Recommendation: acorn AST parsing (same library as code verification above) + regex for markdown interface definitions.**

The integration point verifier needs two operations:
1. Parse `module.exports` from producer files to build an export map
2. Parse `require(...)` calls from consumer files to build an import map
3. Cross-reference: exports that no consumer requires = orphan exports

This is pure AST walking over the existing `bin/lib/*.cjs` files — entirely covered by acorn + acorn-walk.

### Directory Traversal (no new library needed)

Node.js v18.17 added `fs.readdirSync(path, { recursive: true })` — available in PDE's Node.js v20 runtime. This replaces any need for a `glob` npm package for file discovery.

```javascript
// Replaces glob('**/*.cjs') — works in Node.js v18.17+
const files = fs.readdirSync(rootDir, { recursive: true })
  .filter(f => f.endsWith('.cjs'));
```

**Why not fast-glob or glob npm package:** Zero-npm constraint. Node.js v20's native recursive `readdirSync` is sufficient for PDE's file discovery needs (finding `.cjs` files in `bin/lib/`, finding PLAN.md files in `.planning/phases/`).

---

## Recommended New lib Modules (no npm, no vendors for most)

| Module | Path | Purpose | Dependencies |
|--------|------|---------|--------------|
| `claim-extractor.cjs` | `bin/lib/claim-extractor.cjs` | Extract verifiable claims from markdown research files | Node.js builtins only |
| `code-verifier.cjs` | `bin/lib/code-verifier.cjs` | Verify claims against codebase via AST | acorn + acorn-walk (vendored) |
| `dep-graph.cjs` | `bin/lib/dep-graph.cjs` | Phase dependency graph, cycle detection, topological sort | Node.js builtins only (~40 lines) |
| `phase-dependency-checker.cjs` | `bin/lib/phase-dependency-checker.cjs` | Cross-phase dependency verification, reads PLAN.md files | dep-graph.cjs, frontmatter.cjs, core.cjs |
| `edge-case-analyzer.cjs` | `bin/lib/edge-case-analyzer.cjs` | Analyze PLAN.md tasks for missing error handling, empty states, boundary conditions | sharding.cjs (already exists), Node.js builtins |
| `integration-verifier.cjs` | `bin/lib/integration-verifier.cjs` | Verify export/import alignment across lib modules | code-verifier.cjs |

---

## Installation

No `npm install` required. No `package.json` needed.

For acorn + acorn-walk:

```bash
# One-time: download and commit vendored files
# acorn 8.16.0 — download acorn/dist/acorn.cjs from npm registry tarball
# acorn-walk 8.3.5 — download acorn-walk/dist/walk.cjs from npm registry tarball
# Place in bin/lib/vendor/ and require() directly
```

All other new capabilities use only Node.js v20 built-in modules.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| acorn 8.16.0 (vendored) | @babel/parser | 15x larger bundle, ESM-first, requires 4+ packages; no advantage for structural analysis of plain CJS files |
| acorn 8.16.0 (vendored) | esprima | Unmaintained since 2020 (last release 4.0.1, 2019); misses modern JS syntax |
| acorn 8.16.0 (vendored) | typescript compiler API | TypeScript-only; PDE files are plain .cjs; heavy dependency |
| Hand-built dep-graph (Map/Set) | dependency-graph npm 1.0.0 | dependency-graph is stable but adds an npm dependency for 40 lines of code; PDE's needs are simple enough to implement inline |
| Regex claim extraction | marked npm v17 | marked v17 is ESM-first (requires conversion); overkill for structured author-controlled documents; 150KB+ |
| `fs.readdirSync` recursive | glob, fast-glob, globby | npm dependencies violate zero-npm constraint; Node.js v20 built-in recursive readdirSync is sufficient |
| `fs.readdirSync` recursive | `fs.promises.glob` (Node.js built-in) | `fs.promises.glob` requires Node.js v22.2.0+; PDE runs on v20 |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Any `package.json` at plugin root | Creates npm install requirement for plugin users; breaks zero-dep distribution model | Vendor 2 small files (acorn, acorn-walk) in bin/lib/vendor/ as committed source |
| ESLint / typescript-eslint | Sophisticated linting infrastructure is overkill for structural verification of 20 lib modules | acorn AST walking provides the specific checks needed (exports, requires, function declarations) |
| CodeQL / Semgrep | External binary dependencies; require OS-level install; not distributable as a plugin | acorn-based custom analysis within the plugin boundary |
| madge / dependency-cruiser | Heavy dependencies with visualization output; designed for developer tooling, not programmatic verification | Hand-built dep-graph.cjs with exactly the operations needed |
| deepmerge / lodash | Not needed; all state manipulation is string/regex based | Native JSON.parse, string methods |
| Any ESM-only package | Claude Code plugin runtime requires CJS compatibility | Verify CJS export before vendoring any package |

---

## Stack Patterns by Variant

**If claim verification only (no AST, no dep graph):**
- Use regex pattern matching in claim-extractor.cjs
- No vendored libraries needed
- Covers: claim extraction from markdown, cross-checking claims against file existence

**If code structure verification (AST required):**
- Vendor acorn 8.16.0 + acorn-walk 8.3.5 into bin/lib/vendor/
- Wire into code-verifier.cjs and integration-verifier.cjs
- Covers: export existence, require() targets, function name verification, orphan export detection

**If dependency graph analysis:**
- Build dep-graph.cjs inline (~40 lines) — no vendor needed
- Wire into phase-dependency-checker.cjs
- Covers: cross-phase dependency gaps, cycle detection, execution order validation

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| acorn 8.16.0 | Node.js v20+ | Pure JavaScript, no native bindings; CJS dist available as `acorn/dist/acorn.cjs`; `sourceType: "commonjs"` was the key feature, added 8.16.0 (Feb 2026) |
| acorn-walk 8.3.5 | acorn 8.x | Same project; must match major version with acorn; CJS dist at `acorn-walk/dist/walk.cjs` |
| dep-graph.cjs (inline) | Node.js v20+ | Uses Map/Set; available since Node.js v4 |
| `fs.readdirSync` recursive | Node.js v18.17+ | `{ recursive: true }` option added v18.17; PDE's v20 is well above this floor |

---

## Sources

- **Node.js v20 fs docs** (HIGH confidence): https://nodejs.org/api/fs.html — `readdirSync` recursive option confirmed in v18.17+
- **acorn CHANGELOG** (HIGH confidence): https://github.com/acornjs/acorn/blob/master/acorn/CHANGELOG.md — v8.16.0 released February 19, 2026; `sourceType: "commonjs"` confirmed
- **acorn-walk npm** (HIGH confidence): https://www.npmjs.com/package/acorn-walk — v8.3.5, last published recently; `simple()`, `full()`, `ancestor()` API confirmed
- **dependency-graph GitHub** (MEDIUM confidence): https://github.com/jriecken/dependency-graph — v1.0.0 released December 2023; stable-but-unmaintained; DepGraph API with cycle detection confirmed
- **fs.promises.glob Node.js availability** (HIGH confidence): https://www.npmjs.com/package/glob and Node.js blog — confirmed available only from v22.2.0, NOT v20
- **acorn Node.js bundling history** (HIGH confidence): https://github.com/nodejs/node/commit/38aa9d6ea9 — Node.js itself bundles acorn; validates stability
- **marked v17 ESM-first status** (MEDIUM confidence): https://www.npmjs.com/package/marked — v17.0.0 confirmed latest; ESM-first design noted in changelog

---

*Stack research for: PDE v0.7 — Pipeline Reliability & Validation*
*Researched: 2026-03-19*
