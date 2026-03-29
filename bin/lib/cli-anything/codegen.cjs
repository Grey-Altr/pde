'use strict';

/**
 * codegen.cjs — AI SDK tool() code generator
 *
 * Walks JSON Schema trees to emit Zod builder call strings,
 * generates tool() exports for the Vercel AI SDK,
 * and runs tsc --noEmit to validate the generated TypeScript.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// tsc binary path — TypeScript 5.9.3 in pde-mcp-server
const TSC_BIN = path.join(
  __dirname,
  '../../../packages/pde-mcp-server/node_modules/.bin/tsc'
);

/**
 * Convert a JSON Schema object to a Zod builder call string.
 * Recursively walks the schema tree.
 *
 * @param {unknown} schema - JSON Schema object
 * @param {number} depth - Recursion depth (guard against circular refs)
 * @returns {string} Zod builder call string
 */
function jsonSchemaToZod(schema, depth = 0) {
  if (!schema || typeof schema !== 'object' || depth > 8) {
    return 'z.unknown()';
  }

  const s = schema;

  // enum without type (standalone enum)
  if (!s.type && Array.isArray(s.enum)) {
    const vals = s.enum.map(v => JSON.stringify(v)).join(', ');
    return `z.enum([${vals}])`;
  }

  switch (s.type) {
    case 'string': {
      if (Array.isArray(s.enum)) {
        const vals = s.enum.map(v => JSON.stringify(v)).join(', ');
        return `z.enum([${vals}])`;
      }
      let expr = 'z.string()';
      if (s.description) {
        expr += `.describe(${JSON.stringify(s.description)})`;
      }
      return expr;
    }

    case 'number':
    case 'integer': {
      let expr = 'z.number()';
      if (s.description) {
        expr += `.describe(${JSON.stringify(s.description)})`;
      }
      return expr;
    }

    case 'boolean': {
      let expr = 'z.boolean()';
      if (s.description) {
        expr += `.describe(${JSON.stringify(s.description)})`;
      }
      return expr;
    }

    case 'array': {
      const itemsZod = jsonSchemaToZod(s.items || {}, depth + 1);
      let expr = `z.array(${itemsZod})`;
      if (s.description) {
        expr += `.describe(${JSON.stringify(s.description)})`;
      }
      return expr;
    }

    case 'object': {
      if (!s.properties || Object.keys(s.properties).length === 0) {
        return 'z.record(z.unknown())';
      }
      const required = Array.isArray(s.required) ? new Set(s.required) : new Set();
      const fields = Object.entries(s.properties)
        .map(([fieldName, fieldSchema]) => {
          let fieldZod = jsonSchemaToZod(fieldSchema, depth + 1);
          if (!required.has(fieldName)) {
            fieldZod += '.optional()';
          }
          return `  ${fieldName}: ${fieldZod}`;
        })
        .join(',\n');
      return `z.object({\n${fields}\n})`;
    }

    default:
      return 'z.unknown()';
  }
}

/**
 * Sanitize a capability name to a valid JavaScript identifier (camelCase).
 * @param {string} name - Raw capability name
 * @returns {string} Valid JS identifier
 */
function sanitizeName(name) {
  // Replace non-alphanumeric chars with underscore
  let id = name.replace(/[^a-zA-Z0-9]/g, '_');
  // Ensure starts with a letter
  if (/^[0-9]/.test(id)) id = '_' + id;
  // Strip leading/trailing underscores
  id = id.replace(/^_+|_+$/g, '') || 'tool';
  // Convert snake_case to camelCase
  id = id.replace(/_([a-zA-Z0-9])/g, (_, c) => c.toUpperCase());
  return id;
}

/**
 * Generate the execute body for a capability based on meta type.
 * @param {object} cap - Capability object
 * @param {object} meta - Meta object (source, type)
 * @returns {string} Execute body lines
 */
function generateExecuteBody(cap, meta) {
  if (meta.type === 'openapi' && cap.method && cap.path) {
    const method = cap.method.toUpperCase();
    const hasBody = ['POST', 'PUT', 'PATCH'].includes(method);
    const fetchOptions = hasBody
      ? `{ method: '${method}', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }`
      : `{ method: '${method}' }`;
    return [
      `    // TODO: set base URL`,
      `    const res = await fetch(\`\${process.env.API_BASE_URL || ''}${cap.path}\`, ${fetchOptions});`,
      `    return res.json();`,
    ].join('\n');
  }

  if (meta.type === 'graphql') {
    return [
      `    // TODO: set GraphQL endpoint`,
      `    const res = await fetch(process.env.GRAPHQL_URL || '', {`,
      `      method: 'POST',`,
      `      headers: { 'Content-Type': 'application/json' },`,
      `      body: JSON.stringify({ query: \`{ ${cap.name} }\`, variables: input }),`,
      `    });`,
      `    return res.json();`,
    ].join('\n');
  }

  if (meta.type === 'mcp') {
    return `    // Use MCP client.callTool('${cap.name}', input)\n    throw new Error('MCP execute stub — wire up MCP client');`;
  }

  return `    return { result: 'stub — implement me' };`;
}

/**
 * Generate a complete .ts file string for AI SDK tool() exports.
 *
 * @param {Array} capabilities - Array of capability objects
 * @param {object} meta - Meta object (source, type, generatedAt)
 * @returns {string} TypeScript source code
 */
function generateToolSource(capabilities, meta) {
  const header = [
    `// Auto-generated by /pde:ingest`,
    `// Source: ${meta.source}`,
    `// Generated: ${meta.generatedAt || new Date().toISOString()}`,
    `// WARNING: stub execute functions — customize before production use`,
    ``,
    `import { tool } from 'ai';`,
    `import { z } from 'zod';`,
    ``,
  ].join('\n');

  const exports = capabilities.map(cap => {
    const exportName = sanitizeName(cap.name);
    const zodSchema = jsonSchemaToZod(cap.inputSchema || { type: 'object', properties: {} });
    const execBody = generateExecuteBody(cap, meta);

    return [
      `export const ${exportName} = tool({`,
      `  description: ${JSON.stringify(cap.description || '')},`,
      `  inputSchema: ${zodSchema.replace(/\n/g, '\n  ')},`,
      `  execute: async (input) => {`,
      execBody,
      `  },`,
      `});`,
    ].join('\n');
  }).join('\n\n');

  return header + exports + '\n';
}

/**
 * Write tsconfig.validate.json for tsc validation.
 * @param {string} outputDir - Directory to write config into
 */
function writeTsConfig(outputDir) {
  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'bundler',
      strict: true,
      skipLibCheck: true,
    },
    include: ['tools.ts'],
  };
  fs.writeFileSync(
    path.join(outputDir, 'tsconfig.validate.json'),
    JSON.stringify(tsconfig, null, 2)
  );
}

/**
 * Run tsc --noEmit on the output directory to validate generated tools.ts.
 * @param {string} outputDir - Directory containing tools.ts and tsconfig.validate.json
 * @returns {{ ok: boolean, output?: string }}
 */
function typeCheckGeneratedFile(outputDir) {
  if (!fs.existsSync(TSC_BIN)) {
    return { ok: false, output: `tsc not found at ${TSC_BIN}` };
  }
  try {
    execFileSync(TSC_BIN, ['--noEmit', '--project', path.join(outputDir, 'tsconfig.validate.json')], {
      cwd: outputDir,
      stdio: 'pipe',
    });
    return { ok: true };
  } catch (err) {
    const output = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
    return { ok: false, output };
  }
}

/**
 * High-level function: generate tools.ts from capability model and write to outputDir.
 * Runs tsc --noEmit after generation and reports result.
 *
 * @param {object} model - Validated capability model { meta, capabilities }
 * @param {string} outputDir - Directory to write tools.ts and tsconfig.validate.json
 * @returns {Promise<void>}
 */
async function generateTools(model, outputDir) {
  const { meta, capabilities } = model;

  if (capabilities.length > 500) {
    console.warn(`[codegen] Warning: ${capabilities.length} capabilities — large spec, generation may be slow`);
  }

  // Generate TypeScript source
  const source = generateToolSource(capabilities, meta);

  // Write files
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'tools.ts'), source, 'utf8');
  writeTsConfig(outputDir);

  console.log(`[codegen] Generated tools.ts with ${capabilities.length} tool exports`);

  // Run tsc --noEmit to validate
  const tscResult = typeCheckGeneratedFile(outputDir);
  if (tscResult.ok) {
    console.log('[codegen] tsc --noEmit: PASS');
  } else {
    console.warn(`[codegen] tsc --noEmit: type errors found (may be due to missing ai/zod in output dir)`);
    if (tscResult.output) {
      console.warn(tscResult.output.slice(0, 500));
    }
  }
}

module.exports = { generateTools, generateToolSource, jsonSchemaToZod, typeCheckGeneratedFile };
