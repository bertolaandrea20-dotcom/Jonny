"""Bot automatico: a ogni candela chiusa fa vivere l'ecosistema sui prezzi reali.

  python -m evo.paper                 # ciclo continuo (Ctrl+C per fermare)
  python -m evo.paper --once          # un solo aggiornamento (utile con cron/systemd timer)

Lo stato (agenti, tesoreria, storia) è in state/ecosystem.json: il bot riparte da lì dopo
un riavvio. Con broker: paper nessun ordine viene inviato; con broker: ibkr gli ordini vanno al
conto demo (mode paper) o al conto reale (mode live + CONFIRM_LIVE=yes).
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import pandas as pd

from .brokers import make_broker, target_exposure
from .config import Config, load_config
from .data import interval_to_timedelta, load_market
from .ecosystem import Ecosystem
from .evolve import WARMUP_BARS
from .sources import load_signals


def load_recent(cfg: Config, now: pd.Timestamp, instruments: list[str]) -> dict[str, pd.DataFrame]:
    step = interval_to_timedelta(cfg.market.interval)
    need = WARMUP_BARS + cfg.ecosystem.prior_test_bars + cfg.ecosystem.epoch_bars + 50
    # Margine per gli strumenti che non quotano 24/7 (azioni: ~1/4 delle ore della settimana).
    start = now - need * step * 4
    return load_market(instruments, cfg.market.interval, start, now, cache_dir=None,
                       default_source=cfg.market.default_source)


def cycle(cfg: Config, state_path: Path, now: pd.Timestamp | None = None, broker=None) -> list[str]:
    now = now or pd.Timestamp.now(tz="UTC")
    state = json.loads(state_path.read_text()) if state_path.exists() else None
    # L'universo si fissa al primo avvio: gli agenti vivi devono ritrovare i loro strumenti.
    instruments = state["universe"] if state else cfg.market.universe()
    market = load_recent(cfg, now, instruments)
    missing = {a["genome"]["symbol"] for a in (state or {}).get("agents", [])} - set(market)
    if missing:
        raise RuntimeError(f"Dati non disponibili per strumenti con agenti vivi: {sorted(missing)}")
    kronos, bias = load_signals(cfg, market)
    eco = Ecosystem(cfg, market, kronos=kronos, bias=bias)
    ts = eco.ts

    if state:
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
        # Ordini solo sugli strumenti con una candela appena chiusa (mercato aperto); il
        # dimensionamento usa l'ultimo prezzo di chiusura.
        tradable = {s for s in eco.symbols if eco.valid[s][i]}
        prices = {s: float(eco.ohlc[s]["close"][i]) for s in tradable}
        orders = (broker or make_broker(cfg)).sync(exposure, prices, tradable)
        events.append(f"{ts.iloc[i]}: portafoglio reale {eco.portfolio_value(i):.2f} $ — "
                      f"esposizione {', '.join(orders) or 'nessuna'}")
        eco.save_state(str(state_path), extra={"last_bar_time": str(ts.iloc[i]),
                                               "bars_in_epoch": bars_in_epoch,
                                               "universe": instruments})
    return events


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.yaml")
    ap.add_argument("--once", action="store_true")
    args = ap.parse_args()
    cfg = load_config(args.config)
    broker = make_broker(cfg)
    if cfg.broker == "ibkr":
        broker.connect()
        nl = broker.net_liquidation()
        print(f"Collegato a IBKR ({'CONTO REALE' if cfg.mode == 'live' else 'conto demo'}), "
              f"valore netto {nl} {cfg.ibkr.base_currency}", flush=True)
        if cfg.mode == "live" and (nl is None or nl < cfg.ecosystem.initial_capital):
            raise RuntimeError("Il conto ha meno di initial_capital: il bot non parte")
    state_path = Path(cfg.state_dir) / "ecosystem.json"
    step = interval_to_timedelta(cfg.market.interval)
    while True:
        for e in cycle(cfg, state_path, broker=broker):
            print(e, flush=True)
        if args.once:
            break
        now = pd.Timestamp.now(tz="UTC")
        nxt = now.floor(step) + step + pd.Timedelta(seconds=20)   # subito dopo la chiusura
        time.sleep(max(5.0, (nxt - now).total_seconds()))


if __name__ == "__main__":
    main()
