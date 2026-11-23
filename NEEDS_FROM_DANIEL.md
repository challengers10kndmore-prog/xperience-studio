# Needs from Daniel

**Done (Nov 2026):** admin password (via email link), media repo + Pages + Actions secrets, GitHub token, Vercel project + variables, emergency login (browser setup + Authenticator add-on). Preview: https://xperience-studio-git-build-challengers10kndmore-prog.vercel.app

**Still to do:** content in /admin (checklist below), then your 3D model, then say "yes, go live".

## Content checklist (in the order that improves the site most)
1. Site settings: contact email + WhatsApp (buttons appear), check hero copy.
2. Projects: bulk upload your best films; fill brief / role / result; tick Published.
3. Premium order: tick "Premium sample" on 3 to 6 films and drag the order.
4. Featured: tick "Featured" on 5 to 7 films (the hero's orbiting videos).
5. Section videos: hero, manifesto, finale first; then the rest (prompts in item 5 below).
6. Stats and tools: real numbers, untick "placeholder"; confirm tool chips.
7. Services: turnaround + "from" price. FAQs: replace the TBC numbers.
8. Brands: transparent logos for Xanctum, Jobcondi, Xpers Streaming; confirm their lines.
9. Before / After: 1 to 3 raw-vs-final pairs.
10. Testimonials: quotes or short videos (hidden until there's one).
11. Last: your 3D model (item 7 below).

---

Everything the site still needs from you. Each item says what, why, the steps, where it goes and which phase uses it.
The site works without these (placeholders are in place); fill them in when you can.

## 1. Choose your admin password (Phase 1, needed before you use /admin)
- **What:** your admin account already exists (the email in ADMIN_EMAIL) but has a random password nobody knows.
- **Steps:** on your laptop, in the `xperience-studio` folder: `npm install`, then `node scripts/make-admin.mjs`. Type a password (at least 10 characters) twice.
- **Where:** nothing to copy anywhere; Supabase stores it.

## 2. The Xperience logo file (Phase 1, brand)
- **What:** the original logo image, ideally a large PNG with a transparent background.
- **Why:** I redrew the logo as SVG and 3D from the description (see docs/brand/logo-2d-vs-3d.png). With the real file I'll match shapes and sample exact colours.
- **Where:** save it as `public/brand/xperience-logo.png` (or send it in chat).

## 3. The media repo (Phase 2, needed before videos go live)
- **What:** a public GitHub repo `challengers10kndmore-prog/xperience-media` that serves the videos.
- **Steps:**
  1. github.com > New repository > name `xperience-media` > **Public** > tick "Add a README" > Create.
  2. Install the Claude GitHub app on it: https://github.com/apps/claude/installations/select_target > your account > Repository access > add `xperience-media` > Save. (This lets the build session push the Actions.)
  3. Fine-grained token (if you haven't already): GitHub > Settings > Developer settings > Fine-grained tokens > Only `xperience-media` > Contents: Read and write, Actions: Read and write, Pages: Read and write. Save it as `GITHUB_TOKEN` (cloud environment variable, and later in Vercel).
  4. Tell me "media repo ready". I'll push the Actions, then you'll switch on Pages (Settings > Pages > Deploy from branch > main > / (root)).
- **Until then:** the site uses bundled placeholder content and animated brand-colour backgrounds.

## 4. Emergency admin login (Phase 3, before going live)
- **What:** a second way into the admin that works even if Supabase is down (password + 6-digit code from an authenticator app).
- **Steps:** on your laptop, in `xperience-studio`: `node scripts/make-emergency-credentials.mjs`. Scan the QR code with Google Authenticator (or Authy / 1Password), type the code it shows, answer `y` to save.
- **Where:** then copy `EMERGENCY_PASSWORD_HASH`, `EMERGENCY_TOTP_SECRET` and `EMERGENCY_SESSION_SECRET` from `.env.local` into Vercel > Settings > Environment Variables.
- **Use it at:** `/admin/emergency`.

## 5. Section background loops (Phase 4, any time)
- **What:** short looping videos behind each section. Until then an animated brand-colour placeholder shows.
- **Spec for every loop:** 8 to 10 s, seamless (crossfade the last second into the first), H.264 1080p about 4 Mbps (3 to 6 MB), no audio, left third darker and empty. Make a 16:9 desktop AND a 9:16 mobile version.
- **Add this to the end of every prompt:** "Cinematic, slow camera motion, deep violet-black shadows, accent lighting in violet, electric blue and neon magenta, high contrast, subtle film grain, no text, no logos, no readable faces, calm and premium, seamless loop, 16:9, left third of frame darker and empty."
- **Where:** admin > Section videos > pick the section > upload desktop + mobile > Save. It publishes by itself.

| Section | Prompt |
| --- | --- |
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

## 6. Real content (Phase 4, before going live)
- **Projects:** admin > Projects > Bulk upload (drop your videos), then fill brief / role / result and tick Published. Tick "Premium sample" on 3 to 6 and "Featured" on 5 to 7. Until then the site shows clearly-tagged *Placeholder* films.
- **Before / After pairs:** admin > Before / After. Raw and final clips with the same length and framing.
- **Client logos:** transparent PNG or SVG for Xanctum, Jobcondi, Xpers Streaming (yours have black/white boxes). Upload in admin > Brands. Also confirm each brand's one-line description.
- **Numbers (shown as TBC/TODO now):** projects delivered, views generated, typical turnaround, repeat clients (admin > Stats and tools); turnaround and "from" price per service (admin > Services); days per project and revision rounds (admin > FAQs); confirm "you own the final video".
- **Tools list:** confirm the toolkit chips (admin > Stats and tools).
- **Contact:** your email and WhatsApp number (admin > Site settings) so the buttons appear.
- **Testimonials:** quotes or short videos from clients (admin > Testimonials). The block stays hidden until there's one.

## 7. Your 3D model for the hero (Phase 5, any time)
- **What:** a 3D model of you. Until then a simple stand-in figure assembles from particles (see docs/brand/hero-assembly.png).
- **Photos first:** 4 photos in flat, even light (no harsh shadows): front, back, left, right. Plus one full-body front shot standing in an A-pose (arms slightly away from your sides), plain background.
- **Make the model (free), pick one:**
  1. Hunyuan3D-2 on Hugging Face (search "Hunyuan3D-2 space") > upload the A-pose front photo > Generate > download GLB.
  2. TRELLIS on Hugging Face (search "TRELLIS space") > same steps.
  3. Meshy (meshy.ai, free tier) > Image to 3D > download GLB. If you use Meshy's free tier, tell me: the footer must then say "3D model generated with Meshy".
- **Optional rig (breathing + head turns toward the cursor):** mixamo.com (free Adobe account) > Upload character > place markers > pick an "Breathing Idle" animation > Download FBX with skin > convert to GLB (e.g. in Blender: File > Import FBX, File > Export glTF Binary).
- **Where:** send me the file, or run `node scripts/prepare-model.mjs your-file.glb` (it cleans and compresses it to `public/models/daniel.glb`, under 4 MB). The site picks it up automatically.

## 8. Hosting (Phase 6, to see preview links)
- **Vercel:** vercel.com > Add New > Project > import `xperience-studio` > Environment Variables: add the list in `docs/FINAL_REPORT.md` > Deploy. Use the `build` branch for previews.
- **Supabase password-reset link:** once you have the Vercel URL: supabase.com > project > Authentication > URL Configuration > Site URL = that URL, and add `https://<that-url>/admin/login` under Redirect URLs.
- **Check on your iPhone:** open the preview in Safari and tell me if anything looks off.
