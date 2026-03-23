# Phase 101: Experiment Schema & State Directory - Research

**Researched:** 2026-03-23
**Domain:** CJS schema parsing, directory initialization, config patching, ROADMAP phase type extension
**Confidence:** HIGH

## Summary

Phase 101 is a pure infrastructure definition phase. It establishes the data contracts that all subsequent experiment phases (102-107) will consume. There are no external dependencies to research — everything needed is already present in the codebase: a YAML frontmatter parser, a directory-creation pattern, a config patching mechanism, and a roadmap phase format.

The main implementation risk is getting the `experiment.md` schema wrong in a way that blocks Phase 102. The schema must be expressive enough for the mutation agent to work with but simple enough that parsing never fails silently. The existing `parseFrontmatter` in `experiment.cjs` (line 39) is a simple line-by-line parser that handles scalars and flat arrays. `frontmatter.cjs` has a more robust nested-object stack parser (`extractFrontmatter`). Phase 101 must choose which parser to extend and document the schema contract clearly.

The `.planning/experiments/` directory does not currently exist. It must be created by an `ensureExperimentDirs` function mirroring `ensureDesignDirs` in `design.cjs`, hooked into the `design ensure-dirs` pathway or given its own `experiment ensure-dirs` subcommand. The config `experiment_defaults` block must be added directly to `.planning/config.json` — it is a new top-level section, not a nested `workflow.*` key, and should follow the same write-then-read pattern used by `cmdConfigEnsureSection`.

**Primary recommendation:** Extend `experiment.cjs` with a `parseExperimentFile` helper using `extractFrontmatter` from `frontmatter.cjs`, add `cmdEnsureExperimentDirs` to `experiment.cjs`, expose it via `experiment ensure-dirs` in `pde-tools.cjs`, and patch `config.json` with an `experiment_defaults` block during setup.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- `experiment.md` filename is lowercase (user-authored config file convention, consistent with `program.md`)
- Agent-produced outputs use uppercase: `EXPERIMENT-BEST.json`, `REPORT.md`
- 300-line ceiling enforced on `experiment.cjs` — if a feature causes this to be exceeded it goes through a separate phase

### Claude's Discretion
All remaining implementation choices are at Claude's discretion. This is a pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

### Deferred Ideas (OUT OF SCOPE)
None declared.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXEC-01 | `experiment.md` file format: YAML frontmatter (metric name, direction min/max, verify command, mutable files, immutable files, budget) + markdown prose | `extractFrontmatter` in `frontmatter.cjs` handles nested YAML; existing `parseFrontmatter` in `experiment.cjs` handles flat scalars and arrays — combined pattern covers schema needs |
| EXEC-05 | JSONL results log at `.planning/experiments/{slug}/results.jsonl` — each row: `{id, iteration, ts, commit, metric_value, metric_delta, status, description}` | Directory structure is created by `ensureExperimentDirs`; JSONL row schema defined here becomes the contract Phase 102 writes to |
| EXEC-06 | Experiment state directory at `.planning/experiments/{slug}/` with experiment.md copy, results.jsonl, EXPERIMENT-BEST.json, and final REPORT.md | `experiment.cjs` already creates `slug/` and writes `EXPERIMENT-BEST.json`; `ensureExperimentDirs` adds the parent `.planning/experiments/` level |
| CMD-03 | Experiment phase type recognized in ROADMAP.md — defined by target metric, search space, iteration budget, and keep/discard threshold | Existing ROADMAP phase format (Goal, Requirements, Success Criteria, Plans) extended with experiment-specific fields |
| OBS-03 | `.planning/experiments/` directory created by `ensure-dirs` in `design.cjs` (or equivalent setup path) | New `experiment ensure-dirs` subcommand in `pde-tools.cjs` mirrors `design ensure-dirs`; `experiment.cjs` already creates `slug/` subdirs in `writeBest` — parent must exist |
| OBS-04 | Experiment config template added to `.planning/config.json` with default budgets, thresholds, and cost estimate toggle | `config.cjs` has `setConfigValue` and `ensureConfigFile` patterns; `experiment_defaults` is a new top-level block written by a new `experiment patch-config` or patched directly |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `bin/lib/experiment.cjs` | Phase 100, 289 lines | Git state machine — already has `parseFrontmatter` and `writeBest` | Must extend, not replace; this is the integration point |
| `bin/lib/frontmatter.cjs` | Current | Robust YAML frontmatter parser with nested-object stack (`extractFrontmatter`) | More capable than experiment.cjs's flat parser; handles arrays-of-strings and nested scalars |
| `bin/lib/core.cjs` | Current | `output`, `error`, `loadConfig`, `safeReadFile` | All CJS modules use these utilities for structured output and error handling |
| `bin/lib/config.cjs` | Current | `setConfigValue`, `ensureConfigFile`, `VALID_CONFIG_KEYS` | Config patching follows existing pattern; new keys must be added to `VALID_CONFIG_KEYS` |
| `bin/pde-tools.cjs` | Current | CLI dispatch router | New `experiment ensure-dirs` and `experiment patch-config` subcommands added here |

### No New Dependencies
This phase introduces zero new npm packages. All required functionality (YAML parsing, file I/O, JSON output) is already present in the codebase.

**Installation:**
```bash
# No installation needed — internal modules only
```

## Architecture Patterns

### Recommended Project Structure
```
bin/lib/
├── experiment.cjs         # Extend with parseExperimentFile, ensureExperimentDirs, patchExperimentConfig
bin/pde-tools.cjs          # Add: experiment ensure-dirs, experiment patch-config subcommands
.planning/
├── config.json            # Add experiment_defaults block
├── experiments/           # Created by ensure-dirs (does not exist yet)
│   └── {slug}/            # Created lazily by experiment init
│       ├── experiment.md  # Copy of source experiment.md
│       ├── results.jsonl  # Append-only JSONL log
│       ├── EXPERIMENT-BEST.json  # Already handled by Phase 100
│       └── REPORT.md      # Phase 103 generates this
templates/
└── experiment.md          # New: example experiment.md template (for operator reference)
```

### Pattern 1: parseExperimentFile — Validate Schema at Startup
**What:** Read an `experiment.md` file, extract YAML frontmatter using `extractFrontmatter`, validate all required fields are present, return structured object or error list.
**When to use:** Called at the start of any experiment command that requires a declared experiment (not the git state machine commands like init/commit/reset).
**Example:**
```javascript
// Source: frontmatter.cjs extractFrontmatter pattern + experiment.cjs error pattern
function parseExperimentFile(filePath) {
  let content;
  try {
    content = require('fs').readFileSync(filePath, 'utf-8');
  } catch {
    return { valid: false, errors: [`Cannot read experiment file: ${filePath}`] };
  }

  const { extractFrontmatter } = require('./frontmatter.cjs');
  const fm = extractFrontmatter(content);

  const REQUIRED_FIELDS = ['metric', 'direction', 'verify', 'mutable_files'];
  const missing = REQUIRED_FIELDS.filter(f => !fm[f] ||
    (Array.isArray(fm[f]) && fm[f].length === 0));

  if (missing.length > 0) {
    return {
      valid: false,
      errors: [`experiment.md is missing required fields: ${missing.join(', ')}`],
    };
  }

  if (!['min', 'max'].includes(fm.direction)) {
    return { valid: false, errors: ['direction must be "min" or "max"'] };
  }

  const mutableFiles = Array.isArray(fm.mutable_files) ? fm.mutable_files : [fm.mutable_files];

  return {
    valid: true,
    metric: fm.metric,
    direction: fm.direction,
    verify: fm.verify,
    mutable_files: mutableFiles,
    immutable_files: Array.isArray(fm.immutable_files) ? fm.immutable_files : [],
    budget: {
      iterations: parseInt(fm.iteration_budget || '50', 10),
      minutes: parseInt(fm.time_budget_minutes || '60', 10),
    },
    slug: fm.slug || null,
  };
}
```

### Pattern 2: ensureExperimentDirs — Idempotent Directory Creation
**What:** Create `.planning/experiments/` parent directory. Does not create per-slug subdirs (those are created lazily by `experiment init`).
**When to use:** Called from `experiment ensure-dirs` subcommand, which should be invoked at startup similar to `design ensure-dirs`.
**Example:**
```javascript
// Source: design.cjs ensureDesignDirs pattern (lines 45-77)
function _ensureExperimentDirs(cwd) {
  const experimentsRoot = path.join(cwd, '.planning', 'experiments');
  fs.mkdirSync(experimentsRoot, { recursive: true });
  return experimentsRoot;
}
```

### Pattern 3: patchExperimentConfig — Add experiment_defaults Block
**What:** Read `.planning/config.json`, add `experiment_defaults` block if absent, write back. Idempotent — does not overwrite existing values.
**When to use:** Called from `experiment patch-config` subcommand or from `config-ensure-section` extended behavior.
**Example:**
```javascript
// Source: config.cjs setConfigValue pattern (lines 142-170)
function _patchExperimentConfig(cwd) {
  const configPath = path.join(cwd, '.planning', 'config.json');
  let config = {};
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch { /* if missing, create from scratch */ }

  if (!config.experiment_defaults) {
    config.experiment_defaults = {
      iteration_budget: 50,
      time_budget_minutes: 60,
      consecutive_failure_limit: 5,
      no_progress_limit: 10,
      cost_estimate_enabled: true,
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    return { patched: true };
  }
  return { patched: false, reason: 'already_exists' };
}
```

### Pattern 4: experiment.md Template — User-Facing Schema Example
**What:** A template `experiment.md` the operator copies and fills in.
**When to use:** Shipped as `templates/experiment.md` for documentation and as a testable schema fixture.
**Example:**
```markdown
---
slug: improve-brief-quality
metric: awwwards_score
direction: max
verify: node bin/pde-tools.cjs experiment verify-metric
mutable_files:
  - workflows/brief.md
immutable_files: []
iteration_budget: 50
time_budget_minutes: 60
---

## Search Space

Optimize the brief generation prompts in `workflows/brief.md` to improve Awwwards rubric scores.

## Stopping Rationale

Halt when 5 consecutive iterations produce no improvement, or when 50 iterations are reached.
```

### Pattern 5: ROADMAP Experiment Phase Type Entry
**What:** Experiment phases in ROADMAP.md include three extra fields beyond the standard phase format: `Target Metric`, `Search Space`, and `Iteration Budget`.
**When to use:** When describing a phase whose goal is running a `/pde:optimize` experiment, not building a feature.

**Standard phase format (existing):**
```markdown
### Phase N: Name
**Goal**: ...
**Depends on**: Phase N-1
**Requirements**: REQ-XX
**Success Criteria**: ...
**Plans**: TBD
```

**Experiment phase type extension:**
```markdown
### Phase N: Optimize Brief Quality
**Type**: experiment
**Goal**: ...
**Target Metric**: awwwards_score (direction: max)
**Search Space**: workflows/brief.md OPTIMIZABLE sections
**Iteration Budget**: 50 iterations / 60 min
**Depends on**: Phase 103
**Requirements**: REQ-XX
**Success Criteria**: ...
**Plans**: TBD
```

### Anti-Patterns to Avoid
- **Embedding the YAML parser directly in experiment.cjs**: `frontmatter.cjs` already has a more robust parser. Require it rather than copying or extending the flat `parseFrontmatter` in experiment.cjs. Keep experiment.cjs focused on git operations.
- **Creating per-slug directories in ensureExperimentDirs**: Per-slug dirs are created lazily by `experiment init` (already implemented in Phase 100 `writeBest`). `ensureExperimentDirs` only creates the `.planning/experiments/` parent.
- **Overwriting existing experiment_defaults**: The patch is idempotent — if `experiment_defaults` already exists, skip. Never silently overwrite user-configured values.
- **Bloating experiment.cjs past 300 lines**: The 300-line ceiling is a hard constraint. If adding `parseExperimentFile`, `_ensureExperimentDirs`, and `_patchExperimentConfig` plus their cmd wrappers approaches this limit, split schema parsing into `bin/lib/experiment-schema.cjs`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML frontmatter parsing | Custom parser | `extractFrontmatter` from `frontmatter.cjs` | Already handles nested objects, arrays, inline arrays, and quoted strings |
| Idempotent config update | Custom merge logic | Read-modify-write pattern from `config.cjs setConfigValue` | Handles missing file, nested dot-notation, and concurrent write safety |
| Directory creation | Recursive mkdir reimplementation | `fs.mkdirSync(path, { recursive: true })` | Native Node.js, already used throughout design.cjs and experiment.cjs |
| Structured output | Custom JSON serialization | `output(result, raw)` from `core.cjs` | Handles the 50KB buffer limit, raw-mode flag, and process.exit(0) |
| Validation error reporting | Custom error format | `error(message)` from `core.cjs` | Consistent stderr format + process.exit(1), already tested |

**Key insight:** This phase is entirely about defining data contracts, not building new algorithms. Every technical pattern already exists. The work is wiring them together with the right schemas.

## Common Pitfalls

### Pitfall 1: 300-Line Ceiling on experiment.cjs
**What goes wrong:** Adding schema parsing, directory init, and config patching to `experiment.cjs` pushes it past 300 lines, triggering the scope-creep prevention rule.
**Why it happens:** Phase 101 adds three logically distinct concerns (schema, dirs, config) to the same module that already handles six git operations.
**How to avoid:** Count lines before writing. If the addition would exceed 280 lines (leaving margin), move `parseExperimentFile` to a new `bin/lib/experiment-schema.cjs` module and require it from `experiment.cjs`. The git operations stay in `experiment.cjs`.
**Warning signs:** experiment.cjs line count approaching 280 during implementation.

### Pitfall 2: Parsing experiment.md with the Wrong Parser
**What goes wrong:** Using the flat `parseFrontmatter` from `experiment.cjs` (which only handles scalars and flat arrays with no inline comments) fails to parse `mutable_files` when it contains inline YAML comments or nested structures.
**Why it happens:** `parseFrontmatter` was written for `experiment-boundaries.md` which has a specific known shape. `experiment.md` authored by users may have richer YAML.
**How to avoid:** Use `extractFrontmatter` from `frontmatter.cjs` for user-authored files.
**Warning signs:** `mutable_files` parses as empty array or string instead of array-of-strings.

### Pitfall 3: Missing Parent Directory for Per-Slug Operations
**What goes wrong:** `experiment init` (Phase 100 code) calls `writeBest` which calls `fs.mkdirSync(dir, { recursive: true })` on `.planning/experiments/{slug}/`. This works — but only if `.planning/experiments/` exists OR `recursive: true` creates the whole chain. Since `recursive: true` is already used, this actually works even without `ensureExperimentDirs`.
**Why it happens:** The OBS-03 requirement specifically says "directory created by ensure-dirs at startup" — the requirement is about the startup guarantee, not about whether it technically works without it.
**How to avoid:** Implement `ensure-dirs` as required even though Phase 100 code technically handles missing parent via `recursive: true`. The ensure-dirs guarantee is about observable initialization, not just technical correctness.
**Warning signs:** OBS-03 success criterion says the directory must be created "at startup" — this is a visible state property, not just a side effect.

### Pitfall 4: Scope Creep Into results.jsonl Write Logic
**What goes wrong:** Phase 101 "defines" the JSONL schema for results.jsonl but accidentally starts implementing the append logic too (which belongs to Phase 102).
**Why it happens:** EXEC-05 says "JSONL results log at .planning/experiments/{slug}/results.jsonl" — this could be read as "create the file" but the actual EXEC-05 scope is the schema definition and directory structure, not the write logic.
**How to avoid:** Phase 101 creates an empty `results.jsonl` placeholder (or just documents the schema). The append logic — writing rows with `{id, iteration, ts, commit, metric_value, metric_delta, status, description}` — is Phase 102's responsibility.
**Warning signs:** Implementation starts requiring `spawnSync` or metric evaluation logic — stop, that's Phase 102.

### Pitfall 5: CMD-03 Interpretation
**What goes wrong:** CMD-03 says "Experiment phase type recognized in ROADMAP.md — defined by target metric, search space, iteration budget, and keep/discard threshold." This could be misread as requiring tooling changes to `gsd-tools.cjs` (the planner's downstream tool).
**Why it happens:** "Recognized by downstream plan-phase tooling" implies code changes, but the success criterion clarifies: "target metric, search space, and budget fields are present" — this is about the ROADMAP.md format convention, not about parsing code.
**How to avoid:** CMD-03 is satisfied by documenting the experiment phase type format (the four extra fields) and demonstrating it in ROADMAP.md. No code changes to the planner are required in Phase 101.
**Warning signs:** Implementation starts modifying `init.cjs`, `gsd-tools.cjs`, or roadmap parsing logic — that's out of scope.

## Code Examples

Verified patterns from existing codebase:

### How design.cjs ensure-dirs exposes itself via pde-tools.cjs
```javascript
// Source: bin/pde-tools.cjs lines 530-551
case 'design': {
  const subcommand = args[1];
  const design = require('./lib/design.cjs');
  if (subcommand === 'ensure-dirs') {
    design.cmdEnsureDirs(cwd, raw);
  }
  // ...
}
```
The experiment subcommand follows the same structure — add `ensure-dirs` and `patch-config` to the existing `case 'experiment':` block (lines 835-865).

### How experiment.cjs already handles slug-directory creation
```javascript
// Source: bin/lib/experiment.cjs lines 32-36
function writeBest(cwd, slug, data) {
  const dir = path.join(cwd, '.planning', 'experiments', slug);
  fs.mkdirSync(dir, { recursive: true });  // creates all parent dirs
  fs.writeFileSync(bestJsonPath(cwd, slug), JSON.stringify(data, null, 2), 'utf-8');
}
```
The per-slug directory already gets created by `writeBest` via `recursive: true`. The `ensureExperimentDirs` function only needs to create `.planning/experiments/` (the parent), and even then `recursive: true` makes Phase 100 work without it.

### extractFrontmatter signature and usage pattern
```javascript
// Source: bin/lib/frontmatter.cjs lines 11-14
function extractFrontmatter(content) {
  const frontmatter = {};
  const match = content.match(/^---\n([\s\S]+?)\n---/);
  if (!match) return frontmatter;
  // ... returns plain object
}
```
Returns `{}` on missing frontmatter — safe to call without null check. Keys map directly to YAML scalar and array values.

### config.cjs pattern for reading + patching config.json
```javascript
// Source: bin/lib/config.cjs lines 142-155 (setConfigValue)
const configPath = path.join(cwd, '.planning', 'config.json');
let config = {};
try {
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
} catch (err) {
  error('Failed to read config.json: ' + err.message);
}
// mutate config...
fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
```

### How experiment subcommand is currently routed in pde-tools.cjs
```javascript
// Source: bin/pde-tools.cjs lines 835-865
case 'experiment': {
  const subcommand = args[1];
  const experiment = require('./lib/experiment.cjs');
  const slugIdx = args.indexOf('--slug');
  const slug = slugIdx !== -1 ? args[slugIdx + 1] : undefined;

  if (!slug && subcommand !== 'ensure-dirs' && subcommand !== 'patch-config') {
    error('--slug SLUG required');
  }
  // ... existing subcommands
  // ADD: ensure-dirs and patch-config here, before the final else error
}
```

### Test pattern for experiment dispatch (Phase 100 established)
```javascript
// Source: tests/phase-100/experiment-dispatch.test.mjs lines 45-51
function run(cwd, args) {
  return spawnSync(process.execPath, [PDE_TOOLS, ...args], {
    cwd,
    encoding: 'utf-8',
    timeout: 10000,
  });
}
// Tests for Phase 101 follow the same makeTempRepo() + run() pattern
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flat `parseFrontmatter` in experiment.cjs | `extractFrontmatter` from frontmatter.cjs | Phase 101 (this phase) | experiment.md can have richer YAML without parser failure |
| No `.planning/experiments/` parent | Created by `ensure-dirs` | Phase 101 (this phase) | Observable initialization guarantee per OBS-03 |
| No `experiment_defaults` in config | Added as top-level block | Phase 101 (this phase) | Circuit breakers in Phase 103 read from config rather than hardcoding defaults |

**Deprecated/outdated:**
- The flat `parseFrontmatter` in `experiment.cjs` was written for `experiment-boundaries.md` parsing only. It should not be extended for user-authored `experiment.md` files.

## Open Questions

1. **300-line ceiling: split or extend?**
   - What we know: experiment.cjs is 289 lines at end of Phase 100. Adding three new functions + cmd wrappers could push it past 300.
   - What's unclear: Exact line count of the additions needed.
   - Recommendation: Count during plan authoring. If total exceeds 295 lines, create `bin/lib/experiment-schema.cjs` for schema parsing and directory/config functions. Keep experiment.cjs for git operations only.

2. **results.jsonl placeholder: create empty file or leave creation to Phase 102?**
   - What we know: EXEC-05 lists `results.jsonl` as part of the state directory structure. EXEC-06 says the directory "contains" results.jsonl.
   - What's unclear: Whether success criterion 2 requires the file to physically exist at directory creation time or only logically.
   - Recommendation: Create an empty `results.jsonl` placeholder file in `ensureExperimentDirs` (zero bytes, valid JSONL). This satisfies success criterion 2 literally without implementing Phase 102's write logic.

3. **Where does experiment ensure-dirs get called during the optimize workflow?**
   - What we know: OBS-03 says "created by ensure-dirs at startup." Phase 101 implements the function; Phase 103 (the orchestrator) calls it.
   - What's unclear: Whether Phase 101 should also wire the call into Phase 103's planned workflow file.
   - Recommendation: Phase 101 implements the function and subcommand. Phase 103 calls it. Phase 101 does not modify Phase 103 artifacts (which don't exist yet).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` + `node:assert/strict` |
| Config file | none — run directly with `node --test` |
| Quick run command | `node --test tests/phase-101/*.test.mjs` |
| Full suite command | `node --test 'tests/**/*.test.mjs'` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXEC-01 | Valid experiment.md parses all 6 required fields | unit | `node --test tests/phase-101/experiment-schema.test.mjs` | No — Wave 0 |
| EXEC-01 | Invalid experiment.md (missing fields) produces clear error listing missing fields | unit | `node --test tests/phase-101/experiment-schema.test.mjs` | No — Wave 0 |
| EXEC-01 | Invalid direction value produces clear error | unit | `node --test tests/phase-101/experiment-schema.test.mjs` | No — Wave 0 |
| EXEC-05 | JSONL results log schema documented and placeholder created | unit | `node --test tests/phase-101/experiment-schema.test.mjs` | No — Wave 0 |
| EXEC-06 | `.planning/experiments/{slug}/` directory structure created by ensure-dirs | unit | `node --test tests/phase-101/experiment-dirs.test.mjs` | No — Wave 0 |
| OBS-03 | `experiment ensure-dirs` subcommand via pde-tools.cjs creates `.planning/experiments/` | integration | `node --test tests/phase-101/experiment-dirs.test.mjs` | No — Wave 0 |
| OBS-04 | `experiment patch-config` adds `experiment_defaults` block to config.json | unit | `node --test tests/phase-101/experiment-config.test.mjs` | No — Wave 0 |
| OBS-04 | `experiment patch-config` is idempotent — second call does not overwrite existing values | unit | `node --test tests/phase-101/experiment-config.test.mjs` | No — Wave 0 |
| CMD-03 | ROADMAP.md experiment phase type has target metric, search space, budget fields | structural | manual inspection (format convention, not code) | N/A |

### Sampling Rate
- **Per task commit:** `node --test tests/phase-101/*.test.mjs`
- **Per wave merge:** `node --test 'tests/**/*.test.mjs'`
- **Phase gate:** Full suite green before `/pde:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-101/experiment-schema.test.mjs` — covers EXEC-01, EXEC-05 (schema parsing and validation)
- [ ] `tests/phase-101/experiment-dirs.test.mjs` — covers EXEC-06, OBS-03 (directory creation and dispatch)
- [ ] `tests/phase-101/experiment-config.test.mjs` — covers OBS-04 (config patching)

All three test files follow the `makeRepo()` + `run()` pattern established in `tests/phase-100/experiment-dispatch.test.mjs`.

## Sources

### Primary (HIGH confidence)
- `bin/lib/experiment.cjs` — Phase 100 git state machine, 289 lines, including existing `parseFrontmatter` and `writeBest` helpers
- `bin/lib/frontmatter.cjs` — `extractFrontmatter` with nested YAML stack parser
- `bin/lib/design.cjs` — `ensureDesignDirs` pattern (idempotent directory creation + template init)
- `bin/lib/config.cjs` — `setConfigValue`, `ensureConfigFile`, `VALID_CONFIG_KEYS` patterns
- `bin/pde-tools.cjs` — CLI dispatch router, experiment case block (lines 835-865)
- `.planning/REQUIREMENTS.md` — canonical requirement definitions for EXEC-01, EXEC-05, EXEC-06, CMD-03, OBS-03, OBS-04
- `.planning/STATE.md` — file naming decision (lowercase user-authored, uppercase agent-produced)
- `tests/phase-100/experiment-dispatch.test.mjs` — established test pattern for new experiment tests

### Secondary (MEDIUM confidence)
- `.planning/ROADMAP.md` Phase 101 section — success criteria define exactly what "recognized" means for CMD-03

### Tertiary (LOW confidence)
- None — all findings verified from source code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries read directly from source
- Architecture patterns: HIGH — derived from existing patterns in the codebase
- Pitfalls: HIGH — derived from explicit constraints (300-line ceiling in STATE.md, success criteria wording)
- Test framework: HIGH — matches tests/phase-100 established pattern

**Research date:** 2026-03-23
**Valid until:** 2026-04-22 (stable codebase — 30-day window)
