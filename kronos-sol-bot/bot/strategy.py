"""Regole di trading: traducono una previsione in BUY / SELL / HOLD.

Solo spot long: o si detiene SOL o si sta in USDC. Niente leva, niente short.
"""
from __future__ import annotations

from dataclasses import dataclass

from .config import CostsCfg, StrategyCfg
from .forecaster import Forecast
from .state import Position


@dataclass
class Signal:
    action: str     # BUY | SELL | HOLD
    reason: str


def decide(fc: Forecast, position: Position | None, price: float,
           s: StrategyCfg, costs: CostsCfg) -> Signal:
    exp = fc.expected_return_bps

    if position is None:
        hurdle = costs.roundtrip_bps + s.min_edge_bps
        if exp <= hurdle:
            return Signal("HOLD", f"previsto {exp:.1f}bps sotto soglia {hurdle:.1f}bps")
        up = fc.up_fraction
        if up < s.min_up_fraction:
            return Signal("HOLD", f"previsto +{exp:.1f}bps ma solo {up:.0%} dei campioni al rialzo "
                                  f"(minimo {s.min_up_fraction:.0%})")
        return Signal("BUY", f"previsto +{exp:.1f}bps > soglia {hurdle:.1f}bps, "
                             f"{up:.0%} campioni al rialzo")

    pnl_bps = (price / position.entry_price - 1) * 1e4
    if pnl_bps >= s.take_profit_bps:
        return Signal("SELL", f"take profit {pnl_bps:.1f}bps")
    if pnl_bps <= -s.stop_loss_bps:
        return Signal("SELL", f"stop loss {pnl_bps:.1f}bps")
    if position.bars_held >= s.max_hold_bars:
        return Signal("SELL", f"tempo massimo ({position.bars_held} barre)")
    if exp < s.exit_edge_bps:
        return Signal("SELL", f"previsione girata: {exp:.1f}bps")
    return Signal("HOLD", f"in posizione, pnl {pnl_bps:.1f}bps, previsto {exp:.1f}bps")


def intrabar_exit(position: Position, open_: float, high: float, low: float,
                  s: StrategyCfg) -> tuple[float, str] | None:
    """Stop loss / take profit toccati DENTRO la candela.

    Ritorna (prezzo di riferimento per l'uscita, motivo) oppure None.
    - Se il prezzo apre già oltre un livello (gap) si esce all'apertura.
    - Se nella stessa candela vengono toccati sia SL sia TP, si assume lo SL (pessimista):
      con solo OHLC non si sa quale sia arrivato prima.
    Nel bot live open = high = low = ultimo prezzo letto.
    """
    sl = position.entry_price * (1 - s.stop_loss_bps / 1e4)
    tp = position.entry_price * (1 + s.take_profit_bps / 1e4)
    if open_ <= sl:
        return open_, "stop loss intrabar"
    if open_ >= tp:
        return open_, "take profit intrabar"
    if low <= sl:
        return sl, "stop loss intrabar"
    if high >= tp:
        return tp, "take profit intrabar"
    return None
