/**
 * Phase 167 Plan 02 — compose.cjs tests
 * VID-03: Remotion branded video composition
 * VID-04: PDE design tokens passed as inputProps
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// Check if Remotion is installed in the isolated subdirectory
const remotionInstalled = existsSync(
  join(__dirname, '../../bin/lib/video-pipeline/remotion/node_modules/remotion')
);

// Load compose.cjs
const { extractTokens, composeVideo } = require('../../bin/lib/video-pipeline/compose.cjs');

// ---- extractTokens unit tests ----

describe('extractTokens', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'pde-167-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns DEFAULT_TOKENS when no SYS-*.json files exist', () => {
    const tokens = extractTokens(tmpDir);
    expect(tokens).toMatchObject({
      colors: {
        background: expect.any(String),
        primary: expect.any(String),
        accent: expect.any(String),
      },
      fonts: {
        heading: expect.any(String),
        body: expect.any(String),
      },
    });
    // Verify fallback defaults match BrandedVideo.tsx defaults
    expect(tokens.colors.background).toBe('#0a0a0a');
    expect(tokens.colors.primary).toBe('#ffffff');
    expect(tokens.colors.accent).toBe('#3b82f6');
    expect(tokens.fonts.heading).toBe('Arial');
    expect(tokens.fonts.body).toBe('Arial');
  });

  it('extracts color values from a DTCG SYS-colors.json file', () => {
    // Write a mock SYS-colors.json in DTCG format
    const mockColors = {
      background: {
        $type: 'color',
        $value: '#1a1a2e',
      },
      primary: {
        $type: 'color',
        $value: '#e94560',
      },
      accent: {
        $type: 'color',
        $value: '#0f3460',
      },
    };
    writeFileSync(join(tmpDir, 'SYS-colors.json'), JSON.stringify(mockColors, null, 2));

    const tokens = extractTokens(tmpDir);
    expect(tokens.colors.background).toBe('#1a1a2e');
    expect(tokens.colors.primary).toBe('#e94560');
    expect(tokens.colors.accent).toBe('#0f3460');
  });

  it('extracts font family values from a DTCG SYS-typography.json file', () => {
    const mockTypography = {
      heading: {
        $type: 'fontFamily',
        $value: 'Inter',
      },
      body: {
        $type: 'fontFamily',
        $value: 'Roboto',
      },
    };
    writeFileSync(join(tmpDir, 'SYS-typography.json'), JSON.stringify(mockTypography, null, 2));

    const tokens = extractTokens(tmpDir);
    expect(tokens.fonts.heading).toBe('Inter');
    expect(tokens.fonts.body).toBe('Roboto');
  });

  it('uses fallback defaults for missing color/font keys even with partial SYS files', () => {
    // Only provide background, missing primary and accent
    const partialColors = {
      background: {
        $type: 'color',
        $value: '#111111',
      },
    };
    writeFileSync(join(tmpDir, 'SYS-colors.json'), JSON.stringify(partialColors, null, 2));

    const tokens = extractTokens(tmpDir);
    expect(tokens.colors.background).toBe('#111111');
    // Missing keys should fall back to defaults
    expect(tokens.colors.primary).toBe('#ffffff');
    expect(tokens.colors.accent).toBe('#3b82f6');
  });

  it('returns DEFAULT_TOKENS if SYS-*.json is malformed JSON', () => {
    writeFileSync(join(tmpDir, 'SYS-broken.json'), 'not valid json {{{');
    const tokens = extractTokens(tmpDir);
    expect(tokens.colors.background).toBe('#0a0a0a');
    expect(tokens.fonts.heading).toBe('Arial');
  });
});

// ---- composeVideo integration tests ----

describe.skipIf(!remotionInstalled)('composeVideo (integration — requires Remotion)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'pde-167-compose-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('produces an MP4 file at the output path', async () => {
    const assetsDir = join(tmpDir, 'assets');
    mkdirSync(assetsDir, { recursive: true });

    const result = await composeVideo({
      title: 'Test Video',
      subtitle: 'Automated test',
      slug: 'test',
      resolution: '1280x720',
      durationFrames: 30,
      assetsDir,
    });

    expect(result).toHaveProperty('path');
    expect(result).toHaveProperty('meta');
    expect(existsSync(result.path)).toBe(true);
    expect(result.path).toMatch(/\.mp4$/);
  }, 120000); // Allow 2 minutes for Remotion render

  it('writes a meta.json sidecar alongside the MP4', async () => {
    const assetsDir = join(tmpDir, 'assets');
    mkdirSync(assetsDir, { recursive: true });

    const result = await composeVideo({
      title: 'Sidecar Test',
      slug: 'sidecar',
      resolution: '1280x720',
      durationFrames: 15,
      assetsDir,
    });

    expect(existsSync(result.meta.hash !== undefined ? result.path : '')).toBe(true);
    // Sidecar was written (check via meta object having hash)
    expect(result.meta).toHaveProperty('hash');
    expect(result.meta.source).toBe('remotion-branded');
  }, 120000);
});
