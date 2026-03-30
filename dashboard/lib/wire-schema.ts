import { z } from 'zod';

/** INF-03: Session source registry — all valid dispatch origins */
export const SESSION_SOURCES = [
  'local',
  'remote-ssh',
  'remote-managed',
  'remote-cloud',
  'docker',
] as const;

export const SessionSourceSchema = z.enum(SESSION_SOURCES);
export type SessionSource = z.infer<typeof SessionSourceSchema>;

export const WireEnvelopeSchema = z.object({
  seq:            z.number().int().nonnegative(),
  session_id:     z.string().uuid(),
  machine_id:     z.string().min(1),
  relay_ts:       z.string().datetime(),
  approval_id:    z.string().uuid().nullable(),
  schema_version: z.string(),
  ts:             z.string().datetime(),
  event_type:     z.string().min(1),
  extensions:     z.record(z.string(), z.unknown()).optional(),
}).passthrough();

export type WireEnvelope = z.infer<typeof WireEnvelopeSchema>;
