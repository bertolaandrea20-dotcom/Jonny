"""Candele OHLCV dall'endpoint pubblico di Binance (solo dati, nessuna chiave), con cache CSV.

BINANCE_API_BASE permette di usare il mirror https://data-api.binance.vision dove
api.binance.com è bloccato per area geografica.
"""
from __future__ import annotations

import os
import time
from pathlib import Path

import pandas as pd
import requests

BASE = os.environ.get("BINANCE_API_BASE", "https://api.binance.com").rstrip("/")
COLUMNS = ["timestamps", "open", "high", "low", "close", "volume", "amount"]


def interval_to_timedelta(interval: str) -> pd.Timedelta:
    n, unit = int(interval[:-1]), interval[-1]
    return pd.Timedelta(seconds=n * {"m": 60, "h": 3600, "d": 86400}[unit])


def bars_per_year(interval: str) -> float:
    return 365 * 86400 / interval_to_timedelta(interval).total_seconds()


def fetch_klines(symbol: str, interval: str, end_ms: int | None = None, limit: int = 1000) -> pd.DataFrame:
    params = {"symbol": symbol, "interval": interval, "limit": limit}
    if end_ms:
        params["endTime"] = end_ms
    r = requests.get(f"{BASE}/api/v3/klines", params=params, timeout=20)
    r.raise_for_status()
    rows = r.json()
    df = pd.DataFrame(rows, columns=["open_time", "open", "high", "low", "close", "volume",
                                     "close_time", "amount", "n", "tb", "tq", "ig"])
    df["timestamps"] = pd.to_datetime(df["open_time"], unit="ms", utc=True)
    df["close_time"] = pd.to_datetime(df["close_time"], unit="ms", utc=True)
    for c in COLUMNS[1:]:
        df[c] = df[c].astype(float)
    df = df[df["close_time"] <= pd.Timestamp.now(tz="UTC")]   # solo candele chiuse
    return df[COLUMNS].reset_index(drop=True)


def fetch_history(symbol: str, interval: str, start: pd.Timestamp, end: pd.Timestamp) -> pd.DataFrame:
    frames, end_ms = [], int(end.timestamp() * 1000) - 1
    while True:
        df = fetch_klines(symbol, interval, end_ms)
        if df.empty:
            break
        frames.append(df)
        if df["timestamps"].iloc[0] <= start:
            break
        end_ms = int(df["timestamps"].iloc[0].timestamp() * 1000) - 1
        time.sleep(0.2)
    out = pd.concat(frames).drop_duplicates("timestamps").sort_values("timestamps")
    return out[(out["timestamps"] >= start) & (out["timestamps"] < end)].reset_index(drop=True)


def load_market(symbols: list[str], interval: str, start: str, end: str,
                cache_dir: str = "data") -> dict[str, pd.DataFrame]:
    """Scarica (o legge dalla cache) e allinea le candele di tutti i simboli sugli stessi timestamp."""
    s, e = pd.Timestamp(start, tz="UTC"), pd.Timestamp(end, tz="UTC")
    Path(cache_dir).mkdir(parents=True, exist_ok=True)
    out = {}
    for sym in symbols:
        path = Path(cache_dir) / f"{sym}_{interval}_{s.date()}_{e.date()}.csv"
        if path.exists():
            df = pd.read_csv(path)
            df["timestamps"] = pd.to_datetime(df["timestamps"], utc=True)
        else:
            df = fetch_history(sym, interval, s, e)
            df.to_csv(path, index=False)
        out[sym] = df
    common = set.intersection(*(set(d["timestamps"]) for d in out.values()))
    return {k: d[d["timestamps"].isin(common)].reset_index(drop=True) for k, d in out.items()}
