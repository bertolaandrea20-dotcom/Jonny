// The football pitch: a second place on the page, far to the right of the garden (x 5000–7700).
// Leo's feet on the pitch at y ≈ 1520. Trees along the far side, white lines on the grass, a goal on the right.
import { line, fill, dab, ellipse, handCircle } from './crayon.js';
import { PAL } from './pal.js';
import { hash, lerp } from '/core/lib.js';
const K = PAL.crayon;
export const PITCH = { x0: 4900, x1: 7800, far: 1250, near: 1880, goalX: 7080, mid: 6000 };

export function drawPitch(F, L) {
  const bo = 0.6, { x0, x1, far, near, goalX, mid } = PITCH;
  // sun and clouds (cloud outlines in sky blue: white crayon would vanish on the paper)
  fill(F, ellipse(7350, 260, 95, 95, 40), { col: K.yellow, p: 0.9, gap: 9, w: 10, seed: 3000, boil: 0 });
  line(L, handCircle(7350, 260, 98, 3001), { w: 7, col: K.orange, seed: 3002, boil: bo });
  [[5400, 420, 1], [6300, 300, 1.2], [6900, 520, 0.8]].forEach(([x, y, k], i) => {
    const c = []; for (let j = 0; j <= 40; j++) { const a = Math.PI + Math.PI * j / 40; const b = 1 + 0.18 * Math.abs(Math.sin(j / 40 * Math.PI * 4)); c.push([x + Math.cos(a) * 170 * k * b, y + Math.sin(a) * 70 * k * b]); }
    line(L, [...c, c[0]], { w: 6, col: K.sky, p: 0.9, seed: 3010 + i, boil: bo });
  });
  // trees along the far side
  const tl = []; for (let x = x0 - 60; x <= x1 + 60; x += 70) tl.push([x, far - 150 - 60 * Math.abs(Math.sin(x * 0.011)) - 30 * hash(x)]);
  fill(F, [...tl, [x1 + 60, far + 20], [x0 - 60, far + 20]], { col: K.green, p: 0.92, gap: 9, w: 12, ang: 0.9, seed: 3020, boil: 0, cross: true, crossP: 0.55 });
  line(L, tl, { w: 7, seed: 3021, boil: bo });
  for (let i = 0; i < 14; i++) { const x = x0 + 100 + i * 200 + hash(i) * 60; line(L, [[x, far + 10], [x + 4, far - 60]], { w: 6, col: K.brown, p: 0.9, seed: 3030 + i, boil: bo }); }
  // the grass
  fill(F, [[x0 - 80, far], [x1 + 80, far], [x1 + 80, near], [x0 - 80, near]], { col: K.green, p: 0.6, gap: 11, w: 13, ang: 0.3, seed: 3040, boil: 0, cross: true, crossP: 0.4, crossAng: -0.8 });
  // white lines (white crayon shows on the green)
  const wl = (pts, sd) => line(L, pts, { w: 9, col: K.white, p: 1, seed: sd, boil: bo });
  wl([[x0 - 80, far + 20], [x1 + 80, far + 20]], 3050);
  wl([[x0 - 80, near - 80], [x1 + 80, near - 80]], 3051);
  wl([[mid - 40, far + 20], [mid + 40, near - 80]], 3052);
  wl(ellipse(mid, 1520, 270, 110, 48), 3053);
  dab(F, mid, 1520, 9, { col: K.white, p: 1, seed: 3054, boil: 0 });
  wl([[goalX - 260, far + 70], [goalX - 330, near - 120], [x1 + 80, near - 120]], 3055);   // penalty box
  // the goal: posts and crossbar (ink outline, white inside), a crayon net
  const post = (x, yb, yt, sd) => { fill(F, [[x - 8, yb], [x + 8, yb], [x + 8, yt], [x - 8, yt]], { col: K.white, p: 1, gap: 4, w: 6, seed: sd, boil: 0 }); line(L, [[x - 9, yb], [x - 9, yt], [x + 9, yt], [x + 9, yb]], { w: 4.5, seed: sd + 1, boil: bo }); };
  for (let i = 0; i <= 8; i++) line(L, [[goalX + 30 + i * 22, 1170 + i * 4], [goalX + 60 + i * 22, 1480 - i * 8]], { w: 2.5, col: K.ink, p: 0.45, seed: 3060 + i, boil: bo });
  for (let j = 0; j <= 7; j++) line(L, [[goalX + 30, 1180 + j * 40], [goalX + 230, 1190 + j * 34]], { w: 2.5, col: K.ink, p: 0.45, seed: 3070 + j, boil: bo });
  post(goalX + 10, 1500, 1160, 3080); post(goalX + 240, 1440, 1180, 3082);
  fill(F, [[goalX + 2, 1160], [goalX + 248, 1172], [goalX + 248, 1188], [goalX + 2, 1176]], { col: K.white, p: 1, gap: 4, w: 6, seed: 3084, boil: 0 });
  line(L, [[goalX + 2, 1158], [goalX + 248, 1170]], { w: 4.5, seed: 3085, boil: bo }); line(L, [[goalX + 2, 1178], [goalX + 248, 1190]], { w: 4.5, seed: 3086, boil: bo });
  // corner flag
  line(L, [[x0 + 120, near - 80], [x0 + 124, near - 260]], { w: 6, col: K.ink, seed: 3090, boil: bo });
  fill(F, [[x0 + 124, near - 260], [x0 + 200, near - 236], [x0 + 124, near - 212]], { col: K.red, p: 0.95, gap: 5, w: 7, seed: 3091, boil: 0 });
}
