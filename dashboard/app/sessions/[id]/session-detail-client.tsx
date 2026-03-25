"use client";

import Link from 'next/link';
import { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useEventStream } from '@/hooks/use-event-stream';
import { SessionDetail } from '@/components/session-detail';
import { deriveStatus } from '@/lib/session-status';
import type { SessionListItem } from '@/lib/queries';
import type { WireEnvelope } from '@/lib/wire-schema';

interface SessionDetailClientProps {
  sessionId: string;
  initialSession: SessionListItem;
  initialEvents: WireEnvelope[];
}

export function SessionDetailClient({
  sessionId,
  initialSession,
  initialEvents,
}: SessionDetailClientProps) {
  const { events: liveEvents, connectionStatus } = useEventStream(sessionId);

  // Merge live events with initial events, deduplicate by seq
  const mergedEvents = useMemo(() => {
    const seen = new Set<number>();
    const all: WireEnvelope[] = [];
    for (const ev of [...liveEvents, ...initialEvents]) {
      if (!seen.has(ev.seq)) {
        seen.add(ev.seq);
        all.push(ev);
      }
    }
    // Sort newest-first by relay_ts
    all.sort((a, b) => new Date(b.relay_ts).getTime() - new Date(a.relay_ts).getTime());
    return all.slice(0, 10);
  }, [liveEvents, initialEvents]);

  // Derive updated session metadata from latest event
  const session = useMemo<SessionListItem>(() => {
    const latestEv = mergedEvents[0];
    if (!latestEv) return initialSession;

    const lastEventType = latestEv.event_type;
    const lastEventTs = new Date(latestEv.relay_ts).getTime();
    const ext = latestEv.extensions as Record<string, string> | undefined;

    return {
      ...initialSession,
      lastEventType,
      lastEventTs,
      status: deriveStatus(lastEventType, lastEventTs),
      phase: ext?.phase_name ?? initialSession.phase,
      plan: ext?.plan_name ?? initialSession.plan,
    };
  }, [mergedEvents, initialSession]);

  return (
    <main className="px-4 sm:px-8 max-w-screen-sm mx-auto py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Sessions
      </Link>
      <SessionDetail
        session={session}
        connectionStatus={connectionStatus}
        events={mergedEvents}
      />
    </main>
  );
}
