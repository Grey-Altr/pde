/**
 * tests/phase-172/gimp-wrapper.test.mjs
 * Wave 0 test scaffold for bin/lib/app-wrappers/gimp-wrapper.cjs (WRAP-04)
 *
 * Tests will be implemented in Phase 172 Plan 02 (GIMP wrapper).
 * These scaffolds establish structure and intent before implementation.
 *
 * GIMP 2.x vs 3.x: script-fu-batch invocation changed significantly.
 * See 172-RESEARCH.md for verified API details.
 */

import { describe, it } from 'vitest';

describe('buildCapabilityModel', () => {
  it.todo('GIMP 2.x model: includes script-fu-batch capability with correct args');
  it.todo('GIMP 3.x model: includes script-fu-use-script-interpreter capability');
  it.todo('meta.source = gimp binary path from registry entry');
  it.todo('meta.type = "desktop-app"');
  it.todo('meta fields are all strings (z.string() constraint from model.cjs)');
  it.todo('capabilities array is non-empty for both GIMP versions');
});

describe('buildGimpArgs', () => {
  it.todo('GIMP 2.x: args include --batch and --quit pattern');
  it.todo('GIMP 3.x: args include --quit flag directly');
  it.todo('version-conditional: selects correct arg template based on major version');
  it.todo('--no-interface flag is present in all modes');
  it.todo('--script-fu flag present for 2.x, --interpret-script for 3.x');
});

describe('version parsing', () => {
  it.todo('parseVersion extracts version from "GIMP 2.10.38" output');
  it.todo('parseVersion extracts version from "GNU Image Manipulation Program version 3.0.2" output');
  it.todo('major version from GIMP 2.x output returns 2');
  it.todo('major version from GIMP 3.x output returns 3');
  it.todo('parseVersion returns "unknown" when output does not match pattern');
});
