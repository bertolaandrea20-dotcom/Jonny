# Series mix (usage: .venv/bin/python films/leo-series/audio/mix.py 02): score + material foley (crayon on paper, wet brush, cloth, wood, water) + ambience + narration → mix.wav
# Run from the library root: .venv/bin/python films/invisible-jacket/audio/mix.py
import os, sys, json
import numpy as np, soundfile as sf, soxr
from scipy.ndimage import uniform_filter1d
from scipy.signal import fftconvolve, sosfilt
SER = os.path.dirname(os.path.abspath(__file__))
EP = sys.argv[1].zfill(2)
HERE = os.path.join(SER, '..', f'ep{EP}', 'audio')
sys.path.insert(0, os.path.join(SER, '../../../core/audio'))
from sfx import SR, add, bp, lp, hp, compress, limit, brown

E = json.load(open(os.path.join(HERE, 'events.json'))); DUR = E['dur']; EV = E['ev']; N = int(DUR * SR)
tt = np.arange(N) / SR
rng = np.random.default_rng(12)
def nz(d): return rng.standard_normal(int(round(d * SR)))
def T(d): return np.arange(int(round(d * SR))) / SR
def fade(x, a=.01, b=.03):
    n = len(x); ia, ib = min(n, int(a * SR)), min(n, int(b * SR))
    if ia: x[:ia] *= np.linspace(0, 1, ia)
    if ib: x[-ib:] *= np.linspace(1, 0, ib)
    return x
def envelope(d, pts): k = np.array(pts, float); return np.interp(T(d), k[:, 0] * d, k[:, 1])

# ——— material foley ———
def crayon(d, speed=1.0, v=1.0):   # wax on paper: stick-slip grain whose density follows speed
    n = nz(d); rate = int(SR / (70 + 90 * speed))
    grain = uniform_filter1d((rng.random(len(n) // rate + 2) ** 3).repeat(rate)[:len(n)], rate // 3 + 1)
    x = bp(n, 1400 + 600 * speed, 6500, 2) * (0.35 + grain * 1.6) + bp(n, 300, 900, 1) * 0.15
    return fade(x * envelope(d, [(0, 0), (.08, 1), (.85, .9), (1, 0)]) * v * 0.22, .01, .04)
def scribble(d, rate=6.5, v=1.0):
    out = np.zeros(int(d * SR)); t = 0.0
    while t < d - 0.08:
        L = 1 / rate * (0.8 + 0.4 * rng.random()); s = crayon(min(L, d - t), 1.3, v * (0.7 + 0.3 * rng.random()))
        i = int(t * SR); out[i:i + len(s)] += s[:len(out) - i]; t += L
    return out
def write(d, v=1.0):
    out = np.zeros(int(d * SR)); t = 0.0
    while t < d - 0.1:
        L = 0.07 + 0.1 * rng.random(); s = crayon(L, 0.8, v); i = int(t * SR); out[i:i + len(s)] += s[:len(out) - i]; t += L + 0.03 * rng.random()
    return out
def paper_rustle(d=0.6, v=1.0):
    n = nz(d); cr = (rng.random(len(n)) < 0.004) * rng.standard_normal(len(n)) * 3
    return fade((hp(n, 900) * 0.25 + bp(cr, 1500, 8000)) * envelope(d, [(0, 0), (.2, 1), (1, 0)]) * v * 0.25)
def step(v=1.0, f=180):        # trainer on the pavement: soft thud + a little grit
    t = T(0.11); return fade((np.sin(2 * np.pi * f * t) * np.exp(-t / 0.025) * 0.5 + bp(nz(0.11), 900, 3500) * np.exp(-t / 0.012) * 0.35) * v * 0.4, .001, .03)
def tiptoe(i, v=1.0):         # sneaking: a tiny woodblock-like tick
    f = 1500 if i % 2 else 1250; t = T(0.06)
    return fade((np.sin(2 * np.pi * f * t) * np.exp(-t / 0.014) + bp(nz(0.06), 2000, 6000) * np.exp(-t / 0.004) * 0.4) * 0.16 * v, .0005, .02)
def kick(v=1.0): t = T(0.14); return fade((lp(nz(0.14), 1200) * np.exp(-t / 0.02) * 0.6 + np.sin(2 * np.pi * 120 * t) * np.exp(-t / 0.03) * 0.4) * 0.45 * v)
def stonehop(v=1.0): t = T(0.07); return fade((bp(nz(0.07), 1800, 5000) * np.exp(-t / 0.008) + np.sin(2 * np.pi * 900 * t) * np.exp(-t / 0.01) * 0.3) * 0.35 * v)
def roll(d, v=1.0):
    n = nz(d); g = (rng.random(len(n)) < 0.006) * rng.standard_normal(len(n)) * 2
    return fade(bp(n * 0.15 + g, 1200, 4500) * envelope(d, [(0, 1), (1, 0.3)]) * 0.2 * v, .005, .08)
def clink(v=1.0):             # stone against a metal zip: a small bright ring
    d = 0.9; t = T(d); y = np.zeros_like(t)
    for f, a, tau in [(2650, 1, .25), (4150, .6, .15), (6020, .35, .08), (3310, .4, .2)]: y += a * np.sin(2 * np.pi * f * t) * np.exp(-t / tau)
    return fade((y * 0.12 + bp(nz(d), 3000, 9000) * np.exp(-t / 0.004) * 0.3) * v, .0005, .2)
def brush(d, v=1.0):          # wet bristles across paper
    n = nz(d); wet = lp(n, 1800) * 0.5 + bp(n, 1800, 5000) * 0.18
    grain = uniform_filter1d(np.abs(rng.standard_normal(len(n))), 400) * 0.6 + 0.7
    return fade(wet * grain * envelope(d, [(0, 0), (.06, .9), (.3, 1), (.8, .85), (1, 0)]) * 0.22 * v, .03, .1)
def cloth(d=0.4, v=1.0): n = nz(d); e = np.sin(np.linspace(0, np.pi, len(n))) ** 2; return lp(bp(n, 250, 2500), 2200) * e * 0.35 * v
def zip_(d=0.6, v=1.0, up=True):
    out = np.zeros(int(d * SR)); k = 0; t = 0.0
    while t < d - 0.01:
        f = 2500 + (2000 if up else -1200) * t / d; tc = T(0.006); c = bp(np.sin(2 * np.pi * f * tc) + nz(0.006) * 0.5, 1500, 8000) * np.exp(-tc / 0.002)
        i = int(t * SR); out[i:i + len(c)] += c[:len(out) - i]; t += 0.011 + 0.004 * rng.random(); k += 1
    return fade(out * 0.18 * v)
def creak(d=0.75, v=1.0):     # the old gate
    t = T(d); f = 180 + 60 * np.sin(2 * np.pi * 1.3 * t) + 40 * t / d
    ph = 2 * np.pi * np.cumsum(f) / SR; saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
    pulses = (np.sin(2 * np.pi * 34 * t) > 0.6).astype(float)
    return fade(bp(saw, 400, 2600) * (0.4 + 0.6 * pulses) * envelope(d, [(0, 0), (.1, 1), (.8, .8), (1, 0)]) * 0.12 * v, .02, .1)
def latch(v=1.0): t = T(0.08); return fade((np.sin(2 * np.pi * 1900 * t) * np.exp(-t / 0.02) + bp(nz(0.08), 2500, 8000) * np.exp(-t / 0.005)) * 0.15 * v)
def felt(v=1.0): t = T(0.22); return fade((np.sin(2 * np.pi * 105 * t) * np.exp(-t / 0.05) * 0.7 + lp(nz(0.22), 600) * np.exp(-t / 0.03) * 0.5) * v * 0.4)
def sniff(v=1.0): t = T(0.12); return fade(bp(nz(0.12), 2500, 7000) * np.sin(np.pi * t / 0.12) * 0.12 * v)
def sigh(v=1.0):
    d = 1.3; n = nz(d); return fade((bp(n, 300, 2800) * 0.6 + bp(n, 900, 1600) * 0.4) * envelope(d, [(0, 0), (.25, 1), (.6, .7), (1, 0)]) * 0.16 * v, .05, .3)
def plop(v=1.0): t = T(0.2); x = np.sin(2 * np.pi * np.cumsum(500 + 900 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.05); return fade(x * 0.2 * v)
def whoosh(d=0.6, v=1.0): n = nz(d); return lp(bp(n, 300, 3500), 3000) * np.sin(np.linspace(0, np.pi, len(n))) ** 1.5 * 0.4 * v
def splash(v=1.0):
    d = 2.2; t = T(d); n = nz(d)
    body = lp(n, 2500) * np.exp(-t / 0.25) * 0.9 + bp(n, 2500, 9000) * np.exp(-t / 0.4) * 0.35
    thump = np.sin(2 * np.pi * 70 * t) * np.exp(-t / 0.08) * 0.7
    out = (body + thump) * 0.5 * v
    for k in range(28):     # drips falling back into the pool
        at = 0.5 + rng.random() * 1.6; i = int(at * SR); dp = plop(0.25 + 0.3 * rng.random()); out[i:i + len(dp)] += dp[:len(out) - i]
    return fade(out, .002, .3)
def squeak(v=1.0):           # rubber duck
    d = 0.32; t = T(d); f = 1100 + 500 * np.sin(np.pi * t / d)
    ph = 2 * np.pi * np.cumsum(f) / SR; x = np.sign(np.sin(ph)) * 0.5 + np.sin(ph * 2) * 0.3
    return fade(bp(x, 700, 4000) * envelope(d, [(0, 0), (.15, 1), (.8, .7), (1, 0)]) * 0.07 * v, .01, .05)
def cricket(d=1.2, v=1.0):
    out = np.zeros(int(d * SR)); t = 0
    while t < d - 0.1:
        for k in range(3):
            tc = T(0.018); c = np.sin(2 * np.pi * 4700 * tc) * np.sin(np.pi * tc / 0.018)
            i = int((t + k * 0.026) * SR); out[i:i + len(c)] += c[:len(out) - i]
        t += 0.32 + 0.1 * rng.random()
    return out * 0.05 * v
def bird(v=1.0):
    d = 0.22 + 0.1 * rng.random(); t = T(d); f0 = 2800 + 900 * rng.random()
    f = f0 + 900 * np.sin(2 * np.pi * (6 + 4 * rng.random()) * t)
    return fade(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) * 0.035 * v, .005, .02)
def lap(d, v=1.0):           # water lapping in the pool
    n = nz(d); m = 0.5 + 0.5 * np.sin(2 * np.pi * 0.45 * T(d) + 1) ** 2
    return lp(bp(n, 200, 1400), 1200) * m * 0.03 * v

def pull(v=1.0):              # a carrot pulled out of the soil: a dry rip and a soft pop
    d = 0.35; t = T(d); n = nz(d)
    rip = bp(n, 600, 3000) * envelope(d, [(0, 0), (.1, 1), (.6, .6), (1, 0)]) * 0.4
    pp = np.sin(2 * np.pi * np.cumsum(220 + 500 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.04) * 0.5
    return fade((rip + pp) * 0.5 * v)
def crunch(v=1.0):            # a bite of carrot: dense crackle with a woody body
    d = 0.3; t = T(d); n = nz(d)
    cr = (rng.random(len(n)) < 0.04) * rng.standard_normal(len(n)) * 3
    x = bp(cr + n * 0.2, 1500, 7000) * np.exp(-t / 0.08) + np.sin(2 * np.pi * 160 * t) * np.exp(-t / 0.03) * 0.3
    return fade(x * 0.35 * v, .001, .05)
def sting(v=1.0):             # a little "uh-oh": two falling notes, synthesised
    out = np.zeros(int(0.9 * SR))
    for k, f in enumerate([660, 520]):
        t = T(0.4); x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.18) * 0.12
        i = int(k * 0.22 * SR); out[i:i + len(x)] += x[:len(out) - i]
    return fade(out * v)

buf = np.zeros((N, 2)); amb = np.zeros((N, 2))
def put(x, at, g=1.0, pan=0.0, b=None): add(buf if b is None else b, np.asarray(x, float), at, g, pan)
for e in EV:
    t, ty, pan = e['t'], e['type'], e.get('pan', 0.0)
    if ty == 'paper': put(paper_rustle(0.8), t, 0.7)
    elif ty == 'scratch': put(crayon(e['dur'], 1.1), t, 0.85, pan)
    elif ty == 'write': put(write(e['dur']), t, 0.85, pan)
    elif ty == 'step': put(step(), t, 1.0, pan)
    elif ty == 'kick': put(kick(), t, 1.0, 0.0)
    elif ty == 'stonehop': put(stonehop(0.9 - 0.2 * e['i']), t, 1.0, pan)
    elif ty == 'roll': put(roll(e['dur']), t, 1.0, 0.3)
    elif ty == 'clink': put(clink(), t, 1.0, pan)
    elif ty == 'crouch': put(cloth(0.35, 0.6), t, 1.0, -0.1)
    elif ty == 'cricket': put(cricket(e['dur'], 0.8), t, 1.0, -0.4); put(cricket(e['dur'] * 0.8, 0.5), t + 0.3, 1.0, 0.5)
    elif ty == 'brush':
        d = e['dur'] + 0.25; x = brush(d, 1.4 if e.get('big') else 1.0)
        L = len(x); s = int(t * SR); pn = np.linspace(-0.6, 0.6, L)
        l, r = np.cos((pn + 1) * np.pi / 4) * 1.414, np.sin((pn + 1) * np.pi / 4) * 1.414
        e2 = min(N, s + L); buf[s:e2, 0] += (x * l)[:e2 - s]; buf[s:e2, 1] += (x * r)[:e2 - s]
    elif ty == 'cloth': put(cloth(0.45), t, 1.0, 0.0)
    elif ty == 'zip': put(zip_(e['dur'], 1.0, True), t, 1.0, 0.1)
    elif ty == 'tiptoe': put(tiptoe(e['i']), t, 1.0, pan)
    elif ty == 'creak': put(latch(), t - 0.08, 1.0, 0.3); put(creak(), t, 1.0, 0.3)
    elif ty == 'hop': put(felt(0.7), t + 0.3, 1.0, -0.3)
    elif ty == 'sniff': put(sniff(), t, 1.0, -0.3)
    elif ty == 'freeze': put(cloth(0.15, 0.4), t, 1.0, -0.2)
    elif ty == 'sigh': put(sigh(), t, 1.0, 0.3)
    elif ty == 'unzip': put(zip_(e['dur'], 1.0, False), t, 1.0, -0.2); put(cloth(0.5, 0.7), t + 0.2, 1.0, -0.2)
    elif ty == 'scribble': put(scribble(e['dur'], 7.5), t, 0.8, -0.2)
    elif ty == 'drop': put(cloth(0.35, 0.5), t, 1.0, -0.3); put(felt(0.3), t + 0.38, 1.0, -0.3)
    elif ty == 'turn': put(cloth(0.3, 0.5), t, 1.0, 0.4)
    elif ty == 'runstep': put(step(0.9, 220), t, 1.0, pan)
    elif ty == 'whoosh': put(whoosh(0.68, 0.8), t, 1.0, 0.0)
    elif ty == 'splash': put(splash(), t, 1.0, 0.0)
    elif ty == 'squeak': put(squeak(), t, 1.0, 0.4)
    elif ty == 'laugh': pass
    elif ty == 'pull': put(pull(), t, 1.0, 0.2)
    elif ty == 'crunch': put(crunch(), t, 1.0, 0.25)
    elif ty == 'hopsoft': put(felt(0.45), t, 1.0, pan)
    elif ty == 'plop': put(plop(0.8), t, 1.0, -0.3)
    elif ty == 'sting': put(sting(0.8), t, 1.0, 0.0)
    elif ty == 'puff': n = nz(0.3); put(lp(n, 900) * np.sin(np.linspace(0, np.pi, len(n))) ** 2 * 0.25, t, 1.0, pan)

# ——— ambience: street birds, the hush of the hedge, the garden (starts early under the gate: J-cut) ———
CUES = sorted([(e['t'], e['id']) for e in EV if e['type'] == 'cue'])
SILENT = [(t0, (CUES[i + 1][0] if i + 1 < len(CUES) else DUR)) for i, (t0, cid) in enumerate(CUES) if cid == 'silence']
sky = np.zeros(N)
for t0 in np.arange(0.6, DUR, 1.9):
    if any(a <= t0 < z for a, z in SILENT): continue
    x = bird(0.9 if t0 > 25 else 0.6); i = int((t0 + rng.random() * 0.8) * SR)
    if i >= N: continue
    k = min(len(x), N - i); sky[i:i + k] += x[:k]
amb[:, 0] += sky * 0.9; amb[:, 1] += np.roll(sky, 700) * 0.9
water = lap(DUR) * 0.8
amb[:, 0] += water; amb[:, 1] += np.roll(water, 1500)
air = hp(nz(DUR), 3000) * 0.0025
amb[:, 0] += air; amb[:, 1] += np.roll(air, 2000)
air2 = lp(brown(DUR), 300) * 0.006
amb[:, 0] += air2; amb[:, 1] += air2

# ——— narration: high-pass → compress → warm EQ → de-ess → RMS match → close warm reverb ———
def biquad(x, kind, f0, gain_db, q=0.707):
    A = 10 ** (gain_db / 40); w = 2 * np.pi * f0 / SR; cw, sw = np.cos(w), np.sin(w); al = sw / (2 * q)
    if kind == 'peak': b = [1 + al * A, -2 * cw, 1 - al * A]; a = [1 + al / A, -2 * cw, 1 - al / A]
    else:
        s2 = 2 * np.sqrt(A) * al; sg = 1 if kind == 'high' else -1
        b = [A * ((A + 1) + sg * (A - 1) * cw + s2), -2 * sg * A * ((A - 1) + sg * (A + 1) * cw), A * ((A + 1) + sg * (A - 1) * cw - s2)]
        a = [(A + 1) - sg * (A - 1) * cw + s2, 2 * sg * ((A - 1) - sg * (A + 1) * cw), (A + 1) - sg * (A - 1) * cw - s2]
    return sosfilt(np.array([b + a]) / a[0], x)
def deess(x, lo=4800, hi=10000, thr_rel=0.5, ratio=4.0):
    band = bp(x, lo, hi, 2); eb = uniform_filter1d(np.abs(band), int(0.004 * SR)); ef = uniform_filter1d(np.abs(x), int(0.004 * SR))
    over = eb / (ef * thr_rel + 1e-9); g = np.where(over > 1, over ** (1 / ratio - 1), 1.0); g = uniform_filter1d(g, int(0.003 * SR))
    return x - band + band * g
VO_RMS = 10 ** (-21.0 / 20)
vo = np.zeros((N, 2)); vmask = np.zeros(N)
for e in [x for x in EV if x['type'] == 'voice']:
    a, sr = sf.read(os.path.join(HERE, 'voices', e['id'] + '.wav'))
    if a.ndim > 1: a = a.mean(1)
    a = soxr.resample(a, sr, SR); a = hp(a, 75)
    a = compress(a / (np.abs(a).max() + 1e-9) * 0.8, thr=.2, ratio=2.5, att=.008, rel=.14)
    a = biquad(a, 'low', 220, 1.5); a = biquad(a, 'peak', 3200, -2.0, 1.0); a = biquad(a, 'high', 6000, -4.0)
    a = deess(a)
    act = np.abs(a) > np.abs(a).max() * 0.05
    a = a * VO_RMS / (np.sqrt(np.mean(a[act] ** 2)) + 1e-9)
    add(vo, a, e['t'], 1.0, 0.0); s = int(e['t'] * SR); vmask[s:s + len(a)] = 1
def warm_ir(seed):
    r = np.random.default_rng(seed); L = int(0.9 * SR); ir = np.zeros(L); pd = int(0.012 * SR)
    for ms, g in [(7, .5), (11, .38), (17, .3), (23, .22), (31, .16)]: ir[pd + int((ms + r.uniform(-1, 1)) * SR / 1000)] += g * r.choice([-1, 1])
    tt_ = np.arange(L - pd) / SR; tail = r.standard_normal(L - pd) * np.exp(-tt_ / 0.11) * np.clip(tt_ / 0.02, 0, 1) * 0.35
    ir[pd:] += lp(tail, 3200); return lp(ir, 5000)
dry = vo.copy()
for c in range(2):
    wet = fftconvolve(dry[:, c], warm_ir(31 + c), 'full')[:N]
    vo[:, c] += wet * (10 ** (-17 / 20)) / (np.sqrt(np.mean(wet ** 2)) / (np.sqrt(np.mean(dry[:, c] ** 2)) + 1e-12) + 1e-12)

# ——— score: ducks ~7 dB under narration; up 3 dB on the wordless garden bars and the splash ———
m, msr = sf.read(os.path.join(HERE, 'score.wav'))
if msr != SR: m = soxr.resample(m, msr, SR)
mus = np.zeros((N, 2)); L = min(N, len(m)); mus[:L] = m[:L]
for c in range(2): mus[:, c] += bp(mus[:, c], 3000, 7000, 2) * 0.3       # sheen on music box and glockenspiel
duck = np.clip(uniform_filter1d(vmask, int(0.25 * SR)) * 1.6, 0, 1)
mus *= (1 - duck * (1 - 10 ** (-11 / 20)))[:, None]
buf *= (1 - duck * (1 - 10 ** (-5 / 20)))[:, None]

mix = mus * 1.4 + buf * 1.0 + amb * 1.0 + vo * 1.55
for c in range(2): mix[:, c] = limit(mix[:, c], .95)
sf.write(os.path.join(HERE, 'mix.wav'), mix.astype(np.float32), SR)
def db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
for name, x in [('music', mus * 1.4), ('foley', buf), ('amb', amb), ('voice', vo), ('mix', mix)]: print(f'{name:6s} RMS {db(x):6.1f} dB  peak {20*np.log10(np.abs(x).max()+1e-9):6.1f}')
dur = json.load(open(os.path.join(HERE, 'voices', 'dur.json')))
for e in [x for x in EV if x['type'] == 'voice']:
    s = int(e['t'] * SR); L = int(dur[e['id']] * SR); bed = mus[s:s + L] * 1.4 + buf[s:s + L] + amb[s:s + L]
    print(f'  {e["id"]:4s} vo {db(vo[s:s+L]*1.55):6.1f}  bed {db(bed):6.1f}  diff {db(vo[s:s+L]*1.55) - db(bed):5.1f} dB')
