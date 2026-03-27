"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress';
import { sessionColor } from '@/lib/session-colors';
import type { SessionListItem } from '@/lib/queries';
import type { ProgressVariant } from '@/components/ui/progress';

/** Derive a single variant from a group of sessions sharing the same phase */
export function deriveVariant(sessions: SessionListItem[]): ProgressVariant {
  const statuses = sessions.map(s => s.status);
  if (statuses.some(s => s === 'failed' || s === 'error')) return 'failed';
  if (statuses.some(s => s === 'active')) return 'executing';
  if (statuses.every(s => s === 'complete')) return 'complete';
  return 'waiting';
}

export function MultiPhaseProgress({ sessions }: { sessions: SessionListItem[] }) {
  if (sessions.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="py-6">
          <p className="text-sm font-semibold mb-2">Phase Progress</p>
          <p className="text-sm text-muted-foreground">No sessions</p>
        </CardContent>
      </Card>
    );
  }

  // Group sessions by phase
  const phaseMap = new Map<string, SessionListItem[]>();
  for (const session of sessions) {
    const key = session.phase || 'Unknown';
    if (!phaseMap.has(key)) phaseMap.set(key, []);
    phaseMap.get(key)!.push(session);
  }

  const phases = Array.from(phaseMap.entries());

  return (
    <Card className="w-full">
      <CardContent className="py-4">
        <p className="text-sm font-semibold mb-3">Phase Progress</p>
        <div className="space-y-3">
          {phases.map(([phaseName, phaseSessions], index) => {
            const variant = deriveVariant(phaseSessions);
            const completed = phaseSessions.filter(s => s.status === 'complete').length;
            const total = phaseSessions.length;
            const progressValue = total > 0 ? Math.round((completed / total) * 100) : 0;
            const color = sessionColor(index);

            return (
              <div key={phaseName}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium truncate" style={{ color }}>
                    {phaseName}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2 shrink-0">
                    {completed}/{total}
                  </span>
                </div>
                <Progress value={progressValue}>
                  <ProgressTrack>
                    <ProgressIndicator variant={variant} />
                  </ProgressTrack>
                </Progress>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
