# Xperience site: instructions for Claude Code

- The full brief is BUILD_PROMPT.md. Before doing anything, read BUILD_PROMPT.md, then docs/BUILD_PLAN.md and docs/BUILD_LOG.md if they exist, and continue from the first unticked item. If docs/BUILD_PLAN.md doesn't exist yet, start BUILD_PROMPT.md at step 0.
- Run all phases back to back. The only hard stops are listed in BUILD_PROMPT.md (going live, production env vars, deleting Daniel's data, force-push).
- Reference code: clone https://github.com/ogbex101/caleb-ai-vision into ../caleb-ai-vision if it isn't there. Read-only; never push to it.
- Cloud sessions (claude.ai/code): secrets are environment variables on the cloud environment, not .env.local; don't run scripts/setup-env.mjs there. When something is missing, tell Daniel the exact variable name to add to the environment. If a direct Postgres connection to Supabase is blocked, apply migrations through the Supabase Management API (api.supabase.com) with SUPABASE_ACCESS_TOKEN. If a domain is blocked, tell Daniel the exact domain to add under Network access > Custom.
- Local sessions: secrets live in .env.local (gitignored). If it's missing, ask Daniel to run: node scripts/setup-env.mjs
- Daniel is not a developer: explain anything he must do in short, plain steps. Never print or commit a secret.
