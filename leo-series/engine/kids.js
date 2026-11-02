// Characters for "The Invisible Jacket": Leo (a boy of about seven), the lady next door, her deckchair,
// a rabbit, a tortoise and a rubber duck. Drawn the way a skilled adult imitates a child: round heads,
// dot eyes, tube limbs, mitten hands. Local coordinates: origin between the soles, y up is negative.
import { line, fill, dab, ellipse, handCircle, xf, smooth } from './crayon.js';
import { part, tube, curve } from './rig.js';
import { PAL } from './pal.js';
import { lerp, clamp, hash } from '/core/lib.js';
const K = PAL.crayon;
const LW = 7;
const lo = (seed, extra = {}) => ({ w: LW, seed, ...extra });
function T0(o) { const k = o.flip ? -1 : 1; return pts => xf(pts, { x: o.x || 0, y: o.y || 0, s: o.s || 1, r: o.r || 0, sx: k }); }
const nrm = v => { const d = Math.hypot(v[0], v[1]) || 1; return [v[0] / d, v[1] / d]; };
const ad = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const lp2 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];

// ————————————————————————— faces —————————————————————————
// expression → eyes / brows / mouth
const EXPR = {
  normal:    { eye: 'dot',  brow: null,      mouth: 'arc' },
  smile:     { eye: 'dot',  brow: null,      mouth: 'smile' },
  happy:     { eye: 'arc',  brow: null,      mouth: 'grin' },
  surprised: { eye: 'wide', brow: 'up',      mouth: 'o' },
  freeze:    { eye: 'wide', brow: 'up',      mouth: 'flat' },
  sad:       { eye: 'down', brow: 'worried', mouth: 'frown' },
  worried:   { eye: 'dot',  brow: 'worried', mouth: 'flat' },
  hello:     { eye: 'dot',  brow: 'up',      mouth: 'open' },
  laugh:     { eye: 'arc',  brow: null,      mouth: 'laugh' },
  sneaky:    { eye: 'side', brow: null,      mouth: 'smirk' },
  closed:    { eye: 'closed', brow: null,    mouth: 'arc' },
};
function eyeAt(C, P, x, y, kind, sd, s, look = [0, 0]) {
  if (kind === 'arc') { line(C.l, P([[x - 9, y + 4], [x - 3, y - 4], [x + 3, y - 4], [x + 9, y + 4]]), lo(sd, { w: 5, taper: 0.3 })); return; }
  if (kind === 'closed') { line(C.l, P([[x - 9, y - 2], [x - 3, y + 4], [x + 3, y + 4], [x + 9, y - 2]]), lo(sd, { w: 5, taper: 0.3 })); return; }
  const r = kind === 'wide' ? 9.5 : 7;
  const lx = kind === 'side' ? 3.5 : look[0] * 3, ly = kind === 'down' ? 4 : look[1] * 3;
  part(C, P(ellipse(x + lx, y + ly, r * 0.82, r * 1.05, 16)), { col: K.ink, p: 1, gap: 3.2, w: 5, over: 0.5, seed: sd, ang: 1.3 }, lo(sd + 1, { w: 4 }), { occ: false });
  dab(C.l, ...P([[x + lx + 2.5, y + ly - 3.5]])[0], 2.4 * s, { col: K.white, p: 1, seed: sd + 2, gap: 2, w: 3 });
  if (kind === 'down') line(C.l, P([[x - 10, y - 3], [x, y - 6], [x + 10, y - 3]]), lo(sd + 3, { w: 4.5 }));
}
function browAt(C, P, x, y, kind, sd, mirror) {
  if (!kind) return;
  if (kind === 'up') line(C.l, P([[x - 9, y - 20], [x, y - 25], [x + 9, y - 20]]), lo(sd, { w: 4, p: 0.9 }));
  if (kind === 'worried') { const m = mirror ? -1 : 1; line(C.l, P([[x - 9 * m, y - 24], [x + 9 * m, y - 18]]), lo(sd, { w: 4, p: 0.9 })); }
}
function mouthAt(C, P, x, y, kind, sd, k = 1) {
  const red = { col: K.red, p: 0.85, gap: 3, w: 4, over: 0.5, seed: sd };
  if (kind === 'arc') { line(C.l, P([[x - 7 * k, y - 1], [x, y + 3], [x + 7 * k, y - 1]]), lo(sd, { w: 4.5 })); return; }
  if (kind === 'smile') { part(C, P([[x - 12 * k, y - 3], [x - 6 * k, y + 6], [x + 6 * k, y + 6], [x + 12 * k, y - 3]]), red, lo(sd + 1, { w: 4.5 }), { occ: false }); return; }
  if (kind === 'grin') { part(C, P([[x - 14 * k, y - 4], [x - 7 * k, y + 8], [x + 7 * k, y + 8], [x + 14 * k, y - 4], [x, y - 1]]), red, lo(sd + 1, { w: 4.5 }), { occ: false }); return; }
  if (kind === 'o') { part(C, P(ellipse(x, y + 2, 6 * k, 7, 16)), red, lo(sd + 1, { w: 4 }), { occ: false }); return; }
  if (kind === 'open') { part(C, P(ellipse(x, y + 2, 8 * k, 9, 18)), red, lo(sd + 1, { w: 4.5 }), { occ: false }); return; }
  if (kind === 'laugh') { part(C, P([[x - 15 * k, y - 4], [x + 15 * k, y - 4], [x + 9 * k, y + 12], [x - 9 * k, y + 12]]), red, lo(sd + 1, { w: 4.5 }), { occ: false }); return; }
  if (kind === 'frown') { line(C.l, P([[x - 8 * k, y + 4], [x, y - 1], [x + 8 * k, y + 4]]), lo(sd, { w: 4.5 })); return; }
  if (kind === 'flat') { line(C.l, P([[x - 7 * k, y + 1], [x + 7 * k, y + 1]]), lo(sd, { w: 4.5 })); return; }
  if (kind === 'smirk') { line(C.l, P([[x - 8 * k, y + 1], [x + 2 * k, y + 3], [x + 9 * k, y - 3]]), lo(sd, { w: 4.5 })); return; }
}
const skinF = sd => ({ col: K.peach, p: 0.5, gap: 10, w: 12, ang: 0.5, seed: sd, over: 4 });

// Leo's head. o: x, y (world head centre), s, r, flip, view 'front'|'side', expr, look, seed
export function leoHead(C, o) {
  const T = T0(o), P = pts => T(pts), sd = o.seed || 100, s = o.s || 1;
  const E = EXPR[o.expr || 'normal'] || EXPR.normal;
  const hairF = { col: o.hairCol || K.brown, p: o.hairCol ? 0.9 : 0.85, gap: 8, w: 10, ang: 1.2, seed: sd + 1, over: 2.5 };
  const curly = o.hair === 'curly';
  const curlCap = (a0, a1, cx, cy, r, n) => { const pts = []; for (let i = 0; i <= n * 4; i++) { const a = lerp(a0, a1, i / (n * 4)); const bump = 1 + 0.12 * Math.abs(Math.sin(i / 4 * Math.PI)); pts.push([cx + Math.cos(a) * r * bump, cy + Math.sin(a) * r * bump]); } return pts; };
  if ((o.view || 'side') === 'front') {
    [[-60, 6], [60, 6]].forEach(([x, y], i) => part(C, P(ellipse(x, y, 10, 14, 16)), skinF(sd + 3 + i), lo(sd + 5 + i, { w: 5 })));
    part(C, P(ellipse(0, 0, 58, 54, 44)), skinF(sd + 2), null);
    line(C.l, P(ellipse(0, 0, 58, 54, 36, -0.1, Math.PI + 0.1)), lo(sd + 7));
    const hair = [[-60, -2], [-64, -30]];
    for (let i = 0; i <= 10; i++) { const a = lerp(Math.PI * 1.06, Math.PI * 1.94, i / 10), rr = i % 2 ? 66 : 82; hair.push([Math.cos(a) * rr, Math.sin(a) * rr - 6]); }
    hair.push([64, -30], [60, -2]);
    for (let i = 0; i <= 8; i++) hair.push([lerp(52, -52, i / 8), i % 2 ? -36 : -20]);
    if (curly) { const cap = [[-62, 6], ...curlCap(Math.PI * 1.0, Math.PI * 2.0, 0, -8, 68, 9), [62, 6], [50, -18], [30, -26], [10, -22], [-10, -26], [-30, -22], [-50, -18]]; part(C, P(cap), hairF, lo(sd + 8, { w: 6 })); }
    else part(C, P(hair), hairF, lo(sd + 8, { w: 6 }));
    eyeAt(C, P, -20, 8, E.eye, sd + 20, s, o.look); eyeAt(C, P, 20, 8, E.eye, sd + 22, s, o.look);
    browAt(C, P, -20, 8, E.brow, sd + 24, false); browAt(C, P, 20, 8, E.brow, sd + 25, true);
    [[-36, 24], [36, 24]].forEach(([x, y], i) => dab(C.f, ...P([[x, y]])[0], 9 * s, { col: K.pink, p: 0.75, seed: sd + 30 + i, sq: 0.75 }));
    if (o.freckles) [[-40, 14], [-32, 20], [-44, 22], [40, 14], [32, 20], [44, 22]].forEach(([x, y], i) => dab(C.l, ...P([[x, y]])[0], 2.6 * s, { col: K.orange, p: 1, seed: sd + 90 + i, gap: 2, w: 3 }));
    mouthAt(C, P, 0, 30, E.mouth, sd + 40);
    return;
  }
  // side, facing +x
  const face = smooth([[0, -56], [34, -48], [54, -24], [60, -4], [68, 4], [60, 12], [56, 28], [40, 48], [12, 56], [-22, 52], [-46, 30], [-56, 0], [-48, -30], [-26, -52]], 6);
  part(C, P(face), skinF(sd + 2), null);
  line(C.l, P(face.slice(Math.floor(face.length * 2 / 14), Math.floor(face.length * 11 / 14))), lo(sd + 7));
  const hair = [[-40, 40], [-58, 10], [-60, -24]];
  for (let i = 0; i <= 9; i++) { const a = lerp(Math.PI * 1.02, Math.PI * 1.8, i / 9), rr = i % 2 ? 64 : 80; hair.push([Math.cos(a) * rr - 4, Math.sin(a) * rr - 6]); }
  hair.push([48, -40], [40, -28], [30, -36], [20, -26], [8, -34], [-4, -22], [-16, -26], [-22, -6], [-30, 20], [-34, 38]);
  if (curly) { const cap = [[-42, 40], ...curlCap(Math.PI * 0.75, Math.PI * 1.85, -4, -6, 66, 9), [44, -36], [30, -26], [10, -30], [-8, -18], [-22, -4], [-32, 22]]; part(C, P(cap), hairF, lo(sd + 8, { w: 6 })); }
  else part(C, P(hair), hairF, lo(sd + 8, { w: 6 }));
  part(C, P(ellipse(-14, 6, 11, 14, 16)), skinF(sd + 3), lo(sd + 5, { w: 5 }));
  line(C.l, P([[-16, 0], [-10, 6], [-16, 12]]), lo(sd + 6, { w: 3.5, p: 0.7 }));
  eyeAt(C, P, 34, 4, E.eye, sd + 20, s, o.look);
  browAt(C, P, 34, 4, E.brow, sd + 24, false);
  dab(C.f, ...P([[28, 24]])[0], 9 * s, { col: K.pink, p: 0.75, seed: sd + 30, sq: 0.75 });
  if (o.freckles) [[24, 14], [32, 20], [20, 22]].forEach(([x, y], i) => dab(C.l, ...P([[x, y]])[0], 2.6 * s, { col: K.orange, p: 1, seed: sd + 90 + i, gap: 2, w: 3 }));
  mouthAt(C, P, 44, 30, E.mouth, sd + 40, 0.7);
}

// The lady's head: silver-lilac hair, bun, round glasses, straw sun hat with a red band
export function ladyHead(C, o) {
  const T = T0(o), P = pts => T(pts), sd = o.seed || 500, s = o.s || 1;
  const E = EXPR[o.expr || 'normal'] || EXPR.normal;
  const hairF = { col: K.violet, p: 0.42, gap: 8, w: 10, ang: 1.1, seed: sd + 1, over: 2 };
  const strawF = { col: K.ochre, p: 0.9, gap: 8, w: 10, ang: 0.3, seed: sd + 50, over: 3, cross: true, crossP: 0.4 };
  const front = (o.view || 'side') === 'front';
  if (front) {
    part(C, P(ellipse(0, -2, 60, 58, 40)), hairF, lo(sd + 2, { w: 5 }));
    [[-54, 18], [54, 18]].forEach(([x, y], i) => part(C, P(handCircle(x, y, 16, sd + 3 + i, 0, 18)), { ...hairF, seed: sd + 4 + i }, lo(sd + 6 + i, { w: 5 })));
    part(C, P(ellipse(0, 6, 50, 52, 40)), skinF(sd + 8), null);
    line(C.l, P(ellipse(0, 6, 50, 52, 36, -0.1, Math.PI + 0.1)), lo(sd + 9));
    eyeAt(C, P, -20, 8, E.eye, sd + 20, s * 0.8, o.look); eyeAt(C, P, 20, 8, E.eye, sd + 22, s * 0.8, o.look);
    [-20, 20].forEach((x, i) => line(C.l, P(handCircle(x, 8, 15, sd + 26 + i, 0.05, 28)), lo(sd + 28 + i, { w: 4 })));
    line(C.l, P([[-6, 6], [6, 6]]), lo(sd + 30, { w: 4 }));
    browAt(C, P, -20, 2, E.brow, sd + 24, false); browAt(C, P, 20, 2, E.brow, sd + 25, true);
    [[-32, 30], [32, 30]].forEach(([x, y], i) => dab(C.f, ...P([[x, y]])[0], 8 * s, { col: K.pink, p: 0.7, seed: sd + 32 + i, sq: 0.75 }));
    mouthAt(C, P, 0, 34, E.mouth, sd + 40, 0.9);
    // hat
    part(C, P(ellipse(0, -30, 98, 20, 36)), strawF, lo(sd + 52, { w: 6 }));
    part(C, P(smooth([[-46, -30], [-42, -66], [0, -82], [42, -66], [46, -30]], 5)), { ...strawF, seed: sd + 54 }, lo(sd + 55, { w: 6 }));
    part(C, P([[-46, -32], [46, -32], [45, -46], [-45, -46]]), { col: K.red, p: 0.9, gap: 5, w: 7, seed: sd + 56 }, lo(sd + 57, { w: 4.5 }));
    return;
  }
  // side, facing +x
  part(C, P(handCircle(-44, -26, 22, sd + 3, 0, 20)), hairF, lo(sd + 4, { w: 5 }));
  part(C, P(smooth([[-50, 30], [-60, -6], [-44, -40], [0, -54], [30, -40], [12, -18], [-8, -6], [-24, 26]], 5)), { ...hairF, seed: sd + 5 }, lo(sd + 6, { w: 5 }));
  const face = smooth([[0, -46], [30, -40], [46, -20], [52, -2], [62, 8], [52, 14], [48, 28], [34, 46], [10, 52], [-16, 48], [-30, 30], [-28, 0], [-14, -30]], 6);
  part(C, P(face), skinF(sd + 8), null);
  line(C.l, P(face.slice(Math.floor(face.length * 1 / 13), Math.floor(face.length * 10 / 13))), lo(sd + 9));
  eyeAt(C, P, 30, 6, E.eye, sd + 20, s * 0.8, o.look);
  line(C.l, P(handCircle(30, 6, 15, sd + 26, 0.05, 28)), lo(sd + 28, { w: 4 }));
  line(C.l, P([[15, 4], [-10, 0]]), lo(sd + 29, { w: 3.5 }));
  browAt(C, P, 30, 0, E.brow, sd + 24, false);
  dab(C.f, ...P([[22, 30]])[0], 8 * s, { col: K.pink, p: 0.7, seed: sd + 32, sq: 0.75 });
  mouthAt(C, P, 38, 34, E.mouth, sd + 40, 0.7);
  part(C, P(ellipse(6, -30, 98, 17, 36, 0, Math.PI * 2, -0.04)), strawF, lo(sd + 52, { w: 6 }));
  part(C, P(smooth([[-40, -30], [-36, -66], [6, -80], [42, -64], [46, -30]], 5)), { ...strawF, seed: sd + 54 }, lo(sd + 55, { w: 6 }));
  part(C, P([[-40, -32], [46, -32], [45, -46], [-39, -46]]), { col: K.red, p: 0.9, gap: 5, w: 7, seed: sd + 56 }, lo(sd + 57, { w: 4.5 }));
}

// ————————————————————————— Leo —————————————————————————
// pose skeletons: H hip, N neck, Hd head centre, legs [far, near] and arms [far, near] as [joint, joint, end]
const SIDE = {
  stand: { H: [0, -92], N: [2, -176], Hd: [6, -232], legs: [[[-4, -92], [-6, -50], [-8, -8]], [[4, -92], [6, -50], [6, -8]]], arms: [[[-2, -166], [-4, -128], [0, -96]], [[4, -166], [8, -128], [14, -98]]] },
  walk0: { H: [0, -94], N: [3, -178], Hd: [8, -234], legs: [[[-4, -94], [-16, -54], [-30, -12]], [[4, -94], [22, -54], [34, -10]]], arms: [[[-2, -168], [12, -132], [24, -106]], [[4, -168], [-10, -132], [-18, -102]]] },
  walk1: { H: [0, -98], N: [3, -182], Hd: [8, -238], legs: [[[-4, -98], [18, -58], [30, -12]], [[4, -98], [-12, -56], [-26, -14]]], arms: [[[-2, -172], [-12, -136], [-18, -108]], [[4, -172], [16, -136], [26, -108]]] },
  kick:  { H: [0, -94], N: [-8, -176], Hd: [-6, -232], legs: [[[-4, -94], [-6, -52], [-10, -8]], [[4, -94], [40, -84], [76, -74]]], arms: [[[-6, -168], [16, -152], [36, -146]], [[-4, -168], [-22, -142], [-38, -124]]] },
  crouch: { H: [-18, -62], N: [16, -128], Hd: [48, -170], legs: [[[-22, -62], [8, -40], [-8, -8]], [[-14, -62], [20, -46], [8, -8]]], arms: [[[12, -122], [26, -90], [24, -58]], [[18, -122], [36, -92], [34, -60]]] },
  peek:  { H: [0, -92], N: [12, -172], Hd: [30, -224], legs: [[[-4, -92], [-8, -50], [-12, -8]], [[4, -92], [10, -50], [12, -8]]], arms: [[[8, -162], [26, -138], [40, -150]], [[12, -162], [30, -136], [46, -146]]] },
  run0:  { H: [0, -98], N: [14, -178], Hd: [24, -232], legs: [[[-4, -98], [-22, -62], [-50, -44]], [[4, -98], [36, -72], [32, -28]]], arms: [[[8, -168], [30, -148], [46, -164]], [[12, -168], [-8, -142], [-22, -152]]] },
  run1:  { H: [0, -102], N: [14, -182], Hd: [24, -236], legs: [[[-4, -102], [32, -76], [28, -32]], [[4, -102], [-20, -66], [-48, -48]]], arms: [[[8, -172], [-8, -146], [-22, -156]], [[12, -172], [30, -150], [46, -166]]] },
  tuck:  { H: [0, -86], N: [6, -156], Hd: [16, -208], legs: [[[-2, -86], [34, -118], [26, -78]], [[4, -86], [42, -124], [34, -84]]], arms: [[[6, -148], [30, -118], [36, -112]], [[10, -148], [38, -116], [44, -110]]] },
  wave:  { H: [0, -92], N: [2, -176], Hd: [6, -232], legs: [[[-4, -92], [-6, -50], [-8, -8]], [[4, -92], [6, -50], [6, -8]]], arms: [[[-2, -166], [-4, -128], [0, -96]], [[4, -166], [30, -196], [44, -240]]] },
};
const FRONT = {
  stand:  { arms: [[[-36, -166], [-46, -128], [-50, -96]], [[36, -166], [46, -128], [50, -96]]] },
  hold:   { arms: [[[-36, -166], [-48, -134], [-30, -150]], [[36, -166], [48, -134], [30, -150]]] },
  sleeve: { arms: [[[-36, -166], [-64, -184], [-74, -222]], [[36, -166], [64, -184], [74, -222]]] },
  zip:    { arms: [[[-36, -166], [-42, -130], [-8, -118]], [[36, -166], [42, -132], [8, -152]]] },
  hands:  { arms: [[[-36, -166], [-52, -140], [-36, -194]], [[36, -166], [52, -140], [36, -194]]] },
  freeze: { arms: [[[-36, -166], [-60, -196], [-66, -238]], [[36, -166], [60, -196], [66, -238]]] },
  wave0:  { arms: [[[-36, -166], [-46, -128], [-50, -96]], [[36, -166], [64, -196], [70, -246]]] },
  wave1:  { arms: [[[-36, -166], [-46, -128], [-50, -96]], [[36, -166], [66, -194], [88, -238]]] },
  cheer:  { arms: [[[-36, -166], [-62, -200], [-60, -246]], [[36, -166], [62, -200], [60, -246]]] },
  hi5L:   { arms: [[[-36, -166], [-64, -196], [-74, -246]], [[36, -166], [46, -128], [50, -96]]] },
  hi5R:   { arms: [[[-36, -166], [-46, -128], [-50, -96]], [[36, -166], [64, -196], [74, -246]]] },
};
// The white jacket, held up in front (before he puts it on): white wax with a faint sky-blue outline
export function jacketShape(C, P, cx, cy, sd, outline = true) {
  const body = smooth([[cx - 40, cy - 54], [cx - 12, cy - 60], [cx, cy - 48], [cx + 12, cy - 60], [cx + 40, cy - 54], [cx + 74, cy - 20], [cx + 62, cy - 4], [cx + 42, cy - 24], [cx + 42, cy + 54], [cx - 42, cy + 54], [cx - 42, cy - 24], [cx - 62, cy - 4], [cx - 74, cy - 20]], 3);
  part(C, P(body), { col: K.white, p: 0.95, gap: 5, w: 7, ang: 0.4, seed: sd, over: 1 }, outline ? { w: 4, col: K.sky, p: 0.6, seed: sd + 1 } : { w: 4, col: K.white, p: 1, seed: sd + 1 });
  line(C.l, P([[cx, cy - 48], [cx, cy + 54]]), { w: 3, col: outline ? K.sky : K.white, p: outline ? 0.5 : 1, seed: sd + 2 });
  return body;
}

// o: x, y, s, flip, r, pose (SIDE key or 'front:<FRONT key>' or 'swim'), expr, look, seed, jacket (bool), pack (bool, default true)
export function leo(C, o) {
  const T = T0(o), P = pts => T(pts), sd = o.seed || 200, s = o.s || 1;
  const pose = o.pose || 'stand';
  const front = pose.startsWith('front');
  const shirtF = { col: o.shirt || K.orange, p: 0.72, gap: 10, w: 12, ang: 0.4, seed: sd + 1 };
  const shortsF = { col: o.shorts || K.violet, p: 0.75, gap: 9, w: 11, ang: 1.2, seed: sd + 2 };
  const shoeF = { col: K.red, p: 0.85, gap: 6, w: 8, ang: 0.3, seed: sd + 3 };
  const packF = { col: K.yellow, p: 0.85, gap: 8, w: 10, ang: 0.8, seed: sd + 4, cross: true, crossP: 0.35 };
  const jackF = { col: K.white, p: 0.95, gap: 5, w: 7, ang: 0.4, seed: sd + 5, over: 1 };
  const jackL = s2 => ({ w: 4, col: K.sky, p: 0.6, seed: s2 });
  const limb = (pts, w, f, s2) => part(C, P(tube(curve(pts, 5), w)), f, lo(s2));
  const hand = (c, s2) => part(C, P(handCircle(c[0], c[1], 10, s2, 0, 18)), skinF(s2), lo(s2, { w: 5.5 }));
  if (pose === 'swim') {   // only head, shoulders and arms above the water line (origin = water line)
    const ph = o.ph || 0;
    const arms = ph ? [[[-30, -8], [-60, -36], [-80, -70]], [[30, -8], [58, -46], [64, -90]]] : [[[-30, -8], [-58, -46], [-64, -90]], [[30, -8], [60, -36], [80, -70]]];
    arms.forEach((a, i) => { limb(a, 15, skinF(sd + 60 + i), sd + 62 + i); hand(a[2], sd + 64 + i); });
    part(C, P(smooth([[-42, 0], [-36, -18], [0, -26], [36, -18], [42, 0]], 4)), shirtF, lo(sd + 66));
    leoHead(C, { x: P([[0, -70]])[0][0], y: P([[0, -70]])[0][1], s, r: o.r || 0, flip: o.flip, view: 'front', expr: o.expr, seed: sd + 300, hair: o.hair, hairCol: o.hairCol, freckles: o.freckles });
    return;
  }
  if (front) {
    const sk = FRONT[pose.split(':')[1] || 'stand'];
    const H = [0, -92], N = [0, -176];
    [[[-16, -92], [-17, -50], [-18, -8]], [[16, -92], [17, -50], [18, -8]]].forEach((lg, i) => { limb(lg, 18, skinF(sd + 40 + i), sd + 42 + i); part(C, P(ellipse(lg[2][0], lg[2][1] + 4, 15, 10, 18)), { ...shoeF, seed: sd + 44 + i }, lo(sd + 46 + i, { w: 5.5 })); });
    const shorts = smooth([[-40, -104], [40, -104], [44, -64], [6, -62], [0, -74], [-6, -62], [-44, -64]], 3);
    part(C, P(shorts), shortsF, lo(sd + 48));
    const shirt = smooth([[-16, -178], [16, -178], [40, -168], [42, -100], [-42, -100], [-40, -168]], 3);
    part(C, P(shirt), shirtF, lo(sd + 50));
    // backpack straps
    if (o.pack !== false && !o.jacket) [[-24, -174, -30, -110], [24, -174, 30, -110]].forEach(([a, b, c, d], i) => part(C, P(tube([[a, b], [c, d]], 10)), { ...packF, seed: sd + 52 + i, cross: false }, lo(sd + 54 + i, { w: 4.5 })));
    if (o.jacket) part(C, P(smooth([[-18, -180], [18, -180], [44, -170], [48, -94], [-48, -94], [-44, -170]], 3)), jackF, jackL(sd + 56));
    sk.arms.forEach((a, i) => {
      limb(a, 15, skinF(sd + 60 + i), sd + 62 + i);
      const sl = [a[0], lp2(a[0], a[1], o.jacket ? 1 : 0.55)];
      if (o.jacket) part(C, P(tube(curve([a[0], a[1], lp2(a[1], a[2], 0.78)], 4), 22)), { ...jackF, seed: sd + 64 + i }, jackL(sd + 66 + i));
      else part(C, P(tube(sl, 24)), { ...shirtF, seed: sd + 64 + i }, lo(sd + 66 + i, { w: 6 }));
      hand(a[2], sd + 68 + i);
    });
    if (o.jacket && o.zip !== undefined) line(C.l, P([[0, -174], [0, lerp(-174, -96, o.zip)]]), { w: 3, col: K.sky, p: 0.6, seed: sd + 70 });
    if (o.holding) jacketShape(C, P, 0, -140, sd + 72);
    const hd = P([[0, -234]])[0];
    leoHead(C, { x: hd[0], y: hd[1], s, r: (o.r || 0) + (o.headTilt || 0), flip: o.flip, view: 'front', expr: o.expr, look: o.look, seed: sd + 300, hair: o.hair, hairCol: o.hairCol, freckles: o.freckles });
    return;
  }
  const sk = SIDE[pose] || SIDE.stand;
  const { H, N } = sk;
  const u = nrm([N[0] - H[0], N[1] - H[1]]), f = [-u[1], u[0]];   // f points forward (+x when upright)
  const wS = 26, wH = 27;
  // far arm, far leg
  const farArm = sk.arms[0], nearArm = sk.arms[1];
  limb(farArm, 15, skinF(sd + 60), sd + 61); hand(farArm[2], sd + 62);
  if (o.jacket) part(C, P(tube(curve([farArm[0], farArm[1], lp2(farArm[1], farArm[2], 0.78)], 4), 22)), { ...jackF, seed: sd + 63 }, jackL(sd + 64));
  else part(C, P(tube([farArm[0], lp2(farArm[0], farArm[1], 0.55)], 24)), { ...shirtF, seed: sd + 63 }, lo(sd + 64, { w: 6 }));
  const legShoe = (lg, i) => { limb(lg, 18, skinF(sd + 40 + i), sd + 42 + i); const a = lg[1], b = lg[2]; const d = nrm([b[0] - a[0], b[1] - a[1]]); const fx = d[1] > 0.5 ? 1 : 0.6; part(C, P(ellipse(b[0] + 10 * fx, b[1] + 4, 20, 11, 20, 0, Math.PI * 2, Math.atan2(d[1], d[0]) - Math.PI / 2)), { ...shoeF, seed: sd + 44 + i }, lo(sd + 46 + i, { w: 5.5 })); };
  legShoe(sk.legs[0], 0);
  // backpack (behind the back)
  if (o.pack !== false) {
    const c = ad(lp2(H, N, 0.58), f, -wS - 14);
    const pk = smooth([ad(ad(c, u, 40), f, -16), ad(ad(c, u, 44), f, 14), ad(ad(c, u, -38), f, 16), ad(ad(c, u, -40), f, -18)], 3);
    part(C, P(pk), packF, lo(sd + 48));
    line(C.l, P([ad(ad(c, u, 10), f, -18), ad(ad(c, u, 10), f, 4)]), lo(sd + 49, { w: 4, p: 0.8 }));
  }
  legShoe(sk.legs[1], 1);
  // shorts, shirt
  const shorts = smooth([ad(ad(H, f, wH * 0.98), u, 12), ad(ad(H, f, wH * 1.04), u, -34), ad(ad(H, f, -wH * 1.04), u, -34), ad(ad(H, f, -wH * 0.98), u, 12)], 3);
  part(C, P(shorts), shortsF, lo(sd + 50));
  const shirt = smooth([ad(ad(N, f, wS * 0.55), u, 2), ad(ad(N, f, wS), u, -10), ad(ad(H, f, wH), u, 14), ad(ad(H, f, wH * 1.04), u, -6), ad(ad(H, f, -wH * 1.04), u, -6), ad(ad(H, f, -wH), u, 14), ad(ad(N, f, -wS), u, -10), ad(ad(N, f, -wS * 0.55), u, 2)], 3);
  part(C, P(shirt), shirtF, lo(sd + 52));
  if (o.jacket) part(C, P(smooth([ad(ad(N, f, wS * 0.6), u, 4), ad(ad(N, f, wS + 4), u, -10), ad(ad(H, f, wH + 4), u, 8), ad(ad(H, f, wH + 5), u, -12), ad(ad(H, f, -wH - 5), u, -12), ad(ad(H, f, -wH - 4), u, 8), ad(ad(N, f, -wS - 4), u, -10), ad(ad(N, f, -wS * 0.6), u, 4)], 3)), jackF, jackL(sd + 54));
  // strap over the shoulder
  if (o.pack !== false && !o.jacket) line(C.l, P(curve([ad(N, f, -10), ad(ad(N, f, 8), u, -6), ad(lp2(N, H, 0.5), f, 12)])), lo(sd + 56, { w: 6, col: K.yellow, p: 0.95 }));
  // near arm
  limb(nearArm, 15, skinF(sd + 66), sd + 67); hand(nearArm[2], sd + 68);
  if (o.jacket) part(C, P(tube(curve([nearArm[0], nearArm[1], lp2(nearArm[1], nearArm[2], 0.78)], 4), 22)), { ...jackF, seed: sd + 69 }, jackL(sd + 70));
  else part(C, P(tube([nearArm[0], lp2(nearArm[0], nearArm[1], 0.55)], 24)), { ...shirtF, seed: sd + 69 }, lo(sd + 70, { w: 6 }));
  const hd = P([sk.Hd])[0];
  leoHead(C, { x: hd[0], y: hd[1], s, r: (o.r || 0) * (o.flip ? -1 : 1) * 0 + (o.r || 0) + (o.headTilt || 0) * (o.flip ? -1 : 1), flip: o.flip, view: 'side', expr: o.expr, look: o.look, seed: sd + 300, hair: o.hair, hairCol: o.hairCol, freckles: o.freckles });
}

// ————————————————————————— the lady —————————————————————————
// o: x, y, s, flip, pose 'sit'|'front:stand'|'front:wave0'|'front:wave1'|'front:clap'|'front:laugh', expr, seed
export function lady(C, o) {
  const T = T0(o), P = pts => T(pts), sd = o.seed || 600, s = o.s || 1;
  const pose = o.pose || 'sit';
  const dressF = { col: K.sky, p: 0.72, gap: 10, w: 12, ang: 0.5, seed: sd + 1 };
  const shoeF = { col: K.brown, p: 0.85, gap: 6, w: 8, seed: sd + 3 };
  const limb = (pts, w, s2) => part(C, P(tube(curve(pts, 5), w)), skinF(s2), lo(s2 + 1));
  const hand = (c, s2) => part(C, P(handCircle(c[0], c[1], 11, s2, 0, 18)), skinF(s2), lo(s2, { w: 5.5 }));
  if (pose === 'sit') {   // reclining in the deckchair, facing +x
    limb([[-24, -104], [40, -126], [64, -42], [70, -12]], 20, sd + 10);
    part(C, P(ellipse(80, -8, 20, 10, 18)), shoeF, lo(sd + 12, { w: 5 }));
    limb([[-18, -100], [50, -118], [80, -40], [88, -10]], 20, sd + 14);
    part(C, P(ellipse(98, -6, 20, 10, 18)), { ...shoeF, seed: sd + 16 }, lo(sd + 17, { w: 5 }));
    const dress = smooth([[-70, -226], [-44, -238], [-24, -212], [-6, -160], [30, -140], [62, -142], [70, -116], [52, -96], [0, -88], [-34, -84], [-56, -112], [-72, -176]], 3);
    part(C, P(dress), dressF, lo(sd + 20));
    [[-50, -190], [-30, -150], [10, -116], [44, -120], [-52, -130]].forEach(([x, y], i) => dab(C.f, ...P([[x, y]])[0], 5 * s, { col: K.white, p: 1, seed: sd + 22 + i, gap: 2.4, w: 3.5 }));
    const arm = o.armUp ? [[-44, -214], [-6, -232], [22, -262]] : [[-44, -214], [-14, -168], [22, -136]];
    limb(arm, 16, sd + 30); hand(arm[2], sd + 32);
    const hd = P([[-56, -282]])[0];
    ladyHead(C, { x: hd[0], y: hd[1], s, r: (o.r || 0) + (o.headTilt || 0) * (o.flip ? -1 : 1), flip: o.flip, view: o.headView || 'side', expr: o.expr, look: o.look, seed: sd + 300 });
    return;
  }
  // standing, front view
  const sub = pose.split(':')[1] || 'stand';
  [[[-18, -130], [-19, -70], [-20, -10]], [[18, -130], [19, -70], [20, -10]]].forEach((lg, i) => { limb(lg, 19, sd + 40 + i * 3); part(C, P(ellipse(lg[2][0], lg[2][1] + 4, 16, 10, 18)), { ...shoeF, seed: sd + 46 + i }, lo(sd + 48 + i, { w: 5 })); });
  const dress = smooth([[-22, -290], [22, -290], [52, -276], [60, -230], [80, -110], [-80, -110], [-60, -230], [-52, -276]], 3);
  part(C, P(dress), dressF, lo(sd + 50));
  [[-30, -250], [24, -236], [-44, -170], [10, -190], [44, -150], [-10, -140], [-60, -128], [56, -124]].forEach(([x, y], i) => dab(C.f, ...P([[x, y]])[0], 5 * s, { col: K.white, p: 1, seed: sd + 52 + i, gap: 2.4, w: 3.5 }));
  const ph = sub === 'wave1';
  const arms = {
    stand: [[[-50, -272], [-64, -220], [-66, -170]], [[50, -272], [64, -220], [66, -170]]],
    wave0: [[[-50, -272], [-64, -220], [-66, -170]], [[50, -272], [82, -310], [86, -364]]],
    wave1: [[[-50, -272], [-64, -220], [-66, -170]], [[50, -272], [84, -306], [108, -352]]],
    clap:  [[[-50, -272], [-56, -220], [-10, -236]], [[50, -272], [56, -220], [10, -236]]],
    laugh: [[[-50, -272], [-70, -230], [-30, -196]], [[50, -272], [70, -230], [30, -196]]],
    point: [[[-50, -272], [-64, -220], [-66, -170]], [[50, -272], [96, -262], [140, -250]]],
  }[sub] || [[[-50, -272], [-64, -220], [-66, -170]], [[50, -272], [64, -220], [66, -170]]];
  void ph;
  arms.forEach((a, i) => { limb(a, 16, sd + 60 + i * 3); hand(a[2], sd + 66 + i); part(C, P(tube([a[0], lp2(a[0], a[1], 0.5)], 28)), { ...dressF, seed: sd + 68 + i }, lo(sd + 70 + i, { w: 6 })); });
  const hd = P([[0, -346]])[0];
  ladyHead(C, { x: hd[0], y: hd[1], s, r: (o.r || 0) + (o.headTilt || 0), flip: o.flip, view: 'front', expr: o.expr, look: o.look, seed: sd + 300, hair: o.hair, hairCol: o.hairCol, freckles: o.freckles });
}

// The deckchair: wooden frame + red-and-pink striped canvas (facing +x, origin on the ground at its middle)
export function deckchair(C, o) {
  const T = T0(o), P = pts => T(pts), sd = o.seed || 900;
  const wood = { col: K.brown, p: 0.85, gap: 6, w: 8, ang: 1.2, seed: sd };
  line(C.l, P([[-130, 0], [-76, -286]]), lo(sd + 1, { w: 9, col: K.brown, p: 0.95 }));
  line(C.l, P([[110, 0], [36, -118]]), lo(sd + 2, { w: 9, col: K.brown, p: 0.95 }));
  line(C.l, P([[-120, -60], [80, -60]]), lo(sd + 3, { w: 7, col: K.brown, p: 0.9 }));
  const front = [[-94, -306], [-74, -236], [-50, -170], [-26, -118], [0, -98], [70, -108]];
  const back = [[-132, -300], [-112, -230], [-88, -160], [-62, -110], [-22, -76], [72, -86]];
  const canvas = [...front, ...back.slice().reverse()];
  part(C, P(canvas), { col: K.red, p: 0.8, gap: 8, w: 10, ang: 1.1, seed: sd + 4 }, lo(sd + 5, { w: 6 }));
  [0.33, 0.67].forEach((u, k) => line(C.f, P(front.map((f, i) => [lerp(f[0], back[i][0], u), lerp(f[1], back[i][1], u)])), { w: 10, col: K.pink, p: 0.95, seed: sd + 10 + k, boil: 0.5 }));
  void wood;
}

// ————————————————————————— animals —————————————————————————
// rabbit: o.pose 'sit'|'hop'|'sniff', facing +x
export function rabbit(C, o) {
  const T = T0(o), P = pts => T(pts), sd = o.seed || 700, s = o.s || 1;
  const furF = { col: K.brown, p: 0.62, gap: 8, w: 10, ang: 0.6, seed: sd };
  const pose = o.pose || 'sit';
  const hop = pose === 'hop', sniff = pose === 'sniff';
  const by = hop ? -30 : 0;
  part(C, P(ellipse(-30, -38 + by, 46, 36, 30, 0, Math.PI * 2, hop ? -0.2 : 0)), furF, lo(sd + 1));
  part(C, P(handCircle(-74, -40 + by, 13, sd + 2, 0, 16)), { col: K.white, p: 1, gap: 4, w: 6, seed: sd + 3 }, lo(sd + 4, { w: 5 }));
  part(C, P(ellipse(hop ? 4 : 0, -10 + by, 24, 9, 16)), { ...furF, seed: sd + 5 }, lo(sd + 6, { w: 5 }));
  const hx = sniff ? 30 : 18, hy = sniff ? -30 : -70;
  const tw = sniff && o.twitch ? 3 : 0;
  [[-8, -0.25], [6, 0.15]].forEach(([dx, rot], i) => {
    const ear = ellipse(hx - 6 + dx, hy - 48 + (sniff ? 18 : 0), 9, 30, 18, 0, Math.PI * 2, rot + (sniff ? 0.9 : 0));
    part(C, P(ear), { ...furF, seed: sd + 7 + i }, lo(sd + 9 + i, { w: 5 }));
    part(C, P(ellipse(hx - 6 + dx, hy - 46 + (sniff ? 18 : 0), 3.5, 18, 12, 0, Math.PI * 2, rot + (sniff ? 0.9 : 0))), { col: K.pink, p: 0.8, gap: 3, w: 4, seed: sd + 11 + i }, null);
  });
  part(C, P(ellipse(hx, hy, 28, 24, 24)), { ...furF, seed: sd + 13 }, lo(sd + 14));
  eyeAt(C, P, hx + 10, hy - 6, 'dot', sd + 15, s);
  dab(C.l, ...P([[hx + 27 + tw, hy + 4]])[0], 4.5 * s, { col: K.pink, p: 0.95, seed: sd + 16 });
  [[0, -4], [0, 4]].forEach(([, dy], i) => line(C.l, P([[hx + 26, hy + 5 + dy * 0.5], [hx + 46 + tw, hy + 2 + dy * 2]]), lo(sd + 17 + i, { w: 2.5, p: 0.7 })));
}
export function tortoise(C, o) {
  const T = T0(o), P = pts => T(pts), sd = o.seed || 800;
  [[-30, -4], [26, -4]].forEach(([x, y], i) => part(C, P(ellipse(x, y, 11, 9, 14)), { col: K.green, p: 0.75, gap: 4, w: 6, seed: sd + i }, lo(sd + 2 + i, { w: 4.5 })));
  const hx = o.head ?? 1;
  part(C, P(ellipse(52 + 8 * hx, -16, 16, 12, 18)), { col: K.green, p: 0.75, gap: 4, w: 6, seed: sd + 4 }, lo(sd + 5, { w: 5 }));
  eyeAt(C, P, 58 + 8 * hx, -20, 'dot', sd + 6, 0.6);
  const shell = ellipse(0, -12, 54, 40, 30, Math.PI, Math.PI * 2);
  part(C, P([...shell, [54, -6], [-54, -6]]), { col: K.green, p: 0.85, gap: 7, w: 9, seed: sd + 7, cross: true, crossP: 0.4 }, lo(sd + 8));
  [[-26, -24], [0, -38], [26, -24], [-6, -16]].forEach(([x, y], i) => line(C.l, P(handCircle(x, y, 11, sd + 10 + i, 0.05, 14)), lo(sd + 14 + i, { w: 3.5, col: K.ochre, p: 0.95 })));
}
export function duck(C, o) {
  const T = T0(o), P = pts => T(pts), sd = o.seed || 850, s = o.s || 1;
  const yF = { col: K.yellow, p: 0.9, gap: 6, w: 8, seed: sd };
  part(C, P(smooth([[-34, -2], [-36, -26], [-10, -34], [20, -28], [34, -10], [26, 4], [-20, 6]], 4)), yF, lo(sd + 1));
  part(C, P(handCircle(16, -48, 18, sd + 2, 0, 18)), { ...yF, seed: sd + 3 }, lo(sd + 4));
  part(C, P([[30, -50], [46, -46], [30, -40]]), { col: K.orange, p: 0.95, gap: 3, w: 5, seed: sd + 5 }, lo(sd + 6, { w: 4 }));
  eyeAt(C, P, 22, -54, 'dot', sd + 7, s * 0.6);
  line(C.l, P([[-16, -18], [0, -10], [12, -18]]), lo(sd + 8, { w: 4, col: K.orange, p: 0.8 }));
}

// Edo, Leo's best friend: dark curly hair, freckles, a sky-blue shirt with number 7, no backpack
export const EDO = { hair: 'curly', hairCol: K.ink, freckles: true, shirt: K.sky, shorts: K.ink, pack: false, seed: 3400 };
export function edo(C, o) { leo(C, { ...EDO, ...o }); }
