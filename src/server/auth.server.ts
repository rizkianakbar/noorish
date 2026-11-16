import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { tanstackStartCookies } from 'better-auth/tanstack-start';
import * as schema from '#/db/schema.ts';
import { db } from './db.server.ts';
import { env } from './env.server.ts';

/**
 * Better Auth, email + password only. Mounted at `/api/auth/*` by
 * `src/routes/api/auth/$.ts`; same origin as the app, so no CORS.
 *
 * The `auth_*` tables (schema exports `users`/`sessions`/`accounts`/
 * `verifications`) follow Better Auth's expected shape — don't rename their
 * columns casually.
 */
export const auth = betterAuth({
  appName: 'Noorish',
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg', usePlural: true, schema }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
  // Shared across serverless instances; memory would count per instance.
  rateLimit: { storage: 'database' },
  // Must stay last: forwards Set-Cookie from server-side auth calls.
  plugins: [tanstackStartCookies()],
});

export type Session = typeof auth.$Infer.Session;
