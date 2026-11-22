# Xperience site: final report

Branch: `build` (also on `claude/ecstatic-hawking-h8iwb7`). Nothing is live; going live needs your OK.

## Done
- **Site:** Ignition intro, hero "The Assembly" (particle figure → rim-lit figure → orbiting video shards), Manifesto, Premium Samples (WebGL transitions), Two Crafts, Before/After, Work Library, Process timeline, Toolkit marquees, Proof (stats, Trusted by, testimonials), Services, FAQ, CTA + contact form, 3D footer logo, category pages `/work/ai`, `/work/editing`, `/work/:discipline/:category`.
- **Admin** `/admin`: every table, bulk upload with in-browser compression, drag ordering, publish status, inbox meter, data-source switch, maintenance, messages, page views.
- **Emergency admin** `/admin/emergency`: works with Supabase down (password + authenticator code).
- **Media pipeline:** sync and keep-alive Actions ready to install in the media repo; tested end to end against your Supabase.
- **Failover:** Supabase → manifest.json → built-in copy; tested with Supabase blocked.
- **Database:** schema, security rules, upload inbox and seed copy are live in your Supabase project. Your admin account exists.

## Still placeholder
- Films (tagged "Placeholder"), before/after pair, section background loops (animated brand gradient), client logos (names shown), stats and service prices/turnaround (shown as TBC), testimonials (hidden), 3D model (stand-in figure), contact email/WhatsApp (buttons hidden until set).

## What you need to do
See `NEEDS_FROM_DANIEL.md` (7 items). In short:
1. `node scripts/make-admin.mjs` on your laptop to set your admin password.
2. Create the public repo `xperience-media`, give Claude's GitHub app access to it, then tell me "media repo ready".
3. `node scripts/make-emergency-credentials.mjs` for the emergency login.
4. Upload real films, loops, logos and numbers in the admin.
5. Optional: your 3D model.

## Environment variables
**Vercel** (Project > Settings > Environment Variables):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, `VITE_MEDIA_BASE_URL`, `VITE_PUBLIC_SITE_URL` (your domain, once known), `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `MEDIA_REPO`, `MEDIA_BRANCH`, `MEDIA_HOST`, `GITHUB_TOKEN`, `EMERGENCY_PASSWORD_HASH`, `EMERGENCY_TOTP_SECRET`, `EMERGENCY_SESSION_SECRET`. (`EMERGENCY_UPLOAD_ENABLED` stays `false`.)

**GitHub, xperience-media repo** (Settings > Secrets and variables > Actions): `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (the setup script adds these for you).

**Never anywhere but your laptop:** `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`.

**Supabase** (Authentication > URL Configuration), once the Vercel URL is known: Site URL = your site; add `https://<your-site>/admin/login` to Redirect URLs (for "Forgot password").

## Preview links
None yet: Vercel isn't connected. Vercel > Add New > Project > import `xperience-studio` > add the variables above > deploy the `build` branch. Every push to `build` then gets a preview URL.

## Known gaps
- Mobile Lighthouse performance ~74 (target 85). Accessibility 96, SEO 100. Next step: prerender the hero at build time (in `docs/BUILD_LOG.md`).
- Not tested on a real iPhone (only Chromium here). Please open the preview on your phone once it exists.
