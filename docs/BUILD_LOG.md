# Build log

## Environment (cloud session, 2026-11-22)
- Secrets come from cloud environment variables (no .env.local in cloud).
- Supabase Management API reachable; direct Postgres blocked -> migrations applied via api.supabase.com.
- Media repo challengers10kndmore-prog/xperience-media not accessible yet (does not exist or not shared with the session).
- Branch: work is committed on claude/ecstatic-hawking-h8iwb7 and pushed to both that branch and `build` (as the brief asks).

## Decisions
- Public site reads Supabase with plain fetch to PostgREST (keeps supabase-js, 56 kB gz, out of the public bundle); admin uses supabase-js.
- Media columns store paths relative to the media host ("v/<id>.mp4"); src/lib/media.ts resolves them (MEDIA_HOST switch).
- Emergency maintenance is written to source.json as well as manifest.json so it applies in every data mode.
- Pinned TypeScript ~6.0 (typescript-eslint does not support TS 7 yet); Playwright pinned to the preinstalled 1.63.0.
- 3D blades use a large inset bevel so the flat SVG outline reads as a ridged chrome blade.

## Blocked

## Phase summaries

### Phase 1 - Foundation (done)
- Scaffolded Vite 8 + React 19 + TS 6 strict + Tailwind 4 + Router 7 + Query + Vitest + Playwright; self-hosted fonts with metric-matched fallbacks.
- Schema, RLS, private `inbox` bucket, admin helper RPCs and APPENDIX seed applied via the Management API (scripts/apply-migrations.mjs); types generated.
- Admin login (email + password, admins-table gate, forgot/set password); admin user created for ADMIN_EMAIL with a random password (Daniel sets his own).
- Layered SVG logo + 3D logo (SVGLoader + bevelled ExtrudeGeometry, iridescent chrome, bloom); screenshot docs/brand/logo-2d-vs-3d.png.
- Gate: typecheck, lint, 14 unit tests (incl. Supabase-down -> manifest failover) and build all pass.
