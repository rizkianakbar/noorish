/**
 * Schedules prayer notifications in the database itself, with Supabase's
 * pg_cron and pg_net: every minute it calls `/api/push/send`, but only when
 * a notification is due, so the app isn't woken up 1,440 times a day for
 * nothing. Works on any Vercel plan (Hobby crons run at most daily). Run
 * once per database; rerunning updates the jobs.
 *
 *   APP_URL=https://noorish.example CRON_SECRET=… DATABASE_URL=… bun push:cron
 *
 * CRON_SECRET must match the app's. `bun push:cron --remove` unschedules.
 */
import { sql } from 'drizzle-orm';
import { db } from '#/server/db.server.ts';

const SEND_JOB = 'noorish-prayer-push';
const PRUNE_JOB = 'noorish-prayer-push-prune';

if (process.argv.includes('--remove')) {
  for (const job of [SEND_JOB, PRUNE_JOB]) {
    await db.execute(sql`select cron.unschedule(jobid) from cron.job where jobname = ${job}`);
  }
  console.log('Unscheduled prayer notifications');
} else {
  const appUrl = process.env.APP_URL?.replace(/\/$/, '');
  const secret = process.env.CRON_SECRET;
  if (!appUrl || !secret) throw new Error('Set APP_URL and CRON_SECRET (the app’s) to schedule notifications');

  await db.execute(sql`create extension if not exists pg_cron`);
  await db.execute(sql`create extension if not exists pg_net`);
  await db.execute(sql`
    select cron.schedule(${SEND_JOB}, '* * * * *', format(
      $job$
        select net.http_post(url := %L, headers := jsonb_build_object('authorization', %L), timeout_milliseconds := 30000)
        where exists (select 1 from quran_push_schedule where send_at <= now())
      $job$,
      ${`${appUrl}/api/push/send`}::text,
      ${`Bearer ${secret}`}::text
    ))
  `);
  // Devices that stopped opening the app and have nothing left to send.
  await db.execute(sql`
    select cron.schedule(${PRUNE_JOB}, '17 3 * * *', $job$
      delete from quran_push_subscriptions s
      where s.updated_at < now() - interval '30 days'
        and not exists (select 1 from quran_push_schedule p where p.subscription_id = s.id)
    $job$)
  `);
  console.log(`Scheduled prayer notifications: ${appUrl}/api/push/send, every minute when due`);
}

await db.$client.end();
