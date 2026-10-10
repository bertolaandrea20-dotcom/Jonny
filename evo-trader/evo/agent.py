"""Un agente: DNA + conto simulato. Stessa logica in backtest, paper e (via broker) live.

Esecuzione per candela i:
1. all'apertura porta la posizione al segnale della candela i-1 (fee + slippage);
2. dentro la candela controlla stop loss / take profit / liquidazione su high e low
   (se si toccano sia SL sia TP si assume lo SL: stima prudente);
3. addebita il costo di leva/short (funding) e valuta l'equity al close.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from .config import CostsCfg
from .genome import Genome

MAINTENANCE = 0.5   # liquidazione quando la perdita supera il 50% del margine


@dataclass
class Position:
    side: float          # +1 long, -1 short
    qty: float           # unità dell'asset
    entry: float         # prezzo effettivo di ingresso (slippage incluso)
    notional: float      # valore all'ingresso
    leverage: float


@dataclass
class Agent:
    genome: Genome
    status: str = "shadow"            # shadow (soldi finti) | funded (soldi veri) | dead
    allocation: float = 20.0          # capitale ricevuto (reale se funded, virtuale se shadow)
    cash: float = 20.0                # equity realizzata
    born_epoch: int = 0
    funded_epoch: int | None = None
    death_reason: str = ""
    position: Position | None = None
    lock_side: float = 0.0            # dopo SL/TP non rientra nella stessa direzione finché il segnale non cambia
    epoch_pnl: list[float] = field(default_factory=list)
    epoch_trades: list[int] = field(default_factory=list)
    trades: list[dict] = field(default_factory=list)
    fees_paid: float = 0.0
    _epoch_start_equity: float = 0.0
    _epoch_trade_count: int = 0

    # ---------------------------------------------------------------- conto
    def equity(self, price: float) -> float:
        p = self.position
        if p is None:
            return self.cash
        return max(self.cash + p.side * p.qty * (price - p.entry), 0.0)

    def _open(self, side: float, price: float, costs: CostsCfg, t) -> None:
        if self.cash <= 0:
            return
        lev = self.genome.leverage
        entry = price * (1 + side * costs.slippage_bps / 1e4)
        notional = self.cash * lev
        fee = notional * costs.fee_bps / 1e4
        self.cash -= fee
        self.fees_paid += fee
        self.position = Position(side, notional / entry, entry, notional, lev)
        self._entry_time = t
        self._entry_fee = fee

    def _close(self, price: float, costs: CostsCfg, t, reason: str) -> None:
        p = self.position
        exit_ = price * (1 - p.side * costs.slippage_bps / 1e4)
        fee = p.qty * exit_ * costs.fee_bps / 1e4
        pnl = p.side * p.qty * (exit_ - p.entry) - fee
        self.cash = max(self.cash + pnl, 0.0)
        self.fees_paid += fee
        self.trades.append({
            "agent": self.genome.id, "symbol": self.genome.symbol, "side": int(p.side),
            "entry_time": str(self._entry_time), "exit_time": str(t),
            "entry": round(p.entry, 6), "exit": round(exit_, 6), "leverage": round(p.leverage, 2),
            "pnl": round(pnl - self._entry_fee, 4),
            "pnl_pct": round((pnl - self._entry_fee) / (p.notional / p.leverage) * 100, 3),
            "reason": reason, "status": self.status,
        })
        self.position = None
        self._epoch_trade_count += 1

    # ---------------------------------------------------------------- candela
    def step(self, prev_signal: float, o: float, h: float, lo: float, c: float, t,
             costs: CostsCfg, funding_per_bar: float) -> None:
        if self.status == "dead":
            return
        target = float(prev_signal)
        if target != self.lock_side:
            self.lock_side = 0.0
        if target == self.lock_side and target != 0:
            target = 0.0
        p = self.position
        if p is not None and p.side != target:
            self._close(o, costs, t, "segnale")
        if self.position is None and target != 0 and self.cash > 0:
            self._open(target, o, costs, t)

        p = self.position
        if p is not None:
            g = self.genome
            sl = p.entry * (1 - p.side * g.stop_loss)
            tp = p.entry * (1 + p.side * g.take_profit)
            liq = p.entry * (1 - p.side * (1 - MAINTENANCE) / p.leverage)
            worst, best = (lo, h) if p.side > 0 else (h, lo)
            hit_sl = worst <= sl if p.side > 0 else worst >= sl
            hit_liq = worst <= liq if p.side > 0 else worst >= liq
            hit_tp = best >= tp if p.side > 0 else best <= tp
            if hit_liq and (p.side > 0 and liq >= sl or p.side < 0 and liq <= sl):
                self._close(liq, costs, t, "liquidazione")
                self.lock_side = p.side
            elif hit_sl:
                self._close(sl, costs, t, "stop loss")
                self.lock_side = p.side
            elif hit_tp:
                self._close(tp, costs, t, "take profit")
                self.lock_side = p.side
        p = self.position
        if p is not None:
            # Funding: sulla parte presa a prestito (long con leva) o su tutto il nozionale (short).
            borrowed = p.notional if p.side < 0 else p.notional * (1 - 1 / p.leverage)
            cost = borrowed * funding_per_bar
            self.cash -= cost
            self.fees_paid += cost

    # ---------------------------------------------------------------- epoche
    def start_epoch(self, price: float) -> None:
        self._epoch_start_equity = self.equity(price)
        self._epoch_trade_count = 0

    def end_epoch(self, price: float) -> None:
        self.epoch_pnl.append(self.equity(price) - self._epoch_start_equity)
        self.epoch_trades.append(self._epoch_trade_count)

    def window_pnl(self, n: int) -> float:
        return float(np.sum(self.epoch_pnl[-n:])) if self.epoch_pnl else 0.0

    def window_trades(self, n: int) -> int:
        return int(np.sum(self.epoch_trades[-n:])) if self.epoch_trades else 0

    def liquidate(self, price: float, costs: CostsCfg, t, reason: str) -> None:
        if self.position is not None:
            self._close(price, costs, t, reason)
