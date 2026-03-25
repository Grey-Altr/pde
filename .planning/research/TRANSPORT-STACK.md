# Technology Stack: PDE Remote Dashboard Event Transport

**Project:** PDE Remote Dashboard (Layer 1)
**Researched:** 2026-03-24

## Recommended Stack

### Transport Layer (PDE Side -- Zero Dependencies)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `node:https` | Built-in (Node 18+) | HTTP client for Upstash REST API | Stable across all Node versions PDE may encounter. No deps. |
| Upstash Redis REST API | Current | Event storage + real-time pub/sub | Only service offering full Redis over pure HTTP REST. Free tier: 500K cmds/month. |

### PWA Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 15+ | PWA framework, SSE Route Handlers, App Router | Already aligned with project (Vercel deployment). RSC for dashboard. |
| React | 19+ | UI components | Ships with Next.js 15. |
| TypeScript | 5.x | Type safety | Standard for Next.js projects. |

### Data Layer (PWA Side)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @upstash/redis | Latest | Upstash client in PWA Route Handlers | Type-safe, lightweight (~5KB). PWA has no dep restrictions. |
| Upstash Redis | Managed | Event storage (LIST), session metadata, auth tokens | Same instance PDE pushes to. Single source of truth. |

### Infrastructure

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel | Hobby plan | PWA hosting, serverless functions, Edge Runtime | $0/month for single user. Tight Upstash integration. |
| Upstash Redis | Free tier | Event store + pub/sub | 500K commands/month, 256MB storage. $0/month. |

### Supporting Libraries (PWA Only)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next-pwa` or `@serwist/next` | Latest | PWA manifest, service worker, offline support | Initial PWA setup |
| `web-push` | Latest | Push notifications for approval gates | Phase 2: mobile notifications |
| Tailwind CSS | 4.x | Styling | Dashboard UI (ships with Next.js) |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Transport (PDE) | Upstash REST via `node:https` | `fetch()` | `fetch()` is experimental on Node 20. `node:https` is stable. |
| Event store | Upstash Redis LIST | Supabase Postgres | Supabase free tier auto-pauses after 7 days inactivity |
| Real-time delivery | Upstash PUBLISH + PWA polling | Pusher Channels | Pusher requires HMAC signing (complex without SDK), no history |
| Real-time delivery | Upstash PUBLISH + PWA polling | Ably | Ably is viable but requires second service for storage. Two services vs one. |
| PWA SSE | Next.js Route Handler | Vercel Edge Runtime SSE | Edge Runtime has longer connection limits but less Node.js API access. Consider for v2. |
| Auth | Upstash token as shared secret | JWT + session tokens | Overkill for single-user tool. Add proper auth if multi-user. |

## Configuration (PDE Side)

```bash
# User sets these environment variables (or in .pde/config)
export PDE_UPSTASH_URL="https://us1-xxx-yyy.upstash.io"
export PDE_UPSTASH_TOKEN="AXxxxxxxxxxxxxxxxxxxxx"
```

No `npm install` needed. No package.json changes. No new dependencies.

## Installation (PWA Side)

```bash
# Create Next.js PWA project
npx create-next-app@latest pde-dashboard --typescript --tailwind --app

# Core dependencies
npm install @upstash/redis

# PWA support
npm install @serwist/next

# Dev dependencies
npm install -D @types/node
```

## Cost Breakdown (Hobby Scale)

| Service | Free Tier | PDE Usage Estimate | Monthly Cost |
|---------|-----------|-------------------|--------------|
| Upstash Redis | 500K cmds/month, 256MB | ~300K cmds/month (est.) | $0.00 |
| Vercel Hobby | 100GB transfer, 1M fn invocations | ~10K fn invocations | $0.00 |
| Domain (optional) | N/A | Custom domain | $0-12/year |
| **Total** | | | **$0.00/month** |

### Usage Estimate Details

- 5 sessions/day average (realistic, not max)
- 500 events/session average
- 2 Upstash commands per event (LPUSH + PUBLISH)
- 5 x 500 x 2 x 30 = 150,000 commands/month
- PWA polling: ~3,600 LRANGE calls/day (1/sec for ~1hr active viewing) x 30 = 108,000
- Total: ~258,000 commands/month (well within 500K free tier)

## Sources

- Upstash Redis REST API: https://upstash.com/docs/redis/features/restapi
- Upstash pricing: https://upstash.com/pricing/redis
- Vercel pricing: https://vercel.com/pricing
- Next.js docs: https://nextjs.org/docs
- @upstash/redis npm: https://www.npmjs.com/package/@upstash/redis
