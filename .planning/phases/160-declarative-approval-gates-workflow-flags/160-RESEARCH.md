# Phase 160: Declarative Approval Gates + Workflow Flags - Research

**Researched:** 2026-03-28
**Domain:** WebMCP browser tool registration, file-based gate state, workflow markdown flag injection
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Single `pde_approval_gate` tool with `action` parameter (approve/reject) and `gate_id` — single-tool-per-capability pattern. No separate approve/reject tools.
- **D-02:** Gate tool uses the same `useWebMCP()` hook pattern as existing browser-tools (`use-design-state-tool.ts`, `use-project-info-tool.ts`, `use-artifact-list-tool.ts`). New file: `use-approval-gate-tool.ts` in `dashboard/lib/mcp/browser-tools/`.
- **D-03:** Tool form presents gate metadata (what's being approved, context, requester) plus approve/reject action buttons. The tool's `inputSchema` defines the form structure browser AI agents render.
- **D-04:** Pending approval gates stored file-based in `.planning/` — consistent with PDE's file-based state model. No new Redis infrastructure for gate state.
- **D-05:** Gate state file format follows existing PDE patterns (markdown or JSON in `.planning/` directory). Gate IDs are deterministic from workflow context (phase + step + artifact).
- **D-06:** `--webmcp` flag adds additional markdown sections to workflow output with WebMCP tool context — tool names, schemas, and usage examples for browser AI agents. Additive, not destructive to existing output.
- **D-07:** Enhanced sections provide enough context for a browser AI agent to understand what WebMCP tools are available for the workflow artifact and how to call them.
- **D-08:** Early flag check in argument parsing (same pattern as `--use-stitch`, `--analyze`, `--batch`). Conditional section injection at the output step of each workflow.
- **D-09:** All four workflows (wireframe.md, mockup.md, critique.md, competitive.md) follow the same integration pattern for consistency. Flag detection and output injection is structurally identical across all four.

### Claude's Discretion

- Gate state file naming convention and directory location within `.planning/`
- Exact markdown format of the WebMCP-enhanced output sections
- Whether to register the approval gate tool via the existing `useWebMcpTools()` composite hook or separately

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WFL-01 | Approval gates exposed as declarative WebMCP tool forms replacing imperative approval flow | `use-approval-gate-tool.ts` using `useWebMCP()` hook + new API route + file-based gate state in `.planning/` |
| WFL-02 | `--webmcp` flag added to wireframe.md for WebMCP-enhanced output | Early flag parse in `<flags>` table + conditional section injection at Step 7f output summary |
| WFL-03 | `--webmcp` flag added to mockup.md for WebMCP-enhanced output | Same pattern as WFL-02 applied to mockup workflow |
| WFL-04 | `--webmcp` flag added to critique.md for WebMCP-enhanced output | Same pattern as WFL-02 applied to critique workflow |
| WFL-05 | `--webmcp` flag added to competitive.md for WebMCP-enhanced output | Same pattern as WFL-02 applied to competitive workflow |
</phase_requirements>

---

## Summary

Phase 160 delivers two independent capabilities that share no code: (1) a new WebMCP browser tool `pde_approval_gate` that lets browser AI agents approve or reject PDE workflow gates without navigating the dashboard UI, and (2) a `--webmcp` flag added to four workflow markdown files that injects a context section into output so browser agents understand which tools are available for each artifact.

The approval gate tool is a thin wrapper over the existing approval infrastructure. The project already has `writeApprovalResponse` / `readApprovalResponse` in `dashboard/lib/queries.ts`, a `POST /api/approval-response` route authenticated via Clerk, and an `ApprovalCard` component. The new browser tool calls a new Next.js API route that lists pending gates from `.planning/gates/` and then writes the response using the existing Redis-backed infrastructure. The tool follows the same `useWebMCP()` registration pattern used by `use-design-state-tool.ts`, `use-project-info-tool.ts`, and `use-artifact-list-tool.ts` — identical file structure.

The `--webmcp` flag changes are purely additive markdown edits to four workflow files. Each workflow already has a flags table in a `<flags>` block and parses `$ARGUMENTS` early. The new flag follows the `--use-stitch` pattern exactly: add a row to the flags table, add a parse step setting `USE_WEBMCP`, and inject an additional section at the final output step. No runtime code changes are required for the flag feature — it is instructions-only.

**Primary recommendation:** Build in two parallel tracks: (A) the browser tool hook + gate state API route + tests, and (B) the four workflow markdown edits. Both tracks are independent and can be implemented and tested separately.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@mcp-b/react-webmcp` | ^2.2.0 | `useWebMCP()` hook for browser tool registration | Already installed; all three existing browser tools use it |
| `@mcp-b/global` | ^2.2.0 | `initializeWebModelContext()` polyfill | Already installed; called in `providers.tsx` |
| `zod` | (project version) | Input schema definition for tool parameters | Used in `use-artifact-list-tool.ts` for parameterized tools |
| `next/server` | (Next.js version) | `NextResponse`, `NextRequest` for API route | Standard for all planning API routes |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@clerk/nextjs/server` | (project version) | Auth for the gate-action API route | POST endpoint must be Clerk-authenticated (same as `/api/approval-response`) |
| `fs` (Node built-in) | — | Read `.planning/gates/` directory | Used in planning API routes like `design-state/route.ts` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| File-based gate state in `.planning/` | Redis hash (existing `pde:default:approvals:*`) | Redis is already used for per-session approval responses; file-based is the locked decision (D-04) for gate state |
| Single `pde_approval_gate` tool | Separate `pde_approve_gate` + `pde_reject_gate` tools | Single tool is the locked pattern (D-01); keeps consistent with existing browser tools |

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
dashboard/
├── lib/
│   ├── mcp/
│   │   └── browser-tools/
│   │       ├── index.ts                      # add export for use-approval-gate-tool
│   │       └── use-approval-gate-tool.ts     # NEW — useWebMCP() registration (WFL-01)
│   └── __tests__/
│       └── approval-gate-tool.test.ts        # NEW — source-inspection tests
├── app/
│   └── api/
│       └── planning/
│           └── gates/
│               └── route.ts                  # NEW — GET list pending, POST submit action
└── hooks/
    └── use-webmcp-tools.ts                   # MODIFIED — add useApprovalGateTool()

.planning/
└── gates/                                    # NEW — pending gate state files (JSON)

workflows/
├── wireframe.md                              # MODIFIED — add --webmcp flag + output section
├── mockup.md                                 # MODIFIED — add --webmcp flag + output section
├── critique.md                               # MODIFIED — add --webmcp flag + output section
└── competitive.md                            # MODIFIED — add --webmcp flag + output section
```

### Pattern 1: useWebMCP() Hook Registration (HIGH confidence)

**What:** Each browser tool is a custom hook in `dashboard/lib/mcp/browser-tools/`. The hook calls `useWebMCP()` once with a stable schema reference defined at module level, outside the component.

**When to use:** For every new browser-facing WebMCP tool.

**Example (from existing `use-artifact-list-tool.ts`):**
```typescript
// Source: dashboard/lib/mcp/browser-tools/use-artifact-list-tool.ts
'use client';
import { useWebMCP } from '@mcp-b/react-webmcp';
import { z } from 'zod';

// Schema defined OUTSIDE component — stable reference prevents re-registration
const inputSchema = {
  filter: z.string().optional().describe('...'),
};

export function useArtifactListTool() {
  useWebMCP({
    name: 'list_artifacts',
    description: '...',
    inputSchema,
    handler: async ({ filter }: { filter?: string }) => {
      const res = await fetch('/api/planning/artifacts?...');
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      return await res.json();
    },
  });
}
```

**Approval gate tool schema** — the inputSchema must define the form a browser AI agent submits:
```typescript
// Source: architecture derived from D-01, D-03 decisions in CONTEXT.md
const inputSchema = {
  gate_id: z.string().describe('Deterministic gate identifier (phase-step-artifact)'),
  action:  z.enum(['approve', 'reject']).describe('Decision: approve or reject this gate'),
  reason:  z.string().optional().describe('Optional reason for the decision'),
};
```

### Pattern 2: Planning API Route (HIGH confidence)

**What:** File-reading API routes under `dashboard/app/api/planning/` follow the same structure: `export const dynamic = 'force-dynamic'`, read from `process.cwd()/.planning/`, return `NextResponse.json()`.

**Example (from `design-state/route.ts`):**
```typescript
// Source: dashboard/app/api/planning/design-state/route.ts
import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gatesDir = path.join(process.cwd(), '.planning', 'gates');
  // read pending gate files...
  return NextResponse.json({ gates: [...] });
}
```

**For the approval gate route**, the POST must be Clerk-authenticated (pattern from `/api/approval-response`):
```typescript
// Source: dashboard/app/api/approval-response/route.ts — auth pattern
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ...write gate decision...
}
```

### Pattern 3: Composite Hook Registration (HIGH confidence)

**What:** `useWebMcpTools()` in `dashboard/hooks/use-webmcp-tools.ts` calls all individual browser tool hooks. Adding a new tool means adding one line here.

```typescript
// Source: dashboard/hooks/use-webmcp-tools.ts
export function useWebMcpTools() {
  useDesignStateTool();
  useProjectInfoTool();
  useArtifactListTool();
  useApprovalGateTool();  // ADD — one line
}
```

No changes needed to `webmcp-tools-registrar.tsx` or `providers.tsx`.

### Pattern 4: Workflow Flag Injection (HIGH confidence)

**What:** Workflow markdown files parse `$ARGUMENTS` early for boolean flags. The pattern for `--use-stitch` is exact template for `--webmcp`:

1. Add row to `<flags>` table
2. Add parse step: `IF --webmcp in $ARGUMENTS: SET USE_WEBMCP = true`
3. At the final output step (summary table), add conditional section:

```markdown
<!-- Add to flags table -->
| `--webmcp` | Boolean | Append WebMCP tool context section to output for browser AI agent consumption. |

<!-- Add to argument parsing step -->
#### {N}. Parse --webmcp flag

Check $ARGUMENTS for `--webmcp`:
- If present: SET USE_WEBMCP = true. Log: `  -> --webmcp detected: WebMCP context section will be appended.`
- If absent: SET USE_WEBMCP = false.

<!-- Add to final output step -->
IF USE_WEBMCP is true:

## WebMCP Context

**Available tools for this artifact:**

| Tool | Description | Required Input |
|------|-------------|----------------|
| `pde_approval_gate` | Approve or reject a pending PDE gate | `gate_id`, `action` (approve/reject) |
| `get_design_state` | Read current design phase and active artifacts | (none) |
| `list_artifacts` | List available design artifacts | `filter` (optional) |

**Tool call example (pde_approval_gate):**
\`\`\`json
{
  "name": "pde_approval_gate",
  "arguments": {
    "gate_id": "{workflow}-{phase}-{artifact}",
    "action": "approve",
    "reason": "Wireframes meet design requirements"
  }
}
\`\`\`

**Pending gate for this run:** `{workflow}-{GATE_ID}` — call `pde_approval_gate` with this gate_id to approve or reject.
```

### Pattern 5: Gate State File Format (Claude's Discretion)

**Decision:** Use JSON files in `.planning/gates/` with deterministic names.

**Recommended naming:** `{workflow}-{phase}-{artifact}-{YYYYMMDD}.json`

**File format:**
```json
{
  "gate_id": "wireframe-phase-160-WFR-20260328",
  "workflow": "wireframe",
  "artifact": "WFR",
  "context": "Wireframe generation complete — 3 screens generated at midfi fidelity",
  "requester": "pde-agent",
  "created_at": "2026-03-28T21:00:00.000Z",
  "status": "pending"
}
```

**Status transitions:** `pending` → `approved` | `rejected` (updated in-place by the API route handler).

**Why JSON over markdown:** Directly machine-readable by the API route without parsing, consistent with `FLW-screen-inventory.json`, `design-manifest.json`, `.webmcp/config.json` patterns already in the project.

### Anti-Patterns to Avoid

- **Schema inside component body:** Defining `inputSchema` inside the hook function causes a new object reference every render, triggering re-registration. Always define at module level (Phase 157 decision, locked).
- **Separate approve/reject tools:** D-01 explicitly requires single tool. Do not create `pde_approve_gate` and `pde_reject_gate` as separate hooks.
- **Writing gate state to Redis:** D-04 locks gate state to file-based `.planning/`. The existing `pde:default:approvals:*` Redis keys are for per-session approval responses (different concern).
- **Modifying webmcp-tools-registrar.tsx:** The registrar mounts the composite hook. No change needed there — only `use-webmcp-tools.ts` needs the new call.
- **Destructive output modification:** D-06 requires `--webmcp` to be additive. The WebMCP section must append after the existing summary table, not replace any existing content.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tool registration lifecycle | Custom re-registration guard | `useWebMCP()` with module-level schema | Phase 157 solved zombie re-registrations with stable schema reference; reinventing breaks existing pattern |
| Gate response persistence | New Redis schema | `writeApprovalResponse()` in `queries.ts` | Existing function handles Redis write + TTL; use for the action submission path |
| Auth on gate action route | Custom token validation | `auth()` from `@clerk/nextjs/server` | Identical auth pattern to `/api/approval-response/route.ts` |
| Pending gate lookup | Custom event-stream scan | File system read of `.planning/gates/` | D-04 locked gate state to file-based; avoid coupling to Redis session events for gate listing |

**Key insight:** The approval infrastructure (Redis writes, Clerk auth, ApprovalCard component) already exists for the dashboard imperative flow. The WebMCP tool is a new entry point into the same write path — the handler calls the same `writeApprovalResponse()` function that the dashboard card calls, just from the browser tool layer.

---

## Common Pitfalls

### Pitfall 1: Gate ID Collision
**What goes wrong:** Two concurrent workflow runs for the same artifact produce the same gate_id, and one overwrites the other's gate state file.
**Why it happens:** Deterministic IDs from phase+step+artifact without a timestamp or run-id suffix.
**How to avoid:** Include ISO date in the gate_id (already in recommended naming: `wireframe-phase-160-WFR-20260328.json`). For multiple runs on the same day, append a short random suffix or sequence number.
**Warning signs:** GET /api/planning/gates returns fewer items than expected during concurrent runs.

### Pitfall 2: useWebMCP Schema Stability
**What goes wrong:** Tool re-registers on every render, causing duplicate entries in `navigator.modelContext`.
**Why it happens:** Defining `inputSchema` as a literal object inside the hook function body creates a new reference each render.
**How to avoid:** Define `const inputSchema = { ... }` at module level, outside the function. This is the pattern used in all three existing tools.
**Warning signs:** Test inspection of the source file shows the schema constant is inside the `export function` body.

### Pitfall 3: --webmcp Flag Clobbers Existing Output
**What goes wrong:** WebMCP section renders in the middle of the summary table instead of appending after it.
**Why it happens:** Injecting content at the wrong step or replacing the existing output block rather than appending.
**How to avoid:** The `IF USE_WEBMCP is true` block MUST appear after the standard summary table. Each workflow's final output step already has a defined end (e.g., wireframe Step 7f output summary). Append after that section's closing line.
**Warning signs:** Existing output (Fidelity/Screens/Token status lines) is missing or truncated when `--webmcp` is used.

### Pitfall 4: Gate State File Not Found on GET
**What goes wrong:** Browser agent calls `pde_approval_gate` with a valid gate_id but the API returns 404.
**Why it happens:** Gate file was written to `.planning/gates/` but the GET route looks in a different path, or the gate_id in the tool call doesn't match the filename.
**How to avoid:** The gate_id passed to the tool must be the exact filename stem (without `.json`). The `--webmcp` output section must echo the gate_id that was actually written to disk.
**Warning signs:** Tool handler receives `gate not found` response even after workflow completes.

### Pitfall 5: Browser Tool Handler Missing Await
**What goes wrong:** Gate action appears to succeed but Redis write doesn't complete before the tool returns.
**Why it happens:** Calling `writeApprovalResponse()` without `await`.
**How to avoid:** The handler must `await` the fetch call to `/api/planning/gates`. Existing handlers in `use-artifact-list-tool.ts` all `await fetch(...)`.
**Warning signs:** Gate status remains `pending` in the file after tool call completes.

---

## Code Examples

### Approval Gate Browser Tool Hook
```typescript
// Source: Derived from use-artifact-list-tool.ts pattern (HIGH confidence)
// dashboard/lib/mcp/browser-tools/use-approval-gate-tool.ts
'use client';
import { useWebMCP } from '@mcp-b/react-webmcp';
import { z } from 'zod';

// Schema at module level — prevents zombie re-registrations (Phase 157 decision)
const inputSchema = {
  gate_id: z.string().describe('Gate identifier from workflow output (e.g., wireframe-phase-160-WFR-20260328)'),
  action:  z.enum(['approve', 'reject']).describe('Decision for this gate'),
  reason:  z.string().optional().describe('Optional reason for the decision'),
};

export function useApprovalGateTool() {
  useWebMCP({
    name: 'pde_approval_gate',
    description: 'Approve or reject a pending PDE workflow gate. Call with the gate_id shown in workflow output.',
    inputSchema,
    handler: async ({ gate_id, action, reason }: { gate_id: string; action: 'approve' | 'reject'; reason?: string }) => {
      const res = await fetch('/api/planning/gates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gate_id, action, reason }),
      });
      if (!res.ok) throw new Error(`Gate action failed: ${res.status}`);
      return await res.json();
    },
  });
}
```

### Planning Gates API Route
```typescript
// Source: Derived from design-state/route.ts + approval-response/route.ts patterns
// dashboard/app/api/planning/gates/route.ts
import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

// GET — list all pending gate files (used by browser tool to enumerate gates)
export async function GET() {
  const gatesDir = path.join(process.cwd(), '.planning', 'gates');
  if (!fs.existsSync(gatesDir)) {
    return NextResponse.json({ gates: [] });
  }
  const files = fs.readdirSync(gatesDir).filter(f => f.endsWith('.json'));
  const gates = files.map(f => {
    try {
      return JSON.parse(fs.readFileSync(path.join(gatesDir, f), 'utf-8'));
    } catch { return null; }
  }).filter(Boolean);
  return NextResponse.json({ gates });
}

// POST — submit approve/reject action (Clerk auth required)
export async function POST(request: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const { gate_id, action, reason } = body;
  // update gate file status
  const gatePath = path.join(process.cwd(), '.planning', 'gates', `${gate_id}.json`);
  if (!fs.existsSync(gatePath)) {
    return NextResponse.json({ error: 'Gate not found' }, { status: 404 });
  }
  const gate = JSON.parse(fs.readFileSync(gatePath, 'utf-8'));
  gate.status = action === 'approve' ? 'approved' : 'rejected';
  gate.decided_at = new Date().toISOString();
  if (reason) gate.reason = reason;
  fs.writeFileSync(gatePath, JSON.stringify(gate, null, 2));
  return NextResponse.json({ ok: true, gate_id, action });
}
```

### Workflow --webmcp Flag Table Entry
```markdown
| `--webmcp` | Boolean | Append WebMCP tool context section to output for browser AI agent consumption. Does not affect artifact generation. |
```

### Workflow --webmcp Parse Step
```markdown
#### {N}. Parse --webmcp flag

Check $ARGUMENTS for `--webmcp`:
- If present: SET USE_WEBMCP = true. Log: `  -> --webmcp detected: WebMCP context section will be appended to output.`
- If absent: SET USE_WEBMCP = false.
```

### Workflow --webmcp Output Section (injected at final step)
```markdown
IF USE_WEBMCP is true, append this section after the standard output summary:

---

## WebMCP Context

This output includes context for browser AI agents accessing PDE via WebMCP.

**Available tools registered in this browser session:**

| Tool | Call When | Required Input |
|------|-----------|----------------|
| `pde_approval_gate` | To approve or reject this {workflow} output | `gate_id` (shown below), `action` (`approve` or `reject`) |
| `get_design_state` | To check current PDE design phase | (none) |
| `list_artifacts` | To enumerate all design artifacts | `filter` (optional) |
| `get_project_info` | To get project name and milestone | (none) |

**Pending gate for this run:**

Gate ID: `{GATE_ID}` (e.g., `wireframe-phase-{N}-WFR-{YYYYMMDD}`)

To approve via WebMCP tool call:
\`\`\`json
{
  "name": "pde_approval_gate",
  "arguments": { "gate_id": "{GATE_ID}", "action": "approve" }
}
\`\`\`

To reject via WebMCP tool call:
\`\`\`json
{
  "name": "pde_approval_gate",
  "arguments": { "gate_id": "{GATE_ID}", "action": "reject", "reason": "..." }
}
\`\`\`

> Gate state file: `.planning/gates/{GATE_ID}.json`
> Fallback: Users not using WebMCP can approve via the dashboard approval UI or the `/api/approval-response` endpoint as before.
```

---

## Existing Approval Infrastructure (Read-Only Reference)

This phase does NOT modify the existing approval flow. It adds a new entry point alongside it. Key existing files:

| File | Role | Phase 160 Interaction |
|------|------|-----------------------|
| `dashboard/lib/queries.ts` | `writeApprovalResponse()`, `readApprovalResponse()`, `findPendingApproval()` | Call `writeApprovalResponse()` from new API route after gate decision (optional — or update gate file directly) |
| `dashboard/app/api/approval-response/route.ts` | POST: Clerk-auth gate submit; GET: relay token gate poll | No changes — existing flow preserved (D-09 requirement) |
| `dashboard/components/approval-card.tsx` | Dashboard UI for approve/deny | No changes — dashboard UI continues to work unchanged |
| `dashboard/lib/wire-schema.ts` | `WireEnvelope` schema with `approval_id` field | Not used for new gate system (file-based, not event-stream) |

**Important distinction:** The existing approval flow uses UUIDs for `approval_id` in `WireEnvelope` events and stores responses in Redis (`pde:default:approvals:{sessionId}:{approvalId}`). The new gate system uses deterministic string IDs and stores gate state in `.planning/gates/` files. These are parallel systems serving different purposes — the gate system is for workflow-level approval gates, the existing system is for session-level approval events.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (globals: true) |
| Config file | `dashboard/vitest.config.ts` |
| Quick run command | `cd dashboard && npx vitest run --reporter=verbose lib/__tests__/approval-gate-tool.test.ts` |
| Full suite command | `cd dashboard && npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WFL-01 | `pde_approval_gate` tool registered in browser via `useWebMCP()` | unit (source inspection) | `cd dashboard && npx vitest run lib/__tests__/approval-gate-tool.test.ts` | ❌ Wave 0 |
| WFL-01 | POST `/api/planning/gates` updates gate file status and returns `{ok: true}` | unit (route test) | `cd dashboard && npx vitest run lib/__tests__/planning-gates.test.ts` | ❌ Wave 0 |
| WFL-01 | GET `/api/planning/gates` returns pending gate list from `.planning/gates/` | unit (route test) | `cd dashboard && npx vitest run lib/__tests__/planning-gates.test.ts` | ❌ Wave 0 |
| WFL-02 | `--webmcp` present in wireframe.md flags table | unit (source inspection) | `cd dashboard && npx vitest run lib/__tests__/workflow-flags.test.ts` | ❌ Wave 0 |
| WFL-03 | `--webmcp` present in mockup.md flags table | unit (source inspection) | `cd dashboard && npx vitest run lib/__tests__/workflow-flags.test.ts` | ❌ Wave 0 |
| WFL-04 | `--webmcp` present in critique.md flags table | unit (source inspection) | `cd dashboard && npx vitest run lib/__tests__/workflow-flags.test.ts` | ❌ Wave 0 |
| WFL-05 | `--webmcp` present in competitive.md flags table | unit (source inspection) | `cd dashboard && npx vitest run lib/__tests__/workflow-flags.test.ts` | ❌ Wave 0 |
| WFL-01 | `useWebMcpTools()` composite hook calls `useApprovalGateTool()` | unit (source inspection) | `cd dashboard && npx vitest run lib/__tests__/approval-gate-tool.test.ts` | ❌ Wave 0 |

**Note:** Project vitest config uses `environment: 'node'` — no DOM/jsdom. Tests MUST use source-inspection pattern (read source file with `fs.readFileSync`, assert string content) rather than `renderHook`. This is the established pattern per Phase 157 decision.

**Source inspection test pattern** (from existing `use-push-capability.test.ts` and `manifest.test.ts`):
```typescript
// Source inspection — reads source code as string, asserts presence of patterns
import fs from 'fs';
import path from 'path';

it('registers pde_approval_gate tool', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../mcp/browser-tools/use-approval-gate-tool.ts'),
    'utf-8'
  );
  expect(source).toContain("name: 'pde_approval_gate'");
  expect(source).toContain('useWebMCP(');
});
```

### Sampling Rate
- **Per task commit:** `cd dashboard && npx vitest run lib/__tests__/approval-gate-tool.test.ts lib/__tests__/planning-gates.test.ts lib/__tests__/workflow-flags.test.ts`
- **Per wave merge:** `cd dashboard && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `dashboard/lib/__tests__/approval-gate-tool.test.ts` — covers WFL-01 (hook registration + composite hook)
- [ ] `dashboard/lib/__tests__/planning-gates.test.ts` — covers WFL-01 (API route GET + POST)
- [ ] `dashboard/lib/__tests__/workflow-flags.test.ts` — covers WFL-02, WFL-03, WFL-04, WFL-05 (flag presence in workflow files)

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely code/config changes with no new external service dependencies. All dependencies (Redis, Clerk, @mcp-b packages) are already available from prior phases.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `provideContext()` for tool registration | `useMcpTool()` / `useWebMCP()` hook | March 5, 2026 | `provideContext()` is deprecated — do NOT use |
| `formatOutput` for tool response formatting | `outputSchema` with structured content | @mcp-b/react-webmcp 2.x | `formatOutput` is deprecated per type declaration; prefer `outputSchema` if structured output is needed |

---

## Open Questions

1. **Gate ID collision under rapid workflow runs**
   - What we know: Deterministic IDs from phase+workflow+artifact are recommended; adding date suffix reduces collision risk.
   - What's unclear: If user runs `/pde:wireframe --webmcp` twice in one day, the second run would overwrite the first gate file.
   - Recommendation: Append a short 4-char hex suffix (e.g., `wireframe-160-WFR-20260328-a3f2.json`) generated at gate-write time. The gate_id echoed in the `--webmcp` output section must match the actual filename written.

2. **Gate cleanup policy**
   - What we know: Gate files persist in `.planning/gates/` indefinitely once written.
   - What's unclear: Whether stale gate files (from days-old runs) should be included in GET `/api/planning/gates` results.
   - Recommendation: Filter GET results to `status: "pending"` gates only, or gates from the last 24 hours. Planner should decide the filter policy.

---

## Sources

### Primary (HIGH confidence)
- `dashboard/lib/mcp/browser-tools/use-design-state-tool.ts` — exact `useWebMCP()` hook pattern
- `dashboard/lib/mcp/browser-tools/use-artifact-list-tool.ts` — parameterized schema pattern with zod
- `dashboard/hooks/use-webmcp-tools.ts` — composite hook registration pattern
- `dashboard/app/api/planning/design-state/route.ts` — planning API route file-read pattern
- `dashboard/app/api/approval-response/route.ts` — Clerk-auth POST + relay-token GET pattern
- `dashboard/lib/queries.ts` — `writeApprovalResponse()`, `readApprovalResponse()` implementations
- `dashboard/node_modules/@mcp-b/react-webmcp/dist/index.d.ts` — `useWebMCP()` / `WebMCPConfig` interface (verified in-repo)
- `workflows/wireframe.md` — `--use-stitch` flag pattern (lines 32, 207-211, 278-302)

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` Accumulated Context — Phase 157 decisions (inputSchema at module level, source-inspection tests)
- `dashboard/vitest.config.ts` — test environment is `node`, `include` glob is `**/__tests__/**/*.test.ts`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — packages verified in `dashboard/package.json` and `node_modules`
- Architecture: HIGH — all patterns verified against actual source files
- Pitfalls: HIGH for schema stability (Phase 157 documented decision); MEDIUM for gate collision (new pattern)
- Workflow flag pattern: HIGH — `--use-stitch` provides exact structural template

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable domain — @mcp-b/react-webmcp API verified from installed node_modules)
