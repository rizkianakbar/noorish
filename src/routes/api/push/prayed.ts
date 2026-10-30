import { createFileRoute } from '@tanstack/react-router';
import { db } from '#/server/db.server.ts';
import { cancelPrayerPush } from '#/server/push.server.ts';
import { pushPrayedSchema } from '#/server/schemas.ts';

/**
 * "I've prayed" tapped on a notification. The service worker can't call
 * server functions, so it posts here; the endpoint is the device's own
 * credential, as with the server functions in `push.functions.ts`.
 */
export const Route = createFileRoute('/api/push/prayed')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = pushPrayedSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response('Bad request', { status: 400 });
        await cancelPrayerPush(db, parsed.data.endpoint, parsed.data.prayer);
        return new Response(null, { status: 204 });
      },
    },
  },
});
