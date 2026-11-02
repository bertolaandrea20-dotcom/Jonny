// Episode 10 — "Homework" (Thursday · home, 17 s). Leo's room at night. Maths homework: 2 + 2 = ?
// Leo draws a rabbit instead (it appears on the notebook, line by line)… then the drawing twitches and hops off the page.
import { track, lerp, eo } from '/core/lib.js';
import { line, text, CAM } from '../engine/crayon.js';
import { leo, rabbit } from '../engine/kids.js';
import { ROOM, drawRoom, drawDesk } from '../engine/rooms.js';
import { L, K, BEAT, b, pr, begin, composite, events, buildSubs, subTo, seriesCard, toBeContinued } from '../engine/common.js';

export const DUR = 17;
const TM = { book: b(1), draw: b(2), drawn: b(3), blink: b(3, 2), hop: b(4), desk: b(4, 2), gone: b(4, 3.5), tbc: b(5) };
export const LINES = [
  { id: 'n1', t: 0.5, d: 1.9, text: 'Thursday. Homework time.' },
  { id: 'n2', t: 3.2, d: 1.9, text: 'Leo was supposed to do maths…' },
  { id: 'n3', t: 6.0, d: 2.1, text: '…but he drew a rabbit instead.' },
  { id: 'n4', t: 11.2, d: 1.9, text: 'Then it hopped away.' },
];
export const SUBS = buildSubs(LINES);
const camT = track([[0, [9700, 1160, 1.15]], [TM.book, [9760, 1140, 1.25]], [TM.hop, [9760, 1140, 1.25]], [TM.gone, [9820, 1200, 1.3]], [DUR, [9820, 1200, 1.3]]]);
const BOOK = { x0: 150, x1: 930, y0: 370, y1: 940 };          // the notebook, shown big (screen px) as an insert
const RAB = [560, 900];                                       // where the drawing sits on the page (screen px, feet)
const toW = ([X, Y]) => [(X - 540) / CAM.s + CAM.x, (Y - 960) / CAM.s + CAM.y];

function leoState(t) {
  const g = { x: ROOM.leo[0], y: ROOM.leo[1], s: 1.08, seed: 3000 };
  if (t < TM.book) return { ...g, pose: 'front:stand', expr: 'normal', look: [0, 1] };
  if (t < TM.draw) return { ...g, pose: 'front:hands', expr: 'worried', look: [0, 1] };
  if (t < TM.blink) return { ...g, pose: 'front:hold', expr: 'sneaky', look: [0, 1] };
  if (t < TM.hop) return { ...g, pose: 'front:freeze', expr: 'surprised', look: [0, -1] };
  if (t < TM.gone) return { ...g, pose: 'front:freeze', expr: 'surprised', look: [1, 0] };
  return { ...g, pose: 'front:stand', expr: 'surprised', look: [1, 0] };
}
// the rabbit once it leaves the page: two hops onto the desk, then off to the right
function rabbitOut(t) {
  const start = toW(RAB), desk = [10040, ROOM.desk[2]], off = [10420, ROOM.desk[2]];
  if (t < TM.desk) { const u = pr(t, TM.hop, TM.desk); return { x: lerp(start[0], desk[0], u), y: lerp(start[1], desk[1], u) - 160 * Math.sin(u * Math.PI), s: lerp(1.5, 0.75, eo(u)), pose: u < 0.9 ? 'hop' : 'sit' }; }
  const u = pr(t, TM.desk + 0.2, TM.gone);
  return { x: lerp(desk[0], off[0], u), y: desk[1] - 70 * Math.sin(u * Math.PI), s: 0.75, pose: u > 0 && u < 1 ? 'hop' : 'sit' };
}

export const { EV, ev } = (() => { const E = events(); return { EV: E.EV, ev: E.ev }; })();
LINES.forEach(Ln => ev(Ln.t, 'voice', { id: Ln.id }));
ev(0, 'paper'); ev(0.2, 'write', { dur: 1.4, pan: 0 });
ev(TM.book, 'puff'); ev(TM.book + 0.6, 'write', { dur: 1.1, pan: 0 });
ev(TM.draw, 'scribble', { dur: TM.drawn - TM.draw });
ev(TM.blink, 'sting'); ev(TM.blink + 0.05, 'freeze');
ev(TM.hop + 0.05, 'hopsoft', { pan: 0.1 }); ev(TM.desk, 'stonehop', { i: 0, pan: 0.4 }); ev(TM.desk + 0.25, 'hopsoft', { pan: 0.6 }); ev(TM.gone, 'hopsoft', { pan: 0.9 });
ev(TM.tbc, 'write', { dur: 1.3, pan: 0 });
[['walk', 0], ['sneak', TM.draw], ['silence', TM.blink], ['crunch', TM.hop], ['mystery', TM.gone], ['tbc', TM.tbc]].forEach(([id, t]) => ev(t, 'cue', { id }));

export function TEXTS(t) {
  begin(camT(t)); const out = [...seriesCard(t, 0.2, 2.6, 10), ...toBeContinued(t, TM.tbc)];
  if (t > TM.book + 0.3) out.push({ id: 'hw', text: 'HOMEWORK', x0: 300, y0: 400, x1: 780, y1: 490 });
  if (t > TM.book + 0.6) out.push({ id: 'sum', text: '2 + 2 = ?', x0: 220, y0: 510, x1: 560, y1: 590 });
  return out;
}

export function frame(comp, t, opt = {}) {
  begin(camT(t));
  drawRoom(L.BG.f, L.BG.l, true);
  // the notebook insert: a paper card cut out of the page, with ruled lines
  if (t > TM.book) {
    const a = eo(pr(t, TM.book, TM.book + 0.25)), cx = (BOOK.x0 + BOOK.x1) / 2, cy = (BOOK.y0 + BOOK.y1) / 2, hw = (BOOK.x1 - BOOK.x0) / 2 * a, hh = (BOOK.y1 - BOOK.y0) / 2 * a;
    [L.BG.f.g, L.BG.l.g].forEach(g => { g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.fillRect(cx - hw - 14, cy - hh - 14, hw * 2 + 28, hh * 2 + 28); g.restore(); });
    const rect = [[cx - hw, cy - hh], [cx + hw, cy - hh + 6], [cx + hw - 4, cy + hh], [cx - hw + 6, cy + hh - 4]].map(toW);
    line(L.WAX, [...rect, rect[0]], { w: 6, col: K.ink, p: 0.8, seed: 2710 });
    if (a >= 1) {
      for (let k = 0; k < 7; k++) { const y = BOOK.y0 + 150 + k * 66; line(L.WAX, [toW([BOOK.x0 + 20, y]), toW([BOOK.x1 - 20, y + 3])], { w: 3, col: K.sky, p: 0.55, seed: 2720 + k }); }
      line(L.WAX, [toW([BOOK.x0 + 90, BOOK.y0 + 10]), toW([BOOK.x0 + 94, BOOK.y1 - 10])], { w: 3, col: K.red, p: 0.6, seed: 2729 });
      text(L.WAX, 'HOMEWORK', 540, BOOK.y0 + 90, { size: 84, font: 'Gaegu', weight: 700, col: K.ink, seed: 2730, p: 0.95, stroke: 2 });
      if (t > TM.book + 0.6) text(L.WAX, '2 + 2 = ?', 390, BOOK.y0 + 190, { size: 72, font: 'Gaegu', weight: 700, col: K.blue || K.ink, seed: 2731, p: 0.9, reveal: pr(t, TM.book + 0.6, TM.book + 1.6) });
    }
  }
  // the drawing: appears top to bottom while Leo scribbles, twitches, then hops off the page
  if (t > TM.draw && t < TM.hop) {
    const [wx, wy] = toW(RAB), s = 1.5;
    rabbit(L.CH, { x: wx, y: wy, s, pose: t > TM.blink && Math.floor(t * 8) % 3 === 0 ? 'sniff' : 'sit', twitch: true, seed: 6200 });
    if (t < TM.drawn) {
      const top = RAB[1] - 210 * s * CAM.s / 1.25, ry = lerp(top, RAB[1] + 20, eo(pr(t, TM.draw, TM.drawn)));
      [L.CH.k, L.CH.f, L.CH.l].forEach(Ly => { const g = Ly.g; g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.fillRect(BOOK.x0, ry, BOOK.x1 - BOOK.x0, BOOK.y1 + 60 - ry); g.restore(); });
      // the crayon tip, wiggling along the drawing edge
      const px = RAB[0] - 90 + 180 * (0.5 + 0.5 * Math.sin(t * 19));
      line(L.FX, [toW([px, ry]), toW([px + 40, ry - 90])], { w: 12, col: K.orange, p: 1, seed: 2740 });
    }
  }
  if (t >= TM.hop && t < TM.gone + 0.1) rabbit(L.CH, { ...rabbitOut(t), seed: 6200 });
  leo(L.CH, leoState(t));
  drawDesk(L.CH, true);
  if (opt.cover) opt.cover(); else { subTo(SUBS, t); seriesCard(t, 0.2, 2.6, 10); toBeContinued(t, TM.tbc); }
  composite(comp);
}
