'use strict';

/**
 * help-parser.cjs — CLI --help text parser and recursive capability discoverer
 *
 * Parses --help output from any CLI binary to extract subcommands and flags,
 * building CapabilitySchema-shaped objects for the capability model.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

/**
 * Spawn a CLI binary with --help and return the help text.
 * Falls back to stderr when stdout is empty (many CLIs write help to stderr).
 *
 * @param {string} binary - Absolute path to binary
 * @param {string[]} cmdPath - Subcommand path (e.g., ['remote', 'add'])
 * @returns {string} Help text
 */
function spawnHelpText(binary, cmdPath) {
  const args = [...cmdPath, '--help'];
  const result = spawnSync(binary, args, { encoding: 'utf8', timeout: 5000 });
  return (result.stdout || result.stderr || '').trim();
}

/**
 * Parse subcommands from --help output.
 * Extracts name+description pairs from two-column format like:
 *   init        Initialize a new project
 *
 * @param {string} helpText - Raw --help text
 * @returns {Array<{name: string, description: string}>}
 */
function parseSubcommands(helpText) {
  if (!helpText) return [];

  const lines = helpText.split('\n');
  const results = [];

  for (const line of lines) {
    // Skip ALL_CAPS section headers (e.g., COMMANDS:, OPTIONS:)
    if (/^[A-Z][A-Z\s]+:/.test(line.trim())) continue;

    // Skip lines starting with dashes (flags)
    if (/^\s*-/.test(line)) continue;

    // Match two-column format: 0-4 spaces, word chars, 2+ spaces, description
    const m = line.match(/^ {0,4}(\w[-\w]*)  {2,}(.+)/);
    if (!m) continue;

    const name = m[1];
    const description = m[2].trim();

    // Skip if first token contains special chars
    if (/[:()"]/.test(name)) continue;

    results.push({ name, description });
  }

  return results;
}

/**
 * Parse flags from --help output.
 * Extracts short, long, arg, and description for each flag.
 *
 * @param {string} helpText - Raw --help text
 * @returns {Array<{short: string|null, long: string, arg: string|null, description: string}>}
 */
function parseFlags(helpText) {
  if (!helpText) return [];

  const lines = helpText.split('\n');
  const results = [];

  for (const line of lines) {
    // Match flag pattern: optional short flag, long flag, optional <arg>, description
    const m = line.match(/^\s+(-\w)?(?:,\s*)?(-{1,2}[\w-]+)(?:\s+<([^>]+)>)?\s{2,}(.+)?/);
    if (!m) continue;

    const short = m[1] || null;
    const long = m[2];
    const arg = m[3] || null;
    const description = (m[4] || '').trim();

    // Must be a proper long flag (--something or -single-char that matches --help pattern)
    if (!long.startsWith('-')) continue;

    results.push({ short, long, arg, description });
  }

  return results;
}

/**
 * Recursively discover capabilities from a binary by parsing --help output.
 *
 * @param {string} binary - Absolute path to binary
 * @param {string[]} prefix - Current subcommand path (e.g., ['remote'])
 * @param {number} depth - Current recursion depth
 * @returns {Array} Array of CapabilitySchema-shaped objects
 */
function discoverCapabilities(binary, prefix = [], depth = 0) {
  if (depth > 3) return [];

  const helpText = spawnHelpText(binary, prefix);
  const subcommands = parseSubcommands(helpText);
  const flags = parseFlags(helpText);

  // Build flag properties for inputSchema
  const flagProperties = {};
  for (const flag of flags) {
    const flagName = flag.long.replace(/^--?/, '');
    flagProperties[flagName] = {
      type: flag.arg ? 'string' : 'boolean',
      description: flag.description || flag.long,
    };
  }

  const capabilities = [];

  if (subcommands.length === 0) {
    // Fallback: create a single capability for the binary/subcommand itself
    const name = prefix.length > 0
      ? [path.basename(binary), ...prefix].join('_')
      : path.basename(binary);
    const commandPath = prefix.length > 0 ? prefix.join(' ') : path.basename(binary);

    capabilities.push({
      name,
      description: helpText.slice(0, 1000) || `CLI command: ${commandPath}`,
      inputSchema: {
        type: 'object',
        properties: {
          useJson: { type: 'boolean', description: 'Append --json flag to command' },
          ...flagProperties,
        },
      },
      outputSchema: null,
      method: null,
      path: commandPath,
      extensions: { subcommandPath: prefix },
    });
  } else {
    for (const sub of subcommands) {
      const subPath = [...prefix, sub.name];
      const name = [path.basename(binary), ...subPath].join('_');
      const commandPath = [path.basename(binary), ...subPath.slice(0)].join(' ');

      // Check if this subcommand has further subcommands (recursion)
      const deeper = discoverCapabilities(binary, subPath, depth + 1);

      if (deeper.length > 0 && depth < 2) {
        // Has deeper subcommands — use those instead of a stub for this level
        capabilities.push(...deeper);
      } else {
        // Leaf subcommand — create capability
        capabilities.push({
          name,
          description: sub.description,
          inputSchema: {
            type: 'object',
            properties: {
              useJson: { type: 'boolean', description: 'Append --json flag to command' },
              ...flagProperties,
            },
          },
          outputSchema: null,
          method: null,
          path: commandPath,
          extensions: { subcommandPath: subPath },
        });
      }
    }
  }

  return capabilities;
}

/**
 * Orchestrate the full CLI wrapping pipeline.
 *
 * @param {string} cwd - Current working directory
 * @param {string[]} args - CLI arguments: [binaryInput]
 */
async function cmdWrap(cwd, args) {
  const binaryInput = args[0];
  if (!binaryInput) {
    console.error('Usage: pde-tools cli-anything wrap <binary-path>');
    process.exit(1);
  }

  // 1. Resolve binary path
  let binary = binaryInput;
  if (!path.isAbsolute(binaryInput)) {
    try {
      binary = spawnSync('which', [binaryInput], { encoding: 'utf8' }).stdout.trim();
    } catch (_) {
      binary = binaryInput;
    }
  }
  if (!fs.existsSync(binary)) {
    throw new Error(`Binary not found: ${binary}`);
  }

  // 2. Slugify
  const { slugify } = require('./ingest.cjs');
  const slug = slugify(path.basename(binary));

  // 3. Discover capabilities
  const capabilities = discoverCapabilities(binary);
  console.log(`Discovered ${capabilities.length} capabilities from ${binary}`);

  // 4. Build capability model
  const { validateCapabilityModel } = require('./model.cjs');
  const model = validateCapabilityModel({
    meta: {
      source: binary,
      type: 'cli',
      version: '1.0.0',
      auth: {},
      generatedAt: new Date().toISOString(),
    },
    capabilities,
  });

  // 5. Write capability model
  const outDir = path.join(cwd, '.planning/cli-anything', slug);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'capability-model.json'), JSON.stringify(model, null, 2));

  // 6. Generate server
  const { writeServer } = require('./server-gen.cjs');
  const serverDir = path.join(outDir, 'server');
  writeServer(serverDir, capabilities, model.meta, cwd);

  // 7. Generate SKILL.md
  const { writeSkillMd } = require('./skill-gen.cjs');
  writeSkillMd(serverDir, model);

  // 8. Summary
  console.log(`\nWrapped ${slug}:`);
  console.log(`  Capabilities: ${capabilities.length}`);
  console.log(`  Server: ${serverDir}/server.cjs`);
  console.log(`  SKILL.md: ${serverDir}/SKILL.md`);
  console.log(`  Model: ${outDir}/capability-model.json`);
  console.log(`\nPublish with: pde-tools cli-anything publish ${slug}`);
}

module.exports = { parseSubcommands, parseFlags, spawnHelpText, discoverCapabilities, cmdWrap };
