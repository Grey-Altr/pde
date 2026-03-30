"use client";

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/status-badge';
import { sessionColor } from '@/lib/session-colors';
import { cn } from '@/lib/utils';
import { formatCost } from '@/lib/derive-cost';
import type { SessionListItem } from '@/lib/queries';

interface SessionHealthMatrixProps {
  sessions: SessionListItem[];
}

function formatElapsed(startedAt: number, status: SessionListItem['status']): string {
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  const minutes = Math.floor(elapsed / 60);
  if (status === 'complete') {
    return minutes < 1 ? 'Ended just now' : `Ended ${minutes}m ago`;
  }
  return minutes < 1 ? 'Running <1m' : `Running ${minutes}m`;
}

const sourceBadges: Record<SessionListItem['source'], { label: string; className: string }> = {
  'local':          { label: 'Local', className: 'text-muted-foreground' },
  'remote-ssh':     { label: 'SSH',   className: 'text-blue-500' },
  'remote-managed': { label: 'Mgd',   className: 'text-purple-500' },
  'remote-cloud':   { label: '[C]',   className: 'text-orange-500 font-mono font-bold' },
  'docker':         { label: '[D]',   className: 'text-cyan-500 font-mono font-bold' },
};

export function SessionHealthMatrix({ sessions }: SessionHealthMatrixProps) {
  if (sessions.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="py-6 text-center text-muted-foreground text-sm">
          No active sessions
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full overflow-hidden">
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground text-xs">
              <th className="py-2 pl-4 pr-2 text-left font-medium">Status</th>
              <th className="py-2 px-2 text-left font-medium">Phase</th>
              <th className="py-2 px-2 text-left font-medium">Source</th>
              <th className="py-2 px-2 text-left font-medium">Sync</th>
              <th className="py-2 px-2 text-right font-medium">Cost</th>
              <th className="py-2 pl-2 pr-4 text-right font-medium">Runtime</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session, index) => (
              <tr
                key={session.id}
                className="border-b last:border-0 hover:bg-muted/50 transition-colors"
              >
                <td className="py-2 pr-2 pl-0">
                  <Link href={`/sessions/${session.id}`} className="flex items-center">
                    <span
                      className={cn("w-1 self-stretch rounded-r-sm mr-3", sessionColor(index))}
                      aria-hidden
                    />
                    <StatusBadge status={session.status} />
                  </Link>
                </td>
                <td className="py-2 px-2">
                  <Link href={`/sessions/${session.id}`} className="block">
                    <span className="font-medium truncate max-w-[12rem] block">
                      {session.phase || 'Unknown'}
                    </span>
                    {session.plan && (
                      <span className="text-xs text-muted-foreground truncate max-w-[12rem] block">
                        {session.plan}
                      </span>
                    )}
                  </Link>
                </td>
                <td className="py-2 px-2">
                  <Link href={`/sessions/${session.id}`} className="block">
                    <span className={sourceBadges[session.source].className}>
                      {sourceBadges[session.source].label}
                    </span>
                  </Link>
                </td>
                <td className="py-2 px-2">
                  <Link href={`/sessions/${session.id}`} className="block">
                    {session.syncStatus ? (
                      <span className={
                        session.syncStatus === 'conflict' ? 'text-red-500 font-semibold' :
                        session.syncStatus === 'pending' ? 'text-yellow-500' :
                        'text-green-500'
                      }>
                        {session.syncStatus}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </Link>
                </td>
                <td className="py-2 px-2 text-right">
                  <Link href={`/sessions/${session.id}`} className="block">
                    {session.infraCostUsdCents > 0 ? (
                      <span className="font-mono text-xs">{formatCost(session.infraCostUsdCents / 100)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </Link>
                </td>
                <td className="py-2 pl-2 pr-4 text-right font-mono text-muted-foreground">
                  <Link href={`/sessions/${session.id}`} className="block">
                    {formatElapsed(session.startedAt, session.status)}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
