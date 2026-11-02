// Episode 14 — "The Secret" (Wednesday · friends, 17 s). On the street by the hedge, Leo tells Edo everything:
// a thought bubble shows the jacket and a dotted, invisible rabbit. Edo doesn't laugh. "Let's catch it." High five.
// Behind them, the hedge rustles: two white ears.
import { track, lerp, eo } from '/core/lib.js';
import { line, ellipse, sx, sy, CAM } from '../engine/crayon.js';
import { leo, edo, jacketShape } from '../engine/kids.js';
import { drawStreet, drawHollow, drawFence } from '../engine/world.js';
import { L, K, b, pr, begin, composite, events, buildSubs, subTo, seriesCard, toBeContinued } from '../engine/common.js';

export const DUR = 17;
const TM = { bub: b(1, 2), rab: b(2), quiet: b(2, 2), say: b(3, 2), hi: b(4), ears: b(4, 2), tbc: b(5) };
export const LINES = [
  { id: 'n1', t: 0.5, d: 2.2, text: 'Wednesday. Leo told Edo his secret.' },
  { id: 'n2', t: 4.3, d: 2.4, text: 'A jacket… and an invisible rabbit.' },
  { id: 'n3', t: 7.4, d: 1.4, text: 'Edo didn\'t laugh.' },
  { id: 'n4', t: 9.6, d: 1.8, text: '"Let\'s catch it," he said.' },
];
export const SUBS = buildSubs(LINES);
const camT = track([[0, [1770, 1230, 1.55]], [TM.bub, [1790, 1200, 1.5]], [TM.quiet + 0.3, [1830, 1300, 1.85]], [TM.say, [1830, 1300, 1.9]], [TM.hi - 0.2, [1790, 1250, 1.6]], [DUR, [1760, 1260, 1.5]]]);
const LEO = [1700, 1500], EDO = [1880, 1500];
const BUB = { cx: 560, cy: 640, rx: 360, ry: 250 };     // the thought bubble (screen px)
const toW = ([X, Y]) => [(X - 540) / CAM.s + CAM.x, (Y - 960) / CAM.s + CAM.y];

function leoState(t) {
  const g = { s: 1.0, seed: 3000, x: LEO[0], y: LEO[1] };
  if (t < TM.bub) return { ...g, pose: 'front:hands', expr: 'sneaky', look: [1, 0] };
  if (t < TM.quiet) return { ...g, pose: 'front:hold', expr: 'smile', look: [0, -1] };
  if (t < TM.hi) return { ...g, pose: 'front:stand', expr: 'worried', look: [1, 0] };
  if (t < TM.ears) return { ...g, pose: 'front:hi5R', expr: 'laugh' };
  return { ...g, pose: 'front:stand', expr: 'surprised', look: [-1, -0.3] };
}
function edoState(t) {
  const g = { s: 0.98, x: EDO[0], y: EDO[1] };
  if (t < TM.quiet) return { ...g, pose: 'front:stand', expr: t < TM.rab ? 'normal' : 'surprised', look: [-1, 0] };
  if (t < TM.say) return { ...g, pose: 'front:freeze', expr: 'normal', look: [-1, 0] };
  if (t < TM.hi) return { ...g, pose: 'front:stand', expr: 'sneaky', look: [-1, 0] };
  if (t < TM.ears) return { ...g, x: EDO[0] - 20, pose: 'front:hi5L', expr: 'laugh' };
  return { ...g, pose: 'front:stand', expr: 'surprised', look: [-1, -0.3] };
}

export const { EV, ev } = (() => { const E = events(); return { EV: E.EV, ev: E.ev }; })();
LINES.forEach(Ln => ev(Ln.t, 'voice', { id: Ln.id }));
ev(0, 'paper'); ev(0.2, 'write', { dur: 1.4, pan: 0 });
ev(TM.bub, 'puff'); ev(TM.bub + 0.3, 'scratch', { dur: 0.9, pan: 0 }); ev(TM.rab, 'scratch', { dur: 1.0, pan: 0.1 });
ev(TM.quiet, 'puff'); ev(TM.hi, 'clap'); ev(TM.hi + 0.1, 'laugh', { pan: 0.2 });
ev(TM.ears, 'cloth', { pan: -0.5 }); ev(TM.ears + 0.2, 'sting');
ev(TM.tbc, 'write', { dur: 1.3, pan: 0 });
[['walk', 0], ['mystery', TM.bub], ['silence', TM.quiet], ['theme', TM.say], ['mystery', TM.ears], ['tbc', TM.tbc]].forEach(([id, t]) => ev(t, 'cue', { id }));

export function TEXTS(t) { begin(camT(t)); return [...seriesCard(t, 0.2, 2.6, 14), ...toBeContinued(t, TM.tbc)]; }

export function frame(comp, t, opt = {}) {
  begin(camT(t));
  const all = { verge: 1, path: 1, sign: 1, hedge: 1, hedgeL: 1, fence: 1, fenceF: 1 };
  drawStreet(L.BG.f, L.BG.l, all); drawHollow(L.BG.f, L.BG.l, 1); drawFence(L.BG.f, L.BG.l, all, 0);
  // the thought bubble: a cloud of paper cut out of the page, with the jacket and a dotted rabbit inside
  if (t > TM.bub && t < TM.quiet) {
    const a = eo(pr(t, TM.bub, TM.bub + 0.25)) * (1 - pr(t, TM.quiet - 0.2, TM.quiet)), { cx, cy, rx, ry } = BUB;
    const cloud = []; for (let i = 0; i <= 48; i++) { const q = i / 48 * Math.PI * 2, k = 1 + 0.07 * Math.abs(Math.sin(q * 5)); cloud.push([cx + Math.cos(q) * rx * a * k, cy + Math.sin(q) * ry * a * k]); }
    [L.BG.f.g, L.BG.l.g].forEach(g => { g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.beginPath(); cloud.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
      [[cx - 120, cy + ry + 50, 34], [cx - 170, cy + ry + 120, 22]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, (r + 8) * a, 0, Math.PI * 2); g.fill(); }); g.restore(); });
    line(L.WAX, [...cloud, cloud[0]].map(toW), { w: 6, col: K.ink, p: 0.85, seed: 3800 });
    [[cx - 120, cy + ry + 50, 34], [cx - 170, cy + ry + 120, 22]].forEach(([x, y, r], i) => line(L.WAX, ellipse(x, y, r * a, r * a, 20).map(toW), { w: 5, col: K.ink, p: 0.85, seed: 3801 + i }));
    if (a > 0.95) {
      const [jx, jy] = toW([cx - 140, cy + 10]), js = 1.7 / CAM.s * 1.5;
      jacketShape(L.CH, P => P.map(([x, y]) => [jx + (x - jx) * js, jy + (y - jy) * js]), jx, jy, 3810);
      if (t > TM.rab) {   // the invisible rabbit: only a dotted outline, drawn dash by dash
        const u = pr(t, TM.rab, TM.rab + 0.9), rc = [cx + 150, cy + 60];
        const shapes = [ellipse(rc[0], rc[1], 90, 62, 40), ellipse(rc[0] + 74, rc[1] - 70, 46, 42, 30), ellipse(rc[0] + 60, rc[1] - 170, 15, 52, 20, 0, Math.PI * 2, -0.2), ellipse(rc[0] + 96, rc[1] - 166, 15, 52, 20, 0, Math.PI * 2, 0.2)];
        let n = 0; const tot = shapes.reduce((s, p) => s + p.length, 0);
        shapes.forEach((pts, si) => { for (let i = 0; i + 1 < pts.length; i += 2) { if (n++ / tot > u * 2) return; line(L.FX, [toW(pts[i]), toW(pts[i + 1])], { w: 6, col: K.ink, p: 0.75, seed: 3820 + si * 50 + i }); } });
        line(L.FX, [toW([rc[0] - 120, rc[1] - 140]), toW([rc[0] - 60, rc[1] - 110])], { w: 5, col: K.red, p: 0.7 * u, seed: 3890 });
      }
    }
  }
  // the hedge rustles behind them: two paper-white ears
  if (t > TM.ears) {
    const u = eo(pr(t, TM.ears, TM.ears + 0.5)), w = Math.sin(t * 30) * 0.12 * (1 - pr(t, TM.ears + 0.8, TM.ears + 1.5));
    const kg = L.INV.k.g; kg.save(); kg.fillStyle = '#000';
    [[1560, -0.18], [1600, 0.15]].forEach(([x, r]) => { kg.beginPath(); kg.ellipse(sx(x), sy(1330 - 70 * u), 17 * CAM.s, 52 * CAM.s, r + w, 0, Math.PI * 2); kg.fill(); });
    kg.restore();
  }
  edo(L.CH, edoState(t));
  leo(L.CH, leoState(t));
  // the slap of the high five
  if (t > TM.hi && t < TM.hi + 0.6) { const u = pr(t, TM.hi, TM.hi + 0.6), hx = (LEO[0] + EDO[0]) / 2, hy = 1250; [0, 1, 2, 3, 4].forEach(i => { const q = -Math.PI / 2 + (i - 2) * 0.5; line(L.FX, [[hx + Math.cos(q) * (30 + 30 * u), hy + Math.sin(q) * (30 + 30 * u)], [hx + Math.cos(q) * (55 + 40 * u), hy + Math.sin(q) * (55 + 40 * u)]], { w: 6, col: K.orange, p: 1 - u, seed: 3900 + i }); }); }
  if (opt.cover) opt.cover(); else { subTo(SUBS, t); seriesCard(t, 0.2, 2.6, 14); toBeContinued(t, TM.tbc); }
  composite(comp);
}
