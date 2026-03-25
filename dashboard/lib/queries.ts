import { redis } from '@/lib/redis';
import { deriveStatus } from '@/lib/session-status';
import type { SessionStatus } from '@/lib/session-status';
import type { WireEnvelope } from '@/lib/wire-schema';

export interface SessionListItem {
  id: string;
  status: SessionStatus;
  phase: string;
  plan: string;
  lastEventType: string;
  lastEventTs: number;
  startedAt: number;
  pendingApprovalId: string | null;  // non-null when approval pending
}

/**
 * Returns the first approval_request event whose approval_id is not matched
 * by any approval_response in the events array. Order-independent (Set-based).
 */
export function findPendingApproval(events: WireEnvelope[]): WireEnvelope | null {
  const respondedIds = new Set<string>();
  for (const ev of events) {
    if (ev.event_type === 'approval_response' && ev.approval_id) {
      respondedIds.add(ev.approval_id);
    }
  }
  for (const ev of events) {
    if (ev.event_type === 'approval_request' && ev.approval_id && !respondedIds.has(ev.approval_id)) {
      return ev;
    }
  }
  return null;
}

export async function getSessions(): Promise<SessionListItem[]> {
  const ids = await redis.zrange('pde:default:sessions', 0, -1, { rev: true });
  if (!ids || ids.length === 0) return [];

  const p = redis.pipeline();
  for (const id of ids) {
    p.hgetall('pde:default:session:' + id);
  }
  const results = await p.exec();

  const sessions: SessionListItem[] = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i] as string;
    const raw = results[i] as Record<string, string> | null;
    if (!raw) continue;

    const lastEventType = raw.last_event_type ?? '';
    const lastEventTs = Number(raw.last_event_ts ?? 0);
    const startedAt = Number(raw.started_at ?? 0);

    sessions.push({
      id,
      status: deriveStatus(lastEventType, lastEventTs),
      phase: raw.phase ?? '',
      plan: raw.plan ?? '',
      lastEventType,
      lastEventTs,
      startedAt,
      pendingApprovalId: raw.pending_approval_id ?? null,
    });
  }
  return sessions;
}

export async function getSessionMeta(sessionId: string): Promise<SessionListItem | null> {
  const raw = await redis.hgetall('pde:default:session:' + sessionId) as Record<string, string> | null;
  if (!raw || Object.keys(raw).length === 0) return null;

  const lastEventType = raw.last_event_type ?? '';
  const lastEventTs = Number(raw.last_event_ts ?? 0);
  const startedAt = Number(raw.started_at ?? 0);

  return {
    id: sessionId,
    status: deriveStatus(lastEventType, lastEventTs),
    phase: raw.phase ?? '',
    plan: raw.plan ?? '',
    lastEventType,
    lastEventTs,
    startedAt,
    pendingApprovalId: raw.pending_approval_id ?? null,
  };
}

export async function getRecentEvents(sessionId: string, count = 10): Promise<WireEnvelope[]> {
  const members = await redis.zrange('pde:default:events:' + sessionId, -count, -1);
  if (!members || members.length === 0) return [];

  const parsed: WireEnvelope[] = [];
  for (const m of members) {
    try {
      const ev = typeof m === 'string' ? JSON.parse(m) : m;
      parsed.push(ev as WireEnvelope);
    } catch {
      // skip malformed entries
    }
  }
  // reverse so newest-first
  return parsed.reverse();
}
