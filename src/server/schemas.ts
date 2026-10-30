import { z } from 'zod';

/**
 * A verse reference, e.g. `{ surah: 2, verse: 255 }`. Verse 286 is the
 * longest surah (Al-Baqarah).
 */
export const verseRefSchema = z.object({
  surah: z.number().int().min(1).max(114),
  verse: z.number().int().min(1).max(286),
});

export type VerseRef = z.infer<typeof verseRefSchema>;

export const noteInputSchema = verseRefSchema.extend({
  body: z.string().trim().min(1, 'Note is empty').max(10000),
});

const dateKeySchema = z.iso.date();

/**
 * One day's portion of a reading plan, in mushaf pages.
 */
export const planDaySchema = z.object({
  date: dateKeySchema,
  fromPage: z.number().int().min(1).max(604),
  toPage: z.number().int().min(1).max(604),
});

export type PlanDay = z.infer<typeof planDaySchema>;

/**
 * A khatam plan as the client keeps it. `id` is made on the device that
 * starts the plan; `read` is the base64 verse bitset from `verse-set.ts`
 * (780 bytes, so 1040 characters).
 */
export const readingPlanSchema = z.object({
  id: z.uuid(),
  startDate: dateKeySchema,
  endDate: dateKeySchema,
  read: z.base64().max(1040),
  today: planDaySchema.nullable(),
  completedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});

export type ReadingPlan = z.infer<typeof readingPlanSchema>;

/**
 * A browser's `PushSubscription.toJSON()`. Push services use https endpoints.
 */
export const pushSubscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(1000),
  keys: z.object({
    p256dh: z.base64url().max(200),
    auth: z.base64url().max(100),
  }),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

const prayerKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}:(fajr|dhuhr|asr|maghrib|isha)$/);

/**
 * What the service worker shows, written on the device in the reader's
 * language. `prayer` lets "I've prayed" log it from the notification.
 */
export const pushPayloadSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().max(300),
  prayer: prayerKeySchema,
  action: z.string().min(1).max(40),
  lang: z.enum(['en', 'id']),
});

export type PushPayload = z.infer<typeof pushPayloadSchema>;

/**
 * A device's notifications for the next two weeks: five adhans a day and up
 * to four "time is running out" nudges.
 */
const pushItemSchema = z.object({ sendAt: z.iso.datetime(), payload: pushPayloadSchema });

export const pushScheduleSchema = z.object({
  subscription: pushSubscriptionSchema,
  items: z.array(pushItemSchema).max(150),
});

export const pushPrayedSchema = z.object({
  endpoint: pushSubscriptionSchema.shape.endpoint,
  prayer: prayerKeySchema,
});

/**
 * One prayer's notifications: its nudge and the reminder the reader asked for.
 */
export const pushPrayerScheduleSchema = pushPrayedSchema.extend({
  items: z.array(pushItemSchema).max(5),
});
