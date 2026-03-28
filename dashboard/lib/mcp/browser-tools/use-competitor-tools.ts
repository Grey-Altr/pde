'use client';
import { useWebMCP } from '@mcp-b/react-webmcp';
import { z } from 'zod';

// Schema at module level -- prevents zombie re-registrations (Phase 157 decision)
const inputSchema = {
  competitor_name: z.string().describe('Competitor name to query (must be an approved competitor from the registry)'),
};

/**
 * Registers a query_competitor_data WebMCP tool that returns competitive
 * analysis data for an approved competitor from the PDE registry.
 *
 * Only competitors with status "approved" in .webmcp/competitor-tools-registry.json
 * are queryable. Pending and rejected competitors return an error.
 *
 * Registry entries are created by /pde:competitive --webmcp (Step 8) and
 * approved via the pde_approval_gate tool.
 */
export function useCompetitorTools() {
  useWebMCP({
    name: 'query_competitor_data',
    description: 'Returns competitive analysis data for an approved competitor from the PDE competitive analysis registry. Only competitors that have been reviewed and approved by a human are queryable.',
    inputSchema,
    handler: async ({ competitor_name }: { competitor_name: string }) => {
      const res = await fetch(
        `/api/planning/competitor-tools?name=${encodeURIComponent(competitor_name)}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(
          `Competitor query failed (${res.status}): ${body.error || 'Not found or not approved'}`
        );
      }
      return await res.json();
    },
  });
}
