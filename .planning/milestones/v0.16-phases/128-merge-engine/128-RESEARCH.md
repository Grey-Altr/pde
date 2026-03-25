# Phase 128: Merge Engine and Conflict Resolution — Research

**Researched:** 2026-03-24
**Domain:** 3-way merge algorithm, conflict detection, NDJSON logging, per-field policy dispatch — all within Node.js CommonJS, zero npm dependencies
**Confidence:** HIGH

---

## Summary

Phase 128 implements a field-level 3-way merge engine inside `bin/lib/context-sync.cjs`. The algorithm compares three snapshots — base (lastIR from Phase 126 state file), editor-parsed partial (from Phase 127 reverse parsers), and current .planning/ IR (from buildContextIR()) — to produce a merged result with conflict entries. This is not a text-diff merge; it is a value-equality merge at the field level over four writable string fields.

Both plans are architecturally sound and correctly designed. The primary research value is confirming that the algorithm sketched in the plans is standard practice for this problem class, identifying the one genuine edge case (the `designTokens` format mismatch between parser output and lastIR storage), and documenting the exact integration points from Phase 126 and 127 that the implementation must wire to.

The codebase has zero npm dependencies by design. All merge logic is pure JavaScript — no merge library is appropriate or needed. The only non-trivial sub-problem is `designTokens` format reconciliation, where `parseDesignMd()` returns a `color-list` string while `lastIR.designTokens` stores a different format. Plan 02 addresses this with `normalizeDesignTokensForComparison()`.

**Primary recommendation:** Implement exactly as specified in the two existing plans. The algorithm is correct, the interfaces from Phases 126 and 127 are verified as present and exported, and the 40 baseline tests (15 + 25) are green. No pre-implementation changes are needed.

---

## Project Constraints (from CLAUDE.md)

CLAUDE.md does not exist in this project. Constraints are drawn from accumulated decisions in STATE.md and prior phase summaries.

| Constraint | Source | Applies To |
|-----------|--------|------------|
| Zero npm dependencies | Project invariant | All new code in context-sync.cjs |
| CommonJS only (`'use strict'`, `require()`) | Existing module format | No ESM import syntax |
| Non-fatal pattern: catch all, stderr only, never throw | Phase 126 readStateFile, parsers | appendConflictLog, readFieldPolicy |
| .planning/ is always canonical | Core architecture decision | planning-wins is the correct default |
| Loop-break gate must be active before watcher — Phase 126 delivers this | STATE.md decision | Not Phase 128 scope |
| WRITABLE_FIELDS = `['techStack', 'constraints', 'componentCatalog', 'designTokens']` | Phase 126 lastIR schema | mergePartialIR must iterate exactly these four |

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CUR-04 | 3-way merge for .mdc partial IR — when only editor changed, editor wins; when only PDE changed, PDE wins; when both changed to different values, conflict logged to .sync-conflicts.log as NDJSON | Algorithm is field-level equality comparison; all three value sources (base, editor, current) are available from Phase 126 state file and Phase 127 parsers |
| CUR-05 | Per-field conflict resolution policy — planning-wins (default), editor-wins, prompt — configurable in config.json contextSync.fieldPolicies; read at ingest start, not cached | Policy dispatch is a simple switch on a validated string; config.json already exists at `.planning/config.json`; schema addition is additive |
| AGR-04 | design-manifest.json established as canonical token source — no code path writes manifest without passing through merge engine; DESIGN.md gets SOURCE comment | emitDesignMd() in lines 733-832 is the only writer; adding a SOURCE comment after makeHeader() is a one-line insertion; no code path bypass detected |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:test` | Built-in (Node 18+) | Test runner | Established in Phase 126; zero deps; matches existing test files |
| `node:assert/strict` | Built-in | Assertions | Matches existing test files |
| `node:fs` | Built-in | appendFileSync for conflict log | Already used throughout context-sync.cjs |
| `node:path` | Built-in | Path construction for conflict log | Already used throughout context-sync.cjs |
| `node:os` | Built-in | `os.tmpdir()` in test helpers | Matches Phase 126 and 127 test patterns |

### Supporting

None required — this phase is entirely built-in.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled 5-case equality merge | `diff` library (jsdiff, etc.) | Text diff is wrong tool for field-level value equality; adds npm dep; overkill |
| Hand-rolled field policy dispatch | `json-logic` or rule engine | Policy set is 3 named strings; a switch statement is the right tool |
| `fs.appendFileSync` for conflict log | `winston`, `pino`, structured logger | Adds npm dep; NDJSON manual serialization is 2 lines of code |

**Installation:** None required — all built-ins.

---

## Architecture Patterns

### Recommended Code Placement

No new directories or files are created at module level. All new functions are added to `bin/lib/context-sync.cjs` in logical order:

```
bin/lib/context-sync.cjs
  [constants]     WRITABLE_FIELDS, VALID_POLICIES  (near top, after SOURCE_FILES)
  [functions]     mergePartialIR()                 (after readStateFile, ~line 888)
  [functions]     appendConflictLog()              (immediately after mergePartialIR)
  [functions]     readFieldPolicy()                (after appendConflictLog)
  [functions]     normalizeDesignTokensForComparison()  (after readFieldPolicy)
  [modified]      emitDesignMd()  → SOURCE comment after header in both content paths
  [modified]      parseMdcContent()  → Architecture Conventions added to pde-architecture.mdc branch
  [exports]       add new exports

tests/phase-128/
  test-merge-engine.cjs   (new file — 19 tests)
```

### Pattern 1: Field-Level 3-Way Equality Merge

**What:** Compare base, editor, and current values per field using equality. Five mutually exclusive cases based on which sides changed.

**When to use:** Whenever structured data fields (not free-text blobs) need bidirectional sync. Equality merge is appropriate when fields are atomic string values, not line-addressable text.

**The five cases:**
```javascript
// Source: Plan 128-01 spec, verified correct
for (const field of WRITABLE_FIELDS) {
  const editorVal  = editorPartial[field];
  const baseVal    = base ? (base[field] || '') : null;
  const currentVal = currentIR[field] || '';

  if (editorVal === undefined) { merged[field] = currentVal; continue; }  // editor silent
  if (baseVal === null)        { merged[field] = editorVal;  continue; }  // no base, editor wins

  const editorChanged = editorVal !== baseVal;
  const pdeChanged    = currentVal !== baseVal;

  if (!editorChanged)                merged[field] = currentVal;  // PDE changed or neither
  else if (!pdeChanged)              merged[field] = editorVal;   // only editor changed
  else if (editorVal === currentVal) merged[field] = currentVal;  // both changed, same value
  else { /* true conflict */ }
}
```

**Key insight:** `!editorChanged` captures both "PDE changed" and "neither changed" — in both sub-cases the correct answer is the current PDE value. No need to distinguish them separately.

### Pattern 2: NDJSON Append Log

**What:** One JSON object per line, appended to `.planning/.sync-conflicts.log`. Non-fatal writes.

**When to use:** Any structured event log that must be human-readable, git-diff-able, and processable by tools without a full parse.

```javascript
// Source: Plan 128-01 spec
function appendConflictLog(planningDir, entry) {
  try {
    const logPath = path.join(planningDir, '.sync-conflicts.log');
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf-8');
  } catch (err) {
    process.stderr.write('[context-sync] conflict log write error: ' + err.message + '\n');
  }
}
```

### Pattern 3: Per-Field Policy Dispatch

**What:** Read policy string from config.json per field, apply one of three behaviors.

**When to use:** When different fields need different conflict resolution behavior without code changes.

```javascript
// Source: Plan 128-02 spec
const VALID_POLICIES = ['planning-wins', 'editor-wins', 'prompt'];

function readFieldPolicy(planningDir, field, overrides) {
  if (overrides && overrides[field] && VALID_POLICIES.includes(overrides[field])) {
    return overrides[field];
  }
  try {
    const config = JSON.parse(fs.readFileSync(path.join(planningDir, 'config.json'), 'utf-8'));
    const policy = config && config.contextSync && config.contextSync.fieldPolicies
      && config.contextSync.fieldPolicies[field];
    return VALID_POLICIES.includes(policy) ? policy : 'planning-wins';
  } catch {
    return 'planning-wins';
  }
}
```

**Policy dispatch in merge conflict branch:**
```javascript
const policy = readFieldPolicy(opts.planningDir, field, opts.fieldPolicies);
let resolvedValue;
if (policy === 'editor-wins')   resolvedValue = editorVal;
else if (policy === 'prompt')   { resolvedValue = currentVal; entry.pendingResolution = true; }
else                             resolvedValue = currentVal;  // planning-wins default
merged[field] = resolvedValue;
```

### Pattern 4: Format Normalization Before Comparison

**What:** Extract semantic content (sorted color set) from both source and target before equality comparison. Fall back to raw string if extraction fails.

**When to use:** When the same semantic data appears in two different string serializations. Required only for the `designTokens` field.

```javascript
// Source: Plan 128-02 spec
function normalizeDesignTokensForComparison(value) {
  if (!value) return '';
  var colors = [];
  var re = /\*\*([^*]+)\*\*\s+\(#([a-fA-F0-9]{3,6})\)/g;
  var m;
  while ((m = re.exec(value)) !== null) {
    colors.push(m[1].trim().toLowerCase() + ':#' + m[2].toLowerCase());
  }
  if (colors.length === 0) return value.trim();
  return colors.sort().join('|');
}
```

Apply this normalization to `editorVal` and `baseVal` only when `field === 'designTokens'`. The other three fields (techStack, constraints, componentCatalog) are plain text with no format mismatch.

### Anti-Patterns to Avoid

- **Text-diff merge:** Using line-diff on these string fields would produce spurious conflicts and miss real ones. Field-level equality is correct.
- **Caching fieldPolicies at module load:** Policy must be read at merge call time per CUR-05 requirement. Caching breaks tests that write a config.json mid-test.
- **Throwing on appendConflictLog failure:** The non-fatal pattern is project-wide. Conflicts that cannot be logged must not block the merge.
- **null vs undefined confusion in editorPartial:** Check `editorVal === undefined` for "not present", not `!editorVal` (which would wrongly treat empty string as absent).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| NDJSON serialization | Custom encoder | `JSON.stringify(entry) + '\n'` | One line; handles all escaping |
| Config file reading | Caching layer or singleton | Read-on-call via `fs.readFileSync` | CUR-05 requires read at ingest start, not cached |
| Merge algorithm | External `diff3` or `git merge-file` subprocess | Field-level equality in JavaScript | Subprocess adds latency, OS dependency; field equality is 10 lines |
| Log rotation | Rolling appender | None in Phase 128 | Phase 132 adds INF-06; do not conflate |

**Key insight:** This problem domain (structured data with known field set, no concurrent writers during merge) does not benefit from text-diff tooling. The complexity budget is in correctness of the 5 cases and the format normalization, not in the algorithm itself.

---

## Common Pitfalls

### Pitfall 1: designTokens Format Mismatch Causes Constant False Conflicts

**What goes wrong:** `parseDesignMd()` returns `designTokens` as a color-list string (`- **Primary** (#3b82f6) -- primary color role`). `lastIR.designTokens` stores a token-summary string. Raw string comparison always sees "both sides changed" even when the color data is identical.

**Why it happens:** The emitter writes a formatted DESIGN.md with color-list format. `ir.designTokens` stored in `lastIR` comes from `buildContextIR()` in a different format. Same semantic content, two serializations.

**How to avoid:** Apply `normalizeDesignTokensForComparison()` to both values before comparison in the `designTokens` branch. Addressed in Plan 02, Tests 18-19.

**Warning signs:** Every `parseDesignMd` round-trip produces a conflict even when no user edits occurred.

### Pitfall 2: editorPartial Absent Field vs Undefined

**What goes wrong:** Treating `editorPartial.techStack === undefined` as "editor explicitly cleared the field" rather than "editor didn't touch this field."

**Why it happens:** Reverse parsers return partial objects with only extracted fields. An absent key and explicit `undefined` are operationally equivalent here.

**How to avoid:** Check `editorVal === undefined` to detect "not present" and skip to `merged[field] = currentVal`. The plan implementation is correct as written.

**Warning signs:** Test 6 (partial editor input) fails unexpectedly.

### Pitfall 3: null base (First Run) Must Let Editor Win

**What goes wrong:** On first run, `readStateFile()` returns null (no state file exists yet). Without handling this, the algorithm would compare null values and incorrectly produce no-change results or throw.

**Why it happens:** State file is written on first `emitAll()` call. On first use of the merge engine, no baseline exists.

**How to avoid:** When `baseVal === null`, unconditionally use `editorVal` for provided fields. Confirmed in Plan 01, Test 7.

**Warning signs:** `TypeError` or all fields showing no change on first run.

### Pitfall 4: emitDesignMd Has Two Content Paths — SOURCE Comment Needed in Both

**What goes wrong:** `emitDesignMd` has two distinct content array constructions: one for placeholder DESIGN.md (lines 739-765) and one for full content (lines 803-828). Plan 01 Step 5 says to add the SOURCE comment "after makeHeader() and before the heading" but does not explicitly call out both paths.

**Why it happens:** Plan was written with the full content path in mind. Placeholder path is a short-circuit return.

**How to avoid:** Add `<!-- SOURCE: design-manifest.json | DERIVE-ONLY -->` to both content arrays. Position: after `header` (index 0), before the `# Design System:` heading. Verify the placeholder path in a second test assertion or dedicated test.

**Warning signs:** Test 11 passes but placeholder DESIGN.md lacks the SOURCE comment.

### Pitfall 5: parseMdcContent Architecture Conventions Not Mapped (Finding 1)

**What goes wrong:** Current `pde-architecture.mdc` branch (line 1027-1028) only extracts `techStack` from "Tech Stack" section. "Architecture Conventions" section — which maps to `constraints` — is silently dropped.

**Why it happens:** Initial implementation assumed one field per file. `pde-architecture.mdc` is the only file that contributes to two IR fields.

**How to avoid:** In the `pde-architecture.mdc` branch, add `extractSection(pdeOwned, 'Architecture Conventions')` and assign to `partial.constraints`. Confirmed in Plan 01, Test 12.

**Warning signs:** Constraints defined in pde-architecture.mdc never appear in merged IR.

---

## Code Examples

### Verified Interface Contracts from Phase 126

State file schema (readStateFile return, lines 878-888):
```javascript
{
  schemaVersion: '1.0',
  lastEmittedAt: 'ISO 8601',
  lastSourceHash: '64-char hex',
  lastIR: {
    techStack: string,
    constraints: string,
    componentCatalog: string,
    designTokens: string,
  },
  pendingIngest: [],
}
// Returns null if missing, corrupt, or schemaVersion !== '1.0'
```

### Verified Interface Contracts from Phase 127

```javascript
// parseMdcContent(content, filename) returns partial IR | null
// pde-project.mdc       -> { constraints? }
// pde-architecture.mdc  -> { techStack? }  (+ constraints? after Finding 1 fix)
// pde-design-tokens.mdc -> { designTokens? }
// pde-components.mdc    -> { componentCatalog? }

// parseSkillMd(content) returns partial IR | null
// { designTokens?, componentCatalog?, constraints?, agentAdditions? }

// parseDesignMd(content) returns partial IR | {} | null
// { designTokens? }  — color-list string, NOT DTCG token summary
// {} = valid empty (placeholder DESIGN.md with no colors)
// null = parse failure or missing PDE-GENERATED marker
```

### Config.json Addition Required (Plan 02)

```json
"contextSync": {
  "fieldPolicies": {}
}
```

Add as a new top-level key in `.planning/config.json`. The `fieldPolicies` object starts empty; users populate it to override default planning-wins per field.

### emitDesignMd SOURCE Comment — Correct Insertion Point

Current content array (full path, around line 803):
```javascript
const content = [
  header,                                    // index 0
  `# Design System: ${ir.projectName}`,      // index 1
  ...
```

After fix (both placeholder and full content paths):
```javascript
const sourceComment = '<!-- SOURCE: design-manifest.json | DERIVE-ONLY -->';
const content = [
  header,                                    // index 0
  sourceComment,                             // index 1 — NEW
  `# Design System: ${ir.projectName}`,      // index 2
  ...
```

---

## Plan Soundness Assessment

Both existing plans are sound. Specific findings that affect implementation:

| Finding | Location | Status | Required Action |
|---------|----------|--------|----------------|
| F1: Architecture Conventions missing from parseMdcContent | Plan 01, Task 2 Step 4 | Documented in plan | Implement as specified |
| F2: designTokens format mismatch | Plan 02, Task 2 Step 2 | Documented in plan | normalizeDesignTokensForComparison as specified |
| F3: SOURCE comment needed in BOTH emitDesignMd paths | Code audit | NOT explicitly in plan | Add comment to placeholder path (lines 739-765) as well as full path |
| F4: Test 11 should verify full content path; add assertion for placeholder path | Code audit | Gap in test spec | Add second assertion or test for placeholder path SOURCE comment |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` (Node.js built-in) |
| Config file | None — run directly with `node --test` |
| Quick run command | `node --test tests/phase-128/test-merge-engine.cjs` |
| Full suite command | `node --test tests/phase-126/test-sync-foundation.cjs && node --test tests/phase-127/test-reverse-parsers.cjs && node --test tests/phase-128/test-merge-engine.cjs` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CUR-04 | 5-case merge (editor-only, pde-only, both-same, both-different, neither) | unit | `node --test tests/phase-128/test-merge-engine.cjs` | no — Wave 0 |
| CUR-04 | appendConflictLog writes NDJSON, appends | unit | same | no — Wave 0 |
| CUR-04 | null base (first run) — editor wins | unit | same | no — Wave 0 |
| CUR-05 | planning-wins default policy | unit | same | no — Wave 0 |
| CUR-05 | editor-wins policy | unit | same | no — Wave 0 |
| CUR-05 | prompt policy with pendingResolution flag | unit | same | no — Wave 0 |
| CUR-05 | missing/invalid policy defaults to planning-wins | unit | same | no — Wave 0 |
| AGR-04 | DESIGN.md SOURCE comment present in output | unit | same | no — Wave 0 |
| Finding 1 | parseMdcContent pde-architecture.mdc extracts both techStack and constraints | unit | same | no — Wave 0 |
| Finding 2 | designTokens normalization prevents false conflict | unit | same | no — Wave 0 |

### Sampling Rate

- **Per task commit (RED):** `node --test tests/phase-128/test-merge-engine.cjs 2>&1 | tail -5` — confirm new tests fail
- **Per task commit (GREEN):** `node --test tests/phase-128/test-merge-engine.cjs` — all tests pass
- **Per wave merge:** Full 3-suite regression run
- **Phase gate:** All 3 suites green before verification

### Wave 0 Gaps

- [ ] `tests/phase-128/` directory — must be created (does not exist)
- [ ] `tests/phase-128/test-merge-engine.cjs` — covers CUR-04, CUR-05, AGR-04, Finding 1, Finding 2 (19 tests per plans)

---

## Environment Availability

Step 2.6: SKIPPED — pure JavaScript functions added to an existing CommonJS module; no external dependencies.

---

## Runtime State Inventory

Step 2.5: SKIPPED — not a rename/refactor/migration phase; new functions added only.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Last-write-wins (no merge) | 3-way field merge | Phase 128 | Editor changes no longer silently overwritten |
| No conflict log | NDJSON .sync-conflicts.log | Phase 128 | Conflict history visible and git-diffable |
| Hardcoded planning-wins | Per-field configurable policy | Phase 128 Plan 02 | Teams can assign field ownership via config |

**Deprecated/outdated:**

None. Phase 128 adds new functions and makes additive modifications to two existing functions. No existing behavior is removed.

---

## Open Questions

1. **SOURCE comment in placeholder emitDesignMd path**
   - What we know: Plan 01 Step 5 says to add the comment; emitDesignMd has two content array construction paths (placeholder at lines 739-765 and full content at lines 803-828)
   - What's unclear: Whether the plan intends both paths or only the full path
   - Recommendation: Add to both paths; this is always the correct behavior since DESIGN.md is always canonical

2. **designTokens normalization — token-summary format content**
   - What we know: `parseDesignMd` returns color-list format; normalizer extracts `**Name** (#hex)` pattern
   - What's unclear: Whether `lastIR.designTokens` (from `buildContextIR()`) actually contains `**Name** (#hex)` strings or a wholly different format
   - Recommendation: Before writing Test 18, read what `buildContextIR()` stores in `ir.designTokens` to verify the normalizer will extract colors from both sides

3. **pendingIngest field interaction**
   - What we know: State file has `pendingIngest: []` field; Phase 129 populates it
   - What's unclear: No concern — Phase 128 does not read or write pendingIngest. Confirmed by plan contents.
   - Recommendation: No action

---

## Sources

### Primary (HIGH confidence)

- `bin/lib/context-sync.cjs` lines 844-888 — writeStateFile/readStateFile contracts verified directly
- `bin/lib/context-sync.cjs` lines 1023-1034 — parseMdcContent filename mapping verified directly
- `bin/lib/context-sync.cjs` lines 733-832 — emitDesignMd content array structure verified directly; two content paths confirmed
- `bin/lib/context-sync.cjs` lines 1052-1136 — parseSkillMd and parseDesignMd return contracts verified
- `.planning/phases/126-sync-foundation/126-01-SUMMARY.md` — state file schema and atomic write pattern
- `.planning/phases/127-reverse-parsers/127-02-SUMMARY.md` — parser return types and designTokens format note
- `.planning/phases/128-merge-engine/128-01-PLAN.md` — merge algorithm and test specifications
- `.planning/phases/128-merge-engine/128-02-PLAN.md` — policy dispatch and normalization specifications
- Live test run: `tests/phase-126/test-sync-foundation.cjs` — 15/15 green (baseline confirmed)
- Live test run: `tests/phase-127/test-reverse-parsers.cjs` — 25/25 green (baseline confirmed)

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` — project decisions and accumulated constraints
- `.planning/REQUIREMENTS.md` — requirement text for CUR-04, CUR-05, AGR-04

### Tertiary (LOW confidence)

None — all claims verified directly against source files or live test runs.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — built-ins only; no library selection needed; matches established project patterns
- Architecture: HIGH — all interfaces verified against live code; algorithm is textbook field-level 3-way merge with well-defined cases
- Pitfalls: HIGH — F1 and F2 documented in existing plans; F3/F4 discovered by direct code audit of both emitDesignMd content paths; all others derived from code inspection

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable codebase; no external dependency risk)
