'use strict';

/**
 * test-relay-tail.cjs — TailCursor unit tests
 * Phase 134, Plan 02
 *
 * Uses real timers with small intervals (50ms) and short waits.
 * Does NOT use fake timers — TailCursor uses synchronous fs ops in setInterval.
 */

const { describe, it, expect, beforeEach, afterEach } = require('vitest');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { TailCursor } = require('../../bin/lib/relay.cjs');

let tmpFile;
let cursors = [];

beforeEach(() => {
  tmpFile = path.join(os.tmpdir(), `test-tail-${Date.now()}-${Math.random().toString(36).slice(2)}.ndjson`);
});

afterEach(() => {
  // Stop all cursors created in this test
  for (const cursor of cursors) {
    cursor.stop();
  }
  cursors = [];
  // Clean up temp file
  try { fs.unlinkSync(tmpFile); } catch {}
});

function makeCursor(filePath, onLine) {
  const c = new TailCursor(filePath, onLine);
  cursors.push(c);
  return c;
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

describe('TailCursor', () => {
  it('Test 1: reads new lines appended to a temp file after cursor starts polling', async () => {
    const lines = [];
    const cursor = makeCursor(tmpFile, line => lines.push(line));

    // Create file first
    fs.writeFileSync(tmpFile, '');
    cursor.start(50);

    // Append two lines
    fs.appendFileSync(tmpFile, '{"event_type":"a"}\n');
    fs.appendFileSync(tmpFile, '{"event_type":"b"}\n');

    await wait(200);
    cursor.stop();

    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines).toContain('{"event_type":"a"}');
    expect(lines).toContain('{"event_type":"b"}');
  });

  it('Test 2: does not re-read previously read lines (byte offset advances)', async () => {
    const lines = [];
    const cursor = makeCursor(tmpFile, line => lines.push(line));

    // Write first line, let cursor read it
    fs.writeFileSync(tmpFile, '{"event_type":"first"}\n');
    cursor.start(50);
    await wait(150);

    const countAfterFirst = lines.length;
    expect(countAfterFirst).toBe(1);
    expect(lines[0]).toBe('{"event_type":"first"}');

    // Append a second line
    fs.appendFileSync(tmpFile, '{"event_type":"second"}\n');
    await wait(150);

    // Should see exactly 2 total (first not re-read)
    expect(lines.length).toBe(2);
    expect(lines[1]).toBe('{"event_type":"second"}');
  });

  it('Test 3: handles file not existing yet (no crash, waits for creation)', async () => {
    const lines = [];
    // tmpFile does NOT exist yet
    const cursor = makeCursor(tmpFile, line => lines.push(line));
    cursor.start(50);

    // Wait a bit — no crash should occur
    await wait(100);

    // Now create the file and write a line
    fs.writeFileSync(tmpFile, '{"event_type":"late_create"}\n');
    await wait(150);

    cursor.stop();
    expect(lines.length).toBe(1);
    expect(lines[0]).toBe('{"event_type":"late_create"}');
  });

  it('Test 4: detects file truncation (size < position) and resets cursor to 0', async () => {
    const lines = [];
    const cursor = makeCursor(tmpFile, line => lines.push(line));

    // Write initial content
    fs.writeFileSync(tmpFile, '{"event_type":"pre_truncate"}\n');
    cursor.start(50);
    await wait(150);

    // Verify first line was read
    expect(lines.length).toBe(1);

    // Truncate file (size goes to 0, less than cursor position)
    fs.writeFileSync(tmpFile, '');
    await wait(100);

    // Write new content after truncation
    fs.appendFileSync(tmpFile, '{"event_type":"post_truncate"}\n');
    await wait(150);

    cursor.stop();
    // Should have read the post-truncation line
    expect(lines).toContain('{"event_type":"post_truncate"}');
  });

  it('Test 5: stop() clears the polling interval', async () => {
    const lines = [];
    const cursor = makeCursor(tmpFile, line => lines.push(line));

    fs.writeFileSync(tmpFile, '');
    cursor.start(50);
    await wait(100);

    // Stop the cursor
    cursor.stop();
    expect(cursor._interval).toBeNull();

    // Append lines after stop
    fs.appendFileSync(tmpFile, '{"event_type":"after_stop"}\n');
    await wait(200);

    // Should not have picked up the new line
    expect(lines).not.toContain('{"event_type":"after_stop"}');
  });
});
