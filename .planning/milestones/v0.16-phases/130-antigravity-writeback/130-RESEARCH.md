# Phase 130: Antigravity Write-Back — Research

**Researched:** 2026-03-24
**Domain:** Color science (hex/OKLCH), DTCG token mutation, SKILL.md content preservation
**Confidence:** HIGH

---

## Summary

Phase 130 implements three distinct write-back mechanisms for the Antigravity bidirectional sync loop. The work is entirely within `bin/lib/context-sync.cjs` — no new dependencies are required. All three requirements (AGR-03, AGR-05, AGR-07) can be implemented as pure JavaScript additions to the existing file.

The hex-to-OKLCH conversion pipeline is the inverse of the existing `oklchToHex()` function already in the codebase. The exact matrix values are known from the Björn Ottosson OKLab spec and have been empirically verified: round-trip `hexToOklch → oklchToHex` produces exact hex matches for all standard in-gamut web colors (#3b82f6, #ffffff, #000000, #ff0000, #00ff00, #0000ff, #ef4444). The DTCG write-back requires value-only mutation — read the manifest, update only `$value`, write atomically using the PID-based write-rename pattern already established in `writeStateFile()`. The AGENT-ADDITIONS preservation requires a read-before-write pattern in `emitAntigravitySkill()`.

**Primary recommendation:** Implement all three requirements as pure additions to `bin/lib/context-sync.cjs` using the patterns already established in phases 126-129. No new npm packages. No architectural changes.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AGR-03 | DESIGN.md write-back: value-only DTCG update in design-manifest.json; hex-to-OKLCH with 4-decimal precision; precision warnings >0.001 delta; emitAll() after write | hexToOklch pipeline verified; atomic write pattern from writeStateFile(); emitAll() already exported |
| AGR-05 | Agent-written SKILL.md additions preserved: read existing agentAdditions, regenerate PDE sections, re-append below AGENT-ADDITIONS marker | emitAntigravitySkill() at lines 674-717; agentAdditions extraction already in parseSkillMd(); AGENT_MARKER string constant pattern identified |
| AGR-07 | emitDesignMd generates pde-format-version: 1.0 marker; parser uses it for strategy selection | emitDesignMd() at lines 748-850; parseDesignMd() already checks marker at line 1533; placeholder path also needs marker |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:fs` | built-in | Atomic file writes (write-rename pattern) | Already used in writeStateFile() |
| `node:path` | built-in | Path construction | Already used throughout |
| `node:test` | built-in (Node 18+) | Nyquist test runner | All phases 126-129 use this |
| `node:assert/strict` | built-in | Test assertions | All phases 126-129 use this |
| `node:os` | built-in | tmpdir() for test isolation | All phases 126-129 use this |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `Math.cbrt()` | built-in | Cube root for LMS step in hexToOklch | Required in forward OKLAB pipeline |
| `Math.atan2()` | built-in | OKLAB → OKLCH hue angle | Required in forward OKLCH pipeline |
| `process.stderr.write()` | built-in | Precision warnings without disrupting stdout | Established pattern in parseDesignMd/parseSkillMd |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled matrix math | `culori` npm package | culori is correct but adds a dependency; the matrices are fixed constants, math is trivial, and the existing oklchToHex already validates the inverse |
| PID-based tmp path | `fs.mkdtempSync` | PID pattern already established in writeStateFile() — use the same idiom for consistency |

**Installation:**
No new packages required. All dependencies are Node.js built-ins.

---

## Architecture Patterns

### Recommended Project Structure
No new files. All changes in:
```
bin/lib/context-sync.cjs    # Add hexToOklch(), writeBackDesignTokens(); modify emitAntigravitySkill(), emitDesignMd()
tests/phase-130/
└── test-antigravity-writeback.cjs   # 18 Nyquist tests (12 Plan-01 + 6 Plan-02)
```

### Pattern 1: Hex-to-OKLCH Forward Pipeline

**What:** Reverse of the existing `oklchToHex()` function. Six-step pipeline using fixed Björn Ottosson matrix constants.
**When to use:** When an agent edits a hex color in DESIGN.md and it must be stored as OKLCH in design-manifest.json.

**Pipeline steps (verified working):**
```javascript
// Source: verified empirically against oklchToHex() in bin/lib/context-sync.cjs lines 278-322
function hexToOklch(hexStr) {
  // Step 1: Parse hex, expand 3-char shorthand
  let h = hexStr.replace('#', '');
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  const r = parseInt(h.slice(0,2),16)/255;
  const g = parseInt(h.slice(2,4),16)/255;
  const b = parseInt(h.slice(4,6),16)/255;

  // Step 2: Remove sRGB gamma (linearize) — inverse of oklchToHex gamma()
  function linearize(c) {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  const rL = linearize(r), gL = linearize(g), bL = linearize(b);

  // Step 3: linear sRGB → LMS (forward matrix — inverse of oklchToHex's LMS→sRGB matrix)
  const l = 0.4122214708*rL + 0.5363325363*gL + 0.0514459929*bL;
  const m = 0.2119034982*rL + 0.6806995451*gL + 0.1073969566*bL;
  const s = 0.0883024619*rL + 0.2817188376*gL + 0.6299787005*bL;

  // Step 4: LMS → OKLAB (cube root, then forward M2 matrix)
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  const L  =  0.2104542553*l_ + 0.7936177850*m_ - 0.0040720468*s_;
  const a  =  1.9779984951*l_ - 2.4285922050*m_ + 0.4505937099*s_;
  const b2 =  0.0259040371*l_ + 0.7827717662*m_ - 0.8086757660*s_;

  // Step 5: OKLAB → OKLCH
  const C = Math.sqrt(a*a + b2*b2);
  let H = Math.atan2(b2, a) * (180 / Math.PI);
  if (H < 0) H += 360;

  // Step 6: Return with 4-decimal precision
  return `oklch(${L.toFixed(4)} ${C.toFixed(4)} ${H.toFixed(4)})`;
}
```

**Empirically verified round-trips (all produce exact hex match):**
- `#3b82f6` → `oklch(0.6231 0.1880 259.8145)` → `#3b82f6`
- `#ffffff` → `oklch(1.0000 0.0000 89.8756)` → `#ffffff`
- `#000000` → `oklch(0.0000 0.0000 0.0000)` → `#000000`
- `#ff0000` → `oklch(0.6280 0.2577 29.2339)` → `#ff0000`
- `#00ff00` → `oklch(0.8664 0.2948 142.4953)` → `#00ff00`
- `#0000ff` → `oklch(0.4520 0.3132 264.0520)` → `#0000ff`
- `#ef4444` → `oklch(0.6368 0.2078 25.3313)` → `#ef4444`

**Matrix source:** Björn Ottosson's OKLab specification. These are the same values used throughout the existing oklchToHex implementation. The forward matrices used here are the mathematical inverses of the matrices in oklchToHex lines 299-302.

### Pattern 2: Value-Only DTCG Write-Back

**What:** Read design-manifest.json, update only `$value` for matched color tokens, write atomically.
**When to use:** When writeBackDesignTokens() is called after parsing editor color changes.

```javascript
// Source: codebase — writeStateFile() atomic pattern at line 864
function writeBackDesignTokens(planningDir, editorColors, opts) {
  const manifestPath = path.join(planningDir, 'design', 'design-manifest.json');
  const raw = fs.readFileSync(manifestPath, 'utf-8');
  const manifest = JSON.parse(raw);

  let updated = 0, warnings = 0;

  for (const { hex, role } of editorColors) {
    // Normalize role for case-insensitive matching
    const roleLower = role.replace(/\s+color\s+role$/i, '').trim().toLowerCase();
    if (manifest.tokens && manifest.tokens.color && manifest.tokens.color[roleLower]) {
      const token = manifest.tokens.color[roleLower];
      const newOklch = hexToOklch(hex);

      // Precision check: round-trip via oklchToHex
      const roundTripped = oklchToHex(newOklch);
      if (roundTripped !== hex) {
        const delta = computeHexDelta(hex, roundTripped);
        if (delta > 0.001) {
          process.stderr.write(`[context-sync] precision warning: ${hex} → ${newOklch} → ${roundTripped} (delta=${delta.toFixed(4)})\n`);
          warnings++;
        }
      }

      // VALUE-ONLY update — all other DTCG fields preserved
      token.$value = newOklch;
      updated++;
    }
  }

  // Atomic write-rename (same pattern as writeStateFile)
  const tmpPath = manifestPath + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(manifest, null, 2), 'utf-8');
  fs.renameSync(tmpPath, manifestPath);

  // Re-normalize all editor files
  if (opts && opts.cwd) emitAll(opts.cwd);

  return { updated, warnings };
}
```

**DTCG token structure that must be preserved:**
```json
{
  "tokens": {
    "color": {
      "primary": {
        "$value": "oklch(0.6231 0.1880 259.8145)",
        "$type": "color",
        "$description": "Primary brand color",
        "$extensions": { "pde:source": "design-pipeline" }
      }
    },
    "typography": { ... },
    "spacing": { ... }
  }
}
```

### Pattern 3: AGENT-ADDITIONS Read-Before-Write

**What:** Read existing SKILL.md before regeneration, extract content below the marker, re-append verbatim after regenerated PDE content.
**When to use:** Every `emitAntigravitySkill()` call — the marker must always be present in output.

```javascript
// Source: emitAntigravitySkill at lines 674-717 — modification target
const AGENT_MARKER = '<!-- AGENT-ADDITIONS: DO NOT EDIT THIS LINE -->';

function emitAntigravitySkill(ir, projectRoot) {
  const skillDir = path.join(projectRoot, '.agent', 'skills', 'pde-design');
  const skillPath = path.join(skillDir, 'SKILL.md');
  fs.mkdirSync(skillDir, { recursive: true });

  // Read-before-write: preserve agent additions
  let agentBlock = '';
  try {
    const existing = fs.readFileSync(skillPath, 'utf-8');
    const markerIdx = existing.indexOf(AGENT_MARKER);
    if (markerIdx !== -1) {
      agentBlock = existing.slice(markerIdx + AGENT_MARKER.length);
    }
  } catch {
    // File doesn't exist yet — no agent additions to preserve
  }

  // ... build PDE content sections as before ...

  // ALWAYS append marker, then any preserved agent content
  content += '\n' + AGENT_MARKER + '\n';
  if (agentBlock) {
    content += agentBlock;
  }

  fs.writeFileSync(skillPath, content, 'utf-8');
  return { written: true, path: '.agent/skills/pde-design/SKILL.md' };
}
```

### Pattern 4: Format-Version Marker in emitDesignMd

**What:** Insert `<!-- pde-format-version: 1.0 -->` after the SOURCE comment, before the first heading. Must appear in BOTH the placeholder and the full token paths.
**When to use:** Both code paths in emitDesignMd() (lines 753-786 for placeholder, lines 820-848 for full).

```javascript
// Source: emitDesignMd() at lines 748-850 — both branches need the marker
const content = [
  header,
  sourceComment,                          // AGR-04 marker
  '<!-- pde-format-version: 1.0 -->',     // AGR-07 format version
  `# Design System: ${ir.projectName}`,
  // ...
].join('\n');
```

**Note:** `parseDesignMd()` at line 1533 already checks for this marker:
```javascript
const isV1 = /<!--\s*pde-format-version:\s*1\.0\s*-->/.test(content);
```
The regex uses `\s*` so minor whitespace variation is tolerated — but the emitter should produce the canonical form without extra spaces.

### Pattern 5: Precision Delta Computation

**What:** Compute numeric delta between two hex colors for the precision warning threshold.
**When to use:** Inside writeBackDesignTokens() to determine whether to emit a stderr warning.

```javascript
// Compute per-channel max delta between two 7-char hex strings
function computeHexDelta(hex1, hex2) {
  const parse = h => [
    parseInt(h.slice(1,3),16)/255,
    parseInt(h.slice(3,5),16)/255,
    parseInt(h.slice(5,7),16)/255
  ];
  const [r1,g1,b1] = parse(hex1);
  const [r2,g2,b2] = parse(hex2);
  return Math.max(Math.abs(r1-r2), Math.abs(g1-g2), Math.abs(b1-b2));
}
```

**Important note on delta for standard web colors:** Empirical testing shows all 7 test colors produce exact round-trips (delta = 0). The `> 0.001` threshold is a safety net for edge cases (very dark colors, out-of-gamut-adjacent values, or platform-specific floating-point variation).

### Anti-Patterns to Avoid

- **Importing `culori` or any color library:** Not needed. The Björn Ottosson matrices are fixed constants. Adding a dep would require package.json changes and break the zero-dependency philosophy of context-sync.cjs.
- **Updating non-$value DTCG fields:** The requirement is value-only. Never write $type, $description, or $extensions — even if the agent changed them in DESIGN.md (DESIGN.md cannot carry those fields back; only hex values are parsed from it).
- **Trimming agentBlock in emitAntigravitySkill:** Agent content must be preserved verbatim. Do not `.trim()` the agentBlock before appending — the agent may have intentional leading whitespace after the marker.
- **Omitting the AGENT-ADDITIONS marker when agentBlock is empty:** The marker must ALWAYS be present in generated SKILL.md, even when there is no agent content. This ensures agents can always find the marker to append below.
- **Putting format-version marker only in the full token path:** Both the placeholder path and the full token path in emitDesignMd() must include the marker. parseDesignMd() checks the entire document, not a section.
- **Using `token.value` instead of `token.$value`:** The DTCG spec uses `$value`. The existing emitDesignMd() already handles both (`token.$value || token.value`), but writeBackDesignTokens() should always write to `$value`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic file writes | Custom file locking | Write-to-tmp + `fs.renameSync()` with PID in path | Already established in writeStateFile() at line 864; rename is atomic on POSIX |
| Color space math | Custom color libraries | The 6 matrix constants from Björn Ottosson OKLab spec | Matrices are fixed; oklchToHex already uses the inverse; hand-rolling is appropriate here because the problem is tiny and bounded |
| Test fixtures with design tokens | Custom manifest builder | Simple inline JSON with `$value`, `$type`, `$description` | Matches real design-manifest.json structure; Phase 128 tests use the same approach |
| Role name matching | Fuzzy string matching | Lowercase + strip " color role" suffix | Role names in DESIGN.md follow the pattern `name color role` where name matches the token key |

---

## Common Pitfalls

### Pitfall 1: Wrong linearization threshold in hexToOklch

**What goes wrong:** Using `c < 0.04045` instead of `c <= 0.04045` in the linearize function. For the value 0.04045 exactly (hex byte 0x0B = 11), the two branches diverge slightly.
**Why it happens:** Off-by-one on the boundary condition.
**How to avoid:** Use `c <= 0.04045` — the same threshold used in oklchToHex's gamma function implicitly via `x <= 0` and `x >= 1` clamping. The correct IEC 61966-2-1 sRGB linearization threshold is `<= 0.04045`.
**Warning signs:** Round-trip failure for hex values near #0B0B0B.

### Pitfall 2: Forgetting to handle agentBlock when it starts with a newline

**What goes wrong:** When the agent writes content immediately after the marker, the extracted agentBlock starts with `\n`. If you trim it before re-appending, the single blank line separator is destroyed, causing the marker and agent content to merge visually.
**Why it happens:** Natural instinct to trim strings.
**How to avoid:** Never trim agentBlock. Preserve it byte-for-byte. The marker + newline pattern provides the separator: `content += '\n' + AGENT_MARKER + '\n'` — the `\n` at the end of this concat is the separator; agentBlock contains whatever came after the marker in the original file.

### Pitfall 3: The format-version marker needs to appear in BOTH emitDesignMd branches

**What goes wrong:** Adding `<!-- pde-format-version: 1.0 -->` only to the full token content array and forgetting the placeholder branch. Tests only exercise the generated DESIGN.md after a full emitAll() with tokens, missing the placeholder.
**Why it happens:** The placeholder branch at lines 753-786 is easy to overlook.
**How to avoid:** Add the marker to both the placeholder array (after `sourceComment`) and the full array (after `sourceComment`). Test 12 in 130-01-PLAN.md verifies line order: PDE-GENERATED → SOURCE → format-version → # heading.

### Pitfall 4: Color role name matching — "primary color role" vs "primary"

**What goes wrong:** DESIGN.md color entries follow the pattern `- **Primary** (#hex) -- primary color role`. The role extracted by parseDesignMd is `primary color role` (the text after ` -- `). The token key in design-manifest.json is `primary`. Matching `role === tokenKey` fails.
**Why it happens:** parseDesignMd captures the entire role description string, not just the first word.
**How to avoid:** Normalize the role before matching: strip trailing " color role" suffix and lowercase. Use: `role.replace(/\s+color\s+role$/i, '').trim().toLowerCase()`.
**Warning signs:** writeBackDesignTokens() returns `{ updated: 0 }` even when tokens exist in the manifest.

### Pitfall 5: H (hue) going negative from atan2

**What goes wrong:** `Math.atan2()` returns values in [-π, π]. Converting to degrees gives [-180, 180]. Without the `if (H < 0) H += 360` correction, OKLCH hue values for colors in the blue-purple quadrant will be negative, which is non-standard.
**Why it happens:** atan2 has a different range than OKLCH's [0, 360) convention.
**How to avoid:** Always apply `if (H < 0) H += 360` after the degree conversion.
**Warning signs:** `oklchToHex(hexToOklch('#0000ff'))` returns wrong value — blue has H ≈ 264 degrees (positive) but a missing correction would give H ≈ -96.

### Pitfall 6: Precision delta computation using absolute hex distance vs perceptual distance

**What goes wrong:** Precision delta for the `> 0.001` warning is per-channel linear RGB difference, not perceptual distance. This is intentional — the requirement says "hex-to-OKLCH conversion delta exceeds 0.001". Implementing a perceptual distance (ΔE) instead would over-complicate the implementation.
**Why it happens:** Color science instinct to use perceptual metrics.
**How to avoid:** Use per-channel max difference on the 0-1 normalized RGB values. Simple and unambiguous. For all standard in-gamut web colors, the delta will be 0 (exact round-trip).

### Pitfall 7: emitDesignMd marker line ordering

**What goes wrong:** Test 12 verifies a specific line order: PDE-GENERATED → SOURCE → format-version → # heading. Inserting the format-version BEFORE the SOURCE comment breaks this.
**Why it happens:** Arbitrary insertion order.
**How to avoid:** In both content arrays, maintain order: `[header, sourceComment, '<!-- pde-format-version: 1.0 -->', \`# Design System: ...\`, ...]`.

---

## Code Examples

### Test fixture for writeBackDesignTokens (plan-01 tests 5-10)

```javascript
// Source: established pattern from tests/phase-128/test-merge-engine.cjs
function makePlanningDirWithTokens(baseDir) {
  const planningDir = path.join(baseDir, '.planning');
  const designDir = path.join(planningDir, 'design');
  fs.mkdirSync(designDir, { recursive: true });
  fs.writeFileSync(path.join(planningDir, 'PROJECT.md'), '# Test Project\n', 'utf-8');
  fs.writeFileSync(path.join(planningDir, 'STATE.md'), '# State\n', 'utf-8');
  fs.writeFileSync(path.join(designDir, 'DESIGN-STATE.md'), '', 'utf-8');

  const manifest = {
    tokens: {
      color: {
        primary: {
          '$value': 'oklch(0.6231 0.1880 259.8145)',
          '$type': 'color',
          '$description': 'Primary brand color',
          '$extensions': { 'pde:source': 'design-pipeline' }
        },
        secondary: {
          '$value': 'oklch(0.6368 0.2078 25.3313)',
          '$type': 'color',
          '$description': 'Secondary brand color'
        }
      },
      typography: {
        fontFamily: { '$value': 'Inter, sans-serif', '$type': 'fontFamily' }
      },
      spacing: {
        base: { '$value': '8px', '$type': 'dimension' }
      }
    }
  };
  fs.writeFileSync(
    path.join(designDir, 'design-manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );
  return planningDir;
}
```

### Verifying $value updated, other fields preserved

```javascript
// Post-writeBackDesignTokens verification pattern
const raw = fs.readFileSync(path.join(planningDir, 'design', 'design-manifest.json'), 'utf-8');
const result = JSON.parse(raw);
const primary = result.tokens.color.primary;
assert.match(primary['$value'], /^oklch\(/, '$value must be OKLCH format');
assert.equal(primary['$type'], 'color', '$type must be preserved');
assert.equal(primary['$description'], 'Primary brand color', '$description must be preserved');
assert.deepEqual(primary['$extensions'], { 'pde:source': 'design-pipeline' }, '$extensions must be preserved');
// Non-color groups must be untouched
assert.equal(result.tokens.typography.fontFamily['$value'], 'Inter, sans-serif');
assert.equal(result.tokens.spacing.base['$value'], '8px');
```

### Test structure for AGENT-ADDITIONS round-trip

```javascript
// Source: plan-02 test pattern (tests 14, 15, 18)
test('AGR-05: agent content preserved across re-emit', async () => {
  const tmpDir = makeTmpDir();
  makePlanningDir(tmpDir);

  // First emit — creates SKILL.md with marker
  emitAll(tmpDir);

  const skillPath = path.join(tmpDir, '.agent', 'skills', 'pde-design', 'SKILL.md');
  // Agent appends custom content after marker
  const agentContent = '\n\n## Custom Agent Notes\nAgent wrote this content.\n';
  fs.appendFileSync(skillPath, agentContent, 'utf-8');

  // Second emit — must preserve agent content
  emitAll(tmpDir);

  const regenerated = fs.readFileSync(skillPath, 'utf-8');
  assert.ok(regenerated.includes('## Custom Agent Notes'), 'agent section preserved');
  assert.ok(regenerated.includes('Agent wrote this content.'), 'agent text preserved verbatim');
  assert.ok(regenerated.includes('<!-- AGENT-ADDITIONS: DO NOT EDIT THIS LINE -->'), 'marker always present');
});
```

---

## Runtime State Inventory

Not applicable — this is not a rename/refactor/migration phase.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All tests + implementation | Yes | v20.20.0 | — |
| `node:test` | Nyquist tests | Yes | built-in (Node 18+) | — |
| `node:assert/strict` | Nyquist tests | Yes | built-in | — |
| `bin/lib/context-sync.cjs` | Test imports | Yes | current HEAD | — |

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | node:test (built-in, Node 20) |
| Config file | none — direct invocation |
| Quick run command | `node --test tests/phase-130/test-antigravity-writeback.cjs` |
| Full suite command | `node --test tests/phase-130/test-antigravity-writeback.cjs && node --test tests/phase-129/test-hook-integration.cjs && node --test tests/phase-128/test-merge-engine.cjs && node --test tests/phase-127/test-reverse-parsers.cjs && node --test tests/phase-126/test-sync-foundation.cjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AGR-03 | hexToOklch returns oklch() with 4-decimal precision | unit | `node --test tests/phase-130/test-antigravity-writeback.cjs` | ❌ Wave 0 |
| AGR-03 | Round-trip hexToOklch→oklchToHex produces exact hex | unit | same | ❌ Wave 0 |
| AGR-03 | writeBackDesignTokens updates only $value fields | unit | same | ❌ Wave 0 |
| AGR-03 | writeBackDesignTokens preserves $type, $description, $extensions | unit | same | ❌ Wave 0 |
| AGR-03 | Precision warning logged when delta > 0.001 | unit | same | ❌ Wave 0 |
| AGR-03 | emitAll() called after write-back | unit | same | ❌ Wave 0 |
| AGR-05 | AGENT-ADDITIONS marker always present in generated SKILL.md | unit | same | ❌ Wave 0 |
| AGR-05 | Agent content below marker preserved after re-emit | unit | same | ❌ Wave 0 |
| AGR-05 | Files without marker: backward compatible, marker added | unit | same | ❌ Wave 0 |
| AGR-07 | emitDesignMd output contains pde-format-version: 1.0 | unit | same | ❌ Wave 0 |
| AGR-07 | format-version marker in correct line order (after SOURCE, before heading) | unit | same | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/phase-130/test-antigravity-writeback.cjs`
- **Per wave merge:** Full suite (all 5 phase test files)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-130/test-antigravity-writeback.cjs` — covers AGR-03, AGR-05, AGR-07 (18 tests across 2 plans)
- [ ] `tests/phase-130/` directory — does not exist yet

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| oklchToHex only (one-way) | hexToOklch + oklchToHex (bidirectional) | Phase 130 | Agent color edits can now flow back to canonical DTCG tokens |
| emitAntigravitySkill overwrites blindly | Read-before-write with AGENT-ADDITIONS preservation | Phase 130 | Agent-written skill enhancements survive regeneration cycles |
| DESIGN.md without format marker | DESIGN.md with pde-format-version: 1.0 | Phase 130 | Parser can select correct strategy; future format changes are versioned |

---

## Open Questions

1. **Role name normalization for multi-word token keys**
   - What we know: Color token keys in design-manifest.json use single lowercase words (primary, secondary). The role field from DESIGN.md is `primary color role`.
   - What's unclear: Are there real-world token names with spaces (e.g., `brand-red`) or compound keys (e.g., `color.brand.primary`)?
   - Recommendation: The current design only handles `manifest.tokens.color[roleName]` (one level). For Phase 130, this is sufficient — the planner should add a note that nested color tokens (e.g., `tokens.color.brand.primary`) are out of scope and will not be matched. If the design pipeline generates nested tokens, a more recursive matching strategy is needed in a future phase.

2. **What constitutes a >0.001 precision failure in practice?**
   - What we know: All tested in-gamut sRGB colors produce exact round-trips (delta = 0.0).
   - What's unclear: Whether any design token values could ever trigger the warning in normal use.
   - Recommendation: The warning is a safety net. Tests should include a synthetic case that forces a warning by directly comparing a mismatched pair (or mocking oklchToHex to return a different value for the test). The planner should note that Test 8 in 130-01-PLAN.md uses an "edge-case color" — the implementation should include an explicit `computeHexDelta` helper so the warning threshold is testable independently.

---

## Sources

### Primary (HIGH confidence)
- `bin/lib/context-sync.cjs` lines 278-322 — existing `oklchToHex()` implementation providing the exact inverse matrices
- `bin/lib/context-sync.cjs` lines 674-717 — `emitAntigravitySkill()` implementation target
- `bin/lib/context-sync.cjs` lines 748-850 — `emitDesignMd()` implementation target
- `bin/lib/context-sync.cjs` lines 1460-1555 — `parseSkillMd()` and `parseDesignMd()` showing what marker/format strings are already expected
- `bin/lib/context-sync.cjs` lines 862-880 — `writeStateFile()` atomic write-rename pattern to replicate
- Empirical round-trip testing: 7 in-gamut colors verified with the forward pipeline (node -e inline test, 2026-03-24)
- `.planning/REQUIREMENTS.md` — AGR-03, AGR-05, AGR-07 exact requirement text

### Secondary (MEDIUM confidence)
- Björn Ottosson OKLab specification — forward/inverse matrix constants (these are established mathematical constants; the existing codebase already validates them via oklchToHex)
- `.planning/phases/130-antigravity-writeback/130-01-PLAN.md` and `130-02-PLAN.md` — full implementation specs already written; research confirms their technical correctness

### Tertiary (LOW confidence)
- None — all claims are grounded in the codebase or verified math.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies; all Node.js built-ins already in use
- hexToOklch pipeline: HIGH — empirically verified with 7 test cases against existing oklchToHex
- Architecture patterns: HIGH — all patterns derived from existing codebase conventions
- AGENT-ADDITIONS: HIGH — marker string and extraction logic confirmed in parseSkillMd
- DTCG value-only write: HIGH — design-manifest.json structure confirmed; atomic write pattern confirmed
- Format-version: HIGH — parseDesignMd regex already present; marker string confirmed

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable domain — no external dependencies change)
