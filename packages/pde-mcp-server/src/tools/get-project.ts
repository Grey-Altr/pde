import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export function getProjectTool(planningDir: string) {
  const handlers = require('../../handlers.cjs');
  return {
    name: 'get-project',
    description: 'Returns the PDE PROJECT.md contents describing project identity, tech stack, and constraints',
    inputSchema: {} as const,
    handler: () => handlers.handleGetProject(planningDir),
  };
}
