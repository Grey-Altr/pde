<purpose>
List active dispatch sessions or stop a specific session. Thin wrapper around pde-tools.cjs subcommands.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="parse_arguments">
Parse $ARGUMENTS:
- No arguments or empty: list all sessions
- "stop <id>": stop session with given ID
- Any other: show usage
</step>

<step name="list_sessions">
If no arguments (list mode):

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" list-sessions
```

Display the result as a formatted table:
| Session ID | Phase | Plan | Status | Backend | Elapsed | PID |
|------------|-------|------|--------|---------|---------|-----|

If no sessions, display: "No active dispatch sessions."
</step>

<step name="stop_session">
If arguments start with "stop":

Extract session ID from second argument.

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" stop-session "<session-id>"
```

Display the result. If stopped, confirm: "Session <id> stopped. Worktree preserved."
If remote, display the manual SSH instructions returned by pde-tools.
</step>

<step name="usage">
If arguments don't match any pattern:

Display:
```
Usage:
  /pde:sessions          — List all active sessions
  /pde:sessions stop <id> — Stop a specific session
```
</step>

</process>

<success_criteria>
- [ ] Sessions listed with status, phase, backend, and elapsed time
- [ ] Stop command sends SIGTERM to local sessions
- [ ] Remote sessions show manual kill instructions
</success_criteria>
