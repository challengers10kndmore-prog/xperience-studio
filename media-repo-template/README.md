# xperience-media

Public media host for the Xperience site (GitHub Pages). Managed by automation; don't edit by hand.

- `v/` videos, `t/` teasers, `p/` posters, `s/` section loops, `b/` brand logos
- `manifest.json` published snapshot of the site's public data (fallback when Supabase is down)
- `source.json` data-source switch (`auto` | `github` | `supabase`) + emergency maintenance flag
- `status.json` last keep-alive
- Actions: `sync` (transcode uploads from the Supabase inbox, hourly safety net), `keep-alive` (every 3 days)

Masters over 95 MB live in the `masters` release (download links only).
