# Feature Research

**Domain:** Cloud dispatch, git-based .planning/ state sync, container orchestration, and intelligent task routing for AI agent orchestration platform (PDE subsequent milestone)
**Researched:** 2026-03-30
**Confidence:** HIGH — based on official Claude Agent SDK docs, Docker Sandboxes docs, Claude Code Remote Control docs, and corroborating WebSearch

---

## Context: What Already Exists

PDE v0.17–v0.18 shipped a substantial distributed execution foundation. The new milestone builds on top of it — do not re-implement what's already there.

**Already built:**
- Local parallel dispatch with concurrency queue and crash recovery (v0.18)
- Agent SDK orchestrator with DAG analysis and file-overlap detection (v0.18)
- SSH remote dispatch with managed backend fallback chain (v0.18)
- Worktree isolation with single-writer protocol (v0.18)
- PWA dashboard with phase progress, agent activity, approval gates (v0.17)
- Multi-session tmux dashboard with health matrix, progress bars (v0.18)
- 3-way merge for bidirectional sync (v0.16)
- NDJSON event infrastructure with structured event bus (v0.8)
- git-based state sync (basic, via SSH remote dispatch path) (v0.18)

**Not yet built (scope of this milestone):**
- Cloud container dispatch (Agent SDK ephemeral/persistent containers)
- .planning/ state sync across machines without SSH (git-native, cloud-portable)
- Docker-based MCP server isolation and deploy sandboxing
- Intelligent task routing (local vs cloud decision logic)
- Dashboard integration for cloud-dispatched sessions

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users expect from any cloud-capable AI agent platform. Missing these makes the milestone feel incomplete or unshippable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Cloud container dispatch via Agent SDK | The Agent SDK v0.2.71 is designed to run Claude in sandboxed containers — users expect PDE to expose this capability now that it's available | HIGH | Requires container lifecycle management, env propagation, result collection. Officially supported: Modal, Cloudflare, E2B, Fly Machines, Vercel Sandbox, Docker |
| Session state persistence across dispatches | Agent SDK sessions persist to `~/.claude/projects/<cwd>/*.jsonl` — users expect cloud sessions to resume the same context as local ones | MEDIUM | Cross-host session sync requires moving the `.jsonl` to shared storage or capturing results as application state before process exit |
| .planning/ state sync after cloud execution | When a cloud agent modifies `.planning/` files, local state must be updated — git merge (already in v0.16) or volume mount approach | HIGH | The hard problem: git-native sync via push/pull is the most portable; volume mounts only work for local containers |
| Dashboard visibility for cloud sessions | v0.17 PWA and v0.18 tmux dashboard exist — users expect cloud sessions to appear there with same health matrix and progress bars | MEDIUM | Cloud sessions already emit NDJSON via existing event infrastructure; relay bridge needs cloud-side aggregation endpoint |
| Graceful degradation to local when cloud unavailable | If container provider is unreachable or quota exceeded, task should fall back to local dispatch — same pattern as SSH fallback in v0.18 | MEDIUM | Dispatcher already has fallback chain concept; extend to cloud → SSH → local |
| Ephemeral container cleanup | Containers left running after task completion incur cost (~$0.05/hr minimum per official docs) — users expect automatic teardown | LOW | Set maxTurns + container lifecycle hook on ResultMessage; provider-specific shutdown API |
| Cost tracking for cloud sessions | Cloud dispatch adds container costs on top of token costs — users expect both to appear in token/cost metering | MEDIUM | Container cost is provider-dependent; token cost already tracked via v0.8 infrastructure. Need to expose container uptime × rate |

### Differentiators (Competitive Advantage)

Features that make PDE's cloud dispatch meaningfully better than running the Agent SDK directly.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Intelligent task routing (local vs cloud) | Most platforms dispatch everything to cloud or everything locally. PDE can route based on task type: interactive tasks stay local, autonomous long-running phases go cloud — avoiding latency for fast tasks and avoiding laptop dependency for slow ones | HIGH | Router needs: task duration estimate, interactivity signal, cost ceiling from user config. Train on phase metadata (estimated_minutes, agent_type) already in PLAN.md frontmatter |
| Containerized MCP server isolation | MCP servers currently run in host environment — host drift causes probe/degrade failures. Pinned-runtime containers per server (Playwright gets its Chromium, exact Node version) eliminate env parity issues | MEDIUM | Docker Compose with per-server image tags; v0.5 APPROVED_SERVERS list maps cleanly to Compose services. Docker MCP Toolkit provides catalog and gateway layer |
| Docker-based deploy sandbox | Stage 14 scaffold generation + `vercel deploy` today runs in host environment. A scoped container with ephemeral credentials upgrades the existing `deploy-staging/` isolation to true sandbox | MEDIUM | Extends existing deploy-staging/ dir isolation (v0.12); wraps the deploy workflow in ephemeral container with credential scoping |
| AutoResearch visual metrics reproducibility | `_evalMetric` deltas are meaningless if Playwright + fonts differ between runs. Pinned container with same Playwright version and font set makes regression circuit breaker reliable | MEDIUM | Pin to exact Playwright image tag; mount project root read-only for metric scripts. Depends on v0.14 visual regression circuit breaker |
| Git-native .planning/ sync without SSH dependency | v0.18 SSH dispatch requires a managed backend. Git push/pull to a shared remote (GitHub, Gitea) is zero-infrastructure and works for any cloud container. State sync becomes a git operation, which PDE already understands | HIGH | Session worktree pushes to remote branch on completion; orchestrator merges using existing 3-way merge (v0.16). Must handle concurrent branch writes safely |
| Cloud session resume across hosts | Agent SDK sessions are local to the machine that created them. PDE can persist `.jsonl` to shared storage (S3, Upstash Redis) and restore them before `resume` — enabling true multi-machine agent continuity | HIGH | Session file at `~/.claude/projects/<encoded-cwd>/<session-id>.jsonl`; `<encoded-cwd>` path must match on restore host. Official SDK docs confirm this is the correct pattern |
| Parallel agent isolation via containers | Worktrees prevent file conflicts but share network, ports, and temp files. Containers give full isolation: port conflicts between agents impossible, different Node versions possible, temp files don't pollute | MEDIUM | Container-per-worktree pattern; volume mount the worktree dir. Extends v0.18 single-writer protocol to network isolation level |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Always-cloud by default | "Just run everything in the cloud" sounds simpler | Adds container startup latency (cold start: 5–15s) to every task including /pde:quick and /pde:fast paths; eliminates local MCP server access for interactive tasks; kills event bus locality | Opt-in cloud dispatch per task type; fast path stays local always |
| Real-time filesystem sync to cloud | "I want to see file changes live from the cloud agent" | Volume mounts over network have high latency and require always-on connectivity; NFS/SSHFS introduces race conditions with NDJSON event bus | Post-completion pull via git; cloud agent pushes on task boundary, not per-file-write |
| Multi-cloud provider abstraction layer | "Build once, run on Modal, E2B, Fly, Vercel" | Each provider has different API shapes, quota models, and startup behaviors; abstraction layer becomes maintenance burden with no PDE-specific value | Start with one provider (Docker/Fly or E2B); add second only if user demand validates it |
| Container for every PDE operation | "Containerize everything for reproducibility" | Skill file authoring, planning artifacts, and event bus are pure file I/O — containerizing these adds overhead with no isolation benefit; /pde:quick startup latency would increase 10x | Selective containerization: MCP servers, deploy sandbox, AutoResearch metrics, cloud dispatch only |
| Kubernetes orchestration | "K8s for scaling" | PDE is a developer tool, not a multi-tenant SaaS. K8s ops burden far exceeds the concurrency needs; single-user deployments don't need pod autoscaling | Docker Compose for local multi-container; cloud provider's native orchestration for cloud dispatch |
| Stateless cloud agents (no .planning/ persistence) | "Cloud tasks are ephemeral, don't sync state back" | Disconnects cloud execution from PDE's planning state machine — phase transitions, task completions, and artifact generation in cloud would be invisible to local orchestrator | Always sync .planning/ back on task boundary via git push; treat cloud containers like worktrees |

---

## Feature Dependencies

```
[Cloud Container Dispatch]
    └──requires──> [Agent SDK integration (v0.18 ✓)]
    └──requires──> [Container provider account + credentials]
    └──requires──> [.planning/ state sync (git-native)]
                       └──requires──> [3-way merge (v0.16 ✓)]
                       └──requires──> [Git remote (user-provided)]

[Intelligent Task Router]
    └──requires──> [Cloud Container Dispatch]
    └──requires──> [Local dispatch queue (v0.18 ✓)]
    └──requires──> [Task metadata (agent_type, estimated_minutes from PLAN.md)]
    └──enhances──> [SSH fallback chain (v0.18 ✓)]

[Dashboard — Cloud Session Visibility]
    └──requires──> [Cloud Container Dispatch]
    └──requires──> [NDJSON event bus (v0.8 ✓)]
    └──requires──> [PWA dashboard relay (v0.17 ✓)]
    └──enhances──> [Multi-session health matrix (v0.18 ✓)]

[Containerized MCP Servers]
    └──requires──> [Docker on host]
    └──requires──> [APPROVED_SERVERS list (v0.5 ✓)]
    └──enhances──> [MCP probe/degrade contracts (v0.5 ✓)]

[Docker Deploy Sandbox]
    └──requires──> [deploy-staging/ isolation (v0.12 ✓)]
    └──requires──> [Docker on host]
    └──enhances──> [Stage 14 deploy workflow (v0.12 ✓)]

[AutoResearch Container]
    └──requires──> [Docker on host]
    └──requires──> [Visual regression circuit breaker (v0.14 ✓)]
    └──enhances──> [_evalMetric scripts (v0.14 ✓)]

[Cloud Session Resume]
    └──requires──> [Cloud Container Dispatch]
    └──requires──> [Shared session storage (S3 / Upstash Redis)]
    └──requires──> [Session ID capture on ResultMessage]
    └──enhances──> [Session continuation (Agent SDK sessions)]

[Cost Tracking — Container Layer]
    └──requires──> [Cloud Container Dispatch]
    └──requires──> [Token/cost metering (v0.8 ✓)]
    └──enhances──> [Token Playground (v0.19 ✓)]
```

### Dependency Notes

- **Cloud Container Dispatch requires .planning/ state sync:** Cloud agents that modify planning state must sync back or the local orchestrator is blind to what they did. Git-native sync (push on task boundary) is the only zero-infrastructure option.
- **Intelligent Task Router requires Cloud Container Dispatch:** Routing logic is only meaningful if both destinations exist. Implement dispatch first, router second.
- **Containerized MCP Servers do not require Cloud Container Dispatch:** They run locally in Docker. Independent feature that can ship earlier if Docker is already a dependency.
- **Docker Deploy Sandbox conflicts with zero-npm-dependencies constraint:** PDE currently has zero npm dependencies. Docker adds an external runtime dependency. This must be opt-in, not required for the non-deploy path.
- **Cross-host session resume requires matching cwd encoding:** Agent SDK stores sessions at `~/.claude/projects/<cwd-encoded>/<id>.jsonl` where encoding replaces non-alphanumeric chars with `-`. The restore host must use the same absolute path or session is orphaned (official SDK warning).

---

## MVP Definition

### Launch With (v1 of this milestone)

Minimum viable set that delivers cloud dispatch as a working, integrated feature.

- [ ] Cloud container dispatch for autonomous phases — users can `--dispatch=cloud` on a plan-phase to offload to an ephemeral container; result syncs back via git
- [ ] Git-native .planning/ state sync — cloud container pushes to a remote branch on task completion; orchestrator merges using 3-way merge
- [ ] Dashboard visibility for cloud sessions — cloud session NDJSON relays through existing v0.17 event relay; health matrix shows [C] source label (cloud) alongside [L]/[R]
- [ ] Graceful fallback chain — cloud → SSH → local with same degradation UX as v0.18 SSH fallback
- [ ] Ephemeral container cleanup — auto-teardown on ResultMessage, configurable idle timeout
- [ ] Cost tracking for containers — uptime × provider rate emitted as cost event alongside token cost

### Add After Validation (v1.x)

Features to add once core cloud dispatch is validated in production use.

- [ ] Intelligent task router — automatic local-vs-cloud routing based on task duration estimate and agent_type; trigger when routing config is set
- [ ] Containerized MCP server isolation — add once Docker is already a confirmed dependency from cloud dispatch; wrap APPROVED_SERVERS in per-server containers
- [ ] Cross-host session resume — add shared session storage once multi-machine use cases are validated; start with Upstash Redis (already used in v0.19 Token Playground)

### Future Consideration (v2+)

Features to defer until product-market fit for cloud dispatch is established.

- [ ] Docker deploy sandbox — low priority until Stage 14 deploy failures attributable to host environment drift are reported; depends on Docker already being present
- [ ] AutoResearch container for visual metrics — defer until metric reproducibility failures are reported; pinned container solves a real problem but only if it's actually occurring
- [ ] Multi-provider cloud dispatch — add second provider (E2B, Modal) only if user demand demonstrates provider-specific needs; start with one

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Cloud container dispatch | HIGH | HIGH | P1 |
| Git-native .planning/ state sync | HIGH | HIGH | P1 |
| Dashboard — cloud session visibility | HIGH | MEDIUM | P1 |
| Graceful fallback chain (cloud→SSH→local) | HIGH | LOW | P1 |
| Ephemeral container cleanup | MEDIUM | LOW | P1 |
| Cost tracking — container layer | MEDIUM | LOW | P1 |
| Intelligent task router | HIGH | HIGH | P2 |
| Containerized MCP server isolation | MEDIUM | MEDIUM | P2 |
| Cross-host session resume | MEDIUM | MEDIUM | P2 |
| Docker deploy sandbox | LOW | MEDIUM | P3 |
| AutoResearch pinned container | LOW | LOW | P3 |
| Multi-provider abstraction | LOW | HIGH | P3 — Anti-feature risk |

**Priority key:**
- P1: Must have for launch — milestone is not shippable without these
- P2: Should have — add when P1 is stable
- P3: Nice to have — future consideration

---

## Competitor Feature Analysis

| Feature | claude --remote (Anthropic) | Open-source dispatch tools | PDE Approach |
|---------|-----------------------------|-----------------------------|--------------|
| Cloud execution model | Outbound HTTPS relay — session stays local, messages bridge to mobile | Container-per-task, various providers | Ephemeral containers via Agent SDK; tasks truly cloud-hosted, not just mirrored |
| State sync | Session state only (conversation JSON); filesystem stays local | git worktrees per agent; merge on completion | Git-native .planning/ sync; extends existing 3-way merge |
| Dashboard integration | iOS/Android Claude app + claude.ai/code | Custom NDJSON tailing, ad-hoc | Existing PWA + tmux dashboard; [C] label for cloud sessions |
| Task routing | None — user decides where to connect | Manual config per tool | Automatic routing from task metadata (agent_type, estimated_minutes) |
| MCP server access | Full — MCP stays local | Provider-dependent | Containerized MCP servers with pinned runtimes; or local MCP via relay |
| Session resume | Yes, via outbound relay | Session ID + JSONL portability | Cross-host via shared session storage (Upstash Redis pattern) |
| Cost | Pro/Max subscription required | Container provider rate + token cost | Container rate + token cost; both tracked in existing metering |

---

## Sources

- [Claude Agent SDK — Hosting Guide](https://platform.claude.com/docs/en/agent-sdk/hosting) — container patterns, sandbox providers, ephemeral vs persistent sessions, resource specs (HIGH confidence)
- [Claude Agent SDK — Sessions Guide](https://platform.claude.com/docs/en/agent-sdk/sessions) — session resume/fork, cross-host session sync, `~/.claude/projects/<cwd>/*.jsonl` storage (HIGH confidence)
- [Claude Agent SDK — Overview](https://platform.claude.com/docs/en/agent-sdk/overview) — capabilities, subagents, hooks, MCP integration, TypeScript v0.2.71 (HIGH confidence)
- [Claude Code Remote Control Guide (2026)](https://claudefa.st/blog/guide/development/remote-control-guide) — outbound HTTPS relay architecture, limitations, mobile access model (MEDIUM confidence)
- [Docker Sandboxes Docs](https://docs.docker.com/ai/sandboxes/) — microVM isolation, ephemeral vs persistent, MCP server sandboxing (HIGH confidence)
- [Docker — Sandboxing AI Agents Safety (2026)](https://www.docker.com/blog/docker-sandboxes-a-new-approach-for-coding-agent-safety/) — workspace sync, per-sandbox private Docker daemons (MEDIUM confidence)
- [AWS Prescriptive Guidance — Routing Dynamic Dispatch Patterns](https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/routing-dynamic-dispatch-patterns.html) — capability-based routing patterns, event-driven dispatch (HIGH confidence)
- [Northflank — How to sandbox AI agents (2026)](https://northflank.com/blog/how-to-sandbox-ai-agents) — MicroVM vs gVisor vs container isolation comparison (MEDIUM confidence)
- [Microsoft Swarm Diaries — git branch per agent](https://techcommunity.microsoft.com/blog/appsonazureblog/the-swarm-diaries-what-happens-when-you-let-ai-agents-loose-on-a-codebase/4501393) — git branch isolation pattern, merge-first strategy (MEDIUM confidence)

---
*Feature research for: PDE cloud dispatch, .planning/ state sync, container orchestration, intelligent task routing*
*Researched: 2026-03-30*
