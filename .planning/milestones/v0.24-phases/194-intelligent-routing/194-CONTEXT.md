# Phase 194: Intelligent Routing - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning
**Mode:** Smart discuss (grey area proposals accepted)

<domain>
## Phase Boundary

Tasks are automatically routed to the best execution backend based on PLAN.md metadata, user-configured cost ceilings, and manual overrides, with fast-path commands always staying local.

</domain>

<decisions>
## Implementation Decisions

### Classification Architecture
- **Classifier location:** New `packages/dispatcher/lib/classify.cjs` — pure function, no side effects, testable in isolation
- **Cost estimation:** Simple lookup table — `{cloud: 0.50, docker: 0.10, ssh: 0.05, local: 0.00}` per minute × estimated_minutes from PLAN.md frontmatter — no LLM call, returns in <1ms
- **Fast-path detection:** `opts.isFastPath` boolean passed from skill entry point — /pde:quick and /pde:fast set it before calling dispatch
- **Force override:** `dispatch.routing.override.{phase}` = backend name in config.json per phase

### Integration & Testing
- **Insertion point:** After routeSession(), before lock in coordinator.dispatch() — classifier adjusts the backend BEFORE any resources are allocated
- **New config keys:** 4 keys:
  - `dispatch.routing.cost_ceiling` — global $/session ceiling (default: null = no ceiling)
  - `dispatch.routing.cost_per_minute.cloud` — $/min for cloud backend (default: 0.50)
  - `dispatch.routing.cost_per_minute.docker` — $/min for docker (default: 0.10)
  - `dispatch.routing.override.{phase}` — force backend for specific phase
  - `dispatch.routing.fast_path_local` — bool, default true (fast-path always local)
- **Test strategy:** Pure unit tests for classify.cjs (sync, no I/O) + integration tests in coordinator for wiring

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/dispatcher/lib/remote-router.cjs` — routeSession() returns initial backend, classifier adjusts it
- `packages/dispatcher/lib/coordinator.cjs` — dispatch() flow, readPlanAutonomous() regex parser
- `bin/lib/config.cjs` — VALID_CONFIG_KEYS set, loadConfig/setConfigValue
- `packages/dispatcher/lib/registry.cjs` — stores backend field per session

### Established Patterns
- Pure function modules (sync, no I/O, injectable deps) — e.g., lock.cjs isPidAlive()
- Config keys follow dot-notation: `dispatch.routing.cost_ceiling`
- PLAN.md frontmatter parsed via regex, not YAML library
- Routing events emitted via aggregator: `{ type: 'system', subtype: 'routing_fallback', ... }`

### Integration Points
- `coordinator.cjs dispatch()` — after line ~230 (routeSession), before line ~247 (acquireLock)
- `bin/lib/config.cjs` — add new VALID_CONFIG_KEYS
- `readPlanAutonomous()` in coordinator.cjs — extend to `readPlanMetadata()` returning full frontmatter
- Tests: config-dispatch.test.cjs pattern for config key validation

</code_context>

<specifics>
## Specific Ideas

### classifyTaskRouting() Signature
```javascript
function classifyTaskRouting({
  initialBackend,        // from routeSession()
  planMetadata,          // { autonomous, estimated_minutes, agent_type, wave }
  dispatchOverride,      // --dispatch=cloud|local|ssh|docker (from CLI)
  configOverrides,       // { override: { [phase]: backend } }
  costConfig,            // { ceiling, costPerMinute: { cloud, docker, ssh, local } }
  isFastPath,            // boolean
  fastPathLocal,         // boolean (config)
}) → {
  backend,               // final routing target
  reason,                // 'manual_override' | 'cost_ceiling' | 'fast_path' | 'auto_classify' | 'default'
  estimatedCost,         // number or null
  events,                // routing events to emit
}
```

### readPlanMetadata() Extension
```javascript
function readPlanMetadata(projectRoot, phase, plan) {
  // Extends readPlanAutonomous() — parses full YAML frontmatter
  // Returns: { autonomous, estimated_minutes, agent_type, wave, requirements }
  // estimated_minutes defaults to 30 if not in frontmatter
  // agent_type defaults to 'autonomous' if autonomous: true
}
```

</specifics>

<deferred>
## Deferred Ideas

- ML-based routing based on historical session performance — future milestone
- Real-time cost tracking during execution — future (needs cloud billing API)
- Dynamic threshold adjustment based on queue depth — out of scope for v0.24

</deferred>
