#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { C, useColor } = require('./colors.cjs');
const components = require('./components.cjs');
const { splash } = require('./splash.cjs');
const telemetry = require('../telemetry.cjs');

// Safety: always reset terminal colors on exit
if (useColor) {
  process.on('exit', () => {
    process.stdout.write('\x1b[0m');
  });
}

// Parse command line
const args = process.argv.slice(2);
const command = args[0];
const remaining = args.slice(1);

if (!command) {
  process.stderr.write('Usage: render.cjs <command> [args] [--flags]\n');
  process.stderr.write('Commands: banner, panel, progress, checkpoint, error, header, divider, splash\n');
  process.stderr.write('Telemetry: consent, track-skill, track-error, track-context, track-mcp, track-custom, telemetry\n');
  process.exit(1);
}

// Parse flags and positional args
const { flags, positional } = components.parseFlags(remaining);
const message = positional.join(' ');

// ── Telemetry Helper ────────────────────────────────────────────────

function getTimestamp() {
  return new Date().toISOString();
}

function getTrackingFilePath(skillCode) {
  const os = require('node:os');
  const baseDir = process.env.PDE_TEST_DIR || os.homedir();
  const telemDir = path.join(baseDir, '.pde', 'telemetry');
  return path.join(telemDir, `.tracking-${skillCode}`);
}

// ── Consent Command ─────────────────────────────────────────────────

function runConsent() {
  const version = flags.version || telemetry.getTrackingPlanVersion();

  // Already consented? Silent exit
  if (telemetry.checkConsent(version)) {
    process.exit(0);
  }

  // Display consent gate
  const categories = [
    'Skill usage -- which skills you run, how long, success/fail',
    'Error metadata -- error class and code only (never content or paths)',
    'Session workflow -- skill sequence per session',
    'Project metadata -- product type, stage, platforms (never project name)',
    'MCP availability -- which MCPs degrade gracefully',
    'Custom tooling -- count of custom skills/tools beyond defaults'
  ];

  const content = [
    'PDE collects the following during alpha:\n',
    ...categories.map(c => `  * ${c}`),
    '',
    'All data stays on your machine. No remote transmission during alpha.',
    '',
    'Full details: ${CLAUDE_PLUGIN_ROOT}/TRACKING-PLAN.md',
    'Inspect your data anytime: pde telemetry show-data'
  ].join('\n');

  components.panel('TELEMETRY CONSENT', { type: 'default', content });

  // Must be interactive TTY
  if (!process.stdin.isTTY) {
    process.stderr.write('Consent must be given interactively\n');
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Accept telemetry? [Y/n]: ', (answer) => {
    rl.close();
    const trimmed = (answer || '').trim().toLowerCase();

    if (trimmed === '' || trimmed === 'y' || trimmed === 'yes') {
      telemetry.saveConsent(version);
      process.exit(0);
    } else {
      components.panel('TELEMETRY DECLINED', {
        type: 'default',
        content: 'Telemetry is required during alpha. PDE will exit.'
      });
      process.exit(1);
    }
  });
}

// ── Track Commands ──────────────────────────────────────────────────

function runTrackSkill() {
  const skillCode = positional[0];
  const subcommand = positional[1];

  if (!skillCode || !subcommand) {
    process.stderr.write('Usage: render.cjs track-skill <skill_code> start|end [--success true|false] [--duration ms]\n');
    process.exit(1);
  }

  if (subcommand === 'start') {
    const trackFile = getTrackingFilePath(skillCode);
    const dir = path.dirname(trackFile);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(trackFile, JSON.stringify({
      skill_code: skillCode,
      start_time: Date.now()
    }), 'utf8');
  } else if (subcommand === 'end') {
    let durationMs;

    if (flags.duration) {
      durationMs = parseInt(flags.duration, 10);
    } else {
      const trackFile = getTrackingFilePath(skillCode);
      try {
        const data = JSON.parse(fs.readFileSync(trackFile, 'utf8'));
        durationMs = Date.now() - data.start_time;
        fs.unlinkSync(trackFile);
      } catch (_) {
        durationMs = 0;
      }
    }

    telemetry.appendEvent({
      type: 'skill_invocation',
      timestamp: getTimestamp(),
      session_id: telemetry.getSessionId(),
      skill_code: skillCode,
      skill_name: skillCode,
      duration_ms: durationMs,
      success: flags.success !== 'false'
    });
  } else {
    process.stderr.write(`Unknown track-skill subcommand: ${subcommand}\n`);
    process.exit(1);
  }
}

function runTrackError() {
  telemetry.appendEvent({
    type: 'error',
    timestamp: getTimestamp(),
    session_id: telemetry.getSessionId(),
    error_class: flags.class || 'UNKNOWN',
    error_code: flags.code || 'E000',
    exit_code: parseInt(flags.exit, 10) || 1,
    triggering_skill: flags.skill || ''
  });
}

function runTrackContext() {
  telemetry.appendEvent({
    type: 'project_context',
    timestamp: getTimestamp(),
    session_id: telemetry.getSessionId(),
    product_type: flags['product-type'] || '',
    stage: flags.stage || '',
    platform_flags: flags.platforms || ''
  });
}

function runTrackMcp() {
  telemetry.appendEvent({
    type: 'mcp_degradation',
    timestamp: getTimestamp(),
    session_id: telemetry.getSessionId(),
    mcp_name: flags.name || '',
    attempted_operation: flags.operation || ''
  });
}

function runTrackCustom() {
  telemetry.appendEvent({
    type: 'custom_tooling',
    timestamp: getTimestamp(),
    session_id: telemetry.getSessionId(),
    custom_skill_count: parseInt(flags.skills, 10) || 0,
    custom_mcp_count: parseInt(flags.mcps, 10) || 0
  });
}

// ── Telemetry Show/Status Commands ──────────────────────────────────

function runTelemetry() {
  const subcommand = positional[0];

  if (!subcommand) {
    process.stderr.write('Usage: render.cjs telemetry <subcommand>\n');
    process.stderr.write('Subcommands: show-data [--type <type>] [--all], status\n');
    process.exit(1);
  }

  if (subcommand === 'show-data') {
    runShowData();
  } else if (subcommand === 'status') {
    runStatus();
  } else {
    process.stderr.write(`Unknown telemetry subcommand: ${subcommand}\n`);
    process.exit(1);
  }
}

function runShowData() {
  const filterType = flags.type || null;
  const showAll = flags.all === true || flags.all === 'true';
  const events = telemetry.readEvents(filterType);

  if (events.length === 0) {
    components.panel('Telemetry Data', {
      type: 'default',
      content: 'No telemetry data collected yet.'
    });
    return;
  }

  // Compute summary stats
  const typeCounts = {};
  const sessions = new Set();
  let earliest = null;
  let latest = null;

  for (const evt of events) {
    typeCounts[evt.type] = (typeCounts[evt.type] || 0) + 1;
    if (evt.session_id) sessions.add(evt.session_id);
    if (evt.timestamp) {
      if (!earliest || evt.timestamp < earliest) earliest = evt.timestamp;
      if (!latest || evt.timestamp > latest) latest = evt.timestamp;
    }
  }

  const summaryLines = [
    `Total events: ${events.length}`,
    `Unique sessions: ${sessions.size}`,
    `Date range: ${earliest || 'n/a'} to ${latest || 'n/a'}`,
    '',
    'Events by type:'
  ];

  for (const [type, count] of Object.entries(typeCounts)) {
    summaryLines.push(`  ${type}: ${count}`);
  }

  components.panel('Telemetry Data', {
    type: 'default',
    content: summaryLines.join('\n')
  });

  // Display events
  const displayEvents = showAll ? events : events.slice(-20);
  const label = showAll ? `All ${events.length} events` : `Last ${displayEvents.length} of ${events.length} events`;

  const eventLines = displayEvents.map(evt => JSON.stringify(evt, null, 2)).join('\n\n');

  components.panel(label, {
    type: 'info',
    content: eventLines
  });
}

function runStatus() {
  const status = telemetry.getStatus();
  const fileSizeKB = (status.fileSize / 1024).toFixed(1);

  const content = [
    `Consent: ${status.consented ? 'accepted' : 'not accepted'} (${status.version})`,
    `Tracking plan: ${status.version}`,
    `Events: ${status.eventCount} total`,
    `File size: ${fileSizeKB} KB`,
    `Last event: ${status.lastEvent || 'none'}`
  ].join('\n');

  components.panel('Telemetry Status', {
    type: 'default',
    content
  });
}

// ── Feedback Command ─────────────────────────────────────────────────

function runFeedback() {
  // Non-TTY: exit silently (feedback is optional, don't block)
  if (!process.stdin.isTTY) {
    process.exit(0);
  }

  components.panel('Quick feedback? Rate PDE 1-5 (Enter to skip):', { type: 'default' });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Rating: ', (ratingInput) => {
    const trimmed = (ratingInput || '').trim();

    // Enter/empty: dismissed
    if (!trimmed) {
      rl.close();
      process.exit(0);
    }

    const rating = parseInt(trimmed, 10);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      rl.close();
      process.exit(0);
    }

    rl.question('Optional comment (Enter to skip): ', (commentInput) => {
      rl.close();
      const comment = (commentInput || '').trim();

      telemetry.appendEvent({
        type: 'feedback',
        timestamp: getTimestamp(),
        session_id: telemetry.getSessionId(),
        session_number: parseInt(flags.session, 10) || 0,
        rating,
        comment
      });

      components.header('Thanks for the feedback!');
      process.exit(0);
    });
  });
}

// ── Route to component ──────────────────────────────────────────────

switch (command) {
  case 'banner':
    components.banner(message || 'BANNER', flags);
    break;
  case 'panel':
    components.panel(message || 'Panel', flags);
    break;
  case 'progress':
    components.progress(message || 'Progress', flags);
    break;
  case 'checkpoint':
    components.checkpoint(message || 'Checkpoint', flags);
    break;
  case 'error':
    components.error(message || 'Error', flags);
    break;
  case 'header':
    components.header(message || 'Header', flags);
    break;
  case 'divider':
    components.divider(flags);
    break;
  case 'splash':
    splash().then(() => process.exit(0)).catch((err) => {
      process.stderr.write(`Splash error: ${err.message}\n`);
      process.exit(1);
    });
    break;

  // Telemetry commands
  case 'consent':
    runConsent();
    break;
  case 'track-skill':
    runTrackSkill();
    break;
  case 'track-error':
    runTrackError();
    break;
  case 'track-context':
    runTrackContext();
    break;
  case 'track-mcp':
    runTrackMcp();
    break;
  case 'track-custom':
    runTrackCustom();
    break;
  case 'telemetry':
    runTelemetry();
    break;
  case 'feedback':
    runFeedback();
    break;

  default:
    process.stderr.write(`Unknown command: ${command}\n`);
    process.stderr.write('Available: banner, panel, progress, checkpoint, error, header, divider, splash\n');
    process.stderr.write('Telemetry: consent, track-skill, track-error, track-context, track-mcp, track-custom, telemetry\n');
    process.exit(1);
}
