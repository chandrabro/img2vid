# Image → Animated Video (100% free, no backend)

Upload a picture; the app animates it and exports a video. Everything runs in the browser — no API keys, no server, no cost.

## Deploy (GitHub + Vercel)
1. Put the contents of this folder (index.html, style.css, js/) at the root of a GitHub repo.
2. Vercel → Add New Project → import the repo → Framework preset **Other**, no build command, no output dir → Deploy.
(It also works by opening index.html directly.)

## What it does
- **Effects**: smoke, fire, clouds, waterfall, water, birds, rain, rays, stars, leaves, dust, fireflies, sway, swing, head nod, eyes, blink, look, stir, wave, peck, tail wag, puppet pins.
- **Cut-outs**: lasso / box / optional AI cut, then make it walk, wander and peck (hens), with shadow, gait and perspective. The hole left behind is filled automatically (soft fill — works best on plain ground; lasso for tricky ones).
- **Depth parallax**: quick depth, or optional free in-browser AI depth, with 3D camera moves.
- **Scenes**: many images, captions, transitions (fade, dip, slide, wipe).
- **Light**: dawn → night, one-click mood presets.
- **Sound**: procedural ambience (wind, birds, hens, fire, water, rain, crickets), your own music, microphone voice-over.
- **Export**: fast MP4 (WebCodecs, Chrome/Edge/Safari), real-time recording (any browser), GIF (silent), save/load project.

## New in this version
- **3D camera** (orbit, sideways, push in…) now zooms just enough that no blank or stretched edge can ever appear.
- **Auto-detect in 3 groups**: 🧑 Humans, 🐕 Animals, 🌳 Non-living things (clouds, trees, sunlight, fire, smoke; works offline). Humans and animals are found as a **whole body** and cut out, so only that body moves (breathing, sway, head nod; birds peck and wander). 🧍 *Tap a person / animal* does the same for one body.
- **🌐 All scenes tab**: tick "apply to all scenes" (or Quick add) and an effect appears in the same region of every scene; editing it in one scene updates all.

## Added in this update
- **Apply to all scenes** on every Scene setting: length and transition, camera, depth (Quick or AI), light, film look and one-click moods. Tick "keep the same in all scenes" for live sync, or press "Apply to all now".
- **🎞 Film look**: colour grades, glow, film grain, cinema bars.
- **Video shape**: 16:9, 9:16 (Reels/Shorts), square, 4:3, 3:4.
- **Title card / The End** scenes with your own text.
- **Autosave** in the browser every 45 s, with a "Restore last session" button.

## Sound preview and transitions
- Voice-over and music previews have ▶ / ■ Stop buttons.
- Pressing ▶ Play (or Play all scenes) now plays ambience, your music and the voice-over together with the picture. Ambient, master and music volume sliders change the sound live.
- New default transition **Smooth cross-zoom** (1.2 s): both scenes keep moving while they blend, with an eased cross-fade. **Blur dissolve** is the other soft option.

## Notes
- AI options (cut-out, depth, object detection) download free models from a CDN on first use; they need internet and a few seconds. Everything else works offline.
- Browser text-to-speech cannot be captured into video, so voice-over is recorded with the mic or uploaded.
