# The Invisible Jacket — the series

A daily Instagram Reel / TikTok: vertical 1080×1920, **15–20 s** (6–7 bars at 88 BPM), 24 fps, English narration with burned-in subtitles, −14 LUFS.
Style: Crayon Picture Book. Same page, characters, theme tune and sounds in every episode.

## Folders

```
films/leo-series/
  engine/        the drawing engine (vertical), characters (kids.js), the page (world.js), props (props.js), common.js
  episodes/      one file per episode: ep02.js, ep03.js, …  ← the only thing written per episode
  audio/         score.py (music from mood cues) and mix.py (foley, ambience, voice, music), shared
  build_episode.sh   one command: narration → events → music → mix → subtitles → picture → mp4
  epNN/          output: epNN.mp4, epNN.srt, audio/
```

## Making an episode cheaply (the routine)

1. **Pick the next beat** from the outline below (or a new idea).
2. **Copy the last episode** to `episodes/epNN.js` and change only:
   - `LINES`: 3–4 short narration lines (one sentence each, ≤ 9 words is ideal);
   - `TM`: the key times, on the 88 BPM grid with `b(bar, beat)` (6–7 bars ≈ 16–19 s);
   - the camera keys, the characters' states, the props that appear;
   - the mood cues: `walk`, `mystery`, `sneak`, `silence`, `crunch`, `theme`, `tutti`, `tbc` (always end on `tbc` + "To be continued…").
3. **One check**: render about 8 stills (`still.mjs … --range 1:29:4`) and look at one contact sheet. Fix only what's broken.
4. **Cover**: add one line to `engine/covers.js` (camera, title, question, scene) and render it: `node core/render/still.mjs films/leo-series/engine 0 --size 1080x1920 --q 'cover=NN'`. Big Leo with a clear expression, a title of 1–2 words, a question as the hook; keep it all inside y 240–1680 (the profile-grid crop).
5. **Build**: `sh films/leo-series/build_episode.sh NN` (≈ 15–20 min of render time, no extra credits while it runs).

What keeps the credit cost low: no new characters or engine code per episode; reuse props; one review round; ~30 s length; music and mix are generated from the cues, not written by hand. Add a new prop or pose only when the story really needs it.

Rules that keep the series consistent:
- **Leo is the protagonist of every episode**: every episode is seen through him, he is on screen in every shot, and he is the one who acts at the turn. Other characters (the lady, the rabbit) only support him.
- 15–20 s: one idea, one turn, one hook. 3–4 narration lines at most.
- One new idea per episode, ending on a hook ("To be continued…").
- Invisible things are paper holes (knock-out); the one watercolour (ultramarine) is used once per episode at most.
- Hold every subtitle ≥ 1.8 s; keep words out of the top 250 px and the bottom 450 px (Instagram's buttons and caption).

## The weekly rhythm (from episode 7)

| Day | Theme | Places |
|---|---|---|
| Monday | **School** | classroom, playground (to build) |
| Tuesday | **Football** | the pitch (`engine/pitch.js`) |
| Wednesday | **Friends** | Leo and Edo, anywhere |
| Thursday | **Home** | kitchen, Leo's room (to build) |
| Friday | **The jacket mystery** | the garden, the street, the hedge |

The jacket can make small cameos on the other days (a white sleeve peeking out of the backpack).

## Cast

- **Leo** — the protagonist, always on screen. Orange T-shirt, violet shorts, spiky brown hair, yellow backpack.
- **Edo** — Leo's best friend. Dark curly hair, freckles, sky-blue shirt. `edo(C, o)` in `engine/kids.js` (Leo's rig with `EDO` options).
- **The lady next door**, **the rabbit** (invisible, wears the jacket), **the tortoise**, **the rubber duck**.
- To add a kid: call `leo(C, { hair: 'curly' | default, hairCol, freckles, shirt, shorts, pack })`. Adults: `lady()`.

## Season 1 outline (one line per episode)

1. *The Invisible Jacket* — Leo finds the jacket, sneaks next door, says hello, cannonball. (first film, 16:9)
2. **Gone** — the jacket is gone; drag marks lead to the burrow; a carrot floats: the rabbit has it. ✅
3. **Footprints** — Leo sprinkles flour on the lawn; little invisible paw prints appear and hop away from him. ✅
4. **Splash!** — Leo throws a bucket of water where the footprints end; for one second the wash shows a rabbit. ✅
5. **Carrot Trap** — Leo hides behind the tree; the carrots vanish closer and closer; then one floats right behind him. ✅
6. **The Name Tag** — a scrap of the jacket on the fence, a blank label; Leo paints over it and the wash reveals the name: LEO. ✅
7. **The Big Kick** (Tue · football) — Edo passes, Leo kicks it really hard, the ball vanishes… splash and a duck squeak from next door. ✅
8. **New Kid** (Wed · friends) — how Leo met Edo: alone on the street with a ball; "Hi! I'm Leo!"; then two white ears in the hedge. ✅
9. **Night Watch** (Fri · mystery) — Leo keeps watch with a torch; the beam finds a paper-white rabbit.
10. **Rain** — rain falls (the wash); Leo spots a dry rabbit-shaped patch on the lawn.
11. **Got You** — Leo catches the rabbit in a gentle hug; the jacket comes off; the rabbit wanted to be seen too.
12. **Who Else?** — Leo hangs the jacket back in the hedge… and the next morning, it's gone again. (season hook)


Ideas kept for later: *The Duck Ride* (the duck sails by itself, a rabbit-shaped dent in the water), *Leo's Plan* (a crayon map in his notebook), *Bubbles* (soap bubbles pop on something invisible).

Next ideas for the weekly days: *Late!* (Mon · school: the bell rings as Leo slides into his seat), *Show and Tell* (Mon · school: Leo shows the LEO label; the teacher goes pale), *The Goalkeeper* (Tue · Leo in goal, saves a penalty with his eyes shut), *New Kid* (Wed · how Leo met Edo), *Homework* (Thu · Leo's drawing comes alive on the notebook).
