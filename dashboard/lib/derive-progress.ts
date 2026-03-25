import type { WireEnvelope } from '@/lib/wire-schema';

export interface PhaseProgressState {
  phaseName: string;
  planName: string;
}

export function deriveProgress(events: WireEnvelope[]): PhaseProgressState {
  // events are newest-first; find first event with a non-empty phase name
  for (const ev of events) {
    const payload = ev as Record<string, unknown>;
    const phaseName = String(payload.phase_name ?? '');
    const planName  = String(payload.plan_name ?? '') ||
                      String(payload.plan_id   ?? '');
    if (phaseName) return { phaseName, planName };
  }
  return { phaseName: '', planName: '' };
}
