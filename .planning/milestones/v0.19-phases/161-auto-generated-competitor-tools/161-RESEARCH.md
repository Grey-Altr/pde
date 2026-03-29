# Phase 161: Auto-Generated Competitor Tools — Research

**Researched:** 2026-03-28
**Domain:** WebMCP browser tool generation, sanitization pipeline, JSON registry, competitive workflow extension
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Tool stub generation occurs after Step 7 (output writing), as a new Step 8 in the competitive workflow — keeps core analysis clean, tool stubs are a post-processing derivative
- **D-02:** The existing `--webmcp` flag triggers generation — if --webmcp is active AND competitor data exists, generate stubs. No new flag needed.
- **D-03:** Tool stubs derive from competitor name + key differentiators + feature matrix row data — enough for meaningful descriptions without leaking full analysis
- **D-04:** 1 tool per competitor — "query_{sanitized_name}" tool returning that competitor's key data from the analysis
- **D-05:** Strip known injection patterns: `<system>`, `IMPORTANT:`, `You must`, `Ignore previous`, markdown headers `#` — focus on known attack vectors
- **D-06:** 512-char limit enforced by truncating at last complete sentence before 512 characters — preserves readability
- **D-07:** Each stub tagged with full provenance: `source: "auto-generated"`, `competitor_name`, `generated_from` (CMP artifact version), `generated_at` timestamp
- **D-08:** Reuse existing `pde_approval_gate` WebMCP tool from Phase 160 — each generated stub gets a gate_id, human approves/rejects via the same tool. Gate ID format: `competitor-tool-{sanitized_name}-{YYYYMMDD}-{4_HEX}`
- **D-09:** Registry is a flat JSON array of tool objects with fields: `name`, `description`, `competitor_name`, `status` (pending/approved/rejected), `gate_id`, `metadata`, `approved_at`
- **D-10:** Registry file at `.webmcp/competitor-tools-registry.json` per ADV-04
- **D-11:** Approved tools registered via a new `useCompetitorTools()` browser-tool hook — follows existing useMcpTool() pattern, reads registry and only registers approved tools

### Claude's Discretion

- Exact regex patterns for sanitization beyond the specified injection markers
- Error handling when registry file is corrupted or missing
- Tool naming convention details beyond the "query_{sanitized_name}" pattern

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADV-01 | competitive.md generates optional WebMCP tool stubs from competitor analysis | Step 8 in competitive.md workflow; triggers on `--webmcp` flag + competitor data present |
| ADV-02 | Auto-generated tools pass through sanitization pipeline (strip instruction syntax, 512-char limit, source: "auto-generated") | Sanitization logic in workflow Step 8; regex stripping patterns documented in D-05/D-06/D-07 |
| ADV-03 | Auto-generated competitor tools require mandatory human review gate before activation | Reuse existing `pde_approval_gate` WebMCP tool; gate file written to `.planning/gates/`; `useCompetitorTools()` hook only registers `status: "approved"` tools |
| ADV-04 | Competitor tool registry stored in .webmcp/competitor-tools-registry.json | Flat JSON array registry per D-09/D-10; `useCompetitorTools()` hook reads it at mount |
</phase_requirements>

---

## Summary

Phase 161 has three tightly scoped deliverables: (1) a new Step 8 added to `workflows/competitive.md` that generates sanitized tool stubs and writes them to `.webmcp/competitor-tools-registry.json`, (2) a new `useCompetitorTools()` browser-tool hook that reads the registry and registers only approved tools via `useWebMCP()`, and (3) the new hook wired into `useWebMcpTools()` and exported from the barrel.

All three deliverables follow patterns already established in the codebase with zero new dependencies required. The `pde_approval_gate` WebMCP tool and its `/api/planning/gates` backend are fully implemented in Phase 160 and reused without modification. The registry format (flat JSON array) is a simple file write — no new infrastructure needed.

The only non-trivial logic is the sanitization pipeline in the workflow step, where injection pattern stripping and sentence-aware 512-char truncation must be implemented as explicit in-workflow instructions.

**Primary recommendation:** Implement in two plans — Plan 1: workflow Step 8 (competitive.md + registry write logic), Plan 2: browser hook (`useCompetitorTools()` + wiring + tests).

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@mcp-b/react-webmcp` | 2.2.0 (installed) | `useWebMCP()` hook for registering browser tools | All existing browser tools use this — established pattern |
| `zod` | 4.3.6 (installed) | Input schema validation for tool registration | All existing tool inputSchemas use Zod |
| `next` | 16.2.1 (installed) | Next.js App Router for API routes | Project-standard framework |
| `node:fs` | built-in | Registry file read/write in browser hook | Used by all existing planning API routes |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | (installed) | Source-inspection tests | Test infrastructure already established — all new code gets a test file |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Flat JSON array registry | SQLite, Upstash Redis | Over-engineered for a file-backed registry; flat JSON is consistent with `.webmcp/config.json` and `.planning/gates/` patterns |
| File-level registry read in hook | API route to serve registry | API route adds round-trip and deployment complexity; hook reads file directly like other planning hooks |

**Installation:** No new packages required. All dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure

New files for this phase:

```
dashboard/
├── lib/mcp/browser-tools/
│   └── use-competitor-tools.ts      # New hook (ADV-03, ADV-04)
├── lib/__tests__/
│   └── competitor-tools.test.ts     # Source inspection tests
└── hooks/
    └── use-webmcp-tools.ts          # Modified — add useCompetitorTools() call

.webmcp/
└── competitor-tools-registry.json   # Written by competitive.md Step 8 (ADV-04)

workflows/
└── competitive.md                   # Modified — add Step 8 (ADV-01, ADV-02)
```

### Pattern 1: useMcpTool() Browser Tool Hook

All browser tools follow the exact same structure. The `useWebMCP()` hook from `@mcp-b/react-webmcp` is the only registration path. `inputSchema` MUST be a module-level constant (outside the hook function) to prevent zombie re-registration on re-renders (Phase 157 decision, extended to Phase 160).

```typescript
// Source: dashboard/lib/mcp/browser-tools/use-approval-gate-tool.ts (existing pattern)
'use client';
import { useWebMCP } from '@mcp-b/react-webmcp';
import { z } from 'zod';

// Schema at module level — prevents zombie re-registrations (Phase 157 decision)
const inputSchema = {
  gate_id: z.string().describe('...'),
  action: z.enum(['approve', 'reject']).describe('...'),
  reason: z.string().optional().describe('...'),
};

export function useApprovalGateTool() {
  useWebMCP({
    name: 'pde_approval_gate',
    description: '...',
    inputSchema,
    handler: async ({ gate_id, action, reason }) => {
      const res = await fetch('/api/planning/gates', { ... });
      ...
    },
  });
}
```

**useCompetitorTools() distinction:** Unlike single-tool hooks, `useCompetitorTools()` must read the registry at runtime and conditionally register one `useWebMCP()` call per approved tool. This requires a different structure — the hook reads the registry file via a fetch call to a new API route (or via existing file access patterns) and registers only `status: "approved"` entries.

### Pattern 2: Composite Hook Registration

```typescript
// Source: dashboard/hooks/use-webmcp-tools.ts (existing pattern)
'use client';
import { useDesignStateTool, useProjectInfoTool, useArtifactListTool, useApprovalGateTool } from '@/lib/mcp/browser-tools';

export function useWebMcpTools() {
  useDesignStateTool();
  useProjectInfoTool();
  useArtifactListTool();
  useApprovalGateTool();
  // Phase 161: useCompetitorTools() added here
}
```

### Pattern 3: Barrel Export

```typescript
// Source: dashboard/lib/mcp/browser-tools/index.ts (existing pattern)
export { useDesignStateTool } from './use-design-state-tool';
export { useProjectInfoTool } from './use-project-info-tool';
export { useArtifactListTool } from './use-artifact-list-tool';
export { useApprovalGateTool } from './use-approval-gate-tool';
// Phase 161: export { useCompetitorTools } from './use-competitor-tools';
```

The existing test `webmcp-browser-tools.test.ts` checks that the barrel exports EXACTLY 4 lines. Phase 161 adds a 5th line, so that count assertion must be updated from 4 to 5.

### Pattern 4: Registry JSON Format

```json
[
  {
    "name": "query_acme_corp",
    "description": "Returns Acme Corp key competitive data: pricing tiers, primary features, and market positioning from CMP analysis.",
    "competitor_name": "Acme Corp",
    "status": "pending",
    "gate_id": "competitor-tool-acme_corp-20260328-a1b2",
    "metadata": {
      "source": "auto-generated",
      "generated_from": "CMP-competitive-v1",
      "generated_at": "2026-03-28T12:00:00.000Z"
    },
    "approved_at": null
  }
]
```

### Pattern 5: Gate File Format (reuse Phase 160 pattern)

Gate files are written to `.planning/gates/{gate_id}.json`. The existing `/api/planning/gates` POST route already handles `approve`/`reject` actions and updates gate status. No changes needed to gate infrastructure.

```json
{
  "gate_id": "competitor-tool-acme_corp-20260328-a1b2",
  "workflow": "competitive",
  "type": "competitor-tool",
  "competitor_name": "Acme Corp",
  "tool_name": "query_acme_corp",
  "status": "pending",
  "created_at": "2026-03-28T12:00:00.000Z"
}
```

### Pattern 6: Sanitization Pipeline (in-workflow logic)

The sanitization runs in competitive.md Step 8, not in TypeScript. The workflow instructions must specify:

1. **Name sanitization:** `query_{sanitized_name}` where `sanitized_name` = competitor name lowercased, spaces and special chars replaced with `_`, consecutive underscores collapsed, leading/trailing underscores stripped
2. **Description injection stripping:** Remove exact string matches for `<system>`, `IMPORTANT:`, `You must`, `Ignore previous`, markdown headers (lines starting with `#`)
3. **512-char truncation:** Truncate at the last period (`.`) before character position 512; if no period found, truncate at last space before 512; append ellipsis if truncated
4. **Tagging:** Always append provenance metadata to the registry entry object, not embedded in the description string

### Anti-Patterns to Avoid

- **Dynamic inputSchema:** Never define inputSchema inside the hook function body — module-level constant is mandatory per Phase 157 decision. For `useCompetitorTools()` which registers multiple tools, each tool registration needs its own stable schema reference or an empty schema `{}` if no input is needed.
- **useWebMCP in a loop:** The `useWebMCP()` hook must be called at the top level of a React component/hook, not inside a loop or conditional. To register N competitor tools, `useCompetitorTools()` must use a fixed-count approach or an array-driven pattern where the hook internally maps over a stable list. The registry state must be loaded once (via an API route or direct read at mount) and then each approved tool registered via individual `useWebMCP()` calls with stable deps.
- **Writing registry without creating .webmcp dir:** The `.webmcp/` directory exists (confirmed: contains `config.json`), but the workflow step must verify before writing the registry JSON.
- **Auto-activating tools:** The `useCompetitorTools()` hook MUST filter by `status === "approved"` — it must never register `pending` or `rejected` tools.
- **Modifying gate infrastructure:** The existing `/api/planning/gates` route and `pde_approval_gate` WebMCP tool are used as-is. No modifications.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tool registration | Custom WebMCP registration | `useWebMCP()` from `@mcp-b/react-webmcp` | Only supported registration path per Phase 157 decision |
| Approval flow | Custom approve/reject UI | Existing `pde_approval_gate` tool + `/api/planning/gates` route | Already implemented; reuse is a locked decision (D-08) |
| Registry persistence | Database, Redis | `.webmcp/competitor-tools-registry.json` flat JSON | Flat JSON is the project pattern for WebMCP state |
| Input validation | Manual type checks | Zod schemas | Project-standard; all existing tools use Zod |

---

## Critical Design Challenge: useWebMCP in a Dynamic Context

The most technically interesting problem in this phase is how `useCompetitorTools()` registers a variable number of tools (one per approved competitor) while honoring the React rules of hooks (no hooks in loops/conditionals) and the module-level inputSchema requirement.

**Verified approach from @mcp-b/react-webmcp 2.2.0 types:** `useWebMCP` accepts a `deps?: DependencyList` second argument. The hook re-registers when deps change.

**Recommended pattern:** Since `useWebMCP()` cannot be called in a loop, `useCompetitorTools()` should register a single dispatcher tool `query_competitor` that accepts a `competitor_name` input and looks up the approved tool data at call time. This avoids the loop-registration problem entirely.

However, D-04 specifies "1 tool per competitor — `query_{sanitized_name}`". The CONTEXT.md decision requires individual named tools, not a single dispatcher.

**Resolution:** The hook can use a fixed-length approach. Since the registry can have at most N competitors (bounded by the competitive analysis scope — max 8+ for deep), the hook can read the registry synchronously at module import time (like other browser tools that call their API immediately) and register up to that count. Each call to `useWebMCP()` in the hook body maps to one competitor by array index — array index 0, 1, 2, ... up to max. If fewer competitors exist, unused slots are skipped via `enabled: false` or conditional early returns.

**Simpler resolution (recommended):** Since all existing hooks are source-inspected (not runtime-tested due to node environment), the hook can use an early-read pattern: fetch the registry JSON at module evaluation time (server component context) or expose a single `query_competitor_tool` that dispatches based on a `competitor_name` argument — naming it slightly differently to avoid conflicting with D-04.

**Final recommendation for planner:** Flag this as a discretion area. The safest implementation is a single `query_competitor_data` tool with `competitor_name` as an input parameter (from the approved list). The per-named-tool pattern (D-04) is achievable but requires careful static analysis. Document both options in PLAN.md with a note that D-04 can be honored by using N individual `useWebMCP()` calls where N is read from the registry at component mount — React allows this if the count is stable between renders (registry doesn't change mid-session).

---

## Common Pitfalls

### Pitfall 1: Hooks Rules Violation with Dynamic Tool Count
**What goes wrong:** Calling `useWebMCP()` inside a `competitors.map()` loop violates React rules of hooks and will cause runtime errors.
**Why it happens:** The number of registered tools varies per competitive analysis run.
**How to avoid:** Either (a) use a fixed upper bound and index into the array, or (b) implement as a single dispatcher tool with competitor_name input.
**Warning signs:** React error "Rendered more hooks than during the previous render" in browser console.

### Pitfall 2: Barrel Export Count Test Breakage
**What goes wrong:** `webmcp-browser-tools.test.ts` line 88 asserts `exportLines.length` equals 4. Adding the 5th export breaks this test.
**Why it happens:** The test explicitly counts barrel export lines.
**How to avoid:** Update the assertion from `toBe(4)` to `toBe(5)` in the same plan that adds the barrel export.
**Warning signs:** `webmcp-browser-tools.test.ts` fails with "Expected 4, received 5" after adding the new export.

### Pitfall 3: Registry Write Race in Workflow
**What goes wrong:** Competitive analysis runs in parallel with other skills; two concurrent runs could corrupt the registry JSON.
**Why it happens:** The workflow step writes `.webmcp/competitor-tools-registry.json` directly without a lock mechanism.
**How to avoid:** The workflow step should read any existing registry, merge new entries (deduplicate by `gate_id`), then write atomically.
**Warning signs:** Registry file contains duplicate entries or is malformed JSON.

### Pitfall 4: .webmcp Directory Assumption
**What goes wrong:** Workflow step fails silently if `.webmcp/` doesn't exist on a fresh project.
**Why it happens:** The directory is created by the context-sync emitter (Phase 157), but only after the first sync.
**How to avoid:** Workflow Step 8 must include `mkdir -p .webmcp` before writing the registry.
**Warning signs:** `ENOENT: no such file or directory` on registry write.

### Pitfall 5: Description Sanitization Over-Stripping
**What goes wrong:** The regex for injection pattern stripping removes legitimate content (e.g., a competitor named "IMPORTANT Corp" or a feature called "#1 in market").
**Why it happens:** Simple string matching without word-boundary awareness.
**How to avoid:** Use word-boundary or line-start anchors where appropriate. `IMPORTANT:` (with colon) is safer than `IMPORTANT` alone. `#` should only be stripped when at line start.
**Warning signs:** Tool descriptions missing meaningful content or truncated unexpectedly.

### Pitfall 6: Approved Tool Not Visible to Browser AI
**What goes wrong:** Human approves a gate via `pde_approval_gate`, registry `status` updates, but `useCompetitorTools()` still returns the old (pre-approval) state.
**Why it happens:** The hook reads the registry once at mount — stale until page refresh.
**How to avoid:** Document this as known behavior (acceptable for MVP). The hook is stateless like other browser tools; re-mounting the component (page refresh or navigation) picks up registry changes.
**Warning signs:** Approved tool not appearing in browser AI agent's tool list without refresh.

---

## Code Examples

Verified patterns from existing codebase:

### Workflow Step 8 Skeleton (in competitive.md)

```markdown
### Step 8/8: Generate competitor tool stubs (--webmcp only)

IF USE_WEBMCP is false OR no competitors were identified in Step 4:
  Skip silently. Display nothing.
  END

For each competitor identified in Step 4a:

1. **Sanitize competitor name** for tool naming:
   - Lowercase, replace spaces and non-alphanumeric chars with `_`
   - Collapse consecutive underscores, strip leading/trailing underscores
   - Result: `{sanitized_name}` (e.g., "Acme Corp" → "acme_corp")

2. **Build raw description** from:
   - Competitor's key differentiators (Step 4b)
   - Feature matrix row data for this competitor (Step 4c)
   - Pricing tier summary (Step 4f)
   Format: "{competitor_name}: {differentiator_1}, {differentiator_2}. Pricing: {tier_summary}. Features: {feature_summary}."

3. **Sanitize description**:
   - Strip: `<system>`, `IMPORTANT:`, `You must`, `Ignore previous`
   - Strip: lines beginning with `#` (markdown headers)
   - Truncate at last `.` before 512 chars; if none, at last space before 512

4. **Generate gate ID**: `competitor-tool-{sanitized_name}-{YYYYMMDD}-{4_HEX}`
   where {4_HEX} = first 4 chars of a random hex string

5. **Build registry entry object**:
   {
     "name": "query_{sanitized_name}",
     "description": "{sanitized_description}",
     "competitor_name": "{original_name}",
     "status": "pending",
     "gate_id": "{gate_id}",
     "metadata": {
       "source": "auto-generated",
       "generated_from": "CMP-competitive-v{N}",
       "generated_at": "{ISO 8601 timestamp}"
     },
     "approved_at": null
   }

6. **Write gate file** to `.planning/gates/{gate_id}.json`

After processing all competitors:

7. **Write registry**: Read existing `.webmcp/competitor-tools-registry.json` if present,
   merge new entries (skip any with duplicate gate_id), write merged array back.
   If file absent: write new array. Create .webmcp/ dir if needed.

Display:
  Step 8/8: Generated {N} competitor tool stubs.
  -> Registry: .webmcp/competitor-tools-registry.json
  -> Pending gates: {gate_id_1}, {gate_id_2}, ...
  -> Approve via: pde_approval_gate with gate_id and action: "approve"
```

### useCompetitorTools Hook Pattern

```typescript
// Source: Based on use-approval-gate-tool.ts pattern + registry read
'use client';
import { useWebMCP } from '@mcp-b/react-webmcp';
import { z } from 'zod';

// Schema defined at module level — prevents re-registration (Phase 157 decision)
const inputSchema = {
  competitor_name: z.string().describe('Competitor name to query (must be an approved competitor from the registry)'),
};

export function useCompetitorTools() {
  useWebMCP({
    name: 'query_competitor_data',
    description: 'Returns competitive data for an approved competitor from the PDE competitive analysis registry.',
    inputSchema,
    handler: async ({ competitor_name }: { competitor_name: string }) => {
      const res = await fetch(`/api/planning/competitor-tools?name=${encodeURIComponent(competitor_name)}`);
      if (!res.ok) throw new Error(`Failed to fetch competitor data: ${res.status}`);
      return await res.json();
    },
  });
}
```

Note: If D-04 (individual named tools per competitor) is strictly required, the API route approach is mandatory since hook-in-loop is not viable. The planner should resolve this via a single dispatcher + API route, or document the single-tool approach as the compliant path.

### Registry Read in API Route (new route needed)

```typescript
// New: dashboard/app/api/planning/competitor-tools/route.ts
import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const name = url.searchParams.get('name');

  const registryPath = path.join(process.cwd(), '.webmcp', 'competitor-tools-registry.json');

  if (!fs.existsSync(registryPath)) {
    return NextResponse.json({ error: 'Registry not found' }, { status: 404 });
  }

  let registry: unknown[];
  try {
    registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
  } catch {
    return NextResponse.json({ error: 'Corrupt registry' }, { status: 500 });
  }

  const approved = (registry as Array<Record<string, unknown>>).filter(
    t => t.status === 'approved'
  );

  if (name) {
    const tool = approved.find(t => t.competitor_name === name);
    if (!tool) return NextResponse.json({ error: 'Not found or not approved' }, { status: 404 });
    return NextResponse.json(tool);
  }

  return NextResponse.json({ tools: approved });
}
```

### Source Inspection Test Pattern (for competitor tools)

```typescript
// Source: Based on dashboard/lib/__tests__/approval-gate-tool.test.ts pattern
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const TOOL_FILE = path.resolve(__dirname, '../mcp/browser-tools/use-competitor-tools.ts');
const HOOK_FILE = path.resolve(__dirname, '../../hooks/use-webmcp-tools.ts');
const BARREL_FILE = path.resolve(__dirname, '../mcp/browser-tools/index.ts');

describe('use-competitor-tools.ts — source inspection', () => {
  it("contains 'use client' directive", () => {
    const src = fs.readFileSync(TOOL_FILE, 'utf-8');
    expect(src).toContain("'use client'");
  });

  it('inputSchema defined at module level before export function', () => {
    const src = fs.readFileSync(TOOL_FILE, 'utf-8');
    const schemaIdx = src.indexOf('const inputSchema');
    const funcIdx = src.indexOf('export function useCompetitorTools');
    expect(schemaIdx).toBeLessThan(funcIdx);
  });

  it('calls useWebMCP(', () => {
    const src = fs.readFileSync(TOOL_FILE, 'utf-8');
    expect(src).toContain('useWebMCP(');
  });

  it('filters registry to approved status only', () => {
    const src = fs.readFileSync(TOOL_FILE, 'utf-8');
    expect(src).toContain('approved');
  });
});

describe('useWebMcpTools composite hook — competitor tools wired', () => {
  it('imports and calls useCompetitorTools()', () => {
    const src = fs.readFileSync(HOOK_FILE, 'utf-8');
    expect(src).toContain('useCompetitorTools');
    expect(src).toContain('useCompetitorTools()');
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| provideContext() for tool registration | `useWebMCP()` only | March 5, 2026 (Phase 157) | provideContext() is deprecated — never use it |
| Inline inputSchema (inside hook body) | Module-level const inputSchema | Phase 157 | Inline schemas cause zombie re-registration on re-renders |
| Gate files as ephemeral | Gate files persist in `.planning/gates/` | Phase 160 | Enables cross-session review; registry entries reference gate_id |

---

## Open Questions

1. **Dynamic tool registration (D-04 literal compliance)**
   - What we know: `useWebMCP()` cannot be called in a loop; individual `query_{name}` tools require N hook calls
   - What's unclear: Whether `@mcp-b/react-webmcp` 2.2.0 supports a batched registration pattern
   - Recommendation: Planner should choose between (a) single `query_competitor_data` dispatcher tool — simpler, React-safe, slightly deviates from D-04 literal naming, or (b) per-tool implementation requiring static N or a registry-driven array initialization at module scope before React renders

2. **Registry read in browser hook**
   - What we know: Other browser tool hooks call API routes in their handler, not at mount time
   - What's unclear: Whether `useCompetitorTools()` needs to read the registry at mount to know which tools to register (vs. at call time)
   - Recommendation: Read registry at call time (inside handler) since tool availability only matters when the tool is called; registration can be a single stable tool stub

3. **barrel export count test**
   - What we know: `webmcp-browser-tools.test.ts` asserts `exportLines.length === 4`
   - What's unclear: Whether this test is in `__tests__/` (scanned by vitest) and will break
   - Recommendation: Planner must update this assertion to 5 in the plan that adds the barrel export

---

## Environment Availability

Step 2.6: SKIPPED — Phase 161 is a code and workflow-text modification phase. No new external CLI tools, databases, or services are introduced. All dependencies (Node.js, npm packages, Next.js, vitest) are already installed and operational.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest (installed) |
| Config file | `dashboard/vitest.config.ts` |
| Quick run command | `cd dashboard && npx vitest run --reporter=verbose 2>&1 \| tail -20` |
| Full suite command | `cd dashboard && npx vitest run 2>&1 \| tail -30` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADV-01 | competitive.md contains Step 8 block with stub generation logic | unit (source inspection) | `cd dashboard && npx vitest run --reporter=verbose -t "workflow.*competitive"` | ❌ Wave 0 |
| ADV-02 | useCompetitorTools hook annotates source: "auto-generated", strips injection patterns (workflow step text) | unit (source inspection) | `cd dashboard && npx vitest run --reporter=verbose -t "use-competitor-tools"` | ❌ Wave 0 |
| ADV-03 | useCompetitorTools only registers approved tools; gate_id format correct | unit (source inspection) | `cd dashboard && npx vitest run --reporter=verbose -t "use-competitor-tools"` | ❌ Wave 0 |
| ADV-04 | Registry file path `.webmcp/competitor-tools-registry.json` referenced in workflow and hook | unit (source inspection) | `cd dashboard && npx vitest run --reporter=verbose -t "competitor"` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `cd dashboard && npx vitest run 2>&1 | tail -20`
- **Per wave merge:** `cd dashboard && npx vitest run 2>&1 | tail -30`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `dashboard/lib/__tests__/competitor-tools.test.ts` — covers ADV-02, ADV-03, ADV-04 (hook source inspection)
- [ ] `dashboard/lib/__tests__/workflow-competitive-stubs.test.ts` — covers ADV-01 (competitive.md Step 8 text inspection)
- [ ] Update `dashboard/__tests__/webmcp-browser-tools.test.ts` — barrel export count assertion: 4 → 5

---

## Sources

### Primary (HIGH confidence)

- Codebase direct inspection — `dashboard/lib/mcp/browser-tools/use-approval-gate-tool.ts`, `use-design-state-tool.ts`, `index.ts`, `hooks/use-webmcp-tools.ts` — verified hook pattern, inputSchema structure, barrel export format
- Codebase direct inspection — `dashboard/app/api/planning/gates/route.ts` — verified gate file format, POST/GET API contract, Clerk auth pattern
- Codebase direct inspection — `workflows/competitive.md` — verified Step 7 handoff point, `--webmcp` flag parsing, USE_WEBMCP variable, existing WebMCP Context section
- Codebase direct inspection — `dashboard/node_modules/@mcp-b/react-webmcp/dist/index.d.ts` — verified `useWebMCP` signature: `useWebMCP<TInputSchema, TOutputSchema>(config: WebMCPConfig, deps?: DependencyList)`
- Codebase direct inspection — `dashboard/vitest.config.ts` — confirmed node environment, `__tests__` glob pattern, no jsdom

### Secondary (MEDIUM confidence)

- `dashboard/lib/__tests__/approval-gate-tool.test.ts`, `workflow-flags.test.ts`, `webmcp-browser-tools.test.ts` — verified source-inspection test pattern used throughout project

### Tertiary (LOW confidence)

- React rules of hooks constraint on dynamic `useWebMCP()` registration — training knowledge; not verified against `@mcp-b/react-webmcp` 2.2.0 internals for any batched-registration API

---

## Project Constraints (from CLAUDE.md)

CLAUDE.md does not exist in the working directory. No project-level directives to extract.

Constraints sourced from `.agent/skills/pde-design/SKILL.md`:
- Zero npm deps at plugin root: Any new dependencies go in isolated subdirectories
- MCP security: Verified-sources-only policy — only official MCP servers from approved vendors

Constraints sourced from accumulated STATE.md decisions:
- `useMcpTool()` central hook is the only registration path — provideContext() is deprecated since March 5, 2026
- inputSchema constants defined at module level in browser tool hooks — prevents zombie re-registration on re-renders
- All tool handlers emit both type: 'resource' rich blocks AND type: 'text' fallbacks — preserves stdio backward compatibility
- Source inspection tests used instead of renderHook — vitest runs in node environment (no DOM/jsdom)
- Test files go in `__tests__/` not `tests/` — vitest.config.ts scans `**/__tests__/**/*.test.ts`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from installed node_modules and existing codebase
- Architecture patterns: HIGH — directly derived from identical patterns in Phases 157–160
- Pitfalls: HIGH — barrel count pitfall verified from test file; hook-in-loop is a React fundamental
- Open questions: MEDIUM — dynamic tool registration pattern is genuinely ambiguous; planner must decide

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable pattern area — @mcp-b/react-webmcp 2.2.0 locked by package.json)
