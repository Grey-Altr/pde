import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { registerPipelineTools } from './tools/index';

/**
 * Registers all PDE tools on the given McpServer instance.
 *
 * This function is pure — it only calls server.tool(). It does NOT create
 * a transport or call server.connect(). The caller (HTTP route handler in
 * Plan 02) is responsible for transport lifecycle.
 */
export function registerPdeTools(server: McpServer): void {
  server.tool(
    'get_project_state',
    'Returns current PDE project state from .planning/',
    {},
    async () => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ status: 'ok', message: 'PDE project state' }),
        },
      ],
    }),
  );

  registerPipelineTools(server);
}
