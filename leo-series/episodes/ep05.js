// Episode 5 — "Carrot Trap" (17 s). Leo lays a line of carrots and hides behind the tree. Crunch, crunch, crunch: they vanish, closer and closer.
// The last one stays. Silence. Then a carrot floats right behind Leo's head.
import { track, clamp, lerp, eo } from '/core/lib.js';
import { line, fill, dab } from '../engine/crayon.js';
import { leo, rabbit } from '../engine/kids.js';
import { drawStreet, drawFence, drawGarden } from '../engine/world.js';
import { burrow, carrot } from '../engine/props.js';
import { L, K, BEAT, b, pr, begin, composite, events, buildSubs, subTo, seriesCard, toBeContinued } from '../engine/common.js';

export const DUR = 17;
const CX = [2440, 2580, 2700, 2820, 2940], CYS = [1090, 1068, 1032, 996, 960];
const EAT = [null, b(3), b(2, 2), b(2), b(1, 2)];          // carrot 0 (the closest) is never eaten
const TM = { hide: 1.4, peek: 2.4, quiet: b(3, 2), behind: b(4), bite: b(4, 1), turn: b(4, 2), tbc: b(5) };
export const LINES = [
  { id: 'n1', t: 0.5, d: 1.2, text: 'Leo set a trap.' },
  { id: 'n2', t: 4.4, d: 1.9, text: 'Crunch. Crunch. Crunch.' },
  { id: 'n3', t: 9.7, d: 1.6, text: 'Then… it went quiet.' },
  { id: 'n4', t: 12.6, d: 0.9, text: 'Too quiet.' },
];
export const SUBS = buildSubs(LINES);
const camT = track([[0, [2560, 960, 1.5]], [2.7, [2600, 960, 1.45]], [TM.quiet + 0.8, [2540, 950, 1.55]], [TM.turn - 0.3, [2310, 920, 1.85]], [DUR, [2320, 920, 1.78]]]);

function leoState(t) {
  const g = { s: 0.9, seed: 3000, y: 1000 };
  if (t < TM.hide) return { ...g, x: 2330, pose: 'crouch', expr: 'sneaky' };
  if (t < TM.peek) return { ...g, x: lerp(2330, 2275, pr(t, TM.hide, TM.peek)), pose: Math.floor(t / 0.17) % 2 ? 'run1' : 'run0', flip: true, expr: 'sneaky' };
  if (t < EAT[4]) return { ...g, x: 2275, pose: 'peek', expr: 'sneaky' };
  if (t < TM.quiet) return { ...g, x: 2275, pose: 'peek', expr: 'surprised' };
  if (t < TM.turn) return { ...g, x: 2275, pose: 'peek', expr: 'worried' };
  return { ...g, x: 2335, pose: 'front:freeze', expr: 'surprised', look: [-1, -0.3] };
}
// where the invisible rabbit is: at each carrot while eating it, then behind Leo
function rabbitAt(t) {
  for (let i = 4; i >= 1; i--) { const te = EAT[i]; if (t > te - 0.35 && t < te + 0.95) return { x: CX[i] + 75, y: CYS[i] - 4, pose: t < te - 0.15 ? 'hop' : 'sit', flip: true, eating: i, te }; }
  if (t > TM.behind - 0.3) return { x: 2110, y: 975, pose: t < TM.behind ? 'hop' : 'sit', flip: false, behind: true };
  return null;
}
function bites(te, t) { return t < te ? 0 : Math.min(4, 1 + Math.floor((t - te) / 0.3)); }

export const { EV, ev } = (() => { const E = events(); return { EV: E.EV, ev: E.ev }; })();
LINES.forEach(Ln => ev(Ln.t, 'voice', { id: Ln.id }));
ev(0, 'paper'); ev(0.2, 'write', { dur: 1.4, pan: 0 }); ev(0.6, 'cloth');
for (let k = 0; k < 6; k++) ev(TM.hide + k * 0.17, 'runstep', { pan: -0.2 });
[4, 3, 2, 1].forEach(i => { ev(EAT[i] - 0.35, 'hopsoft', { pan: (CX[i] - 2600) / 800 }); [0, 0.3, 0.6].forEach(d => ev(EAT[i] + d, 'crunch', { pan: (CX[i] - 2600) / 800 })); });
ev(TM.behind - 0.3, 'hopsoft', { pan: -0.4 }); ev(TM.bite, 'crunch', { pan: -0.3 }); ev(TM.bite + 0.3, 'crunch', { pan: -0.3 });
ev(TM.turn, 'sting'); ev(TM.turn, 'freeze');
ev(TM.tbc, 'write', { dur: 1.3, pan: 0 });
[['sneak', 0], ['crunch', EAT[4]], ['silence', TM.quiet], ['mystery', TM.behind], ['tbc', TM.tbc]].forEach(([id, t]) => ev(t, 'cue', { id }));

export function TEXTS(t) { begin(camT(t)); return [...seriesCard(t, 0.2, 2.6, 5), ...toBeContinued(t, TM.tbc)]; }

export function frame(comp, t, opt = {}) {
  begin(camT(t));
  const all = { verge: 1, path: 1, sign: 1, hedge: 1, hedgeL: 1, fence: 1, fenceF: 1, lawn: 1, lawnL: 1, sun: 1, tree: 1, treeL: 1, parasol: 1, pool: 1, poolL: 1 };
  drawGarden(L.BG.f, L.BG.l, all); burrow(L.BG.f, L.BG.l); 
  drawStreet(L.BG.f, L.BG.l, all); drawFence(L.BG.f, L.BG.l, all, 0);
  // the trap: a line of carrots; each one is eaten in bites
  CX.forEach((x, i) => {
    if (i === 0 && t < 0.6) return;
    const te = EAT[i]; const bt = te === null ? 0 : bites(te, t);
    if (bt >= 4) return;
    carrot(L.CH, { x: x - 52, y: CYS[i] - 12, r: -1.57, bites: bt, s: 1.25, seed: 1300 + i * 10 });
    if (te !== null && t > te && t < te + 0.9) for (let k = 0; k < 3; k++) { const u = ((t - te) % 0.3) / 0.3; dab(L.FX, x + 10 + k * 10, CYS[i] - 20 + 40 * u, 5, { col: K.orange, p: 1 - u, seed: 2500 + i * 3 + k, boil: 0 }); }
  });
  // the invisible rabbit (a paper hole on the lawn)
  const R = rabbitAt(t);
  if (R) {
    rabbit(L.INV, { x: R.x, y: R.y, s: 1.0, pose: R.pose, flip: R.flip, seed: 6200 });
    if (R.behind) { const bt = Math.min(2, bites(TM.bite, t)); if (bt < 4) carrot(L.CH, { x: R.x + 70, y: R.y - 92 + 3 * Math.sin(t * 5), r: -1.3, bites: bt, s: 1.15, seed: 1400 }); }
  }
  // Leo, hiding behind the trunk (the trunk is drawn over him until he turns round)
  leo(L.CH, leoState(t));
  if (t < TM.turn) {
    const trunk = [[2238, 1002], [2250, 760], [2296, 760], [2306, 1002]];
    fill(L.FX, trunk, { col: K.brown, p: 0.9, gap: 7, w: 10, ang: 1.5, seed: 2600, boil: 0, over: 1 });
    line(L.FX, [[2238, 1004], [2250, 770]], { w: 7, seed: 2601 }); line(L.FX, [[2306, 1004], [2296, 770]], { w: 7, seed: 2602 });
  }
  if (opt.cover) opt.cover(); else { subTo(SUBS, t); seriesCard(t, 0.2, 2.6, 5); toBeContinued(t, TM.tbc); }
  composite(comp);
}
