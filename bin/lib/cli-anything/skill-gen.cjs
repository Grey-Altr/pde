'use strict';

/**
 * skill-gen.cjs — SKILL.md generator for wrapped CLIs
 *
 * Generates agent-readable SKILL.md documentation from a capability model.
 * Output conforms to the GSD skill format with frontmatter and tool listing.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Generate a SKILL.md string from a capability model.
 *
 * @param {object} model - Validated CapabilityModel { meta, capabilities }
 * @returns {string} SKILL.md markdown content
 */
function generateSkillMd(model) {
  const { meta, capabilities } = model;

  // Compute hash of the model JSON for provenance
  const modelJson = JSON.stringify(model);
  const hash = crypto.createHash('sha256').update(modelJson).digest('hex').slice(0, 16);

  // Slugify: get binary basename without extension
  const { slugify } = require('./ingest.cjs');
  const slug = slugify(path.basename(meta.source));
  const binaryName = path.basename(meta.source);

  // Description: use first capability description or a default
  const description =
    capabilities.length > 0
      ? capabilities[0].description
      : `CLI wrapper for ${binaryName}`;

  // Header comment
  const header = `<!-- PDE-GENERATED | hash:${hash} | generated:${meta.generatedAt} -->\n`;

  // YAML frontmatter
  const frontmatter = [
    '---',
    `name: ${slug}`,
    `description: ${description}`,
    `binary: ${meta.source}`,
    '---',
  ].join('\n');

  // Title
  const title = `\n# ${binaryName}\n`;

  // Goal section
  const goal = [
    '## Goal',
    `Agent-native MCP server wrapping ${binaryName}. Auto-generated from --help output.`,
  ].join('\n');

  // Invocation section
  const invocation = [
    '## Invocation',
    `Start the MCP server: \`node .planning/cli-anything/${slug}/server/server.cjs\``,
  ].join('\n');

  // Tools section
  const toolsHeader = `## Tools (${capabilities.length} total)`;
  const toolsList = capabilities.map(cap => {
    const lines = [`### ${cap.name}`, cap.description];
    if (cap.path) {
      lines.push(`**Command:** \`${cap.path}\``);
    }
    // List input properties as flags
    const props = cap.inputSchema && cap.inputSchema.properties
      ? Object.entries(cap.inputSchema.properties)
      : [];
    if (props.length > 0) {
      const flagList = props
        .map(([key, schema]) => `\`--${key} <${schema.type || 'value'}>\``)
        .join(', ');
      lines.push(`**Input:** ${flagList}`);
    }
    return lines.join('\n');
  }).join('\n\n');

  const tools = [toolsHeader, toolsList].join('\n');

  // Flags section
  const flags = [
    '## Flags',
    '--dry-run   Log commands without executing',
    '--json      Append --json to commands for machine output',
  ].join('\n');

  // Constraints section
  const constraints = [
    '## Constraints',
    '- Binary path is absolute -- server fails if binary is not at the registered path',
    '- Max subcommand recursion depth: 3',
  ].join('\n');

  return [header, frontmatter, title, goal, '', invocation, '', tools, '', flags, '', constraints, ''].join('\n');
}

/**
 * Write SKILL.md to outputDir.
 *
 * @param {string} outputDir - Directory to write SKILL.md into
 * @param {object} model - Validated CapabilityModel
 * @returns {string} Absolute path to written SKILL.md
 */
function writeSkillMd(outputDir, model) {
  const content = generateSkillMd(model);
  const outputPath = path.join(outputDir, 'SKILL.md');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, content, 'utf8');
  return outputPath;
}

module.exports = { generateSkillMd, writeSkillMd };
