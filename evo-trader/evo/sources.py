"""Segnali esterni opzionali, letti SOLO da cache (nessun modello o LLM chiamato qui).

- Kronos: rendimento previsto in bps per candela, precalcolato con `evo.kronos_cache`.
- TradingAgents: bias giornaliero bullish/neutral/bearish, stesso formato di
  kronos-sol-bot/bias_cache.json (il bias del giorno D vale dalle 06:00 UTC).
"""
from __future__ import annotations

import json
import pickle
from pathlib import Path

import numpy as np
import pandas as pd

REFRESH_HOUR_UTC = 6
EVERY_KEY = "__every__"   # nella cache Kronos: una previsione ogni N candele


def kronos_path(cache_dir: str, symbol: str, interval: str) -> Path:
    return Path(cache_dir) / f"{symbol}_{interval}.pkl"


def load_kronos(cache_dir: str, symbol: str, interval: str, ts: pd.Series) -> np.ndarray | None:
    path = kronos_path(cache_dir, symbol, interval)
    if not path.exists():
        return None
    cache: dict = pickle.loads(path.read_bytes())
    every = int(cache.get(EVERY_KEY, 1))
    vals = pd.Series([cache.get(t.isoformat(), np.nan) for t in ts], dtype=float)
    # Una previsione ogni N candele vale per le N candele successive (solo in avanti).
    return vals.ffill(limit=every - 1).to_numpy() if every > 1 else vals.to_numpy()


def load_bias(path: str | None, ts: pd.Series) -> np.ndarray | None:
    if not path or not Path(path).exists():
        return None
    data = json.loads(Path(path).read_text())
    days = (ts - pd.Timedelta(hours=REFRESH_HOUR_UTC)).dt.date.astype(str)
    return np.array([(data.get(d) or {}).get("bias", "neutral") for d in days], dtype=object)
