// The Invisible Jacket (v2): one continuous camera over one two-tier page.
// Leo walks home, finds a white-wax jacket in the hedge, becomes a paper-white hole, sneaks into the garden next door,
// finds a lonely lady by a pool nobody swims in, takes the jacket off, says hello, and cannonballs in. The splash floods the page.
import { layer, clear, line, fill, dab, text, handCircle, ellipse, xf, CAM, BOIL, W, H, sx, sy } from './crayon.js';
import { group, clearGroup } from './rig.js';
import { leo, lady, deckchair, rabbit, tortoise, duck, jacketShape } from './kids.js';
import { drawStreet, drawHollow, drawFence, drawGarden, drawWax, washHollow, washSplash, STREET, HOLLOW, GATE, POOL, CHAIR, pr } from './world.js';
import { PAL } from './pal.js';
import { clamp, lerp, hash, track, ss, eio, eo, ei } from '/core/lib.js';
const K = PAL.crayon;
export const DUR = 56;
const BPM = 88, BEAT = 60 / BPM;
const b = (bar, beat = 0) => (bar * 4 + beat) * BEAT;

// —— key times (on the 88 BPM grid) ——
export const TM = {
  kick: b(2, 2.5), clink: b(3), crouch: b(3, 2), sil1: b(3, 2), washA: b(4), washB: b(4, 2), surprised: b(4, 3),
  hold: b(5), sleeve: b(5, 1), zip: b(5, 2), pop: b(6), sneak: b(7), gate: b(9, 1), garden: b(10),
  rabbit: b(13), sigh: b(14), sil2: b(14, 1), off: b(15), hello: b(16), turn: b(16, 1), smile: b(16, 2),
  cheer: b(17), run: b(17, 1), jump: b(17, 3), splash: b(18), duckLand: b(18, 2), end: b(20),
};

// —— narration (t = speech start, d = measured length) ——
export const LINES = [
  { id: 'n1', t: 2.0, d: 2.45, text: 'Every day, Leo walked home the same way.' },
  { id: 'n2', t: 8.55, d: 0.68, text: 'Clink?' },
  { id: 'n3', t: 13.1, d: 2.24, text: 'A jacket, as white as nothing at all.' },
  { id: 'n4', t: 17.0, d: 1.09, text: 'And Leo was gone.' },
  { id: 'n5', t: 20.0, d: 1.94, text: 'Invisible, he could go anywhere.' },
  { id: 'n6', t: 29.6, d: 3.23, text: 'Next door, there was a pool that nobody ever swam in,' },
  { id: 'n7', t: 33.1, d: 2.31, text: 'and a lady who sat beside it, all alone.' },
  { id: 'n8', t: 41.5, d: 1.78, text: 'Leo didn’t want to hide any more.' },
  { id: 'n9', t: 45.3, d: 1.85, text: '“Fancy a swim?” she asked.' },
  { id: 'n10', t: 51.4, d: 2.06, text: 'And the pool was never empty again.' },
];
export let SUBS = [];
export function setDurations(dur) { LINES.forEach(L => { if (dur[L.id]) L.d = dur[L.id]; }); buildSubs(); }
function buildSubs() { SUBS = LINES.map((L, i) => { const t0 = L.t - 0.1; let t1 = Math.max(t0 + 1.8, L.t + L.d + 0.7); const nx = LINES[i + 1]; if (nx) t1 = Math.min(t1, nx.t - 0.2); return { t0, t1, text: L.text }; }); }
buildSubs();

// —— Leo's path ——
const walkX = t => lerp(520, 1180, clamp(t / TM.kick));
const sneakX = t => lerp(1470, 3050, clamp((t - TM.sneak) / (TM.gate - TM.sneak)));
const GSPOT = [2560, 1068];          // where Leo stands in the garden
const RUNTO = [2840, 936];           // edge of the pool
const SPLASH = [3030, 780];

// —— camera: world centre + zoom ——
const camT = track([
  [0, [880, 1190, 1.12]], [2.4, [880, 1190, 1.12]], [TM.kick, [1240, 1250, 1.12]], [TM.clink, [1380, 1300, 1.22]],
  [TM.crouch, [1560, 1372, 1.55]], [TM.washA, [1610, 1392, 1.8]], [TM.hold - 0.3, [1610, 1392, 1.8]],
  [TM.hold + 0.3, [1490, 1338, 1.5]], [TM.sneak, [1490, 1338, 1.5]], [TM.sneak + 0.8, [sneakX(TM.sneak + 0.8) + 110, 1335, 1.18]],
  [TM.gate - 0.2, [sneakX(TM.gate - 0.2) + 110, 1335, 1.18]], [TM.gate + 0.7, [3100, 1320, 1.15]],
  [TM.garden + 1.2, [3060, 800, 0.86]], [TM.garden + 2.6, [3150, 770, 0.8]], [TM.rabbit - 0.3, [3100, 790, 0.82]],
  [TM.rabbit + 0.5, [2720, 930, 1.05]], [TM.sigh - 0.4, [2720, 930, 1.05]], [TM.sigh + 1.0, [3690, 720, 1.6]], [TM.off - 0.8, [3700, 720, 1.6]],
  [TM.off, [3150, 840, 0.95]], [TM.cheer, [3150, 840, 0.95]], [TM.run + 0.6, [2930, 860, 1.08]], [TM.splash - 0.2, [3010, 770, 1.05]],
  [TM.splash + 0.4, [3020, 760, 1.0]], [TM.splash + 3.2, [3040, 700, 0.66]], [DUR, [3040, 700, 0.64]],
]);

// —— events for the mix (exported by core/render/events.mjs) ——
export const EV = [];
const ev = (t, type, o = {}) => EV.push({ t: +t.toFixed(3), type, ...o });
LINES.forEach(L => ev(L.t, 'voice', { id: L.id }));
ev(0, 'paper');
[[0.1, 0.9, 'path'], [0.5, 1.0, 'sign'], [3.4, 1.6, 'hedge'], [5.8, 2.4, 'fence']].forEach(([t, d, w]) => ev(t, 'scratch', { dur: d, what: w, pan: -0.2 }));
ev(0.5, 'write', { dur: 2.0, pan: -0.4 });               // the title
for (let k = 0; ; k++) { const t = k * BEAT; if (t >= TM.kick - 0.1) break; ev(t, 'step', { pan: -0.3 + 0.6 * clamp(t / TM.kick) }); }
ev(TM.kick, 'kick'); [TM.kick + 0.42, TM.kick + 0.72, TM.kick + 0.9].forEach((t, i) => ev(t, 'stonehop', { i, pan: 0.2 + i * 0.1 }));
ev(TM.kick + 0.9, 'roll', { dur: TM.clink - TM.kick - 0.9 }); ev(TM.clink, 'clink', { pan: 0.25 });
[8.6, 9.0, 9.3].forEach(t => ev(t, 'step', { pan: 0.1 })); ev(TM.crouch, 'crouch');
ev(TM.sil1, 'cricket', { dur: 1.5 });
ev(TM.washA, 'brush', { dur: TM.washB - TM.washA, dir: 1 }); ev(TM.washB, 'reveal');
ev(TM.hold, 'cloth'); ev(TM.sleeve, 'cloth'); ev(TM.zip, 'zip', { dur: 0.6 }); ev(TM.pop, 'vanish');
for (let k = 0; ; k++) { const t = TM.sneak + 0.17 + k * BEAT / 2; if (t > TM.gate - 0.1) break; ev(t, 'tiptoe', { i: k, pan: -0.4 + 0.8 * clamp((t - TM.sneak) / (TM.gate - TM.sneak)) }); }
ev(TM.gate, 'creak'); ev(TM.gate, 'gardenamb');
ev(TM.garden - 0.8, 'scratch', { dur: 3.4, what: 'garden', pan: 0.2 });
ev(TM.rabbit, 'hop'); [0, 1, 2, 3, 4, 5].forEach(k => ev(TM.rabbit + 0.5 + k * 0.26, 'sniff')); ev(TM.rabbit + 0.5, 'freeze'); ev(TM.sigh - 0.6, 'hop');
ev(TM.sigh, 'sigh');
ev(TM.off, 'unzip', { dur: 0.5 }); ev(TM.off + 0.05, 'scribble', { dur: 1.05 });
[0, 1, 2, 3, 4, 5, 6, 7].forEach(k => ev(TM.off + 0.08 + k * 0.13, 'colour', { k }));
ev(43.4, 'drop');
ev(TM.hello, 'write', { dur: 0.5, pan: -0.3 }); ev(TM.turn, 'turn'); ev(TM.smile, 'smile');
ev(TM.cheer, 'cheer');
for (let k = 0; k < 8; k++) ev(TM.run + k * 0.17, 'runstep', { pan: -0.2 + k * 0.05 });
ev(TM.jump, 'whoosh'); ev(TM.splash, 'splash'); ev(TM.splash + 0.1, 'brush', { dur: 2.6, dir: 1, big: 1 });
ev(TM.splash + 0.15, 'squeak'); ev(TM.duckLand, 'squeak'); ev(TM.duckLand + 0.1, 'laugh');
[['A', 0], ['B', TM.clink], ['C', TM.washA], ['D', TM.sneak], ['E', TM.garden], ['F', TM.sigh], ['G', TM.off], ['H', TM.splash]].forEach(([id, t]) => ev(t, 'cue', { id }));

// —— layers ——
const BG = { f: layer(), l: layer() }, WAX = layer(), JK = group(), INV = group(), CH = group(), FX = layer(), WASH = layer(), SUBK = layer(), SUBT = layer();

// —— Leo's pose at t: { o: leo() params, inv: true when invisible, reveal: 0..1 colour returning } ——
function leoState(t) {
  const st = { s: 1.0, seed: 3000, y: STREET };
  const beatK = Math.floor(t / BEAT);
  if (t < TM.kick) return { o: { ...st, x: walkX(t), pose: beatK % 2 ? 'walk1' : 'walk0', expr: 'normal' } };
  if (t < TM.kick + 0.42) return { o: { ...st, x: 1180, pose: 'kick', expr: 'smile' } };
  if (t < 8.4) return { o: { ...st, x: 1180, pose: 'stand', expr: t > TM.clink ? 'surprised' : 'normal', look: [1, 0] } };
  if (t < TM.crouch) { const u = pr(t, 8.4, TM.crouch); return { o: { ...st, x: lerp(1180, 1470, u), pose: Math.floor(t / (BEAT / 2)) % 2 ? 'walk1' : 'walk0', expr: 'normal' } }; }
  if (t < TM.hold) return { o: { ...st, x: 1470, pose: 'crouch', expr: t > TM.surprised ? 'surprised' : 'normal', look: [1, 0.3] } };
  if (t < TM.sleeve) return { o: { ...st, x: 1470, pose: 'front:hold', holding: true, expr: 'smile' } };
  if (t < TM.zip) return { o: { ...st, x: 1470, pose: 'front:sleeve', jacket: true, expr: 'smile' } };
  if (t < TM.zip + 0.7) return { o: { ...st, x: 1470, pose: 'front:zip', jacket: true, zip: pr(t, TM.zip, TM.zip + 0.6), expr: 'smile' } };
  if (t < TM.pop) return { o: { ...st, x: 1470, pose: 'front:stand', jacket: true, expr: 'sneaky' } };
  // invisible from here
  if (t < 17.0) return { inv: true, o: { ...st, x: 1470, pose: 'front:stand', jacket: true } };
  if (t < 18.0) return { inv: true, o: { ...st, x: 1470, pose: 'front:hands', jacket: true } };
  if (t < TM.sneak) return { inv: true, o: { ...st, x: 1470, pose: Math.floor(t * 3) % 2 ? 'front:wave1' : 'front:wave0', jacket: true } };
  if (t < TM.gate + 0.5) { const k = Math.floor((t - TM.sneak) / (BEAT / 2)); return { inv: true, o: { ...st, x: sneakX(t), pose: k % 2 ? 'walk1' : 'walk0', jacket: true } }; }
  if (t < TM.garden - 0.3) return null;   // through the gate, out of sight during the tilt
  const g = { s: 0.9, seed: 3000 };
  if (t < 29.4) { const u = pr(t, TM.garden - 0.3, 29.4); const k = Math.floor(t / (BEAT / 2)); return { inv: true, o: { ...g, x: lerp(3080, GSPOT[0], u), y: lerp(1100, GSPOT[1], u), pose: k % 2 ? 'walk1' : 'walk0', flip: true, jacket: true } }; }
  if (t < TM.rabbit + 0.45) return { inv: true, o: { ...g, x: GSPOT[0], y: GSPOT[1], pose: 'stand', jacket: true } };
  if (t < TM.sigh - 0.6) return { inv: true, o: { ...g, x: GSPOT[0], y: GSPOT[1], pose: 'front:freeze', jacket: true } };
  if (t < TM.off) return { inv: true, o: { ...g, x: GSPOT[0], y: GSPOT[1], pose: 'stand', jacket: true } };
  // the jacket comes off and colour scribbles back onto him, top to bottom
  if (t < 42.0) return { reveal: pr(t, TM.off, TM.off + 1.05), o: { ...g, x: GSPOT[0], y: GSPOT[1], pose: 'front:sleeve', jacket: t < TM.off + 0.35, expr: 'normal' } };
  if (t < 43.4) return { o: { ...g, x: GSPOT[0], y: GSPOT[1], pose: 'front:hold', holding: true, expr: 'smile' } };
  if (t < TM.hello) return { o: { ...g, x: GSPOT[0], y: GSPOT[1], pose: 'front:stand', expr: 'smile' } };
  if (t < TM.cheer) return { o: { ...g, x: GSPOT[0], y: GSPOT[1], pose: Math.floor((t - TM.hello) / (BEAT / 2)) % 2 ? 'front:wave1' : 'front:wave0', expr: t < TM.smile + 0.3 ? 'hello' : 'smile' } };
  if (t < TM.run) return { o: { ...g, x: GSPOT[0], y: GSPOT[1] - 14 * Math.sin(pr(t, TM.cheer, TM.run) * Math.PI), pose: 'front:cheer', expr: 'happy' } };
  if (t < TM.jump) { const u = pr(t, TM.run, TM.jump); return { o: { ...g, x: lerp(GSPOT[0], RUNTO[0], u), y: lerp(GSPOT[1], RUNTO[1], u), pose: Math.floor(t / 0.17) % 2 ? 'run1' : 'run0', expr: 'happy' } }; }
  if (t < TM.splash) { const u = pr(t, TM.jump, TM.splash); return { o: { ...g, x: lerp(RUNTO[0], SPLASH[0], u), y: lerp(RUNTO[1], SPLASH[1] + 40, u) - 300 * Math.sin(u * Math.PI), r: u * 1.6, pose: 'tuck', expr: 'happy' } }; }
  if (t < TM.splash + 0.55) return null;  // under water
  return { o: { s: 0.9, seed: 3000, x: SPLASH[0], y: SPLASH[1] + 6 * Math.sin(t * 3), pose: 'swim', ph: Math.floor(t * 2) % 2, expr: 'happy' } };
}
function ladyState(t) {
  const base = { x: CHAIR.x, y: CHAIR.y, s: 1.0, seed: 6000, flip: true, pose: 'sit' };
  if (t < TM.turn) return { ...base, expr: 'sad', headTilt: t > TM.sigh && t < TM.sigh + 1.2 ? 0.2 : 0.1 + 0.02 * Math.sin(t * 1.3) };
  if (t < TM.smile) return { ...base, expr: 'surprised', headTilt: -0.05 };
  if (t < 45.7) return { ...base, expr: 'smile' };
  if (t < TM.splash) return { ...base, expr: 'smile', armUp: true };
  if (t < TM.duckLand) return { ...base, expr: 'surprised', headTilt: -0.08 };
  if (t < TM.duckLand + 0.5) return { ...base, expr: 'surprised', headTilt: -0.05 };
  return { ...base, expr: 'laugh', headTilt: -0.1 + 0.04 * Math.sin(t * 9) };
}

// —— on-screen texts (for readcheck) ——
export function TEXTS(t) {
  const cam = camT(t); [CAM.x, CAM.y, CAM.s] = cam;
  const out = [];
  const box = (id, str, wx, wy, size, alignLeft) => { const w = str.length * size * 0.5 * CAM.s, h = size * CAM.s; const x = sx(wx), y = sy(wy); const x0 = alignLeft ? x : x - w / 2; out.push({ id, text: str, x0, y0: y - h, x1: x0 + w, y1: y + h * 0.2 }); };
  if (t > 0.5 && t < 9) { box('title1', 'The Invisible', 330, 900, 150, true); box('title2', 'Jacket', 330, 1040, 150, true); }
  if (t > 1.0 && t < 9) { box('sign1', 'SCHOOL', 154, 1260, 42); box('sign2', 'HOME', 308, 1338, 42); }
  if (t > TM.hello && t < 45.85) { const L = leoState(t); if (L) box('hello', 'Hello!', L.o.x + 150, L.o.y - 330, 64); }
  if (t > TM.splash + 1.6) box('end', 'The End', 3160, 270, 170);
  return out.filter(q => q.x1 > 0 && q.x0 < W && q.y1 > 0 && q.y0 < H);
}

// —— render one frame ——
export function frame(comp, t) {
  [CAM.x, CAM.y, CAM.s] = camT(t);
  BOIL.amp = t > TM.sigh - 0.5 && t < TM.off ? 0.5 : 1;
  clearGroup(JK); clearGroup(INV); clearGroup(CH);
  [BG.f, BG.l, WAX, FX, WASH, SUBK, SUBT].forEach(clear);
  const jit = (hash(BOIL.step * 1.7) - 0.5) * 1.6;
  // the page
  const p = {
    verge: pr(t, 0.1, 1.2), path: pr(t, 0.1, 0.9), sign: pr(t, 0.4, 1.4), hedge: pr(t, 3.6, 5.6), hedgeL: pr(t, 3.2, 4.8),
    fence: pr(t, 5.8, 8.6), fenceF: pr(t, 6.6, 9.4),
    lawn: pr(t, TM.garden - 0.8, TM.garden + 1.2), lawnL: pr(t, TM.garden - 1.2, TM.garden + 0.6), sun: pr(t, TM.garden, TM.garden + 1.0),
    tree: pr(t, TM.garden + 0.2, TM.garden + 1.6), treeL: pr(t, TM.garden - 0.2, TM.garden + 0.8), parasol: pr(t, TM.garden + 0.6, TM.garden + 1.8),
    pool: pr(t, TM.garden + 0.4, TM.garden + 2.0), poolL: pr(t, TM.garden, TM.garden + 1.0),
  };
  if (t > TM.garden - 1.2) drawGarden(BG.f, BG.l, p);
  drawStreet(BG.f, BG.l, p);
  drawHollow(BG.f, BG.l, pr(t, 3.8, 5.0));
  drawFence(BG.f, BG.l, p, ss(pr(t, TM.gate, TM.gate + 0.5)) * (1 - ss(pr(t, TM.garden + 2, TM.garden + 2.6))));
  // title and signpost words
  if (t > 0.5) {
    text(BG.l, 'The Invisible', sx(330), sy(900), { size: 150 * CAM.s, font: 'Gaegu', weight: 700, reveal: pr(t, 0.5, 1.8), seed: 21, p: 0.95, stroke: 2, align: 'left' });
    text(BG.l, 'Jacket', sx(330), sy(1040), { size: 150 * CAM.s, font: 'Gaegu', weight: 700, reveal: pr(t, 1.9, 2.6), seed: 29, p: 0.95, stroke: 2, align: 'left', col: K.red });
  }
  if (t > 1.0) {
    text(BG.l, 'SCHOOL', sx(154), sy(1260), { size: 42 * CAM.s, font: 'Gaegu', weight: 700, reveal: pr(t, 1.0, 1.4), seed: 35, p: 0.9 });
    text(BG.l, 'HOME', sx(308), sy(1338), { size: 42 * CAM.s, font: 'Gaegu', weight: 700, reveal: pr(t, 1.3, 1.6), seed: 36, p: 0.9 });
  }
  // white wax: hidden words and bubbles in the garden, the jacket in the hollow, later the jacket dropped on the lawn
  if (t > TM.splash) drawWax(WAX, WAX);
  if (t < TM.hold) jacketShape(JK, pts => pts, 1640, 1424, 3500, false);
  if (t > 43.8) jacketShape(JK, pts => xf(pts, { x: 2440, y: 1092, s: 0.85, sy: 0.45, r: -0.12 }), 0, 0, 3510, false);
  // the stone
  if (t > TM.kick && t < TM.clink) {
    const u = t - TM.kick; let x, y;
    if (u < 0.42) { const v = u / 0.42; x = lerp(1250, 1400, v); y = 1488 - 90 * Math.sin(v * Math.PI); }
    else if (u < 0.72) { const v = (u - 0.42) / 0.3; x = lerp(1400, 1500, v); y = 1488 - 40 * Math.sin(v * Math.PI); }
    else { const v = clamp((u - 0.72) / (TM.clink - TM.kick - 0.72)); x = lerp(1500, 1640, v); y = 1488; }
    dab(FX, x, y, 12, { col: K.violet, p: 0.85, seed: 40 + Math.floor(t * 12), boil: 0 });
    line(FX, handCircle(x, y, 13, 41), { w: 4, seed: 42, boil: 0.5 });
  }
  // Leo
  const L = leoState(t);
  if (L) {
    if (L.inv) leo(INV, { ...L.o, x: L.o.x + jit });
    else {
      leo(CH, L.o);
      if (L.reveal !== undefined && L.reveal < 1) {
        leo(INV, L.o);                                            // the uncoloured part stays paper
        const top = L.o.y - 300 * L.o.s, bot = L.o.y + 10, yc = lerp(top, bot, L.reveal);
        eraseBelow(CH.f, yc, L.o.x, 3700 + Math.floor(t * 12)); eraseBelow(CH.l, yc, L.o.x, 3800 + Math.floor(t * 12));
      }
    }
  }
  // the dropped jacket flutters down (faint outline so we can follow it)
  if (t > 43.4 && t < 43.8) { const u = (t - 43.4) / 0.4; jacketShape(CH, pts => xf(pts, { x: lerp(2560, 2440, u), y: lerp(940, 1092, u), s: 0.85, sy: lerp(1, 0.45, u), r: -0.12 * u + 0.3 * Math.sin(u * 6) }), 0, 0, 3520, true); }
  // the garden cast
  if (t > TM.garden - 0.4) {
    const g = pr(t, TM.garden - 0.4, TM.garden + 1.6);
    if (g > 0.45) { deckchair(CH, { x: CHAIR.x + 10, y: CHAIR.y, s: 1.0, seed: 6100, flip: true }); lady(CH, ladyState(t)); }
    // rabbit: sits, hops over, sniffs the invisible boy, hops away
    let rx = 2400, rpose = 'sit', rflip = false;
    if (t > TM.rabbit && t < TM.rabbit + 0.45) { rx = lerp(2400, 2470, pr(t, TM.rabbit, TM.rabbit + 0.45)); rpose = 'hop'; }
    else if (t >= TM.rabbit + 0.45 && t < TM.sigh - 0.6) { rx = 2470; rpose = 'sniff'; }
    else if (t >= TM.sigh - 0.6 && t < TM.sigh - 0.15) { rx = lerp(2470, 2330, pr(t, TM.sigh - 0.6, TM.sigh - 0.15)); rpose = 'hop'; rflip = true; }
    else if (t >= TM.sigh - 0.15) { rx = 2330; rflip = true; }
    if (g > 0.3) rabbit(CH, { x: rx, y: 1074, s: 0.95, pose: rpose, flip: rflip, twitch: Math.floor(t * 6) % 2, seed: 6200 });
    if (g > 0.5) tortoise(CH, { x: 3290 + Math.max(0, t - TM.garden) * 5, y: 1040, s: 0.9, head: 0.5 + 0.5 * Math.sin(t * 1.4), seed: 6300 });
    // the rubber duck: bobs alone, then flies onto her hat
    let dx = 2900 + 30 * Math.sin(t * 0.7), dy = 760 + 6 * Math.sin(t * 2.1), dr = 0.06 * Math.sin(t * 1.9), dflip = false;
    if (t >= TM.splash) { const u = pr(t, TM.splash, TM.duckLand); dx = lerp(2930, 3800, eio(u)); dy = lerp(760, 548, u) - 380 * Math.sin(u * Math.PI); dr = u * 6.28; if (u >= 1) dr = 0; }
    if (g > 0.6) duck(CH, { x: dx, y: dy, s: t >= TM.duckLand ? 0.75 : 0.9, r: dr, flip: dflip, seed: 6400 });
  }
  // speech bubble
  if (t > TM.hello && t < 45.85) {
    const L2 = leoState(t), bx = L2.o.x + 150, by = L2.o.y - 340, a = pr(t, TM.hello, TM.hello + 0.25);
    fill(FX, ellipse(bx, by, 120, 64, 36), { col: K.white, p: 0.95, gap: 6, w: 9, seed: 700, draw: a, boil: 0 });
    line(FX, ellipse(bx, by, 120, 64, 36), { w: 5, seed: 702, draw: a, boil: 0.8 });
    line(FX, [[bx - 70, by + 46], [bx - 110, by + 96], [bx - 34, by + 58]], { w: 5, seed: 703, draw: a, boil: 0.8 });
    text(FX, 'Hello!', sx(bx), sy(by + 20), { size: 64 * CAM.s, font: 'Gaegu', weight: 700, reveal: pr(t, TM.hello + 0.1, TM.hello + 0.55), seed: 704, col: K.ink });
  }
  // the water column: rises out of the pool into the sky, then falls back (crayon, over everything)
  if (t > TM.splash && t < TM.splash + 2.1) {
    const up = eo(pr(t, TM.splash, TM.splash + 0.75)), down = ei(pr(t, TM.splash + 1.2, TM.splash + 2.1));
    const top = lerp(SPLASH[1], 150, up), bot = lerp(SPLASH[1], top, down) + 0, cx = SPLASH[0];
    if (bot - top > 20 || down < 1) {
      const half = y => lerp(70, 46, clamp((SPLASH[1] - y) / (SPLASH[1] - 150)));
      const wob = (y, k) => 10 * Math.sin(y * 0.03 + k + t * 6);
      const colP = []; for (let y = Math.max(top, bot - 9999); y <= Math.max(top + 1, SPLASH[1] - (SPLASH[1] - bot)); y += 18) colP.push([cx - half(y) + wob(y, 1), y]);
      const rightP = []; for (let y = Math.max(top + 1, SPLASH[1] - (SPLASH[1] - bot)); y >= top; y -= 18) rightP.push([cx + half(y) + wob(y, 4), y]);
      const poly = [...colP, ...rightP];
      if (poly.length > 4) { fill(FX, poly, { col: K.sky, p: 0.9, gap: 7, w: 10, ang: 1.5, seed: 980 + Math.floor(t * 12) % 3, boil: 0.5 }); line(FX, [...poly, poly[0]], { w: 5, col: K.ink, p: 0.7, seed: 985, boil: 0.8 }); }
      // the top bursts into drops
      for (let i = 0; i < 9; i++) { const a = -Math.PI * (0.1 + 0.8 * i / 8), r = 40 + 120 * up; dab(FX, cx + Math.cos(a) * r, top + Math.sin(a) * r * 0.6 + 200 * down, 11, { col: K.sky, p: 0.9, seed: 990 + i, boil: 0.4 }); }
    }
  }
  // splash: droplets and rings (crayon, drawn after the wash)
  if (t > TM.splash && t < TM.splash + 1.6) {
    const u = pr(t, TM.splash, TM.splash + 1.6);
    for (let i = 0; i < 14; i++) { const a = -Math.PI * (0.1 + 0.8 * i / 13), r0 = 40 + 220 * eo(u), x = SPLASH[0] + Math.cos(a) * r0, y = SPLASH[1] - 20 + Math.sin(a) * r0 * 1.1 + 260 * u * u; line(FX, [[x, y], [x + Math.cos(a) * 26, y + Math.sin(a) * 26]], { w: 7, col: K.sky, p: 0.95 * (1 - u), seed: 720 + i, boil: 0.5 }); }
    [0, 1].forEach(k => { const r = 60 + 300 * eo(clamp(u * 1.3 - k * 0.25)); line(FX, ellipse(SPLASH[0], SPLASH[1] + 14, r, r * 0.3, 40), { w: 5, col: K.ink, p: 0.5 * (1 - u), seed: 740 + k, boil: 0.5 }); });
  }
  // the wash: the hollow, then the flood
  washHollow(WASH, t, TM.washA, TM.washB);
  washSplash(WASH, t, TM.splash, SPLASH[0], SPLASH[1]);
  // bubbles in the plume and the crown, and sparkles on the pool (white crayon over the blue)
  if (t > TM.splash + 0.8) {
    const a = pr(t, TM.splash + 0.8, TM.splash + 2.0);
    for (let i = 0; i < 26; i++) {
      const crown = i < 16, hx = hash(i * 3.7), hy = hash(i * 9.1 + 2);
      const x = crown ? SPLASH[0] + 60 + (hx - 0.5) * 1300 : SPLASH[0] + (hx - 0.5) * 170, y = crown ? 225 + (hy - 0.5) * 260 : 160 + hy * 560;
      if (crown && x > 2860 && x < 3460 && y > 120 && y < 300) continue;
      const r = 7 + 14 * hash(i + 40), bob = 4 * Math.sin(t * 2 + i);
      if (hash(i + 77) < a) line(FX, handCircle(x, y + bob, r, 900 + i, 0.08, 18), { w: 4.5, col: K.white, p: 1, seed: 930 + i, boil: 0.6 });
    }
    for (let i = 0; i < 7; i++) { const x = POOL.x0 + 90 + i * 115, y = POOL.y0 + 46 + (i % 3) * 72; line(FX, [[x - 26, y], [x + 26, y - 4]], { w: 5, col: K.white, p: a, seed: 960 + i, boil: 0.6 }); }
  }
  subTo(SUBK, SUBT, t);
  // composite: paper → page crayon → white wax → invisible boy (paper hole) → wash → characters → effects → subtitles
  comp.paperCam(CAM.x * 0.6, CAM.y * 0.6, CAM.s / 0.6);
  comp.begin();
  comp.crayon(BG.f.c); comp.crayon(BG.l.c);
  comp.crayon(WAX.c); comp.crayon(JK.f.c); comp.crayon(JK.l.c);
  comp.knock(INV.k.c);
  if (t > TM.washA) comp.wash(WASH.c, { color: PAL.wash });
  const go = [hash(BOIL.step) * 300, hash(BOIL.step + 7) * 300];
  comp.group(CH, { goff: go });
  comp.crayon(FX.c, { goff: go });
  comp.knock(SUBK.c); comp.crayon(SUBT.c);
  comp.finish({ vig: 0.28 });
}
function eraseBelow(Lyr, yc, cx, seed) {
  const g = Lyr.g; g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.beginPath();
  const x0 = cx - 200, x1 = cx + 200; g.moveTo(sx(x0), sy(yc + 400));
  for (let x = x0, i = 0; x <= x1; x += 14, i++) g.lineTo(sx(x), sy(yc + (i % 2 ? 9 : -9) + (hash(seed + i) - 0.5) * 8));
  g.lineTo(sx(x1), sy(yc + 400)); g.closePath(); g.fill(); g.restore();
}
export function subTo(SUBK, SUBT, t) {
  const S = SUBS.find(s => t >= s.t0 && t < s.t1); if (!S) return;
  const rv = pr(t, S.t0, S.t0 + 0.35);
  const g = SUBK.g; g.save(); g.font = '400 54px "Patrick Hand"'; const tw = g.measureText(S.text).width; g.restore();
  const cx = 960, cy = 1002, hw = tw / 2 + 46, hh = 44;
  g.save(); g.fillStyle = '#000'; g.beginPath();
  for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 2; const px = Math.cos(a), py = Math.sin(a); const sq = Math.pow(Math.abs(px), 0.3) * Math.sign(px); const n = 1 + 0.06 * Math.sin(a * 7 + 1.3) + 0.03 * Math.sin(a * 17); const X = cx + sq * hw * n, Y = cy + py * hh * n; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }
  g.closePath(); g.fill(); g.restore();
  text(SUBT, S.text, cx, cy + 18, { size: 54, col: K.ink, reveal: rv, seed: 11 + S.t0 * 3, p: 1, stroke: 1.2 });
}
