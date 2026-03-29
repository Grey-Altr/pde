/**
 * tests/phase-167/assemble.test.mjs
 * Tests for bin/lib/video-pipeline/assemble.cjs (VID-02)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';

const require = createRequire(import.meta.url);

let assemble;
let assets;
let tmpDir;
let clip1;
let clip2;

beforeAll(() => {
  assemble = require('../../bin/lib/video-pipeline/assemble.cjs');
  assets = require('../../bin/lib/video-pipeline/assets.cjs');
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-assemble-test-'));

  // Generate two tiny synthetic MP4 clips via ffmpeg lavfi testsrc2
  clip1 = path.join(tmpDir, 'clip1.mp4');
  clip2 = path.join(tmpDir, 'clip2.mp4');

  for (const [clip, color] of [[clip1, 'testsrc2'], [clip2, 'testsrc2']]) {
    execFileSync(assets.FFMPEG, [
      '-f', 'lavfi',
      '-i', `${color}=duration=2:size=320x240:rate=10`,
      '-c:v', 'libx264',
      '-t', '2',
      '-y',
      clip,
    ], { stdio: 'pipe' });
  }
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('getClipDuration', () => {
  it('returns duration in seconds for a valid clip', () => {
    const dur = assemble.getClipDuration(clip1);
    expect(typeof dur).toBe('number');
    // Our 2-second clip — allow tolerance
    expect(dur).toBeGreaterThan(1.8);
    expect(dur).toBeLessThan(2.5);
  });
});

describe('assembleClips', () => {
  it('concatenates clips without transition', () => {
    const outputPath = path.join(tmpDir, 'output-concat.mp4');
    const result = assemble.assembleClips({
      clips: [clip1, clip2],
      outputPath,
      transition: 'none',
    });
    expect(result).toBe(outputPath);
    expect(fs.existsSync(outputPath)).toBe(true);
    const stat = fs.statSync(outputPath);
    expect(stat.size).toBeGreaterThan(0);
  });

  it('concatenates with no transition when transition omitted', () => {
    const outputPath = path.join(tmpDir, 'output-no-trans.mp4');
    const result = assemble.assembleClips({
      clips: [clip1, clip2],
      outputPath,
    });
    expect(result).toBe(outputPath);
    expect(fs.existsSync(outputPath)).toBe(true);
  });

  it('applies crossfade transition between two clips', () => {
    const outputPath = path.join(tmpDir, 'output-crossfade.mp4');
    const result = assemble.assembleClips({
      clips: [clip1, clip2],
      outputPath,
      transition: 'crossfade',
      transitionDur: 0.5,
    });
    expect(result).toBe(outputPath);
    expect(fs.existsSync(outputPath)).toBe(true);
    const stat = fs.statSync(outputPath);
    expect(stat.size).toBeGreaterThan(0);
  });
});
