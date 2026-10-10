"""Simulazione storica dell'ecosistema (walk-forward: ogni epoca è out-of-sample).

Esempi:
  python -m evo.evolve --start 2025-10-01 --end 2026-10-01
  python -m evo.evolve --start 2025-10-01 --end 2026-10-01 --seeds 5   # robustezza
"""
from __future__ import annotations

import argparse
import copy
import json
from pathlib import Path

import numpy as np
import pandas as pd

from .config import Config, load_config
from .data import load_market
from .ecosystem import Ecosystem
from .sources import load_signals

WARMUP_BARS = 300   # storia minima per gli indicatori più lenti


def run_once(cfg: Config, market: dict[str, pd.DataFrame], seed: int, out: Path | None) -> dict:
    c = copy.deepcopy(cfg)
    c.ecosystem.seed = seed
    kronos, bias = load_signals(c, market)
    if c.genome.use_kronos and not kronos:
        print("  ⚠ use_kronos attivo ma nessuna cache Kronos trovata: il filtro resta spento")
    elif c.genome.use_kronos:
        print(f"  Kronos disponibile per: {', '.join(kronos)}")
    eco = Ecosystem(c, market, kronos=kronos, bias=bias)
    ts = eco.ts
    warmup = WARMUP_BARS + c.ecosystem.prior_test_bars
    eco.run(warmup)

    hist = pd.DataFrame([vars(h) for h in eco.history])
    # Buy & hold equipesato su tutto l'universo, dallo stesso istante di partenza.
    bh = float(np.mean([eco.ohlc[s]["mark"][-1] / eco.ohlc[s]["mark"][warmup - 1] - 1
                        for s in market]) * 100)
    pv = np.concatenate([[c.ecosystem.initial_capital], hist["portfolio"].to_numpy()])
    peak = np.maximum.accumulate(pv)
    lineage = eco.lineage()
    trades = pd.DataFrame([t for a in eco.all_agents() for t in a.trades])
    funded_trades = trades[trades["status"] == "funded"] if len(trades) else trades
    r = {
        "seed": seed,
        "periodo": f"{ts.iloc[warmup].date()} → {ts.iloc[-1].date()}",
        "epoche": len(hist),
        "capitale_iniziale": c.ecosystem.initial_capital,
        "capitale_finale": round(float(pv[-1]), 2),
        "rendimento_pct": round((pv[-1] / pv[0] - 1) * 100, 2),
        "buy_and_hold_pct": round(bh, 2),
        "strumenti": len(market),
        "max_drawdown_pct": round(float(((peak - pv) / peak).max() * 100), 2),
        "agenti_nati": len(lineage),
        "dna_scartati_prova_passato": eco.stillborn,
        "agenti_morti": int((lineage["status"] == "dead").sum()),
        "promossi": int(lineage["funded_epoch"].notna().sum()),
        "vivi_finanziati": int((lineage["status"] == "funded").sum()),
        "generazione_max": int(lineage["generation"].max()),
        "trade_soldi_veri": len(funded_trades),
        "win_rate_soldi_veri_pct": round(float((funded_trades["pnl"] > 0).mean() * 100), 1) if len(funded_trades) else 0,
        "fee_soldi_veri": round(float(sum(a.fees_paid for a in eco.all_agents() if a.funded_epoch is not None)), 2),
    }
    if out:
        out.mkdir(parents=True, exist_ok=True)
        hist.to_csv(out / "history.csv", index=False)
        lineage.to_csv(out / "lineage.csv", index=False)
        trades.to_csv(out / "trades.csv", index=False)
        eco.save_state(str(out / "state.json"))
        (out / "summary.json").write_text(json.dumps(r, indent=2, ensure_ascii=False))
    return r


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.yaml")
    ap.add_argument("--start", required=True, help="YYYY-MM-DD (UTC), inclusa la storia di warm-up")
    ap.add_argument("--end", required=True)
    ap.add_argument("--prior-bars", type=int, help="sovrascrive ecosystem.prior_test_bars")
    ap.add_argument("--seeds", type=int, default=1, help="ripete con semi diversi per misurare la robustezza")
    ap.add_argument("--out", default="results")
    args = ap.parse_args()

    cfg = load_config(args.config)
    cfg.mode = "paper"
    if args.prior_bars is not None:
        cfg.ecosystem.prior_test_bars = args.prior_bars
    market = load_market(cfg.market.universe(), cfg.market.interval, args.start, args.end,
                         default_source=cfg.market.default_source,
                         min_bars=cfg.market.min_history_bars)
    print(f"Universo ({len(market)} strumenti, {cfg.market.interval}): "
          + ", ".join(f"{k} [{len(d)}]" for k, d in market.items()))
    results = []
    for k in range(args.seeds):
        seed = cfg.ecosystem.seed + k
        r = run_once(cfg, market, seed, Path(args.out) / f"seed_{seed}")
        results.append(r)
        print(f"\n▶ seed {seed}")
        for key, v in r.items():
            print(f"  {key:<26} {v}")
    if len(results) > 1:
        rets = [r["rendimento_pct"] for r in results]
        print(f"\nRendimento su {len(rets)} semi: medio {np.mean(rets):.2f}%, "
              f"min {min(rets):.2f}%, max {max(rets):.2f}% — buy & hold {results[0]['buy_and_hold_pct']}%")
    (Path(args.out) / "summary_all.json").write_text(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
