import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export function listArtifactsTool(planningDir: string) {
  const handlers = require('../../handlers.cjs');
  return {
    name: 'list-artifacts',
    description: 'Lists all available design artifact names from the design manifest',
    inputSchema: {} as const,
    handler: () => handlers.handleListArtifacts(planningDir),
  };
}
