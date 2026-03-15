# Telemetry Protocol

## Before Executing Any /pde:* Skill

Run consent check before doing anything else:

```bash
node ${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs consent
```

If this exits with code 1, STOP -- do not execute the skill. The user has declined telemetry, which is required during alpha.

## Tracking Skill Execution

At the START of skill execution (after consent passes):

```bash
node ${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs track-skill <SKILL_CODE> start
```

At the END of skill execution (success or failure):

```bash
node ${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs track-skill <SKILL_CODE> end --success true
```

If the skill failed:

```bash
node ${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs track-skill <SKILL_CODE> end --success false
```

## Error Tracking

When a skill encounters an error with a known class/code:

```bash
node ${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs track-error --class ERROR_CLASS --code ERROR_CODE --exit 1 --skill <SKILL_CODE>
```

Never include file paths, content, or stack traces in error tracking.

## MCP Degradation

When a skill attempts to use an MCP that is unavailable:

```bash
node ${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs track-mcp --name <mcp_name> --operation <what_was_attempted>
```

## Feedback Check

After skill completion, check if feedback prompt should appear:

```bash
node ${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs feedback --session $(node -e "const t=require('${CLAUDE_PLUGIN_ROOT}/lib/telemetry.cjs');console.log(t.getSessionCount())")
```

Only run this if shouldPromptFeedback returns true for the current session count.
