import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const require = createRequire(import.meta.url);

// These modules don't exist yet — tests are RED by design
const { upsertEntry, loadRegistry, cmdPublish } = require('../../bin/lib/cli-anything/registry.cjs');

let tmpDir;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'pde-registry-test-'));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('loadRegistry', () => {
  it('returns { version: "1.0", entries: [] } for missing file', () => {
    const registryPath = join(tmpDir, 'registry.json');
    const reg = loadRegistry(registryPath);
    expect(reg).toEqual({ version: '1.0', entries: [] });
  });

  it('returns parsed registry for existing file', () => {
    const registryPath = join(tmpDir, 'registry.json');
    const existing = { version: '1.0', entries: [{ name: 'git', binary: '/usr/bin/git' }] };
    writeFileSync(registryPath, JSON.stringify(existing));
    const reg = loadRegistry(registryPath);
    expect(reg.entries).toHaveLength(1);
    expect(reg.entries[0].name).toBe('git');
  });
});

describe('upsertEntry', () => {
  it('creates registry.json if it does not exist', () => {
    const registryPath = join(tmpDir, 'registry.json');
    expect(existsSync(registryPath)).toBe(false);
    upsertEntry(registryPath, { name: 'mytool', binary: '/usr/bin/mytool', serverPath: './server.cjs', skillPath: './SKILL.md' });
    expect(existsSync(registryPath)).toBe(true);
  });

  it('adds new entry to empty registry', () => {
    const registryPath = join(tmpDir, 'registry.json');
    upsertEntry(registryPath, { name: 'mytool', binary: '/usr/bin/mytool', serverPath: './server.cjs', skillPath: './SKILL.md' });
    const reg = loadRegistry(registryPath);
    expect(reg.entries).toHaveLength(1);
    expect(reg.entries[0].name).toBe('mytool');
  });

  it('replaces existing entry with same name (upsert)', () => {
    const registryPath = join(tmpDir, 'registry.json');
    upsertEntry(registryPath, { name: 'mytool', binary: '/usr/bin/mytool', serverPath: './v1/server.cjs', skillPath: './v1/SKILL.md' });
    upsertEntry(registryPath, { name: 'mytool', binary: '/usr/bin/mytool', serverPath: './v2/server.cjs', skillPath: './v2/SKILL.md' });
    const reg = loadRegistry(registryPath);
    expect(reg.entries).toHaveLength(1);
    expect(reg.entries[0].serverPath).toBe('./v2/server.cjs');
  });
});

describe('cmdPublish', () => {
  it('fails if capability-model.json does not exist', async () => {
    const cwd = tmpDir;
    const args = { _: ['git'] };
    await expect(cmdPublish(cwd, args)).rejects.toThrow();
  });
});
