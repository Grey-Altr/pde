// lib/telemetry.cjs
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TRACKING_PLAN_VERSION = 'v1';

function getTelemDir() {
  const baseDir = process.env.PDE_TEST_DIR || os.homedir();
  return path.join(baseDir, '.pde', 'telemetry');
}

function ensureTelemDir() {
  fs.mkdirSync(getTelemDir(), { recursive: true });
}

function getConsentPath() {
  return path.join(getTelemDir(), 'consent.json');
}

function getEventsPath() {
  return path.join(getTelemDir(), 'events.jsonl');
}

// --- Session ID ---
let _sessionId = null;

function getSessionId() {
  if (!_sessionId) {
    const crypto = require('node:crypto');
    _sessionId = crypto.randomBytes(8).toString('hex');
  }
  return _sessionId;
}

// --- Tracking plan version ---
function getTrackingPlanVersion() {
  return TRACKING_PLAN_VERSION;
}

// --- Consent ---
function checkConsent(version) {
  try {
    const data = JSON.parse(fs.readFileSync(getConsentPath(), 'utf8'));
    return data.accepted === true && data.version === version;
  } catch (_) {
    return false;
  }
}

function saveConsent(version) {
  try {
    ensureTelemDir();
    fs.writeFileSync(getConsentPath(), JSON.stringify({
      version,
      accepted: true,
      timestamp: new Date().toISOString()
    }), 'utf8');
  } catch (_) {
    // Telemetry must never crash the main process
  }
}

// --- Events ---
function appendEvent(event) {
  try {
    ensureTelemDir();
    fs.appendFileSync(getEventsPath(), JSON.stringify(event) + '\n', 'utf8');
  } catch (_) {
    // Telemetry must never crash the main process
  }
}

function readEvents(filterType) {
  try {
    const raw = fs.readFileSync(getEventsPath(), 'utf8');
    const events = raw.trim().split('\n')
      .filter(Boolean)
      .map(line => { try { return JSON.parse(line); } catch (_) { return null; } })
      .filter(Boolean);
    return filterType ? events.filter(e => e.type === filterType) : events;
  } catch (_) {
    return [];
  }
}

// --- Status ---
function getStatus() {
  const consentPath = getConsentPath();
  const eventsPath = getEventsPath();
  let consented = false;
  let version = TRACKING_PLAN_VERSION;
  let eventCount = 0;
  let fileSize = 0;
  let lastEvent = null;

  try {
    const data = JSON.parse(fs.readFileSync(consentPath, 'utf8'));
    consented = data.accepted === true;
    version = data.version || version;
  } catch (_) {}

  try {
    const stat = fs.statSync(eventsPath);
    fileSize = stat.size;
  } catch (_) {}

  const events = readEvents(null);
  eventCount = events.length;
  if (events.length > 0) {
    lastEvent = events[events.length - 1].timestamp || null;
  }

  return { consented, version, eventCount, fileSize, lastEvent };
}

module.exports = {
  getTrackingPlanVersion,
  checkConsent,
  saveConsent,
  getSessionId,
  appendEvent,
  readEvents,
  getStatus,
};
