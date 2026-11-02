// Indoor places on the page (floor at y 1500):
//   Leo's room  — x 9000–10400: striped wallpaper, a night window, a football poster, his bed, his desk and lamp
//   the classroom — x 11000–12600: a chalkboard that writes itself, a wall clock, the door, two pupils' desks
import { line, fill, dab, ellipse, handCircle, text, sx, sy, CAM } from './crayon.js';
import { part } from './rig.js';
import { ball } from './props.js';
import { PAL } from './pal.js';
import { hash, lerp, clamp } from '/core/lib.js';
const K = PAL.crayon;
const bo = 0.6;
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

export const ROOM = { x0: 9000, x1: 10400, desk: [9480, 10120, 1415], lamp: [10020, 1415], leo: [9760, 1500] };
export function drawRoom(F, L, night = true) {
  const { x0, x1 } = ROOM;
  fill(F, rect(x0, 300, x1, 1500), { col: K.ochre, p: 0.35, gap: 13, w: 13, ang: 1.4, seed: 5000, boil: 0 });
  for (let x = x0 + 40; x < x1; x += 90) line(L, [[x, 320], [x + 4, 1490]], { w: 6, col: K.sky, p: 0.5, seed: 5001 + x, boil: bo, wob: 1.5 });
  fill(F, rect(x0, 1500, x1, 1860), { col: K.brown, p: 0.6, gap: 10, w: 12, ang: 0.08, seed: 5010, boil: 0 });
  for (let y = 1560; y < 1860; y += 70) line(L, [[x0, y], [x1, y + 6]], { w: 4, col: K.ink, p: 0.45, seed: 5011 + y, boil: bo });
  line(L, [[x0, 1500], [x1, 1500]], { w: 7, seed: 5020, boil: bo });
  // the window: night sky with stars and a moon
  const w = rect(9150, 520, 9450, 860);
  fill(F, w, { col: night ? K.violet : K.sky, p: 0.85, gap: 8, w: 10, ang: 0.4, seed: 5030, boil: 0, cross: true, crossP: 0.5 });
  if (night) { dab(F, 9380, 600, 34, { col: K.yellow, p: 1, seed: 5031, boil: 0 }); [[9200, 580], [9260, 700], [9330, 780], [9410, 720], [9230, 820]].forEach(([x, y], i) => dab(F, x, y, 6, { col: K.yellow, p: 1, seed: 5032 + i, boil: 0 })); }
  line(L, [...w, w[0]], { w: 9, col: K.brown, p: 0.95, seed: 5040, boil: bo }); line(L, [[9300, 520], [9300, 860]], { w: 7, col: K.brown, seed: 5041, boil: bo }); line(L, [[9150, 690], [9450, 690]], { w: 7, col: K.brown, seed: 5042, boil: bo });
  // a football poster
  const pst = rect(9880, 520, 10180, 860);
  fill(F, pst, { col: K.green, p: 0.7, gap: 9, w: 11, ang: 0.3, seed: 5050, boil: 0 });
  line(L, [...pst, pst[0]], { w: 6, seed: 5051, boil: bo });
  ball({ k: { g: { save() {}, restore() {}, fillStyle: '', beginPath() {}, lineTo() {}, moveTo() {}, closePath() {}, fill() {} } }, f: F, l: L }, 10030, 690, 70, 0.3, 5052);
  // the bed
  fill(F, rect(9020, 1300, 9420, 1500), { col: K.sky, p: 0.8, gap: 9, w: 11, ang: 0.5, seed: 5060, boil: 0 });
  fill(F, rect(9030, 1260, 9150, 1320), { col: K.white, p: 1, gap: 6, w: 8, seed: 5061, boil: 0 });
  line(L, [[9020, 1500], [9020, 1220], [9020, 1300], [9420, 1300], [9420, 1500]], { w: 7, col: K.brown, seed: 5062, boil: bo });
}
// the desk and lamp are drawn in front of Leo (he stands behind the desk)
export function drawDesk(C, lampOn = true) {
  const [d0, d1, dy] = ROOM.desk;
  part(C, rect(d0, dy, d1, dy + 30), { col: K.brown, p: 0.85, gap: 8, w: 10, ang: 0.1, seed: 5100 }, { w: 7, seed: 5101 });
  [[d0 + 20, dy + 30], [d1 - 40, dy + 30]].forEach(([x, y], i) => part(C, rect(x, y, x + 20, 1500), { col: K.brown, p: 0.85, gap: 6, w: 8, seed: 5102 + i }, { w: 6, seed: 5104 + i }));
  part(C, rect(d0 + 60, dy + 30, d1 - 80, dy + 72), { col: K.brown, p: 0.6, gap: 10, w: 11, ang: 0.1, seed: 5106 }, { w: 6, seed: 5107 });
  const [lx, ly] = ROOM.lamp;
  part(C, [[lx - 40, ly], [lx + 40, ly], [lx + 30, ly - 16], [lx - 30, ly - 16]], { col: K.ink, p: 0.8, gap: 5, w: 7, seed: 5110 }, { w: 5, seed: 5111 });
  line(C.l, [[lx, ly - 16], [lx - 20, ly - 130], [lx - 80, ly - 170]], { w: 8, col: K.ink, p: 0.95, seed: 5112 });
  part(C, [[lx - 140, ly - 150], [lx - 40, ly - 210], [lx - 20, ly - 160], [lx - 100, ly - 110]], { col: K.red, p: 0.9, gap: 6, w: 8, seed: 5113 }, { w: 5, seed: 5114 });
  if (lampOn) fill(C.f, [[lx - 120, ly - 128], [lx - 40, ly - 170], [lx - 330, ly - 4], [lx - 120, ly - 4]], { col: K.yellow, p: 0.3, gap: 12, w: 14, ang: 1.1, seed: 5115, boil: 0 });
}

export const CLASS = { x0: 11000, x1: 12600, board: [11520, 12300, 580, 980], clock: [11910, 430], door: [11240, 11420], edo: [11760, 1500], leo: [12120, 1500] };
export function drawClass(F, L, p = {}) {
  const { x0, x1 } = CLASS;
  fill(F, rect(x0, 60, x1, 1500), { col: K.yellow, p: 0.28, gap: 13, w: 13, ang: 1.4, seed: 5200, boil: 0 });
  fill(F, rect(x0, 1500, x1, 2150), { col: K.ochre, p: 0.6, gap: 10, w: 12, ang: 0.08, seed: 5201, boil: 0 });
  line(L, [[x0, 1500], [x1, 1500]], { w: 7, seed: 5202, boil: bo });
  // the chalkboard (dark green, white chalk shows on it)
  const [b0, b1, by0, by1] = CLASS.board;
  fill(F, rect(b0, by0, b1, by1), { col: K.green, p: 1, gap: 6, w: 10, ang: 0.3, seed: 5210, boil: 0, cross: true, crossP: 0.8 });
  fill(F, rect(b0, by0, b1, by1), { col: K.ink, p: 0.45, gap: 9, w: 10, ang: 1.0, seed: 5211, boil: 0 });
  line(L, [...rect(b0, by0, b1, by1), [b0, by0]], { w: 14, col: K.brown, p: 0.95, seed: 5212, boil: bo });
  line(L, [[b0 + 40, by1 + 24], [b1 - 40, by1 + 24]], { w: 10, col: K.brown, p: 0.9, seed: 5213, boil: bo });
  // the clock
  const [cx, cy] = CLASS.clock;
  fill(F, ellipse(cx, cy, 80, 80, 36), { col: K.white, p: 1, gap: 5, w: 8, seed: 5220, boil: 0 });
  line(L, handCircle(cx, cy, 82, 5221), { w: 8, col: K.red, p: 0.95, seed: 5222, boil: bo });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; line(L, [[cx + Math.cos(a) * 64, cy + Math.sin(a) * 64], [cx + Math.cos(a) * 74, cy + Math.sin(a) * 74]], { w: 4, seed: 5223 + i, boil: bo }); }
  const hm = (p.min ?? 59) / 60 * Math.PI * 2 - Math.PI / 2, hh = ((p.hour ?? 7) + (p.min ?? 59) / 60) / 12 * Math.PI * 2 - Math.PI / 2;
  line(L, [[cx, cy], [cx + Math.cos(hh) * 38, cy + Math.sin(hh) * 38]], { w: 8, seed: 5240, boil: 0.3 });
  line(L, [[cx, cy], [cx + Math.cos(hm) * 60, cy + Math.sin(hm) * 60]], { w: 6, seed: 5241, boil: 0.3 });
  // the door (opens: narrower)
  const [d0, d1] = CLASS.door, wd = (d1 - d0) * (1 - 0.7 * (p.door || 0));
  fill(F, rect(d0, 940, d1, 1500), { col: K.ink, p: 0.25, gap: 12, w: 12, seed: 5250, boil: 0 });
  const dp = [[d0, 1500], [d0, 940], [d0 + wd, 940 - 20 * (p.door || 0)], [d0 + wd, 1500 + 16 * (p.door || 0)]];
  fill(F, dp, { col: K.brown, p: 0.85, gap: 8, w: 10, ang: 1.45, seed: 5251, boil: 0 });
  line(L, [...dp, dp[0]], { w: 7, seed: 5252, boil: bo });
}
// a pupil's desk, drawn in front of the child sitting at it
export function pupilDesk(C, x, seed = 5300) {
  part(C, rect(x - 150, 1395, x + 150, 1422), { col: K.ochre, p: 0.9, gap: 7, w: 9, ang: 0.1, seed }, { w: 6, seed: seed + 1 });
  part(C, rect(x - 130, 1422, x + 130, 1470), { col: K.brown, p: 0.6, gap: 9, w: 10, ang: 0.1, seed: seed + 2 }, { w: 5, seed: seed + 3 });
  [[x - 140, 1422], [x + 120, 1422]].forEach(([lx, ly], i) => part(C, rect(lx, ly, lx + 18, 1500), { col: K.ink, p: 0.6, gap: 5, w: 7, seed: seed + 4 + i }, { w: 5, seed: seed + 6 + i }));
}
// chalk lettering on the board (world coords, written letter by letter)
export function chalk(L, str, x, y, size, reveal, seed = 5400) {
  text(L, str, sx(x), sy(y), { size: size * CAM.s, font: 'Gaegu', weight: 700, col: K.white, reveal, seed, p: 0.95, stroke: 2 });
}
