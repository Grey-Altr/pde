'use strict';

/**
 * spawn.cjs — Subprocess launch for PDE parallel dispatch
 *
 * Phase 144: Local CLI Dispatch
 * Satisfies: DSP-01, DSP-02, DSP-03
 *
 * CRITICAL ENV RULES:
 * 1. Delete CLAUDECODE — inherited value is "1", which causes "cannot be launched
 *    inside another Claude Code session" error. Live-verified fix.
 * 2. Set PDE_SESSION_ID — executor reads this to activate session-scoped writes.
 * 3. Set ANTHROPIC_API_KEY — inherited from parent env (already present).
 *
 * CRITICAL STDIO RULE:
 * stdio[0] (stdin) MUST be 'ignore', NOT 'pipe'.
 * 'pipe' causes claude to hang waiting for input (verified bug, Issue #6295).
 */

const childProcess = require('node:child_process');
const readline = require('node:readline');

/**
 * Spawn a claude --print subprocess in the given worktree.
 *
 * @param {object} opts
 * @param {string} opts.worktreePath  - Absolute path to worktree cwd
 * @param {string} opts.sessionId     - PDE session ID (e.g. "p144-abc123")
 * @param {number|string} opts.phase  - Phase number (e.g. 144)
 * @param {number|string} opts.plan   - Plan number (e.g. 1)
 * @param {string} opts.pluginDir     - Absolute path to plugin directory
 * @param {string[]} [opts.extraArgs] - Additional claude flags
 * @param {function} opts.onLine      - Callback(sessionId, parsedEvent) for each NDJSON line
 * @param {function} opts.onExit      - Callback(sessionId, exitCode) on process exit
 * @returns {{ pid: number, kill: function }}
 */
function spawnSession(opts) {
  const { worktreePath, sessionId, phase, plan, pluginDir, extraArgs = [], onLine, onExit } = opts;

  const prompt = `Execute phase ${phase}, plan ${plan}. Run /gsd:execute-plan ${phase} ${plan}.`;

  // Build env: inherit parent, delete CLAUDECODE (blocks nested launch if set to "1")
  const env = { ...process.env };
  delete env.CLAUDECODE;   // must not be "1" — blocks nested launch
  // Phase 152 (RLY-01): Use relayId (UUID) as PDE_SESSION_ID when available so session-start
  // writes the UUID to config.json, aligning the NDJSON path with relay.cjs (D-02)
  env.PDE_SESSION_ID = opts.relayId || sessionId;
  env.PDE_PHASE = String(phase);
  env.PDE_PLAN = String(plan);
  env.PDE_SESSION_START = String(Date.now());

  const args = [
    '--print',
    '--bare',                // fast startup: skip hooks, LSP, plugin sync, auto-memory
    '--output-format', 'stream-json',
    '--verbose',             // REQUIRED with stream-json
    '--dangerously-skip-permissions',
    '--plugin-dir', pluginDir,  // load PDE plugin (sets CLAUDE_PLUGIN_ROOT)
    '--append-system-prompt', 'You are a PDE executor agent running in a worktree. Operate in autonomous mode. Auto-approve all checkpoints. Do not ask questions.',
    ...extraArgs,
    prompt,                  // positional arg (last) — NOT a --prompt flag
  ];

  const child = childProcess.spawn('claude', args, {
    cwd: worktreePath,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],  // stdin MUST be ignore, not pipe
  });

  const rl = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
  rl.on('line', line => {
    if (!line.trim()) return;
    try {
      const event = JSON.parse(line);
      onLine(sessionId, event);
    } catch (_) {
      // Non-JSON lines (rare) — skip silently
    }
  });

  child.stderr.on('data', data => {
    // Stderr from claude goes to PDE log; not surfaced to aggregator
    // This catches auth errors, "cannot be launched inside session" errors, etc.
    const msg = data.toString().trim();
    if (msg) onLine(sessionId, { type: 'system', subtype: 'stderr', message: msg });
  });

  child.on('close', exitCode => {
    rl.close();
    onExit(sessionId, exitCode ?? 1);
  });

  return {
    pid: child.pid,
    kill: (signal = 'SIGTERM') => child.kill(signal),
  };
}

module.exports = { spawnSession };
