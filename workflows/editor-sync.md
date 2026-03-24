<purpose>
Regenerate all editor context files from the current .planning/ state. Implements CTX-07: on-demand context regeneration available via /pde:editor-sync command.
</purpose>

<process>

## 0. Parse Arguments

Parse $ARGUMENTS:
- `--editor`: optional string flag, default `all`. Valid values: `cursor`, `gemini`, `agents`, `antigravity`, `all`.

If an unrecognized value is passed, display:
```
Error: Unknown editor value. Valid options: cursor, gemini, agents, antigravity, all
```
Then stop.

## 1. Run Context Sync

Run the following command to invoke context-sync.cjs and capture the JSON result:

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const cs = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/context-sync.cjs`);
const result = cs.emitAll(process.cwd());
process.stdout.write(JSON.stringify(result) + '\n');
EOF
```

If `--editor` is not `all`, use pde-tools.cjs with the editor flag instead:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" context-sync --editor {value}
```

Parse the JSON output into a `result` object.

If the command fails to run (non-zero exit, parse error), display:
```
Error: Could not sync editor context files. Ensure .planning/ directory exists with PROJECT.md.
```
Then stop.

## 2. Display Results

Display the header:
```
Editor Context Sync
```

Followed by a blank line, then a results table. For each emitter result, show whether the file was written or skipped:

```
  Target               Status    Path
  ─────────────────────────────────────────────────
  AGENTS.md            written   ./AGENTS.md
  Cursor Rules         written   ./.cursor/rules/*.mdc
  .cursorrules         written   ./.cursorrules
  GEMINI.md            written   ./GEMINI.md (+ 2 more)
  Antigravity Skill    written   ./.agent/skills/pde-design/SKILL.md
  DESIGN.md            written   ./DESIGN.md
```

Map emitter keys to display names:
- `agentsMd` → `AGENTS.md`
- `cursorRules` → `Cursor Rules`
- `cursorrules` → `.cursorrules`
- `geminiMd` → `GEMINI.md`
- `antigravitySkill` → `Antigravity Skill`
- `designMd` → `DESIGN.md`

For each entry:
- If `result.written` is `true`: show `written` in the Status column
- If `result.skipped` is `true`: show `skipped` in the Status column with the reason in Notes
- Show the `path` field from the result

Then display:
```
Source hash: {result.sourceHash}
Generated at: {result.generatedAt}
All editor context files are up to date.
```

If some files were skipped, display:
```
Note: {N} file(s) skipped (user-authored content detected).
```

</process>
