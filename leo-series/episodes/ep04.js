// Episode 4 — "Splash!" (17 s). Leo throws a bucket of water where the footprints end: for one second the water shows a rabbit. It shakes, and it's gone.
import { track, clamp, lerp, eo, ei } from '/core/lib.js';
import { line, dab } from '../engine/crayon.js';
import { group, clearGroup } from '../engine/rig.js';
import { leo, rabbit, duck } from '../engine/kids.js';
import { drawStreet, drawFence, drawGarden } from '../engine/world.js';
import { burrow, vegPatch, flour, pawPrint, HOPS, bucket, waterArc } from '../engine/props.js';
import { L, K, BEAT, b, pr, begin, composite, events, buildSubs, subTo, seriesCard, toBeContinued } from '../engine/common.js';

export const DUR = 17;
const TM = { walk: b(1), sil: b(1, 2), throw: b(2), hit: b(2) + 0.35, shake: b(3, 2), gone: b(3, 2) + 0.6, tbc: b(5) };
export const LINES = [
  { id: 'n1', t: 0.5, d: 1.2, text: 'Leo had a bucket.' },
  { id: 'n2', t: 5.75, d: 0.7, text: 'Splash!' },
  { id: 'n3', t: 6.9, d: 2.0, text: 'For one second… a rabbit!' },
  { id: 'n4', t: 11.0, d: 1.3, text: 'Then… nothing.' },
];
export const SUBS = buildSubs(LINES);
const camT = track([[0, [2840, 930, 1.8]], [TM.sil, [2870, 930, 1.85]], [TM.throw, [2900, 935, 1.95]], [TM.shake, [2900, 935, 1.95]], [TM.gone + 0.6, [2900, 930, 1.8]], [DUR, [2880, 920, 1.72]]]);
const RAB = [2988, 948];
const RW = group();

function leoState(t) {
  const g = { s: 0.9, seed: 3000, y: 1012 };
  if (t < TM.walk) return { o: { ...g, x: 2700, pose: 'front:hold', expr: 'sneaky' }, bk: [2700, 1012 - 104, 0] };
  if (t < TM.sil) { const x = lerp(2700, 2800, pr(t, TM.walk, TM.sil)); return { o: { ...g, x, pose: Math.floor(t / (BEAT / 2)) % 2 ? 'walk1' : 'walk0', expr: 'sneaky' }, bk: [x + 26, 1012 - 92, 0.1] }; }
  if (t < TM.throw) return { o: { ...g, x: 2800, pose: 'peek', expr: 'sneaky' }, bk: [2800 + 84, 1012 - 150, -0.35] };
  if (t < TM.throw + 0.5) return { o: { ...g, x: 2800, pose: 'peek', expr: 'happy' }, bk: [2800 + 88, 1012 - 150, 1.5 * eo(pr(t, TM.throw, TM.throw + 0.2))] };
  if (t < TM.gone + 0.4) return { o: { ...g, x: 2800, pose: 'front:freeze', expr: 'surprised', look: [1, 0] }, bkGround: true };
  return { o: { ...g, x: 2800, pose: 'front:stand', expr: 'worried', look: [1, 0] }, bkGround: true };
}
function rabbitState(t) {
  if (t < TM.shake) return { pose: 'sit', flip: true, x: RAB[0], y: RAB[1] };
  if (t < TM.gone) return { pose: Math.floor(t * 12) % 2 ? 'hop' : 'sit', flip: true, x: RAB[0] + (Math.floor(t * 12) % 2 ? 4 : -4), y: RAB[1] };
  return null;
}

export const { EV, ev } = (() => { const E = events(); return { EV: E.EV, ev: E.ev }; })();
LINES.forEach(Ln => ev(Ln.t, 'voice', { id: Ln.id }));
ev(0, 'paper'); ev(0.2, 'write', { dur: 1.4, pan: 0 });
for (let k = 0; ; k++) { const t = TM.walk + 0.1 + k * BEAT / 2; if (t > TM.sil) break; ev(t, 'tiptoe', { i: k, pan: 0.1 }); }
ev(TM.throw - 0.15, 'whoosh'); ev(TM.hit, 'splash'); ev(TM.hit + 0.2, 'sting');
ev(TM.shake, 'cloth'); [0, 1, 2, 3, 4].forEach(k => ev(TM.shake + 0.08 + k * 0.1, 'plop', { pan: 0.3 }));
[0, 1, 2, 3].forEach(k => ev(TM.gone + 0.15 + k * 0.32, 'hopsoft', { pan: 0.3 + k * 0.1 }));
ev(TM.tbc, 'write', { dur: 1.3, pan: 0 });
[['sneak', 0], ['silence', TM.sil], ['theme', TM.throw], ['sneak', TM.shake], ['tbc', TM.tbc]].forEach(([id, t]) => ev(t, 'cue', { id }));

export function TEXTS(t) { begin(camT(t)); return [...seriesCard(t, 0.2, 2.6, 4), ...toBeContinued(t, TM.tbc)]; }

export function frame(comp, t, opt = {}) {
  begin(camT(t));
  const all = { verge: 1, path: 1, sign: 1, hedge: 1, hedgeL: 1, fence: 1, fenceF: 1, lawn: 1, lawnL: 1, sun: 1, tree: 1, treeL: 1, parasol: 1, pool: 1, poolL: 1 };
  drawGarden(L.BG.f, L.BG.l, all); burrow(L.BG.f, L.BG.l); vegPatch(L.BG.f, L.BG.l, [2]);
  flour(L.BG.f, 1); HOPS.forEach(([x, y], i) => pawPrint(L.BG.f, x, y, 1950 + i * 5));
  drawStreet(L.BG.f, L.BG.l, all); drawFence(L.BG.f, L.BG.l, all, 0);
  duck(L.CH, { x: 3140 + 20 * Math.sin(t * 0.7), y: 780 + 5 * Math.sin(t * 2.1), s: 0.9, seed: 6400 });
  const S = leoState(t); leo(L.CH, S.o);
  if (S.bk) bucket(L.CH, S.bk[0], S.bk[1], S.bk[2], t < TM.throw + 0.1);
  if (S.bkGround) bucket(L.CH, 2730, 1010, 1.4, false);
  // the water flies from the bucket to where the footprints end
  waterArc(L.FX, 2900, 850, RAB[0] - 10, RAB[1] - 40, pr(t, TM.throw, TM.hit + 0.25) * 1.3);
  // the invisible rabbit: a paper hole; while it's wet, the wash shows it
  const R = rabbitState(t);
  let wash = false;
  if (R && t > TM.hit) {   // before the water it's just paws in the flour: invisible
    rabbit(L.INV, { x: R.x, y: R.y, s: 1.05, pose: R.pose, flip: R.flip, seed: 6200 });
    if (t > TM.hit) {
      clearGroup(RW); rabbit(RW, { x: R.x, y: R.y, s: 1.05, pose: R.pose, flip: R.flip, seed: 6200 });
      const g = L.WASH.g; g.save(); g.globalAlpha = 0.9 * eo(pr(t, TM.hit, TM.hit + 0.3)); g.drawImage(RW.k.c, 0, 0); g.restore();
      // splash puddle around it
      dab(L.WASH, RAB[0], RAB[1] + 4, 70 * eo(pr(t, TM.hit, TM.hit + 0.3)), { col: '#000', p: 0.55, seed: 2300, boil: 0, gap: 6, w: 12 });
      wash = true;
    }
  }
  // the shake: drops fly off, then wet paw prints hop away
  if (t > TM.shake && t < TM.gone + 0.6) { const u = pr(t, TM.shake, TM.gone + 0.6); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; dab(L.FX, RAB[0] + Math.cos(a) * (40 + 140 * u), RAB[1] - 60 + Math.sin(a) * (30 + 100 * u) + 120 * u * u, 7, { col: K.sky, p: 0.95 * (1 - u), seed: 2400 + k, boil: 0.4 }); } }
  [0, 1, 2, 3].forEach(k => { const tk = TM.gone + 0.15 + k * 0.32; if (t > tk) { const x = RAB[0] + 70 + k * 70, y = RAB[1] + 12 - k * 4; [[-8, 0], [8, 2]].forEach(([dx, dy], j) => dab(L.FX, x + dx, y + dy, 7, { col: K.sky, p: 0.9, seed: 2450 + k * 2 + j, boil: 0 })); } });
  if (opt.cover) opt.cover(); else { subTo(SUBS, t); seriesCard(t, 0.2, 2.6, 4); toBeContinued(t, TM.tbc); }
  composite(comp, { wash });
}
