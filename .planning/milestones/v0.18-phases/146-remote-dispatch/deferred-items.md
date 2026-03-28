
## Plan 03 discoveries

### coordinator-smoke.test.cjs Test 7 timeout (pre-existing)
- **Found during:** Task 1 verification
- **Issue:** Test 7 in coordinator-smoke.test.cjs (dispatchWave dispatches multiple plans) times out at 15000ms
- **Root cause:** makeCoordWithDeps helper does not inject analyzeDag or routeSession stubs — real implementations are called, real analyzeDag invokes the Agent SDK which hangs without credentials
- **Confirmed pre-existing:** Reverting Plan 03 changes and re-running showed same timeout
- **Fix needed:** Update makeCoordWithDeps in coordinator-smoke.test.cjs to inject all Phase 145/146 SDK deps as vi.fn() stubs
- **Scope:** Out-of-scope for Plan 03 (pre-existing issue not caused by this plan's changes)
