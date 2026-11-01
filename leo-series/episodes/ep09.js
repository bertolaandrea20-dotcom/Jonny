// Episode 9 — "Who Kicked It?" (follows episode 7, 17 s). The ball landed in the pool next door. Leo and Edo go to get it.
// The ball moves by itself, hops out of the water and rolls back to Leo's feet — pushed by the invisible rabbit. Edo is amazed; Leo smiles.
import { track, clamp, lerp, eo } from '/core/lib.js';
import { line, dab, ellipse } from '../engine/crayon.js';
import { leo, edo, rabbit, duck, deckchair, lady } from '../engine/kids.js';
import { drawStreet, drawFence, drawGarden, CHAIR } from '../engine/world.js';
import { burrow, vegPatch, ball } from '../engine/props.js';
import { L, K, BEAT, b, pr, begin, composite, events, buildSubs, subTo, seriesCard, toBeContinued } from '../engine/common.js';

export const DUR = 17;
const TM = { look: b(1), sil: b(2), out: b(2, 2), home: b(3, 2), know: b(4), tbc: b(5) };
export const LINES = [
  { id: 'n1', t: 0.5, d: 1.9, text: 'The ball had landed in the pool.' },
  { id: 'n2', t: 3.0, d: 1.6, text: 'Leo and Edo went to get it.' },
  { id: 'n3', t: 9.8, d: 2.0, text: 'Then it came back. All by itself.' },
  { id: 'n4', t: 12.3, d: 1.9, text: 'Edo was amazed. Leo smiled.' },
];
export const SUBS = buildSubs(LINES);
const camT = track([[0, [2950, 860, 1.25]], [TM.sil, [2980, 880, 1.3]], [TM.out, [2950, 900, 1.4]], [TM.home, [2800, 950, 1.6]], [DUR, [2800, 940, 1.5]]]);
const LEO = [2700, 1062], EDO = [2860, 1062];
const HOPS = [[3060, 1000], [2960, 1040], [2860, 1060], [2770, 1074]];      // the ball's way back over the lawn

function leoState(t) {
  const g = { s: 0.9, seed: 3000, y: LEO[1] };
  if (t < TM.look) return { ...g, x: lerp(2520, LEO[0], pr(t, 0, TM.look)), pose: Math.floor(t / (BEAT / 2)) % 2 ? 'walk1' : 'walk0', expr: 'normal' };
  if (t < TM.sil) return { ...g, x: LEO[0], pose: 'front:stand', expr: 'normal', look: [1, -1] };
  if (t < TM.home) return { ...g, x: LEO[0], pose: 'front:stand', expr: 'surprised', look: [1, -0.5] };
  return { ...g, x: LEO[0], pose: 'front:stand', expr: t < TM.know ? 'surprised' : 'sneaky', look: [1, 0.3] };
}
function edoState(t) {
  const g = { s: 0.88, y: EDO[1] };
  if (t < TM.look + 0.3) return { ...g, x: lerp(2640, EDO[0], pr(t, 0.3, TM.look + 0.3)), pose: Math.floor(t / (BEAT / 2)) % 2 ? 'walk0' : 'walk1', expr: 'normal' };
  if (t < TM.sil) return { ...g, x: EDO[0], pose: 'front:stand', expr: 'normal', look: [1, -1] };
  if (t < TM.home) return { ...g, x: EDO[0], pose: 'front:stand', expr: 'surprised', look: [1, -0.5] };
  return { ...g, x: EDO[0], pose: 'front:freeze', expr: 'surprised', look: [-1, 0.3] };
}
// the ball: floats, drifts by itself, hops out, then hop-hop-hop back to Leo
function ballState(t) {
  if (t < TM.sil) return { x: 3230 + 8 * Math.sin(t * 1.3), y: 790 + 5 * Math.sin(t * 2.2), float: true };
  if (t < TM.out) { const u = eo(pr(t, TM.sil, TM.out)); return { x: lerp(3230, 3100, u), y: lerp(790, 880, u), float: true, wake: true }; }
  const n = HOPS.length, seg = (TM.home - TM.out) / n, k = Math.min(n - 1, Math.floor((t - TM.out) / seg));
  if (t >= TM.home) return { x: HOPS[n - 1][0], y: HOPS[n - 1][1], rest: true };
  const u = (t - TM.out - k * seg) / seg, a = k === 0 ? [3100, 880] : HOPS[k - 1], c = HOPS[k];
  return { x: lerp(a[0], c[0], u), y: lerp(a[1], c[1], u) - (k === 0 ? 120 : 60) * Math.sin(u * Math.PI), hop: k, u };
}

export const { EV, ev } = (() => { const E = events(); return { EV: E.EV, ev: E.ev }; })();
LINES.forEach(Ln => ev(Ln.t, 'voice', { id: Ln.id }));
ev(0, 'paper'); ev(0.2, 'write', { dur: 1.4, pan: 0 });
for (let k = 0; ; k++) { const t = 0.1 + k * BEAT / 2; if (t > TM.look) break; ev(t, 'step', { pan: -0.3 }); }
ev(TM.sil + 0.3, 'puff', { pan: 0.4 });
ev(TM.out, 'plop', { pan: 0.3 });
const seg = (TM.home - TM.out) / HOPS.length;
HOPS.forEach((h, k) => { ev(TM.out + (k + 1) * seg, 'stonehop', { i: 0, pan: 0.3 - k * 0.15 }); ev(TM.out + k * seg + 0.05, 'hopsoft', { pan: 0.35 - k * 0.15 }); });
ev(TM.home, 'step', { pan: -0.1 }); ev(TM.home + 0.1, 'sting'); ev(TM.home + 0.15, 'freeze');
ev(TM.tbc, 'write', { dur: 1.3, pan: 0 });
[['walk', 0], ['silence', TM.sil], ['crunch', TM.out], ['mystery', TM.home], ['tbc', TM.tbc]].forEach(([id, t]) => ev(t, 'cue', { id }));

export function TEXTS(t) { begin(camT(t)); return [...seriesCard(t, 0.2, 2.6, 9), ...toBeContinued(t, TM.tbc)]; }

export function frame(comp, t, opt = {}) {
  begin(camT(t));
  const all = { verge: 1, path: 1, sign: 1, hedge: 1, hedgeL: 1, fence: 1, fenceF: 1, lawn: 1, lawnL: 1, sun: 1, tree: 1, treeL: 1, parasol: 1, pool: 1, poolL: 1 };
  drawGarden(L.BG.f, L.BG.l, all); burrow(L.BG.f, L.BG.l); vegPatch(L.BG.f, L.BG.l, [0, 1, 2, 3]);
  drawStreet(L.BG.f, L.BG.l, all); drawFence(L.BG.f, L.BG.l, all, 0);
  deckchair(L.CH, { x: CHAIR.x + 10, y: CHAIR.y, s: 1.0, seed: 6100, flip: true });
  lady(L.CH, { x: CHAIR.x, y: CHAIR.y, s: 1.0, seed: 6000, flip: true, pose: 'sit', expr: t > TM.home ? 'surprised' : 'normal' });
  duck(L.CH, { x: 3000 + 20 * Math.sin(t * 0.7), y: 770 + 5 * Math.sin(t * 2.1), s: 0.9, seed: 6400 });
  edo(L.CH, edoState(t));
  leo(L.CH, leoState(t));
  const B = ballState(t);
  if (B.wake) { [0, 1, 2].forEach(k => line(L.FX, [[B.x + 40 + k * 26, B.y - 10 + k * 8], [B.x + 70 + k * 30, B.y - 22 + k * 12]], { w: 4.5, col: K.ink, p: 0.6 - k * 0.15, seed: 3500 + k, boil: 0.6 })); }
  if (B.float) line(L.FX, ellipse(B.x, B.y + 18, 40, 9, 24), { w: 4, col: K.ink, p: 0.5, seed: 3505, boil: 0.6 });
  ball(L.CH, B.x, B.y, 24, B.float ? Math.sin(t) * 0.3 : -t * 8);
  // the invisible rabbit pushing the ball home: a paper hole hopping right behind it on the lawn
  if (t > TM.out + 0.15 && t < TM.home + 0.9) {
    const after = t >= TM.home, x = after ? lerp(HOPS[3][0] + 70, 3150, pr(t, TM.home, TM.home + 0.9)) : B.x + 64, y = after ? 1050 : Math.max(B.y + 26, 1000);
    rabbit(L.INV, { x, y, s: 0.95, pose: Math.floor(t * 6) % 2 ? 'hop' : 'sit', flip: !after, seed: 6200 });
  }
  if (opt.cover) opt.cover(); else { subTo(SUBS, t); seriesCard(t, 0.2, 2.6, 9); toBeContinued(t, TM.tbc); }
  composite(comp);
}
