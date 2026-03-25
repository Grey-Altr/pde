import { describe, it, expect } from 'vitest';
import { deriveStatus } from '../session-status';

const NOW = 1_700_000_000_000;

describe('deriveStatus', () => {
  it('returns "complete" for session_end event', () => {
    expect(deriveStatus('session_end', NOW - 120_000, NOW)).toBe('complete');
  });

  it('returns "error" for event_type containing "error"', () => {
    expect(deriveStatus('tool_error', NOW - 30_000, NOW)).toBe('error');
  });

  it('returns "active" for event less than 60s old', () => {
    expect(deriveStatus('tool_use', NOW - 30_000, NOW)).toBe('active');
  });

  it('returns "idle" for event 60s or older', () => {
    expect(deriveStatus('tool_use', NOW - 60_000, NOW)).toBe('idle');
  });
});
