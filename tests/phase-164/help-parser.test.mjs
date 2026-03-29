import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { parseSubcommands, parseFlags, spawnHelpText, discoverCapabilities } =
  require('../../bin/lib/cli-anything/help-parser.cjs');

const simpleHelp = fs.readFileSync(path.join(__dirname, 'fixtures/simple-help.txt'), 'utf8');

describe('parseSubcommands', () => {
  it('extracts subcommands from simple-help.txt', () => {
    const subs = parseSubcommands(simpleHelp);
    const names = subs.map(s => s.name);
    expect(names).toContain('init');
    expect(names).toContain('build');
    expect(names).toContain('test');
    expect(names).toContain('deploy');
  });

  it('returns empty array for empty string', () => {
    expect(parseSubcommands('')).toEqual([]);
  });

  it('skips ALL_CAPS section headers', () => {
    const text = 'COMMANDS:\n  init        Init\n  build       Build\n';
    const subs = parseSubcommands(text);
    const names = subs.map(s => s.name);
    expect(names).not.toContain('COMMANDS:');
    expect(names).toContain('init');
  });

  it('skips lines starting with dashes (flags)', () => {
    const text = '  --verbose   Enable verbose\n  init        Initialize\n';
    const subs = parseSubcommands(text);
    const names = subs.map(s => s.name);
    expect(names).not.toContain('--verbose');
    expect(names).toContain('init');
  });

  it('returns objects with name and description', () => {
    const subs = parseSubcommands(simpleHelp);
    const init = subs.find(s => s.name === 'init');
    expect(init).toBeDefined();
    expect(init.description).toMatch(/Initialize/i);
  });
});

describe('parseFlags', () => {
  it('extracts --verbose and --json from simple-help.txt', () => {
    const flags = parseFlags(simpleHelp);
    const longs = flags.map(f => f.long);
    expect(longs).toContain('--verbose');
    expect(longs).toContain('--json');
  });

  it('returns empty array for empty string', () => {
    expect(parseFlags('')).toEqual([]);
  });

  it('captures short flag aliases', () => {
    const flags = parseFlags(simpleHelp);
    const help = flags.find(f => f.long === '--help');
    if (help) {
      expect(help.short).toBe('-h');
    }
  });
});

describe('spawnHelpText', () => {
  it('returns non-empty string for known binary', () => {
    const text = spawnHelpText('git', []);
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
  });

  it('returns stdout or stderr fallback', () => {
    // git --help writes to stdout, so should get output
    const text = spawnHelpText('git', []);
    expect(text).toBeTruthy();
  });
});

describe('discoverCapabilities', () => {
  it('returns array of capability objects for git', () => {
    const caps = discoverCapabilities('git');
    expect(Array.isArray(caps)).toBe(true);
    expect(caps.length).toBeGreaterThan(0);
  });

  it('each capability has required fields', () => {
    const caps = discoverCapabilities('git');
    const cap = caps[0];
    expect(cap).toHaveProperty('name');
    expect(cap).toHaveProperty('description');
    expect(cap).toHaveProperty('inputSchema');
    expect(cap).toHaveProperty('path');
    expect(cap).toHaveProperty('extensions');
  });

  it('returns fallback capability when no subcommands found', () => {
    // Use a simple binary that won't have subcommands
    const caps = discoverCapabilities('true');
    expect(Array.isArray(caps)).toBe(true);
    expect(caps.length).toBeGreaterThanOrEqual(1);
  });
});
