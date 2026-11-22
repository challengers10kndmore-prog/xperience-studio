# Xperience: setup before the build

Copy everything in this kit into your `xperience-studio` folder (the clone of
github.com/challengers10kndmore-prog/xperience-studio), keeping the folders as they are.
Files starting with a dot (.gitignore, .env.example) may be hidden on your computer; copy them too.

## 1. Things only you can do (about 15 minutes)

1. **Supabase secret key: make a new one.** The old one was pasted in a chat.
   supabase.com > your project > Project Settings > API Keys > Secret keys > delete it > create a new one.
2. **Supabase access token.** supabase.com > your avatar (top right) > Account preferences >
   Access Tokens > Generate new token. Name it "xperience build".
3. **Database password.** The one you chose when creating the project. If you don't remember it:
   Project Settings > Database > Reset database password.
4. **Media repo** (can wait until the build asks, in Phase 2):
   - github.com > New repository > `xperience-media` > **Public** > Create.
   - Fine-grained token: GitHub > Settings > Developer settings > Personal access tokens >
     Fine-grained tokens > Generate new token > Only select repositories: `xperience-media` >
     Repository permissions: **Contents: Read and write**, **Actions: Read and write** > Generate.
   - GitHub Pages gets switched on after the first push (Claude Code will remind you).

## 2. Fill in .env.local automatically

In a terminal, inside the `xperience-studio` folder:

```
node scripts/setup-env.mjs
```

It fills in every public value, asks only for the secrets (typing stays hidden), generates
the cookie secret, and checks each key against Supabase and GitHub. Press Enter to skip
anything you don't have yet, and run it again later to fill in the rest.

## 3. Start the build

Put your old `caleb-ai-vision` folder next to `xperience-studio` (same parent folder), as a reference.
Then, inside `xperience-studio`:

```
claude
```

Type: `Read BUILD_PROMPT.md and start the build.` It runs every phase back to back and writes
anything else it needs from you into `NEEDS_FROM_DANIEL.md`.

## Later: Vercel and GitHub secrets

When the build tells you to, copy these from `.env.local`:

- **Vercel** (Project > Settings > Environment Variables): every `VITE_` line, plus `SUPABASE_URL`,
  `SUPABASE_SECRET_KEY`, `MEDIA_REPO`, `MEDIA_BRANCH`, `MEDIA_HOST`, `GITHUB_TOKEN`, and all
  `EMERGENCY_` lines.
- **xperience-media repo** (Settings > Secrets and variables > Actions): `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.

Never add `SUPABASE_ACCESS_TOKEN` or `SUPABASE_DB_PASSWORD` anywhere but your laptop.
