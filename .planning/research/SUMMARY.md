# Project Research Summary

**Project:** Platform Development Engine — Quality & Reliability Hardening (v0.23)
**Domain:** Quality auditing, data integrity verification, and technical debt cleanup for a large Node.js CommonJS plugin codebase (22 milestones, 184 phases)
**Researched:** 2026-03-29
**Confidence:** HIGH

## Executive Summary

PDE v0.23 is not a feature milestone — it is the first milestone where the product under development *is the existing codebase*. After 22 milestones of rapid capability shipping, accumulated defects fall into four categories: state document drift (ROADMAP.md, MILESTONES.md, REQUIREMENTS.md out of sync with what actually shipped), structural verification gaps (phases missing Nyquist VALIDATION.md files), IR shape mismatches (code written against mock shapes that diverged from real IR), and systemic technical debt (stale paths, dead imports, test runner incompatibility). The codebase is ~99 CJS production files across ~52,700 lines, with no existing linter, no coverage config, and no dead-code detection.

The recommended approach is a four-work-stream structure executed in dependency order: data integrity fixes first (they are source-of-truth for all downstream verification), test runner cleanup second (137/236 test files produce false "No test suite found" failures that mask real regressions), verification gap closure third, and technical debt cleanup in parallel. The critical toolchain additions — ESLint 10 with eslint-plugin-n, @vitest/coverage-v8, knip, jscpd, and markdownlint-cli2 — are all devDependencies only, preserving the zero-runtime-deps constraint at the plugin root.

The primary risk in quality hardening is false confidence: marking checkboxes without verifying underlying artifacts, writing validators that pass against already-rotten data, and fixing symptoms in place without addressing the process that generates them. PDE's own retrospective record from v0.18 through v0.21 documents the same categories of drift recurring milestone after milestone — proof that symptom patches without root-cause fixes have dominated prior hardening attempts. v0.23 must distinguish "remediation" (fix the stale data) from "root cause fix" (fix the process that generates it), and track both explicitly.

---

## Key Findings

### Recommended Stack

The hardening toolchain requires no new runtime dependencies — only devDependencies. ESLint 10 (flat config) with eslint-plugin-n covers static analysis and Node.js-specific rule enforcement for the CJS codebase. The `@vitest/coverage-v8` package activates native V8 coverage against the existing vitest v4 installation with a single config block. Knip 6 provides dead code and unused export detection via its explicit CommonJS guide. jscpd catches structural duplication that knip misses (both copies are reachable). markdownlint-cli2 enforces the structural consistency of PDE's Markdown state files, which are the primary data substrate for IR extraction.

**Core technologies:**
- `ESLint 10 + eslint-plugin-n 17`: Static analysis for 99 CJS production files — catches unresolvable `require()` paths, deprecated Node.js APIs, dead variables; flat config with `sourceType: "commonjs"` handles CJS natively
- `@vitest/coverage-v8 4`: V8-backed coverage for the existing vitest v4 test harness — zero additional test-runner configuration; AST-based remapping since v3.2.0 gives Istanbul-equivalent accuracy
- `knip 6`: Dead code and unused export detection with explicit CJS support — finds unreachable files AND unused exports AND unlisted deps in a single pass
- `jscpd 4`: Structural duplication detection for large CJS modules — use `--min-lines 10 --min-tokens 70` threshold; complementary to knip (different failure class)
- `markdownlint-cli2 0.22`: Structural consistency enforcement for `.planning/` Markdown files — catches heading mismatches, fence syntax errors, blank line violations that break downstream YAML frontmatter parsing

### Expected Features

The feature set for v0.23 is entirely correctness work, not new capability. Five items are confirmed P1 (must ship): ROADMAP.md milestone status update, MILESTONES.md one-liner completion (40+ placeholder entries corrupting portfolio IR), REQUIREMENTS.md checkbox reconciliation (EXT-01 through EXT-10 explicitly flagged as unchecked despite full implementation), Phase 180 VERIFICATION.md status fix (single `status: gaps_found` → `passed` field), and the buildCrossPatterns IR field name fix (`research.findings` → `research.topics`/`research.project_research_files`), which silently produces empty cross-pattern sections for all real PDE projects.

**Must have (table stakes):**
- ROADMAP.md v0.22 milestone status — primary tracking document shows `In Progress` despite milestone shipping 2026-03-30; P1 fix
- MILESTONES.md one-liner completion — 40+ placeholders corrupt `extractMilestoneHistory()` IR output; P1 fix
- REQUIREMENTS.md EXT-01–10 checkbox reconciliation — explicitly documented tracking gap in 176-VERIFICATION.md; P1 fix
- Phase 180 VERIFICATION.md `status:` frontmatter — explicitly listed in v0.22 MILESTONE-AUDIT.md tech debt; P1 fix
- buildCrossPatterns `research.findings` field fix — silently empty cross-patterns section for all real projects; P1 fix

**Should have (competitive):**
- v0.22 Nyquist VALIDATION.md backfill — 6 phases missing, 3 phases partial per MILESTONE-AUDIT.md; structural regression protection
- v0.7 SUMMARY.md frontmatter `one-liner` field additions — 5 files missing the key; low effort, defers gracefully

**Defer (v2+):**
- Cross-artifact consistency `pde-tools health` subcommand — higher complexity, lower urgency than fixing known gaps
- Pre-v0.22 Nyquist backfill (v0.1–v0.21) — diminishing returns for shipped work; v0.22 captures highest-value gap

### Architecture Approach

The existing PDE architecture is stable and v0.23 introduces no new top-level modules. Hardening work operates on existing modules within four parallel work streams: data integrity fixes on state files (ROADMAP.md, MILESTONES.md, STATE.md), verification gap closure (test runner incompatibility, Nyquist VALIDATION.md backfill), user-facing polish (IR edge cases, persona output quality, SVG chart edge cases), and technical debt cleanup (stale paths in workflow files, dead imports, context-sync/mcp-bridge audits). Work Streams 1 → 2 → 3 have sequential dependency; Work Stream 4 runs in parallel.

**Major components affected:**
1. **`.planning/` state files** — ROADMAP.md (5 unchecked plan boxes at confirmed lines 221–222, 279, 294–295), MILESTONES.md (46 placeholder one-liners), STATE.md (stale progress/focus fields)
2. **`bin/lib/render-presentation.cjs`** — buildCrossPatterns field name fix; 2096 LOC; must not break 23 currently-passing phase-184 tests
3. **`tests/` runner configuration** — 137/236 test files fail with "No test suite found" due to node:test vs vitest incompatibility; recommended fix is vitest `exclude` pattern for node:test files (zero-risk, 137 files in phases 100–117)
4. **`bin/lib/presentation.cjs`** — IR extractor edge cases; sentinel `{ unavailable: true, reason }` pattern must be preserved, never silent zeros
5. **`workflows/execute-phase.md` + `complete-milestone.md`** — stale `$HOME/.claude/pde-os/engines/gsd/` paths; must become `$CLAUDE_PLUGIN_ROOT/bin/pde-tools.cjs`

### Critical Pitfalls

1. **Treating checkbox audits as proof of correctness** — Each unchecked plan box must be verified against a concrete artifact (SUMMARY.md with completion timestamp, passing test, or git log commit) before marking it checked. Bulk-check operations without per-item verification produce false completion signals; this exact pattern recurred in v0.18, v0.20, and v0.21 retrospectives.

2. **Writing validators that pass against rotten data** — Before building any validator, specify the intended invariant in prose (the acceptance criterion). The validator enforces the invariant, not the current state of the corpus. Every validator test suite must include negative cases — inputs that should fail. A test suite with no rejection cases does not prove the validator works.

3. **Fixing symptoms without addressing root cause** — Every data fix must answer: "What process generated this incorrect state, and is it still running?" Remediation (fix the stale data) and root cause fix (fix the process) are separate sub-tasks. PDE's retrospective record documents that symptom-only patches produce the same issue one milestone later.

4. **CJS constraint violations introduced by hardening code** — Every new `.cjs` file must use `require()` and `module.exports`, never ESM `import`/`export`. Root `package.json` must not gain new `dependencies`. A Nyquist structural assertion should verify this: `grep -r "^import " bin/ --include="*.cjs"` must return empty.

5. **Breaking changes to shared utilities from new input validation** — Before adding validation to any shared utility, grep all callers and enumerate the values they can pass. Test against all five product types (software, hardware, hybrid, experience, business). New validation must be additive-safe: reject only what was never valid, not what was loosely accepted.

---

## Implications for Roadmap

The work stream dependency order maps directly to phase ordering. Data integrity fixes are source-of-truth for all downstream work. Test runner cleanup gives reliable regression signal. Verification gap closure depends on clean state and working tests. Polish and debt cleanup are partially independent. The feature set is fully bounded with specific file targets and line numbers — no ambiguity about scope.

### Phase 1: Root Cause Analysis and Data Integrity Baseline

**Rationale:** State documents (ROADMAP.md, MILESTONES.md, STATE.md) are consumed by IR extractors, verification passes, and portfolio synthesis. All downstream work is unreliable until these are accurate. This phase also establishes the root-cause vs remediation categorization for all found issues, preventing the symptom-patching pattern documented in prior retrospectives. The STATE.md progress field recalculation wiring should be verified at the end of this phase before Phase 2 starts.
**Delivers:** Corrected ROADMAP.md (5 plan boxes marked complete with per-box verification evidence), MILESTONES.md with all placeholder one-liners replaced from archived SUMMARY.md files, Phase 180 VERIFICATION.md status updated, STATE.md v0.23 initialization verified. Root-cause analysis inventory for each data drift item (process identified, recurrence prevention tracked).
**Addresses:** ROADMAP.md status update (P1), MILESTONES.md one-liner completion (P1), Phase 180 status fix (P1)
**Avoids:** Checkbox-as-proof fallacy (each box verified against SUMMARY.md completion timestamp before being marked); Symptom-only fixes (document root cause for each data drift item, not just the corrected value)

### Phase 2: Test Runner Compatibility and Coverage Baseline

**Rationale:** 137/236 test files produce false "No test suite found" failures. These mask real regressions and make it impossible to know whether hardening work introduces breakage. Resolving the incompatibility before writing new tests is essential for reliable signal. This phase also establishes the static analysis infrastructure and coverage baseline that later phases use to measure improvement.
**Delivers:** Vitest `exclude` pattern for node:test files (137 false failures eliminated, node:test tests remain runnable via `node --test`), coverage baseline report from `@vitest/coverage-v8` (lines/branches per module in bin/lib/), ESLint flat config at root (`eslint.config.cjs`) with no-missing-require and no-deprecated-api rules.
**Uses:** @vitest/coverage-v8 4, ESLint 10, eslint-plugin-n 17, @eslint/js 10, globals 17
**Avoids:** Tests-test-the-harness (negative test cases required for all new validators); CJS constraint violations (all new config files use CJS `require()` syntax, verified)

### Phase 3: REQUIREMENTS.md Reconciliation and IR Field Fix

**Rationale:** EXT-01 through EXT-10 are explicitly flagged as unchecked in 176-VERIFICATION.md despite full implementation — this is a bounded audit with concrete evidence available. The buildCrossPatterns field mismatch silently produces empty output for all real PDE projects and is explicitly listed in v0.22 MILESTONE-AUDIT.md tech debt. Both are high-value, well-defined fixes.
**Delivers:** REQUIREMENTS.md with all verified-implemented boxes checked (with VERIFICATION.md evidence cited inline), buildCrossPatterns `research.findings` → `research.topics`/`research.project_research_files` fix in render-presentation.cjs, updated test mocks in tests/phase-184/portfolio-render.test.mjs, confirmed 23 phase-184 tests still passing.
**Addresses:** REQUIREMENTS.md checkbox reconciliation (P1), buildCrossPatterns IR field fix (P1)
**Avoids:** Checkbox-as-proof fallacy (each checkbox checked against VERIFICATION.md evidence before marking); Breaking changes (mock updates accompany code fix atomically; 23 tests must remain green)

### Phase 4: Nyquist VALIDATION.md Backfill for v0.22

**Rationale:** Six phases (179–184) are missing VALIDATION.md entirely; three phases (176–178) have partial/draft status per MILESTONE-AUDIT.md. All v0.22 VERIFICATION.md files are confirmed complete — this makes the backfill tractable. Structural regression tests derived from observable truths protect all future refactors.
**Delivers:** 6 new VALIDATION.md files for phases 179–184, 3 completed VALIDATION.md files for phases 176–178. Each file includes `nyquist_compliant: true` frontmatter and derives assertions exclusively from VERIFICATION.md observable truths tables.
**Addresses:** v0.22 Nyquist VALIDATION.md backfill (P2)
**Avoids:** Validators encoding rot (assertions derive from VERIFICATION.md observable truths, not from current file state); Tests-test-the-harness (assertions specify actual values, not just key existence; each assertion has a corresponding negative case)

### Phase 5: Technical Debt Cleanup and Static Analysis Pass

**Rationale:** The independent work stream — stale paths, dead imports, context-sync/mcp-bridge audit — can run after high-priority fixes are committed and verified. Running static analysis tools (knip, jscpd) as part of this phase produces artifact reports that bound remaining debt and establish baselines for future milestones.
**Delivers:** Fixed `$CLAUDE_PLUGIN_ROOT` paths in execute-phase.md and complete-milestone.md (2 confirmed stale occurrences), audited context-sync.cjs 7 emitters, audited mcp-bridge.cjs APPROVED_SERVERS and tool maps, knip dead-code report (JSON artifact), jscpd duplication report (HTML artifact), markdownlint-cli2 structural consistency pass on `.planning/` files. v0.7 SUMMARY.md frontmatter one-liner fields added (5 files).
**Uses:** knip 6, jscpd 4, markdownlint-cli2 0.22
**Addresses:** v0.7 SUMMARY.md frontmatter fix (P2), technical debt documented in PROJECT.md
**Avoids:** CJS constraint violations (all new utility scripts use require() syntax); Breaking changes (stale path fixes tested via dry-run before commit)

### Phase Ordering Rationale

- Work Stream 1 (data integrity) must precede Work Stream 2 (verification) because STATE.md and ROADMAP.md are inputs to `recalculateFromArtifacts()`. Fixing them first means all subsequent verification passes run against accurate baselines.
- Test runner cleanup (Phase 2) precedes code changes (Phases 3–5) because 137 false failures would otherwise mask real regressions introduced during hardening.
- The IR field fix (Phase 3) requires updating both production code and test mocks atomically; this fits cleanly after the test runner is reliable.
- Nyquist backfill (Phase 4) is deferred until after data integrity and code fixes are merged — VALIDATION.md assertions should reflect the corrected state.
- Technical debt cleanup (Phase 5) is last and partially independent; it benefits from the clean test signal established in Phase 2.

### Research Flags

Phases with well-documented patterns (skip `/gsd:research-phase`):
- **Phase 1:** Standard document auditing and text editing — artifact locations with specific file paths and line numbers are identified in ARCHITECTURE.md; no research needed
- **Phase 2:** ESLint flat config for CJS and vitest exclude patterns are fully specified in STACK.md with exact config blocks; no additional research needed
- **Phase 3:** REQUIREMENTS.md evidence-based checkbox reconciliation is mechanical with known source files; IR field fix is a bounded find/replace with test update; field names confirmed from 176-VERIFICATION.md live IR output
- **Phase 4:** VALIDATION.md template pattern is established in phases 176–178; derive from VERIFICATION.md observable truths tables; mechanical templated process
- **Phase 5:** Knip, jscpd, and markdownlint-cli2 usage fully documented in STACK.md; stale path occurrences identified and scoped in ARCHITECTURE.md

No phases in this milestone require `/gsd:research-phase` — all research was completed up-front and the full technical scope is known from direct codebase inspection.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All tool versions verified via `npm view` against registry on 2026-03-29; ESLint flat config for CJS patterns verified against official docs; version compatibility matrix confirmed |
| Features | HIGH | Feature inventory derived from direct codebase inspection of ROADMAP.md, MILESTONES.md, MILESTONE-AUDIT.md, VERIFICATION.md files — not inferred; specific file paths and line numbers confirmed |
| Architecture | HIGH | All component sizes, line counts, module responsibilities, and data flow paths verified by direct inspection of source files; test runner failure count from live test execution (137/236 confirmed); stale path locations confirmed in workflow files |
| Pitfalls | HIGH | Pitfalls grounded in PDE's own retrospective records (v0.18–v0.21) showing documented recurrence of the same defect categories — not generic advice; root cause for each pitfall traced to a specific architectural decision |

**Overall confidence:** HIGH

### Gaps to Address

- **Progress field recalculation wiring (Phase 1):** STATE.md `recalculateFromArtifacts()` format dependency needs early validation — PITFALLS.md documents this as a Phase 1 check. Verify `completed_phases` increments after Phase 1 commits before Phase 2 starts.
- **MILESTONES.md one-liner read strategy:** 40+ one-liners must come from archived SUMMARY.md files in `.planning/milestones/vX.X-phases/`. Reading all at once risks context overflow — work milestone-by-milestone (confirmed in FEATURES.md dependency notes). Phase 1 plan must specify this strategy explicitly.
- **buildCrossPatterns mock update scope:** The fix requires updating both `render-presentation.cjs` and test mocks in `tests/phase-184/portfolio-render.test.mjs`. Verify the fix does not affect the `extractResearch()` (EXT-08) extractor interface itself — only the consumer field access path changes.

---

## Sources

### Primary (HIGH confidence)

- Direct inspection: `bin/pde-tools.cjs` (1712 LOC), all `bin/lib/*.cjs` modules (~89 modules), `hooks/hooks.json`
- Direct inspection: `.planning/ROADMAP.md` (5 unchecked plan boxes confirmed at lines 221–222, 279, 294–295)
- Direct inspection: `.planning/MILESTONES.md` (46 "One-liner:" placeholders confirmed by grep)
- Direct inspection: `.planning/STATE.md`, `.planning/PROJECT.md`
- Direct inspection: `.planning/milestones/v0.22-MILESTONE-AUDIT.md`
- Direct inspection: `tests/phase-176` through `tests/phase-184` (vitest pattern), `tests/phase-100` (node:test pattern)
- Direct inspection: `workflows/execute-phase.md`, `workflows/complete-milestone.md` (stale `pde-os` path confirmed)
- Runtime test execution: 137/236 "No test suite found" vitest failures confirmed
- `npm view [package] version` — all versions verified from registry 2026-03-29

### Secondary (MEDIUM confidence)

- [knip.dev/guides/working-with-commonjs](https://knip.dev/guides/working-with-commonjs) — CommonJS export convention requirements
- [github.com/eslint-community/eslint-plugin-n](https://github.com/eslint-community/eslint-plugin-n) — active fork, flat config `flat/recommended-script` support
- [vitest.dev/guide/coverage](https://vitest.dev/guide/coverage) — V8 AST remapping since v3.2.0
- [oxc.rs/blog/2026-03-11-oxlint-js-plugins-alpha](https://oxc.rs/blog/2026-03-11-oxlint-js-plugins-alpha) — Oxlint JS plugins alpha status (why Oxlint is deferred for v0.23)
- PDE retrospective records v0.18–v0.22 — recurring defect patterns; used to ground pitfall identification

### Tertiary (LOW confidence)

- tsmx.net — ESLint v9 flat config CJS migration guide; `sourceType: "commonjs"` for `.cjs` pattern
- WebSearch: quality hardening practices for legacy codebases — corroborating background for issue taxonomy

---
*Research completed: 2026-03-29*
*Ready for roadmap: yes*
