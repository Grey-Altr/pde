import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export function getTokensTool(planningDir: string) {
  const handlers = require('../../handlers.cjs');
  return {
    name: 'get-tokens',
    description: 'Returns design tokens as a Tailwind v4 @theme CSS block, converted from DTCG token source',
    inputSchema: {} as const,
    handler: () => handlers.handleGetTokens(planningDir),
  };
}
