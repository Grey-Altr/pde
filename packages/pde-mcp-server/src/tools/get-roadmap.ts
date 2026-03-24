import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export function getRoadmapTool(planningDir: string) {
  const handlers = require('../../handlers.cjs');
  return {
    name: 'get-roadmap',
    description: 'Returns the PDE ROADMAP.md with phases, milestones, and current progress',
    inputSchema: {} as const,
    handler: () => handlers.handleGetRoadmap(planningDir),
  };
}
