'use strict';

// TTY and color detection
const isTTY = process.stdout.isTTY === true;
const noColor = 'NO_COLOR' in process.env || process.env.TERM === 'dumb';
const useColor = isTTY && !noColor;

// 256-color escape helper
const fg256 = (n) => `\x1b[38;5;${n}m`;

// Build color palette -- all empty strings when color disabled
const C = useColor ? {
  // Amber palette
  amber:      fg256(214),   // primary amber
  amberWarm:  fg256(208),   // warm amber
  amberDim:   fg256(172),   // dim amber / warning
  gold:       fg256(178),   // gold amber / celebration

  // Red palette
  red:        fg256(196),   // bright red / error
  redDim:     fg256(160),   // dim red

  // Grey palette
  grey:       fg256(242),   // dim grey / metadata
  greyLight:  fg256(245),   // light grey
  greyDark:   fg256(238),   // dark grey / dividers

  // Modifiers
  bold:       '\x1b[1m',
  dim:        '\x1b[2m',
  reset:      '\x1b[0m',

  // Semantic aliases
  success:    '\x1b[1m' + fg256(214),   // bold amber
  warning:    fg256(172),                // dim amber
  error:      '\x1b[1m' + fg256(196),   // bold red
  info:       fg256(242),                // dim grey
} : Object.fromEntries([
  'amber', 'amberWarm', 'amberDim', 'gold',
  'red', 'redDim',
  'grey', 'greyLight', 'greyDark',
  'bold', 'dim', 'reset',
  'success', 'warning', 'error', 'info',
].map(k => [k, '']));

module.exports = { C, useColor, isTTY };
