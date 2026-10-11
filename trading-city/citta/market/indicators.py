"""Indicatori tecnici di base (come quelli che usa il Market Analyst di TradingAgents)."""

from __future__ import annotations

import numpy as np


def sma(x: np.ndarray, n: int) -> float:
    n = max(1, min(n, len(x)))
    return float(np.mean(x[-n:]))


def ema(x: np.ndarray, n: int) -> float:
    if len(x) == 0:
        return 0.0
    alpha = 2 / (n + 1)
    e = float(x[max(0, len(x) - 4 * n)])
    for v in x[max(0, len(x) - 4 * n):]:
        e = alpha * float(v) + (1 - alpha) * e
    return e


def rsi(x: np.ndarray, n: int = 14) -> float:
    if len(x) < n + 1:
        return 50.0
    d = np.diff(x[-(n + 1):])
    up = d[d > 0].sum() / n
    down = -d[d < 0].sum() / n
    if down == 0:
        return 100.0 if up > 0 else 50.0
    rs = up / down
    return float(100 - 100 / (1 + rs))


def macd(x: np.ndarray) -> tuple[float, float]:
    line = ema(x, 12) - ema(x, 26)
    hist = []
    for k in range(9, 0, -1):
        sub = x[: len(x) - k + 1] if k > 1 else x
        hist.append(ema(sub, 12) - ema(sub, 26))
    signal = float(np.mean(hist)) if hist else line
    return line, signal


def bollinger(x: np.ndarray, n: int = 20, k: float = 2.0) -> tuple[float, float, float]:
    w = x[-n:] if len(x) >= n else x
    mid = float(np.mean(w))
    sd = float(np.std(w))
    return mid - k * sd, mid, mid + k * sd


def volatility(x: np.ndarray, n: int = 24) -> float:
    if len(x) < 3:
        return 0.0
    r = np.diff(np.log(x[-(n + 1):]))
    return float(np.std(r))


def channel(x: np.ndarray, n: int = 20) -> tuple[float, float]:
    w = x[-(n + 1):-1] if len(x) > n else x[:-1] if len(x) > 1 else x
    return float(np.min(w)), float(np.max(w))
