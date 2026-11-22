# Xperience: studio site

AI video and video editing studio of Daniel Ogbeifun Osewe.
Vite + React 19 + TypeScript, Tailwind, GSAP + Lenis, three.js (react-three-fiber), Supabase (data), GitHub Pages (videos), Vercel (hosting + `/api` functions).

## Run it locally

1. Install Node 20 or newer.
2. `npm install`
3. `node scripts/setup-env.mjs` (creates `.env.local`; asks only for secrets, hidden while you type)
4. `npm run dev` and open http://localhost:5173

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run check` | Typecheck, lint, unit tests and production build (the phase gate) |
| `npm run test:e2e` | Playwright end-to-end tests (desktop + mobile) |
| `node scripts/apply-migrations.mjs` | Apply `supabase/migrations` through the Supabase Management API |
| `node scripts/gen-types.mjs` | Regenerate `src/integrations/supabase/types.ts` |
| `node scripts/make-admin.mjs` | Make `ADMIN_EMAIL` an admin and set its password |
| `node scripts/make-emergency-credentials.mjs` | Create the emergency-admin password hash + TOTP secret (QR code) |
| `node scripts/setup-media-repo.mjs` | One-time setup of the `xperience-media` repo (Pages, Actions, secrets) |

## How data flows

- **Supabase** holds the content tables and a private `inbox` bucket used only as a temporary upload inbox.
- **GitHub Pages** (`xperience-media` repo) serves every video, poster and logo, plus `manifest.json` (a published snapshot of all public tables) and `source.json` (data-source switch).
- The **sync** Action transcodes uploads from the inbox, commits them to Pages, writes the URLs back and regenerates `manifest.json`.
- The site reads Supabase first (4 s timeout) and falls back to `manifest.json` automatically, so it keeps working if Supabase is paused or down.
- All media URLs go through `src/lib/media.ts` (`MEDIA_HOST`), so moving videos to Cloudflare R2 later is a config change.

## Folders

- `src/` site + admin (React). `src/data` = DataProvider and sources. `src/three` = WebGL.
- `api/` Vercel functions (`/api/publish`, `/api/emergency/*`).
- `supabase/migrations/` database schema, RLS and seed.
- `media-repo-template/` files the setup script pushes to the media repo (Actions).
- `scripts/` setup and maintenance scripts.
- `docs/` build plan, log and brand screenshots.

Secrets live in `.env.local` (gitignored) or the hosting provider's environment settings. Only `VITE_` variables reach the browser.
