"""Stato persistente del bot (sopravvive ai riavvii)."""
from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass, field
from pathlib import Path


@dataclass
class Position:
    entry_price: float
    qty_sol: float
    cost_usd: float           # USD spesi, fee incluse
    entry_time: str
    bars_held: int = 0


@dataclass
class BotState:
    equity_usd: float
    peak_equity_usd: float
    day: str = ""
    day_start_equity_usd: float = 0.0
    trades_today: int = 0
    position: Position | None = None
    paused: bool = False
    halted: bool = False
    halt_reason: str = ""
    consecutive_errors: int = 0
    total_fees_usd: float = 0.0
    closed_trades: int = 0
    winning_trades: int = 0
    last_bar_time: str = ""
    extra: dict = field(default_factory=dict)

    @classmethod
    def fresh(cls, equity: float) -> "BotState":
        return cls(equity_usd=equity, peak_equity_usd=equity, day_start_equity_usd=equity)

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "BotState":
        pos = d.pop("position", None)
        st = cls(**d)
        st.position = Position(**pos) if pos else None
        return st


def load_state(path: str, starting_equity: float) -> BotState:
    p = Path(path)
    if not p.exists():
        return BotState.fresh(starting_equity)
    return BotState.from_dict(json.loads(p.read_text()))


def save_state(state: BotState, path: str) -> None:
    tmp = f"{path}.tmp"
    Path(tmp).write_text(json.dumps(state.to_dict(), indent=2))
    os.replace(tmp, path)  # scrittura atomica
