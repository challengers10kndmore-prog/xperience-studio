# XPERIENCE: Build prompt for Claude Code

You are building, from scratch, the website of XPERIENCE: a studio for AI video and video editing, founded by Daniel Ogbeifun Osewe (CEO). This folder is the NEW repo github.com/challengers10kndmore-prog/xperience-studio. It already contains .gitignore, .env.example, SETUP.md, BUILD_PROMPT.md (this file) and scripts/setup-env.mjs (keep them; if .env.local is missing or incomplete, ask Daniel to run: node scripts/setup-env.mjs). A reference copy of Daniel's old site may be at ../caleb-ai-vision (read-only: borrow working ideas such as src/lib/compressVideo.ts, src/lib/videoSource.ts and the admin upload flow; never modify it, never copy its Supabase settings). The old Supabase project is paused and is NOT used. Nothing is migrated.

All copy, section-video prompts and brand details are in the APPENDIX at the end of this file. Use them.

## HOW TO RUN THIS BUILD (read first)

Run ALL six phases back to back in one continuous journey. Do NOT stop and wait for approval between phases.

0. Setup: copy this file to docs/BUILD_PLAN.md with a checklist; tick items as you finish. Keep docs/BUILD_LOG.md. If the session restarts or context runs low, re-read both and resume from the first unticked item.
1. Phase gate (automatic, not a pause): at the end of every phase run typecheck, lint, tests and build. Fix failures before moving on. If one issue still fails after 3 real attempts, log it under "Blocked" in BUILD_LOG.md, work around it, continue. Then commit ("phase N: ..."), push to a branch named "build" (Vercel makes a preview once Daniel connects the repo), append a 5-line summary to BUILD_LOG.md, and start the next phase immediately.
2. Never block on Daniel. When you need anything from him (keys, repos, photos, the 3D model, logos, videos, real numbers, copy), use a clearly marked placeholder or stand-in, add an entry to NEEDS_FROM_DANIEL.md (what, why, exact steps, where to put it, which phase uses it), print a short "NEED FROM DANIEL:" line in chat, and keep building. When he provides it, slot it in.
3. Secrets live in .env.local (gitignored). Read them from env only. Never print, log or commit a secret. Only VITE_ variables reach the browser; never give a secret a VITE_ name.
4. The only hard stops (ask Daniel first): merging "build" into main or deploying to production; changing Vercel production env vars; deleting data in Supabase or GitHub that Daniel uploaded; force-pushing.
5. Quality bar: premium, award-level motion, 60 fps, mobile-first, accessible. When unsure between two good options, pick one, note it in BUILD_LOG.md, move on.
6. Final step: one report with what's done, what's still a placeholder, all of NEEDS_FROM_DANIEL.md, every env var to set in Vercel and GitHub, and preview links. Then ask Daniel to approve going live.

## STACK

Vite + React 19 + TypeScript (strict) + Tailwind CSS + shadcn/ui (admin only) + React Router + TanStack Query + @supabase/supabase-js + Vitest + Playwright. Motion: gsap + @gsap/react (ScrollTrigger, SplitText, Flip, DrawSVG, MorphSVG, ScrambleText, Observer), lenis, three + @react-three/fiber v9 + @react-three/drei + @react-three/postprocessing, detect-gpu. Deployed on Vercel (Vercel functions in /api). Routes: / (site), /work/:discipline and /work/:discipline/:category (category pages), /admin, /admin/login, /admin/emergency.

## BRAND

Tokens: Void #07060D (bg), Carbon #100E1A, Graphite #1B1828, border #2B2640, Chrome #E6E8EE (text), Ash #8F8BA3, Violet #7C3AED (primary), Electric Blue #2F6BFF (AI Video), Neon Magenta #C84BFF (Video Editing), brand gradient #C84BFF -> #7C3AED -> #2F6BFF. Sample exact values from public/brand/xperience-logo.png once present. Glow/gradient only on logo, buttons, light-lines; never behind playing video; 4.5:1 text contrast. Fonts, self-hosted, font-display: swap: Clash Display (headlines), Michroma (nav, eyebrows, labels), Satoshi (body), JetBrains Mono (timecodes). Client brands: Xanctum, Jobcondi, Xpers Streaming. Xperience is Daniel's own brand: never on the "Trusted by" wall; its projects get an "Xperience Original" tag.

## PHASE 1 - FOUNDATION

1. Scaffold the app, tooling, env typing, README with setup steps. Keep the existing .gitignore entries for .env files.
2. Supabase (project ref in SUPABASE_PROJECT_REF; use the Supabase CLI with SUPABASE_ACCESS_TOKEN + SUPABASE_DB_PASSWORD). Write migrations for a fresh schema: projects (title, slug, discipline ai|editing, category, subcategory, aspect_ratio, duration_s, description, brief, role, result, tools text[], brand_id, is_featured, is_premium, premium_order, is_xperience_original, sort_order, published, inbox_path, video_url, poster_url, teaser_url, full_video_url external link, media_status pending|published|failed, media_synced_at), site_settings (single row: hero copy, tagline, contact email, whatsapp, seo, maintenance flag + message, stats jsonb, tools jsonb), section_media, brands, testimonials (incl. video_url), services, faqs, before_after, contact_messages, page_views (minimal), admins (user_id allowlist). RLS: public can read published rows only; only admins write; anyone can insert contact_messages and page_views. Private storage bucket "inbox" (admins write; nobody public). Generate TS types. Seed site_settings, services, faqs, brands from the APPENDIX.
3. Admin login (Supabase email + password) gated by the admins table; scripts/make-admin.mjs adds ADMIN_EMAIL (Daniel sets his own password when prompted).
4. Brand tokens + fonts. Rebuild the Xperience logo as a layered SVG (ids: ring, blade-left, blade-right, word-xperience, word-game, rule-left, rule-right, tagline "PLAY · CONNECT · EVOLVE") redrawn from the raster, and a 3D version (blades from SVGLoader + ExtrudeGeometry with bevel, MeshPhysicalMaterial metalness 1, roughness ~0.2, violet->blue iridescence, bloom). Save comparison screenshots to docs/brand/; don't wait for approval.

## PHASE 2 - MEDIA PIPELINE + FAILOVER

Videos are served from GitHub Pages by default; Supabase stores data and is only a temporary upload inbox (its free plan has 1 GB storage and 5 GB egress, and pauses after a week idle).

1. Media repo (MEDIA_REPO = challengers10kndmore-prog/xperience-media, Pages at VITE_MEDIA_BASE_URL). Layout: /v/<id>.mp4, /t/<id>.mp4 (teasers), /p/<id>.jpg, /s/<section-key>-desktop.mp4 and -mobile.mp4, /b/<brand-id>.png, /manifest.json (published snapshot of all public tables, with media URLs), /source.json ({"data":"auto"|"github"|"supabase"}). Write the Actions + a one-time setup script; if the repo/token isn't ready, put exact steps in NEEDS_FROM_DANIEL.md and keep going.
2. Action "sync" (repository_dispatch "media-uploaded" {table,id} + hourly safety cron): read pending rows with SUPABASE_SECRET_KEY (repo secret), download from the inbox, transcode with ffmpeg (H.264 High, max 1080p, CRF 23, -preset veryfast, AAC 128k or no audio for loops, -movflags +faststart, under 95 MB; auto-lower bitrate if needed), extract poster, commit to Pages, write URLs + media_status back, delete the inbox file, regenerate manifest.json. Masters over 95 MB: GitHub Release asset, stored as full_video_url (download link only; release assets are served as octet-stream, never use them in <video>).
3. Action "keep-alive": every 3 days, one tiny read from Supabase so the free project never pauses for inactivity.
4. Vercel function /api/publish (POST, verifies the admin's Supabase JWT + admins table server-side) fires the dispatch with GITHUB_TOKEN. Admin shows Pending / Publishing / Live / Failed per item and an inbox usage meter (of 1 GB).
5. DataProvider for the site: read source.json (cache 60 s). Data mode auto: Supabase with a 4 s timeout; on error/timeout/paused (5xx, 540) load manifest.json, state "fallback", remembered 5 min in sessionStorage. All media URLs come from GitHub Pages. Never show an error screen if either source works.
6. Tests: with Supabase blocked, the whole site renders from manifest.json and every video resolves.
7. Keep the video host behind one config (MEDIA_HOST=github) so moving to Cloudflare R2 later is a config change.

## PHASE 3 - ADMIN + EMERGENCY ADMIN

1. Admin (shadcn, clean and fast): projects with bulk upload (client-side compression before upload, reuse the reference compressor idea), drag-to-order featured and Premium, all fields above, publish status; section media; brands; testimonials; services; FAQs; before/after pairs; stats and tools; site settings + maintenance; contact messages; simple page-view stats.
2. Vercel functions /api/emergency/*: login (bcrypt EMERGENCY_PASSWORD_HASH + TOTP EMERGENCY_TOTP_SECRET; signed httpOnly cookie with EMERGENCY_SESSION_SECRET, 2 h; 15-min lock after 5 failures), health (Supabase ping + latency, last sync, last keep-alive), source (writes source.json via the GitHub Contents API), maintenance (toggles it in manifest.json), resync. scripts/make-emergency-credentials.mjs prints the hash + TOTP secret and shows a QR code; it may write them into .env.local for Daniel.
3. /admin/emergency with zero Supabase dependency. Main admin also shows the data-source toggle and last-synced time.
4. Optional, behind EMERGENCY_UPLOAD_ENABLED: emergency upload via a 1 h GitHub App installation token scoped to the media repo (<90 MB compressed). Verify the GitHub upload API accepts browser requests first; otherwise ship scripts/emergency-upload.mjs.

## PHASE 4 - SECTIONS, LOGO MOMENTS, SECTION VIDEOS, BRANDS

Global: ReactLenis synced to ScrollTrigger; custom cursor (PLAY/DRAG/VIEW/OPEN); film grain; prefers-reduced-motion = simple fades only.

Logo moments:
- a. Preloader "Ignition" (~2.8 s): ring line-draw, chrome blades slice in from opposite corners and cross with a flash, shockwave ripple, light sweep on metal, XPERIENCE resolves from scrambled glyphs magenta->silver, GAME tracks in from wide spacing, tagline types with pulsing dots, then the mark Flips into the nav. Click to skip; 0.8 s on repeat visits.
- b. Nav mark: ring turns once a minute, glint every 8 s; hover parts the blades, brightens the glow, speeds the ring.
- c. "X-wipe" page transition: two blade-shaped panels cross diagonally, mark flashes centre, panels exit.
- d. Section light-lines: the logo's glowing underline draws across between sections on enter.
- e. Footer: large 3D logo over a reflective neon floor with fog; blades re-assemble on enter; cursor tilt; click replays Ignition.
- f. Under hero buttons: "An Xperience production · Founded by Daniel Ogbeifun Osewe" with a mini animated mark.

Section media: every section renders its loop (desktop 16:9 / mobile 9:16) as a muted, playsinline, preload="none" background, loaded near viewport, paused off-screen, gradient overlay (admin opacity) keeping the left third dark, poster fallback. Until Daniel uploads loops, use an animated brand-colour placeholder and list each missing loop + its prompt (APPENDIX B) in NEEDS_FROM_DANIEL.md.

Sections (each its own component with its own animation; copy in APPENDIX A):
1. Hero - see Phase 5 (build a static placeholder hero now).
2. Manifesto - pinned SplitText scrub; last line becomes a text mask over the reel.
3. Premium Samples - 3 to 6 premium projects in premium_order. Pinned full-screen chapters, ScrollTrigger snap; WebGL displacement transition between films (different shader for AI vs Editing); lower-left: chapter no., title, brief, role, result; lower-right: discipline tag, runtime, tools, "Xperience Original" tag where set; muted teaser loops; click = GSAP Flip into a full player with sound.
4. Two Crafts - split screen AI Video (Electric Blue) / Video Editing (Neon Magenta); hover widens a side to 70% via clip-path; click -> /work/:discipline.
5. Before/After - synced dual-video wipe slider, tabs per pair.
6. Work Library - masonry of all published projects, filter chips (discipline, category, format, Xperience Originals) with GSAP Flip, hover autoplay + tilt.
7. Process - pinned horizontal editing timeline: scroll-scrubbed playhead, 5 clip blocks render as crossed, mono timecode.
8. Toolkit - two opposing marquees, speed tied to scroll velocity (Observer), chips from site_settings.tools.
9. Proof - 4 stats rolling like timecode; "Trusted by" wall (APPENDIX C): chrome-tinted logos bloom to colour on hover, cards tilt with violet rim light, blur-to-sharp entrance, click opens a drawer of that brand's videos; stacking testimonial cards (video testimonials supported).
10. Services - 4 offers, 3D fan-in deck, hover plays a 3 s loop.
- Finale - FAQ accordion; full-screen CTA with magnetic button, contact form (writes contact_messages), WhatsApp/email; footer with the 3D logo.

Category pages /work/... reuse the Work Library grid with a cinematic header. Mark stats, client results and any unknown facts as TODO and list them in NEEDS_FROM_DANIEL.md.

## PHASE 5 - HERO "THE ASSEMBLY"

1. Load /models/daniel.glb. Until Daniel provides it, use a free stand-in humanoid and put the free model steps in NEEDS_FROM_DANIEL.md (Hunyuan3D-2 or TRELLIS on Hugging Face, or Meshy free tier with credit; optional free Mixamo rig; 4 photos in flat light, full-body A-pose front shot as input). His file may be messy: clean floaters, center, scale. Compress with gltf-transform (meshopt + KTX2), under 4 MB.
2. MeshSurfaceSampler -> 60k points (40k mobile). Attributes aHome, aScatter, aDelay. ShaderMaterial: position = mix(aScatter, aHome, smoothstep(aDelay, aDelay+0.3, uProgress)); colour along the brand gradient; additive blending + subtle bloom.
3. uProgress rises with cursor proximity/movement (damped), falls when idle; touch: scroll + device tilt.
4. At ~1: crossfade to the textured mesh with rim light + scan-line sweep; if rigged, idle breath + head turn toward cursor.
5. Then 5-7 video shards (VideoTexture from featured projects) peel off and orbit; hover title; click opens the player.
6. Scroll out: particles disperse upward, shards fly forward into Manifesto.
7. Hero section-media loop behind the canvas. Copy from APPENDIX A. SplitText reveal.
8. One WebGL renderer shared by hero and 3D logo. detect-gpu tier < 2 or reduced motion -> pre-rendered video/still; pause off-screen; dispose GPU resources; 60 fps on a mid laptop; LCP < 2.5 s.

## PHASE 6 - POLISH & LAUNCH PREP

Lighthouse mobile >= 85, no font layout shift, every below-fold video lazy (preload="none", poster first), Safari iOS check for video + WebGL, keyboard and screen-reader pass, SEO + Open Graph image, vercel.json SPA rewrites. If the 3D model came from Meshy's free tier, add "3D model generated with Meshy" to the footer. Then the final report (HOW TO RUN, step 6).

Start now with step 0.

---

# APPENDIX

## A. Copy (first drafts; Daniel edits later in admin)

- **SEO title:** Xperience | AI Video & Video Editing Studio by Daniel Ogbeifun Osewe
- **SEO description:** AI films, ads and social edits, directed and cut by Daniel Ogbeifun Osewe at Xperience.
- **Hero:** headline "Stories, generated and cut by hand." Sub: "I'm Daniel Ogbeifun Osewe. I direct AI films and edit video for brands, artists and creators who need work that stops the scroll." Buttons: "Watch the reel" / "Start a project". Credit line: "An Xperience production · Founded by Daniel Ogbeifun Osewe".
- **Manifesto:** "AI gives me a thousand shots. Editing decides which twelve matter."
- **Premium Samples:** headline "Selected work." Sub: "The pieces I'd show first, each with the brief, my role and the result."
- **Two Crafts:** headline "Two crafts. One eye."
  - AI Video: "Concept to finished film with generative tools. Ads, music videos, product films, worlds that don't exist yet."
  - Video Editing: "Your footage, cut for pace, colour and sound. YouTube, reels, commercials, documentaries."
- **Before/After:** headline "Raw in. Finished out." Sub: "Drag to see what happens between the first output and the final frame."
- **Work Library:** headline "Everything, sorted." Sub: "Filter by craft, format or industry."
- **Process:** headline "From brief to final cut, in five passes."
  1. Brief: "You send the idea, references, deadline and any footage. I come back with questions and a plan."
  2. Concept and boards: "Look, pacing and key shots agreed before anything is made."
  3. Generate or shoot: "AI shots generated and directed, or your footage organised and logged."
  4. Edit, grade, sound: "Cut for rhythm, coloured to match, mixed so it lands with or without sound."
  5. Deliver: "Final files in every format you need, ready to post or run."
- **Toolkit:** headline "The kit." Sub: "Generative models for the impossible shots, industry tools for the finish." Seed tools (TODO confirm with Daniel): Generative: Veo, Kling, Runway, Midjourney, ElevenLabs. Finishing: Premiere Pro, DaVinci Resolve, After Effects, CapCut.
- **Proof:** headline "Clients don't hire a tool. They hire a result." Stats (all TODO real numbers): Projects delivered, Views generated, Typical turnaround, Repeat clients.
- **Services:** headline "Ways to work together." Each: what's included, typical turnaround (TODO), optional "from" price (TODO).
  1. AI ad or product film: "A finished spot built with generative visuals, edited and scored for your channels."
  2. Music video and visualizers: "Full videos, lyric visuals and loops that match the track's energy."
  3. Monthly social edit pack: "A steady stream of short-form edits for Reels, TikTok and Shorts."
  4. Long-form and YouTube editing: "Story-led edits for videos, documentaries and series, with grade and sound."
- **FAQ (answers with TODO need Daniel's numbers):**
  - "Who owns the final video?" Draft: "You do. You get full commercial rights to the final delivered files." (TODO confirm)
  - "How long does a project take?" "Most short pieces take TODO days from approved brief to delivery."
  - "Can you work with footage I already have?" "Yes. Send it in any format and I'll mix it with generated shots where it helps."
  - "How many revisions are included?" "TODO rounds of revisions are included in every project."
  - "How do we start?" "Message me on WhatsApp or email with your idea and deadline. I'll reply with questions and a quote."
- **Finale CTA:** "Have footage? Have an idea? Let's make the cut." Button: "Start a project".

## B. Section background video prompts (Daniel generates these; admin swaps them)

Export spec for every loop: 8 to 10 s, seamless (crossfade the last second into the first), H.264 1080p at about 4 Mbps (3 to 6 MB), no audio, left third darker and empty. Provide 16:9 desktop and 9:16 mobile versions.

Style suffix added to every prompt:
"Cinematic, slow camera motion, deep violet-black shadows, accent lighting in violet, electric blue and neon magenta, high contrast, subtle film grain, no text, no logos, no readable faces, calm and premium, seamless loop, 16:9, left third of frame darker and empty."

| Section key | Prompt |
| --- | --- |
| hero | A vast dark void with slow-drifting particles of violet and electric-blue light, faint volumetric beams from above, a glossy black floor with soft neon reflections, low fog rolling along the floor, camera pushing forward very slowly. |
| manifesto | Hundreds of translucent film frames drifting through dark space in slow motion, most dim and out of focus; one frame in the centre sharpens and glows violet as the camera slowly dollies toward it. |
| premium-intro (2 s card) | An empty dark cinema seen from the back row, a projector beam cutting through haze in violet and blue light, dust floating in the beam, the screen glowing soft white. |
| crafts-ai | A surreal landscape forming out of liquid light, neon violet and blue geometry melting and re-forming like a fluid simulation, dreamlike and slow. |
| crafts-editing | Extreme close-up of an editing timeline on a dark monitor, clips sliding into place and a magenta playhead scrubbing across, very shallow depth of field so the interface is soft bokeh. |
| library | A slow tracking shot along a wall of glowing screens in a dark room, each playing abstract colourful motion, reflections on a glossy floor. |
| process | A single beam of violet light travelling along a dark horizontal track, passing through glass blocks that light up one after another, blue and magenta refractions, slow sideways camera move. |
| toolkit | Chrome and glass objects (a camera lens, a film reel, a glowing cube) slowly rotating in a dark studio with neon rim light, product-shot style. |
| proof | A crowd in silhouette lit only by the glow of phone screens in violet and blue, slow motion, shallow focus, no faces visible. |
| service-ai-ad (3 s, 4:5) | Liquid chrome morphing into a sleek product shape. |
| service-music (3 s, 4:5) | Neon stage lights pulsing through smoke. |
| service-social (3 s, 4:5) | Vertical phone screens stacked in 3D space, scrolling. |
| service-longform (3 s, 4:5) | A dark corridor of film strips gliding past the camera. |
| finale | Violet and blue light rising slowly over a reflective black floor with rolling fog, the centre of frame kept empty and dark, camera craning up slowly. |
| before-after | No generated loop: uses Daniel's real raw-vs-final pairs. |

## C. Brands ("Trusted by" wall)

Logos go in public/brand/clients/ as transparent PNG or SVG (TODO from Daniel; the versions he has carry black/white boxes).

| Brand | Line (TODO Daniel confirms what was delivered) |
| --- | --- |
| Xanctum | Brand film and launch visuals for a market repositioning |
| Jobcondi | Explainer and social videos for a career platform |
| Xpers Streaming | Launch promo and motion identity for a streaming app |

Xperience itself is NOT on this wall. Its own projects show an "Xperience Original" tag (brand gradient) in Premium Samples and the Work Library.
