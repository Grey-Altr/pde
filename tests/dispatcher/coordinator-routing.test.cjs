'use strict';

/**
 * coordinator-routing.test.cjs — Integration tests for classifier wiring in coordinator
 *
 * Phase 194: Intelligent Routing
 * Satisfies: RTG-01 (dispatchOverride), RTG-02 (readPlanMetadata), RTG-03 (configOverrides),
 *            RTG-05 (routing_decision event), RTG-06 (isFastPath)
 *
 * Tests that DispatchCoordinator correctly calls classifyTaskRouting() in dispatch(),
 * forwards all required arguments, emits routing_decision on every dispatch, and
 * that classifyResult.backend overrides the routeSession backend.
 *
 * Uses full DI to isolate coordinator logic — no real git ops, no real filesystem.
 */

// vitest globals: true — describe, it, expect, vi, beforeEach available without import
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const { DispatchCoordinator, readPlanMetadata } = require('../../packages/dispatcher/lib/coordinator.cjs');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PROJECT_ROOT_BASE = path.join(os.tmpdir(), 'pde-coord-routing-' + process.pid);

function makeTempRoot() {
  const root = fs.mkdtempSync(PROJECT_ROOT_BASE + '-');
  fs.mkdirSync(path.join(root, '.planning'), { recursive: true });
  return root;
}

function cleanup(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {}
}

/**
 * Create a DispatchCoordinator with full DI for routing tests.
 * All deps are stubbed — no real git ops or process spawning.
 *
 * @param {object} [overrides] - Override specific deps or config
 * @returns {{ coordinator, deps, tmpRoot }}
 */
function createRoutingTestCoordinator(overrides = {}) {
  const tmpRoot = makeTempRoot();
  const { depOverrides = {}, configOverride } = overrides;

  const mockClassifyTaskRouting = vi.fn(() => ({
    backend: 'local',
    reason: 'auto_classify',
    estimatedCost: 0,
    events: [],
  }));

  const mockReadPlanMetadata = vi.fn(() => ({
    autonomous: true,
    estimated_minutes: 30,
    agent_type: 'autonomous',
    wave: null,
  }));

  const defaults = {
    spawnSession: vi.fn(() => ({ pid: 1234, kill: vi.fn() })),
    spawnRemoteSession: vi.fn(() => ({ kill: vi.fn() })),
    spawnDockerSession: vi.fn(() => ({ kill: vi.fn() })),
    spawnCloudSession: vi.fn(() => ({ kill: vi.fn() })),
    routeSession: vi.fn().mockResolvedValue('local'),
    readPlanAutonomous: vi.fn().mockReturnValue(true),
    readPlanMetadata: mockReadPlanMetadata,
    classifyTaskRouting: mockClassifyTaskRouting,
    createWorktree: vi.fn((r, sid) => ({
      worktreePath: path.join(r, '.sessions', sid),
      branch: 'pde/session/' + sid,
    })),
    removeWorktree: vi.fn(),
    deleteBranch: vi.fn(),
    mergeSession: vi.fn(() => ({ ok: true })),
    recalculateFromArtifacts: vi.fn(),
    acquireLock: vi.fn(() => ({ acquired: true })),
    releaseLock: vi.fn(),
    analyzeDag: vi.fn().mockResolvedValue({ parallelizable: [], unsafe: [] }),
    checkFileOverlap: vi.fn(() => ({ overlapping: [] })),
    summarizeFailure: vi.fn().mockResolvedValue(''),
    triageConflicts: vi.fn().mockResolvedValue({}),
    pushPlanningState: vi.fn().mockResolvedValue({ ok: true }),
    fetchPlanningState: vi.fn().mockResolvedValue({ ok: true }),
    mergePlanningFromCloud: vi.fn().mockResolvedValue({ ok: true, conflicts: [], autoResolved: [] }),
  };

  const deps = { ...defaults, ...depOverrides };

  const config = configOverride !== undefined ? configOverride : {
    dispatch: {
      routing: { fallback_to_local: false },
    },
  };

  const coordinator = new DispatchCoordinator(tmpRoot, {
    maxConcurrent: 3,
    config,
    _deps: deps,
  });

  return { coordinator, deps, tmpRoot };
}

// ─── Test Suite: Classifier wiring in coordinator.dispatch() ──────────────────

describe('DispatchCoordinator — Intelligent Routing (Phase 194)', () => {

  // ─── Test CR-01: classifyTaskRouting is called with correct arguments ──────

  it('CR-01: classifyTaskRouting receives correct arguments from dispatch()', async () => {
    const { coordinator, deps } = createRoutingTestCoordinator({
      depOverrides: {
        routeSession: vi.fn().mockResolvedValue('cloud'),
        readPlanMetadata: vi.fn(() => ({
          autonomous: true,
          estimated_minutes: 45,
          agent_type: 'autonomous',
          wave: 2,
        })),
        classifyTaskRouting: vi.fn(() => ({
          backend: 'cloud',
          reason: 'auto_classify',
          estimatedCost: 22.5,
          events: [],
        })),
      },
    });

    await coordinator.dispatch(194, 2);

    expect(deps.classifyTaskRouting).toHaveBeenCalledOnce();
    const callArgs = deps.classifyTaskRouting.mock.calls[0][0];

    // initialBackend comes from routeSession
    expect(callArgs.initialBackend).toBe('cloud');

    // planMetadata comes from readPlanMetadata
    expect(callArgs.planMetadata).toMatchObject({
      autonomous: true,
      estimated_minutes: 45,
      agent_type: 'autonomous',
      wave: 2,
    });

    // phase is passed correctly
    expect(callArgs.phase).toBe(194);
  });

  // ─── Test CR-02: routing_decision event is emitted on every dispatch ──────

  it('CR-02: routing_decision event is emitted for every dispatch() call (RTG-05)', async () => {
    const { coordinator } = createRoutingTestCoordinator({
      depOverrides: {
        routeSession: vi.fn().mockResolvedValue('local'),
        classifyTaskRouting: vi.fn(() => ({
          backend: 'local',
          reason: 'auto_classify',
          estimatedCost: 0,
          events: [],
        })),
      },
    });

    const received = [];
    coordinator._aggregator.on('event', (sid, evt) => received.push({ sid, evt }));

    await coordinator.dispatch(194, 2);

    const routingDecision = received.find(e => e.evt && e.evt.subtype === 'routing_decision');
    expect(routingDecision).toBeDefined();
    expect(routingDecision.evt.backend).toBeDefined();
    expect(routingDecision.evt.reason).toBeDefined();
    expect(routingDecision.evt.phase).toBe(194);
    expect(routingDecision.evt.plan).toBe(2);
    // estimatedCost may be null or a number — just verify the field exists
    expect('estimatedCost' in routingDecision.evt).toBe(true);
  });

  // ─── Test CR-03: dispatchOverride from opts is forwarded ─────────────────

  it('CR-03: dispatchOverride from opts is forwarded to classifyTaskRouting', async () => {
    const { coordinator, deps } = createRoutingTestCoordinator({
      depOverrides: {
        classifyTaskRouting: vi.fn(() => ({
          backend: 'docker',
          reason: 'manual_override',
          estimatedCost: null,
          events: [],
        })),
      },
    });

    await coordinator.dispatch(194, 2, { dispatchOverride: 'docker' });

    expect(deps.classifyTaskRouting).toHaveBeenCalledOnce();
    const callArgs = deps.classifyTaskRouting.mock.calls[0][0];
    expect(callArgs.dispatchOverride).toBe('docker');
  });

  // ─── Test CR-04: isFastPath from opts is forwarded ───────────────────────

  it('CR-04: isFastPath from opts is forwarded to classifyTaskRouting', async () => {
    const { coordinator, deps } = createRoutingTestCoordinator({
      depOverrides: {
        classifyTaskRouting: vi.fn(() => ({
          backend: 'local',
          reason: 'fast_path',
          estimatedCost: 0,
          events: [],
        })),
      },
    });

    await coordinator.dispatch(194, 2, { isFastPath: true });

    expect(deps.classifyTaskRouting).toHaveBeenCalledOnce();
    const callArgs = deps.classifyTaskRouting.mock.calls[0][0];
    expect(callArgs.isFastPath).toBe(true);
  });

  // ─── Test CR-05: classifyResult.backend overrides routeSession backend ────

  it('CR-05: classifyResult.backend overrides routeSession backend', async () => {
    let capturedOnLine;
    const { coordinator, deps } = createRoutingTestCoordinator({
      depOverrides: {
        // routeSession says 'cloud', classifier downgrades to 'local'
        routeSession: vi.fn().mockResolvedValue('cloud'),
        classifyTaskRouting: vi.fn(() => ({
          backend: 'local',
          reason: 'cost_ceiling',
          estimatedCost: 15.0,
          events: [{
            type: 'system',
            subtype: 'routing_cost_ceiling',
            from: 'cloud',
            to: 'local',
            estimatedCost: 15.0,
            ceiling: 5.0,
          }],
        })),
        spawnSession: vi.fn((opts) => {
          capturedOnLine = opts.onLine;
          return { pid: 5678, kill: vi.fn() };
        }),
      },
    });

    const sessionId = await coordinator.dispatch(194, 2);
    await new Promise(r => setImmediate(r));

    // Session should have been spawned via local (spawnSession), not cloud
    expect(deps.spawnSession).toHaveBeenCalled();
    expect(deps.spawnCloudSession).not.toHaveBeenCalled();

    // Registry should record backend='local'
    const entry = coordinator._registry.get(sessionId);
    expect(entry).toBeDefined();
    expect(entry.backend).toBe('local');
  });

  // ─── Test CR-06: classifier events are forwarded to aggregator ────────────

  it('CR-06: routing_cost_ceiling events from classifyResult.events are emitted via aggregator', async () => {
    const costCeilingEvent = {
      type: 'system',
      subtype: 'routing_cost_ceiling',
      from: 'cloud',
      to: 'local',
      estimatedCost: 15.0,
      ceiling: 5.0,
    };

    const { coordinator } = createRoutingTestCoordinator({
      depOverrides: {
        classifyTaskRouting: vi.fn(() => ({
          backend: 'local',
          reason: 'cost_ceiling',
          estimatedCost: 15.0,
          events: [costCeilingEvent],
        })),
      },
    });

    const received = [];
    coordinator._aggregator.on('event', (sid, evt) => received.push({ sid, evt }));

    await coordinator.dispatch(194, 2);

    const costEvent = received.find(e => e.evt && e.evt.subtype === 'routing_cost_ceiling');
    expect(costEvent).toBeDefined();
    expect(costEvent.evt.from).toBe('cloud');
    expect(costEvent.evt.to).toBe('local');
  });
});

// ─── Test Suite: readPlanMetadata ─────────────────────────────────────────────

describe('readPlanMetadata', () => {
  let tmpRoot;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-plan-meta-test-'));
    fs.mkdirSync(path.join(tmpRoot, '.planning', 'phases'), { recursive: true });
  });

  afterEach(() => {
    cleanup(tmpRoot);
  });

  function writePlan(phase, plan, frontmatter) {
    const padded = String(phase).padStart(3, '0');
    const planPadded = String(plan).padStart(2, '0');
    const phaseDir = path.join(tmpRoot, '.planning', 'phases', `${padded}-test-phase`);
    fs.mkdirSync(phaseDir, { recursive: true });
    const planFile = path.join(phaseDir, `${padded}-${planPadded}-PLAN.md`);
    fs.writeFileSync(planFile, `---\n${frontmatter}\n---\n\n# Plan\n`);
  }

  it('RM-01: readPlanMetadata returns autonomous: true when autonomous: true in frontmatter', () => {
    writePlan(194, 2, 'autonomous: true\nwave: 1');
    const meta = readPlanMetadata(tmpRoot, 194, 2);
    expect(meta.autonomous).toBe(true);
  });

  it('RM-02: readPlanMetadata parses estimated_minutes from frontmatter', () => {
    writePlan(194, 2, 'autonomous: true\nestimated_minutes: 45\nwave: 1');
    const meta = readPlanMetadata(tmpRoot, 194, 2);
    expect(meta.estimated_minutes).toBe(45);
  });

  it('RM-03: readPlanMetadata parses agent_type from frontmatter', () => {
    writePlan(194, 2, 'autonomous: true\nagent_type: interactive\nwave: 1');
    const meta = readPlanMetadata(tmpRoot, 194, 2);
    expect(meta.agent_type).toBe('interactive');
  });

  it('RM-04: readPlanMetadata parses wave from frontmatter', () => {
    writePlan(194, 2, 'autonomous: true\nwave: 3');
    const meta = readPlanMetadata(tmpRoot, 194, 2);
    expect(meta.wave).toBe(3);
  });

  it('RM-05: readPlanMetadata returns defaults on missing file', () => {
    const meta = readPlanMetadata(tmpRoot, 999, 99);
    expect(meta).toEqual({ autonomous: false, estimated_minutes: 30, agent_type: null, wave: null });
  });

  it('RM-06: readPlanMetadata returns defaults when frontmatter is absent', () => {
    const padded = String(194).padStart(3, '0');
    const phaseDir = path.join(tmpRoot, '.planning', 'phases', `${padded}-test-phase`);
    fs.mkdirSync(phaseDir, { recursive: true });
    const planFile = path.join(phaseDir, `${padded}-02-PLAN.md`);
    fs.writeFileSync(planFile, '# No frontmatter here\n\nJust content.\n');
    const meta = readPlanMetadata(tmpRoot, 194, 2);
    expect(meta.autonomous).toBe(false);
    expect(meta.estimated_minutes).toBe(30);
  });

  it('RM-07: readPlanMetadata infers agent_type from autonomous when not specified', () => {
    writePlan(194, 2, 'autonomous: true');
    const meta = readPlanMetadata(tmpRoot, 194, 2);
    // When autonomous=true and no agent_type field, agent_type should be 'autonomous'
    expect(meta.agent_type).toBe('autonomous');
  });

  it('RM-08: readPlanMetadata returns agent_type: null when autonomous: false and no agent_type', () => {
    writePlan(194, 2, 'autonomous: false');
    const meta = readPlanMetadata(tmpRoot, 194, 2);
    expect(meta.agent_type).toBeNull();
  });
});
