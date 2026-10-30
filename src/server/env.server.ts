import { z } from 'zod';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Server environment. Locally, `bun run` loads `.env.local` (see
 * `.env.example`); on Vercel, set these under Project → Settings →
 * Environment Variables.
 */
const schema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: isProduction ? z.string().min(32) : z.string().default('dev-secret-change-me-in-production-0000'),
  /**
   * Public origin of the app. Optional in production: when unset Better Auth
   * infers it from the request, which keeps Vercel preview deployments working.
   */
  BETTER_AUTH_URL: isProduction ? z.url().optional() : z.url().default('http://localhost:3000'),
  /**
   * Web Push (VAPID) keys: `bunx web-push generate-vapid-keys`. Without them
   * prayer notifications are off and the app doesn't offer them.
   */
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  /**
   * Who push services contact about this sender: a mailto: or https: URL.
   */
  VAPID_SUBJECT: z.string().default('https://noorish.rzknkbr.xyz'),
  /**
   * Bearer token the scheduler sends to `/api/push/send` (see `bun push:cron`).
   */
  CRON_SECRET: isProduction ? z.string().min(16).optional() : z.string().default('dev-cron-secret'),
});

export const env = schema.parse(process.env);
