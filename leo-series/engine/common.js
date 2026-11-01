// Shared pieces for every episode of "The Invisible Jacket" series (vertical 1080×1920, 24 fps).
// An episode module imports these, describes its timeline, and calls begin() … composite() per frame.
import { layer, clear, line, fill, dab, text, handCircle, ellipse, xf, CAM, BOIL, W, H, sx, sy } from './crayon.js';
import { group, clearGroup } from './rig.js';
import { PAL } from './pal.js';
import { clamp, lerp, hash } from '/core/lib.js';
export const K = PAL.crayon;
export const BPM = 88, BEAT = 60 / BPM;
export const b = (bar, beat = 0) => (bar * 4 + beat) * BEAT;
export const pr = (t, a, c) => clamp((t - a) / (c - a));

// layers: page crayon, white wax, wax props, invisible (knock-out) group, characters, effects, wash, subtitles, screen lettering
export const L = { BG: { f: layer(), l: layer() }, WAX: layer(), JK: group(), INV: group(), CH: group(), FX: layer(), WASH: layer(), SUBK: layer(), SUBT: layer(), TOPK: layer(), TOP: layer() };
export function begin(cam) {
  [CAM.x, CAM.y, CAM.s] = cam;
  clearGroup(L.JK); clearGroup(L.INV); clearGroup(L.CH);
  [L.BG.f, L.BG.l, L.WAX, L.FX, L.WASH, L.SUBK, L.SUBT, L.TOPK, L.TOP].forEach(clear);
}
// paper → page → white wax → invisible (paper holes) → wash → characters → effects → subtitles → screen lettering
export function composite(comp, { wash = false, vig = 0.24 } = {}) {
  comp.paperCam(CAM.x * 0.6, CAM.y * 0.6, CAM.s / 0.6);
  comp.begin();
  comp.crayon(L.BG.f.c); comp.crayon(L.BG.l.c);
  comp.crayon(L.WAX.c); comp.crayon(L.JK.f.c); comp.crayon(L.JK.l.c);
  comp.knock(L.INV.k.c);
  if (wash) comp.wash(L.WASH.c, { color: PAL.wash });
  const go = [hash(BOIL.step) * 300, hash(BOIL.step + 7) * 300];
  comp.group(L.CH, { goff: go });
  comp.crayon(L.FX.c, { goff: go });
  comp.knock(L.SUBK.c); comp.crayon(L.SUBT.c);
  comp.knock(L.TOPK.c); comp.crayon(L.TOP.c);
  comp.finish({ vig });
}

// —— events ——
export function events() { const EV = []; const ev = (t, type, o = {}) => EV.push({ t: +t.toFixed(3), type, ...o }); return { EV, ev }; }

// —— subtitles: wrapped to two lines inside Instagram's safe area (clear of the caption and buttons at the bottom) ——
const SUB_SIZE = 56, SUB_Y = 1420, SUB_MAXW = 860;
let measureCtx = null;
function wrap(str) {
  if (!measureCtx) { measureCtx = document.createElement('canvas').getContext('2d'); }
  measureCtx.font = `400 ${SUB_SIZE}px "Patrick Hand"`;
  if (measureCtx.measureText(str).width <= SUB_MAXW) return [str];
  const w = str.split(' '); let best = [str], bestD = 1e9;
  for (let i = 1; i < w.length; i++) { const a = w.slice(0, i).join(' '), c = w.slice(i).join(' '); const d = Math.abs(measureCtx.measureText(a).width - measureCtx.measureText(c).width); if (d < bestD) { bestD = d; best = [a, c]; } }
  return best;
}
export function buildSubs(LINES) {
  return LINES.map((Ln, i) => { const t0 = Ln.t - 0.1; let t1 = Math.max(t0 + 1.8, Ln.t + Ln.d + 0.7); const nx = LINES[i + 1]; if (nx) t1 = Math.min(t1, nx.t - 0.2); return { t0, t1, text: Ln.text }; });
}
export function patch(Lyr, cx, cy, hw, hh) {
  const g = Lyr.g; g.save(); g.fillStyle = '#000'; g.beginPath();
  for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 2; const px = Math.cos(a), py = Math.sin(a); const sq = Math.pow(Math.abs(px), 0.3) * Math.sign(px); const n = 1 + 0.06 * Math.sin(a * 7 + 1.3) + 0.03 * Math.sin(a * 17); const X = cx + sq * hw * n, Y = cy + py * hh * n; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }
  g.closePath(); g.fill(); g.restore();
}
export function subTo(SUBS, t) {
  const S = SUBS.find(s => t >= s.t0 && t < s.t1); if (!S) return;
  const lines = wrap(S.text), n = lines.length;
  measureCtx.font = `400 ${SUB_SIZE}px "Patrick Hand"`;
  const tw = Math.max(...lines.map(s => measureCtx.measureText(s).width));
  const lh = SUB_SIZE * 1.12, cy = SUB_Y;
  patch(L.SUBK, W / 2, cy, tw / 2 + 44, 34 + lh * n / 2);
  const total = S.text.length; let done = 0;
  lines.forEach((s, i) => {
    const rv = clamp((pr(t, S.t0, S.t0 + 0.35 + 0.15 * (n - 1)) * total - done) / s.length); done += s.length;
    text(L.SUBT, s, W / 2, cy + SUB_SIZE * 0.32 + (i - (n - 1) / 2) * lh, { size: SUB_SIZE, col: K.ink, reveal: rv, seed: 11 + S.t0 * 3 + i, p: 1, stroke: 1.2 });
  });
}
export function subTexts(SUBS, t) { return []; }   // subtitles are checked from the .srt, not by readcheck

// —— screen lettering: the series card at the start, "To be continued…" at the end ——
export function seriesCard(t, t0, t1, ep) {
  if (t < t0 || t > t1) return [];
  patch(L.TOPK, W / 2, 300, 380, 120);
  text(L.TOP, 'The Invisible Jacket', W / 2, 290, { size: 84, font: 'Gaegu', weight: 700, col: K.ink, reveal: pr(t, t0, t0 + 1.0), seed: 3, p: 0.95, stroke: 2 });
  text(L.TOP, `Episode ${ep}`, W / 2, 372, { size: 58, font: 'Gaegu', weight: 700, col: K.red, reveal: pr(t, t0 + 0.9, t0 + 1.4), seed: 5, p: 0.95 });
  line(L.TOP, [scr2w([W / 2 - 150, 394]), scr2w([W / 2 + 150, 398])], { w: 5, col: K.red, p: 0.8, seed: 7, draw: pr(t, t0 + 1.3, t0 + 1.7) });
  return [{ id: 'card1', text: 'The Invisible Jacket', x0: W / 2 - 360, y0: 220, x1: W / 2 + 360, y1: 310 }, { id: 'card2', text: `Episode ${ep}`, x0: W / 2 - 150, y0: 320, x1: W / 2 + 150, y1: 390 }];
}
const scr2w = ([X, Y]) => [(X - W / 2) / CAM.s + CAM.x, (Y - H / 2) / CAM.s + CAM.y];   // screen px → world (lines are drawn in world coords)
export function toBeContinued(t, t0) {
  if (t < t0) return [];
  patch(L.TOPK, W / 2, 330, 400, 110);
  text(L.TOP, 'To be continued…', W / 2, 360, { size: 92, font: 'Gaegu', weight: 700, col: K.ink, reveal: pr(t, t0, t0 + 1.3), seed: 9, p: 0.95, stroke: 2 });
  return [{ id: 'tbc', text: 'To be continued…', x0: W / 2 - 380, y0: 280, x1: W / 2 + 380, y1: 380 }];
}
