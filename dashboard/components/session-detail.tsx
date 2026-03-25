"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/status-badge';
import { EventLog } from '@/components/event-log';
import type { SessionListItem } from '@/lib/queries';
import type { ConnectionStatus } from '@/hooks/use-event-stream';
import type { WireEnvelope } from '@/lib/wire-schema';

interface SessionDetailProps {
  session: SessionListItem;
  connectionStatus: ConnectionStatus;
  events: WireEnvelope[];
}

function formatDuration(startedAt: number): string {
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  if (minutes < 1) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function formatLastEventTime(relay_ts: string): string {
  const ageS = Math.floor((Date.now() - new Date(relay_ts).getTime()) / 1000);
  if (ageS < 60) return `${ageS}s ago`;
  return `${Math.floor(ageS / 60)}m ago`;
}

export function SessionDetail({ session, connectionStatus, events }: SessionDetailProps) {
  const latestEvent = events[0];

  return (
    <div>
      <Card className="w-full">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={session.status} />
            {connectionStatus === 'reconnecting' && (
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-500 border-amber-500/30">
                Reconnecting...
              </Badge>
            )}
            {connectionStatus === 'polling' && (
              <Badge variant="secondary" className="text-muted-foreground">
                Live (polling)
              </Badge>
            )}
          </div>
          <div className="mt-3 space-y-1">
            <p className="text-base font-semibold">Phase: {session.phase || 'Unknown'}</p>
            <p className="text-sm text-muted-foreground">Plan: {session.plan || 'Unknown'}</p>
            <p className="font-mono text-sm text-muted-foreground">
              Running {formatDuration(session.startedAt)}
            </p>
            {latestEvent && (
              <p className="font-mono text-sm text-muted-foreground">
                Last: {latestEvent.event_type} · {formatLastEventTime(latestEvent.relay_ts)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="mt-4">
        <EventLog events={events} />
      </div>
    </div>
  );
}
