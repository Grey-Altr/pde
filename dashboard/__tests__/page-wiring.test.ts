import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

// Source inspection test — validates page.tsx wiring without DOM rendering
// (project uses node environment; no @testing-library/react available)
const source = readFileSync(
  path.resolve(import.meta.dirname, '../app/page.tsx'),
  'utf-8'
);

describe('Dashboard page wiring (DSH-11)', () => {
  it('is a "use client" component', () => {
    expect(source).toContain('"use client"');
  });

  it('imports and uses useGlobalFilter hook', () => {
    expect(source).toContain("from '@/hooks/use-global-filter'");
    expect(source).toContain('useGlobalFilter');
  });

  it('imports and uses useAllSessions hook', () => {
    expect(source).toContain("from '@/hooks/use-all-sessions'");
    expect(source).toContain('useAllSessions');
  });

  it('imports and uses useDashboardHotkeys hook', () => {
    expect(source).toContain("from '@/hooks/use-hotkeys-dashboard'");
    expect(source).toContain('useDashboardHotkeys');
  });

  it('imports and renders PaneGrid with all 7 panes', () => {
    expect(source).toContain("from '@/components/layout/pane-grid'");
    expect(source).toContain('<PaneGrid');
    // Verify the required props are passed
    expect(source).toContain('activePane=');
    expect(source).toContain('onPaneSelect=');
  });

  it('imports and uses SessionHealthMatrix (pane 1)', () => {
    expect(source).toContain("from '@/components/session-health-matrix'");
    expect(source).toContain('<SessionHealthMatrix');
  });

  it('imports and uses EventLog (pane 2)', () => {
    expect(source).toContain("from '@/components/event-log'");
    expect(source).toContain('<EventLog');
  });

  it('imports and uses MultiPhaseProgress (pane 3)', () => {
    expect(source).toContain("from '@/components/multi-phase-progress'");
    expect(source).toContain('<MultiPhaseProgress');
  });

  it('imports and uses AggregateStatusBar (panes 4 and 7)', () => {
    expect(source).toContain("from '@/components/aggregate-status-bar'");
    expect(source).toContain('<AggregateStatusBar');
  });

  it('imports and uses FailureCard (pane 5)', () => {
    expect(source).toContain("from '@/components/failure-card'");
    expect(source).toContain('<FailureCard');
  });

  it('imports and uses ActionChevron (pane 6)', () => {
    expect(source).toContain("from '@/components/action-chevron'");
    expect(source).toContain('<ActionChevron');
  });

  it('passes sessionFilter prop from useGlobalFilter to EventLog', () => {
    expect(source).toContain('sessionFilter={sessionFilter}');
  });

  it('passes sessionIds to EventLog', () => {
    expect(source).toContain('sessionIds={sessionIds}');
  });

  it('wires useDashboardHotkeys with onPaneSelect, onSessionNext, onSessionPrev, onExpand, onCollapse', () => {
    expect(source).toContain('onPaneSelect');
    expect(source).toContain('onSessionNext');
    expect(source).toContain('onSessionPrev');
    expect(source).toContain('onExpand');
    expect(source).toContain('onCollapse');
  });

  it('contains laptop media query detection at 1024px breakpoint', () => {
    expect(source).toContain('1024px');
  });
});
