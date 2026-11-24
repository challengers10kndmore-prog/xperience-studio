# Needs from Daniel

**Done:** admin password, media repo + GitHub Pages + secrets, GitHub token, Vercel, emergency login, go-live (main = build).
Live: https://xperience-studio.vercel.app · Preview (build branch): https://xperience-studio-git-build-challengers10kndmore-prog.vercel.app

## Still to do: content in /admin (in the order that improves the site most)
1. **Site settings:** contact email + WhatsApp (the contact buttons appear), check the hero text.
2. **Projects > Bulk upload:** your best films; fill brief / role / result; switch on Published.
3. **Premium:** tick "Premium sample" on 3 to 6 films, then drag the order under "Premium order".
4. **Featured:** tick "Featured" on 5 to 7 films (the cards orbiting the hero).
5. **Hero videos (Google Flow), in Section videos:**
   - **Hero: assembly:** 8 s, you assembling from particles; desktop 16:9 + mobile 9:16. The last frame must match the idle loop's first frame. The sync job cuts it into ~96 frames; the poster (end frame) is made automatically.
   - **Hero: idle loop:** 8 s seamless loop, same framing; desktop 16:9 + mobile 9:16.
   - Camera locked, left third dark and empty, no audio.
   - **Hero film (ready to upload; it replaces the assembly hero once the intro and loop are both in):**
     - **Hero film: intro** > Desktop: `hero-intro` (16:9, 15.83 s). Mobile: `hero-intro-phone-9x16`.
     - **Hero film: loop** > Desktop: `hero-loop` (16:9, 37.08 s). Mobile: leave empty.
     - **Hero: idle loop** > Mobile: `hero-idle-loop-phone-9x16` (6.92 s). This replaces the old phone file. Leave Desktop as it is.
     - Upload all four files in one go, so the old hero never plays with the new phone loop.
     - The cue sheet is already loaded (admin > Site settings > "Hero film cue sheet"). To see the zones on the live site, add `?zones=1` to the address.
6. **Section background loops:** hero, manifesto, finale first; then the rest (prompts below).
7. **Stats and tools:** real numbers (projects delivered, views generated, typical turnaround, repeat clients), switch off "placeholder" on each; confirm the tool chips.
8. **Services and FAQs:** turnaround + "from" price per service; days per project and revision rounds in the FAQs; confirm "You own the final video".
9. **Brands:** transparent PNG/SVG logos for Xanctum, Jobcondi, Xpers Streaming; confirm each one-line description.
10. **Before / After:** 1 to 3 raw-vs-final pairs (same length and framing).
11. **Testimonials:** quotes or short videos (hidden until there's one).

**Optional:** the original Xperience logo (large transparent PNG) so the redrawn logo can be matched exactly. Save as `public/brand/xperience-logo.png` or send it.

## Section loops: spec and prompts
- **Every loop:** 8 to 10 s, seamless, 1080p about 3 to 6 MB, no audio, left third darker and empty. Make a 16:9 desktop and a 9:16 mobile version.
- **Add to the end of every prompt:** "Cinematic, slow camera motion, deep violet-black shadows, accent lighting in violet, electric blue and neon magenta, high contrast, subtle film grain, no text, no logos, no readable faces, calm and premium, seamless loop, 16:9, left third of frame darker and empty."
- **Where:** admin > Section videos > pick the section > upload desktop + mobile > Save. It publishes by itself.

| Section | Prompt |
| --- | --- |
| hero (background behind the figure) | A vast dark void with slow-drifting particles of violet and electric-blue light, faint volumetric beams from above, a glossy black floor with soft neon reflections, low fog rolling along the floor, camera pushing forward very slowly. |
| manifesto | Hundreds of translucent film frames drifting through dark space in slow motion, most dim and out of focus; one frame in the centre sharpens and glows violet as the camera slowly dollies toward it. |
| premium-intro (2 s card) | An empty dark cinema seen from the back row, a projector beam cutting through haze in violet and blue light, dust floating in the beam, the screen glowing soft white. |
| crafts-ai | A surreal landscape forming out of liquid light, neon violet and blue geometry melting and re-forming like a fluid simulation, dreamlike and slow. |
| crafts-editing | Extreme close-up of an editing timeline on a dark monitor, clips sliding into place and a magenta playhead scrubbing across, very shallow depth of field so the interface is soft bokeh. |
| library | A slow tracking shot along a wall of glowing screens in a dark room, each playing abstract colourful motion, reflections on a glossy floor. |
| process | A single beam of violet light travelling along a dark horizontal track, passing through glass blocks that light up one after another, blue and magenta refractions, slow sideways camera move. |
| toolkit | Chrome and glass objects (a camera lens, a film reel, a glowing cube) slowly rotating in a dark studio with neon rim light, product-shot style. |
| proof | A crowd in silhouette lit only by the glow of phone screens in violet and blue, slow motion, shallow focus, no faces visible. |
| service-ai-ad (3 s, 4:5) | Liquid chrome morphing into a sleek product shape. |
| service-music (3 s, 4:5) | Neon stage lights pulsing through smoke. |
| service-social (3 s, 4:5) | Vertical phone screens stacked in 3D space, scrolling. |
| service-longform (3 s, 4:5) | A dark corridor of film strips gliding past the camera. |
| finale | Violet and blue light rising slowly over a reflective black floor with rolling fog, the centre of frame kept empty and dark, camera craning up slowly. |

Before / After needs no generated loop: it uses your real raw-vs-final pairs.
