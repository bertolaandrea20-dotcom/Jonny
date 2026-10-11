"""Sorgenti di dati di mercato.

* ``SyntheticFeed``: mercato simulato con regimi, notizie e "valore equo"
  fondamentale. Serve per far vivere la città senza rischi e senza rete.
* ``RealFeed``: prezzi reali. Simboli con ``/`` (es. ``BTC/EUR``) via ccxt
  (default Kraken, accessibile dall'Italia); gli altri (es. ``ENI.MI``) via
  yfinance (Borsa Italiana e mercati esteri).
"""

from __future__ import annotations

import json
import logging
import math
import random
import urllib.request
from dataclasses import dataclass

import numpy as np

log = logging.getLogger(__name__)

POSITIVE = ["record", "rialzo", "crescita", "batte le stime", "upgrade", "accordo", "partnership",
            "utile", "acquisto", "approvazione", "beat", "surge", "growth", "upgrade", "profit", "rally"]
NEGATIVE = ["crollo", "ribasso", "perdita", "indagine", "downgrade", "multa", "taglio", "allarme",
            "hack", "causa", "miss", "plunge", "loss", "lawsuit", "downgrade", "warning", "fraud"]

GOOD_NEWS = [
    "{s}: utili sopra le attese, il mercato applaude",
    "{s}: nuova partnership strategica annunciata",
    "Upgrade degli analisti su {s}, target alzato",
    "{s}: flussi in entrata record dagli istituzionali",
    "{s}: approvazione regolamentare attesa da mesi",
]
BAD_NEWS = [
    "{s}: indagine dell'autorità di vigilanza",
    "Downgrade su {s}, gli analisti tagliano le stime",
    "{s}: perdita trimestrale peggiore del previsto",
    "{s}: allarme sulla catena di fornitura",
    "{s}: deflussi importanti, i grandi fondi vendono",
]
NEUTRAL_NEWS = [
    "{s}: volumi nella media, il mercato attende",
    "{s}: conferenza stampa senza sorprese",
    "{s}: il consiglio conferma la guidance",
]


# Prezzi indicativi di partenza per la simulazione (non sono quotazioni attuali).
REFERENCE_PRICES = {"BTC/EUR": 60000, "ETH/EUR": 2500, "SOL/EUR": 150, "ENI.MI": 14, "ISP.MI": 4,
                    "UCG.MI": 40, "STLAM.MI": 10, "RACE.MI": 400}


def headline_sentiment(text: str) -> float:
    t = text.lower()
    score = sum(w in t for w in POSITIVE) - sum(w in t for w in NEGATIVE)
    return max(-1.0, min(1.0, score / 2))


@dataclass
class NewsItem:
    tick: int
    symbol: str
    headline: str
    sentiment: float


class MarketFeed:
    symbols: list[str]
    tick: int = 0

    def step(self) -> None: ...
    def price(self, symbol: str) -> float: ...
    def closes(self, symbol: str, n: int = 120) -> np.ndarray: ...
    def news(self, symbol: str, lookback: int = 24) -> list[NewsItem]: ...
    def social(self, symbol: str) -> dict: ...
    def fundamentals(self, symbol: str) -> dict: ...


# ─────────────────────────────────────────────────────────────
class _SynthAsset:
    def __init__(self, symbol: str, rng: random.Random):
        self.symbol = symbol
        crypto = "/" in symbol
        self.base_vol = rng.uniform(0.008, 0.016) if crypto else rng.uniform(0.003, 0.008)
        ref = REFERENCE_PRICES.get(symbol)
        start = ref * rng.uniform(0.9, 1.1) if ref else (rng.uniform(20, 2000) if crypto else rng.uniform(3, 300))
        self.prices = [start]
        self.fair = start * rng.uniform(0.85, 1.15)
        self.regime = rng.choice([-1, 0, 0, 1])
        self.news_drift = 0.0
        self.crowd = 0.0
        self.fund = {
            "pe": round(rng.uniform(5, 45), 1) if not crypto else None,
            "crescita_ricavi": round(rng.uniform(-0.1, 0.3), 3),
            "debito_equity": round(rng.uniform(0.1, 2.5), 2) if not crypto else None,
            "margine": round(rng.uniform(0.02, 0.35), 3) if not crypto else None,
            "adozione_rete": round(rng.uniform(-0.05, 0.2), 3) if crypto else None,
        }


class SyntheticFeed(MarketFeed):
    def __init__(self, symbols: list[str], seed: int | None = None, warmup: int = 150):
        self.rng = random.Random(seed)
        self.symbols = list(symbols)
        self.assets = {s: _SynthAsset(s, self.rng) for s in symbols}
        self._news: list[NewsItem] = []
        self.tick = 0
        for _ in range(warmup):
            self.step()
        self.tick = 0
        self._news = [NewsItem(0, n.symbol, n.headline, n.sentiment) for n in self._news[-30:]]

    def step(self) -> None:
        self.tick += 1
        for s, a in self.assets.items():
            if self.rng.random() < 0.01:
                a.regime = self.rng.choice([-1, 0, 1])
            if self.rng.random() < 0.035:
                sent = self.rng.choice([-1, -1, 0, 1, 1]) * self.rng.uniform(0.4, 1.0)
                pool = GOOD_NEWS if sent > 0.2 else BAD_NEWS if sent < -0.2 else NEUTRAL_NEWS
                self._news.append(NewsItem(self.tick, s, self.rng.choice(pool).format(s=s), round(sent, 2)))
                a.news_drift += sent * a.base_vol * 0.9
                a.fair *= 1 + sent * 0.02
            p = a.prices[-1]
            drift = a.regime * a.base_vol * 0.08 + a.news_drift
            drift += 0.004 * math.log(a.fair / p)  # ritorno verso il valore equo
            ret = drift + self.rng.gauss(0, a.base_vol)
            a.prices.append(p * math.exp(ret))
            a.news_drift *= 0.93
            a.crowd = 0.85 * a.crowd + 0.15 * (ret / a.base_vol) + self.rng.gauss(0, 0.15)
            if len(a.prices) > 2000:
                a.prices = a.prices[-1500:]
        if len(self._news) > 600:
            self._news = self._news[-400:]

    def price(self, symbol: str) -> float:
        return self.assets[symbol].prices[-1]

    def closes(self, symbol: str, n: int = 120) -> np.ndarray:
        return np.asarray(self.assets[symbol].prices[-n:], dtype=float)

    def news(self, symbol: str, lookback: int = 24) -> list[NewsItem]:
        return [n for n in self._news if n.symbol == symbol and n.tick >= self.tick - lookback]

    def social(self, symbol: str) -> dict:
        a = self.assets[symbol]
        score = max(-1.0, min(1.0, math.tanh(a.crowd / 2)))
        return {"score": round(score, 3), "post": self.rng.randint(40, 900),
                "fonte": "forum e social (simulati)"}

    def fundamentals(self, symbol: str) -> dict:
        a = self.assets[symbol]
        f = {k: v for k, v in a.fund.items() if v is not None}
        f["valore_equo"] = round(a.fair, 4)
        f["sconto_premio"] = round(a.prices[-1] / a.fair - 1, 4)
        return f


# ─────────────────────────────────────────────────────────────
class RealFeed(MarketFeed):
    """Prezzi reali: ccxt per le crypto, yfinance per azioni/ETF."""

    def __init__(self, symbols: list[str], exchange: str = "kraken", timeframe: str = "1h"):
        self.symbols = list(symbols)
        self.timeframe = timeframe
        self.tick = 0
        self._closes: dict[str, np.ndarray] = {}
        self._news: dict[str, list[NewsItem]] = {}
        self._fund: dict[str, dict] = {}
        self._fng: float | None = None
        self._ex = None
        if any("/" in s for s in symbols):
            import ccxt  # noqa: WPS433 — dipendenza opzionale

            self._ex = getattr(ccxt, exchange)({"enableRateLimit": True})
        self.step()

    def step(self) -> None:
        self.tick += 1
        for s in self.symbols:
            try:
                self._closes[s] = self._fetch_crypto(s) if "/" in s else self._fetch_stock(s)
            except Exception as exc:  # rete o simbolo non valido: teniamo l'ultimo dato
                log.warning("dati %s non aggiornati: %s", s, exc)
        if self.tick % 4 == 1:
            self._refresh_fng()

    def _fetch_crypto(self, s: str) -> np.ndarray:
        rows = self._ex.fetch_ohlcv(s, timeframe=self.timeframe, limit=200)
        return np.asarray([r[4] for r in rows], dtype=float)

    def _fetch_stock(self, s: str) -> np.ndarray:
        import yfinance as yf

        t = yf.Ticker(s)
        hist = t.history(period="30d", interval="1h")
        if s not in self._fund or self.tick % 24 == 1:
            try:
                info = t.info
                de = info.get("debtToEquity")
                self._fund[s] = {
                    "pe": info.get("trailingPE"),
                    "crescita_ricavi": info.get("revenueGrowth"),
                    "debito_equity": de / 100 if de else None,  # yfinance lo dà in percentuale
                    "margine": info.get("profitMargins"),
                    "valore_equo": info.get("targetMeanPrice"),
                }
            except Exception:
                self._fund.setdefault(s, {})
            try:
                items = []
                for n in (t.news or [])[:10]:
                    title = n.get("title") or n.get("content", {}).get("title", "")
                    if title:
                        items.append(NewsItem(self.tick, s, title, headline_sentiment(title)))
                self._news[s] = items
            except Exception:
                self._news.setdefault(s, [])
        return hist["Close"].to_numpy(dtype=float)

    def _refresh_fng(self) -> None:
        try:
            with urllib.request.urlopen("https://api.alternative.me/fng/?limit=1", timeout=10) as r:
                self._fng = float(json.load(r)["data"][0]["value"])
        except Exception:
            pass

    def price(self, symbol: str) -> float:
        c = self._closes.get(symbol)
        return float(c[-1]) if c is not None and len(c) else float("nan")

    def closes(self, symbol: str, n: int = 120) -> np.ndarray:
        c = self._closes.get(symbol)
        return c[-n:] if c is not None else np.asarray([], dtype=float)

    def news(self, symbol: str, lookback: int = 24) -> list[NewsItem]:
        return self._news.get(symbol, [])

    def social(self, symbol: str) -> dict:
        c = self.closes(symbol, 25)
        mom = float(np.tanh((c[-1] / c[0] - 1) * 20)) if len(c) > 2 else 0.0
        if "/" in symbol and self._fng is not None:
            fng = (self._fng - 50) / 50
            return {"score": round(0.6 * fng + 0.4 * mom, 3), "fonte": f"Fear & Greed {self._fng:.0f}"}
        return {"score": round(mom, 3), "fonte": "momentum come proxy dell'umore"}

    def fundamentals(self, symbol: str) -> dict:
        f = {k: v for k, v in self._fund.get(symbol, {}).items() if v is not None}
        tgt = f.get("valore_equo")
        p = self.price(symbol)
        if tgt and p == p:
            f["sconto_premio"] = round(p / tgt - 1, 4)
        return f


def make_feed(cfg) -> MarketFeed:
    if cfg.data_source == "real":
        return RealFeed(cfg.symbols, exchange=cfg.ccxt_exchange)
    return SyntheticFeed(cfg.symbols, seed=cfg.seed)
