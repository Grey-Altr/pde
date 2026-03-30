"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/status-badge';
import { PhaseProgress } from '@/components/phase-progress';
import { TokenPlayground } from '@/components/token-playground';
import { EventLog } from '@/components/event-log';
import { findPendingApproval } from '@/lib/queries';
import type { SessionListItem } from '@/lib/queries';
import type { ConnectionStatus } from '@/hooks/use-event-stream';
import type { WireEnvelope } from '@/lib/wire-schema';
import { ApprovalCard } from '@/components/approval-card';
import { stopCloudSession, inspectCloudSession } from '@/app/actions';

interface SessionDetailProps {
  session: SessionListItem;
  connectionStatus: ConnectionStatus;
  events: WireEnvelope[];
  sessionId: string;
  initialPersistedCostUsd: number;
}

function formatDuration(startedAt: number): string {
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  if (minutes < 1) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export function SessionDetail({ session, connectionStatus, events, sessionId, initialPersistedCostUsd }: SessionDetailProps) {
  const pendingApproval = findPendingApproval(events);

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
          {(session.source === 'remote-cloud' || session.source === 'docker') && session.status === 'running' && (
            <div className="flex gap-2 mt-3">
              <button
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                onClick={async () => {
                  const result = await stopCloudSession(session.id);
                  if (!result.ok) alert(result.error);
                }}
              >
                Stop Session
              </button>
              {session.cloudSessionUrl && (
                <button
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                  onClick={async () => {
                    const result = await inspectCloudSession(session.id);
                    if (result.url) window.open(result.url, '_blank');
                  }}
                >
                  Inspect
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval gate card (APR-01, APR-02) -- appears when approval pending */}
      {pendingApproval && (
        <ApprovalCard
          event={pendingApproval}
          sessionId={session.id}
        />
      )}

      {/* Phase progress (MON-01) */}
      <PhaseProgress events={events} connectionStatus={connectionStatus} />

      {/* Token/cost meter (MON-02) */}
      <TokenPlayground
        events={events}
        connectionStatus={connectionStatus}
        sessionId={sessionId}
        initialPersistedCostUsd={initialPersistedCostUsd}
        infraCostUsdCents={session.infraCostUsdCents}
      />

      {/* Live event log with filtering (MON-03) */}
      <EventLog events={events} connectionStatus={connectionStatus} />
    </div>
  );
}
