"""Il DNA di una strategia.

Ogni cittadino porta un genoma: quanto pesa ciascun analista, quanti round di
dibattito fa, quanto rischio accetta, quali soglie usa per entrare e uscire.
Un genoma che perde viene messo nella lista nera: né lui né un genoma troppo
simile potranno più nascere.
"""

from __future__ import annotations

import hashlib
import json
import math
import random
from dataclasses import asdict, dataclass, field

STYLES = ("momentum", "mean_reversion", "breakout")

# (min, max) di ogni gene numerico: serve a mutare e a misurare le distanze.
BOUNDS: dict[str, tuple[float, float]] = {
    "w_market": (0.0, 1.0),
    "w_sentiment": (0.0, 1.0),
    "w_news": (0.0, 1.0),
    "w_fundamentals": (0.0, 1.0),
    "debate_rounds": (1, 3),
    "risk_rounds": (1, 2),
    "risk_appetite": (0.0, 1.0),
    "entry_threshold": (0.05, 0.6),
    "exit_threshold": (-0.6, 0.0),
    "position_size": (0.05, 0.6),
    "stop_loss": (0.005, 0.08),
    "take_profit": (0.005, 0.15),
    "fast_ma": (3, 20),
    "slow_ma": (15, 80),
    "rsi_period": (5, 30),
    "rsi_low": (15, 40),
    "rsi_high": (60, 85),
}
INT_GENES = {"debate_rounds", "risk_rounds", "fast_ma", "slow_ma", "rsi_period", "rsi_low", "rsi_high"}

FIRST = ["Aldo", "Bice", "Carlo", "Dora", "Ettore", "Flora", "Gino", "Ida", "Leo", "Mara", "Nino",
         "Olga", "Pia", "Rino", "Sara", "Tito", "Ugo", "Vera", "Zeno", "Alba", "Bruno", "Cleo",
         "Dante", "Elsa", "Fausto", "Gaia", "Iris", "Livio", "Nora", "Otto", "Rita", "Sergio"]


@dataclass
class Genome:
    w_market: float = 0.5
    w_sentiment: float = 0.5
    w_news: float = 0.5
    w_fundamentals: float = 0.5
    debate_rounds: int = 1
    risk_rounds: int = 1
    risk_appetite: float = 0.5
    entry_threshold: float = 0.2
    exit_threshold: float = -0.15
    position_size: float = 0.25
    stop_loss: float = 0.02
    take_profit: float = 0.04
    fast_ma: int = 8
    slow_ma: int = 30
    rsi_period: int = 14
    rsi_low: int = 30
    rsi_high: int = 70
    style: str = "momentum"
    contrarian: bool = False
    symbols: list[str] = field(default_factory=list)

    # ── identità ─────────────────────────────────────────
    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "Genome":
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})

    def fingerprint(self) -> str:
        """Impronta della strategia (geni discretizzati), usata per la lista nera."""
        coarse = {}
        for k, (lo, hi) in BOUNDS.items():
            coarse[k] = round((getattr(self, k) - lo) / (hi - lo) * 10)
        coarse["style"] = self.style
        coarse["contrarian"] = self.contrarian
        coarse["symbols"] = sorted(self.symbols)
        raw = json.dumps(coarse, sort_keys=True).encode()
        return hashlib.sha1(raw).hexdigest()[:12]

    def vector(self) -> list[float]:
        v = [(getattr(self, k) - lo) / (hi - lo) for k, (lo, hi) in BOUNDS.items()]
        v.append(STYLES.index(self.style) / 2)
        v.append(1.0 if self.contrarian else 0.0)
        return v

    def distance(self, other: "Genome") -> float:
        a, b = self.vector(), other.vector()
        d = math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)) / len(a))
        if set(self.symbols) != set(other.symbols):
            d += 0.05
        return d

    def describe(self) -> str:
        weights = {"mercato": self.w_market, "sentiment": self.w_sentiment,
                   "news": self.w_news, "fondamentali": self.w_fundamentals}
        top = max(weights, key=weights.get)
        risk = "audace" if self.risk_appetite > 0.66 else "prudente" if self.risk_appetite < 0.33 else "equilibrato"
        contra = ", contrarian" if self.contrarian else ""
        return f"{self.style.replace('_', ' ')}, si fida di {top}, {risk}{contra}"


def _clip(name: str, value: float) -> float:
    lo, hi = BOUNDS[name]
    value = min(hi, max(lo, value))
    return int(round(value)) if name in INT_GENES else value


def _fix(g: Genome) -> Genome:
    if g.slow_ma <= g.fast_ma + 4:
        g.slow_ma = int(min(BOUNDS["slow_ma"][1], g.fast_ma + 5))
    if g.take_profit < g.stop_loss:
        g.take_profit = min(BOUNDS["take_profit"][1], g.stop_loss * 1.5)
    return g


def random_genome(rng: random.Random, universe: list[str]) -> Genome:
    g = Genome()
    for name, (lo, hi) in BOUNDS.items():
        setattr(g, name, _clip(name, rng.uniform(lo, hi)))
    g.style = rng.choice(STYLES)
    g.contrarian = rng.random() < 0.2
    k = rng.randint(1, min(3, len(universe)))
    g.symbols = rng.sample(universe, k)
    return _fix(g)


def mutate(parent: Genome, rng: random.Random, universe: list[str], strength: float = 0.12) -> Genome:
    g = Genome.from_dict(parent.to_dict())
    for name, (lo, hi) in BOUNDS.items():
        if rng.random() < 0.5:
            setattr(g, name, _clip(name, getattr(g, name) + rng.gauss(0, strength * (hi - lo))))
    if rng.random() < 0.08:
        g.style = rng.choice(STYLES)
    if rng.random() < 0.05:
        g.contrarian = not g.contrarian
    if rng.random() < 0.2 and universe:
        syms = set(g.symbols)
        sym = rng.choice(universe)
        if sym in syms and len(syms) > 1:
            syms.discard(sym)
        else:
            syms.add(sym)
        g.symbols = sorted(syms)[:4]
    return _fix(g)


def crossover(a: Genome, b: Genome, rng: random.Random) -> Genome:
    da, db = a.to_dict(), b.to_dict()
    child = {k: (da[k] if rng.random() < 0.5 else db[k]) for k in da}
    return _fix(Genome.from_dict(child))


def citizen_name(rng: random.Random, generation: int) -> str:
    return f"{rng.choice(FIRST)} {_roman(generation)}"


def _roman(n: int) -> str:
    vals = [(10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")]
    out = ""
    n = max(1, n)
    for v, s in vals:
        while n >= v:
            out += s
            n -= v
    return out
