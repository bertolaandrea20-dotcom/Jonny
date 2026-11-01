// Episode 7 — "The Big Kick" (Tuesday · football, 17 s). Leo's first real match. Edo passes; Leo kicks it really hard; the ball flies out of sight.
// Silence. Then, from somewhere next door: splash… and a rubber-duck squeak.
import { track, clamp, lerp, eo, ei } from '/core/lib.js';
import { leo, edo } from '../engine/kids.js';
import { line } from '../engine/crayon.js';
import { drawPitch } from '../engine/pitch.js';
import { ball } from '../engine/props.js';
import { L, K, BEAT, b, pr, begin, composite, events, buildSubs, subTo, seriesCard, toBeContinued } from '../engine/common.js';

export const DUR = 17;
const TM = { pass: b(1), trap: b(1, 2.3), sil: b(2), kick: b(2, 2), look: b(3, 2), splash: b(4), tbc: b(5) };
export const LINES = [
  { id: 'n1', t: 0.5, d: 2.0, text: 'Tuesday: Leo\'s first real match.' },
  { id: 'n2', t: 3.0, d: 1.4, text: 'Edo passed him the ball.' },
  { id: 'n3', t: 7.4, d: 1.8, text: 'Leo kicked it. Really hard.' },
  { id: 'n4', t: 11.4, d: 1.9, text: 'Then, from next door… splash!' },
];
export const SUBS = buildSubs(LINES);
const camT = track([
  [0, [6050, 1300, 1.05]], [TM.pass - 0.3, [6040, 1360, 1.5]], [TM.trap, [6080, 1380, 1.6]], [TM.sil + 0.2, [6240, 1400, 2.0]], [TM.kick + 0.1, [6250, 1400, 2.0]],
  [TM.kick + 0.6, [6420, 1050, 1.45]], [TM.kick + 1.4, [6520, 760, 1.3]], [TM.look - 0.3, [6060, 1360, 1.55]], [DUR, [6060, 1370, 1.5]],
]);
const LEO = [6230, 1540], EDO = [5820, 1540];

function leoState(t) {
  const g = { s: 1.0, seed: 3000, x: LEO[0], y: LEO[1], pack: false };
  if (t < TM.trap) return { ...g, pose: Math.floor(t / (BEAT / 2)) % 2 ? 'walk1' : 'walk0', flip: true, expr: 'happy', x: LEO[0] + 8 * Math.sin(t * 4) };
  if (t < TM.sil) return { ...g, pose: 'stand', flip: true, expr: 'smile' };
  if (t < TM.kick) return { ...g, pose: 'stand', flip: false, expr: 'sneaky' };
  if (t < TM.kick + 0.45) return { ...g, pose: 'kick', flip: false, expr: 'happy' };
  if (t < TM.splash) return { ...g, pose: 'front:stand', expr: 'surprised', look: [0.6, -1] };
  if (t < TM.tbc) return { ...g, pose: 'front:freeze', expr: 'surprised', look: [-1, 0] };
  return { ...g, pose: 'front:stand', expr: 'worried', look: [-1, 0] };
}
function edoState(t) {
  const g = { s: 0.98, x: EDO[0], y: EDO[1] };
  if (t < TM.pass) return { ...g, pose: Math.floor(t / (BEAT / 2)) % 2 ? 'walk0' : 'walk1', flip: false, expr: 'happy', x: EDO[0] + 10 * Math.sin(t * 5) };
  if (t < TM.pass + 0.4) return { ...g, pose: 'kick', flip: false, expr: 'happy' };
  if (t < TM.kick) return { ...g, pose: 'stand', flip: false, expr: 'smile' };
  if (t < TM.splash) return { ...g, pose: 'front:hands', expr: 'surprised', look: [0.6, -1] };
  if (t < TM.tbc) return { ...g, pose: 'front:stand', expr: 'surprised', look: [1, 0] };
  return { ...g, pose: 'front:stand', expr: 'smile', look: [1, 0] };
}
function ballPos(t) {
  if (t < TM.pass) return [EDO[0] + 60 + 10 * Math.sin(t * 5), 1530, t * 6];
  if (t < TM.trap) { const u = eo(pr(t, TM.pass + 0.15, TM.trap)); return [lerp(EDO[0] + 60, LEO[0] - 40, u), 1530, t * 12]; }
  if (t < TM.sil) return [LEO[0] - 40, 1530, 0];
  if (t < TM.kick + 0.1) return [LEO[0] + 66, 1530, 0];
  const u = pr(t, TM.kick + 0.1, TM.kick + 1.6); if (u >= 1) return null;
  return [lerp(LEO[0] + 66, 6780, u), lerp(1530, -260, ei(u) * 0.4 + u * 0.6), t * 20, 1 - 0.45 * u];
}

export const { EV, ev } = (() => { const E = events(); return { EV: E.EV, ev: E.ev }; })();
LINES.forEach(Ln => ev(Ln.t, 'voice', { id: Ln.id }));
ev(0, 'paper'); ev(0.2, 'write', { dur: 1.4, pan: 0 });
for (let k = 0; ; k++) { const t = 0.15 + k * BEAT / 2; if (t > TM.pass - 0.1) break; ev(t, 'tiptoe', { i: k, pan: -0.4 }); }
ev(TM.pass, 'kick'); ev(TM.pass + 0.15, 'roll', { dur: TM.trap - TM.pass - 0.15 }); ev(TM.trap, 'step', { pan: 0.2 });
ev(TM.kick, 'kick'); ev(TM.kick + 0.05, 'whoosh');
ev(TM.splash, 'splash'); ev(TM.splash + 0.35, 'squeak'); ev(TM.splash + 0.5, 'sting');
ev(TM.tbc, 'write', { dur: 1.3, pan: 0 });
[['walk', 0], ['silence', TM.sil], ['tutti', TM.kick], ['silence', TM.look], ['tbc', TM.splash]].forEach(([id, t]) => ev(t, 'cue', { id }));

export function TEXTS(t) { begin(camT(t)); return [...seriesCard(t, 0.2, 2.6, 7), ...toBeContinued(t, TM.tbc)]; }

export function frame(comp, t, opt = {}) {
  begin(camT(t));
  drawPitch(L.BG.f, L.BG.l);
  edo(L.CH, edoState(t));
  leo(L.CH, leoState(t));
  const B = ballPos(t); if (B) ball(L.CH, B[0], B[1], 26 * (B[3] || 1), B[2]);
  // motion lines on the big kick
  if (B && t > TM.kick + 0.1 && t < TM.kick + 1.2) { const u = pr(t, TM.kick + 0.1, TM.kick + 1.2); [-1, 0, 1].forEach(k => line(L.FX, [[B[0] - 70 + k * 6, B[1] + 60 + k * 16], [B[0] - 30 + k * 6, B[1] + 30 + k * 16]], { w: 5, col: K.ink, p: 0.8 * (1 - u), seed: 3200 + k, boil: 0.5 })); }
  if (opt.cover) opt.cover(); else { subTo(SUBS, t); seriesCard(t, 0.2, 2.6, 7); toBeContinued(t, TM.tbc); }
  composite(comp);
}
