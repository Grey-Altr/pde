import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const ARTIFACT_VIEWER_URI = 'ui://pde/artifact-viewer';

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000');

function buildArtifactViewerHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PDE Artifact Preview</title>
  <style>
    :root {
      color-scheme: light dark;
    }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      padding: 1rem;
      margin: 0;
      background-color: light-dark(#ffffff, #1a1a1a);
      color: light-dark(#111111, #f0f0f0);
    }
    h1 {
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 0.75rem 0;
    }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      font-family: monospace;
      font-size: 0.8125rem;
      line-height: 1.6;
      overflow-y: auto;
      max-height: 60vh;
      background-color: light-dark(#f5f5f5, #2a2a2a);
      border: 1px solid light-dark(#e0e0e0, #3a3a3a);
      border-radius: 4px;
      padding: 0.75rem;
      margin: 0;
    }
    #content {
      color: light-dark(#666666, #aaaaaa);
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <h1>Design Artifact Preview</h1>
  <div id="content">Artifact preview will appear here when a tool result is received.</div>
</body>
</html>`;
}

export function registerArtifactPreviewTools(server: McpServer): void {
  // Register the HTML resource with CSP connectDomains (RUI-02)
  registerAppResource(
    server,
    'pde-artifact-viewer',
    ARTIFACT_VIEWER_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async () => ({
      contents: [
        {
          uri: ARTIFACT_VIEWER_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: buildArtifactViewerHtml(),
          _meta: {
            ui: {
              csp: {
                connectDomains: [BASE_URL],
                resourceDomains: [BASE_URL],
              },
            },
          },
        },
      ],
    }),
  );

  // Register preview_artifact tool with dual-mode response (RUI-01)
  registerAppTool(
    server,
    'preview_artifact',
    {
      title: 'Preview Design Artifact',
      description:
        'Opens a design artifact preview panel. Shows rendered HTML in MCP Apps clients, text path in stdio clients.',
      inputSchema: {
        name: z.string().describe('Artifact filename from .planning/design/handoff/'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false },
      _meta: { ui: { resourceUri: ARTIFACT_VIEWER_URI } },
    },
    async ({ name }: { name: string }) => ({
      content: [
        {
          type: 'text' as const,
          text: `Design artifact: .planning/design/handoff/${name}. Open in an MCP Apps-capable client to view the rendered preview.`,
        },
      ],
      structuredContent: {
        artifactName: name,
        artifactPath: `.planning/design/handoff/${name}`,
      },
    }),
  );

  // Register list_design_artifacts tool with dual-mode response (RUI-01)
  registerAppTool(
    server,
    'list_design_artifacts',
    {
      title: 'List Design Artifacts',
      description:
        'Lists available design artifacts from .planning/design/. Shows rendered list in MCP Apps clients.',
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false },
      _meta: { ui: { resourceUri: ARTIFACT_VIEWER_URI } },
    },
    async () => {
      const designDir = path.join(process.cwd(), '.planning', 'design');
      let files: string[] = [];
      try {
        const entries = await fs.readdir(designDir, { recursive: true });
        files = entries
          .map(String)
          .filter((f) => /\.(html|md|json|ts|svg|css|csv)$/.test(f));
      } catch {
        /* directory doesn't exist yet — empty list */
      }
      const text =
        files.length > 0
          ? `Design artifacts:\n${files.map((f) => `- ${f}`).join('\n')}`
          : 'No design artifacts found. Design artifacts appear here after running /pde:wireframe or /pde:mockup.';
      return {
        content: [{ type: 'text' as const, text }],
        structuredContent: { artifacts: files },
      };
    },
  );
}
