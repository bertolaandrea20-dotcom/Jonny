# The Invisible Jacket — the series

A daily Instagram Reel: vertical 1080×1920, about 30 s, 24 fps, English narration with burned-in subtitles, −14 LUFS.
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
   - `LINES`: 4–6 short narration lines (one sentence each, ≤ 9 words is ideal);
   - `TM`: the key times, on the 88 BPM grid with `b(bar, beat)` (11 bars ≈ 30 s);
   - the camera keys, the characters' states, the props that appear;
   - the mood cues: `walk`, `mystery`, `sneak`, `silence`, `crunch`, `theme`, `tutti`, `tbc` (always end on `tbc` + "To be continued…").
3. **One check**: render about 8 stills (`still.mjs … --range 1:29:4`) and look at one contact sheet. Fix only what's broken.
4. **Build**: `sh films/leo-series/build_episode.sh NN` (≈ 15–20 min of render time, no extra credits while it runs).

What keeps the credit cost low: no new characters or engine code per episode; reuse props; one review round; ~30 s length; music and mix are generated from the cues, not written by hand. Add a new prop or pose only when the story really needs it.

Rules that keep the series consistent:
- One new idea per episode, ending on a hook ("To be continued…").
- Invisible things are paper holes (knock-out); the one watercolour (ultramarine) is used once per episode at most.
- Hold every subtitle ≥ 1.8 s; keep words out of the top 250 px and the bottom 450 px (Instagram's buttons and caption).

## Season 1 outline (one line per episode)

1. *The Invisible Jacket* — Leo finds the jacket, sneaks next door, says hello, cannonball. (first film, 16:9)
2. **Gone** — the jacket is gone; drag marks lead to the burrow; a carrot floats: the rabbit has it. ✅
3. **Footprints** — Leo and the lady sprinkle flour on the lawn; little invisible paw prints appear, hopping to the pool.
4. **The Duck Ride** — the rubber duck sails across the pool by itself, with a rabbit-shaped dent in the water.
5. **Mrs. Bloom's Secret** — the lady shows Leo an old photo: she had the jacket as a girl. (name the lady)
6. **The Name Tag** — inside the collar, a tag in white crayon; the wash reveals a name nobody expected.
7. **Night Watch** — Leo and Mrs. Bloom keep watch with a torch; the torch beam finds a paper-white rabbit.
8. **Carrot Trap** — they lay a trail of carrots to the shed; every carrot vanishes, bite by bite.
9. **Rain** — rain falls (the wash); the invisible rabbit shows up as a dry rabbit-shaped patch on the lawn.
10. **Got You** — the rabbit is caught in a gentle hug; the jacket comes off; the rabbit wanted to be seen too.
11. **Who Else?** — the jacket goes back into the hedge… and the next morning, it's gone again. (season hook)
