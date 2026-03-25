import type { WireEnvelope } from '@/lib/wire-schema';

export interface PhaseProgressState {
  phaseName: string;
  planName: string;
}

export function deriveProgress(events: WireEnvelope[]): PhaseProgressState {
  // events are newest-first; find first event with a non-empty phase name
  for (const ev of events) {
    const ext = ev.extensions as Record<string, string> | undefined;
    const phaseName = ext?.phase_name ?? '';
    const planName = ext?.plan_name ?? '';
    if (phaseName) return { phaseName, planName };
  }
  return { phaseName: '', planName: '' };
}
