// Props that later episodes can reuse: the veg patch, the rabbit's burrow, drag marks in the grass, a carrot.
import { line, fill, dab, ellipse, handCircle, smooth, xf, sx, sy } from './crayon.js';
import { part, tube } from './rig.js';
import { PAL } from './pal.js';
import { hash, clamp, lerp } from '/core/lib.js';
const K = PAL.crayon;
export const BURROW = { x: 2176, y: 1004, rx: 58, ry: 30 };
export const VEG = { x0: 2372, x1: 2596, y0: 1010, y1: 1050, carrots: [2410, 2458, 2506, 2554] };
export const SPOT = [2440, 1094];                     // where Leo dropped the jacket in episode 1
export const DRAG = [[2440, 1094], [2380, 1090], [2318, 1078], [2262, 1056], [2216, 1030], [2190, 1012]];

export const burrowPoly = () => ellipse(BURROW.x, BURROW.y, BURROW.rx, BURROW.ry, 40);
export function burrow(F, L) {
  fill(F, ellipse(BURROW.x, BURROW.y - 4, BURROW.rx + 34, BURROW.ry + 20, 40, Math.PI, Math.PI * 2), { col: K.brown, p: 0.75, gap: 8, w: 10, ang: 0.3, seed: 1200, boil: 0 });
  line(L, ellipse(BURROW.x, BURROW.y - 4, BURROW.rx + 34, BURROW.ry + 20, 30, Math.PI, Math.PI * 2), { w: 6, seed: 1201, boil: 0.6 });
  // the hole itself stays paper until the wash darkens it
  const hp = burrowPoly();
  const g = F.g; g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.beginPath();
  hp.forEach(([x, y], i) => i ? g.lineTo(sx(x), sy(y)) : g.moveTo(sx(x), sy(y))); g.closePath(); g.fill(); g.restore();
  line(L, hp, { w: 6, seed: 1202, boil: 0.6 });
}
export function vegPatch(F, L, pulled = []) {
  const soil = [[VEG.x0, VEG.y0 + 6], [VEG.x0 + 20, VEG.y0 - 4], [VEG.x1 - 20, VEG.y0 - 4], [VEG.x1, VEG.y0 + 6], [VEG.x1 - 10, VEG.y1], [VEG.x0 + 10, VEG.y1]];
  fill(F, soil, { col: K.brown, p: 0.8, gap: 7, w: 9, ang: 0.15, seed: 1210, boil: 0 });
  line(L, [...soil, soil[0]], { w: 5.5, seed: 1211, boil: 0.6 });
  VEG.carrots.forEach((x, i) => {
    if (pulled.includes(i)) { line(L, handCircle(x, VEG.y0 + 10, 10, 1220 + i, 0.05, 14), { w: 4, col: K.ink, p: 0.7, seed: 1225 + i, boil: 0.6 }); return; }
    dab(F, x, VEG.y0 + 8, 9, { col: K.orange, p: 0.95, seed: 1230 + i, boil: 0 });
    [[-14, -40], [0, -48], [14, -40]].forEach(([dx, dy], k) => line(L, [[x, VEG.y0 + 2], [x + dx * 0.5, VEG.y0 + dy * 0.5], [x + dx, VEG.y0 + dy]], { w: 6, col: K.green, p: 0.95, seed: 1240 + i * 3 + k, boil: 0.6 }));
  });
}
export function dragMarks(L, prog) {
  [-9, 9].forEach((o, k) => line(L, DRAG.map(([x, y]) => [x, y + o]), { w: 4.5, col: K.brown, p: 0.7, seed: 1250 + k, draw: prog, boil: 0.6, taper: 0.1 }));
  for (let i = 0; i < 9; i++) {
    const u = (i + 0.5) / 9; if (u > prog) break;
    const a = DRAG[Math.floor(u * (DRAG.length - 1))], c = DRAG[Math.min(DRAG.length - 1, Math.floor(u * (DRAG.length - 1)) + 1)];
    const x = lerp(a[0], c[0], (u * (DRAG.length - 1)) % 1), y = lerp(a[1], c[1], (u * (DRAG.length - 1)) % 1);
    line(L, [[x - 8, y - 4], [x + 8, y + 4]], { w: 3.5, col: K.brown, p: 0.6, seed: 1260 + i, boil: 0.6 });
  }
}
// a carrot: o.x, o.y (top of the root), o.r rotation, o.bites 0..4 (shorter each bite), o.s
export function carrot(C, o) {
  const P = pts => xf(pts, { x: o.x, y: o.y, s: o.s || 1, r: o.r || 0 }), sd = o.seed || 1300;
  const len = 96 - 20 * (o.bites || 0);
  const body = [[-15, 0], [15, 0], [10, len * 0.5], [4, len], [-4, len], [-10, len * 0.5]];
  if (o.bites) for (let k = 0; k < 4; k++) body.splice(4 + k, 0, [3 - k * 2, len - 6 * (k % 2)]);
  part(C, P(body), { col: K.orange, p: 0.9, gap: 6, w: 8, ang: 1.3, seed: sd }, { w: 5.5, seed: sd + 1 });
  [[18, 24], [42, 30], [64, 34]].forEach(([y, w], i) => line(C.l, P([[-w * 0.35, y * 0.4 + 6], [w * 0.35, y * 0.4 + 10]]), { w: 3, col: K.brown, p: 0.6, seed: sd + 2 + i }));
  [[-12, -44], [0, -54], [12, -44]].forEach(([dx, dy], k) => line(C.l, P([[0, -2], [dx * 0.5, dy * 0.5], [dx, dy]]), { w: 6, col: K.green, p: 0.95, seed: sd + 6 + k }));
}

// —— episode 3+: flour, paw prints, ripples ——
// flour sprinkled on the lawn: white crayon (shows on top of the green); prog 0..1 reveals it left to right
const FLOUR = (() => { const out = []; let s = 77; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 46; i++) { const u = i / 45; out.push([lerp(2630, 3020, u) + (R() - 0.5) * 60, lerp(1050, 950, u) + (R() - 0.5) * 70, 12 + R() * 14, i]); } return out; })();
export function flour(F, prog) { FLOUR.forEach(([x, y, r, i]) => { if (i / FLOUR.length < prog) dab(F, x, y, r, { col: K.white, p: 0.95, seed: 1800 + i, boil: 0, gap: 4, w: 6 }); }); }
// the paper bag of flour
export function flourBag(C, x, y, tilt = 0, seed = 1850) {
  const P = pts => xf(pts, { x, y, r: tilt });
  part(C, P([[-26, -34], [26, -34], [30, 36], [-30, 36]]), { col: K.ochre, p: 0.85, gap: 6, w: 8, ang: 1.2, seed }, { w: 5, seed: seed + 1 });
  line(C.l, P([[-26, -24], [26, -24]]), { w: 3.5, seed: seed + 2, p: 0.7 });
  dab(C.f, ...P([[0, 6]])[0], 9, { col: K.white, p: 1, seed: seed + 3 });
}
// a rabbit paw print in the flour (the lawn shows through): two long hind prints + two small front ones
export function pawPrint(F, x, y, seed) {
  [[-10, 0, 7, 15], [10, 2, 7, 15], [-6, -26, 5, 6], [6, -24, 5, 6]].forEach(([dx, dy, rx, ry], k) => fill(F, ellipse(x + dx, y + dy, rx, ry, 14), { col: K.green, p: 1, gap: 3, w: 5, seed: seed + k, boil: 0, over: 0.5 }));
}
export const HOPS = Array.from({ length: 7 }, (_, i) => [lerp(2668, 2990, i / 6) + (i % 2 ? 8 : -8), lerp(1042, 930, i / 6)]);
export function ripples(L, x, y, u, seed = 1900) {
  [0, 1, 2].forEach(k => { const v = clamp(u * 1.4 - k * 0.2); if (v <= 0 || v >= 1) return; const r = 20 + 150 * v; line(L, ellipse(x, y, r, r * 0.32, 40), { w: 4.5, col: K.ink, p: 0.6 * (1 - v), seed: seed + k, boil: 0.5 }); });
}

// —— episode 4+: bucket, thrown water, the wet (visible) rabbit ——
export function bucket(C, x, y, tilt = 0, full = true, seed = 2200) {
  const P = pts => xf(pts, { x, y, r: tilt });
  part(C, P([[-30, -36], [30, -36], [24, 34], [-24, 34]]), { col: K.sky, p: 0.85, gap: 6, w: 8, ang: 1.2, seed }, { w: 5.5, seed: seed + 1 });
  line(C.l, P([[-30, -36], [-20, -70], [20, -70], [30, -36]]), { w: 5, seed: seed + 2, p: 0.9 });
  if (full) fill(C.f, P(ellipse(0, -36, 28, 8, 20)), { col: K.sky, p: 1, gap: 4, w: 6, seed: seed + 3, boil: 0 });
}
// water flying from (x0,y0) to (x1,y1), u 0..1: a ribbon of sky-blue crayon with drops
export function waterArc(L, x0, y0, x1, y1, u, seed = 2250) {
  if (u <= 0 || u >= 1.3) return;
  const pts = []; const n = 14, head = Math.min(1, u), tail = Math.max(0, u - 0.45);
  for (let i = 0; i <= n; i++) { const v = lerp(tail, head, i / n); pts.push([lerp(x0, x1, v), lerp(y0, y1, v) - 160 * Math.sin(v * Math.PI)]); }
  line(L, pts, { w: 16, col: K.sky, p: 0.95, seed, boil: 0.6, taper: 0.4 });
  for (let k = 0; k < 7; k++) { const v = clamp(head - k * 0.06); dab(L, lerp(x0, x1, v) + (k % 2 ? 14 : -12), lerp(y0, y1, v) - 160 * Math.sin(v * Math.PI) - 16 + k * 5, 6, { col: K.sky, p: 0.9, seed: seed + 5 + k, boil: 0.4 }); }
}
