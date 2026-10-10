"""Collegamento al broker.

Il broker vede UN solo portafoglio: l'esposizione netta per simbolo sommata su tutti gli
agenti finanziati (gli agenti in incubazione non muovono mai soldi veri).

Stato attuale:
- PaperBroker: nessun ordine, la simulazione è quella degli agenti (default).
- ccxt / IBKR: NON ancora implementati. Vanno scritti e testati con importi minimi dopo aver
  scelto la piattaforma (vedi README, "Broker in Italia").
"""
from __future__ import annotations

from .ecosystem import Ecosystem


def target_exposure(eco: Ecosystem, i: int) -> dict[str, float]:
    """Esposizione netta desiderata in USD per simbolo (positiva long, negativa short)."""
    out = {s: 0.0 for s in eco.symbols}
    for a in eco.agents:
        if a.status != "funded" or a.position is None:
            continue
        p = a.position
        out[a.genome.symbol] += p.side * p.qty * eco.ohlc[a.genome.symbol]["mark"][i]
    return out


class PaperBroker:
    name = "paper"

    def sync(self, exposure: dict[str, float]) -> list[str]:
        return [f"{s}: {v:+.2f} $" for s, v in exposure.items() if abs(v) > 0.01]


def make_broker(name: str, mode: str):
    if mode != "live" or name == "paper":
        return PaperBroker()
    raise NotImplementedError(
        f"Broker '{name}' non ancora integrato: il live è bloccato finché l'adapter non è scritto "
        "e testato con importi minimi.")
