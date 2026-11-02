// Episode 11 — "Night Watch" (Friday · the jacket mystery, 17 s). The garden at night: the ultramarine wash covers the whole page.
// Leo keeps watch behind the tree with a torch. Crunch… the beam swings to the vegetable patch: inside the light, a paper-white rabbit
// with a carrot. Then it hops out of the beam. Almost.
import { track, lerp, eo } from '/core/lib.js';
import { line, ellipse, sx, sy, CAM } from '../engine/crayon.js';
import { leo, rabbit } from '../engine/kids.js';
import { drawStreet, drawFence, drawGarden, SUN } from '../engine/world.js';
import { burrow, vegPatch, carrot, VEG } from '../engine/props.js';
import { L, K, b, pr, begin, composite, events, buildSubs, subTo, seriesCard, toBeContinued } from '../engine/common.js';

export const DUR = 17;
const TM = { crunch: b(2), swing: b(3), there: b(3, 1), flee: b(4), tbc: b(5) };
export const LINES = [
  { id: 'n1', t: 0.5, d: 2.0, text: 'Friday night. Leo kept watch.' },
  { id: 'n2', t: 5.9, d: 1.2, text: 'Crunch…' },
  { id: 'n3', t: 8.7, d: 0.8, text: 'There!' },
  { id: 'n4', t: 12.0, d: 0.9, text: 'Almost.' },
];
export const SUBS = buildSubs(LINES);
const camT = track([[0, [2470, 860, 1.45]], [TM.swing, [2470, 870, 1.5]], [TM.there + 0.3, [2500, 900, 1.7]], [TM.flee + 0.6, [2520, 900, 1.65]], [DUR, [2510, 900, 1.6]]]);
const LEO = [2275, 1000], TORCH = [2350, 930];
const RAB = [VEG.carrots[2] + 70, 1036];
// where the beam points (world): a slow sweep over the lawn, then a snap to the patch, then it follows the rabbit a little too late
function aim(t) {
  if (t < TM.swing) { const u = (Math.sin(t * 0.9 - 1.2) + 1) / 2; return [lerp(2700, 3150, u), lerp(760, 880, u)]; }
  if (t < TM.there) { const u = eo(pr(t, TM.swing, TM.there)); return [lerp(2900, RAB[0], u), lerp(820, RAB[1] - 40, u)]; }
  if (t < TM.flee + 0.4) return [RAB[0], RAB[1] - 40];
  const u = eo(pr(t, TM.flee + 0.4, TM.flee + 1.4)); return [lerp(RAB[0], RAB[0] + 170, u), RAB[1] - 40];
}
function beam(t) {
  const [ax, ay] = aim(t), a = Math.atan2(ay - TORCH[1], ax - TORCH[0]), len = Math.hypot(ax - TORCH[0], ay - TORCH[1]) + 260, h = 0.2;
  const pts = [TORCH]; for (let i = 0; i <= 12; i++) { const q = a - h + 2 * h * i / 12; pts.push([TORCH[0] + Math.cos(q) * len, TORCH[1] + Math.sin(q) * len]); }
  return pts;
}
function leoState(t) {
  const g = { s: 0.9, seed: 3000, y: LEO[1], x: LEO[0] };
  if (t < TM.crunch) return { ...g, pose: 'peek', expr: 'sneaky' };
  if (t < TM.there) return { ...g, pose: 'peek', expr: 'worried' };
  if (t < TM.flee) return { ...g, x: LEO[0] + 30, pose: 'front:hold', expr: 'surprised', look: [1, 0.3] };
  return { ...g, x: LEO[0] + 30, pose: 'front:hold', expr: t < TM.flee + 1.6 ? 'surprised' : 'sneaky', look: [1, 0.2] };
}
function carrotState(t) {
  if (t < TM.crunch) return null;
  if (t < TM.flee) return { x: RAB[0] - 34, y: RAB[1] - 58, r: -1.2, bites: Math.min(2, Math.floor((t - TM.crunch) / 0.7)), s: 1.0, seed: 1300 };
  const u = pr(t, TM.flee, TM.flee + 0.4); return { x: RAB[0] - 34 + 10 * u, y: lerp(RAB[1] - 58, RAB[1] - 6, u * u), r: lerp(-1.2, -0.1, u), bites: 2, s: 1.0, seed: 1300 };
}

export const { EV, ev } = (() => { const E = events(); return { EV: E.EV, ev: E.ev }; })();
LINES.forEach(Ln => ev(Ln.t, 'voice', { id: Ln.id }));
ev(0, 'paper'); ev(0.2, 'write', { dur: 1.4, pan: 0 });
ev(TM.crunch - 0.2, 'pull', { pan: 0.3 }); [0, 0.7, 1.4].forEach(d => ev(TM.crunch + 0.2 + d, 'crunch', { pan: 0.3 }));
ev(TM.swing, 'cloth', { pan: -0.2 }); ev(TM.there, 'sting'); ev(TM.there + 0.05, 'freeze');
ev(TM.flee, 'hopsoft', { pan: 0.4 }); ev(TM.flee + 0.35, 'hopsoft', { pan: 0.7 }); ev(TM.flee + 0.4, 'plop', { pan: 0.3 });
ev(TM.tbc, 'write', { dur: 1.3, pan: 0 });
[['mystery', 0], ['sneak', TM.crunch], ['silence', TM.there], ['mystery', TM.flee], ['tbc', TM.tbc]].forEach(([id, t]) => ev(t, 'cue', { id }));

export function TEXTS(t) { begin(camT(t)); return [...seriesCard(t, 0.2, 2.6, 11), ...toBeContinued(t, TM.tbc)]; }

export function frame(comp, t, opt = {}) {
  begin(camT(t));
  const all = { verge: 1, path: 1, sign: 1, hedge: 1, hedgeL: 1, fence: 1, fenceF: 1, lawn: 1, lawnL: 1, sun: 0, tree: 1, treeL: 1, parasol: 1, pool: 1, poolL: 1 };
  drawGarden(L.BG.f, L.BG.l, all); burrow(L.BG.f, L.BG.l); vegPatch(L.BG.f, L.BG.l, t > TM.crunch - 0.2 ? [2] : []);
  drawStreet(L.BG.f, L.BG.l, all); drawFence(L.BG.f, L.BG.l, all, 0);
  // the moon (stays bright: cut out of the night)
  line(L.BG.l, ellipse(SUN.x - 900, SUN.y + 120, 70, 70, 32), { w: 7, col: K.yellow, p: 1, seed: 5600 });
  // the carrot and the invisible rabbit belong to the night (drawn under the wash)
  const Cs = carrotState(t); if (Cs) carrot(L.CH, Cs);
  if (t > TM.there - 0.2 && t < TM.flee + 0.6) {
    const gone = t > TM.flee, u = pr(t, TM.flee, TM.flee + 0.6);
    rabbit(L.INV, { x: gone ? lerp(RAB[0], RAB[0] + 260, u) : RAB[0], y: gone ? RAB[1] - 60 * Math.sin(u * Math.PI * 2) : RAB[1], s: 1.0, pose: gone ? 'hop' : (Math.floor(t * 3) % 2 ? 'sniff' : 'sit'), twitch: true, flip: !gone, seed: 6200 });
  }
  // the night: the whole page washed, except the torch beam and the moon
  const g = L.WASH.g; g.save(); g.fillStyle = '#000'; g.globalAlpha = 0.8; g.fillRect(0, 0, 1080, 1920);
  g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 1;
  const B = beam(t); g.beginPath(); B.forEach(([x, y], i) => i ? g.lineTo(sx(x), sy(y)) : g.moveTo(sx(x), sy(y))); g.closePath(); g.fill();
  g.beginPath(); g.arc(sx(SUN.x - 900), sy(SUN.y + 120), 74 * CAM.s, 0, Math.PI * 2); g.fill();
  g.restore();
  line(L.FX, [B[0], B[1]], { w: 3, col: K.yellow, p: 0.5, seed: 5610 }); line(L.FX, [B[0], B[B.length - 1]], { w: 3, col: K.yellow, p: 0.5, seed: 5611 });
  leo(L.CH, leoState(t));
  // the torch in Leo's hand
  const [ax, ay] = aim(t), a = Math.atan2(ay - TORCH[1], ax - TORCH[0]);
  line(L.CH.l, [[TORCH[0] - Math.cos(a) * 46, TORCH[1] - Math.sin(a) * 46], TORCH], { w: 16, col: K.red, p: 1, seed: 5620 });
  if (opt.cover) opt.cover(); else { subTo(SUBS, t); seriesCard(t, 0.2, 2.6, 11); toBeContinued(t, TM.tbc); }
  composite(comp, { wash: true });
}
