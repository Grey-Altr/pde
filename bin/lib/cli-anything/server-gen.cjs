'use strict';

/**
 * server-gen.cjs — MCP server CJS file generator
 *
 * Generates self-contained CJS MCP server files from capability models.
 * Uses stdio transport, spawnSync for command execution,
 * structured JSON envelope fallback, and --dry-run / --json flag support.
 */

const fs = require('fs');
const path = require('path');

/**
 * Generate a JSON Schema inputSchema object for a capability.
 * Always includes useJson flag. Preserves existing properties.
 *
 * @param {object} cap - Capability object
 * @returns {object} JSON Schema object for inputSchema
 */
function buildInputSchema(cap) {
  const existing = cap.inputSchema || {};
  const existingProps = (existing && existing.properties) ? existing.properties : {};

  return {
    type: 'object',
    properties: {
      useJson: { type: 'boolean', description: 'Append --json flag to command' },
      ...existingProps,
    },
  };
}

/**
 * Generate an async tool handler body for a capability using spawn + Promise.
 * Used when asyncMode=true (e.g., long-running desktop apps like Blender, GIMP).
 *
 * @param {object} cap - Capability object
 * @returns {string} JavaScript async handler body
 */
function generateAsyncToolHandler(cap) {
  const subPath = cap.extensions && cap.extensions.subcommandPath
    ? JSON.stringify(cap.extensions.subcommandPath)
    : JSON.stringify(cap.path ? cap.path.split(' ').slice(1) : []);

  return `async (input) => {
    const args = [...${subPath}];
    if (input && input.useJson) args.push('--json');
    if (input) {
      for (const [key, val] of Object.entries(input)) {
        if (key === 'useJson') continue;
        if (val !== undefined && val !== null && val !== false) {
          args.push('--' + key);
          if (val !== true) args.push(String(val));
        }
      }
    }
    if (DRY_RUN) {
      return { content: [{ type: 'text', text: JSON.stringify({ dryRun: true, command: [BINARY, ...args] }) }] };
    }
    return new Promise((resolve, reject) => {
      const proc = spawn(BINARY, args, { timeout: 120000 });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', d => { stdout += d.toString(); });
      proc.stderr.on('data', d => { stderr += d.toString(); });
      proc.on('close', code => {
        let data;
        try { data = JSON.parse(stdout); }
        catch (_) { data = { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code !== null ? code : -1 }; }
        resolve({ content: [{ type: 'text', text: JSON.stringify(data) }] });
      });
      proc.on('error', reject);
    });
  }`;
}

/**
 * Generate a tool handler body for a capability.
 *
 * @param {object} cap - Capability object
 * @returns {string} JavaScript handler body
 */
function generateToolHandler(cap) {
  const subPath = cap.extensions && cap.extensions.subcommandPath
    ? JSON.stringify(cap.extensions.subcommandPath)
    : JSON.stringify(cap.path ? cap.path.split(' ').slice(1) : []);

  return `async (input) => {
    const args = [...${subPath}];
    if (input && input.useJson) args.push('--json');
    if (input) {
      for (const [key, val] of Object.entries(input)) {
        if (key === 'useJson') continue;
        if (val !== undefined && val !== null && val !== false) {
          args.push('--' + key);
          if (val !== true) args.push(String(val));
        }
      }
    }
    if (DRY_RUN) {
      return { content: [{ type: 'text', text: JSON.stringify({ dryRun: true, command: [BINARY, ...args] }) }] };
    }
    const r = spawnSync(BINARY, args, { encoding: 'utf8', timeout: 30000 });
    let data;
    try { data = JSON.parse(r.stdout); } catch (_) { data = { stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim(), exitCode: r.status !== null ? r.status : -1 }; }
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  }`;
}

/**
 * Validate a pip module name — rejects shell metacharacters and path traversal.
 * Allows only alphanumeric, underscore, and hyphen characters.
 *
 * @param {string} moduleName - The pip module name to validate
 * @throws {Error} If moduleName is not a non-empty string or contains invalid characters
 */
function validateModuleName(moduleName) {
  if (typeof moduleName !== 'string' || moduleName.length === 0) {
    throw new Error('moduleName must be a non-empty string');
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(moduleName)) {
    throw new Error(
      `Invalid pip module name "${moduleName}". Only alphanumeric, underscore, and hyphen characters are allowed.`
    );
  }
}

/**
 * Generate a tool handler body for a pip CLI capability using python3 -m.
 * Uses spawnSync with argument array (no shell string concatenation) to prevent injection.
 *
 * @param {string} moduleName - The pip module name (e.g. 'rembg', 'imageio-ffmpeg')
 * @param {object} cap - Capability object
 * @returns {string} JavaScript async handler body
 */
function generatePythonModuleHandler(moduleName, cap) {
  validateModuleName(moduleName);
  const subPath = cap.extensions && cap.extensions.subcommandPath
    ? JSON.stringify(cap.extensions.subcommandPath)
    : JSON.stringify(cap.path ? cap.path.split(' ').slice(1) : []);
  const safeModuleLiteral = JSON.stringify(moduleName);

  return `async (input) => {
    const args = [...${subPath}];
    if (input && input.useJson) args.push('--json');
    if (input) {
      for (const [key, val] of Object.entries(input)) {
        if (key === 'useJson') continue;
        if (val !== undefined && val !== null && val !== false) {
          args.push('--' + key);
          if (val !== true) args.push(String(val));
        }
      }
    }
    if (DRY_RUN) {
      return { content: [{ type: 'text', text: JSON.stringify({ dryRun: true, command: ['python3', '-m', ${safeModuleLiteral}, ...args] }) }] };
    }
    const r = spawnSync('python3', ['-m', ${safeModuleLiteral}, ...args], { encoding: 'utf8', timeout: 30000 });
    let data;
    try { data = JSON.parse(r.stdout); } catch (_) { data = { stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim(), exitCode: r.status !== null ? r.status : -1 }; }
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  }`;
}

/**
 * Generate a complete CJS MCP server source string.
 *
 * @param {Array} capabilities - Array of CapabilitySchema-shaped objects
 * @param {object} meta - Meta object (source, type, generatedAt)
 * @param {string} sdkBasePath - Absolute path to @modelcontextprotocol/sdk/dist/cjs
 * @returns {string} CJS JavaScript source code
 */
function generateServerSource(capabilities, meta, sdkBasePath, options = {}) {
  const { asyncMode = false } = options;
  const spawnImport = asyncMode
    ? `const { spawn } = require('child_process');`
    : `const { spawnSync } = require('child_process');`;

  const header = [
    `// Auto-generated by /pde:wrap`,
    `// Binary: ${meta.source}`,
    `// Generated: ${meta.generatedAt || new Date().toISOString()}`,
    `// WARNING: Do not edit — regenerate with /pde:wrap`,
    ``,
    `'use strict';`,
    ``,
    `const path = require('path');`,
    spawnImport,
    ``,
    `const SDK_BASE = ${JSON.stringify(sdkBasePath)};`,
    `const { McpServer } = require(path.join(SDK_BASE, 'server/mcp.js'));`,
    `const { StdioServerTransport } = require(path.join(SDK_BASE, 'server/stdio.js'));`,
    ``,
    `const BINARY = ${JSON.stringify(meta.source)};`,
    `const DRY_RUN = process.argv.includes('--dry-run');`,
    ``,
    `const server = new McpServer({ name: ${JSON.stringify(meta.source)}, version: '1.0.0' });`,
    ``,
  ].join('\n');

  const toolRegistrations = capabilities.map(cap => {
    const inputSchema = buildInputSchema(cap);
    const handler = asyncMode ? generateAsyncToolHandler(cap) : generateToolHandler(cap);

    return [
      `server.registerTool(`,
      `  ${JSON.stringify(cap.name)},`,
      `  {`,
      `    description: ${JSON.stringify(cap.description || '')},`,
      `    inputSchema: ${JSON.stringify(inputSchema, null, 4).replace(/\n/g, '\n    ')},`,
      `    annotations: { readOnlyHint: false },`,
      `  },`,
      `  ${handler}`,
      `);`,
    ].join('\n');
  }).join('\n\n');

  const footer = [
    ``,
    `async function main() {`,
    `  const transport = new StdioServerTransport();`,
    `  await server.connect(transport);`,
    `}`,
    ``,
    `main().catch(err => {`,
    `  process.stderr.write(err.message + '\\n');`,
    `  process.exit(1);`,
    `});`,
  ].join('\n');

  return header + toolRegistrations + footer + '\n';
}

/**
 * Write server.cjs to outputDir.
 *
 * @param {string} outputDir - Directory to write server.cjs into
 * @param {Array} capabilities - Array of capability objects
 * @param {object} meta - Meta object (source, type, generatedAt)
 * @param {string} projectRoot - Absolute project root path
 * @returns {string} Absolute path to written server.cjs
 */
function writeServer(outputDir, capabilities, meta, projectRoot, options = {}) {
  const sdkBasePath = path.join(
    projectRoot,
    'packages/pde-mcp-server/node_modules/@modelcontextprotocol/sdk/dist/cjs'
  );

  const source = generateServerSource(capabilities, meta, sdkBasePath, options);

  fs.mkdirSync(outputDir, { recursive: true });
  const serverPath = path.join(outputDir, 'server.cjs');
  fs.writeFileSync(serverPath, source, 'utf8');
  return serverPath;
}

module.exports = { generateServerSource, generateAsyncToolHandler, writeServer, validateModuleName, generatePythonModuleHandler };
