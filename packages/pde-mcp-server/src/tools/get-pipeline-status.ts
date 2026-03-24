import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export function getPipelineStatusTool(planningDir: string) {
  const handlers = require('../../handlers.cjs');
  return {
    name: 'get-pipeline-status',
    description: 'Returns a JSON summary of the current PDE pipeline stage from DESIGN-STATE.md and design-manifest.json',
    inputSchema: {} as const,
    handler: () => handlers.handleGetPipelineStatus(planningDir),
  };
}
