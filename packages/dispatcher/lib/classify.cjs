'use strict';

/**
 * classify.cjs — Pure routing classification layer for Phase 194 Intelligent Routing
 *
 * Satisfies: RTG-01 (CLI override), RTG-02 (auto-classify), RTG-03 (config override),
 *            RTG-04 (cost ceiling), RTG-06 (fast-path)
 *
 * This module is a pure function — no I/O, no require() beyond built-ins, no side effects.
 * All dependencies are injected via function arguments. Returns in <1ms.
 *
 * Decision tree (evaluated in priority order):
 *   1. isFastPath && fastPathLocal !== false  → 'local'  (RTG-06: fast-path always local)
 *   2. dispatchOverride set                   → dispatchOverride  (RTG-01: CLI --dispatch flag)
 *   3. configOverrides.override[phase] set    → phaseOverride  (RTG-03: per-phase config)
 *   4. estimatedCost > ceiling                → 'local'  (RTG-04: cost ceiling exceeded)
 *   5. default                                → initialBackend  (RTG-02: auto-classify)
 */

/**
 * Classify and possibly adjust the routing target for a task dispatch.
 *
 * @param {object} opts
 * @param {string} opts.initialBackend - Initial backend from routeSession() ('local'|'docker'|'ssh'|'managed'|'cloud')
 * @param {object} opts.planMetadata - Metadata from PLAN.md frontmatter
 * @param {boolean} opts.planMetadata.autonomous - Whether the plan is autonomous
 * @param {number} [opts.planMetadata.estimated_minutes=30] - Estimated duration in minutes (default 30)
 * @param {string|null} [opts.planMetadata.agent_type] - Agent type ('autonomous' or null)
 * @param {number|null} [opts.planMetadata.wave] - Wave number
 * @param {string|null} opts.dispatchOverride - CLI --dispatch flag value (null if not set)
 * @param {object} opts.configOverrides - dispatch.routing config block; may contain override.{phase}
 * @param {object} opts.costConfig - Cost configuration
 * @param {number|null} opts.costConfig.ceiling - Global $/session ceiling (null = no ceiling, 0 = always local)
 * @param {object} opts.costConfig.costPerMinute - Per-backend $/minute rates
 * @param {boolean} [opts.isFastPath=false] - True if invoked from a fast-path command (/pde:quick, /pde:fast)
 * @param {boolean} [opts.fastPathLocal=true] - Config flag: fast-path always routes to local (default true)
 * @param {number|string} [opts.phase] - Phase number, used to look up per-phase config override
 *
 * @returns {{ backend: string, reason: string, estimatedCost: number|null, events: object[] }}
 *   backend      — final routing target after classification
 *   reason       — 'fast_path' | 'manual_override' | 'cost_ceiling' | 'auto_classify'
 *   estimatedCost — computed cost in dollars (null when not computed, 0 for local/fast-path)
 *   events       — routing events to emit (empty array or routing_cost_ceiling event)
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
  // isFastPath must be explicitly true (not just truthy undefined)
  // fastPathLocal !== false means: default true, only skip fast-path local if explicitly false
  if (isFastPath && fastPathLocal !== false) {
    return { backend: 'local', reason: 'fast_path', estimatedCost: 0, events };
  }

  // Priority 2: CLI --dispatch flag override (RTG-01, RTG-03)
  // dispatchOverride is null when not set — truthy check is safe here
  if (dispatchOverride) {
    return { backend: dispatchOverride, reason: 'manual_override', estimatedCost: null, events };
  }

  // Priority 3: Per-phase config override (RTG-03)
  // configOverrides.override is an object keyed by phase number as string
  const phaseOverride =
    configOverrides &&
    configOverrides.override &&
    configOverrides.override[String(phase)];
  if (phaseOverride) {
    return { backend: phaseOverride, reason: 'manual_override', estimatedCost: null, events };
  }

  // Priority 4: Cost ceiling check (RTG-04)
  // Compute estimated cost: costPerMinute[backend] * estimated_minutes
  // Pitfall 2: ceiling=0 means "always route to local" — must use explicit null/undefined check
  // (falsy check `!ceiling` would incorrectly treat 0 as "no ceiling")
  const costPerMinute =
    (costConfig && costConfig.costPerMinute) ||
    { cloud: 0.50, docker: 0.10, ssh: 0.05, local: 0.00 };
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
  // initialBackend already reflects autonomous detection via routeSession()
  // agent_type from planMetadata is available for future use (e.g., interactive vs autonomous split)
  return { backend: initialBackend, reason: 'auto_classify', estimatedCost, events };
}

module.exports = { classifyTaskRouting };
