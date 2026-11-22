-- Seed content from BUILD_PROMPT.md APPENDIX (first drafts; Daniel edits in admin).
insert into public.site_settings (id, hero_headline, hero_sub, hero_cta_primary, hero_cta_secondary, credit_line, tagline,
  contact_email, whatsapp, seo_title, seo_description, maintenance, maintenance_message, stats, tools, copy)
values (1,
  'Stories, generated and cut by hand.',
  'I''m Daniel Ogbeifun Osewe. I direct AI films and edit video for brands, artists and creators who need work that stops the scroll.',
  'Watch the reel', 'Start a project',
  'An Xperience production · Founded by Daniel Ogbeifun Osewe',
  'PLAY · CONNECT · EVOLVE',
  null, null,
  'Xperience | AI Video & Video Editing Studio by Daniel Ogbeifun Osewe',
  'AI films, ads and social edits, directed and cut by Daniel Ogbeifun Osewe at Xperience.',
  false, 'We''re polishing a few frames. Back very soon.',
  '[
    {"key":"projects","label":"Projects delivered","value":0,"suffix":"+","todo":true},
    {"key":"views","label":"Views generated","value":0,"suffix":"M+","todo":true},
    {"key":"turnaround","label":"Typical turnaround","value":0,"suffix":" days","todo":true},
    {"key":"repeat","label":"Repeat clients","value":0,"suffix":"%","todo":true}
  ]'::jsonb,
  '[
    {"name":"Veo","group":"generative"},{"name":"Kling","group":"generative"},{"name":"Runway","group":"generative"},
    {"name":"Midjourney","group":"generative"},{"name":"ElevenLabs","group":"generative"},
    {"name":"Premiere Pro","group":"finishing"},{"name":"DaVinci Resolve","group":"finishing"},
    {"name":"After Effects","group":"finishing"},{"name":"CapCut","group":"finishing"}
  ]'::jsonb,
  '{
    "manifesto":{"text":"AI gives me a thousand shots. Editing decides which twelve matter."},
    "premium":{"headline":"Selected work.","sub":"The pieces I''d show first, each with the brief, my role and the result."},
    "crafts":{"headline":"Two crafts. One eye.","ai":"Concept to finished film with generative tools. Ads, music videos, product films, worlds that don''t exist yet.","editing":"Your footage, cut for pace, colour and sound. YouTube, reels, commercials, documentaries."},
    "beforeAfter":{"headline":"Raw in. Finished out.","sub":"Drag to see what happens between the first output and the final frame."},
    "library":{"headline":"Everything, sorted.","sub":"Filter by craft, format or industry."},
    "process":{"headline":"From brief to final cut, in five passes.","steps":[
      {"title":"Brief","text":"You send the idea, references, deadline and any footage. I come back with questions and a plan."},
      {"title":"Concept and boards","text":"Look, pacing and key shots agreed before anything is made."},
      {"title":"Generate or shoot","text":"AI shots generated and directed, or your footage organised and logged."},
      {"title":"Edit, grade, sound","text":"Cut for rhythm, coloured to match, mixed so it lands with or without sound."},
      {"title":"Deliver","text":"Final files in every format you need, ready to post or run."}]},
    "toolkit":{"headline":"The kit.","sub":"Generative models for the impossible shots, industry tools for the finish."},
    "proof":{"headline":"Clients don''t hire a tool. They hire a result."},
    "services":{"headline":"Ways to work together."},
    "faq":{"headline":"Questions, answered."},
    "finale":{"headline":"Have footage? Have an idea? Let''s make the cut.","cta":"Start a project"}
  }'::jsonb)
on conflict (id) do nothing;

insert into public.services (slug, title, description, included, turnaround, price_from, sort_order) values
  ('ai-ad', 'AI ad or product film', 'A finished spot built with generative visuals, edited and scored for your channels.',
    array['Concept and boards','Generated shots, directed','Edit, grade and sound','Cutdowns for each channel'], 'TODO', 'TODO', 1),
  ('music', 'Music video and visualizers', 'Full videos, lyric visuals and loops that match the track''s energy.',
    array['Treatment','Full video or visualizer','Lyric visuals','Loops for streaming platforms'], 'TODO', 'TODO', 2),
  ('social', 'Monthly social edit pack', 'A steady stream of short-form edits for Reels, TikTok and Shorts.',
    array['Monthly batch of short edits','Captions and hooks','Vertical-first formats','Fast revision loop'], 'TODO', 'TODO', 3),
  ('longform', 'Long-form and YouTube editing', 'Story-led edits for videos, documentaries and series, with grade and sound.',
    array['Story edit','Colour grade','Sound mix','Thumbnails-ready stills'], 'TODO', 'TODO', 4)
on conflict (slug) do nothing;

insert into public.faqs (question, answer, sort_order) values
  ('Who owns the final video?', 'You do. You get full commercial rights to the final delivered files.', 1),
  ('How long does a project take?', 'Most short pieces take TODO days from approved brief to delivery.', 2),
  ('Can you work with footage I already have?', 'Yes. Send it in any format and I''ll mix it with generated shots where it helps.', 3),
  ('How many revisions are included?', 'TODO rounds of revisions are included in every project.', 4),
  ('How do we start?', 'Message me on WhatsApp or email with your idea and deadline. I''ll reply with questions and a quote.', 5);

insert into public.brands (slug, name, line, sort_order) values
  ('xanctum', 'Xanctum', 'Brand film and launch visuals for a market repositioning', 1),
  ('jobcondi', 'Jobcondi', 'Explainer and social videos for a career platform', 2),
  ('xpers-streaming', 'Xpers Streaming', 'Launch promo and motion identity for a streaming app', 3)
on conflict (slug) do nothing;

insert into public.section_media (key, label, prompt) values
  ('hero','Hero','A vast dark void with slow-drifting particles of violet and electric-blue light, faint volumetric beams from above, a glossy black floor with soft neon reflections, low fog rolling along the floor, camera pushing forward very slowly.'),
  ('manifesto','Manifesto','Hundreds of translucent film frames drifting through dark space in slow motion, most dim and out of focus; one frame in the centre sharpens and glows violet as the camera slowly dollies toward it.'),
  ('premium-intro','Premium intro (2 s card)','An empty dark cinema seen from the back row, a projector beam cutting through haze in violet and blue light, dust floating in the beam, the screen glowing soft white.'),
  ('crafts-ai','Two Crafts: AI','A surreal landscape forming out of liquid light, neon violet and blue geometry melting and re-forming like a fluid simulation, dreamlike and slow.'),
  ('crafts-editing','Two Crafts: Editing','Extreme close-up of an editing timeline on a dark monitor, clips sliding into place and a magenta playhead scrubbing across, very shallow depth of field so the interface is soft bokeh.'),
  ('library','Work Library','A slow tracking shot along a wall of glowing screens in a dark room, each playing abstract colourful motion, reflections on a glossy floor.'),
  ('process','Process','A single beam of violet light travelling along a dark horizontal track, passing through glass blocks that light up one after another, blue and magenta refractions, slow sideways camera move.'),
  ('toolkit','Toolkit','Chrome and glass objects (a camera lens, a film reel, a glowing cube) slowly rotating in a dark studio with neon rim light, product-shot style.'),
  ('proof','Proof','A crowd in silhouette lit only by the glow of phone screens in violet and blue, slow motion, shallow focus, no faces visible.'),
  ('service-ai-ad','Service: AI ad (3 s, 4:5)','Liquid chrome morphing into a sleek product shape.'),
  ('service-music','Service: Music (3 s, 4:5)','Neon stage lights pulsing through smoke.'),
  ('service-social','Service: Social (3 s, 4:5)','Vertical phone screens stacked in 3D space, scrolling.'),
  ('service-longform','Service: Long-form (3 s, 4:5)','A dark corridor of film strips gliding past the camera.'),
  ('finale','Finale','Violet and blue light rising slowly over a reflective black floor with rolling fog, the centre of frame kept empty and dark, camera craning up slowly.')
on conflict (key) do nothing;
