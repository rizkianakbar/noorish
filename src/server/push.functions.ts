import { createServerFn } from '@tanstack/react-start';
import { db } from './db.server.ts';
import { env } from './env.server.ts';
import { cancelPrayerPush, pushEnabled, removePushSubscription, savePushSchedule } from './push.server.ts';
import { pushPrayedSchema, pushScheduleSchema, pushSubscriptionSchema } from './schemas.ts';

// No query options and no auth: prayer notifications work signed out, and a
// device is known only by its push endpoint (see `prayer.push.ts`).

/**
 * The VAPID public key to subscribe with, or null when this server can't
 * send push.
 */
export const getPushKeyFn = createServerFn({ method: 'GET' }).handler(() =>
  pushEnabled ? (env.VAPID_PUBLIC_KEY ?? null) : null,
);

/**
 * Store this device's subscription and its next two weeks of notifications.
 */
export const savePushScheduleFn = createServerFn({ method: 'POST' })
  .validator(pushScheduleSchema)
  .handler(({ data }) => savePushSchedule(db, data.subscription, data.items));

export const removePushSubscriptionFn = createServerFn({ method: 'POST' })
  .validator(pushSubscriptionSchema.pick({ endpoint: true }))
  .handler(({ data }) => removePushSubscription(db, data.endpoint));

/**
 * A prayer was logged in the app: cancel its remaining notifications.
 */
export const cancelPrayerPushFn = createServerFn({ method: 'POST' })
  .validator(pushPrayedSchema)
  .handler(({ data }) => cancelPrayerPush(db, data.endpoint, data.prayer));
