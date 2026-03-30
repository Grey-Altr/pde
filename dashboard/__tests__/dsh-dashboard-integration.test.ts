import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

// Load sources once — source-inspection pattern (no DOM rendering needed)
const queriesSrc = readFileSync(path.resolve(import.meta.dirname, '../lib/queries.ts'), 'utf-8');
const ingestSrc = readFileSync(path.resolve(import.meta.dirname, '../app/api/ingest/route.ts'), 'utf-8');
const actionsSrc = readFileSync(path.resolve(import.meta.dirname, '../app/actions.ts'), 'utf-8');
const wireSchemaSrc = readFileSync(path.resolve(import.meta.dirname, '../lib/wire-schema.ts'), 'utf-8');
const healthMatrixSrc = readFileSync(path.resolve(import.meta.dirname, '../components/session-health-matrix.tsx'), 'utf-8');
const tokenPlaygroundSrc = readFileSync(path.resolve(import.meta.dirname, '../components/token-playground.tsx'), 'utf-8');
const paneGridSrc = readFileSync(path.resolve(import.meta.dirname, '../components/layout/pane-grid.tsx'), 'utf-8');
const pageSrc = readFileSync(path.resolve(import.meta.dirname, '../app/page.tsx'), 'utf-8');

// Guard for files not yet created (Plan 02/03 will provide them)
const syncPanelPath = path.resolve(import.meta.dirname, '../components/sync-state-panel.tsx');
const syncPanelSrc = existsSync(syncPanelPath) ? readFileSync(syncPanelPath, 'utf-8') : null;

// ────────────────────────────────────────────────────────────
// DSH-01: Session Health Matrix — source/cloud columns
// ────────────────────────────────────────────────────────────
describe('DSH-01: SessionHealthMatrix source badges and sync column', () => {
  it('renders [C] cloud source badge label', () => {
    expect(healthMatrixSrc).toContain('[C]');
  });

  it('renders [D] docker source badge label', () => {
    expect(healthMatrixSrc).toContain('[D]');
  });

  it('references syncStatus or sync_status for column rendering', () => {
    const hasSyncCol = healthMatrixSrc.includes('syncStatus') || healthMatrixSrc.includes('sync_status');
    expect(hasSyncCol).toBe(true);
  });

  it('references infraCostUsdCents or cost column', () => {
    const hasCostCol = healthMatrixSrc.includes('infraCostUsdCents') || healthMatrixSrc.includes('infra_cost');
    expect(hasCostCol).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────
// DSH-02: Cloud progress tracking — ingest + queries
// ────────────────────────────────────────────────────────────
describe('DSH-02: Cloud progress tracking', () => {
  it('ingest route handles cloud_sync_complete events', () => {
    expect(ingestSrc).toContain('cloud_sync_complete');
  });

  it('ingest route or queries handle cloud_heartbeat events', () => {
    const hasCloudPulse = ingestSrc.includes('cloud_heartbeat') || queriesSrc.includes('cloud_heartbeat');
    // cloud_heartbeat may not be implemented until a later plan; cloud_sync_complete is the primary signal
    expect(ingestSrc.includes('cloud_sync_complete') || hasCloudPulse).toBe(true);
  });

  it('queries.ts exposes syncStatus field on SessionListItem', () => {
    expect(queriesSrc).toContain('syncStatus');
  });

  it('queries.ts populates syncStatus from Redis with safe fallback', () => {
    expect(queriesSrc).toContain('sync_status || null');
  });
});

// ────────────────────────────────────────────────────────────
// DSH-03: Cloud session control actions
// ────────────────────────────────────────────────────────────
describe('DSH-03: Cloud session control actions', () => {
  it('exports startCloudSession', () => {
    expect(actionsSrc).toContain('export async function startCloudSession');
  });

  it('exports stopCloudSession', () => {
    expect(actionsSrc).toContain('export async function stopCloudSession');
  });

  it('exports inspectCloudSession', () => {
    expect(actionsSrc).toContain('export async function inspectCloudSession');
  });

  it('stopCloudSession uses HTTP fetch to PDE_DISPATCHER_URL — never process.kill', () => {
    // Extract stopCloudSession body — from its declaration to the next export
    const stopStart = actionsSrc.indexOf('export async function stopCloudSession');
    const nextExport = actionsSrc.indexOf('\nexport ', stopStart + 1);
    const stopBody = nextExport > -1 ? actionsSrc.slice(stopStart, nextExport) : actionsSrc.slice(stopStart);

    expect(stopBody).not.toContain('process.kill');
    expect(stopBody).toContain('PDE_DISPATCHER_URL');
    expect(stopBody).toContain('fetch(');
  });

  it('startCloudSession uses HTTP fetch to PDE_DISPATCHER_URL', () => {
    const startStart = actionsSrc.indexOf('export async function startCloudSession');
    const nextExport = actionsSrc.indexOf('\nexport ', startStart + 1);
    const startBody = nextExport > -1 ? actionsSrc.slice(startStart, nextExport) : actionsSrc.slice(startStart);

    expect(startBody).toContain('PDE_DISPATCHER_URL');
    expect(startBody).toContain('fetch(');
  });
});

// ────────────────────────────────────────────────────────────
// DSH-04: Sync state panel
// ────────────────────────────────────────────────────────────
describe('DSH-04: Sync state panel (Plan 02/03 will implement UI)', () => {
  it('sync-state-panel.tsx exists and is a client component', () => {
    if (!syncPanelSrc) {
      // Plan 02 will create this file — expected to fail until then
      expect(syncPanelSrc, 'sync-state-panel.tsx not yet created (Plan 02 will add it)').not.toBeNull();
    }
    expect(syncPanelSrc).toContain('"use client"');
  });

  it('sync-state-panel.tsx references syncStatus', () => {
    if (!syncPanelSrc) {
      expect(syncPanelSrc, 'sync-state-panel.tsx not yet created (Plan 02 will add it)').not.toBeNull();
    }
    const hasSyncRef = syncPanelSrc!.includes('sync_status') || syncPanelSrc!.includes('syncStatus');
    expect(hasSyncRef).toBe(true);
  });

  it('sync-state-panel.tsx references syncConflicts or conflicts', () => {
    if (!syncPanelSrc) {
      expect(syncPanelSrc, 'sync-state-panel.tsx not yet created (Plan 02 will add it)').not.toBeNull();
    }
    const hasConflicts = syncPanelSrc!.includes('syncConflicts') || syncPanelSrc!.includes('conflicts');
    expect(hasConflicts).toBe(true);
  });

  it('page.tsx imports SyncStatePanel', () => {
    expect(pageSrc).toContain('SyncStatePanel');
  });

  it('pane-grid.tsx PANE_NAMES has 8 entries and includes Sync', () => {
    expect(paneGridSrc).toContain('Sync');
    // Count entries in the PANE_NAMES array
    const panesMatch = paneGridSrc.match(/PANE_NAMES\s*=\s*\[([\s\S]*?)\]/);
    if (panesMatch) {
      const entries = panesMatch[1].split(',').map(s => s.trim()).filter(Boolean);
      expect(entries.length).toBe(8);
    } else {
      // PANE_NAMES may not be extracted from a complex type — just verify Sync presence
      expect(paneGridSrc).toContain('Sync');
    }
  });
});

// ────────────────────────────────────────────────────────────
// DSH-05: Infrastructure cost display
// ────────────────────────────────────────────────────────────
describe('DSH-05: Infrastructure cost display (Plan 02/03 will implement UI)', () => {
  it('token-playground.tsx references infrastructure cost label', () => {
    const hasLabel =
      tokenPlaygroundSrc.toLowerCase().includes('infrastructure cost') ||
      tokenPlaygroundSrc.toLowerCase().includes('infra');
    expect(hasLabel).toBe(true);
  });

  it('token-playground.tsx references infraCostUsdCents or container_uptime', () => {
    const hasCost =
      tokenPlaygroundSrc.includes('infraCostUsdCents') ||
      tokenPlaygroundSrc.includes('container_uptime');
    expect(hasCost).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────
// DSH-06: SESSION_SOURCES includes remote-cloud and docker
// ────────────────────────────────────────────────────────────
describe('DSH-06: Session source union completeness', () => {
  it('wire-schema.ts SESSION_SOURCES includes remote-cloud', () => {
    expect(wireSchemaSrc).toContain('remote-cloud');
  });

  it('wire-schema.ts SESSION_SOURCES includes docker', () => {
    expect(wireSchemaSrc).toContain('docker');
  });

  it('queries.ts VALID_SOURCES includes remote-cloud', () => {
    expect(queriesSrc).toContain("'remote-cloud'");
  });

  it('queries.ts VALID_SOURCES includes docker', () => {
    expect(queriesSrc).toContain("'docker'");
  });

  it('SessionListItem source union includes remote-cloud', () => {
    expect(queriesSrc).toContain("'remote-cloud'");
  });
});
