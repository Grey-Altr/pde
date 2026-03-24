'use strict';

/**
 * handlers.cjs — PDE MCP server tool handler functions
 *
 * All 10 read-only tool handlers plus the pipeline-status resource handler.
 * Written as plain CJS so tests can import directly without TypeScript compilation.
 * The TypeScript index.ts imports this via createRequire(import.meta.url).
 *
 * Each handler takes (planningDir, params?) and returns MCP-compatible response:
 *   Tool: { content: [{ type: 'text', text: string }], isError?: true }
 *   Resource: { contents: [{ uri: string, mimeType: string, text: string }] }
 */

const fs = require('node:fs');
const path = require('node:path');

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Safely read a file, returning null if it does not exist.
 * @param {string} filePath
 * @returns {string | null}
 */
function safeReadFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Lazy-load generateTailwindTheme from artifact-format.cjs.
 * Resolves path relative to this file's location.
 */
function getGenerateTailwindTheme() {
  const artifactFormatPath = path.join(__dirname, '..', '..', 'bin', 'lib', 'artifact-format.cjs');
  const { generateTailwindTheme } = require(artifactFormatPath);
  return generateTailwindTheme;
}

// ─── Tool: get-project ────────────────────────────────────────────────────────

/**
 * Returns contents of PROJECT.md
 * @param {string} planningDir - Absolute path to .planning/ directory
 */
async function handleGetProject(planningDir) {
  const content = safeReadFile(path.join(planningDir, 'PROJECT.md'));
  if (!content) {
    return { content: [{ type: 'text', text: 'PROJECT.md not found' }], isError: true };
  }
  return { content: [{ type: 'text', text: content }] };
}

// ─── Tool: get-design-state ───────────────────────────────────────────────────

/**
 * Returns contents of design/DESIGN-STATE.md
 * @param {string} planningDir
 */
async function handleGetDesignState(planningDir) {
  const content = safeReadFile(path.join(planningDir, 'design', 'DESIGN-STATE.md'));
  if (!content) {
    return { content: [{ type: 'text', text: 'DESIGN-STATE.md not found' }], isError: true };
  }
  return { content: [{ type: 'text', text: content }] };
}

// ─── Tool: get-manifest ───────────────────────────────────────────────────────

/**
 * Returns contents of design/design-manifest.json
 * @param {string} planningDir
 */
async function handleGetManifest(planningDir) {
  const content = safeReadFile(path.join(planningDir, 'design', 'design-manifest.json'));
  if (!content) {
    return { content: [{ type: 'text', text: 'design-manifest.json not found' }], isError: true };
  }
  return { content: [{ type: 'text', text: content }] };
}

// ─── Tool: get-tokens ─────────────────────────────────────────────────────────

/**
 * Returns Tailwind v4 @theme CSS block from DTCG tokens.
 * Reads token path from design-manifest.json artifacts.tokens.
 * @param {string} planningDir
 */
async function handleGetTokens(planningDir) {
  const manifestRaw = safeReadFile(path.join(planningDir, 'design', 'design-manifest.json'));
  if (!manifestRaw) {
    return { content: [{ type: 'text', text: 'No design manifest found' }], isError: true };
  }

  let manifest;
  try {
    manifest = JSON.parse(manifestRaw);
  } catch (e) {
    return { content: [{ type: 'text', text: 'design-manifest.json is invalid JSON' }], isError: true };
  }

  const tokensPath = manifest?.artifacts?.tokens;
  if (!tokensPath) {
    return { content: [{ type: 'text', text: 'No tokens artifact defined in manifest' }] };
  }

  const raw = safeReadFile(tokensPath);
  if (!raw) {
    return { content: [{ type: 'text', text: `Tokens file not found at ${tokensPath}` }], isError: true };
  }

  let tokens;
  try {
    tokens = JSON.parse(raw);
  } catch (e) {
    return { content: [{ type: 'text', text: 'Tokens file is invalid JSON' }], isError: true };
  }

  const generateTailwindTheme = getGenerateTailwindTheme();
  const theme = generateTailwindTheme(tokens);
  return { content: [{ type: 'text', text: theme || '/* No theme variables generated */' }] };
}

// ─── Tool: get-handoff ────────────────────────────────────────────────────────

/**
 * Returns handoff file content or lists available handoff files.
 * @param {string} planningDir
 * @param {{ name?: string }} params
 */
async function handleGetHandoff(planningDir, params) {
  const handoffDir = path.join(planningDir, 'design', 'handoff');
  const name = params && params.name;

  if (name) {
    // Return specific handoff file
    const filePath = path.join(handoffDir, `${name}.md`);
    const content = safeReadFile(filePath);
    if (!content) {
      return { content: [{ type: 'text', text: `Handoff file "${name}.md" not found` }], isError: true };
    }
    return { content: [{ type: 'text', text: content }] };
  }

  // List available handoff files
  try {
    if (!fs.existsSync(handoffDir)) {
      return { content: [{ type: 'text', text: 'No handoff directory found (design/handoff/ does not exist)' }] };
    }
    const files = fs.readdirSync(handoffDir)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace(/\.md$/, ''));
    if (files.length === 0) {
      return { content: [{ type: 'text', text: 'No handoff files found in design/handoff/' }] };
    }
    return { content: [{ type: 'text', text: `Available handoff files:\n${files.join('\n')}` }] };
  } catch (e) {
    return { content: [{ type: 'text', text: `Error reading handoff directory: ${e.message}` }], isError: true };
  }
}

// ─── Tool: get-artifact ───────────────────────────────────────────────────────

/**
 * Returns content of a named artifact from design-manifest.json.
 * @param {string} planningDir
 * @param {{ name: string }} params
 */
async function handleGetArtifact(planningDir, params) {
  const name = params && params.name;
  if (!name) {
    return { content: [{ type: 'text', text: 'Parameter "name" is required' }], isError: true };
  }

  const manifestRaw = safeReadFile(path.join(planningDir, 'design', 'design-manifest.json'));
  if (!manifestRaw) {
    return { content: [{ type: 'text', text: 'No design manifest found' }], isError: true };
  }

  let manifest;
  try {
    manifest = JSON.parse(manifestRaw);
  } catch (e) {
    return { content: [{ type: 'text', text: 'design-manifest.json is invalid JSON' }], isError: true };
  }

  const artifactPath = manifest?.artifacts?.[name];
  if (!artifactPath) {
    return { content: [{ type: 'text', text: `Artifact "${name}" not found in manifest` }] };
  }

  const content = safeReadFile(artifactPath);
  if (!content) {
    return { content: [{ type: 'text', text: `Artifact file not found at ${artifactPath}` }], isError: true };
  }
  return { content: [{ type: 'text', text: content }] };
}

// ─── Tool: get-roadmap ────────────────────────────────────────────────────────

/**
 * Returns contents of ROADMAP.md
 * @param {string} planningDir
 */
async function handleGetRoadmap(planningDir) {
  const content = safeReadFile(path.join(planningDir, 'ROADMAP.md'));
  if (!content) {
    return { content: [{ type: 'text', text: 'ROADMAP.md not found' }], isError: true };
  }
  return { content: [{ type: 'text', text: content }] };
}

// ─── Tool: get-requirements ───────────────────────────────────────────────────

/**
 * Returns contents of REQUIREMENTS.md
 * @param {string} planningDir
 */
async function handleGetRequirements(planningDir) {
  const content = safeReadFile(path.join(planningDir, 'REQUIREMENTS.md'));
  if (!content) {
    return { content: [{ type: 'text', text: 'REQUIREMENTS.md not found' }], isError: true };
  }
  return { content: [{ type: 'text', text: content }] };
}

// ─── Tool: get-pipeline-status ────────────────────────────────────────────────

/**
 * Returns JSON summary with designState and manifest from DESIGN-STATE.md and design-manifest.json
 * @param {string} planningDir
 */
async function handleGetPipelineStatus(planningDir) {
  const designStateRaw = safeReadFile(path.join(planningDir, 'design', 'DESIGN-STATE.md'));
  const manifestRaw = safeReadFile(path.join(planningDir, 'design', 'design-manifest.json'));

  let manifest = null;
  if (manifestRaw) {
    try {
      manifest = JSON.parse(manifestRaw);
    } catch {
      manifest = null;
    }
  }

  const data = {
    designState: designStateRaw || null,
    manifest: manifest,
  };

  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

// ─── Tool: list-artifacts ─────────────────────────────────────────────────────

/**
 * Returns array of artifact names from design-manifest.json
 * @param {string} planningDir
 */
async function handleListArtifacts(planningDir) {
  const manifestRaw = safeReadFile(path.join(planningDir, 'design', 'design-manifest.json'));
  if (!manifestRaw) {
    return { content: [{ type: 'text', text: '[]' }] };
  }

  let manifest;
  try {
    manifest = JSON.parse(manifestRaw);
  } catch {
    return { content: [{ type: 'text', text: '[]' }] };
  }

  const keys = Object.keys(manifest?.artifacts || {});
  return { content: [{ type: 'text', text: JSON.stringify(keys) }] };
}

// ─── Resource: pipeline-status ────────────────────────────────────────────────

/**
 * Returns pipeline status as MCP resource response (passive context).
 * URI: pde://pipeline-status
 * @param {string} planningDir
 * @param {string} [uriHref]
 */
async function handlePipelineStatusResource(planningDir, uriHref) {
  const designStateRaw = safeReadFile(path.join(planningDir, 'design', 'DESIGN-STATE.md'));
  const manifestRaw = safeReadFile(path.join(planningDir, 'design', 'design-manifest.json'));

  let manifest = null;
  if (manifestRaw) {
    try {
      manifest = JSON.parse(manifestRaw);
    } catch {
      manifest = null;
    }
  }

  const data = {
    designState: designStateRaw || null,
    manifest: manifest,
  };

  return {
    contents: [{
      uri: uriHref || 'pde://pipeline-status',
      mimeType: 'application/json',
      text: JSON.stringify(data, null, 2),
    }],
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  handleGetProject,
  handleGetDesignState,
  handleGetManifest,
  handleGetTokens,
  handleGetHandoff,
  handleGetArtifact,
  handleGetRoadmap,
  handleGetRequirements,
  handleGetPipelineStatus,
  handleListArtifacts,
  handlePipelineStatusResource,
};
