"use client";

import { useMemo, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { deriveCost, deriveToolBreakdown, deriveContextUsage, formatTokens, formatCost } from '@/lib/derive-cost';
import { persistSessionCost } from '@/app/actions';
import type { WireEnvelope } from '@/lib/wire-schema';
import type { ConnectionStatus } from '@/hooks/use-event-stream';

interface TokenPlaygroundProps {
  events: WireEnvelope[];
  connectionStatus: ConnectionStatus;
  sessionId: string;
  initialPersistedCostUsd: number;
}

export function TokenPlayground({ events, connectionStatus, sessionId, initialPersistedCostUsd }: TokenPlaygroundProps) {
  const costState = useMemo(() => deriveCost(events), [events]);
  const breakdown = useMemo(() => deriveToolBreakdown(events), [events]);
  const contextUsage = useMemo(() => deriveContextUsage(events), [events]);

  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (costState.inputTokens === 0) return;
    if (pendingRef.current) clearTimeout(pendingRef.current);
    pendingRef.current = setTimeout(() => {
      persistSessionCost(sessionId, costState.inputTokens, costState.outputTokens).catch(() => {});
    }, 5_000);
    return () => { if (pendingRef.current) clearTimeout(pendingRef.current); };
  }, [sessionId, costState.inputTokens, costState.outputTokens]);

  const displayCostUsd = Math.max(costState.estimatedCostUsd, initialPersistedCostUsd);

  const dimmed = connectionStatus === 'reconnecting';

  return (
    <>
      {/* Card 1: Context Window */}
      <Card className="w-full">
        <CardContent className="py-4">
          <p className="text-sm font-semibold">Context Window</p>
          <Separator className="my-2" />
          <div className={dimmed ? 'opacity-60' : ''}>
            <Progress value={contextUsage.percentUsed} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {formatTokens(contextUsage.inputTokens)} input tokens &bull; {contextUsage.percentUsed.toFixed(1)}% context est.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Session Cost */}
      <Card className="w-full">
        <CardContent className="py-4">
          <p className="text-sm font-semibold">Session Cost</p>
          <Separator className="my-2" />
          <div className={`grid grid-cols-3 gap-2 text-center${dimmed ? ' opacity-60' : ''}`}>
            <div>
              <p className="text-lg font-mono font-semibold">{formatTokens(costState.inputTokens)}</p>
              <p className="text-xs text-muted-foreground">Input</p>
            </div>
            <div>
              <p className="text-lg font-mono font-semibold">{formatTokens(costState.outputTokens)}</p>
              <p className="text-xs text-muted-foreground">Output</p>
            </div>
            <div>
              <p className="text-lg font-mono font-semibold">{formatCost(displayCostUsd)}</p>
              <p className="text-xs text-muted-foreground">Est. Cost</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Per-Agent Breakdown */}
      <Card className="w-full">
        <CardContent className="py-4">
          <p className="text-sm font-semibold">Per-Agent Breakdown</p>
          <Separator className="my-2" />
          <div className={dimmed ? 'opacity-60' : ''}>
            {breakdown.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm font-semibold">No agent data yet</p>
                <p className="text-sm text-muted-foreground">Token costs appear here as Claude Code executes tools.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-sm font-semibold">
                    <th className="text-left py-1">Agent</th>
                    <th className="text-right py-1">Calls</th>
                    <th className="text-right py-1">Input</th>
                    <th className="text-right py-1">Output</th>
                    <th className="text-right py-1">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((row) => (
                    <tr key={row.agentId}>
                      <td className="py-1">
                        <Badge variant="secondary">
                          {row.agentId.length > 12 ? row.agentId.slice(0, 12) + '\u2026' : row.agentId}
                        </Badge>
                      </td>
                      <td className="text-right font-mono py-1">{row.toolCalls}</td>
                      <td className="text-right font-mono py-1">{formatTokens(row.inputTokens)}</td>
                      <td className="text-right font-mono py-1">{formatTokens(row.outputTokens)}</td>
                      <td className="text-right font-mono py-1">{formatCost(row.estimatedCostUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
