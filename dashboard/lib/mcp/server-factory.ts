import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerPipelineTools } from './tools/index';

export function registerPdeTools(server: McpServer): void {
  server.tool(
    'get_project_state',
    'Returns current PDE project state from .planning/',
    {},
    async () => ({
      content: [{ type: 'text' as const, text: JSON.stringify({ status: 'ok', message: 'PDE project state' }) }],
    }),
  );

  registerPipelineTools(server);
}
