-- Video-driven hero: frame-sequence info written by the sync job, and two new upload slots.
alter table public.section_media add column if not exists frames jsonb not null default '{}'::jsonb;

insert into public.section_media (key, label, prompt, overlay_opacity) values
  ('hero-assembly', 'Hero: assembly (8 s, plays as frames)', 'Daniel assembling from particles of violet and electric-blue light over 8 seconds, scattered at the start, fully formed and still at the end. Camera locked. Left third of frame darker and empty. The last frame must match the first frame of hero-idle.', 0.35),
  ('hero-idle', 'Hero: idle loop (8 s, seamless)', 'Daniel fully formed, standing calmly, subtle breathing and light shimmer, seamless 8 second loop. Camera locked, framing identical to the last frame of hero-assembly. Left third of frame darker and empty.', 0.35)
on conflict (key) do nothing;
