import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// These modules don't exist yet — tests are RED by design
const { parseSubcommands, parseFlags, spawnHelpText } = require('../../bin/lib/cli-anything/help-parser.cjs');

const simpleHelp = readFileSync(join(__dirname, 'fixtures/simple-help.txt'), 'utf8');

describe('parseSubcommands', () => {
  it('extracts subcommands from simple-help.txt', () => {
    const cmds = parseSubcommands(simpleHelp);
    expect(cmds.map(c => c.name)).toContain('init');
    expect(cmds.map(c => c.name)).toContain('build');
    expect(cmds.map(c => c.name)).toContain('test');
    expect(cmds.map(c => c.name)).toContain('deploy');
  });

  it('returns empty array for empty string', () => {
    expect(parseSubcommands('')).toEqual([]);
  });

  it('skips ALL_CAPS section headers', () => {
    const input = `CORE COMMANDS\n  run      Run something\n  build    Build something`;
    const cmds = parseSubcommands(input);
    const names = cmds.map(c => c.name);
    expect(names).not.toContain('CORE');
    expect(names).not.toContain('COMMANDS');
    expect(names).toContain('run');
    expect(names).toContain('build');
  });

  it('skips lines starting with dashes (flags)', () => {
    const input = `Commands:\n  init     Initialize\n  --verbose  Enable verbose\n  build    Build`;
    const cmds = parseSubcommands(input);
    const names = cmds.map(c => c.name);
    expect(names).not.toContain('--verbose');
    expect(names).toContain('init');
    expect(names).toContain('build');
  });
});

describe('parseFlags', () => {
  it('extracts --verbose and --json from simple-help.txt', () => {
    const flags = parseFlags(simpleHelp);
    const names = flags.map(f => f.flag);
    expect(names).toContain('--verbose');
    expect(names).toContain('--json');
  });

  it('returns empty array for text with no flags', () => {
    expect(parseFlags('no flags here')).toEqual([]);
  });
});

describe('spawnHelpText', () => {
  it('uses stdout || stderr fallback', () => {
    // spawnHelpText should return stdout if non-empty, else stderr
    // We test the contract with a real binary
    const result = spawnHelpText('git', ['--help']);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
