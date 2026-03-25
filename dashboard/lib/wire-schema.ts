import { z } from 'zod';

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
