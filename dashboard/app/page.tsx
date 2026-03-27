"use client";

import { useState, useEffect } from 'react';
import { useGlobalFilter } from '@/hooks/use-global-filter';
import { useAllSessions } from '@/hooks/use-all-sessions';
import { useEventStream } from '@/hooks/use-event-stream';
import { useDashboardHotkeys } from '@/hooks/use-hotkeys-dashboard';
import { useActivePane } from '@/hooks/use-active-pane';
import { PaneGrid } from '@/components/layout/pane-grid';
import { SessionHealthMatrix } from '@/components/session-health-matrix';
import { AggregateStatusBar } from '@/components/aggregate-status-bar';
import { MultiPhaseProgress } from '@/components/multi-phase-progress';
import { ActionChevron } from '@/components/action-chevron';
import { EventLog } from '@/components/event-log';
import { FailureCard } from '@/components/failure-card';

export default function HomePage() {
  const { sessionFilter, setSessionFilter } = useGlobalFilter();
  const sessions = useAllSessions(5000);
  const { activePane, setActivePane } = useActivePane();
  const [expanded, setExpanded] = useState(false);
  const [isLaptop, setIsLaptop] = useState(false);

  // Laptop media query detection for keyboard shortcuts
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    setIsLaptop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsLaptop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const sessionIds = sessions.map(s => s.id);

  // Open SSE only for the selected session (or first session if 'all')
  const selectedSessionId =
    sessionFilter !== 'all' ? sessionFilter : (sessions[0]?.id ?? '');
  const { events, connectionStatus } = useEventStream(selectedSessionId);

  // Session cycling for s/a shortcuts
  const cycleSession = (direction: 'next' | 'prev') => {
    if (sessions.length === 0) return;
    const currentIdx =
      sessionFilter === 'all' ? -1 : sessionIds.indexOf(sessionFilter);
    if (direction === 'next') {
      const nextIdx =
        currentIdx + 1 >= sessions.length ? -1 : currentIdx + 1;
      setSessionFilter(nextIdx === -1 ? 'all' : sessionIds[nextIdx] ?? null);
    } else {
      const prevIdx =
        currentIdx <= 0 ? sessions.length - 1 : currentIdx - 1;
      setSessionFilter(
        currentIdx === -1
          ? (sessionIds[sessions.length - 1] ?? null)
          : (sessionIds[prevIdx] ?? null)
      );
    }
  };

  // Keyboard shortcuts — only active on laptop breakpoint
  useDashboardHotkeys({
    onPaneSelect: setActivePane,
    onSessionNext: () => cycleSession('next'),
    onSessionPrev: () => cycleSession('prev'),
    onExpand: () => setExpanded(true),
    onCollapse: () => setExpanded(false),
    enabled: isLaptop,
  });

  // Filter sessions for display
  const filteredSessions =
    sessionFilter === 'all'
      ? sessions
      : sessions.filter(s => s.id === sessionFilter);

  const failedSessions = filteredSessions.filter(
    s => s.status === 'failed' || s.status === 'error'
  );

  return (
    <main className="px-4 sm:px-6 lg:px-8 py-4 pb-24 lg:pb-8 max-w-screen-xl mx-auto">
      {/* Session filter selector */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <h1 className="text-lg font-semibold">Sessions</h1>
        <div className="flex items-center gap-2">
          <select
            className="text-sm bg-muted border border-border rounded px-2 py-1.5 min-h-[36px] text-foreground"
            value={sessionFilter}
            onChange={e => setSessionFilter(e.target.value === 'all' ? null : e.target.value)}
            aria-label="Filter by session"
          >
            <option value="all">All Sessions</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>
                {s.id.slice(0, 12)}
                {s.phase ? ` — ${s.phase}` : ''}
                {s.plan ? `/${s.plan}` : ''}
              </option>
            ))}
          </select>
          {isLaptop && (
            <span className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground">
              <kbd className="border border-border rounded px-1 font-mono">a</kbd>
              <kbd className="border border-border rounded px-1 font-mono">s</kbd>
              <span>cycle</span>
            </span>
          )}
        </div>
        {sessions.length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <PaneGrid activePane={activePane} onPaneSelect={setActivePane}>
        {/* Pane 1: Health Matrix */}
        <SessionHealthMatrix sessions={filteredSessions} />

        {/* Pane 2: Event Log */}
        <EventLog
          events={events}
          connectionStatus={connectionStatus}
          sessionFilter={sessionFilter}
          sessionIds={sessionIds}
        />

        {/* Pane 3: Multi-Phase Progress */}
        <MultiPhaseProgress sessions={filteredSessions} />

        {/* Pane 4: Aggregate Status */}
        <AggregateStatusBar sessions={filteredSessions} />

        {/* Pane 5: Failure Cards */}
        <div className="space-y-3">
          {failedSessions.length === 0 ? (
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm font-semibold mb-1">Failures</p>
              <p className="text-sm text-muted-foreground">No failures</p>
            </div>
          ) : (
            failedSessions.map(s => (
              <FailureCard key={s.id} session={s} />
            ))
          )}
        </div>

        {/* Pane 6: Action Chevron — for selected or first session */}
        <ActionChevron events={events} sessionId={selectedSessionId} />

        {/* Pane 7: Summary Status Bar — full width on laptop */}
        <AggregateStatusBar sessions={sessions} />
      </PaneGrid>

      {/* Laptop keyboard shortcut hint bar */}
      {isLaptop && (
        <div className="hidden lg:flex items-center gap-3 mt-4 text-xs text-muted-foreground">
          <span className="font-medium">Shortcuts:</span>
          {[1, 2, 3, 4, 5, 6, 7].map(n => (
            <span key={n} className="flex items-center gap-1">
              <kbd className="border border-border rounded px-1 font-mono">{n}</kbd>
              <span className="sr-only">pane {n}</span>
            </span>
          ))}
          <span className="ml-2">
            <kbd className="border border-border rounded px-1 font-mono">f</kbd>
            {' '}expand
          </span>
          <span>
            <kbd className="border border-border rounded px-1 font-mono">Esc</kbd>
            {' '}collapse
          </span>
        </div>
      )}
    </main>
  );
}
