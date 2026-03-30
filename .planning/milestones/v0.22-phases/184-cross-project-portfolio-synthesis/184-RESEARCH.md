# Phase 184: Cross-Project Portfolio Synthesis - Research

**Researched:** 2026-03-30
**Domain:** Multi-project .planning/ extraction, schema version detection, portfolio IR composition
**Confidence:** HIGH

---

## User Constraints (from CONTEXT.md)

### Locked Decisions
None. All implementation choices are at Claude's discretion.

### Claude's Discretion
All implementation choices: schema version detection strategy, adapter pattern, portfolio narrative structure, error handling for incompatible projects.

### Deferred Ideas (OUT OF SCOPE)
None.

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PORT-01 | User can specify multiple `.planning/` directory paths for portfolio synthesis | `/pde:portfolio [path1] [path2] ...` command; buildPresentationIR(cwd) already accepts any cwd |
| PORT-02 | Portfolio synthesis reads project identity, milestone history, and key outcomes from each project | extractProjectIdentity(cwd) already works; MILESTONES.md is NOT currently extracted — needs new extractMilestoneHistory(cwd) |
| PORT-03 | Portfolio generates a cross-project narrative showing patterns, skills, and cumulative outcomes | New buildCrossProjectPortfolio(projects[]) render function; new "portfolio-synthesis" output path distinct from "portfolio-overview" persona |
| PORT-04 | Schema version detection identifies `.planning/` directory versions and adapts extraction accordingly | Three distinct SUMMARY.md schemas identified (see Schema Audit); gsd_state_version in STATE.md frontmatter is the primary version indicator |
| PORT-05 | Missing or incompatible fields surface "data unavailable" markers (never silently zeros) | Existing sentinel pattern { unavailable: true, reason } already established — extend to project-level sentinels |
| PORT-06 | `/pde:portfolio [path1] [path2] ...` command triggers portfolio synthesis | New commands/portfolio.md + workflows/portfolio.md following present.md pattern |

---

## Summary

Phase 184 builds `/pde:portfolio` — a command that reads multiple `.planning/` directories from different projects, extracts IR from each using the existing `buildPresentationIR(cwd)` infrastructure, and synthesizes a cross-project portfolio document.

The key technical insight is that `buildPresentationIR(cwd)` already accepts a `cwd` parameter and all its extractors are path-based. The portfolio command needs to: (a) accept multiple paths as arguments, (b) call `buildPresentationIR(path)` for each, (c) add `extractMilestoneHistory(cwd)` for the milestone history PORT-02 requires (not currently extracted), (d) handle per-project errors without halting, and (e) synthesize a new render function that reads across N projects rather than one.

The "schema version heterogeneity" blocker from STATE.md has been audited and resolved. Three concrete SUMMARY.md schema variants exist across PDE milestones v0.12-v0.21, but the existing extractors are already schema-safe because they read STATE.md, ROADMAP.md, REQUIREMENTS.md, PROJECT.md — not SUMMARY.md field names. SUMMARY.md variants only affect extractDecisions (misses key_decisions underscore variant) — a low-impact gap already present in the single-project path.

**Primary recommendation:** Build a three-part implementation: (1) `extractMilestoneHistory(cwd)` added to `presentation.cjs`, (2) `buildPortfolioIR(paths[])` in a new `bin/lib/portfolio.cjs` module, and (3) `buildCrossProjectPortfolio(portfolioIR)` added to `render-presentation.cjs`. Wire via new `portfolio` subcommand in `pde-tools.cjs` and new `commands/portfolio.md` + `workflows/portfolio.md`.

---

## Standard Stack

### Core (already installed, no new dependencies)
| Library/Module | Version | Purpose | Status |
|----------------|---------|---------|--------|
| bin/lib/presentation.cjs | internal | Per-project IR extraction — reuse as-is | Existing |
| bin/lib/render-presentation.cjs | internal | HTML+MD rendering engine — add new render function | Existing |
| bin/lib/core.cjs | internal | safeReadFile, output, error utilities | Existing |
| bin/lib/frontmatter.cjs | internal | extractFrontmatter for YAML parsing | Existing |
| vitest | ^4.1.1 | Test framework (ESM .test.mjs pattern) | Existing |

Zero new npm dependencies. Portfolio synthesis uses only existing internal modules.

### New Modules to Create
| Module | Location | Purpose |
|--------|----------|---------|
| portfolio.cjs | bin/lib/portfolio.cjs | Multi-project IR extraction, schema detection, buildPortfolioIR() |
| portfolio.md | commands/portfolio.md | /pde:portfolio command shell |
| portfolio.md | workflows/portfolio.md | Portfolio workflow (mirrors present.md structure) |

---

## Architecture Patterns

### How buildPresentationIR Works With Multiple Projects

buildPresentationIR(cwd) is already a pure function that takes any directory path. Calling it with a foreign project's root path works out of the box:

```javascript
// Source: bin/lib/presentation.cjs line 750
function buildPresentationIR(cwd) {
  // All extractors are path-based: path.join(cwd, '.planning', 'STATE.md')
  // Returns: { schema_version: '1.0', project, phases, requirements, ... }
  // Missing files always return sentinel { unavailable: true, reason }
}
```

The --cwd flag is already supported in pde-tools.cjs (lines 238-248), enabling:
```bash
node pde-tools.cjs presentation artifact-read --cwd /path/to/other/project
```

### Pattern 1: Per-Project IR with Error Isolation

Each project is extracted independently. Errors in one must never abort the portfolio.

```javascript
// Source: pattern derived from bin/lib/presentation.cjs sentinel returns
function buildPortfolioIR(projectPaths) {
  const projects = projectPaths.map(projectPath => {
    const absPath = path.resolve(projectPath);
    if (!fs.existsSync(path.join(absPath, '.planning'))) {
      return {
        path: absPath,
        unavailable: true,
        reason: '.planning/ directory not found at ' + absPath,
      };
    }
    try {
      const { buildPresentationIR } = require('./presentation.cjs');
      const ir = buildPresentationIR(absPath);
      const milestoneHistory = extractMilestoneHistory(absPath);
      const schemaVersion = detectSchemaVersion(absPath);
      return { path: absPath, ir, milestoneHistory, schemaVersion, unavailable: false };
    } catch (err) {
      return { path: absPath, unavailable: true, reason: 'IR extraction failed: ' + err.message };
    }
  });
  return {
    schema_version: '1.0',
    extracted_at: new Date().toISOString(),
    project_count: projects.length,
    available_count: projects.filter(p => !p.unavailable).length,
    projects,
  };
}
```

### Pattern 2: Schema Version Detection

Detection uses a two-tier probe of STATE.md frontmatter. No adapter branching is needed — version detection is informational, not behavioral.

```javascript
// Source: research audit of .planning/STATE.md across current and archived projects
function detectSchemaVersion(cwd) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  const content = safeReadFile(statePath);
  if (!content) return { version: 'unknown', reason: 'STATE.md not found' };
  const fm = extractFrontmatter(content);
  if (fm.gsd_state_version) {
    return { version: String(fm.gsd_state_version), source: 'STATE.md gsd_state_version' };
  }
  if (fm.progress && typeof fm.progress === 'object') {
    return { version: 'pre-1.0-modern', source: 'STATE.md progress block' };
  }
  return { version: 'pre-1.0-legacy', source: 'STATE.md structure inference' };
}
```

### Pattern 3: extractMilestoneHistory (New Extractor for PORT-02)

MILESTONES.md is not currently read by any extractor. Its format is stable across all observed projects:

```
## vX.Y Name (Shipped: YYYY-MM-DD)
**Phases completed:** N phases, N plans, N tasks
**Key accomplishments:**
- bullet
```

```javascript
// Source: .planning/MILESTONES.md structure audit (9 entries confirmed)
function extractMilestoneHistory(cwd) {
  const milestonesPath = path.join(cwd, '.planning', 'MILESTONES.md');
  const content = safeReadFile(milestonesPath);
  if (!content) {
    return { unavailable: true, reason: 'MILESTONES.md not found' };
  }
  const milestones = [];
  const sectionPattern = /^##\s+(v[\d.]+)\s+(.+?)\s+\(Shipped:\s*([^)]+)\)/gm;
  let match;
  while ((match = sectionPattern.exec(content)) !== null) {
    const version = match[1];
    const name = match[2].trim();
    const shipped = match[3].trim();
    const afterHeader = content.slice(match.index);
    const phasesMatch = afterHeader.match(/\*\*Phases completed:\*\*\s*(\d+) phases/);
    milestones.push({
      version,
      name,
      shipped,
      phases_completed: phasesMatch ? parseInt(phasesMatch[1], 10) : null,
    });
  }
  return milestones.length > 0
    ? { available: true, count: milestones.length, milestones }
    : { unavailable: true, reason: 'No milestone entries found in MILESTONES.md' };
}
```

### Pattern 4: Cross-Project Narrative Render Function

The existing buildPortfolioOverview(ir) renders one project's patterns. The new buildCrossProjectPortfolio(portfolioIR) renders across N projects. These are separate functions; buildPortfolioOverview is NOT modified.

```javascript
// New function in bin/lib/render-presentation.cjs
function buildCrossProjectPortfolio(portfolioIR) {
  return [
    { id: 'header',   title: 'Cross-Project Portfolio',  level: 1, content: buildPortfolioHeader(portfolioIR) },
    { id: 'projects', title: 'Projects',                 level: 2, content: buildProjectList(portfolioIR) },
    { id: 'patterns', title: 'Patterns and Skills',      level: 2, content: buildCrossPatterns(portfolioIR) },
    { id: 'outcomes', title: 'Cumulative Outcomes',      level: 2, content: buildCumulativeOutcomes(portfolioIR) },
    { id: 'timeline', title: 'Milestone Timeline',       level: 2, content: buildMilestoneTimeline(portfolioIR) },
  ];
}
```

### Pattern 5: New pde-tools Subcommand

Follows the exact structure of the existing `presentation` case (pde-tools.cjs lines 1676-1688):

```javascript
case 'portfolio': {
  const subcommand = args[1];
  const portfolio = require('./lib/portfolio.cjs');
  if (subcommand === 'build') {
    const paths = args.slice(2);
    portfolio.cmdPortfolioBuild(cwd, paths, raw);
  } else if (subcommand === 'render') {
    const renderPresentation = require('./lib/render-presentation.cjs');
    renderPresentation.cmdPortfolioRender(cwd, args[2], args[3], args[4]);
  } else {
    error('Unknown portfolio subcommand. Available: build, render');
  }
  break;
}
```

### Pattern 6: /pde:portfolio Command and Workflow

commands/portfolio.md: thin shell delegating to workflows/portfolio.md (mirrors commands/present.md exactly).

workflows/portfolio.md steps:
1. Parse $ARGUMENTS — extract path arguments, detect --dry-run and --pdf flags
2. Validate at least one path is provided; validate each path has .planning/
3. Run `node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" portfolio build [paths...]` to build portfolio IR
4. Compute output: `DATE=$(date +%Y-%m-%d); HTML=".planning/presentations/portfolio-synthesis-${DATE}.html"`
5. Run `node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" portfolio render "${HTML_PATH}" "${MD_PATH}"`
6. Optional --pdf via `pde-tools presentation pdf` (reuses existing export-pdf.cjs)
7. Display completion banner with file paths and project count summary

### Anti-Patterns to Avoid

- **Don't re-implement buildPresentationIR:** Call it with different cwd values. It already handles missing files via sentinels.
- **Don't halt on per-project failure:** One inaccessible project must degrade gracefully to a sentinel entry, not abort the whole synthesis.
- **Don't add portfolio-synthesis slug to present.md persona registry:** This is a different command with a different IR shape. buildCrossProjectPortfolio takes a portfolioIR (array of projects), not a single-project IR.
- **Don't silently zero missing milestoneHistory:** If MILESTONES.md is absent, the sentinel must propagate to the render output as a "data unavailable" marker per PORT-05.
- **Don't write output to a foreign project's .planning/presentations/:** Output always goes to the invoking project's cwd, not to any of the target project paths.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML/frontmatter parsing | Custom parser | extractFrontmatter from bin/lib/frontmatter.cjs | Handles all variants seen across v0.12-v0.21 |
| HTML+MD rendering | New renderer | renderHTML/renderMarkdown from render-presentation.cjs | PDE design token CSS, TOC, verification footer already wired |
| Sentinel propagation | Custom error objects | { unavailable: true, reason } pattern from presentation.cjs | Consistent with VER-01/02/03 — verifier handles this form |
| Output dir creation | fs.mkdirSync inline | Follow buildPresentationIR pattern (creates .planning/presentations/) | Don't duplicate |
| cwd resolution | Custom path logic | path.resolve(projectPath) — same as --cwd in pde-tools.cjs line 242 | Already proven in worktree context |
| PDF export | New Playwright code | pde-tools presentation pdf (export-pdf.cjs) | Already ships from Phase 180 |

---

## Schema Audit: SUMMARY.md Field Variations (PORT-04 Resolved)

Three schema variants found across PDE milestones v0.12-v0.21:

### Variant A — Legacy (v0.12 era, pre-v0.17)

```yaml
phase: 84-foundation       # unquoted
plan: 01                   # unquoted integer
subsystem: ...
requires:                  # flat, not nested under dependency graph
  - phase: ...
tech-stack:                # hyphen
key-files:                 # hyphen
key-decisions:             # hyphen
requirements-completed: [FOUND-01]
duration: 3min
completed: 2026-03-22
```

### Variant B — Transitional (some v0.17-v0.18 files, mixed)

```yaml
phase: "138-pwa..."        # quoted string
plan: "01"                 # quoted string
dependency_graph:          # underscore (NEW)
tech_stack:                # underscore (NEW)
key_files:                 # underscore (NEW, some files)
key-decisions:             # hyphen (still mostly, some files use key_decisions)
requirements-completed: [...]
metrics:                   # NEW field
decisions:                 # NEW field
```

### Variant C — Current (v0.21+)

Mostly stable: dependency-graph (hyphen), consistent underscore for non-hyphenated internal fields. No duration field.

### Impact on Existing Extractors

| Extractor | What it reads | Schema-safe? | Notes |
|-----------|--------------|--------------|-------|
| extractProjectIdentity | PROJECT.md only | Yes | PROJECT.md format stable across all versions |
| extractPhaseCompletion | STATE.md frontmatter only | Yes | progress.* object present in all v1.0 STATEs |
| extractRequirements | REQUIREMENTS.md only | Yes | v1 Requirements heading pattern stable |
| extractDesignArtifacts | design-manifest.json only | Yes | JSON schema stable |
| extractGitVelocity | git commands only | Yes | Version-independent |
| extractCostTiming | SUMMARY.md duration: field | Partial | Field exists in Variant A; absent in B/C — returns 0, non-blocking |
| extractBlockers | STATE.md body text | Yes | Blockers/Concerns section pattern stable |
| extractVerification | VERIFICATION.md only | Yes | VERIFICATION.md format stable |
| extractResearch | file presence counts only | Yes | File-presence scan, no frontmatter |
| extractDecisions | STATE.md body + SUMMARY.md key-decisions | Partial | Misses key_decisions (underscore, Variant B). STATE.md decisions still captured. |

**Conclusion:** All extractors are safe for multi-project portfolio synthesis. The two partial gaps (extractCostTiming missing duration in B/C, extractDecisions missing key_decisions in B) were already present in the single-project path before Phase 184. The portfolio plan may optionally fix extractDecisions to check both key names (one-liner).

### Schema Version Detection

| gsd_state_version value | Meaning | Found in |
|------------------------|---------|---------|
| "1.0" | Current stable GSD-managed project | Current PDE project; "Product Design & Engineering" project |
| missing | Pre-versioning or non-GSD .planning dir | Would indicate early or non-standard project |

No adapter branching needed. Detection is informational only — all extractors are already schema-safe.

---

## Common Pitfalls

### Pitfall 1: Building a complex schema adapter tree
**What goes wrong:** Elaborate per-version adapter classes branching on SUMMARY.md field names.
**Why it happens:** The STATE.md blocker implied high complexity.
**How to avoid:** buildPresentationIR reads STATE.md, ROADMAP.md, REQUIREMENTS.md, PROJECT.md — not SUMMARY.md field names. Schema detection only needs to verify: does .planning/ exist? is gsd_state_version present? No adapter branching needed.

### Pitfall 2: Adding portfolio-synthesis to the present.md persona registry
**What goes wrong:** User runs /pde:present portfolio-synthesis and passes a single-project IR to a multi-project renderer.
**Why it happens:** Tempting to reuse present.md infrastructure.
**How to avoid:** /pde:portfolio is its own command and workflow. buildCrossProjectPortfolio takes a portfolioIR (array), not a single-project IR.

### Pitfall 3: Aborting on first project failure
**What goes wrong:** One missing .planning/ directory crashes the entire portfolio run.
**Why it happens:** Forgetting PORT-05 requires "data unavailable" markers, not errors.
**How to avoid:** Every per-project extraction is wrapped in try/catch. Missing .planning/ = sentinel. Every project path produces an entry in portfolioIR.projects[], available or not.

### Pitfall 4: Writing output to a target project's presentations directory
**What goes wrong:** Portfolio HTML written to /path/to/project-a/.planning/presentations/ instead of the invoking PDE project.
**Why it happens:** Confusing "which project to read from" with "which project to write to."
**How to avoid:** Output always goes to the invoking cwd (the PDE installation project), regardless of foreign paths passed as arguments.

### Pitfall 5: Using buildPortfolioIR via pde-tools artifact-read
**What goes wrong:** Trying to pass portfolioIR through the existing presentation artifact-read pipeline.
**Why it happens:** Reusing the present.md workflow without modification.
**How to avoid:** Portfolio needs its own pde-tools subcommand (portfolio build) because the IR shape is different: an array of per-project IRs, not a single project IR.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 184 is code-only. All dependencies (Node.js, existing .cjs modules, vitest) are already present. No new external tools, databases, or runtimes required.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.1 |
| Config file | vitest.config.mjs (project root) |
| Quick run command | `npx vitest run tests/phase-184/` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PORT-01 | buildPortfolioIR([path1, path2]) accepts multiple paths | unit | `npx vitest run tests/phase-184/portfolio.test.mjs` | No — Wave 0 |
| PORT-02 | extractMilestoneHistory(cwd) parses MILESTONES.md correctly | unit | `npx vitest run tests/phase-184/portfolio.test.mjs` | No — Wave 0 |
| PORT-03 | buildCrossProjectPortfolio(portfolioIR) returns sections array | unit | `npx vitest run tests/phase-184/portfolio-render.test.mjs` | No — Wave 0 |
| PORT-04 | detectSchemaVersion(cwd) returns correct version for v1.0 and missing | unit | `npx vitest run tests/phase-184/portfolio.test.mjs` | No — Wave 0 |
| PORT-05 | Missing project path returns { unavailable: true }, not throw | unit | `npx vitest run tests/phase-184/portfolio.test.mjs` | No — Wave 0 |
| PORT-06 | pde-tools portfolio build subcommand routes correctly | unit | `npx vitest run tests/phase-184/portfolio-cmd.test.mjs` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/phase-184/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before /gsd:verify-work

### Wave 0 Gaps
- [ ] tests/phase-184/portfolio.test.mjs — covers PORT-01, PORT-02, PORT-04, PORT-05
- [ ] tests/phase-184/portfolio-render.test.mjs — covers PORT-03
- [ ] tests/phase-184/portfolio-cmd.test.mjs — covers PORT-06

*(No framework install needed — vitest ^4.1.1 already installed)*

---

## Sources

### Primary (HIGH confidence)
- bin/lib/presentation.cjs — full source audit; all 10 extractors read, buildPresentationIR(cwd) confirmed path-parameterized (line 750); sentinel pattern confirmed
- bin/lib/render-presentation.cjs — buildPortfolioOverview (lines 1345-1353), cmdPresentationRender (lines 1729-1757), render dispatch (lines 1650-1674)
- bin/pde-tools.cjs — --cwd flag handling (lines 238-248), presentation case (lines 1676-1688)
- .planning/milestones/v0.12-phases/ — SUMMARY.md Variant A confirmed via direct file reads
- .planning/milestones/v0.17-phases/ — SUMMARY.md Variant B confirmed (mixed hyphen/underscore, specifically key_decisions vs key-decisions)
- .planning/milestones/v0.21-phases/ — SUMMARY.md Variant C confirmed
- .planning/STATE.md — gsd_state_version: 1.0 confirmed as primary schema indicator
- .planning/MILESTONES.md — format confirmed (9 entries, regex pattern verified against actual content)
- /Users/greyaltaer/code/claude creation profiles/Product Design & Engineering/.planning/STATE.md — second real project confirmed gsd_state_version: 1.0; Variant A SUMMARY.md in v1.0-phases (direct read)

### Secondary (MEDIUM confidence)
- workflows/present.md — command/workflow pattern confirmed; portfolio.md will follow this structure

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; existing modules confirmed via direct source reads
- Architecture: HIGH — buildPresentationIR cwd-parameterization confirmed; sentinel pattern confirmed; --cwd flag confirmed
- Schema audit: HIGH — three variants directly confirmed from actual milestone archive files; extractor impact table confirmed via source code cross-reference
- Pitfalls: HIGH — all five derived from direct code evidence, not speculation

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable domain; no external dependencies)
