/**
 * tests/phase-183/auto-generate.test.mjs
 * Unit tests for Phase 183 auto-generation config keys
 *
 * Coverage:
 *   AUTO-04  presentations.auto_generate — boolean toggle
 *   AUTO-05  presentations.auto_generate_personas — JSON array of persona slugs
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);

// ─── Resolve paths ────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PDE_TOOLS = path.join(REPO_ROOT, 'bin', 'pde-tools.cjs');

// ─── Temp dir setup ───────────────────────────────────────────────────────────

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-183-test-'));
  // Create minimal .planning directory so config-get/set can operate
  fs.mkdirSync(path.join(tmpDir, '.planning'), { recursive: true });
  fs.writeFileSync(
    path.join(tmpDir, '.planning', 'config.json'),
    JSON.stringify({}, null, 2),
    'utf-8'
  );
});

afterEach(() => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function runPde(args, options = {}) {
  return execSync(`node "${PDE_TOOLS}" ${args}`, {
    cwd: tmpDir,
    encoding: 'utf-8',
    ...options,
  });
}

// ─── Test 1: presentations.auto_generate is a valid config key ───────────────

describe('presentations.auto_generate config key (AUTO-04)', () => {
  it('config-set accepts presentations.auto_generate (key is registered)', () => {
    // If the key is not in VALID_CONFIG_KEYS, config-set exits 1 and throws
    expect(() => {
      runPde('config-set presentations.auto_generate true');
    }).not.toThrow();
  });

  it('config-set with value "true" succeeds and config-get returns "true"', () => {
    runPde('config-set presentations.auto_generate true');
    const result = runPde('--raw config-get presentations.auto_generate').trim();
    expect(result).toBe('true');
  });

  it('config-set with value "false" succeeds and config-get returns "false"', () => {
    runPde('config-set presentations.auto_generate false');
    const result = runPde('--raw config-get presentations.auto_generate').trim();
    expect(result).toBe('false');
  });
});

// ─── Test 2: presentations.auto_generate_personas is a valid config key ──────

describe('presentations.auto_generate_personas config key (AUTO-04)', () => {
  it('config-set accepts presentations.auto_generate_personas (key is registered)', () => {
    expect(() => {
      runPde('config-set presentations.auto_generate_personas \'["executive-summary","project-manager"]\'');
    }).not.toThrow();
  });

  it('config-set with JSON array string succeeds and config-get returns the value', () => {
    runPde('config-set presentations.auto_generate_personas \'["executive-summary","project-manager"]\'');
    const raw = runPde('--raw config-get presentations.auto_generate_personas').trim();
    // Value stored as string — check the content is preserved
    expect(raw).toMatch(/executive-summary/);
  });
});

// ─── Test 3: config-get returns fallback when key not set ─────────────────────

describe('gate logic: key not set', () => {
  it('config-get on presentations.auto_generate exits 1 when key not set', () => {
    // Key not in config.json — should exit with non-zero
    let threw = false;
    try {
      execSync(`node "${PDE_TOOLS}" --raw config-get presentations.auto_generate`, {
        cwd: tmpDir,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
    } catch (e) {
      threw = true;
      expect(e.status).toBe(1);
    }
    expect(threw).toBe(true);
  });

  it('workflow fallback pattern returns "false" when key missing', () => {
    // The workflow uses: node pde-tools --raw config-get ... 2>/dev/null || echo "false"
    // Simulate the || echo "false" fallback by catching the error
    let value;
    try {
      value = execSync(`node "${PDE_TOOLS}" --raw config-get presentations.auto_generate`, {
        cwd: tmpDir,
        encoding: 'utf-8',
        stdio: 'pipe',
      }).trim();
    } catch (_) {
      value = 'false';
    }
    expect(value).toBe('false');
  });
});

// ─── Test 4: invalid keys still error ─────────────────────────────────────────

describe('invalid key rejection', () => {
  it('config-set rejects presentations.nonexistent with exit 1', () => {
    let threw = false;
    try {
      execSync(`node "${PDE_TOOLS}" config-set presentations.nonexistent true`, {
        cwd: tmpDir,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
    } catch (e) {
      threw = true;
      expect(e.status).toBe(1);
    }
    expect(threw).toBe(true);
  });

  it('config-get rejects presentations.nonexistent with exit 1', () => {
    let threw = false;
    try {
      execSync(`node "${PDE_TOOLS}" --raw config-get presentations.nonexistent`, {
        cwd: tmpDir,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
    } catch (e) {
      threw = true;
      expect(e.status).toBe(1);
    }
    expect(threw).toBe(true);
  });
});
