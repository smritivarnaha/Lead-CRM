/**
 * Push Notification Utility
 * Sends Web Push to all subscribed devices using VAPID keys.
 */
import webpush from "web-push";
import prisma from "@/lib/prisma";

const vapidPublicKey  = process.env.VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;
const vapidSubject    = process.env.VAPID_SUBJECT || "mailto:admin@leadflow.app";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  /** Action buttons shown in the notification */
  actions?: { action: string; title: string }[];
};

/**
 * Send a push notification to ALL subscribed devices.
 * Silently removes stale/expired subscriptions.
 */
export async function sendPushToAll(payload: PushPayload): Promise<void> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn("[PUSH] VAPID keys not configured — skipping push.");
    return;
  }

  const subscriptions = await prisma.pushSubscription.findMany();
  if (subscriptions.length === 0) return;

  const results = await Promise.allSettled(
    subscriptions.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
    )
  );

  // Clean up expired / invalid subscriptions
  const toDelete: string[] = [];
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const err = result.reason as { statusCode?: number };
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        toDelete.push(subscriptions[i].id);
      }
    }
  });

  if (toDelete.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: toDelete } } });
    console.log(`[PUSH] Removed ${toDelete.length} stale subscription(s).`);
  }

  const sent = results.filter(r => r.status === "fulfilled").length;
  console.log(`[PUSH] Sent to ${sent}/${subscriptions.length} device(s).`);
}
