-- Projects can come from a Google Drive link: the sync downloads it, makes a 10 s preview + poster,
-- and the site's player streams the full film from Drive ("Watch the full film").
alter table public.projects add column if not exists source_url text;
comment on column public.projects.source_url is 'Google Drive share link of the full film (Anyone with the link can view).';
