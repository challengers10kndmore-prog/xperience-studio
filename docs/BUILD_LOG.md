# Build log

## Environment (cloud session, 2026-11-22)
- Secrets come from cloud environment variables (no .env.local in cloud).
- Supabase Management API reachable; direct Postgres blocked -> migrations applied via api.supabase.com.
- Media repo challengers10kndmore-prog/xperience-media not accessible yet (does not exist or not shared with the session).
- Branch: work is committed on claude/ecstatic-hawking-h8iwb7 and pushed to both that branch and `build` (as the brief asks).

## Decisions
- Bloom is real (EffectComposer) only in the brand preview; in the shared multi-View canvas a post-processing pass can't be scoped to one View, so the footer logo uses emissive + an additive glow sprite.
- Placeholder films (tagged "Placeholder") appear only while no real project has media, so every section can be reviewed now.
- FAQ/service TODOs render as an amber "TBC" mark instead of invented numbers.
- Emergency upload ships as scripts/emergency-upload.mjs (local ffmpeg + Git Data API). The in-browser path needs a GitHub App installation token and a 90 MB base64 request through api.github.com, which can't be verified from here; EMERGENCY_UPLOAD_ENABLED stays false.
- Public site reads Supabase with plain fetch to PostgREST (keeps supabase-js, 56 kB gz, out of the public bundle); admin uses supabase-js.
- Media columns store paths relative to the media host ("v/<id>.mp4"); src/lib/media.ts resolves them (MEDIA_HOST switch).
- Emergency maintenance is written to source.json as well as manifest.json so it applies in every data mode.
- Pinned TypeScript ~6.0 (typescript-eslint does not support TS 7 yet); Playwright pinned to the preinstalled 1.63.0.
- Emergency lockout is per function instance (in memory): 5 failures per IP, 20 instance-wide, 15 min. Serverless instances can reset it; bcrypt + TOTP makes brute force impractical anyway.
- Media repo history grows with every re-upload (GitHub soft limit ~1 GB per repo, Pages 100 GB/month bandwidth). If it gets big, move to R2 via MEDIA_HOST.
- 3D blades use a large inset bevel so the flat SVG outline reads as a ridged chrome blade.

## Blocked
- Media repo not reachable from this session (not created / not shared). Pipeline is written and tested locally; setup runs when Daniel completes NEEDS #3.

## Phase summaries

### Phase 1 - Foundation (done)
- Scaffolded Vite 8 + React 19 + TS 6 strict + Tailwind 4 + Router 7 + Query + Vitest + Playwright; self-hosted fonts with metric-matched fallbacks.
- Schema, RLS, private `inbox` bucket, admin helper RPCs and APPENDIX seed applied via the Management API (scripts/apply-migrations.mjs); types generated.
- Admin login (email + password, admins-table gate, forgot/set password); admin user created for ADMIN_EMAIL with a random password (Daniel sets his own).
- Layered SVG logo + 3D logo (SVGLoader + bevelled ExtrudeGeometry, iridescent chrome, bloom); screenshot docs/brand/logo-2d-vs-3d.png.
- Gate: typecheck, lint, 14 unit tests (incl. Supabase-down -> manifest failover) and build all pass.

### Phase 2 - Media pipeline + failover (done)
- media-repo-template/: sync Action (dispatch + hourly cron; ffmpeg H.264 High / CRF 23 / veryfast / faststart, 1080p cap, auto bitrate under 95 MB, posters, 6 s teasers, >95 MB masters to a "masters" release) and keep-alive Action (every 3 days, commits status.json so GitHub never disables the crons).
- Verified sync.mjs end to end against the real Supabase inbox (temp row + clip): files transcoded, row set to published, inbox emptied, manifest regenerated; test row deleted.
- /api/publish, /api/admin/[status|source], /api/emergency/[action] (3 Vercel functions total, under the Hobby limit of 12).
- DataProvider: source.json (60 s cache) -> Supabase (4 s timeout) -> manifest.json (fallback remembered 5 min) -> bundled defaults; MEDIA_HOST abstraction in src/lib/media.ts.
- Gate: 27 unit tests (failover, timeout, release-asset guard, ffmpeg args, JWT/admin check, lockout, cookie) + build pass. scripts/setup-media-repo.mjs waits on the media repo (NEEDS #3).

### Phase 3 - Admin + emergency admin (done)
- Admin (shadcn-style, lazy chunk): overview (counts, sync status, data-source toggle, publish-now, inbox meter of 1 GB), projects (all fields, discipline filter, bulk upload with in-browser ffmpeg.wasm compression + XHR progress, drag-order Premium and Featured), section videos, brands, testimonials, services, FAQs, before/after, stats + tools, site settings + maintenance + all section copy, messages, page views.
- Status per media item: Pending / Publishing / Live / Failed (with error tooltip + Retry); lists auto-refresh while anything is pending; text edits auto-regenerate manifest.json (debounced).
- /admin/emergency talks only to /api/emergency/* (bcrypt + TOTP, signed httpOnly cookie 2 h, lockout); health, data source, maintenance, resync. scripts/make-emergency-credentials.mjs (QR) and scripts/emergency-upload.mjs.
- Verified the admin UI in Chromium with mocked network (creating a temporary admin account in the live project was blocked by the session's safety rules, so nothing touched the real database).
- Gate: typecheck, lint, 28 tests, build pass.

### Phase 4 - Sections, logo moments, section videos, brands (done)
- Global: Lenis on GSAP's ticker synced to ScrollTrigger, custom cursor (PLAY/DRAG/VIEW/OPEN), film grain, reduced motion = fades only.
- Logo moments: Ignition preloader (verified frame by frame), nav mark (minute ring, 8 s glint, hover parts blades), X-wipe route transition, light-lines, footer 3D logo over reflective floor + fog (SVG + reflection fallback), credit line with mini mark.
- Sections 2-10 + FAQ + CTA/contact form + category pages; SectionMedia loops (lazy, paused off-screen, overlay, placeholder). Full player opens from any card with a FLIP.
- Premium transitions: WebGL shader in the shared canvas (liquid for AI, slice-cut for Editing) with a CSS clip-path fallback of the same character.
- Gate: typecheck, lint, 30 tests, build pass.

### Phase 5 - Hero "The Assembly" (done)
- Loads /models/daniel.glb (meshopt + KTX2) when present, normalises it (centre, scale, drop floaters); otherwise a procedural stand-in humanoid (no third-party model licence needed).
- MeshSurfaceSampler -> 60k points (40k mobile), aHome/aScatter/aDelay, brand-gradient additive shader; cursor energy (movement x proximity) assembles feet-first, decays when idle, holds 7 s once complete; touch uses scroll + device tilt.
- At ~1: rim-lit solid with a scan-line sweep (rig idle + head-follow when the GLB has bones/clips); 5-7 featured shards orbit with hover title and click-to-play; scroll-out disperses particles upward and flies shards forward.
- One shared renderer (drei View) for hero, premium transitions and footer logo; GPU tier < 2 / no WebGL2 / reduced motion -> hero loop + copy. Fixed a crash where React inserted next to a GSAP pin-spacer (pinned sections now sit in React-owned wrappers).
- Gate: typecheck, lint, 30 tests, build pass. Screenshot docs/brand/hero-assembly.png. scripts/prepare-model.mjs for Daniel's model.
