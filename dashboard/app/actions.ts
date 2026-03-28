"use server";

import { webpush } from "@/lib/push";
import { redis } from "@/lib/redis";
import { auth } from '@clerk/nextjs/server';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const PUSH_SUB_KEY = "push:sub:owner";

export async function subscribeUser(sub: PushSubscriptionJSON): Promise<{ success: boolean }> {
  await redis.set(PUSH_SUB_KEY, JSON.stringify(sub));
  return { success: true };
}

export async function unsubscribeUser(): Promise<{ success: boolean }> {
  await redis.del(PUSH_SUB_KEY);
  return { success: true };
}

export async function sendPushToOwner(payload: {
  title: string;
  body: string;
  url: string;
  tag: string;
}): Promise<{ success: boolean; reason?: string }> {
  const raw = await redis.get(PUSH_SUB_KEY);
  if (!raw) {
    return { success: false, reason: "no-subscription" };
  }

  const sub = JSON.parse(raw as string);

  try {
    await webpush.sendNotification(sub, JSON.stringify(payload));
    return { success: true };
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string };
    if (error.statusCode === 410 || error.statusCode === 404) {
      await redis.del(PUSH_SUB_KEY);
    }
    return { success: false, reason: error.message ?? "unknown error" };
  }
}

// --- Session control actions ---

type ActionResult = { ok: boolean; error?: string };

type RegistryEntry = {
  pid: number;
  phase: number;
  plan: number;
  worktreePath: string;
  branch: string;
  status: string;
  startedAt: string;
};

type Registry = {
  sessions: Record<string, RegistryEntry>;
};

function readRegistry(): Registry | null {
  const projectRoot = process.env.PDE_PROJECT_ROOT;
  if (!projectRoot) return null;
  const pidFile = path.join(projectRoot, '.planning', 'dispatcher.pids');
  try {
    return JSON.parse(readFileSync(pidFile, 'utf-8')) as Registry;
  } catch {
    return null;
  }
}

function writeRegistry(data: Registry | null): boolean {
  const projectRoot = process.env.PDE_PROJECT_ROOT;
  if (!projectRoot || !data) return false;
  const pidFile = path.join(projectRoot, '.planning', 'dispatcher.pids');
  try {
    writeFileSync(pidFile, JSON.stringify(data, null, 2));
    return true;
  } catch {
    return false;
  }
}

export async function retrySession(sessionId: string): Promise<ActionResult> {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return { ok: false, error: 'Unauthorized' };
  }

  const registry = readRegistry();
  if (!registry) {
    return { ok: false, error: 'PDE_PROJECT_ROOT not set — session actions only work locally' };
  }

  const entry = registry.sessions[sessionId];
  if (!entry) {
    return { ok: false, error: 'Session not found' };
  }

  return { ok: false, error: 'retry-requires-local-dispatcher' };
}

export async function abandonSession(sessionId: string): Promise<ActionResult> {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return { ok: false, error: 'Unauthorized' };
  }

  const registry = readRegistry();
  if (!registry) {
    return { ok: false, error: 'PDE_PROJECT_ROOT not set — session actions only work locally' };
  }

  const entry = registry.sessions[sessionId];
  if (!entry) {
    return { ok: false, error: 'Session not found' };
  }

  entry.status = 'abandoned';
  writeRegistry(registry);

  const projectRoot = process.env.PDE_PROJECT_ROOT!;
  const cleanupDir = path.join(projectRoot, '.planning', 'cleanup-requests');
  mkdirSync(cleanupDir, { recursive: true });
  const cleanupFile = path.join(cleanupDir, sessionId);
  writeFileSync(
    cleanupFile,
    JSON.stringify({
      sessionId,
      worktreePath: entry.worktreePath,
      branch: entry.branch,
      requestedAt: new Date().toISOString(),
    })
  );

  return { ok: true };
}

export async function killSession(sessionId: string): Promise<ActionResult> {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return { ok: false, error: 'Unauthorized' };
  }

  const registry = readRegistry();
  if (!registry) {
    return { ok: false, error: 'PDE_PROJECT_ROOT not set — session actions only work locally' };
  }

  const entry = registry.sessions[sessionId];
  if (!entry) {
    return { ok: false, error: 'Session not found' };
  }

  if (entry.pid > 0) {
    try {
      process.kill(entry.pid, 'SIGTERM');
    } catch {
      // ignore ESRCH — process already dead
    }
  }

  entry.status = 'stopped';
  writeRegistry(registry);

  return { ok: true };
}

export async function persistSessionCost(
  sessionId: string,
  inputTokensDelta: number,
  outputTokensDelta: number
): Promise<void> {
  const key = `pde:default:session:${sessionId}`;
  const INPUT_COST_PER_M  = 3;   // Sonnet 4.6 pricing
  const OUTPUT_COST_PER_M = 15;
  const costDeltaCents = Math.round(
    ((inputTokensDelta  / 1_000_000) * INPUT_COST_PER_M +
     (outputTokensDelta / 1_000_000) * OUTPUT_COST_PER_M) * 10_000
  );
  const p = redis.pipeline();
  p.hincrby(key, 'total_input_tokens',  inputTokensDelta);
  p.hincrby(key, 'total_output_tokens', outputTokensDelta);
  p.hincrby(key, 'cost_usd_cents',      costDeltaCents);
  await p.exec();
}
