import { createRequire } from 'node:module';
import { z } from 'zod';

const require = createRequire(import.meta.url);

export function appendContextNoteTool(planningDir: string) {
  const handlers = require('../../handlers.cjs');
  return {
    name: 'pde_append_context_note',
    description: 'Appends a timestamped note to a project context category file and re-emits editor context',
    inputSchema: {
      category: z.enum(['design', 'technical', 'product', 'research', 'decision']).describe('Note category'),
      note: z.string().describe('Note content to append'),
    },
    handler: (params: { category: string; note: string }) =>
      handlers.handleAppendContextNote(planningDir, params),
  };
}
