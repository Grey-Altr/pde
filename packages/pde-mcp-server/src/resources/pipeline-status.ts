import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export function pipelineStatusResource(planningDir: string) {
  const handlers = require('../../handlers.cjs');
  return {
    name: 'pipeline-status',
    uri: 'pde://pipeline-status',
    metadata: {
      description: 'Current PDE pipeline stage and design coverage — ambient context for editors',
      mimeType: 'application/json',
    },
    handler: (uri: URL) => handlers.handlePipelineStatusResource(planningDir, uri.href),
  };
}
