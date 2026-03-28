import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';
import { marked } from 'marked';

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

// ─── HTML shell + rendering helpers ──────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapInHtmlShell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: light-dark(#fff, #1a1a1a);
      --fg: light-dark(#1a1a1a, #e8e8e8);
      --border: light-dark(#e0e0e0, #3a3a3a);
      --pre-bg: light-dark(#f5f5f5, #2a2a2a);
      --destructive: light-dark(#dc2626, #f87171);
    }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--fg);
      max-width: 780px;
      margin: 0 auto;
      padding: 1rem;
    }
    h2 {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    h1, h3, h4, h5, h6 {
      font-weight: 600;
      margin: 1rem 0 0.5rem;
    }
    pre, code {
      font-family: ui-monospace, Menlo, Consolas, monospace;
      font-size: 0.8125rem;
      line-height: 1.6;
    }
    pre {
      background: var(--pre-bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 0.75rem;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 0.75rem 0;
    }
    th, td {
      border: 1px solid var(--border);
      padding: 0.4rem 0.6rem;
      text-align: left;
    }
    th {
      font-weight: 600;
    }
    img {
      max-width: 100%;
    }
    a {
      color: inherit;
    }
  </style>
</head>
<body>
<h2>${escapeHtml(title)}</h2>
${bodyHtml}
</body>
</html>`;
}

function renderErrorHtml(name: string): string {
  return wrapInHtmlShell(
    'Error',
    `<p style="color: var(--destructive, #dc2626)">Artifact '${escapeHtml(name)}' not found. Check .planning/design/ for available files, or run a design workflow to generate one.</p>`,
  );
}

function renderArtifact(filename: string, raw: string): string {
  const ext = path.extname(filename).toLowerCase();

  if (ext === '.md') {
    // Render Markdown via marked (synchronous)
    const parsedHtml = marked.parse(raw) as string;
    return wrapInHtmlShell(filename, parsedHtml);
  }

  if (ext === '.json') {
    let pretty: string;
    try {
      pretty = JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      pretty = raw;
    }
    const preBlock = `<pre><code>${escapeHtml(pretty)}</code></pre>`;
    return wrapInHtmlShell(filename, preBlock);
  }

  if (ext === '.svg') {
    // SVG is valid HTML — embed directly
    return wrapInHtmlShell(filename, raw);
  }

  // .ts, .css, .csv, and any other text format — code block
  const preBlock = `<pre><code>${escapeHtml(raw)}</code></pre>`;
  return wrapInHtmlShell(filename, preBlock);
}

// ─── Export ────────────────────────────────────────────────────────────────

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

  // RUI-03: Dynamic artifact resource at ui://pde/{artifact}
  server.registerResource(
    'pde-design-artifact',
    new ResourceTemplate('ui://pde/{artifact}', {
      list: async () => {
        const designDir = path.join(process.cwd(), '.planning', 'design');
        try {
          const entries = await fs.readdir(designDir, { recursive: true });
          const files = entries
            .map(String)
            .filter((f) => /\.(html|md|json|ts|svg|css|csv)$/.test(f));
          return {
            resources: files.map((f) => ({
              uri: `ui://pde/${encodeURIComponent(f)}`,
              name: f,
              mimeType: RESOURCE_MIME_TYPE,
            })),
          };
        } catch {
          return { resources: [] };
        }
      },
    }),
    {
      title: 'PDE Design Artifact',
      description: 'Renders a design artifact from .planning/design/ as an HTML preview',
      mimeType: RESOURCE_MIME_TYPE,
    },
    async (uri, { artifact }) => {
      const artifactName = decodeURIComponent(String(artifact));
      const designDir = path.join(process.cwd(), '.planning', 'design');
      const filePath = path.join(designDir, artifactName);
      try {
        let raw = await fs.readFile(filePath, 'utf-8');
        // For HTML files with external tokens.css link, inline it
        if (artifactName.endsWith('.html') && raw.includes('tokens.css')) {
          try {
            const tokensPath = path.resolve(
              path.dirname(filePath),
              '..',
              '..',
              'assets',
              'tokens.css',
            );
            const tokensCss = await fs.readFile(tokensPath, 'utf-8');
            raw = raw.replace(
              /<link[^>]*href=["'][^"']*tokens\.css["'][^>]*>/gi,
              `<style>${tokensCss}</style>`,
            );
          } catch {
            // tokens.css not found — strip the link tag
            raw = raw.replace(/<link[^>]*href=["'][^"']*tokens\.css["'][^>]*>/gi, '');
          }
        }
        const html = artifactName.endsWith('.html') ? raw : renderArtifact(artifactName, raw);
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: RESOURCE_MIME_TYPE,
              text: html,
              _meta: {
                ui: {
                  csp: {
                    connectDomains: [BASE_URL],
                  },
                },
              },
            },
          ],
        };
      } catch {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: RESOURCE_MIME_TYPE,
              text: renderErrorHtml(artifactName),
              _meta: {
                ui: {
                  csp: {
                    connectDomains: [BASE_URL],
                  },
                },
              },
            },
          ],
        };
      }
    },
  );
}
