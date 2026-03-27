"use client";

import { Badge } from '@/components/ui/badge';
import type { SessionListItem } from '@/lib/queries';

interface AggregateStatusBarProps {
  sessions: SessionListItem[];
}

export function AggregateStatusBar({ sessions }: AggregateStatusBarProps) {
  const activeCount = sessions.filter(s => s.status === 'active').length;
  const queuedCount = sessions.filter(s => s.status === 'queued').length;
  const failedCount = sessions.filter(s => s.status === 'failed' || s.status === 'error').length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge
        variant="secondary"
        className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30"
      >
        {activeCount} Active
      </Badge>
      <Badge
        variant="secondary"
        className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
      >
        {queuedCount} Queued
      </Badge>
      <Badge
        variant="secondary"
        className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30"
      >
        {failedCount} Failed
      </Badge>
      <Badge variant="outline" className="font-mono text-muted-foreground">
        Cost: —
      </Badge>
    </div>
  );
}
