import fs from 'node:fs';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { registerPipelineTools } from './tools/index';
import { registerArtifactPreviewTools } from './apps/artifact-preview';

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
    async () => {
      const planningDir = path.join(process.cwd(), '.planning');
      const projectPath = path.join(planningDir, 'PROJECT.md');

      if (!fs.existsSync(projectPath)) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'PROJECT.md not found' }) }],
        };
      }

      const content = fs.readFileSync(projectPath, 'utf-8');
      const lines = content.split('\n');

      const nameLine = lines.find(l => l.startsWith('# '));
      const projectName = nameLine ? nameLine.replace(/^# /, '').trim() : '';

      const milestoneLine = lines.find(l => l.includes('**Current milestone:**'));
      const milestone = milestoneLine
        ? milestoneLine.replace(/.*\*\*Current milestone:\*\*\s*/, '').trim()
        : '';

      const phaseLine = lines.find(l => l.includes('**Current phase:**'));
      const currentPhase = phaseLine
        ? phaseLine.replace(/.*\*\*Current phase:\*\*\s*/, '').trim()
        : '';

      const coreValueLine = lines.find(l => l.includes('**Core value:**'));
      const coreValue = coreValueLine
        ? coreValueLine.replace(/.*\*\*Core value:\*\*\s*/, '').trim()
        : '';

      // Read ROADMAP.md for phase progress
      const roadmapPath = path.join(planningDir, 'ROADMAP.md');
      let phases: { name: string; status: string }[] = [];
      if (fs.existsSync(roadmapPath)) {
        const roadmap = fs.readFileSync(roadmapPath, 'utf-8');
        const phaseLines = roadmap.split('\n').filter(l => /^- \[.\] \*\*Phase \d+/.test(l));
        phases = phaseLines.map(l => ({
          name: l.replace(/^- \[.\] /, '').replace(/\*\*/g, '').trim(),
          status: l.startsWith('- [x]') ? 'complete' : 'in_progress',
        }));
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ projectName, milestone, currentPhase, coreValue, phases }),
        }],
      };
    },
  );

  registerPipelineTools(server);
  registerArtifactPreviewTools(server);
}
