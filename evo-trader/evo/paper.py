"""Bot automatico: a ogni candela chiusa fa vivere l'ecosistema sui prezzi reali.

  python -m evo.paper                 # ciclo continuo (Ctrl+C per fermare)
  python -m evo.paper --once          # un solo aggiornamento (utile con cron/systemd timer)

Lo stato (agenti, tesoreria, storia) è in state/ecosystem.json: il bot riparte da lì dopo
un riavvio. In mode paper nessun ordine reale viene inviato.
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import pandas as pd

from .brokers import make_broker, target_exposure
from .config import Config, load_config
from .data import fetch_history, interval_to_timedelta
from .ecosystem import Ecosystem
from .evolve import WARMUP_BARS
from .sources import load_bias, load_kronos


def load_recent(cfg: Config, now: pd.Timestamp) -> dict[str, pd.DataFrame]:
    step = interval_to_timedelta(cfg.market.interval)
    need = WARMUP_BARS + cfg.ecosystem.prior_test_bars + cfg.ecosystem.epoch_bars + 50
    start = now - need * step
    market = {s: fetch_history(s, cfg.market.interval, start, now) for s in cfg.market.symbols}
    common = set.intersection(*(set(d["timestamps"]) for d in market.values()))
    return {k: d[d["timestamps"].isin(common)].reset_index(drop=True) for k, d in market.items()}


def cycle(cfg: Config, state_path: Path, now: pd.Timestamp | None = None) -> list[str]:
    now = now or pd.Timestamp.now(tz="UTC")
    market = load_recent(cfg, now)
    ts = market[cfg.market.symbols[0]]["timestamps"]
    kronos = {s: k for s in market if (k := load_kronos(cfg.kronos_cache_dir, s, cfg.market.interval, ts)) is not None}
    bias = {s: b for s, p in cfg.bias_cache_files.items() if s in market and (b := load_bias(p, ts)) is not None}
    eco = Ecosystem(cfg, market, kronos=kronos, bias=bias)

    if state_path.exists():
        state = json.loads(state_path.read_text())
        eco.restore(state)
        last = pd.Timestamp(state["last_bar_time"])
        bars_in_epoch = state["bars_in_epoch"]
    else:
        last, bars_in_epoch = ts.iloc[-2], 0   # primo avvio: si parte dall'ultima candela chiusa

    events = []
    new_idx = [i for i in range(1, len(ts)) if ts.iloc[i] > last]
    for i in new_idx:
        if bars_in_epoch == 0:
            eco.start_epoch_at(i)
        n_trades = sum(len(a.trades) for a in eco.agents)
        eco.step_bar(i)
        if sum(len(a.trades) for a in eco.agents) != n_trades:
            events.append(f"{ts.iloc[i]}: trade chiusi dagli agenti")
        bars_in_epoch += 1
        if bars_in_epoch >= cfg.ecosystem.epoch_bars:
            eco.end_epoch_at(i)
            h = eco.history[-1]
            events.append(f"Fine epoca {h.epoch}: portafoglio {h.portfolio:.2f} $, tesoreria "
                          f"{h.treasury:.2f} $, finanziati {h.funded}, in incubazione {h.shadow}, "
                          f"nati {h.births}, morti {h.deaths}, promossi {h.promotions}")
            bars_in_epoch = 0
    if new_idx:
        i = new_idx[-1]
        exposure = target_exposure(eco, i)
        orders = make_broker(cfg.broker, cfg.mode).sync(exposure)
        events.append(f"{ts.iloc[i]}: portafoglio reale {eco.portfolio_value(i):.2f} $ — "
                      f"esposizione {', '.join(orders) or 'nessuna'}")
        eco.save_state(str(state_path), extra={"last_bar_time": str(ts.iloc[i]),
                                               "bars_in_epoch": bars_in_epoch})
    return events


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.yaml")
    ap.add_argument("--once", action="store_true")
    args = ap.parse_args()
    cfg = load_config(args.config)
    make_broker(cfg.broker, cfg.mode)        # blocca subito un live senza adapter
    state_path = Path(cfg.state_dir) / "ecosystem.json"
    step = interval_to_timedelta(cfg.market.interval)
    while True:
        for e in cycle(cfg, state_path):
            print(e, flush=True)
        if args.once:
            break
        now = pd.Timestamp.now(tz="UTC")
        nxt = now.floor(step) + step + pd.Timedelta(seconds=20)   # subito dopo la chiusura
        time.sleep(max(5.0, (nxt - now).total_seconds()))


if __name__ == "__main__":
    main()
