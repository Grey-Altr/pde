# Phase 12: Design Pipeline Infrastructure - Research

**Researched:** 2026-03-15
**Domain:** Node.js CommonJS tooling — file system initialization, write-lock concurrency, DTCG token conversion, JSON manifest management
**Confidence:** HIGH (all findings verified from direct source inspection; no training-data guesses used)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | `.planning/design/` directory created on first design skill invocation | Directory creation pattern documented; `fs.mkdirSync({ recursive: true })` is the correct Node built-in approach. All domain subdirs (strategy, ux, visual, assets, review, handoff) defined by existing templates. |
| INFRA-02 | DESIGN-STATE.md tracks pipeline stage completion with write-lock mechanism | Root DESIGN-STATE.md template already designed at `templates/design-state-root.md`. Write-lock protocol documented in ARCHITECTURE.md Pattern 3. Lock mechanism implemented as a Write Lock table in the Markdown file itself. |
| INFRA-03 | `bin/lib/design.cjs` provides DTCG-to-CSS conversion and artifact path resolution | `dtcgToCss()` and `generateCssVars()` pseudocode verified in STACK.md against DTCG 2025.10 spec. Zero npm deps. Existing `bin/lib/` pattern for CommonJS modules is the correct target location. |
| INFRA-04 | `design-manifest.json` records every generated artifact with path, type, version, and dependency metadata | Schema template exists at `templates/design-manifest.json`. Fields: code, name, type, domain, path, status, version, dependsOn, children, tokens, implementation. |
</phase_requirements>

---

## Summary

Phase 12 establishes the shared foundation that all eight subsequent v1.1 design phases depend on. It is a pure infrastructure phase — no design skills are implemented here, only the scaffolding they all require: directory auto-creation, state tracking with write-lock, a DTCG-to-CSS utility, and a machine-readable artifact manifest.

All four requirements map to well-defined implementation targets that already exist as templates or have been architecturally decided. The ARCHITECTURE.md and STACK.md written during v1.1 project research resolve every key technical question for this phase. There are no open decisions that require further exploration. The primary work is: create `bin/lib/design.cjs`, initialize the design directory structure and template files in the right location, and wire in a small set of `pde-tools.cjs` subcommands under a `design` namespace.

The write-lock mechanism for DESIGN-STATE.md is implemented as a Markdown table row (not a filesystem lock), because this project uses Claude Code as the runtime — there is no multi-process concurrency, only multi-subagent concurrency within a single conversation. The lock is a coordination protocol the main conversation enforces, not a filesystem primitive.

**Primary recommendation:** Build `bin/lib/design.cjs` first (INFRA-03), then the directory initializer that reads from it (INFRA-01), then the DESIGN-STATE.md write-lock logic (INFRA-02), then the manifest read/write operations (INFRA-04). All four ship as one integrated unit.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js `fs` | built-in (20.x LTS) | Directory creation, file read/write | Zero-dep constraint is non-negotiable; `fs.mkdirSync({ recursive: true })` handles INFRA-01 |
| Node.js `path` | built-in (20.x LTS) | Cross-platform path construction | `toPosixPath()` helper already in core.cjs; use the same pattern |
| CommonJS (.cjs) | ES2020 | Module format | All `bin/lib/` modules are `.cjs`; Claude Code plugin compatibility requires CJS |
| Markdown + YAML frontmatter | — | DESIGN-STATE.md format | Matches the existing STATE.md and all PDE planning files; human-readable and vcs-diff-friendly |
| JSON | — | `design-manifest.json` format | Machine-readable, no parser needed beyond `JSON.parse`/`JSON.stringify` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js `assert` | built-in | Self-test assertions in `design.cjs --self-test` mode | Zero-dep test runner for CI; same constraint as rest of codebase |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Markdown write-lock table | Lockfile on disk (`.design-state.lock`) | Lockfile is cleaner for OS-level concurrency but overkill here — Claude subagents run in the same session, not parallel OS processes. Markdown table is visible to humans and LLMs alike. |
| Custom `dtcgToCss()` | Style Dictionary v5, Terrazzo v0.7.2 | Both are ESM-only, incompatible with CJS codebase. `dtcgToCss()` covers 100% of v1.1 use case (CSS custom properties output only). |
| `design-manifest.json` as plain JSON | A markdown manifest | JSON is machine-readable for future engineering phase tooling. Plain JSON is the correct choice — aligns with `config.json` and existing manifest patterns. |

**Installation:** No new npm packages. Zero dependencies.

---

## Architecture Patterns

### Recommended Project Structure

All new source code for Phase 12 lives in two places:

```
bin/lib/
└── design.cjs           # NEW: DTCG conversion, manifest ops, path resolution

# Runtime artifacts (created when first design skill runs, not in plugin repo):
.planning/design/
├── DESIGN-STATE.md       # root write-locked index (from templates/design-state-root.md)
├── design-manifest.json  # artifact registry (from templates/design-manifest.json)
├── assets/               # tokens.css lives here (referenced by wireframes)
├── strategy/             # /pde:brief artifacts
│   └── DESIGN-STATE.md   # domain-level state (created when first brief artifact is written)
├── ux/                   # /pde:flows + /pde:wireframe artifacts
│   └── DESIGN-STATE.md
├── visual/               # /pde:system artifacts
│   └── DESIGN-STATE.md
├── review/               # /pde:critique artifacts
│   └── DESIGN-STATE.md
└── handoff/              # /pde:handoff artifacts
    └── DESIGN-STATE.md
```

### Pattern 1: Directory Auto-Initialization

**What:** When any design skill runs for the first time, it calls `design.ensureDesignDirs(cwd)` before doing any other work. The function is idempotent — calling it on an already-initialized directory does nothing.

**When to use:** Called at the top of every design skill workflow before reading or writing artifacts.

**Example:**

```javascript
// Source: bin/lib/design.cjs (to be created in Phase 12)
// Pattern modeled on fs.mkdirSync usage throughout bin/lib/*.cjs

const DOMAIN_DIRS = ['assets', 'strategy', 'ux', 'visual', 'review', 'handoff'];

function ensureDesignDirs(cwd) {
  const designRoot = path.join(cwd, '.planning', 'design');
  fs.mkdirSync(designRoot, { recursive: true });
  for (const domain of DOMAIN_DIRS) {
    fs.mkdirSync(path.join(designRoot, domain), { recursive: true });
  }
  // Initialize root DESIGN-STATE.md if absent (idempotent: no-op if present)
  const stateFile = path.join(designRoot, 'DESIGN-STATE.md');
  if (!fs.existsSync(stateFile)) {
    const tmpl = fs.readFileSync(
      path.join(cwd, 'templates', 'design-state-root.md'), 'utf-8'
    );
    fs.writeFileSync(stateFile, tmpl.replace('{date}', new Date().toISOString().split('T')[0]));
  }
  // Initialize design-manifest.json if absent (strips _comment keys)
  const manifestFile = path.join(designRoot, 'design-manifest.json');
  if (!fs.existsSync(manifestFile)) {
    const tmpl = fs.readFileSync(
      path.join(cwd, 'templates', 'design-manifest.json'), 'utf-8'
    );
    const parsed = JSON.parse(tmpl);
    stripCommentKeys(parsed);
    parsed.artifacts = {};  // clear example entries
    parsed.generatedAt = new Date().toISOString();
    parsed.updatedAt = parsed.generatedAt;
    fs.writeFileSync(manifestFile, JSON.stringify(parsed, null, 2));
  }
}
```

### Pattern 2: Write-Lock Protocol for DESIGN-STATE.md

**What:** DESIGN-STATE.md contains a `### Write Lock` table. Before writing to the root file, the caller checks the table — if `Locked By` is non-empty and the lock has not expired, it returns false (caller retries or aborts). After writing, it clears the lock row. The lock includes a TTL so stale locks from interrupted sessions are automatically cleared.

**When to use:** Any code that writes to `.planning/design/DESIGN-STATE.md`. Domain DESIGN-STATE.md files do NOT use this lock.

**Key contract:**

- `acquireWriteLock(cwd, owner)` → returns `true` if acquired, `false` if already locked
- `releaseWriteLock(cwd)` → always clears the lock row (idempotent)
- Lock entry includes `Expires` column with ISO timestamp (recommended TTL: 60 seconds)
- On any `acquireWriteLock` call: first check if existing lock row has an expired TTL; if expired, clear it and proceed

**Implementation approach:** Read DESIGN-STATE.md content, check the Write Lock table for a non-header/non-comment row; if present and not expired, return false; otherwise insert a lock row and write the file.

### Pattern 3: DTCG-to-CSS Conversion (`dtcgToCss`)

**What:** Recursively walks a DTCG 2025.10 JSON token tree and emits CSS custom property declarations. Keys starting with `$` are metadata, not tokens. Leaf nodes have `$value`. Groups recurse with a prefix.

**When to use:** Called by `pde-tools.cjs design tokens-to-css <tokens-file>`. Also callable directly from `bin/lib/design.cjs`.

**Example:**

```javascript
// Source: STACK.md pseudocode, verified against designtokens.org/tr/drafts/format/ (DTCG 2025.10)
// Keys prefixed with $ are spec metadata: $description, $type, $extensions — skip all of them

function dtcgToCssLines(tokens, prefix) {
  prefix = prefix || '';
  const lines = [];
  for (const key of Object.keys(tokens)) {
    if (key.startsWith('$')) continue;
    const node = tokens[key];
    if (node !== null && typeof node === 'object' && '$value' in node) {
      // Leaf token: emit CSS custom property
      lines.push('  --' + prefix + key + ': ' + node.$value + ';');
    } else if (node !== null && typeof node === 'object') {
      // Group: recurse with extended prefix
      dtcgToCssLines(node, prefix + key + '-').forEach(l => lines.push(l));
    }
  }
  return lines;
}

function generateCssVars(tokens) {
  return ':root {\n' + dtcgToCssLines(tokens).join('\n') + '\n}\n';
}
```

### Pattern 4: Manifest Read/Write

**What:** The manifest is a plain JSON file at `.planning/design/design-manifest.json`. Functions in `design.cjs` provide atomic read/write access with a clean API.

**Example:**

```javascript
// Source: design.cjs (to be created) — pattern modeled on JSON parse/stringify in config.cjs

function readManifest(cwd) {
  const p = path.join(cwd, '.planning', 'design', 'design-manifest.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function writeManifest(cwd, manifest) {
  manifest.updatedAt = new Date().toISOString();
  const p = path.join(cwd, '.planning', 'design', 'design-manifest.json');
  fs.writeFileSync(p, JSON.stringify(manifest, null, 2), 'utf-8');
}

function updateManifestArtifact(cwd, code, fields) {
  const manifest = readManifest(cwd);
  if (!manifest) throw new Error('design-manifest.json not found');
  manifest.artifacts = manifest.artifacts || {};
  manifest.artifacts[code] = Object.assign(manifest.artifacts[code] || {}, fields);
  writeManifest(cwd, manifest);
}
```

### Pattern 5: pde-tools.cjs `design` Subcommand Namespace

**What:** Phase 12 adds a `design` subcommand router to `pde-tools.cjs` (following the exact same pattern as the `state`, `phase`, `roadmap`, and `milestone` routers that already exist).

**When to use:** Design skills invoke `pde-tools.cjs design <subcommand>` for manifest/state operations rather than using raw filesystem calls.

**Subcommands to implement:**

| Subcommand | Purpose | Implementation |
|------------|---------|----------------|
| `design ensure-dirs` | Create `.planning/design/` and all domain subdirs | Calls `design.ensureDesignDirs(cwd)` |
| `design manifest-read` | Output `design-manifest.json` as JSON | `JSON.stringify(design.readManifest(cwd))` |
| `design manifest-update <code> <field> <value>` | Update a specific artifact field | Calls `design.updateManifestArtifact()` |
| `design artifact-path <code>` | Resolve canonical artifact path from manifest | Reads manifest, returns `artifacts[code].path` |
| `design tokens-to-css <tokens-file>` | Convert DTCG JSON to CSS custom properties | Calls `design.generateCssVars()` |
| `design coverage-check` | Return which artifact types exist | Reads `manifest.designCoverage` |
| `design lock-acquire <owner>` | Acquire root DESIGN-STATE.md write lock | Calls `design.acquireWriteLock()` |
| `design lock-release` | Release root DESIGN-STATE.md write lock | Calls `design.releaseWriteLock()` |

### Anti-Patterns to Avoid

- **Implementing a filesystem lock for DESIGN-STATE.md:** Claude subagents within a session are not separate OS processes. A `.lock` file would behave unpredictably because Claude tool calls are not atomic OS operations. The Markdown write-lock table approach is the correct protocol for this runtime.
- **Writing `_comment` keys to the live manifest:** The `design-manifest.json` template uses `_comment` keys for documentation. Strip these before writing the live manifest — they pollute production data reads and every downstream consumer would need to filter them.
- **Initializing domain DESIGN-STATE.md files eagerly:** Only create domain DESIGN-STATE.md files when the first artifact is written to that domain. Eager creation of all 6 domain files creates false signals about pipeline completion.
- **Storing `design-manifest.json` inside a domain subdirectory:** The manifest lives at `.planning/design/design-manifest.json` (root level), not inside any domain. It is the cross-domain index.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DTCG token conversion | Custom regex parser for `$value` | `dtcgToCssLines()` recursive walker (INFRA-03) | DTCG nests arbitrarily; regex breaks on nested groups |
| Concurrent write safety | OS-level file locking | Markdown write-lock table + TTL | No OS concurrency in Claude session; lockfile npm pkg would add a dependency |
| Artifact discovery | Scanning directory for file patterns | Reading `design-manifest.json` | Manifest is the authoritative index; file scanning misses metadata (type, version, dependencies) |
| Cross-platform path handling | Manual path separator replacement | `toPosixPath()` from core.cjs (already exists) | Already implemented across v1.0 phases |
| Template interpolation | Custom `{{variable}}` engine | Direct string `.replace()` on known placeholders | Templates have 3-5 placeholders max; a template engine would be overkill |

**Key insight:** All four INFRA requirements map to small, focused functions in `bin/lib/design.cjs`. The complexity surface is narrow because the design pipeline architecture was fully designed in the project research phase — this phase is implementing well-specified primitives, not making architecture decisions.

---

## Common Pitfalls

### Pitfall 1: Template `_comment` Keys Written to Live Manifest

**What goes wrong:** `design-manifest.json` is initialized from `templates/design-manifest.json` which has `_comment` fields throughout. If the template is parsed and written directly without stripping these keys, every downstream consumer of the manifest (handoff, build orchestrator) must filter them out.

**Why it happens:** `JSON.parse(template)` includes `_comment` keys — JSON has no native comment syntax, so template authors use `_comment` as a convention.

**How to avoid:** Write a `stripCommentKeys(obj)` helper that deletes keys starting with `_comment` recursively before writing the initial manifest.

**Warning signs:** `design-manifest.json` contains keys named `_comment`.

---

### Pitfall 2: DESIGN-STATE.md Write Lock Left Unreleased on Error

**What goes wrong:** A skill acquires the write lock, encounters an error mid-write, and never releases it. All subsequent skills are blocked with "DESIGN-STATE.md is locked."

**Why it happens:** Error paths skip the release call. The lock has no automatic cleanup.

**How to avoid:** Every `lock-acquire` call must be paired with a `try/finally` block that calls `lock-release` in the finally branch. Lock entries include an `Expires` timestamp — `acquireWriteLock` should check for stale locks (expired TTL) and clear them before checking if locked.

**Warning signs:** Lock table row has an `Expires` timestamp in the past.

---

### Pitfall 3: `ensureDesignDirs` Overwrites Existing DESIGN-STATE.md

**What goes wrong:** Running any design skill for the second time calls `ensureDesignDirs`, which overwrites the populated `DESIGN-STATE.md` with the blank template, losing all tracked pipeline state.

**Why it happens:** Missing `if (!fs.existsSync(stateFile))` guard before writing.

**How to avoid:** Check file existence before writing. `ensureDesignDirs` is idempotent: it creates if missing, does nothing if present.

**Warning signs:** DESIGN-STATE.md is always empty after running a second skill.

---

### Pitfall 4: Token Prefix Collisions in `dtcgToCss`

**What goes wrong:** Two DTCG groups produce the same CSS custom property name. E.g., a flat token `color-primary` and a nested `color.primary` both emit `--color-primary`.

**Why it happens:** The recursive walker concatenates keys with `-`. If the token author uses both flat and nested naming in the same file, collisions occur.

**How to avoid:** The converter does not deduplicate — it emits exactly what the token author specifies. This is intentional: the collision is a token authoring error. Document this clearly so `pde:system` token generation instructions warn against mixing flat and nested tokens at the same path depth.

**Warning signs:** CSS file has duplicate `--` variable names; browser uses last-defined value silently.

---

### Pitfall 5: Domain DESIGN-STATE.md Created Before Artifact Exists

**What goes wrong:** `ensureDesignDirs` eagerly initializes domain DESIGN-STATE.md files for all 6 domains. Now `pde:build` reads 6 domain files and concludes "all domains active" even before any skill has run.

**Why it happens:** Over-eager initialization in `ensureDesignDirs`.

**How to avoid:** `ensureDesignDirs` creates directories only, not domain DESIGN-STATE.md files. Domain state files are created by the skill that writes the first artifact to that domain (e.g., `pde:brief` creates `strategy/DESIGN-STATE.md`).

**Warning signs:** All 6 domain DESIGN-STATE.md files exist from the moment the design directory is initialized, even before any skill runs.

---

## Code Examples

Verified patterns from existing source and official sources:

### Directory Creation (Node.js built-in, recursive)

```javascript
// Pattern: verified from Node.js 20 docs — fs.mkdirSync with recursive option
// Same approach used throughout bin/lib/*.cjs (no external deps)
const fs = require('fs');
const path = require('path');

function ensureDesignDirs(cwd) {
  const domains = ['assets', 'strategy', 'ux', 'visual', 'review', 'handoff'];
  const designRoot = path.join(cwd, '.planning', 'design');
  fs.mkdirSync(designRoot, { recursive: true });
  for (const domain of domains) {
    fs.mkdirSync(path.join(designRoot, domain), { recursive: true });
  }
}
// Note: fs.mkdirSync({ recursive: true }) does NOT throw if directory already exists.
// This makes it inherently idempotent — safe to call on every skill invocation.
```

### Stripping `_comment` Keys from Manifest Template

```javascript
// Pattern: standard recursive object mutation — no deps needed
function stripCommentKeys(obj) {
  if (typeof obj !== 'object' || obj === null) return;
  for (const key of Object.keys(obj)) {
    if (key === '_comment') {
      delete obj[key];
    } else {
      stripCommentKeys(obj[key]);
    }
  }
}
```

### DTCG-to-CSS Conversion (verified against DTCG 2025.10 spec)

```javascript
// Source: STACK.md pseudocode, confirmed against designtokens.org/tr/drafts/format/
// DTCG 2025.10: leaf tokens have $value; groups are plain objects; $-prefixed keys are spec metadata

function dtcgToCssLines(tokens, prefix) {
  prefix = prefix || '';
  const lines = [];
  for (const key of Object.keys(tokens)) {
    if (key.startsWith('$')) continue; // $description, $type, $extensions
    const node = tokens[key];
    if (node !== null && typeof node === 'object' && '$value' in node) {
      lines.push('  --' + prefix + key + ': ' + node.$value + ';');
    } else if (node !== null && typeof node === 'object') {
      dtcgToCssLines(node, prefix + key + '-').forEach(l => lines.push(l));
    }
  }
  return lines;
}

function generateCssVars(tokens) {
  return ':root {\n' + dtcgToCssLines(tokens).join('\n') + '\n}\n';
}
```

### Manifest Update (atomic field update)

```javascript
// Pattern modeled on JSON parse/stringify used in config.cjs
function updateManifestArtifact(cwd, code, fields) {
  const manifestPath = path.join(cwd, '.planning', 'design', 'design-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  manifest.artifacts = manifest.artifacts || {};
  manifest.artifacts[code] = Object.assign(manifest.artifacts[code] || {}, fields);
  manifest.updatedAt = new Date().toISOString();
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
}
```

### pde-tools.cjs design subcommand router (skeleton)

```javascript
// Source: pde-tools.cjs router pattern (verified by direct read of bin/pde-tools.cjs)
// Add after 'milestone' case block (~line 480)
case 'design': {
  const subcommand = args[1];
  const design = require('./lib/design.cjs');
  if (subcommand === 'ensure-dirs') {
    design.cmdEnsureDirs(cwd, raw);
  } else if (subcommand === 'manifest-read') {
    design.cmdManifestRead(cwd, raw);
  } else if (subcommand === 'manifest-update') {
    design.cmdManifestUpdate(cwd, args[2], args[3], args[4], raw);
  } else if (subcommand === 'artifact-path') {
    design.cmdArtifactPath(cwd, args[2], raw);
  } else if (subcommand === 'tokens-to-css') {
    design.cmdTokensToCss(cwd, args[2], raw);
  } else if (subcommand === 'coverage-check') {
    design.cmdCoverageCheck(cwd, raw);
  } else if (subcommand === 'lock-acquire') {
    design.cmdLockAcquire(cwd, args[2], raw);
  } else if (subcommand === 'lock-release') {
    design.cmdLockRelease(cwd, raw);
  } else {
    error('Unknown design subcommand');
  }
  break;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| DTCG as a draft spec | DTCG 2025.10 is the first stable W3C spec | October 2025 | `$value`/`$type` format is now locked; no spec changes expected for v1.1 |
| Style Dictionary for token conversion | Zero-dep recursive walker in project code | v1.1 design | Style Dictionary v4+ is ESM-only; not usable from CJS |
| Mermaid npm for flow diagram rendering | LLM writes Mermaid text directly | v1.1 design | Mermaid v10+ is ESM-only; PDE only needs text output, not rendered SVG |
| Separate state schema per tool | DESIGN-STATE.md Markdown tables as shared format | v1.1 design | Markdown is human-readable, LLM-readable, and diff-friendly |

**Deprecated/outdated:**

- `templates/design-state.md` — a legacy state template. The authoritative template for Phase 12 is `templates/design-state-root.md` (which includes the Write Lock table). Do not use the legacy file for the root DESIGN-STATE.md.
- `templates/pipeline-state.md` — an earlier pipeline state design. DESIGN-STATE.md from `templates/design-state-root.md` supersedes it for v1.1. Do not initialize `pipeline-state.md` as part of Phase 12.

---

## Open Questions

1. **`design-manifest.json` initial artifact entries: blank vs. pre-populated from template examples**
   - What we know: Template has example entries (BRF, FLW-main, SYS, WFR-login) — these are documentation, not real data.
   - What's unclear: Should `ensureDesignDirs` write an empty `artifacts: {}` or preserve the example entries as structural guidance?
   - Recommendation: Strip all `_comment` keys AND strip all example artifact entries. Live manifest starts with `"artifacts": {}` and `"designCoverage"` flags all `false`. Example entries exist only to document the schema.

2. **Write-lock TTL: how long?**
   - What we know: No project decision exists on TTL duration. Skills could take longer than expected in complex projects.
   - Recommendation: Use 60 seconds as the TTL. Document TTL as a named constant in `design.cjs` so it is easy to adjust. The main risk is stale locks from interrupted sessions, not from normal operation.

3. **`pde-tools.cjs` `design` router scope for Phase 12**
   - What we know: Subsequent phases (13-20) may need additional design subcommands beyond the 8 infrastructure ones.
   - Recommendation: Phase 12 adds only the 8 infrastructure subcommands. Subsequent phases extend the router as needed. The router switch statement is trivially extensible.

---

## Validation Architecture

`nyquist_validation` is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in `assert` module — embedded in `design.cjs --self-test` mode (zero-dep constraint) |
| Config file | none — tests are inline assertions in the module itself |
| Quick run command | `node bin/lib/design.cjs --self-test` |
| Full suite command | `bash scripts/validate-install.sh && node bin/lib/design.cjs --self-test` |

Note: The project has no installed test framework (no Jest, no Vitest, no package.json). Validation uses Node's built-in `assert` module in a `--self-test` entry point embedded in `design.cjs`. This is consistent with the zero-dependency constraint already established across v1.0.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | `ensureDesignDirs` creates all 6 domain directories | unit | `node bin/lib/design.cjs --self-test` (covers dir creation) | ❌ Wave 0 |
| INFRA-01 | `ensureDesignDirs` is idempotent (safe to call twice) | unit | `node bin/lib/design.cjs --self-test` | ❌ Wave 0 |
| INFRA-01 | Root DESIGN-STATE.md created with correct Write Lock table structure | unit | `node bin/lib/design.cjs --self-test` | ❌ Wave 0 |
| INFRA-01 | `design-manifest.json` initialized with no `_comment` keys | unit | `node bin/lib/design.cjs --self-test` | ❌ Wave 0 |
| INFRA-02 | Write lock acquisition and release round-trips cleanly | unit | `node bin/lib/design.cjs --self-test` | ❌ Wave 0 |
| INFRA-02 | Second lock-acquire returns false when already locked | unit | `node bin/lib/design.cjs --self-test` | ❌ Wave 0 |
| INFRA-02 | Stale lock (expired TTL) is cleared on next acquire attempt | unit | `node bin/lib/design.cjs --self-test` | ❌ Wave 0 |
| INFRA-03 | `dtcgToCssLines` converts flat token to CSS custom property | unit | `node bin/lib/design.cjs --self-test` | ❌ Wave 0 |
| INFRA-03 | `dtcgToCssLines` recurses into nested groups with correct prefix | unit | `node bin/lib/design.cjs --self-test` | ❌ Wave 0 |
| INFRA-03 | `dtcgToCssLines` skips `$`-prefixed metadata keys | unit | `node bin/lib/design.cjs --self-test` | ❌ Wave 0 |
| INFRA-03 | `generateCssVars` wraps output in `:root {}` block | unit | `node bin/lib/design.cjs --self-test` | ❌ Wave 0 |
| INFRA-04 | `readManifest` returns null when no manifest exists | unit | `node bin/lib/design.cjs --self-test` | ❌ Wave 0 |
| INFRA-04 | `updateManifestArtifact` creates new artifact entry | unit | `node bin/lib/design.cjs --self-test` | ❌ Wave 0 |
| INFRA-04 | `writeManifest` sets `updatedAt` automatically | unit | `node bin/lib/design.cjs --self-test` | ❌ Wave 0 |
| INFRA-04 | `stripCommentKeys` removes `_comment` fields recursively | unit | `node bin/lib/design.cjs --self-test` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `node -e "require('./bin/lib/design.cjs')" 2>&1 && echo 'syntax OK'` (verify module loads without error)
- **Per wave merge:** `node bin/lib/design.cjs --self-test` (all INFRA unit tests)
- **Phase gate:** `bash scripts/validate-install.sh` passes + `node bin/lib/design.cjs --self-test` passes before `/gsd:verify-work`

### Wave 0 Gaps

All test infrastructure for this phase is embedded in a single `--self-test` entry point in `design.cjs`:

- [ ] `bin/lib/design.cjs` with `--self-test` entry point — covers all 15 INFRA unit tests above using `require('assert')` and a temp directory (`os.tmpdir()`)

The `--self-test` entry point pattern: when `process.argv[2] === '--self-test'`, run all assertions and exit with code 0 on pass, code 1 on failure. This integrates cleanly into the existing shell-based `validate-install.sh` pattern without adding any tooling.

---

## Sources

### Primary (HIGH confidence)

- PDE source: `bin/lib/state.cjs` — STATE.md file read/write patterns, module structure baseline for `bin/lib/design.cjs`
- PDE source: `bin/lib/core.cjs` — `toPosixPath()`, `loadConfig()`, `output()`, `error()` utilities; `fs.mkdirSync` usage
- PDE source: `bin/pde-tools.cjs` — CLI router structure; `design` case to be added at existing pattern location (~line 480)
- PDE templates: `templates/design-state-root.md` — authoritative root DESIGN-STATE.md schema with Write Lock table
- PDE templates: `templates/design-state-domain.md` — authoritative domain DESIGN-STATE.md schema
- PDE templates: `templates/design-manifest.json` — authoritative manifest schema (fields, types, examples)
- PDE research: `.planning/research/STACK.md` — `dtcgToCss()` pseudocode, zero-dep rationale, DTCG spec confirmation, ESM incompatibility of Style Dictionary/Terrazzo
- PDE research: `.planning/research/ARCHITECTURE.md` — directory structure, write-lock protocol, anti-patterns, suggested build order
- designtokens.org/tr/drafts/format/ — DTCG 2025.10 spec: `$value`/`$type`/`$extensions` key semantics confirmed

### Secondary (MEDIUM confidence)

- Node.js 20 official docs — `fs.mkdirSync({ recursive: true })` behavior confirmed idempotent; does not throw if directory already exists

### Tertiary (LOW confidence)

None — all critical claims verified from direct source inspection.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — zero-dep CJS constraint documented and verified from source; no alternatives viable
- Architecture: HIGH — directory structure, write-lock protocol, and manifest schema all exist as finalized templates
- Pitfalls: HIGH — identified from direct inspection of template `_comment` fields, lock protocol design, and DTCG spec edge cases

**Research date:** 2026-03-15
**Valid until:** 2026-06-15 (stable; DTCG spec is locked at 2025.10; Node 20 LTS stable through April 2026, security-only through April 2028)
