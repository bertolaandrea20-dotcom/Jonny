"""Motore di trading: la stessa logica gira nel bot live, in paper e nel backtest.

Una chiamata a `on_bar` = una candela chiusa: previsione -> segnale -> rischio -> esecuzione.
"""
from __future__ import annotations

import csv
import logging
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from .config import Config
from .data import interval_to_timedelta
from .forecaster import BaseForecaster
from .risk import RiskManager
from .state import BotState, Position
from .strategy import decide, intrabar_exit

log = logging.getLogger(__name__)

TRADE_FIELDS = ["entry_time", "exit_time", "entry_price", "exit_price", "qty_sol",
                "cost_usd", "proceeds_usd", "pnl_usd", "pnl_pct", "fees_usd",
                "exit_reason", "entry_tx", "exit_tx"]


@dataclass
class Event:
    kind: str       # OPEN | CLOSE | SKIP | ERROR | HALT
    text: str


class Engine:
    def __init__(self, cfg: Config, state: BotState, forecaster: BaseForecaster,
                 executor, risk: RiskManager, trades_file: str | None = None,
                 bias_filter=None):
        self.cfg = cfg
        self.state = state
        self.forecaster = forecaster
        self.executor = executor
        self.risk = risk
        self.bias_filter = bias_filter   # BiasFilter opzionale (filtro giornaliero TradingAgents)
        self.bias_stats = {"bloccati": 0, "uscite_forzate": 0}
        self.trades_file = trades_file
        self.trades: list[dict] = []

    # ------------------------------------------------------------
    def mark_to_market(self, price: float) -> float:
        p = self.state.position
        if p is None:
            return self.state.equity_usd
        c = self.cfg.costs
        # Valore di liquidazione: stessi costi di uscita di PaperExecutor.sell.
        exit_value = p.qty_sol * price * (1 - c.slippage_bps / 1e4) * (1 - c.fee_bps / 1e4)
        return self.state.equity_usd - p.cost_usd + exit_value

    def check_stops(self, open_: float, high: float, low: float,
                    t: pd.Timestamp) -> Event | None:
        """Controllo SL/TP tra una previsione e l'altra (nessuna chiamata al modello).

        Backtest: chiamato su ogni candela con il suo OHLC.
        Live: chiamato ogni pochi secondi con l'ultimo prezzo (open = high = low).
        """
        st = self.state
        if st.position is None or not self.cfg.strategy.intrabar_stops:
            return None
        hit = intrabar_exit(st.position, open_, high, low, self.cfg.strategy)
        if hit is None:
            return None
        self.risk.roll_day(st, t)
        price, reason = hit
        return self._close(price, t.isoformat(), reason)

    def on_bar(self, df: pd.DataFrame) -> list[Event]:
        st = self.state
        bar_time = df["timestamps"].iloc[-1]
        bar_key = bar_time.isoformat()
        if bar_key == st.last_bar_time:
            return []  # candela già processata
        st.last_bar_time = bar_key
        self.risk.roll_day(st, bar_time)
        price = float(df["close"].iloc[-1])
        if st.position:
            # Barre trascorse calcolate dal tempo: corretto anche con backtest --step > 1.
            elapsed = bar_time - pd.Timestamp(st.position.entry_time)
            st.position.bars_held = int(elapsed / interval_to_timedelta(self.cfg.market.interval))

        events: list[Event] = []
        bias = None
        if self.bias_filter:
            bias, _ = self.bias_filter.bias_for(bar_time)
            if bias != st.extra.get("bias"):
                st.extra["bias"] = bias
                events.append(Event("BIAS", f"📅 Filtro giornaliero: bias {bias.upper()}"))
            if st.position and self.bias_filter.forces_exit(bias):
                self.bias_stats["uscite_forzate"] += 1
                events.append(self._close(price, bar_key, "filtro giornaliero bearish"))
                return events

        fc = self.forecaster.forecast(df)
        sig = decide(fc, st.position, price, self.cfg.strategy, self.cfg.costs)
        log.debug("%s price=%.4f exp=%.1fbps -> %s (%s)", bar_key, price,
                  fc.expected_return_bps, sig.action, sig.reason)

        if sig.action == "SELL" and st.position:
            events.append(self._close(price, bar_key, sig.reason))
        elif sig.action == "BUY" and st.position is None:
            ok, why = self.risk.can_open(st)
            if ok and bias is not None:
                ok, why = self.bias_filter.allows_open(bias)
                if not ok:
                    self.bias_stats["bloccati"] += 1
            if not ok:
                events.append(Event("SKIP", f"BUY saltato: {why}"))
            else:
                events.append(self._open(price, bar_key, sig.reason))
        return events

    def force_close(self, price: float, reason: str, t: pd.Timestamp | None = None) -> Event | None:
        if self.state.position is None:
            return None
        t = t if t is not None else pd.Timestamp.now(tz="UTC")
        return self._close(price, t.isoformat(), reason)

    # ------------------------------------------------------------
    def _open(self, price: float, t: str, reason: str) -> Event:
        st = self.state
        usd = self.risk.position_size_usd(st)
        fill = self.executor.buy(usd, price)
        st.position = Position(entry_price=fill.price, qty_sol=fill.qty_sol,
                               cost_usd=fill.usd, entry_time=t)
        st.extra["entry_tx"] = fill.tx
        st.extra["entry_fee"] = fill.fee_usd
        st.trades_today += 1
        st.total_fees_usd += fill.fee_usd
        return Event("OPEN", f"🟢 BUY {fill.qty_sol:.4f} SOL @ {fill.price:.3f} "
                             f"(${fill.usd:.2f}) — {reason}")

    def _close(self, price: float, t: str, reason: str) -> Event:
        st = self.state
        p = st.position
        fill = self.executor.sell(p.qty_sol, price)
        pnl = fill.usd - p.cost_usd
        st.equity_usd += pnl
        st.total_fees_usd += fill.fee_usd
        st.closed_trades += 1
        st.winning_trades += int(pnl > 0)
        row = {
            "entry_time": p.entry_time, "exit_time": t,
            "entry_price": round(p.entry_price, 6), "exit_price": round(fill.price, 6),
            "qty_sol": round(p.qty_sol, 6), "cost_usd": round(p.cost_usd, 4),
            "proceeds_usd": round(fill.usd, 4), "pnl_usd": round(pnl, 4),
            "pnl_pct": round(pnl / p.cost_usd * 100, 4),
            "fees_usd": round(st.extra.get("entry_fee", 0) + fill.fee_usd, 4),
            "exit_reason": reason, "entry_tx": st.extra.get("entry_tx", ""), "exit_tx": fill.tx,
        }
        self.trades.append(row)
        self._append_trade(row)
        st.position = None
        self.risk.update_after_close(st)
        emoji = "✅" if pnl > 0 else "🔴"
        text = (f"{emoji} SELL @ {fill.price:.3f} — PnL ${pnl:+.2f} ({row['pnl_pct']:+.2f}%) "
                f"— {reason}\nEquity: ${st.equity_usd:.2f}")
        if st.halted:
            text += f"\n⛔ BOT FERMATO: {st.halt_reason}"
        return Event("CLOSE", text)

    def _append_trade(self, row: dict) -> None:
        if not self.trades_file:
            return
        path = Path(self.trades_file)
        new = not path.exists()
        with path.open("a", newline="") as f:
            w = csv.DictWriter(f, fieldnames=TRADE_FIELDS)
            if new:
                w.writeheader()
            w.writerow(row)
