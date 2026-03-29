'use strict';

/**
 * assemble.cjs — FFmpeg-based clip assembly for the video pipeline.
 *
 * Provides:
 *   - assembleClips()    — concatenate MP4 clips via FFmpeg concat demuxer or xfade filter
 *   - getClipDuration()  — probe clip duration in seconds via FFmpeg stderr parse
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync, spawnSync } = require('child_process');
const { FFMPEG } = require('./assets.cjs');

/**
 * Get the duration of a video clip in seconds by parsing FFmpeg stderr.
 * Uses spawnSync so stderr is always captured regardless of exit code.
 *
 * @param {string} clipPath - Path to video clip
 * @returns {number} Duration in seconds
 */
function getClipDuration(clipPath) {
  const result = spawnSync(FFMPEG, ['-i', clipPath, '-f', 'null', '-'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const stderr = result.stderr ? result.stderr.toString() : '';

  const match = /Duration:\s+(\d+):(\d+):(\d+)\.(\d+)/.exec(stderr);
  if (!match) {
    throw new Error(`Could not parse duration from clip: ${clipPath}\nFFmpeg stderr: ${stderr.substring(0, 200)}`);
  }

  const [, h, m, s, cs] = match;
  // cs is centiseconds (2 digits after the decimal point)
  return parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + parseInt(s, 10) + parseInt(cs, 10) / 100;
}

/**
 * Assemble video clips into a single MP4.
 *
 * @param {object} opts
 * @param {string[]} opts.clips       - Array of paths to input MP4 clips
 * @param {string}   opts.outputPath  - Path for output MP4
 * @param {string}   [opts.transition] - 'none' | 'crossfade' (default: 'none')
 * @param {number}   [opts.transitionDur] - Crossfade duration in seconds (default: 1)
 * @returns {string} outputPath
 */
function assembleClips({ clips, outputPath, transition, transitionDur = 1 } = {}) {
  if (!clips || clips.length === 0) {
    throw new Error('assembleClips: clips array must not be empty');
  }

  const useCrossfade = transition === 'crossfade';

  if (!useCrossfade) {
    // Simple concat demuxer — stream copy (fastest, requires matching codec/resolution)
    const listPath = path.join(os.tmpdir(), `pde-concat-${Date.now()}.txt`);
    const listContent = clips.map(c => `file '${c.replace(/'/g, "'\\''")}'`).join('\n');
    fs.writeFileSync(listPath, listContent, 'utf8');

    try {
      execFileSync(FFMPEG, [
        '-f', 'concat',
        '-safe', '0',
        '-i', listPath,
        '-c', 'copy',
        '-y',
        outputPath,
      ], { stdio: 'pipe' });
    } finally {
      if (fs.existsSync(listPath)) fs.unlinkSync(listPath);
    }
  } else {
    // Crossfade via xfade filter — requires re-encode
    if (clips.length === 2) {
      const durA = getClipDuration(clips[0]);
      const offset = Math.max(0, durA - transitionDur);

      execFileSync(FFMPEG, [
        '-i', clips[0],
        '-i', clips[1],
        '-filter_complex',
        `[0:v][1:v]xfade=transition=fade:duration=${transitionDur}:offset=${offset}[v]`,
        '-map', '[v]',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-y',
        outputPath,
      ], { stdio: 'pipe' });
    } else {
      // Chain xfade for N clips
      const inputs = clips.flatMap(c => ['-i', c]);
      const durations = clips.map(c => getClipDuration(c));

      let filterParts = [];
      let prevOutput = '[0:v]';
      let runningOffset = 0;

      for (let i = 1; i < clips.length; i++) {
        runningOffset += durations[i - 1] - transitionDur;
        const outLabel = i === clips.length - 1 ? '[v]' : `[x${i}]`;
        filterParts.push(
          `${prevOutput}[${i}:v]xfade=transition=fade:duration=${transitionDur}:offset=${runningOffset}${outLabel}`
        );
        prevOutput = `[x${i}]`;
      }

      execFileSync(FFMPEG, [
        ...inputs,
        '-filter_complex', filterParts.join(';'),
        '-map', '[v]',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-y',
        outputPath,
      ], { stdio: 'pipe' });
    }
  }

  return outputPath;
}

module.exports = { assembleClips, getClipDuration };
