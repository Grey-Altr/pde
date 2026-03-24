import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export function getDesignStateTool(planningDir: string) {
  const handlers = require('../../handlers.cjs');
  return {
    name: 'get-design-state',
    description: 'Returns the current PDE pipeline stage and design coverage from DESIGN-STATE.md',
    inputSchema: {} as const,
    handler: () => handlers.handleGetDesignState(planningDir),
  };
}
