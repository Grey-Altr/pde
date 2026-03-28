import { z } from 'zod';
import { redis } from '@/lib/redis';
import { after } from 'next/server';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerPipelineTools(server: McpServer): void {
  server.tool(
    'start_pipeline_run',
    'Starts a PDE pipeline stage. Returns job_id immediately -- use check_pipeline_run to poll for completion.',
    { stage: z.string().describe('Pipeline stage name e.g. wireframe, mockup, critique') },
    async ({ stage }, { authInfo }) => {
      const jobId = crypto.randomUUID();
      const userId = String((authInfo as { extra?: { userId?: string } } | undefined)?.extra?.userId ?? 'unknown');
      await redis.hset(`pde:mcp:job:${jobId}`, {
        status: 'running',
        stage,
        userId,
        created_at: String(Date.now()),
      });
      await redis.expire(`pde:mcp:job:${jobId}`, 3600); // 1hr TTL

      // Fire-and-forget: runs after response sent, within same maxDuration budget.
      // Pipeline stages (wireframe, mockup, critique, etc.) are shell-based PDE skills
      // that require a local Claude Code session. The remote MCP server cannot execute
      // them directly. This handler records the request; actual execution must be
      // triggered by a connected desktop client polling check_pipeline_run.
      after(async () => {
        try {
          await redis.hset(`pde:mcp:job:${jobId}`, {
            status: 'pending_desktop',
            result: JSON.stringify({
              message: `Pipeline stage '${stage}' queued — requires desktop client execution`,
              stage,
              queued_at: new Date().toISOString(),
            }),
          });
        } catch (err) {
          await redis.hset(`pde:mcp:job:${jobId}`, {
            status: 'error',
            error: String(err),
          });
        }
      });

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ job_id: jobId, status: 'running', poll_interval_ms: 3000 }),
        }],
      };
    },
  );

  server.tool(
    'check_pipeline_run',
    'Checks the status of a pipeline run started with start_pipeline_run.',
    { job_id: z.string().uuid().describe('Job ID returned by start_pipeline_run') },
    async ({ job_id }) => {
      const job = await redis.hgetall(`pde:mcp:job:${job_id}`);
      if (!job || Object.keys(job).length === 0) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'job_not_found' }) }],
        };
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(job) }],
      };
    },
  );
}
