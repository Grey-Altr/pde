# Stack Research — Quality Hardening

**Domain:** Quality auditing, data integrity verification, and technical debt cleanup for a large Node.js CommonJS plugin codebase
**Researched:** 2026-03-29
**Confidence:** HIGH (all versions verified via `npm view` against registry; tool capabilities verified against official docs)

---

## Context: What This Is Hardening

The PDE codebase consists of:
- ~99 production `.cjs` files under `bin/` (~27K lines), with `bin/pde-tools.cjs` (1712 lines) as the primary dispatch surface
- ~89 library modules under `bin/lib/` (~25.5K total lines), largest being `context-sync.cjs` (2175 lines) and `render-presentation.cjs` (2096 lines)
- Vitest v4 already installed (root `vitest.config.ts`) with ~52 test files across phase directories
- Node.js 20 runtime
- Zero npm deps at plugin root (constraint: no `dependencies` in root `package.json` for plugin distribution)
- `packages/` workspace with their own `package.json` files (dispatcher, mcp-server) — these CAN have their own deps
- No existing linter, no coverage config, no dead-code detection

The hardening pass needs: static analysis, dead code detection, duplication detection, coverage measurement, and markdown consistency — without pulling runtime deps into the plugin root.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| ESLint | 10.1.0 | Static analysis and code quality rules | Industry standard for JS/CJS; flat config (v9+) works cleanly with CJS projects via `eslint.config.cjs`; `eslint-plugin-n` adds Node.js-specific rules (unresolved requires, deprecated APIs). Uses `sourceType: "commonjs"` for `.cjs` files automatically. Zero config needed for existing patterns. |
| eslint-plugin-n | 17.24.0 | Node.js-specific ESLint rules | Detects unresolvable `require()` paths, deprecated Node.js API usage, and callback hygiene. Understands CommonJS module semantics natively. The actively maintained fork of the abandoned `eslint-plugin-node` (last published 2021). |
| knip | 6.1.0 | Dead code and unused exports/deps detection | Builds a complete call graph to find unused files, unused exports, and unlisted dependencies simultaneously. Has explicit CommonJS guide at `knip.dev/guides/working-with-commonjs`. Runs zero-install via `npx knip`. The only tool that finds unreachable files alongside unused exports in a single pass. |
| @vitest/coverage-v8 | 4.1.2 | Code coverage with V8 backend | PDE already uses Vitest v4; adding `@vitest/coverage-v8` activates native V8 coverage with no instrumentation overhead. Since Vitest v3.2.0 it uses AST-based remapping producing accuracy equivalent to Istanbul. Zero additional test-runner configuration — add a `coverage` block to the existing `vitest.config.ts`. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @eslint/js | 10.0.1 | ESLint recommended ruleset for flat config | Required in `eslint.config.cjs` — replaces the old `extends: 'eslint:recommended'` pattern that does not exist in flat config. Install alongside ESLint. |
| globals | 17.4.0 | Node.js global variable definitions | Needed by ESLint flat config to declare `globals.node` environment (replaces `env: {node: true}` in old config format). One small dep, no transitive complexity. |
| jscpd | 4.0.8 | Copy-paste / structural duplication detection | Catches large duplicated blocks that knip misses because they ARE reachable code — both copies get called. Use `--min-lines 10 --min-tokens 70` threshold to filter trivial duplication. Run via `npx jscpd`. Produces HTML and JSON reports. |
| markdownlint-cli2 | 0.22.0 | Markdown consistency enforcement | PDE's primary state format is Markdown (PLAN.md, SUMMARY.md, STATE.md, workflow files, design artifacts). markdownlint-cli2 is the modern successor to markdownlint-cli — faster, supports globs natively, and runs `npx markdownlint-cli2 "**/*.md"`. Use for workflow files and planning doc consistency. Catches structural issues (heading hierarchy, fence syntax, blank lines) that break downstream parsing. |

### Development Tools (devDependencies only — zero runtime additions)

| Tool | Purpose | Notes |
|------|---------|-------|
| `npx knip` | Dead code detection | No install needed. Add a `knip.config.json` at root to configure entry points and ignore test dirs. |
| `npx jscpd` | Duplication scanning | No install needed. Configure with `--min-lines 10 --min-tokens 70` to filter trivial copies. Supports CJS via `--extensions js,cjs`. |
| ESLint (devDep at root) | Static analysis | Install as devDependency only — never in `dependencies`. Plugin-root constraint applies to runtime deps for distribution; devDeps are not bundled or shipped to users. |

---

## Installation

All tools go as `devDependencies` at the project root. Zero runtime additions to plugin users.

```bash
# Static analysis
npm install -D eslint@10 @eslint/js@10 eslint-plugin-n@17 globals@17

# Coverage (already have vitest — add the provider only)
npm install -D @vitest/coverage-v8@4

# Optional: install locally for scripts (can also use npx)
npm install -D knip@6 jscpd@4 markdownlint-cli2@0.22
```

### ESLint flat config for CJS (eslint.config.cjs at root)

```js
'use strict';
const js = require('@eslint/js');
const globals = require('globals');
const pluginN = require('eslint-plugin-n');

module.exports = [
  js.configs.recommended,
  pluginN.configs['flat/recommended-script'],  // treats .cjs files as CommonJS
  {
    files: ['bin/**/*.cjs', 'bin/lib/**/*.cjs'],
    languageOptions: {
      globals: globals.node,
      sourceType: 'commonjs',
    },
    rules: {
      'n/no-missing-require': 'error',        // catch broken require() paths
      'n/no-deprecated-api': 'error',         // catch deprecated Node.js APIs
      'no-unused-vars': ['warn', { args: 'none' }],  // flag dead variables
      'no-console': 'off',                    // CLI tools use console intentionally
    },
  },
  {
    files: ['tests/**/*.cjs', 'tests/**/*.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.nodeBuiltin } },
    rules: { 'n/no-missing-require': 'off' }, // tests use relative paths freely
  },
];
```

### knip.config.json at root

```json
{
  "entry": ["bin/pde-tools.cjs", "bin/lib/**/*.cjs"],
  "project": ["bin/**/*.cjs", "packages/**/*.cjs"],
  "ignore": ["tests/**", "**/*.test.*", ".planning/**"],
  "ignoreDependencies": ["vitest"]
}
```

### vitest.config.ts coverage addition

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/**/*.{test,spec}.{cjs,mjs,js,ts}', 'tests/**/test-*.cjs'],
    globals: true,
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['bin/lib/**/*.cjs'],
      exclude: ['tests/**'],
      thresholds: { lines: 60, branches: 50 },  // baseline; raise per phase
    },
    server: {
      deps: { inline: ['zod'] },
    },
  },
});
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| ESLint 10 (flat config) | Oxlint 1.57.0 | Oxlint is 50-100x faster (Rust-based) and reached v1.0 stable in June 2025 — but its JavaScript plugin system is still in alpha as of March 2026. Cannot yet run custom Node.js-specific rules. Use Oxlint as a fast pre-check pass alongside ESLint once plugins stabilize (likely mid-2026). |
| knip 6 | depcheck 1.4.7 | Use depcheck if you only need unused `package.json` dependencies (not file-level dead code). Knip is a strict superset — it finds unused deps AND unreachable files AND unused exports. Choose depcheck only if knip's CommonJS false-positives are too noisy to manage. |
| knip 6 | madge 8.0.0 | Use madge in addition to knip if you need a visual circular-dependency graph. Madge does not detect dead code; it only maps dependency graphs. Both answer different questions — run madge separately for architectural review. |
| @vitest/coverage-v8 | c8 11.0.0 | c8 is standalone (works without vitest) and uses the same V8 backend. Only use c8 if you need coverage for scripts outside the vitest test harness (e.g., shell scripts running CJS directly). For the existing test suite, @vitest/coverage-v8 is zero additional configuration. |
| markdownlint-cli2 | Vale | Vale enforces prose quality (grammar, style guide). markdownlint-cli2 enforces structural consistency (heading levels, blank lines, fence syntax). The actual failure mode in PDE's Markdown state files is structural — broken YAML frontmatter from heading mismatches, not prose style. Choose Vale if writing quality matters; choose markdownlint-cli2 for machine-readable doc consistency. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| SonarQube | Requires a server, Docker, or SaaS account setup. Overcomplicated for a single-plugin audit that should run in `npx` commands. Adds operational burden with no benefit over the simpler tools. | ESLint + knip + @vitest/coverage-v8 covers the same surface without infrastructure. |
| ts-morph / ts-unused-exports | TypeScript AST tools — do not parse `.cjs` files without compiling them first. Will silently miss most of the PDE codebase since it is uncompiled CommonJS. | knip with CommonJS conventions; uses a different analysis approach that handles CJS natively. |
| complexity-report / plato | Both abandoned (last npm publish: 2019). Complexity metrics they provided are available as an ESLint rule. | ESLint with `complexity: ['warn', 15]` rule in the config, no separate tool needed. |
| eslint-plugin-node (original) | Abandoned — last published 2021, archived on GitHub. Will not receive security fixes or Node.js 20 compatibility updates. | `eslint-plugin-n@17` — the actively maintained community fork. |
| Prettier (applied to all CJS) | Reformatting 99 production CJS files mid-milestones creates noise in git history and risks breaking hooks with whitespace diffs. A formatting pass on active code is indistinguishable from a logic change in diff review. | Apply ESLint `--fix` rules only to new files, or run a single formatting commit at the very end of the hardening milestone with a clear commit message. |
| Biome | Biome replaces ESLint + Prettier combined. Adopting it is a larger DX migration than a hardening pass warrants — requires all contributors to switch tooling and reconfigure editors. | ESLint 10 for the hardening scope. Biome is worth evaluating for the planned v1 TypeScript CLI milestone (PDE standalone CLI) where the codebase starts fresh. |

---

## Stack Patterns by Variant

**If the goal is a one-time audit report before coding starts:**
- Run `npx knip --reporter json > .planning/research/knip-report.json` for dead code inventory
- Run `npx jscpd bin/lib --output .planning/research/jscpd-report/` for duplication map
- Run `vitest run --coverage` for coverage baseline (after adding @vitest/coverage-v8)
- Run `npx eslint bin/lib --output-file .planning/research/eslint-report.txt` for lint issues
- Gives concrete numbers to scope hardening work before committing to phase breakdown

**If the goal is a fast CI gate (under 15s total):**
- ESLint `--max-warnings 0` scoped to `bin/lib/*.cjs` only (highest-value surface, fastest)
- `npx knip --reporter compact` exits non-zero on any unused exports
- Skip jscpd in the critical CI path — run it as a report-only weekly job

**If circular dependency detection is needed:**
- `npx madge --circular bin/lib/ --extensions cjs` as a standalone audit step
- madge 8.0.0 works with CommonJS; set `--extensions cjs`
- Circular deps between lib modules explain hard-to-test code and unpredictable load order in CLI dispatch

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| eslint@10 | Node.js >=18 | No issues. Project uses Node 20, fully in range. |
| eslint-plugin-n@17 | eslint@9, eslint@10 | v17 supports ESLint 9+ flat config exclusively. Do not mix with eslint@8 or the old `.eslintrc` format. |
| @vitest/coverage-v8@4 | vitest@4.x | Must match vitest major version. Root `package.json` already has `vitest: ^4.1.1` — exact match. |
| knip@6 | Node.js >=18 | Works with CJS projects. Knip is itself ESM but analyzes your CJS code without running it. No conflicts with the project's CJS modules. |
| jscpd@4 | Node.js >=14 | No compatibility concerns for Node 20. |
| markdownlint-cli2@0.22 | Node.js >=18 | No issues. |
| globals@17 | eslint@9, eslint@10 flat config | Required for flat config only — incompatible with old `.eslintrc` format by design. |

---

## Sources

- `npm view [package] version` — all versions verified from registry 2026-03-29 (HIGH confidence)
- [knip.dev/guides/working-with-commonjs](https://knip.dev/guides/working-with-commonjs) — CommonJS export convention requirements verified (HIGH confidence)
- [knip.dev/reference/known-issues](https://knip.dev/reference/known-issues) — env var / config file limitation noted (HIGH confidence)
- [github.com/eslint-community/eslint-plugin-n](https://github.com/eslint-community/eslint-plugin-n) — Confirmed active fork of eslint-plugin-node; flat config `flat/recommended-script` verified (HIGH confidence)
- [vitest.dev/guide/coverage](https://vitest.dev/guide/coverage) — V8 provider with AST-based remapping since v3.2.0 confirmed (HIGH confidence)
- [oxc.rs/blog/2026-03-11-oxlint-js-plugins-alpha](https://oxc.rs/blog/2026-03-11-oxlint-js-plugins-alpha) — JS plugin alpha status confirmed; not yet production-ready for custom plugin rules (HIGH confidence)
- tsmx.net — ESLint v9 flat config CommonJS migration guide; `sourceType: "commonjs"` for `.cjs` verified (MEDIUM confidence, blog post)

---

*Stack research for: Quality hardening of large Node.js CommonJS plugin codebase (PDE v0.23)*
*Researched: 2026-03-29*
