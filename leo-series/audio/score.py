"""Series score: builds an episode's music from the mood cues in its timeline (events.json 'cue' events).
Usage: .venv/bin/python films/leo-series/audio/score.py 02  →  films/leo-series/ep02/audio/score.wav
Moods: walk · mystery · sneak · silence · crunch · theme · tutti · tbc (cliffhanger, ends unresolved).
Same theme, key (F major), tempo (88 BPM) and instruments as the first film, so the series sounds like one world.
"""
import os, sys, json
import numpy as np, soundfile as sf
SER = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(SER, '../../..'))
sys.path.insert(0, ROOT)
from core.audio import sampler as S, pluck as P
from core.audio.sfx import SR, add, lp, limit
EP = sys.argv[1].zfill(2); HERE = os.path.join(SER, '..', f'ep{EP}', 'audio')
E = json.load(open(os.path.join(HERE, 'events.json'))); DUR = E['dur']; N = int(DUR * SR)
S.seed(int(EP) * 7 + 3); rng = np.random.default_rng(int(EP))
BEAT = 60 / 88
mix = np.zeros((N, 2), np.float32)
def put(x, t, g=1.0, pan=0.0):
    if 0 <= t < DUR: add(mix, np.asarray(x, np.float32), t, g, pan)
def note(inst, t, p, d, vel=.6, pan=0., g=1.0, **kw): put(S.note(inst, p, d, vel, **kw), t, g, pan)
def mb(t, p, vel=.62, pan=.1, g=1.1): put(P.pluck('music_box', p, None, vel), t, g, pan)
def kal(t, p, vel=.42, pan=-.2): put(P.pluck('kalimba', p, None, vel), t, 1.0, pan)
def pizz(t, p, vel=.55): put(P.pluck('upright_bass_pizz', p, None, vel), t, 0.9, -0.1)
def toy(t, p, vel=.7):
    m = S.midi(p); f0 = 440 * 2 ** ((m - 69) / 12) * 2 ** (rng.uniform(-8, 8) / 1200)
    tt = np.arange(int(1.4 * SR)) / SR; y = np.zeros_like(tt)
    for r, a, t60 in [(1, 1.0, 1.0), (2.92, .4, .35), (5.84, .18, .16), (1.004, .3, .9)]: y += a * np.sin(2 * np.pi * f0 * r * tt) * np.exp(-6.9 * tt / t60)
    y = lp(y, 7000); y[:48] *= np.linspace(0, 1, 48); y[-480:] *= np.linspace(1, 0, 480); put(y * .1 * vel, t, 1.0, .15)

THEME = [('C5', 1), ('A4', .5), ('C5', .5), ('F5', 1), ('E5', 1), ('D5', 1.5), ('C5', .5), ('A4', 2),
         ('Bb4', 1), ('D5', .5), ('Bb4', .5), ('G4', 1), ('A4', .5), ('Bb4', .5), ('C5', 1.5), ('A4', .5), ('F4', 2)]
CH = {'F': ['F3', 'A3', 'C4', 'F4'], 'Dm': ['D3', 'F3', 'A3', 'D4'], 'Bb': ['Bb2', 'F3', 'Bb3', 'D4'], 'C': ['C3', 'G3', 'C4', 'E4'], 'C7': ['C3', 'E3', 'Bb3', 'E4']}
ROOT_ = {'F': 'F2', 'Dm': 'D2', 'Bb': 'Bb1', 'C': 'C2', 'C7': 'C2'}
PROG = ['F', 'Dm', 'Bb', 'C']
def beats(t0, t1, step=1.0):
    k = int(np.ceil(t0 / (BEAT * step) - 1e-6)); out = []
    while k * BEAT * step < t1 - 1e-3: out.append((k * BEAT * step, k)); k += 1
    return out
def chord_at(t): return PROG[int(t / (4 * BEAT)) % 4]
def theme_from(t0, t1, fn):
    t = t0
    while t < t1 - 0.05:
        for p, bt in THEME:
            if t >= t1 - 0.05: return
            fn(t, p, bt); t += bt * BEAT

def walk(t0, t1):
    for t, k in beats(t0, t1, 0.5):
        ch = chord_at(t); down = k % 2 == 0
        put(S.chord('ukulele', CH[ch] if down else CH[ch][::-1][:3], .45, .5 if down else .3, strum=.016), t, .85, -.25)
        put(S.hit('shaker', 'down' if down else 'up', .3), t, .6, .35)
        if k % 4 == 0: pizz(t, ROOT_[ch], .6)
    theme_from(t0 + 4 * BEAT, t1, lambda t, p, bt: note('recorder', t, p, bt * BEAT * .9, .55, .15))
def mystery(t0, t1, clar=True):
    pat = [('D3', 0), ('A2', 1), ('D3', 2), ('F3', 2.5), ('E3', 3)]
    bar0 = int(np.ceil(t0 / (4 * BEAT) - 1e-6)) * 4 * BEAT
    if bar0 - t0 > 0.3: note('bassoon_stac', t0 + 0.05, 'A2', .3, .55, -.05)
    t = bar0
    while t < t1 - 0.05:
        for p, bt in pat:
            if t + bt * BEAT < t1 - 0.05: note('bassoon_stac', t + bt * BEAT, p, .3, .6, -.05)
        pizz(t, 'D2', .55)
        t += 4 * BEAT
    if clar: note('clarinet', t0, 'D3', max(0.5, t1 - t0 - 0.3), .3, -.15, attack=.5, release=.6)
def crunch(t0, t1):
    for t, k in beats(t0, t1, 1.0):
        pizz(t, ['F2', 'C2', 'F2', 'A2'][k % 4], .55)
        if k % 2 == 1: put(S.hit('woodblock', 'a', .5), t, .7, .3)
    for p, bt in [('F3', 0), ('A3', 1), ('C4', 2), ('A3', 3)]: note('bassoon_stac', t0 + bt * BEAT, p, .3, .55, -.1)
    for e in E['ev']:
        if e['type'] == 'crunch' and t0 <= e['t'] < t1: toy(e['t'] + 0.05, ['C6', 'A5', 'F5', 'C5'][int((e['t'] - t0) / (2 * BEAT)) % 4], .7)
def theme(t0, t1):
    theme_from(t0, t1, lambda t, p, bt: mb(t, p))
    for t, k in beats(t0, t1, 0.5):
        ch = chord_at(t); kal(t, CH[ch][1 + k % 3])
        if k % 4 == 0: pizz(t, ROOT_[ch], .45)
def tutti(t0, t1):
    walk(t0, t1)
    theme_from(t0, t1, lambda t, p, bt: (note('flute', t, p, bt * BEAT * .92, .55, .1), note('glockenspiel', t, p[:-1] + str(int(p[-1]) + 1), 1.0, .35, .3)))
def tbc(t0, t1):   # the cliffhanger: the theme's first phrase on music box, stopping on the dominant, a held C7, a question in the clarinet
    seq = [('C5', 1), ('A4', .5), ('C5', .5), ('F5', 1), ('E5', 1), ('D5', 1.5), ('E5', .5), ('G5', 2.5)]
    t = t0
    for p, bt in seq: mb(t, p, .65); t += bt * BEAT
    note('clarinet', t0 + 4 * BEAT, 'Bb3', max(1.0, t1 - t0 - 4 * BEAT - 0.3), .32, -.1, attack=.4, release=1.0)
    note('clarinet', t0 + 4 * BEAT, 'E3', max(1.0, t1 - t0 - 4 * BEAT - 0.3), .3, .1, attack=.4, release=1.0)
    pizz(t0 + 4 * BEAT, 'C2', .6)
    for i, p in enumerate(['G5', 'Bb5', 'E6']): note('glockenspiel', t0 + 4 * BEAT + 0.1 * i, p, 1.4, .35, .25)
MOODS = {'walk': walk, 'mystery': mystery, 'sneak': lambda a, z: mystery(a, z, False), 'silence': lambda a, z: None, 'crunch': crunch, 'theme': theme, 'tutti': tutti, 'tbc': tbc}
CUES = sorted([(e['t'], e['id']) for e in E['ev'] if e['type'] == 'cue'])
for i, (t0, cid) in enumerate(CUES):
    t1 = CUES[i + 1][0] if i + 1 < len(CUES) else DUR
    MOODS[cid](t0, t1)
mix = S.room(mix, size=.35, mix=.14)
# hard stop into each silence: only the reverb tail rings
for i, (t0, cid) in enumerate(CUES):
    if cid == 'silence':
        t1 = CUES[i + 1][0] if i + 1 < len(CUES) else DUR; s0, s1 = int(t0 * SR), int(t1 * SR)
        mix[s0:s1] *= np.exp(-np.arange(s1 - s0) / (0.12 * SR))[:, None]
for c in range(2): mix[:, c] = limit(mix[:, c], .9)
sf.write(os.path.join(HERE, 'score.wav'), mix.astype(np.float32), SR)
print('score', EP, round(DUR, 1), 's  peak', round(float(np.abs(mix).max()), 3), ' cues:', ', '.join(c for _, c in CUES))
