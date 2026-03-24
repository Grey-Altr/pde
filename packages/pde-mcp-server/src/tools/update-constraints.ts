import { createRequire } from 'node:module';
import { z } from 'zod';

const require = createRequire(import.meta.url);

export function updateConstraintsTool(planningDir: string) {
  const handlers = require('../../handlers.cjs');
  return {
    name: 'pde_update_constraints',
    description: 'Overwrites the Constraints section of PROJECT.md, validates content, and re-emits all editor context files',
    inputSchema: {
      content: z.string().describe('New constraints content (1-4000 characters, no HTML comment markers)'),
    },
    handler: (params: { content: string }) => handlers.handleUpdateConstraints(planningDir, params),
  };
}
