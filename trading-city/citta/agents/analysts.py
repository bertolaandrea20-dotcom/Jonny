"""Il team degli analisti (Market, Social/Sentiment, News, Fundamentals).

Ognuno legge i propri dati e scrive un rapporto con un segnale in [-1, 1]
e una confidenza in [0, 1]. Lo stile del genoma cambia il modo di leggere i
grafici: momentum, mean reversion o breakout.
"""

from __future__ import annotations

import math

import numpy as np

from ..genome import Genome
from ..market import indicators as ind
from .base import Step, clamp, fmt_pct


def market_analyst(sym: str, closes: np.ndarray, g: Genome) -> Step:
    if len(closes) < max(g.slow_ma, g.rsi_period) + 2:
        return Step("Market Analyst", "analisti", f"Storico insufficiente su {sym}.", 0.0, 0.0)
    p = float(closes[-1])
    vol = ind.volatility(closes) or 1e-4
    fast, slow = ind.sma(closes, g.fast_ma), ind.sma(closes, g.slow_ma)
    r = ind.rsi(closes, g.rsi_period)
    m_line, m_sig = ind.macd(closes)
    lo, mid, hi = ind.bollinger(closes)
    ch_lo, ch_hi = ind.channel(closes, g.slow_ma)
    trend = (fast - slow) / slow / (vol * math.sqrt(g.slow_ma))
    data = {"prezzo": round(p, 6), f"SMA{g.fast_ma}": round(fast, 6), f"SMA{g.slow_ma}": round(slow, 6),
            "RSI": round(r, 1), "MACD": round(m_line - m_sig, 6), "volatilità": round(vol, 5),
            "Bollinger": [round(lo, 6), round(hi, 6)]}

    if g.style == "momentum":
        sig = clamp(0.7 * math.tanh(trend) + 0.3 * math.tanh((m_line - m_sig) / (p * vol)))
        txt = (f"Trend {'rialzista' if fast > slow else 'ribassista'}: SMA{g.fast_ma} {fast:.4g} vs "
               f"SMA{g.slow_ma} {slow:.4g}. MACD {'sopra' if m_line > m_sig else 'sotto'} il segnale. "
               f"RSI {r:.0f}. Leggo il momentum: seguo la direzione.")
    elif g.style == "mean_reversion":
        band = (p - mid) / ((hi - lo) / 2 or 1)
        rsi_sig = 1.0 if r < g.rsi_low else -1.0 if r > g.rsi_high else (50 - r) / 50
        sig = clamp(0.6 * rsi_sig - 0.4 * band)
        stato = "ipervenduto" if r < g.rsi_low else "ipercomprato" if r > g.rsi_high else "neutro"
        txt = (f"RSI {r:.0f} ({stato}, soglie {g.rsi_low}/{g.rsi_high}). Prezzo a {band:+.2f} bande "
               f"dal centro di Bollinger. Scommetto sul ritorno alla media.")
    else:
        if p > ch_hi:
            sig, stato = clamp(0.5 + (p / ch_hi - 1) / vol / 4), "rottura al rialzo"
        elif p < ch_lo:
            sig, stato = clamp(-0.5 - (1 - p / ch_lo) / vol / 4), "rottura al ribasso"
        else:
            sig, stato = 0.25 * math.tanh(trend), "dentro il canale"
        txt = (f"Canale {g.slow_ma} periodi: {ch_lo:.4g} – {ch_hi:.4g}, prezzo {p:.4g}: {stato}. "
               f"Entro solo sulle rotture confermate.")
    conf = min(1.0, abs(sig) * 0.8 + 0.2)
    return Step("Market Analyst", "analisti", txt, sig, conf, data)


def sentiment_analyst(sym: str, social: dict, g: Genome) -> Step:
    s = float(social.get("score", 0.0))
    sig = -s if g.contrarian else s
    mood = "euforico" if s > 0.4 else "positivo" if s > 0.1 else "depresso" if s < -0.4 else "negativo" if s < -0.1 else "tiepido"
    txt = f"Umore della folla su {sym}: {mood} ({s:+.2f}, fonte: {social.get('fonte', 'n/d')})."
    if g.contrarian:
        txt += " Da contrarian vado contro la folla."
    return Step("Social Analyst", "analisti", txt, clamp(sig), min(1.0, 0.3 + abs(s) * 0.6), social)


def news_analyst(sym: str, news: list, tick: int, g: Genome) -> Step:
    if not news:
        return Step("News Analyst", "analisti", f"Nessuna notizia rilevante su {sym} nelle ultime ore.", 0.0, 0.1)
    num = den = 0.0
    for n in news:
        w = math.exp(-(tick - n.tick) / 12)
        num += w * n.sentiment
        den += w
    sig = clamp(num / den if den else 0.0)
    top = sorted(news, key=lambda n: -abs(n.sentiment))[:3]
    lines = "; ".join(f"“{n.headline}” ({n.sentiment:+.1f})" for n in top)
    txt = f"{len(news)} notizie recenti. Le più pesanti: {lines}. Tono complessivo {sig:+.2f}."
    return Step("News Analyst", "analisti", txt, sig, min(1.0, 0.25 + 0.15 * len(news)),
                {"titoli": [n.headline for n in top]})


def fundamentals_analyst(sym: str, f: dict, g: Genome) -> Step:
    if not f:
        return Step("Fundamentals Analyst", "analisti", f"Fondamentali non disponibili per {sym}.", 0.0, 0.05)
    parts, sig = [], 0.0
    gap = f.get("sconto_premio")
    if gap is not None:
        sig += clamp(-gap * 6) * 0.6
        parts.append(f"prezzo {'sotto' if gap < 0 else 'sopra'} il valore equo di {fmt_pct(abs(gap))[1:]}")
    gr = f.get("crescita_ricavi")
    if gr is not None:
        sig += clamp(gr * 4) * 0.2
        parts.append(f"crescita {fmt_pct(gr)}")
    ad = f.get("adozione_rete")
    if ad is not None:
        sig += clamp(ad * 5) * 0.2
        parts.append(f"adozione rete {fmt_pct(ad)}")
    pe = f.get("pe")
    if pe:
        sig += clamp((20 - pe) / 20) * 0.1
        parts.append(f"P/E {pe:.1f}")
    de = f.get("debito_equity")
    if de is not None:
        sig -= clamp((de - 1.0) / 2) * 0.1
        parts.append(f"debito/equity {de:.2f}")
    txt = f"{sym}: " + ", ".join(parts) + "."
    return Step("Fundamentals Analyst", "analisti", txt, clamp(sig), 0.5, f)
