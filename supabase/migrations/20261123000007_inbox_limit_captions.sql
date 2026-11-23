-- Supabase Free rejects any single object over 50 MB, whatever the bucket says. Match it, so errors are clear.
update storage.buckets set file_size_limit = 52428800 where id = 'inbox';

-- Posters + captions
alter table public.projects add column if not exists caption text check (caption is null or char_length(caption) <= 120);
alter table public.projects add column if not exists show_caption boolean not null default false;
alter table public.projects add column if not exists cover_url text;   -- poster with the caption baked in (same aspect as the video)
alter table public.projects add column if not exists og_url text;      -- 1200x630 share card
alter table public.projects add column if not exists poster_time numeric; -- chosen frame (seconds); null = picked automatically
alter table public.projects add column if not exists poster_source text not null default 'auto' check (poster_source in ('auto', 'time', 'upload'));
alter table public.testimonials add column if not exists poster_time numeric;
alter table public.before_after add column if not exists poster_time numeric;
