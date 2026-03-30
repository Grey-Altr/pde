"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { SessionListItem } from '@/lib/queries';

interface SyncStatePanelProps {
  sessions: SessionListItem[];
}

export function SyncStatePanel({ sessions }: SyncStatePanelProps) {
  const pending = sessions.filter(s => s.syncStatus === 'pending');
  const conflicted = sessions.filter(s => s.syncStatus === 'conflict');
  const allConflicts = sessions.flatMap(s => s.syncConflicts);
  const lastSync = sessions
    .map(s => s.syncLastTs)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;

  const overallStatus = conflicted.length > 0 ? 'conflict' : pending.length > 0 ? 'pending' : 'synced';
  const badgeVariant = overallStatus === 'conflict' ? 'destructive' : overallStatus === 'pending' ? 'secondary' : 'default';

  return (
    <Card className="w-full">
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">State Sync</p>
          <Badge variant={badgeVariant}>{overallStatus}</Badge>
        </div>
        <div className="space-y-1 text-sm">
          <p>Pending Merges: <span className="font-mono">{pending.length}</span></p>
          <p>Last Sync: <span className="font-mono text-xs">{lastSync ?? 'never'}</span></p>
        </div>
        {allConflicts.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-red-500">Conflicts:</p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {allConflicts.map((f, i) => (
                <li key={i} className="font-mono">{f}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
