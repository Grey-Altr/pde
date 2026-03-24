#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { discoverPlanningDir } from './discover.js';
import { getProjectTool } from './tools/get-project.js';
import { getDesignStateTool } from './tools/get-design-state.js';
import { getManifestTool } from './tools/get-manifest.js';
import { getTokensTool } from './tools/get-tokens.js';
import { getHandoffTool } from './tools/get-handoff.js';
import { getArtifactTool } from './tools/get-artifact.js';
import { getRoadmapTool } from './tools/get-roadmap.js';
import { getRequirementsTool } from './tools/get-requirements.js';
import { getPipelineStatusTool } from './tools/get-pipeline-status.js';
import { listArtifactsTool } from './tools/list-artifacts.js';
import { pipelineStatusResource } from './resources/pipeline-status.js';

// ─── Resolve planningDir ──────────────────────────────────────────────────────

// Support --planning-dir CLI arg as override (for editors that can't set cwd)
let planningDir: string | null = null;
const planningDirArgIdx = process.argv.indexOf('--planning-dir');
if (planningDirArgIdx !== -1 && process.argv[planningDirArgIdx + 1]) {
  planningDir = process.argv[planningDirArgIdx + 1];
  process.stderr.write(`pde-mcp-server: Using --planning-dir override: ${planningDir}\n`);
} else {
  planningDir = discoverPlanningDir(process.cwd());
}

if (!planningDir) {
  process.stderr.write(
    'pde-mcp-server: No .planning/ directory found. ' +
    'Run from your project root or use --planning-dir /path/to/.planning\n'
  );
  process.exit(1);
}

process.stderr.write(`pde-mcp-server: Using planningDir: ${planningDir}\n`);

// ─── Server setup ─────────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'pde-mcp-server',
  version: '0.1.0',
});

// ─── Register 10 read-only tools ─────────────────────────────────────────────

const tools = [
  getProjectTool(planningDir),
  getDesignStateTool(planningDir),
  getManifestTool(planningDir),
  getTokensTool(planningDir),
  getHandoffTool(planningDir),
  getArtifactTool(planningDir),
  getRoadmapTool(planningDir),
  getRequirementsTool(planningDir),
  getPipelineStatusTool(planningDir),
  listArtifactsTool(planningDir),
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

// ─── Register pipeline-status resource ───────────────────────────────────────

const resource = pipelineStatusResource(planningDir);
server.registerResource(
  resource.name,
  resource.uri,
  resource.metadata,
  resource.handler
);

// ─── Start transport ──────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
