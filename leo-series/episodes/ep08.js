// Episode 8 — "New Kid" (Wednesday · friends, 17 s). How Leo met Edo: a new kid sits alone on Leo's street with a ball.
// Leo says hi; Edo smiles and passes him the ball. Then… the hedge moves.
import { track, clamp, lerp, eo } from '/core/lib.js';
import { line, fill, text, ellipse, CAM, sx, sy } from '../engine/crayon.js';
import { leo, edo } from '../engine/kids.js';
import { drawStreet, drawHollow, drawFence } from '../engine/world.js';
import { ball } from '../engine/props.js';
import { L, K, BEAT, b, pr, begin, composite, events, buildSubs, subTo, seriesCard, toBeContinued } from '../engine/common.js';

export const DUR = 17;
const TM = { see: b(1), sil: b(2), hi: b(2, 2), up: b(3), pass: b(3, 1), trap: b(3, 2.2), rustle: b(4, 2), tbc: b(5) };
export const LINES = [
  { id: 'n1', t: 0.5, d: 2.0, text: 'Wednesday. A new kid on the street.' },
  { id: 'n2', t: 3.2, d: 1.8, text: 'He sat all alone, with a ball.' },
  { id: 'n3', t: 8.6, d: 1.2, text: 'His name was Edo.' },
  { id: 'n4', t: 12.6, d: 1.5, text: 'Then… the hedge moved.' },
];
export const SUBS = buildSubs(LINES);
const camT = track([[0, [900, 1300, 1.5]], [TM.see, [1000, 1320, 1.6]], [TM.hi - 0.3, [1090, 1330, 1.75]], [TM.trap, [1090, 1330, 1.7]], [TM.rustle - 0.2, [1150, 1320, 1.6]], [TM.rustle + 0.5, [1200, 1310, 1.55]], [DUR, [1190, 1310, 1.5]]]);
const EDO = [1180, 1500], STOP = 980;

function leoState(t) {
  const g = { s: 1.0, seed: 3000, y: 1500 };
  if (t < TM.see) { return { ...g, x: lerp(620, 860, pr(t, 0, TM.see)), pose: Math.floor(t / (BEAT / 2)) % 2 ? 'walk1' : 'walk0', expr: 'normal' }; }
  if (t < TM.sil) return { ...g, x: 860, pose: 'stand', expr: 'surprised', look: [1, 0.3] };
  if (t < TM.hi) { const u = pr(t, TM.sil, TM.hi - 0.2); return { ...g, x: lerp(860, STOP, u), pose: u < 1 ? (Math.floor(t / (BEAT / 2)) % 2 ? 'walk1' : 'walk0') : 'stand', expr: 'normal' }; }
  if (t < TM.pass) return { ...g, x: STOP, pose: Math.floor(t * 3) % 2 ? 'front:wave1' : 'front:wave0', expr: 'hello' };
  if (t < TM.rustle) return { ...g, x: STOP, pose: t < TM.trap + 0.4 ? 'stand' : 'front:stand', expr: 'happy' };
  return { ...g, x: STOP, pose: 'front:stand', expr: 'surprised', look: [1, 0] };
}
function edoState(t) {
  const g = { s: 0.98, x: EDO[0], y: EDO[1] };
  if (t < TM.up) return { ...g, pose: 'crouch', flip: false, expr: t < TM.hi + 0.6 ? 'sad' : 'surprised', look: t > TM.hi ? [-1, 0] : [1, 0.3] };
  if (t < TM.pass) return { ...g, pose: 'front:stand', expr: 'smile' };
  if (t < TM.pass + 0.4) return { ...g, pose: 'kick', flip: true, expr: 'happy' };
  if (t < TM.rustle) return { ...g, pose: 'front:stand', expr: 'happy' };
  return { ...g, pose: 'front:stand', expr: 'surprised', look: [1, 0] };
}
function ballPos(t) {
  if (t < TM.pass) return [EDO[0] + 70, 1478, 0];
  if (t < TM.trap) { const u = eo(pr(t, TM.pass + 0.1, TM.trap)); return [lerp(EDO[0] - 50, STOP + 50, u), 1478, -t * 10]; }
  return [STOP + 50, 1478, 0];
}

export const { EV, ev } = (() => { const E = events(); return { EV: E.EV, ev: E.ev }; })();
LINES.forEach(Ln => ev(Ln.t, 'voice', { id: Ln.id }));
ev(0, 'paper'); ev(0.2, 'write', { dur: 1.4, pan: 0 });
for (let k = 0; ; k++) { const t = 0.1 + k * BEAT / 2; if (t > TM.see) break; ev(t, 'step', { pan: -0.3 }); }
for (let k = 0; ; k++) { const t = TM.sil + 0.1 + k * BEAT / 2; if (t > TM.hi - 0.2) break; ev(t, 'step', { pan: -0.1 }); }
ev(TM.hi, 'write', { dur: 0.6, pan: -0.2 }); ev(TM.up, 'cloth');
ev(TM.pass, 'kick'); ev(TM.pass + 0.1, 'roll', { dur: TM.trap - TM.pass - 0.1 }); ev(TM.trap, 'step', { pan: -0.1 });
ev(TM.rustle, 'cloth'); ev(TM.rustle + 0.25, 'cloth'); ev(TM.rustle + 0.3, 'sting');
ev(TM.tbc, 'write', { dur: 1.3, pan: 0 });
[['walk', 0], ['silence', TM.sil], ['theme', TM.hi], ['mystery', TM.rustle], ['tbc', TM.tbc]].forEach(([id, t]) => ev(t, 'cue', { id }));

export function TEXTS(t) {
  begin(camT(t)); const out = [...seriesCard(t, 0.2, 2.6, 8), ...toBeContinued(t, TM.tbc)];
  if (t > TM.hi && t < TM.pass) out.push({ id: 'hi', text: "Hi! I'm Leo!", x0: 300, y0: 560, x1: 760, y1: 660 });
  return out;
}

export function frame(comp, t, opt = {}) {
  begin(camT(t));
  const all = { verge: 1, path: 1, sign: 1, hedge: 1, hedgeL: 1, fence: 1, fenceF: 1 };
  drawStreet(L.BG.f, L.BG.l, all); drawHollow(L.BG.f, L.BG.l, 1); drawFence(L.BG.f, L.BG.l, all, 0);
  // the hedge rustles: leaves shake and a few motion marks
  if (t > TM.rustle) { const u = pr(t, TM.rustle, TM.rustle + 0.5), w = Math.sin(t * 30) * 0.12;
    // two paper-white rabbit ears poke up out of the hedge (the invisible rabbit), wiggling
    const kg = L.INV.k.g; kg.save(); kg.fillStyle = '#000';
    [[1390, -0.18], [1430, 0.15]].forEach(([x, r]) => { kg.beginPath(); kg.ellipse(sx(x), sy(1330 - 70 * eo(u)), 17 * CAM.s, 52 * CAM.s, r + w, 0, Math.PI * 2); kg.fill(); });
    kg.restore();
    // rustle marks in the air above the hedge
    [[1340, 1150], [1470, 1140], [1405, 1100]].forEach(([x, y], i) => line(L.FX, [[x - 22, y + (i % 2 ? 6 : -6)], [x, y], [x + 22, y + (i % 2 ? -6 : 6)]], { w: 6, col: K.ink, p: 0.9, seed: 3300 + i, boil: 1 })); }
  edo(L.CH, edoState(t));
  leo(L.CH, leoState(t));
  const B = ballPos(t); ball(L.CH, B[0], B[1], 24, B[2]);
  // "Hi! I'm Leo!" speech bubble
  if (t > TM.hi && t < TM.pass) {
    const bx = STOP - 20, by = 1080, a = pr(t, TM.hi, TM.hi + 0.25);
    fill(L.FX, ellipse(bx, by, 170, 66, 36), { col: K.white, p: 0.95, gap: 6, w: 9, seed: 3320, draw: a, boil: 0 });
    line(L.FX, ellipse(bx, by, 170, 66, 36), { w: 5, seed: 3321, draw: a, boil: 0.8 });
    line(L.FX, [[bx - 30, by + 60], [bx - 10, by + 120], [bx + 20, by + 62]], { w: 5, seed: 3322, draw: a, boil: 0.8 });
    text(L.FX, "Hi! I'm Leo!", sx(bx), sy(by + 18), { size: 54 * CAM.s, font: 'Gaegu', weight: 700, reveal: pr(t, TM.hi + 0.1, TM.hi + 0.6), seed: 3323, col: K.ink });
  }
  if (opt.cover) opt.cover(); else { subTo(SUBS, t); seriesCard(t, 0.2, 2.6, 8); toBeContinued(t, TM.tbc); }
  composite(comp);
}
