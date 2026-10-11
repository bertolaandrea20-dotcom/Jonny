"""Broker simulato: esegue al prezzo di riferimento con slippage e commissioni."""

from __future__ import annotations

import itertools
import random

from .base import Broker, Fill


class PaperBroker(Broker):
    name = "paper"

    def __init__(self, fee_rate: float = 0.0026, slippage: float = 0.0005, seed: int | None = None):
        self.fee_rate = fee_rate
        self.slippage = slippage
        self.rng = random.Random(seed)
        self._ids = itertools.count(1)

    def execute(self, symbol: str, side: str, qty: float, ref_price: float) -> Fill:
        slip = self.slippage * self.rng.uniform(0.2, 1.0)
        price = ref_price * (1 + slip if side == "buy" else 1 - slip)
        fee = price * qty * self.fee_rate
        return Fill(symbol, side, qty, price, fee, "paper", f"P{next(self._ids)}")

    def describe(self) -> str:
        return f"Paper trading (commissione {self.fee_rate:.2%}, nessun denaro reale)"
