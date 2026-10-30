import { defineRelations } from 'drizzle-orm';
import * as schema from './schema.ts';

export const relations = defineRelations(schema, (r) => ({
  users: {
    sessions: r.many.sessions({
      from: r.users.id,
      to: r.sessions.userId,
    }),
    accounts: r.many.accounts({
      from: r.users.id,
      to: r.accounts.userId,
    }),
    notes: r.many.notes({
      from: r.users.id,
      to: r.notes.userId,
    }),
    bookmarks: r.many.bookmarks({
      from: r.users.id,
      to: r.bookmarks.userId,
    }),
    readingPlan: r.one.readingPlans({
      from: r.users.id,
      to: r.readingPlans.userId,
    }),
  },
  sessions: {
    user: r.one.users({
      from: r.sessions.userId,
      to: r.users.id,
    }),
  },
  accounts: {
    user: r.one.users({
      from: r.accounts.userId,
      to: r.users.id,
    }),
  },
  notes: {
    user: r.one.users({
      from: r.notes.userId,
      to: r.users.id,
    }),
  },
  bookmarks: {
    user: r.one.users({
      from: r.bookmarks.userId,
      to: r.users.id,
    }),
  },
  readingPlans: {
    user: r.one.users({
      from: r.readingPlans.userId,
      to: r.users.id,
    }),
  },
  pushSubscriptions: {
    schedule: r.many.pushSchedule({
      from: r.pushSubscriptions.id,
      to: r.pushSchedule.subscriptionId,
    }),
  },
  pushSchedule: {
    subscription: r.one.pushSubscriptions({
      from: r.pushSchedule.subscriptionId,
      to: r.pushSubscriptions.id,
    }),
  },
  verifications: {},
}));
