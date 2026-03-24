# Phase 122: Divergence Detection - Research

**Researched:** 2026-03-23
**Domain:** Heuristic static analysis — glob/regex/grep-based drift detection between handoff specs and codebase
**Confidence:** HIGH

## Summary

Phase 122 builds a 3-tier drift detector that compares PDE handoff specs against the implementing codebase. The input source is handoff spec files at `.planning/design/handoff/HND-handoff-spec-*.md`, which carry `<!-- @component: ... -->`, `<!-- @props: ... -->`, and `<!-- @tokens: ... -->` annotations introduced by Phase 120. The detector runs three tiers (T1 structural, T2 content, T3 behavioral) and writes a `DIVERGENCE.md` report with per-component status: ALIGNED, DRIFTED, MISSING, or EXTRA.

All implementation lives in `bin/lib/divergence.cjs` (zero npm dependencies) and is invoked by a new `/pde:check-divergence` command backed by `workflows/check-divergence.md`. Tests go in `tests/phase-122/test-divergence.cjs` using the `node:test` runner. A `.pde-divergence-ignore` file at the project root suppresses known-acceptable divergences. The detector is intentionally heuristic — no AST parsing, only glob/regex/grep (AST upgrade is ADIV-01, deferred to future).

The primary architectural decision already logged in STATE.md: "Divergence detection starts heuristic (regex/glob) not AST — T3 behavioral via grep." All code must follow the zero-npm-dependency constraint that governs the plugin root.

**Primary recommendation:** Build `bin/lib/divergence.cjs` as a single CJS module following the `artifact-format.cjs` / `context-sync.cjs` pattern, exporting pure functions testable with `node:test` and no filesystem side effects on construction.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from project state:
- Divergence detection starts heuristic (regex/glob) not AST — T3 behavioral via grep
- Zero npm deps at plugin root — all detectors as CJS modules in bin/lib/
- Handoff specs at .planning/design/handoff/HND-handoff-spec-*.md contain component APIs
- @file annotations from Phase 120 (@component:, @props:, @tokens:) provide extraction targets
- /pde:check-divergence command follows existing skill command pattern

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase.

### Deferred Ideas (OUT OF SCOPE)
None — discuss phase skipped.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DIV-01 | T1 structural detection — glob-based check that handoff-declared components exist in codebase | File system glob using `node:fs` `readdirSync` or `globSync` (Node 22+); fall back to recursive `readdirSync` walk for compatibility |
| DIV-02 | T2 content detection — regex-based interface parsing comparing prop names/types against handoff specs | Extract `interface {Name}Props { ... }` blocks from source files via regex; compare against props listed in handoff spec `@props:` annotation and interface body |
| DIV-03 | T3 behavioral detection — grep-based check that components use specified design tokens and patterns | `fs.readFileSync` + `String.includes` / regex scan of component files for each token listed in `@tokens:` annotation |
| DIV-04 | DIVERGENCE.md output with per-component status (ALIGNED, DRIFTED, MISSING, EXTRA) | Markdown report builder following DIVERGENCE.md schema; written to project root |
| DIV-05 | /pde:check-divergence command triggers detection on demand | `commands/check-divergence.md` + `workflows/check-divergence.md` following the pipeline-status command pattern |
| DIV-06 | .pde-divergence-ignore file for suppressing known-acceptable divergences | Gitignore-style line parser; component names / patterns on each line suppress that component's status entry |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node:fs | Built-in | File reading, directory listing | Zero-dep constraint; all bin/lib/ modules use it |
| node:path | Built-in | Path joining and resolution | Cross-platform path handling |
| node:test | Built-in | Unit test runner | All phase-1xx tests use `node --test` |
| node:assert/strict | Built-in | Assertions | Matches existing test files verbatim |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:os | Built-in | `os.tmpdir()` for test fixtures | Tests that need temp directories (matches phase-120 pattern) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recursive readdirSync walk | `glob` npm package | glob adds npm dep — violates zero-dep constraint |
| Regex interface parsing | TypeScript compiler API | AST is ADIV-01 (deferred); regex sufficient for T2 heuristic |
| `String.includes` for token grep | `grep` shell command via `execSync` | Pure JS avoids shell-escaping bugs and is testable without subprocess |

**Installation:** None — Node.js built-ins only.

---

## Architecture Patterns

### Recommended Module Structure
```
bin/lib/divergence.cjs          # Core detector module (exported pure functions)
commands/check-divergence.md    # Slash command definition
workflows/check-divergence.md   # Workflow executed by command
tests/phase-122/
  test-divergence.cjs           # node:test tests covering DIV-01 through DIV-06
```

### Pattern 1: Annotation Extraction from Handoff Specs
**What:** Parse `<!-- @component: X -->`, `<!-- @props: Y -->`, `<!-- @tokens: A, B -->` annotations from `.planning/design/handoff/HND-handoff-spec-*.md`
**When to use:** T1, T2, T3 all start here — this is the canonical source of truth

**Regex (verified against artifact-format.cjs output format):**
```javascript
// Source: bin/lib/artifact-format.cjs generateFileAnnotations()
const ANNOTATION_RE = /<!-- @(component|props|tokens): ([^>]+) -->/g;

function extractAnnotations(specContent) {
  const components = [];
  let current = null;
  for (const match of specContent.matchAll(ANNOTATION_RE)) {
    const [, key, value] = match;
    if (key === 'component') {
      current = { name: value.trim(), props: null, tokens: [] };
      components.push(current);
    } else if (key === 'props' && current) {
      current.props = value.trim();
    } else if (key === 'tokens' && current) {
      current.tokens = value.split(',').map(t => t.trim()).filter(Boolean);
    }
  }
  return components;
}
```
Confidence: HIGH — annotation format is locked by Phase 120 and the template is in `templates/handoff-spec.md`.

### Pattern 2: T1 Structural Detection (glob-based file existence)
**What:** For each declared component, search the `src/` tree for a file whose name matches `{ComponentName}.{tsx,ts,jsx,js,vue,svelte}`
**When to use:** Every component extracted from handoff specs

```javascript
// Source: Node.js built-ins, project pattern from bin/lib/ modules
function findComponentFile(projectRoot, componentName) {
  const extensions = ['.tsx', '.ts', '.jsx', '.js', '.vue', '.svelte'];
  // Recursive walk — avoids npm glob dependency
  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return null; }
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        const found = walk(path.join(dir, entry.name));
        if (found) return found;
      } else if (entry.isFile()) {
        for (const ext of extensions) {
          if (entry.name === componentName + ext) return path.join(dir, entry.name);
        }
      }
    }
    return null;
  }
  return walk(projectRoot);
}
```
Confidence: HIGH — pattern established in core.cjs `searchPhaseInDir`.

### Pattern 3: T2 Content Detection (regex prop comparison)
**What:** Read the found component file, extract TypeScript interface matching `{PropsName}`, compare prop names against handoff spec annotation
**When to use:** When T1 finds a file (component is not MISSING)

```javascript
// Regex for interface block extraction
function extractPropsFromFile(fileContent, propsInterfaceName) {
  // Match: interface FooProps { ... }
  const interfaceRe = new RegExp(
    'interface\\s+' + propsInterfaceName + '\\s*\\{([^}]*(?:\\{[^}]*\\}[^}]*)*)\\}',
    's' // dotAll
  );
  const match = fileContent.match(interfaceRe);
  if (!match) return null;
  // Extract prop names — lines like:  propName: type; or propName?: type;
  const body = match[1];
  const propRe = /^\s*\/?\*?[^/]*\n?\s*(\w+)\??\s*:/gm;
  const props = [];
  for (const m of body.matchAll(propRe)) {
    if (!m[1].startsWith('//') && !m[1].startsWith('*')) props.push(m[1]);
  }
  return props;
}
```
Note: This regex covers the common interface shape; JSDoc comment lines (/** ... */) are stripped by the leading `\/?\*?[^/]*\n?` pattern. Confidence: MEDIUM — regex is sufficient for heuristic T2 but will miss exotic TypeScript patterns (mapped types, extends). That is acceptable per ADIV-01 deferral.

### Pattern 4: T3 Behavioral Detection (grep-based token usage)
**What:** For each token in the `@tokens:` list, check whether the component file contains a reference to that token string
**When to use:** When T1 finds a file

```javascript
function checkTokenUsage(fileContent, tokens) {
  const missing = [];
  for (const token of tokens) {
    if (!fileContent.includes(token)) missing.push(token);
  }
  return missing; // empty = all tokens used
}
```
Confidence: HIGH — simple string inclusion check; no edge cases for heuristic tier.

### Pattern 5: EXTRA Component Detection
**What:** Walk the codebase for component files that use the PDE-generated comment marker or match a naming convention, and flag those not referenced in any handoff spec
**When to use:** Secondary scan after processing all declared components
**Important:** EXTRA detection is best-effort heuristic — only flag files in `src/components/` (or similarly named dirs) that have no matching handoff spec entry. Do NOT walk the entire tree as EXTRA detector — too noisy.

### Pattern 6: .pde-divergence-ignore Parsing
**What:** Read `{projectRoot}/.pde-divergence-ignore`, parse non-comment lines as component names to suppress
**When to use:** After all detections, before writing DIVERGENCE.md

```javascript
function loadIgnoreList(projectRoot) {
  const ignorePath = path.join(projectRoot, '.pde-divergence-ignore');
  try {
    const content = fs.readFileSync(ignorePath, 'utf-8');
    return new Set(
      content.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'))
    );
  } catch {
    return new Set(); // file is optional
  }
}
```
Confidence: HIGH — identical pattern to .gitignore parsing, well-understood.

### Pattern 7: Command + Workflow Structure
**What:** `/pde:check-divergence` follows the `pipeline-status` command pattern exactly
**When to use:** Command file delegates to workflow file

`commands/check-divergence.md`:
```markdown
---
name: pde:check-divergence
description: Detect drift between handoff specs and implemented components
argument-hint: '[--dry-run] [--verbose]'
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
---
<objective>
Execute the /pde:check-divergence command.
</objective>

<process>
Follow @workflows/check-divergence.md exactly.

Pass all of $ARGUMENTS to the workflow.
</process>
```

The workflow invokes `bin/lib/divergence.cjs` via a Node one-liner (same pattern as mcp-status.md):
```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const d = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/divergence.cjs`);
const result = d.runDivergenceCheck(process.cwd());
process.stdout.write(JSON.stringify(result) + '\n');
EOF
```

### Pattern 8: DIVERGENCE.md Output Schema

```markdown
---
Generated: {ISO date}
Skill: /pde:check-divergence
HandoffSpecVersion: v{N}
---

# Divergence Report: {project_name}

| Component | Status | T1 Structural | T2 Content | T3 Behavioral | Notes |
|-----------|--------|--------------|------------|---------------|-------|
| Button    | ALIGNED | found        | props match | tokens used  |       |
| Card      | DRIFTED | found        | missing: variant | tokens used | |
| Modal     | MISSING | not found    | --          | --            |       |
| NavBar    | EXTRA   | found        | --          | --            | Not in handoff |

## Summary

- ALIGNED: {N}
- DRIFTED: {N}
- MISSING: {N}
- EXTRA: {N}

*{N} divergences suppressed via .pde-divergence-ignore*

---
*Generated by PDE-OS /pde:check-divergence | {date}*
```

### Anti-Patterns to Avoid
- **Reading handoff dir before checking existence:** The `.planning/design/handoff/` directory may be empty or not exist. Always gracefully return empty component list — verified: `context-sync.cjs` wraps this in a try/catch.
- **Case-sensitive component name matching for T1:** Component files may be `button.tsx` vs `Button.tsx`. Match case-insensitively or try both.
- **Greedy regex for interface body:** `interface Foo { ... }` body regex with `[^}]*` breaks on nested generics. Use the `'s'` (dotAll) flag and account for nested braces.
- **Blocking on empty handoff dir:** If no handoff specs exist, report "No handoff specs found — run /pde:handoff first" and exit cleanly without writing DIVERGENCE.md.
- **Hardcoding `src/` as the only search root:** Some projects place components at `components/`, `app/`, etc. Walk from `projectRoot`, skipping `node_modules` and dotdirs.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Annotation extraction | Custom parser | The locked regex `<!-- @(component\|props\|tokens): ([^>]+) -->` from artifact-format.cjs | Format is already fixed by Phase 120 |
| File walking | Shell `find` command via `execSync` | Pure `fs.readdirSync` recursive walk | Avoids shell-escaping bugs, testable in isolation |
| Prop parsing | Full TypeScript compiler API | Regex against interface body | AST upgrade is explicitly deferred as ADIV-01 |
| Ignore file parsing | Complex glob matching | Line-by-line exact name match | REQUIREMENTS only need component name suppression, not glob patterns |

**Key insight:** The heuristic design is intentional — the goal is catching obvious drift (missing files, missing props, missing token usage), not perfect static analysis. Complexity should stay proportional to the tier.

---

## Common Pitfalls

### Pitfall 1: Empty Handoff Directory
**What goes wrong:** `fs.readdirSync('.planning/design/handoff/')` throws if the directory does not exist (no handoff has been run yet)
**Why it happens:** Phase 120 creates the dir structure, but the PDE user may not have run `/pde:handoff` yet
**How to avoid:** Wrap dir read in try/catch; if catch, return `{ components: [], noSpecs: true }` and display a clear message
**Warning signs:** Test fails with `ENOENT` on fresh project

### Pitfall 2: Interface Body Regex Fails on Nested Generics
**What goes wrong:** `interface FooProps { onClick: (e: MouseEvent<HTMLButtonElement>) => void; }` — the `<` and `>` characters inside the body confuse the closing `}` match
**Why it happens:** Naive regex `interface \w+ \{([^}]*)\}` stops at the first `}`
**How to avoid:** Use dotAll flag `'s'` and a balanced-brace counter, or simply extract prop names from lines beginning with an identifier followed by `?:`/`:` rather than trying to bound the full interface body
**Warning signs:** T2 reports "no props found" for components with generic props

### Pitfall 3: Case Mismatch in T1 File Search
**What goes wrong:** Handoff spec declares `Button` but file is `button.tsx` (lowercase, common in Next.js page components)
**Why it happens:** Case-sensitive filesystem on Linux; macOS is case-insensitive but deployments may not be
**How to avoid:** Compare filenames case-insensitively: `entry.name.toLowerCase() === (componentName + ext).toLowerCase()`
**Warning signs:** MISSING status for components that clearly exist

### Pitfall 4: EXTRA Detection Noise
**What goes wrong:** Flagging utility files, index files, and test files as EXTRA components
**Why it happens:** Overly broad file walk picks up `index.tsx`, `types.ts`, `*.test.tsx`
**How to avoid:** Only flag files in directories named `components/`, `ui/`, or similar convention dirs; skip files ending in `.test.*`, `.spec.*`, `index.*`
**Warning signs:** EXTRA count unexpectedly large

### Pitfall 5: Token Variable Name Exact Match
**What goes wrong:** Handoff spec declares `--color-primary-500` but component uses `var(--color-primary-500)` — still a match. But if component uses a CSS-in-JS object `colors.primary[500]`, the token string won't match
**Why it happens:** T3 is grep-based string search, not semantic analysis
**How to avoid:** Document that T3 is a heuristic; a component using a CSS module or CSS-in-JS may show DRIFTED even if semantically correct. The suppress mechanism (DIV-06) handles these known cases
**Warning signs:** User reports false positives on CSS-in-JS heavy projects

---

## Code Examples

### Full divergence.cjs export surface
```javascript
// Source: derived from artifact-format.cjs and core.cjs patterns in this project
'use strict';

module.exports = {
  // Extract component declarations from a single handoff spec file content
  extractAnnotations,        // (specContent: string) => ComponentSpec[]

  // Load all handoff specs from .planning/design/handoff/
  loadHandoffSpecs,          // (planningDir: string) => ComponentSpec[]

  // T1: check file existence
  findComponentFile,         // (projectRoot: string, name: string) => string|null

  // T2: compare props
  extractPropsFromFile,      // (fileContent: string, propsName: string) => string[]|null

  // T3: check token usage
  checkTokenUsage,           // (fileContent: string, tokens: string[]) => string[]

  // Ignore list
  loadIgnoreList,            // (projectRoot: string) => Set<string>

  // Main entry point — full detection run
  runDivergenceCheck,        // (projectRoot: string) => DivergenceResult

  // Output
  buildDivergenceReport,     // (result: DivergenceResult) => string  (Markdown)
};
```

### Test structure (node:test pattern from phase-120)
```javascript
// Source: tests/phase-120/test-artifact-format.cjs pattern
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { extractAnnotations, findComponentFile, /* ... */ } = require('../../bin/lib/divergence.cjs');

describe('DIV-01: T1 structural detection', () => {
  it('returns file path when component exists', () => { /* ... */ });
  it('returns null when component is MISSING', () => { /* ... */ });
  it('matches case-insensitively', () => { /* ... */ });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual developer audit of spec vs code | Automated heuristic detection | Phase 122 | Closes the loop on handoff drift without AST tooling |
| No suppress mechanism | .pde-divergence-ignore | Phase 122 | Reduces false positive friction for CSS-in-JS / known deviations |

**Deferred/future:**
- ADIV-01: Full TypeScript AST parsing — replace regex T2 with compiler API (deferred beyond v0.15)
- ADIV-02: Hook-driven automatic detection after code changes (deferred beyond v0.15)

---

## Open Questions

1. **Where should DIVERGENCE.md be written?**
   - What we know: Success criteria says "produces DIVERGENCE.md" without specifying location
   - What's unclear: Project root vs `.planning/design/` vs `.planning/` root
   - Recommendation: Write to project root (alongside AGENTS.md, .cursorrules) — it is a developer-facing report, not a planning artifact

2. **Should T1 search only `src/` or the full project root?**
   - What we know: Projects vary in structure; some use `src/`, some use `app/`, some use `components/`
   - What's unclear: Whether to make the search root configurable
   - Recommendation: Walk from project root, skip `node_modules/`, `.git/`, `.planning/`, dotdirs — pragmatic and matches the zero-config spirit

3. **Should EXTRA detection be implemented in this phase?**
   - What we know: Success criteria lists EXTRA as a valid status; handoff spec template does not mark generated components
   - What's unclear: Without a PDE-GENERATED marker on component files, EXTRA detection requires assumptions about which files are "supposed to" be in the handoff
   - Recommendation: Implement limited EXTRA detection — only flag component files in conventional dirs (`components/`, `ui/`) that have no matching handoff spec entry. Document the limitation.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | node:test (Node.js built-in) |
| Config file | none — invoked directly |
| Quick run command | `node --test tests/phase-122/test-divergence.cjs` |
| Full suite command | `node --test tests/phase-120/test-artifact-format.cjs tests/phase-121/test-mcp-server.cjs tests/phase-122/test-divergence.cjs` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DIV-01 | glob-based file existence detection returns path or null | unit | `node --test tests/phase-122/test-divergence.cjs` | Wave 0 |
| DIV-02 | regex prop extraction compares interface props vs spec | unit | `node --test tests/phase-122/test-divergence.cjs` | Wave 0 |
| DIV-03 | grep token usage check returns missing tokens list | unit | `node --test tests/phase-122/test-divergence.cjs` | Wave 0 |
| DIV-04 | DIVERGENCE.md output contains ALIGNED/DRIFTED/MISSING/EXTRA | unit | `node --test tests/phase-122/test-divergence.cjs` | Wave 0 |
| DIV-05 | commands/check-divergence.md and workflows/check-divergence.md exist with correct structure | unit (file existence) | `node --test tests/phase-122/test-divergence.cjs` | Wave 0 |
| DIV-06 | .pde-divergence-ignore suppresses named components from output | unit | `node --test tests/phase-122/test-divergence.cjs` | Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/phase-122/test-divergence.cjs`
- **Per wave merge:** `node --test tests/phase-120/test-artifact-format.cjs tests/phase-121/test-mcp-server.cjs tests/phase-122/test-divergence.cjs`
- **Phase gate:** Full suite green before `/pde:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-122/test-divergence.cjs` — covers DIV-01 through DIV-06

*(Framework install: none — node:test is built-in to Node.js)*

---

## Sources

### Primary (HIGH confidence)
- `bin/lib/artifact-format.cjs` — annotation format (`<!-- @component:/@props:/@tokens: -->`) locked by Phase 120
- `bin/lib/core.cjs` — established patterns for recursive dir walk (`searchPhaseInDir`), safeReadFile, zero-dep constraint
- `bin/lib/context-sync.cjs` — handoff dir read pattern with try/catch, composite hash approach
- `templates/handoff-spec.md` — confirmed annotation placement at end of per-screen component sections
- `tests/phase-120/test-artifact-format.cjs` — node:test + node:assert/strict + mkdtempSync fixture pattern
- `commands/pipeline-status.md` + `workflows/mcp-status.md` — command/workflow split pattern for new commands
- `REQUIREMENTS.md` DIV-01 through DIV-06 — authoritative requirement text

### Secondary (MEDIUM confidence)
- STATE.md Accumulated Context — "Divergence detection starts heuristic (regex/glob) not AST" (project decision logged 2026-03-23)
- `templates/handoff-spec.md` — EXTRA detection logic informed by absence of PDE-GENERATED markers on component files (observed, not documented)

### Tertiary (LOW confidence)
- EXTRA detection scope heuristic (components/ and ui/ conventional dirs) — inferred from common React/Next.js project conventions, not project-specific documentation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Node.js built-ins only, matches all prior phases exactly
- Architecture: HIGH — patterns directly mirrored from artifact-format.cjs, context-sync.cjs, and existing command/workflow pairs
- Pitfalls: HIGH for P1-P3 (verified against template and codebase); MEDIUM for P4-P5 (inferred from known CSS-in-JS patterns)

**Research date:** 2026-03-23
**Valid until:** 2026-05-23 (stable domain — Node.js built-in APIs, no external dependencies)
