// The page for "The Invisible Jacket": world 4200 × 1800.
// Bottom tier: the street (signpost, verge, the hedge with its hollow, the neighbour's fence and gate).
// Top tier, behind and above the fence (child-logic perspective): the garden — back hedge, lawn, tree, parasol, pool, sun.
import { line, fill, dab, ellipse, handCircle, smooth, text, sx, sy, CAM, W, H } from './crayon.js';
import { PAL } from './pal.js';
import { hash, clamp, lerp, mulberry } from '/core/lib.js';
const K = PAL.crayon;
export const pr = (t, a, b) => clamp((t - a) / (b - a));

export const STREET = 1500;                                   // Leo's feet on the street
export const HEDGE = { x0: 1300, x1: 1950, top: 1130 };
export const HOLLOW = { x0: 1556, x1: 1724, top: 1316 };       // arch-shaped hollow in the hedge
export const FENCE = { x0: 2050, x1: 4200, top: 1110, step: 62, w: 54 };
export const GATE = { x0: 3010, x1: 3134 };
export const LAWN = { y0: 540, y1: 1110 };
export const POOL = { x0: 2640, x1: 3480, y0: 640, y1: 900, r: 46 };
export const CHAIR = { x: 3740, y: 905 };
export const SUN = { x: 3990, y: 175 };

const bumpLine = (x0, x1, top, n, amp, seed) => { const pts = []; for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n); pts.push([x, top - amp * (0.4 + 0.6 * Math.abs(Math.sin(i * 1.7 + seed))) - amp * 0.4 * hash(seed + i)]); } return pts; };
export const hollowPoly = () => { const a = []; const cx = (HOLLOW.x0 + HOLLOW.x1) / 2, rx = (HOLLOW.x1 - HOLLOW.x0) / 2; for (let i = 0; i <= 20; i++) { const u = Math.PI + Math.PI * i / 20; a.push([cx + Math.cos(u) * rx, HOLLOW.top + 70 + Math.sin(u) * 70]); } return [[HOLLOW.x0, STREET + 4], ...a, [HOLLOW.x1, STREET + 4]]; };
export function poolPoly(inset = 0) {
  const { x0, x1, y0, y1, r } = POOL; const R = r - inset * 0.5, X0 = x0 + inset, X1 = x1 - inset, Y0 = y0 + inset, Y1 = y1 - inset;
  const out = []; const arc = (cx, cy, a0) => { for (let i = 0; i <= 6; i++) { const a = a0 + Math.PI / 2 * i / 6; out.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); } };
  arc(X1 - R, Y0 + R, -Math.PI / 2); arc(X1 - R, Y1 - R, 0); arc(X0 + R, Y1 - R, Math.PI / 2); arc(X0 + R, Y0 + R, Math.PI);
  return out;
}

// p: drawing progress per element (0..1). gate: 0 closed … 1 open
export function drawStreet(F, L, p) {
  const bo = 0.6;
  // verge (grass) and the pavement line
  const gtop = []; for (let x = -60; x <= 4260; x += 80) gtop.push([x, STREET + 16 + 7 * Math.sin(x * 0.013)]);
  fill(F, [...gtop, [4260, 1860], [-60, 1860]], { col: K.green, p: 0.62, gap: 13, w: 13, ang: 1.25, seed: 11, draw: p.verge, boil: 0, over: 10 });
  line(L, gtop.filter(q => q[0] < HEDGE.x0 || q[0] > HEDGE.x1), { w: 7, seed: 12, draw: p.path, col: K.green, p: 0.9, boil: bo });
  line(L, [[-40, STREET + 2], [4240, STREET + 2]], { w: 5, seed: 13, draw: p.path, col: K.brown, p: 0.55, boil: bo });
  for (let i = 0; i < 34; i++) { const x = 30 + i * 125 + hash(i) * 60, y = 1600 + hash(i + 3) * 150; line(L, [[x - 10, y + 8], [x - 4, y - 14], [x + 2, y + 6], [x + 9, y - 12], [x + 14, y + 8]], { w: 4.5, seed: 20 + i, col: K.green, p: 0.85 * p.verge, boil: bo, draw: p.verge }); }
  if (p.verge > 0.5) [[160, 1640, K.pink], [700, 1700, K.yellow], [1050, 1630, K.red], [2300, 1660, K.yellow], [2780, 1720, K.pink], [3500, 1650, K.red], [3950, 1700, K.yellow]].forEach(([x, y, c], i) => {
    line(L, [[x, y + 40], [x + 2, y + 6]], { w: 5, col: K.green, seed: 60 + i, boil: bo });
    for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28; dab(F, x + Math.cos(a) * 11, y + Math.sin(a) * 11, 8, { col: c, p: 0.85, seed: 70 + i * 5 + k, boil: 0 }); }
    dab(F, x, y, 6, { col: K.orange, p: 0.9, seed: 99 + i, boil: 0 });
  });
  // signpost: SCHOOL (back the way he came) and HOME (the way he goes)
  line(L, [[230, STREET], [234, 1196]], { w: 10, col: K.brown, p: 0.95, seed: 30, draw: p.sign, boil: bo });
  const b1 = [[80, 1222], [256, 1218], [256, 1272], [80, 1276], [46, 1248]], b2 = [[210, 1296], [390, 1292], [424, 1322], [390, 1350], [210, 1352]];
  fill(F, b1, { col: K.ochre, p: 0.85, gap: 7, w: 9, seed: 31, draw: p.sign, boil: 0 }); line(L, [...b1, b1[0]], { w: 6, seed: 32, draw: p.sign, boil: bo });
  fill(F, b2, { col: K.ochre, p: 0.85, gap: 7, w: 9, seed: 33, draw: p.sign, boil: 0 }); line(L, [...b2, b2[0]], { w: 6, seed: 34, draw: p.sign, boil: bo });
  // the hedge (drawn live as Leo approaches) with an arch-shaped hollow
  const ht = bumpLine(HEDGE.x0, HEDGE.x1, HEDGE.top + 40, 14, 34, 3);
  const hedge = [[HEDGE.x0, STREET + 6], ...ht, [HEDGE.x1, STREET + 6]];
  fill(F, hedge, { col: K.green, p: 0.86, gap: 9, w: 12, ang: 0.9, seed: 40, draw: p.hedge, boil: 0, over: 6, cross: true, crossP: 0.45 });
  line(L, [[HEDGE.x0, STREET], ...ht, [HEDGE.x1, STREET]], { w: 8, seed: 41, draw: p.hedgeL, boil: bo });
  if (p.hedge > 0.6) for (let i = 0; i < 40; i++) { const x = HEDGE.x0 + 24 + (i % 20) * 31 + hash(i) * 14, y = 1190 + (i < 20 ? 0 : 130) + hash(i + 5) * 140; if (x > HOLLOW.x0 - 10 && x < HOLLOW.x1 + 10 && y > HOLLOW.top) continue; line(L, [[x - 10, y + 7], [x, y - 7], [x + 10, y + 7]], { w: 4.5, col: K.ink, p: 0.6, seed: 42 + i, boil: bo }); }
  // the hollow: cleared back to paper (a dark place once the wash fills it)
  return hedge;
}
export function drawHollow(F, L, p) {
  const hp = hollowPoly();
  const g = F.g; g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); hp.forEach(([x, y], i) => i ? g.lineTo(sx(x), sy(y)) : g.moveTo(sx(x), sy(y))); g.closePath(); g.fill(); g.restore();
  line(L, hp.slice(1, -1), { w: 7, seed: 44, draw: p, boil: 0.6 });
  line(L, [[1640, HOLLOW.top + 6], [1612, HOLLOW.top + 36], [1580, HOLLOW.top + 44]], { w: 5, col: K.brown, p: 0.9, seed: 45, draw: p, boil: 0.6 });   // the twig the jacket hangs from
}
export function drawFence(F, L, p, gate = 0) {
  const bo = 0.55;
  let k = 0;
  for (let x = FENCE.x0; x < FENCE.x1; x += FENCE.step, k++) {
    if (x + FENCE.w > GATE.x0 - 4 && x < GATE.x1 + 4) continue;
    const pk = [[x, STREET], [x, FENCE.top + 26], [x + FENCE.w / 2, FENCE.top], [x + FENCE.w, FENCE.top + 26], [x + FENCE.w, STREET]];
    const u = clamp(p.fence * 1.4 - k / 36 * 0.4);
    fill(F, pk, { col: K.ochre, p: 0.82, gap: 8, w: 10, ang: 1.15 + (k % 3) * 0.08, seed: 100 + k, draw: clamp(p.fenceF * 1.3 - k / 40 * 0.3), boil: 0 });
    line(L, [...pk], { w: 5.5, seed: 200 + k, draw: u, boil: bo });
  }
  [1200, 1420].forEach((y, i) => line(L, [[FENCE.x0 - 6, y], [GATE.x0, y]], { w: 6, seed: 300 + i, col: K.brown, p: 0.8, draw: p.fence, boil: bo }));
  [1200, 1420].forEach((y, i) => line(L, [[GATE.x1, y], [FENCE.x1, y]], { w: 6, seed: 302 + i, col: K.brown, p: 0.8, draw: p.fence, boil: bo }));
  // the gate: a brown door hinged on its left; open = narrower (seen at an angle) + the lawn through the doorway
  const wGate = (GATE.x1 - GATE.x0) * (1 - 0.72 * gate);
  if (gate > 0.05) fill(F, [[GATE.x0, STREET], [GATE.x0, FENCE.top + 20], [GATE.x1, FENCE.top + 20], [GATE.x1, STREET]], { col: K.green, p: 0.5, gap: 12, w: 12, ang: 1.2, seed: 310, boil: 0 });
  const gp = [[GATE.x0, STREET], [GATE.x0, FENCE.top + 10], [GATE.x0 + wGate, FENCE.top + 10 - 16 * gate], [GATE.x0 + wGate, STREET + 14 * gate]];
  fill(F, gp, { col: K.brown, p: 0.8, gap: 8, w: 10, ang: 1.45, seed: 311, draw: p.fenceF, boil: 0 });
  line(L, [...gp, gp[0]], { w: 6, seed: 312, draw: p.fence, boil: bo });
  if (gate < 0.5 && p.fence > 0.9) dab(L, GATE.x0 + wGate - 18, 1320, 7, { col: K.yellow, p: 1, seed: 313, boil: bo });
}
export function drawGarden(F, L, p) {
  const bo = 0.6;
  // lawn (a big tilted green field) and the back hedge
  const lt = []; for (let x = FENCE.x0 - 40; x <= 4260; x += 90) lt.push([x, LAWN.y0 + 8 * Math.sin(x * 0.01)]);
  fill(F, [...lt, [4260, LAWN.y1 + 30], [FENCE.x0 - 40, LAWN.y1 + 30]], { col: K.green, p: 0.55, gap: 11, w: 13, ang: 0.35, seed: 400, draw: p.lawn, boil: 0, over: 8, cross: true, crossP: 0.4, crossAng: -0.8 });
  const bh = bumpLine(FENCE.x0 - 40, 4260, 360, 26, 40, 17);
  fill(F, [...bh, [4260, LAWN.y0 + 20], [FENCE.x0 - 40, LAWN.y0 + 20]], { col: K.green, p: 0.9, gap: 9, w: 12, ang: 0.95, seed: 401, draw: p.lawn, boil: 0, over: 6, cross: true, crossP: 0.5 });
  line(L, bh, { w: 7, seed: 402, draw: p.lawnL, boil: bo });
  line(L, [[FENCE.x0 - 40, LAWN.y0 + 18], [4260, LAWN.y0 + 18]], { w: 5, seed: 403, draw: p.lawnL, col: K.green, p: 0.8, boil: bo });
  // the sun
  fill(F, ellipse(SUN.x, SUN.y, 96, 96, 40), { col: K.yellow, p: 0.88, gap: 9, w: 10, seed: 410, draw: p.sun, boil: 0 });
  line(L, handCircle(SUN.x, SUN.y, 98, 411), { w: 7, seed: 412, col: K.orange, draw: p.sun, boil: bo });
  for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283 + 0.2; line(L, [[SUN.x + Math.cos(a) * 124, SUN.y + Math.sin(a) * 124], [SUN.x + Math.cos(a) * 168, SUN.y + Math.sin(a) * 168]], { w: 7, col: K.orange, p: 0.9, seed: 413 + i, draw: p.sun, boil: bo }); }
  // a pear tree on the left of the garden
  fill(F, [[2238, 990], [2250, 760], [2296, 760], [2306, 990]], { col: K.brown, p: 0.82, gap: 8, w: 10, ang: 1.5, seed: 420, draw: p.tree, boil: 0 });
  const crown = []; for (let i = 0; i <= 64; i++) { const a = i / 64 * 6.283; const b = 1 + 0.09 * Math.abs(Math.sin(a * 4.5)); crown.push([2272 + Math.cos(a) * 170 * b, 660 + Math.sin(a) * 150 * b]); }
  fill(F, crown, { col: K.green, p: 0.78, gap: 11, w: 13, ang: 0.8, seed: 421, draw: p.tree, boil: 0, cross: true, crossP: 0.4 });
  line(L, crown, { w: 7.5, seed: 422, draw: p.treeL, boil: bo });
  line(L, [[2238, 992], [2250, 790]], { w: 7, seed: 423, draw: p.treeL, boil: bo }); line(L, [[2306, 992], [2296, 790]], { w: 7, seed: 424, draw: p.treeL, boil: bo });
  if (p.tree > 0.7) [[2200, 610], [2330, 640], [2260, 720], [2370, 580], [2160, 700]].forEach(([x, y], i) => { dab(F, x, y, 15, { col: K.yellow, p: 0.9, seed: 425 + i, boil: 0, sq: 1.25 }); line(L, [[x, y - 18], [x + 4, y - 28]], { w: 3.5, col: K.brown, seed: 430 + i, boil: bo }); });
  // the parasol behind the deckchair
  line(L, [[CHAIR.x + 90, CHAIR.y + 2], [CHAIR.x + 70, 600]], { w: 7, col: K.brown, p: 0.95, seed: 440, draw: p.parasol, boil: bo });
  for (let k = 0; k < 6; k++) {
    const a0 = Math.PI + k * Math.PI / 6, a1 = a0 + Math.PI / 6, cx = CHAIR.x + 70, cy = 610, r = 230;
    const seg = [[cx, cy - 4], ...Array.from({ length: 7 }, (_, i) => { const a = lerp(a0, a1, i / 6); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.55]; })];
    fill(F, seg, { col: k % 2 ? K.yellow : K.red, p: 0.85, gap: 8, w: 10, ang: 0.3 + k * 0.3, seed: 441 + k, draw: p.parasol, boil: 0 });
  }
  const can = Array.from({ length: 25 }, (_, i) => { const a = Math.PI + Math.PI * i / 24; return [CHAIR.x + 70 + Math.cos(a) * 230, 610 + Math.sin(a) * 230 * 0.55]; });
  line(L, [...can, [CHAIR.x - 160, 612], [CHAIR.x + 300, 612]], { w: 6, seed: 450, draw: p.parasol, boil: bo });
  // the pool: paved rim, light-blue water, a ladder
  const outer = poolPoly(-26), inner = poolPoly(0);
  fill(F, outer, { col: K.ochre, p: 0.55, gap: 9, w: 11, ang: 0.2, seed: 460, draw: p.pool, boil: 0 });
  fill(F, inner, { col: K.sky, p: 0.4, gap: 13, w: 12, ang: 0.06, seed: 461, draw: p.pool, boil: 0, over: 3 });
  line(L, [...outer, outer[0]], { w: 6, seed: 462, draw: p.poolL, boil: bo });
  line(L, [...inner, inner[0]], { w: 7, seed: 463, draw: p.poolL, boil: bo });
  if (p.pool > 0.8) for (let i = 0; i < 7; i++) { const x = POOL.x0 + 110 + i * 110 + hash(i) * 40, y = POOL.y0 + 70 + (i % 3) * 60; line(L, [[x - 34, y], [x - 12, y - 7], [x + 12, y], [x + 34, y - 7]], { w: 4, col: K.ink, p: 0.35, seed: 470 + i, boil: bo }); }
  [[POOL.x1 - 120, 0], [POOL.x1 - 76, 1]].forEach(([x, i]) => line(L, [[x, POOL.y0 - 30], [x, POOL.y0 + 10], [x + 6, POOL.y0 + 70]], { w: 6, seed: 480 + i, draw: p.poolL, boil: bo }));
  [POOL.y0 + 6, POOL.y0 + 36].forEach((y, i) => line(L, [[POOL.x1 - 122, y], [POOL.x1 - 74, y]], { w: 5, seed: 482 + i, draw: p.poolL, boil: bo }));
}

// White wax: invisible on paper until the wash finds it
export function drawWax(F, L) {
  text(L, 'The End', sx(3160), sy(270), { size: 170 * CAM.s, font: 'Gaegu', weight: 700, col: K.white, p: 0.55, seed: 501, stroke: 1, boil: 0.3 });
}

// The wash (one tube of ultramarine). Shapes are drawn into a density canvas (alpha), in world coordinates.
function worldTx(g) { g.setTransform(CAM.s, 0, 0, CAM.s, W / 2 - CAM.x * CAM.s, H / 2 - CAM.y * CAM.s); }
// 1) the hollow: a brush sweeps in from the left and fills the arch
export function washHollow(LW, t, t0, t1) {
  if (t < t0) return;
  const u = clamp((t - t0) / (t1 - t0)), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  const g = LW.g; g.save(); worldTx(g);
  const hp = hollowPoly(); const clip = new Path2D(); hp.forEach(([x, y], i) => i ? clip.lineTo(x, y) : clip.moveTo(x, y)); clip.closePath();
  g.clip(clip);
  const front = lerp(HOLLOW.x0 - 40, HOLLOW.x1 + 60, e);
  g.beginPath(); g.moveTo(HOLLOW.x0 - 80, HOLLOW.top - 40);
  for (let y = HOLLOW.top - 40; y <= STREET + 40; y += 10) g.lineTo(front + 14 * Math.sin(y * 0.05 + 1) + 22 * Math.sin((y - HOLLOW.top) / 190 * Math.PI), y);
  g.lineTo(HOLLOW.x0 - 80, STREET + 40); g.closePath();
  g.fillStyle = '#000'; g.globalAlpha = 0.88; g.fill();
  // deeper at the back of the hollow, pooled at the edges
  g.globalAlpha = 0.25 * e; g.lineWidth = 18; g.strokeStyle = '#000'; g.stroke(clip);
  if (u < 1) { g.beginPath(); for (let y = HOLLOW.top - 40; y <= STREET + 40; y += 10) { const x = front + 14 * Math.sin(y * 0.05 + 1) + 22 * Math.sin((y - HOLLOW.top) / 190 * Math.PI) - 8; y === HOLLOW.top - 40 ? g.moveTo(x, y) : g.lineTo(x, y); } g.lineWidth = 26; g.globalAlpha = 0.3; g.stroke(); }
  g.restore();
}
// 2) the splash: the pool takes the colour, a plume of water rises into the sky and spreads into a crown there
export function washSplash(LW, t, t0, cx, cy) {
  if (t < t0) return;
  const g = LW.g; g.save(); worldTx(g);
  const u0 = clamp((t - t0) / 0.6), u1 = clamp((t - t0) / 0.95), u2 = clamp((t - t0 - 0.7) / 1.5);
  // the pool: colour spreads out from where he lands
  const pp = new Path2D(); poolPoly(0).forEach(([x, y], i) => i ? pp.lineTo(x, y) : pp.moveTo(x, y)); pp.closePath();
  g.save(); g.clip(pp); g.beginPath(); g.arc(cx, cy, 30 + 900 * (1 - Math.pow(1 - u0, 2)), 0, Math.PI * 2); g.fillStyle = '#000'; g.globalAlpha = 0.72; g.fill(); g.restore();
  // the plume
  const top = lerp(cy, 70, 1 - Math.pow(1 - u1, 2.2));
  const col = new Path2D(); const wob = (y, k) => 18 * Math.sin(y * 0.02 + k) + 10 * Math.sin(y * 0.055 + k * 2);
  const half = y => lerp(120, 82, clamp((cy - y) / (cy - 70)));
  col.moveTo(cx - half(cy) + wob(cy, 1), cy);
  for (let y = cy; y >= top; y -= 20) col.lineTo(cx - half(y) + wob(y, 1), y);
  for (let y = top; y <= cy; y += 20) col.lineTo(cx + half(y) + wob(y, 4), y);
  col.closePath();
  g.fillStyle = '#000'; g.globalAlpha = 0.6; g.fill(col);
  // the crown in the sky
  if (u2 > 0) {
    const e = 1 - Math.pow(1 - u2, 2.5), rx = 780 * e, ry = 200 * e, ccx = cx + 60, ccy = 225;
    const crown = new Path2D();
    for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2; const n = 1 + 0.1 * Math.sin(a * 6 + 1.3) + 0.06 * Math.sin(a * 13 + 0.4); const X = ccx + Math.cos(a) * rx * n, Y = ccy + Math.sin(a) * ry * n; i ? crown.lineTo(X, Y) : crown.moveTo(X, Y); }
    crown.closePath(); g.globalAlpha = 0.6; g.fill(crown);
    if (u2 < 1) { g.globalAlpha = 0.25 * (1 - u2); g.lineWidth = 34; g.strokeStyle = '#000'; g.stroke(crown); }
    // drips falling from the crown
    for (let k = 0; k < 9; k++) { const dxk = (k - 4) * 150 + 30 * Math.sin(k * 3.1), dl = (60 + 70 * hash(k + 9)) * e; g.beginPath(); g.ellipse(ccx + dxk * e, ccy + ry * 0.8 + dl, 14, 22, 0, 0, Math.PI * 2); g.globalAlpha = 0.55; g.fill(); }
    g.save(); g.clip(crown);
    const Rn = mulberry(31);
    for (let i = 0; i < 18; i++) { const yy = ccy - ry + Rn() * ry * 2; g.beginPath(); g.moveTo(ccx - rx, yy); g.lineTo(ccx + rx, yy + 10 * Math.sin(i)); const dark = Rn() < 0.55; g.lineWidth = 6 + Rn() * 26; g.globalCompositeOperation = dark ? 'source-over' : 'destination-out'; g.globalAlpha = dark ? 0.1 : 0.07; g.strokeStyle = '#000'; g.stroke(); }
    g.restore();
  }
  // vertical bristle streaks inside the plume
  g.save(); g.clip(col); const Rm = mulberry(57);
  for (let i = 0; i < 10; i++) { const xx = cx - 110 + Rm() * 220; g.beginPath(); g.moveTo(xx, cy); g.lineTo(xx + 20 * Math.sin(i), 60); const dark = Rm() < 0.5; g.lineWidth = 6 + Rm() * 20; g.globalCompositeOperation = dark ? 'source-over' : 'destination-out'; g.globalAlpha = dark ? 0.12 : 0.08; g.strokeStyle = '#000'; g.stroke(); }
  g.restore();
  g.restore();
}
