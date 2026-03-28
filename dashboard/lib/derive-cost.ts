import type { WireEnvelope } from '@/lib/wire-schema';

export interface CostState {
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

export interface ToolCostRow {
  agentId: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  toolCalls: number;
}

// Claude Sonnet 4.6 pricing: $3/M input, $15/M output
export const INPUT_COST_PER_MILLION = 3;
export const OUTPUT_COST_PER_MILLION = 15;

export function deriveCost(events: WireEnvelope[]): CostState {
  let inputTokens = 0;
  let outputTokens = 0;
  for (const ev of events) {
    const payload = ev as Record<string, unknown>;
    inputTokens += Number(payload.input_tokens ?? 0);
    outputTokens += Number(payload.output_tokens ?? 0);
  }
  const estimatedCostUsd =
    (inputTokens / 1_000_000) * INPUT_COST_PER_MILLION +
    (outputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION;
  return { inputTokens, outputTokens, estimatedCostUsd };
}

export function deriveToolBreakdown(events: WireEnvelope[]): ToolCostRow[] {
  const agentMaxTokens = new Map<string, { input: number; output: number }>();
  const agentToolCalls = new Map<string, number>();

  for (const ev of events) {
    const p = ev as Record<string, unknown>;
    const agentId = p.agent_id ? String(p.agent_id) : null;

    if (ev.event_type === 'token_usage') {
      const id = agentId ?? 'unknown';
      const prev = agentMaxTokens.get(id) ?? { input: 0, output: 0 };
      agentMaxTokens.set(id, {
        input:  Math.max(prev.input,  Number(p.input_tokens  ?? 0)),
        output: Math.max(prev.output, Number(p.output_tokens ?? 0)),
      });
    }

    if (
      (ev.event_type === 'tool_called' || ev.event_type === 'bash_called' || ev.event_type === 'file_changed')
      && agentId
    ) {
      agentToolCalls.set(agentId, (agentToolCalls.get(agentId) ?? 0) + 1);
    }
  }

  return Array.from(agentMaxTokens.entries()).map(([agentId, t]) => ({
    agentId,
    inputTokens:  t.input,
    outputTokens: t.output,
    estimatedCostUsd:
      (t.input  / 1_000_000) * INPUT_COST_PER_MILLION +
      (t.output / 1_000_000) * OUTPUT_COST_PER_MILLION,
    toolCalls: agentToolCalls.get(agentId) ?? 0,
  }));
}

export function deriveContextUsage(
  events: WireEnvelope[],
  contextWindowSize = 1_000_000
): { inputTokens: number; percentUsed: number; contextWindowSize: number } {
  const { inputTokens } = deriveCost(events);
  const percentUsed = Math.min((inputTokens / contextWindowSize) * 100, 100);
  return { inputTokens, percentUsed, contextWindowSize };
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function formatCost(usd: number): string {
  if (usd === 0) return '$0.00';
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}
