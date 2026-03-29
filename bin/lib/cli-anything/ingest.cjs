'use strict';

const fs = require('fs');
const path = require('path');
const { detectSpecType } = require('./detect.cjs');
const { validateCapabilityModel } = require('./model.cjs');

/**
 * Load and parse a source file or URL, returning raw content.
 * Handles local files and HTTP(S) URLs via built-in fetch.
 * @param {string} source - File path, URL, or mcp:// URI
 * @returns {Promise<unknown>} Parsed JSON content or raw SDL string (GraphQL) or null (MCP)
 */
async function loadSource(source) {
  if (source.startsWith('http://') || source.startsWith('https://')) {
    const res = await fetch(source, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${source}`);
    return res.json();
  }
  if (source.startsWith('mcp://')) {
    return null; // MCP sources don't have file content — handled by mcp.cjs parser directly
  }
  // Local file
  const abs = path.resolve(source);
  if (!fs.existsSync(abs)) throw new Error(`File not found: ${abs}`);
  const raw = fs.readFileSync(abs, 'utf8');
  if (source.endsWith('.graphql') || source.endsWith('.gql')) {
    return raw; // Return raw SDL string for GraphQL files
  }
  return JSON.parse(raw);
}

/**
 * Generate a URL-safe slug from a source path or URL.
 * @param {string} source - File path or URL
 * @returns {string} Slugified base name
 */
function slugify(source) {
  const base = path.basename(source).replace(/\.[^.]+$/, '');
  return base.replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-|-$/g, '') || 'unnamed';
}

/**
 * Main ingest command handler. Orchestrates spec detection, parsing,
 * capability model assembly, and code generation.
 *
 * @param {string} cwd - Current working directory
 * @param {string[]} args - CLI arguments: [source]
 */
async function cmdIngest(cwd, args) {
  const source = args[0];
  if (!source) {
    console.error('Usage: pde-tools cli-anything ingest <spec-path-or-url>');
    console.error('  Accepts: OpenAPI JSON, JSON Schema, GraphQL endpoint/file, mcp://command');
    process.exit(1);
  }

  console.log(`[cli-anything] Ingesting: ${source}`);

  // Step 1: Load source content (null for mcp://)
  const content = await loadSource(source);

  // Step 2: Detect spec type
  const specType = detectSpecType(source, content);

  // Step 3: Handle http-probe (try GraphQL introspection first, then OpenAPI)
  if (specType === 'http-probe') {
    // Will be implemented when parsers are wired in Plan 04
    throw new Error('HTTP URL probing not yet implemented — specify file type explicitly');
  }

  if (specType === 'unknown') {
    throw new Error(
      `Cannot detect spec type for: ${source}. ` +
      'Supported: OpenAPI (.json with openapi key), JSON Schema (.json), ' +
      'GraphQL (.graphql/.gql or HTTP endpoint), MCP (mcp://command)'
    );
  }

  console.log(`[cli-anything] Detected spec type: ${specType}`);

  // Step 4-7: Parser wiring, model assembly, output, codegen
  // Placeholder until parsers are wired in Plan 04
  throw new Error(`Parser for ${specType} not yet wired — will be completed in Plan 04`);
}

module.exports = { cmdIngest, loadSource, slugify };
