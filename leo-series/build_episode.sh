#!/bin/sh
# Build one episode end to end:  sh films/leo-series/build_episode.sh 03
# Needs: the Lemo-Opuscar library (setup.sh deps voice music; tools/fetch.sh instruments freepats vsco2ce vcsl) and ffmpeg 7+ on PATH.
set -e
N=$(echo "$1" | sed "s/^0*//"); EP=$(printf "%02d" "$N")
SER="$(cd "$(dirname "$0")" && pwd)"; LIB="$(cd "$SER/../.." && pwd)"; cd "$LIB"
D="$SER/ep$EP"; mkdir -p "$D/audio" "$D/out"
PY=.venv/bin/python; Q="ep=$EP"; SZ=1080x1920
# 1. narration lines straight from the episode's LINES
$PY - "$SER/episodes/ep$EP.js" "$D/audio/lines.json" <<'PYEOF'
import json, re, sys
s = open(sys.argv[1]).read()
L = [(i, a or c) for i, a, c in re.findall(r"\{ id: '(n\d+)', t: [\d.]+, d: [\d.]+, text: (?:'((?:[^'\\]|\\.)*)'|\"((?:[^\"\\]|\\.)*)\") \}", s)]
json.dump([{"id": i, "text": t.replace("\\'", "'"), "voice": "af_heart", "speed": 0.9} for i, t in L], open(sys.argv[2], 'w'), indent=1)
print('lines', len(L))
PYEOF
$PY core/tts/tts.py "$D/audio/lines.json" "$D/audio/voices"
node core/render/events.mjs "$SER/engine" --size $SZ --q "$Q" --out "$D/audio/events.json"
$PY "$SER/audio/score.py" "$EP"
$PY "$SER/audio/mix.py" "$EP"
# 2. subtitles (.srt) from the voice events and the subtitle windows
$PY - "$D/audio/events.json" "$D/audio/voices/dur.json" "$D/audio/lines.json" "$D/ep$EP.srt" <<'PYEOF'
import json, sys
ev = json.load(open(sys.argv[1]))['ev']; dur = json.load(open(sys.argv[2])); lines = {l['id']: l['text'] for l in json.load(open(sys.argv[3]))}
vo = [e for e in ev if e['type'] == 'voice']
def ts(x): h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60; return f"{h:02d}:{m:02d}:{int(s):02d},{int(round((s % 1) * 1000)) % 1000:03d}"
out = []
for i, e in enumerate(vo):
    t0 = e['t'] - 0.1; t1 = max(t0 + 1.8, e['t'] + dur[e['id']] + 0.7)
    if i + 1 < len(vo): t1 = min(t1, vo[i + 1]['t'] - 0.2)
    out.append(f"{i + 1}\n{ts(t0)} --> {ts(t1)}\n{lines[e['id']]}\n")
open(sys.argv[4], 'w').write("\n".join(out)); print('srt', len(out))
PYEOF
# 3. picture, then mux to −14 LUFS
node core/render/video.mjs "$SER/engine" --size $SZ --q "$Q" --fps 24 --workers 3 --out "$D/out/video24.mp4"
CRF=26 sh styles/crayon-book/demo/tools/mux.sh "$D/out/video24.mp4" "$D/audio/mix.wav" "$D/ep$EP.mp4" 24 0
rm -rf "$D/out"
echo "done: $D/ep$EP.mp4"
