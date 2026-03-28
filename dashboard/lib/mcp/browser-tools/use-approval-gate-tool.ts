'use client';
import { useWebMCP } from '@mcp-b/react-webmcp';
import { z } from 'zod';

// Schema at module level — prevents zombie re-registrations (Phase 157 decision)
const inputSchema = {
  gate_id: z.string().describe('Gate identifier from workflow output (e.g., wireframe-phase-160-WFR-20260328)'),
  action: z.enum(['approve', 'reject']).describe('Decision for this gate'),
  reason: z.string().optional().describe('Optional reason for the decision'),
};

export function useApprovalGateTool() {
  useWebMCP({
    name: 'pde_approval_gate',
    description: 'Approve or reject a pending PDE workflow gate. Call with the gate_id shown in workflow output.',
    inputSchema,
    handler: async ({ gate_id, action, reason }: { gate_id: string; action: 'approve' | 'reject'; reason?: string }) => {
      const res = await fetch('/api/planning/gates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gate_id, action, reason }),
      });
      if (!res.ok) throw new Error(`Gate action failed: ${res.status}`);
      return await res.json();
    },
  });
}
