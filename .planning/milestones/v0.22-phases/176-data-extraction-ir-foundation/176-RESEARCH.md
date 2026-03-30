# Phase 176: Data Extraction IR Foundation - Research

**Researched:** 2026-03-30
**Domain:** Node.js CJS library authoring, .planning/ artifact parsing, structured IR schema design
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None — infrastructure phase. All implementation choices are at Claude's discretion.

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

### Deferred Ideas (OUT OF SCOPE)
None — infrastructure phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EXT-01 | Extract project identity (name, goal, core value, product type) from PROJECT.md | buildContextIR() in context-sync.cjs already extracts name, productType, and summary; extend pattern to extract goal and coreValue |
| EXT-02 | Extract phase completion status from STATE.md and ROADMAP.md | cmdStateSnapshot() provides current_phase, total_phases, progress_percent; cmdRoadmapAnalyze() provides per-phase plan_count, summary_count, roadmap_complete |
| EXT-03 | Extract requirement coverage (total/completed/blocked, per-category) from REQUIREMENTS.md | REQUIREMENTS.md uses checkbox syntax; regex-parse category headers and checkboxes; no existing extractor — new code needed |
| EXT-04 | Extract design artifact inventory from design-manifest.json | design.cmdManifestRead() already returns parsed manifest; IR wraps its artifacts, designCoverage, and tokens fields |
| EXT-05 | Extract git velocity metrics (commits per phase, total LOC, contributor stats) | execGit() helper in core.cjs; use git log and git shortlog commands; no existing IR field — new extraction |
| EXT-06 | Extract cost/timing data from NDJSON event bus | Event bus writes to /tmp/pde-session-{id}.ndjson — ephemeral; session summary .md files in .planning/logs/ are persistent; SUMMARY.md frontmatter has duration field |
| EXT-07 | Extract blocker and risk data from phase plans | cmdStateSnapshot() extracts blockers array from STATE.md; unresolved tasks identified by checkbox markers in PLAN.md files |
| EXT-08 | Extract verification results from VERIFICATION.md files | VERIFICATION.md files exist in phase dirs (confirmed in v0.21 archived phases); no existing extractor — parse pass/fail markers |
| EXT-09 | Extract research findings from research/ directory | .planning/research/ contains ARCHITECTURE.md, PITFALLS.md, FEATURES.md etc.; per-phase RESEARCH.md files also exist |
| EXT-10 | Extract key decisions from PROJECT.md and STATE.md | cmdHistoryDigest() collects key-decisions from SUMMARY.md frontmatter; STATE.md has Accumulated Context Decisions section |
| CMD-03 | pde-tools presentation subcommand handles IR extraction and file operations | New case 'presentation': block in pde-tools.cjs router plus new bin/lib/presentation.cjs module |
| CMD-04 | Workflow reads all .planning/ artifacts and passes structured IR (not raw files) to LLM for narration | artifact-read subcommand produces JSON IR consumed by Phase 177 workflow |
</phase_requirements>

---

## Summary

Phase 176 is a pure infrastructure phase that creates a deterministic data extraction layer between `.planning/` artifacts and the LLM-driven presentation system. The key architectural decision from STATE.md is: "LLM never reads .planning/ files directly; all quantitative claims extracted by deterministic code before any LLM call." This prevents hallucination on counts, dates, and status fields.

The codebase has significant prior art. `bin/lib/context-sync.cjs` contains a `buildContextIR()` function that reads PROJECT.md, STATE.md, DESIGN-STATE.md, and design-manifest.json into an IR object for editor context sync. `bin/lib/commands.cjs` contains `cmdHistoryDigest()` which aggregates SUMMARY.md frontmatter across all archived and current phases. These are the primary templates for the new extraction logic.

The `pde-tools.cjs` router follows a consistent pattern: each domain gets a `case 'X':` block that lazy-requires `./lib/X.cjs`. Phase 176 adds a `case 'presentation':` block containing an `artifact-read` subcommand that produces JSON IR to stdout, plus ensures the `.planning/presentations/` output directory exists.

**Primary recommendation:** Create `bin/lib/presentation.cjs` modeled after `context-sync.cjs` and `commands.cjs`. Reuse all existing extraction helpers (`execGit`, `safeReadFile`, `extractFrontmatter`, the internal snapshot logic from `state.cjs`, `cmdHistoryDigest` from `commands.cjs`). New work limited to: REQUIREMENTS.md checkbox parser, VERIFICATION.md pass/fail parser, git velocity extraction, cost/timing aggregation from session log summaries, and research directory inventory.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-ins | (runtime) | fs, path, crypto | Zero npm deps — project convention enforced across all bin/lib/*.cjs files |
| `./core.cjs` | internal | safeReadFile, execGit, output, error | Shared I/O primitives already used by every lib module |
| `./frontmatter.cjs` | internal | extractFrontmatter() | YAML frontmatter parsing for SUMMARY.md, PLAN.md, CONTEXT.md |
| `./state.cjs` | internal | cmdStateSnapshot() and internal helpers | STATE.md parsing already implemented |
| `./commands.cjs` | internal | cmdHistoryDigest() | SUMMARY.md aggregation across all phases already implemented |
| `./roadmap.cjs` | internal | cmdRoadmapAnalyze() | Phase list parsing already implemented |
| `./design.cjs` | internal | cmdManifestRead() | design-manifest.json already parsed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `child_process` (Node built-in) | — | git log/shortlog commands via execGit() wrapper | EXT-05 only; use execGit() from core.cjs, not execSync directly |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom markdown parser | unified/remark | unified adds npm dependency; regex + section extraction (already in context-sync.cjs) is sufficient for known document structures |
| JSON Schema library (ajv) | Custom validator | ajv adds npm dependency; explicit field-by-field validation with typed error messages is simpler and zero-dep |

**Installation:** No new packages required — zero npm dependencies convention.

---

## Architecture Patterns

### Recommended Project Structure
```
bin/lib/
├── presentation.cjs          # New: IR builder and artifact-read command
tests/
├── phase-176/
│   ├── presentation-ir.test.mjs    # Unit tests for IR extraction functions
│   └── presentation-cmd.test.mjs   # Integration tests for CLI routing
.planning/presentations/      # Created by ensure-output-dir; output files land here
```

### Pattern 1: CJS Library Module with Named Exports
**What:** Each lib module is a `'use strict'` CommonJS file. Functions are pure (take `cwd` as param, no global state). Commands follow `cmdX(cwd, ..., raw)` signature. Module exports named functions.
**When to use:** All new lib files in `bin/lib/`.
**Example (from bin/lib/design.cjs lines 1-15 — verified):**
```javascript
'use strict';
const fs = require('fs');
const path = require('path');
const { output, error } = require('./core.cjs');

function cmdPresentationArtifactRead(cwd, raw) {
  const ir = buildPresentationIR(cwd);
  output(ir, raw);
}
module.exports = { cmdPresentationArtifactRead, buildPresentationIR };
```

### Pattern 2: pde-tools.cjs Subcommand Router Block
**What:** New `case 'presentation':` block at the bottom of the `switch (command)` in pde-tools.cjs, before `default:`. Lazy-requires `./lib/presentation.cjs` inside the case block. Follows the exact structure of `case 'design':` at line 589.
**When to use:** Adding any new top-level pde-tools subcommand.
**Example (modeled on case 'design' at pde-tools.cjs:589 — verified):**
```javascript
case 'presentation': {
  const subcommand = args[1];
  const presentation = require('./lib/presentation.cjs');
  if (subcommand === 'artifact-read') {
    presentation.cmdPresentationArtifactRead(cwd, raw);
  } else {
    error('Unknown presentation subcommand. Available: artifact-read');
  }
  break;
}
```

### Pattern 3: "Data Unavailable" Sentinel
**What:** Missing or unreadable source files produce explicit sentinel objects rather than silently omitting fields. This is per EXT success criterion 2.
**When to use:** Every extraction function that reads from a file.
**Example (modeled on safeReadFile usage in context-sync.cjs):**
```javascript
function extractRequirements(cwd) {
  const reqPath = path.join(cwd, '.planning', 'REQUIREMENTS.md');
  const content = safeReadFile(reqPath);
  if (!content) {
    return { unavailable: true, reason: 'REQUIREMENTS.md not found' };
  }
  // ... parse checkboxes
}
```

### Pattern 4: Output Directory Ensure
**What:** `.planning/presentations/` must be created if absent. Use `fs.mkdirSync(dir, { recursive: true })` — idempotent.
**When to use:** Called at the start of `cmdPresentationArtifactRead`.
**Example (from bin/lib/design.cjs ensureDesignDirs() — verified):**
```javascript
const outputDir = path.join(cwd, '.planning', 'presentations');
fs.mkdirSync(outputDir, { recursive: true });
```

### Pattern 5: Requirement Checkbox Parser
**What:** REQUIREMENTS.md uses `- [ ] **REQ-ID**: description` and `- [x] **REQ-ID**: description` checkboxes under `### Category Name` headers.
**Verified format (from .planning/REQUIREMENTS.md lines 13-21):**
```
### Data Extraction
- [ ] **EXT-01**: System can extract ...
- [x] **EXT-02**: System can extract ...
```
```javascript
// Split into category sections, then match checkboxes per section
const sections = content.split(/^###\s+/m).slice(1);
// For each section: /^- \[([ x])\]\s+\*\*([A-Z]+-\d+)\*\*/gm
```

### Pattern 6: Git Velocity Extraction via execGit
**What:** Use `execGit(cwd, ['log', '--pretty=format:%as', '--no-merges'])` for commit dates. Use `execGit(cwd, ['shortlog', '-sn', '--no-merges'])` for contributors.
**When to use:** EXT-05 implementation.
**Example (uses core.cjs execGit — verified in commands.cjs):**
```javascript
const { execGit } = require('./core.cjs');
const logResult = execGit(cwd, ['log', '--pretty=format:%as', '--no-merges']);
if (logResult.exitCode !== 0) return { unavailable: true, reason: 'git log failed' };
const commits = logResult.stdout.split('\n').filter(Boolean);
```

### Pattern 7: VERIFICATION.md Pass/Fail Parser
**What:** VERIFICATION.md files contain AC checkboxes and an overall goal status. File exists in archived phases (confirmed: v0.21-phases/175-design-pipeline-integration/175-VERIFICATION.md).
**Expected format (inferred from phase VERIFICATION.md file structure):**
```
- [x] AC-1: ...
- [ ] AC-2: ...
**Overall: ACHIEVED**
```
```javascript
const acMatches = [...content.matchAll(/^- \[([ x])\]\s+AC-\d+/gm)];
const achieved = /\*\*(?:Overall|Goal)[^*]*ACHIEVED\*\*/i.test(content);
```

### Pattern 8: Cost/Timing from Session Log Files
**What:** `.planning/logs/*.md` session summaries have a metrics table with durations. SUMMARY.md frontmatter has `duration: 27min`. Aggregate across all plans' SUMMARY.md files using cmdHistoryDigest().
**When to use:** EXT-06 implementation.
**Key constraint:** NDJSON files in /tmp are ephemeral — do NOT use os.tmpdir() path for IR extraction.

### Anti-Patterns to Avoid
- **Calling pde-tools subcommands via spawn:** All logic lives in bin/lib/; reuse exported module functions directly.
- **Silent zero/null defaults for file-sourced fields:** `requirements.completed = 0` is ambiguous vs. "file not found." Always use `{ unavailable: true, reason }` sentinel.
- **Reading /tmp NDJSON for EXT-06:** Those files are ephemeral. Use .planning/logs/*.md and SUMMARY.md duration fields instead.
- **Caching the IR between invocations:** IR must be freshly computed on every `artifact-read` call — no file cache.
- **Calling roadmap analyze without accounting for stripShippedMilestones:** cmdRoadmapAnalyze() strips shipped milestone content, so archived phase data must come from getArchivedPhaseDirs() + cmdHistoryDigest().

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Frontmatter parsing | Custom YAML parser | `extractFrontmatter()` from `./frontmatter.cjs` | Already handles all SUMMARY.md, PLAN.md, CONTEXT.md frontmatter patterns |
| STATE.md snapshot | Custom STATE.md parser | `state.cmdStateSnapshot()` / internal snapshot builder | Already parses all state fields including blockers, decisions, progress |
| Phase directory enumeration | Custom readdir walk | `findPhaseInternal()` / `getArchivedPhaseDirs()` from `core.cjs` | Handles both .planning/phases/ and milestones/vX.Y-phases/ |
| SUMMARY.md decision aggregation | Custom walker | `cmdHistoryDigest()` from `commands.cjs` | Already walks archived + current phases, extracts key-decisions, tech-stack |
| Roadmap phase list | Custom parser | `cmdRoadmapAnalyze()` from `roadmap.cjs` | Already parses phases with plan_count, summary_count, disk_status |
| Design manifest reading | Custom JSON parser | `design.cmdManifestRead()` or direct JSON.parse of design-manifest.json | Missing file and malformed JSON already handled |
| Git command execution | Direct execSync | `execGit()` from `core.cjs` | Handles cwd, error checking, exitCode; already used across all lib files |
| File safe-read | fs.readFileSync + try/catch inline | `safeReadFile()` from `core.cjs` | Returns null on error; used everywhere in the codebase |

**Key insight:** The PDE codebase has substantial extraction infrastructure. Phase 176's job is to compose existing primitives into a presentation-specific IR schema. Net-new work: REQUIREMENTS.md checkbox parser, VERIFICATION.md pass/fail parser, research directory inventory, git velocity stats, and output directory setup.

---

## IR Schema Design

The presentation IR must cover all 10 EXT requirements. Recommended top-level shape:

```javascript
{
  schema_version: "1.0",
  extracted_at: "<ISO timestamp>",
  source_hash: "<sha256 of key source files>",

  // EXT-01
  project: {
    name: "Platform Development Engine",
    goal: "<first paragraph after # heading in PROJECT.md>",
    core_value: "<## Core Value section from PROJECT.md>",
    product_type: "<from design-manifest.json or PROJECT.md>",
    summary: "<first 2 paragraphs>"
  },

  // EXT-02
  phases: {
    total: 9,
    completed: 0,
    in_progress: 1,
    planned: 8,
    current_phase: "176",
    current_phase_name: "Data Extraction IR Foundation",
    progress_percent: 0,
    milestone: "v0.22",
    milestone_name: "Stakeholder Presentations",
    plans_total: 0,
    plans_completed: 0
  },

  // EXT-03
  requirements: {
    total: 58,
    completed: 0,
    blocked: 0,
    pending: 58,
    categories: {
      "Data Extraction": { total: 10, completed: 0, blocked: 0 }
    }
    // or: { unavailable: true, reason: "REQUIREMENTS.md not found" }
  },

  // EXT-04
  design_artifacts: {
    available: true,
    artifact_count: 0,
    types_covered: [],
    has_tokens: false,
    has_wireframes: false,
    has_mockups: false
    // or: { unavailable: true, reason: "design-manifest.json not found" }
  },

  // EXT-05
  git_velocity: {
    total_commits: 400,
    commits_last_30_days: 40,
    contributors: ["greyaltaer"],
    estimated_loc_added: 50000
    // or: { unavailable: true, reason: "git command failed" }
  },

  // EXT-06
  cost_timing: {
    session_count: 12,
    total_duration_min: 480,
    phases_with_timing: 50,
    average_phase_duration_min: 9.6
    // or: { unavailable: true, reason: "no session data found" }
  },

  // EXT-07
  blockers: [
    { text: "IR field completeness validation needed...", phase: "176", type: "concern" }
  ],
  risks: [],

  // EXT-08
  verification: {
    phases_verified: 5,
    phases_achieved: 5,
    phases_not_achieved: 0,
    phases_missing_verification: 4,
    results: [
      { phase: "175", status: "ACHIEVED", ac_pass: 8, ac_fail: 0 }
    ]
  },

  // EXT-09
  research: {
    project_research_files: 6,
    topics: ["ARCHITECTURE", "PITFALLS", "FEATURES", "MCP-SERVER-IMPL"],
    phase_research_count: 42
  },

  // EXT-10
  decisions: [
    { phase: "175", summary: "vi.spyOn on module.exports...", rationale: "..." }
  ],

  // CMD-03 / CMD-04
  output_dir: ".planning/presentations",
  output_dir_created: true,
  cross_ref_warnings: []
}
```

---

## Common Pitfalls

### Pitfall 1: NDJSON Event Files Are in /tmp — Ephemeral
**What goes wrong:** event-bus.cjs writes to `path.join(os.tmpdir(), 'pde-session-{id}.ndjson')`. These files vanish between terminal sessions. Reading them from the IR builder will silently return null on almost every invocation.
**Why it happens:** REQUIREMENTS.md says "NDJSON event bus" for EXT-06. That description refers to the infrastructure, not the file path.
**How to avoid:** For EXT-06, read `.planning/logs/*.md` session summary files (the persistent record) and SUMMARY.md `duration:` frontmatter (via cmdHistoryDigest). Mark `{ unavailable: true }` if no session data exists.
**Warning signs:** Any reference to `os.tmpdir()` or `pde-session-*.ndjson` in presentation.cjs.

### Pitfall 2: roadmap analyze Strips Shipped Milestones
**What goes wrong:** `cmdRoadmapAnalyze()` calls `stripShippedMilestones()` which removes shipped milestone sections from ROADMAP.md before parsing. This means phase entries from v0.19-v0.21 won't appear in the phases array.
**Why it happens:** The roadmap stripping is intentional for workflow focus but wrong for IR completeness.
**How to avoid:** For current-milestone phase counts use cmdRoadmapAnalyze(). For historical completed phase counts use `getArchivedPhaseDirs()` from core.cjs or count archived phase dirs directly.
**Warning signs:** phases.completed reporting as 0 when milestones clearly exist.

### Pitfall 3: Silent Zero vs. "Data Unavailable"
**What goes wrong:** `requirements.completed = 0` is ambiguous — is it "zero requirements done" or "REQUIREMENTS.md was not found"? EXT success criterion 2 requires explicit unavailable markers.
**Why it happens:** Default value assignment `count || 0` is natural coding pattern.
**How to avoid:** Every extraction function checks file existence first. If file missing: return `{ unavailable: true, reason: '...' }`. If file present but field not found: return `{ value: 0 }` (zero with evidence).
**Warning signs:** Any `|| 0` or `|| []` default for fields sourced from files.

### Pitfall 4: Importing State/Commands Functions That Are Not Exported
**What goes wrong:** `state.cjs` exports `cmdStateSnapshot` as a CLI command function, not a pure data function. The internal snapshot builder may not be a named export.
**Why it happens:** Lib modules are structured around CLI commands, not pure data access.
**How to avoid:** Either (a) add a `buildStateSnapshot(cwd)` pure function to state.cjs as a new export, or (b) call `cmdStateSnapshot` and capture output — but the `output()` helper writes to stdout. Best approach: add a new export `extractStateData(cwd)` that returns the raw object without calling `output()`.
**Warning signs:** Calling `state.cmdStateSnapshot(cwd)` and expecting a return value (it writes to stdout, not returns).

### Pitfall 5: Cross-Reference Validation Scope Creep
**What goes wrong:** EXT success criterion 5 says "cross-reference validation runs before any persona call." Over-engineering this into a blocking error gate prevents the IR from being useful when source files disagree.
**Why it happens:** "Validation" implies blocking.
**How to avoid:** Cross-reference validation returns warnings, not errors. The IR is always produced. Warnings are included in `cross_ref_warnings[]` array in the IR. The success criterion says "mismatches are logged as warnings" — not that they block output.
**Warning signs:** process.exit(1) in cross-reference validation logic.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| context-sync.cjs IR (5 fields: name, type, techStack, summary, tokens) | Presentation IR (10 top-level categories, 50+ fields) | Phase 176 | Richer extraction; same architectural pattern |
| No REQUIREMENTS.md parsing | Checkbox-level category parsing with completed/blocked counts | Phase 176 | Enables per-category coverage reports for personas |
| cmdHistoryDigest reads decisions from SUMMARY.md only | Presentation IR reads decisions from SUMMARY.md (historical) and STATE.md (current) | Phase 176 | Complete decision record across all milestones |

**No deprecated patterns apply.** This is a net-new module following established conventions.

---

## Open Questions

1. **EXT-07 "overdue phases" definition**
   - What we know: STATE.md and ROADMAP.md have no calendar due dates for phases
   - What's unclear: What constitutes "overdue" without date tracking?
   - Recommendation: Define "overdue" as phases that have a PLAN.md but no SUMMARY.md and are not the current phase. This is a staleness indicator, not a calendar overdue.

2. **EXT-06 session log coverage**
   - What we know: .planning/logs/ has only 5 fixture files; real session data is in SUMMARY.md duration fields
   - What's unclear: How comprehensive is the SUMMARY.md duration field across all archived phases?
   - Recommendation: Walk all SUMMARY.md files via cmdHistoryDigest, sum durations. Mark unavailable only if zero files found.

3. **EXT-09 per-phase RESEARCH.md scope**
   - What we know: .planning/research/ has project-level files; phase directories contain RESEARCH.md files
   - What's unclear: Should per-phase RESEARCH.md be included in the research IR field?
   - Recommendation: Include both — project_research_files from .planning/research/, phase_research_count from per-phase dirs. Phase 177-onwards personas can choose which to surface.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All extraction | Yes | LTS (runtime) | — |
| git CLI | EXT-05 velocity | Yes | System git | `{ unavailable: true }` sentinel if git fails |
| .planning/REQUIREMENTS.md | EXT-03 | Yes | Current milestone | `{ unavailable: true }` sentinel |
| .planning/PROJECT.md | EXT-01 | Yes | Current (14K tokens) | `{ unavailable: true }` sentinel |
| .planning/STATE.md | EXT-02, EXT-07, EXT-10 | Yes | Current | `{ unavailable: true }` sentinel |
| .planning/ROADMAP.md | EXT-02 | Yes | Current | `{ unavailable: true }` sentinel |
| .planning/design/design-manifest.json | EXT-04 | Conditional (exists after Phase 13+) | Yes | `{ unavailable: true }` sentinel |
| .planning/logs/*.md | EXT-06 | Partial (fixture files only) | Yes | Fall back to SUMMARY.md durations |
| .planning/presentations/ | CMD-03, CMD-04 | Not yet | — | Created by fs.mkdirSync at runtime |
| vitest | Tests | Yes | Detected via vitest.config.ts | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** All missing file sources use `{ unavailable: true, reason }` sentinel per EXT success criterion 2.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (vitest.config.ts at project root) |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run tests/phase-176/ --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXT-01 | buildPresentationIR() returns project.name, .goal, .core_value, .product_type | unit | `npx vitest run tests/phase-176/presentation-ir.test.mjs -t "project identity"` | No — Wave 0 |
| EXT-02 | phases.total, .completed, .progress_percent populated from STATE.md and ROADMAP.md | unit | `npx vitest run tests/phase-176/presentation-ir.test.mjs -t "phase completion"` | No — Wave 0 |
| EXT-03 | requirements.categories parsed correctly from REQUIREMENTS.md checkboxes | unit | `npx vitest run tests/phase-176/presentation-ir.test.mjs -t "requirements"` | No — Wave 0 |
| EXT-04 | design_artifacts populated from manifest; unavailable sentinel if missing | unit | `npx vitest run tests/phase-176/presentation-ir.test.mjs -t "design artifacts"` | No — Wave 0 |
| EXT-05 | git_velocity.total_commits is a number; unavailable sentinel if git fails | unit | `npx vitest run tests/phase-176/presentation-ir.test.mjs -t "git velocity"` | No — Wave 0 |
| EXT-06 | cost_timing populated from session logs or SUMMARY.md durations | unit | `npx vitest run tests/phase-176/presentation-ir.test.mjs -t "cost timing"` | No — Wave 0 |
| EXT-07 | blockers[] populated from STATE.md | unit | `npx vitest run tests/phase-176/presentation-ir.test.mjs -t "blockers"` | No — Wave 0 |
| EXT-08 | verification[] parsed from VERIFICATION.md; ac_pass and ac_fail counts correct | unit | `npx vitest run tests/phase-176/presentation-ir.test.mjs -t "verification"` | No — Wave 0 |
| EXT-09 | research.project_research_files reflects .planning/research/ file count | unit | `npx vitest run tests/phase-176/presentation-ir.test.mjs -t "research"` | No — Wave 0 |
| EXT-10 | decisions[] populated from cmdHistoryDigest + STATE.md decisions | unit | `npx vitest run tests/phase-176/presentation-ir.test.mjs -t "decisions"` | No — Wave 0 |
| CMD-03 | `node pde-tools.cjs presentation artifact-read` routes to cmdPresentationArtifactRead | integration | `npx vitest run tests/phase-176/presentation-cmd.test.mjs` | No — Wave 0 |
| CMD-04 | IR output is valid JSON with all required top-level fields present | integration | `npx vitest run tests/phase-176/presentation-cmd.test.mjs -t "full IR schema"` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/phase-176/ --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-176/presentation-ir.test.mjs` — unit tests for buildPresentationIR() and all extractor functions (EXT-01 through EXT-10); use createRequire(import.meta.url) + vi.spyOn pattern from phase-175 tests
- [ ] `tests/phase-176/presentation-cmd.test.mjs` — integration tests for pde-tools presentation artifact-read CLI routing (CMD-03, CMD-04)

*(No framework install needed — vitest already present via vitest.config.ts)*

---

## Project Constraints (from codebase conventions — no CLAUDE.md present)

CLAUDE.md does not exist at project root. Constraints derived from inspection of all bin/lib/*.cjs files and prior phases:

1. **Zero npm dependencies** — all `bin/lib/*.cjs` files use only Node.js built-ins and internal project modules. No new packages for Phase 176.
2. **CJS module format** — all `bin/lib/` files use `'use strict'` + `module.exports`. Test files use `.mjs` extension with `createRequire` for CJS interop.
3. **Lazy require inside case blocks** — `pde-tools.cjs` lazy-requires lib modules inside `case` blocks, not at the top of the file.
4. **`cwd` parameter convention** — all lib command functions take `(cwd, ..., raw)`. `cwd` is the project root, not `.planning/`.
5. **`output(result, raw)` for stdout** — use the `output()` helper from `core.cjs`. Never call `console.log` directly in lib functions.
6. **`safeReadFile()` for optional files** — never inline `fs.readFileSync` + try/catch for files that may not exist.
7. **Tests in `tests/phase-N/`** — each phase gets its own directory. Test files use `.mjs`. Import CJS production code with `createRequire(import.meta.url)`.
8. **vi.spyOn for CJS-in-CJS mocking** — do not use `vi.mock()` factory for modules that are lazy-required inside production code.
9. **No silent zeros** — the presentation requirements call out "data unavailable markers rather than silently omitting data" as an explicit success criterion.

---

## Sources

### Primary (HIGH confidence)
- `bin/lib/context-sync.cjs` — existing IR builder, extraction patterns, safeReadFile usage (directly read)
- `bin/lib/commands.cjs` cmdHistoryDigest and cmdSummaryExtract — pattern reference (directly read)
- `bin/lib/state.cjs` cmdStateSnapshot and stateExtractField — pattern reference (directly read)
- `bin/lib/roadmap.cjs` cmdRoadmapAnalyze — stripShippedMilestones behavior verified (directly read)
- `bin/lib/design.cjs` cmdManifestRead and ensureDesignDirs — pattern reference (directly read)
- `bin/lib/event-bus.cjs` — /tmp NDJSON path confirmed, ephemeral nature verified (directly read)
- `bin/pde-tools.cjs` — router structure, case block pattern, lazy-require convention (directly read)
- `.planning/REQUIREMENTS.md` — checkbox format and category structure verified (directly read)
- `.planning/milestones/v0.21-phases/175-design-pipeline-integration/175-01-SUMMARY.md` — SUMMARY.md frontmatter schema with duration field verified (directly read)
- `.planning/milestones/v0.21-phases/175-design-pipeline-integration/` directory listing — VERIFICATION.md file existence confirmed
- `vitest.config.ts` — test framework and include patterns verified (directly read)
- `tests/phase-175/probe-app-tool.test.mjs` — test file pattern (createRequire, vi.spyOn, describe/it/expect) verified (directly read)
- `.planning/STATE.md` — extraction-first architectural decision confirmed (directly read)
- `.planning/config.json` — nyquist_validation: true confirmed (directly read)
- Live `node pde-tools.cjs state-snapshot` output — state snapshot JSON shape verified
- Live `node pde-tools.cjs roadmap analyze` output — roadmap analyze JSON shape verified

### Secondary (MEDIUM confidence)
- `.planning/MILESTONES.md` — milestone history and session summary format (directly read)
- `.planning/logs/` fixture files — session log naming pattern confirmed

### Tertiary (LOW confidence)
- VERIFICATION.md pass/fail format — inferred from file existence; file itself not read; format inferred from AC-checking convention used across all phase plans

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools internal; no external dependencies
- Architecture: HIGH — patterns verified against existing codebase (context-sync.cjs, commands.cjs, design.cjs, pde-tools.cjs router)
- IR schema: HIGH — all field sources mapped to specific files and functions that were directly inspected
- Pitfalls: HIGH — NDJSON/tmp pitfall verified by reading event-bus.cjs; stripShippedMilestones pitfall verified by reading roadmap.cjs

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable internal codebase; no external dependencies)
