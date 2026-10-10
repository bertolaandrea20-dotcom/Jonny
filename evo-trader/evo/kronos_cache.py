"""Precalcola le previsioni Kronos per il gene filtro (lento su CPU: ~3 s per candela).

Usa il wrapper di kronos-sol-bot (stessa normalizzazione, previsioni in batch).
Riprende da dove si era fermato: la cache si salva ogni `--save-every` candele.

  python -m evo.kronos_cache --symbol SOLUSDT --start 2025-04-01 --end 2026-10-01 --horizon 6 --every 6

Con --every N si calcola una previsione ogni N candele (quelle che chiudono a un multiplo di
N candele dalla mezzanotte UTC) e la si usa per le N candele successive: con 4h, --every 6 e
--horizon 6 è una previsione giornaliera a 24 ore. Nessun look-ahead: ogni previsione usa solo
candele già chiuse.
"""
from __future__ import annotations

import argparse
import pickle
import sys
import time
from pathlib import Path

import pandas as pd

from .config import load_config
from .data import interval_to_timedelta, load_market
from .sources import EVERY_KEY, kronos_path

KRONOS_BOT = Path(__file__).resolve().parents[2] / "kronos-sol-bot"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.yaml")
    ap.add_argument("--symbol", required=True)
    ap.add_argument("--start", required=True)
    ap.add_argument("--end", required=True)
    ap.add_argument("--horizon", type=int, default=6, help="candele previste")
    ap.add_argument("--every", type=int, default=1, help="una previsione ogni N candele")
    ap.add_argument("--batch", type=int, default=1, help="su CPU il batch non accelera")
    ap.add_argument("--save-every", type=int, default=64)
    args = ap.parse_args()

    cfg = load_config(args.config)
    sys.path.insert(0, str(KRONOS_BOT))
    from bot.config import ForecasterCfg  # type: ignore
    from bot.forecaster import KronosForecaster  # type: ignore

    fcfg = ForecasterCfg(kronos_repo_path=str(KRONOS_BOT / "vendor" / "Kronos"),
                         horizon_bars=args.horizon, seed=42)
    df = load_market([args.symbol], cfg.market.interval, args.start, args.end)[args.symbol]
    path = kronos_path(cfg.kronos_cache_dir, args.symbol, cfg.market.interval)
    path.parent.mkdir(parents=True, exist_ok=True)
    cache: dict = pickle.loads(path.read_bytes()) if path.exists() else {}
    if cache.get(EVERY_KEY, args.every) != args.every:
        raise SystemExit(f"La cache esistente usa --every {cache[EVERY_KEY]}: cancellala o usa lo stesso valore")
    cache[EVERY_KEY] = args.every
    step_s = interval_to_timedelta(cfg.market.interval).total_seconds()

    def anchored(ts) -> bool:   # la candela chiude a un multiplo di `every` candele
        return int((ts.timestamp() + step_s) // step_s) % args.every == 0

    todo = [i for i in range(fcfg.context_bars - 1, len(df))
            if anchored(df["timestamps"].iloc[i])
            and df["timestamps"].iloc[i].isoformat() not in cache]
    print(f"{args.symbol} {cfg.market.interval}: {len(todo)} previsioni da calcolare "
          f"({len(cache)} già in cache)", flush=True)
    kf = KronosForecaster(fcfg, cfg.market.interval)
    t0 = time.time()
    for n in range(0, len(todo), args.batch):
        idx = todo[n:n + args.batch]
        windows = [df.iloc[i + 1 - fcfg.context_bars:i + 1] for i in idx]
        for i, fc in zip(idx, kf.forecast_many(windows)):
            cache[df["timestamps"].iloc[i].isoformat()] = fc.expected_return_bps
        if (n // args.batch) % max(1, args.save_every // args.batch) == 0 or n + args.batch >= len(todo):
            path.write_bytes(pickle.dumps(cache))
            done = n + len(idx)
            eta = (time.time() - t0) / done * (len(todo) - done)
            print(f"  {done}/{len(todo)}  ETA {pd.Timedelta(seconds=int(eta))}", flush=True)
    print(f"Cache salvata in {path}")


if __name__ == "__main__":
    main()
