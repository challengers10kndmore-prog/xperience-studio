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
- Lighthouse mobile performance is ~74 (target 85) after 3 real attempts: (1) stopped three.js/admin chunks loading on the homepage (44 -> 76), (2) moved everything below the hero into a deferred chunk + dropped MorphSVG, (3) static hero shell in index.html. Remaining cost is the ~160 kB (gzip) entry (React, router, GSAP + plugins, Ignition) under 4x CPU throttling: LCP ~3.1 s, TBT ~500 ms. Next step: prerender the hero at build time (vite-ssg/react-dom/server + hydrateRoot) so the LCP text paints before JS, and load SplitText/ScrambleText/DrawSVG only for the intro. Accessibility 96, best practices 96, SEO 100, CLS 0.045. Measured in this container against vite preview; Vercel's CDN will be somewhat faster.
- Safari iOS check: only Chromium is available here. Video uses muted + playsInline + preload="none" + posters (iOS-safe autoplay rules) and WebGL is gated by WebGL2 + GPU tier, but a real iPhone check is still needed (see final report).
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

### Phase 6 - Polish & launch prep (done, perf target logged under Blocked)
- Mobile Lighthouse 44 -> ~74 perf, 96 a11y, 96 best practices, 100 SEO; CLS fixed (grain overlay); robots.txt; OG image public/og/xperience-og.jpg; JSON-LD; vercel.json SPA rewrites + cache headers.
- Fixed a real bug: SplitText-split headings never updated when live data arrived (React wrote into detached text nodes). Split elements are now keyed by their text and revert before re-running.
- Playwright e2e (desktop + mobile): Supabase blocked -> site renders from manifest.json, every <video> src on the media host, no release assets in <video>, skip link + player Escape. All pass. No horizontal overflow at 390 px; Two Crafts stacks on phones.
- Meshy credit not needed yet (no model supplied).

### Post-launch-prep: browser-only setup (Daniel has no laptop)
- Media repo installed (Actions + Pages files), Pages on, Actions secrets added by Daniel; sync verified end to end from a real upload to a video playing from GitHub Pages (test row + files removed).
- /admin/login: "Set or forgot password?" email link (Supabase recovery -> choose password on the site).
- /admin/emergency/setup: one-time setup guarded by EMERGENCY_SETUP_CODE; QR + password in the browser; shows the three EMERGENCY_* values to paste into Vercel; refuses (locks) once they exist; setup-code attempts rate-limited.
- bcryptjs, otpauth, qrcode moved to dependencies for the Vercel functions.

### Setup session (Daniel, browser only)
- Media repo live: Pages on, secrets added, sync + keep-alive verified from GitHub Actions; test upload played from Pages and was cleaned up.
- Vercel project imported; preview = https://xperience-studio-git-build-challengers10kndmore-prog.vercel.app (production branch main stays unbuilt until "yes, go live").
- Supabase auth: site_url + redirect allow-list set to the Vercel addresses (project-scoped preview wildcard only).
- Fixed: missing created_at on services/faqs/before_after/section_media (admin list error); tests moved out of api/ (were deployed as functions); api/tsconfig.json for Vercel's function type-check; Node pinned to 22.x.
- Emergency setup page diagnostics show deployment + setting names (never values); used to find a GITHUB_TOKEN missing from Preview.

### Hero change: video-driven (no 3D model)
- Hero = canvas WebP frame sequence (section_media "hero-assembly": ~96 frames @12 fps, desktop 1280x720 / mobile 540x960, cut by the sync job; poster = end frame) scrubbed by cursor proximity + movement (damped), touch plays forward on load then scrubs with scroll; crossfade to "hero-idle" loop at the last frame (hysteresis back). Featured films orbit as CSS 3D cards (posters; click = player). Scroll-out scrubs backwards and flies cards forward. Frames load progressively after first paint (ends first, then every 8th/4th/2nd/all), loop pauses off-screen.
- Placeholder until uploaded: 2D-canvas dot figure with the same behaviour. No code particles over the real video (skipped: depth gain not worth the main-thread cost on phones).
- three.js removed from the hero (HeroAssembly, stand-in model, prepare-model script deleted); still lazy-loaded only for the footer logo and premium transitions on capable GPUs.
- Fixed: html + body both painted backgrounds, hiding negative-z section backgrounds; Ignition overflow briefly widened the mobile layout viewport (CLS 0.26 -> 0.045).
- New column section_media.frames (migration 20261123000006) + rows hero-assembly, hero-idle.

### Uploads, pending queue, posters + captions (Nov 23)
- Root causes: (1) Supabase Free rejects any object over 50 MB (bucket said 500 MB; we only compressed above 40 MB). 12 projects never reached the inbox yet were marked published with no video -> now "failed" with the reason. (2) Each sync run only processed its own --id; GitHub keeps one queued run per concurrency group and cancels the rest. (3) Run 45135803630 crashed on a manifest.json rebase conflict between two runs.
- Fixes: files over 45 MB upload as 45 MB parts (File.slice, no re-encode), 3 retries per part, progress across parts, inbox-room check, friendly 413 message, bucket limit 50 MB; compressor optional (checkbox). Sync processes ALL pending rows every run, joins parts byte for byte with a size check, deletes every part, marks rows with nothing uploaded as failed, and pushes with rebase -X theirs + retries. "Publish all pending" button (Overview + Projects).
- Posters: 20 samples between 10% and 90%, drop dark / blown-out / scene-change frames, sharpest by Laplacian variance; graded + sharpened, 1920 wide (1080 for vertical). Cover card + 1200x630 share card via satori + resvg with Clash Display / Satoshi / Michroma. New columns: caption, show_caption, cover_url, og_url, poster_time, poster_source. Admin: poster + cover preview, time-slider frame picker, pick automatically, upload own poster; caption/title edits re-render the cover. Share links /p/:slug (api/share.ts) serve OG tags then open the film.
- Verified end to end on GitHub Actions with a 74 MB two-part upload.

### Work reel + Website customization (Nov 23)
- Work section is now a full-screen reel (WorkReel): one film fills the screen (vertical films on a blurred fill), auto-advance with per-discipline transitions (circle reveal for AI, diagonal slice for Editing), controls previous / pause-play / fast-forward (next) / 2x speed, progress bar, thumbnail rail, filters, arrows + space, swipe; pauses off-screen; "Watch with sound" opens the player. The grid (WorkGrid) stays on the category pages.
- Website customization (admin > Website customization): drag-to-order + show/hide for every home section; saved in site_settings.layout (migration 20261123000008); hero first and footer last are fixed. Daniel's layout saved with Work right after the hero. Home mounts the sections only once the saved order has loaded (pinned sections are never reordered after mount).
- Titles display without export timestamps (src/lib/titles.ts) in the reel and player.

### Redesign pass (Nov 24)
- Lite mode for low-spec devices (index.html, before first paint): <= 4 GB RAM, <= 2 cores, 4 cores with < 8 GB, data saver or reduced motion (?lite=1 / ?lite=0 to force). Drops grain, animated backgrounds, backdrop blur, WebGL + the GPU benchmark download, continuous decorative animation; Ignition 0.8 s (first visit 2.3 s for everyone else). Lighthouse mobile: 71 normal / 78 lite; a11y, best practices, SEO 100.
- Hero: curved wall of film previews behind the figure (CSS 3D, drifting, gap where Daniel stands; figure screen-blended over it), viewfinder HUD (REC + running timecode, format readout, assembly meter), gradient keyword, booking badge, ticker, scroll cue; figure shifted right of centre on wide screens.
- Work: continuously turning 3D ring of chrome-edged film cards over a reflective neon floor (~62-68% of the screen), front card plays, drag / click / arrows, previous / pause-play / fast-forward / 2x.
- Manifesto: tilted drifting field of real film frames behind the lead line.
- LogoStage / MarkEmblem: the footer's chrome-logo-on-neon-floor look without WebGL, used on page headers, menu, About, cards.
- Header: glass bar with Work, Selected, Services, Process, About, Clients + Start a project + full-screen Menu (all pages). Standalone pages for every section: /work, /selected-work, /services, /process, /about, /clients, /before-after, /toolkit, /faq, /contact (src/pages/SectionPage.tsx), each with a cinematic header, the section, related content, CTA and next-page link.
