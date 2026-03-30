# Phase 194: Intelligent Routing - Research

**Researched:** 2026-03-30
**Domain:** Dispatcher routing classification — pure function classifier inserted into coordinator.dispatch()
**Confidence:** HIGH

## Summary

Phase 194 adds a classifier layer between `routeSession()` and `acquireLock()` in `coordinator.dispatch()`. The classifier is a new pure function module `packages/dispatcher/lib/classify.cjs` that takes the initial backend from `routeSession()` plus metadata from PLAN.md frontmatter, config overrides, CLI flags, and fast-path state, and returns a final backend decision with a reason string. No LLM calls, no I/O — everything is synchronous and injectable.

The implementation has two main pieces: (1) `classifyTaskRouting()` in classify.cjs which encodes the priority-ordered decision tree, and (2) extending `readPlanAutonomous()` into `readPlanMetadata()` in coordinator.cjs to parse `estimated_minutes`, `agent_type`, and `wave` in addition to `autonomous`. Four new config keys are registered in `bin/lib/config.cjs`. Routing decisions are emitted as structured events through the existing aggregator infrastructure, matching the `routing_fallback` event pattern already used in Phase 193. A `--dispatch=<backend>` CLI flag is wired into the `dispatch` case in `pde-tools.cjs` and forwarded as `dispatchOverride` to `classifyTaskRouting()`.

Six requirements (RTG-01 through RTG-06) are all satisfied by these two modules plus their wiring.

**Primary recommendation:** Build classify.cjs as a standalone pure module tested in isolation, wire it into coordinator after `routeSession()` with full DI injection, then add config keys and CLI flag last.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Classification Architecture**
- Classifier location: New `packages/dispatcher/lib/classify.cjs` — pure function, no side effects, testable in isolation
- Cost estimation: Simple lookup table — `{cloud: 0.50, docker: 0.10, ssh: 0.05, local: 0.00}` per minute × estimated_minutes from PLAN.md frontmatter — no LLM call, returns in <1ms
- Fast-path detection: `opts.isFastPath` boolean passed from skill entry point — /pde:quick and /pde:fast set it before calling dispatch
- Force override: `dispatch.routing.override.{phase}` = backend name in config.json per phase

**Integration & Testing**
- Insertion point: After routeSession(), before lock in coordinator.dispatch() — classifier adjusts the backend BEFORE any resources are allocated
- New config keys (4):
  - `dispatch.routing.cost_ceiling` — global $/session ceiling (default: null = no ceiling)
  - `dispatch.routing.cost_per_minute.cloud` — $/min for cloud backend (default: 0.50)
  - `dispatch.routing.cost_per_minute.docker` — $/min for docker (default: 0.10)
  - `dispatch.routing.override.{phase}` — force backend for specific phase
  - `dispatch.routing.fast_path_local` — bool, default true (fast-path always local)
- Test strategy: Pure unit tests for classify.cjs (sync, no I/O) + integration tests in coordinator for wiring

### Claude's Discretion

None specified in CONTEXT.md.

### Deferred Ideas (OUT OF SCOPE)

- ML-based routing based on historical session performance — future milestone
- Real-time cost tracking during execution — future (needs cloud billing API)
- Dynamic threshold adjustment based on queue depth — out of scope for v0.24
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RTG-01 | User can manually set dispatch target via `--dispatch=cloud\|local\|ssh\|docker` flag | CLI flag parsed in pde-tools.cjs dispatch case, passed as `dispatchOverride` to classifyTaskRouting(); reason='manual_override' |
| RTG-02 | Auto-classify tasks as interactive/autonomous from PLAN.md metadata (agent_type, estimated_minutes) | readPlanMetadata() extends readPlanAutonomous() via same regex frontmatter parse; classify.cjs uses planMetadata.agent_type |
| RTG-03 | User can override auto-classification for any plan or phase | `dispatch.routing.override.{phase}` config key + `dispatchOverride` CLI flag both map to reason='manual_override' in classifier |
| RTG-04 | Cost-aware routing respects user-configured cost ceiling per dispatch target | classifyTaskRouting() computes estimatedCost = costPerMinute[backend] × planMetadata.estimated_minutes; if > ceiling, downgrade backend |
| RTG-05 | Routing decision is logged as a structured event for observability | classifier returns `events` array; coordinator emits each via aggregator.emit('event', 'system', event) matching existing routing_fallback pattern |
| RTG-06 | Fast-path commands (/pde:quick, /pde:fast) always route to local regardless of config | isFastPath + fastPathLocal config drive first-priority rule in classifyTaskRouting(); reason='fast_path' |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-ins (fs, path, crypto) | — | Frontmatter parsing, path resolution | No deps; matches existing coordinator/orchestrator pattern |
| vitest (globals: true) | project-pinned | Unit and integration tests | Already configured; all dispatcher tests use vitest globals |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None new required | — | — | classify.cjs is pure: no require() beyond built-ins |

**Installation:** No new packages. All dependencies already present.

---

## Architecture Patterns

### Recommended Project Structure

```
packages/dispatcher/lib/
├── classify.cjs            # NEW — pure classifyTaskRouting() function
├── coordinator.cjs         # MODIFIED — wire classifyTaskRouting(), readPlanMetadata()
├── remote-router.cjs       # UNCHANGED — routeSession() remains pure
tests/dispatcher/
├── classify.test.cjs       # NEW — unit tests for classify.cjs
├── coordinator-routing.test.cjs  # NEW — integration tests for coordinator wiring
├── config-dispatch.test.cjs      # MODIFIED — add 4 new config key assertions
```

### Pattern 1: Pure Function Module (classify.cjs)

**What:** sync function, no I/O, all deps injected via args, returns `{ backend, reason, estimatedCost, events }`
**When to use:** Routing decision before any side-effectful operation (lock, worktree)
**Example:**
```javascript
// Source: CONTEXT.md specifics block + existing lock.cjs isPidAlive() pattern
'use strict';

function classifyTaskRouting({
  initialBackend,        // from routeSession()
  planMetadata,          // { autonomous, estimated_minutes, agent_type, wave }
  dispatchOverride,      // --dispatch=cloud|local|ssh|docker (from CLI) or null
  configOverrides,       // { override: { [phase]: backend } }  (dispatch.routing.override.*)
  costConfig,            // { ceiling, costPerMinute: { cloud, docker, ssh, local } }
  isFastPath,            // boolean
  fastPathLocal,         // boolean (config, default true)
  phase,                 // phase number — used to look up per-phase override
}) {
  const events = [];

  // Priority 1: Fast-path guard (RTG-06)
  if (isFastPath && fastPathLocal !== false) {
    return { backend: 'local', reason: 'fast_path', estimatedCost: 0, events };
  }

  // Priority 2: CLI --dispatch flag (RTG-01, RTG-03)
  if (dispatchOverride) {
    return { backend: dispatchOverride, reason: 'manual_override', estimatedCost: null, events };
  }

  // Priority 3: Per-phase config override (RTG-03)
  const phaseOverride = configOverrides && configOverrides.override && configOverrides.override[String(phase)];
  if (phaseOverride) {
    return { backend: phaseOverride, reason: 'manual_override', estimatedCost: null, events };
  }

  // Priority 4: Cost ceiling check (RTG-04)
  const costPerMinute = (costConfig && costConfig.costPerMinute) || { cloud: 0.50, docker: 0.10, ssh: 0.05, local: 0.00 };
  const minutes = (planMetadata && planMetadata.estimated_minutes) || 30;
  const estimatedCost = (costPerMinute[initialBackend] || 0) * minutes;
  if (costConfig && costConfig.ceiling !== null && costConfig.ceiling !== undefined
      && estimatedCost > costConfig.ceiling) {
    const downgraded = 'local'; // simple: downgrade to local when over ceiling
    events.push({ type: 'system', subtype: 'routing_cost_ceiling', from: initialBackend, to: downgraded, estimatedCost, ceiling: costConfig.ceiling });
    return { backend: downgraded, reason: 'cost_ceiling', estimatedCost, events };
  }

  // Priority 5: Auto-classify (RTG-02) — agent_type field from PLAN.md
  // (initialBackend already reflects autonomous detection via routeSession)
  return { backend: initialBackend, reason: 'auto_classify', estimatedCost, events };
}

module.exports = { classifyTaskRouting };
```

### Pattern 2: readPlanMetadata() Extension

**What:** Extend `readPlanAutonomous()` (coordinator.cjs) to parse additional frontmatter fields
**When to use:** Phase 194 integration; coordinator.dispatch() passes result to classifyTaskRouting()
**Example:**
```javascript
// Source: CONTEXT.md specifics + existing readPlanAutonomous() in coordinator.cjs lines 79-94
function readPlanMetadata(projectRoot, phase, plan) {
  const phasesDir = path.join(projectRoot, '.planning', 'phases');
  const padded = String(phase).padStart(3, '0');
  const planPadded = String(plan).padStart(2, '0');
  const defaults = { autonomous: false, estimated_minutes: 30, agent_type: null, wave: null };
  try {
    const phaseDirs = fs.readdirSync(phasesDir).filter(d => d.startsWith(padded + '-'));
    if (phaseDirs.length === 0) return defaults;
    const planFile = path.join(phasesDir, phaseDirs[0], padded + '-' + planPadded + '-PLAN.md');
    const content = fs.readFileSync(planFile, 'utf8');
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return defaults;
    const fm = fmMatch[1];
    const autonomous = /^autonomous:\s*true/m.test(fm);
    const minutesMatch = fm.match(/^estimated_minutes:\s*(\d+)/m);
    const agentTypeMatch = fm.match(/^agent_type:\s*(\S+)/m);
    const waveMatch = fm.match(/^wave:\s*(\d+)/m);
    return {
      autonomous,
      estimated_minutes: minutesMatch ? parseInt(minutesMatch[1], 10) : 30,
      agent_type: agentTypeMatch ? agentTypeMatch[1] : (autonomous ? 'autonomous' : null),
      wave: waveMatch ? parseInt(waveMatch[1], 10) : null,
    };
  } catch (_) {
    return defaults;
  }
}
```

### Pattern 3: Coordinator Wiring (insertion point)

**What:** Call classifyTaskRouting() after routeSession() and before acquireLock() in coordinator.dispatch()
**When to use:** Phase 194 wiring — the single integration change in coordinator.cjs

```javascript
// Source: coordinator.cjs lines 225-246 (existing dispatch() flow)
// AFTER: let backend = await this._routeSession(...)
// BEFORE: const lockResult = this._acquireLock(...)

const planMetadata = this._readPlanMetadata(this._root, phaseNum, planNum);
const routingConfig = this._routingConfig || {};
const classifyResult = this._classifyTaskRouting({
  initialBackend: backend,
  planMetadata,
  dispatchOverride: (opts && opts.dispatchOverride) || null,
  configOverrides: routingConfig,
  costConfig: {
    ceiling: routingConfig.cost_ceiling !== undefined ? routingConfig.cost_ceiling : null,
    costPerMinute: routingConfig.cost_per_minute || { cloud: 0.50, docker: 0.10, ssh: 0.05, local: 0.00 },
  },
  isFastPath: (opts && opts.isFastPath) || false,
  fastPathLocal: routingConfig.fast_path_local !== false,
  phase: phaseNum,
});
backend = classifyResult.backend;
// Emit routing events via aggregator
for (const evt of classifyResult.events) {
  this._aggregator.emit('event', 'system', evt);
}
// RTG-05: Always emit routing_decision event
this._aggregator.emit('event', 'system', {
  type: 'system',
  subtype: 'routing_decision',
  phase: phaseNum,
  plan: planNum,
  backend: classifyResult.backend,
  reason: classifyResult.reason,
  estimatedCost: classifyResult.estimatedCost,
});
```

### Pattern 4: Config Key Registration

**What:** Add 4 new keys to `VALID_CONFIG_KEYS` in `bin/lib/config.cjs`
**When to use:** Phase 194 — enables `pde config-set dispatch.routing.cost_ceiling 1.00`

```javascript
// Source: config.cjs VALID_CONFIG_KEYS pattern (lines 14-49)
// Note: dispatch.routing.override.{phase} is a DYNAMIC key — cannot enumerate all phases.
// Register the pattern key only; validation in cmdConfigSet must accept the prefix match.
'dispatch.routing.cost_ceiling',          // Phase 194: global $/session ceiling (null = no ceiling)
'dispatch.routing.cost_per_minute.cloud', // Phase 194: $/min for cloud backend (default: 0.50)
'dispatch.routing.cost_per_minute.docker',// Phase 194: $/min for docker backend (default: 0.10)
'dispatch.routing.fast_path_local',       // Phase 194: fast-path always local (default: true)
```

**Important:** `dispatch.routing.override.{phase}` is a dynamic key pattern. The config.cjs validation uses exact Set membership. Two options:
1. Register a wildcard-accepting validator for `dispatch.routing.override.*` prefix
2. Accept the key as-is since it follows dot-notation and setConfigValue handles arbitrary nesting

Recommended approach (matches lowest-friction pattern): Accept the key via a prefix check in cmdConfigSet. Add `dispatch.routing.override` as a registered key and document that `.{phase}` suffix is user-controlled. OR simply add it as a comment-documented key that bypasses the strict Set check. Look at how `dispatch.remote.env` (an object key) handles this — it is already in the Set as a literal.

Given `dispatch.routing.override.{phase}` is truly dynamic, the plan should include adding a prefix-matching escape hatch to cmdConfigSet OR accepting that users set these keys via direct JSON editing. The CONTEXT.md says "per phase in config.json" which implies direct JSON is acceptable.

### Anti-Patterns to Avoid

- **Calling classifyTaskRouting() after acquireLock():** The lock window must stay narrow. Classification is sync and fast (<1ms) but must stay outside the lock.
- **Re-routing after state sync push fails:** The fallback_to_local path in existing sync code already handles this. classifyTaskRouting() must not fight with it — it runs before sync.
- **Emitting routing_decision event inside classify.cjs:** The classifier returns events in an array; coordinator emits them. Classifier must have zero I/O.
- **Importing classify.cjs at module load time in coordinator:** Follow the lazy-require pattern only if needed; the module is pure so top-level require is fine.
- **Parsing YAML with a YAML library:** The codebase deliberately avoids YAML parsing deps — use regex as readPlanAutonomous() does.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cost per-minute lookup | Custom pricing API call | Inline constant object `{ cloud: 0.50, docker: 0.10, ssh: 0.05, local: 0.00 }` | CONTEXT.md locked decision: no LLM call, <1ms |
| YAML frontmatter parse | yaml/js-yaml library | Same regex pattern as readPlanAutonomous() | No deps, matches established pattern, test fixtures already exist |
| Event bus for routing events | New event emitter | `this._aggregator.emit('event', 'system', evt)` | Existing aggregator already handles system events; routing_fallback precedent set in Phase 193 |
| Per-phase override storage | External datastore | dot-notation config.json key via setConfigValue | Config already supports nested dot-notation writes |

**Key insight:** The classifier is purely a decision function — all "infrastructure" (events, config, locking) already exists. The new code surface is small.

---

## Common Pitfalls

### Pitfall 1: Dynamic config key `dispatch.routing.override.{phase}`

**What goes wrong:** `cmdConfigSet` uses exact Set membership check. `dispatch.routing.override.194` is not in VALID_CONFIG_KEYS, so `pde config-set dispatch.routing.override.194 cloud` throws "Unknown config key".
**Why it happens:** VALID_CONFIG_KEYS is a `new Set([...])` of string literals. Dynamic keys with phase numbers cannot be enumerated at code-write time.
**How to avoid:** Add prefix-match escape hatch in cmdConfigSet: if key starts with `'dispatch.routing.override.'`, allow it. Add the static prefix `'dispatch.routing.override'` as a comment in VALID_CONFIG_KEYS for documentation, and add the prefix check in the validation guard.
**Warning signs:** Test `config-dispatch.test.cjs` pattern checks exact string containment — the test for override keys needs to test the prefix check path, not Set membership.

### Pitfall 2: Cost ceiling null vs. 0 distinction

**What goes wrong:** `costConfig.ceiling === null` means "no ceiling" (default). `costConfig.ceiling === 0` means "always route to local" (zero tolerance). A falsy check `if (!costConfig.ceiling)` incorrectly treats `0` as "no ceiling".
**Why it happens:** Default config stores null for unconfigured ceiling. JavaScript `!null === true` and `!0 === true`.
**How to avoid:** Explicit null/undefined check: `if (costConfig.ceiling !== null && costConfig.ceiling !== undefined && estimatedCost > costConfig.ceiling)`.
**Warning signs:** Unit test with ceiling=0 and any non-local backend should route to local.

### Pitfall 3: opts.isFastPath undefined vs. false

**What goes wrong:** `opts.isFastPath` is undefined when coordinator.dispatch() is called without the fast-path flag. Downstream, `classifyTaskRouting({ isFastPath: undefined })` should not be treated as true.
**Why it happens:** Falsy coercion — `undefined || false` is fine, but `!!undefined === false` is also fine. The risk is in the opposite direction: if classify.cjs does `if (isFastPath)` this works correctly.
**How to avoid:** Always coerce: `isFastPath: (opts && opts.isFastPath) || false`. Document the boolean contract in the JSDoc.
**Warning signs:** Test for `opts = {}` (no isFastPath key) — should NOT trigger fast_path routing.

### Pitfall 4: requestedBackend calculation conflict with classify result

**What goes wrong:** coordinator.cjs lines 233-244 compute `requestedBackend` and emit `routing_fallback` for cloud→non-cloud degradation. After Phase 194, if classifyTaskRouting() downgrades cloud to local for cost reasons, BOTH the routing_fallback event AND the routing_decision event fire. This is expected behavior but can confuse dashboard consumers.
**Why it happens:** Two routing event emission paths — the Phase 193 cloud-fallback path and the new Phase 194 routing_decision path.
**How to avoid:** The Phase 193 fallback fires on route from routeSession() returning non-cloud when cloud was configured. Phase 194 fires on classify adjustments. They cover different decisions and both should fire. Document this in the event schema comments.
**Warning signs:** Integration test should assert that both events can fire in sequence without conflict.

### Pitfall 5: readPlanMetadata called twice (readPlanAutonomous migration)

**What goes wrong:** coordinator.cjs currently calls `this._readPlanAutonomous()` on line 223. After Phase 194, if readPlanMetadata() replaces it, the `autonomous` field must still be available for the existing `isAutonomous` variable.
**Why it happens:** refactor replaces one function call with another but the return shape changes.
**How to avoid:** readPlanMetadata() returns `{ autonomous, estimated_minutes, agent_type, wave }`. Extract `autonomous` from the result: `const planMetadata = this._readPlanMetadata(...); const isAutonomous = opts?.isAutonomous ?? planMetadata.autonomous;` The existing override path (`opts.isAutonomous !== undefined`) must still take precedence.
**Warning signs:** Tests that stub `_readPlanAutonomous` will break if it is renamed — update DI injection key in constructor accordingly, or keep both functions (readPlanAutonomous wraps readPlanMetadata).

---

## Code Examples

### classify.cjs: Decision priority ordering

```javascript
// Source: CONTEXT.md classifyTaskRouting() signature + decision rules
// Priority order (highest wins):
// 1. fast_path → 'local' (RTG-06)
// 2. CLI --dispatch override → <backend> (RTG-01)
// 3. per-phase config override → <backend> (RTG-03)
// 4. cost ceiling exceeded → downgrade (RTG-04)
// 5. auto_classify → initialBackend unchanged (RTG-02)
```

### Test pattern for classify.cjs

```javascript
// Source: remote-router.test.cjs pattern + pure function test approach
'use strict';
const { classifyTaskRouting } = require('../../packages/dispatcher/lib/classify.cjs');

describe('classifyTaskRouting', () => {
  const baseOpts = {
    initialBackend: 'cloud',
    planMetadata: { autonomous: true, estimated_minutes: 30, agent_type: 'autonomous', wave: 1 },
    dispatchOverride: null,
    configOverrides: {},
    costConfig: { ceiling: null, costPerMinute: { cloud: 0.50, docker: 0.10, ssh: 0.05, local: 0.00 } },
    isFastPath: false,
    fastPathLocal: true,
    phase: 194,
  };

  it('fast_path overrides everything', () => {
    const result = classifyTaskRouting({ ...baseOpts, isFastPath: true });
    expect(result.backend).toBe('local');
    expect(result.reason).toBe('fast_path');
  });

  it('CLI dispatchOverride overrides cost ceiling', () => {
    const result = classifyTaskRouting({
      ...baseOpts,
      dispatchOverride: 'docker',
      costConfig: { ceiling: 0, costPerMinute: baseOpts.costConfig.costPerMinute },
    });
    expect(result.backend).toBe('docker');
    expect(result.reason).toBe('manual_override');
  });

  it('cost ceiling 0 routes to local', () => {
    const result = classifyTaskRouting({ ...baseOpts, costConfig: { ceiling: 0, costPerMinute: baseOpts.costConfig.costPerMinute } });
    expect(result.backend).toBe('local');
    expect(result.reason).toBe('cost_ceiling');
    expect(result.events.length).toBeGreaterThan(0);
  });

  it('no ceiling passes through auto_classify', () => {
    const result = classifyTaskRouting(baseOpts);
    expect(result.backend).toBe('cloud');
    expect(result.reason).toBe('auto_classify');
  });
});
```

### Config key source inspection test (extending config-dispatch.test.cjs pattern)

```javascript
// Source: config-dispatch.test.cjs Tests 1-11 pattern
it('VALID_CONFIG_KEYS contains dispatch.routing.cost_ceiling', () => {
  expect(configSource).toContain("'dispatch.routing.cost_ceiling'");
});
it('VALID_CONFIG_KEYS contains dispatch.routing.cost_per_minute.cloud', () => {
  expect(configSource).toContain("'dispatch.routing.cost_per_minute.cloud'");
});
it('VALID_CONFIG_KEYS contains dispatch.routing.cost_per_minute.docker', () => {
  expect(configSource).toContain("'dispatch.routing.cost_per_minute.docker'");
});
it('VALID_CONFIG_KEYS contains dispatch.routing.fast_path_local', () => {
  expect(configSource).toContain("'dispatch.routing.fast_path_local'");
});
```

### pde-tools.cjs --dispatch flag parsing

```javascript
// Source: existing dispatch case lines 1432-1458 + established flag-parsing pattern
// Insert after dispatchPlan is parsed:
const dispatchIdx = args.indexOf('--dispatch');
const dispatchOverride = dispatchIdx !== -1 ? args[dispatchIdx + 1] : null;
const VALID_DISPATCH_TARGETS = new Set(['cloud', 'local', 'ssh', 'docker']);
if (dispatchOverride && !VALID_DISPATCH_TARGETS.has(dispatchOverride)) {
  error(`Invalid --dispatch target: ${dispatchOverride}. Valid: cloud, local, ssh, docker`);
}
// Pass to coord.dispatch():
coord.dispatch(dispatchPhase, dispatchPlan, { dispatchOverride }).then(...)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| routeSession() as sole routing decision | routeSession() provides initial backend; classifyTaskRouting() adjusts it | Phase 194 | Classifier is a post-filter, not a replacement |
| isAutonomous from readPlanAutonomous() only | readPlanMetadata() returns full frontmatter | Phase 194 | More metadata available for routing, DAG analysis |
| routing_fallback only for cloud→non-cloud degradation | routing_decision emitted for ALL routing outcomes | Phase 194 | Observability covers all cases, not just failures |

**Deprecated/outdated:**
- `readPlanAutonomous()` export: not deprecated but superseded by `readPlanMetadata()`. Keep for backward compatibility (wrapper or alias).

---

## Open Questions

1. **Dynamic config key `dispatch.routing.override.{phase}` validation**
   - What we know: VALID_CONFIG_KEYS uses exact Set membership; dynamic keys cannot be enumerated
   - What's unclear: Whether users will use CLI (`pde config-set`) or direct JSON edit for per-phase overrides
   - Recommendation: Add prefix-match escape hatch in cmdConfigSet for `dispatch.routing.override.` prefix. This is a 3-line change. Alternatively, skip the override key validation (document that it must be set via JSON edit). CONTEXT.md does not specify which approach — treat as Claude's discretion.

2. **isFastPath propagation path**
   - What we know: CONTEXT.md says `/pde:quick and /pde:fast set it before calling dispatch` — but no existing `pde:quick` or `pde:fast` skill entry points exist in the codebase today
   - What's unclear: Where exactly in the call chain `opts.isFastPath` gets set (skill commands call `node pde-tools.cjs dispatch` via subprocess; they would need to pass `--fast-path` flag)
   - Recommendation: Implement the fast-path path in coordinator.cjs to accept `opts.isFastPath` (used by tests), AND add a `--fast-path` CLI flag to the dispatch case in pde-tools.cjs. The actual skill entry points calling this flag are Phase 194 scope or future scope — the planner should note this as a "stub" that works correctly but has no callers until skill commands are updated.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 194 is pure code changes (new module + wiring). No external tools, services, CLIs, runtimes, or databases beyond the project's existing Node.js runtime are required.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (globals: true) |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run tests/dispatcher/classify.test.cjs` |
| Full suite command | `npx vitest run tests/dispatcher/` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RTG-01 | `--dispatch=docker` overrides routeSession() result | unit | `npx vitest run tests/dispatcher/classify.test.cjs` | ❌ Wave 0 |
| RTG-02 | readPlanMetadata() parses estimated_minutes, agent_type, wave | unit | `npx vitest run tests/dispatcher/classify.test.cjs` | ❌ Wave 0 |
| RTG-03 | per-phase config override takes effect | unit | `npx vitest run tests/dispatcher/classify.test.cjs` | ❌ Wave 0 |
| RTG-04 | cost ceiling 0 downgrades cloud to local | unit | `npx vitest run tests/dispatcher/classify.test.cjs` | ❌ Wave 0 |
| RTG-05 | routing_decision event emitted with reason field | integration | `npx vitest run tests/dispatcher/coordinator-routing.test.cjs` | ❌ Wave 0 |
| RTG-06 | isFastPath=true routes to local regardless of backend | unit | `npx vitest run tests/dispatcher/classify.test.cjs` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/dispatcher/classify.test.cjs`
- **Per wave merge:** `npx vitest run tests/dispatcher/`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/dispatcher/classify.test.cjs` — covers RTG-01 through RTG-04, RTG-06
- [ ] `tests/dispatcher/coordinator-routing.test.cjs` — covers RTG-05 (routing_decision event emission via coordinator DI)
- [ ] No framework install needed — vitest already configured

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `packages/dispatcher/lib/remote-router.cjs` — full decision tree, all 5 rules
- Direct code inspection: `packages/dispatcher/lib/coordinator.cjs` — dispatch() flow lines 217-334, insertion point lines 225-244
- Direct code inspection: `bin/lib/config.cjs` — VALID_CONFIG_KEYS pattern, setConfigValue dot-notation
- Direct code inspection: `tests/dispatcher/remote-router.test.cjs` — test fixture patterns, _deps injection
- Direct code inspection: `tests/dispatcher/config-dispatch.test.cjs` — source-inspection test pattern
- Direct code inspection: `.planning/phases/194-intelligent-routing/194-CONTEXT.md` — locked decisions, signatures, integration points
- Direct code inspection: `.planning/REQUIREMENTS.md` — RTG-01 through RTG-06 definitions

### Secondary (MEDIUM confidence)
- Direct code inspection: `tests/dispatcher/coordinator-cloud.test.cjs` — full DI coordinator test patterns
- Direct code inspection: `bin/pde-tools.cjs` dispatch case lines 1432-1458 — existing flag parsing patterns
- Direct code inspection: `.planning/phases/193-cloud-web-backend/193-01-PLAN.md` — PLAN.md frontmatter fields in production use

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all modules inspected directly from source
- Architecture: HIGH — CONTEXT.md provides locked function signatures; patterns verified against existing code
- Pitfalls: HIGH — identified from code inspection of coordinator.cjs, config.cjs, and CONTEXT.md specifics

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable domain — pure internal refactor with no external dependencies)
