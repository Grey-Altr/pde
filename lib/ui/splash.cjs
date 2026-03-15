'use strict';

const { C, useColor, isTTY } = require('./colors.cjs');
const { getWidth, centerText } = require('./layout.cjs');
const { execSync } = require('child_process');
const { readFileSync } = require('fs');
const path = require('path');

// ─── ASCII Art Logo ────────────────────────────────────────────────
// Block-character PDE logo for machine boot aesthetic

const LOGO_LINES = [
  '  ██████╗  ██████╗  ███████╗ ',
  '  ██╔══██╗ ██╔══██╗ ██╔════╝ ',
  '  ██████╔╝ ██║  ██║ █████╗   ',
  '  ██╔═══╝  ██║  ██║ ██╔══╝   ',
  '  ██║      ██████╔╝ ███████╗ ',
  '  ╚═╝      ╚═════╝  ╚══════╝ ',
];

const LOGO_WIDTH = 29; // visible width of logo lines

// ─── Project Status Gathering ──────────────────────────────────────

function getVersion() {
  try {
    const versionPath = path.join(process.env.CLAUDE_PLUGIN_ROOT || path.join(process.env.HOME || '', '.claude', 'pde'), 'VERSION');
    return readFileSync(versionPath, 'utf8').trim();
  } catch {
    return 'dev';
  }
}

function getProjectName() {
  try {
    const projectPath = path.join(process.cwd(), '.planning', 'PROJECT.md');
    const content = readFileSync(projectPath, 'utf8');
    // Try frontmatter name field
    const fmMatch = content.match(/^name:\s*["']?(.+?)["']?\s*$/m);
    if (fmMatch) return fmMatch[1];
    // Try first heading
    const headingMatch = content.match(/^#\s+(.+)/m);
    if (headingMatch) return headingMatch[1].replace(/\s*[-—].*$/, '').trim();
    return null;
  } catch {
    return null;
  }
}

function getPhaseProgress() {
  try {
    const statePath = path.join(process.cwd(), '.planning', 'STATE.md');
    const content = readFileSync(statePath, 'utf8');
    // Extract phase info from "Phase: X of Y (Name)" line
    const phaseMatch = content.match(/\*\*Phase:\*\*\s*(\d+)\s+of\s+(\d+)\s+\((.+?)\)/);
    if (phaseMatch) {
      return { num: phaseMatch[1], total: phaseMatch[2], name: phaseMatch[3] };
    }
    return null;
  } catch {
    return null;
  }
}

function getLastActivity() {
  try {
    const result = execSync('git log -1 --format="%ar -- %s" 2>/dev/null', {
      encoding: 'utf8',
      timeout: 3000,
    }).trim();
    return result || null;
  } catch {
    return null;
  }
}

// ─── Status Display ────────────────────────────────────────────────

function buildStatusBlock() {
  const version = getVersion();
  const projectName = getProjectName();
  const phase = getPhaseProgress();
  const lastActivity = getLastActivity();

  const lines = [];

  // Version + subtitle
  lines.push(`${C.amber}v${version}${C.reset}`);
  lines.push(`${C.grey}Platform Development Engine${C.reset}`);
  lines.push('');

  // Project name
  if (projectName) {
    lines.push(`${C.amber}${projectName}${C.reset}`);
  } else {
    lines.push(`${C.grey}No active project${C.reset}`);
  }

  // Phase progress
  if (phase) {
    lines.push(`${C.amberDim}Phase ${phase.num}/${phase.total}: ${phase.name}${C.reset}`);
  }

  // Last activity
  if (lastActivity) {
    lines.push(`${C.grey}${lastActivity}${C.reset}`);
  } else {
    lines.push(`${C.grey}No recent activity${C.reset}`);
  }

  return lines;
}

// ─── Static (Non-TTY) Splash ───────────────────────────────────────

function printStaticSplash() {
  const w = getWidth();

  // Logo
  process.stdout.write('\n');
  for (const line of LOGO_LINES) {
    process.stdout.write(`${C.bold}${C.amber}${centerText(line, w)}${C.reset}\n`);
  }
  process.stdout.write('\n');

  // Status block
  const status = buildStatusBlock();
  for (const line of status) {
    process.stdout.write(`  ${line}\n`);
  }
  process.stdout.write('\n');
}

// ─── Animated (TTY) Splash ─────────────────────────────────────────

function generateNoiseFrame(w, h) {
  const chars = '░▒▓█▀▄▌▐│─┼┤├┬┴╬╫╪';
  const lines = [];
  for (let y = 0; y < h; y++) {
    let line = '';
    for (let x = 0; x < w; x++) {
      if (Math.random() < 0.3) {
        line += chars[Math.floor(Math.random() * chars.length)];
      } else {
        line += ' ';
      }
    }
    lines.push(line);
  }
  return lines;
}

function generateScanFrame(w, h, scanY) {
  const lines = [];
  for (let y = 0; y < h; y++) {
    if (y >= scanY - 1 && y <= scanY + 1) {
      const brightness = y === scanY ? C.amber : C.amberDim;
      lines.push(`${brightness}${'─'.repeat(w)}${C.reset}`);
    } else {
      lines.push(' '.repeat(w));
    }
  }
  return lines;
}

function generateMaterializeFrame(w, h, logoStartY, progress) {
  // progress: 0..1, controls how much of the logo is visible
  const lines = [];
  const chars = '░▒▓█';
  const logoStartX = Math.floor((w - LOGO_WIDTH) / 2);

  for (let y = 0; y < h; y++) {
    const logoIdx = y - logoStartY;
    if (logoIdx >= 0 && logoIdx < LOGO_LINES.length) {
      const logoLine = LOGO_LINES[logoIdx];
      let line = ' '.repeat(Math.max(0, logoStartX));
      for (let i = 0; i < logoLine.length; i++) {
        const charProgress = Math.random();
        if (charProgress < progress) {
          line += logoLine[i];
        } else if (charProgress < progress + 0.2) {
          line += chars[Math.floor(Math.random() * chars.length)];
        } else {
          line += ' ';
        }
      }
      lines.push(`${C.bold}${C.amber}${line}${C.reset}`);
    } else {
      // Add sparse noise that fades with progress
      if (Math.random() < 0.05 * (1 - progress)) {
        const noiseChars = '░▒';
        let noiseLine = '';
        for (let x = 0; x < w; x++) {
          noiseLine += Math.random() < 0.1 ? noiseChars[Math.floor(Math.random() * 2)] : ' ';
        }
        lines.push(`${C.greyDark}${noiseLine}${C.reset}`);
      } else {
        lines.push(' '.repeat(w));
      }
    }
  }
  return lines;
}

function generateGlitchFrame(w, h, logoStartY, intensity) {
  const lines = [];
  const logoStartX = Math.floor((w - LOGO_WIDTH) / 2);

  for (let y = 0; y < h; y++) {
    const logoIdx = y - logoStartY;
    if (logoIdx >= 0 && logoIdx < LOGO_LINES.length) {
      const logoLine = LOGO_LINES[logoIdx];
      // Glitch: occasionally offset the line horizontally
      const offset = Math.random() < intensity ? Math.floor(Math.random() * 4) - 2 : 0;
      const pad = Math.max(0, logoStartX + offset);
      const color = Math.random() < intensity * 0.5 ? C.red : `${C.bold}${C.amber}`;
      lines.push(`${color}${' '.repeat(pad)}${logoLine}${C.reset}`);
    } else {
      lines.push(' '.repeat(w));
    }
  }
  return lines;
}

function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[H');
}

function renderFrame(lines) {
  clearScreen();
  for (const line of lines) {
    process.stdout.write(line + '\n');
  }
}

function playAnimatedSplash() {
  return new Promise((resolve) => {
    const w = Math.min(getWidth(), 120);
    const h = Math.min(process.stdout.rows || 24, 24);
    const logoStartY = Math.floor((h - LOGO_LINES.length) / 2) - 2;
    const frameDelay = 80;

    const frames = [];

    // Phase 1: Static noise (frames 0-7)
    for (let i = 0; i < 8; i++) {
      frames.push(() => {
        const noiseLines = generateNoiseFrame(w, h);
        const colored = noiseLines.map(l => `${C.greyDark}${l}${C.reset}`);
        renderFrame(colored);
      });
    }

    // Phase 2: Scan lines (frames 8-15)
    for (let i = 0; i < 8; i++) {
      const scanY = Math.floor((i / 7) * h);
      frames.push(() => {
        const scanLines = generateScanFrame(w, h, scanY);
        renderFrame(scanLines);
      });
    }

    // Phase 3: Logo materialization (frames 16-24)
    for (let i = 0; i < 9; i++) {
      const progress = (i + 1) / 9;
      frames.push(() => {
        const matLines = generateMaterializeFrame(w, h, logoStartY, progress);
        renderFrame(matLines);
      });
    }

    // Phase 4: Glitch settle (frames 25-29)
    for (let i = 0; i < 5; i++) {
      const intensity = 0.5 * (1 - i / 4);
      frames.push(() => {
        const glitchLines = generateGlitchFrame(w, h, logoStartY, intensity);
        renderFrame(glitchLines);
      });
    }

    // Final frame: clean logo with status
    frames.push(() => {
      clearScreen();
      const status = buildStatusBlock();

      // Top padding
      const totalContentHeight = LOGO_LINES.length + 1 + status.length;
      const topPad = Math.max(0, Math.floor((h - totalContentHeight) / 2) - 1);
      for (let i = 0; i < topPad; i++) {
        process.stdout.write('\n');
      }

      // Logo
      for (const line of LOGO_LINES) {
        process.stdout.write(`${C.bold}${C.amber}${centerText(line, w)}${C.reset}\n`);
      }
      process.stdout.write('\n');

      // Status
      for (const line of status) {
        process.stdout.write(`  ${line}\n`);
      }
      process.stdout.write('\n');
    });

    // Play frames
    let frameIdx = 0;
    function nextFrame() {
      if (frameIdx < frames.length) {
        frames[frameIdx]();
        frameIdx++;
        setTimeout(nextFrame, frameDelay);
      } else {
        resolve();
      }
    }
    nextFrame();
  });
}

// ─── Main Export ───────────────────────────────────────────────────

function splash() {
  if (isTTY && useColor) {
    return playAnimatedSplash();
  } else {
    printStaticSplash();
    return Promise.resolve();
  }
}

module.exports = { splash };
