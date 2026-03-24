import { createRequire } from 'node:module';
import { z } from 'zod';

const require = createRequire(import.meta.url);

export function updateTechStackTool(planningDir: string) {
  const handlers = require('../../handlers.cjs');
  return {
    name: 'pde_update_tech_stack',
    description: 'Overwrites the Tech Stack section of PROJECT.md, validates content, and re-emits all editor context files',
    inputSchema: {
      content: z.string().describe('New tech stack content (1-4000 characters, no HTML comment markers)'),
    },
    handler: (params: { content: string }) => handlers.handleUpdateTechStack(planningDir, params),
  };
}
