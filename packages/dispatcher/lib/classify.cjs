'use strict';

/**
 * classify.cjs — Pure routing classification function
 *
 * Phase 194: Intelligent Routing
 * Satisfies: RTG-01 (manual override), RTG-02 (auto-classify), RTG-03 (phase override),
 *            RTG-04 (cost ceiling), RTG-05 (routing_decision event), RTG-06 (fast-path)
 *
 * Pure function — no I/O, no side effects. All inputs injected as arguments.
 * Returns { backend, reason, estimatedCost, events }.
 *
 * Priority order:
 *   1. Fast-path guard (--fast-path / isFastPath)
 *   2. CLI --dispatch flag (dispatchOverride)
 *   3. Per-phase config override (dispatch.routing.override.{phase})
 *   4. Cost ceiling check
 *   5. Auto-classify (pass through initialBackend from routeSession)
 */

/**
 * Classify routing decision for a single dispatch call.
 *
 * @param {object} opts
 * @param {string} opts.initialBackend - Backend returned by routeSession()
 * @param {object} opts.planMetadata - { autonomous, estimated_minutes, agent_type, wave }
 * @param {string|null} opts.dispatchOverride - CLI --dispatch flag value or null
 * @param {object} opts.configOverrides - { override: { [phase]: backend } }
 * @param {object} opts.costConfig - { ceiling, costPerMinute: { cloud, docker, ssh, local } }
 * @param {boolean} opts.isFastPath - true when invoked from /pde:quick or /pde:fast
 * @param {boolean} opts.fastPathLocal - config flag (default true): fast-path routes to local
 * @param {number|string} opts.phase - Phase number — used for per-phase override lookup
 * @returns {{ backend: string, reason: string, estimatedCost: number|null, events: object[] }}
 */
function classifyTaskRouting({
  initialBackend,
  planMetadata,
  dispatchOverride,
  configOverrides,
  costConfig,
  isFastPath,
  fastPathLocal,
  phase,
}) {
  const events = [];

  // Priority 1: Fast-path guard (RTG-06)
  // /pde:quick and /pde:fast set isFastPath=true before calling dispatch
  if (isFastPath && fastPathLocal !== false) {
    return { backend: 'local', reason: 'fast_path', estimatedCost: 0, events };
  }

  // Priority 2: CLI --dispatch flag (RTG-01, RTG-03)
  if (dispatchOverride) {
    return { backend: dispatchOverride, reason: 'manual_override', estimatedCost: null, events };
  }

  // Priority 3: Per-phase config override (RTG-03)
  // Matches dispatch.routing.override.{phase} entries in config
  const phaseOverride = configOverrides && configOverrides.override && configOverrides.override[String(phase)];
  if (phaseOverride) {
    return { backend: phaseOverride, reason: 'manual_override', estimatedCost: null, events };
  }

  // Priority 4: Cost ceiling check (RTG-04)
  const costPerMinute = (costConfig && costConfig.costPerMinute) || {
    cloud: 0.50,
    docker: 0.10,
    ssh: 0.05,
    local: 0.00,
  };
  const minutes = (planMetadata && planMetadata.estimated_minutes) || 30;
  const estimatedCost = (costPerMinute[initialBackend] || 0) * minutes;

  if (
    costConfig &&
    costConfig.ceiling !== null &&
    costConfig.ceiling !== undefined &&
    estimatedCost > costConfig.ceiling
  ) {
    const downgraded = 'local';
    events.push({
      type: 'system',
      subtype: 'routing_cost_ceiling',
      from: initialBackend,
      to: downgraded,
      estimatedCost,
      ceiling: costConfig.ceiling,
    });
    return { backend: downgraded, reason: 'cost_ceiling', estimatedCost, events };
  }

  // Priority 5: Auto-classify (RTG-02)
  // initialBackend already reflects autonomous detection from routeSession()
  return { backend: initialBackend, reason: 'auto_classify', estimatedCost, events };
}

module.exports = { classifyTaskRouting };
