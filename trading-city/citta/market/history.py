"""Storico per il backtest.

Scarica candele orarie e le salva in CSV (``data/<simbolo>_1h.csv``), così le
esecuzioni successive non riscaricano nulla. Puoi anche mettere nella cartella
CSV tuoi, con colonne ``timestamp`` (ms UTC o data ISO) e ``close``.

* Crypto (simboli con ``/``): ccxt, default Binance, che conserva anni di
  storico orario in EUR (Kraken via API dà solo le ultime ~720 ore).
* Azioni/ETF (es. ``ENI.MI``): yfinance, che dà al massimo ~730 giorni di
  dati orari.

``HistoricalFeed`` ripercorre lo storico un'ora alla volta. Per non usare
informazioni dal futuro, News e Fundamentals restano muti (non abbiamo le
notizie e i bilanci di allora) e il sentiment è il momentum recente.
"""

from __future__ import annotations

import csv
import logging
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from .data import MarketFeed, NewsItem, SyntheticFeed

log = logging.getLogger(__name__)
HOUR_MS = 3_600_000


def _fname(symbol: str) -> str:
    return symbol.replace("/", "-") + "_1h.csv"


def _to_ms(ts: str) -> int:
    ts = ts.strip()
    if ts.isdigit():
        v = int(ts)
        return v * 1000 if v < 10**11 else v
    dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return int(dt.timestamp() * 1000)


def save_csv(path: Path, rows: list[tuple[int, float]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["timestamp", "close"])
        w.writerows(rows)


def load_csv(path: Path) -> list[tuple[int, float]]:
    with path.open() as f:
        r = csv.DictReader(f)
        return [(_to_ms(row["timestamp"]), float(row["close"])) for row in r if row.get("close")]


def _download_crypto(symbol: str, start_ms: int, end_ms: int, exchange: str) -> list[tuple[int, float]]:
    import ccxt

    ex = getattr(ccxt, exchange)({"enableRateLimit": True})
    rows, since = [], start_ms
    while since < end_ms:
        batch = ex.fetch_ohlcv(symbol, timeframe="1h", since=since, limit=1000)
        if not batch:
            break
        rows += [(int(b[0]), float(b[4])) for b in batch if b[0] < end_ms]
        nxt = int(batch[-1][0]) + HOUR_MS
        if nxt <= since:
            break
        since = nxt
        time.sleep(ex.rateLimit / 1000)
    return rows


def _download_stock(symbol: str, start_ms: int, end_ms: int) -> list[tuple[int, float]]:
    import yfinance as yf

    start = datetime.fromtimestamp(start_ms / 1000, timezone.utc)
    end = datetime.fromtimestamp(end_ms / 1000, timezone.utc)
    df = yf.Ticker(symbol).history(start=start, end=end, interval="1h")
    return [(int(ts.timestamp() * 1000), float(c)) for ts, c in zip(df.index, df["Close"])]


def get_history(symbols: list[str], start: str, end: str, data_dir: str = "data",
                exchange: str = "binance", refresh: bool = False) -> dict[str, list[tuple[int, float]]]:
    start_ms, end_ms = _to_ms(start), _to_ms(end)
    out = {}
    for s in symbols:
        path = Path(data_dir) / _fname(s)
        rows = [] if refresh or not path.exists() else load_csv(path)
        covered = rows and rows[0][0] <= start_ms + 24 * HOUR_MS and rows[-1][0] >= end_ms - 48 * HOUR_MS
        if not covered:
            log.info("scarico %s dal %s al %s", s, start, end)
            rows = _download_crypto(s, start_ms, end_ms, exchange) if "/" in s else _download_stock(s, start_ms, end_ms)
            if not rows:
                raise RuntimeError(f"nessun dato per {s}: controlla il simbolo o la connessione")
            save_csv(path, rows)
        out[s] = [(t, c) for t, c in rows if start_ms <= t < end_ms]
    return out


def synthetic_history(symbols: list[str], days: int, seed: int | None = None,
                      start: str = "2025-01-01") -> dict[str, list[tuple[int, float]]]:
    """Storico finto per provare lo strumento senza rete (non è un risultato di mercato)."""
    feed = SyntheticFeed(symbols, seed=seed, warmup=0)
    t0 = _to_ms(start)
    out = {s: [(t0, feed.price(s))] for s in symbols}
    for h in range(1, days * 24 + 160):
        feed.step()
        for s in symbols:
            out[s].append((t0 + h * HOUR_MS, feed.price(s)))
    return out


def align(history: dict[str, list[tuple[int, float]]]) -> tuple[np.ndarray, dict[str, np.ndarray]]:
    """Linea del tempo oraria comune, prezzi riportati avanti fuori orario di borsa."""
    first = max(rows[0][0] for rows in history.values())
    last = min(rows[-1][0] for rows in history.values())
    first = first - first % HOUR_MS
    grid = np.arange(first, last + 1, HOUR_MS, dtype=np.int64)
    out = {}
    for s, rows in history.items():
        ts = np.array([r[0] - r[0] % HOUR_MS for r in rows], dtype=np.int64)
        px = np.array([r[1] for r in rows], dtype=float)
        idx = np.searchsorted(ts, grid, side="right") - 1
        out[s] = px[np.clip(idx, 0, len(px) - 1)]
    return grid, out


class HistoricalFeed(MarketFeed):
    def __init__(self, grid: np.ndarray, prices: dict[str, np.ndarray], warmup: int = 160):
        self.grid = grid
        self.series = prices
        self.symbols = list(prices)
        # il primo giorno inizia a mezzanotte UTC dopo il periodo di riscaldamento degli indicatori
        i = warmup
        while i < len(grid) and (grid[i] // HOUR_MS) % 24 != 0:
            i += 1
        self.i = i
        self.tick = 0

    @property
    def done(self) -> bool:
        return self.i >= len(self.grid) - 1

    @property
    def remaining_days(self) -> int:
        return (len(self.grid) - 1 - self.i) // 24

    def now(self) -> datetime:
        return datetime.fromtimestamp(int(self.grid[self.i]) / 1000, timezone.utc)

    def step(self) -> None:
        if not self.done:
            self.i += 1
            self.tick += 1

    def price(self, symbol: str) -> float:
        return float(self.series[symbol][self.i])

    def closes(self, symbol: str, n: int = 120) -> np.ndarray:
        return self.series[symbol][max(0, self.i - n + 1): self.i + 1]

    def news(self, symbol: str, lookback: int = 24) -> list[NewsItem]:
        return []

    def social(self, symbol: str) -> dict:
        c = self.closes(symbol, 25)
        mom = float(np.tanh((c[-1] / c[0] - 1) * 20)) if len(c) > 2 else 0.0
        return {"score": round(mom, 3), "fonte": "momentum delle ultime 24 ore"}

    def fundamentals(self, symbol: str) -> dict:
        return {}
