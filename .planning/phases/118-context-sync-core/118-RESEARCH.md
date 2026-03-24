# Phase 118: Context Sync Core - Research

**Researched:** 2026-03-23
**Domain:** Editor context file generation (Cursor .mdc, GEMINI.md, AGENTS.md, .cursorrules) with SHA-256 freshness markers
**Confidence:** HIGH

## Summary

Phase 118 builds the intermediate representation (IR) builder that reads PDE's `.planning/` artifacts and editor-specific emitters that produce AGENTS.md, `.cursor/rules/*.mdc`, legacy `.cursorrules`, and hierarchical `GEMINI.md` files. All generated files include SHA-256 source hashes and generation timestamps for freshness detection.

The technical domain is well-understood. Cursor's `.mdc` YAML frontmatter format is officially documented with three fields (`description`, `globs`, `alwaysApply`). Gemini CLI's `GEMINI.md` hierarchical loading and `@file.md` import syntax are verified from official Google docs. AGENTS.md is plain markdown with no special syntax -- a Linux Foundation-stewarded standard used by 60K+ projects. PDE already has SHA-256 hashing infrastructure in `manifest.cjs` and `visual-regression.cjs` that can be directly reused.

**Primary recommendation:** Build a single `context-sync.cjs` module in `bin/lib/` that reads all `.planning/` state into a JSON IR, then emit to each editor format via small per-editor functions within the same file. Keep it simple -- no subdirectory of emitters needed for 4 output formats that share 90% of their content. Use Node.js built-in `crypto.createHash('sha256')` for source hashing.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
No explicit locked decisions -- this is an infrastructure phase with all implementation choices at Claude's discretion.

Key constraints from research:
- Cursor .mdc format: YAML frontmatter with description, globs, alwaysApply fields
- GEMINI.md: hierarchical loading from project root + subdirectories, @file.md import syntax
- AGENTS.md: plain markdown, cross-tool baseline (Cursor, Antigravity, Gemini CLI)
- Legacy .cursorrules: single file at project root for backwards compat
- Zero npm deps at plugin root -- all generators as CJS modules in bin/lib/
- Hash-based freshness: SHA-256 of source .planning/ files embedded in generated output

### Claude's Discretion
All implementation choices are at Claude's discretion -- pure infrastructure phase.

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CTX-01 | PDE generates AGENTS.md at project root with project context, design system summary, and component catalog from .planning/ artifacts | IR builder reads PROJECT.md, design-manifest.json, handoff specs; AGENTS.md emitter writes plain markdown with PDE-GENERATED marker |
| CTX-02 | PDE generates .cursor/rules/*.mdc files with YAML frontmatter (description, globs, alwaysApply) -- 5 files | Verified .mdc format from official Cursor docs: three frontmatter fields, four rule types. Five files mapped to specific content domains. |
| CTX-03 | PDE generates legacy .cursorrules file at project root for backwards compatibility | Single file, plain text, concatenation of project context. Deprecated but still functional in all Cursor versions. |
| CTX-04 | PDE generates hierarchical GEMINI.md files (project root + .planning/ + .planning/design/) with @file imports | Verified from Gemini CLI official docs: @file.md syntax, .md files only, max 5-level depth, hierarchical auto-discovery. |
| CTX-08 | Generated context files include hash-based staleness marker for freshness detection | SHA-256 via Node.js crypto built-in. PDE already uses this pattern in manifest.cjs and visual-regression.cjs. Hash computed over source .planning/ files, embedded in HTML comment in generated output. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

No CLAUDE.md found at project root. Constraints derived from existing codebase conventions:
- All bin/lib/ modules are CJS (CommonJS `require()`) with zero npm dependencies
- `output()` and `error()` helpers from `core.cjs` for standardized CLI output
- `safeReadFile()` from `core.cjs` for graceful file reading with null fallback
- SHA-256 hashing via `crypto.createHash('sha256').update(content).digest('hex')` -- established pattern
- pde-tools.cjs is the CLI entry point; new commands added as case blocks routing to lib modules

## Standard Stack

### Core (Zero Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js `fs` | built-in | Read .planning/ state, write generated files | Zero deps, CJS compatible |
| Node.js `path` | built-in | Cross-platform path resolution | Zero deps, CJS compatible |
| Node.js `crypto` | built-in | SHA-256 hash computation for source files | Already used in manifest.cjs and visual-regression.cjs |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| String template literals | Handlebars/EJS template engine | Template engine adds npm dep for trivial string interpolation. Never appropriate. |
| Manual YAML frontmatter | js-yaml library | YAML frontmatter in .mdc is 3 lines of simple key-value pairs. String concatenation is sufficient. |
| Separate emitter files per editor | Single module with exported functions | 4 output formats share 90% content; separate files add require() overhead without benefit. Revisit if >6 editors. |

## Architecture Patterns

### Recommended Project Structure

```
bin/
  lib/
    context-sync.cjs        # NEW: IR builder + all emitters + pde-tools integration
  pde-tools.cjs              # MODIFIED: add context-sync command
```

Only ONE new file. The context-sync module handles:
1. Reading `.planning/` state into IR
2. Emitting AGENTS.md
3. Emitting .cursor/rules/*.mdc (5 files)
4. Emitting .cursorrules (legacy)
5. Emitting hierarchical GEMINI.md files (3 files)
6. Computing and embedding SHA-256 source hashes

### Pattern 1: Intermediate Representation (IR) Builder

**What:** Read all `.planning/` source files once, produce an in-memory JSON object. All emitters consume this IR.

**When to use:** Every context sync invocation.

**Example:**
```javascript
// Source: Architecture research + existing PDE patterns
function buildContextIR(planningDir) {
  const project = safeReadFile(path.join(planningDir, 'PROJECT.md'));
  const designManifest = safeReadJSON(path.join(planningDir, 'design', 'design-manifest.json'));
  const designState = safeReadFile(path.join(planningDir, 'design', 'DESIGN-STATE.md'));
  const state = safeReadFile(path.join(planningDir, 'STATE.md'));
  const handoffDir = path.join(planningDir, 'design', 'handoff');

  // Collect source file contents for hashing
  const sourceFiles = [project, designState, JSON.stringify(designManifest)].filter(Boolean);
  const sourceHash = computeCompositeHash(sourceFiles);

  return {
    projectName: extractProjectName(project),
    productType: extractProductType(designManifest),
    techStack: extractStack(project),
    designTokens: extractTokenSummary(designManifest),
    componentCatalog: extractComponents(handoffDir),
    pipelineStatus: extractPipelineStatus(designState),
    constraints: extractConstraints(project),
    sourceHash,
    generatedAt: new Date().toISOString(),
  };
}
```

### Pattern 2: PDE-GENERATED Marker for AGENTS.md

**What:** AGENTS.md is generated only if it does not already exist OR contains the `<!-- PDE-GENERATED -->` marker. If a user has authored their own AGENTS.md (no marker), PDE does not touch it.

**When to use:** Every AGENTS.md emission.

**Example:**
```javascript
function shouldWriteAgentsMd(projectRoot) {
  const existing = safeReadFile(path.join(projectRoot, 'AGENTS.md'));
  if (!existing) return true;  // No file yet
  return existing.includes('<!-- PDE-GENERATED -->');  // PDE owns it
}
```

### Pattern 3: SHA-256 Composite Hash Embedding

**What:** Compute SHA-256 over concatenation of all source `.planning/` files that contribute to the generated output. Embed the hash and timestamp as an HTML comment at the top of each generated file.

**When to use:** Every generated file.

**Example:**
```javascript
function computeCompositeHash(fileContents) {
  const hash = crypto.createHash('sha256');
  for (const content of fileContents) {
    hash.update(content);
  }
  return hash.digest('hex');
}

function makeHeader(sourceHash, generatedAt) {
  return `<!-- PDE-GENERATED | hash:${sourceHash} | generated:${generatedAt} -->\n`;
}
```

### Anti-Patterns to Avoid

- **Overwriting user-authored AGENTS.md:** Check for PDE-GENERATED marker before writing. User rules are sacred.
- **Generating .cursorrules only:** Must generate BOTH .cursor/rules/*.mdc (modern) AND .cursorrules (legacy). The legacy file is deprecated but still functional.
- **Reading .planning/ files in each emitter separately:** Duplicate I/O and drift risk. Use the IR pattern.
- **Using Cursor's new RULE.md folder format:** Documented but buggy in Cursor 2.2+ (folders not detected). Stick with flat .mdc files in `.cursor/rules/`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SHA-256 hashing | Custom hash function | `crypto.createHash('sha256')` | Built-in, proven, already used 3 places in PDE |
| YAML generation | Custom YAML serializer | String template `---\ndescription: ...\n---` | .mdc frontmatter is 3 lines of trivial key:value pairs |
| File path resolution | Manual string concatenation | `path.join()` | Cross-platform, handles separators |
| Safe file reading | Try/catch in every caller | `safeReadFile()` from core.cjs | Already exists, returns null on missing |

## Common Pitfalls

### Pitfall 1: Context File Staleness

**What goes wrong:** Generated files become stale the moment PDE's design pipeline advances. External editors use outdated tokens, component APIs, or architecture patterns.
**Why it happens:** No change-detection mechanism triggers regeneration.
**How to avoid:** Every generated file includes a SHA-256 source hash and timestamp in an HTML comment. Users (and future Phase 123 auto-sync) can compare the embedded hash against the current source hash.
**Warning signs:** Generated files have timestamps older than the most recent design pipeline artifact.

### Pitfall 2: Overwriting User's AGENTS.md

**What goes wrong:** User has custom cross-tool rules in AGENTS.md. PDE overwrites them.
**Why it happens:** Generator blindly writes to AGENTS.md without checking ownership.
**How to avoid:** Check for `<!-- PDE-GENERATED -->` marker. Only write if file doesn't exist or marker is present. Log a warning if skipping due to user-authored file.
**Warning signs:** User's custom rules disappear after running context sync.

### Pitfall 3: Cursor .mdc Frontmatter Errors

**What goes wrong:** Malformed YAML frontmatter causes Cursor to silently ignore the rule file.
**Why it happens:** YAML is sensitive to quoting, indentation, and special characters in description strings.
**How to avoid:** Keep descriptions simple (no colons, quotes, or special chars in values). Always use the exact three-field format: `description`, `globs`, `alwaysApply`. Test with Cursor's Settings > Rules panel to verify rules are detected.
**Warning signs:** Generated .mdc files not showing up in Cursor's rules list.

### Pitfall 4: GEMINI.md @file Import Failures

**What goes wrong:** @file.md imports fail silently, resulting in incomplete context.
**Why it happens:** Import processor only supports `.md` files. Importing `.json` or other formats fails with a warning. Relative paths must be correct from the GEMINI.md file's location.
**How to avoid:** Only use `@file.md` syntax (not `@file.json`). For design-manifest data, create a generated `.md` summary file that GEMINI.md imports. Use relative paths from the GEMINI.md file's directory.
**Warning signs:** `/memory show` in Gemini CLI shows incomplete context; import warnings in stderr.

### Pitfall 5: Generating Excessively Large Context Files

**What goes wrong:** Generated files consume too much of the editor's context window, leaving insufficient room for actual code context.
**Why it happens:** Dumping all design tokens, all component specs, and all pipeline state into every context file.
**How to avoid:** Keep AGENTS.md concise (project summary, key constraints, component catalog names only). Use Cursor's glob-targeted .mdc files to scope detailed content (tokens only when styling files are open). GEMINI.md hierarchy naturally scopes context by directory.
**Warning signs:** Context files exceeding 500 lines; editors slow to respond; AI generating responses referencing design context when working on unrelated code.

## Code Examples

### .mdc File Generation (CTX-02)

```javascript
// Source: Cursor official docs (cursor.com/docs/context/rules)
// Verified: description, globs, alwaysApply are the three frontmatter fields

function writeMdcRule(rulesDir, filename, { description, globs, alwaysApply, body }) {
  const parts = ['---'];
  parts.push(`description: ${description}`);
  if (globs) {
    parts.push(`globs: ${globs}`);
  }
  parts.push(`alwaysApply: ${alwaysApply}`);
  parts.push('---');
  parts.push('');
  parts.push(body);

  const content = parts.join('\n');
  fs.writeFileSync(path.join(rulesDir, filename), content, 'utf-8');
}
```

### Five .mdc Files (CTX-02 Specifics)

| File | alwaysApply | globs | Content Source |
|------|-------------|-------|---------------|
| `pde-project.mdc` | `true` | (none) | PROJECT.md: name, product type, tech stack, constraints |
| `pde-design-tokens.mdc` | `false` | `*.css,*.scss,*.tsx,*.jsx` | design-manifest.json: OKLCH palette, spacing, typography summary |
| `pde-components.mdc` | `false` | `src/components/**` | Handoff: component names, prop interfaces, usage patterns |
| `pde-architecture.mdc` | `false` | `src/**` | PROJECT.md + handoff: architecture patterns, conventions |
| `pde-pipeline.mdc` | `true` | (none) | DESIGN-STATE.md: current stage, completion %, available artifacts |

### GEMINI.md Hierarchy (CTX-04)

```javascript
// Source: google-gemini.github.io/gemini-cli/docs/cli/gemini-md.html
// Verified: @file.md import syntax, .md files only, hierarchical loading

// Project root GEMINI.md
const rootGemini = [
  header,
  `# ${ir.projectName}`,
  '',
  `## Project Context`,
  ir.projectSummary,
  '',
  `## Design System`,
  `@.planning/design/pde-design-summary.md`,  // Generated summary file
  '',
  `## Pipeline Status`,
  `@.planning/pde-pipeline-summary.md`,  // Generated summary file
].join('\n');

// .planning/GEMINI.md
const planningGemini = [
  header,
  `# PDE Planning Context`,
  '',
  ir.pipelineStatus,
  '',
  ir.requirementsSummary,
].join('\n');

// .planning/design/GEMINI.md
const designGemini = [
  header,
  `# PDE Design System`,
  '',
  ir.tokenSummary,
  '',
  ir.componentCatalog,
].join('\n');
```

### SHA-256 Source Hash (CTX-08)

```javascript
// Source: existing PDE pattern in manifest.cjs line 20-27
const crypto = require('crypto');

// Files that contribute to generated context
const SOURCE_FILES = [
  'PROJECT.md',
  'STATE.md',
  'design/DESIGN-STATE.md',
  'design/design-manifest.json',
];

function computeSourceHash(planningDir) {
  const hash = crypto.createHash('sha256');
  for (const relPath of SOURCE_FILES) {
    const content = safeReadFile(path.join(planningDir, relPath));
    if (content) hash.update(content);
  }
  // Also hash any handoff specs
  const handoffDir = path.join(planningDir, 'design', 'handoff');
  if (fs.existsSync(handoffDir)) {
    for (const f of fs.readdirSync(handoffDir).sort()) {
      if (f.endsWith('.md')) {
        const content = fs.readFileSync(path.join(handoffDir, f), 'utf-8');
        hash.update(content);
      }
    }
  }
  return hash.digest('hex');
}

// Embed in every generated file as HTML comment
// <!-- PDE-GENERATED | hash:abc123... | generated:2026-03-23T12:00:00Z -->
```

### AGENTS.md Generation (CTX-01)

```javascript
// Source: agents.md specification, Linux Foundation standard
// Format: plain markdown, no special syntax

function emitAgentsMd(ir, projectRoot) {
  if (!shouldWriteAgentsMd(projectRoot)) {
    return { skipped: true, reason: 'User-authored AGENTS.md detected' };
  }

  const content = [
    `<!-- PDE-GENERATED | hash:${ir.sourceHash} | generated:${ir.generatedAt} -->`,
    `# ${ir.projectName}`,
    '',
    '## Project Overview',
    ir.projectSummary,
    '',
    '## Tech Stack',
    ir.techStack,
    '',
    '## Design System',
    ir.designTokens,
    '',
    '## Component Catalog',
    ir.componentCatalog,
    '',
    '## Conventions',
    ir.constraints,
  ].join('\n');

  fs.writeFileSync(path.join(projectRoot, 'AGENTS.md'), content, 'utf-8');
  return { written: true, path: 'AGENTS.md' };
}
```

### Legacy .cursorrules (CTX-03)

```javascript
// Single file at project root, plain text, no frontmatter
function emitCursorrules(ir, projectRoot) {
  const content = [
    `<!-- PDE-GENERATED | hash:${ir.sourceHash} | generated:${ir.generatedAt} -->`,
    `# ${ir.projectName} - Cursor Rules`,
    '',
    '## Project Context',
    ir.projectSummary,
    '',
    '## Tech Stack',
    ir.techStack,
    '',
    '## Design System',
    ir.designTokens,
    '',
    '## Component APIs',
    ir.componentCatalog,
    '',
    '## Architecture',
    ir.constraints,
  ].join('\n');

  fs.writeFileSync(path.join(projectRoot, '.cursorrules'), content, 'utf-8');
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single `.cursorrules` file | `.cursor/rules/*.mdc` with YAML frontmatter | Cursor 0.45+ (late 2025) | Glob-targeted rules reduce context waste |
| `.cursor/rules/name/RULE.md` folders | `.cursor/rules/name.mdc` flat files | Cursor 2.2 (2026) documented but buggy | RULE.md folder format not reliably detected; stick with .mdc |
| Single GEMINI.md at project root | Hierarchical GEMINI.md with @file.md imports | Gemini CLI v1+ (2025) | Modular context, directory-scoped loading |
| Per-editor custom config files | AGENTS.md cross-tool standard | 2025-2026, Linux Foundation | One file works in Cursor, Antigravity, Gemini CLI, Claude Code |

**Deprecated/outdated:**
- `.cursorrules` single file: Deprecated by Cursor in favor of `.cursor/rules/*.mdc`. Still works but lacks glob targeting. PDE generates both for backwards compatibility (CTX-03).
- Cursor RULE.md folder format: Documented in Cursor 2.2 docs but has known bugs where folders are not detected. Community consensus is to use .mdc files until folder format is fixed.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (node:test + node:assert) |
| Config file | tests/phase-118/context-sync.test.cjs (Wave 0) |
| Quick run command | `node --test tests/phase-118/context-sync.test.cjs` |
| Full suite command | `node --test tests/phase-118/*.test.cjs` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CTX-01 | AGENTS.md generated with project context, design summary, component catalog | unit | `node --test tests/phase-118/context-sync.test.cjs --test-name-pattern="CTX-01"` | Wave 0 |
| CTX-01 | AGENTS.md skipped when user-authored (no PDE-GENERATED marker) | unit | `node --test tests/phase-118/context-sync.test.cjs --test-name-pattern="agents-skip"` | Wave 0 |
| CTX-02 | 5 .mdc files generated with valid YAML frontmatter | unit | `node --test tests/phase-118/context-sync.test.cjs --test-name-pattern="CTX-02"` | Wave 0 |
| CTX-02 | .mdc frontmatter has correct description, globs, alwaysApply per file | unit | `node --test tests/phase-118/context-sync.test.cjs --test-name-pattern="mdc-frontmatter"` | Wave 0 |
| CTX-03 | .cursorrules generated at project root | unit | `node --test tests/phase-118/context-sync.test.cjs --test-name-pattern="CTX-03"` | Wave 0 |
| CTX-04 | 3 GEMINI.md files generated (root + .planning/ + .planning/design/) | unit | `node --test tests/phase-118/context-sync.test.cjs --test-name-pattern="CTX-04"` | Wave 0 |
| CTX-04 | GEMINI.md @file imports use .md extension only | unit | `node --test tests/phase-118/context-sync.test.cjs --test-name-pattern="gemini-imports"` | Wave 0 |
| CTX-08 | Every generated file contains SHA-256 hash in PDE-GENERATED comment | unit | `node --test tests/phase-118/context-sync.test.cjs --test-name-pattern="CTX-08"` | Wave 0 |
| CTX-08 | Hash changes when source files change | unit | `node --test tests/phase-118/context-sync.test.cjs --test-name-pattern="hash-freshness"` | Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test tests/phase-118/context-sync.test.cjs`
- **Per wave merge:** `node --test tests/phase-118/*.test.cjs`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-118/context-sync.test.cjs` -- covers CTX-01 through CTX-08
- [ ] `tests/phase-118/fixtures/` -- mock .planning/ directory with PROJECT.md, design-manifest.json, DESIGN-STATE.md, handoff/ for test isolation

## Sources

### Primary (HIGH confidence)
- [Cursor Rules Documentation](https://cursor.com/docs/context/rules) -- .mdc format, YAML frontmatter fields, rule types
- [Gemini CLI GEMINI.md Docs (official)](https://google-gemini.github.io/gemini-cli/docs/cli/gemini-md.html) -- hierarchical loading, @file.md import syntax, .md-only constraint
- [AGENTS.md Specification](https://agents.md/) -- cross-tool format, plain markdown, Linux Foundation standard
- PDE `bin/lib/manifest.cjs` -- existing SHA-256 hashing pattern via `crypto.createHash('sha256')`
- PDE `bin/lib/visual-regression.cjs` -- additional SHA-256 usage confirming established pattern
- PDE `bin/lib/core.cjs` -- `safeReadFile()`, `output()`, `error()` helpers

### Secondary (MEDIUM confidence)
- [Cursor .mdc Best Practices (Forum)](https://forum.cursor.com/t/my-best-practices-for-mdc-rules-and-troubleshooting/50526) -- practical .mdc patterns, gotchas
- [Cursor RULE.md Bug Report (Forum)](https://forum.cursor.com/t/project-rules-documented-rule-md-folder-format-not-working-only-undocumented-mdc-format-works/145907) -- folder format broken, .mdc is reliable
- [AGENTS.md Review 2026](https://vibecoding.app/blog/agents-md-review) -- cross-editor support confirmation
- [Gemini CLI Memory Import Processor](https://geminicli.com/docs/reference/memport/) -- @file.md depth limits, safety features

### Tertiary (LOW confidence)
- None -- all findings verified against primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all built-in Node.js modules, zero external deps
- Architecture: HIGH -- IR builder + emitter pattern proven in milestone research and matches existing PDE patterns
- Pitfalls: HIGH -- freshness staleness, AGENTS.md ownership, .mdc format verified against official docs
- Editor format specs: HIGH for Cursor and Gemini CLI (official docs), MEDIUM for AGENTS.md (community standard)

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stable domain, editor formats unlikely to change in 30 days)
