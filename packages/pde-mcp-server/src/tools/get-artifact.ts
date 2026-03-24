import { createRequire } from 'node:module';
import { z } from 'zod';

const require = createRequire(import.meta.url);

export function getArtifactTool(planningDir: string) {
  const handlers = require('../../handlers.cjs');
  return {
    name: 'get-artifact',
    description: 'Returns the contents of a named design artifact from the design manifest',
    inputSchema: {
      name: z.string().describe('Artifact name from the design manifest (e.g. "tokens", "wireframes")'),
    },
    handler: (params: { name: string }) => handlers.handleGetArtifact(planningDir, params),
  };
}
