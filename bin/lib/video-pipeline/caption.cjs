'use strict';

/**
 * caption.cjs — FFmpeg-based caption burn-in for the video pipeline.
 *
 * Provides:
 *   - jsonToSrt()    — convert [{start, end, text}] array to SRT format string
 *   - captionVideo() — burn SRT or JSON captions into MP4 via FFmpeg subtitles filter
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const { FFMPEG } = require('./assets.cjs');

/**
 * Format a time in seconds to SRT time format: HH:MM:SS,mmm
 *
 * @param {number} seconds
 * @returns {string}
 */
function formatSrtTime(seconds) {
  const totalMs = Math.round(seconds * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const sec = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const min = totalMin % 60;
  const hr = Math.floor(totalMin / 60);

  const pad2 = n => String(n).padStart(2, '0');
  const pad3 = n => String(n).padStart(3, '0');

  return `${pad2(hr)}:${pad2(min)}:${pad2(sec)},${pad3(ms)}`;
}

/**
 * Convert a JSON captions array to SRT format string.
 *
 * @param {Array<{start: number, end: number, text: string}>} captions
 * @returns {string} SRT-formatted string
 */
function jsonToSrt(captions) {
  return captions
    .map((entry, i) => {
      const idx = i + 1;
      const startStr = formatSrtTime(entry.start);
      const endStr = formatSrtTime(entry.end);
      return `${idx}\n${startStr} --> ${endStr}\n${entry.text}\n`;
    })
    .join('\n');
}

/**
 * Burn captions into a video using FFmpeg subtitles filter.
 *
 * @param {object} opts
 * @param {string} opts.inputPath   - Path to input MP4
 * @param {string} opts.outputPath  - Path to output MP4
 * @param {string} [opts.srt]       - Path to existing SRT file (use instead of captions)
 * @param {Array}  [opts.captions]  - JSON array [{start, end, text}] (converted to SRT)
 * @param {number} [opts.fontSize]  - Font size for subtitles (default: 24)
 * @param {string} [opts.fontColor] - Font color (default: 'white')
 * @param {string} [opts.position]  - Caption position: 'bottom-center' (default)
 * @returns {string} outputPath
 */
function captionVideo({ inputPath, outputPath, srt, captions, fontSize = 24, fontColor = 'white', position = 'bottom-center' } = {}) {
  let srtPath = srt;
  let tempSrt = null;

  if (!srtPath) {
    if (!captions || !Array.isArray(captions) || captions.length === 0) {
      throw new Error('captionVideo: provide either srt (path) or captions (JSON array)');
    }
    tempSrt = path.join(os.tmpdir(), `pde-captions-${Date.now()}.srt`);
    fs.writeFileSync(tempSrt, jsonToSrt(captions), 'utf8');
    srtPath = tempSrt;
  }

  try {
    // Escape the SRT path for FFmpeg filter — colons must be escaped on some platforms
    const escapedSrtPath = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');

    // Build force_style for ASS renderer
    const forceStyle = `Fontsize=${fontSize},PrimaryColour=&H00FFFFFF,FontName=Arial`;

    execFileSync(FFMPEG, [
      '-i', inputPath,
      '-vf', `subtitles=${escapedSrtPath}:force_style='${forceStyle}'`,
      '-c:a', 'copy',
      '-y',
      outputPath,
    ], { stdio: 'pipe' });
  } finally {
    if (tempSrt && fs.existsSync(tempSrt)) {
      fs.unlinkSync(tempSrt);
    }
  }

  return outputPath;
}

module.exports = { captionVideo, jsonToSrt };
