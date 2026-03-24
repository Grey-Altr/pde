import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export function getRequirementsTool(planningDir: string) {
  const handlers = require('../../handlers.cjs');
  return {
    name: 'get-requirements',
    description: 'Returns the PDE REQUIREMENTS.md with all tracked requirements and their status',
    inputSchema: {} as const,
    handler: () => handlers.handleGetRequirements(planningDir),
  };
}
