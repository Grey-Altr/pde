import { createRequire } from 'node:module';
import { z } from 'zod';

const require = createRequire(import.meta.url);

export function flagDivergenceTool(planningDir: string) {
  const handlers = require('../../handlers.cjs');
  return {
    name: 'pde_flag_divergence',
    description: 'Flags a component as diverged from design specifications. Does not trigger editor re-emission.',
    inputSchema: {
      component: z.string().describe('Component name (e.g. Button, Header)'),
      reason: z.string().describe('Why the component has diverged'),
      severity: z.enum(['low', 'medium', 'high']).describe('Divergence severity'),
    },
    handler: (params: { component: string; reason: string; severity: string }) =>
      handlers.handleFlagDivergence(planningDir, params),
  };
}
