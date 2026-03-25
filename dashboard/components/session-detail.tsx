"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/status-badge';
import { PhaseProgress } from '@/components/phase-progress';
import { CostMeter } from '@/components/cost-meter';
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

export function SessionDetail({ session, connectionStatus, events }: SessionDetailProps) {
  return (
    <div className="space-y-4">
      {/* Status header card */}
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
          <p className="font-mono text-sm text-muted-foreground mt-2">
            Running {formatDuration(session.startedAt)}
          </p>
        </CardContent>
      </Card>

      {/* Phase progress (MON-01) */}
      <PhaseProgress events={events} connectionStatus={connectionStatus} />

      {/* Token/cost meter (MON-02) */}
      <CostMeter events={events} connectionStatus={connectionStatus} />

      {/* Live event log with filtering (MON-03) */}
      <EventLog events={events} connectionStatus={connectionStatus} />
    </div>
  );
}
