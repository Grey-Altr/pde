import type { WireEnvelope } from '@/lib/wire-schema';

export const EVENT_FILTER_GROUPS = {
  all:       null,
  tools:     ['tool_called', 'bash_called', 'file_changed'],
  agents:    ['subagent_start', 'subagent_stop'],
  phases:    ['session_start', 'session_end'],
  errors:    ['error'],
  tokens:    ['token_usage'],
  approvals: ['approval_request', 'approval_response'],
} as const;

export type FilterGroup = keyof typeof EVENT_FILTER_GROUPS;

export function filterEvents(events: WireEnvelope[], group: FilterGroup): WireEnvelope[] {
  const allowed = EVENT_FILTER_GROUPS[group];
  if (allowed === null) return events;
  return events.filter((ev) => (allowed as readonly string[]).includes(ev.event_type));
}
