// Reel covers, 1080×1920: ?cover=1|2|3 …  Big Leo, a huge hand-lettered title, an episode badge and a question.
// Everything that matters sits in the centre 3:4 (y 240–1680), the part Instagram shows in the profile grid.
import { line, fill, text, handCircle, ellipse, CAM } from './crayon.js';
import { leo, rabbit, duck, jacketShape } from './kids.js';
import { drawStreet, drawFence, drawGarden, drawHollow, washHollow } from './world.js';
import { burrow, vegPatch, flour, pawPrint, carrot, burrowPoly, HOPS, VEG } from './props.js';
import { L, K, begin, composite, patch } from './common.js';
import { sx, sy } from './crayon.js';

const ALL = { verge: 1, path: 1, sign: 1, hedge: 1, hedgeL: 1, fence: 1, fenceF: 1, lawn: 1, lawnL: 1, sun: 1, tree: 1, treeL: 1, parasol: 1, pool: 1, poolL: 1 };
const C = {
  1: { cam: [1520, 1240, 2.25], title: ['THE INVISIBLE', 'JACKET'], hook: 'What was hiding in the hedge?' },
  2: { cam: [2370, 845, 2.3], title: ['GONE!'], hook: 'Who took the jacket?' },
  3: { cam: [2700, 860, 2.15], title: ['FOOTPRINTS'], hook: 'Who is walking in the flour?' },
};

function scene(n) {
  if (n === 1) {
    drawStreet(L.BG.f, L.BG.l, ALL); drawHollow(L.BG.f, L.BG.l, 1); drawFence(L.BG.f, L.BG.l, ALL, 0);
    washHollow(L.WASH, 10, 0, 1);
    leo(L.CH, { x: 1470, y: 1500, s: 1.0, pose: 'front:hold', holding: true, expr: 'surprised', seed: 3000 });
    return true;
  }
  drawGarden(L.BG.f, L.BG.l, ALL); burrow(L.BG.f, L.BG.l);
  if (n === 2) {
    vegPatch(L.BG.f, L.BG.l, [2]); drawStreet(L.BG.f, L.BG.l, ALL); drawFence(L.BG.f, L.BG.l, ALL, 0);
    const g = L.WASH.g; g.save(); g.fillStyle = '#000'; g.globalAlpha = 0.9; g.beginPath(); burrowPoly().forEach(([x, y], i) => i ? g.lineTo(sx(x), sy(y)) : g.moveTo(sx(x), sy(y))); g.closePath(); g.fill(); g.restore();
    leo(L.CH, { x: 2290, y: 1044, s: 0.95, pose: 'front:freeze', expr: 'surprised', look: [1, 0], seed: 3000 });
    rabbit(L.INV, { x: 2470, y: 1052, s: 1.0, pose: 'sit', seed: 6200 });
    carrot(L.CH, { x: 2520, y: 972, r: -1.3, bites: 1, s: 1.0, seed: 1300 });
    [[2480, 930], [2560, 910], [2600, 960]].forEach(([x, y], i) => line(L.FX, [[x, y], [x + 12, y - 22]], { w: 5, col: K.ink, p: 0.8, seed: 40 + i }));
    return true;
  }
  if (n === 3) {
    vegPatch(L.BG.f, L.BG.l, [2]); flour(L.BG.f, 1); HOPS.forEach(([x, y], i) => pawPrint(L.BG.f, x, y, 1950 + i * 5));
    drawStreet(L.BG.f, L.BG.l, ALL); drawFence(L.BG.f, L.BG.l, ALL, 0);
    leo(L.CH, { x: 2560, y: 1068, s: 0.95, pose: 'front:freeze', expr: 'surprised', look: [1, -0.6], seed: 3000 });
    return false;
  }
}

export function cover(comp, n) {
  const c = C[n] || C[2];
  begin(c.cam);
  const wash = scene(n);
  // episode badge: a yellow crayon disk
  const bx = 190, by = 330;
  const toW = ([X, Y]) => [(X - 540) / CAM.s + CAM.x, (Y - 960) / CAM.s + CAM.y];
  patch(L.TOPK, bx, by, 118, 118);
  fill(L.TOP, ellipse(bx, by, 110, 110, 40).map(toW), { col: K.yellow, p: 0.95, gap: 8, w: 11, seed: 3, boil: 0, cross: true, crossP: 0.5 });
  line(L.TOP, handCircle(bx, by, 112, 4).map(toW), { w: 8, col: K.orange, p: 0.95, seed: 5 });
  text(L.TOP, 'EP.', bx, by - 12, { size: 52, font: 'Gaegu', weight: 700, col: K.ink });
  text(L.TOP, String(n), bx, by + 66, { size: 96, font: 'Gaegu', weight: 700, col: K.red, stroke: 2 });
  // the title: huge, on a torn paper label
  const big = c.title.length > 1 || c.title[0].length > 7 ? 128 : 190;
  const ty0 = c.title.length > 1 ? 520 : 560;
  patch(L.TOPK, 600, ty0 - big * 0.35 + (c.title.length - 1) * big * 0.5, 470, 60 + big * 0.55 * c.title.length);
  c.title.forEach((s, i) => text(L.TOP, s, 600, ty0 + i * big * 1.0, { size: big, font: 'Gaegu', weight: 700, col: i === c.title.length - 1 ? K.red : K.ink, stroke: 3, seed: 20 + i }));
  // the question
  patch(L.TOPK, 540, 1560, 470, 74);
  text(L.TOP, c.hook, 540, 1582, { size: 66, font: 'Patrick Hand', col: K.ink, stroke: 1.5, seed: 30 });
  composite(comp, { wash, vig: 0.2 });
}

// —— episodes 4+: the cover is a chosen frame of the episode itself, with the badge, title and question on top ——
export const EPC = {
  4: { t: 7.6, title: ['SPLASH!'], hook: 'What did the water find?' },
  5: { t: 12.6, title: ['CRUNCH!'], hook: "Who's behind Leo?" },
  6: { t: 11.2, title: ['LEO?!'], hook: 'Whose name is on the jacket?' },
  7: { t: 7.25, title: ['KICK!'], hook: 'Where did the ball go?' },
  8: { t: 4.0, title: ['NEW KID'], hook: 'Who is the new kid?' },
};
export function overlay(n) {
  const c = EPC[n];
  const bx = 190, by = 330;
  const toW = ([X, Y]) => [(X - 540) / CAM.s + CAM.x, (Y - 960) / CAM.s + CAM.y];
  patch(L.TOPK, bx, by, 118, 118);
  fill(L.TOP, ellipse(bx, by, 110, 110, 40).map(toW), { col: K.yellow, p: 0.95, gap: 8, w: 11, seed: 3, boil: 0, cross: true, crossP: 0.5 });
  line(L.TOP, handCircle(bx, by, 112, 4).map(toW), { w: 8, col: K.orange, p: 0.95, seed: 5 });
  text(L.TOP, 'EP.', bx, by - 12, { size: 52, font: 'Gaegu', weight: 700, col: K.ink });
  text(L.TOP, String(n), bx, by + 66, { size: 96, font: 'Gaegu', weight: 700, col: K.red, stroke: 2 });
  const big = c.title[0].length > 7 ? 128 : 190, ty0 = 560;
  patch(L.TOPK, 600, ty0 - big * 0.35, 470, 60 + big * 0.55);
  text(L.TOP, c.title[0], 600, ty0, { size: big, font: 'Gaegu', weight: 700, col: K.red, stroke: 3, seed: 20 });
  patch(L.TOPK, 540, 1560, 470, 74);
  text(L.TOP, c.hook, 540, 1582, { size: 66, font: 'Patrick Hand', col: K.ink, stroke: 1.5, seed: 30 });
}
