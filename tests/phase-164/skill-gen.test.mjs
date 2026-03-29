import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import os from 'os';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);

const { generateSkillMd, writeSkillMd } = require('../../bin/lib/cli-anything/skill-gen.cjs');

const sampleModel = {
  meta: {
    source: '/usr/bin/git',
    type: 'cli',
    version: '1.0.0',
    auth: {},
    generatedAt: '2026-01-01T00:00:00.000Z',
  },
  capabilities: [
    {
      name: 'git_commit',
      description: 'Record changes to the repository',
      inputSchema: {
        type: 'object',
        properties: {
          useJson: { type: 'boolean', description: 'Append --json flag' },
          message: { type: 'string', description: 'Commit message' },
        },
      },
      outputSchema: null,
      method: null,
      path: 'git commit',
      extensions: { subcommandPath: ['commit'] },
    },
    {
      name: 'git_status',
      description: 'Show the working tree status',
      inputSchema: { type: 'object', properties: {} },
      outputSchema: null,
      method: null,
      path: 'git status',
      extensions: { subcommandPath: ['status'] },
    },
  ],
};

describe('generateSkillMd', () => {
  it('returns a string starting with <!-- PDE-GENERATED', () => {
    const md = generateSkillMd(sampleModel);
    expect(md).toMatch(/^<!-- PDE-GENERATED/);
  });

  it('includes YAML frontmatter with name field', () => {
    const md = generateSkillMd(sampleModel);
    expect(md).toContain('---\nname:');
  });

  it('includes YAML frontmatter with binary field', () => {
    const md = generateSkillMd(sampleModel);
    expect(md).toContain('binary:');
  });

  it('includes ## Tools section with capability count', () => {
    const md = generateSkillMd(sampleModel);
    expect(md).toContain('## Tools');
    expect(md).toContain('2 total');
  });

  it('lists each capability as ### section', () => {
    const md = generateSkillMd(sampleModel);
    expect(md).toContain('### git_commit');
    expect(md).toContain('### git_status');
  });

  it('includes ## Flags section with --dry-run and --json', () => {
    const md = generateSkillMd(sampleModel);
    expect(md).toContain('## Flags');
    expect(md).toContain('--dry-run');
    expect(md).toContain('--json');
  });

  it('includes ## Invocation section with node server.cjs', () => {
    const md = generateSkillMd(sampleModel);
    expect(md).toContain('## Invocation');
    expect(md).toContain('server.cjs');
  });
});

describe('writeSkillMd', () => {
  it('writes SKILL.md to outputDir and returns the path', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-gen-test-'));
    const outPath = writeSkillMd(tmpDir, sampleModel);
    expect(outPath).toBe(path.join(tmpDir, 'SKILL.md'));
    expect(fs.existsSync(outPath)).toBe(true);
    const content = fs.readFileSync(outPath, 'utf8');
    expect(content).toMatch(/^<!-- PDE-GENERATED/);
    fs.rmSync(tmpDir, { recursive: true });
  });
});
