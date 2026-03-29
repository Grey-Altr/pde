'use strict';

/**
 * registry.cjs — Local CLI-Hub registry management
 *
 * Manages a local JSON registry of published CLI wrappers.
 * Provides load, upsert, publish, and list operations.
 */

const fs = require('fs');
const path = require('path');

/**
 * Load the registry from a JSON file.
 * Returns a default empty registry if the file does not exist.
 *
 * @param {string} registryPath - Absolute path to registry.json
 * @returns {{ version: string, entries: Array }}
 */
function loadRegistry(registryPath) {
  if (!fs.existsSync(registryPath)) {
    return { version: '1.0', entries: [] };
  }
  const raw = fs.readFileSync(registryPath, 'utf8');
  return JSON.parse(raw);
}

/**
 * Upsert an entry into the registry.
 * Replaces any existing entry with the same name, or appends.
 *
 * @param {string} registryPath - Absolute path to registry.json
 * @param {object} entry - Registry entry (must have `name` field)
 */
function upsertEntry(registryPath, entry) {
  const registry = loadRegistry(registryPath);

  const idx = registry.entries.findIndex(e => e.name === entry.name);
  if (idx >= 0) {
    registry.entries[idx] = entry;
  } else {
    registry.entries.push(entry);
  }

  // Ensure parent directory exists
  const dir = path.dirname(registryPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');
}

/**
 * Publish a wrapped CLI to the local registry.
 * Validates all required artifacts exist before registering.
 *
 * @param {string} cwd - Current working directory
 * @param {string[]} args - CLI arguments: [slug]
 */
async function cmdPublish(cwd, args) {
  const slug = args[0];
  if (!slug) {
    console.error('Usage: pde-tools cli-anything publish <slug>');
    process.exit(1);
  }

  const slugDir = path.join(cwd, '.planning', 'cli-anything', slug);
  const modelPath = path.join(slugDir, 'capability-model.json');
  const serverPath = path.join(slugDir, 'server', 'server.cjs');
  const skillPath = path.join(slugDir, 'server', 'SKILL.md');

  const missing = [];
  if (!fs.existsSync(modelPath)) missing.push(modelPath);
  if (!fs.existsSync(serverPath)) missing.push(serverPath);
  if (!fs.existsSync(skillPath)) missing.push(skillPath);

  if (missing.length > 0) {
    throw new Error(
      `Missing artifacts for slug "${slug}":\n${missing.map(p => `  - ${p}`).join('\n')}\n` +
      `Run: pde-tools cli-anything wrap <binary> first.`
    );
  }

  // Load capability model for metadata
  const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
  const { meta, capabilities } = model;

  const description =
    capabilities.length > 0 ? capabilities[0].description : `CLI wrapper for ${meta.source}`;

  const entry = {
    name: slug,
    version: '1.0.0',
    description,
    binary: meta.source,
    capabilities_count: capabilities.length,
    skill_path: skillPath,
    server_path: serverPath,
    published_at: new Date().toISOString(),
  };

  const registryPath = path.join(cwd, '.planning', 'cli-anything', 'registry.json');
  upsertEntry(registryPath, entry);

  console.log(`Published ${slug} to CLI-Hub registry (${capabilities.length} capabilities)`);
}

/**
 * List all published CLIs in the registry.
 *
 * @param {string} cwd - Current working directory
 * @param {string[]} args - CLI arguments (unused)
 */
async function cmdList(cwd, args) {
  const registryPath = path.join(cwd, '.planning', 'cli-anything', 'registry.json');
  const registry = loadRegistry(registryPath);

  if (registry.entries.length === 0) {
    console.log('No CLIs published yet.');
    return;
  }

  // Print formatted table
  const nameW = Math.max(4, ...registry.entries.map(e => e.name.length));
  const capW = Math.max(12, ...registry.entries.map(e => String(e.capabilities_count || 0).length));
  const header = `${'Name'.padEnd(nameW)}  ${'Capabilities'.padEnd(capW)}  Published At`;
  const sep = `${'-'.repeat(nameW)}  ${'-'.repeat(capW)}  ${'-'.repeat(20)}`;

  console.log(header);
  console.log(sep);
  for (const e of registry.entries) {
    const name = e.name.padEnd(nameW);
    const caps = String(e.capabilities_count || 0).padEnd(capW);
    const ts = e.published_at ? e.published_at.slice(0, 19).replace('T', ' ') : 'unknown';
    console.log(`${name}  ${caps}  ${ts}`);
  }
}

module.exports = { loadRegistry, upsertEntry, cmdPublish, cmdList };
