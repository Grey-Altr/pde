# Phase 155: Retry & Documentation Polish - Research

**Researched:** 2026-03-27
**Domain:** React UX (disabled-button tooltip), env var documentation
**Confidence:** HIGH

## Summary

Phase 155 is a pure UX polish and documentation phase. It closes two integration gaps identified in the v0.18 milestone audit: INT-RETRY-STUB (Retry button non-functional, visible without explanation) and INT-PDE-REMOTE-DOC (PDE_REMOTE env var undocumented on the operator side). No new requirements, no new libraries needed, and no new server-side logic required.

The Retry button in `FailureCard` currently calls `retrySession()` which always returns `{ ok: false, error: 'retry-requires-local-dispatcher' }`. The fix is purely UI: render the button as `disabled` with a tooltip or `title` attribute explaining why, so the operator understands this is an architectural limitation rather than a bug.

The documentation gap requires adding a comment to `dashboard/.env.example` and to the `dispatch` error text in `packages/dispatcher/lib/coordinator.cjs` where `PDE_REMOTE` is consumed.

**Primary recommendation:** Disable Retry button via `disabled` + HTML `title` attribute in `FailureCard`. Use `@base-ui/react/tooltip` only if tooltip must be keyboard-accessible on hover of a disabled element. Add `PDE_REMOTE` comment to `.env.example` and a JSDoc/comment in `coordinator.cjs` `_spawnRelay`.

## Standard Stack

### Core (already installed — no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@base-ui/react` | ^1.3.0 | Accessible UI primitives | Already in use (AlertDialog in FailureCard) |
| React | latest | Component rendering | Project standard |
| Tailwind CSS | latest | Styling | Project standard |
| Vitest | latest | Test framework | Project standard |

### Available but unused in FailureCard

| Component | Import Path | When to Use |
|-----------|-------------|-------------|
| `Tooltip` | `@base-ui/react/tooltip` | Use if tooltip on a disabled element is needed keyboard-accessible |

No new packages to install.

### Tooltip API (from installed node_modules — HIGH confidence)

`@base-ui/react` v1.3.0 ships a `Tooltip` namespace with these composable parts:

```typescript
import { Tooltip } from '@base-ui/react/tooltip';
// Parts: Tooltip.Provider, Tooltip.Root, Tooltip.Trigger,
//        Tooltip.Portal, Tooltip.Positioner, Tooltip.Popup, Tooltip.Arrow
```

`Tooltip.Root` props:
- `disabled?: boolean` — when `true`, tooltip does not open
- `defaultOpen?: boolean`
- `open?: boolean`
- `onOpenChange?: (open: boolean) => void`

`Tooltip.Trigger` renders a `<button>` by default, but accepts `render` prop for custom element.

**Critical pitfall for disabled buttons:** A native `disabled` button swallows pointer events, so `Tooltip.Trigger` wrapping a `disabled` button will NOT fire `mouseenter`/`focus`. Standard workaround: wrap the `<button>` in a `<span>` that acts as the trigger, or use `pointer-events: none` + `tabIndex={-1}` styling on the button while keeping the trigger element enabled.

**Simpler alternative verified to work:** HTML `title` attribute on a `<button disabled>` renders a native browser tooltip on hover. Sufficient for this use case since the requirement says "tooltip explaining the limitation" — it does not require an animated/styled tooltip. The audit note says "disable button with tooltip" without specifying implementation level.

**Recommendation:** Use `title="Retry requires a local dispatcher — use the CLI to re-dispatch"` on the disabled button. This is zero-overhead, no new component code, passes source-inspection tests, and satisfies the requirement. Escalate to `@base-ui/react/tooltip` only if human review demands a styled tooltip.

## Architecture Patterns

### Pattern 1: Conditional Disable with Explanation (project pattern)

The project uses source-inspection tests (readFileSync approach, not DOM rendering). This means:
- Test validates `source.toContain('disabled')` and `source.toContain('title=')` patterns
- No jsdom / @testing-library/react needed
- Tests follow the existing failure-card.test.ts pattern

```typescript
// Source: dashboard/components/failure-card.tsx (existing pattern)
// Pattern: check onRetry presence to determine if retry is possible
const retryDisabled = submitting || !onRetry;

<button
  type="button"
  className="flex-1 min-h-[44px] min-w-[44px] rounded-md bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  onClick={handleRetry}
  disabled={submitting || true}  // always disabled — retry requires local dispatcher
  title="Retry requires a local dispatcher — use the CLI to re-dispatch this session"
>
  Retry
</button>
```

**Cleaner approach:** use a component-level constant:

```typescript
// In FailureCard component body:
const RETRY_AVAILABLE = false; // Requires local dispatcher — not available from dashboard

// In JSX:
<button
  type="button"
  className="... disabled:opacity-50 disabled:cursor-not-allowed"
  onClick={handleRetry}
  disabled={submitting || !RETRY_AVAILABLE}
  title={!RETRY_AVAILABLE ? 'Retry requires a local dispatcher — run `pde dispatch` from the CLI' : undefined}
>
  Retry
</button>
```

### Pattern 2: .env.example Documentation (project pattern)

```bash
# Source: dashboard/.env.example (existing style)

# Required for relay event pipeline — dashboard ingest URL.
# Set this on the machine running the dispatcher (not in Vercel production).
# Example: PDE_REMOTE=https://your-dashboard.vercel.app/api/ingest
# The dispatcher's relay.cjs uses this to POST NDJSON events to the dashboard.
PDE_REMOTE=https://your-dashboard.example.com/api/ingest
```

Current `.env.example` has 9 lines with inline comments. The PDE_REMOTE entry belongs in the operator-setup section (it is local-machine-only, like `PDE_PROJECT_ROOT`).

### Pattern 3: coordinator.cjs _spawnRelay JSDoc

```javascript
// Source: packages/dispatcher/lib/coordinator.cjs line 474 (existing comment)
// Enhancement: document env var clearly in the JSDoc block

/**
 * Spawn a relay.cjs child process for a session. Returns handle or null.
 * Per D-04: detached + unref. Per D-06: returns null when PDE_REMOTE not set.
 * Per D-07: all errors caught — relay failures never surface.
 *
 * Required env vars:
 *   PDE_REMOTE      — Dashboard ingest URL (e.g. https://your-dashboard.vercel.app/api/ingest).
 *                     When absent, relay is silently skipped (no dashboard events).
 *   PDE_RELAY_TOKEN — Bearer token matching dashboard PDE_RELAY_TOKEN.
 *                     When absent, ingest route may reject with 401.
 *
 * @param {string} sessionId - UUID v4 for relay correlation
 * @returns {{ pid: number, kill: Function }|null}
 * @private
 */
```

### Anti-Patterns to Avoid

- **Wrapping disabled button in span for tooltip:** Adds DOM complexity, introduces test surface area. Not needed when `title` attribute satisfies requirement.
- **Adding RETRY_AVAILABLE as a prop:** The limitation is architectural, not per-session. A component-level constant is cleaner than a prop the caller must always set to `false`.
- **Removing onRetry prop:** The prop is tested by `hardening-hdn.test.ts` line 191 (`onRetry={retrySession}`). Removing it would break an existing test. The button must remain, just disabled.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tooltip on disabled button | Custom hover state logic | HTML `title` attribute | Native, zero-code, accessibility-compatible |
| Styled tooltip | Custom floating div | `@base-ui/react/tooltip` (already installed) | Already in the dependency tree |
| env var registry | Custom documentation system | `.env.example` + JSDoc | Project already uses these patterns |

## Common Pitfalls

### Pitfall 1: Disabled Button Swallows Mouse Events
**What goes wrong:** `<button disabled>` does not fire `mouseenter`/`focus`, so a `Tooltip.Trigger` wrapping it produces no tooltip.
**Why it happens:** HTML spec — disabled form elements do not participate in events.
**How to avoid:** Use `title` attribute (native browser tooltip fires regardless) OR wrap in a `pointer-events` span.
**Warning signs:** Tooltip appears in source but never shows in browser.

### Pitfall 2: Breaking Existing Source-Inspection Tests
**What goes wrong:** Renaming or removing JSX attributes breaks tests like `expect(source).toContain('onRetry')`.
**Why it happens:** `failure-card.test.ts` and `hardening-hdn.test.ts` use `readFileSync` + string matching.
**How to avoid:** Keep `onRetry`, `onAbandon`, `onKill` props. Keep `disabled={submitting}` pattern — add `|| !RETRY_AVAILABLE` rather than replacing. Keep button count (3 buttons still get `min-h-[44px]`).
**Warning signs:** Any test grep for `onRetry` or `disabled={submitting}` fails.

### Pitfall 3: Adding PDE_REMOTE to Wrong .env File
**What goes wrong:** Adding PDE_REMOTE to the Vercel-deployed dashboard's env vars — it should be on the local dispatcher machine.
**Why it happens:** Confusion between "dashboard env vars" (Vercel secrets) and "dispatcher env vars" (local machine).
**How to avoid:** Comment clearly: "Set on the machine running the dispatcher. Not needed in Vercel production."
**Warning signs:** Operator sets PDE_REMOTE in Vercel dashboard instead of local env.

### Pitfall 4: Test Count Regressions
**What goes wrong:** Adding a new `disabled` prop expression without preserving the existing `disabled={submitting}` count breaks `expect(disabledMatches.length).toBeGreaterThanOrEqual(3)`.
**Why it happens:** Test counts occurrences of `disabled={submitting}` literally.
**How to avoid:** Do not replace `disabled={submitting}` — extend it: `disabled={submitting || !RETRY_AVAILABLE}`. This still matches the regex `disabled=\{submitting\}` if the regex is non-strict OR update the test to match the new pattern. Check the test expectation first.

**Detailed check:** `failure-card.test.ts` line 52:
```typescript
const disabledMatches = source.match(/disabled=\{submitting\}/g) ?? [];
expect(disabledMatches.length).toBeGreaterThanOrEqual(3);
```
The regex `/disabled=\{submitting\}/g` will NOT match `disabled={submitting || !RETRY_AVAILABLE}`. The test will break unless either:
- (a) The test is updated to match a looser pattern, or
- (b) A separate `disabled` attribute is added to the Retry button for the RETRY_AVAILABLE check, keeping `disabled={submitting}` on all three buttons unchanged.

**Resolution:** Keep `disabled={submitting}` on all three buttons unchanged. Add a separate structural guard via `aria-disabled` or a wrapper approach. OR: update the source-inspection test to count `disabled=` occurrences more loosely. The planner must choose approach (a) or (b) — both are valid.

## Code Examples

### Retry Button: Disable with title (no tooltip component)

```typescript
// Source: dashboard/components/failure-card.tsx (proposed change)
// Satisfies: INT-RETRY-STUB

// Add constant at module or component level:
const RETRY_AVAILABLE = false;
// Note: retry requires local dispatcher — re-dispatch must happen via CLI

// In JSX (Retry button only — Abandon/Kill unchanged):
<button
  type="button"
  className="flex-1 min-h-[44px] min-w-[44px] rounded-md bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  onClick={handleRetry}
  disabled={submitting}
  aria-disabled={!RETRY_AVAILABLE || submitting}
  title={!RETRY_AVAILABLE ? 'Retry requires a local dispatcher — use the CLI to re-dispatch' : undefined}
>
  Retry
</button>
```

Using `aria-disabled` for the RETRY_AVAILABLE gate and keeping `disabled={submitting}` unchanged preserves the existing test assertion count.

### .env.example addition

```bash
# Source: dashboard/.env.example (proposed addition)
# Dispatcher machine only: URL for relay to POST NDJSON events to dashboard.
# Not needed in Vercel production — only set on the machine running `pde dispatch`.
# Example: https://your-dashboard.vercel.app/api/ingest
PDE_REMOTE=
```

### coordinator.cjs _spawnRelay JSDoc addition

```javascript
// Source: packages/dispatcher/lib/coordinator.cjs line ~472
// Add to existing JSDoc:
//
// Required env vars (set on dispatcher machine):
//   PDE_REMOTE      — Dashboard ingest URL (e.g. https://dash.example.com/api/ingest)
//                     When absent, relay silently skipped (D-06).
//   PDE_RELAY_TOKEN — Bearer token matching dashboard PDE_RELAY_TOKEN env var.
```

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (latest) |
| Config file | `dashboard/vitest.config.ts` |
| Quick run command | `cd dashboard && npm test` |
| Full suite command | `cd dashboard && npm test -- --reporter=verbose` |
| Environment | node (no jsdom) |

### Current State: 217 tests passing (29 test files) — confirmed green 2026-03-27.

### Phase Requirements → Test Map

| Req | Behavior | Test Type | Automated Command | File Exists? |
|-----|----------|-----------|-------------------|-------------|
| INT-RETRY-STUB | Retry button renders disabled with tooltip when no local dispatcher | source-inspection | `cd dashboard && npm test` | ✅ `__tests__/failure-card.test.ts` (needs new assertions) |
| INT-PDE-REMOTE-DOC | PDE_REMOTE documented in .env.example | source-inspection | `cd dashboard && npm test` | ❌ Wave 0 gap — new test assertions needed |
| INT-PDE-REMOTE-DOC | PDE_REMOTE documented in coordinator _spawnRelay JSDoc | source-inspection (cjs) | dispatcher test suite | ❌ Wave 0 gap (optional — comment only, low value) |

### Sampling Rate
- **Per task commit:** `cd dashboard && npm test`
- **Per wave merge:** `cd dashboard && npm test -- --reporter=verbose`
- **Phase gate:** Full suite green (217+ tests) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] New assertions in `dashboard/__tests__/failure-card.test.ts`:
  - `it('Retry button has aria-disabled or title attribute explaining limitation')`
  - `it('Retry button has disabled:cursor-not-allowed class')`
- [ ] New assertion or test for `.env.example` containing `PDE_REMOTE`:
  - Can be added to an existing test file or as a standalone `env-example.test.ts`

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Test runner | ✓ | system | — |
| npm | Test runner | ✓ | system | — |
| `@base-ui/react` tooltip | Optional styled tooltip | ✓ (installed) | ^1.3.0 | HTML `title` attr |

No missing dependencies. No blocking items.

## Sources

### Primary (HIGH confidence)
- Installed `@base-ui/react` node_modules — tooltip component API verified from `index.parts.d.ts`
- `dashboard/components/failure-card.tsx` — current component source, verified directly
- `dashboard/app/actions.ts` — retrySession stub, verified directly
- `dashboard/__tests__/failure-card.test.ts` — existing test assertions, verified directly
- `dashboard/__tests__/hardening-hdn.test.ts` — existing HDN-02 tests, verified directly
- `dashboard/.env.example` — current content verified directly
- `packages/dispatcher/lib/coordinator.cjs` line 474–484 — _spawnRelay PDE_REMOTE consumption, verified directly
- `packages/dispatcher/lib/remote-ssh.cjs` line 106–116 — PDE_REMOTE env var usage in SSH envPrefix, verified directly
- `.planning/v0.18-MILESTONE-AUDIT.md` — INT-RETRY-STUB and INT-PDE-REMOTE-DOC gap definitions

### Secondary (MEDIUM confidence)
- HTML spec: disabled buttons do not fire pointer events (widely documented, relied upon by failure-card.test.ts structure)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, all installed and verified
- Architecture: HIGH — patterns verified from existing source files
- Pitfalls: HIGH — derived from reading existing test assertions literally
- Tooltip approach: HIGH — `@base-ui/react/tooltip` API verified from installed node_modules

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable — no external dependencies, pure in-repo changes)
