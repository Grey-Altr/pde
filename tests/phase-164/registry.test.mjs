import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import os from 'os';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);

const { loadRegistry, upsertEntry, cmdPublish, cmdList } =
  require('../../bin/lib/cli-anything/registry.cjs');

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true });
});

describe('loadRegistry', () => {
  it('returns default structure when file is missing', () => {
    const reg = loadRegistry(path.join(tmpDir, 'registry.json'));
    expect(reg).toEqual({ version: '1.0', entries: [] });
  });

  it('returns parsed JSON when file exists', () => {
    const data = { version: '1.0', entries: [{ name: 'test', version: '1.0.0' }] };
    const regPath = path.join(tmpDir, 'registry.json');
    fs.writeFileSync(regPath, JSON.stringify(data));
    const reg = loadRegistry(regPath);
    expect(reg).toEqual(data);
  });
});

describe('upsertEntry', () => {
  it('creates registry.json if it does not exist', () => {
    const regPath = path.join(tmpDir, 'registry.json');
    upsertEntry(regPath, { name: 'my-cli', version: '1.0.0', description: 'My CLI' });
    expect(fs.existsSync(regPath)).toBe(true);
  });

  it('adds new entry to empty registry', () => {
    const regPath = path.join(tmpDir, 'registry.json');
    upsertEntry(regPath, { name: 'my-cli', version: '1.0.0', description: 'My CLI' });
    const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
    expect(reg.entries).toHaveLength(1);
    expect(reg.entries[0].name).toBe('my-cli');
  });

  it('replaces existing entry with same name (upsert behavior)', () => {
    const regPath = path.join(tmpDir, 'registry.json');
    upsertEntry(regPath, { name: 'my-cli', version: '1.0.0', description: 'Old' });
    upsertEntry(regPath, { name: 'my-cli', version: '2.0.0', description: 'New' });
    const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
    expect(reg.entries).toHaveLength(1);
    expect(reg.entries[0].version).toBe('2.0.0');
    expect(reg.entries[0].description).toBe('New');
  });

  it('allows multiple different entries', () => {
    const regPath = path.join(tmpDir, 'registry.json');
    upsertEntry(regPath, { name: 'cli-a', version: '1.0.0', description: 'CLI A' });
    upsertEntry(regPath, { name: 'cli-b', version: '1.0.0', description: 'CLI B' });
    const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
    expect(reg.entries).toHaveLength(2);
  });
});

describe('cmdPublish', () => {
  it('throws if capability-model.json does not exist', async () => {
    await expect(cmdPublish(tmpDir, ['test-slug'])).rejects.toThrow(/missing/i);
  });

  it('throws if server.cjs does not exist', async () => {
    const slug = 'test-slug';
    const slugDir = path.join(tmpDir, '.planning', 'cli-anything', slug);
    fs.mkdirSync(slugDir, { recursive: true });
    fs.writeFileSync(
      path.join(slugDir, 'capability-model.json'),
      JSON.stringify({
        meta: { source: '/bin/test', type: 'cli', version: '1.0', auth: {}, generatedAt: '2026-01-01' },
        capabilities: [],
      })
    );
    await expect(cmdPublish(tmpDir, [slug])).rejects.toThrow(/missing/i);
  });

  it('publishes and writes registry entry when all artifacts present', async () => {
    const slug = 'test-slug';
    const slugDir = path.join(tmpDir, '.planning', 'cli-anything', slug);
    const serverDir = path.join(slugDir, 'server');
    fs.mkdirSync(serverDir, { recursive: true });
    fs.writeFileSync(
      path.join(slugDir, 'capability-model.json'),
      JSON.stringify({
        meta: { source: '/bin/test', type: 'cli', version: '1.0', auth: {}, generatedAt: '2026-01-01' },
        capabilities: [
          { name: 'test_run', description: 'Run tests', inputSchema: {}, outputSchema: null, method: null, path: 'test', extensions: {} },
        ],
      })
    );
    fs.writeFileSync(path.join(serverDir, 'server.cjs'), '// server');
    fs.writeFileSync(path.join(serverDir, 'SKILL.md'), '<!-- PDE-GENERATED -->');

    await cmdPublish(tmpDir, [slug]);

    const regPath = path.join(tmpDir, '.planning', 'cli-anything', 'registry.json');
    expect(fs.existsSync(regPath)).toBe(true);
    const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
    expect(reg.entries).toHaveLength(1);
    expect(reg.entries[0].name).toBe(slug);
  });
});
