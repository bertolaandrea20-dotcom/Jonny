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
EVERY_KEY = "__mode__"    # nella cache Kronos: "daily" (una al giorno) o "all"


def kronos_path(cache_dir: str, symbol: str, interval: str) -> Path:
    safe = symbol.replace(":", "_").replace("/", "_").replace("^", "IDX_").replace("=", "_")
    return Path(cache_dir) / f"{safe}_{interval}.pkl"


def load_kronos(cache_dir: str, symbol: str, interval: str, ts: pd.Series) -> np.ndarray | None:
    path = kronos_path(cache_dir, symbol, interval)
    if not path.exists():
        return None
    cache: dict = pickle.loads(path.read_bytes())
    mode = cache.get(EVERY_KEY, "all")
    vals = pd.Series([cache.get(t.isoformat(), np.nan) for t in ts], dtype=float)
    if mode == "daily":
        # La previsione giornaliera vale fino alla successiva (solo in avanti, max ~4 giorni).
        return vals.ffill(limit=_bars_in_days(ts, 4)).to_numpy()
    return vals.to_numpy()


def _bars_in_days(ts: pd.Series, days: int) -> int:
    per_day = ts.groupby(ts.dt.date).size().median() if len(ts) else 1
    return max(1, int(per_day * days))


def load_bias(path: str | None, ts: pd.Series) -> np.ndarray | None:
    if not path or not Path(path).exists():
        return None
    data = json.loads(Path(path).read_text())
    days = (ts - pd.Timedelta(hours=REFRESH_HOUR_UTC)).dt.date.astype(str)
    return np.array([(data.get(d) or {}).get("bias", "neutral") for d in days], dtype=object)


def load_signals(cfg, market: dict[str, pd.DataFrame]) -> tuple[dict, dict]:
    """Cache Kronos e TradingAgents per ogni strumento, allineate alle SUE candele."""
    kronos, bias = {}, {}
    for sym, d in market.items():
        k = load_kronos(cfg.kronos_cache_dir, sym, cfg.market.interval, d["timestamps"])
        if k is not None:
            kronos[sym] = k
        b = load_bias(cfg.bias_cache_files.get(sym), d["timestamps"])
        if b is not None:
            bias[sym] = b
    return kronos, bias
