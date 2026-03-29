'use strict';

/**
 * app-wrappers/generate.cjs — App wrapper generation orchestrator
 *
 * Orchestrates the full wrap pipeline for a registered app wrapper:
 *   1. Load approved registry entry (checkApproved)
 *   2. Load wrapper module and build capability model
 *   3. Write capability-model.json
 *   4. Write wrapper-metadata.json
 *   5. Generate MCP server (with asyncMode from metadata.asyncRequired)
 *   6. Generate SKILL.md with app-wrappers path fix
 *
 * All wrapper outputs go to: {projectRoot}/.planning/app-wrappers/{slug}/
 */

const fs = require('fs');
const path = require('path');

/**
 * Generate all output artifacts for a registered app wrapper.
 *
 * @param {string} slug - App wrapper slug (e.g., 'blender', 'gimp', 'inkscape')
 * @param {string} registryPath - Absolute path to the app registry JSON file
 * @param {string} projectRoot - Absolute project root path
 * @param {object} [_fns={}] - Optional FS function overrides for testing
 * @returns {{ modelPath: string, metadataPath: string, serverPath: string, skillPath: string, outputDir: string }}
 */
function generateAppWrapper(slug, registryPath, projectRoot, _fns = {}) {
  const fsFns = {
    readFileSync: fs.readFileSync,
    writeFileSync: fs.writeFileSync,
    mkdirSync: fs.mkdirSync,
    ..._fns,
  };

  // 1. Load approved entry from registry
  const { checkApproved } = require('../app-registry.cjs');
  const entry = checkApproved(registryPath, slug);

  // 2. Load wrapper module and build capability model
  const { getWrapper, listSlugs } = require('./index.cjs');
  const wrapper = getWrapper(slug);
  if (!wrapper) {
    throw new Error(`No wrapper module for slug "${slug}". Known: ${listSlugs().join(', ')}`);
  }
  const model = wrapper.buildCapabilityModel(entry);

  // 3. Determine output directory
  const outputDir = path.join(projectRoot, '.planning', 'app-wrappers', slug);
  const serverDir = path.join(outputDir, 'server');

  // 4. Write capability-model.json
  fsFns.mkdirSync(outputDir, { recursive: true });
  const modelPath = path.join(outputDir, 'capability-model.json');
  fsFns.writeFileSync(modelPath, JSON.stringify(model, null, 2), 'utf8');

  // 5. Write wrapper-metadata.json (non-schema fields)
  const metadata = wrapper.getMetadata
    ? wrapper.getMetadata(entry)
    : {
        slug,
        startupMs: 1000,
        executionMode: entry.executionMode || 'headless',
        asyncRequired: false,
        generatedAt: new Date().toISOString(),
      };
  const metadataPath = path.join(outputDir, 'wrapper-metadata.json');
  fsFns.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

  // 6. Generate MCP server (asyncMode driven by metadata.asyncRequired)
  const { writeServer } = require('../cli-anything/server-gen.cjs');
  const serverPath = writeServer(
    serverDir,
    model.capabilities,
    model.meta,
    projectRoot,
    { asyncMode: !!metadata.asyncRequired }
  );

  // 7. Generate SKILL.md with path fix (cli-anything -> app-wrappers)
  const { generateSkillMd } = require('../cli-anything/skill-gen.cjs');
  let skillContent = generateSkillMd(model);
  skillContent = skillContent.replace(
    `.planning/cli-anything/${slug}/server/server.cjs`,
    `.planning/app-wrappers/${slug}/server/server.cjs`
  );
  const skillPath = path.join(serverDir, 'SKILL.md');
  fsFns.writeFileSync(skillPath, skillContent, 'utf8');

  return { modelPath, metadataPath, serverPath, skillPath, outputDir };
}

module.exports = { generateAppWrapper };
