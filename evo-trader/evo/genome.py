"""Il DNA di un agente: famiglia di strategia, parametri e geni di rischio.

Le famiglie vengono dalle strategie classiche raccolte in awesome-systematic-trading
(trend following, breakout di Donchian, mean reversion RSI/Bollinger, momentum).
"""
from __future__ import annotations

import uuid
from dataclasses import asdict, dataclass, field

import numpy as np

from .config import GenomeCfg

# gene: (minimo, massimo, intero?)
FAMILY_GENES: dict[str, dict[str, tuple[float, float, bool]]] = {
    "trend_ma": {"fast": (5, 60, True), "slow": (20, 240, True)},
    "breakout": {"entry": (10, 160, True), "exit": (5, 80, True)},
    "rsi_revert": {"period": (5, 30, True), "low": (10, 40, False), "high": (60, 90, False)},
    "bollinger": {"period": (10, 80, True), "k": (1.0, 3.5, False)},
    "momentum": {"lookback": (6, 240, True), "threshold": (0.0, 0.08, False)},
}
RISK_GENES: dict[str, tuple[float, float, bool]] = {
    "stop_loss": (0.01, 0.10, False),     # 1% - 10% dal prezzo di ingresso
    "take_profit": (0.02, 0.30, False),   # 2% - 30%
}
KRONOS_GENE = (0.0, 300.0, False)         # rendimento previsto minimo in bps per entrare


@dataclass
class Genome:
    family: str
    params: dict[str, float]
    stop_loss: float
    take_profit: float
    leverage: float = 1.0
    allow_short: bool = False
    symbol: str = "SOLUSDT"
    kronos_min_bps: float | None = None   # None = filtro Kronos spento
    bias_filter: bool = False             # filtro giornaliero TradingAgents
    id: str = field(default_factory=lambda: f"A{uuid.uuid4().hex[:8]}")   # unico anche tra riavvii
    parent_id: str | None = None
    generation: int = 0

    def describe(self) -> str:
        p = ", ".join(f"{k}={v:g}" for k, v in self.params.items())
        extra = []
        if self.allow_short:
            extra.append("short")
        if self.kronos_min_bps is not None:
            extra.append(f"kronos>{self.kronos_min_bps:.0f}bps")
        if self.bias_filter:
            extra.append("bias")
        return (f"{self.symbol} {self.family}({p}) SL {self.stop_loss:.1%} TP {self.take_profit:.1%} "
                f"leva {self.leverage:.1f}x" + (f" [{', '.join(extra)}]" if extra else ""))

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "Genome":
        return cls(**d)


def _new_id(rng: np.random.Generator) -> str:
    """ID dal generatore dell'ecosistema: riproducibile e unico anche dopo un riavvio
    (lo stato del generatore viene salvato insieme agli agenti)."""
    return f"A{int(rng.integers(16 ** 10)):010x}"


def _sample(rng: np.random.Generator, lo: float, hi: float, is_int: bool) -> float:
    v = rng.uniform(lo, hi)
    return float(int(round(v))) if is_int else float(v)


def _fix(family: str, params: dict[str, float]) -> dict[str, float]:
    """Vincoli tra geni: media veloce < lenta, soglie RSI ordinate."""
    p = dict(params)
    if family == "trend_ma" and p["fast"] >= p["slow"]:
        p["fast"], p["slow"] = min(p["fast"], p["slow"] - 1), max(p["slow"], p["fast"] + 1)
    if family == "breakout" and p["exit"] > p["entry"]:
        p["exit"] = p["entry"]
    return p


def random_genome(rng: np.random.Generator, cfg: GenomeCfg, symbols: list[str]) -> Genome:
    family = str(rng.choice(cfg.families))
    params = {k: _sample(rng, *g) for k, g in FAMILY_GENES[family].items()}
    return Genome(
        family=family,
        params=_fix(family, params),
        stop_loss=_sample(rng, *RISK_GENES["stop_loss"]),
        take_profit=_sample(rng, *RISK_GENES["take_profit"]),
        leverage=float(rng.uniform(1.0, cfg.max_leverage)) if cfg.max_leverage > 1 else 1.0,
        allow_short=bool(cfg.allow_short and rng.random() < 0.5),
        symbol=str(rng.choice(symbols)),
        kronos_min_bps=_sample(rng, *KRONOS_GENE) if cfg.use_kronos and rng.random() < 0.5 else None,
        bias_filter=bool(cfg.use_bias and rng.random() < 0.5),
        id=_new_id(rng),
    )


def _mutate_value(rng, v: float, lo: float, hi: float, is_int: bool, scale: float) -> float:
    v = float(np.clip(v + rng.normal(0, scale * (hi - lo)), lo, hi))
    return float(int(round(v))) if is_int else v


def mutate(parent: Genome, rng: np.random.Generator, cfg: GenomeCfg, symbols: list[str]) -> Genome:
    """Figlio del genitore con piccole mutazioni. Raramente cambia famiglia o mercato."""
    s = cfg.mutation_scale
    family, params = parent.family, dict(parent.params)
    if rng.random() < 0.05:                       # mutazione grande: nuova famiglia
        family = str(rng.choice(cfg.families))
        params = {k: _sample(rng, *g) for k, g in FAMILY_GENES[family].items()}
    else:
        params = {k: _mutate_value(rng, params[k], *FAMILY_GENES[family][k], s) for k in params}
    lev = parent.leverage
    if cfg.max_leverage > 1:
        lev = _mutate_value(rng, lev, 1.0, cfg.max_leverage, False, s)
    kronos = parent.kronos_min_bps
    if cfg.use_kronos:
        if rng.random() < 0.1:
            kronos = None if kronos is not None else _sample(rng, *KRONOS_GENE)
        elif kronos is not None:
            kronos = _mutate_value(rng, kronos, *KRONOS_GENE, s)
    else:
        kronos = None
    return Genome(
        family=family,
        params=_fix(family, params),
        stop_loss=_mutate_value(rng, parent.stop_loss, *RISK_GENES["stop_loss"], s),
        take_profit=_mutate_value(rng, parent.take_profit, *RISK_GENES["take_profit"], s),
        leverage=min(lev, cfg.max_leverage),
        allow_short=(not parent.allow_short if rng.random() < 0.1 else parent.allow_short)
        and cfg.allow_short,
        symbol=str(rng.choice(symbols)) if rng.random() < 0.05 else parent.symbol,
        kronos_min_bps=kronos,
        bias_filter=(not parent.bias_filter if rng.random() < 0.1 else parent.bias_filter)
        and cfg.use_bias,
        parent_id=parent.id,
        generation=parent.generation + 1,
        id=_new_id(rng),
    )
