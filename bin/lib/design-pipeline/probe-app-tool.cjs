'use strict';

/**
 * probe-app-tool.cjs — Registry probe helper for design pipeline apps.
 *
 * Wraps checkApproved() from app-registry.cjs in a try/catch so callers
 * never need to handle throws. Always returns { available, reason, entry }.
 *
 * Note: checkApproved() throws for three conditions:
 *   1. Slug not found in registry
 *   2. executionMode === 'mock' (checked before status)
 *   3. status !== 'approved'
 *
 * @see bin/lib/app-registry.cjs checkApproved()
 */

const path = require('path');

/**
 * Probe the app registry for a given slug.
 * Never throws. Returns { available, reason, entry }.
 *
 * @param {string} slug - App slug (e.g. 'blender', 'gimp', 'inkscape')
 * @param {string} registryPath - Absolute path to app-registry.json
 * @returns {{ available: boolean, reason: string, entry: object|null }}
 */
function probeAppTool(slug, registryPath) {
  const { checkApproved } = require(path.join(__dirname, '../app-registry.cjs'));
  try {
    const entry = checkApproved(registryPath, slug);
    // checkApproved already throws for mock mode, so if we reach here entry is approved + non-mock
    return { available: true, reason: 'approved', entry };
  } catch (err) {
    const reason = err.message || String(err);
    // Detect mock mode from the error message to provide a clean reason
    if (reason.includes('mock')) {
      return { available: false, reason: "executionMode is 'mock' -- no display server", entry: null };
    }
    return { available: false, reason, entry: null };
  }
}

module.exports = { probeAppTool };
