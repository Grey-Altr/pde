"use client";

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { deriveCost, formatTokens, formatCost } from '@/lib/derive-cost';
import type { WireEnvelope } from '@/lib/wire-schema';
import type { ConnectionStatus } from '@/hooks/use-event-stream';

interface CostMeterProps {
  events: WireEnvelope[];
  connectionStatus: ConnectionStatus;
}

export function CostMeter({ events, connectionStatus }: CostMeterProps) {
  const costState = useMemo(() => deriveCost(events), [events]);

  const dimmed = connectionStatus === 'reconnecting';

  return (
    <Card className="w-full">
      <CardContent className="py-4">
        <p className="text-sm font-semibold">Token Usage</p>
        <Separator className="my-2" />
        <div className={`grid grid-cols-3 gap-2 text-center${dimmed ? ' opacity-60' : ''}`}>
          <div>
            <p className="text-lg font-mono font-semibold">
              {formatTokens(costState.inputTokens)}
            </p>
            <p className="text-xs text-muted-foreground">Input</p>
          </div>
          <div>
            <p className="text-lg font-mono font-semibold">
              {formatTokens(costState.outputTokens)}
            </p>
            <p className="text-xs text-muted-foreground">Output</p>
          </div>
          <div>
            <p className="text-lg font-mono font-semibold">
              {formatCost(costState.estimatedCostUsd)}
            </p>
            <p className="text-xs text-muted-foreground">Est. Cost</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
