// Episode 2 — "Gone". The next morning the jacket is gone. Drag marks lead to the rabbit's burrow.
// Then a carrot floats up out of the veg patch: the rabbit has the jacket, and the rabbit is invisible.
import { track, clamp, lerp, eio, eo, ss } from '/core/lib.js';
import { line, fill, dab, ellipse, handCircle, xf, sx, sy } from '../engine/crayon.js';
import { leo, lady, deckchair, rabbit, tortoise, duck, jacketShape } from '../engine/kids.js';
import { drawStreet, drawFence, drawGarden, CHAIR, GATE } from '../engine/world.js';
import { burrow, vegPatch, dragMarks, carrot, burrowPoly, SPOT, VEG, BURROW } from '../engine/props.js';
import { L, K, BEAT, b, pr, begin, composite, events, buildSubs, subTo, seriesCard, toBeContinued } from '../engine/common.js';

export const DUR = 30;
const TM = { arrive: b(1, 1), gone: b(1, 2.4), drag: b(2, 2), crouch: b(3, 3), sil: b(4), crunch: b(5), bite1: b(5, 2), bite2: b(6), bite3: b(6, 2), knows: b(7), away: b(8), tbc: b(9) };
export const LINES = [
  { id: 'n1', t: 0.7, d: 2.6, text: 'The next morning, Leo came back for the jacket.' },
  { id: 'n2', t: 4.3, d: 1.2, text: 'But it was gone.' },
  { id: 'n3', t: 7.2, d: 1.9, text: 'Something had dragged it away.' },
  { id: 'n4', t: 14.4, d: 1.8, text: 'Then a carrot began to float.' },
  { id: 'n5', t: 19.5, d: 1.3, text: 'Leo knew that trick.' },
  { id: 'n6', t: 21.6, d: 2.0, text: 'Someone else had found the jacket.' },
];
export const SUBS = buildSubs(LINES);

// —— camera (world centre x, y, zoom) for a vertical frame ——
const camT = track([
  [0, [3180, 880, 0.86]], [2.0, [3060, 930, 0.92]], [TM.arrive + 0.3, [2470, 960, 2.2]], [TM.drag, [2460, 960, 2.2]],
  [TM.crouch, [2250, 975, 2.4]], [TM.crunch - 0.1, [2240, 975, 2.45]], [TM.crunch + 0.7, [2400, 950, 1.85]],
  [TM.knows - 0.5, [2490, 940, 1.45]], [TM.away, [2420, 950, 1.45]], [TM.tbc, [2400, 930, 1.3]], [DUR, [2400, 920, 1.22]],
]);

// —— Leo ——
function leoState(t) {
  const g = { s: 0.9, seed: 3000 };
  if (t < 0.25) return null;
  if (t < 2.0) { const u = pr(t, 0.25, 2.0); return { ...g, x: lerp(3070, 2720, u), y: lerp(1104, 1084, u), pose: Math.floor(t / 0.17) % 2 ? 'run1' : 'run0', flip: true, expr: 'happy' }; }
  if (t < TM.arrive) { const u = pr(t, 2.0, TM.arrive); return { ...g, x: lerp(2720, 2530, eo(u)), y: 1082, pose: Math.floor(t / 0.17) % 2 ? 'run1' : 'run0', flip: true, expr: 'happy' }; }
  if (t < TM.drag) return { ...g, x: 2530, y: 1082, pose: 'peek', flip: true, expr: t < TM.gone ? 'smile' : 'surprised' };
  if (t < TM.crouch) { const u = pr(t, TM.drag, TM.crouch); return { ...g, x: lerp(2530, 2290, u), y: lerp(1082, 1044, u), pose: Math.floor(t / (BEAT / 2)) % 2 ? 'walk1' : 'walk0', flip: true, expr: 'normal' }; }
  if (t < TM.crunch) return { ...g, x: 2290, y: 1044, pose: 'crouch', flip: true, expr: t > TM.sil + 1.3 ? 'worried' : 'normal' };
  if (t < TM.crunch + 2.2) return { ...g, x: 2290, y: 1044, pose: 'front:freeze', expr: 'surprised' };
  if (t < TM.knows) return { ...g, x: 2290, y: 1044, pose: 'front:stand', expr: 'surprised', look: [1, 0] };
  return { ...g, x: 2290, y: 1044, pose: 'front:stand', expr: t < TM.away ? 'sneaky' : 'smile', look: [1, 0] };
}
// —— the lady: waves from her chair, then gets up and comes over when the carrot floats ——
function ladyDraw(t) {
  if (t < TM.crunch + 0.6) {
    deckchair(L.CH, { x: CHAIR.x + 10, y: CHAIR.y, s: 1.0, seed: 6100, flip: true });
    lady(L.CH, { x: CHAIR.x, y: CHAIR.y, s: 1.0, seed: 6000, flip: true, pose: 'sit', expr: t < 3 ? 'smile' : 'normal', armUp: t < 2.6 && Math.floor(t * 3) % 2 === 0 });
    return;
  }
  deckchair(L.CH, { x: CHAIR.x + 10, y: CHAIR.y, s: 1.0, seed: 6100, flip: true });
  const u = pr(t, TM.crunch + 0.6, TM.knows - 0.6);
  const x = lerp(3700, 2700, eio(u)), y = lerp(960, 1080, eio(u)) - (u > 0 && u < 1 ? 10 * Math.abs(Math.sin(t * 7)) : 0);
  const pose = u >= 1 && t > TM.knows + 0.6 && t < TM.away + 0.5 ? 'front:point' : 'front:stand';
  lady(L.CH, { x, y, s: 1.0, seed: 6000, pose, expr: u < 1 ? 'surprised' : t < TM.away ? 'surprised' : 'smile', flip: true });
}
// —— the invisible rabbit (a paper hole) holding the carrot ——
const RAB = [2468, 1052];
function rabbitState(t) {
  if (t < TM.crunch) return null;
  if (t < TM.away) return { x: RAB[0], y: RAB[1], pose: t < TM.crunch + 0.3 ? 'hop' : 'sit' };
  const u = pr(t, TM.away, TM.tbc - 0.2);
  if (u >= 1) return null;
  return { x: lerp(RAB[0], BURROW.x + 10, u), y: lerp(RAB[1], BURROW.y + 30, u), pose: Math.floor(t / 0.25) % 2 ? 'hop' : 'sit', flip: true };
}
function bites(t) { return (t > TM.bite1) + (t > TM.bite2) + (t > TM.bite3); }

// —— events ——
export const { EV, ev } = (() => { const E = events(); return { EV: E.EV, ev: E.ev }; })();
LINES.forEach(Ln => ev(Ln.t, 'voice', { id: Ln.id }));
ev(0, 'paper'); ev(0.2, 'write', { dur: 1.6, pan: 0 }); ev(0.25, 'creak');
for (let k = 0; ; k++) { const t = 0.3 + k * 0.17; if (t > TM.arrive) break; ev(t, 'runstep', { pan: 0.3 - k * 0.03 }); }
ev(TM.arrive, 'cloth'); ev(TM.gone, 'sting');
ev(TM.drag, 'scratch', { dur: TM.crouch - TM.drag, pan: -0.2 });
for (let k = 0; ; k++) { const t = TM.drag + 0.1 + k * BEAT / 2; if (t > TM.crouch) break; ev(t, 'tiptoe', { i: k, pan: -0.2 }); }
ev(TM.crouch, 'crouch'); ev(TM.sil, 'brush', { dur: 1.0, dir: -1 }); ev(TM.sil, 'cricket', { dur: 2.6 });
ev(TM.crunch, 'pull'); ev(TM.crunch + 0.1, 'freeze');
[TM.bite1, TM.bite2, TM.bite3].forEach(t => ev(t, 'crunch'));
for (let k = 0; ; k++) { const t = TM.crunch + 0.7 + k * 0.42; if (t > TM.knows - 0.6) break; ev(t, 'step', { pan: 0.4 - k * 0.05 }); }
[0, 1, 2, 3, 4, 5].forEach(k => ev(TM.away + k * 0.25, 'hopsoft', { pan: -0.1 - k * 0.08 }));
ev(TM.tbc - 0.2, 'plop'); ev(TM.tbc, 'write', { dur: 1.3, pan: 0 });
[['walk', 0], ['mystery', TM.gone], ['silence', TM.sil], ['crunch', TM.crunch], ['theme', TM.knows], ['tbc', TM.tbc]].forEach(([id, t]) => ev(t, 'cue', { id }));

// —— on-screen texts for readcheck ——
export function TEXTS(t) { begin(camT(t)); return [...seriesCard(t, 0.2, 3.6, 2), ...toBeContinued(t, TM.tbc)]; }

// —— one frame ——
export function frame(comp, t) {
  begin(camT(t));
  const all = { verge: 1, path: 1, sign: 1, hedge: 1, hedgeL: 1, fence: 1, fenceF: 1, lawn: 1, lawnL: 1, sun: 1, tree: 1, treeL: 1, parasol: 1, pool: 1, poolL: 1 };
  drawGarden(L.BG.f, L.BG.l, all);
  burrow(L.BG.f, L.BG.l);
  vegPatch(L.BG.f, L.BG.l, t > TM.crunch ? [2] : []);
  if (t > TM.drag - 0.2) dragMarks(L.BG.l, pr(t, TM.drag - 0.2, TM.crouch));
  drawStreet(L.BG.f, L.BG.l, all);
  drawFence(L.BG.f, L.BG.l, all, t < 2.6 ? ss(pr(t, 0, 0.3)) * (1 - ss(pr(t, 2.1, 2.6))) : 0);
  // the empty spot where the jacket lay: a faint outline of where it was (the grass is flattened)
  if (t > 1.0) line(L.BG.l, ellipse(SPOT[0], SPOT[1], 70, 18, 30), { w: 3.5, col: K.green, p: 0.55, seed: 1400, boil: 0.6 });
  // the cast
  const Ld = leoState(t); if (Ld) leo(L.CH, Ld);
  ladyDraw(t);
  tortoise(L.CH, { x: 3330 + t * 4, y: 1040, s: 0.9, head: 0.5 + 0.5 * Math.sin(t * 1.4), seed: 6300 });
  duck(L.CH, { x: 2900 + 30 * Math.sin(t * 0.7), y: 760 + 6 * Math.sin(t * 2.1), s: 0.9, r: 0.06 * Math.sin(t * 1.9), seed: 6400 });
  // the invisible rabbit and its floating carrot
  const R = rabbitState(t);
  if (R) {
    rabbit(L.INV, { x: R.x, y: R.y, s: 1.0, pose: R.pose, flip: R.flip, seed: 6200 });
    const lift = eo(pr(t, TM.crunch, TM.crunch + 0.6));
    const mx = R.flip ? R.x - 50 : R.x + 50, my = R.y - 78;
    const cx = lerp(VEG.carrots[2], mx, lift), cy = lerp(VEG.y0 + 4, my, lift) + 3 * Math.sin(t * 5);
    carrot(L.CH, { x: cx, y: cy, r: lerp(0, R.flip ? 1.3 : -1.3, lift), bites: bites(t), s: 0.9, seed: 1300 });
    // bite crumbs
    [TM.bite1, TM.bite2, TM.bite3].forEach((tb, i) => { const u = pr(t, tb, tb + 0.5); if (u > 0 && u < 1) for (let k = 0; k < 4; k++) dab(L.FX, cx + (R.flip ? -1 : 1) * (30 + 10 * k) , cy + 20 + 60 * u * u + k * 6, 4, { col: K.orange, p: 1 - u, seed: 1500 + i * 5 + k, boil: 0 }); });
  }
  // the burrow goes dark (the one tube of ultramarine)
  const wb = pr(t, TM.sil, TM.sil + 1.0);
  if (wb > 0) { const g = L.WASH.g; g.save(); g.fillStyle = '#000'; g.globalAlpha = 0.9 * wb; g.beginPath(); burrowPoly().forEach(([x, y], i) => i ? g.lineTo(sx(x), sy(y)) : g.moveTo(sx(x), sy(y))); g.closePath(); g.fill(); g.restore(); }
  // "Hmm?" from Leo when the crunch comes: no words needed; motion lines on the carrot as it pulls free
  if (t > TM.crunch && t < TM.crunch + 0.5) { const u = pr(t, TM.crunch, TM.crunch + 0.5); [-1, 0, 1].forEach(k => line(L.FX, [[VEG.carrots[2] + k * 22, VEG.y0 - 20 - 40 * u], [VEG.carrots[2] + k * 26, VEG.y0 - 50 - 40 * u]], { w: 4, col: K.ink, p: 0.8 * (1 - u), seed: 1700 + k, boil: 0.5 })); }
  subTo(SUBS, t);
  seriesCard(t, 0.2, 3.6, 2);
  toBeContinued(t, TM.tbc);
  composite(comp, { wash: wb > 0 });
}
