'use client';
import { useWebMCP } from '@mcp-b/react-webmcp';

// Schema defined OUTSIDE component — stable reference prevents re-registration
const inputSchema = {};

export function useDesignStateTool() {
  useWebMCP({
    name: 'get_design_state',
    description: 'Returns current PDE design phase, active artifacts, and review status from .planning/design/DESIGN-STATE.md',
    inputSchema,
    handler: async () => {
      const res = await fetch('/api/planning/design-state');
      if (!res.ok) throw new Error(`Failed to fetch design state: ${res.status}`);
      return await res.json();
    },
  });
}
