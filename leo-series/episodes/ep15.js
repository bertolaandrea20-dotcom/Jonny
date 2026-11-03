// Episode 15 — "Blorp." (the nonsense special, 30 s). A normal afternoon on the street… the sky goes dark, a giant foot stomps down,
// and the camera flies up and up: an alien 100 times bigger than Leo. "BLORP." Leo and Edo pull out laser guns. Pew! Pew!
// The alien shrinks and shrinks… into a tiny alien the size of a carrot. "blorp." It hops into the hedge — next to two white ears.
import { lerp, eo, clamp } from '/core/lib.js';
import { line, fill, text, ellipse, handCircle, sx, sy, CAM, W, H } from '../engine/crayon.js';
import { part } from '../engine/rig.js';
import { leo, edo } from '../engine/kids.js';
import { drawStreet, drawHollow, drawFence } from '../engine/world.js';
import { ball } from '../engine/props.js';
import { L, K, b, pr, begin, composite, events, buildSubs, subTo, toBeContinued, patch } from '../engine/common.js';

export const DUR = 30;
const TM = { dark: b(1), stomp: b(1, 2), up: b(2, 2), top: b(4), blorp: b(4, 1), down: b(5), guns: b(5, 2), aim: b(6, 2), fire: b(7), hit: b(7, 3), small: b(8, 3), solved: b(9), hop: b(9, 3), tbc: b(10) };
export const LINES = [
  { id: 'n1', t: 0.5, d: 1.6, text: 'Just a normal afternoon.' },
  { id: 'n2', t: 2.68, d: 1.5, text: 'Then the sky went dark.' },
  { id: 'n3', t: 7.4, d: 2.6, text: 'An alien. A really, REALLY big one.' },
  { id: 'n4', t: 15.2, d: 2.3, text: 'Luckily, Leo and Edo had laser guns.' },
  { id: 'n5', t: 19.3, d: 0.9, text: 'Pew! Pew!' },
  { id: 'n6', t: 24.9, d: 1.2, text: 'Problem solved.' },
];
export const SUBS = buildSubs(LINES);
const LEO = [1660, 1500], EDO = [1930, 1500], AX = 7700, TINY = 2140, HEDGEX = 1450;

// —— camera: eased moves with the zoom interpolated on a log scale (so flying up feels even), plus a shake ——
const CK = [[0, [1790, 1250, 1.55]], [TM.dark, [1790, 1250, 1.55]], [TM.stomp - 0.3, [2600, 1150, 0.55]], [TM.up, [2600, 1150, 0.55]], [TM.top, [5600, -14800, 0.056]],
  [TM.blorp, [6900, -24800, 0.13]], [TM.down - 0.2, [6900, -24900, 0.135]], [TM.down + 0.45, [1800, 1250, 1.5]], [TM.fire, [1800, 1250, 1.5]], [TM.fire + 0.25, [1860, 1180, 1.25]],
  [TM.hit, [5400, -13800, 0.06]], [TM.hit + 0.6, [5400, -13800, 0.06]], [TM.small, [2050, 1300, 1.35]], [TM.hop, [1880, 1280, 1.45]], [DUR, [1700, 1270, 1.5]]];
function cam(t) {
  if (t > TM.hit + 0.6 && t < TM.small) {   // follow the alien while it shrinks
    const A = alienState(t), u = eo(pr(t, TM.small - 0.6, TM.small));
    const f = [A.ax, 1500 - 185 * 100 * A.k, clamp(1100 / (370 * 100 * A.k), 0.06, 1.35)];
    return [lerp(f[0], 2050, u), lerp(f[1], 1300, u), Math.exp(lerp(Math.log(f[2]), Math.log(1.35), u))];
  }
  let i = 0; while (i < CK.length - 2 && t > CK[i + 1][0]) i++;
  const [t0, a] = CK[i], [t1, c] = CK[i + 1], u = eo(clamp((t - t0) / (t1 - t0 || 1)));
  const s = Math.exp(lerp(Math.log(a[2]), Math.log(c[2]), u));
  let x = lerp(a[0], c[0], u), y = lerp(a[1], c[1], u);
  const sh = (t > TM.stomp && t < TM.stomp + 1.2) ? 34 * (1 - pr(t, TM.stomp, TM.stomp + 1.2)) : (t > TM.hit - 0.1 && t < TM.hit + 0.5) ? 14 : 0;
  if (sh) { x += sh / s * Math.sin(t * 71); y += sh / s * Math.cos(t * 53); }
  return [x, y, s];
}

// —— the alien, drawn in its own units (feet at 0, ~370 tall) and scaled S = 100·k into the world ——
function onScreen(poly) { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [x, y] of poly) { const X = sx(x), Y = sy(y); x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y); } return x1 > -50 && x0 < W + 50 && y1 > -50 && y0 < H + 50; }
function alien(C, k, ax, dy, t, o = {}) {
  const S = 100 * k, P = pts => pts.map(([x, y]) => [ax + x * S, 1500 + dy + y * S]);
  const pt = (poly, f, l) => { const q = P(poly); if (onScreen(q)) part(C, q, f, l); };
  const ln = (pts, l) => { const q = P(pts); if (onScreen(q)) line(C.l, q, l); };
  const vi = { col: K.violet, p: 0.9, gap: 8, w: 11, ang: 0.7, boil: 0.4 };
  const wave = Math.sin(t * 5) * 18;
  // legs and feet
  [[-34, -1], [34, 1]].forEach(([fx, sd], i) => {
    pt([[fx - 9, -4], [fx * 0.6 - 7, -125], [fx * 0.6 + 7, -125], [fx + 9, -4]], { ...vi, seed: 7000 + i }, { w: 9, seed: 7010 + i });
    pt(ellipse(fx + 4 * sd, -6, 18, 8, 24), { ...vi, col: K.green, seed: 7020 + i }, { w: 9, seed: 7030 + i });
  });
  // arms (waving)
  ln([[-52, -190], [-95, -228 - wave], [-118, -262 - wave]], { w: 16, col: K.violet, p: 0.95, seed: 7040 });
  ln([[52, -190], [95, -228 + wave], [118, -262 + wave]], { w: 16, col: K.violet, p: 0.95, seed: 7041 });
  [[-118, -262 - wave], [118, -262 + wave]].forEach(([x, y], i) => pt(handCircle(x, y, 12, 7042 + i, 0, 16), { ...vi, col: K.green, seed: 7044 + i }, { w: 7, seed: 7046 + i }));
  // body with pink spots
  pt(ellipse(0, -175, 62, 72, 40), { ...vi, seed: 7050, cross: true, crossP: 0.4 }, { w: 11, seed: 7051 });
  [[-25, -200, 11], [22, -150, 14], [30, -215, 8], [-20, -140, 9]].forEach(([x, y, r], i) => pt(handCircle(x, y, r, 7052 + i, 0, 16), { col: K.pink, p: 0.9, gap: 6, w: 8, seed: 7056 + i, boil: 0.4 }, { w: 5, col: K.pink, seed: 7060 + i }));
  // head, antennae, the one big eye, the mouth
  pt(handCircle(0, -282, 48, 7070, 0, 36), { ...vi, seed: 7071 }, { w: 11, seed: 7072 });
  [[-18, -36], [18, 36]].forEach(([x0, x1], i) => { ln([[x0, -322], [x1 * 1.1, -372 + 6 * Math.sin(t * 4 + i)]], { w: 9, col: K.ink, p: 0.95, seed: 7073 + i }); pt(handCircle(x1 * 1.1, -378 + 6 * Math.sin(t * 4 + i), 9, 7075 + i, 0, 16), { col: K.yellow, p: 1, gap: 5, w: 8, seed: 7077 + i, boil: 0.4 }, { w: 6, seed: 7079 + i }); });
  const blink = o.blink ? 0.12 : 1, [lx, ly] = o.look || [0, 0.4];
  pt(ellipse(0, -290, 30, 30 * blink, 30), { col: K.white, p: 1, gap: 5, w: 8, seed: 7081, boil: 0.3 }, { w: 9, seed: 7082 });
  if (!o.blink) pt(handCircle(lx * 12, -290 + ly * 12, 12, 7083, 0, 20), { col: K.ink, p: 1, gap: 4, w: 7, seed: 7084, boil: 0.3 }, { w: 5, seed: 7085 });
  if (o.mouth) pt(ellipse(0, -247, 14, 11 * o.mouth, 24), { col: K.red, p: 0.9, gap: 5, w: 7, seed: 7086 }, { w: 7, seed: 7087 });
  else ln(ellipse(0, -252, 14, 7, 16, 0.3, Math.PI - 0.3), { w: 7, seed: 7088 });
  return { eye: [ax, 1500 + dy - 290 * S] };
}
function alienState(t) {
  if (t < TM.stomp - 0.45) return null;
  const land = eo(pr(t, TM.stomp - 0.45, TM.stomp)), dy = -5000 * (1 - land) * (1 - land);
  if (t < TM.hit + 0.3) return { k: 1, ax: AX, dy, blink: t > TM.top + 0.5 && t < TM.top + 0.65, mouth: t > TM.blorp && t < TM.blorp + 1.4 ? 0.6 + 0.4 * Math.sin(t * 20) : 0, look: t > TM.aim ? [-1, 0.8] : [-0.6, 0.6] };
  if (t < TM.small) { const u = pr(t, TM.hit + 0.3, TM.small); return { k: Math.pow(0.004, eo(u)), ax: lerp(AX, TINY, eo(u)), dy: 0, mouth: 1, look: [0, -1], spin: u }; }
  if (t < TM.hop) return { k: 0.004, ax: TINY, dy: 0, look: [-1, 0], mouth: t > TM.solved + 0.9 && t < TM.solved + 1.4 ? 0.8 : 0 };
  const u = pr(t, TM.hop, TM.hop + 0.9); if (u >= 1) return null;
  return { k: 0.004, ax: lerp(TINY, HEDGEX, u), dy: -120 * Math.abs(Math.sin(u * Math.PI * 2)), look: [-1, 0] };
}

function leoState(t, base, isEdo) {
  const g = { x: base[0], y: base[1], s: isEdo ? 0.98 : 1.0, seed: 3000 }, side = isEdo ? -1 : 1;
  if (t < TM.dark) return { ...g, pose: 'front:stand', expr: 'happy', look: [side, 0] };
  if (t < TM.stomp) return { ...g, pose: 'front:stand', expr: 'worried', look: [0.3, -1] };
  if (t < TM.stomp + 0.6) return { ...g, y: g.y - 90 * Math.sin(pr(t, TM.stomp, TM.stomp + 0.6) * Math.PI), pose: 'front:freeze', expr: 'surprised', look: [1, -1] };
  if (t < TM.down + 0.3) return { ...g, pose: 'front:freeze', expr: 'surprised', look: [1, -1] };
  if (t < TM.guns) return { ...g, pose: 'front:stand', expr: 'sneaky', look: [side, 0] };
  if (t < TM.aim) return { ...g, pose: 'front:hold', expr: 'sneaky', look: [0, 0] };
  if (t < TM.small) return { ...g, pose: isEdo ? 'front:hi5L' : 'front:hi5R', expr: t < TM.fire ? 'sneaky' : 'laugh', look: [1, -1] };
  if (t < TM.hop) return { ...g, pose: 'front:hold', expr: 'smile', look: [isEdo ? 1 : 1, 0.6] };
  return { ...g, pose: 'front:stand', expr: 'surprised', look: [-1, 0] };
}
// where each laser gun is (and where it points)
function gunAt(t, base, isEdo) {
  const s = isEdo ? 0.98 : 1.0;
  if (t < TM.guns) return null;
  if (t < TM.aim || t >= TM.small) return [base[0] + (isEdo ? -20 : 20) * s, base[1] - 150 * s, isEdo ? Math.PI + 0.2 : -0.2];
  return [base[0] + (isEdo ? -74 : 74) * s, base[1] - 250 * s, -Math.PI / 2 + (isEdo ? 0.25 : 0.25)];
}
function gun(C, [x, y, a], seed) {
  const c = Math.cos(a), s = Math.sin(a), R = pts => pts.map(([u, v]) => [x + u * c - v * s, y + u * s + v * c]);
  part(C, R(ellipse(0, 0, 26, 17, 24)), { col: K.red, p: 0.95, gap: 5, w: 7, seed }, { w: 5, seed: seed + 1 });
  part(C, R([[20, -6], [56, -9], [56, 9], [20, 6]]), { col: K.yellow, p: 1, gap: 4, w: 6, seed: seed + 2 }, { w: 5, seed: seed + 3 });
  [[56, 0, 9]].forEach(([u, v, r]) => part(C, R(ellipse(u, v, r, r, 16)), { col: K.sky, p: 1, gap: 4, w: 6, seed: seed + 4 }, { w: 4, seed: seed + 5 }));
  line(C.l, R([[-10, 12], [-16, 34]]), { w: 9, col: K.ink, p: 0.95, seed: seed + 6 });
}

export const { EV, ev } = (() => { const E = events(); return { EV: E.EV, ev: E.ev }; })();
LINES.forEach(Ln => ev(Ln.t, 'voice', { id: Ln.id }));
ev(0, 'paper');
[0.3, 1.2, 2.1].forEach((t, i) => ev(t, 'kick', { pan: i % 2 ? 0.2 : -0.2 }));
ev(TM.dark, 'sting'); ev(TM.stomp - 0.4, 'whoosh'); ev(TM.stomp, 'boom'); ev(TM.stomp + 0.05, 'freeze');
ev(TM.up + 0.2, 'whoosh'); ev(TM.blorp, 'blorp'); ev(TM.down - 0.2, 'whoosh');
ev(TM.guns, 'cloth', { pan: 0 }); ev(TM.guns + 0.25, 'clink', { pan: -0.2 }); ev(TM.guns + 0.45, 'clink', { pan: 0.2 }); ev(TM.aim, 'zip', { dur: 0.4 });
for (let k = 0; ; k++) { const t = TM.fire + k * 0.2; if (t > TM.hit) break; ev(t, 'laser', { pan: k % 2 ? 0.3 : -0.3 }); }
ev(TM.hit, 'boom', { v: 0.6 }); ev(TM.small - 0.9, 'pop', { pan: 0 }); ev(TM.solved, 'laugh', { pan: 0 }); ev(TM.solved + 0.9, 'squeak', { pan: 0.2 });
ev(TM.hop + 0.05, 'hopsoft', { pan: -0.2 }); ev(TM.hop + 0.5, 'hopsoft', { pan: -0.4 }); ev(TM.hop + 1.0, 'cloth', { pan: -0.4 });
ev(TM.tbc, 'write', { dur: 1.3, pan: 0 });
[['walk', 0], ['mystery', TM.dark], ['tutti', TM.up], ['silence', TM.blorp], ['sneak', TM.guns], ['tutti', TM.fire], ['theme', TM.solved], ['mystery', TM.hop], ['tbc', TM.tbc]].forEach(([id, t]) => ev(t, 'cue', { id }));

export function TEXTS(t) {
  begin(cam(t)); const out = [...toBeContinued(t, TM.tbc)];
  if (t > TM.blorp && t < TM.blorp + 1.6) out.push({ id: 'blorp', text: 'BLORP.', x0: 240, y0: 1060, x1: 840, y1: 1260 });
  return out;
}

export function frame(comp, t, opt = {}) {
  begin(cam(t));
  // the ground goes on forever when the camera flies up
  fill(L.BG.f, [[-14000, 1515], [24000, 1515], [24000, 3200], [-14000, 3200]], { col: K.green, p: 0.55, gap: 13, w: 13, ang: 1.25, seed: 7100, boil: 0 });
  const all = { verge: 1, path: 1, sign: 1, hedge: 1, hedgeL: 1, fence: 1, fenceF: 1 };
  drawStreet(L.BG.f, L.BG.l, all); drawHollow(L.BG.f, L.BG.l, 1); drawFence(L.BG.f, L.BG.l, all, 0);
  // clouds high up (only seen from far away)
  if (CAM.s < 0.5) [[2600, -5200, 1600], [10200, -11800, 2000], [1500, -20500, 1800], [11500, -29000, 2400], [5200, -33500, 1500]].forEach(([x, y, r], i) => {
    const c = []; for (let j = 0; j <= 40; j++) { const a = Math.PI + Math.PI * j / 40, bb = 1 + 0.18 * Math.abs(Math.sin(j / 40 * Math.PI * 4)); c.push([x + Math.cos(a) * r * bb, y + Math.sin(a) * r * 0.4 * bb]); }
    line(L.BG.l, [...c, c[0]], { w: 8, col: K.sky, p: 0.9, seed: 7110 + i });
  });
  // the shadow: the sky goes dark (the wash) while the alien is big
  const dark = t < TM.dark ? 0 : t < TM.hit + 0.3 ? pr(t, TM.dark, TM.dark + 0.8) : 1 - pr(t, TM.hit + 0.3, TM.small);
  if (dark > 0) { const g = L.WASH.g; g.save(); g.fillStyle = '#000'; g.globalAlpha = 0.6 * dark; g.fillRect(0, 0, W, H); g.restore(); }
  // the ball bouncing between them at the start
  if (t < TM.stomp) { const u = (t % 0.9) / 0.9, dir = Math.floor(t / 0.9) % 2; const bx = dir ? lerp(EDO[0] - 50, LEO[0] + 50, u) : lerp(LEO[0] + 50, EDO[0] - 50, u); ball(L.CH, t < TM.dark ? bx : LEO[0] + 120, 1480 - (t < TM.dark ? 70 * Math.sin(u * Math.PI) : 0), 22, t * 8); }
  else if (t < TM.guns) ball(L.CH, LEO[0] + 120, 1480, 22, 0);
  // the hedge: two white ears wait for the tiny alien
  if (t > TM.hop + 0.8) { const u = eo(pr(t, TM.hop + 0.8, TM.hop + 1.3)), kg = L.INV.k.g; kg.save(); kg.fillStyle = '#000';
    [[HEDGEX - 70, -0.18], [HEDGEX - 30, 0.15]].forEach(([x, r]) => { kg.beginPath(); kg.ellipse(sx(x), sy(1330 - 70 * u), 17 * CAM.s, 52 * CAM.s, r, 0, Math.PI * 2); kg.fill(); }); kg.restore(); }
  const A = alienState(t);
  let eye = null;
  if (A) {
    const r = alien(L.CH, A.k, A.ax, A.dy, t, A); eye = r.eye;
    // sparkles while it shrinks
    if (A.spin !== undefined) for (let i = 0; i < 10; i++) { const q = i / 10 * Math.PI * 2 + t * 3, R = 380 * 100 * A.k * (0.6 + 0.4 * Math.sin(t * 9 + i)); const cx = A.ax + Math.cos(q) * R, cy = 1500 - 180 * 100 * A.k + Math.sin(q) * R; line(L.FX, [[cx - 0.08 * R, cy], [cx + 0.08 * R, cy]], { w: 8, col: K.yellow, p: 1, seed: 7200 + i }); line(L.FX, [[cx, cy - 0.08 * R], [cx, cy + 0.08 * R]], { w: 8, col: K.yellow, p: 1, seed: 7210 + i }); }
  }
  edo(L.CH, leoState(t, EDO, true));
  leo(L.CH, leoState(t, LEO, false));
  // the guns, and the laser beams
  [[LEO, false, 7300], [EDO, true, 7320]].forEach(([base, isEdo, sd]) => {
    const G = gunAt(t, base, isEdo); if (!G) return;
    gun(L.CH, G, sd);
    if (t > TM.fire && t < TM.hit + 0.3 && eye) {
      const tip = [G[0] + Math.cos(G[2]) * 60, G[1] + Math.sin(G[2]) * 60], u = eo(pr(t, TM.fire, TM.fire + 0.6)), end = [lerp(tip[0], eye[0], u), lerp(tip[1], eye[1], u)];
      const fl = 0.75 + 0.25 * Math.sin(t * 60 + sd);
      line(L.FX, [tip, end], { w: 320 * fl, col: K.pink, p: 0.55, seed: sd + 10, boil: 2, taper: 0 });
      line(L.FX, [tip, end], { w: 170 * fl, col: K.yellow, p: 1, seed: sd + 11, boil: 2, taper: 0 });
      line(L.FX, [tip, end], { w: 60, col: K.white, p: 1, seed: sd + 12, boil: 2, taper: 0 });
    }
    if (t > TM.solved && t < TM.hop) [0, 1, 2].forEach(i => { const ph = (t * 1.5 + i / 3) % 1, tip = [G[0] + Math.cos(G[2]) * 60, G[1] + Math.sin(G[2]) * 60 - ph * 80]; line(L.FX, [[tip[0] - 10, tip[1]], [tip[0], tip[1] - 14], [tip[0] + 10, tip[1] - 28]], { w: 5, col: K.ink, p: 0.5 * (1 - ph), seed: sd + 20 + i }); });
  });
  // the hit: a starburst on the eye
  if (eye && t > TM.hit - 0.2 && t < TM.hit + 0.6) { const u = pr(t, TM.hit - 0.2, TM.hit + 0.6), R = 3000 * (0.5 + u); for (let i = 0; i < 12; i++) { const q = i / 12 * Math.PI * 2; line(L.FX, [[eye[0] + Math.cos(q) * R * 0.4, eye[1] + Math.sin(q) * R * 0.4], [eye[0] + Math.cos(q) * R, eye[1] + Math.sin(q) * R]], { w: 14, col: i % 2 ? K.yellow : K.orange, p: 1 - u * 0.6, seed: 7400 + i }); } }
  // "BLORP." and later a tiny "blorp."
  if (t > TM.blorp && t < TM.blorp + 1.6) { patch(L.TOPK, 540, 1150, 330, 110); text(L.TOP, 'BLORP.', 540, 1200, { size: 200, font: 'Gaegu', weight: 700, col: K.violet, stroke: 4, seed: 7500, reveal: pr(t, TM.blorp, TM.blorp + 0.3) }); }
  if (A && A.k < 0.01 && t > TM.solved + 0.8 && t < TM.solved + 2.0) text(L.TOP, 'blorp.', sx(A.ax) + 60, sy(1500 - 450 * 100 * A.k), { size: 40, font: 'Gaegu', weight: 700, col: K.violet, seed: 7501 });
  if (opt.cover) opt.cover(); else { subTo(SUBS, t); toBeContinued(t, TM.tbc); }
  composite(comp, { wash: dark > 0 });
}
