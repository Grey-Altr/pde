"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { SessionListItem } from '@/lib/queries';

export interface AggregateCounts {
  active: number;
  queued: number;
  failed: number;
}

export function deriveAggregateCounts(sessions: SessionListItem[]): AggregateCounts {
  let active = 0;
  let queued = 0;
  let failed = 0;

  for (const s of sessions) {
    if (s.status === 'active') active++;
    else if (s.status === 'queued') queued++;
    else if (s.status === 'failed' || s.status === 'error') failed++;
  }

  return { active, queued, failed };
}

export function AggregateStatusBar({ sessions }: { sessions: SessionListItem[] }) {
  const { active, queued, failed } = deriveAggregateCounts(sessions);

  return (
    <Card className="w-full">
      <CardContent className="py-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold">Overview</span>
          <Badge variant="secondary" className="gap-1.5 bg-green-500/10 text-green-600 border-green-500/20">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
            {active} active
          </Badge>
          <Badge variant="secondary" className="gap-1.5 bg-sky-500/10 text-sky-600 border-sky-500/20">
            <span className="inline-block w-2 h-2 rounded-full bg-sky-500" />
            {queued} queued
          </Badge>
          <Badge variant="secondary" className="gap-1.5 bg-red-500/10 text-red-600 border-red-500/20">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
            {failed} failed
          </Badge>
          <span className="ml-auto text-xs text-muted-foreground">Cost: —</span>
        </div>
      </CardContent>
    </Card>
  );
}
