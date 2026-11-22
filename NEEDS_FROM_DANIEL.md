# Needs from Daniel

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
