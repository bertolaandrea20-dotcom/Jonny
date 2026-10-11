"""Un cittadino: un agente di trading con il suo genoma e il suo sotto-conto."""

from __future__ import annotations

from dataclasses import dataclass, field

from ..genome import Genome


@dataclass
class Position:
    qty: float = 0.0
    avg: float = 0.0
    opened_tick: int = 0


@dataclass
class Citizen:
    id: int
    name: str
    genome: Genome
    generation: int
    parent_id: int | None
    born_day: int
    born_tick: int
    cash: float
    capital_at_birth: float
    equity_day_start: float = 0.0
    status: str = "alive"  # alive | dead | retired
    death_day: int | None = None
    death_cause: str = ""
    days_survived: int = 0
    children: list[int] = field(default_factory=list)
    positions: dict[str, Position] = field(default_factory=dict)
    curve: list[tuple[int, float]] = field(default_factory=list)
    last_decisions: dict[str, dict] = field(default_factory=dict)
    trades: int = 0
    wins: int = 0
    realized: float = 0.0
    fees: float = 0.0
    day_results: list[float] = field(default_factory=list)
    final_equity: float | None = None

    @property
    def alive(self) -> bool:
        return self.status == "alive"

    @property
    def age_days(self) -> int:
        return self.days_survived

    def equity(self, prices: dict[str, float]) -> float:
        if self.final_equity is not None and not self.alive:
            return self.final_equity
        return self.cash + sum(p.qty * prices.get(s, p.avg) for s, p in self.positions.items())

    def held(self, sym: str) -> Position:
        return self.positions.get(sym) or Position()

    def summary(self, prices: dict[str, float]) -> dict:
        eq = self.equity(prices)
        return {
            "id": self.id, "name": self.name, "generation": self.generation, "parent_id": self.parent_id,
            "status": self.status, "born_day": self.born_day, "death_day": self.death_day,
            "death_cause": self.death_cause, "days_survived": self.days_survived,
            "equity": round(eq, 2), "cash": round(self.cash, 2),
            "capital_at_birth": round(self.capital_at_birth, 2),
            "day_pnl": round(eq - self.equity_day_start, 2) if self.alive else None,
            "day_pnl_pct": round((eq / self.equity_day_start - 1) * 100, 3) if self.alive and self.equity_day_start else None,
            "life_pnl": round(eq - self.capital_at_birth, 2),
            "trades": self.trades, "wins": self.wins, "children": list(self.children),
            "style": self.genome.style, "symbols": self.genome.symbols,
            "fingerprint": self.genome.fingerprint(), "carattere": self.genome.describe(),
            "positions": {s: {"qty": p.qty, "avg": p.avg, "value": round(p.qty * prices.get(s, p.avg), 2)}
                          for s, p in self.positions.items() if p.qty > 0},
        }
