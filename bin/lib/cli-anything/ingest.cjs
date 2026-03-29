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
  let specType = detectSpecType(source, content);

  // Step 3: Handle http-probe — try GraphQL introspection first, then OpenAPI/JSON Schema
  if (specType === 'http-probe') {
    const graphqlParser = require('./parsers/graphql.cjs');
    let resolvedContent = content;
    try {
      // Try GraphQL introspection first
      const gqlCapabilities = await graphqlParser.parse(source, null);
      if (gqlCapabilities && gqlCapabilities.length > 0) {
        specType = 'graphql';
        // Return early with GraphQL path (content stays null for graphql parser)
      } else {
        throw new Error('No GraphQL capabilities found');
      }
    } catch (gqlErr) {
      // Not GraphQL — try loading as JSON and re-detecting
      console.log(`[cli-anything] GraphQL probe failed (${gqlErr.message}), trying JSON...`);
      try {
        const res = await fetch(source, { headers: { Accept: 'application/json' } });
        if (res.ok) {
          resolvedContent = await res.json();
          specType = detectSpecType(source, resolvedContent);
          if (specType === 'http-probe' || specType === 'unknown') {
            throw new Error(`Cannot determine spec type for URL: ${source}`);
          }
        }
      } catch (jsonErr) {
        throw new Error(`Cannot probe URL ${source}: ${jsonErr.message}`);
      }
    }
  }

  if (specType === 'unknown') {
    throw new Error(
      `Cannot detect spec type for: ${source}. ` +
      'Supported: OpenAPI (.json with openapi key), JSON Schema (.json), ' +
      'GraphQL (.graphql/.gql or HTTP endpoint), MCP (mcp://command)'
    );
  }

  console.log(`[cli-anything] Detected spec type: ${specType}`);

  // Step 4: Select parser based on specType
  const parsers = {
    openapi: require('./parsers/openapi.cjs'),
    jsonschema: require('./parsers/jsonschema.cjs'),
    graphql: require('./parsers/graphql.cjs'),
    mcp: require('./parsers/mcp.cjs'),
  };
  const parser = parsers[specType];
  if (!parser) throw new Error(`No parser for spec type: ${specType}`);
  const capabilities = await parser.parse(source, content);

  if (capabilities.length > 500) {
    console.warn(`[cli-anything] Warning: ${capabilities.length} capabilities — large spec`);
  }

  // Step 5: Extract auth info
  let authInfo = {};
  if (specType === 'openapi' && content) {
    authInfo = require('./parsers/openapi.cjs').extractAuth(content);
  }

  // Step 6: Assemble capability model
  const slug = slugify(source);
  const model = {
    meta: {
      source,
      type: specType,
      version: (content && (content.openapi || content?.info?.version)) || '1.0.0',
      auth: authInfo,
      generatedAt: new Date().toISOString(),
    },
    capabilities,
  };

  // Step 7: Validate model
  const validated = validateCapabilityModel(model);

  // Step 8: Write output
  const outputDir = path.join(cwd, '.planning', 'cli-anything', slug);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, 'capability-model.json'),
    JSON.stringify(validated, null, 2)
  );
  console.log(`[cli-anything] Wrote capability-model.json (${capabilities.length} capabilities)`);

  // Step 9: Generate tools via codegen
  await require('./codegen.cjs').generateTools(validated, outputDir);

  // Step 10: Print summary
  console.log(`[cli-anything] Done. Output: ${outputDir}`);
  console.log(`[cli-anything] Files: capability-model.json, tools.ts`);
}

module.exports = { cmdIngest, loadSource, slugify };
