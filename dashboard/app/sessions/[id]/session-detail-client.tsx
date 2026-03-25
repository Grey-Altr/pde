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

  // Merge live events with initial events, deduplicate by seq, keep full buffer
  const mergedEvents = useMemo(() => {
    const seen = new Set<number>();
    const all: WireEnvelope[] = [];
    for (const ev of [...liveEvents, ...initialEvents]) {
      if (!seen.has(ev.seq)) {
        seen.add(ev.seq);
        all.push(ev);
      }
    }
    // Sort newest-first by relay_ts (same convention as useEventStream)
    all.sort((a, b) => new Date(b.relay_ts).getTime() - new Date(a.relay_ts).getTime());
    // Use full buffer (up to 200 from useEventStream + initial), no longer capped at 10
    return all.slice(0, 200);
  }, [liveEvents, initialEvents]);

  // Derive updated session metadata from latest event
  const session = useMemo<SessionListItem>(() => {
    const latestEv = mergedEvents[0];
    if (!latestEv) return initialSession;

    const lastEventType = latestEv.event_type;
    const lastEventTs = new Date(latestEv.relay_ts).getTime();
    const evPayload = latestEv as Record<string, unknown>;

    return {
      ...initialSession,
      lastEventType,
      lastEventTs,
      status: deriveStatus(lastEventType, lastEventTs),
      phase: String(evPayload.phase_name ?? '') || initialSession.phase,
      plan: (String(evPayload.plan_name ?? '') || String(evPayload.plan_id ?? '')) || initialSession.plan,
    };
  }, [mergedEvents, initialSession]);

  return (
    <main className="px-4 sm:px-8 max-w-screen-sm mx-auto py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 min-h-[44px]"
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
