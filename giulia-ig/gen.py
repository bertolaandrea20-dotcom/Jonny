"""Generates the Ciak! composition for giulia-ig (index.html + compositions/*.html)."""
import os, sys

OUT = sys.argv[1]
CARD = 1.0
END = 4.3
# (media_start, media_end) of the takes between the source's colour-bar interstitials
TAKES = [(0.00, 3.50), (3.90, 10.20), (10.53, 21.37), (21.77, 26.23),
         (26.57, 32.57), (33.07, 43.30), (43.70, 44.53)]
GAGS = ["BUONA LA… PROSSIMA.", "OPS.", "89. CONFERMO.", "RIPROVIAMO.",
        "VUOTO COSMICO.", "NOTIZIA BOMBA."]

def card_len(gag):
    words = len(gag.replace('…', ' ').split())
    return r(0.2 + 0.5 + 0.3 * words + 0.25)

def r(x):
    return round(x, 2)

# lay out takes and cards on the root clock
t = 0.0
segs, cards = [], []
for i, (a, b) in enumerate(TAKES):
    d = r(b - a)
    segs.append((i + 1, r(t), a, d))
    t = r(t + d)
    if i < len(GAGS):
        cards.append((i + 1, r(t), GAGS[i], card_len(GAGS[i])))
        t = r(t + card_len(GAGS[i]))
end_start = t
total = r(t + END)

SLATE_CSS = """
    #root { position: absolute; inset: 0; overflow: hidden; }
    #root .ground { position: absolute; inset: 0; background: #121110; }
    #root .slate { position: absolute; left: 130px; top: 470px; width: 820px; }
    #root .sticks { position: relative; height: 108px; }
    #root .stick { position: absolute; left: 0; width: 820px; height: 54px; border: 5px solid #f3efe6;
      background: repeating-linear-gradient(-45deg, #f3efe6 0 44px, #121110 44px 88px); }
    #root .stick-top { top: 0; transform-origin: 0% 100%; }
    #root .stick-bottom { top: 54px; }
    #root .board { position: relative; height: 520px; background: #1b1a18; border: 6px solid #f3efe6;
      color: #f3efe6; font-family: 'Oswald', sans-serif; }
    #root .row { position: absolute; left: 0; right: 0; border-bottom: 4px solid rgba(243,239,230,.85);
      display: flex; align-items: center; padding: 0 34px; }
    #root .row-prod { top: 0; height: 110px; }
    #root .row-scene { top: 110px; height: 110px; }
    #root .label { font-size: 34px; letter-spacing: .14em; opacity: .75; width: 190px; }
    #root .value { font-size: 52px; font-weight: 600; letter-spacing: .04em; }
    #root .row-ciak { top: 220px; height: 288px; border-bottom: none; }
    #root .ciak-num { font-family: 'League Gothic', sans-serif; font-size: 300px; line-height: 1;
      color: #d0202e; margin-left: 20px; }
    #root .gag { position: absolute; left: 60px; right: 60px; top: 1150px; text-align: center;
      font-family: 'League Gothic', sans-serif; font-size: 132px; line-height: 1.02; color: #f3efe6;
      letter-spacing: .01em; }
"""

def slate_markup(p, num):
    return f"""
    <div class="slate" id="{p}-slate">
      <div class="sticks">
        <div class="stick stick-top" id="{p}-top"></div>
        <div class="stick stick-bottom"></div>
      </div>
      <div class="board" id="{p}-board">
        <div class="row row-prod"><span class="label">PROD.</span><span class="value">VINTAGE PADDOCK</span></div>
        <div class="row row-scene"><span class="label">SCENA</span><span class="value">ALFA ROMEO</span></div>
        <div class="row row-ciak"><span class="label">CIAK</span><span class="ciak-num" id="{p}-num">{num}</span></div>
      </div>
    </div>"""

CLAP = 0.2  # seconds into a card when the sticks close

def card_file(n, gag):
    cid = f"ciak{n}"
    return f"""<template>
  <style>{SLATE_CSS}
  </style>
  <div id="root" data-composition-id="{cid}" data-width="1080" data-height="1920">
    <div class="ground"></div>{slate_markup(cid, n)}
    <div class="gag" id="{cid}-gag">{gag}</div>
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
    tl.fromTo("#{cid}-top", {{ rotation: -24 }}, {{ rotation: 0, duration: 0.14, ease: "power4.in" }}, {CLAP - 0.14});
    tl.fromTo("#{cid}-board", {{ y: 0 }}, {{ y: 7, duration: 0.04, ease: "none", yoyo: true, repeat: 3 }}, {CLAP});
    tl.fromTo("#{cid}-gag", {{ opacity: 0, scale: 1.14 }}, {{ opacity: 1, scale: 1, duration: 0.22, ease: "power3.out" }}, {CLAP});
    tl.fromTo("#{cid}-num", {{ scale: 1 }}, {{ scale: 1.06, duration: 0.6, ease: "none" }}, {CLAP});
    window.__timelines["{cid}"] = tl;
  </script>
</template>
"""

HOOK_DUR = 1.9
hook_file = f"""<template>
  <style>{SLATE_CSS}
    #hook-wrap {{ position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; }}
    #root .slate {{ left: 70px; top: 300px; transform-origin: 0% 0%; }}
  </style>
  <div id="root" data-composition-id="hook" data-width="1080" data-height="1920">
    <div id="hook-wrap">{slate_markup('hook', 1)}</div>
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
    tl.fromTo("#hook-slate", {{ scale: 0.62, x: 0 }}, {{ scale: 0.62, x: 0, duration: 0.01 }}, 0);
    tl.fromTo("#hook-top", {{ rotation: -26 }}, {{ rotation: 0, duration: 0.14, ease: "power4.in" }}, 0.46);
    tl.fromTo("#hook-board", {{ y: 0 }}, {{ y: 7, duration: 0.04, ease: "none", yoyo: true, repeat: 3 }}, 0.6);
    tl.to("#hook-slate", {{ x: -1200, rotation: -8, duration: 0.32, ease: "power3.in" }}, 1.5);
    window.__timelines["hook"] = tl;
  </script>
</template>
"""

end_file = f"""<template>
  <style>{SLATE_CSS}
    #root .brand {{ position: absolute; left: 0; right: 0; top: 0; bottom: 0; }}
    #root .mark {{ position: absolute; left: 60px; right: 60px; top: 640px; text-align: center;
      font-family: 'League Gothic', sans-serif; color: #f3efe6; font-size: 210px; line-height: .92; }}
    #root .mark em {{ font-style: normal; color: #d0202e; }}
    #root .handle {{ position: absolute; left: 0; right: 0; top: 1060px; text-align: center;
      font-family: 'Oswald', sans-serif; font-size: 56px; letter-spacing: .08em; color: #f3efe6; }}
    #root .cta {{ position: absolute; left: 0; right: 0; top: 1170px; text-align: center;
      font-family: 'Oswald', sans-serif; font-size: 44px; letter-spacing: .06em; color: rgba(243,239,230,.78); }}
  </style>
  <div id="root" data-composition-id="end" data-width="1080" data-height="1920">
    <div class="ground"></div>
    <div class="brand">
      <div class="mark" id="end-mark"><span id="end-w1">VINTAGE</span><br><em id="end-w2">PADDOCK</em></div>
      <div class="handle" id="end-handle">@vintage.paddock</div>
      <div class="cta" id="end-cta">Segui per il prossimo ciak</div>
    </div>{slate_markup('end', 7)}
    <div class="gag" id="end-gag">BUONA!</div>
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
    tl.fromTo("#end-top", {{ rotation: -24 }}, {{ rotation: 0, duration: 0.14, ease: "power4.in" }}, {CLAP - 0.14});
    tl.fromTo("#end-board", {{ y: 0 }}, {{ y: 7, duration: 0.04, ease: "none", yoyo: true, repeat: 3 }}, {CLAP});
    tl.fromTo("#end-gag", {{ opacity: 0, scale: 1.14 }}, {{ opacity: 1, scale: 1, duration: 0.22, ease: "power3.out" }}, {CLAP});
    tl.fromTo("#end-mark", {{ opacity: 0 }}, {{ opacity: 0, duration: 0.01 }}, 0);
    tl.fromTo("#end-handle", {{ opacity: 0 }}, {{ opacity: 0, duration: 0.01 }}, 0);
    tl.fromTo("#end-cta", {{ opacity: 0 }}, {{ opacity: 0, duration: 0.01 }}, 0);
    tl.to(["#end-slate", "#end-gag"], {{ y: 1500, duration: 0.36, ease: "power3.in" }}, 1.0);
    tl.fromTo("#end-w1", {{ opacity: 0, y: -40 }}, {{ opacity: 1, y: 0, duration: 0.01 }}, 1.36);
    tl.set("#end-mark", {{ opacity: 1 }}, 1.36);
    tl.fromTo("#end-mark", {{ scale: 1.25 }}, {{ scale: 1, duration: 0.3, ease: "power4.out" }}, 1.36);
    tl.fromTo("#end-w2", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.01 }}, 1.52);
    tl.set("#end-handle", {{ opacity: 1 }}, 1.8);
    tl.fromTo("#end-handle", {{ y: 24 }}, {{ y: 0, duration: 0.3, ease: "power3.out" }}, 1.8);
    tl.set("#end-cta", {{ opacity: 1 }}, 2.05);
    tl.fromTo("#end-cta", {{ y: 24 }}, {{ y: 0, duration: 0.3, ease: "power3.out" }}, 2.05);
    window.__timelines["end"] = tl;
  </script>
</template>
"""

# ---- root
vids, pushes, hosts, sfx = [], [], [], []
for n, st, ms, d in segs:
    vids.append(f"""      <div class="take" id="w{n}">
        <video id="take{n}" class="clip" src="assets/giulia.mp4" data-start="{st}" data-duration="{d}"
          data-media-start="{ms}" data-track-index="0" data-has-audio="true" data-volume="1"
          data-fade-in="0.04" data-fade-out="0.04" playsinline></video>
      </div>""")
    pushes.append(f'      tl.fromTo("#w{n}", {{ scale: 1 }}, {{ scale: 1.05, duration: {d}, ease: "none" }}, {st});')

hosts.append(f"""      <div id="hook" class="clip" data-composition-id="hook" data-composition-src="compositions/hook.html"
        data-start="0" data-duration="{HOOK_DUR}" data-track-index="1" data-track-kind="graphics"
        data-width="1080" data-height="1920"></div>""")
sfx.append(f'      <audio id="sfx-hook-clap" class="clip" src="assets/sfx/click.mp3" data-start="0.59" data-duration="0.37" data-track-index="3" data-volume="1"></audio>')
sfx.append(f'      <audio id="sfx-hook-out" class="clip" src="assets/sfx/whoosh-short.mp3" data-start="1.52" data-duration="0.57" data-track-index="4" data-volume="0.35"></audio>')
for n, st, gag, cl in cards:
    hosts.append(f"""      <div id="ciak{n}" class="clip" data-composition-id="ciak{n}" data-composition-src="compositions/ciak{n}.html"
        data-start="{st}" data-duration="{cl}" data-track-index="2" data-track-kind="graphics"
        data-width="1080" data-height="1920"></div>""")
    sfx.append(f'      <audio id="sfx-clap{n}" class="clip" src="assets/sfx/click.mp3" data-start="{r(st + CLAP - 0.01)}" data-duration="0.37" data-track-index="3" data-volume="1"></audio>')
hosts.append(f"""      <div id="end" class="clip" data-composition-id="end" data-composition-src="compositions/end.html"
        data-start="{end_start}" data-duration="{END}" data-track-index="2" data-track-kind="graphics"
        data-width="1080" data-height="1920"></div>""")
sfx.append(f'      <audio id="sfx-clap7" class="clip" src="assets/sfx/click.mp3" data-start="{r(end_start + CLAP - 0.01)}" data-duration="0.37" data-track-index="3" data-volume="1"></audio>')
sfx.append(f'      <audio id="sfx-end-out" class="clip" src="assets/sfx/whoosh-short.mp3" data-start="{r(end_start + 1.02)}" data-duration="0.57" data-track-index="4" data-volume="0.35"></audio>')
sfx.append(f'      <audio id="sfx-mark" class="clip" src="assets/sfx/impact-bass-1.mp3" data-start="{r(end_start + 1.37)}" data-duration="2.0" data-track-index="5" data-volume="0.4"></audio>')

index = f"""<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="assets/vendor/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #121110; }}
      #root {{ width: 100%; height: 100%; position: relative; overflow: hidden; }}
      .take {{ position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; }}
      .take video {{ position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; object-fit: cover; }}
      #hook, #end, [id^="ciak"] {{ z-index: 10; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{total}"
      data-width="1080" data-height="1920">
{chr(10).join(vids)}
{chr(10).join(hosts)}
{chr(10).join(sfx)}
    </div>
    <script>
      window.__timelines = window.__timelines || {{}};
      const tl = gsap.timeline({{ paused: true }});
{chr(10).join(pushes)}
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
"""

os.makedirs(os.path.join(OUT, "compositions"), exist_ok=True)
open(os.path.join(OUT, "index.html"), "w").write(index)
open(os.path.join(OUT, "compositions", "hook.html"), "w").write(hook_file)
open(os.path.join(OUT, "compositions", "end.html"), "w").write(end_file)
for n, st, gag, cl in cards:
    open(os.path.join(OUT, "compositions", f"ciak{n}.html"), "w").write(card_file(n, gag))
print("total", total, "end_start", end_start, "cards", [(n, st, cl) for n, st, _, cl in cards])
