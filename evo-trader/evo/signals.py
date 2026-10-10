"""Segnali: posizione desiderata (-1 short, 0 flat, +1 long) a ogni candela chiusa.

Il segnale alla candela i usa solo dati fino al close di i; l'agente esegue all'apertura
della candela i+1 (nessun look-ahead).
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .genome import Genome


def _sma(x: np.ndarray, n: int) -> np.ndarray:
    return pd.Series(x).rolling(n, min_periods=n).mean().to_numpy()


def _std(x: np.ndarray, n: int) -> np.ndarray:
    return pd.Series(x).rolling(n, min_periods=n).std(ddof=0).to_numpy()


def _rsi(close: np.ndarray, n: int) -> np.ndarray:
    d = np.diff(close, prepend=np.nan)
    up = pd.Series(np.where(d > 0, d, 0.0)).ewm(alpha=1 / n, min_periods=n).mean()
    dn = pd.Series(np.where(d < 0, -d, 0.0)).ewm(alpha=1 / n, min_periods=n).mean()
    rs = up / dn.replace(0, np.nan)
    return (100 - 100 / (1 + rs)).fillna(100.0).where(up.notna()).to_numpy()


def _stateful(enter_long, exit_long, enter_short, exit_short, allow_short: bool) -> np.ndarray:
    """Macchina a stati: entra/esce in base a condizioni booleane per candela."""
    n = len(enter_long)
    pos = np.zeros(n)
    cur = 0.0
    for i in range(n):
        if cur == 1 and exit_long[i]:
            cur = 0.0
        elif cur == -1 and exit_short[i]:
            cur = 0.0
        if cur == 0:
            if enter_long[i]:
                cur = 1.0
            elif allow_short and enter_short[i]:
                cur = -1.0
        pos[i] = cur
    return pos


def raw_signal(g: Genome, bars: pd.DataFrame) -> np.ndarray:
    c = bars["close"].to_numpy(float)
    h = bars["high"].to_numpy(float)
    lo = bars["low"].to_numpy(float)
    p = g.params
    if g.family == "trend_ma":
        fast, slow = _sma(c, int(p["fast"])), _sma(c, int(p["slow"]))
        sig = np.where(fast > slow, 1.0, -1.0 if g.allow_short else 0.0)
        sig[np.isnan(slow)] = 0.0
        return sig
    if g.family == "momentum":
        n = int(p["lookback"])
        roc = c / np.roll(c, n) - 1
        roc[:n] = 0.0
        sig = np.where(roc > p["threshold"], 1.0, 0.0)
        if g.allow_short:
            sig = np.where(roc < -p["threshold"], -1.0, sig)
        return sig
    if g.family == "breakout":
        ne, nx = int(p["entry"]), int(p["exit"])
        hi_e = pd.Series(h).rolling(ne).max().shift(1).to_numpy()
        lo_e = pd.Series(lo).rolling(ne).min().shift(1).to_numpy()
        hi_x = pd.Series(h).rolling(nx).max().shift(1).to_numpy()
        lo_x = pd.Series(lo).rolling(nx).min().shift(1).to_numpy()
        with np.errstate(invalid="ignore"):
            return _stateful(c > hi_e, c < lo_x, c < lo_e, c > hi_x, g.allow_short)
    if g.family == "rsi_revert":
        r = _rsi(c, int(p["period"]))
        with np.errstate(invalid="ignore"):
            return _stateful(r < p["low"], r > 50, r > p["high"], r < 50, g.allow_short)
    if g.family == "bollinger":
        n = int(p["period"])
        mid, sd = _sma(c, n), _std(c, n)
        k = p["k"]
        with np.errstate(invalid="ignore"):
            return _stateful(c < mid - k * sd, c > mid, c > mid + k * sd, c < mid, g.allow_short)
    raise ValueError(f"famiglia sconosciuta: {g.family}")


def apply_filters(sig: np.ndarray, g: Genome, kronos_bps: np.ndarray | None,
                  bias: np.ndarray | None) -> np.ndarray:
    """Kronos e TradingAgents possono solo bloccare posizioni, mai aprirne di nuove."""
    out = sig.copy()
    if g.kronos_min_bps is not None and kronos_bps is not None:
        k = np.nan_to_num(kronos_bps, nan=0.0)   # senza previsione: nessuna conferma
        out[(out > 0) & (k < g.kronos_min_bps)] = 0.0
        out[(out < 0) & (k > -g.kronos_min_bps)] = 0.0
    if g.bias_filter and bias is not None:
        out[(out > 0) & (bias == "bearish")] = 0.0
        out[(out < 0) & (bias == "bullish")] = 0.0
    return out


def signal(g: Genome, bars: pd.DataFrame, kronos_bps: np.ndarray | None = None,
           bias: np.ndarray | None = None) -> np.ndarray:
    return apply_filters(raw_signal(g, bars), g, kronos_bps, bias)
