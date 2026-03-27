"use client";

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/status-badge';
import { sessionColor } from '@/lib/session-colors';
import type { SessionListItem } from '@/lib/queries';

function formatRuntime(startedAt: number): string {
  if (!startedAt) return '—';
  const elapsedMs = Date.now() - startedAt;
  const seconds = Math.floor(elapsedMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function sourceLabel(source: SessionListItem['source']): string {
  if (source === 'remote-ssh') return 'SSH';
  if (source === 'remote-managed') return 'Managed';
  return 'Local';
}

export function SessionHealthMatrix({ sessions }: { sessions: SessionListItem[] }) {
  if (sessions.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="py-6">
          <p className="text-sm font-semibold mb-2">Session Health</p>
          <p className="text-sm text-muted-foreground">No active sessions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="py-4">
        <p className="text-sm font-semibold mb-3">Session Health</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left pb-2 pr-3 font-medium">Status</th>
                <th className="text-left pb-2 pr-3 font-medium">Phase / Plan</th>
                <th className="text-left pb-2 pr-3 font-medium">Source</th>
                <th className="text-left pb-2 font-medium">Runtime</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session, index) => (
                <tr
                  key={session.id}
                  className="border-l-2 hover:bg-muted/30 transition-colors"
                  style={{ borderLeftColor: sessionColor(index) }}
                >
                  <td className="py-2 pr-3">
                    <Link href={`/sessions/${session.id}`} className="hover:underline">
                      <StatusBadge status={session.status} />
                    </Link>
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs">
                    {session.phase || '—'}{session.plan ? `/${session.plan}` : ''}
                  </td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">
                    {sourceLabel(session.source)}
                  </td>
                  <td className="py-2 text-xs text-muted-foreground">
                    {formatRuntime(session.startedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
