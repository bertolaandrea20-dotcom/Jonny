// Model sheets for "The Invisible Jacket": ?test=leo | ?test=lady  (static page at CAM s=1)
import { layer, clear, text, line, CAM } from './crayon.js';
import { group, clearGroup } from './rig.js';
import { leo, lady, deckchair, rabbit, tortoise, duck, leoHead, ladyHead, jacketShape } from './kids.js';
import { PAL } from './pal.js';
const C = group(), INV = group(), BG = layer(), TX = layer();
const K = PAL.crayon;
const label = (s, x, y, size = 26) => text(TX, s, x, y, { size, col: K.ink, p: 0.85 });

export function sheet2(comp, t, page) {
  clearGroup(C); clearGroup(INV); [BG, TX].forEach(clear);
  CAM.x = 960; CAM.y = 540; CAM.s = 1;
  if (page === 'leo') leoPage(); else ladyPage();
  comp.paperCam(0, 0, 1);
  comp.begin();
  comp.crayon(BG.c);
  comp.group(C);
  comp.knock(INV.k.c);
  comp.crayon(TX.c);
  comp.finish({ vig: 0.15 });
}

function leoPage() {
  text(TX, 'LEO  ·  model sheet', 40, 56, { size: 44, font: 'Gaegu', weight: 700, col: K.ink, align: 'left' });
  const side = [['stand', 'stand'], ['walk0', 'walk A'], ['walk1', 'walk B'], ['kick', 'kick'], ['crouch', 'crouch'], ['peek', 'peek'], ['run0', 'run A'], ['tuck', 'cannonball']];
  side.forEach(([p, lab], i) => { const x = 110 + i * 230; leo(C, { x, y: 400, s: 0.95, pose: p, expr: p === 'crouch' ? 'surprised' : p === 'tuck' ? 'happy' : 'normal', seed: 2000 + i * 41 }); label(lab, x, 440); });
  const fr = [['front:stand', 'front', {}], ['front:hold', 'holds jacket', { holding: true, expr: 'smile' }], ['front:sleeve', 'sleeves', { jacket: true, expr: 'smile' }], ['front:zip', 'zip', { jacket: true, zip: 0.6 }], ['front:hands', 'his hands', { expr: 'surprised' }], ['front:freeze', 'freeze', { expr: 'freeze' }], ['front:wave1', 'hello', { expr: 'hello' }]];
  fr.forEach(([p, lab, ex], i) => { const x = 110 + i * 230; leo(C, { x, y: 850, s: 0.95, pose: p, expr: 'normal', seed: 2600 + i * 37, ...ex }); label(lab, x, 890); });
  // invisible: the same drawing used only as a paper knock-out, on a coloured swatch
  line(BG, [[1690, 640], [1890, 640]], { w: 200, col: K.ochre, p: 0.9, seed: 5 });
  leo(INV, { x: 1790, y: 860, s: 0.95, pose: 'walk0', seed: 2900, jacket: true });
  label('invisible', 1790, 890);
  const ex = ['normal', 'smile', 'surprised', 'freeze', 'sneaky', 'hello', 'happy'];
  ex.forEach((e, i) => { leoHead(C, { x: 140 + i * 150, y: 1000, s: 0.62, view: i % 2 ? 'side' : 'front', expr: e, seed: 3100 + i * 13 }); label(e, 140 + i * 150, 1062, 22); });
  leo(C, { x: 1500, y: 1030, s: 0.8, pose: 'swim', expr: 'happy', seed: 3300 });
  label('swimming', 1500, 1062, 22);
}

function ladyPage() {
  text(TX, 'THE LADY NEXT DOOR  ·  model sheet', 40, 56, { size: 44, font: 'Gaegu', weight: 700, col: K.ink, align: 'left' });
  deckchair(C, { x: 230, y: 470, s: 1, seed: 4000 });
  lady(C, { x: 240, y: 470, s: 1, pose: 'sit', expr: 'sad', seed: 4100 });
  label('alone (sad)', 230, 510);
  deckchair(C, { x: 600, y: 470, s: 1, seed: 4200, flip: true });
  lady(C, { x: 590, y: 470, s: 1, pose: 'sit', expr: 'surprised', seed: 4300, flip: true, headView: 'side' });
  label('surprised', 600, 510);
  [['front:stand', 'smile'], ['front:wave1', 'smile'], ['front:point', 'hello'], ['front:laugh', 'laugh']].forEach(([p, e], i) => { const x = 900 + i * 250; lady(C, { x, y: 500, s: 0.95, pose: p, expr: e, seed: 4400 + i * 23 }); label(p.split(':')[1], x, 540); });
  ['normal', 'sad', 'surprised', 'smile', 'laugh'].forEach((e, i) => { ladyHead(C, { x: 140 + i * 170, y: 760, s: 0.8, view: i % 2 ? 'side' : 'front', expr: e, seed: 4600 + i * 11 }); label(e, 140 + i * 170, 850, 22); });
  rabbit(C, { x: 1060, y: 820, s: 1.2, pose: 'sit', seed: 4700 }); label('rabbit', 1050, 860, 22);
  rabbit(C, { x: 1260, y: 820, s: 1.2, pose: 'sniff', seed: 4710, twitch: 1 }); label('sniff', 1260, 860, 22);
  rabbit(C, { x: 1460, y: 820, s: 1.2, pose: 'hop', seed: 4720 }); label('hop', 1460, 860, 22);
  tortoise(C, { x: 1640, y: 820, s: 1.2, seed: 4800 }); label('tortoise', 1640, 860, 22);
  duck(C, { x: 1820, y: 820, s: 1.3, seed: 4900 }); label('rubber duck', 1820, 860, 22);
  jacketShape(C, pts => pts, 1000, 1000, 5000); label('the jacket (white wax, faint outline)', 1000, 1080, 22);
}
