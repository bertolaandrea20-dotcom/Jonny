// Episode 3 — "Footprints" (17 s). Leo sprinkles flour on the lawn; little invisible paw prints hop through it… straight into the pool.
import { track, clamp, lerp, eo } from '/core/lib.js';
import { line, dab, ellipse } from '../engine/crayon.js';
import { leo, duck } from '../engine/kids.js';
import { drawStreet, drawFence, drawGarden } from '../engine/world.js';
import { burrow, vegPatch, flour, flourBag, pawPrint, ripples, HOPS } from '../engine/props.js';
import { L, K, BEAT, b, pr, begin, composite, events, buildSubs, subTo, seriesCard, toBeContinued } from '../engine/common.js';

export const DUR = 17;
const TM = { sprinkle: b(1), sil: b(2, 2), print0: b(3), plop: b(4, 2), tbc: b(5) };
const PRINT_T = HOPS.map((_, i) => TM.print0 + i * 0.55);
export const LINES = [
  { id: 'n1', t: 0.5, d: 1.1, text: 'Leo had a plan.' },
  { id: 'n2', t: 3.0, d: 1.6, text: 'Flour, all over the lawn.' },
  { id: 'n3', t: 8.6, d: 1.8, text: 'Then, little footprints appeared.' },
  { id: 'n4', t: 12.6, d: 1.3, text: 'Straight into the pool!' },
];
export const SUBS = buildSubs(LINES);

const camT = track([[0, [2700, 930, 1.85]], [TM.sprinkle, [2720, 940, 1.8]], [TM.sil, [2760, 960, 1.72]], [TM.plop - 0.6, [2790, 930, 1.7]], [TM.plop + 0.6, [2800, 910, 1.74]], [DUR, [2780, 910, 1.6]]]);
const LEO = [2560, 1068];

function leoState(t) {
  const g = { s: 0.9, seed: 3000, x: LEO[0], y: LEO[1] };
  if (t < TM.sprinkle) return { o: { ...g, pose: 'front:hold', expr: 'sneaky' }, bag: [LEO[0], LEO[1] - 140, 0] };
  if (t < TM.sil) { const k = Math.floor((t - TM.sprinkle) / (BEAT / 2)) % 2; return { o: { ...g, pose: k ? 'peek' : 'stand', expr: 'smile' }, bag: k ? [LEO[0] + 52, LEO[1] - 126, 1.1] : [LEO[0] + 20, LEO[1] - 96, 0.3], puff: k }; }
  if (t < TM.print0) return { o: { ...g, pose: 'front:stand', expr: 'normal', look: [Math.sin(t * 2) > 0 ? 1 : -1, 0] } };
  if (t < TM.plop) return { o: { ...g, pose: 'front:stand', expr: 'surprised', look: [1, -0.6] } };
  if (t < TM.tbc) return { o: { ...g, pose: 'front:freeze', expr: 'surprised', look: [1, -0.8] } };
  return { o: { ...g, pose: 'front:stand', expr: 'sneaky', look: [1, -0.5] } };
}

export const { EV, ev } = (() => { const E = events(); return { EV: E.EV, ev: E.ev }; })();
LINES.forEach(Ln => ev(Ln.t, 'voice', { id: Ln.id }));
ev(0, 'paper'); ev(0.2, 'write', { dur: 1.4, pan: 0 });
for (let k = 0; ; k++) { const t = TM.sprinkle + k * BEAT / 2 + BEAT / 2; if (t > TM.sil) break; if (k % 2 === 0) ev(t, 'puff', { pan: 0.2 + k * 0.03 }); }
PRINT_T.forEach((t, i) => ev(t, 'hopsoft', { pan: -0.1 + i * 0.07 }));
ev(TM.plop, 'plop'); ev(TM.plop + 0.05, 'sting'); ev(TM.plop + 0.1, 'freeze');
ev(TM.tbc, 'write', { dur: 1.3, pan: 0 });
[['sneak', 0], ['silence', TM.sil], ['mystery', TM.print0], ['tbc', TM.tbc]].forEach(([id, t]) => ev(t, 'cue', { id }));

export function TEXTS(t) { begin(camT(t)); return [...seriesCard(t, 0.2, 2.6, 3), ...toBeContinued(t, TM.tbc)]; }

export function frame(comp, t) {
  begin(camT(t));
  const all = { verge: 1, path: 1, sign: 1, hedge: 1, hedgeL: 1, fence: 1, fenceF: 1, lawn: 1, lawnL: 1, sun: 1, tree: 1, treeL: 1, parasol: 1, pool: 1, poolL: 1 };
  drawGarden(L.BG.f, L.BG.l, all);
  burrow(L.BG.f, L.BG.l); vegPatch(L.BG.f, L.BG.l, [2]);
  flour(L.BG.f, pr(t, TM.sprinkle + 0.3, TM.sil));
  PRINT_T.forEach((tp, i) => { if (t > tp) pawPrint(L.BG.f, HOPS[i][0], HOPS[i][1], 1950 + i * 5); });
  drawStreet(L.BG.f, L.BG.l, all); drawFence(L.BG.f, L.BG.l, all, 0);
  // Leo, his bag, the flour puffs
  const S = leoState(t); leo(L.CH, S.o);
  if (S.bag) flourBag(L.CH, S.bag[0], S.bag[1], S.bag[2]);
  if (S.puff) for (let k = 0; k < 6; k++) { const u = ((t - TM.sprinkle) / (BEAT / 2)) % 1; dab(L.FX, S.bag[0] + 30 + k * 14, S.bag[1] + 20 + u * 90 + k * 8, 7, { col: K.white, p: 1 - u * 0.6, seed: 2000 + k, boil: 0.5 }); }
  // the duck in the pool, and the plop
  duck(L.CH, { x: 3140 + 20 * Math.sin(t * 0.7), y: 780 + 5 * Math.sin(t * 2.1) + (t > TM.plop ? 10 * Math.sin((t - TM.plop) * 9) * Math.exp(-(t - TM.plop) * 2) : 0), s: 0.9, seed: 6400 });
  if (t > TM.plop) { ripples(L.FX, 3010, 870, pr(t, TM.plop, TM.plop + 1.6)); if (t < TM.plop + 0.5) { const u = pr(t, TM.plop, TM.plop + 0.5); [-2, -1, 0, 1, 2].forEach(k => line(L.FX, [[3010 + k * 18, 860 - 30 * u], [3010 + k * 30, 830 - 60 * u]], { w: 5, col: K.sky, p: 0.95 * (1 - u), seed: 2100 + k, boil: 0.5 })); } }
  subTo(SUBS, t);
  seriesCard(t, 0.2, 2.6, 3);
  toBeContinued(t, TM.tbc);
  composite(comp);
}
