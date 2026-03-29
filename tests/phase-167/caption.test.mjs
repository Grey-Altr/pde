/**
 * tests/phase-167/caption.test.mjs
 * Tests for bin/lib/video-pipeline/caption.cjs (VID-06)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';

const require = createRequire(import.meta.url);

let caption;
let assets;
let tmpDir;
let testMp4;

beforeAll(() => {
  caption = require('../../bin/lib/video-pipeline/caption.cjs');
  assets = require('../../bin/lib/video-pipeline/assets.cjs');
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-caption-test-'));

  // Generate a tiny synthetic MP4 fixture via ffmpeg lavfi
  testMp4 = path.join(tmpDir, 'test-input.mp4');
  execFileSync(assets.FFMPEG, [
    '-f', 'lavfi',
    '-i', 'testsrc2=duration=3:size=320x240:rate=10',
    '-c:v', 'libx264',
    '-t', '3',
    '-y',
    testMp4,
  ], { stdio: 'pipe' });
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('jsonToSrt', () => {
  it('converts a single caption to SRT format', () => {
    const captions = [{ start: 0, end: 2, text: 'Hello world' }];
    const srt = caption.jsonToSrt(captions);
    expect(srt).toContain('1');
    expect(srt).toContain('00:00:00,000');
    expect(srt).toContain('00:00:02,000');
    expect(srt).toContain('Hello world');
  });

  it('converts multiple captions in order', () => {
    const captions = [
      { start: 0, end: 1.5, text: 'First' },
      { start: 2, end: 4, text: 'Second' },
    ];
    const srt = caption.jsonToSrt(captions);
    const lines = srt.trim().split('\n');
    // First entry starts with "1"
    expect(lines[0].trim()).toBe('1');
    // Second entry index
    expect(srt).toContain('\n2\n');
    expect(srt).toContain('First');
    expect(srt).toContain('Second');
  });

  it('formats milliseconds with comma separator (SRT standard)', () => {
    const captions = [{ start: 1.5, end: 3.25, text: 'Test' }];
    const srt = caption.jsonToSrt(captions);
    // SRT uses comma for milliseconds: 00:00:01,500 --> 00:00:03,250
    expect(srt).toContain('00:00:01,500');
    expect(srt).toContain('00:00:03,250');
  });

  it('handles zero start time', () => {
    const captions = [{ start: 0, end: 0.5, text: 'Quick' }];
    const srt = caption.jsonToSrt(captions);
    expect(srt).toContain('00:00:00,000');
    expect(srt).toContain('00:00:00,500');
  });
});

describe('captionVideo', () => {
  it('burns inline JSON captions into MP4 and returns output path', () => {
    const outputPath = path.join(tmpDir, 'captioned.mp4');
    const captions = [
      { start: 0, end: 1.5, text: 'Hello' },
      { start: 1.5, end: 3, text: 'World' },
    ];

    const result = caption.captionVideo({
      inputPath: testMp4,
      outputPath,
      captions,
    });

    expect(result).toBe(outputPath);
    expect(fs.existsSync(outputPath)).toBe(true);
    const stat = fs.statSync(outputPath);
    expect(stat.size).toBeGreaterThan(0);
  });

  it('accepts SRT file path and applies subtitles filter', () => {
    // Write SRT to temp file
    const srtContent = `1\n00:00:00,000 --> 00:00:01,500\nSRT caption\n`;
    const srtPath = path.join(tmpDir, 'test.srt');
    fs.writeFileSync(srtPath, srtContent);

    const outputPath = path.join(tmpDir, 'captioned-srt.mp4');
    const result = caption.captionVideo({
      inputPath: testMp4,
      outputPath,
      srt: srtPath,
    });

    expect(result).toBe(outputPath);
    expect(fs.existsSync(outputPath)).toBe(true);
    const stat = fs.statSync(outputPath);
    expect(stat.size).toBeGreaterThan(0);
  });
});
