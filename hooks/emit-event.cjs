#!/usr/bin/env node
'use strict';

/**
 * PDE Hook Handler — Claude Code hook adapter
 *
 * Reads hook JSON payload from stdin, maps hook_event_name to PDE event type,
 * calls pde-tools.cjs event-emit (and session-start for SessionStart events).
 *
 * Exit codes: always 0 — hook failures must never affect Claude Code execution.
 * Timeout: 5000ms hard cap on spawnSync calls to pde-tools.cjs.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Map Claude Code hook event names to PDE event types
const HOOK_TO_EVENT_TYPE = {
  SubagentStart: 'subagent_start',
  SubagentStop:  'subagent_stop',
  SessionStart:  'session_start',
  SessionEnd:    'session_end',
  PostToolUse:   null, // resolved per tool_name below
};

function toolNameToEventType(toolName) {
  if (toolName === 'Write' || toolName === 'Edit') return 'file_changed';
  if (toolName === 'Bash') return 'bash_called';
  return 'tool_called';
}

function sumTranscriptTokens(transcriptPath) {
  let inputTokens = 0;
  let outputTokens = 0;
  try {
    const lines = fs.readFileSync(transcriptPath, 'utf-8').trim().split('\n');
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (obj.type === 'assistant' && obj.message && obj.message.usage) {
          inputTokens  += Number(obj.message.usage.input_tokens  ?? 0);
          outputTokens += Number(obj.message.usage.output_tokens ?? 0);
        }
      } catch { /* skip malformed JSONL line */ }
    }
  } catch { /* transcript unreadable — return zeros */ }
  return { inputTokens, outputTokens };
}

// Resolve plugin root: use CLAUDE_PLUGIN_ROOT env var, fall back to parent of hooks/ dir
const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');
const pdeTools = path.join(pluginRoot, 'bin', 'pde-tools.cjs');

let raw = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
  let hookData;
  try { hookData = JSON.parse(raw); } catch { process.exit(0); }

  const hookName = hookData.hook_event_name;
  if (!hookName) { process.exit(0); }

  // SessionStart: generate and persist new PDE session UUID before emitting session_start event
  // Must run synchronously (async: false in hooks.json) so session_id is available for all subsequent hooks
  if (hookName === 'SessionStart') {
    spawnSync(process.execPath, [pdeTools, 'session-start'], {
      encoding: 'utf-8',
      timeout: 5000,
    });
  }

  // Resolve event type
  let eventType = HOOK_TO_EVENT_TYPE[hookName];
  if (hookName === 'PostToolUse') {
    eventType = toolNameToEventType(hookData.tool_name || '');
  }
  if (!eventType) { process.exit(0); } // unknown hook — ignore silently

  // Build minimal payload (keep under 1KB to ensure atomic O_APPEND write)
  // Never include file content — only metadata
  const payload = {};
  if (hookData.session_id)            payload.session_id = hookData.session_id;
  if (hookData.agent_id)              payload.agent_id = hookData.agent_id;
  if (hookData.agent_type)            payload.agent_type = hookData.agent_type;
  if (hookData.tool_name)             payload.tool_name = hookData.tool_name;
  if (hookData.tool_input) {
    if (hookData.tool_input.file_path) payload.file_path = hookData.tool_input.file_path;
    if (hookData.tool_input.command)   payload.command = String(hookData.tool_input.command).slice(0, 200);
  }
  if (hookData.agent_transcript_path) payload.agent_transcript_path = hookData.agent_transcript_path;
  if (hookName === 'SessionStart') {
    if (hookData.model)  payload.model  = hookData.model;
    // Phase 154: SSH-04 — fall back to PDE_BACKEND env var when hookData.source absent.
    // Remote sessions set PDE_BACKEND=remote-ssh in SSH envPrefix; local sessions leave it unset.
    const source = hookData.source || process.env.PDE_BACKEND;
    if (source) payload.source = source;
  }

  // Emit token_usage event from transcript before main subagent_stop event (MON-02)
  if (hookName === 'SubagentStop' && hookData.agent_transcript_path) {
    const { inputTokens, outputTokens } = sumTranscriptTokens(hookData.agent_transcript_path);
    const tokenPayload = { input_tokens: inputTokens, output_tokens: outputTokens };
    if (hookData.agent_id) tokenPayload.agent_id = hookData.agent_id;
    try {
      spawnSync(process.execPath, [pdeTools, 'event-emit', 'token_usage', JSON.stringify(tokenPayload)], {
        encoding: 'utf-8',
        timeout: 5000,
      });
    } catch { /* swallow — token event failure must never affect hook exit code */ }
  }

  // Call pde-tools.cjs event-emit — synchronous spawnSync with timeout cap
  try {
    spawnSync(process.execPath, [pdeTools, 'event-emit', eventType, JSON.stringify(payload)], {
      encoding: 'utf-8',
      timeout: 5000, // hard cap: hook must not hang Claude Code execution
    });
  } catch { /* swallow — event emit failure must never affect hook exit code */ }

  process.exit(0);
});
