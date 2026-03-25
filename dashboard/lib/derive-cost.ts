import type { WireEnvelope } from '@/lib/wire-schema';

export interface CostState {
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

// Claude Sonnet 4.5 pricing: $3/M input, $15/M output
const INPUT_COST_PER_MILLION = 3;
const OUTPUT_COST_PER_MILLION = 15;

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
