-- Website customization: order and visibility of the home page sections (hero stays first, footer last).
alter table public.site_settings add column if not exists layout jsonb not null default '{}'::jsonb;
