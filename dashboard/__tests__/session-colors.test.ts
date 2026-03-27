import { describe, it, expect } from 'vitest';
import { sessionColor, SESSION_PALETTE } from '@/lib/session-colors';

describe('session-colors', () => {
  it('SESSION_PALETTE has exactly 6 entries', () => {
    expect(SESSION_PALETTE.length).toBe(6);
  });

  it('sessionColor(0) returns the first palette entry (blue)', () => {
    expect(sessionColor(0)).toBe('bg-blue-500/20 text-blue-400 border-blue-500/30');
  });

  it('sessionColor(6) wraps to index 0 (same as sessionColor(0))', () => {
    expect(sessionColor(6)).toBe(sessionColor(0));
  });

  it('sessionColor(1) returns emerald entry', () => {
    expect(sessionColor(1)).toBe('bg-emerald-500/20 text-emerald-400 border-emerald-500/30');
  });

  it('sessionColor(2) returns violet entry', () => {
    expect(sessionColor(2)).toBe('bg-violet-500/20 text-violet-400 border-violet-500/30');
  });

  it('sessionColor(3) returns amber entry', () => {
    expect(sessionColor(3)).toBe('bg-amber-500/20 text-amber-400 border-amber-500/30');
  });

  it('sessionColor(4) returns rose entry', () => {
    expect(sessionColor(4)).toBe('bg-rose-500/20 text-rose-400 border-rose-500/30');
  });

  it('sessionColor(5) returns cyan entry', () => {
    expect(sessionColor(5)).toBe('bg-cyan-500/20 text-cyan-400 border-cyan-500/30');
  });

  it('sessionColor wraps at modulo 6 for large indices', () => {
    expect(sessionColor(12)).toBe(sessionColor(0));
    expect(sessionColor(13)).toBe(sessionColor(1));
  });
});
