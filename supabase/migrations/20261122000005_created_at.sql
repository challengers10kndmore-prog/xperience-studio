-- Admin lists sort by sort_order, then created_at. These tables were missing the column.
alter table public.services add column if not exists created_at timestamptz not null default now();
alter table public.faqs add column if not exists created_at timestamptz not null default now();
alter table public.before_after add column if not exists created_at timestamptz not null default now();
alter table public.section_media add column if not exists created_at timestamptz not null default now();
