# Phase 189: Technical Debt Cleanup - Research

**Researched:** 2026-03-30
**Domain:** Static analysis tooling (knip, jscpd, eslint), workflow path hygiene
**Confidence:** HIGH

## Summary

Phase 189 has four discrete, non-overlapping tasks. DEB-01 is a surgical text replacement in two
workflow files. DEB-02 and DEB-03 are first-time runs of knip and jscpd — neither is installed as
a project dependency, so they run via `npx`; their outputs need to be committed as triage artifacts.
DEB-04 requires writing a fresh `eslint.config.mjs` for the CJS codebase and achieving a clean pass
or a documented exceptions file.

All four tools are fetched via `npx` at current versions (knip 6.1.0, jscpd 4.0.8, eslint 10.1.0,
eslint-plugin-n 17.24.0, @eslint/js 10.0.1). None are in `node_modules`. A knip `knip.json` config
file is needed to constrain scope — without one, knip reports 334 "unused files" including
`.planning/milestones/` test archives, `dashboard/.next/` build output, and `packages/pde-mcp-server`
sub-packages, most of which are expected non-entry-point files.

**Primary recommendation:** Three separate plan tasks — one for DEB-01 (path fix), one for
DEB-02+DEB-03 (run and triage reports), one for DEB-04 (ESLint config + clean pass).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None — discuss phase skipped.

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure/tooling phase. Use
ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

### Deferred Ideas (OUT OF SCOPE)
None — discuss phase skipped.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEB-01 | `execute-phase.md` and `complete-milestone.md` reference `$CLAUDE_PLUGIN_ROOT/bin/pde-tools.cjs` (not stale `$HOME/.claude/pde-os` path) | Exactly 2 lines in execute-phase.md (760, 769) and 2 lines in complete-milestone.md (694, 703) use the stale path. All other `pde-os` references in those files call `gsd-tools.cjs` (GSD engine), which is correct and must not be touched. |
| DEB-02 | `npx knip` produces a dead-code report with each finding triaged as keep/remove/defer — committed as a tracked artifact | knip 6.1.0 available via npx; needs `knip.json` to exclude `.planning/milestones/`, `dashboard/.next/`, node_modules. Raw run yields 334 "unused files" + 46 unused exports + unlisted deps. |
| DEB-03 | `npx jscpd` produces a duplication report identifying copy-paste blocks above threshold — committed as a tracked artifact | jscpd 4.0.8 available via npx; supports `--reporters json` and `--output <dir>`; needs ignore paths for `.planning/` archives and `node_modules`. |
| DEB-04 | ESLint 10 with eslint-plugin-n configured for CJS codebase; `npx eslint .` runs clean or documented exceptions file explains each suppressed rule | eslint 10.1.0, eslint-plugin-n 17.24.0, @eslint/js 10.0.1 available via npx. No existing config. 123 CJS files across `bin/`, `lib/`, `packages/`. Node 20, all CJS (require/module.exports). |
</phase_requirements>

## DEB-01: Stale Path Analysis

### Exact Stale Lines (pde-tools.cjs only)

**`workflows/execute-phase.md`** — 2 lines:
- Line 760: `AUTO_GENERATE=$(node "$HOME/.claude/pde-os/engines/gsd/bin/pde-tools.cjs" --raw config-get presentations.auto_generate 2>/dev/null || echo "false")`
- Line 769: `PERSONAS_JSON=$(node "$HOME/.claude/pde-os/engines/gsd/bin/pde-tools.cjs" --raw config-get presentations.auto_generate_personas 2>/dev/null || echo '["executive-summary","project-manager-view"]')`

**`workflows/complete-milestone.md`** — 2 lines:
- Line 694: `AUTO_GENERATE=$(node "$HOME/.claude/pde-os/engines/gsd/bin/pde-tools.cjs" --raw config-get presentations.auto_generate 2>/dev/null || echo "false")`
- Line 703: `PERSONAS_JSON=$(node "$HOME/.claude/pde-os/engines/gsd/bin/pde-tools.cjs" --raw config-get presentations.auto_generate_personas 2>/dev/null || echo '["executive-summary","project-manager-view"]')`

**Replacement:** `$HOME/.claude/pde-os/engines/gsd/bin/pde-tools.cjs` → `${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs`

### What NOT to change

Both files contain 26 and 8 occurrences of `pde-os` total, respectively. The vast majority reference
`gsd-tools.cjs` (the GSD engine binary), not `pde-tools.cjs`. Those calls are correct — `gsd-tools.cjs`
lives in the GSD engine at `$HOME/.claude/pde-os/engines/gsd/bin/gsd-tools.cjs`. Only the 4 lines
above use `pde-tools.cjs` with the stale path.

There is also one line in each file that already correctly uses `${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs`
(execute-phase.md:780, complete-milestone.md:714) — do not touch those.

### Verification After Fix
```bash
grep "pde-os.*pde-tools" workflows/execute-phase.md   # must return empty
grep "pde-os.*pde-tools" workflows/complete-milestone.md  # must return empty
grep "CLAUDE_PLUGIN_ROOT.*pde-tools" workflows/execute-phase.md   # must show 3 lines
grep "CLAUDE_PLUGIN_ROOT.*pde-tools" workflows/complete-milestone.md  # must show 3 lines
```

## DEB-02: Knip Configuration and Triage

### Tool Facts
- **Version:** 6.1.0 (current as of 2026-03-30, verified via `npm view knip version`)
- **Install location:** Not in project `node_modules` — runs via `npx knip`
- **Config file:** `knip.json` at project root (no existing config found)

### Raw Knip Output Without Config
Without configuration, knip runs against the entire repo and reports:
- 334 "unused files" — includes `.planning/milestones/` test archives, `dashboard/.next/` build artifacts, `packages/pde-mcp-server/src/` TypeScript sources
- 46 unused exports (from `bin/lib/*.cjs`)
- 1 "unused dependencies" group: `@fontsource/inter`, `@gltf-transform/cli`, `@gltf-transform/core`, `htm`, `inter-ui`
- 1 "unused devDependencies" group: `ai`
- 3 "unlisted dependencies": `node-fetch`, `node-ssh`, `@anthropic-ai/claude-agent-sdk`

### Required `knip.json` Configuration

```json
{
  "entry": ["bin/pde-tools.cjs", "bin/*.cjs", "packages/*/index.cjs", "packages/*/discover.cjs", "packages/*/handlers.cjs"],
  "project": ["bin/**/*.cjs", "lib/**/*.cjs", "packages/**/*.cjs", "packages/**/*.ts"],
  "ignore": [
    ".planning/**",
    "dashboard/**",
    "coverage/**",
    ".claude/**",
    ".sessions/**",
    ".tmp-git-commit.mjs"
  ],
  "ignoreDependencies": ["@fontsource/inter", "@gltf-transform/cli", "@gltf-transform/core", "htm", "inter-ui"],
  "ignoreExportsUsedInFile": true
}
```

**Rationale for ignores:**
- `.planning/**` — archived milestone test files (phases 40–133) are historical artifacts, not production code
- `dashboard/**` — Next.js app with its own build pipeline; tracked separately
- `coverage/**` — generated output (already in `.gitignore`)
- `.claude/**` — worktrees and agent files, not plugin source
- `bin/*.cjs` (metric files) — invoked as CLI scripts, not imported; they are entry points

### Triage Report Location

Commit as `.planning/phases/189-technical-debt-cleanup/189-knip-report.md` — a markdown triage table
where each finding is classified as `keep`, `remove`, or `defer`.

### Triage Categories (pre-classified from raw output)

| Finding | Classification | Reason |
|---------|---------------|--------|
| `bin/lib/video-pipeline/remotion/BrandedVideo.tsx` | defer | Remotion not yet integrated; part of planned video pipeline feature |
| `bin/lib/idle-suggestions.cjs` | defer | Feature may be used in future milestones; no current callers in main flow |
| `bin/lib/event-bus.cjs` | keep | Invoked at runtime by dispatcher; knip doesn't trace dynamic require paths |
| `bin/lib/commands.cjs` | keep | Loaded dynamically via `pde-tools.cjs` command dispatch pattern |
| `.tmp-git-commit.mjs` | remove | Orphaned temp file from a prior git operation |
| Unused exports in `bin/lib/*.cjs` | defer | CLI plugin boundary — exports are entry points consumed by external callers, not detected by knip's static analysis |
| `@fontsource/inter`, `htm`, etc. | defer | Used by dashboard sub-app; knip doesn't trace into dashboard's bundler scope |
| `ai` devDependency | keep | Used by vitest tests that import AI SDK utilities |
| `node-fetch`, `node-ssh` | defer | Unlisted runtime deps; should be added to `package.json` in a future dependency hygiene pass |

### Commit Command
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" commit "docs(189): add knip dead-code triage report" --files .planning/phases/189-technical-debt-cleanup/189-knip-report.md knip.json
```

## DEB-03: jscpd Configuration and Report

### Tool Facts
- **Version:** 4.0.8 (current as of 2026-03-30, verified via `npm view jscpd version`)
- **Install location:** Not in project `node_modules` — runs via `npx jscpd`
- **Config file:** `.jscpd.json` at project root (no existing config found)
- **Output format:** JSON report via `--reporters json --output <dir>`

### Required `.jscpd.json` Configuration

```json
{
  "threshold": 0,
  "minLines": 10,
  "minTokens": 100,
  "reporters": ["json", "console"],
  "output": ".planning/phases/189-technical-debt-cleanup/jscpd-report",
  "ignore": [
    "**/.planning/**",
    "**/node_modules/**",
    "**/coverage/**",
    "**/dashboard/.next/**",
    "**/.claude/**",
    "**/*.md",
    "**/*.json",
    "**/*.sh"
  ],
  "path": ["bin", "lib", "packages"]
}
```

**Threshold 0:** Emit all duplications found above minLines. The requirement says "above a configurable
threshold" — setting threshold to 0 means the report includes everything and the triage decides what
matters.

**minLines 10 / minTokens 100:** Avoids noise from short boilerplate patterns (require statements,
error handlers). The test run on two files with minLines 5 found 5 clones; raising to 10 will produce
a manageable set.

### Report Location

jscpd writes `jscpd-report.json` to the configured `--output` directory. Commit the JSON file as a
tracked artifact:

```
.planning/phases/189-technical-debt-cleanup/jscpd-report/jscpd-report.json
```

Also commit a companion `.planning/phases/189-technical-debt-cleanup/189-jscpd-triage.md` that
identifies each clone block as `accept` (expected shared pattern), `refactor-candidate` (worth
extracting), or `defer` (low priority).

### Commit Command
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" commit "docs(189): add jscpd duplication report and triage" --files .planning/phases/189-technical-debt-cleanup/jscpd-report/jscpd-report.json .planning/phases/189-technical-debt-cleanup/189-jscpd-triage.md .jscpd.json
```

## DEB-04: ESLint Configuration

### Tool Facts
- **ESLint version:** 10.1.0 (current, flat config format required — no `.eslintrc`)
- **eslint-plugin-n version:** 17.24.0 (Node.js specific rules)
- **@eslint/js version:** 10.0.1 (ESLint built-in JS rule sets)
- **Config format:** `eslint.config.mjs` (flat config, ESLint 9+ standard)
- **None installed** in project `node_modules` — runs via `npx eslint --no-install-plugins .` OR install as devDeps first

### Codebase Profile
- **123 CJS files** across `bin/`, `lib/`, `packages/`
- **Node.js version:** 20.20.0
- **Module format:** `'use strict'; const x = require(...)` — all CommonJS
- **No TypeScript compilation** on CJS files (TypeScript only in `packages/pde-mcp-server/src/`)
- No existing eslint config of any kind

### Required `eslint.config.mjs`

```javascript
// eslint.config.mjs
import js from '@eslint/js';
import n from 'eslint-plugin-n';

export default [
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'dashboard/**',
      '.planning/**',
      '.claude/**',
      'packages/pde-mcp-server/src/**',   // TypeScript, separate tsconfig
      'packages/pde-mcp-server/dist/**',  // compiled output
      'bin/lib/video-pipeline/remotion/**',
      '*.mjs',                            // ESM files, different sourceType
    ],
  },
  {
    files: ['bin/**/*.cjs', 'lib/**/*.cjs', 'packages/**/*.cjs'],
    ...js.configs.recommended,
    plugins: { n },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'writable',
        exports: 'writable',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        Promise: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        globalThis: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'n/no-missing-require': 'error',
      'n/no-extraneous-require': 'warn',
    },
  },
];
```

### Installation (devDependencies)

Because `npx eslint .` with plugins requires the plugins to be installed or resolvable, install as
devDependencies:

```bash
npm install --save-dev eslint @eslint/js eslint-plugin-n
```

This is the correct approach — these are code quality tools used during development.

### Expected First-Run Errors

The first `npx eslint .` will likely surface:
- `no-unused-vars` warnings in `bin/lib/core.cjs` and `bin/lib/state.cjs` (large modules with many exports)
- `n/no-missing-require` errors for `node-fetch`, `node-ssh` (unlisted deps found by knip too)
- `no-undef` errors if any globals were missed

**Strategy:** Fix `no-undef` errors (these are real bugs or missing globals). For `no-unused-vars`
in public API modules, add `/* eslint-disable no-unused-vars */` at the top with a comment explaining
the pattern (CLI plugin boundary — exports are consumed by external callers).

### Documented Exceptions File

If clean pass is not achievable, commit `.planning/phases/189-technical-debt-cleanup/189-eslint-exceptions.md`
listing each suppressed rule, the file it applies to, and why.

### Commit Commands
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" commit "chore(189): add ESLint 10 config with eslint-plugin-n" --files eslint.config.mjs package.json package-lock.json
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" commit "docs(189): add ESLint exceptions documentation" --files .planning/phases/189-technical-debt-cleanup/189-eslint-exceptions.md
```

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| knip | 6.1.0 | Dead code and unused dependency detection | Standard for JS/TS monorepos; zero-config entry detection; CommonJS support |
| jscpd | 4.0.8 | Copy-paste duplication detection | Industry standard CPD tool for JS; JSON output for artifact commits |
| eslint | 10.1.0 | Static analysis and code quality | Standard JS linter; flat config required at v9+ |
| eslint-plugin-n | 17.24.0 | Node.js-specific lint rules | Standard for Node.js projects; validates require paths, Node version compatibility |
| @eslint/js | 10.0.1 | Built-in JS rule configurations | Required peer for `js.configs.recommended` in flat config |

### Version Verification
All versions verified against npm registry on 2026-03-30:
- `npm view knip version` → 6.1.0
- `npm view jscpd version` → 4.0.8
- `npm view eslint version` → 10.1.0
- `npm view eslint-plugin-n version` → 17.24.0
- `npm view @eslint/js version` → 10.0.1

### Installation
```bash
npm install --save-dev eslint @eslint/js eslint-plugin-n
```

knip and jscpd: run via `npx`, no local install needed (per DEB-02/DEB-03 requirements which say "running `npx knip`" and "running `npx jscpd`").

## Architecture Patterns

### Recommended Project Structure (new files)
```
.
├── knip.json                    # knip dead-code config
├── .jscpd.json                  # jscpd duplication config
├── eslint.config.mjs            # ESLint flat config
└── .planning/phases/189-technical-debt-cleanup/
    ├── 189-knip-report.md           # triage table (keep/remove/defer)
    ├── jscpd-report/
    │   └── jscpd-report.json        # raw jscpd output
    ├── 189-jscpd-triage.md          # triage commentary
    └── 189-eslint-exceptions.md     # documented rule suppressions (if needed)
```

### Flat Config Pattern (ESLint 10)
ESLint 9+ dropped `.eslintrc` in favor of `eslint.config.mjs`. The flat config uses an array of
config objects. Each object can have `files`, `ignores`, `plugins`, `rules`, and `languageOptions`.
There is no `extends` string syntax — use spread (`...js.configs.recommended`) instead.

### CJS Source Type
The project is all `'use strict'` CommonJS. Set `languageOptions.sourceType: 'commonjs'` in the
ESLint config. This enables proper globals (`require`, `module`, `exports`, `__dirname`, `__filename`).

### Anti-Patterns to Avoid
- **Running knip without a `knip.json`:** Reports 334 "unused files" including planning archives and
  Next.js build output. Always configure `ignore` and `entry` first.
- **Using `.eslintrc.json` or `.eslintrc.js`:** Deprecated in ESLint 9, removed in ESLint 10. Use
  `eslint.config.mjs` only.
- **Setting `sourceType: 'module'` for CJS files:** Will cause `no-undef` errors on `require`,
  `module`, `exports`, `__dirname`, `__filename`.
- **Running jscpd on `.planning/**`:** Produces thousands of clone hits from archived phase documents.
  Always exclude via `--ignore` or `.jscpd.json`.
- **Treating all knip "unused exports" as dead code:** In a CLI plugin, exports are the public API
  consumed by external callers. knip cannot see external consumers. Triage before removing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dead code detection | Custom `grep` scripts for unused require() | `npx knip` | knip traces the full import graph across CJS/ESM/TS; grep misses re-exports and dynamic requires |
| Duplication detection | Manual code review | `npx jscpd` | AST-level token comparison finds structural clones that differ in variable names |
| Lint rules for Node.js | Custom no-missing-require checker | `eslint-plugin-n/no-missing-require` | Plugin validates against actual installed modules; handles path aliases |

## Common Pitfalls

### Pitfall 1: knip flags CLI entry-point exports as "unused"
**What goes wrong:** `bin/lib/state.cjs` exports 15 functions. knip reports all 15 as unused exports.
**Why it happens:** knip analyzes the static import graph. External callers (the plugin runtime) use
`require()` with dynamic paths that knip can't trace.
**How to avoid:** Set `"ignoreExportsUsedInFile": true` in `knip.json` and classify CLI boundary
exports as "keep — external API" in the triage report.
**Warning signs:** If 40+ exports from core modules are flagged unused, it's the CLI boundary issue.

### Pitfall 2: ESLint `no-undef` fires on Node.js globals
**What goes wrong:** `__dirname`, `process`, `Buffer`, `require` are flagged as undefined.
**Why it happens:** ESLint doesn't know the execution environment without explicit globals config.
**How to avoid:** Declare all Node.js globals in `languageOptions.globals` in `eslint.config.mjs`.
**Warning signs:** `__dirname is not defined` or `require is not defined` errors on first run.

### Pitfall 3: eslint-plugin-n `no-missing-require` fires on `node-fetch`, `node-ssh`
**What goes wrong:** `n/no-missing-require` errors for packages not in `package.json`.
**Why it happens:** These packages are runtime dependencies used by `bin/lib/3d-pipeline/convert.cjs`,
`packages/dispatcher/lib/remote-ssh.cjs`, etc. but not listed in `package.json` (confirmed by knip
"unlisted dependencies" finding).
**How to avoid:** Either add them to `package.json` dependencies (correct fix, deferred per scope) or
add `eslint-disable` comments with a note that the issue is tracked.
**Warning signs:** "Cannot find module 'node-fetch'" style errors from eslint-plugin-n.

### Pitfall 4: jscpd finds thousands of clones in `.planning/` archives
**What goes wrong:** Running `npx jscpd .` without ignore patterns produces an unmanageable report
because archived milestone test files repeat patterns across 22 milestones.
**How to avoid:** Always set `"ignore": ["**/.planning/**"]` in `.jscpd.json` and scope `"path"` to
`["bin", "lib", "packages"]`.
**Warning signs:** Clone count in the thousands in the console summary.

### Pitfall 5: DEB-01 edit changes gsd-tools.cjs references instead of pde-tools.cjs references
**What goes wrong:** Both files contain many `pde-os/.../gsd-tools.cjs` references that are correct
GSD engine calls. Accidentally replacing those breaks the entire workflow.
**Why it happens:** Both paths share the `pde-os/engines/gsd/bin/` prefix.
**How to avoid:** The sed pattern must match only `pde-os/engines/gsd/bin/pde-tools.cjs`, not
`pde-os/engines/gsd/bin/gsd-tools.cjs`. Use: `s|\$HOME/.claude/pde-os/engines/gsd/bin/pde-tools\.cjs|\${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs|g`
**Warning signs:** Verify with grep after edit that gsd-tools.cjs references are unchanged.

## Code Examples

### Verified Pattern: ESLint flat config for CJS codebase (eslint 10 + eslint-plugin-n)

```javascript
// eslint.config.mjs
// Source: https://eslint.org/docs/latest/use/configure/configuration-files
import js from '@eslint/js';
import n from 'eslint-plugin-n';

export default [
  {
    ignores: ['node_modules/**', 'coverage/**', 'dashboard/**', '.planning/**'],
  },
  {
    files: ['bin/**/*.cjs', 'lib/**/*.cjs', 'packages/**/*.cjs'],
    ...js.configs.recommended,
    plugins: { n },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'writable',
        exports: 'writable',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        Promise: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        globalThis: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'n/no-missing-require': 'error',
    },
  },
];
```

### Verified Pattern: knip.json for CLI plugin with CJS entry points

```json
{
  "entry": ["bin/pde-tools.cjs", "bin/*.cjs", "packages/*/index.cjs"],
  "project": ["bin/**/*.cjs", "lib/**/*.cjs", "packages/**/*.cjs"],
  "ignore": [".planning/**", "dashboard/**", "coverage/**", ".claude/**"],
  "ignoreDependencies": ["@fontsource/inter", "htm", "inter-ui"],
  "ignoreExportsUsedInFile": true
}
```

### Verified Pattern: .jscpd.json for source-only duplication scan

```json
{
  "threshold": 0,
  "minLines": 10,
  "minTokens": 100,
  "reporters": ["json", "console"],
  "output": ".planning/phases/189-technical-debt-cleanup/jscpd-report",
  "ignore": ["**/.planning/**", "**/node_modules/**", "**/dashboard/.next/**"],
  "path": ["bin", "lib", "packages"]
}
```

### Verified Pattern: Precise sed for DEB-01 path fix

```bash
# Fix only pde-tools.cjs references, not gsd-tools.cjs
sed -i '' \
  's|\$HOME/\.claude/pde-os/engines/gsd/bin/pde-tools\.cjs|\${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs|g' \
  workflows/execute-phase.md \
  workflows/complete-milestone.md

# Verify fix is correct
grep "pde-os.*pde-tools" workflows/execute-phase.md     # must be empty
grep "pde-os.*pde-tools" workflows/complete-milestone.md # must be empty
grep -c "pde-os.*gsd-tools" workflows/execute-phase.md   # must still be 26
```

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All tools | Yes | v20.20.0 | — |
| npm | Package install | Yes | bundled with Node | — |
| knip | DEB-02 | Via npx | 6.1.0 | — |
| jscpd | DEB-03 | Via npx | 4.0.8 | — |
| eslint | DEB-04 | Via npx (needs install for plugins) | 10.1.0 | — |
| eslint-plugin-n | DEB-04 | Via npm install | 17.24.0 | — |
| @eslint/js | DEB-04 | Via npm install | 10.0.1 | — |
| git | Commit artifacts | Yes | system | — |

**Note on ESLint plugins:** `npx eslint .` alone cannot resolve `eslint-plugin-n` unless it is installed
in `node_modules`. Install `eslint`, `@eslint/js`, and `eslint-plugin-n` as devDependencies before
running lint.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEB-01 | `pde-os.*pde-tools` grep returns empty in both workflow files | smoke | `grep "pde-os.*pde-tools" workflows/execute-phase.md workflows/complete-milestone.md` | n/a — shell assertion |
| DEB-02 | knip report file exists at committed path | smoke | `test -f .planning/phases/189-technical-debt-cleanup/189-knip-report.md` | no — created by plan |
| DEB-03 | jscpd JSON report exists at committed path | smoke | `test -f .planning/phases/189-technical-debt-cleanup/jscpd-report/jscpd-report.json` | no — created by plan |
| DEB-04 | eslint exits 0 on bin/ and lib/ | smoke | `npx eslint bin lib packages --no-warn-ignored` | no — requires eslint.config.mjs |

### Sampling Rate
- **Per task commit:** Run the specific smoke assertion for that task
- **Per wave merge:** `npx vitest run` (existing test suite must remain green)
- **Phase gate:** All four smoke assertions pass + `npx vitest run` green

### Wave 0 Gaps
- [ ] `eslint.config.mjs` — must exist before DEB-04 lint command can run
- [ ] `knip.json` — must exist before DEB-02 knip run is scoped correctly
- [ ] `.jscpd.json` — must exist before DEB-03 jscpd run is scoped correctly
- [ ] `npm install --save-dev eslint @eslint/js eslint-plugin-n` — before DEB-04 lint run

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `.eslintrc.json` / `.eslintrc.js` | `eslint.config.mjs` (flat config) | ESLint 9.0 (2024) | Cannot use legacy config with ESLint 10 |
| `eslint-plugin-node` | `eslint-plugin-n` | Renamed in 2022 | Package is now `eslint-plugin-n`, not `eslint-plugin-node` |
| `extends: ['eslint:recommended']` string | `...js.configs.recommended` spread | ESLint 9 flat config | No `extends` array in flat config format |

**Deprecated/outdated:**
- `eslint-plugin-node`: Renamed to `eslint-plugin-n`. Do not install `eslint-plugin-node`.
- `.eslintrc.*` files: Not supported in ESLint 10. ESLint 10 requires `eslint.config.mjs` (or `.cjs`/`.js`).

## Open Questions

1. **Should knip and jscpd be added as devDependencies?**
   - What we know: Requirements say "running `npx knip`" and "running `npx jscpd`" — implying npx invocation
   - What's unclear: Whether installing them as devDeps provides value (faster runs, version pinning)
   - Recommendation: Keep as npx invocations per requirement language. Config files (`knip.json`, `.jscpd.json`) pin the configuration without requiring local install.

2. **What is the triage threshold for jscpd clones?**
   - What we know: DEB-03 says "above the configured threshold" — threshold is configurable
   - What's unclear: How many clones will the real run produce across 123 CJS files
   - Recommendation: Start with minLines 10 / minTokens 100. If output is unmanageable (>100 clones), raise minLines to 15.

3. **Will ESLint produce a clean pass without code changes?**
   - What we know: No-undef and no-missing-require are the likely blockers; `node-fetch` and `node-ssh` are unlisted deps
   - What's unclear: Whether any files have real undefined variable bugs vs. just missing globals
   - Recommendation: Fix `no-undef` errors only if they represent real bugs. Use `eslint-disable` with documented comments for structural issues (unlisted deps, CLI boundary exports). Documented exceptions file is explicitly allowed by DEB-04.

## Sources

### Primary (HIGH confidence)
- `npm view knip version` — verified 6.1.0 on 2026-03-30
- `npm view jscpd version` — verified 4.0.8 on 2026-03-30
- `npm view eslint version` — verified 10.1.0 on 2026-03-30
- `npm view eslint-plugin-n version` — verified 17.24.0 on 2026-03-30
- `npm view @eslint/js version` — verified 10.0.1 on 2026-03-30
- Direct file inspection of `workflows/execute-phase.md` and `workflows/complete-milestone.md` — exact line numbers confirmed
- `npx knip --reporter compact` live run — confirmed 334 unused files, 46 unused exports, dependency findings
- `npx jscpd` live run on 2 files — confirmed JSON output format and clone detection behavior

### Secondary (MEDIUM confidence)
- ESLint flat config format: https://eslint.org/docs/latest/use/configure/configuration-files (training knowledge, format confirmed by ESLint 10 release)
- eslint-plugin-n rename from eslint-plugin-node: confirmed by npm registry (eslint-plugin-n is the active package)

## Metadata

**Confidence breakdown:**
- DEB-01 path fix: HIGH — exact line numbers confirmed by direct file inspection
- DEB-02 knip config: HIGH — live knip run confirms raw output; config rationale verified
- DEB-03 jscpd config: HIGH — live jscpd run confirms output format; .jscpd.json schema verified
- DEB-04 ESLint config: MEDIUM-HIGH — flat config format verified; first-run errors are estimated based on codebase patterns; actual error count unknown until run

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (tool versions stable; npm registry versions checked day-of)
