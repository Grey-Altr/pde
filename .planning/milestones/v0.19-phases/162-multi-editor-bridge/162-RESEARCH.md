# Phase 162: Multi-Editor Bridge - Research

**Researched:** 2026-03-28
**Domain:** MCP relay guard / mcp-bridge.cjs APPROVED_SERVERS / Cursor + Gemini CLI remote MCP config
**Confidence:** HIGH (all three requirements grounded in existing codebase patterns; relay depth guard is custom infrastructure with no external library needed)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None — auto-generated phase (discuss skipped). All implementation choices are at Claude's discretion.

### Claude's Discretion
All implementation choices. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

### Deferred Ideas (OUT OF SCOPE)
None — discuss phase skipped.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MEB-01 | Cursor and Gemini CLI can access PDE tools via WebMCP relay endpoint | Cursor uses `"url"` key in `.cursor/mcp.json`; Gemini CLI uses `"httpUrl"` in `settings.json`. Both support Streamable HTTP natively. Auth handled via OAuth 2.1 discovery from existing Clerk `.well-known` endpoints. |
| MEB-02 | Relay includes X-PDE-Relay-Depth header guard preventing circular relay cycles | Custom guard in `guardedHandler` in `route.ts` — same pattern as `validateOrigin`. Read `X-PDE-Relay-Depth` header, reject with 400 if value >= 1 (any relay-to-relay request). Forward header with incremented value when PDE itself makes outbound relay calls (not applicable in current tool set). |
| MEB-03 | mcp-bridge.cjs APPROVED_SERVERS updated with remote MCP server entry | Follow existing entry shape: `displayName`, `transport: 'http'`, `url`, `installCmd`, `probeTimeoutMs`, `probeTool`, `probeArgs`. Use `get_project_state` as probeTool (lightest registered tool). |
</phase_requirements>

---

## Summary

Phase 162 is a narrow infrastructure wire-up across three distinct areas: (1) an APPROVED_SERVERS entry in `mcp-bridge.cjs` so Claude Code can route requests to the PDE remote server through the existing bridge; (2) a relay depth guard in the MCP route handler preventing circular chains; and (3) example config files and docs for Cursor and Gemini CLI users.

The APPROVED_SERVERS addition is mechanical: it follows the identical shape of the eight existing entries (github, linear, figma, pencil, atlassian, stitch, greptile, playwright). The relay depth guard is a four-line check added to `guardedHandler` in `route.ts`, parallel to the existing `validateOrigin` call. No new packages are required for either.

Cursor supports Streamable HTTP natively: the `.cursor/mcp.json` format uses a `"url"` key. Gemini CLI uses `"httpUrl"` for Streamable HTTP. Both clients support OAuth 2.1 discovery, which the existing Clerk `.well-known` endpoints already satisfy. This means no auth plumbing changes are needed in the server — the existing `withMcpAuth` + Clerk setup is sufficient for both clients.

The relay depth guard pattern does not exist as an off-the-shelf library. It is a simple header inspection: read `X-PDE-Relay-Depth`, if integer value >= 1 return 400 with a descriptive error. This is analogous to how HTTP proxies use `Via` and `X-Forwarded-For` to detect loops, applied to the MCP relay context. Setting the header to `"1"` on the way out is only needed if PDE itself relays outward, which it does not in the current tool set — so the guard is read-only for now.

**Primary recommendation:** Three independent tasks: (1) add `pde-remote` entry to APPROVED_SERVERS in `mcp-bridge.cjs`; (2) add relay depth guard to `guardedHandler` in `route.ts` and a corresponding test; (3) update `docs/mcp-desktop-client-config.md` with Cursor and Gemini CLI config blocks.

---

## Standard Stack

### Core (no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `mcp-handler` | 1.1.0 (already installed) | MCP route handler — `guardedHandler` is where the relay guard goes | Already provides the request pipeline |
| `@modelcontextprotocol/sdk` | 1.28.0 (already installed) | MCP server primitives | Already installed |
| `@clerk/mcp-tools` | 0.3.1 (already installed) | OAuth metadata endpoints — satisfies Cursor/Gemini CLI OAuth discovery | Already satisfies MEB-01 auth requirement |

### No New Packages Required

All three requirements are satisfied by editing existing files only:
- `bin/lib/mcp-bridge.cjs` — add APPROVED_SERVERS entry
- `dashboard/app/api/mcp/route.ts` — add relay depth guard to `guardedHandler`
- `dashboard/__tests__/mcp-relay-depth.test.ts` — new test file (Wave 0 gap)
- `docs/mcp-desktop-client-config.md` — add Cursor and Gemini CLI sections

---

## Architecture Patterns

### Existing guardedHandler Structure

```typescript
// Source: dashboard/app/api/mcp/route.ts (current)
async function guardedHandler(req: Request) {
  const rejection = validateOrigin(req);
  if (rejection) return rejection;
  return authHandler(req);
}
```

The relay depth guard slots in exactly like `validateOrigin`:

```typescript
// Pattern for relay depth guard (MEB-02)
function validateRelayDepth(req: Request): Response | null {
  const depthHeader = req.headers.get('x-pde-relay-depth');
  if (depthHeader !== null) {
    const depth = parseInt(depthHeader, 10);
    if (!isNaN(depth) && depth >= 1) {
      return new Response(
        JSON.stringify({ error: 'relay_depth_exceeded', depth }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
  return null;
}

async function guardedHandler(req: Request) {
  const originRejection = validateOrigin(req);
  if (originRejection) return originRejection;

  const relayRejection = validateRelayDepth(req);
  if (relayRejection) return relayRejection;

  return authHandler(req);
}
```

The guard runs BEFORE auth — a circular relay attempt is denied cheaply without burning Clerk token validation. Depth >= 1 is the threshold: 0 = first relay hop (allowed), 1 = second relay hop (denied). A direct Cursor/Gemini CLI request that does not pass this header at all is allowed (null check first).

### APPROVED_SERVERS Entry Pattern

```javascript
// Source: bin/lib/mcp-bridge.cjs (existing pattern)
pde_remote: {
  displayName: 'PDE Remote',
  transport: 'http',
  url: process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/mcp`
    : 'https://your-dashboard.vercel.app/api/mcp',
  installCmd: 'claude mcp add pde-remote --transport http https://your-dashboard.vercel.app/api/mcp',
  probeTimeoutMs: 10000,
  probeTool: 'mcp__pde_remote__get_project_state',
  probeArgs: {},
},
```

Key decisions:
- `transport: 'http'` — matches Claude Code `--transport http` flag
- `probeTool`: `get_project_state` is the lightest registered PDE tool (no args, no Redis, no side effects). The Claude Code mcp__ prefix pattern for a server named `pde-remote` is `mcp__pde_remote__get_project_state` (hyphens become underscores).
- `url`: Use env var with fallback — makes the entry functional in both local dev and production without hardcoding.
- `installCmd`: Canonical install command documented in `docs/mcp-desktop-client-config.md`.

### Cursor Config Format

```json
// .cursor/mcp.json
{
  "mcpServers": {
    "pde-remote": {
      "url": "https://your-dashboard.vercel.app/api/mcp"
    }
  }
}
```

Cursor uses `"url"` (not `"type": "http"`) for Streamable HTTP. OAuth is handled automatically via Cursor's OAuth 2.1 client using the `.well-known/oauth-authorization-server` endpoint that Clerk provides.

### Gemini CLI Config Format

```json
// ~/.gemini/settings.json (or project-level .gemini/settings.json)
{
  "mcpServers": {
    "pde-remote": {
      "httpUrl": "https://your-dashboard.vercel.app/api/mcp",
      "timeout": 30000
    }
  }
}
```

Gemini CLI distinguishes `"url"` (SSE) from `"httpUrl"` (Streamable HTTP). Use `"httpUrl"` for PDE since the endpoint is Streamable HTTP. OAuth is handled via `authProviderType: "dynamic_discovery"` (default) — Gemini CLI auto-discovers from `.well-known`.

### Anti-Patterns to Avoid

- **Using `"type": "http"` in Cursor config**: Cursor does not use a `"type"` discriminator for HTTP — use `"url"` only.
- **Rejecting null `X-PDE-Relay-Depth`**: A missing header is not a relay — it is a direct client request. Only reject when header is present AND depth >= 1.
- **Rejecting depth = 0**: Depth 0 is the first relay hop (the Cursor or Gemini CLI client relaying to PDE). That is the intended use case — it must be allowed.
- **Using `"url"` in Gemini CLI for Streamable HTTP**: Gemini CLI interprets `"url"` as SSE transport. Use `"httpUrl"` for Streamable HTTP.
- **Hardcoding deployment URL in APPROVED_SERVERS**: Use env var with fallback to avoid breaking local dev.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth for Cursor/Gemini CLI | Custom OAuth server | Existing Clerk `.well-known` endpoints + `withMcpAuth` | Already satisfies RFC 9728 — clients discover OAuth endpoints automatically |
| Relay loop detection algorithm | Graph-based cycle detection | Simple integer depth check on `X-PDE-Relay-Depth` header | PDE is a leaf relay node — it receives requests, does not chain outward. A single integer guard is sufficient and cannot be gamed (server sets it, not client). |
| New guard middleware abstraction | Generic middleware pipeline | Single inline check in `guardedHandler` matching `validateOrigin` pattern | Three guards total (origin, relay depth, auth) — a pipeline abstraction is premature. |

---

## Common Pitfalls

### Pitfall 1: Wrong Gemini CLI field name
**What goes wrong:** Using `"url"` instead of `"httpUrl"` in Gemini CLI config sends the connection through SSE transport, not Streamable HTTP. SSE to a Streamable HTTP endpoint may fail or behave unexpectedly.
**Why it happens:** Gemini CLI uses different field names for SSE vs Streamable HTTP, unlike Cursor which uses `"url"` for both.
**How to avoid:** Always use `"httpUrl"` for PDE's Streamable HTTP endpoint in Gemini CLI config.
**Warning signs:** Gemini CLI connects but tool calls time out or return transport errors.

### Pitfall 2: Relay depth guard rejects direct client requests
**What goes wrong:** Guard rejects Cursor/Gemini CLI requests because they don't send `X-PDE-Relay-Depth: 0` — they send no header at all.
**Why it happens:** Misreading the requirement — "relay depth >= 1 is circular" does not mean "depth = 0 is required". Direct clients send no header.
**How to avoid:** Guard logic: `if (header !== null && parseInt(header) >= 1) → reject`. No header = allowed. Header = "0" = allowed. Header = "1" or higher = reject.
**Warning signs:** All Cursor/Gemini CLI requests get 400 immediately.

### Pitfall 3: probeTool name mismatch in APPROVED_SERVERS
**What goes wrong:** `mcp__pde_remote__get_project_state` is the tool name Claude Code uses when the server is registered as `pde-remote`. If the server key in APPROVED_SERVERS is different, the prefix will differ.
**Why it happens:** Claude Code constructs the `mcp__*__*` prefix from the server registration name (hyphens → underscores).
**How to avoid:** Use `pde_remote` as the APPROVED_SERVERS key (or `pde-remote` — verify Claude Code's naming behavior). The probeTool field is informational for documentation; the actual probe call is made by Claude Code at the workflow layer.
**Warning signs:** `assertApproved('pde_remote')` throws POLICY_VIOLATION.

### Pitfall 4: Auth guard runs before relay depth guard
**What goes wrong:** A circular relay attempt from a misconfigured client burns a Clerk token validation round-trip before being rejected.
**Why it happens:** Wrong order of checks in `guardedHandler`.
**How to avoid:** Order is `validateOrigin` → `validateRelayDepth` → `authHandler`. Cheapest checks first.

---

## Code Examples

### Full relay depth guard function + updated guardedHandler

```typescript
// Source: pattern from dashboard/lib/mcp/origin-guard.ts (adapted)
// Location: dashboard/app/api/mcp/route.ts

export const RELAY_DEPTH_LIMIT = 1; // reject any depth >= 1

function validateRelayDepth(req: Request): Response | null {
  const depthHeader = req.headers.get('x-pde-relay-depth');
  if (depthHeader === null) return null; // direct client — always allowed

  const depth = parseInt(depthHeader, 10);
  if (isNaN(depth) || depth < RELAY_DEPTH_LIMIT) return null; // 0 = first hop, allowed

  return new Response(
    JSON.stringify({ error: 'relay_depth_exceeded', received_depth: depth }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}

async function guardedHandler(req: Request) {
  const originRejection = validateOrigin(req);
  if (originRejection) return originRejection;

  const relayRejection = validateRelayDepth(req);
  if (relayRejection) return relayRejection;

  return authHandler(req);
}
```

### Test pattern for relay depth guard

```typescript
// Source: pattern from dashboard/__tests__/mcp-origin-guard.test.ts
// Location: dashboard/__tests__/mcp-relay-depth.test.ts

import { describe, it, expect } from 'vitest';

// validateRelayDepth is not exported from route.ts — test via source inspection
// OR extract validateRelayDepth to dashboard/lib/mcp/relay-depth-guard.ts

describe('validateRelayDepth', () => {
  it('returns null when X-PDE-Relay-Depth header is absent', () => {
    const req = new Request('http://x');
    // ... expect null
  });

  it('returns null when X-PDE-Relay-Depth is 0', () => {
    const req = new Request('http://x', { headers: { 'x-pde-relay-depth': '0' } });
    // ... expect null
  });

  it('returns 400 when X-PDE-Relay-Depth is 1', () => {
    const req = new Request('http://x', { headers: { 'x-pde-relay-depth': '1' } });
    // ... expect 400
  });

  it('returns 400 when X-PDE-Relay-Depth is 5', () => {
    const req = new Request('http://x', { headers: { 'x-pde-relay-depth': '5' } });
    // ... expect 400
  });
});
```

**Extraction decision:** Extract `validateRelayDepth` to `dashboard/lib/mcp/relay-depth-guard.ts` — parallel to `origin-guard.ts` — so it can be directly imported and tested without mocking the full route module. This matches the existing `origin-guard.ts` pattern exactly.

### APPROVED_SERVERS entry (bin/lib/mcp-bridge.cjs)

```javascript
pde_remote: {
  displayName: 'PDE Remote',
  transport: 'http',
  url: null, // URL is deployment-specific; set via installCmd or config
  installCmd: 'claude mcp add pde-remote --transport http https://your-dashboard.vercel.app/api/mcp',
  probeTimeoutMs: 10000,
  probeTool: 'mcp__pde_remote__get_project_state',
  probeArgs: {},
},
```

Note on `url: null`: Several existing entries (pencil, stitch, playwright) use `url: null` because the URL is configuration-dependent. PDE remote URL varies per deployment. Using `null` is consistent and avoids hardcoding a URL that differs between dev and production. The `installCmd` carries the example URL.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified — all changes are code-only edits to existing files; no new services, CLIs, or runtimes required).

---

## Validation Architecture

`nyquist_validation` is enabled (config.json has `"nyquist_validation": true`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 |
| Config file | `dashboard/vitest.config.ts` |
| Quick run command | `cd dashboard && npm test -- --run __tests__/mcp-relay-depth.test.ts` |
| Full suite command | `cd dashboard && npm test -- --run __tests__/mcp-*.test.ts __tests__/server-factory.test.ts` |

Test environment is `node` (no DOM/jsdom). Source-inspection tests are the project pattern for modules that cannot be rendered.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MEB-01 | Cursor/Gemini CLI connect via OAuth + Streamable HTTP | manual-only | N/A — requires live Clerk + deployed endpoint | N/A |
| MEB-02 | X-PDE-Relay-Depth guard rejects depth >= 1, allows null/0 | unit | `cd dashboard && npm test -- --run __tests__/mcp-relay-depth.test.ts` | Wave 0 gap |
| MEB-03 | APPROVED_SERVERS contains pde_remote entry | source-inspection | `cd dashboard && npm test -- --run __tests__/mcp-bridge-pde-remote.test.ts` | Wave 0 gap |

MEB-01 cannot be automated without a live deployed Clerk environment — this is consistent with existing pattern (`mcp-route.test.ts` marks integration tests as `.todo`). Unit tests for the relay guard and source-inspection test for APPROVED_SERVERS are sufficient.

### Sampling Rate
- **Per task commit:** `cd dashboard && npm test -- --run __tests__/mcp-relay-depth.test.ts`
- **Per wave merge:** `cd dashboard && npm test -- --run __tests__/mcp-*.test.ts`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `dashboard/__tests__/mcp-relay-depth.test.ts` — covers MEB-02 (relay depth guard unit tests)
- [ ] `dashboard/__tests__/mcp-bridge-pde-remote.test.ts` — covers MEB-03 (APPROVED_SERVERS source inspection)

*(The relay depth guard module `dashboard/lib/mcp/relay-depth-guard.ts` must also be created in Wave 0 so the test can import it directly.)*

---

## Open Questions

1. **APPROVED_SERVERS key: `pde_remote` vs `pde-remote`?**
   - What we know: All existing keys use underscores (`pde_remote` pattern): `github`, `linear`, `figma`, `pencil`, `atlassian`, `stitch`, `greptile`, `playwright` — all lowercase, all single words (no separator needed yet).
   - What's unclear: This is the first multi-word key. Either `pde_remote` (underscore) or `pde-remote` (hyphen) works. The `assertApproved()` call uses an exact string match.
   - Recommendation: Use `pde_remote` (underscore) to match the `mcp__pde_remote__*` Claude Code tool prefix convention. The `installCmd` uses `pde-remote` as the server registration name in `claude mcp add` — that name is independent of the APPROVED_SERVERS key.

2. **Should `validateRelayDepth` live in `route.ts` inline or in a separate file?**
   - What we know: `validateOrigin` is in a separate file (`lib/mcp/origin-guard.ts`) and tested via direct import. Inline functions in `route.ts` cannot be imported for unit testing without mocking the full module.
   - What's unclear: Whether a separate file is worth the overhead for a 10-line function.
   - Recommendation: Use a separate `dashboard/lib/mcp/relay-depth-guard.ts` file, exactly mirroring `origin-guard.ts`. This maintains the existing test pattern and keeps `route.ts` clean.

---

## Sources

### Primary (HIGH confidence)
- `bin/lib/mcp-bridge.cjs` — APPROVED_SERVERS schema and pattern (read directly)
- `dashboard/app/api/mcp/route.ts` — guardedHandler structure (read directly)
- `dashboard/lib/mcp/origin-guard.ts` — guard pattern to mirror for relay depth (read directly)
- `dashboard/__tests__/mcp-origin-guard.test.ts` — test pattern to mirror for relay depth tests (read directly)
- Phase 156 RESEARCH.md and 156-03-PLAN.md — desktop client config docs already written (read directly)

### Secondary (MEDIUM confidence)
- [Cursor MCP docs](https://cursor.com/docs/context/mcp) — verified `"url"` field for Streamable HTTP config
- [Gemini CLI MCP docs](https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html) — verified `"httpUrl"` field for Streamable HTTP; `"url"` = SSE
- WebFetch of official Cursor docs — confirmed OAuth 2.1 auto-discovery, `url` field required

### Tertiary (LOW confidence)
- N/A — all critical claims verified at HIGH or MEDIUM

---

## Metadata

**Confidence breakdown:**
- MEB-03 (APPROVED_SERVERS): HIGH — direct codebase pattern, mechanical addition
- MEB-02 (relay depth guard): HIGH — simple header check, mirrored from `validateOrigin`, no external dependencies
- MEB-01 (Cursor/Gemini CLI config): MEDIUM-HIGH — Cursor `"url"` and Gemini CLI `"httpUrl"` verified against official docs; OAuth discovery compatibility inferred from RFC 9728 compliance of existing `.well-known` endpoints

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable MCP spec, stable Cursor/Gemini CLI config format)
