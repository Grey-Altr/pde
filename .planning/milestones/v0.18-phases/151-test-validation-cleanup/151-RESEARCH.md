# Phase 151: Test & Validation Cleanup - Research

**Researched:** 2026-03-27
**Domain:** Node.js/CJS test infrastructure, vitest dependency injection patterns, VALIDATION.md Nyquist compliance
**Confidence:** HIGH

## Summary

Phase 151 closes two specific gaps in the v0.18 milestone: a timing-out test (Test 7 in coordinator-smoke.test.cjs) and an incomplete VALIDATION.md for Phase 149. Both are surgical fixes — no new modules, no new design patterns, just targeted repairs.

For CLN-01: `makeCoordWithDeps` does not inject stubs for `analyzeDag` or `routeSession`. When `dispatchWave` is called in Test 7, it falls through to the real `analyzeDag`, which calls `sdkQuery`, which calls `import('@anthropic-ai/claude-agent-sdk')`. This dynamic ESM import either hangs or fails — the test times out at the 15,000 ms vitest timeout. The fix is to add `analyzeDag: vi.fn()` and `routeSession: vi.fn()` to the `deps` object inside `makeCoordWithDeps`, consistent with the DI pattern already used by the other 8 tests in that file.

For CLN-02: Phase 149's VALIDATION.md has `nyquist_compliant: false` and `wave_0_complete: false` in its frontmatter. The VERIFICATION.md (already complete, scored 10/10) and both test suites (30/30 passing) demonstrate all phase requirements are met. The validation document's sign-off checklist was never finalized and the frontmatter was never flipped. The fix is to update the frontmatter fields to `true` and complete the sign-off checklist in the VALIDATION.md.

**Primary recommendation:** Add two stub injections to `makeCoordWithDeps` (CLN-01) and update Phase 149 VALIDATION.md frontmatter + sign-off (CLN-02). Both are single-file edits.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CLN-01 | coordinator-smoke.test.cjs Test 7 passes with analyzeDag and routeSession stubs injected into makeCoordWithDeps | Root cause confirmed: missing stubs cause real SDK import → timeout. Fix: add `analyzeDag: vi.fn()` and `routeSession: vi.fn()` to `makeCoordWithDeps` deps object |
| CLN-02 | Phase 149 VALIDATION.md reaches nyquist_compliant: true with wave_0_complete: true | Both conditions already met at execution time (30/30 tests pass, all wave 0 files exist). VALIDATION.md frontmatter was never updated post-execution |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 4.1.1 (project), 4.1.2 (latest) | Test runner with vi.fn() stubs | Already installed, project-wide test runner |
| Node.js | v20.20.0 | Runtime | Project runtime |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js built-in test runner | N/A | Alternative if needed | Not used — project uses vitest |

**Installation:** No new dependencies required.

## Architecture Patterns

### Pattern 1: DispatchCoordinator Dependency Injection (Existing)

**What:** DispatchCoordinator accepts all dependencies through `opts._deps`. When a key is missing from `_deps`, it falls back to the production module-level require. Tests must inject stubs for every function the test exercises — missing stubs cause real production code to execute.

**When to use:** Every time a new method is added to DispatchCoordinator that calls an injectable dependency.

**The existing pattern in coordinator.cjs:**
```javascript
// These two lines already exist and work correctly:
this._analyzeDag = deps.analyzeDag || analyzeDag;      // real: orchestrator.cjs
this._routeSession = deps.routeSession || routeSession; // real: remote-router.cjs
```

**The gap in makeCoordWithDeps (coordinator-smoke.test.cjs):**
```javascript
// Current state — MISSING stubs:
const deps = {
  spawnSession: vi.fn(...),
  createWorktree: vi.fn(...),
  removeWorktree: vi.fn(),
  deleteBranch: vi.fn(),
  mergeSession: vi.fn(() => ({ ok: true, conflicts: [] })),
  recalculateFromArtifacts: vi.fn(() => ({ updated: true })),
  acquireLock: vi.fn(() => ({ acquired: true, lockPath: '/fake/lock' })),
  releaseLock: vi.fn(),
  // analyzeDag: MISSING — falls through to real orchestrator.cjs → sdkQuery → ESM import
  // routeSession: MISSING — falls through to real remote-router.cjs
};
```

**The fix:**
```javascript
// Add to deps in makeCoordWithDeps:
analyzeDag: vi.fn(async () => ({ parallelizable: [], unsafe: [] })),
routeSession: vi.fn(async () => 'local'),
```

**Why these return values:**
- `analyzeDag` must return a Promise resolving to `{ parallelizable: [], unsafe: [] }` — coordinator uses `await this._analyzeDag(root)` and caches the result. An empty dag is valid and non-blocking.
- `routeSession` must return a Promise resolving to `'local'` — coordinator uses `await this._routeSession(...)` and routes to `_runSession` (local) vs `_runRemoteSession` (ssh). `'local'` matches the existing spawnSession stub behavior.

### Pattern 2: Nyquist VALIDATION.md Lifecycle

**What:** VALIDATION.md documents the test strategy before implementation. Post-execution, the sign-off checklist and frontmatter must be updated to reflect actual status. The Nyquist framework checks `nyquist_compliant: true` in frontmatter as the final gate.

**Two-state transition:**
- **Pre-execution:** `nyquist_compliant: false`, `wave_0_complete: false`, checklist items unchecked
- **Post-execution:** `nyquist_compliant: true`, `wave_0_complete: true`, checklist items checked

**Phase 149 VALIDATION.md current state:**
- Frontmatter: `nyquist_compliant: false`, `wave_0_complete: false`
- Wave 0 requirements list: both files listed as `❌ W0` (wave 0 gap)
- Sign-off checklist: all items unchecked

**Phase 149 actual post-execution state (from VERIFICATION.md):**
- `tests/dispatcher/config-dispatch.test.cjs` — EXISTS, 20 tests, all passing
- `tests/dispatcher/sessions.test.cjs` — EXISTS, 10 tests, all passing
- All wave 0 files exist and contain substantive tests
- All 5 requirements (CFG-01 through CFG-05) satisfied

**Fix required:** Update VALIDATION.md frontmatter and sign-off to reflect the verified post-execution state.

### Recommended Project Structure

No structural changes needed. This phase modifies two existing files:
```
tests/dispatcher/
└── coordinator-smoke.test.cjs    # CLN-01: add 2 stubs to makeCoordWithDeps

.planning/phases/149-configuration-commands/
└── 149-VALIDATION.md             # CLN-02: update frontmatter + sign-off
```

### Anti-Patterns to Avoid

- **Adding stubs to individual tests instead of makeCoordWithDeps:** Tests 1-6 and 8-9 rely on makeCoordWithDeps. Adding stubs only to Test 7 would leave other tests vulnerable if dispatchWave is called in future tests. Add stubs to the shared helper.
- **Using vi.mock() for CJS modules:** The project's established pattern (documented in multiple phase decisions) is DI via `_deps`, not vi.mock(). Do not change the approach.
- **Updating VALIDATION.md status column without verifying task completion:** The per-task status column should reflect actual test run results, not optimistic estimates. Verify each test command passes before marking green.
- **Setting nyquist_compliant: true without updating wave_0_complete:** Both fields must be updated together — `wave_0_complete: true` is a prerequisite for `nyquist_compliant: true`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SDK stub behavior | Custom async class mimicking SDK | `vi.fn(async () => ({ parallelizable: [], unsafe: [] }))` | vi.fn() handles async correctly; orchestrator.cjs already has try/catch for SDK failures |
| Routing stub | Real routeSession logic in test | `vi.fn(async () => 'local')` | Test only needs the coordinator to take the local path; real routing logic is tested in remote-router.test.cjs |

## Common Pitfalls

### Pitfall 1: Wrong Return Type for analyzeDag Stub

**What goes wrong:** Test 7 hangs or throws "Cannot read property of undefined" instead of passing.

**Why it happens:** `dispatchWave` caches the result: `this._dag = await this._analyzeDag(root)`. If the stub returns `undefined` or a non-object, subsequent calls to `overlap.overlapping` throw. If the stub returns a non-Promise, the `await` still works but `this._dag` may be undefined.

**How to avoid:** Return `{ parallelizable: [], unsafe: [] }` from an async vi.fn(). Explicitly `async` ensures the stub returns a Promise.

**Warning signs:** Test 7 fails with TypeError about `.overlapping` rather than a timeout.

### Pitfall 2: Wrong Return Type for routeSession Stub

**What goes wrong:** Test 7 triggers `_runRemoteSession` instead of `_runSession`, causing the test to fail because `spawnRemoteSession` has no stub (deps.spawnRemoteSession is not injected).

**Why it happens:** `dispatch` branches on `backend === 'ssh'` → `_runRemoteSession`. If routeSession returns `'ssh'`, it tries to call the real `spawnRemoteSession`.

**How to avoid:** Return `'local'` from the routeSession stub. This ensures the existing `spawnSession` stub is used.

**Warning signs:** Test throws about SSH connection or undefined `spawnRemoteSession`.

### Pitfall 3: checkFileOverlap Not Needing a Stub

**What goes wrong:** Over-engineering — adding a stub for `checkFileOverlap` when it's not needed.

**Why it happens:** `checkFileOverlap` is a synchronous function that reads PLAN.md files from the temp directory. Since `makeTempRoot()` creates an empty .planning directory with no PLAN.md files, `checkFileOverlap` returns `{ overlapping: [] }` — it does not hang or throw.

**How to avoid:** Only add stubs for `analyzeDag` (async SDK call) and `routeSession` (async call). `checkFileOverlap` works correctly against empty temp directories.

### Pitfall 4: Phase 149 VALIDATION.md Task Status Column

**What goes wrong:** Updating only the frontmatter and sign-off, leaving per-task status as "⬜ pending".

**Why it happens:** The per-task status column mirrors the test execution record. Leaving it as pending makes the VALIDATION.md internally inconsistent (frontmatter says compliant, body says pending).

**How to avoid:** Update per-task status column from "⬜ pending" to "✅ green" for tasks backed by confirmed-passing tests. CFG-04 (source-inspection / manual) can be marked "✅ green" per VERIFICATION.md evidence.

### Pitfall 5: VALIDATION.md Wave 0 File Status Column

**What goes wrong:** Leaving "❌ W0" in the "File Exists" column after wave 0 files have been created.

**Why it happens:** The ❌ W0 notation means "does not exist yet, will be created in Wave 0." After execution, it should reflect "✅" (file exists).

**How to avoid:** Update both per-task rows to show "✅" in the File Exists column for `config-dispatch.test.cjs` and `sessions.test.cjs`.

## Code Examples

### CLN-01: Corrected makeCoordWithDeps (coordinator-smoke.test.cjs)

```javascript
// Source: analysis of coordinator.cjs lines 129, 137, 258-283
function makeCoordWithDeps(root, extraOpts) {
  let capturedOnExit;
  let capturedOnLine;

  const deps = {
    spawnSession: vi.fn((opts) => {
      capturedOnExit = opts.onExit;
      capturedOnLine = opts.onLine;
      return { pid: 9001, kill: vi.fn() };
    }),
    createWorktree: vi.fn((r, sid) => ({
      worktreePath: path.join(r, '.sessions', sid),
      branch: 'pde/session/' + sid,
    })),
    removeWorktree: vi.fn(),
    deleteBranch: vi.fn(),
    mergeSession: vi.fn(() => ({ ok: true, conflicts: [] })),
    recalculateFromArtifacts: vi.fn(() => ({ updated: true })),
    acquireLock: vi.fn(() => ({ acquired: true, lockPath: '/fake/lock' })),
    releaseLock: vi.fn(),
    // CLN-01: inject SDK orchestrator stubs — prevents real sdkQuery ESM import
    analyzeDag: vi.fn(async () => ({ parallelizable: [], unsafe: [] })),
    routeSession: vi.fn(async () => 'local'),
  };
  // ... rest unchanged
}
```

### CLN-02: Phase 149 VALIDATION.md frontmatter update

```yaml
---
phase: 149
slug: configuration-commands
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-27
---
```

### CLN-02: Per-task status update pattern

```markdown
| 149-01-01 | 01 | 0 | CFG-01 | unit | `npx vitest run tests/dispatcher/config-dispatch.test.cjs` | ✅ | ✅ green |
| 149-01-02 | 01 | 0 | CFG-02, CFG-03 | unit | `npx vitest run tests/dispatcher/sessions.test.cjs` | ✅ | ✅ green |
```

### CLN-02: Sign-off checklist update pattern

```markdown
## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete — 30/30 tests passing, all CFG-01 through CFG-05 verified
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 |
| Config file | vitest.config.ts (project root) |
| Quick run command | `npx vitest run tests/dispatcher/coordinator-smoke.test.cjs` |
| Full suite command | `npx vitest run tests/dispatcher/` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLN-01 | Test 7 passes (no timeout) | unit — test file edit | `npx vitest run tests/dispatcher/coordinator-smoke.test.cjs` | ✅ (exists, 1 test currently failing) |
| CLN-02 | VALIDATION.md frontmatter updated | doc edit | `head -5 .planning/phases/149-configuration-commands/149-VALIDATION.md` | ✅ (exists, needs frontmatter update) |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/dispatcher/coordinator-smoke.test.cjs`
- **Per wave merge:** `npx vitest run tests/dispatcher/`
- **Phase gate:** Full suite green (221/221) before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements. Both files to be modified exist.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Test runtime | ✓ | v20.20.0 | — |
| vitest | Test runner | ✓ | 4.1.1 | — |
| coordinator-smoke.test.cjs | CLN-01 | ✓ | — | — |
| 149-VALIDATION.md | CLN-02 | ✓ | — | — |

**Missing dependencies with no fallback:** None.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| vi.mock() for CJS module mocking | DI via opts._deps | Phase 144 | Avoids CJS hoisting issues; stubs must be added to helper when new injectable deps are added |
| Single VALIDATION.md status | Frontmatter gates (nyquist_compliant, wave_0_complete) | Phase 143+ | Allows automated compliance checks; requires explicit post-execution update |

## Open Questions

1. **Should `checkFileOverlap` also get a stub?**
   - What we know: `checkFileOverlap` is synchronous and reads from the filesystem; with empty temp directories it returns `{ overlapping: [] }` cleanly
   - What's unclear: Whether future tests will call dispatchWave with real PLAN.md files that checkFileOverlap could find
   - Recommendation: No stub needed for this phase — checkFileOverlap handles empty directories correctly; the current test creates an empty .planning/ dir via `makeTempRoot()`

2. **Should `summarizeFailure` and `triageConflicts` stubs also be added?**
   - What we know: These are only called in `_handleExit`, not in `dispatchWave`. Test 7 only calls `dispatchWave` and doesn't trigger exit handlers.
   - What's unclear: N/A
   - Recommendation: No — these are not exercised by Test 7 and are already protected by try/catch in coordinator.cjs

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `/packages/dispatcher/lib/coordinator.cjs` lines 129, 137, 258-283 — confirms `_analyzeDag` and `_routeSession` injection points
- Direct code inspection: `/tests/dispatcher/coordinator-smoke.test.cjs` lines 36-71 — confirms missing stubs
- Live test run: `npx vitest run tests/dispatcher/coordinator-smoke.test.cjs` — confirms Test 7 timeout at 15,000 ms
- Direct code inspection: `packages/dispatcher/lib/orchestrator.cjs` lines 19-44 — confirms `analyzeDag` calls `sdkQuery` → dynamic ESM import
- Direct code inspection: `packages/dispatcher/lib/remote-router.cjs` lines 39-60 — confirms `routeSession` resolves immediately to 'local' when no remoteConfig
- Direct code inspection: `.planning/phases/149-configuration-commands/149-VALIDATION.md` — confirms `nyquist_compliant: false`, `wave_0_complete: false`
- Direct code inspection: `.planning/phases/149-configuration-commands/149-VERIFICATION.md` — confirms 30/30 tests pass, all requirements verified

### Secondary (MEDIUM confidence)
- Live test run: `npx vitest run tests/dispatcher/config-dispatch.test.cjs tests/dispatcher/sessions.test.cjs` — 30/30 passing, confirming CLN-02 precondition

## Metadata

**Confidence breakdown:**
- CLN-01 root cause: HIGH — confirmed by code inspection + live failing test run
- CLN-01 fix: HIGH — follows existing DI pattern documented across phases 144-148
- CLN-02 fix: HIGH — direct frontmatter inspection + passing test evidence
- No external library research needed — purely internal codebase repair

**Research date:** 2026-03-27
**Valid until:** N/A — single-execution fix phase, no ongoing validity concern
