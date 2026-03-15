'use strict';

const { C, useColor } = require('./colors.cjs');
const { getWidth, visLen, padRight, wrapText, centerText } = require('./layout.cjs');

// Box-drawing characters
const BOX = {
  double: { tl: '\u2554', tr: '\u2557', bl: '\u255A', br: '\u255D', h: '\u2550', v: '\u2551' },
  single: { tl: '\u250C', tr: '\u2510', bl: '\u2514', br: '\u2518', h: '\u2500', v: '\u2502' },
};

/**
 * Write output to stdout, ensuring reset at end when color is active.
 */
function write(str) {
  process.stdout.write(str);
  if (useColor && str.length > 0) {
    process.stdout.write(C.reset);
  }
}

/**
 * Parse flags from args array: --key value pairs and positional args.
 */
function parseFlags(args) {
  const flags = {};
  const positional = [];
  let i = 0;
  while (i < args.length) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      // Check if next arg exists and is not a flag
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        flags[key] = args[i + 1];
        i += 2;
      } else {
        flags[key] = true;
        i += 1;
      }
    } else {
      positional.push(args[i]);
      i += 1;
    }
  }
  return { flags, positional };
}

// ─── Component Functions ───────────────────────────────────────────

/**
 * Neo-tokyo glyph-framed banner.
 * Full terminal width, block chars around label.
 */
function banner(stageName, flags) {
  const w = getWidth();
  const label = ` ${stageName.toUpperCase()} `;
  const isMajor = flags && (flags.major === true || flags.major === 'true');

  // Glyph-framed: block chars flanking the label
  const blockChar = '\u2588'; // Full block
  const sideWidth = Math.max(2, Math.floor((w - label.length - 2) / 2));
  const leftBlocks = blockChar.repeat(sideWidth);
  const rightBlocks = blockChar.repeat(w - sideWidth - label.length);

  const line = `${leftBlocks}${label}${rightBlocks}`;

  if (isMajor) {
    // Major banner: double-line box around it
    const box = BOX.double;
    const inner = w - 2;
    const top = `${C.bold}${C.amber}${box.tl}${box.h.repeat(inner)}${box.tr}\n`;
    const mid = `${box.v}${padRight(`${C.bold}${C.amber}${line}`, inner)}${C.bold}${C.amber}${box.v}\n`;
    const bot = `${box.bl}${box.h.repeat(inner)}${box.br}\n`;
    write(top + mid + bot);
  } else {
    write(`${C.bold}${C.amber}${line}\n`);
  }
}

/**
 * Unified panel component with border and content.
 */
function panel(title, flags) {
  const w = getWidth();
  const type = (flags && flags.type) || 'default';
  const content = (flags && flags.content) || '';
  const isMajor = type === 'checkpoint' || type === 'major';

  // Select border style
  const box = isMajor ? BOX.double : BOX.single;

  // Select color
  let borderColor = C.amber;
  if (type === 'error') borderColor = C.red;
  else if (type === 'info') borderColor = C.grey;
  else if (type === 'checkpoint') borderColor = C.gold || C.amber;

  const innerWidth = w - 4; // borders + padding
  const titleStr = ` ${title} `;
  const titlePad = Math.max(0, innerWidth - titleStr.length);

  // Top border with title
  const topLine = `${borderColor}${box.tl}${box.h}${titleStr}${box.h.repeat(Math.max(0, titlePad))}${box.tr}\n`;

  // Content lines
  const wrapped = content ? wrapText(content, innerWidth) : '';
  const contentLines = wrapped ? wrapped.split('\n') : [];

  let body = '';
  if (contentLines.length === 0) {
    body = `${borderColor}${box.v}${' '.repeat(innerWidth + 2)}${box.v}\n`;
  } else {
    for (const line of contentLines) {
      body += `${borderColor}${box.v} ${padRight(line, innerWidth)}${borderColor} ${box.v}\n`;
    }
  }

  // Bottom border
  const botLine = `${borderColor}${box.bl}${box.h.repeat(innerWidth + 2)}${box.br}\n`;

  write(topLine + body + botLine);
}

/**
 * Progress bar with filled/empty blocks and percentage.
 */
function progress(label, flags) {
  const w = getWidth();
  const percent = Math.min(100, Math.max(0, parseInt((flags && flags.percent) || '0', 10)));
  const barWidth = Math.min(w - 20, 40);
  const filled = Math.round((percent / 100) * barWidth);
  const empty = barWidth - filled;

  const filledStr = `${C.amber}${'\u2588'.repeat(filled)}`;
  const emptyStr = `${C.greyDark || C.grey}${'\u2591'.repeat(empty)}`;
  const pctStr = `${C.amber} ${percent}%`;

  write(`${C.amber}${label} ${filledStr}${emptyStr}${pctStr}\n`);
}

/**
 * Checkpoint: double-line gold box with celebration styling.
 */
function checkpoint(message, flags) {
  const w = getWidth();
  const box = BOX.double;
  const innerWidth = w - 4;
  const color = C.gold || C.amber;

  const centered = centerText(message, innerWidth);

  const top = `${color}${box.tl}${box.h.repeat(innerWidth + 2)}${box.tr}\n`;
  const mid = `${color}${box.v} ${padRight(centered, innerWidth)}${color} ${box.v}\n`;
  const bot = `${color}${box.bl}${box.h.repeat(innerWidth + 2)}${box.br}\n`;

  write(top + mid + bot);
}

/**
 * Error panel: red-bordered with error message.
 */
function error(message, flags) {
  panel('ERROR', { type: 'error', content: message });
}

/**
 * Header with visual hierarchy levels.
 * Level 1 = bold + amber + underline divider
 * Level 2 = amber
 * Default = bold amber
 */
function header(text, flags) {
  const w = getWidth();
  const level = parseInt((flags && flags.level) || '0', 10);

  if (level === 1) {
    write(`${C.bold}${C.amber}${text}\n${C.greyDark || C.grey}${'─'.repeat(Math.min(visLen(text) + 4, w))}\n`);
  } else if (level === 2) {
    write(`${C.amber}${text}\n`);
  } else {
    write(`${C.bold}${C.amber}${text}\n`);
  }
}

/**
 * Horizontal divider line.
 */
function divider(flags) {
  const w = getWidth();
  const style = (flags && flags.style) || 'single';
  const char = style === 'double' ? '═' : '─';
  const color = C.greyDark || C.grey;

  write(`${color}${char.repeat(w)}\n`);
}

module.exports = { banner, panel, progress, checkpoint, error, header, divider, parseFlags };
