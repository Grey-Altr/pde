'use client';
import { useWebMCP } from '@mcp-b/react-webmcp';
import { z } from 'zod';

// Schema defined OUTSIDE component — stable reference prevents re-registration
const inputSchema = {
  filter: z.string().optional().describe('Optional name filter for artifacts (case-insensitive)'),
};

export function useArtifactListTool() {
  useWebMCP({
    name: 'list_artifacts',
    description: 'Lists PDE design artifacts from .planning/design/handoff/ with optional name filtering',
    inputSchema,
    handler: async ({ filter }: { filter?: string }) => {
      const url = filter
        ? `/api/planning/artifacts?filter=${encodeURIComponent(filter)}`
        : '/api/planning/artifacts';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch artifacts: ${res.status}`);
      return await res.json();
    },
  });
}
