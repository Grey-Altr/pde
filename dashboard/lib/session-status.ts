export type SessionStatus = 'active' | 'idle' | 'error' | 'complete';

export function deriveStatus(
  lastEventType: string,
  lastEventTsMs: number,
  nowMs: number = Date.now()
): SessionStatus {
  if (lastEventType === 'session_end') return 'complete';
  if (lastEventType.includes('error')) return 'error';
  const ageMs = nowMs - lastEventTsMs;
  if (ageMs < 60_000) return 'active';
  return 'idle';
}
