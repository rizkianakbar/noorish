# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is Bun (`bun.lock`); all commands are `package.json` scripts. There's no local database server: `DATABASE_URL` in `.env.local` (copy `.env.example`) points at a Supabase dev project (use the pooler hosts; the direct host is IPv6-only). Supabase is used as plain Postgres only, with no supabase-js and no Data API. Vite, `vitest.config.ts` and `drizzle.config.ts` each load `.env.local`; Bun loads it for `scripts/*.ts`.
- `bun dev` — TanStack Start dev server on port 3000 (`--strictPort`: fails rather than drifting to another port)
- `bun check` — Biome format+lint (auto-fixes, `--write --unsafe`) + `tsgo --noEmit`
- `bun run test` — Vitest (note: `bun test` runs Bun's own runner, not Vitest)
- `bun run build` — production build into `.output/` (Nitro; picks the Vercel preset automatically on Vercel). It prerenders the 114 surah pages by booting the production server, so it needs the production env (`BETTER_AUTH_SECRET`, `DATABASE_URL`); Vercel provides them at build time
- `bun db:generate` — SQL migration from schema changes into `drizzle/` · `bun db:migrate` · `bun db:push` (prototyping) · `bun db:studio` (port 4444)
- `bun db:seed` — truncate and reseed (`test@example.com` / `password123`, plus a few bookmarks/notes)
- `bun quran:fetch` — download the surahs (every language in one file) into `data/quran/` and tafsir into `public/quran/tafsir/`, then run `quran:build`
- `bun quran:build` — split `data/quran/` into the served files: `public/quran/{n}.json` (no translations), `public/quran/{en,id}/{n}.json` (translation + word meanings) and the search index `public/quran/search-{en,id}.json`. Rerun after changing `data/quran/`, `src/lib/quran/surah-files.ts` or the folding in `search.lib.ts`; tests fail when they're out of step
- `bun duas:fetch` — download duas into `public/duas/` (category list bundled in `src/features/duas/duas-index.json`)
- `bun hadith:fetch` — rebuild `src/features/hadith/hadith-index.json` (hadith text loads from the hadith-api CDN a book at a time)
- `bun pwa:splash` — render the PWA icons and iOS launch images with local Chrome
- `bun seo:generate` — regenerate `public/sitemap.xml` (home, surahs, duas, hadith) and `public/robots.txt`; rerun after fetching duas or hadith

Single test file: `bun vitest run src/server/annotations.test.ts`.

## Architecture

TanStack Start app (React 19 + TanStack Router + server functions), deployed to Vercel. One `package.json`, one source tree. Import alias `#/*` → `./src/*` (declared in `package.json` `imports` and mirrored in `tsconfig.json` `paths`); always use it across directories, and keep explicit `.ts`/`.tsx` extensions.

There is no separate API server: the backend is TanStack Start server functions plus one server route for Better Auth.

### Rendering

`src/start.ts` sets `defaultSsr: false`: the document shell and `<head>` (`shellComponent` in `src/routes/__root.tsx`) are server-rendered, but route components render on the client because the reader depends on per-device state in localStorage (theme, language, translation, progress). Module-level code in `src/lib/` is still imported on the server, so guard browser globals (`typeof window !== 'undefined'`). Because child routes don't render on the server, their own `head()` never reaches the server HTML: per-page titles, canonicals, Open Graph tags and JSON-LD are built in the root route's `head()` by `pageHead()` in `src/lib/seo.ts`, so add new indexable pages there.

The exception is `/surah/$surah`: it (and the root, via its `ssr` function) is server-rendered and prerendered at build for all 114 surahs (`vite.config.ts`), with its first 20 verses (`readSurahPreview` in `src/server/quran.server.ts`), so the text paints before any script runs. The server can't read the reader's prefs, so it has to draw something every reader can use:
- Stores hydrate with a fixed `serverValue` (`createStore` in `src/lib/store.ts`; prefs use `defaultPrefs`), then switch to the stored value.
- The inline `prefsScript` in `__root.tsx` runs before first paint: it applies the theme and marks `<html>` with `data-lang`, `data-tr`, `data-latin`, `data-focus` and the Arabic size and face. The preview draws every translation and transliteration (`allVariants`, `data-show-tr`/`data-show-latin`), and CSS in `styles.css` shows the reader's. Interface text the server draws in English carries `data-i18n` and stays hidden for other languages until the app sets `data-hydrated`.
- Chrome whose labels follow the language (the dock, sheets, prompts, running head) is wrapped in `ClientOnly`.
When changing what the reader renders, keep its first browser render identical to the server's, or hydration fails. Check with the built app (`bun run build`, then `node .output/server/index.mjs`), not only `bun dev`.

### Server code (`src/server/`)

File naming is load-bearing:
- `*.server.ts` — server-only. Start's import protection blocks these from the client bundle. `env.server.ts` (Zod-validated env; dev defaults, production requires `DATABASE_URL` and `BETTER_AUTH_SECRET`), `db.server.ts` (pg `Pool` + Drizzle, `attachDatabasePool` for Vercel), `auth.server.ts` (Better Auth), and data access like `notes.server.ts` — plain `(db, userId, ...)` functions, so ownership checks live in one place and tests call them directly.
- `*.functions.ts` — `createServerFn` wrappers plus `queryOptions` factories. Safe to import from components: the compiler strips handler bodies (and their `.server.ts` imports) from the client build. Protected functions use `authMiddleware` (`middleware.ts`), which resolves the Better Auth session from request headers and provides `context.user`, or responds 401.
- `schemas.ts` — shared Zod input schemas (client-safe).

Pattern for a new feature: table in `src/db/schema.ts` (+ `relations.ts`) → data access in `src/server/<x>.server.ts` → server fns + `<x>Queries` in `src/server/<x>.functions.ts` → components use `useQuery(<x>Queries.list())` and `useMutation({ mutationFn: useServerFn(fn) })`, invalidating `<x>Queries.all` on success. See notes/bookmarks.

`src/start.ts` also installs `createCsrfMiddleware` for server-function requests (cross-site calls get 403; page navigations are unaffected).

### Auth

Better Auth, email+password only, mounted at `/api/auth/*` by `src/routes/api/auth/$.ts` — same origin as the app, so no CORS. Client: `authClient` from `src/lib/auth-client.ts` (`authClient.useSession()` in components). In route `beforeLoad`s use the `getSession` server fn (`src/server/auth.functions.ts`). The `auth_users`/`auth_sessions`/`auth_accounts`/`auth_verifications` tables (exported from the schema as `users`/`sessions`/`accounts`/`verifications`, the keys the adapter looks up with `usePlural`) follow Better Auth's schema, and Better Auth checks it at startup (`SCHEMA_MISMATCH` errors), so don't rename their columns casually.

### Database

Table names are prefixed by domain: `auth_*` for Better Auth, `quran_*` for app data (snake_case, so no quoting needed); the TypeScript exports stay unprefixed. Drizzle ORM 1.0 RC over Postgres (`uuidv7()` defaults; built into 18, polyfilled on older servers like Supabase 17 by `scripts/uuidv7-polyfill.ts`, which `bun db:migrate` runs first). Relations use `defineRelations`; in 1.0 `drizzle()` takes `relations` only (no `schema`), and Better Auth's adapter gets `schema` explicitly. Migrations are in `drizzle/<timestamp>_<name>/` (`migration.sql` + `snapshot.json`) and are tracked in the `schema_migrations` table. Never hand-edit them; regenerate with `bun db:generate`.

### Testing

Tests sit next to the file they cover and are named after it: `features/audio/audio.lib.test.ts` tests `audio.lib.ts`, `server/annotations.test.ts` tests the notes/bookmarks data access. `src/test/` holds shared test helpers only, no tests. End-to-end browser tests, if added, belong outside `src/` (e.g. `e2e/`).

`src/db/` is the schema (`schema.ts`, `relations.ts`) and `src/server/` the runtime that uses it; they stay apart because drizzle-kit, `scripts/seed.ts` and the test fixture import the schema too.

`src/test/database.ts`'s `serverTest` (a Vitest fixture) runs each test against the real database (`DATABASE_URL`, so migrate it first) inside a transaction that is always rolled back: no mocks, and nothing is committed. Data-access functions accept `Database` (the db or a transaction) for this reason. Test the `*.server.ts` functions directly with the `db` fixture; `createTestUser(db)` makes a user with a unique email so tests don't collide with seeded or concurrent rows. `vitest.config.ts` is deliberately separate from `vite.config.ts` so tests don't boot the Start/Nitro plugins.

### Frontend

Code is organised by feature. `src/features/<feature>/` holds everything one feature owns, every file prefixed with the feature name: `<feature>-page.tsx` and other components (`reader-header.tsx`, `verse-card-actions.tsx`), `<feature>.hooks.ts`, `<feature>.lib.ts` (logic, no React), `<feature>.api.ts` (fetching), `<feature>.types.ts`. Features: `reader` (surah page, verse cards, mushaf), `audio` (recitation player), `search` (Web Worker index), `tafsir`, `notes`, `journal`, `surahs`, `dock`, `home`, `settings`, `auth`. Anything used across features is global: `src/components/` (`ui/` design system, `ornament/`, `app-shell`, `router-anchor`), `src/hooks/`, `src/lib/` (`store`, `prefs`, `i18n`, `shortcuts`, `progress`, `fonts`, `seo`, `quran/` data). Don't name a file `*.client.*` or `*.server.*` unless you mean it: Start's import protection treats those as client-only/server-only.

Routes in `src/routes/` stay thin: route options (params, loader, fallbacks) plus the feature's page component. `src/routeTree.gen.ts` is generated, never hand-edit it. The router (`src/router.tsx`) creates a fresh `QueryClient` per request and passes it as router context. Quran content is static JSON under `public/quran/` (built by `bun quran:build`), loaded by `src/lib/quran/data.ts`, which fetches a surah's base file plus only the translation files the reader's prefs need (`surahLangs`) and merges them (`mergeSurah`); files are cached long by `vercel.json` headers. The one exception is the chapter list, `src/lib/quran/chapters.json`: it is imported (bundled) because the server needs it for page titles, and Vite refuses imports from `public/`.

### Design system (`src/components/ui/`)

A small shadcn-style kit (`Button`, `Drawer`, `Input`, `Menu`, `Textarea`) built on `class-variance-authority` + Base UI + Tailwind v4. All color tokens are OKLCH CSS variables in `src/styles.css`, monochrome by design, so don't hardcode colors. Extend via `cn()` (`src/lib/utils.ts`) and the existing `variant`/`size` props. `components.json` is at the root; add components with `bun ui add <component>` (writes into `src/components/ui/`), then `bun check` reformats them to this repo's Biome style.
