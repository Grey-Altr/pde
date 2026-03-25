"use client";

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { deriveProgress } from '@/lib/derive-progress';
import type { WireEnvelope } from '@/lib/wire-schema';
import type { ConnectionStatus } from '@/hooks/use-event-stream';

interface PhaseProgressProps {
  events: WireEnvelope[];
  connectionStatus: ConnectionStatus;
}

export function PhaseProgress({ events, connectionStatus }: PhaseProgressProps) {
  const { phaseName, planName } = useMemo(() => deriveProgress(events), [events]);

  const dimmed = connectionStatus === 'reconnecting';

  return (
    <Card className="w-full">
      <CardContent className="py-4">
        <p className="text-sm font-semibold">Phase Progress</p>
        <Separator className="my-2" />
        <div className={dimmed ? 'opacity-60' : undefined}>
          <p className="text-base font-semibold">
            {phaseName || 'No active phase'}
          </p>
          <Progress className="h-1.5 mt-1" value={null} />
          {planName && (
            <div className="ml-3 mt-2">
              <p className="text-xs text-muted-foreground">{planName}</p>
              <Progress className="h-1 mt-0.5" value={null} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
