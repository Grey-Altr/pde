'use strict';

/**
 * Get terminal width, minimum 40.
 */
function getWidth() {
  return Math.max(process.stdout.columns || 80, 40);
}

/**
 * Strip ANSI escape codes from a string.
 */
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Visible length of a string (excluding ANSI codes).
 */
function visLen(str) {
  return stripAnsi(str).length;
}

/**
 * Pad text with spaces to target width using visible length.
 */
function padRight(text, width) {
  const pad = width - visLen(text);
  return pad > 0 ? text + ' '.repeat(pad) : text;
}

/**
 * Truncate text to maxWidth, respecting ANSI codes.
 * Counts only visible characters toward the limit.
 */
function truncate(text, maxWidth) {
  if (visLen(text) <= maxWidth) return text;

  let visible = 0;
  let result = '';
  let i = 0;

  while (i < text.length && visible < maxWidth) {
    // Check for ANSI escape sequence
    if (text[i] === '\x1b' && text[i + 1] === '[') {
      const end = text.indexOf('m', i);
      if (end !== -1) {
        result += text.substring(i, end + 1);
        i = end + 1;
        continue;
      }
    }
    result += text[i];
    visible++;
    i++;
  }

  return result;
}

/**
 * Word-wrap text to given width.
 */
function wrapText(text, width) {
  if (!text) return '';
  const words = text.split(' ');
  const lines = [];
  let line = '';

  for (const word of words) {
    if (line.length === 0) {
      line = word;
    } else if (stripAnsi(line + ' ' + word).length <= width) {
      line += ' ' + word;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line.length > 0) lines.push(line);
  return lines.join('\n');
}

/**
 * Center text within given width using visible length.
 */
function centerText(text, width) {
  const vl = visLen(text);
  if (vl >= width) return text;
  const pad = Math.floor((width - vl) / 2);
  return ' '.repeat(pad) + text;
}

module.exports = { getWidth, stripAnsi, visLen, padRight, truncate, wrapText, centerText };
