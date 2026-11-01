"""Original score for "The Invisible Jacket": 4/4, 88 BPM, F major, 56 s.
One theme, four ways: recorder + ukulele (the walk), bassoon staccato (invisible), music box + kalimba (the garden),
everyone together (the splash). Two real silences. Instruments from the style's palette: ukulele, recorder, clarinet,
bassoon, flute, music box, kalimba, glockenspiel, toy piano, pizzicato bass, shaker. No strings, no grand piano.
Run from the library root: .venv/bin/python films/invisible-jacket/audio/score.py  →  audio/score.wav
"""
import os, sys, json
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../..'))
sys.path.insert(0, ROOT)
from core.audio import sampler as S, pluck as P
from core.audio.sfx import SR, add, lp, bp, limit

S.seed(11)
E = json.load(open(os.path.join(HERE, 'events.json')))
DUR = E['dur']; N = int(DUR * SR)
BEAT = 60 / 88; BAR = 4 * BEAT
def b(bar, beat=0.0): return (bar * 4 + beat) * BEAT
rng = np.random.default_rng(5)
ST = {k: np.zeros((N, 2), np.float32) for k in ['uke', 'lead', 'reed', 'mbox', 'glock', 'bass', 'perc', 'toy']}
def put(st, x, t, g=1.0, pan=0.0):
    if t < DUR: add(ST[st], np.asarray(x, np.float32), t, g, pan)
def note(st, inst, t, p, d, vel=.6, pan=0., g=1.0, **kw): put(st, S.note(inst, p, d, vel, **kw), t, g, pan)
def mb(t, p, vel=.65, pan=.1, g=1.0, st='mbox'): put(st, P.pluck('music_box', p, None, vel), t, g, pan)
def kal(t, p, vel=.5, pan=-.2, g=1.0): put('mbox', P.pluck('kalimba', p, None, vel), t, g, pan)
def pizz(t, p, vel=.6, g=1.0): put('bass', P.pluck('upright_bass_pizz', p, None, vel), t, g, -0.1)
def toy(t, p, vel=.7, pan=.15):   # toy piano: struck metal bars, inharmonic, slightly out of tune
    m = S.midi(p); f0 = 440 * 2 ** ((m - 69) / 12) * 2 ** (rng.uniform(-8, 8) / 1200)
    d = 1.4; tt = np.arange(int(d * SR)) / SR; y = np.zeros_like(tt)
    for r, a, t60 in [(1, 1.0, 1.0), (2.92, .4, .35), (5.84, .18, .16), (9.3, .08, .08), (1.004, .3, .9)]:
        if f0 * r < 18000: y += a * np.sin(2 * np.pi * f0 * r * tt + rng.random() * 6) * np.exp(-6.9 * tt / t60)
    y = lp(y, 7000); y[:48] *= np.linspace(0, 1, 48); y[-480:] *= np.linspace(1, 0, 480)
    put('toy', y * .1 * vel, t, 1.0, pan)

# —— the theme (4 bars): (pitch, beats) ——
THEME = [('C5', 1), ('A4', .5), ('C5', .5), ('F5', 1), ('E5', 1), ('D5', 1.5), ('C5', .5), ('A4', 2),
         ('Bb4', 1), ('D5', .5), ('Bb4', .5), ('G4', 1), ('A4', .5), ('Bb4', .5), ('C5', 1.5), ('A4', .5), ('F4', 2)]
CH = {'F': ['F3', 'A3', 'C4', 'F4'], 'Dm': ['D3', 'F3', 'A3', 'D4'], 'Bb': ['Bb2', 'F3', 'Bb3', 'D4'], 'C': ['C3', 'G3', 'C4', 'E4']}
ROOT_ = {'F': 'F2', 'Dm': 'D2', 'Bb': 'Bb1', 'C': 'C2'}
PROG = [['F', 'F'], ['Dm', 'Dm'], ['Bb', 'C'], ['F', 'F']]          # per bar: first half, second half
def theme(st, inst, start, beats_max=16, oct=0, vel=.62, pan=.1, g=1.0, plucked=None):
    t = start; acc = 0
    for p, bt in THEME:
        if acc >= beats_max: break
        q = p[:-1] + str(int(p[-1]) + oct)
        if plucked: plucked(t, q, vel)
        else: note(st, inst, t, q, bt * BEAT * 0.92, vel, pan, g)
        t += bt * BEAT; acc += bt
def strum(bar, chord, beats=(0, 1, 2, 3), vel=.5, g=1.0):
    for bt in beats:
        down = S.chord('ukulele', CH[chord], 0.5, vel * (1 if bt % 1 == 0 else .7), strum=0.018)
        put('uke', down, b(bar, bt), g, -0.25)
        up = S.chord('ukulele', CH[chord][::-1][:3], 0.3, vel * .55, strum=0.014)
        put('uke', up, b(bar, bt + 0.5), g * 0.7, -0.25)
def shaker(t0, t1, every=.5, vel=.35):
    t = t0; k = 0
    while t < t1 - 1e-3:
        put('perc', S.hit('shaker', 'down' if k % 2 == 0 else 'up', vel), t, 1.0, 0.35); t += every * BEAT; k += 1

T = {}
for e in E['ev']:
    if e['type'] == 'cue': T[e['id']] = e['t']
clink, sil1, pop, gate, sigh, sil2, off, splash = b(3), b(3, 2), b(6), b(9, 1), b(14), b(14, 1), b(15), b(18)

# A — the walk (bars 0–2): ukulele, shaker, pizz bass; the recorder starts the theme and is cut off by the clink
for bar in range(3):
    c1, c2 = PROG[bar % 4] if bar else ('F', 'F')
    strum(bar, c1, (0, 1), .5); strum(bar, c2, (2, 3), .5)
    pizz(b(bar), ROOT_[c1], .65); pizz(b(bar, 2), ROOT_[c2], .55)
shaker(b(0), clink)
theme('lead', 'recorder', b(1), beats_max=8, vel=.6, pan=.15)
# the clink itself is foley; a single low bassoon question after it, then silence 1
note('reed', 'bassoon_stac', b(3, 1), 'A2', .4, .55, -.1)
# C — the reveal (bars 4–6): a clarinet swell in the dark, glockenspiel when the jacket shows, music box as he puts it on
note('reed', 'clarinet', b(4), 'F3', BEAT * 5.5, .42, -.15, attack=.6, release=.8)
for i, p in enumerate(['F5', 'A5', 'C6', 'F6']): note('glock', 'glockenspiel', b(4, 2) + i * .09, p, 1.2, .55, .2)
note('reed', 'clarinet', b(5), 'A3', BEAT * 3.5, .38, -.15, attack=.3, release=.6)
for bt, p in [(0, 'C5'), (1, 'F5'), (2, 'A5'), (2.5, 'G5'), (3, 'F5')]: mb(b(5, bt), p, .6)
for i, p in enumerate(['C6', 'A5', 'F5', 'C5', 'A4', 'F4']): note('glock', 'glockenspiel', pop + i * .05, p, .8, .5, .3)   # vanish: a falling sparkle
# invisible hands (bar 6): sparse pizz + music box, cheeky
for bt, p in [(0.5, 'F2'), (2, 'C3'), (3, 'F2')]: pizz(b(6, bt), p, .5)
for bt, p in [(1, 'A5'), (1.5, 'C6'), (3, 'F5'), (3.5, 'E5')]: mb(b(6, bt), p, .5)
# D — the sneak (bars 7–9): bassoon staccato in D minor, pizz on the downbeats; stops on the gate creak
SNEAK = [('D3', 0), ('A2', 1), ('D3', 2), ('F3', 2.5), ('E3', 3)]
for bar in (7, 8):
    for p, bt in SNEAK: note('reed', 'bassoon_stac', b(bar, bt), p, .3, .62, -.05)
    pizz(b(bar), 'D2', .6); pizz(b(bar, 2), 'A1', .5)
for p, bt in [('D3', 0), ('F3', .5), ('A3', 1), ('Bb3', 1.5)]: note('reed', 'bassoon_stac', b(9, bt), p, .3, .6, -.05)
note('reed', 'clarinet', b(9, 1.5), 'C4', BEAT * 1.4, .35, .1, attack=.05, release=.4)
# E — the garden (bars 10–13): the theme on music box, kalimba arpeggios, a soft flute line under the second half
theme('mbox', None, b(10), plucked=lambda t, p, v: mb(t, p, v, .1, 1.1), vel=.68)
for bar in range(10, 14):
    for half in (0, 1):
        ch = PROG[(bar - 10) % 4][half]
        for i, p in enumerate(CH[ch][1:]): kal(b(bar, half * 2 + i * 0.5), p, .42)
    pizz(b(bar), ROOT_[PROG[(bar - 10) % 4][0]], .45, .8)
note('lead', 'flute', b(12), 'D5', BEAT * 3.6, .34, -.1, attack=.4, release=.5)
note('lead', 'flute', b(13), 'C5', BEAT * 3.2, .3, -.1, attack=.3, release=.6)
# F — the sigh, then silence 2 (bar 14): one low clarinet note under the sigh, nothing after
note('reed', 'clarinet', sigh, 'D3', BEAT * 1.0, .3, -.1, attack=.15, release=.4)
# G — colour comes back (bar 15): one toy-piano note per row of colour; then the hello (bar 16)
for e in E['ev']:
    if e['type'] == 'colour': toy(e['t'], ['F4', 'G4', 'A4', 'C5', 'D5', 'F5', 'A5', 'C6'][e['k']], .75)
strum(16, 'F', (0, 2), .38); strum(16, 'C', (3,), .38)
for bt, p in [(0, 'C5'), (0.5, 'A4'), (1, 'C5'), (2, 'F5')]: mb(b(16, bt), p, .55)
pizz(b(16), 'F2', .5); pizz(b(16, 2), 'C2', .45)
# H — run, jump, splash (bars 17–20)
strum(17, 'Bb', (0, 1), .5); strum(17, 'C', (2, 3), .55)
pizz(b(17), 'Bb1', .6); pizz(b(17, 2), 'C2', .6)
shaker(b(17), splash, every=.25, vel=.3)
for i, p in enumerate(['F4', 'G4', 'A4', 'Bb4', 'C5', 'D5', 'E5', 'F5']): note('lead', 'flute_stac', b(17, 1) + i * BEAT * 0.33, p, .2, .5, .1)
# the splash: everyone on the theme (2 bars), then the last two bars resolve on a long F
theme('lead', 'flute', splash, beats_max=8, vel=.6, pan=.1)
theme('glock', 'glockenspiel', splash, beats_max=8, oct=1, vel=.38, pan=.3)
theme('mbox', None, splash, beats_max=8, plucked=lambda t, p, v: mb(t, p, v, -.1, .9), vel=.6)
for bar in (18, 19):
    c1, c2 = PROG[bar - 18]
    strum(bar, c1, (0, 1), .55); strum(bar, c2, (2, 3), .55)
    pizz(b(bar), ROOT_[c1], .65); pizz(b(bar, 2), ROOT_[c2], .55)
shaker(splash, b(20), every=.5, vel=.3)
end = b(20)
strum(20, 'F', (0,), .55)
for p in ['F4', 'A4', 'C5']: note('lead', 'flute', end, p, 1.4, .4, .1, release=1.0)
note('lead', 'recorder', end, 'F5', 1.3, .4, .2, release=.8)
for i, p in enumerate(['F5', 'A5', 'C6', 'F6']): note('glock', 'glockenspiel', end + .12 * i, p, 1.5, .4, .25)
pizz(end, 'F2', .7)

# —— levels and output ——
GAIN = {'uke': .9, 'lead': 1.0, 'reed': 1.0, 'mbox': 1.15, 'glock': .9, 'bass': .9, 'perc': .7, 'toy': 1.0}
mix = np.zeros((N, 2), np.float32)
for k, x in ST.items(): mix += x * GAIN[k]
mix = S.room(mix, size=.35, mix=.14)
tt = np.arange(N) / SR
# hard stops: the clink cuts the walk, silence 1 and silence 2 are real (only reverb tails ring out)
gate_env = np.ones(N)
for a, z in [(clink + 0.05, b(3, 1) - 0.02), (b(3, 1) + 0.6, b(4) - 0.02), (sil2, off - 0.02)]:
    s0, s1 = int(a * SR), int(z * SR); gate_env[s0:s1] = np.minimum(gate_env[s0:s1], np.exp(-np.arange(s1 - s0) / (0.12 * SR)))
mix *= gate_env[:, None]
for c in range(2): mix[:, c] = limit(mix[:, c], .9)
os.makedirs(os.path.join(HERE, 'stems'), exist_ok=True)
sf.write(os.path.join(HERE, 'score.wav'), mix.astype(np.float32), SR)
print('score.wav', round(N / SR, 2), 's  peak', round(float(np.abs(mix).max()), 3))
used = ['ukulele', 'recorder', 'clarinet', 'bassoon_stac', 'flute', 'flute_stac', 'glockenspiel', 'shaker']
open(os.path.join(HERE, 'instruments_used.json'), 'w').write(json.dumps(used))
