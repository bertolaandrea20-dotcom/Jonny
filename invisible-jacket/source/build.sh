#!/bin/sh
# Rebuild "The Invisible Jacket" from scratch. Run from anywhere; needs the Lemo-Opuscar library (LIB) with
# `setup.sh deps voice music` and `tools/fetch.sh instruments freepats vsco2ce vcsl`, plus ffmpeg 7+ on PATH.
set -e
LIB="${LIB:-$(cd "$(dirname "$0")/../.." && pwd)}"
F="$(cd "$(dirname "$0")" && pwd)"
cd "$LIB"; PY=.venv/bin/python
$PY core/tts/tts.py "$F/audio/lines.json" "$F/audio/voices"                               # 1. narration (Kokoro af_heart)
node core/render/events.mjs "$F/page" --out "$F/audio/events.json"                       # 2. timeline → sound events
$PY "$F/audio/score.py"                                                                  # 3. original score
$PY "$F/audio/mix.py"                                                                    # 4. foley + ambience + narration + music → mix.wav
node "$F/page/subs.mjs" && $PY core/render/srt.py "$F/page/subs.json" "$F/invisible-jacket.srt"   # 5. subtitles
node core/render/video.mjs "$F/page" --fps 24 --workers 3 --out "$F/out/video24.mp4"     # 6. picture, frame by frame
CRF=26 sh styles/crayon-book/demo/tools/mux.sh "$F/out/video24.mp4" "$F/audio/mix.wav" "$F/invisible-jacket.mp4" 24 0   # 7. mux, −14 LUFS
