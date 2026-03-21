# Phase 72: Suggestion Catalog and Content Layer - Research

**Researched:** 2026-03-21
**Domain:** Human-editable markdown catalog design, context injection into planning workflows, DESIGN-STATE.md incomplete-choice detection
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONT-01 | Phase-keyed suggestion catalog (.planning/idle-catalog.md) with 6 phase categories × 3-5 suggestions each plus generic fallback section | Engine already accepts `catalogPath` param; file must be markdown with `## category` headers; parser reads per-category suggestion blocks |
| CONT-02 | Artifact review queue surfaces "new artifact ready for review" with specific file paths on phase_complete events | Engine's `gatherCandidates` already reads `design-manifest.json` completed artifacts; Phase 72 must populate catalog with artifact-review entry templates AND ensure the hook passes `catalogPath` when calling `generateSuggestions` |
| CONT-03 | Domain knowledge externalization prompts displayed during agent processing with phase-specific questions the user can answer | Catalog `think` sections per phase; each section must contain at least one question-phrased entry |
| CONT-04 | User-authored context notes stored in .planning/context-notes/ directory, consumable by /pde:plan and /pde:brief in subsequent phases | Inject context-notes content into plan-phase workflow's planner prompt; init.cjs passes file paths; pattern already exists for CONTEXT.md injection |
| CONT-05 | Human-taste decision queue reads DESIGN-STATE.md for incomplete design choices and surfaces them as low-urgency decision prompts | DESIGN-STATE.md checkbox `[ ]` scan already exists in `classifyPhase`; Phase 72 must extract specific incomplete item text and add to candidates as `think` entries, not generic — must use actual item text |
| CONT-06 | Each suggestion labeled with expected time-to-complete and resumption cost category (low/medium/high) | Catalog format must carry `Nmin // resumption:cost` per entry; parser must emit valid candidate shape `{ minutes, resumption }` |
</phase_requirements>

---

## Summary

Phase 72 has three distinct deliverables that are independent enough to plan in parallel but must be coordinated at the interface level. The first deliverable is `.planning/idle-catalog.md` — a human-editable markdown file with 7 sections (research, plan, execute, design, validation, review, default) each containing 3-5 suggestion entries with time and resumption labels. The second deliverable is the catalog parser inside `bin/lib/idle-suggestions.cjs` — a minimal parser (~30 lines) that reads the catalog file and converts each section's entries into the existing candidate shape the engine already knows how to rank and format. The third deliverable is context-notes injection — modifying `workflows/plan-phase.md` and the planner prompt to read `.planning/context-notes/` files and inject their content under a "Context Notes" section.

The key architectural discovery from reading the Phase 71 source is that `catalogPath` is already accepted as a parameter by both `generateSuggestions` and `gatherCandidates`, but it is not yet used — the parameter is received and stored but the actual file read and parse logic was deferred to Phase 72. Phase 72 must implement the catalog read inside `gatherCandidates`. The hook handler already calls `generateSuggestions({ cwd, event: lastMeaningful })` without passing `catalogPath`, so Phase 72 must also update the hook to pass the catalog path.

The CONT-05 requirement (DESIGN-STATE.md incomplete choices as decision prompts) is partially served by existing code: `classifyPhase` already reads DESIGN-STATE.md and detects `[ ]` incomplete checkboxes. But the current implementation only produces a generic "review: incomplete design stages in design-state" entry. Phase 72 must extract the actual incomplete item text from DESIGN-STATE.md and generate per-item `think`-category candidates.

**Primary recommendation:** Implement in two plans: Plan 01 creates the catalog file and the parser that ingests it into the engine; Plan 02 implements context-notes directory initialization and plan-phase workflow injection.

---

## Standard Stack

### Core (no changes — zero new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:fs` | built-in | Synchronous catalog file read | Established in all `bin/lib/*.cjs` modules |
| `node:path` | built-in | Path construction for catalog and context-notes | Project-wide standard |
| `node:assert` | built-in | Test assertions | Used by all phase test files |

### Internal Modules Touched

| Module | Path | What Phase 72 Does |
|--------|------|-------------------|
| `idle-suggestions.cjs` | `bin/lib/idle-suggestions.cjs` | Add catalog parser; wire `catalogPath` read in `gatherCandidates`; add DESIGN-STATE.md incomplete-item extraction |
| `hooks/idle-suggestions.cjs` | `hooks/idle-suggestions.cjs` | Pass `catalogPath: path.join(cwd, '.planning', 'idle-catalog.md')` to `generateSuggestions` call |
| `workflows/plan-phase.md` | `workflows/plan-phase.md` | Add context-notes probe step to planner prompt construction (inject context-notes content) |

**No npm install needed** — zero external dependencies.

---

## Architecture Patterns

### Recommended Project Structure

```
.planning/
├── idle-catalog.md          # NEW — Phase 72 content deliverable
├── context-notes/           # NEW — user-authored notes directory
│   └── README.md            # NEW — explains format and purpose
bin/lib/
└── idle-suggestions.cjs     # MODIFIED — catalog parser + DESIGN-STATE extraction
hooks/
└── idle-suggestions.cjs     # MODIFIED — pass catalogPath to generateSuggestions
workflows/
└── plan-phase.md            # MODIFIED — probe context-notes and inject into planner prompt
hooks/tests/
└── verify-phase-72.cjs      # NEW — test file
```

### Pattern 1: Catalog File Format

The catalog uses plain markdown with headings as phase keys. Each section contains bullet entries where each entry has a suggestion text line and a label line. The format is human-editable (no frontmatter, no YAML, no structured data beyond what markdown naturally provides).

```markdown
## research

- capture: what domain assumptions have you not yet written down?
  5min // resumption:low

- capture: what edge cases does this research phase not cover?
  5min // resumption:low

- capture: what competitor behaviors would change your approach?
  5min // resumption:low

## plan

- think: what acceptance criteria are ambiguous in the plan?
  5min // resumption:low
...
```

**Parsing contract:**
- `##` heading = phase category key (maps to `phaseType`)
- Bullet items = suggestion entries
- Indent line after bullet = `Nmin // resumption:cost` label
- Parser emits one candidate object per bullet: `{ category: 'think', text, minutes, resumption, source: 'catalog' }`
- All catalog entries go into the `think` category (they are knowledge-capture prompts)
- `review`-category entries (artifact review queue) are NOT in the catalog — they remain dynamically generated from design-manifest.json as they are today

**Category key mapping:**
| Catalog `##` heading | `phaseType` value | Notes |
|---------------------|-------------------|-------|
| `research` | `research` | |
| `plan` | `plan` | |
| `execute` | `execute` | |
| `design` | `design` | |
| `validation` | `validation` | |
| `review` | `review` | post-phase review period |
| `default` | `default` | fallback for unclassified |

### Pattern 2: Catalog Parser (inside `gatherCandidates`)

The parser is implemented as an inline function inside `idle-suggestions.cjs`. It reads the catalog synchronously and appends candidates to the existing candidates array. The `catalogPath` argument replaces `STATIC_THINK` when provided.

```javascript
// Source: Pattern derived from existing candidate shapes in idle-suggestions.cjs
function parseCatalog(catalogPath, phaseType) {
  if (!catalogPath) return null;
  let raw;
  try { raw = fs.readFileSync(catalogPath, 'utf-8'); } catch { return null; }

  const sections = {};
  let currentSection = null;
  const lines = raw.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^##\s+(\w+)/);
    if (headingMatch) {
      currentSection = headingMatch[1].toLowerCase();
      sections[currentSection] = [];
      continue;
    }
    if (!currentSection) continue;
    const bulletMatch = line.match(/^-\s+(.+)/);
    if (bulletMatch) {
      const text = bulletMatch[1].trim();
      // Look ahead for label line
      const nextLine = (lines[i + 1] || '').trim();
      const labelMatch = nextLine.match(/^(\d+)min\s*\/\/\s*resumption:(\w+)/);
      sections[currentSection].push({
        category: 'think',
        text: text,
        minutes: labelMatch ? parseInt(labelMatch[1], 10) : 5,
        resumption: (labelMatch && labelMatch[2]) ? labelMatch[2] : 'low',
        filePath: null,
        source: 'catalog',
      });
      if (labelMatch) i++; // skip label line
    }
  }

  // Return entries for current phaseType OR default fallback
  return sections[phaseType] || sections['default'] || null;
}
```

**Integration in `gatherCandidates`:** Replace the `STATIC_THINK` push with catalog-parsed entries when catalog is available:

```javascript
// CURRENT (end of gatherCandidates):
for (let i = 0; i < STATIC_THINK.length; i++) {
  candidates.push(STATIC_THINK[i]);
}

// REPLACEMENT:
const catalogEntries = parseCatalog(catalogPath, phaseType);
const thinkSource = catalogEntries && catalogEntries.length > 0
  ? catalogEntries
  : STATIC_THINK;  // fall back to static entries if catalog absent
for (let i = 0; i < thinkSource.length; i++) {
  candidates.push(thinkSource[i]);
}
```

### Pattern 3: Hook Handler — Pass catalogPath

The hook handler currently calls `generateSuggestions({ cwd, event: lastMeaningful })`. Phase 72 adds the catalog path:

```javascript
// hooks/idle-suggestions.cjs — line 68 replacement:
const catalogPath = path.join(cwd, '.planning', 'idle-catalog.md');
const content = generateSuggestions({ cwd, event: lastMeaningful, catalogPath });
```

The engine's null-safe catalog read (`try { raw = fs.readFileSync(catalogPath...) } catch { return null; }`) means this is safe even if the catalog file is absent — the engine falls back to `STATIC_THINK`.

### Pattern 4: DESIGN-STATE.md Incomplete Choice Extraction (CONT-05)

The current code detects DESIGN-STATE.md incomplete stages but only produces one generic candidate. Phase 72 must extract the actual text of each incomplete item and generate per-item candidates.

```javascript
// Replacement for the design-state block in gatherCandidates:
function extractDesignStateIncompleteItems(cwd) {
  if (!cwd) return [];
  const designStatePath = path.join(cwd, '.planning', 'DESIGN-STATE.md');
  try {
    const content = fs.readFileSync(designStatePath, 'utf-8');
    const items = [];
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^[-*]\s+\[\s\]\s+(.+)/);
      if (m) {
        items.push(m[1].trim());
      }
    }
    return items;
  } catch {
    return [];
  }
}

// Inside gatherCandidates, replace the checkDesignState(cwd) block:
const incompleteDesignItems = cwd ? extractDesignStateIncompleteItems(cwd) : [];
if (incompleteDesignItems.length > 0) {
  for (let i = 0; i < incompleteDesignItems.length; i++) {
    candidates.push({
      category: 'think',
      text: 'decide: ' + incompleteDesignItems[i].toLowerCase(),
      minutes: 3,
      resumption: 'low',    // low — these are judgment calls, not deep work
      filePath: path.join(cwd, '.planning', 'DESIGN-STATE.md'),
      source: 'design-state',
    });
  }
} else if (checkDesignState(cwd)) {
  // DESIGN-STATE.md exists but items couldn't be extracted — generic fallback
  candidates.push({
    category: 'think',
    text: 'decide: review incomplete design choices in design-state',
    minutes: 5,
    resumption: 'med',
    filePath: path.join(cwd, '.planning', 'DESIGN-STATE.md'),
    source: 'design-state',
  });
}
```

**Note:** This changes `category` from `review` to `think` for DESIGN-STATE.md items. The original code placed these in `review` (priority 2); CONT-05 specifies "low-urgency decision prompt" which maps to `think` (priority 3). This is the correct category for human-judgment items.

### Pattern 5: Context-Notes Directory and README

The `.planning/context-notes/` directory is initialized by Phase 72. The README explains to the user what to put there and what effect it has:

```markdown
# Context Notes

Place markdown files here to inject domain knowledge into PDE's planning cycles.

## How it works

Any `.md` file in this directory will be read by `/pde:plan` and appear in the
planner's context under a **Context Notes** section. Use this to capture:

- Business rules PDE cannot infer from code
- Edge cases you've discovered that aren't in the codebase yet
- User stories and acceptance criteria drafts
- Domain constraints and regulatory requirements

## Naming convention

Files are sorted alphabetically and read in order. Use date-prefixed filenames
to control order:

  2026-03-21-payment-edge-cases.md
  2026-03-21-user-auth-constraints.md

## Format

Plain markdown. No special frontmatter required. Write naturally.
PDE reads the full file content and includes it verbatim in planning context.
```

### Pattern 6: Context-Notes Injection into plan-phase workflow

The `plan-phase.md` workflow constructs a planner prompt with a `<files_to_read>` block. Context-notes injection adds a probe step before spawning the planner, then appends the content to the prompt if files exist.

**Where to inject in `workflows/plan-phase.md`:** Between Step 7 (Use Context Paths from INIT) and Step 7.5 (Verify Nyquist Artifacts).

**New step (Step 7.2: Probe context-notes):**

```bash
# Probe .planning/context-notes/ for user-authored markdown files
CONTEXT_NOTES_DIR=".planning/context-notes"
CONTEXT_NOTES_CONTENT=""
if [ -d "$CONTEXT_NOTES_DIR" ]; then
  while IFS= read -r notes_file; do
    if [ -f "$notes_file" ]; then
      notes_content=$(cat "$notes_file")
      notes_basename=$(basename "$notes_file")
      CONTEXT_NOTES_CONTENT="${CONTEXT_NOTES_CONTENT}\n\n### ${notes_basename}\n${notes_content}"
    fi
  done < <(find "$CONTEXT_NOTES_DIR" -maxdepth 1 -name "*.md" ! -name "README.md" | sort)
fi
```

**In the planner prompt construction (Step 8):** Append a `<context_notes>` block when `CONTEXT_NOTES_CONTENT` is non-empty:

```markdown
{If CONTEXT_NOTES_CONTENT is non-empty:}
<context_notes>
## Context Notes

The user has authored the following domain knowledge notes. Honor these during planning —
they represent business rules, edge cases, and constraints PDE cannot infer from code.

{CONTEXT_NOTES_CONTENT}
</context_notes>
```

**Important constraint:** README.md is excluded from the probe (`! -name "README.md"`). Only `.md` files at depth 1 are read (no recursion). Empty directory = no injection, no error.

### Anti-Patterns to Avoid

- **Never put artifact-review (phase_complete) entries in the catalog** — these are dynamically generated from design-manifest.json with real file paths. Static catalog entries cannot contain dynamic paths.
- **Never make catalog read mandatory** — `catalogPath` is optional; the engine must work identically without it (static fallback). CONT-01 adds content; it does not change the engine's zero-fallback contract.
- **Never change the `review` category in `gatherCandidates` to use catalog entries** — the `review` category is reserved for dynamically generated artifact paths and phase-complete signals.
- **Never use async in the catalog parser** — the 2-second synchronous budget is an ENGN-02 invariant. All catalog reads must be `fs.readFileSync`.
- **Never read context-notes inside the engine** — context-notes are for planning agents, not for the idle suggestion engine. The engine's job is idle-time suggestions; planning is /pde:plan's job.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown catalog parsing | Full markdown parser or AST | Inline line-by-line scanner (~30 lines) | The catalog format is deliberately constrained; a full parser adds code for features the catalog never uses |
| Context-notes file discovery | Recursive tree walk | `find .planning/context-notes -maxdepth 1 -name "*.md"` | Depth 1 only; sort alphabetically; exclude README.md — shell one-liner is sufficient |
| DESIGN-STATE.md parsing | Custom state machine | `lines[i].match(/^[-*]\s+\[\s\]\s+(.+)/)` regex | The checkbox format is fixed; two-line regex covers all cases |
| Catalog format validation | JSON Schema / validator | None — malformed entries produce null `minutes` and fall back to defaults | Graceful degradation is better than validation errors in a suggestion engine |

**Key insight:** Phase 72 is content work + minimal parser wiring. The heavy lifting (ranking, formatting, filtering) is already done in Phase 71.

---

## Common Pitfalls

### Pitfall 1: catalogPath Passed But Never Read

**What goes wrong:** `catalogPath` is accepted by `generateSuggestions` and `gatherCandidates` but the current implementation does not read it — `STATIC_THINK` is always used instead. A plan that only adds the catalog file without also adding the parser will silently produce unchanged output.

**Why it happens:** Phase 71 intentionally deferred catalog reading to Phase 72. The interface was wired but the implementation stub was left.

**How to avoid:** Implementing the catalog parser is mandatory in Phase 72, not optional. The test must verify that when `catalogPath` points to a valid catalog file, the catalog entries appear in output instead of `STATIC_THINK` entries.

**Warning signs:** Tests pass but output still shows "capture: what decisions shaped this phase?" (the STATIC_THINK fallback text) after Phase 72 is complete.

### Pitfall 2: Hook Handler Not Updated to Pass catalogPath

**What goes wrong:** Even with the parser implemented in the engine, the hook handler calls `generateSuggestions({ cwd, event: lastMeaningful })` without `catalogPath`, so the engine never receives the path and falls back to static entries.

**Why it happens:** Phase 71 Plan 02 only wired the call without the catalog path (catalog didn't exist yet). Phase 72 must update the hook call.

**How to avoid:** The hook handler update (`pass catalogPath = path.join(cwd, '.planning', 'idle-catalog.md')`) is a required task in Phase 72, not just the catalog file creation.

### Pitfall 3: DESIGN-STATE.md `[ ]` Checkbox Regex Misses Nested Checkboxes

**What goes wrong:** DESIGN-STATE.md uses various checkbox formats: `- [ ] item`, `* [ ] item`, `  - [ ] nested`. A regex anchored to `^-` misses asterisk bullets and nested items.

**Why it happens:** The existing `checkDesignState` function uses `/\[\s\]/` (bare checkbox scan), which works for detection but not extraction. The extraction regex needs to handle both `-` and `*` bullets.

**How to avoid:** Use `/^[-*]\s+\[\s\]\s+(.+)/` for extraction — both bullet types, any leading whitespace stripped. The existing `checkDesignState` function does not need changing (it uses a broader pattern correctly).

**Warning signs:** CONT-05 test passes with items from `- [ ]` format but fails against DESIGN-STATE.md using `* [ ]` format.

### Pitfall 4: Context-Notes Probe Reads README.md as a Note

**What goes wrong:** The probe reads `README.md` and injects it into planning context, polluting the planner with the directory's own documentation rather than user-authored content.

**Why it happens:** A glob or `find` without excluding README.md includes it.

**How to avoid:** Add `! -name "README.md"` to the find command. The test must verify README.md is excluded.

### Pitfall 5: Missing Label Line Causes Parser to Skip Entries

**What goes wrong:** A catalog entry that has a text line but no label line (missing `Nmin // resumption:cost`) causes the parser to silently skip the entry or produce an invalid candidate with `undefined` values.

**Why it happens:** The parser uses lookahead for the label line — if it's absent, the entry falls through without being pushed to candidates.

**How to avoid:** Default to `minutes: 5, resumption: 'low'` when label line is absent. The parser must always push the entry; the label is optional metadata, not a required delimiter.

### Pitfall 6: DESIGN-STATE Incomplete Items Placed in `review` vs `think` Category

**What goes wrong:** The current code places design-state items in `review` (priority 2). CONT-05 specifies "low-urgency decision prompt" which must be `think` (priority 3). Placing them in `review` elevates their priority above knowledge-capture prompts and looks wrong.

**Why it happens:** The Phase 71 implementation put design-state detection in the `review` section for visual grouping. But the semantics are wrong — DESIGN-STATE items are judgment calls the user should make at leisure, not artifact reviews.

**How to avoid:** New `extractDesignStateIncompleteItems` function emits candidates with `category: 'think'`, `resumption: 'low'`. The planner should be aware of this category reassignment to write accurate tests.

---

## Code Examples

Verified patterns from existing codebase:

### Catalog Section Heading Detection

```javascript
// Pattern: headings in idle-catalog.md use ## phase-name format
const headingMatch = line.match(/^##\s+(\w+)/);
// headingMatch[1] → 'research', 'plan', 'execute', 'design', 'validation', 'review', 'default'
```

### Bullet Entry with Label Extraction

```javascript
// Source: derived from STATIC_THINK shape in idle-suggestions.cjs
const bulletMatch = line.match(/^-\s+(.+)/);
if (bulletMatch) {
  const text = bulletMatch[1].trim();
  const nextLine = (lines[i + 1] || '').trim();
  const labelMatch = nextLine.match(/^(\d+)min\s*\/\/\s*resumption:(\w+)/);
  // Always push regardless of label presence:
  candidates.push({
    category: 'think',
    text: text,
    minutes: labelMatch ? parseInt(labelMatch[1], 10) : 5,
    resumption: (labelMatch && labelMatch[2]) ? labelMatch[2] : 'low',
    filePath: null,
    source: 'catalog',
  });
  if (labelMatch) i++;
}
```

### Hook Handler Updated Call

```javascript
// hooks/idle-suggestions.cjs — replace line 68:
// BEFORE:
const content = generateSuggestions({ cwd, event: lastMeaningful });
// AFTER:
const catalogPath = path.join(cwd, '.planning', 'idle-catalog.md');
const content = generateSuggestions({ cwd, event: lastMeaningful, catalogPath });
```

### Context-Notes Probe in plan-phase workflow (Step 7.2)

```bash
# Probe context-notes directory for user-authored markdown
CONTEXT_NOTES_DIR=".planning/context-notes"
CONTEXT_NOTES_CONTENT=""
if [ -d "$CONTEXT_NOTES_DIR" ]; then
  while IFS= read -r -d '' notes_file; do
    notes_content=$(cat "$notes_file" 2>/dev/null)
    notes_basename=$(basename "$notes_file")
    if [ -n "$notes_content" ]; then
      CONTEXT_NOTES_CONTENT="${CONTEXT_NOTES_CONTENT}

### ${notes_basename}

${notes_content}"
    fi
  done < <(find "$CONTEXT_NOTES_DIR" -maxdepth 1 -name "*.md" ! -name "README.md" -print0 2>/dev/null | sort -z)
fi
```

### DESIGN-STATE.md Incomplete Item Extraction

```javascript
// Source: extends existing checkDesignState() pattern
function extractDesignStateIncompleteItems(cwd) {
  if (!cwd) return [];
  const designStatePath = path.join(cwd, '.planning', 'DESIGN-STATE.md');
  try {
    const content = fs.readFileSync(designStatePath, 'utf-8');
    const items = [];
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^[-*]\s+\[\s\]\s+(.+)/);
      if (m) { items.push(m[1].trim()); }
    }
    return items;
  } catch { return []; }
}
```

### Test Pattern for Catalog Integration (matching Phase 71 style)

```javascript
// hooks/tests/verify-phase-72.cjs — catalog integration test
test('CONT-01: catalog entries appear for matching phase type', () => {
  const catalogContent = [
    '## execute',
    '',
    '- capture: what edge cases did you discover?',
    '  5min // resumption:low',
    '',
    '## default',
    '',
    '- capture: what would you tell a new team member about this project?',
    '  5min // resumption:low',
  ].join('\n');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
  const planningDir = path.join(tmpDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  const catalogPath = path.join(planningDir, 'idle-catalog.md');
  fs.writeFileSync(catalogPath, catalogContent, 'utf-8');
  fs.writeFileSync(path.join(planningDir, 'STATE.md'), '---\nstatus: executing\n---\n\n# State\n\n### Blockers/Concerns\n\n(None)\n', 'utf-8');
  fs.writeFileSync(path.join(planningDir, 'ROADMAP.md'), '## v0.10\n\n- [ ] **Phase 73: dashboard** — pane 7\n', 'utf-8');

  const output = generateSuggestions({ cwd: tmpDir, event: { event_type: 'phase_started' }, catalogPath });
  fs.rmSync(tmpDir, { recursive: true, force: true });
  assert.ok(output.includes('edge cases'), 'catalog execute entry not found in output: ' + output);
});
```

---

## State of the Art

| Old Approach | Current Approach (Post Phase 72) | Notes |
|---|---|---|
| `STATIC_THINK` hardcoded in engine | `parseCatalog(catalogPath, phaseType)` reads `.planning/idle-catalog.md` | Static fallback preserved when catalog absent |
| Generic "review: incomplete design stages" entry | Per-item `think` entries with actual DESIGN-STATE.md text | CONT-05 required per-item granularity |
| No context-notes directory | `.planning/context-notes/` created with README.md | User-authored; never auto-generated |
| plan-phase planner prompt has no user-context slot | `<context_notes>` block injected when `.planning/context-notes/*.md` files exist | Soft — empty directory produces no change |
| `catalogPath` accepted but ignored in `gatherCandidates` | `catalogPath` triggers catalog file read and parse | Phase 71 stub now implemented |

**Deprecated/outdated after Phase 72:**
- The `STATIC_THINK` constant in `idle-suggestions.cjs` becomes the fallback only, not the primary think-category source

---

## Open Questions

1. **Should the catalog's `review` section add to the `review` category or `think` category?**
   - What we know: The catalog format doc says all catalog entries go to `think` category. The `review` category is for dynamically-generated artifact paths only.
   - What's unclear: A catalog `## review` section containing "review: a completed artifact" might mislead users writing catalog entries.
   - Recommendation: Include a `## review` section in the catalog for completeness (it is one of the 6 phase types), but have it emit `think` candidates (not `review`). Add a comment in the catalog file explaining this.

2. **Does /pde:brief need context-notes injection too (CONT-04 says "/pde:plan and /pde:brief")?**
   - What we know: CONT-04 explicitly requires both. The brief workflow (`workflows/brief.md`) has a "Sub-step 2c: Upstream context injection" section that probes for IDT, CMP, OPP, ANL artifacts using the same soft-probe pattern.
   - Recommendation: Add context-notes as a parallel probe in Sub-step 2c of `workflows/brief.md`, following the same pattern as the other upstream context probes.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:assert` + manual test runner (matching Phase 70/71 style) |
| Config file | none |
| Quick run command | `node hooks/tests/verify-phase-72.cjs` |
| Full suite command | `node hooks/tests/verify-phase-70.cjs && node hooks/tests/verify-phase-71.cjs && node hooks/tests/verify-phase-72.cjs` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONT-01 | idle-catalog.md contains 6 phase sections with 3-5 entries and time/resumption labels | integration | `node hooks/tests/verify-phase-72.cjs` | Wave 0 |
| CONT-02 | phase_complete event triggers output with specific artifact file path from design-manifest.json | integration | `node hooks/tests/verify-phase-72.cjs` | Wave 0 |
| CONT-03 | Each phase section has at least one question-phrased entry (ending in `?`) | integration | `node hooks/tests/verify-phase-72.cjs` | Wave 0 |
| CONT-04 | Placing .md in .planning/context-notes/ and calling generateSuggestions does NOT inject — but planner prompt includes the notes content | workflow-test (file content check) | `node hooks/tests/verify-phase-72.cjs` | Wave 0 |
| CONT-05 | DESIGN-STATE.md with `[ ]` items produces per-item `think` candidates with actual item text | unit | `node hooks/tests/verify-phase-72.cjs` | Wave 0 |
| CONT-06 | All catalog entries in output have `Nmin // resumption:cost` label format | integration | `node hooks/tests/verify-phase-72.cjs` | Wave 0 |

**Note on CONT-04:** The context-notes injection is in the `plan-phase.md` workflow (a markdown file, not code), so automated testing is limited to: (a) checking the workflow markdown contains the probe logic, and (b) checking the context-notes directory and README exist. Full end-to-end behavioral verification (planner receiving notes content) is covered by the Phase 72 success criterion manual check.

### Sampling Rate

- **Per task commit:** `node hooks/tests/verify-phase-72.cjs`
- **Per wave merge:** `node hooks/tests/verify-phase-70.cjs && node hooks/tests/verify-phase-71.cjs && node hooks/tests/verify-phase-72.cjs`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `hooks/tests/verify-phase-72.cjs` — covers CONT-01 through CONT-06; does not exist; must be created as first task of Wave 1

*(No other gaps — test infrastructure fully established by Phases 70-71)*

---

## Sources

### Primary (HIGH confidence)

- `bin/lib/idle-suggestions.cjs` — direct source read; confirmed `catalogPath` accepted but not used; `STATIC_THINK` fallback; `gatherCandidates` structure
- `hooks/idle-suggestions.cjs` — direct source read; confirmed `generateSuggestions` call without `catalogPath`
- `.planning/phases/71-suggestion-engine/71-RESEARCH.md` — catalog integration contract; confirmed `catalogPath` is the Phase 72 seam
- `.planning/phases/71-suggestion-engine/71-01-PLAN.md` — engine architecture; 3-file budget; `STATIC_THINK` as Phase 72 placeholder
- `hooks/tests/verify-phase-71.cjs` — test pattern; fixture structure; assert style
- `workflows/plan-phase.md` — Step 7 context paths; Step 8 planner prompt construction; where context-notes injection goes
- `workflows/brief.md` — Sub-step 2c upstream context probe pattern; how /pde:brief reads upstream artifacts
- `bin/lib/init.cjs` — `cmdInitPlanPhase` — confirmed `context_path` is the only user-decision file path passed; no existing context-notes slot
- `.planning/REQUIREMENTS.md` — CONT-01 through CONT-06 requirements text

### Secondary (MEDIUM confidence)

- `.planning/research/FEATURES.md` — context-notes directory design; domain knowledge externalization intent; confirmed `auto-generated context notes` is explicitly out of scope
- `.planning/research/SUMMARY.md` — catalog format intent; `.planning/idle-catalog.md` as plain markdown, no parser needed claim (superseded by Phase 71 architecture which deferred parsing to Phase 72)

### Tertiary (LOW confidence)

None — all findings are from direct codebase reads.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all modules are built-in Node.js or project-internal; Phase 71 source confirmed
- Architecture: HIGH — `catalogPath` stub location confirmed by direct source read; context-notes injection pattern confirmed from plan-phase.md workflow
- Pitfalls: HIGH — all pitfalls identified from direct source reading of the Phase 71 implementation

**Research date:** 2026-03-21
**Valid until:** Stable — valid until next refactor of `bin/lib/idle-suggestions.cjs` module boundaries
