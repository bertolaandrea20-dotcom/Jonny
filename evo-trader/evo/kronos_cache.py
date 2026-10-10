"""Precalcola le previsioni Kronos per il gene filtro (lento su CPU: ~3 s per candela).

Usa il wrapper di kronos-sol-bot (stessa normalizzazione, previsioni in batch).
Riprende da dove si era fermato: la cache si salva ogni `--save-every` candele.

  python -m evo.kronos_cache --start 2024-11-01 --from 2025-06-17 --end 2026-10-01   # tutto l'universo
  python -m evo.kronos_cache --symbol yahoo:ENI.MI --start 2025-04-01 --end 2026-10-01

Di default si calcola UNA previsione al giorno per strumento, sull'ultima candela della sua
giornata (UTC), e la si usa fino alla previsione successiva: vale per crypto 24/7 come per
azioni con orari di borsa. --all calcola una previsione per ogni candela (molto più lento).
Nessun look-ahead: ogni previsione usa solo candele già chiuse.
"""
from __future__ import annotations

import argparse
import pickle
import sys
import time
from pathlib import Path

import pandas as pd

from .config import load_config
from .data import load_market
from .sources import EVERY_KEY, kronos_path

KRONOS_BOT = Path(__file__).resolve().parents[2] / "kronos-sol-bot"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.yaml")
    ap.add_argument("--symbol", help="strumento fonte:simbolo (default: tutto l'universo)")
    ap.add_argument("--start", required=True)
    ap.add_argument("--end", required=True)
    ap.add_argument("--horizon", type=int, default=6, help="candele previste")
    ap.add_argument("--all", action="store_true", help="una previsione per ogni candela")
    ap.add_argument("--from", dest="from_", help="calcola solo da questa data (prima: solo contesto)")
    ap.add_argument("--save-every", type=int, default=64)
    args = ap.parse_args()

    cfg = load_config(args.config)
    sys.path.insert(0, str(KRONOS_BOT))
    from bot.config import ForecasterCfg  # type: ignore
    from bot.forecaster import KronosForecaster  # type: ignore

    fcfg = ForecasterCfg(kronos_repo_path=str(KRONOS_BOT / "vendor" / "Kronos"),
                         horizon_bars=args.horizon, seed=42)
    kf = KronosForecaster(fcfg, cfg.market.interval)
    mode = "all" if args.all else "daily"
    for inst in ([args.symbol] if args.symbol else cfg.market.universe()):
        market = load_market([inst], cfg.market.interval, args.start, args.end,
                             default_source=cfg.market.default_source)
        if inst not in market:
            continue
        df = market[inst].copy()
        df["amount"] = df["close"] * df["volume"]    # controvalore, richiesto da Kronos
        path = kronos_path(cfg.kronos_cache_dir, inst, cfg.market.interval)
        path.parent.mkdir(parents=True, exist_ok=True)
        cache: dict = pickle.loads(path.read_bytes()) if path.exists() else {}
        if cache.get(EVERY_KEY, mode) != mode:
            raise SystemExit(f"{path}: la cache usa la modalità {cache[EVERY_KEY]}, cancellala")
        cache[EVERY_KEY] = mode
        ts = df["timestamps"]
        last_of_day = ts.dt.date != ts.dt.date.shift(-1)       # ultima candela del giorno
        first = pd.Timestamp(args.from_, tz="UTC") if args.from_ else ts.iloc[0]
        todo = [i for i in range(fcfg.context_bars - 1, len(df))
                if (args.all or last_of_day.iloc[i]) and ts.iloc[i] >= first
                and ts.iloc[i].isoformat() not in cache]
        print(f"{inst} {cfg.market.interval}: {len(todo)} previsioni da calcolare", flush=True)
        t0 = time.time()
        for n, i in enumerate(todo):
            fc = kf.forecast(df.iloc[i + 1 - fcfg.context_bars:i + 1])
            cache[ts.iloc[i].isoformat()] = fc.expected_return_bps
            if (n + 1) % args.save_every == 0 or n + 1 == len(todo):
                path.write_bytes(pickle.dumps(cache))
                eta = (time.time() - t0) / (n + 1) * (len(todo) - n - 1)
                print(f"  {n + 1}/{len(todo)}  ETA {pd.Timedelta(seconds=int(eta))}", flush=True)
        path.write_bytes(pickle.dumps(cache))
        print(f"  cache salvata in {path}", flush=True)


if __name__ == "__main__":
    main()
