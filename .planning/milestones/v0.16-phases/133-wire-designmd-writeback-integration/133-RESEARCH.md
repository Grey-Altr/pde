# Phase 133: Wire DESIGN.md Write-Back Integration - Research

**Researched:** 2026-03-24
**Domain:** Node.js/CJS ingest pipeline wiring — integration of existing functions within context-sync.cjs
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AGR-03 | DESIGN.md write-back — value-only DTCG update in design-manifest.json; update only $value field of color tokens; preserve $type, $description, $extensions, group hierarchy; hex-to-OKLCH reverse conversion with 4-decimal precision; log precision warnings >0.001 delta; recompute hash and emitAll() after write | writeBackDesignTokens() exists and is tested; integration gap is fieldMap routing + format adapter |

</phase_requirements>

---

## Summary

Phase 133 is a pure integration phase. All three functional building blocks exist and are independently tested: parseDesignMd() (Phase 127), reconcileOnStart()/ingestAll() (Phase 129), and writeBackDesignTokens() (Phase 130). The audit identified a single broken connection: the fieldMap objects in both reconcileOnStart and ingestAll only route techStack and constraints to replaceSectionInFile() — there is no designTokens branch, and writeBackDesignTokens() is never called from the live ingest flow.

The second obstacle is a format mismatch. parseDesignMd() returns { designTokens: "- **Name** (#hex) -- role\n..." } — a newline-separated color-list string. writeBackDesignTokens() expects Array<{name: string, hex: string, role: string}>. A format adapter function must parse the color-list string into that array before writeBackDesignTokens() can be called.

The third concern is loop prevention. writeBackDesignTokens() already calls emitAll() internally when opts.cwd is provided. The ingest flow (reconcileOnStart, ingestAll) also calls emitAll() at the end. This means if writeBackDesignTokens() is called mid-flow with opts.cwd, a double emitAll() fires. The correct pattern is to call writeBackDesignTokens() without opts.cwd (no internal emitAll), then let the outer flow's single emitAll() normalize everything.

**Primary recommendation:** Add a designTokens branch after the existing fieldMap loop in both reconcileOnStart and ingestAll. Parse the color-list string into Array<{name, hex, role}> via an inline or extracted adapter, then call writeBackDesignTokens(planningDir, colors, {}) — no cwd argument. Let the outer emitAll(cwd) call (already present at the end of both functions) re-normalize DESIGN.md after the manifest write.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-in node:fs | v20.20.0 | Atomic write-rename, readFile, writeFile | Already used throughout context-sync.cjs |
| Node.js built-in node:path | v20.20.0 | Path construction | Already used throughout |
| Node.js built-in node:test | v20.20.0 | Test framework | All phase tests use this (no external test runner) |
| Node.js built-in node:assert/strict | v20.20.0 | Assertions | All phase tests use assert/strict |

No new dependencies are required. This is a zero-npm-dependency integration phase.

### Supporting

None — all utilities (hexToOklch, writeBackDesignTokens, parseDesignMd, reconcileOnStart, ingestAll) already exist in bin/lib/context-sync.cjs.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline format adapter in fieldMap branch | Extracted colorListToArray() helper function | Extracted function is more testable; inline is acceptable if simple (single regex loop) |
| Call writeBackDesignTokens with opts.cwd | Call without opts.cwd | Calling with cwd triggers a second emitAll mid-flow — avoid this; let the outer emitAll handle re-normalization |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure

No new files required beyond:

```
bin/lib/
    context-sync.cjs   # All changes go here — single-module architecture
tests/
    phase-133/
        test-design-writeback-integration.cjs
```

### Pattern 1: fieldMap Extension with designTokens Branch

**What:** After the existing fieldMap loop in both reconcileOnStart and ingestAll, add a conditional block that handles the designTokens field separately — it requires a different write target (design-manifest.json via writeBackDesignTokens) rather than a section in PROJECT.md via replaceSectionInFile.

**When to use:** Whenever merged designTokens differs from currentIR designTokens and the merge engine has selected editor value (editor changed, PDE did not).

**Example (for ingestAll processEntry function, after the fieldMap loop):**

```javascript
// Source: context-sync.cjs lines 1450-1455 (existing fieldMap pattern) + new designTokens branch
var fieldMap = { techStack: 'Tech Stack', constraints: 'Constraints' };
for (var field in fieldMap) {
  if (mergeResult.merged[field] && mergeResult.merged[field] !== currentIR[field]) {
    replaceSectionInFile(projectMd, fieldMap[field], mergeResult.merged[field]);
  }
}

// NEW: designTokens branch — write-back to design-manifest.json
var mergedDesignTokens = mergeResult.merged.designTokens;
var currentDesignTokens = currentIR.designTokens;
if (mergedDesignTokens && normalizeDesignTokensForComparison(mergedDesignTokens) !== normalizeDesignTokensForComparison(currentDesignTokens)) {
  var colors = colorListToArray(mergedDesignTokens);
  if (colors.length > 0) {
    try {
      writeBackDesignTokens(planningDir, colors, {}); // no cwd — outer emitAll handles re-normalization
    } catch (err) {
      process.stderr.write('[context-sync] designTokens write-back failed: ' + err.message + '\n');
    }
  }
}
```

Apply identical pattern in reconcileOnStart at lines 1351-1356 (same structure, same fix).

### Pattern 2: Format Adapter — colorListToArray

**What:** Parse parseDesignMd() output string ("- **Name** (#hex) -- role\n...") into Array<{name, hex, role}>.

**When to use:** Before every call to writeBackDesignTokens() from the ingest flow.

**Example:**

```javascript
// Source: derived from parseDesignMd() pattern at context-sync.cjs line 1719
function colorListToArray(designTokensStr) {
  if (!designTokensStr) return [];
  var re = /^-\s+\*\*([^*]+)\*\*\s+\(#([a-fA-F0-9]{3,6})\)\s+--\s+(.+)$/gm;
  var colors = [];
  var m;
  while ((m = re.exec(designTokensStr)) !== null) {
    colors.push({ name: m[1].trim(), hex: '#' + m[2], role: m[3].trim() });
  }
  return colors;
}
```

The regex is identical to the one already used in parseDesignMd() at line 1719. No new pattern needs to be invented.

### Pattern 3: Loop Prevention for Double emitAll

**What:** writeBackDesignTokens already calls emitAll(opts.cwd) when opts.cwd is provided. reconcileOnStart and ingestAll each call emitAll(cwd) at their end. Calling writeBackDesignTokens with opts.cwd would trigger two emitAll calls.

**Correct approach:** Call writeBackDesignTokens(planningDir, colors, {}) — passing {} (not { cwd }) so writeBackDesignTokens skips its internal emitAll. The outer emitAll(cwd) at the end of both functions handles re-normalization.

```javascript
// CORRECT: no cwd — outer emitAll handles re-normalization
writeBackDesignTokens(planningDir, colors, {});

// WRONG: would trigger double emitAll — avoid
// writeBackDesignTokens(planningDir, colors, { cwd: cwd });
```

### Pattern 4: Error Isolation (non-fatal write-back)

**What:** writeBackDesignTokens throws on fs.readFileSync failure if design-manifest.json does not exist. The ingest flow must wrap the call in try/catch to remain non-fatal.

```javascript
try {
  writeBackDesignTokens(planningDir, colors, {});
} catch (err) {
  process.stderr.write('[context-sync] designTokens write-back failed: ' + err.message + '\n');
}
```

### Anti-Patterns to Avoid

- **Calling writeBackDesignTokens with opts.cwd inside ingestAll/reconcileOnStart:** Triggers double emitAll — the outer call re-normalizes DESIGN.md anyway, so the internal one is redundant and adds overhead.
- **Adding designTokens to the fieldMap object:** fieldMap routes to replaceSectionInFile(projectMd, ...). design-manifest.json is not PROJECT.md. The designTokens branch must be separate, not folded into fieldMap.
- **Calling writeBackDesignTokens when design-manifest.json does not exist:** This throws synchronously. Always wrap in try/catch.
- **Re-parsing DESIGN.md content inside the designTokens branch:** The merged value from mergeResult.merged.designTokens is already the color-list string from parseDesignMd(). Feed it directly to colorListToArray() — do not re-read from disk.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| hex-to-OKLCH conversion | Custom color math | hexToOklch() in context-sync.cjs (line 370) | Already implemented with canonical OKLAB forward matrix, round-trip tested |
| DTCG $value update | Direct JSON manipulation in new code | writeBackDesignTokens() in context-sync.cjs (line 1747) | Handles atomic write-rename, precision warnings, value-only update |
| Color string parsing | New regex | Same pattern as parseDesignMd() line 1719 | Identical pattern — copy the regex, don't invent a new one |
| Merge conflict detection | Custom comparison | mergePartialIR() result with normalizeDesignTokensForComparison() | Merge engine already computed the correct resolved value; normalizer handles format mismatch |

**Key insight:** Every functional piece is already written and tested. The work is wiring them together with a ~10-line adapter and a ~10-line conditional block — not new functionality.

---

## Common Pitfalls

### Pitfall 1: Double emitAll from writeBackDesignTokens
**What goes wrong:** Passing { cwd } to writeBackDesignTokens triggers its internal emitAll, then the outer reconcileOnStart/ingestAll also calls emitAll. Two full emit cycles fire.
**Why it happens:** writeBackDesignTokens was designed to be called standalone (e.g., from a direct CLI command or test), not from within an existing ingest flow that already calls emitAll.
**How to avoid:** Pass {} (empty opts) to writeBackDesignTokens from within the ingest flow. The outer emitAll(cwd) at the end of both functions handles re-normalization.
**Warning signs:** Test output shows DESIGN.md written twice; emitAll logging fires twice per ingest run.

### Pitfall 2: writeBackDesignTokens throws when design-manifest.json absent
**What goes wrong:** writeBackDesignTokens calls fs.readFileSync(manifestPath, 'utf-8') on line 1749 — this throws ENOENT if the file does not exist.
**Why it happens:** Phase 130 assumed manifest always exists (test fixtures always create it). A fresh project may have an empty or missing design-manifest.json.
**How to avoid:** Wrap writeBackDesignTokens call in try/catch in the ingest flow. Log to stderr, do not rethrow.
**Warning signs:** reconcileOnStart or ingestAll returns with an error field when design-manifest.json is absent; DESIGN.md edits silently fail to persist.

### Pitfall 3: Raw string comparison fires spuriously due to format mismatch
**What goes wrong:** Using mergeResult.merged.designTokens !== currentIR.designTokens as a raw string comparison fires even when no color values changed, because buildContextIR() stores designTokens in token-summary format ("Primary: oklch(...)") while parseDesignMd() returns color-list format ("- **Name** (#hex) -- role").
**Why it happens:** The two formats represent the same data differently. mergePartialIR() already normalizes via normalizeDesignTokensForComparison() for conflict detection, but the post-merge check must also normalize.
**How to avoid:** Use normalizeDesignTokensForComparison() for the change detection guard before calling colorListToArray and writeBackDesignTokens.
**Warning signs:** Write-back fires on every ingest even when no colors changed; design-manifest.json gets unnecessarily re-written on every run.

### Pitfall 4: colorListToArray returns empty array for valid input
**What goes wrong:** colorListToArray() returns [] for a valid designTokens string, causing no write-back to occur.
**Why it happens:** If the merged value is in token-summary format rather than color-list format (planning-wins case), the color-list regex won't match.
**How to avoid:** The normalizeDesignTokensForComparison() guard (Pitfall 3) prevents calling colorListToArray when the planning value is current. If colorListToArray returns [], log to stderr and skip — do not write an empty update.
**Warning signs:** writeBackDesignTokens returns { updated: 0, warnings: 0 } — no tokens matched.

### Pitfall 5: Asymmetric fix — only fixing ingestAll or only reconcileOnStart
**What goes wrong:** The same fieldMap pattern appears in both reconcileOnStart (line 1351) and ingestAll (line 1450, inside processEntry). Fixing only one function leaves the other broken.
**Why it happens:** The ingest flow has two entry points — session-start reconciliation and the --ingest CLI command — using slightly different scan strategies but identical write-back logic.
**How to avoid:** The designTokens branch must be added in both locations. The test suite should exercise both paths explicitly.
**Warning signs:** E2E test passes for --ingest but session-start reconciliation silently drops DESIGN.md edits.

---

## Code Examples

Verified patterns from the actual source (context-sync.cjs):

### Existing fieldMap pattern in ingestAll processEntry (line 1450)

```javascript
// Source: context-sync.cjs lines 1448-1455
var projectMd = path.join(planningDir, 'PROJECT.md');
var fieldMap = { techStack: 'Tech Stack', constraints: 'Constraints' };
for (var field in fieldMap) {
  if (mergeResult.merged[field] && mergeResult.merged[field] !== currentIR[field]) {
    replaceSectionInFile(projectMd, fieldMap[field], mergeResult.merged[field]);
  }
}
```

### Existing fieldMap pattern in reconcileOnStart (line 1351)

```javascript
// Source: context-sync.cjs lines 1349-1356
var projectMd = path.join(planningDir, 'PROJECT.md');
var fieldMap = { techStack: 'Tech Stack', constraints: 'Constraints' };
for (var field in fieldMap) {
  if (mergeResult.merged[field] && mergeResult.merged[field] !== currentIR[field]) {
    replaceSectionInFile(projectMd, fieldMap[field], mergeResult.merged[field]);
  }
}
```

### parseDesignMd color regex (line 1719) — basis for colorListToArray

```javascript
// Source: context-sync.cjs line 1719
const colorPattern = /^-\s+\*\*([^*]+)\*\*\s+\(#([a-fA-F0-9]{3,6})\)\s+--\s+(.+)$/gm;
```

### writeBackDesignTokens signature (line 1747)

```javascript
// Source: context-sync.cjs lines 1743-1746 (JSDoc), 1747 (signature)
// @param {string} planningDir - Absolute path to .planning/
// @param {Array<{name:string, hex:string, role:string}>} editorColors - Colors from parseDesignMd
// @param {object} opts - Options: { cwd } for emitAll call
// @returns {{updated:number, warnings:number}}
function writeBackDesignTokens(planningDir, editorColors, opts)
```

### normalizeDesignTokensForComparison (line 1193)

```javascript
// Source: context-sync.cjs lines 1193-1203
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

### Test scaffold pattern (from phase-130 — authoritative model)

```javascript
// Source: tests/phase-130/test-antigravity-writeback.cjs
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  writeBackDesignTokens,
  ingestAll,
  reconcileOnStart,
  emitAll,
  parseDesignMd,
} = require('../../bin/lib/context-sync.cjs');

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pde-phase133-'));
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| designTokens treated as text-only (merged in memory, not persisted to manifest) | designTokens triggers design-manifest.json write-back via writeBackDesignTokens | Phase 133 closes this gap | Completes AGR-03 end-to-end |
| fieldMap: only techStack + constraints | fieldMap: techStack + constraints + separate designTokens branch | Phase 133 | Full bidirectional sync for all WRITABLE_FIELDS |

**Deprecated/outdated:**
- The fieldMap-only pattern covering { techStack, constraints } is the incomplete form. After Phase 133 it is correct to have a separate designTokens block immediately after the fieldMap loop in both reconcileOnStart and ingestAll.

---

## Open Questions

1. **Should colorListToArray be a named export?**
   - What we know: It is a simple utility derived from the existing parseDesignMd regex. It can be private (not exported) if only called from reconcileOnStart/ingestAll.
   - What's unclear: Whether future phases will need to call it directly.
   - Recommendation: Keep private (no export) for now. The test suite can test the E2E behavior rather than the adapter directly. Expose only if a future phase requires it.

2. **What if mergeResult.merged.designTokens is in token-summary format?**
   - What we know: mergeResult.merged.designTokens is set to editorVal (from parseDesignMd, color-list format) when editor-wins, or currentVal (from buildContextIR, token-summary format) when planning-wins. colorListToArray returns [] for token-summary format.
   - What's unclear: Whether the normalizeDesignTokensForComparison guard correctly prevents spurious write-backs in all cases.
   - Recommendation: Verify by testing with planning-wins scenario — the normalizeDesignTokensForComparison() comparison should return equal when no editor change occurred, so the branch is skipped. This is the expected behavior.

3. **Is design-manifest.json guaranteed to have tokens.color[roleLower] structure?**
   - What we know: writeBackDesignTokens silently skips unmatched roles (no throw on missing token key). The actual project's design-manifest.json lacks a tokens.color group. The try/catch wrapper handles ENOENT.
   - What's unclear: Whether production manifests have the expected structure.
   - Recommendation: writeBackDesignTokens is already designed to be a no-op when no tokens match. The try/catch wrapper handles the ENOENT case. This is safe — test with both a populated and unpopulated manifest.

---

## Environment Availability

Step 2.6: SKIPPED — no external dependencies. This is a pure code integration within existing CJS files; no new CLIs, databases, or services required.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | node:test (built-in, Node.js 20.20.0) |
| Config file | None — tests run directly via node |
| Quick run command | `node tests/phase-133/test-design-writeback-integration.cjs` |
| Full suite command | `node tests/phase-133/test-design-writeback-integration.cjs` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AGR-03 | colorListToArray parses color-list string to array of {name,hex,role} | unit | `node tests/phase-133/test-design-writeback-integration.cjs` | Wave 0 |
| AGR-03 | colorListToArray returns empty array for empty/null input | unit | `node tests/phase-133/test-design-writeback-integration.cjs` | Wave 0 |
| AGR-03 | colorListToArray returns empty array for token-summary format (non-matching) | unit | `node tests/phase-133/test-design-writeback-integration.cjs` | Wave 0 |
| AGR-03 | ingestAll calls writeBackDesignTokens when DESIGN.md colors differ from manifest | integration | `node tests/phase-133/test-design-writeback-integration.cjs` | Wave 0 |
| AGR-03 | design-manifest.json $value updated with OKLCH after ingestAll | E2E | `node tests/phase-133/test-design-writeback-integration.cjs` | Wave 0 |
| AGR-03 | reconcileOnStart calls writeBackDesignTokens when DESIGN.md colors differ | integration | `node tests/phase-133/test-design-writeback-integration.cjs` | Wave 0 |
| AGR-03 | No write-back when DESIGN.md color unchanged (idempotent — second run produces no update) | integration | `node tests/phase-133/test-design-writeback-integration.cjs` | Wave 0 |
| AGR-03 | Non-fatal: ingestAll continues when design-manifest.json absent | unit | `node tests/phase-133/test-design-writeback-integration.cjs` | Wave 0 |
| AGR-03 | emitAll() re-normalizes DESIGN.md after write-back (round-trip — $value in DESIGN.md reflects new OKLCH) | E2E | `node tests/phase-133/test-design-writeback-integration.cjs` | Wave 0 |

### Sampling Rate

- **Per task commit:** `node tests/phase-133/test-design-writeback-integration.cjs`
- **Per wave merge:** `node tests/phase-133/test-design-writeback-integration.cjs`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-133/test-design-writeback-integration.cjs` — covers all AGR-03 integration requirements above

*(No existing test infrastructure covers the integration path; Wave 0 must create this file before implementation begins)*

---

## Sources

### Primary (HIGH confidence)

- Direct code inspection: `bin/lib/context-sync.cjs`
  - reconcileOnStart lines 1292-1403 (fieldMap at 1351)
  - ingestAll lines 1413-1501 (fieldMap at 1450 inside processEntry)
  - writeBackDesignTokens lines 1747-1785
  - parseDesignMd lines 1707-1734 (color regex at 1719)
  - normalizeDesignTokensForComparison lines 1193-1203
  - MONITORED_FILES lines 49-57 (DESIGN.md confirmed at index 6)
  - WRITE_BACK_FILES line 30 (design-manifest.json confirmed in snapshot set)
  - module.exports lines 2071-2086 (all relevant functions confirmed exported)
- Direct code inspection: `tests/phase-130/test-antigravity-writeback.cjs` — test scaffold and fixture pattern
- `.planning/v0.16-MILESTONE-AUDIT.md` lines 144-151 — definitive gap analysis with exact line numbers
- `.planning/milestones/v0.16-REQUIREMENTS.md` lines 33-37 — AGR-03 definition
- `.planning/milestones/v0.16-ROADMAP.md` lines 151-155 — Phase 133 success criteria
- `.planning/STATE.md` lines 46-74 — Phase 126-132 accumulated decisions

### Secondary (MEDIUM confidence)

None — this phase requires no external library research.

### Tertiary (LOW confidence)

None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero-npm, all utilities confirmed in project source
- Architecture: HIGH — gap is precisely documented in audit with exact line numbers; fieldMap pattern is unambiguous; double-emitAll risk is evident from reading writeBackDesignTokens source (line 1782: `if (opts && opts.cwd) emitAll(opts.cwd)`)
- Pitfalls: HIGH — all pitfalls derived from direct source inspection, not speculation

**Research date:** 2026-03-24
**Valid until:** Stable indefinitely — this is a closed-scope integration of frozen prior-phase code

---

## Key Finding Summary

The audit document precisely identifies the root cause. Quoting directly:

> writeBackDesignTokens() is implemented at context-sync.cjs line 1747, exported at line 2080. Never called from reconcileOnStart (lines 1292-1403) or ingestAll (lines 1413-1501). fieldMap at lines 1351 and 1450 only covers { techStack: 'Tech Stack', constraints: 'Constraints' } — no designTokens branch. Additional format mismatch: parseDesignMd returns { designTokens: "color-list-string" } but writeBackDesignTokens expects Array<{name, hex, role}>.

Phase 133 is a 3-change implementation:

1. Add colorListToArray() helper (adapter, ~10 lines, same regex as parseDesignMd line 1719)
2. Add designTokens branch to fieldMap section in ingestAll processEntry (~10 lines)
3. Add designTokens branch to fieldMap section in reconcileOnStart (~10 lines)

Plus a test suite (tests/phase-133/test-design-writeback-integration.cjs) exercising the E2E path.

Total implementation scope: approximately 30 lines of new code in context-sync.cjs, plus tests.
