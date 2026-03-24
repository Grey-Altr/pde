import { createRequire } from 'node:module';
import { z } from 'zod';

const require = createRequire(import.meta.url);

export function getHandoffTool(planningDir: string) {
  const handlers = require('../../handlers.cjs');
  return {
    name: 'get-handoff',
    description: 'Returns a design handoff file by name, or lists available handoff files if no name is provided',
    inputSchema: {
      name: z.string().optional().describe('Handoff file name without .md extension (e.g. "component-handoff")'),
    },
    handler: (params: { name?: string }) => handlers.handleGetHandoff(planningDir, params),
  };
}
