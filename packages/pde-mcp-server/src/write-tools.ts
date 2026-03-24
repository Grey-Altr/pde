import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { updateConstraintsTool } from './tools/update-constraints.js';
import { updateTechStackTool } from './tools/update-tech-stack.js';
import { appendContextNoteTool } from './tools/append-context-note.js';
import { flagDivergenceTool } from './tools/flag-divergence.js';

/**
 * Register all write tools with the MCP server.
 * Called only when --enable-writes flag is present.
 * MUST be called before server.connect(transport).
 * @param server - McpServer instance
 * @param planningDir - Absolute path to .planning/ directory
 */
export function registerWriteTools(server: McpServer, planningDir: string): void {
  const tools = [
    updateConstraintsTool(planningDir),
    updateTechStackTool(planningDir),
    appendContextNoteTool(planningDir),
    flagDivergenceTool(planningDir),
  ];

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      tool.handler
    );
  }
}
