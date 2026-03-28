'use client';
import { useWebMCP } from '@mcp-b/react-webmcp';

// Schema defined OUTSIDE component — stable reference prevents re-registration
const inputSchema = {};

export function useProjectInfoTool() {
  useWebMCP({
    name: 'get_project_info',
    description: 'Returns PDE project name, milestone, current phase, and core value from .planning/PROJECT.md',
    inputSchema,
    handler: async () => {
      const res = await fetch('/api/planning/project-info');
      if (!res.ok) throw new Error(`Failed to fetch project info: ${res.status}`);
      return await res.json();
    },
  });
}
