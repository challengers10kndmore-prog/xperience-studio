-- Xperience: fresh schema
create extension if not exists pgcrypto;

-- ---------- helpers ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- ---------- admins ----------
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- enums ----------
create type public.discipline as enum ('ai', 'editing');
create type public.media_status as enum ('pending', 'published', 'failed');

-- ---------- brands ----------
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  line text,
  website text,
  logo_url text,
  sort_order int not null default 0,
  published boolean not null default true,
  inbox jsonb not null default '{}'::jsonb,
  media_status public.media_status not null default 'published',
  media_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- projects ----------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  discipline public.discipline not null,
  category text,
  subcategory text,
  aspect_ratio text not null default '16:9',
  duration_s numeric,
  description text,
  brief text,
  role text,
  result text,
  tools text[] not null default '{}',
  brand_id uuid references public.brands(id) on delete set null,
  is_featured boolean not null default false,
  is_premium boolean not null default false,
  premium_order int,
  is_xperience_original boolean not null default false,
  sort_order int not null default 0,
  published boolean not null default false,
  inbox_path text,
  inbox jsonb not null default '{}'::jsonb,
  video_url text,
  poster_url text,
  teaser_url text,
  full_video_url text,
  media_status public.media_status not null default 'pending',
  media_synced_at timestamptz,
  media_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_public_idx on public.projects (published, discipline, sort_order);

-- ---------- site settings (single row) ----------
create table public.site_settings (
  id int primary key default 1 check (id = 1),
  hero_headline text,
  hero_sub text,
  hero_cta_primary text,
  hero_cta_secondary text,
  credit_line text,
  tagline text,
  contact_email text,
  whatsapp text,
  seo_title text,
  seo_description text,
  og_image_url text,
  maintenance boolean not null default false,
  maintenance_message text,
  stats jsonb not null default '[]'::jsonb,
  tools jsonb not null default '[]'::jsonb,
  copy jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- section media ----------
create table public.section_media (
  key text primary key,
  label text,
  prompt text,
  desktop_url text,
  mobile_url text,
  poster_url text,
  overlay_opacity numeric not null default 0.6 check (overlay_opacity between 0 and 1),
  published boolean not null default true,
  inbox jsonb not null default '{}'::jsonb,
  media_status public.media_status not null default 'published',
  media_synced_at timestamptz,
  media_error text,
  updated_at timestamptz not null default now()
);

-- ---------- testimonials ----------
create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  company text,
  brand_id uuid references public.brands(id) on delete set null,
  quote text,
  video_url text,
  poster_url text,
  sort_order int not null default 0,
  published boolean not null default false,
  inbox jsonb not null default '{}'::jsonb,
  media_status public.media_status not null default 'published',
  media_synced_at timestamptz,
  media_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- services ----------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  included text[] not null default '{}',
  turnaround text,
  price_from text,
  loop_url text,
  poster_url text,
  sort_order int not null default 0,
  published boolean not null default true,
  inbox jsonb not null default '{}'::jsonb,
  media_status public.media_status not null default 'published',
  media_synced_at timestamptz,
  media_error text,
  updated_at timestamptz not null default now()
);

-- ---------- faqs ----------
create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order int not null default 0,
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ---------- before / after ----------
create table public.before_after (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  label text,
  description text,
  before_url text,
  after_url text,
  poster_url text,
  sort_order int not null default 0,
  published boolean not null default false,
  inbox jsonb not null default '{}'::jsonb,
  media_status public.media_status not null default 'pending',
  media_synced_at timestamptz,
  media_error text,
  updated_at timestamptz not null default now()
);

-- ---------- contact messages ----------
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200),
  message text not null check (char_length(message) between 1 and 5000),
  budget text check (budget is null or char_length(budget) <= 120),
  source text check (source is null or char_length(source) <= 120),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- page views (minimal) ----------
create table public.page_views (
  id bigint generated always as identity primary key,
  path text not null check (char_length(path) <= 300),
  referrer text check (referrer is null or char_length(referrer) <= 500),
  created_at timestamptz not null default now()
);
create index page_views_created_idx on public.page_views (created_at);

-- ---------- updated_at triggers ----------
do $$
declare t text;
begin
  foreach t in array array['brands','projects','site_settings','section_media','testimonials','services','faqs','before_after'] loop
    execute format('create trigger %I_updated before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;
