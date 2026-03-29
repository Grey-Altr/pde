---
phase: 170-pde-utilities
plan: "01"
subsystem: pde-utilities
tags: [mermaid, dtcg, apca, oklch, token-validation, tdd, cjs]
dependency_graph:
  requires: []
  provides: [mermaid-renderer.cjs, token-validator.cjs]
  affects: [bin/lib/utils/]
tech_stack:
  added: [apca-w3@0.1.9, colorjs.io@0.6.1]
  patterns: [binary-auto-detection, dependency-injection, dtcg-traversal, tdd]
key_files:
  created:
    - bin/lib/utils/mermaid-renderer.cjs
    - bin/lib/utils/token-validator.cjs
    - tests/phase-170/mermaid-renderer.test.mjs
    - tests/phase-170/token-validator.test.mjs
  modified:
    - package.json
decisions:
  - "mermaid-renderer.cjs uses process.env.MMDR_PATH || 'mmdr' for binary path — allows env override for Homebrew installations not in PATH"
  - "token-validator.cjs uses dependency injection pattern for _execFn where needed but pure computation for gamut/APCA checks (no subprocess calls)"
  - "validateTokens traversal uses dot-separator prefix (e.g. 'color.text.primary') matching DTCG spec naming convention"
  - "checkApcaContrast first arg is always text (foreground) — APCA calcAPCA is directional, not commutative"
metrics:
  duration: "3m 28s"
  completed: "2026-03-29"
  tasks: 2
  files: 5
---

# Phase 170 Plan 01: Mermaid Renderer + Token Validator Utility Modules Summary

Implemented `mermaid-renderer.cjs` (mmdr/mmdc auto-detection with _execFn injection) and `token-validator.cjs` (DTCG schema validation, OKLCH P3 gamut check via colorjs.io, APCA contrast check via apca-w3) — both in `bin/lib/utils/` with full vitest test coverage, 23 tests passing.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install deps + create mermaid-renderer.cjs with tests | e275337 | bin/lib/utils/mermaid-renderer.cjs, tests/phase-170/mermaid-renderer.test.mjs, package.json, package-lock.json |
| 2 | Create token-validator.cjs with OKLCH/APCA checks and tests | e74ecbe | bin/lib/utils/token-validator.cjs, tests/phase-170/token-validator.test.mjs |

## What Was Built

### mermaid-renderer.cjs
- `detectRenderer(_execFn)` — tries `mmdr` binary first (uses `process.env.MMDR_PATH || 'mmdr'`), falls back to `mmdc`, returns `'mmdr'`/`'mmdc'`/`null`
- `renderMermaid({ input, outputPath, format, _execFn })` — calls mmdr with `[-i, input, -o, outputPath, -e, format]` or mmdc with `[-i, input, -o, outputPath]` (format inferred from extension), defaults to `svg`
- Throws `MMDR_INSTALL_MSG` with brew tap + npm install instructions when no renderer found
- Full dependency injection pattern following `cad.cjs` binary detection convention

### token-validator.cjs
- `validateTokens(tokens, prefix, violations)` — recursive DTCG traversal following `dtcgToCssLines` pattern from `design.cjs`, flags: (1) missing `$type`, (2) root-level tokens without dot in path (naming convention violation)
- `checkOklchGamut(colorValue)` — wraps `colorjs.io` `new Color(value).inGamut('p3'/'srgb')`, returns `{ inP3, inSrgb }` or `{ error: 'parse-error' }` on parse failure
- `checkApcaContrast(textColor, bgColor)` — wraps `apca-w3` `calcAPCA()`, returns `{ Lc, bodyPass: |Lc| >= 60, largePass: |Lc| >= 45 }`
- `runTokenValidation(tokens)` — orchestrates schema + gamut + contrast checks; returns `{ violations, summary, stats }` where summary is a markdown table

### npm Dependencies Added
- `apca-w3@0.1.9` — W3C-licensed APCA reference implementation; `calcAPCA(text, bg)` API
- `colorjs.io@0.6.1` — OKLCH gamut checking via `new Color(str).inGamut('p3')`

## Verification Results

```
Test Files: 2 passed
Tests:      23 passed (7 mermaid-renderer + 16 token-validator)
Duration:   ~130ms
```

All plan success criteria met:
- mermaid-renderer.cjs exports `detectRenderer` and `renderMermaid` with _execFn DI
- token-validator.cjs exports `validateTokens`, `checkOklchGamut`, `checkApcaContrast`, `runTokenValidation`
- `apca-w3` and `colorjs.io` in package.json dependencies
- All unit tests pass via vitest

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all functions are fully implemented with real computation, no placeholder logic.

## Self-Check: PASSED

- [x] `bin/lib/utils/mermaid-renderer.cjs` — FOUND
- [x] `bin/lib/utils/token-validator.cjs` — FOUND
- [x] `tests/phase-170/mermaid-renderer.test.mjs` — FOUND
- [x] `tests/phase-170/token-validator.test.mjs` — FOUND
- [x] Commit `e275337` — Task 1 (mermaid-renderer + deps install)
- [x] Commit `e74ecbe` — Task 2 (token-validator)
