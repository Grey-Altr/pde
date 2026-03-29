---
name: pde:gen-tests
description: Generate Playwright E2E test skeletons from /pde:flows flow diagram output — parses Mermaid flowcharts and creates one test per navigation edge
argument-hint: "[--flows-file <path>] [--output <path>] [--base-url <url>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
---
<objective>
Execute the /pde:gen-tests command. Parse a Mermaid flowchart from a /pde:flows output file and generate Playwright E2E test skeletons for each navigation edge.
</objective>

# /pde:gen-tests

Generate Playwright E2E test skeletons from `/pde:flows` user flow diagrams. Parses Mermaid flowcharts and creates one `test('navigates X -> Y', ...)` block per navigation edge. Auto-detects the latest flows file in `.planning/design/ux/`.

## Usage

`/pde:gen-tests [--flows-file <path>] [--output <path>] [--base-url <url>]`

Or via CLI: `node bin/pde-tools.cjs utils gen-tests [--flows-file <path>] [--output <path>] [--base-url <url>]`

## Parameters

- `--flows-file` — Path to a flows markdown file containing a Mermaid flowchart (optional, auto-detects latest `FLW-flows-v*.md`)
- `--output` — Path for the generated Playwright test file (default: `tests/e2e/flow-navigation.spec.ts`)
- `--base-url` — Base URL for the app under test (default: `http://localhost:3000`)

## Output

Playwright `.spec.ts` file with one test per navigation edge. JSON confirmation to stdout:

```json
{
  "output": "tests/e2e/flow-navigation.spec.ts",
  "tests": 12,
  "nodes": 8
}
```

## Generated Test Format

```typescript
import { test, expect } from '@playwright/test';

test('navigates Login -> Dashboard', async ({ page }) => {
  await page.goto('http://localhost:3000/Login');
  // TODO: trigger navigation to Dashboard
  await expect(page).toHaveURL(/Dashboard/);
});
```

Each test is a skeleton that navigates to the source node URL and asserts arrival at the target node URL. Implement the trigger action (click, form submit, etc.) for each test.

## Examples

```
/pde:gen-tests
/pde:gen-tests --flows-file .planning/design/ux/FLW-flows-v2.md
/pde:gen-tests --output tests/e2e/navigation.spec.ts --base-url http://localhost:4000
node bin/pde-tools.cjs utils gen-tests --flows-file flows.md --output tests/e2e/flows.spec.ts
```

## Workflow

1. Run `/pde:flows` to generate a Mermaid flowchart in `.planning/design/ux/`
2. Run `/pde:gen-tests` to scaffold E2E tests from that flowchart
3. Fill in the trigger actions (clicks, form submissions) in each test skeleton
4. Run `npx playwright test` to execute

## Notes

- Mermaid flowcharts are extracted from fenced code blocks (` ```mermaid `) in the flows markdown file
- If no flows file is found, the command exits with instructions to run `/pde:flows` first
- The output directory is created automatically if it does not exist
- Generated tests use `@playwright/test` imports — install Playwright before running: `npx playwright install`
- Each test is intentionally minimal (skeleton) — you must implement the navigation trigger action
