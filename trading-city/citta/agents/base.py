"""Strutture condivise dal grafo di ragionamento."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field

# Scala a 5 livelli, la stessa di TradingAgents.
RATINGS = ("Buy", "Overweight", "Hold", "Underweight", "Sell")
RATING_IT = {"Buy": "Compra", "Overweight": "Sovrappesa", "Hold": "Mantieni",
             "Underweight": "Sottopesa", "Sell": "Vendi"}


def score_to_rating(score: float, entry: float) -> str:
    if score >= entry * 1.6:
        return "Buy"
    if score >= entry:
        return "Overweight"
    if score <= -entry * 1.6:
        return "Sell"
    if score <= -entry:
        return "Underweight"
    return "Hold"


@dataclass
class Step:
    """Un passaggio del grafo: chi parla, in che fase, cosa dice, che segnale dà."""

    agent: str
    phase: str  # analisti | ricerca | trader | rischio | decisione
    text: str
    signal: float = 0.0
    confidence: float = 0.0
    data: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        d = asdict(self)
        d["signal"] = round(self.signal, 3)
        d["confidence"] = round(self.confidence, 3)
        return d


@dataclass
class Decision:
    symbol: str
    tick: int
    price: float
    rating: str
    action: str  # buy | sell | hold
    fraction: float  # quota del capitale (buy) o della posizione (sell)
    score: float
    stop_loss: float
    take_profit: float
    steps: list[Step]
    llm: bool = False

    def to_dict(self) -> dict:
        return {
            "symbol": self.symbol, "tick": self.tick, "price": self.price,
            "rating": self.rating, "rating_it": RATING_IT[self.rating], "action": self.action,
            "fraction": round(self.fraction, 4), "score": round(self.score, 4),
            "stop_loss": self.stop_loss, "take_profit": self.take_profit,
            "llm": self.llm, "steps": [s.to_dict() for s in self.steps],
        }


def clamp(x: float, lo: float = -1.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, x))


def fmt_pct(x: float) -> str:
    return f"{x * 100:+.2f}%"
