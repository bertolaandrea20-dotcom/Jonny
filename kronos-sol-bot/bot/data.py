"""Dati di mercato: candele OHLCV dall'endpoint pubblico di Binance.

Il prezzo SOL/USDT di Binance guida il prezzo sui DEX Solana, quindi è un buon feed
per decidere; l'esecuzione reale avviene su Jupiter (vedi executor.py).
"""
from __future__ import annotations

import time

import pandas as pd
import requests

BINANCE_KLINES = "https://api.binance.com/api/v3/klines"
BINANCE_PRICE = "https://api.binance.com/api/v3/ticker/price"
COLUMNS = ["timestamps", "open", "high", "low", "close", "volume", "amount"]


def interval_to_timedelta(interval: str) -> pd.Timedelta:
    unit = interval[-1]
    n = int(interval[:-1])
    return {"m": pd.Timedelta(minutes=n), "h": pd.Timedelta(hours=n), "d": pd.Timedelta(days=n)}[unit]


def _parse(rows: list) -> pd.DataFrame:
    df = pd.DataFrame(rows, columns=[
        "open_time", "open", "high", "low", "close", "volume", "close_time",
        "amount", "trades", "tb_base", "tb_quote", "ignore"])
    df["timestamps"] = pd.to_datetime(df["open_time"], unit="ms", utc=True)
    df["close_time"] = pd.to_datetime(df["close_time"], unit="ms", utc=True)
    for c in ["open", "high", "low", "close", "volume", "amount"]:
        df[c] = df[c].astype(float)
    return df


def fetch_klines(symbol: str, interval: str, limit: int = 1000,
                 end_time_ms: int | None = None, only_closed: bool = True) -> pd.DataFrame:
    params = {"symbol": symbol, "interval": interval, "limit": min(limit, 1000)}
    if end_time_ms:
        params["endTime"] = end_time_ms
    r = requests.get(BINANCE_KLINES, params=params, timeout=15)
    r.raise_for_status()
    df = _parse(r.json())
    if only_closed:
        df = df[df["close_time"] <= pd.Timestamp.now(tz="UTC")]
    return df[COLUMNS].reset_index(drop=True)


def fetch_price(symbol: str) -> float:
    """Ultimo prezzo scambiato (per stop loss / take profit tra una candela e l'altra)."""
    r = requests.get(BINANCE_PRICE, params={"symbol": symbol}, timeout=10)
    r.raise_for_status()
    return float(r.json()["price"])


def fetch_history(symbol: str, interval: str, days: int, end: pd.Timestamp | None = None,
                  extra_bars: int = 0, fetch=None) -> pd.DataFrame:
    """Scarica `days` giorni di storico che finiscono a `end` (default: adesso), paginando
    all'indietro, più `extra_bars` candele prima dell'inizio (il contesto del modello)."""
    fetch = fetch or fetch_klines
    step = interval_to_timedelta(interval)
    needed = int(pd.Timedelta(days=days) / step) + extra_bars
    frames = []
    end_ms = int(pd.Timestamp(end).timestamp() * 1000) - 1 if end is not None else None
    remaining = needed
    while remaining > 0:
        df = fetch(symbol, interval, limit=1000, end_time_ms=end_ms)
        if df.empty:
            break
        frames.append(df)
        remaining -= len(df)
        end_ms = int(df["timestamps"].iloc[0].timestamp() * 1000) - 1
        if fetch is fetch_klines:
            time.sleep(0.25)  # rispetta i rate limit
    out = pd.concat(frames).drop_duplicates("timestamps").sort_values("timestamps")
    return out.tail(needed).reset_index(drop=True)


def load_csv(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    df["timestamps"] = pd.to_datetime(df["timestamps"], utc=True)
    if "amount" not in df:
        df["amount"] = df["close"] * df["volume"]
    return df[COLUMNS].sort_values("timestamps").reset_index(drop=True)
