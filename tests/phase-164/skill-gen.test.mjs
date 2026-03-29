import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// These modules don't exist yet — tests are RED by design
const { generateSkillMd } = require('../../bin/lib/cli-anything/skill-gen.cjs');

const mockModel = {
  meta: {
    source: '/usr/bin/mytool',
    type: 'cli',
    version: '1.0',
    auth: {},
    generatedAt: '2026-01-01T00:00:00Z',
  },
  capabilities: [
    {
      name: 'init',
      description: 'Initialize a new project',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Project name' },
        },
      },
      outputSchema: null,
      method: null,
      path: null,
      extensions: {},
    },
    {
      name: 'build',
      description: 'Build the project',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      outputSchema: null,
      method: null,
      path: null,
      extensions: {},
    },
  ],
};

describe('generateSkillMd', () => {
  it('produces string starting with <!-- PDE-GENERATED', () => {
    const md = generateSkillMd(mockModel);
    expect(typeof md).toBe('string');
    expect(md.startsWith('<!-- PDE-GENERATED')).toBe(true);
  });

  it('includes YAML frontmatter with name and binary', () => {
    const md = generateSkillMd(mockModel);
    expect(md).toContain('---');
    expect(md).toContain('name:');
    expect(md).toContain('binary:');
    expect(md).toContain('mytool');
  });

  it('lists all capabilities as ## sections', () => {
    const md = generateSkillMd(mockModel);
    expect(md).toContain('## init');
    expect(md).toContain('## build');
  });

  it('includes --dry-run and --json in Flags section', () => {
    const md = generateSkillMd(mockModel);
    expect(md).toContain('--dry-run');
    expect(md).toContain('--json');
  });
});
