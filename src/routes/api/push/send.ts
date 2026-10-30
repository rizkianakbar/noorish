import { createFileRoute } from '@tanstack/react-router';
import { db } from '#/server/db.server.ts';
import { env } from '#/server/env.server.ts';
import { sendDuePush } from '#/server/push.server.ts';

/**
 * Sends the prayer notifications that are due. Called every minute by the
 * scheduler (`bun push:cron`), with `CRON_SECRET` as its bearer token.
 */
async function handle(request: Request) {
  if (!env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  return Response.json(await sendDuePush(db));
}

export const Route = createFileRoute('/api/push/send')({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
