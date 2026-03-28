'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const cs = require('../bin/lib/context-sync.cjs');

// ─── BRW-06: MONITORED_FILES includes .webmcp/config.json ───────────────────

describe('MONITORED_FILES (BRW-06)', () => {
  it('includes .webmcp/config.json entry', () => {
    const entry = cs.MONITORED_FILES.find(f => f.path === '.webmcp/config.json');
    expect(entry).toBeTruthy();
  });

  it('.webmcp entry has parser "webmcp"', () => {
    const entry = cs.MONITORED_FILES.find(f => f.path === '.webmcp/config.json');
    expect(entry).toBeTruthy();
    expect(entry.parser).toBe('webmcp');
  });
});

// ─── BRW-05: emitWebMcpConfig ────────────────────────────────────────────────

describe('emitWebMcpConfig (BRW-05)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'webmcp-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const mockIr = {
    generatedAt: '2026-01-01T00:00:00Z',
    sourceHash: 'abc123deadbeef',
    projectName: 'Test Project',
  };

  it('emitWebMcpConfig is exported', () => {
    expect(typeof cs.emitWebMcpConfig).toBe('function');
  });

  it('writes .webmcp/config.json with correct shape', () => {
    cs.emitWebMcpConfig(mockIr, tmpDir);
    const configPath = path.join(tmpDir, '.webmcp', 'config.json');
    expect(fs.existsSync(configPath)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(parsed._generated).toBe('2026-01-01T00:00:00Z');
    expect(parsed._sourceHash).toBe('abc123deadbeef');
    expect(parsed.mcpServer.url).toBe('http://localhost:3000/api/mcp');
    expect(parsed.mcpServer.name).toContain('Test Project');
    expect(parsed.mcpServer.transport).toBe('streamable-http');
  });

  it('creates .webmcp/ directory if missing', () => {
    // tmpDir exists but has no .webmcp/ subdirectory
    expect(fs.existsSync(path.join(tmpDir, '.webmcp'))).toBe(false);
    cs.emitWebMcpConfig(mockIr, tmpDir);
    expect(fs.existsSync(path.join(tmpDir, '.webmcp'))).toBe(true);
  });

  it('returns { written: true, path: ".webmcp/config.json" }', () => {
    const result = cs.emitWebMcpConfig(mockIr, tmpDir);
    expect(result).toEqual({ written: true, path: '.webmcp/config.json' });
  });

  it('mcpServer.name includes project name from IR', () => {
    cs.emitWebMcpConfig(mockIr, tmpDir);
    const parsed = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.webmcp', 'config.json'), 'utf-8')
    );
    expect(parsed.mcpServer.name).toContain('Test Project');
  });

  it('falls back gracefully when projectName is missing', () => {
    const irNoName = { generatedAt: '2026-01-01T00:00:00Z', sourceHash: 'xyz' };
    const result = cs.emitWebMcpConfig(irNoName, tmpDir);
    expect(result.written).toBe(true);
    const parsed = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.webmcp', 'config.json'), 'utf-8')
    );
    expect(parsed.mcpServer.name).toContain('Unknown Project');
  });
});
