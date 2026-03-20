# PDE Telemetry Plan

PDE collects usage data locally during alpha. This document describes what is collected, how it is stored, and how to inspect or delete it.

## What is Collected

- Skill usage — which skills you run, how long, success/fail
- Error metadata — error class and code only (never content or paths)
- Session workflow — skill sequence per session
- Project metadata — product type, stage, platforms (never project name)
- MCP availability — which MCPs degrade gracefully
- Custom tooling — count of custom skills/tools beyond defaults

## Storage

All data is stored locally in `~/.pde/telemetry/`. No remote transmission occurs during alpha.

## Inspect Your Data

Run: `pde telemetry show-data`

## Delete Your Data

Remove: `~/.pde/telemetry/`
