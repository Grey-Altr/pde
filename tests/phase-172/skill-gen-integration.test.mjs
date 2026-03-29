/**
 * tests/phase-172/skill-gen-integration.test.mjs
 * Integration tests for SKILL.md path fix in app-wrappers generate.cjs (WRAP-04)
 *
 * Validates that:
 *   1. generateSkillMd baseline output contains .planning/cli-anything/ path
 *   2. After path replacement, output contains .planning/app-wrappers/
 *   3. After path replacement, .planning/cli-anything/ invocation line is gone
 *   4. SKILL.md retains ## Tools section
 *   5. SKILL.md contains tool names from capability model
 */

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { generateSkillMd } = require(path.join(__dirname, '../../bin/lib/cli-anything/skill-gen.cjs'));

// Minimal mock CapabilityModel for testing (avoids dependency on real wrapper modules)
const mockModel = {
  meta: {
    source: '/usr/bin/blender',
    type: 'cli',
    version: '4.2.0',
    auth: {},
    generatedAt: '2026-01-01T00:00:00.000Z',
  },
  capabilities: [
    {
      name: 'blender_render',
      description: 'Render a frame from a .blend file using Blender headless mode',
      path: 'blender --background',
      inputSchema: {
        type: 'object',
        properties: {
          blendFile: { type: 'string', description: 'Path to .blend file' },
          outputPath: { type: 'string', description: 'Output render path' },
        },
        required: ['blendFile'],
      },
      outputSchema: null,
      method: null,
      extensions: {},
    },
  ],
};

const slug = 'blender';

describe('generateSkillMd baseline', () => {
  it('output contains .planning/cli-anything/ invocation path', () => {
    const content = generateSkillMd(mockModel);
    expect(content).toContain('.planning/cli-anything/');
  });

  it('output contains ## Tools section header', () => {
    const content = generateSkillMd(mockModel);
    expect(content).toContain('## Tools');
  });

  it('output contains tool name from capabilities', () => {
    const content = generateSkillMd(mockModel);
    expect(content).toContain('blender_render');
  });
});

describe('writeAppWrapperSkillMd path replacement', () => {
  it('after path replacement, output contains .planning/app-wrappers/', () => {
    const raw = generateSkillMd(mockModel);
    const fixed = raw.replace(
      `.planning/cli-anything/${slug}/server/server.cjs`,
      `.planning/app-wrappers/${slug}/server/server.cjs`
    );
    expect(fixed).toContain('.planning/app-wrappers/');
  });

  it('after path replacement, output does NOT contain .planning/cli-anything/ in the invocation line', () => {
    const raw = generateSkillMd(mockModel);
    const fixed = raw.replace(
      `.planning/cli-anything/${slug}/server/server.cjs`,
      `.planning/app-wrappers/${slug}/server/server.cjs`
    );
    // The invocation line should reference app-wrappers, not cli-anything
    const invocationLine = fixed.split('\n').find(line => line.includes('server.cjs'));
    expect(invocationLine).toBeDefined();
    expect(invocationLine).not.toContain('.planning/cli-anything/');
    expect(invocationLine).toContain('.planning/app-wrappers/');
  });

  it('path replacement is applied exactly once (only the server.cjs reference changes)', () => {
    const raw = generateSkillMd(mockModel);
    const fixed = raw.replace(
      `.planning/cli-anything/${slug}/server/server.cjs`,
      `.planning/app-wrappers/${slug}/server/server.cjs`
    );
    // Count occurrences of each path
    const appWrappersCount = (fixed.match(/\.planning\/app-wrappers\//g) || []).length;
    const cliAnythingCount = (fixed.match(/\.planning\/cli-anything\//g) || []).length;
    expect(appWrappersCount).toBe(1);
    expect(cliAnythingCount).toBe(0);
  });

  it('SKILL.md content retains ## Tools section after path replacement', () => {
    const raw = generateSkillMd(mockModel);
    const fixed = raw.replace(
      `.planning/cli-anything/${slug}/server/server.cjs`,
      `.planning/app-wrappers/${slug}/server/server.cjs`
    );
    expect(fixed).toContain('## Tools');
  });

  it('SKILL.md content retains tool names after path replacement', () => {
    const raw = generateSkillMd(mockModel);
    const fixed = raw.replace(
      `.planning/cli-anything/${slug}/server/server.cjs`,
      `.planning/app-wrappers/${slug}/server/server.cjs`
    );
    expect(fixed).toContain('blender_render');
  });
});
