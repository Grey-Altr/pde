'use strict';
// vitest globals:true — test, describe, expect, it are injected globally

const { spawnSync, spawn } = require('node:child_process');
const fs   = require('node:fs');
const os   = require('node:os');
const path = require('node:path');

// Path to the file under test
const START_RELAY_PATH = path.resolve(__dirname, '..', 'hooks', 'start-relay.cjs');
const PDE_TOOLS_PATH   = path.resolve(__dirname, '..', 'bin', 'pde-tools.cjs');

// ─── RS-01: spawn stdio configuration ────────────────────────────────────────
describe('RS-01: start-relay.cjs spawns relay with file-based stdout', () => {
  it('uses stdio array with fd for stdout, not stdio:ignore string', () => {
    // Read start-relay.cjs source and verify it does NOT have the old bug
    const source = fs.readFileSync(START_RELAY_PATH, 'utf-8');

    // Must NOT have the old broken line
    expect(source).not.toMatch(/stdio:\s*'ignore'/);

    // Must have the response file variable
    expect(source).toMatch(/pde-relay-responses-\$\{sessionId\}\.ndjson/);

    // Must have openSync for append
    expect(source).toMatch(/fs\.openSync\(responseFile,\s*'a'\)/);

    // Must use fd in stdio array
    expect(source).toMatch(/stdio:\s*\['ignore',\s*responseFd,\s*'ignore'\]/);

    // Must close the fd after spawn
    expect(source).toMatch(/fs\.closeSync\(responseFd\)/);
  });

  it('fs.openSync called with pde-relay-responses path in append mode', () => {
    const source = fs.readFileSync(START_RELAY_PATH, 'utf-8');
    // responseFd is assigned from openSync
    expect(source).toMatch(/const responseFd\s*=\s*fs\.openSync\(/);
    // path uses os.tmpdir()
    expect(source).toMatch(/os\.tmpdir\(\)/);
  });

  it('fs.closeSync called with responseFd before writeFileSync(pidFile)', () => {
    const source = fs.readFileSync(START_RELAY_PATH, 'utf-8');
    // closeSync must appear before writeFileSync(pidFile)
    const closeIdx = source.indexOf('fs.closeSync(responseFd)');
    const writeIdx = source.indexOf('fs.writeFileSync(pidFile');
    expect(closeIdx).toBeGreaterThan(-1);
    expect(writeIdx).toBeGreaterThan(-1);
    expect(closeIdx).toBeLessThan(writeIdx);
  });
});

// ─── RS-02: response file receives child stdout ───────────────────────────────
describe('RS-02: approval response written by child process appears in response file', () => {
  let tempFile;

  beforeEach(() => {
    tempFile = path.join(os.tmpdir(), `test-relay-stdio-${Date.now()}.ndjson`);
  });

  afterEach(() => {
    try { fs.unlinkSync(tempFile); } catch { /* ignore */ }
  });

  it('child process stdout written to fd appears in file after child exits', async () => {
    // Open the file for appending
    const fd = fs.openSync(tempFile, 'a');

    // Spawn a trivial child that writes an approval_response JSON line to stdout
    const child = spawn(
      process.execPath,
      [
        '-e',
        `process.stdout.write(JSON.stringify({type:'approval_response',approval_id:'test-123',action:'approved'})+'\\n')`
      ],
      {
        detached: true,
        stdio: ['ignore', fd, 'ignore'],
      }
    );

    // Close fd in parent immediately after spawn (child holds its own copy)
    fs.closeSync(fd);

    // Wait for child to exit
    await new Promise((resolve, reject) => {
      child.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Child exited with code ${code}`));
      });
      child.on('error', reject);
    });

    // Read the temp file and verify NDJSON content
    const content = fs.readFileSync(tempFile, 'utf-8');
    const lines = content.split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(1);

    const parsed = JSON.parse(lines[0]);
    expect(parsed.type).toBe('approval_response');
    expect(parsed.approval_id).toBe('test-123');
    expect(parsed.action).toBe('approved');
  }, 10000);
});

// ─── RS-03: poll-approval finds matching response ─────────────────────────────
describe('RS-03: pde-tools poll-approval returns matching response from file', () => {
  let tempDir;
  let responseFile;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
    // Create .planning directory with config.json
    fs.mkdirSync(path.join(tempDir, '.planning'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, '.planning', 'config.json'),
      JSON.stringify({ monitoring: { session_id: 'test-sess-001' } }),
      'utf-8'
    );
    responseFile = path.join(os.tmpdir(), 'pde-relay-responses-test-sess-001.ndjson');
  });

  afterEach(() => {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
    try { fs.unlinkSync(responseFile); } catch { /* ignore */ }
  });

  it('findResponse logic returns matching approval_response object', () => {
    // Write NDJSON file with 3 lines: one event, one target, one other
    const lines = [
      JSON.stringify({ type: 'event', data: 'something' }),
      JSON.stringify({ type: 'approval_response', approval_id: 'target-id', action: 'approved' }),
      JSON.stringify({ type: 'approval_response', approval_id: 'other-id', action: 'denied' }),
    ].join('\n') + '\n';
    fs.writeFileSync(responseFile, lines, 'utf-8');

    // Inline the findResponse logic (mirroring pde-tools.cjs implementation)
    const findResponse = (approvalId) => {
      try {
        const fileLines = fs.readFileSync(responseFile, 'utf-8').split('\n').filter(Boolean);
        for (const line of fileLines) {
          try {
            const obj = JSON.parse(line);
            if (obj.type === 'approval_response' && obj.approval_id === approvalId) {
              return obj;
            }
          } catch { /* skip malformed */ }
        }
      } catch { /* file not yet created */ }
      return null;
    };

    const result = findResponse('target-id');
    expect(result).not.toBeNull();
    expect(result.approval_id).toBe('target-id');
    expect(result.action).toBe('approved');

    // Must NOT return other-id entry
    const otherResult = findResponse('other-id');
    expect(otherResult).not.toBeNull();
    expect(otherResult.approval_id).toBe('other-id');

    // Must return null for unknown id
    expect(findResponse('unknown-id')).toBeNull();
  });

  it('RS-03-integration: poll-approval returns matching response via pde-tools', () => {
    // Write response file with the target approval
    const content = JSON.stringify({
      type: 'approval_response',
      approval_id: 'match-me',
      action: 'approved',
      responded_at: '2026-01-01T00:00:00Z',
    }) + '\n';
    fs.writeFileSync(responseFile, content, 'utf-8');

    // Run pde-tools poll-approval via spawnSync
    const result = spawnSync(
      process.execPath,
      [PDE_TOOLS_PATH, 'poll-approval', 'match-me', '2000'],
      { cwd: tempDir, timeout: 8000, encoding: 'utf-8' }
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toBeTruthy();

    const parsed = JSON.parse(result.stdout);
    expect(parsed.type).toBe('approval_response');
    expect(parsed.approval_id).toBe('match-me');
    expect(parsed.action).toBe('approved');
  }, 15000);

  it('RS-03-timeout: poll-approval times out when no matching response', () => {
    // Response file is empty (no matching entry)
    fs.writeFileSync(responseFile, '', 'utf-8');

    const result = spawnSync(
      process.execPath,
      [PDE_TOOLS_PATH, 'poll-approval', 'no-such-id', '1000'],
      { cwd: tempDir, timeout: 8000, encoding: 'utf-8' }
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toBeTruthy();

    const parsed = JSON.parse(result.stdout);
    expect(parsed.timed_out).toBe(true);
    expect(parsed.approval_id).toBe('no-such-id');
  }, 10000);
});
