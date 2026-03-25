import type { WireEnvelope } from '../wire-schema';
import { deriveCost, formatTokens, formatCost } from '../derive-cost';

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
