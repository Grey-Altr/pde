# Feature Research: PDE Remote Dashboard PWA

**Domain:** Real-time agent monitoring dashboard (PWA) for AI development orchestrator
**Researched:** 2026-03-24
**Confidence:** HIGH (core features), MEDIUM (PWA platform specifics due to iOS flux)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Live session status** | Primary reason to open the app — "is my agent still running?" | LOW | Single SSE connection, card showing active/idle/error/complete |
| **Phase/plan progress** | Users track multi-phase pipelines; tmux dashboard already shows this | MEDIUM | Progress bar per phase, nested plan/wave hierarchy, must handle reconnection mid-pipeline |
| **Token/cost meter** | Cost visibility is a PDE core feature; users check this obsessively | LOW | Running total + rate display, already emitted in NDJSON events |
| **Approval gate actions** | The killer use case — approve/deny from phone while away from desk | MEDIUM | Requires bidirectional communication (SSE for notification + POST for action), push notification trigger |
| **Session list** | Users run multiple sessions; need to pick which one to monitor | LOW | List of active sessions with status badges, tap to connect |
| **PWA installability** | Users expect "Add to Home Screen" for a monitoring tool | LOW | Web App Manifest + service worker registration, standard Next.js PWA setup |
| **Push notifications** | Users need alerts when approval gates fire or errors occur | MEDIUM | Web Push API + VAPID keys, requires service worker, iOS requires home screen install |
| **Auto-reconnection** | Network drops on mobile are constant; SSE has built-in reconnect but UI must handle gracefully | LOW | EventSource auto-reconnects with exponential backoff; UI shows "reconnecting..." state |
| **Responsive mobile layout** | This is a phone-first tool | MEDIUM | Card-based layout, bottom navigation, touch targets >= 44px |

### Differentiators (Competitive Advantage)

Features that set the product apart from generic dashboards.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Live log stream** | See what the agent is doing in real-time, like watching a terminal — unique to agent monitoring | MEDIUM | Virtualized scrolling list of recent events, auto-scroll with "pin to bottom", filter by event type |
| **File change feed** | See which files the agent touched, not just that it's running | LOW | List of file paths with operation type (create/edit/delete), derived from existing `file_changed` events |
| **Session timeline** | Chronological view of an entire session: phases, plans, waves, tool calls, approvals — like a build log but for agent work | HIGH | Collapsible timeline component, aggregates multiple event types, must handle 100s of events performantly |
| **Cost projection** | "At this rate, this session will cost $X" — no CI/CD tool does this | LOW | Simple extrapolation from tokens/minute rate, already have the data |
| **Multi-session overview** | Dashboard-of-dashboards: see all active sessions at once with key metrics | MEDIUM | Grid of session cards, each with mini-status (phase, cost, last activity), auto-updates |
| **Offline event buffer** | If phone goes offline, queue approval actions and fire when reconnected | MEDIUM | Service worker background sync (Android only — iOS does NOT support this), IndexedDB queue |
| **Sound/haptic alerts** | Vibrate on approval gate, distinct sound per event severity — phone in pocket awareness | LOW | Web Vibration API (Android), Audio API, user preference toggle |
| **Session history** | Review completed sessions: what ran, what it cost, how long — post-mortem from phone | MEDIUM | Stored session summaries, list view with search/filter, tap for timeline replay |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Full terminal emulation** | "I want to see exactly what tmux shows" | Mobile screens cannot render 7-pane tmux layouts; tiny text is unreadable; massive data transfer | Card-based summary views that surface the same data in mobile-native patterns |
| **Remote code editing** | "Let me edit files from my phone" | Touch keyboards are terrible for code; merge conflicts with running agent; scope explosion | Read-only file diff viewer showing what the agent changed |
| **WebSocket bidirectional streaming** | "SSE is one-way, we need WebSockets" | Adds complexity without benefit — the only client-to-server action is approval gate responses, which are simple POST requests | SSE for server-to-client events + REST endpoints for actions |
| **Real-time syntax-highlighted diffs** | "Show me the actual code changes live" | Rendering diffs of large files on mobile is expensive and mostly unreadable | File change summary (path + operation), with optional "view diff" that lazy-loads on tap |
| **Chat/messaging with agent** | "Let me send instructions from my phone" | Scope creep into IDE territory; agent context window management from mobile is a UX nightmare | Approval gates (approve/deny/defer) are the bounded interaction model |
| **Native iOS/Android app** | "PWA feels second-class on iOS" | 6-12 month native development cycle per platform; PWA covers 90% of use case | PWA first (already decided), revisit native in second-to-last milestone per project memory |
| **Background sync on iOS** | "Queue actions while offline on iPhone" | iOS does not support Background Sync API and has no timeline to add it | Show clear "you are offline" state on iOS; actions require connectivity |

## PWA Browser Support Matrix

Verified against multiple 2026 sources. Critical for feature scoping.

| Capability | Chrome (Android) | Safari (iOS 16.4+, non-EU) | Safari (iOS 17.4+, EU) | Chrome/Edge (Desktop) |
|------------|-----------------|---------------------------|----------------------|---------------------|
| Service Workers | YES | YES | YES | YES |
| Web App Manifest | YES | YES | Partial | YES |
| Push Notifications | YES | YES (home screen only) | **NO** | YES |
| Standalone Mode | YES | YES | **NO** (opens Safari tab) | YES |
| Background Sync | YES | **NO** | **NO** | YES |
| Offline Caching | YES | YES (7-day expiry, 50MB cap) | YES | YES |
| Badging API | YES | YES | **NO** | YES |
| Install Prompt | YES (automatic) | **NO** (manual share menu) | **NO** | YES |
| Vibration API | YES | **NO** | **NO** | Partial |

**Key implications:**
- iOS users MUST add to home screen before push works (non-EU only)
- EU iOS users get a degraded experience — plan for graceful fallback
- iOS has NO background sync — offline action queueing is Android/desktop only
- iOS cache expires after 7 days of inactivity — service worker must be resilient
- No install prompt on iOS — need in-app banner with instructions

## Approval Gate Interaction Model

The approval gate is the highest-value feature. Patterns from CI/CD tools inform the design.

### How CI/CD Tools Handle Approvals

| Tool | Mechanism | Mobile UX | Lessons |
|------|-----------|-----------|---------|
| **GitHub Actions** | Environment protection rules, required reviewers | GitHub mobile app notification, tap to review, approve button | Clear context (what's being approved), single-tap action, notification links directly to approval |
| **CircleCI** | Manual approval jobs in workflows | Email/Slack notification with link | Shows the "plan" before approval — what will happen if approved |
| **Railway** | Deploy previews with promote-to-production | Native iOS app with real-time status | Mobile-native experience with clear deploy state |
| **Vercel** | Preview deployments, promotion | Dashboard shows deploy state | SWR for real-time updates, progressive loading |

### PDE Approval Gate Design

**Notification flow:**
1. PDE emits `approval_required` event via NDJSON
2. SSE pushes event to connected PWA clients
3. Service worker fires Web Push notification (even if PWA is closed)
4. Notification body: "[Session Name] needs approval: [gate description]"
5. Tap notification opens PWA directly to approval view

**Approval view must include:**
- What is being approved (human-readable gate description)
- Current session context (which phase, what's been done so far)
- Cost so far / projected cost
- Three actions: **Approve**, **Deny**, **Defer** (snooze for N minutes)
- Confirmation step to prevent accidental taps

**Critical: approval must be idempotent.** Network retries on mobile are common — double-tap or retry after timeout must not cause duplicate approvals.

## Real-World Dashboard Analysis

### Vercel Dashboard
- **Pattern:** Card-based project overview, click-to-expand deployment details
- **Real-time:** SWR (stale-while-revalidate) for near-real-time updates, not true streaming
- **Mobile:** Responsive sidebar collapses to hamburger menu, full-width cards on mobile
- **Lesson:** Progressive disclosure works — show status at a glance, details on tap

### Railway Dashboard + Station (iOS app)
- **Pattern:** Project cards with environment badges, real-time log streaming via WebSocket
- **Real-time:** True streaming for logs, polling for project status
- **Mobile:** Native iOS app with bottom tab navigation, expandable log entries with metadata
- **Lesson:** Dedicated mobile app elevates the experience, but their web dashboard is also responsive. Log streaming with expandable entries is the right pattern for event feeds.

### Linear Mobile
- **Pattern:** Bottom toolbar navigation, frosted glass material design, custom native UI
- **Real-time:** Push notifications for updates, real-time sync when app is active
- **Mobile:** Built native (Swift/Kotlin), not PWA — but UX patterns transfer
- **Lesson:** Bottom navigation for core workflows, persistent "create" action, gesture-based interactions. Customize navigation items for personal workflow.

### GitHub Actions (Mobile)
- **Pattern:** Workflow run list with status badges, tap for step-level detail, approval inline
- **Real-time:** Push notification for required approvals, pull-to-refresh for status
- **Mobile:** Native GitHub mobile app handles approvals with single-screen context + action
- **Lesson:** Approval context and action on one screen. Don't make users navigate to approve.

## Mobile-First Dashboard UI Patterns

Based on 2025-2026 dashboard design research, these patterns dominate for mobile monitoring tools.

### Layout Pattern: Card-Based Status Feed
**Use for PDE:** Primary layout. Each session gets a status card showing: session name, current phase, progress %, cost, last activity timestamp, approval badge if pending.
- Cards are tap targets (>= 44px height)
- Swipe gestures for quick actions (dismiss notification, snooze)
- Pull-to-refresh as backup to SSE auto-updates

### Navigation Pattern: Bottom Tab Bar
**Use for PDE:** 4 tabs maximum on mobile
1. **Dashboard** — Active sessions overview (card grid)
2. **Session** — Deep view of selected session (timeline + events)
3. **Approvals** — Pending approval gates across all sessions (action-focused)
4. **History** — Completed sessions with summaries

### Data Pattern: Progressive Disclosure
**Use for PDE:** Three levels of detail
1. **Glance** — Session card: status icon + phase name + cost badge
2. **Summary** — Expanded card: progress bar, recent events, action buttons
3. **Detail** — Full session timeline with event log, file changes, tool calls

### Status Visualization
- **Active session:** Pulsing green dot + "Running Phase 3/7"
- **Waiting for approval:** Orange badge + notification count
- **Error:** Red status with error preview text
- **Completed:** Checkmark with duration + total cost
- **Idle/Paused:** Gray with "Paused" label

## shadcn/ui Component Mapping

Components from shadcn/ui that map directly to dashboard needs.

| Dashboard Element | shadcn/ui Component | Usage |
|-------------------|---------------------|-------|
| Session status card | `Card` + `Badge` + `Progress` | Main dashboard card with status badge and progress bar |
| Approval actions | `AlertDialog` | Confirmation before approve/deny to prevent accidental taps |
| Event log entries | `Accordion` or custom collapsible | Expandable event entries in session timeline |
| Navigation | `Tabs` (bottom-positioned via CSS) | Mobile bottom tab bar |
| Session list | `Table` (mobile) or stacked `Card` list | Responsive — table on desktop, cards on mobile |
| Cost display | `Badge` variant + custom | Color-coded cost badges (green < $1, yellow < $5, red > $5) |
| Progress indicator | `Progress` | Phase progress within session cards |
| Toast notifications | `Sonner` (toast library integrated with shadcn) | In-app event notifications |
| Approval gate prompt | `Sheet` (bottom sheet) | Mobile-native bottom sheet for approval action |
| Settings/preferences | `Switch` + `Select` | Notification preferences, sound/vibration toggles |
| Loading states | `Skeleton` | Card placeholders during SSE connection |
| Error states | `Alert` | Connection lost, session error display |
| Timeline | Custom (shadcn primitives) | No built-in timeline — compose from `Card` + custom CSS. Community `shadcn-timeline` package available. |
| Filters | `DropdownMenu` + `Badge` | Filter events by type in session detail view |

**Note on timeline:** shadcn/ui does not ship a native timeline component. Use the community `shadcn-timeline` package (React + Tailwind, follows shadcn patterns) or build from primitives. The `shadcn-event-timeline-roadmap` package provides horizontal and vertical timeline variants with Framer Motion animations.

## Feature Dependencies

```
[Service Worker Registration]
    |-- requires --> [Web App Manifest]
    |-- enables --> [Push Notifications]
    |-- enables --> [Offline Caching]
    |-- enables --> [PWA Installability]

[SSE Event Stream]
    |-- requires --> [Next.js Route Handler]
    |-- enables --> [Live Session Status]
    |-- enables --> [Phase Progress]
    |-- enables --> [Token/Cost Meter]
    |-- enables --> [Live Log Stream]
    |-- enables --> [File Change Feed]
    |-- enables --> [Approval Gate Notification (in-app)]

[Push Notifications]
    |-- requires --> [Service Worker Registration]
    |-- requires --> [VAPID Key Infrastructure]
    |-- enables --> [Approval Gate Push Alert]
    |-- enables --> [Error Alert When App Closed]

[Session List]
    |-- requires --> [SSE Event Stream]
    |-- enables --> [Multi-Session Overview]
    |-- enables --> [Session Selection]

[Approval Gate Actions]
    |-- requires --> [SSE Event Stream] (to receive gate events)
    |-- requires --> [REST API Endpoint] (to send approve/deny)
    |-- requires --> [Push Notifications] (for background alerts)
    |-- enhances --> [Session Timeline] (approval events in history)

[Session Timeline]
    |-- requires --> [SSE Event Stream]
    |-- requires --> [Event Aggregation Logic]
    |-- enhances --> [Session History] (replay completed timelines)

[Session History]
    |-- requires --> [Persistent Storage] (server-side session records)
    |-- enhances --> [Session List] (show past sessions too)

[Offline Event Buffer]
    |-- requires --> [Service Worker Registration]
    |-- requires --> [IndexedDB Storage]
    |-- conflicts_with --> [iOS Support] (no Background Sync on iOS)
```

### Dependency Notes

- **SSE Event Stream is the foundation.** Nearly everything depends on it. Build this first.
- **Push Notifications require service worker + VAPID infrastructure.** Can be deferred to after core SSE features work.
- **Approval Gates have the deepest dependency chain** (SSE + REST + Push), but are the highest-value feature. Plan phases to unblock this early.
- **Session History requires server-side persistence** — the NDJSON events need to be stored somewhere retrievable, not just streamed.
- **Offline Buffer conflicts with iOS** — implement as progressive enhancement for Android/desktop only.

## MVP Definition

### Launch With (v1)

Minimum viable: can monitor a session and respond to approval gates from phone.

- [ ] **SSE event stream from PDE to PWA** — The foundation; stream NDJSON events via Next.js Route Handler
- [ ] **Live session status card** — Active/idle/error/complete with current phase and cost
- [ ] **Phase progress display** — Progress bar showing phase X of Y, current plan/wave
- [ ] **Token/cost meter** — Running total, visible at a glance on session card
- [ ] **Approval gate notification + action** — In-app alert when gate fires, approve/deny buttons with confirmation
- [ ] **PWA manifest + service worker** — Installable to home screen, basic offline shell
- [ ] **Mobile-responsive card layout** — Works on phone screens, touch-friendly
- [ ] **Auto-reconnection UI** — Graceful handling of SSE disconnects with visual feedback

### Add After Validation (v1.x)

Features to add once core monitoring + approval loop is working.

- [ ] **Web Push notifications** — Alert when app is closed; approval gates and errors. Trigger: users report missing gates while app backgrounded
- [ ] **Session timeline** — Chronological event view for deep inspection. Trigger: users want to understand what happened, not just current state
- [ ] **Multi-session overview** — Dashboard showing all active sessions. Trigger: users running parallel sessions (Layer 2 prerequisite)
- [ ] **File change feed** — List of files touched by agent. Trigger: users want to know what changed before approving
- [ ] **Live log stream** — Scrollable event feed with filtering. Trigger: power users want terminal-like visibility
- [ ] **Session history** — Completed session records. Trigger: users want post-mortem capability

### Future Consideration (v2+)

Features to defer until PWA is proven and Layer 2 (multi-session) ships.

- [ ] **Sound/haptic alerts** — Vibration and audio cues. Defer: platform support inconsistent (iOS no vibration API)
- [ ] **Cost projection** — "At this rate..." extrapolation. Defer: need usage data to calibrate accuracy
- [ ] **Offline action queueing** — IndexedDB buffer for approval actions. Defer: iOS doesn't support, complexity vs value
- [ ] **Session comparison** — Side-by-side session metrics. Defer: needs history feature first, niche use case
- [ ] **Team visibility** — Multiple users monitoring same session. Defer: auth/identity system needed, scope explosion

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| SSE event stream | HIGH | MEDIUM | P1 |
| Live session status | HIGH | LOW | P1 |
| Phase progress | HIGH | LOW | P1 |
| Token/cost meter | HIGH | LOW | P1 |
| Approval gate actions | HIGH | MEDIUM | P1 |
| PWA installability | HIGH | LOW | P1 |
| Mobile card layout | HIGH | MEDIUM | P1 |
| Auto-reconnection | HIGH | LOW | P1 |
| Web Push notifications | HIGH | MEDIUM | P2 |
| Session timeline | MEDIUM | HIGH | P2 |
| Multi-session overview | MEDIUM | MEDIUM | P2 |
| File change feed | MEDIUM | LOW | P2 |
| Live log stream | MEDIUM | MEDIUM | P2 |
| Session history | MEDIUM | MEDIUM | P2 |
| Sound/haptic alerts | LOW | LOW | P3 |
| Cost projection | LOW | LOW | P3 |
| Offline action queue | LOW | HIGH | P3 |
| Session comparison | LOW | MEDIUM | P3 |
| Team visibility | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch — core monitoring + approval loop
- P2: Should have, add in subsequent phases — depth features
- P3: Nice to have, future consideration — polish and scale features

## Competitor Feature Analysis

| Feature | Vercel Dashboard | Railway (Station app) | GitHub Actions (Mobile) | Linear Mobile | PDE Dashboard (Our Approach) |
|---------|-----------------|----------------------|------------------------|---------------|------------------------------|
| Real-time status | SWR polling | WebSocket streaming | Pull-to-refresh + push | Push + sync | SSE streaming (simpler than WS, auto-reconnect) |
| Mobile layout | Responsive web | Native iOS app | Native mobile app | Native iOS/Android | PWA with mobile-first card layout |
| Build/deploy progress | Step indicators | Log streaming | Workflow step badges | N/A | Phase/plan/wave progress bars |
| Approval gates | Preview promote | Deploy promote | Environment approvals | Agent delegation | Push notification + in-app approve/deny/defer |
| Cost visibility | Usage page (separate) | Usage tracking | N/A | N/A | Inline on every session card (differentiator) |
| Log streaming | Build logs (web) | Real-time logs + metadata | Step logs | Agent reasoning | Event feed with type filtering |
| Offline support | N/A | N/A | Cached views | Cached views | Offline shell + reconnection (Android: action queue) |
| Navigation | Sidebar (collapses) | Bottom tabs | Bottom tabs | Bottom toolbar + customizable | Bottom tabs (4 sections) |
| Install experience | N/A (web only) | App Store | App Store | App Store | PWA install (home screen) |

## Sources

- [PWA iOS Limitations and Safari Support 2026](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) — Comprehensive browser support matrix, EU limitations
- [PWA on iOS - Current Status & Limitations 2025](https://brainhub.eu/library/pwa-on-ios) — iOS-specific PWA constraints
- [SSE in Next.js - Real-Time Notifications](https://www.pedroalonso.net/blog/sse-nextjs-real-time-notifications/) — Next.js App Router SSE implementation patterns
- [Streaming in Next.js 15: WebSockets vs SSE](https://hackernoon.com/streaming-in-nextjs-15-websockets-vs-server-sent-events) — SSE vs WebSocket comparison for Next.js
- [SSE's Glorious Comeback: Why 2025 is the Year of SSE](https://portalzine.de/sses-glorious-comeback-why-2025-is-the-year-of-server-sent-events/) — SSE adoption trends
- [Railway Station iOS App](https://apps.apple.com/us/app/railway-app-client-station/id6741881453) — Real-world mobile monitoring app
- [Linear Mobile App Redesign](https://linear.app/changelog/2025-10-16-mobile-app-redesign) — Mobile UX patterns for developer tools
- [GitHub Actions Manual Approval](https://trstringer.com/github-actions-manual-approval/) — CI/CD approval gate patterns
- [Vercel Dashboard Redesign](https://vercel.com/blog/dashboard-redesign) — Real-time dashboard with SWR
- [Mobile Dashboard UI Best Practices](https://www.toptal.com/designers/dashboard-design/mobile-dashboard-ui) — Card-based mobile monitoring patterns
- [Dashboard Design Trends 2025](https://uitop.design/blog/design/top-dashboard-design-trends/) — Current dashboard UI patterns
- [shadcn/ui Components](https://ui.shadcn.com/docs/components) — Component library reference
- [shadcn Timeline Component](https://shadcnstudio.com/blocks/marketing-ui/timeline-component) — Community timeline blocks
- [shadcn Event Timeline Roadmap](https://github.com/BunsDev/shadcn-event-timeline-roadmap) — Animated timeline with Framer Motion

---
*Feature research for: PDE Remote Dashboard PWA*
*Researched: 2026-03-24*
