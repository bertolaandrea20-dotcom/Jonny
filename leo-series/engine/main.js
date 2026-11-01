// Entry: ?ep=02 loads episodes/ep02.js (vertical 1080×1920); ?logo=a|b draws the profile picture
import { makeComp } from './gl.js';
import { BOIL } from './crayon.js';
const Q = new URLSearchParams(location.search);
const comp = makeComp(document.getElementById('gl'));
window.DUR = 1;
await Promise.all(['400 40px "Patrick Hand"', '700 40px Gaegu', '400 40px Gaegu'].map(f => document.fonts.load(f)));
if (Q.get('cover')) {
  const Cv = await import('./covers.js');
  window.render = t => { BOIL.step = 0; Cv.cover(comp, +Q.get('cover')); };
} else if (Q.get('logo')) {
  const Lg = await import('./logo.js');
  window.render = t => { BOIL.step = 0; Lg.logo(comp, t, Q.get('logo')); };
} else {
  const ep = (Q.get('ep') || '02').padStart(2, '0');
  const M = await import(`../episodes/ep${ep}.js`);
  window.DUR = M.DUR; window.EV = M.EV; window.SUBS = M.SUBS; window.TEXTS = M.TEXTS;
  window.render = t => { BOIL.step = Math.floor(t * 12 + 1e-6); M.frame(comp, t); };
}
window.READY = true;
