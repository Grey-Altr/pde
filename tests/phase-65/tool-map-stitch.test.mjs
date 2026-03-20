/**
 * tool-map-stitch.test.mjs
 * Phase 65 — MCP Bridge + Quota Infrastructure
 *
 * Tests: MCP-02 (TOOL_MAP stitch entries) and MCP-05 (TOOL_MAP_VERIFY_REQUIRED markers)
 * Nyquist coverage for Google Stitch TOOL_MAP completeness and verification markers.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const require = createRequire(import.meta.url);

const bridge = require(`${ROOT}/bin/lib/mcp-bridge.cjs`);
const { TOOL_MAP, call } = bridge;

describe('MCP-02: TOOL_MAP stitch entries', () => {
  test('TOOL_MAP has exactly 10 stitch:* entries', () => {
    const stitchKeys = Object.keys(TOOL_MAP).filter(k => k.startsWith('stitch:'));
    assert.strictEqual(stitchKeys.length, 10, `Expected 10 stitch:* entries, got ${stitchKeys.length}: ${stitchKeys.join(', ')}`);
  });

  test('TOOL_MAP["stitch:probe"] === "mcp__stitch__list_projects"', () => {
    assert.strictEqual(TOOL_MAP['stitch:probe'], 'mcp__stitch__list_projects');
  });

  test('TOOL_MAP["stitch:generate-screen"] === "mcp__stitch__generate_screen_from_text"', () => {
    assert.strictEqual(TOOL_MAP['stitch:generate-screen'], 'mcp__stitch__generate_screen_from_text');
  });

  test('TOOL_MAP["stitch:get-screen"] === "mcp__stitch__get_screen"', () => {
    assert.strictEqual(TOOL_MAP['stitch:get-screen'], 'mcp__stitch__get_screen');
  });

  test('TOOL_MAP["stitch:list-screens"] === "mcp__stitch__list_screens"', () => {
    assert.strictEqual(TOOL_MAP['stitch:list-screens'], 'mcp__stitch__list_screens');
  });

  test('TOOL_MAP["stitch:fetch-screen-code"] === "mcp__stitch__fetch_screen_code"', () => {
    assert.strictEqual(TOOL_MAP['stitch:fetch-screen-code'], 'mcp__stitch__fetch_screen_code');
  });

  test('TOOL_MAP["stitch:fetch-screen-image"] === "mcp__stitch__fetch_screen_image"', () => {
    assert.strictEqual(TOOL_MAP['stitch:fetch-screen-image'], 'mcp__stitch__fetch_screen_image');
  });

  test('TOOL_MAP["stitch:extract-design-context"] === "mcp__stitch__extract_design_context"', () => {
    assert.strictEqual(TOOL_MAP['stitch:extract-design-context'], 'mcp__stitch__extract_design_context');
  });

  test('TOOL_MAP["stitch:create-project"] === "mcp__stitch__create_project"', () => {
    assert.strictEqual(TOOL_MAP['stitch:create-project'], 'mcp__stitch__create_project');
  });

  test('TOOL_MAP["stitch:list-projects"] === "mcp__stitch__list_projects"', () => {
    assert.strictEqual(TOOL_MAP['stitch:list-projects'], 'mcp__stitch__list_projects');
  });

  test('TOOL_MAP["stitch:get-project"] === "mcp__stitch__get_project"', () => {
    assert.strictEqual(TOOL_MAP['stitch:get-project'], 'mcp__stitch__get_project');
  });
});

test('call("stitch:probe", {}) returns correct toolName', () => {
  const result = call('stitch:probe', {});
  assert.strictEqual(result.toolName, 'mcp__stitch__list_projects');
  assert.deepStrictEqual(result.args, {});
});

describe('MCP-05: verification markers in source', () => {
  test('every stitch:* TOOL_MAP line in source contains TOOL_MAP_VERIFY_REQUIRED comment', () => {
    const sourceFile = resolve(ROOT, 'bin', 'lib', 'mcp-bridge.cjs');
    const source = readFileSync(sourceFile, 'utf-8');
    const lines = source.split('\n');

    // Find all lines that contain a stitch:* key assignment in TOOL_MAP
    const stitchToolMapLines = lines.filter(line => {
      return line.includes("'stitch:") && line.includes("'mcp__stitch__");
    });

    assert.ok(
      stitchToolMapLines.length > 0,
      'No stitch:* TOOL_MAP lines found in source file'
    );

    assert.strictEqual(
      stitchToolMapLines.length,
      10,
      `Expected 10 stitch:* TOOL_MAP lines in source, found ${stitchToolMapLines.length}`
    );

    for (const line of stitchToolMapLines) {
      assert.ok(
        line.includes('TOOL_MAP_VERIFY_REQUIRED'),
        `TOOL_MAP line missing TOOL_MAP_VERIFY_REQUIRED comment:\n  ${line.trim()}`
      );
    }
  });
});
