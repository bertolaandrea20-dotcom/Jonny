// Entry: ?test=leo|lady opens a model sheet; otherwise renders the film
import { makeComp } from './gl.js';
import { BOIL } from './crayon.js';
const Q = new URLSearchParams(location.search);
const comp = makeComp(document.getElementById('gl'));
window.DUR = 1;
const fontsToLoad = ['400 40px "Patrick Hand"', '700 40px Gaegu', '400 40px Gaegu'];
await Promise.all(fontsToLoad.map(f => document.fonts.load(f)));
const test = Q.get('test');
if (test) {
  const S = await import('./sheet2.js');
  window.render = t => { BOIL.step = Math.floor(t * 12); S.sheet2(comp, t, test); };
} else {
  const M = await import('./film.js');
  window.DUR = M.DUR; window.EV = M.EV; window.SUBS = M.SUBS; window.TEXTS = M.TEXTS;
  window.render = t => { BOIL.step = Math.floor(t * 12 + 1e-6); M.frame(comp, t); };
}
window.READY = true;
