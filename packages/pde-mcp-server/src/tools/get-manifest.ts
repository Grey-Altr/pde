import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export function getManifestTool(planningDir: string) {
  const handlers = require('../../handlers.cjs');
  return {
    name: 'get-manifest',
    description: 'Returns the design-manifest.json describing design artifacts, coverage, and output paths',
    inputSchema: {} as const,
    handler: () => handlers.handleGetManifest(planningDir),
  };
}
