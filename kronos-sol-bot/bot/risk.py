"""Gestione del rischio: decide se si può aprire e quanto grande.

Le uscite (SELL) non vengono mai bloccate dal risk manager: chiudere deve essere sempre possibile.
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd

from .config import RiskCfg
from .state import BotState

KILL_SWITCH_FILE = "STOP"   # crea un file STOP nella cartella del bot per fermarlo


class RiskManager:
    def __init__(self, cfg: RiskCfg, kill_switch_path: str = KILL_SWITCH_FILE):
        self.cfg = cfg
        self.kill_switch_path = kill_switch_path

    def roll_day(self, state: BotState, now: pd.Timestamp) -> None:
        day = now.strftime("%Y-%m-%d")
        if state.day != day:
            state.day = day
            state.day_start_equity_usd = state.equity_usd
            state.trades_today = 0

    def update_after_close(self, state: BotState) -> None:
        state.peak_equity_usd = max(state.peak_equity_usd, state.equity_usd)
        dd = (1 - state.equity_usd / state.peak_equity_usd) * 100
        if dd >= self.cfg.max_drawdown_pct:
            state.halted = True
            state.halt_reason = f"drawdown massimo raggiunto ({dd:.1f}%)"

    def can_open(self, state: BotState) -> tuple[bool, str]:
        if Path(self.kill_switch_path).exists():
            return False, "kill switch (file STOP presente)"
        if state.halted:
            return False, f"bot fermato: {state.halt_reason}"
        if state.paused:
            return False, "in pausa"
        if state.trades_today >= self.cfg.max_trades_per_day:
            return False, "limite trade giornalieri raggiunto"
        if state.day_start_equity_usd > 0:
            day_pnl = (state.equity_usd / state.day_start_equity_usd - 1) * 100
            if day_pnl <= -self.cfg.daily_loss_limit_pct:
                return False, f"perdita giornaliera {day_pnl:.2f}% oltre il limite"
        if self.position_size_usd(state) < self.cfg.min_order_usd:
            return False, "capitale insufficiente per l'ordine minimo"
        return True, "ok"

    def position_size_usd(self, state: BotState) -> float:
        return round(state.equity_usd * self.cfg.position_fraction, 2)
