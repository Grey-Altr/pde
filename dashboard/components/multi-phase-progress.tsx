"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress, ProgressIndicator } from '@/components/ui/progress';
import { sessionColor } from '@/lib/session-colors';
import { cn } from '@/lib/utils';
import type { SessionListItem } from '@/lib/queries';
import type { ProgressVariant } from '@/components/ui/progress';

interface MultiPhaseProgressProps {
  sessions: SessionListItem[];
}

function deriveVariant(phaseSessions: SessionListItem[]): ProgressVariant {
  const statuses = phaseSessions.map(s => s.status);
  if (statuses.some(s => s === 'failed' || s === 'error')) return 'failed';
  if (statuses.some(s => s === 'active')) return 'executing';
  if (statuses.every(s => s === 'complete')) return 'complete';
  return 'waiting';
}

function deriveValue(variant: ProgressVariant): number | null {
  return variant === 'complete' ? 100 : null;
}

export function MultiPhaseProgress({ sessions }: MultiPhaseProgressProps) {
  if (sessions.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="py-6 text-center text-muted-foreground text-sm">
          No phases in progress
        </CardContent>
      </Card>
    );
  }

  // Group sessions by phase name, preserving insertion order
  const phaseMap = new Map<string, SessionListItem[]>();
  for (const session of sessions) {
    const phaseName = session.phase || 'Unknown';
    const existing = phaseMap.get(phaseName);
    if (existing) {
      existing.push(session);
    } else {
      phaseMap.set(phaseName, [session]);
    }
  }

  const phases = Array.from(phaseMap.entries());

  return (
    <Card className="w-full">
      <CardContent className="py-4 space-y-3">
        {phases.map(([phaseName, phaseSessions], phaseIndex) => {
          const variant = deriveVariant(phaseSessions);
          const value = deriveValue(variant);
          const accent = sessionColor(phaseIndex);

          return (
            <div key={phaseName} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn("w-2 h-2 rounded-full shrink-0", accent.split(' ')[0])}
                    aria-hidden
                  />
                  <span
                    className={cn("text-sm font-medium truncate", accent.split(' ')[1])}
                  >
                    {phaseName}
                  </span>
                </div>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {phaseSessions.length} {phaseSessions.length === 1 ? 'session' : 'sessions'}
                </Badge>
              </div>
              <Progress value={value} className="h-2">
                <ProgressIndicator variant={variant} />
              </Progress>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
