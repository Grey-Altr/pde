export type SessionStatus = 'active' | 'idle' | 'error' | 'complete' | 'failed' | 'queued';

export function deriveStatus(
  lastEventType: string,
  lastEventTsMs: number,
  nowMs: number = Date.now()
): SessionStatus {
  if (lastEventType === 'session_end') return 'complete';
  if (lastEventType.includes('fail')) return 'failed';
  if (lastEventType.includes('error')) return 'error';
  if (lastEventType === 'session_queued') return 'queued';
  const ageMs = nowMs - lastEventTsMs;
  if (ageMs < 60_000) return 'active';
  return 'idle';
}
