"""Dati di mercato da fonti intercambiabili. Uno strumento si scrive `fonte:simbolo`:

  binance:BTCUSDT     crypto (storico lungo, pubblico)
  yahoo:ENI.MI        azioni, ETF, indici (^GSPC), forex (EURUSD=X), futures (GC=F), crypto (BTC-EUR)
  kraken:BTC/EUR      crypto su Kraken (ultime 720 candele: per il bot, non per backtest lunghi)
  csv:path/file.csv   qualsiasi strumento esportato da un broker (timestamps,open,high,low,close[,volume])

Senza prefisso si usa `market.default_source`. Ogni strumento tiene i SUOI orari (le azioni
non hanno candele di notte e nel weekend): non si allineano gli strumenti tra loro.

BINANCE_API_BASE permette di usare il mirror https://data-api.binance.vision dove
api.binance.com è bloccato per area geografica.
"""
from __future__ import annotations

import os
import time
from pathlib import Path

import pandas as pd
import requests

BINANCE = os.environ.get("BINANCE_API_BASE", "https://api.binance.com").rstrip("/")
YAHOO = "https://query1.finance.yahoo.com/v8/finance/chart"
COLUMNS = ["timestamps", "open", "high", "low", "close", "volume"]
HEADERS = {"User-Agent": "Mozilla/5.0 (evo-trader)"}


def interval_to_timedelta(interval: str) -> pd.Timedelta:
    n, unit = int(interval[:-1]), interval[-1]
    return pd.Timedelta(seconds=n * {"m": 60, "h": 3600, "d": 86400}[unit])


def bars_per_year(interval: str) -> float:
    return 365 * 86400 / interval_to_timedelta(interval).total_seconds()


def split_instrument(name: str, default_source: str = "binance") -> tuple[str, str]:
    if ":" in name:
        src, sym = name.split(":", 1)
        return src.lower(), sym
    return default_source, name


# ---------------------------------------------------------------- Binance
def _binance_klines(symbol: str, interval: str, end_ms: int | None) -> pd.DataFrame:
    params = {"symbol": symbol, "interval": interval, "limit": 1000}
    if end_ms:
        params["endTime"] = end_ms
    r = requests.get(f"{BINANCE}/api/v3/klines", params=params, timeout=20)
    r.raise_for_status()
    df = pd.DataFrame(r.json(), columns=["open_time", "open", "high", "low", "close", "volume",
                                         "close_time", "amount", "n", "tb", "tq", "ig"])
    df["timestamps"] = pd.to_datetime(df["open_time"], unit="ms", utc=True)
    df["close_time"] = pd.to_datetime(df["close_time"], unit="ms", utc=True)
    for c in COLUMNS[1:]:
        df[c] = df[c].astype(float)
    df = df[df["close_time"] <= pd.Timestamp.now(tz="UTC")]   # solo candele chiuse
    return df[COLUMNS]


def fetch_binance(symbol: str, interval: str, start: pd.Timestamp, end: pd.Timestamp) -> pd.DataFrame:
    frames, end_ms = [], int(end.timestamp() * 1000) - 1
    while True:
        df = _binance_klines(symbol, interval, end_ms)
        if df.empty:
            break
        frames.append(df)
        if df["timestamps"].iloc[0] <= start:
            break
        end_ms = int(df["timestamps"].iloc[0].timestamp() * 1000) - 1
        time.sleep(0.2)
    if not frames:
        return pd.DataFrame(columns=COLUMNS)
    return pd.concat(frames)


STABLE = {"USDC", "FDUSD", "TUSD", "BUSD", "DAI", "USDP", "EUR", "USDE", "USD1", "PYUSD", "XUSD"}


def binance_top_symbols(quote: str = "USDT", top: int = 20) -> list[str]:
    """I simboli più scambiati nelle ultime 24h (esclusi stablecoin e token a leva)."""
    r = requests.get(f"{BINANCE}/api/v3/ticker/24hr", timeout=20)
    r.raise_for_status()
    rows = []
    for t in r.json():
        base = t["symbol"][:-len(quote)]
        if (t["symbol"].endswith(quote) and base not in STABLE
                and not base.endswith(("UP", "DOWN", "BULL", "BEAR"))):
            rows.append(t)
    rows.sort(key=lambda t: float(t["quoteVolume"]), reverse=True)
    return [f"binance:{t['symbol']}" for t in rows[:top]]


# ---------------------------------------------------------------- Yahoo Finance
YAHOO_INTERVALS = {"1h": "60m", "1d": "1d", "15m": "15m", "30m": "30m", "5m": "5m"}


def parse_yahoo(js: dict) -> pd.DataFrame:
    res = js["chart"]["result"][0]
    q = res["indicators"]["quote"][0]
    df = pd.DataFrame({"timestamps": pd.to_datetime(res.get("timestamp", []), unit="s", utc=True),
                       "open": q.get("open"), "high": q.get("high"), "low": q.get("low"),
                       "close": q.get("close"), "volume": q.get("volume")})
    df["volume"] = df["volume"].fillna(0.0)
    return df.dropna(subset=["open", "high", "low", "close"]).reset_index(drop=True)


def resample(df: pd.DataFrame, interval: str) -> pd.DataFrame:
    rule = interval.replace("m", "min")
    g = df.set_index("timestamps").resample(rule, label="left", closed="left")
    out = g.agg({"open": "first", "high": "max", "low": "min", "close": "last", "volume": "sum"})
    return out.dropna(subset=["open"]).reset_index()


def fetch_yahoo(symbol: str, interval: str, start: pd.Timestamp, end: pd.Timestamp) -> pd.DataFrame:
    """Yahoo non ha candele 2h/4h: si scaricano 1h e si ricampionano. Con 1h lo storico è ~2 anni."""
    base = "1h" if interval in ("2h", "4h") else interval
    if base not in YAHOO_INTERVALS:
        raise ValueError(f"Intervallo {interval} non supportato da Yahoo")
    params = {"period1": int(start.timestamp()), "period2": int(end.timestamp()),
              "interval": YAHOO_INTERVALS[base], "includePrePost": "false"}
    r = requests.get(f"{YAHOO}/{symbol}", params=params, headers=HEADERS, timeout=30)
    r.raise_for_status()
    df = parse_yahoo(r.json())
    if base != interval:
        df = resample(df, interval)
    step = interval_to_timedelta(interval)
    return df[df["timestamps"] + step <= pd.Timestamp.now(tz="UTC")]   # solo candele chiuse


# ---------------------------------------------------------------- Kraken (ccxt)
def ccxt_exchange(name: str, api_key: str = "", secret: str = ""):
    import ccxt
    ex = getattr(ccxt, name)({"apiKey": api_key, "secret": secret, "enableRateLimit": True})
    ca = os.environ.get("REQUESTS_CA_BUNDLE")
    if ca:                         # rete con proxy aziendale/CA propria
        ex.validateServerSsl = ca
    return ex


_KRAKEN = None


def fetch_kraken(symbol: str, interval: str, start: pd.Timestamp, end: pd.Timestamp) -> pd.DataFrame:
    global _KRAKEN
    _KRAKEN = _KRAKEN or ccxt_exchange("kraken")
    rows = _KRAKEN.fetch_ohlcv(symbol, interval, since=int(start.timestamp() * 1000), limit=720)
    df = pd.DataFrame(rows, columns=["t", "open", "high", "low", "close", "volume"])
    df["timestamps"] = pd.to_datetime(df["t"], unit="ms", utc=True)
    step = interval_to_timedelta(interval)
    df = df[df["timestamps"] + step <= pd.Timestamp.now(tz="UTC")]   # solo candele chiuse
    return df[COLUMNS]


# ---------------------------------------------------------------- CSV
def load_csv(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    df["timestamps"] = pd.to_datetime(df["timestamps"], utc=True)
    if "volume" not in df:
        df["volume"] = 0.0
    return df[COLUMNS]


# ---------------------------------------------------------------- interfaccia unica
def fetch(instrument: str, interval: str, start: pd.Timestamp, end: pd.Timestamp,
          default_source: str = "binance") -> pd.DataFrame:
    src, sym = split_instrument(instrument, default_source)
    if src == "binance":
        df = fetch_binance(sym, interval, start, end)
    elif src == "yahoo":
        df = fetch_yahoo(sym, interval, start, end)
    elif src == "kraken":
        df = fetch_kraken(sym, interval, start, end)
    elif src == "csv":
        df = load_csv(sym)
    else:
        raise ValueError(f"Fonte dati sconosciuta: {src}")
    df = df.drop_duplicates("timestamps").sort_values("timestamps")
    return df[(df["timestamps"] >= start) & (df["timestamps"] < end)].reset_index(drop=True)


def _ts(x) -> pd.Timestamp:
    t = pd.Timestamp(x)
    return t if t.tzinfo else t.tz_localize("UTC")


def load_market(instruments: list[str], interval: str, start, end, cache_dir: str | None = "data",
                default_source: str = "binance", min_bars: int = 0) -> dict[str, pd.DataFrame]:
    """Candele di ogni strumento, ciascuno con i propri orari (cache CSV su disco).
    Uno strumento senza dati sufficienti viene escluso con un avviso, non ferma gli altri."""
    s, e = _ts(start), _ts(end)
    out = {}
    for inst in instruments:
        path = None
        if cache_dir:
            Path(cache_dir).mkdir(parents=True, exist_ok=True)
            safe = inst.replace(":", "_").replace("/", "_").replace("^", "IDX_").replace("=", "_")
            path = Path(cache_dir) / f"{safe}_{interval}_{s.date()}_{e.date()}.csv"
        if path is not None and path.exists():
            df = pd.read_csv(path)
            df["timestamps"] = pd.to_datetime(df["timestamps"], utc=True)
        else:
            try:
                df = fetch(inst, interval, s, e, default_source)
            except Exception as ex:  # noqa: BLE001
                print(f"  ⚠ {inst}: dati non disponibili ({ex})")
                continue
            if path is not None:
                df.to_csv(path, index=False)
        if len(df) < min_bars:
            print(f"  ⚠ {inst}: solo {len(df)} candele (minimo {min_bars}), escluso")
            continue
        out[inst] = df
    if not out:
        raise RuntimeError("Nessuno strumento con dati sufficienti")
    return out
