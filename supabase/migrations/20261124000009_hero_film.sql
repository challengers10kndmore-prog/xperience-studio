-- Hero film: an intro (plays once per session) and a seamless loop, plus the cue sheet that times the headline + work cards.
alter table public.site_settings add column if not exists hero_cues jsonb not null default '{}'::jsonb;

insert into public.section_media (key, label, prompt, overlay_opacity) values
  ('hero-intro', 'Hero film: intro (plays once per visit)', 'The new AI hero film, intro part. Desktop 16:9 and mobile 9:16. Its last frame must match the first frame of the hero loop.', 0.2),
  ('hero-loop', 'Hero film: loop (seamless)', 'The new AI hero film, loop part. Desktop 16:9 and mobile 9:16. Seamless; its first frame matches the intro''s last frame.', 0.2)
on conflict (key) do nothing;
