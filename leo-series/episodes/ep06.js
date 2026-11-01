// Episode 6 — "The Name Tag" (17 s). A scrap of the jacket is caught on the fence, with a blank label: NAME: ____.
// Leo paints over it; the wash finds white-wax letters. The name on the jacket is… LEO.
import { track, clamp, lerp, eo } from '/core/lib.js';
import { line, fill, text, CAM } from '../engine/crayon.js';
import { leo, duck } from '../engine/kids.js';
import { drawStreet, drawFence, drawGarden } from '../engine/world.js';
import { burrow, vegPatch } from '../engine/props.js';
import { L, K, BEAT, b, pr, begin, composite, events, buildSubs, subTo, seriesCard, toBeContinued } from '../engine/common.js';

export const DUR = 17;
const TM = { stop: b(1), pick: b(1, 2), tag: b(2), sil: b(2, 2), paint: b(3), reveal: b(3, 2), tbc: b(5) };
export const LINES = [
  { id: 'n1', t: 0.5, d: 1.9, text: 'Something was stuck on the fence.' },
  { id: 'n2', t: 4.3, d: 2.0, text: 'A piece of the jacket, with a label.' },
  { id: 'n3', t: 8.3, d: 1.2, text: 'Leo painted over it…' },
  { id: 'n4', t: 10.2, d: 1.4, text: 'It said… LEO.' },
];
export const SUBS = buildSubs(LINES);
const camT = track([[0, [2520, 980, 1.8]], [TM.stop, [2580, 990, 1.85]], [TM.tag - 0.2, [2580, 980, 1.8]], [TM.tag + 0.4, [2580, 820, 1.8]], [DUR, [2580, 815, 1.75]]]);
const SCRAP = [2652, 1104];
const TAG = { x0: 190, x1: 890, y0: 500, y1: 880 };     // the label, shown big (screen px) as an insert above Leo

function leoState(t) {
  const g = { s: 0.9, seed: 3000, y: 1092 };
  if (t < TM.stop) return { ...g, x: lerp(2380, 2560, pr(t, 0, TM.stop)), pose: Math.floor(t / (BEAT / 2)) % 2 ? 'walk1' : 'walk0', expr: 'normal' };
  if (t < TM.pick) return { ...g, x: 2560, pose: 'crouch', expr: 'surprised', look: [1, 0.4] };
  if (t < TM.reveal) return { ...g, x: 2560, pose: 'front:hold', expr: t < TM.paint ? 'normal' : 'smile', look: [0, -1] };
  return { ...g, x: 2560, pose: 'front:freeze', expr: 'surprised', look: [0, -1] };
}
const toW = ([X, Y]) => [(X - 540) / CAM.s + CAM.x, (Y - 960) / CAM.s + CAM.y];   // screen px → world

export const { EV, ev } = (() => { const E = events(); return { EV: E.EV, ev: E.ev }; })();
LINES.forEach(Ln => ev(Ln.t, 'voice', { id: Ln.id }));
ev(0, 'paper'); ev(0.2, 'write', { dur: 1.4, pan: 0 });
for (let k = 0; ; k++) { const t = 0.1 + k * BEAT / 2; if (t > TM.stop) break; ev(t, 'step', { pan: -0.2 + k * 0.04 }); }
ev(TM.stop, 'crouch'); ev(TM.pick, 'cloth'); ev(TM.tag, 'puff');
ev(TM.paint, 'brush', { dur: TM.reveal - TM.paint, dir: 1 }); ev(TM.reveal, 'sting'); ev(TM.reveal + 0.05, 'freeze');
ev(TM.tbc, 'write', { dur: 1.3, pan: 0 });
[['mystery', 0], ['theme', TM.pick], ['silence', TM.sil], ['sneak', TM.paint], ['tbc', TM.reveal]].forEach(([id, t]) => ev(t, 'cue', { id }));

export function TEXTS(t) {
  begin(camT(t)); const out = [...seriesCard(t, 0.2, 2.6, 6), ...toBeContinued(t, TM.tbc)];
  if (t > TM.tag) out.push({ id: 'name', text: 'NAME:', x0: 230, y0: 540, x1: 420, y1: 600 });
  if (t > TM.reveal) out.push({ id: 'leo', text: 'LEO', x0: 340, y0: 600, x1: 740, y1: 840 });
  return out;
}

export function frame(comp, t, opt = {}) {
  begin(camT(t));
  const all = { verge: 1, path: 1, sign: 1, hedge: 1, hedgeL: 1, fence: 1, fenceF: 1, lawn: 1, lawnL: 1, sun: 1, tree: 1, treeL: 1, parasol: 1, pool: 1, poolL: 1 };
  drawGarden(L.BG.f, L.BG.l, all); burrow(L.BG.f, L.BG.l); vegPatch(L.BG.f, L.BG.l, [0, 1, 2, 3]);
  drawStreet(L.BG.f, L.BG.l, all); drawFence(L.BG.f, L.BG.l, all, 0);
  duck(L.CH, { x: 3140 + 20 * Math.sin(t * 0.7), y: 780 + 5 * Math.sin(t * 2.1), s: 0.9, seed: 6400 });
  // the scrap of white jacket, caught on a picket (flaps in two drawings), until Leo picks it up
  if (t < TM.pick) { const f = Math.floor(t * 4) % 2 ? 6 : -6; const sc = [[SCRAP[0] - 26, SCRAP[1] - 4], [SCRAP[0] + 26 + f, SCRAP[1] - 10], [SCRAP[0] + 30 + f, SCRAP[1] + 34], [SCRAP[0] - 22, SCRAP[1] + 30]];
    fill(L.CH.f, sc, { col: K.white, p: 1, gap: 4, w: 6, seed: 2700, boil: 0 }); line(L.CH.l, [...sc, sc[0]], { w: 4, col: K.sky, p: 0.7, seed: 2701 }); }
  const S = leoState(t); leo(L.CH, S);
  if (t >= TM.pick && t < TM.reveal + 4) { const hx = 2560, hy = 1092 - 140; const sc = [[hx - 30, hy - 22], [hx + 30, hy - 26], [hx + 32, hy + 22], [hx - 28, hy + 24]];
    fill(L.FX, sc, { col: K.white, p: 1, gap: 4, w: 6, seed: 2702, boil: 0 }); line(L.FX, [...sc, sc[0]], { w: 4, col: K.sky, p: 0.7, seed: 2703 }); }
  // the insert: the label, big, above Leo's head
  let wash = false;
  if (t > TM.tag) {
    const a = eo(pr(t, TM.tag, TM.tag + 0.25)), cx = 540, cy = (TAG.y0 + TAG.y1) / 2, hw = (TAG.x1 - TAG.x0) / 2 * a, hh = (TAG.y1 - TAG.y0) / 2 * a;
    [L.BG.f.g, L.BG.l.g].forEach(g => { g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.fillRect(cx - hw - 14, cy - hh - 14, hw * 2 + 28, hh * 2 + 28); g.restore(); });   // a paper card cut out of the page
    const rect = [[cx - hw, cy - hh], [cx + hw, cy - hh + 6], [cx + hw - 4, cy + hh], [cx - hw + 6, cy + hh - 4]].map(toW);
    line(L.WAX, [...rect, rect[0]], { w: 6, col: K.sky, p: 0.8, seed: 2710 });
    for (let k = 0; k < 14; k++) { const u = k / 14; const p0 = toW([cx - hw + 20 + u * (hw * 2 - 40), cy - hh + 16]), p1 = toW([cx - hw + 34 + u * (hw * 2 - 40), cy - hh + 16]); line(L.WAX, [p0, p1], { w: 3, col: K.sky, p: 0.6, seed: 2720 + k }); }
    if (a >= 1) {
      text(L.WAX, 'NAME:', TAG.x0 + 40, TAG.y0 + 90, { size: 64, font: 'Gaegu', weight: 700, col: K.ink, align: 'left', seed: 2730, p: 0.9 });
      if (t > TM.paint) text(L.WAX, 'LEO', 540, TAG.y1 - 70, { size: 230, font: 'Gaegu', weight: 700, col: K.white, seed: 2731, p: 1, stroke: 4, boil: 0.3 });   // white wax: invisible until painted
    }
    // the brush: a wash sweeps across the label, left to right
    if (t > TM.paint) {
      const u = eo(pr(t, TM.paint, TM.reveal)), front = lerp(TAG.x0 - 30, TAG.x1 + 40, u);
      const g = L.WASH.g; g.save(); g.beginPath(); g.rect(TAG.x0 + 6, TAG.y0 + 30, TAG.x1 - TAG.x0 - 12, TAG.y1 - TAG.y0 - 36); g.clip();
      g.beginPath(); g.moveTo(TAG.x0 - 40, TAG.y0); for (let y = TAG.y0; y <= TAG.y1; y += 12) g.lineTo(front + 18 * Math.sin(y * 0.05) + 26 * Math.sin((y - TAG.y0) / (TAG.y1 - TAG.y0) * Math.PI), y); g.lineTo(TAG.x0 - 40, TAG.y1); g.closePath();
      g.fillStyle = '#000'; g.globalAlpha = 0.75; g.fill(); g.restore();
      wash = true;
    }
  }
  if (opt.cover) opt.cover(); else { subTo(SUBS, t); seriesCard(t, 0.2, 2.6, 6); toBeContinued(t, TM.tbc); }
  composite(comp, { wash });
}
