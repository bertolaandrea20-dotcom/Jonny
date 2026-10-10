"""Bot di trend su un paniere crypto (pensato per Kraken e capitali piccoli).

Regola (verificata 2019-2026 in docs/): ogni strumento ha una quota fissa del capitale; la quota
è investita quando il prezzo è sopra la sua media di `sma_days` giorni, altrimenti resta in euro.
Si controlla a ogni candela chiusa (`interval`), si opera solo quando il segnale cambia.

  python -m evo.trend --config config.kraken.example.yaml          # ciclo continuo
  python -m evo.trend --config config.kraken.example.yaml --once   # un solo controllo

Con `broker: paper` gli ordini sono simulati sui prezzi reali di Kraken (nessuna chiave).
Con `broker: kraken` + `mode: live` + CONFIRM_LIVE=yes gli ordini sono VERI.
Il bot usa solo `trend.capital` e solo le quantità che ha comprato lui: il resto del conto
non viene mai toccato. Con un file STOP nella cartella può solo vendere.
"""
from __future__ import annotations

import argparse
import json
import math
import time
from dataclasses import asdict, dataclass
from pathlib import Path

import pandas as pd

from .config import Config, load_config
from .data import ccxt_exchange, interval_to_timedelta, load_market, split_instrument

KILL_SWITCH_FILE = "STOP"


@dataclass
class Sleeve:
    instrument: str
    cash: float          # euro della quota non investiti
    qty: float = 0.0     # quantità posseduta dal bot
    trades: int = 0
    fees: float = 0.0


@dataclass
class Fill:
    qty: float           # quantità eseguita (base)
    cost: float          # euro spesi (acquisto) o incassati (vendita), commissioni escluse
    fee: float           # commissioni in euro


def trend_signal(df: pd.DataFrame, interval: str, sma_days: int) -> bool | None:
    """True se l'ultimo close chiuso è sopra la media di `sma_days` giorni (None: storia corta)."""
    n = max(1, int(round(sma_days * 86400 / interval_to_timedelta(interval).total_seconds())))
    c = df["close"].astype(float)
    if len(c) < n:
        return None
    return bool(c.iloc[-1] > c.iloc[-n:].mean())


# ---------------------------------------------------------------- esecuzione
class PaperExchange:
    """Simula gli ordini al prezzo indicato con commissione e slippage dal config."""

    def __init__(self, fee_bps: float, slippage_bps: float):
        self.fee, self.slip = fee_bps / 1e4, slippage_bps / 1e4

    def buy(self, symbol: str, eur: float, price: float) -> Fill:
        px = price * (1 + self.slip)
        fee = eur * self.fee
        return Fill((eur - fee) / px, eur - fee, fee)

    def sell(self, symbol: str, qty: float, price: float) -> Fill:
        px = price * (1 - self.slip)
        gross = qty * px
        return Fill(qty, gross, gross * self.fee)

    def min_order(self, symbol: str, price: float) -> float:
        return 0.0


class KrakenExchange:
    """Ordini veri su Kraken via ccxt. Prima un ordine limite post-only al miglior prezzo
    (commissione maker), poi, se non eseguito entro `maker_wait_s`, il resto a mercato."""

    def __init__(self, cfg: Config, ex=None, sleep=time.sleep):
        self.cfg, self.t = cfg, cfg.trend
        self.ex = ex or ccxt_exchange("kraken", cfg.secrets.broker_api_key, cfg.secrets.broker_api_secret)
        self.sleep = sleep
        self.ex.load_markets()

    def min_order(self, symbol: str, price: float) -> float:
        lim = self.ex.markets[symbol]["limits"]
        return max((lim["amount"]["min"] or 0) * price, lim["cost"]["min"] or 0)

    def _fill(self, order: dict) -> Fill:
        fee = order.get("fee") or {}
        fee_eur = float(fee.get("cost") or 0.0) if fee.get("currency", "EUR") == "EUR" else 0.0
        return Fill(float(order.get("filled") or 0.0), float(order.get("cost") or 0.0), fee_eur)

    def _maker(self, symbol: str, side: str, qty: float) -> Fill:
        book = self.ex.fetch_order_book(symbol, limit=5)
        px = book["bids"][0][0] if side == "buy" else book["asks"][0][0]
        qty = float(self.ex.amount_to_precision(symbol, qty))
        o = self.ex.create_order(symbol, "limit", side, qty, px, {"postOnly": True})
        waited = 0
        while waited < self.t.maker_wait_s:
            self.sleep(10)
            waited += 10
            o = self.ex.fetch_order(o["id"], symbol)
            if o["status"] in ("closed", "canceled", "expired", "rejected"):
                break
        if o["status"] == "open":
            self.ex.cancel_order(o["id"], symbol)
            o = self.ex.fetch_order(o["id"], symbol)
        return self._fill(o)

    def buy(self, symbol: str, eur: float, price: float) -> Fill:
        got = Fill(0.0, 0.0, 0.0)
        if self.t.order_mode == "maker_then_market":
            got = self._maker(symbol, "buy", eur * 0.997 / price)   # margine per la commissione
        rest = eur - got.cost - got.fee
        if rest >= max(self.t.min_order, self.min_order(symbol, price)):
            o = self.ex.create_market_buy_order_with_cost(symbol, rest * 0.995)
            f = self._fill(self.ex.fetch_order(o["id"], symbol))
            got = Fill(got.qty + f.qty, got.cost + f.cost, got.fee + f.fee)
        return got

    def sell(self, symbol: str, qty: float, price: float) -> Fill:
        free = float(self.ex.fetch_balance()["free"].get(symbol.split("/")[0], 0.0))
        qty = min(qty, free)                       # mai più di quanto c'è davvero sul conto
        got = Fill(0.0, 0.0, 0.0)
        if qty * price < self.min_order(symbol, price):
            return got                             # residuo sotto il minimo di Kraken
        if self.t.order_mode == "maker_then_market":
            got = self._maker(symbol, "sell", qty)
        rest = qty - got.qty
        if rest * price >= self.min_order(symbol, price):
            o = self.ex.create_order(symbol, "market", "sell",
                                     float(self.ex.amount_to_precision(symbol, rest)))
            f = self._fill(self.ex.fetch_order(o["id"], symbol))
            got = Fill(got.qty + f.qty, got.cost + f.cost, got.fee + f.fee)
        return got


# ---------------------------------------------------------------- ciclo
def load_state(path: Path, cfg: Config) -> dict:
    if path.exists():
        return json.loads(path.read_text())
    per = cfg.trend.capital / len(cfg.trend.instruments)
    return {"last_bar": None, "sleeves": [asdict(Sleeve(i, per)) for i in cfg.trend.instruments]}


def save_state(path: Path, state: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, indent=1))
    tmp.replace(path)


def cycle(cfg: Config, state_path: Path, exchange, market: dict[str, pd.DataFrame] | None = None,
          kill_switch: str = KILL_SWITCH_FILE) -> list[str]:
    t = cfg.trend
    state = load_state(state_path, cfg)
    if market is None:
        step = interval_to_timedelta(t.interval)
        now = pd.Timestamp.now(tz="UTC")
        need = int(t.sma_days * 86400 / step.total_seconds()) + 10
        market = load_market(t.instruments, t.interval, now - need * step * 1.2, now, cache_dir=None)
    last = max(d["timestamps"].iloc[-1] for d in market.values())
    if state["last_bar"] == str(last):
        return []                                 # nessuna candela nuova
    stop = Path(kill_switch).exists()
    events = []
    for sd in state["sleeves"]:
        s = Sleeve(**{k: v for k, v in sd.items() if k in Sleeve.__dataclass_fields__})
        df = market.get(s.instrument)
        if df is None or df.empty:
            events.append(f"{s.instrument}: dati non disponibili, salto")
            continue
        sig = trend_signal(df, t.interval, t.sma_days)
        price = float(df["close"].iloc[-1])
        _, symbol = split_instrument(s.instrument)
        if sig and s.qty == 0 and not stop:
            if s.cash >= max(t.min_order, exchange.min_order(symbol, price)):
                f = exchange.buy(symbol, s.cash, price)
                if f.qty > 0:
                    s.qty, s.cash = f.qty, max(0.0, s.cash - f.cost - f.fee)
                    s.trades, s.fees = s.trades + 1, s.fees + f.fee
                    events.append(f"COMPRA {f.qty:.8g} {symbol} per {f.cost:.2f} € "
                                  f"(sopra la media {t.sma_days}g)")
        elif (sig is False or stop) and s.qty > 0:
            f = exchange.sell(symbol, s.qty, price)
            if f.qty == 0 and s.qty * price < max(t.min_order, exchange.min_order(symbol, price)):
                events.append(f"{symbol}: residuo di {s.qty:.8g} sotto il minimo vendibile, ignorato")
                s.qty = 0.0
            if f.qty > 0:
                s.qty = max(0.0, s.qty - f.qty)
                if s.qty * price < 0.01:
                    s.qty = 0.0
                s.cash += f.cost - f.fee
                s.trades, s.fees = s.trades + 1, s.fees + f.fee
                why = "file STOP" if stop else f"sotto la media {t.sma_days}g"
                events.append(f"VENDE {f.qty:.8g} {symbol} per {f.cost:.2f} € ({why})")
        sd.update(asdict(s))
        sd["value"] = round(s.cash + s.qty * price, 4)
    total = sum(sd.get("value", sd["cash"]) for sd in state["sleeves"])
    events.append(f"{last}: valore del bot {total:.2f} € (capitale iniziale {t.capital:.2f} €)")
    state["last_bar"] = str(last)
    save_state(state_path, state)
    return events


def make_exchange(cfg: Config):
    if cfg.broker == "kraken" and cfg.mode == "live":
        return KrakenExchange(cfg)
    if cfg.broker == "kraken":
        raise RuntimeError("broker: kraken va usato con mode: live. Per provare senza soldi veri "
                           "usa broker: paper (prezzi reali di Kraken, ordini simulati).")
    c = cfg.costs
    return PaperExchange(c.fee_bps, c.slippage_bps)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.yaml")
    ap.add_argument("--once", action="store_true")
    args = ap.parse_args()
    cfg = load_config(args.config)
    if cfg.strategy != "trend":
        raise SystemExit("Questo comando richiede strategy: trend nel config")
    exchange = make_exchange(cfg)
    print(f"Bot trend avviato: {'SOLDI VERI su Kraken' if cfg.mode == 'live' else 'simulazione'}, "
          f"{len(cfg.trend.instruments)} strumenti, capitale {cfg.trend.capital} €", flush=True)
    state_path = Path(cfg.state_dir) / ("trend_live.json" if cfg.mode == "live" else "trend_paper.json")
    step = interval_to_timedelta(cfg.trend.interval)
    while True:
        try:
            for e in cycle(cfg, state_path, exchange):
                print(e, flush=True)
        except Exception as e:  # noqa: BLE001 — un errore di rete non deve fermare il bot
            print(f"ERRORE nel ciclo: {e}", flush=True)
            if args.once:
                raise
        if args.once:
            break
        now = pd.Timestamp.now(tz="UTC")
        nxt = now.floor(step) + step + pd.Timedelta(seconds=30)    # subito dopo la chiusura
        time.sleep(max(10.0, (nxt - now).total_seconds()))


if __name__ == "__main__":
    main()
