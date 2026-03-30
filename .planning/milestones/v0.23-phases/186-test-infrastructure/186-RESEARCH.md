# Phase 186: Test Infrastructure - Research

**Researched:** 2026-03-30
**Domain:** Vitest 4.x configuration — include/exclude patterns and coverage setup
**Confidence:** HIGH

## Summary

The project has 236 test files under `tests/`. Of these, 135 use the `node:test` built-in runner (imported via `from 'node:test'` or `require('node:test')`), and the remaining 101 use vitest (either via explicit `from 'vitest'` imports or vitest's `globals: true` injection). The current `vitest.config.ts` include patterns match both populations, which is why vitest reports 135 "No test suite found" errors — it picks up node:test files expecting vitest's `describe`/`it` globals but finds a different test runner.

The fix has two parts. First, add an `exclude` array to `vitest.config.ts` using three glob patterns that precisely target the node:test phase directories (phase-40 through phase-133) without touching the vitest phases (phase-134, phase-134.1, phase-136.1, phase-163 through phase-184). Second, install `@vitest/coverage-v8@4.1.1` (matching the installed vitest@4.1.1) and add a `coverage` block to the config targeting `bin/lib/**/*.cjs`.

No test files should be deleted or disabled. The node:test files remain runnable via `node --test`. This is a config-only change plus one package install.

**Primary recommendation:** Add three exclude globs to `vitest.config.ts` and install `@vitest/coverage-v8@4.1.1`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None — auto-generated infrastructure phase.

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Success criteria are all technical: vitest config excludes node:test files, coverage baseline works. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

### Deferred Ideas (OUT OF SCOPE)
None — infrastructure phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TST-01 | Vitest configuration excludes node:test-based test files so that `npx vitest run` reports zero false "No test suite found" failures | Exclude globs for phase-40..133 directories remove all 135 node:test files from vitest's discovery |
| TST-02 | Running `npx vitest run --coverage` produces a coverage baseline report via @vitest/coverage-v8 for all vitest-compatible test files | Install @vitest/coverage-v8@4.1.1, add coverage.provider and coverage.include to config |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 4.1.1 (installed) | Test runner | Already in project |
| @vitest/coverage-v8 | 4.1.1 | V8 coverage provider | Must match vitest version exactly; v8 is built into Node, no extra instrumentation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:test | built-in | Legacy test runner | Already used in phases 40–133; kept runnable via `node --test` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @vitest/coverage-v8 | @vitest/coverage-istanbul | istanbul instruments source; v8 uses native coverage — v8 is simpler for CJS files |

**Installation:**
```bash
npm install --save-dev @vitest/coverage-v8@4.1.1
```

**Version verification:** `npm view @vitest/coverage-v8@4.1.1 version` returns `4.1.1` (verified against npm registry 2026-03-30). Must match `vitest@4.1.1` exactly.

## Architecture Patterns

### Recommended Project Structure
No structural changes. Only `vitest.config.ts` is modified.

### Pattern 1: Exclude node:test phases by directory glob

**What:** Add `exclude` array to the `test` block in `vitest.config.ts`. Three glob patterns cover all 61 node:test phase directories without touching vitest phases.

**When to use:** When a subset of test directories use an incompatible runner and cannot be differentiated by filename alone.

**Verified glob coverage (confirmed by file audit 2026-03-30):**

| Pattern | Covers | Node:test phases in range | Vitest phases in range |
|---------|--------|--------------------------|------------------------|
| `tests/phase-[4-9][0-9]/**` | phase-40 to phase-99 | phase-40..52, 64..83, 98 | none |
| `tests/phase-1[0-2][0-9]/**` | phase-100 to phase-129 | phase-100..129 | none |
| `tests/phase-13[0-3]/**` | phase-130 to phase-133 | phase-130..133 | none |

Vitest phases NOT excluded: phase-134, phase-134.1, phase-136.1, phase-163..184 (all correct).

**Example — updated vitest.config.ts:**
```typescript
// Source: codebase audit + vitest 4.x TypeScript type definitions
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/**/*.{test,spec}.{cjs,mjs,js,ts}', 'tests/**/test-*.cjs'],
    exclude: [
      'tests/phase-[4-9][0-9]/**',
      'tests/phase-1[0-2][0-9]/**',
      'tests/phase-13[0-3]/**',
    ],
    globals: true,
    testTimeout: 15000,
    server: {
      deps: {
        inline: ['zod'],
      },
    },
    coverage: {
      provider: 'v8',
      include: ['bin/lib/**/*.cjs'],
    },
  },
});
```

### Pattern 2: Coverage include targeting bin/lib

**What:** The `coverage.include` array restricts the coverage report to the production modules in `bin/lib/`. Without this, vitest would report coverage only for modules that are `require()`'d during tests — which may miss modules not exercised by any vitest test.

**When to use:** Always for a baseline report. Produces per-module line/branch percentages.

**Key `CoverageOptions` fields (confirmed from vitest 4.1.1 type definitions):**
```typescript
coverage: {
  provider: 'v8',           // uses Node's built-in V8 coverage
  include: string[],         // glob patterns relative to project root
  exclude: string[],         // additional exclusions beyond defaults
  reporter: ...,             // defaults to ['text', 'html', 'clover', 'json']
  reportsDirectory: string,  // defaults to './coverage'
}
```

### Anti-Patterns to Avoid

- **Deleting or renaming node:test files:** The success criterion explicitly requires node:test files remain runnable via `node --test`. Do not touch them.
- **Using `exclude` patterns in `coverage` to restrict the run:** The test `exclude` array (which suppresses test discovery) is separate from `coverage.exclude` (which suppresses coverage collection). They are independent; don't conflate them.
- **Mismatched @vitest/coverage-v8 version:** If `@vitest/coverage-v8` version doesn't match `vitest` version, vitest will throw a version mismatch error at runtime. Always match exactly.
- **Adding `coverage.enabled: true` to config:** This would force coverage on every `npx vitest run` (slow). Coverage should only run when `--coverage` flag is passed. Leave `enabled` at its default (`false`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Coverage collection | Custom instrumentation | @vitest/coverage-v8 | V8 native coverage handles CJS/MJS, source maps, branch tracking |
| File exclusion | Runtime filtering script | vitest `exclude` glob array | Built into vitest config; evaluated before any file is loaded |

## Common Pitfalls

### Pitfall 1: exclude glob order vs include glob
**What goes wrong:** vitest processes `exclude` against the full file list matched by `include`. A file must match `include` before `exclude` can remove it. The patterns work correctly here because the node:test files DO match the `include` patterns — that's exactly the problem being fixed.
**Why it happens:** Mental model confusion — exclude isn't a "never load this file" directive globally, it's applied after include expansion.
**How to avoid:** Keep `include` patterns as they are. Only add `exclude` entries.
**Warning signs:** If a node:test file still shows "No test suite found," double-check that the exclude glob actually matches its path.

### Pitfall 2: @vitest/coverage-v8 not installed
**What goes wrong:** Running `npx vitest run --coverage` exits with: `Error: Failed to load custom reporter from @vitest/coverage-v8` or similar.
**Why it happens:** `@vitest/coverage-v8` is an optional peer dependency — vitest does not install it automatically.
**How to avoid:** Install explicitly: `npm install --save-dev @vitest/coverage-v8@4.1.1`.
**Warning signs:** Any error mentioning coverage provider on `--coverage` runs.

### Pitfall 3: Coverage report shows 0% for all files
**What goes wrong:** `coverage.include` path doesn't resolve. Report shows "All files" with no entries, or shows 0 files.
**Why it happens:** Path in `coverage.include` is wrong (e.g., `lib/**` instead of `bin/lib/**`).
**How to avoid:** Verify `bin/lib/` exists and contains `.cjs` files before committing config.
**Warning signs:** `npx vitest run --coverage` completes but `coverage/` directory has no recognizable module entries.

### Pitfall 4: node:test .mjs files in non-excluded phases
**What goes wrong:** Some node:test phase dirs don't end in a two-digit number (e.g., a hypothetical `phase-135`), causing the three glob patterns to miss them.
**Why it happens:** The glob patterns are designed around the observed phase numbering as of 2026-03-30.
**How to avoid:** After running `npx vitest run`, verify zero "No test suite found" errors. If any remain, add a targeted exclude for that path.
**Warning signs:** Any remaining "No test suite found" in output.

## Code Examples

### Final vitest.config.ts
```typescript
// Source: vitest 4.1.1 type definitions (node_modules/vitest/dist/chunks/reporters.d.CZ5E0GCT.d.ts)
// and codebase audit confirming node:test phase range (phase-40..133)
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/**/*.{test,spec}.{cjs,mjs,js,ts}', 'tests/**/test-*.cjs'],
    exclude: [
      'tests/phase-[4-9][0-9]/**',
      'tests/phase-1[0-2][0-9]/**',
      'tests/phase-13[0-3]/**',
    ],
    globals: true,
    testTimeout: 15000,
    server: {
      deps: {
        inline: ['zod'],
      },
    },
    coverage: {
      provider: 'v8',
      include: ['bin/lib/**/*.cjs'],
    },
  },
});
```

### Verify node:test files still run after change
```bash
# node:test files remain runnable independently — spot check
node --test tests/phase-44/concurrency-isolation.test.mjs
node --test tests/phase-118/test-context-sync.cjs
```

### Quick vitest smoke after config change
```bash
npx vitest run --reporter=verbose 2>&1 | grep -c "No test suite found"
# Expected: 0
```

### Coverage baseline command
```bash
npx vitest run --coverage
# Produces ./coverage/ directory with text + html report
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| node:test (phases 40-133) | vitest (phases 134+) | ~phase 134 | Project migrated; old tests not converted — both runners coexist |
| No coverage | @vitest/coverage-v8 baseline | Phase 186 | Establishes regression baseline before code changes |

## Open Questions

1. **Remaining vitest test failures after exclude fix**
   - What we know: Several vitest tests fail for unrelated reasons (e.g., `worktree.test.cjs` fails with `spawnSync git EAGAIN`; `visual-diff.test.mjs` fails with `git ls-tree` errors)
   - What's unclear: How many vitest tests pass vs fail after excluding node:test files
   - Recommendation: TST-01 success criterion is "zero false 'No test suite found' failures" — real failures from git/env issues are not in scope for this phase. Document the final pass/fail counts in VALIDATION.md.

2. **Coverage percentage values**
   - What we know: No prior coverage baseline exists
   - What's unclear: What line/branch % the modules will show
   - Recommendation: Phase goal is a baseline report, not a target threshold. Per REQUIREMENTS.md FUT-04, coverage percentage targets are deferred.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|---------|
| node | Vitest runtime | Yes | (system node) | — |
| vitest | Test runner | Yes (devDep) | 4.1.1 | — |
| @vitest/coverage-v8 | TST-02 coverage | No — needs install | 4.1.1 needed | — |

**Missing dependencies with no fallback:**
- `@vitest/coverage-v8@4.1.1` — must be installed before `npx vitest run --coverage` works

**Missing dependencies with fallback:**
- None

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TST-01 | `npx vitest run` produces zero "No test suite found" entries | smoke | `npx vitest run 2>&1 \| grep -c "No test suite found"` (expect 0) | N/A — verified by running vitest |
| TST-02 | `npx vitest run --coverage` produces coverage report in `./coverage/` | smoke | `npx vitest run --coverage && ls coverage/` | N/A — verified by running vitest |

### Sampling Rate
- **Per task commit:** `npx vitest run 2>&1 | grep -c "No test suite found"` (expect 0)
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Both smoke checks green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `@vitest/coverage-v8@4.1.1` must be installed before coverage smoke can run

## Sources

### Primary (HIGH confidence)
- `node_modules/vitest/dist/chunks/reporters.d.CZ5E0GCT.d.ts` — `CoverageOptions`, `CoverageV8Options` interface definitions (lines 702-870)
- `node_modules/vitest/dist/config.d.ts` — `test.exclude: string[]` shape confirmed
- Codebase file audit (2026-03-30) — counted 135 node:test files, 101 vitest files, confirmed phase boundary at 133/134
- `npm view @vitest/coverage-v8@4.1.1 version` → `4.1.1` (registry verified)

### Secondary (MEDIUM confidence)
- Phase 186 CONTEXT.md — success criteria and constraint definitions
- vitest.config.ts existing config — confirmed current include patterns and globals:true

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified from installed node_modules and npm registry
- Architecture: HIGH — exclude patterns derived from complete file audit, zero ambiguity in phase boundary
- Pitfalls: HIGH — root causes confirmed from actual error output and type definitions

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (vitest 4.x is stable; config shape unlikely to change)
