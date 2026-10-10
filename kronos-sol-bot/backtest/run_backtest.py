"""Backtest walk-forward con lo STESSO motore del bot (Engine + PaperExecutor).

Esempi:
  python -m backtest.run_backtest --days 30 --forecaster kronos --step 3
  python -m backtest.run_backtest --csv data/sol_5m.csv --forecaster baseline
  python -m backtest.run_backtest --days 30 --compare      # Kronos vs baseline
  python -m backtest.run_backtest --days 30 --end 2026-06-01 --compare   # periodo passato

Note di realismo:
- I fill avvengono al close della candela di segnale, con fee + slippage dal config.
- Con strategy.intrabar_stops (default) stop loss / take profit sono controllati su OGNI
  candela usando high/low; se nella stessa candela si toccano entrambi si assume lo stop
  (pessimista). Il bot live fa lo stesso controllo sul prezzo ogni pochi secondi.
- Con --step > 1 il modello viene interrogato ogni N barre (più veloce su CPU): SL/TP
  intrabar restano controllati su ogni barra, le altre uscite solo ogni N barre.
"""
from __future__ import annotations

import argparse
import copy
import json
import time
from pathlib import Path

import numpy as np
import pandas as pd

from bot.bias import BiasFilter
from bot.config import Config, load_config
from bot.data import fetch_history, load_csv
from bot.engine import Engine
from bot.executor import PaperExecutor
from bot.forecaster import make_forecaster
from bot.risk import RiskManager
from bot.state import BotState


class _NoKillSwitch(RiskManager):
    def __init__(self, cfg):
        super().__init__(cfg, kill_switch_path="__backtest_no_kill_switch__")


def run_backtest(cfg: Config, df: pd.DataFrame, step: int = 1, verbose: bool = True,
                 use_bias: bool = False) -> dict:
    fcfg = cfg.forecaster
    state = BotState.fresh(cfg.risk.starting_equity_usd)
    # Nel backtest il filtro legge SOLO la cache: nessuna chiamata LLM.
    bias_filter = BiasFilter(cfg.bias, allow_compute=False) if use_bias else None
    engine = Engine(cfg, state, make_forecaster(fcfg, cfg.market.interval),
                    PaperExecutor(cfg), _NoKillSwitch(cfg.risk), bias_filter=bias_filter)
    start = fcfg.context_bars
    equity_curve = []
    t0 = time.time()
    total = len(df) - start
    o, h, l, c = (df[k].to_numpy() for k in ("open", "high", "low", "close"))
    for n, i in enumerate(range(start, len(df))):
        ts = df["timestamps"].iloc[i]
        # Prima i livelli toccati durante la candela (posizioni aperte a candele precedenti)...
        engine.check_stops(float(o[i]), float(h[i]), float(l[i]), ts)
        # ...poi la decisione a candela chiusa, ogni `step` barre.
        if n % step == 0:
            engine.on_bar(df.iloc[max(0, i + 1 - fcfg.context_bars - 1): i + 1])
        equity_curve.append((ts, engine.mark_to_market(float(c[i]))))
        if verbose and n % max(1, total // 20) == 0:
            print(f"  {n / total * 100:5.1f}%  equity ${equity_curve[-1][1]:.2f}  "
                  f"trade {state.closed_trades}  ({time.time() - t0:.0f}s)")

    engine.force_close(float(c[-1]), "fine backtest", df["timestamps"].iloc[-1])
    r = summarize(cfg, df, engine, equity_curve, start)
    if bias_filter:
        days = sorted({t.date().isoformat() for t in df["timestamps"].iloc[start:]})
        covered = sum(1 for d in days if bias_filter.cache.get(d))
        r["filtro_bias"] = cfg.bias.policy
        r["giorni_con_bias"] = f"{covered}/{len(days)}"
        r["aperture_bloccate"] = engine.bias_stats["bloccati"]
        r["uscite_forzate"] = engine.bias_stats["uscite_forzate"]
        if covered < len(days):
            print(f"  ⚠ {len(days) - covered} giorni senza bias in cache: usato fallback "
                  f"'{cfg.bias.fallback}'. Lancia backtest.precompute_bias per coprirli.")
    return r


def summarize(cfg: Config, df: pd.DataFrame, engine: Engine, curve, start: int) -> dict:
    st = engine.state
    eq = np.array([v for _, v in curve] + [st.equity_usd])
    peak = np.maximum.accumulate(eq)
    max_dd = float(((peak - eq) / peak).max() * 100) if len(eq) else 0.0
    trades = pd.DataFrame(engine.trades)
    bh = (df["close"].iloc[-1] / df["close"].iloc[start] - 1) * 100
    days = (df["timestamps"].iloc[-1] - df["timestamps"].iloc[start]).total_seconds() / 86400
    return {
        "forecaster": cfg.forecaster.type,
        "periodo_giorni": round(days, 1),
        "rendimento_pct": round((st.equity_usd / cfg.risk.starting_equity_usd - 1) * 100, 2),
        "buy_and_hold_pct": round(float(bh), 2),
        "max_drawdown_pct": round(max_dd, 2),
        "trade": int(st.closed_trades),
        "trade_al_giorno": round(st.closed_trades / days, 1) if days else 0,
        "win_rate_pct": round(st.winning_trades / st.closed_trades * 100, 1) if st.closed_trades else 0,
        "pnl_medio_pct": round(float(trades["pnl_pct"].mean()), 3) if len(trades) else 0,
        "fee_totali_usd": round(st.total_fees_usd, 2),
        "equity_finale_usd": round(st.equity_usd, 2),
        "fermato": st.halt_reason or "no",
        "_trades": trades,
        "_curve": curve,
    }


def print_report(r: dict) -> None:
    print("\n" + "=" * 52)
    for k, v in r.items():
        if not k.startswith("_"):
            print(f"  {k:<22} {v}")
    print("=" * 52)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.yaml")
    ap.add_argument("--csv", help="CSV con colonne timestamps,open,high,low,close,volume[,amount]")
    ap.add_argument("--days", type=int, default=30, help="giorni di backtest da scaricare da Binance")
    ap.add_argument("--end", help="data di fine del periodo (YYYY-MM-DD, UTC); default: adesso")
    ap.add_argument("--forecaster", choices=["kronos", "baseline"])
    ap.add_argument("--step", type=int, default=1)
    ap.add_argument("--compare", action="store_true", help="esegue sia kronos che baseline")
    ap.add_argument("--bias", choices=["off", "on", "both"], default="off",
                    help="filtro giornaliero TradingAgents (dalla cache): off, on, o both per confrontare")
    ap.add_argument("--out", default="backtest_results")
    args = ap.parse_args()

    cfg = load_config(args.config)
    cfg.mode = "paper"
    if args.csv:
        df = load_csv(args.csv)
    else:
        # Più le candele di contesto, così il backtest copre davvero `--days` giorni.
        end = pd.Timestamp(args.end, tz="UTC") if args.end else None
        df = fetch_history(cfg.market.symbol, cfg.market.interval, args.days, end=end,
                           extra_bars=cfg.forecaster.context_bars)
    print(f"Dati: {len(df)} candele {cfg.market.interval} "
          f"dal {df['timestamps'].iloc[0]} al {df['timestamps'].iloc[-1]}")

    kinds = ["kronos", "baseline"] if args.compare else [args.forecaster or cfg.forecaster.type]
    out = Path(args.out)
    out.mkdir(exist_ok=True)
    summary = []
    bias_modes = {"off": [False], "on": [True], "both": [False, True]}[args.bias]
    for kind in kinds:
        for use_bias in bias_modes:
            c = copy.deepcopy(cfg)
            c.forecaster.type = kind
            tag = f"{kind}{'_bias' if use_bias else ''}"
            print(f"\n▶ Backtest {tag}, step={args.step}")
            r = run_backtest(c, df, step=args.step, use_bias=use_bias)
            r["variante"] = tag
            print_report(r)
            r["_trades"].to_csv(out / f"trades_{tag}.csv", index=False)
            pd.DataFrame(r["_curve"], columns=["timestamps", "equity"]).to_csv(
                out / f"equity_{tag}.csv", index=False)
            summary.append({k: v for k, v in r.items() if not k.startswith("_")})
    (out / "summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False))
    print(f"\nRisultati salvati in {out}/")


if __name__ == "__main__":
    main()
