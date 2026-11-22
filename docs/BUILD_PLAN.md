# Build plan (checklist)

Source of truth for the brief: BUILD_PROMPT.md. Tick items as they finish. Resume from the first unticked item.

## Phase 0 - Setup
- [x] 0.1 Copy brief into this checklist, create BUILD_LOG.md, NEEDS_FROM_DANIEL.md

## Phase 1 - Foundation
- [x] 1.1 Scaffold Vite + React 19 + TS strict + Tailwind + Router + Query + Vitest + Playwright, env typing, README
- [x] 1.2 Supabase migrations (schema, RLS, inbox bucket), applied via Management API, TS types, seed from APPENDIX
- [x] 1.3 Admin login gated by admins table + scripts/make-admin.mjs
- [x] 1.4 Brand tokens + self-hosted fonts + layered SVG logo + 3D logo + docs/brand screenshots
- [x] 1.5 Phase gate (typecheck, lint, test, build), commit, push, log

## Phase 2 - Media pipeline + failover
- [ ] 2.1 Media repo layout + setup script (scripts/setup-media-repo.mjs) + media-repo workflow templates
- [ ] 2.2 Action "sync" (ffmpeg transcode, posters, Pages commit, release for big masters, manifest)
- [ ] 2.3 Action "keep-alive" (every 3 days)
- [ ] 2.4 /api/publish (JWT + admins check, repository_dispatch); admin status + inbox meter
- [ ] 2.5 DataProvider (source.json, Supabase 4 s timeout, manifest fallback, sessionStorage 5 min)
- [ ] 2.6 Tests: Supabase blocked -> site renders from manifest, videos resolve
- [ ] 2.7 MEDIA_HOST config abstraction
- [ ] 2.8 Phase gate

## Phase 3 - Admin + emergency admin
- [ ] 3.1 Admin (projects + bulk upload/compression, ordering, sections, brands, testimonials, services, FAQs, before/after, stats/tools, settings/maintenance, messages, page views)
- [ ] 3.2 /api/emergency/* (login bcrypt+TOTP, cookie, lockout, health, source, maintenance, resync) + make-emergency-credentials script
- [ ] 3.3 /admin/emergency page with zero Supabase dependency; main admin source toggle + last synced
- [ ] 3.4 Optional emergency upload (script fallback)
- [ ] 3.5 Phase gate

## Phase 4 - Sections, logo moments, section videos, brands
- [ ] 4.1 Global: Lenis+ScrollTrigger, cursor, grain, reduced motion
- [ ] 4.2 Logo moments a-f (preloader, nav mark, X-wipe, light-lines, footer 3D, credit line)
- [ ] 4.3 SectionMedia background component with placeholder
- [ ] 4.4 Sections 2-10 + Finale
- [ ] 4.5 Category pages
- [ ] 4.6 Phase gate

## Phase 5 - Hero "The Assembly"
- [ ] 5.1 Model loading + stand-in humanoid
- [ ] 5.2 Particle sampler + shader
- [ ] 5.3 Interaction (cursor/scroll/tilt)
- [ ] 5.4 Mesh crossfade + scan line
- [ ] 5.5 Video shards
- [ ] 5.6 Scroll-out
- [ ] 5.7 Hero copy + loop
- [ ] 5.8 Shared renderer, GPU tier fallback, perf
- [ ] 5.9 Phase gate

## Phase 6 - Polish & launch prep
- [ ] 6.1 Lighthouse, fonts, lazy video, a11y, SEO/OG, vercel.json
- [ ] 6.2 Final report + ask Daniel to approve going live
