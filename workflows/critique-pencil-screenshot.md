<purpose>
Capture a Pencil canvas screenshot for inclusion in /pde:critique visual audit. Non-blocking sub-workflow: if Pencil is not connected or the screenshot fails, returns immediately with no output (critique continues with existing wireframe files). Writes screenshot to .planning/design/ux/wireframes/pencil-canvas.png for discovery by critique Step 2d wireframe glob. Implements PEN-02.
</purpose>

<process>

## critique-pencil-screenshot — Pencil Canvas Screenshot Capture

This is a non-blocking sub-workflow. Every failure path returns without crashing.
Never call process.exit(1). The /pde:critique pipeline MUST NOT depend on this succeeding.

---

### Step 0 — Check Pencil Connection

Load Pencil connection info and look up the screenshot tool name from mcp-bridge.cjs:

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const conn = b.loadConnections();
const pen = conn.connections && conn.connections.pencil;
const status = pen && pen.status || 'not_configured';
let screenshotToolName = '';
try {
  screenshotToolName = b.call('pencil:get-screenshot', {}).toolName;
} catch (err) {
  screenshotToolName = '';
}
process.stdout.write(JSON.stringify({ status, screenshotToolName }) + '\n');
EOF
```

Parse the JSON output.

If `status` is not `connected` OR `screenshotToolName` is empty:

```
Pencil not connected — skipping canvas screenshot. Critique will use existing wireframe files.
Run /pde:connect pencil to enable automatic Pencil canvas screenshot capture.
```

Return immediately. This is a NON-BLOCKING sub-workflow — /pde:critique continues to Step 4 normally.

---

### Step 1 — Capture Screenshot via MCP

Use the `screenshotToolName` (i.e., `mcp__pencil__get_screenshot`) to capture a screenshot of the current Pencil canvas. This is a Claude Code tool call — NOT inside a bash block.

Call the tool with no required arguments (pass empty args `{}`).

Handle the response adaptively:

- If response contains image content with base64-encoded data: proceed to Step 2
- If response has a `data:image/` prefix (data URL format): strip the prefix (`data:image/...;base64,`) before using the base64 string
- If response is empty, null, or in an unrecognizable format: log warning and return (non-blocking):
  ```
  Warning: Pencil screenshot response could not be decoded.
  Continuing /pde:critique without canvas screenshot.
  ```

Timeout: 15 seconds. If the tool call does not respond within 15 seconds, treat as unavailable and return (non-blocking):
```
Warning: Pencil screenshot timed out after 15 seconds.
Continuing /pde:critique without canvas screenshot.
```

---

### Step 2 — Decode and Write Screenshot File

After receiving the base64-encoded screenshot data from Step 1, write it to disk:

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const fs = req('fs');
const path = req('path');

const outputDir = path.join(process.cwd(), '.planning', 'design', 'ux', 'wireframes');

// Ensure output directory exists
fs.mkdirSync(outputDir, { recursive: true });

// SCREENSHOT_BASE64 is set from the MCP response in Step 1
// Strip data: URI prefix if present (data:image/png;base64,...)
const rawBase64 = process.env.SCREENSHOT_BASE64 || '';
const base64Data = rawBase64.replace(/^data:image\/[a-z]+;base64,/, '');

if (!base64Data) {
  process.stdout.write(JSON.stringify({ error: 'empty_base64' }) + '\n');
  process.exit(0);
}

try {
  const buffer = Buffer.from(base64Data, 'base64');
  const outputPath = path.join(outputDir, 'pencil-canvas.png');
  fs.writeFileSync(outputPath, buffer);
  process.stdout.write(JSON.stringify({ ok: true, path: outputPath }) + '\n');
} catch (err) {
  process.stdout.write(JSON.stringify({ error: 'write_failed', message: err.message }) + '\n');
}
EOF
```

If write fails (error: 'write_failed' or error: 'empty_base64'):

```
Warning: Failed to write Pencil canvas screenshot to disk.
Continuing /pde:critique without canvas screenshot.
```

Return (non-blocking). Do NOT crash.

---

### Step 3 — Return Path

Display:

```
Pencil canvas screenshot captured: .planning/design/ux/wireframes/pencil-canvas.png
This file will be included in the critique visual evaluation.
```

The critique pipeline (Step 2d) discovers this file via its wireframe glob for `.planning/design/ux/wireframes/`. No explicit wiring needed — file presence is sufficient for discovery on subsequent runs.

For the current critique run: append `pencil-canvas.png` to WIREFRAME_FILES so it is included in the Step 4 visual evaluation immediately.

---

## PEN-03 Degraded Mode Notes

- Every failure path in this workflow returns without blocking
- No `process.exit(1)` anywhere — only informational messages via display
- The critique pipeline MUST NOT depend on this sub-workflow succeeding
- If Pencil is unavailable, critique uses existing wireframe HTML files (existing behavior unchanged)
- Failure conditions handled gracefully: Pencil not connected, screenshot tool unavailable, empty response, decode failure, write failure

</process>

<output>
- `.planning/design/ux/wireframes/pencil-canvas.png` — Pencil canvas screenshot (written only when Pencil is connected and screenshot succeeds)
- If Pencil is unavailable or any step fails: no files written, critique continues with existing wireframes
</output>
