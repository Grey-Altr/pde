/**
 * tests/phase-176/presentation-cmd.test.mjs
 * Integration tests for `pde-tools presentation` CLI routing and full IR schema.
 *
 * Tests:
 *   - CLI routing to artifact-read subcommand
 *   - Full IR schema validation (all required top-level keys)
 *   - extracted_at as valid ISO timestamp
 *   - .planning/presentations/ directory creation
 *   - Error handling for unknown subcommands
 *   - cross_ref_warnings is an array
 */

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const cwd = process.cwd();
const bin = join(cwd, 'bin', 'pde-tools.cjs');

/**
 * Run a pde-tools subcommand and return stdout (or error info on failure).
 * Handles @file: large-payload redirection transparently.
 */
function runCmd(subArgs) {
  try {
    const stdout = execFileSync('node', [bin, ...subArgs.split(' ')], {
      cwd,
      encoding: 'utf-8',
      timeout: 30000,
    });
    if (stdout.startsWith('@file:')) {
      return readFileSync(stdout.slice(6).trim(), 'utf-8');
    }
    return stdout;
  } catch (e) {
    return { error: true, stderr: e.stderr, status: e.status };
  }
}

// ─── presentation artifact-read ───────────────────────────────────────────────

describe('presentation artifact-read', () => {
  it('routes to presentation artifact-read and returns valid JSON with schema_version 1.0', () => {
    const result = runCmd('presentation artifact-read');
    expect(result.error).toBeUndefined();
    const ir = JSON.parse(result);
    expect(ir.schema_version).toBe('1.0');
  });

  it('full IR schema has all required top-level keys', () => {
    const result = runCmd('presentation artifact-read');
    expect(result.error).toBeUndefined();
    const ir = JSON.parse(result);

    const requiredKeys = [
      'schema_version',
      'extracted_at',
      'source_hash',
      'project',
      'phases',
      'requirements',
      'design_artifacts',
      'git_velocity',
      'cost_timing',
      'blockers',
      'risks',
      'verification',
      'research',
      'decisions',
      'output_dir',
      'output_dir_created',
      'cross_ref_warnings',
    ];

    const actualKeys = Object.keys(ir);
    for (const key of requiredKeys) {
      expect(actualKeys, `missing key: ${key}`).toContain(key);
    }
  });

  it('extracted_at is a valid ISO 8601 timestamp', () => {
    const result = runCmd('presentation artifact-read');
    expect(result.error).toBeUndefined();
    const ir = JSON.parse(result);

    expect(typeof ir.extracted_at).toBe('string');
    expect(ir.extracted_at.length).toBeGreaterThan(0);
    // Round-trip check: re-serializing should produce the same value
    expect(new Date(ir.extracted_at).toISOString()).toBe(ir.extracted_at);
  });

  it('creates .planning/presentations/ output directory', () => {
    const result = runCmd('presentation artifact-read');
    expect(result.error).toBeUndefined();
    const presentationsDir = join(cwd, '.planning', 'presentations');
    expect(existsSync(presentationsDir)).toBe(true);
  });

  it('source_hash is a non-empty hex string', () => {
    const result = runCmd('presentation artifact-read');
    expect(result.error).toBeUndefined();
    const ir = JSON.parse(result);

    expect(typeof ir.source_hash).toBe('string');
    expect(ir.source_hash.length).toBeGreaterThan(0);
    expect(/^[0-9a-f]+$/i.test(ir.source_hash)).toBe(true);
  });

  it('cross_ref_warnings is an array', () => {
    const result = runCmd('presentation artifact-read');
    expect(result.error).toBeUndefined();
    const ir = JSON.parse(result);
    expect(Array.isArray(ir.cross_ref_warnings)).toBe(true);
  });

  it('output_dir is set to .planning/presentations', () => {
    const result = runCmd('presentation artifact-read');
    expect(result.error).toBeUndefined();
    const ir = JSON.parse(result);
    expect(ir.output_dir).toBe('.planning/presentations');
  });
});

// ─── Unknown subcommand error handling ───────────────────────────────────────

describe('presentation unknown subcommand', () => {
  it('errors on unknown subcommand with clear message listing available subcommands', () => {
    const result = runCmd('presentation bogus');
    expect(result.error).toBe(true);
    expect(result.stderr).toContain('Unknown presentation subcommand');
    expect(result.stderr).toContain('artifact-read');
  });

  it('exits with non-zero status for unknown subcommand', () => {
    const result = runCmd('presentation unknown-cmd');
    expect(result.error).toBe(true);
    expect(result.status).not.toBe(0);
  });
});
