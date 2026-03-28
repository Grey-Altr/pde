import type { WireEnvelope } from '../wire-schema';
import { deriveCost, deriveToolBreakdown, deriveContextUsage, formatTokens, formatCost } from '../derive-cost';

function mockEnvelope(overrides: Partial<WireEnvelope> & { event_type: string }): WireEnvelope {
  return {
    seq: 0,
    session_id: '00000000-0000-0000-0000-000000000001',
    machine_id: 'test-machine',
    relay_ts: new Date().toISOString(),
    approval_id: null,
    schema_version: '1.0.0',
    ts: new Date().toISOString(),
    ...overrides,
  } as WireEnvelope;
}

describe('deriveCost', () => {
  it('returns zero totals for empty events array', () => {
    const result = deriveCost([]);
    expect(result).toEqual({ inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 });
  });

  it('accumulates input_tokens and output_tokens from events', () => {
    const events = [
      mockEnvelope({ event_type: 'tool_called', input_tokens: 1000, output_tokens: 500 } as any),
      mockEnvelope({ event_type: 'tool_called', input_tokens: 200, output_tokens: 100 } as any),
    ];
    const result = deriveCost(events);
    expect(result.inputTokens).toBe(1200);
    expect(result.outputTokens).toBe(600);
  });

  it('returns zero totals gracefully when no token fields are present', () => {
    const events = [
      mockEnvelope({ event_type: 'file_changed' }),
      mockEnvelope({ event_type: 'bash_called' }),
    ];
    expect(() => deriveCost(events)).not.toThrow();
    const result = deriveCost(events);
    expect(result.inputTokens).toBe(0);
    expect(result.outputTokens).toBe(0);
    expect(result.estimatedCostUsd).toBe(0);
  });

  it('calculates estimatedCostUsd as (inputTokens/1M)*3 + (outputTokens/1M)*15', () => {
    const events = [
      mockEnvelope({ event_type: 'tool_called', input_tokens: 1_000_000, output_tokens: 1_000_000 } as any),
    ];
    const result = deriveCost(events);
    expect(result.estimatedCostUsd).toBe(18); // 3 + 15
  });

  it('calculates cost proportionally for partial millions', () => {
    const events = [
      mockEnvelope({ event_type: 'tool_called', input_tokens: 500_000, output_tokens: 0 } as any),
    ];
    const result = deriveCost(events);
    expect(result.estimatedCostUsd).toBeCloseTo(1.5); // 0.5M * $3
  });
});

describe('formatTokens', () => {
  it('returns "0" for 0', () => {
    expect(formatTokens(0)).toBe('0');
  });

  it('returns "999" for 999', () => {
    expect(formatTokens(999)).toBe('999');
  });

  it('returns "1.2k" for 1234', () => {
    expect(formatTokens(1234)).toBe('1.2k');
  });

  it('returns "1.2M" for 1_234_567', () => {
    expect(formatTokens(1_234_567)).toBe('1.2M');
  });
});

describe('formatCost', () => {
  it('returns "$0.00" for 0', () => {
    expect(formatCost(0)).toBe('$0.00');
  });

  it('returns "$0.0042" for 0.0042', () => {
    expect(formatCost(0.0042)).toBe('$0.0042');
  });

  it('returns "$1.50" for 1.50', () => {
    expect(formatCost(1.50)).toBe('$1.50');
  });
});

describe('deriveToolBreakdown', () => {
  it('returns empty array for events with no token_usage', () => {
    const events = [
      mockEnvelope({ event_type: 'tool_called' }),
      mockEnvelope({ event_type: 'bash_called' }),
    ];
    const result = deriveToolBreakdown(events);
    expect(result.length).toBe(0);
  });

  it('groups by agent_id and takes max tokens', () => {
    const events = [
      mockEnvelope({ event_type: 'token_usage', agent_id: 'agent-1', input_tokens: 1000, output_tokens: 400 } as any),
      mockEnvelope({ event_type: 'token_usage', agent_id: 'agent-1', input_tokens: 2500, output_tokens: 900 } as any),
    ];
    const result = deriveToolBreakdown(events);
    expect(result.length).toBe(1);
    expect(result[0].agentId).toBe('agent-1');
    expect(result[0].inputTokens).toBe(2500);
    expect(result[0].outputTokens).toBe(900);
  });

  it('counts tool calls per agent', () => {
    const events = [
      mockEnvelope({ event_type: 'token_usage', agent_id: 'agent-1', input_tokens: 100, output_tokens: 50 } as any),
      mockEnvelope({ event_type: 'token_usage', agent_id: 'agent-2', input_tokens: 200, output_tokens: 80 } as any),
      mockEnvelope({ event_type: 'tool_called', agent_id: 'agent-1' } as any),
      mockEnvelope({ event_type: 'tool_called', agent_id: 'agent-1' } as any),
      mockEnvelope({ event_type: 'tool_called', agent_id: 'agent-1' } as any),
      mockEnvelope({ event_type: 'bash_called', agent_id: 'agent-1' } as any),
      mockEnvelope({ event_type: 'file_changed', agent_id: 'agent-2' } as any),
    ];
    const result = deriveToolBreakdown(events);
    const agent1 = result.find(r => r.agentId === 'agent-1');
    const agent2 = result.find(r => r.agentId === 'agent-2');
    expect(agent1?.toolCalls).toBe(4);
    expect(agent2?.toolCalls).toBe(1);
  });

  it('calculates cost per agent', () => {
    const events = [
      mockEnvelope({ event_type: 'token_usage', agent_id: 'agent-1', input_tokens: 1_000_000, output_tokens: 1_000_000 } as any),
    ];
    const result = deriveToolBreakdown(events);
    expect(result.length).toBe(1);
    expect(result[0].estimatedCostUsd).toBe(18);
  });

  it('handles missing agent_id', () => {
    const events = [
      mockEnvelope({ event_type: 'token_usage', input_tokens: 500, output_tokens: 200 } as any),
    ];
    const result = deriveToolBreakdown(events);
    expect(result.length).toBe(1);
    expect(result[0].agentId).toBe('unknown');
  });

  it('multi-agent scenario with correct max-not-sum', () => {
    const events = [
      mockEnvelope({ event_type: 'token_usage', agent_id: 'agent-a', input_tokens: 1000, output_tokens: 300 } as any),
      mockEnvelope({ event_type: 'token_usage', agent_id: 'agent-a', input_tokens: 2000, output_tokens: 600 } as any),
      mockEnvelope({ event_type: 'token_usage', agent_id: 'agent-b', input_tokens: 500, output_tokens: 150 } as any),
      mockEnvelope({ event_type: 'token_usage', agent_id: 'agent-b', input_tokens: 1500, output_tokens: 450 } as any),
    ];
    const result = deriveToolBreakdown(events);
    const agentA = result.find(r => r.agentId === 'agent-a');
    const agentB = result.find(r => r.agentId === 'agent-b');
    expect(agentA?.inputTokens).toBe(2000);
    expect(agentB?.inputTokens).toBe(1500);
  });
});

describe('deriveContextUsage', () => {
  it('returns 0 for empty events', () => {
    const result = deriveContextUsage([]);
    expect(result.percentUsed).toBe(0);
  });

  it('calculates percentage with default 1M window', () => {
    const events = [
      mockEnvelope({ event_type: 'token_usage', input_tokens: 500_000, output_tokens: 0 } as any),
    ];
    const result = deriveContextUsage(events);
    expect(result.percentUsed).toBe(50);
  });

  it('clamps to 100 when exceeding window', () => {
    const events = [
      mockEnvelope({ event_type: 'token_usage', input_tokens: 1_500_000, output_tokens: 0 } as any),
    ];
    const result = deriveContextUsage(events);
    expect(result.percentUsed).toBe(100);
  });

  it('accepts custom context window size', () => {
    const events = [
      mockEnvelope({ event_type: 'token_usage', input_tokens: 100_000, output_tokens: 0 } as any),
    ];
    const result = deriveContextUsage(events, 200_000);
    expect(result.percentUsed).toBe(50);
  });
});

describe('displayCostUsd Math.max pattern (page-refresh persistence)', () => {
  it('uses live cost when it exceeds the persisted cost from Redis SSR', () => {
    // Simulates: user has been watching a session and accumulated more cost live
    // than what was last persisted to Redis
    const liveCost = deriveCost([
      mockEnvelope({ event_type: 'token_usage', input_tokens: 1_000_000, output_tokens: 1_000_000 } as any),
    ]);
    const initialPersistedCostUsd = 5.00; // stale Redis value
    const displayCostUsd = Math.max(liveCost.estimatedCostUsd, initialPersistedCostUsd);
    // liveCost = $18, persisted = $5 → should show live
    expect(displayCostUsd).toBe(18);
  });

  it('uses persisted cost when live cost is lower (page refresh scenario)', () => {
    // Simulates: user just refreshed the page, events haven't replayed yet
    // Redis has the accumulated cost from the previous session view
    const liveCost = deriveCost([]); // no events after refresh yet
    const initialPersistedCostUsd = 12.50; // previously persisted via Redis hydration
    const displayCostUsd = Math.max(liveCost.estimatedCostUsd, initialPersistedCostUsd);
    // liveCost = $0, persisted = $12.50 → should show persisted (survives refresh)
    expect(displayCostUsd).toBe(12.50);
  });

  it('returns zero when both live and persisted costs are zero', () => {
    const liveCost = deriveCost([]);
    const initialPersistedCostUsd = 0;
    const displayCostUsd = Math.max(liveCost.estimatedCostUsd, initialPersistedCostUsd);
    expect(displayCostUsd).toBe(0);
  });
});
