# ESLint Exceptions — Phase 189

**Date:** 2026-03-30
**ESLint version:** 10.1.0
**eslint-plugin-n version:** 17.24.0
**@eslint/js version:** 10.0.1
**Config file:** `eslint.config.mjs` (flat config)
**Scope:** `bin/**/*.cjs`, `lib/**/*.cjs`, `packages/**/*.cjs`

## Result: Clean Pass — No Suppressions Added

`npx eslint bin lib packages --no-warn-ignored` exits 0 with **0 errors** and **144 warnings**.

No `eslint-disable` comments were added to any source file in `bin/`, `lib/`, or `packages/`.

## Deviation: Added Web API Globals

The initial config (as specified in the plan) was missing Web API globals that are available in
Node 18+ (the project uses Node 20). The first run produced 10 `no-undef` errors for:

- `fetch` — 7 occurrences across 5 files
- `Blob` — 2 occurrences in `bin/lib/3d-pipeline/convert.cjs`
- `FormData` — 1 occurrence in a fetch-related file

**Fix:** Added the following globals to `languageOptions.globals` in `eslint.config.mjs`:

```javascript
fetch: 'readonly',
Blob: 'readonly',
FormData: 'readonly',
AbortController: 'readonly',
AbortSignal: 'readonly',
TextEncoder: 'readonly',
TextDecoder: 'readonly',
ReadableStream: 'readonly',
WritableStream: 'readonly',
TransformStream: 'readonly',
Headers: 'readonly',
Request: 'readonly',
Response: 'readonly',
```

These are not suppressions — they are correct declarations of globals available in the Node 20
runtime environment. No rules were disabled.

## Exception Table

No exceptions to document. The clean pass was achieved by correctly declaring available globals,
not by suppressing rules.

| File | Rule | Suppression Type | Reason |
|------|------|-----------------|--------|
| (none) | — | — | — |

## Warnings (144 total)

All 144 warnings are `no-unused-vars` with severity `warn` (not `error`). These are intentional:
the rule is configured as a warning (not an error) to surface potential dead code without blocking
the lint pass. Findings are categorized below for future cleanup:

### Category A: Underscore-prefixed vars in catch blocks (~80 warnings)
Parameters named `_`, `_e`, `_2`, `_mergeErr`, etc. in catch clauses throughout `bin/`, `lib/`,
and `packages/`. The pattern is valid (catching and discarding errors intentionally) but the
`_` prefix convention is used inconsistently — some files use `e` directly without the prefix.

**Future action:** Standardize catch parameters to `_e` or `_err` across all files.

### Category B: Assigned-but-unused vars in module bodies (~30 warnings)
Variables like `ANNOTATION_RE`, `ENTRY_HEADING_RE`, `phaseDirName`, `stateContent` that are
computed but never read. Many of these appear to be debugging artifacts or intermediate values
left over from refactoring.

**Future action:** Review each occurrence — either use the value or remove the assignment.

### Category C: Unused imports/requires (~10 warnings)
`execSync`, `safeReadFile`, `path` imported at the top of files but not used in the current
version of the code.

**Future action:** Remove dead imports as part of a future cleanup pass.

### Category D: Unused function parameters (~24 warnings)
Parameters in callbacks and handlers that receive arguments they don't use, e.g., `flags`,
`cwd`, `width`, `fontColor`, `position`. Many are in interface-conforming function signatures
where the parameter is required by the caller's contract.

**Future action:** For interface-conforming signatures, prefix with `_` to document intent.
For others, remove if not needed.

## Notes

- `n/no-missing-require` produced 0 errors — all `require()` calls resolve to installed packages.
- `n/no-extraneous-require` produced 0 warnings — no packages required beyond what is in
  `package.json`.
- Third-party packages in `packages/*/node_modules/` contain eslint-disable comments but are
  excluded by the `node_modules/**` ignore glob and were not scanned.
