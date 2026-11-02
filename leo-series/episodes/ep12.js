// Episode 12 — "Late!" (Monday · school, 17 s). The classroom: the clock says 7:59, Edo waits next to an empty desk.
// The door bangs open, Leo runs in and lands at his desk as the bell rings. Then the board writes itself: TOMORROW: SHOW AND TELL.
// Leo knows exactly what to bring.
import { track, lerp, eo } from '/core/lib.js';
import { leo, edo } from '../engine/kids.js';
import { CLASS, drawClass, pupilDesk, chalk } from '../engine/rooms.js';
import { L, K, BEAT, b, pr, begin, composite, events, buildSubs, subTo, seriesCard, toBeContinued } from '../engine/common.js';

export const DUR = 17;
const TM = { door: b(1, 2), seat: b(2, 2), board: b(3, 1), idea: b(4, 2), tbc: b(5, 1) };
export const LINES = [
  { id: 'n1', t: 0.5, d: 1.9, text: 'Monday. Leo was late.' },
  { id: 'n2', t: 7.1, d: 1.2, text: 'Just in time!' },
  { id: 'n3', t: 9.3, d: 1.7, text: 'Then he read the board…' },
  { id: 'n4', t: 12.4, d: 2.1, text: 'He knew exactly what to bring.' },
];
export const SUBS = buildSubs(LINES);
const camT = track([[0, [11880, 1000, 1.15]], [TM.door - 0.4, [11800, 1150, 1.0]], [TM.seat + 0.5, [11800, 1150, 1.0]], [TM.board + 0.3, [11900, 1100, 1.05]], [TM.idea, [11980, 1150, 1.15]], [DUR, [11980, 1150, 1.15]]]);
const DOORX = (CLASS.door[0] + CLASS.door[1]) / 2;

function leoState(t) {
  const g = { s: 1.05, seed: 3000, y: 1500 };
  if (t < TM.door) return null;
  if (t < TM.seat) { const u = pr(t, TM.door + 0.1, TM.seat); return { ...g, x: lerp(DOORX, CLASS.leo[0], u), pose: Math.floor(t / 0.15) % 2 ? 'run1' : 'run0', expr: 'worried' }; }
  if (t < TM.board) return { ...g, x: CLASS.leo[0], pose: 'front:cheer', expr: 'laugh' };
  if (t < TM.idea) return { ...g, x: CLASS.leo[0], pose: 'front:stand', expr: 'surprised', look: [-1, -1] };
  return { ...g, x: CLASS.leo[0], pose: 'front:stand', expr: 'sneaky', look: [0, 0] };
}
function edoState(t) {
  const g = { s: 1.02, x: CLASS.edo[0], y: 1500 };
  if (t < TM.door) return { ...g, pose: 'front:stand', expr: 'worried', look: [-1, 0] };
  if (t < TM.seat) return { ...g, pose: 'front:stand', expr: 'surprised', look: [1, 0] };
  if (t < TM.board) return { ...g, pose: Math.floor(t * 4) % 2 ? 'front:wave0' : 'front:wave1', expr: 'laugh', look: [1, 0] };
  return { ...g, pose: 'front:stand', expr: 'normal', look: [0.5, -1] };
}

export const { EV, ev } = (() => { const E = events(); return { EV: E.EV, ev: E.ev }; })();
LINES.forEach(Ln => ev(Ln.t, 'voice', { id: Ln.id }));
ev(0, 'paper'); ev(0.2, 'write', { dur: 1.4, pan: 0 });
ev(TM.door, 'creak', { pan: -0.5 }); ev(TM.door + 0.05, 'drop', { pan: -0.5 });
for (let k = 0; ; k++) { const t = TM.door + 0.15 + k * 0.3; if (t > TM.seat) break; ev(t, 'runstep', { pan: -0.5 + k * 0.12 }); }
ev(TM.seat, 'bell', { dur: 1.5, pan: 0.1 }); ev(TM.seat + 0.1, 'laugh', { pan: -0.2 });
ev(TM.board, 'scratch', { dur: 2.0, pan: 0 });
ev(TM.idea, 'sting');
ev(TM.tbc, 'write', { dur: 1.3, pan: 0 });
[['walk', 0], ['tutti', TM.door], ['theme', TM.seat], ['mystery', TM.board], ['tbc', TM.tbc]].forEach(([id, t]) => ev(t, 'cue', { id }));

export function TEXTS(t) {
  begin(camT(t)); const out = [...seriesCard(t, 0.2, 2.6, 12), ...toBeContinued(t, TM.tbc)];
  return out;
}

export function frame(comp, t, opt = {}) {
  begin(camT(t));
  const late = t < TM.seat;
  drawClass(L.BG.f, L.BG.l, { hour: late ? 7 : 8, min: late ? 59 : 0, door: t < TM.door ? 0 : 1 - 0.6 * pr(t, TM.door + 1.2, TM.seat + 1) });
  // the board writes itself in chalk
  if (t > TM.board) {
    const u = pr(t, TM.board, TM.board + 2.0);
    chalk(L.FX, 'TOMORROW:', 11910, 700, 84, Math.min(1, u * 2), 5400);
    chalk(L.FX, 'SHOW AND TELL', 11910, 850, 90, Math.max(0, u * 2 - 1), 5410);
  }
  edo(L.CH, edoState(t)); pupilDesk(L.CH, CLASS.edo[0], 5300);
  const S = leoState(t); if (S) leo(L.CH, S);
  pupilDesk(L.CH, CLASS.leo[0], 5320);
  if (opt.cover) opt.cover(); else { subTo(SUBS, t); seriesCard(t, 0.2, 2.6, 12); toBeContinued(t, TM.tbc); }
  composite(comp);
}
