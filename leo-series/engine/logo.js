// Profile picture: Leo, half coloured and half invisible (a paper hole), on a crayon disk. ?logo=a|b (rendered 1080×1920, cropped to the centre square)
import { line, fill, handCircle, ellipse, CAM, sx, sy } from './crayon.js';
import { leo } from './kids.js';
import { L, K, begin, composite } from './common.js';

export function logo(comp, t, v) {
  begin([0, 0, 1]);
  const disk = v === 'b' ? K.sky : K.yellow;
  fill(L.BG.f, ellipse(0, -10, 480, 480, 64), { col: disk, p: 0.9, gap: 10, w: 13, ang: 0.6, seed: 11, boil: 0, cross: true, crossP: 0.5 });
  line(L.BG.l, handCircle(0, -10, 484, 12), { w: 12, col: K.orange, p: 0.95, seed: 13 });
  // Leo, front, big: head and shoulders fill the circle
  const o = { x: 0, y: 700, s: 3.3, pose: 'front:stand', expr: 'sneaky', seed: 3000, pack: true };
  leo(L.CH, o);
  leo(L.INV, o);                       // the whole silhouette as paper…
  const g1 = L.CH.f.g, g2 = L.CH.l.g;  // …and the colour only on the left half: the right half is invisible
  [g1, g2].forEach(g => { g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.beginPath();
    const x0 = sx(0); g.moveTo(x0, 0); for (let y = 0; y <= 1920; y += 24) g.lineTo(x0 + ((y / 24) % 2 ? 7 : -7), y); g.lineTo(1080, 1920); g.lineTo(1080, 0); g.closePath(); g.fill(); g.restore(); });
  composite(comp, { vig: 0.12 });
}
