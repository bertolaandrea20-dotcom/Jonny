// Episode 13 — "The Goalkeeper" (Tuesday · football, 17 s). Leo has to play in goal. A penalty, from a big kid in red.
// Leo shuts his eyes… the ball bounces off his tummy: saved! Edo cheers. And up in the trees, two white ears were watching.
import { track, lerp, eo } from '/core/lib.js';
import { line, sx, sy, CAM } from '../engine/crayon.js';
import { leo, edo } from '../engine/kids.js';
import { drawPitch } from '../engine/pitch.js';
import { ball } from '../engine/props.js';
import { L, K, b, pr, begin, composite, events, buildSubs, subTo, seriesCard, toBeContinued } from '../engine/common.js';

export const DUR = 17;
const TM = { pen: b(1, 2), run: b(2, 2), kick: b(3), save: b(3, 2), ears: b(4, 1), tbc: b(5) };
export const LINES = [
  { id: 'n1', t: 0.5, d: 2.1, text: 'Tuesday. Leo had to play in goal.' },
  { id: 'n2', t: 4.3, d: 1.0, text: 'A penalty.' },
  { id: 'n3', t: 6.9, d: 1.6, text: 'Leo closed his eyes…' },
  { id: 'n4', t: 9.7, d: 1.4, text: '…and saved it!' },
];
export const SUBS = buildSubs(LINES);
const camT = track([[0, [7090, 1330, 1.7]], [TM.pen - 0.3, [7060, 1330, 1.65]], [TM.pen + 0.5, [6880, 1340, 1.3]], [TM.run, [6900, 1340, 1.32]], [TM.run + 0.6, [7110, 1360, 2.1]], [TM.kick - 0.2, [7110, 1360, 2.15]],
  [TM.kick + 0.2, [6900, 1390, 1.45]], [TM.ears - 0.3, [6870, 1390, 1.4]], [TM.ears + 0.6, [6850, 1370, 1.45]], [DUR, [6850, 1370, 1.45]]]);
const LEO = [7140, 1520], SPOT = [6800, 1530], KID0 = [6560, 1540], EDO = [6560, 1640], EARS = [6640, 1250];
const RED = { hair: 'spiky', hairCol: K.ochre, shirt: K.red, shorts: K.ink, pack: false, seed: 3600 };

function leoState(t) {
  const g = { s: 1.0, seed: 3000, x: LEO[0], y: LEO[1], pack: false };
  if (t < TM.run) return { ...g, pose: 'front:hands', expr: 'worried', look: [-1, 0] };
  if (t < TM.kick + 0.35) return { ...g, pose: 'front:freeze', expr: 'closed' };
  if (t < TM.save) return { ...g, pose: 'front:freeze', expr: 'surprised', look: [-1, 0.5] };
  if (t < TM.ears) return { ...g, pose: Math.floor(t * 4) % 2 ? 'front:cheer' : 'front:hold', expr: 'laugh' };
  return { ...g, pose: 'front:stand', expr: 'surprised', look: [-1, -1] };
}
function kidState(t) {
  const g = { ...RED, s: 1.05, y: KID0[1] };
  if (t < TM.pen) return { ...g, x: lerp(6420, SPOT[0] - 30, pr(t, 0.3, TM.pen)), pose: Math.floor(t / 0.3) % 2 ? 'walk1' : 'walk0', expr: 'normal' };
  if (t < TM.pen + 1.2) return { ...g, x: lerp(SPOT[0] - 30, KID0[0], pr(t, TM.pen + 0.3, TM.pen + 1.2)), pose: Math.floor(t / 0.3) % 2 ? 'walk1' : 'walk0', flip: true, expr: 'sneaky' };
  if (t < TM.run) return { ...g, x: KID0[0], pose: 'stand', expr: 'sneaky' };
  if (t < TM.kick) return { ...g, x: lerp(KID0[0], SPOT[0] - 70, pr(t, TM.run, TM.kick)), pose: Math.floor(t / 0.16) % 2 ? 'run1' : 'run0', expr: 'sneaky' };
  if (t < TM.kick + 0.5) return { ...g, x: SPOT[0] - 70, pose: 'kick', expr: 'happy' };
  return { ...g, x: SPOT[0] - 70, pose: 'front:stand', expr: 'surprised', look: [1, 0] };
}
function edoState(t) {
  const g = { s: 1.1, x: t < TM.save ? lerp(6380, EDO[0], pr(t, TM.run, TM.save)) : EDO[0], y: EDO[1] };
  if (t < TM.save) return { ...g, pose: 'front:hands', expr: t < TM.run ? 'normal' : 'worried', look: [1, 0] };
  if (t < TM.ears) return { ...g, pose: Math.floor(t * 4) % 2 ? 'front:cheer' : 'front:hold', expr: 'laugh' };
  return { ...g, pose: 'front:stand', expr: 'smile', look: [1, 0] };
}
function ballPos(t) {
  if (t < TM.pen + 0.3) return [lerp(6450, SPOT[0], pr(t, 0.3, TM.pen + 0.3)), SPOT[1], t * 6];
  if (t < TM.kick) return [SPOT[0], SPOT[1], 0];
  const hit = TM.kick + 0.35;
  if (t < hit) { const u = pr(t, TM.kick, hit); return [lerp(SPOT[0], LEO[0] - 20, u), lerp(SPOT[1], 1420, u) - 40 * Math.sin(u * Math.PI), t * 25]; }
  const u = pr(t, hit, hit + 1.3); return [lerp(LEO[0] - 20, 6930, eo(u)), lerp(1420, SPOT[1], Math.min(1, u * 2)) - 60 * Math.sin(Math.min(1, u * 2) * Math.PI) * (1 - u), t * 10 * (1 - u)];
}

export const { EV, ev } = (() => { const E = events(); return { EV: E.EV, ev: E.ev }; })();
LINES.forEach(Ln => ev(Ln.t, 'voice', { id: Ln.id }));
ev(0, 'paper'); ev(0.2, 'write', { dur: 1.4, pan: 0 });
ev(0.4, 'roll', { dur: TM.pen - 0.2, pan: -0.3 }); ev(TM.pen + 0.3, 'drop', { pan: -0.2 });
for (let k = 0; ; k++) { const t = TM.run + 0.1 + k * 0.32; if (t > TM.kick - 0.1) break; ev(t, 'runstep', { pan: -0.4 + k * 0.08 }); }
ev(TM.kick, 'kick', { pan: -0.2 }); ev(TM.kick + 0.05, 'whoosh'); ev(TM.kick + 0.35, 'kick', { pan: 0.3 }); ev(TM.kick + 0.4, 'squeak', { pan: 0.3 });
ev(TM.save, 'laugh', { pan: -0.3 }); ev(TM.ears, 'sting'); ev(TM.ears + 0.05, 'hopsoft', { pan: -0.4 });
ev(TM.tbc, 'write', { dur: 1.3, pan: 0 });
[['walk', 0], ['sneak', TM.pen], ['silence', TM.run], ['tutti', TM.save - 0.3], ['mystery', TM.ears], ['tbc', TM.tbc]].forEach(([id, t]) => ev(t, 'cue', { id }));

export function TEXTS(t) { begin(camT(t)); return [...seriesCard(t, 0.2, 2.6, 13), ...toBeContinued(t, TM.tbc)]; }

export function frame(comp, t, opt = {}) {
  begin(camT(t));
  drawPitch(L.BG.f, L.BG.l);
  // two paper-white ears poke up out of the trees: someone invisible was watching the match
  if (t > TM.ears) {
    const u = eo(pr(t, TM.ears, TM.ears + 0.5)), w = Math.sin(t * 9) * 0.1;
    const kg = L.INV.k.g; kg.save(); kg.fillStyle = '#000';
    [[EARS[0] - 20, -0.18], [EARS[0] + 20, 0.15]].forEach(([x, r]) => { kg.beginPath(); kg.ellipse(sx(x), sy(EARS[1] - 60 * u), 17 * CAM.s, 50 * CAM.s, r + w, 0, Math.PI * 2); kg.fill(); });
    kg.restore();
  }
  edo(L.CH, edoState(t));
  leo(L.CH, leoState(t));
  leo(L.CH, kidState(t));
  const B = ballPos(t); ball(L.CH, B[0], B[1], 26, B[2]);
  // the bonk: little stars where the ball hits Leo's tummy
  if (t > TM.kick + 0.35 && t < TM.kick + 1.0) { const u = pr(t, TM.kick + 0.35, TM.kick + 1.0); [[-60, -30], [-70, 20], [-40, -70]].forEach(([dx, dy], i) => line(L.FX, [[LEO[0] + dx, 1420 + dy], [LEO[0] + dx - 30 - 20 * u, 1420 + dy * (1 + u)]], { w: 6, col: K.ink, p: 0.9 * (1 - u), seed: 3700 + i, boil: 0.6 })); }
  if (opt.cover) opt.cover(); else { subTo(SUBS, t); seriesCard(t, 0.2, 2.6, 13); toBeContinued(t, TM.tbc); }
  composite(comp);
}
