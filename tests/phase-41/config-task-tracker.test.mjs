/**
 * JIRA-04 — task_tracker is in VALID_CONFIG_KEYS in config.cjs
 *
 * Verifies that config.cjs accepts 'task_tracker' as a valid config key
 * by inspecting the source and verifying cmdConfigSet writes successfully
 * to a temp directory without emitting "Unknown config key".
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_SRC_PATH = path.resolve(__dirname, '../../bin/lib/config.cjs');

describe('JIRA-04 — task_tracker is accepted as a valid config key', () => {
  let tmpDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
    fs.mkdirSync(path.join(tmpDir, '.planning'), { recursive: true });
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("config.cjs source contains 'task_tracker' in VALID_CONFIG_KEYS", () => {
    const src = fs.readFileSync(CONFIG_SRC_PATH, 'utf-8');
    assert.ok(
      src.includes("'task_tracker'"),
      "config.cjs must contain 'task_tracker' in VALID_CONFIG_KEYS"
    );
  });

  it('task_tracker appears inside the VALID_CONFIG_KEYS Set initializer block', () => {
    const src = fs.readFileSync(CONFIG_SRC_PATH, 'utf-8');
    const setBlock = src.match(/const VALID_CONFIG_KEYS = new Set\(\[([\s\S]*?)\]\)/);
    assert.ok(setBlock, 'config.cjs must define VALID_CONFIG_KEYS as a Set');
    assert.ok(
      setBlock[1].includes("'task_tracker'"),
      "The VALID_CONFIG_KEYS Set initializer must include 'task_tracker'"
    );
  });

  it('config.cjs task_tracker has a Phase 41 comment documenting valid values', () => {
    const src = fs.readFileSync(CONFIG_SRC_PATH, 'utf-8');
    assert.ok(
      src.includes('task_tracker') && src.includes('Phase 41'),
      'config.cjs must have a Phase 41 comment alongside task_tracker to document valid values'
    );
  });

  it('cmdConfigSet with task_tracker=linear exits 0 and does not print "Unknown config key"', () => {
    // cmdConfigSet calls process.exit(0) on success and process.exit(1) with an error message on failure.
    // We run it in a child process to capture the exit code and stderr without killing this test runner.
    let stdout = '';
    let stderr = '';
    let exitCode = null;

    try {
      stdout = execFileSync(
        process.execPath,
        [
          '--input-type=module',
          '--eval',
          [
            "import { createRequire } from 'module';",
            'const req = createRequire(import.meta.url);',
            `const config = req(${JSON.stringify(CONFIG_SRC_PATH)});`,
            `config.cmdConfigSet(${JSON.stringify(tmpDir)}, 'task_tracker', 'linear', true);`,
          ].join('\n'),
        ],
        { encoding: 'utf-8', timeout: 8000 }
      );
      exitCode = 0;
    } catch (err) {
      // execFileSync throws when exit code !== 0
      exitCode = err.status;
      stderr = err.stderr || '';
      stdout = err.stdout || '';
    }

    assert.ok(
      !stderr.includes('Unknown config key'),
      `cmdConfigSet('task_tracker', 'linear') should not produce "Unknown config key". stderr: ${stderr}`
    );

    // Exit 0 means output() was called (success path). Exit 1 means error() was called.
    assert.equal(
      exitCode,
      0,
      `cmdConfigSet('task_tracker', 'linear') should exit 0 (success). Got exit ${exitCode}. stderr: ${stderr}`
    );
  });

  it('config.json written by cmdConfigSet contains task_tracker=linear', () => {
    // Run cmdConfigSet and then read the written file
    try {
      execFileSync(
        process.execPath,
        [
          '--input-type=module',
          '--eval',
          [
            "import { createRequire } from 'module';",
            'const req = createRequire(import.meta.url);',
            `const config = req(${JSON.stringify(CONFIG_SRC_PATH)});`,
            `config.cmdConfigSet(${JSON.stringify(tmpDir)}, 'task_tracker', 'linear', true);`,
          ].join('\n'),
        ],
        { encoding: 'utf-8', timeout: 8000 }
      );
    } catch (_) {
      // May exit 0 which execFileSync treats as success; ignore errors here since
      // the previous test already verified exit code.
    }

    const configPath = path.join(tmpDir, '.planning', 'config.json');
    assert.ok(
      fs.existsSync(configPath),
      '.planning/config.json must be created by cmdConfigSet'
    );

    const written = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    assert.equal(
      written.task_tracker,
      'linear',
      `config.json must contain task_tracker: "linear", got: ${JSON.stringify(written.task_tracker)}`
    );
  });
});
