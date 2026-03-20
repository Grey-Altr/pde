# Monitor Dashboard Workflow

Launch or kill the PDE monitoring dashboard — a persistent tmux session streaming live events from the PDE event bus.

This workflow requires tmux. If tmux is not installed, the script will offer installation instructions.

## Process

**Step 1: Resolve PLUGIN_ROOT**

Use the `${CLAUDE_PLUGIN_ROOT}` environment variable if set. If not set, resolve the plugin root as the parent directory of this workflows/ directory.

**Step 2: Handle --kill flag**

If `$ARGUMENTS` contains `--kill`:

Run via Bash tool:
```bash
tmux kill-session -t pde-monitor 2>/dev/null && echo "pde-monitor session killed." || echo "No pde-monitor session found."
```

Exit after completing the kill. Do not proceed to Step 3.

**Step 3: Launch the dashboard**

Run via Bash tool:
```bash
bash "${CLAUDE_PLUGIN_ROOT}/bin/monitor-dashboard.sh"
```

If `CLAUDE_PLUGIN_ROOT` is not set, resolve it first:
```bash
PLUGIN_ROOT=$(dirname "$(dirname "$(realpath "${BASH_SOURCE[0]}")")" 2>/dev/null || echo ".")
bash "${PLUGIN_ROOT}/bin/monitor-dashboard.sh"
```

The script handles:
- tmux dependency detection (DEPS-01)
- Platform-aware install instructions if tmux is missing (DEPS-02)
- Consent-gated auto-install (DEPS-03)
- Adaptive layout: 6-pane layout on terminals >= 120x30, 2-pane on smaller terminals (TMUX-09)
- Nested tmux detection via `$TMUX` — uses `switch-client` instead of `attach-session` when nested (TMUX-10)
- Idempotent session creation — attaches to existing session if already running (TMUX-01)
- Pane persistence after processes exit (TMUX-08)

**Note on session currency:** The dashboard tails the NDJSON file for the session ID stored in `.planning/config.json` at launch time. If you start a new PDE session after the dashboard is running, restart the dashboard with `/pde:monitor --kill` followed by `/pde:monitor` to pick up the new session ID.
