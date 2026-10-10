"""Precalcola il bias giornaliero di TradingAgents su un intervallo di date e lo salva in cache.

Serve per il backtest: il backtest legge SOLO la cache e non chiama mai gli LLM.

ATTENZIONE AI COSTI: ogni giorno = un run completo di TradingAgents (decine di chiamate LLM).
Inizia con pochi giorni e modelli economici per stimare il costo.

  python -m backtest.precompute_bias --start 2026-09-01 --end 2026-09-30
"""
from __future__ import annotations

import argparse
import time
from datetime import date, timedelta

from bot.bias import BiasCache, BiasFilter, TradingAgentsRunner
from bot.config import load_config


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.yaml")
    ap.add_argument("--start", required=True, help="YYYY-MM-DD (giorno di trading)")
    ap.add_argument("--end", required=True, help="YYYY-MM-DD incluso")
    ap.add_argument("--yes", action="store_true", help="non chiedere conferma")
    args = ap.parse_args()

    cfg = load_config(args.config)
    cache = BiasCache(cfg.bias.cache_file)
    start, end = date.fromisoformat(args.start), date.fromisoformat(args.end)
    days = [start + timedelta(days=i) for i in range((end - start).days + 1)]
    todo = [d for d in days if cache.get(d.isoformat()) is None]
    print(f"{len(days)} giorni nell'intervallo, {len(todo)} da calcolare "
          f"(ticker {cfg.bias.ticker}, cache {cfg.bias.cache_file})")
    if not todo:
        return
    if not args.yes and input(f"Eseguire {len(todo)} run di TradingAgents? [s/N] ").lower() != "s":
        return

    runner = TradingAgentsRunner(cfg.bias)
    for i, d in enumerate(todo, 1):
        analysis = BiasFilter.analysis_date_for(d)
        t0 = time.time()
        try:
            bias, raw = runner.run(analysis)
            cache.set(d.isoformat(), bias, raw)
            print(f"[{i}/{len(todo)}] {d}: {bias:<8} (analisi {analysis}, {time.time() - t0:.0f}s)")
        except Exception as e:  # noqa: BLE001
            print(f"[{i}/{len(todo)}] {d}: ERRORE {e} — non salvato, riprova più tardi")


if __name__ == "__main__":
    main()
