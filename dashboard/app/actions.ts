"use server";

import { webpush } from "@/lib/push";
import { redis } from "@/lib/redis";

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
